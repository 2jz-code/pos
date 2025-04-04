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
from django.db import transaction
import logging


logger = logging.getLogger(__name__)


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
            
            # Convert to cents for Stripe
            amount_cents = int(float(amount) * 100)
            
            # Optional parameters
            order_id = request.data.get('order_id')
            description = request.data.get('description', 'Terminal payment')
            
            # Create metadata
            metadata = {'source': 'terminal'}
            
            # Add order information if provided
            order = None
            if order_id:
                try:
                    order = Order.objects.get(id=order_id)
                    metadata['order_id'] = str(order_id)
                    description = f"Payment for Order #{order_id}"
                except Order.DoesNotExist:
                    return Response(
                        {'error': f'Order with ID {order_id} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Create the payment intent within a transaction
            with transaction.atomic():
                payment_intent = create_terminal_payment_intent(
                    amount=amount_cents,
                    metadata=metadata,
                    description=description
                )
                
                # Create or update Payment record if order was provided
                if order:
                    # Check if payment already exists for this order
                    try:
                        # Try to get existing payment
                        existing_payment = Payment.objects.get(order=order)
                        
                        # Update the existing payment with new payment intent
                        existing_payment.payment_intent_id = payment_intent.id
                        existing_payment.payment_method = "card"
                        existing_payment.amount = float(amount)
                        existing_payment.status = 'pending'
                        existing_payment.save()
                        
                        print(f"Updated existing payment {existing_payment.id} for order {order_id}")
                    except Payment.DoesNotExist:
                        # Create new payment if none exists
                        payment = Payment.objects.create(
                            order=order,
                            payment_intent_id=payment_intent.id,
                            amount=float(amount),
                            status='pending'
                        )
                        print(f"Created new payment {payment.id} for order {order_id}")
            
            # Return the client secret
            return Response({
                'client_secret': payment_intent.client_secret,
                'id': payment_intent.id
            })
            
        except stripe.error.StripeError as e:
            print(f"Stripe error: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
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
            # Capture the payment intent
            payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
            
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
                'payment_intent_id': payment_intent_id,
                'id': payment_intent.id,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                # 'payment_method_details': payment_intent.payment_method_details,
                'created': payment_intent.created
            })
            
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ReaderStatusView(APIView):
    """
    Check the status of a specific registered reader
    """
    def get(self, request, *args, **kwargs):
        try:
            # Get reader ID from request parameters or use default if provided
            reader_id = request.query_params.get('reader_id', 'tmr_F9NiKA2GgcXTyg')
            
            # Retrieve the specific reader
            reader = stripe.terminal.Reader.retrieve(reader_id)
            
            # Format the reader data
            reader_data = {
                'id': reader.id,
                'device_type': reader.device_type,
                'status': reader.status,
                'label': getattr(reader, 'label', None),  # Use getattr for optional fields
                'location': getattr(reader, 'location', None),
                'serial_number': getattr(reader, 'serial_number', None)
            }
            
            return Response({
                'reader': reader_data,
                'success': True
            })
        except stripe.error.InvalidRequestError as e:
            # Handle case where reader doesn't exist
            return Response(
                {'error': f"Reader not found: {str(e)}", 'success': False},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Handle other errors
            return Response(
                {'error': f"Error retrieving reader: {str(e)}", 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SimulateCardPresentationView(APIView):
    """
    Simulate presenting a payment method to a terminal
    """
    def post(self, request, *args, **kwargs):
        try:
            # Get the reader ID from the request
            reader_id = request.data.get('reader_id')
            
            if not reader_id:
                return Response(
                    {'error': 'Reader ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use Stripe's Test Helpers API to simulate presenting a payment method
            presentation = stripe.terminal.Reader.TestHelpers.present_payment_method(
                reader_id
            )
            
            return Response({
                'success': True,
                'reader_id': reader_id,
                'status': 'payment_method_presented'
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
        
class PaymentIntentStatusView(APIView):
    """
    Get the status of a payment intent
    """
    def get(self, request, payment_intent_id, *args, **kwargs):
        try:
            # Retrieve the payment intent with valid expansion
            payment_intent = stripe.PaymentIntent.retrieve(
                payment_intent_id,
                expand=['payment_method']  # Remove 'payment_method_details' from expand
            )
            
            # Return the payment intent data
            return Response({
                'id': payment_intent.id,
                'status': payment_intent.status,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                # 'payment_method_details': payment_intent.payment_method_details,  # This will still be included, just not expanded
                'created': payment_intent.created
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
        
class ProcessPaymentMethodView(APIView):
    """
    Process a payment method on a terminal reader
    """
    def post(self, request, *args, **kwargs):
        try:
            # Get the reader ID and payment intent ID from the request
            reader_id = request.data.get('reader_id')
            payment_intent_id = request.data.get('payment_intent_id')
            
            if not reader_id:
                return Response(
                    {'error': 'Reader ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if not payment_intent_id:
                return Response(
                    {'error': 'Payment Intent ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process the payment method on the reader
            process_payment = stripe.terminal.Reader.process_payment_intent(
                reader_id,
                payment_intent=payment_intent_id,
            )
            
            return Response({
                'success': True,
                'reader_id': reader_id,
                'payment_intent_id': payment_intent_id,
                'status': process_payment.status
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
        
class CheckPaymentCompletionView(APIView):
    """
    Check if a payment has been completed on the terminal
    """
    def get(self, request, payment_intent_id, *args, **kwargs):
        try:
            # Retrieve the payment intent
            payment_intent = stripe.PaymentIntent.retrieve(
                payment_intent_id,
                expand=['payment_method', 'charges.data.payment_method_details']
            )
            
            # Check if the payment is complete
            is_complete = payment_intent.status == 'succeeded'
            
            # Get card details if available
            card_details = None
            if is_complete and payment_intent.charges and payment_intent.charges.data:
                charge = payment_intent.charges.data[0]
                if hasattr(charge, 'payment_method_details') and charge.payment_method_details:
                    card_details = charge.payment_method_details.card_present
            
            return Response({
                'id': payment_intent.id,
                'status': payment_intent.status,
                'is_complete': is_complete,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                'card_details': card_details,
                'created': payment_intent.created
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )