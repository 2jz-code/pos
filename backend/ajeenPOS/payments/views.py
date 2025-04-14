# payments/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings
from .serializers import PaymentSerializer # Use the updated serializer
from django.shortcuts import get_object_or_404
from orders.models import Order
# Import PaymentTransaction model
from .models import Payment, PaymentTransaction
from .stripe_utils import create_payment_intent
import stripe
import decimal # Import decimal
from django.utils import timezone
from django.db import transaction # Import transaction
import json # Import json
import logging # Import logging
from django.db.models import Q
stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__) # Setup logger


# --- Views Refactored for New Transaction Model ---

class CreatePaymentIntentView(APIView):
    """
    Create a Stripe Payment Intent for an order.
    Returns the client secret for the frontend.
    Does NOT store the PI ID here; that happens upon processing/success.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = get_object_or_404(Order, id=order_id)
            # Ensure a Payment object exists for the order
            payment, created = Payment.objects.get_or_create(order=order, defaults={'amount': order.total_price, 'status': 'pending'})

            amount_cents = int(decimal.Decimal(order.total_price) * 100)
            metadata = {'order_id': str(order.id)} # Ensure order_id is string for Stripe
            if order.guest_email:
                 metadata['customer_email'] = order.guest_email
            elif order.user and order.user.email:
                 metadata['customer_email'] = order.user.email

            # Create a new payment intent for this attempt
            payment_intent = create_payment_intent(amount=amount_cents, currency='usd', metadata=metadata)

            print(f"Created Payment Intent {payment_intent.id} for Order {order_id}")

            return Response({
                'clientSecret': payment_intent.client_secret,
                'publishableKey': settings.STRIPE_PUBLISHABLE_KEY,
                'amount': float(order.total_price),
                'orderId': order.id
            })

        except Order.DoesNotExist:
             return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Error creating payment intent for order {order_id}: {e}")
            return Response({'error': f'Failed to create payment intent: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentWebhookView(APIView):
    """
    Handle Stripe webhooks, updating PaymentTransaction and potentially Payment/Order status.
    """
    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            print(f"Webhook received: {event.type}")
        except ValueError:
            logger.error("Webhook Error: Invalid payload")
            return Response(status=400)
        except stripe.error.SignatureVerificationError:
            logger.error("Webhook Error: Invalid signature")
            return Response(status=400)
        except Exception as e:
             logger.error(f"Webhook Error: Unexpected error during construction: {e}")
             return Response(status=500)


        # Handle the specific event type
        try:
            with transaction.atomic(): # Wrap handler logic in a transaction
                if event.type == 'payment_intent.succeeded':
                    payment_intent = event.data.object
                    self.handle_payment_success(payment_intent)
                elif event.type == 'payment_intent.payment_failed':
                    payment_intent = event.data.object
                    self.handle_payment_failure(payment_intent)
                elif event.type == 'charge.refunded':
                    refund = event.data.object
                    self.handle_refund(refund)
                else:
                    print(f'Webhook: Unhandled event type {event.type}')

        except Exception as e:
             # Log errors during handling but still return 200 to Stripe
             logger.error(f"Error handling webhook event {event.type} ({event.id}): {e}")
             import traceback
             traceback.print_exc()
             # Don't return 500 to Stripe, as they might retry unnecessarily for application errors
             # Return 200 to acknowledge receipt, but log the internal error

        return Response(status=200) # Acknowledge receipt to Stripe


    def handle_payment_success(self, payment_intent):
        """Update PaymentTransaction based on successful PaymentIntent."""
        pi_id = payment_intent.id
        charge_id = payment_intent.latest_charge # Get the charge ID
        print(f"Webhook Success Handler: PI ID {pi_id}, Charge ID {charge_id}")

        # Find the corresponding PaymentTransaction - might exist already or need creation
        # Best practice: The PI ID should have been associated *before* success ideally
        # Let's try finding by PI ID first
        txn = PaymentTransaction.objects.filter(transaction_id=pi_id).first()

        if not txn and charge_id:
            # Fallback: Try finding by Charge ID if PI ID wasn't stored yet
            txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()

        if txn:
            if txn.status == 'completed':
                 print(f"Webhook Info: Transaction {txn.id} for PI {pi_id} already marked completed.")
                 return # Already processed

            txn.status = 'completed'
            # Ensure charge ID is stored if we found via PI ID
            if not txn.transaction_id or txn.transaction_id == pi_id:
                 txn.transaction_id = charge_id or pi_id # Prefer charge ID if available
            # Store/Update metadata if needed (e.g., card details)
            metadata = txn.get_metadata()
            try:
                pm = stripe.PaymentMethod.retrieve(payment_intent.payment_method) if payment_intent.payment_method else None
                if pm and pm.card:
                    metadata['card_brand'] = pm.card.brand
                    metadata['card_last4'] = pm.card.last4
                    txn.set_metadata(metadata)
            except Exception as e:
                 logger.warning(f"Webhook: Could not retrieve payment method details for PI {pi_id}: {e}")
            txn.save()
            print(f"Webhook: Updated PaymentTransaction {txn.id} to completed (PI: {pi_id}).")
            self.update_parent_payment_status(txn.parent_payment) # Update parent status
        else:
            # Transaction wasn't created beforehand - this is less ideal
            # Try finding the Order via metadata to create the records
            order_id = payment_intent.metadata.get('order_id')
            if order_id:
                try:
                    order = Order.objects.get(id=order_id)
                    payment, p_created = Payment.objects.get_or_create(order=order, defaults={'amount': decimal.Decimal(payment_intent.amount) / 100})
                    txn, t_created = PaymentTransaction.objects.get_or_create(
                        parent_payment=payment,
                        transaction_id=charge_id or pi_id, # Prefer charge ID
                        defaults={
                             'payment_method': 'credit',
                             'amount': decimal.Decimal(payment_intent.amount) / 100,
                             'status': 'completed'
                        }
                    )
                    if t_created:
                         print(f"Webhook: Created missing PaymentTransaction {txn.id} for PI {pi_id}.")
                         # Update metadata
                         metadata = txn.get_metadata()
                         try:
                             pm = stripe.PaymentMethod.retrieve(payment_intent.payment_method) if payment_intent.payment_method else None
                             if pm and pm.card:
                                 metadata['card_brand'] = pm.card.brand
                                 metadata['card_last4'] = pm.card.last4
                                 txn.set_metadata(metadata)
                                 txn.save()
                         except Exception as e:
                              logger.warning(f"Webhook: Could not retrieve payment method details for PI {pi_id}: {e}")
                         self.update_parent_payment_status(payment)
                    else:
                         print(f"Webhook: Found existing Txn {txn.id} while trying to create for PI {pi_id}.")
                         # Update status if it wasn't completed
                         if txn.status != 'completed':
                             txn.status = 'completed'
                             txn.save()
                             self.update_parent_payment_status(payment)

                except Order.DoesNotExist:
                    logger.error(f"Webhook Error: Order {order_id} from PI {pi_id} metadata not found.")
                except Exception as e:
                    logger.error(f"Webhook Error: Could not create missing transaction for PI {pi_id}: {e}")
            else:
                 logger.error(f"Webhook Error: Succeeded PI {pi_id} has no order_id metadata and no matching transaction found.")

    def handle_payment_failure(self, payment_intent):
        """Update PaymentTransaction based on failed PaymentIntent."""
        pi_id = payment_intent.id
        print(f"Webhook Failure Handler: PI ID {pi_id}")

        txn = PaymentTransaction.objects.filter(transaction_id=pi_id).first()
        if txn:
            if txn.status == 'failed':
                 print(f"Webhook Info: Transaction {txn.id} for PI {pi_id} already marked failed.")
                 return # Already processed

            txn.status = 'failed'
            # Store failure reason if available
            metadata = txn.get_metadata()
            metadata['failure_reason'] = payment_intent.last_payment_error.message if payment_intent.last_payment_error else 'Unknown'
            txn.set_metadata(metadata)
            txn.save()
            print(f"Webhook: Updated PaymentTransaction {txn.id} to failed (PI: {pi_id}).")
            self.update_parent_payment_status(txn.parent_payment) # Update parent status
        else:
             # Try finding the Order via metadata to create a failed record
            order_id = payment_intent.metadata.get('order_id')
            if order_id:
                try:
                    order = Order.objects.get(id=order_id)
                    payment, p_created = Payment.objects.get_or_create(order=order, defaults={'amount': decimal.Decimal(payment_intent.amount) / 100})
                    txn, t_created = PaymentTransaction.objects.get_or_create(
                        parent_payment=payment,
                        transaction_id=pi_id, # Use PI ID for failed intent
                        defaults={
                             'payment_method': 'credit',
                             'amount': decimal.Decimal(payment_intent.amount) / 100,
                             'status': 'failed'
                        }
                    )
                    if t_created:
                        print(f"Webhook: Created missing FAILED PaymentTransaction {txn.id} for PI {pi_id}.")
                        metadata = txn.get_metadata()
                        metadata['failure_reason'] = payment_intent.last_payment_error.message if payment_intent.last_payment_error else 'Unknown'
                        txn.set_metadata(metadata)
                        txn.save()
                        self.update_parent_payment_status(payment)
                    else:
                         print(f"Webhook: Found existing Txn {txn.id} while trying to create for failed PI {pi_id}.")
                         # Update status if it wasn't failed
                         if txn.status != 'failed':
                             txn.status = 'failed'
                             txn.save()
                             self.update_parent_payment_status(payment)

                except Order.DoesNotExist:
                    logger.error(f"Webhook Error: Order {order_id} from failed PI {pi_id} metadata not found.")
                except Exception as e:
                    logger.error(f"Webhook Error: Could not create missing failed transaction for PI {pi_id}: {e}")
            else:
                logger.error(f"Webhook Error: Failed PI {pi_id} has no order_id metadata and no matching transaction found.")


    def handle_refund(self, refund):
        """Update PaymentTransaction based on charge.refunded event."""
        charge_id = refund.charge
        refund_id = refund.id
        print(f"Webhook Refund Handler: Refund ID {refund_id}, Charge ID {charge_id}")

        # Find the transaction using the Charge ID
        txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()
        if txn:
            if txn.status == 'refunded':
                 print(f"Webhook Info: Transaction {txn.id} for Charge {charge_id} already marked refunded.")
                 return # Already processed

            txn.status = 'refunded'
            # Store refund info in metadata
            metadata = txn.get_metadata()
            metadata['refund_id_webhook'] = refund_id
            metadata['refund_amount_webhook'] = decimal.Decimal(refund.amount) / 100
            metadata['refund_reason_webhook'] = refund.reason
            metadata['refund_status_webhook'] = refund.status
            txn.set_metadata(metadata)
            txn.save()
            print(f"Webhook: Updated PaymentTransaction {txn.id} to refunded (Charge: {charge_id}).")
            self.update_parent_payment_status(txn.parent_payment) # Update parent status
        else:
            logger.warning(f"Webhook Warning: Refund {refund_id} for Charge {charge_id} received, but no matching PaymentTransaction found.")

    def update_parent_payment_status(self, payment):
        """Helper to update parent Payment status based on its transactions."""
        transactions = payment.transactions.all()
        if not transactions.exists():
            payment.status = 'pending' # Should ideally not happen here
            logger.warning(f"Payment {payment.id} has no transactions during status update.")
        elif all(t.status == 'refunded' for t in transactions):
            payment.status = 'refunded'
        # Check if *any* transaction is refunded AND *at least one* is still completed
        elif any(t.status == 'refunded' for t in transactions) and any(t.status == 'completed' for t in transactions):
            payment.status = 'partially_refunded'
        elif all(t.status == 'completed' for t in transactions):
             payment.status = 'completed'
             # Sync order status only on full completion
             if payment.order.payment_status != 'paid':
                 payment.order.payment_status = 'paid'
                 payment.order.save()
        elif any(t.status == 'failed' for t in transactions):
             # If any transaction failed, mark the whole payment as failed? Or keep pending?
             # Let's mark as failed for now.
             payment.status = 'failed'
             if payment.order.payment_status != 'failed': # Keep order payment status consistent
                payment.order.payment_status = 'failed'
                payment.order.save()
        # If there's a mix (e.g., pending, completed, but not all completed), keep pending?
        # Let's default to pending if not clearly completed, refunded, or failed.
        elif not all(t.status in ['completed', 'refunded', 'failed'] for t in transactions):
             payment.status = 'pending'

        payment.save()
        print(f"Webhook: Updated parent Payment {payment.id} status to {payment.status}. Order payment status: {payment.order.payment_status}")


class ProcessPaymentView(APIView):
    """
    Processes a payment using a previously obtained PaymentMethod ID.
    Creates Payment and PaymentTransaction records.
    (Note: Assumes frontend handles Stripe Elements/SDK to get payment_method_id)
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        payment_method_id = request.data.get('payment_method_id') # From frontend (Stripe Elements/SDK)

        if not order_id or not payment_method_id:
            return Response({'error': 'Order ID and payment method ID are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = get_object_or_404(Order, id=order_id)
            payment, created = Payment.objects.get_or_create(order=order, defaults={'amount': order.total_price, 'status': 'pending'})

            amount_cents = int(decimal.Decimal(order.total_price) * 100)
            metadata = {'order_id': str(order.id)}
            if order.guest_email: metadata['customer_email'] = order.guest_email
            elif order.user and order.user.email: metadata['customer_email'] = order.user.email

            # --- Attempt to create and confirm Payment Intent ---
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                payment_method=payment_method_id,
                confirm=True, # Attempt immediate confirmation
                automatic_payment_methods={'enabled': True, 'allow_redirects': 'never'}, # Handle 3DS if needed without redirect
                metadata=metadata,
                # Use off_session=True if applicable for server-side confirmation after customer interaction
                # off_session=True,
                # return_url='<YOUR_RETURN_URL>', # Needed if allow_redirects != 'never'
            )

            print(f"Created/Confirmed Payment Intent: {payment_intent.id}, Status: {payment_intent.status}")

            # --- Record Transaction ---
            txn_status = 'pending'
            if payment_intent.status == 'succeeded':
                txn_status = 'completed'
            elif payment_intent.status == 'requires_payment_method' or payment_intent.status == 'requires_confirmation' or payment_intent.status == 'requires_action':
                txn_status = 'failed' # Or requires_action? Map based on Stripe status
            elif payment_intent.status == 'processing':
                 txn_status = 'pending'
            elif payment_intent.status == 'canceled':
                 txn_status = 'failed' # Or a specific 'canceled' status?

            # Get charge ID if available
            charge_id = payment_intent.latest_charge

            # Extract card details from payment method used
            txn_metadata = {}
            try:
                 pm = stripe.PaymentMethod.retrieve(payment_method_id)
                 if pm.card:
                     txn_metadata['card_brand'] = pm.card.brand
                     txn_metadata['card_last4'] = pm.card.last4
            except Exception as pm_err:
                 logger.warning(f"Could not retrieve PM details for {payment_method_id}: {pm_err}")

            payment_txn = PaymentTransaction.objects.create(
                parent_payment=payment,
                payment_method='credit',
                amount=decimal.Decimal(payment_intent.amount) / 100, # Use amount from PI
                status=txn_status,
                transaction_id=charge_id or payment_intent.id, # Prefer charge ID if available
                metadata_json=json.dumps(txn_metadata) if txn_metadata else None
            )
            print(f"Created PaymentTransaction {payment_txn.id} with status {txn_status}")

            # --- Update Parent Payment and Order ---
            payment.payment_method = 'credit'
            # Update parent payment status based on transaction outcome
            if txn_status == 'completed':
                payment.status = 'completed'
                order.payment_status = 'paid'
            elif txn_status == 'failed':
                 payment.status = 'failed'
                 order.payment_status = 'failed' # Or keep pending?
            else: # Pending
                 payment.status = 'pending'
                 order.payment_status = 'pending'

            payment.amount = order.total_price # Ensure amount is correct
            payment.save()
            order.save()

            # --- Response ---
            # If successful, return success
            if payment_intent.status == 'succeeded':
                return Response({
                    'success': True,
                    'status': payment_intent.status,
                    'payment_intent_id': payment_intent.id,
                    'transaction_id': payment_txn.id # Return our DB transaction ID
                })
            # If requires action (e.g., 3DS), return client secret
            elif payment_intent.status == 'requires_action':
                 return Response({
                     'requires_action': True,
                     'client_secret': payment_intent.client_secret,
                     'payment_intent_id': payment_intent.id,
                     'status': payment_intent.status,
                     'transaction_id': payment_txn.id
                 }, status=status.HTTP_402_PAYMENT_REQUIRED) # Use 402 to indicate further action needed
            # Otherwise, return failure
            else:
                error_message = "Payment failed."
                if payment_intent.last_payment_error:
                    error_message = payment_intent.last_payment_error.message
                return Response({
                    'error': { 'message': error_message, 'code': 'payment_failed', 'type': 'card_error' }
                }, status=status.HTTP_400_BAD_REQUEST)


        # --- Error Handling ---
        except stripe.error.CardError as e:
             # Card declined or other card issue during confirm=True
             logger.warning(f"Stripe CardError processing payment for order {order_id}: {e.error.message}")
             # Create a failed transaction record
             payment, _ = Payment.objects.get_or_create(order=order, defaults={'amount': order.total_price, 'status': 'failed'})
             PaymentTransaction.objects.create(
                  parent_payment=payment, payment_method='credit', amount=order.total_price, status='failed',
                  metadata_json=json.dumps({'error_message': e.error.message, 'error_code': e.error.code})
             )
             payment.status = 'failed'
             payment.save()
             return Response({'error': {'message': e.error.message,'code': e.error.code,'type': 'card_error'}}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
             logger.error(f"StripeError processing payment for order {order_id}: {e}")
             return Response({'error': {'message': f"Payment processor error: {e.error.message if e.error else str(e)}", 'type': 'api_error'}}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             logger.error(f"Error processing payment for order {order_id}: {e}")
             import traceback
             traceback.print_exc()
             return Response({'error': {'message': "An unexpected error occurred.", 'type': 'server_error'}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmPaymentView(APIView):
    """
    Confirms the status of a PaymentIntent after frontend actions (like 3DS).
    Updates the corresponding PaymentTransaction.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response({'error': 'Payment intent ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Retrieve the latest status from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            print(f"Confirming Payment Intent: {payment_intent.id}, Status: {payment_intent.status}")

            # Find the corresponding PaymentTransaction
            txn = get_object_or_404(PaymentTransaction, transaction_id=payment_intent_id)
            payment = txn.parent_payment
            order = payment.order

            # Update transaction status based on PI status
            previous_txn_status = txn.status
            if payment_intent.status == 'succeeded':
                txn.status = 'completed'
            elif payment_intent.status in ['requires_payment_method', 'requires_confirmation', 'canceled']:
                 txn.status = 'failed'
            elif payment_intent.status == 'processing':
                 txn.status = 'pending'
            # else: Keep current status if PI is requires_action, etc.

            if txn.status != previous_txn_status:
                txn.save()
                print(f"Updated Transaction {txn.id} status to {txn.status}")
                # Update parent payment and order status
                self.update_parent_payment_status(payment) # Use helper
            else:
                 print(f"Transaction {txn.id} status already {txn.status}")


            return Response({
                'status': payment_intent.status, # Return Stripe's status
                'transaction_status': txn.status, # Return our DB status
                'payment_status': payment.status, # Return parent payment status
                'payment_intent_id': payment_intent_id
            })

        except PaymentTransaction.DoesNotExist:
            logger.error(f"ConfirmPayment Error: No PaymentTransaction found for PI {payment_intent_id}")
            return Response({'error': 'Payment transaction not found for the given ID'}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
             logger.error(f"ConfirmPayment Stripe Error for PI {payment_intent_id}: {e}")
             return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error confirming payment for PI {payment_intent_id}: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': 'An unexpected error occurred during payment confirmation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update_parent_payment_status(self, payment):
        """DRY helper to update parent Payment status based on transactions."""
        transactions = payment.transactions.all()
        if not transactions.exists():
            payment.status = 'pending'
        elif all(t.status == 'refunded' for t in transactions):
            payment.status = 'refunded'
        elif any(t.status == 'refunded' for t in transactions) and any(t.status == 'completed' for t in transactions):
            payment.status = 'partially_refunded'
        elif all(t.status == 'completed' for t in transactions):
             payment.status = 'completed'
             if payment.order.payment_status != 'paid':
                 payment.order.payment_status = 'paid'
                 payment.order.save()
        elif any(t.status == 'failed' for t in transactions):
             payment.status = 'failed'
             if payment.order.payment_status != 'failed':
                 payment.order.payment_status = 'failed'
                 payment.order.save()
        elif any(t.status == 'pending' for t in transactions):
             payment.status = 'pending' # If any part is pending, keep parent pending

        payment.save()
        print(f"Helper: Updated parent Payment {payment.id} status to {payment.status}. Order payment status: {payment.order.payment_status}")


# --- Updated Views for Retrieval and Refund ---

class PaymentListView(generics.ListAPIView):
    """
    List all payments with optional filtering.
    Uses the updated PaymentSerializer with nested transactions.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        queryset = Payment.objects.select_related('order').prefetch_related(
            'transactions' # Prefetch related transactions
        ).order_by('-created_at')

        payment_method = self.request.query_params.get('payment_method')
        status_filter = self.request.query_params.get('status')
        order_id = self.request.query_params.get('order_id')

        if payment_method:
            if payment_method == 'split':
                queryset = queryset.filter(is_split_payment=True)
            else:
                queryset = queryset.filter(
                    Q(payment_method=payment_method) | Q(transactions__payment_method=payment_method)
                ).distinct()

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if order_id:
            queryset = queryset.filter(order_id=order_id)

        return queryset


class PaymentDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single payment by ID with nested transaction details.
    Uses the updated PaymentSerializer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('order').prefetch_related('transactions')
    lookup_url_kwarg = 'payment_id'


class PaymentRefundView(APIView):
    """
    Process a refund for a specific PaymentTransaction within a Payment.
    Includes detailed logging for amount conversion.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, payment_id, *args, **kwargs):
        payment = get_object_or_404(Payment.objects.select_related('order'), id=payment_id)
        transaction_pk_to_refund = request.data.get('transaction_id')
        amount_str = request.data.get('amount')
        reason = request.data.get('reason', 'requested_by_customer')

        # --- Basic Input Validation ---
        if not transaction_pk_to_refund:
             return Response({'error': 'PaymentTransaction ID (transaction_id) is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not amount_str:
             return Response({'error': 'Refund amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use Decimal, ensure positive
            amount = decimal.Decimal(amount_str)
            if amount <= 0: raise ValueError("Amount must be positive")
        except (decimal.InvalidOperation, ValueError):
            return Response({'error': 'Invalid or non-positive refund amount format.'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Fetch Transaction and Validate ---
        try:
            txn_to_refund = get_object_or_404(PaymentTransaction, pk=transaction_pk_to_refund, parent_payment=payment)
        except PaymentTransaction.DoesNotExist:
             return Response({'error': f'Transaction with ID {transaction_pk_to_refund} not found for this payment.'}, status=status.HTTP_404_NOT_FOUND)

        if txn_to_refund.status == 'refunded':
            return Response({'error': f'Transaction {txn_to_refund.id} already refunded.'}, status=status.HTTP_400_BAD_REQUEST)
        if txn_to_refund.status != 'completed':
             return Response({'error': f'Cannot refund transaction {txn_to_refund.id} (status: {txn_to_refund.status}).'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > txn_to_refund.amount:
            return Response({'error': f'Refund amount ({amount}) exceeds transaction amount ({txn_to_refund.amount}).'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Refund Logic ---
        refund_result = {}
        try:
            if txn_to_refund.payment_method == 'credit':
                stripe_txn_id = txn_to_refund.transaction_id
                if not stripe_txn_id:
                     logger.error(f'Cannot refund credit txn {txn_to_refund.id}: Missing Stripe ID.')
                     return Response({'error': f'Cannot refund credit transaction {txn_to_refund.id}: Missing Stripe transaction ID.'}, status=status.HTTP_400_BAD_REQUEST)

                # --- DETAILED LOGGING & QUANTIZATION ---
                logger.debug(f"Refunding Txn ID: {txn_to_refund.id}, Stripe ID: {stripe_txn_id}")
                logger.debug(f"Original Refund Amount (Decimal): {repr(amount)}, Type: {type(amount)}")

                # Explicitly quantize to 2 decimal places BEFORE multiplying
                quantized_amount = amount.quantize(decimal.Decimal("0.01"), rounding=decimal.ROUND_HALF_UP)
                logger.debug(f"Quantized Amount (Decimal): {repr(quantized_amount)}, Type: {type(quantized_amount)}")

                # Multiply by Decimal 100
                amount_in_cents_decimal = quantized_amount * decimal.Decimal('100')
                logger.debug(f"Amount * 100 (Decimal): {repr(amount_in_cents_decimal)}, Type: {type(amount_in_cents_decimal)}")

                # Convert to integer
                amount_in_cents = int(amount_in_cents_decimal)
                logger.debug(f"Final Amount in Cents (int): {amount_in_cents}, Type: {type(amount_in_cents)}")
                # --- END LOGGING & QUANTIZATION ---

                refund_params = {
                    'amount': amount_in_cents, # Use the precisely calculated integer cents
                    'reason': reason,
                    'metadata': { 'payment_id': payment.id, 'txn_id': txn_to_refund.id, 'order_id': payment.order.id }
                }
                # ... (rest of the Stripe param logic: charge vs payment_intent) ...
                if stripe_txn_id.startswith('pi_'):
                    refund_params['payment_intent'] = stripe_txn_id
                else: # Assume charge ID (ch_ or py_)
                     refund_params['charge'] = stripe_txn_id

                refund = stripe.Refund.create(**refund_params)
                logger.info(f"Stripe Refund successful: Refund ID {refund.id}, Status {refund.status}")
                refund_result = { 'refund_id': refund.id, 'status': refund.status, 'amount': decimal.Decimal(refund.amount) / 100, 'success': True }

            elif txn_to_refund.payment_method == 'cash':
                logger.info(f"Processing cash refund for Txn ID: {txn_to_refund.id}, Amount: {amount}")
                refund_result = { 'status': 'succeeded', 'amount': amount, 'success': True }
            else:
                 logger.error(f"Refund not implemented for method: {txn_to_refund.payment_method}")
                 return Response({'error': f'Refund not supported for method {txn_to_refund.payment_method}.'}, status=status.HTTP_400_BAD_REQUEST)

            # --- Update Database ---
            txn_to_refund.status = 'refunded'
            metadata = txn_to_refund.get_metadata()
            metadata['refund_details'] = refund_result
            txn_to_refund.set_metadata(metadata)
            txn_to_refund.save()
            logger.info(f"Updated PaymentTransaction {txn_to_refund.id} status to refunded.")

            self._update_parent_payment_and_order_status(payment)

            # Return success response
            return Response({
                 'success': refund_result.get('success', False),
                 'message': f'Refund of {formatCurrency(amount)} processed for transaction {txn_to_refund.id}.',
                 'refund_details': refund_result,
                 'payment_status': payment.status,
                 'transaction_status': txn_to_refund.status
             })

        except stripe.error.StripeError as e:
            logger.error(f"Stripe Error during refund for Txn {transaction_pk_to_refund}: {str(e)}")
            return Response({'error': f'Stripe Error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            logger.error(f"Error processing refund for Txn {transaction_pk_to_refund}: {str(e)}")
            traceback.print_exc()
            return Response({'error': f'Failed to process refund: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def _update_parent_payment_and_order_status(self, payment):
        """Helper to update parent Payment status based on transactions."""
        # ...(Keep the existing helper function logic)...
        transactions = payment.transactions.all()
        if not transactions.exists():
            payment.status = 'pending'
        elif all(t.status == 'refunded' for t in transactions):
            payment.status = 'refunded'
        elif any(t.status == 'refunded' for t in transactions):
             if any(t.status == 'completed' for t in transactions):
                 payment.status = 'partially_refunded'
             else:
                  payment.status = 'refunded'
        elif all(t.status == 'completed' for t in transactions):
             payment.status = 'completed'
        elif any(t.status == 'failed' for t in transactions):
             payment.status = 'failed'
        else:
             payment.status = 'pending'

        payment.save()
        logger.info(f"Helper: Updated parent Payment {payment.id} status to {payment.status}.")

        if payment.order.payment_status != payment.status:
            payment.order.payment_status = payment.status
            payment.order.save()
            logger.info(f"Helper: Synced Order {payment.order.id} payment_status to {payment.order.payment_status}.")

# Helper (can be defined outside class or imported)
def formatCurrency(amount):
    try:
        dec_amount = decimal.Decimal(str(amount))
        return f"${dec_amount:.2f}"
    except: return f"${amount}"