# payments/terminal_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .terminal_utils import create_connection_token, create_terminal_payment_intent
from .models import Payment
from orders.models import Order
from django.shortcuts import get_object_or_404
import stripe
import json

class ConnectionTokenView(APIView):
    """
    Generate a connection token for Stripe Terminal
    """
    def post(self, request, *args, **kwargs):
        try:
            token = create_connection_token()
            return Response({'secret': token})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TerminalPaymentIntentView(APIView):
    """
    Create a payment intent for Stripe Terminal
    """
    def post(self, request, *args, **kwargs):
        try:
            # Get amount from request data
            amount = request.data.get('amount')
            
            if not amount:
                return Response(
                    {'error': 'Amount is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convert to cents if needed
            amount_cents = int(float(amount))
            
            # Optional parameters
            order_id = request.data.get('order_id')
            description = request.data.get('description', 'Terminal payment')
            
            # Create metadata
            metadata = {'source': 'terminal'}
            
            # Add order information if provided
            if order_id:
                try:
                    order = Order.objects.get(id=order_id)
                    metadata['order_id'] = order_id
                    
                    # Update description with order info
                    description = f"Payment for Order #{order_id}"
                except Order.DoesNotExist:
                    pass
            
            # Create the payment intent
            payment_intent = create_terminal_payment_intent(
                amount=amount_cents,
                metadata=metadata,
                description=description
            )
            
            # Create a Payment record if order was provided
            if order_id and 'order' in locals():
                Payment.objects.create(
                    order=order,
                    payment_intent_id=payment_intent.id,
                    amount=amount / 100,  # Convert back from cents
                    status='pending'
                )
            
            # Return the client secret
            return Response({
                'client_secret': payment_intent.client_secret,
                'id': payment_intent.id
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TerminalPaymentCaptureView(APIView):
    """
    Capture a payment intent for Stripe Terminal
    """
    def post(self, request, *args, **kwargs):
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response(
                {'error': 'Payment intent ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve the payment intent
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Find the associated payment
            try:
                payment = Payment.objects.get(payment_intent_id=payment_intent_id)
                
                # Update payment status
                if payment_intent.status == 'succeeded':
                    payment.status = 'completed'
                    payment.save()
                    
                    # Update order status if payment succeeded
                    order = payment.order
                    order.payment_status = 'paid'
                    order.save()
            except Payment.DoesNotExist:
                # No payment record found, just continue
                pass
            
            return Response({
                'status': payment_intent.status,
                'payment_intent_id': payment_intent_id
            })
            
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ReaderStatusView(APIView):
    """
    Check the status of registered readers
    """
    def get(self, request, *args, **kwargs):
        try:
            readers = stripe.terminal.Reader.list(limit=10)
            
            reader_data = [{
                'id': reader.id,
                'device_type': reader.device_type,
                'status': reader.status,
                'label': reader.label,
                'location': reader.location,
                'serial_number': reader.serial_number
            } for reader in readers.data]
            
            return Response({
                'readers': reader_data,
                'reader_count': len(reader_data)
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )