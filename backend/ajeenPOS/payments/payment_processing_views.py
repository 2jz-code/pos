# payments/payment_processing_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from orders.models import Order
from .models import Payment
import stripe
import json
import logging

logger = logging.getLogger(__name__)

class ProcessCashPaymentView(APIView):
    """
    Process a cash payment for an order
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        amount = request.data.get('amount')
        cash_tendered = request.data.get('cashTendered')
        
        if not order_id or not amount:
            return Response(
                {'error': 'Order ID and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the order
            order = get_object_or_404(Order, id=order_id)
            
            # Create or update payment record
            with transaction.atomic():
                payment, created = Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        'payment_method': 'cash',
                        'amount': amount,
                        'status': 'completed'
                    }
                )
                
                if not created:
                    payment.payment_method = 'cash'
                    payment.amount = amount
                    payment.status = 'completed'
                    payment.save()
                
                # For backward compatibility, set the transactions_json
                payment.transactions_json = json.dumps([{
                    'method': 'cash',
                    'amount': float(amount),
                    'cashTendered': float(cash_tendered) if cash_tendered else float(amount),
                    'change': float(cash_tendered) - float(amount) if cash_tendered else 0
                }])
                payment.save()
                
                # Update order payment status
                order.payment_status = 'paid'
                order.save()
            
            return Response({
                'success': True,
                'payment': {
                    'id': payment.id,
                    'method': 'cash',
                    'amount': float(amount),
                    'status': 'completed',
                    'cashTendered': float(cash_tendered) if cash_tendered else float(amount),
                    'change': float(cash_tendered) - float(amount) if cash_tendered else 0
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing cash payment: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProcessCreditPaymentView(APIView):
    """
    Process a credit card payment for an order
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        payment_intent_id = request.data.get('payment_intent_id')
        amount = request.data.get('amount')
        
        if not order_id or not payment_intent_id or not amount:
            return Response(
                {'error': 'Order ID, payment intent ID, and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the order
            order = get_object_or_404(Order, id=order_id)
            
            # Create or update payment record
            with transaction.atomic():
                payment, created = Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        'payment_method': 'credit',
                        'payment_intent_id': payment_intent_id,
                        'amount': amount,
                        'status': 'completed'
                    }
                )
                
                if not created:
                    payment.payment_method = 'credit'
                    payment.payment_intent_id = payment_intent_id
                    payment.amount = amount
                    payment.status = 'completed'
                    payment.save()
                
                # For backward compatibility, set the transactions_json
                payment.transactions_json = json.dumps([{
                    'method': 'credit',
                    'amount': float(amount),
                    'payment_intent_id': payment_intent_id
                }])
                payment.save()
                
                # Update order payment status
                order.payment_status = 'paid'
                order.save()
            
            return Response({
                'success': True,
                'payment': {
                    'id': payment.id,
                    'method': 'credit',
                    'amount': float(amount),
                    'status': 'completed',
                    'payment_intent_id': payment_intent_id
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing credit payment: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProcessSplitPaymentView(APIView):
    """
    Process a split payment for an order
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        transactions = request.data.get('transactions', [])
        
        if not order_id or not transactions:
            return Response(
                {'error': 'Order ID and transactions are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the order
            order = get_object_or_404(Order, id=order_id)
            
            # Calculate total amount from transactions
            total_amount = sum(float(t.get('amount', 0)) for t in transactions)
            
            # Create or update payment record
            with transaction.atomic():
                payment, created = Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        'payment_method': 'split',
                        'amount': total_amount,
                        'status': 'completed',
                        'is_split_payment': True
                    }
                )
                
                if not created:
                    payment.payment_method = 'split'
                    payment.amount = total_amount
                    payment.status = 'completed'
                    payment.is_split_payment = True
                    payment.save()
                
                # Store the transactions in JSON format
                payment.transactions_json = json.dumps(transactions)
                payment.save()
                
                # Update order payment status
                order.payment_status = 'paid'
                order.save()
            
            return Response({
                'success': True,
                'payment': {
                    'id': payment.id,
                    'method': 'split',
                    'amount': total_amount,
                    'status': 'completed',
                    'transactions': transactions
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing split payment: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )