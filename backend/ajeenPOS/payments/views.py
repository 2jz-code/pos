# payments/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings
from .serializers import PaymentSerializer
from django.shortcuts import get_object_or_404
from orders.models import Order
from .models import Payment
from .stripe_utils import create_payment_intent
import stripe
from django.utils import timezone

stripe.api_key = settings.STRIPE_SECRET_KEY

# In views.py - CreatePaymentIntentView
class CreatePaymentIntentView(APIView):
    """
    Create a Stripe Payment Intent for an order
    """
    
    def post(self, request, *args, **kwargs):
        # Get order ID from request
        order_id = request.data.get('order_id')
        
        if not order_id:
            return Response(
                {'error': 'Order ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the order
        order = get_object_or_404(Order, id=order_id)
        
        # Verification code remains the same...
        
        try:
            # Convert total to cents for Stripe
            amount_cents = int(float(order.total_price) * 100)
            
            # Create metadata for the payment intent
            metadata = {
                'order_id': order.id,
                'customer_email': order.guest_email or (order.user.email if order.user else None),
            }
            
            # Create or get payment intent
            payment = getattr(order, 'payment', None)
            
            if payment and payment.payment_intent_id:
                # Retrieve existing payment intent
                import stripe
                payment_intent = stripe.PaymentIntent.retrieve(payment.payment_intent_id)
            else:
                # Create new payment intent
                payment_intent = create_payment_intent(
                    amount=amount_cents,
                    currency='usd',  # Change if needed
                    metadata=metadata
                )
                
                # Create or update Payment record
                if payment:
                    payment.payment_intent_id = payment_intent.id
                    payment.amount = order.total_price
                    payment.payment_method = 'credit'  # Set payment method for Stripe payments
                    payment.save()
                else:
                    payment = Payment.objects.create(
                        order=order,
                        payment_intent_id=payment_intent.id,
                        amount=order.total_price,
                        payment_method='credit'  # Set payment method for Stripe payments
                    )
            
            return Response({
                'clientSecret': payment_intent.client_secret,
                'publishableKey': settings.STRIPE_PUBLISHABLE_KEY,
                'amount': float(order.total_price),
                'orderId': order.id
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentWebhookView(APIView):
    """
    Handle Stripe webhooks for payment events
    """
    
    def post(self, request, *args, **kwargs):
        import stripe
        from django.http import HttpResponse
        
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            # Invalid payload
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return HttpResponse(status=400)
        
        # Handle the event
        if event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            self.handle_payment_success(payment_intent)
        elif event.type == 'payment_intent.payment_failed':
            payment_intent = event.data.object
            self.handle_payment_failure(payment_intent)
        
        return HttpResponse(status=200)
    
    def handle_payment_success(self, payment_intent):
        """Update order when payment succeeds"""
        order_id = payment_intent.metadata.get('order_id')
        if not order_id:
            return
        
        try:
            payment = Payment.objects.get(payment_intent_id=payment_intent.id)
            payment.status = 'completed'
            payment.save()
            
            # Update order status
            order = payment.order
            order.payment_status = 'paid'
            order.save()
        except Payment.DoesNotExist:
            pass
    
    def handle_payment_failure(self, payment_intent):
        """Update order when payment fails"""
        try:
            payment = Payment.objects.get(payment_intent_id=payment_intent.id)
            payment.status = 'failed'
            payment.save()
        except Payment.DoesNotExist:
            pass

class ProcessPaymentView(APIView):
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        payment_method_id = request.data.get('payment_method_id')
        
        if not order_id or not payment_method_id:
            return Response(
                {'error': 'Order ID and payment method ID are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the order
            order = get_object_or_404(Order, id=order_id)
            
            # Convert amount to cents for Stripe
            amount_cents = int(float(order.total_price) * 100)
            
            # Create payment intent with the payment method
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                payment_method=payment_method_id,
                confirm=True,
                # Use automatic payment methods with no redirects
                automatic_payment_methods={
                    'enabled': True,
                    'allow_redirects': 'never'
                },
                metadata={
                    'order_id': order_id,
                    'customer_email': order.guest_email or (order.user.email if order.user else None),
                }
            )
            
            # Create or update payment record
            payment, created = Payment.objects.get_or_create(
                order=order,
                defaults={
                    'payment_intent_id': payment_intent.id,
                    'payment_method_id': payment_method_id,
                    'payment_method': 'credit',  # Set to 'credit' for card payments
                    'amount': order.total_price,
                    'status': 'completed' if payment_intent.status == 'succeeded' else 'pending'
                }
            )
            
            if not created:
                payment.payment_intent_id = payment_intent.id
                payment.payment_method_id = payment_method_id
                payment.payment_method = 'credit'  # Set to 'credit' for card payments
                payment.status = 'completed' if payment_intent.status == 'succeeded' else 'pending'
                payment.save()
            
            # Update order payment status
            if payment_intent.status == 'succeeded':
                order.payment_status = 'paid'
                order.save()
            
            return Response({
                'success': True,
                'status': payment_intent.status,
                'payment_intent_id': payment_intent.id
            })
            
        except stripe.error.CardError as e:
            # Since it's a decline, stripe.error.CardError will be caught
            error_msg = e.error.message
            error_code = e.error.code
            return Response({
                'error': {
                    'message': error_msg,
                    'code': error_code,
                    'type': 'card_error'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.RateLimitError as e:
            # Too many requests made to the API too quickly
            return Response({
                'error': {
                    'message': "Too many requests. Please try again later.",
                    'code': 'rate_limit',
                    'type': 'api_error'
                }
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except stripe.error.InvalidRequestError as e:
            # Invalid parameters were supplied to Stripe's API
            return Response({
                'error': {
                    'message': e.error.message,
                    'code': 'invalid_request_error',
                    'type': 'api_error',
                    'param': e.error.param
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.AuthenticationError as e:
            # Authentication with Stripe's API failed
            return Response({
                'error': {
                    'message': "Authentication with payment processor failed.",
                    'code': 'authentication_error',
                    'type': 'api_error'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
        except stripe.error.APIConnectionError as e:
            # Network communication with Stripe failed
            return Response({
                'error': {
                    'message': "Network error. Please try again.",
                    'code': 'api_connection_error',
                    'type': 'api_error'
                }
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except stripe.error.StripeError as e:
            # Display a very generic error to the user
            return Response({
                'error': {
                    'message': "Payment processing error. Please try again.",
                    'code': 'stripe_error',
                    'type': 'api_error'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Something else happened, completely unrelated to Stripe
            return Response({
                'error': {
                    'message': "An unexpected error occurred. Please try again.",
                    'code': 'server_error',
                    'type': 'server_error'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# In payments/views.py
class ConfirmPaymentView(APIView):
    def post(self, request, *args, **kwargs):
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response(
                {'error': 'Payment intent ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Confirm the payment intent
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Find the associated payment and order
            try:
                payment = Payment.objects.get(payment_intent_id=payment_intent_id)
                order = payment.order
                
                # Update payment status
                payment.status = 'completed' if payment_intent.status == 'succeeded' else payment.status
                payment.save()
                
                # Update order status if payment succeeded
                if payment_intent.status == 'succeeded':
                    order.payment_status = 'paid'
                    order.save()
            except Payment.DoesNotExist:
                pass
            
            return Response({
                'status': payment_intent.status,
                'payment_intent_id': payment_intent_id
            })
            
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class PaymentListView(APIView):
    """
    List all payments with optional filtering
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        try:
            # Get query parameters for filtering
            payment_method = request.query_params.get('payment_method')
            status_filter = request.query_params.get('status')
            order_id = request.query_params.get('order_id')
            
            # Start with all payments
            payments = Payment.objects.all().order_by('-created_at')
            
            # Apply filters if provided
            if payment_method:
                if payment_method == 'split':
                    payments = payments.filter(is_split_payment=True)
                else:
                    payments = payments.filter(payment_method=payment_method)
            
            if status_filter:
                payments = payments.filter(status=status_filter)
                
            if order_id:
                payments = payments.filter(order_id=order_id)
            
            # Serialize the data
            serializer = PaymentSerializer(payments, many=True)
            
            # Add order_id to each payment for easy reference
            for payment_data, payment_obj in zip(serializer.data, payments):
                payment_data['order_id'] = payment_obj.order_id
            
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve payments: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentDetailView(APIView):
    """
    Retrieve a single payment by ID with robust error handling
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, payment_id, *args, **kwargs):
        try:
            # Get the payment object or return 404
            payment = get_object_or_404(Payment, id=payment_id)
            serializer = PaymentSerializer(payment)
            
            # Add order_id to the serialized data
            data = serializer.data
            data['order_id'] = payment.order_id
            
            # If it's a credit card payment with a payment intent ID, fetch additional details
            if payment.payment_method == 'credit' and payment.payment_intent_id:
                self._enhance_credit_payment_data(payment, data)
            
            return Response(data)
        except Exception as e:
            # Log the full exception details for debugging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error retrieving payment {payment_id}: {str(e)}")
            logger.error(traceback.format_exc())
            
            return Response(
                {'error': f'Failed to retrieve payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _enhance_credit_payment_data(self, payment, data):
        """
        Enhance payment data with Stripe credit card details
        
        Args:
            payment: Payment model instance
            data: Dictionary containing serialized payment data to enhance
        """
        try:
            # Step 1: Retrieve the payment intent, focusing on the essential fields first
            payment_intent = self._get_payment_intent(payment.payment_intent_id)
            if not payment_intent:
                data['stripe_error'] = "Could not retrieve payment intent"
                return
            
            # Step 2: Extract and add payment status from the intent
            data['stripe_status'] = payment_intent.status
            
            # Step 3: Try to get card details
            card_details = self._extract_card_details(payment_intent)
            if card_details:
                data['card_details'] = card_details
            
            # Step 4: Try to get refund information
            refunds = self._get_refunds(payment_intent)
            if refunds:
                data['refunds'] = refunds
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error enhancing credit payment data: {str(e)}")
            data['stripe_error'] = "Could not retrieve additional payment details"
    
    def _get_payment_intent(self, payment_intent_id):
        """
        Safely retrieve a payment intent from Stripe
        
        Args:
            payment_intent_id: The Stripe payment intent ID
            
        Returns:
            Payment intent object or None if retrieval fails
        """
        try:
            # First try with minimal expansion to ensure we get the basic intent
            return stripe.PaymentIntent.retrieve(
                payment_intent_id,
                expand=['payment_method']
            )
        except stripe.error.StripeError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Stripe error retrieving payment intent {payment_intent_id}: {str(e)}")
            return None
    
    def _extract_card_details(self, payment_intent):
        """
        Extract card details from a payment intent
        
        Args:
            payment_intent: Stripe payment intent object
            
        Returns:
            Dictionary with card details or None if unavailable
        """
        try:
            # Method 1: Try to get card details from charges if available
            if self._has_charges(payment_intent):
                return self._extract_card_from_charges(payment_intent)
            
            # Method 2: If no charges, try to get from separate charges API call
            return self._extract_card_from_charges_api(payment_intent.id)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error extracting card details: {str(e)}")
            return None
    
    def _has_charges(self, payment_intent):
        """Check if payment intent has valid charges data"""
        return (hasattr(payment_intent, 'charges') and 
                payment_intent.charges is not None and 
                hasattr(payment_intent.charges, 'data') and 
                payment_intent.charges.data)
    
    def _extract_card_from_charges(self, payment_intent):
        """Extract card details from payment intent charges"""
        try:
            charge = payment_intent.charges.data[0]
            if hasattr(charge, 'payment_method_details'):
                pmd = charge.payment_method_details
                
                # Handle card_present case
                if hasattr(pmd, 'card_present'):
                    card = pmd.card_present
                    return {
                        'brand': getattr(card, 'brand', 'Unknown'),
                        'last4': getattr(card, 'last4', '****'),
                        'exp_month': getattr(card, 'exp_month', None),
                        'exp_year': getattr(card, 'exp_year', None),
                        'source': 'card_present'
                    }
                
                # Handle regular card case
                elif hasattr(pmd, 'card'):
                    card = pmd.card
                    return {
                        'brand': getattr(card, 'brand', 'Unknown'),
                        'last4': getattr(card, 'last4', '****'),
                        'exp_month': getattr(card, 'exp_month', None),
                        'exp_year': getattr(card, 'exp_year', None),
                        'source': 'card'
                    }
            return None
        except (IndexError, AttributeError) as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error extracting card from charges: {str(e)}")
            return None
    
    def _extract_card_from_charges_api(self, payment_intent_id):
        """Get card details from separate charges API call"""
        try:
            charges = stripe.Charge.list(payment_intent=payment_intent_id)
            if charges and charges.data:
                charge = charges.data[0]
                if hasattr(charge, 'payment_method_details'):
                    pmd = charge.payment_method_details
                    
                    # Handle card_present case
                    if hasattr(pmd, 'card_present'):
                        card = pmd.card_present
                        return {
                            'brand': getattr(card, 'brand', 'Unknown'),
                            'last4': getattr(card, 'last4', '****'),
                            'exp_month': getattr(card, 'exp_month', None),
                            'exp_year': getattr(card, 'exp_year', None),
                            'source': 'card_present_api'
                        }
                    
                    # Handle regular card case
                    elif hasattr(pmd, 'card'):
                        card = pmd.card
                        return {
                            'brand': getattr(card, 'brand', 'Unknown'),
                            'last4': getattr(card, 'last4', '****'),
                            'exp_month': getattr(card, 'exp_month', None),
                            'exp_year': getattr(card, 'exp_year', None),
                            'source': 'card_api'
                        }
            return None
        except stripe.error.StripeError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Stripe error listing charges: {str(e)}")
            return None
    
    def _get_refunds(self, payment_intent):
        """
        Get refund information for a payment intent
        
        Args:
            payment_intent: Stripe payment intent object
            
        Returns:
            List of refund details or empty list if unavailable
        """
        refunds = []
        try:
            # Try to get charge ID from payment intent
            charge_id = None
            
            # Method 1: From charges in payment intent
            if self._has_charges(payment_intent):
                charge_id = payment_intent.charges.data[0].id
            
            # Method 2: From separate charges API call
            else:
                charges = stripe.Charge.list(payment_intent=payment_intent.id)
                if charges and charges.data:
                    charge_id = charges.data[0].id
            
            # If we have a charge ID, get refunds
            if charge_id:
                refund_list = stripe.Refund.list(charge=charge_id)
                
                for refund in refund_list.data:
                    refunds.append({
                        'id': refund.id,
                        'amount': refund.amount / 100,  # Convert cents to dollars
                        'status': refund.status,
                        'created_at': refund.created,
                        'reason': getattr(refund, 'reason', 'Not specified')
                    })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting refunds: {str(e)}")
            # Return empty list - don't block the whole response for refund data
        
        return refunds


class PaymentRefundView(APIView):
    """
    Process a refund for a payment
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, payment_id, *args, **kwargs):
        try:
            payment = get_object_or_404(Payment, id=payment_id)
            
            # Check if payment can be refunded
            if payment.status != 'completed':
                return Response(
                    {'error': 'Only completed payments can be refunded'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if payment has a payment intent ID for Stripe
            if not payment.payment_intent_id and payment.payment_method == 'credit':
                return Response(
                    {'error': 'Payment does not have a valid payment intent ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get refund amount and reason from request
            amount = request.data.get('amount')
            reason = request.data.get('reason', 'requested_by_customer')
            
            # If no amount specified, refund the full amount
            if not amount:
                amount = payment.amount
            
            # Process refund based on payment method
            if payment.payment_method == 'credit':
                try:
                    print(f"Processing refund for payment: {payment_id}, intent: {payment.payment_intent_id}")
                    
                    # Try to find charges for this payment intent
                    charges = stripe.Charge.list(payment_intent=payment.payment_intent_id)
                    
                    print(f"Found {len(charges.data)} charges for this payment intent")
                    
                    if not charges.data:
                        # If no charges found, try to get latest charges for the customer
                        if payment.order and payment.order.user:
                            print("No charges found by payment intent, searching by customer")
                            customer_email = payment.order.user.email
                            # Try to find customer
                            customers = stripe.Customer.list(email=customer_email)
                            if customers.data:
                                customer_id = customers.data[0].id
                                charges = stripe.Charge.list(customer=customer_id, limit=5)
                                print(f"Found {len(charges.data)} charges for customer {customer_id}")
                        
                        # If still no charges, return error
                        if not charges.data:
                            return Response(
                                {'error': 'No charges found for this payment'},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    
                    # Get the most recent charge
                    charge = charges.data[0]
                    charge_id = charge.id
                    
                    print(f"Using charge ID: {charge_id} for refund")
                    
                    # Create refund
                    refund = stripe.Refund.create(
                        charge=charge_id,
                        amount=int(float(amount) * 100),  # Convert to cents
                        reason=reason
                    )
                    
                    # Update payment status
                    payment.status = 'refunded'
                    payment.save()
                    
                    # Update order payment status
                    order = payment.order
                    order.payment_status = 'refunded'
                    order.save()
                    
                    return Response({
                        'success': True,
                        'refund_id': refund.id,
                        'status': refund.status,
                        'amount': amount
                    })
                except Exception as e:
                    import traceback
                    print(f"Error in credit card refund: {str(e)}")
                    print(traceback.format_exc())
                    raise e
            
            elif payment.payment_method == 'cash':
                # For cash payments, just update the status
                payment.status = 'refunded'
                payment.save()
                
                # Update order payment status
                order = payment.order
                order.payment_status = 'refunded'
                order.save()
                
                return Response({
                    'success': True,
                    'status': 'refunded',
                    'amount': amount
                })
            else:
                return Response(
                    {'error': f'Unsupported payment method for refund: {payment.payment_method}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except stripe.error.StripeError as e:
            import traceback
            print(f"Stripe error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Stripe error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            print(f"General error in refund: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Failed to process refund: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )