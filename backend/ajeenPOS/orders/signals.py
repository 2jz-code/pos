# orders/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.conf import settings # Import settings
from .models import Order
from .kitchen.serializers import KitchenOrderSerializer
# Import the updated controller
from hardware.controllers.receipt_printer import ReceiptPrinterController

logger = logging.getLogger(__name__)
@receiver(post_save, sender=Order)
def order_status_update(sender, instance, created, update_fields=None, **kwargs):
    """
    Universal handler for order status changes.
    Triggers WebSocket updates and station/QC printing based on status transitions,
    using a flag to prevent duplicate printing.
    """
    channel_layer = get_channel_layer()

    # --- WebSocket updates (Keep existing logic) ---
    if instance.source == 'website':
        logger.debug(f"Website order {instance.id} status changed to {instance.status}")
        async_to_sync(channel_layer.group_send)(
            f'website_order_{instance.id}',
            { 'type': 'status_update', 'status': instance.status, 'payment_status': instance.payment_status }
        )

    relevant_pos_statuses = ['saved', 'in_progress', 'completed', 'voided']
    relevant_website_statuses = ['pending', 'preparing', 'completed', 'cancelled']
    should_update_kitchen = (
        (instance.source == 'pos' and instance.status in relevant_pos_statuses) or
        (instance.source == 'website' and instance.status in relevant_website_statuses)
    )
    if should_update_kitchen:
        order_data = KitchenOrderSerializer(instance).data
        message_type = 'new_order' if created else 'order_update'
        async_to_sync(channel_layer.group_send)(
            'kitchen_orders',
            { 'type': message_type, 'order': order_data }
        )
        logger.debug(f"Sent {message_type} for {instance.source} order {instance.id} to kitchen display")
    # --- End WebSocket updates ---


    # --- Station/QC Printing Trigger Condition (Checks Status AND Print Flag) ---
    should_check_flag = False # Flag to indicate if status condition met

    # Check status conditions only on updates, not initial creation
    if not created:
        # Condition 1: POS order payment is completed
        if instance.source == 'pos' and instance.payment_status == 'paid':
             logger.info(f"Order {instance.id}: POS Payment status IS 'paid' on update. Will check print flag.")
             should_check_flag = True

        # Condition 2: Website order moves to preparation stage
        elif instance.source == 'website' and instance.status == 'pending':
             logger.info(f"Order {instance.id}: Website Status IS 'preparing' on update. Will check print flag.")
             should_check_flag = True

    # --- Check Print Flag and Schedule Printing ---
    if should_check_flag:
        # --- Check the kitchen_ticket_printed flag ---
        if not instance.kitchen_ticket_printed:
            logger.info(f"Order {instance.id}: Status condition met AND kitchen ticket not printed yet. Setting flag and scheduling print.")
            # Set the flag to True *before* scheduling the print
            instance.kitchen_ticket_printed = True
            # Save *only* this flag update, using update_fields to prevent recursion!
            try:
                 # Use a specific save call just for the flag
                 instance.save(update_fields=['kitchen_ticket_printed'])
                 logger.info(f"Order {instance.id}: kitchen_ticket_printed flag saved successfully.")
                 # Schedule the actual printing function to run after the transaction commits
                 transaction.on_commit(lambda: print_kitchen_and_qc_tickets(instance.id))
            except Exception as save_err:
                 # Log error if saving the flag fails
                 logger.error(f"Order {instance.id}: CRITICAL ERROR - Failed to save kitchen_ticket_printed flag: {save_err}", exc_info=True)
                 # Consider how to handle this - maybe try printing anyway? Or log prominently.

        else:
            # If the flag is already True, log it and do nothing more
            logger.info(f"Order {instance.id}: Status condition met BUT kitchen_ticket_printed flag is already True. Skipping duplicate print.")
            # --- End Check ---
    else:
         # Log why the initial status condition wasn't met (useful for debugging)
         if not created: # Only log non-met conditions for updates
             logger.debug(f"Order {instance.id}: Status conditions NOT met for printing station/QC tickets this time (Source: {instance.source}, Status: {instance.status}, PaymentStatus: {instance.payment_status})")
         pass

def recalculate_and_broadcast_prep_times():
    """
    Recalculates the estimated preparation times for all pending website orders
    and broadcasts the updates via WebSocket.
    """
    # Get all pending website orders, ordered by creation time
    pending_orders = Order.objects.filter(
        status="pending", 
        source='website'
    ).order_by('created_at')
    
    print(f"Recalculating preparation times for {pending_orders.count()} pending orders")
    
    # Get the channel layer for WebSocket communication
    channel_layer = get_channel_layer()
    
    # Calculate and broadcast updated preparation times
    for index, order in enumerate(pending_orders):
        # Each order takes 15 minutes; position in queue determines time
        estimated_time = (index + 1) * 15
        
        # Broadcast to the specific order's group
        try:
            async_to_sync(channel_layer.group_send)(
                f'website_order_{order.id}',
                {
                    'type': 'prep_time_update',
                    'estimated_preparation_time': estimated_time
                }
            )
            print(f"Broadcast updated prep time for order {order.id}: {estimated_time} min")
        except Exception as e:
            print(f"Error broadcasting prep time for order {order.id}: {str(e)}")

# --- Keep the print_kitchen_and_qc_tickets function as is (with logging) ---
def print_kitchen_and_qc_tickets(order_id):
    """Fetches the order and triggers printing to configured station/QC printers."""
    logger.info(f"--- Attempting print_kitchen_and_qc_tickets for Order ID: {order_id} ---")
    try:
        order = Order.objects.prefetch_related('items__product__category').get(id=order_id)
        printer_configs = getattr(settings, 'HARDWARE_CONFIG', {}).get('PRINTERS', {})
        logger.debug(f"Order {order_id}: Fetched successfully. Printer configs found: {list(printer_configs.keys())}")
        controller = ReceiptPrinterController()

        for name, config in printer_configs.items():
            logger.debug(f"Order {order_id}: Checking printer config '{name}': Enabled={config.get('enabled')}, Role={config.get('role')}")
            if not config.get('enabled', False):
                continue

            role = config.get('role')
            result = None

            if role == 'station':
                logger.info(f"Order {order_id}: Attempting to print to STATION printer '{name}'...")
                result = controller.print_station_ticket(order, name)
                if result:
                    logger.info(f"Order {order_id}: Result from print_station_ticket('{name}'): {result.get('status')} - {result.get('message')}")
                else:
                     logger.error(f"Order {order_id}: No result returned from print_station_ticket('{name}')")

            elif role == 'quality_control':
                logger.info(f"Order {order_id}: Attempting to print to QC printer '{name}'...")
                result = controller.print_qc_ticket(order, name)
                if result:
                    logger.info(f"Order {order_id}: Result from print_qc_ticket('{name}'): {result.get('status')} - {result.get('message')}")
                else:
                     logger.error(f"Order {order_id}: No result returned from print_qc_ticket('{name}')")

        logger.info(f"--- Finished print attempt loop for Order ID: {order_id} ---")

    except Order.DoesNotExist:
        logger.error(f"Order with ID {order_id} not found for printing.")
    except Exception as e:
        logger.error(f"Unexpected error in print_kitchen_and_qc_tickets for Order ID {order_id}: {e}", exc_info=True)
