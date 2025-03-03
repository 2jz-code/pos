# orders/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from .models import Order
from .kitchen.serializers import KitchenOrderSerializer

@receiver(post_save, sender=Order)
def order_status_update(sender, instance, created, update_fields=None, **kwargs):
    """
    Universal handler for order status changes - works for both admin and automated updates
    """
    # Get the channel layer for WebSocket communication
    channel_layer = get_channel_layer()
    
    # Handle website orders - send updates to individual order websocket
    if instance.source == 'website':
        print(f"Website order {instance.id} status changed to {instance.status}")
        
        # Send update to the specific order's group
        async_to_sync(channel_layer.group_send)(
            f'website_order_{instance.id}',
            {
                'type': 'status_update',
                'status': instance.status,
                'payment_status': instance.payment_status
            }
        )
    
    # Handle kitchen display updates for both POS and website orders
    # Only send updates for relevant statuses
    relevant_pos_statuses = ['saved', 'in_progress', 'completed', 'voided']
    relevant_website_statuses = ['pending', 'preparing', 'completed', 'cancelled']
    
    should_update_kitchen = (
        (instance.source == 'pos' and instance.status in relevant_pos_statuses) or
        (instance.source == 'website' and instance.status in relevant_website_statuses)
    )
    
    if should_update_kitchen:
        # Serialize order for kitchen display
        order_data = KitchenOrderSerializer(instance).data
        
        # Determine message type based on action
        message_type = 'new_order' if created else 'order_update'
        
        # Send to kitchen group
        async_to_sync(channel_layer.group_send)(
            'kitchen_orders',
            {
                'type': message_type,
                'order': order_data
            }
        )
        
        print(f"Sent {message_type} for {instance.source} order {instance.id} to kitchen display")

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