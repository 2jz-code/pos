# payments/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.shortcuts import get_object_or_404
from orders.models import Order
from .models import Payment
from .stripe_utils import create_payment_intent
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

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
        
        # Verify order belongs to the current user or is a valid guest order
        if request.user.is_authenticated:
            if order.user and order.user != request.user:
                return Response(
                    {'error': 'Order not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # For guest users, verify using guest_id from cookie
            guest_id = request.COOKIES.get('guest_id')
            if not guest_id or order.guest_id != guest_id:
                return Response(
                    {'error': 'Order not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Check if order already has a payment
        if hasattr(order, 'payment') and order.payment.status == 'completed':
            return Response(
                {'error': 'This order has already been paid for'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
                    payment.save()
                else:
                    payment = Payment.objects.create(
                        order=order,
                        payment_intent_id=payment_intent.id,
                        amount=order.total_price
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

# payments/views.py
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
                    'amount': order.total_price,
                    'status': 'completed' if payment_intent.status == 'succeeded' else 'pending'
                }
            )
            
            if not created:
                payment.payment_intent_id = payment_intent.id
                payment.payment_method_id = payment_method_id
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