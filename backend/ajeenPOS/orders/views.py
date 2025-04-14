# combined-project/backend/orders/views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
# Updated imports: Import PaymentTransaction
from payments.models import Payment, PaymentTransaction
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderListSerializer
from products.models import Product
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction # Import transaction
import json
import decimal # Import decimal
from django.http import JsonResponse
from rest_framework.pagination import PageNumberPagination
from discounts.models import Discount
from decimal import Decimal
from django.db.models import F

class OrderPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

# ✅ List Orders (Now Updates Instead of Duplicating)
class OrderList(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = OrderPagination

    def get_serializer_class(self):
        """Use different serializers for list and detail views"""
        if self.request.method == 'GET':
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        """
        Get optimized queryset with proper prefetching to reduce database queries
        """
        # Start with base queryset
        # Added payment__transactions to prefetch related transactions
        queryset = Order.objects.select_related('user', 'payment', 'discount').prefetch_related(
            'items__product',
            'payment__transactions'
        ).order_by('-created_at')

        # Apply filters
        source = self.request.query_params.get('source')
        status_param = self.request.query_params.get('status')

        if source:
            queryset = queryset.filter(source=source)

        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to add metadata about orders
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        """
        If an 'in_progress' order exists, mark it as 'saved' instead of creating a new one.
        """
        user = request.user
        existing_order = Order.objects.filter(user=user, status="in_progress").first()

        if existing_order:
            existing_order.status = "saved"
            existing_order.save()
            return Response(OrderSerializer(existing_order).data, status=status.HTTP_200_OK)

        # If no in-progress order exists, create a new saved order
        data = request.data
        order = Order.objects.create(user=user, status="saved")

        for item in data.get("items", []):
            product = get_object_or_404(Product, id=item["product_id"])
            # Ensure unit_price is stored
            OrderItem.objects.create(order=order, product=product, quantity=item["quantity"], unit_price=product.price)

        order.calculate_total_price()
        order.save() # Save order to get ID before creating payment
        # Ensure payment is created for saved orders too
        Payment.objects.get_or_create(order=order, defaults={'status': 'pending', 'amount': order.total_price})
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

# ✅ Get, Update, or Delete an Order (Now Supports "in_progress")
class OrderDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """
        Updates an order's status or items.
        - If the order is 'in_progress', it updates cart contents.
        - If changing status (e.g., 'in_progress' → 'saved' or 'completed'), it updates accordingly.
        """
        order = self.get_object()
        data = request.data

        # ✅ Only clear & update items if new items are provided
        if "items" in data:
            with transaction.atomic(): # Wrap item update in transaction
                order.items.all().delete()  # Clear existing items

                for item_data in data["items"]:
                    product = get_object_or_404(Product, id=item_data["id"])
                    # Ensure unit_price is stored when updating items
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data["quantity"],
                        unit_price=product.price # Store current price
                    )

        # ✅ Update status if provided (e.g., 'saved', 'completed')
        if "status" in data:
            order.status = data["status"]

        order.calculate_total_price()
        order.save()

        # Update payment amount if it exists
        try:
            payment = Payment.objects.get(order=order)
            payment.amount = order.total_price
            payment.save()
        except Payment.DoesNotExist:
            # If payment doesn't exist yet, create it (e.g., if order moved from saved to in_progress)
            if order.status == 'in_progress':
                 Payment.objects.create(order=order, status='pending', amount=order.total_price)

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


# ✅ Start Order (Ensures Only One In-Progress Order)
class StartOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Starts a new 'in_progress' order without checking for existing ones.
        Also creates an associated Payment record.
        """
        user = request.user
        new_order = Order.objects.create(user=user, status="in_progress")
        # Create payment record immediately
        Payment.objects.create(order=new_order, status = "pending", amount=decimal.Decimal('0.00')) # Initialize payment with 0 amount
        return Response(OrderSerializer(new_order).data, status=status.HTTP_201_CREATED)


# ✅ Auto-Save "In-Progress" Order
class UpdateInProgressOrder(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """
        Updates only the specific 'in_progress' order provided in the request.
        """
        user = request.user
        order_id = request.data.get("order_id")

        if not order_id:
            return Response({"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use select_related to fetch payment along with order
            order = get_object_or_404(Order.objects.select_related('payment'), id=order_id, user=user, status="in_progress")
        except Order.DoesNotExist:
            return Response({"error": "In-progress order not found or does not belong to user"}, status=status.HTTP_404_NOT_FOUND)


        with transaction.atomic(): # Wrap updates in a transaction
            # ✅ Remove old items linked to this order
            order.items.all().delete()

            # ✅ Add new items to the order
            for item_data in request.data.get("items", []):
                try:
                    # Frontend might send product ID as 'id' or 'product_id'
                    product_id = item_data.get("id") or item_data.get("product_id")
                    if not product_id:
                        continue # Skip if no product ID
                    product = get_object_or_404(Product, id=product_id)
                    # Ensure unit_price is stored
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data["quantity"],
                        unit_price=product.price
                    )
                except Product.DoesNotExist:
                    print(f"Warning: Product ID {product_id} not found during cart update for order {order_id}")
                    # Optionally return an error:
                    # return Response({"error": f"Product ID {product_id} not found"}, status=status.HTTP_400_BAD_REQUEST)
                except KeyError:
                    print(f"Warning: Missing 'quantity' for item during cart update for order {order_id}")
                    # Optionally return an error:
                    # return Response({"error": "Missing 'quantity' for an item"}, status=status.HTTP_400_BAD_REQUEST)

            # ✅ Recalculate total price and save order
            order.calculate_total_price() # This should handle discounts if applied
            order.save()

            # ✅ Update associated Payment amount
            # Use the prefetched payment object if available
            payment = getattr(order, 'payment', None)
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                # If somehow payment doesn't exist, create it
                Payment.objects.create(order=order, status='pending', amount=order.total_price)


        return Response({"message": "Order auto-saved", "order": OrderSerializer(order).data})


# ✅ Resume a Saved Order
class ResumeOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        order = get_object_or_404(
            Order.objects.select_related('payment').prefetch_related("items__product"), # Select payment
            id=pk, user=request.user, status__in=["saved"] # Only resume 'saved' orders
        )

        # If resuming a saved order, change status to in_progress
        order.status = "in_progress"
        order.save()

        # Get or create payment record if it somehow doesn't exist
        payment, created = Payment.objects.get_or_create(order=order, defaults={'status': 'pending', 'amount': order.total_price})
        if payment.status != 'pending': # Ensure payment status is pending when resuming
            payment.status = 'pending'
            payment.save()

        serialized_order = OrderSerializer(order).data
        return Response(serialized_order, status=status.HTTP_200_OK)


# ✅ Get Latest In-Progress Order (Auto-Resume on Reload)
class GetInProgressOrder(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """
        Fetch the last in-progress order for auto-resume.
        """
        user = request.user
        order = Order.objects.filter(user=user, status="in_progress").order_by("-created_at").first()

        if order:
            # Ensure payment exists
            Payment.objects.get_or_create(order=order, defaults={'status': 'pending', 'amount': order.total_price})
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

        return Response({"message": "No active order found"}, status=status.HTTP_404_NOT_FOUND)


class CompleteOrder(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic # Wrap the entire completion process in a transaction
    def post(self, request, pk, *args, **kwargs):
        try:
            print(f"--- Completing Order {pk} ---")
            # Log the raw request body for debugging
            try:
                print("Request Body RAW:", request.body.decode('utf-8')) # Decode bytes to string
            except Exception as decode_err:
                print("Request Body Decode Error:", decode_err)
                print("Request Body (bytes):", request.body)

            request_data = request.data # Use a shorter variable name

            # Fetch order ensuring it's in progress and belongs to the user
            order = get_object_or_404(Order.objects.select_related('discount', 'payment'), id=pk, user=request.user, status="in_progress")

            # Extract payment details from the request body
            payment_details_data = request_data.get("payment_details", {})
            transactions_data = payment_details_data.get("transactions", [])

            print(f"Order Status Before: {order.status}, Payment Status Before: {order.payment_status}")
            print(f"Transactions data received: {len(transactions_data)} transaction(s)")

            # Validate if transaction data is present (Important for recording payment)
            # Allow completion even without frontend transactions if payment handled externally/fully
            # if not transactions_data:
            #     print("Warning: No detailed transaction data provided by frontend.")
                # Depending on flow, this might be an error or acceptable
                # return Response({"status": "error", "message": "No transaction data provided"}, status=status.HTTP_400_BAD_REQUEST)

            # --- FIX: Extract Tip Amount from top level ---
            # Use Decimal for financial calculations, default to 0 if not provided or invalid
            try:
                frontend_tip_amount = Decimal(request_data.get("tip_amount", '0.00'))
                if frontend_tip_amount < 0:
                     frontend_tip_amount = Decimal('0.00') # Ensure tip is not negative
            except (TypeError, decimal.InvalidOperation):
                 print(f"Warning: Invalid tip_amount received ('{request_data.get('tip_amount')}'), defaulting to 0.00")
                 frontend_tip_amount = Decimal('0.00')
            order.tip_amount = frontend_tip_amount # Save the tip amount to the order
            print(f"Extracted Tip Amount: {order.tip_amount}")
            # --- END FIX ---

            # --- Update Order Status and Details ---
            order.status = "completed"
            order.payment_status = "paid" # Assume paid if this endpoint is hit successfully

            # Apply discount if provided in the main request body
            discount_id = request_data.get("discount_id")
            if discount_id:
                try:
                    discount = Discount.objects.get(id=discount_id, is_active=True) # Ensure discount is active
                    order.discount = discount
                    # Use the discount amount provided by the frontend payload
                    try:
                        order.discount_amount = Decimal(request_data.get("discount_amount", '0.00'))
                        if order.discount_amount < 0: order.discount_amount = Decimal('0.00')
                    except (TypeError, decimal.InvalidOperation):
                        order.discount_amount = Decimal('0.00')

                    # Increment usage count only if the order is successfully completed here
                    # (Moved discount saving inside this block)
                    discount.used_count = F('used_count') + 1 # Use F expression for atomic increment
                    discount.save(update_fields=['used_count']) # Only update used_count
                    print(f"Applied discount {discount_id}. Amount: {order.discount_amount}")
                except Discount.DoesNotExist:
                    print(f"Warning: Discount ID {discount_id} not found or inactive, not applying discount.")
                    order.discount = None
                    order.discount_amount = Decimal('0.00')
            else:
                # Ensure no discount is applied if not provided
                order.discount = None
                order.discount_amount = Decimal('0.00')
                print("No discount applied.")

            # --- FIX: Use the total_amount from the payload ---
            # This total *should* include the tip calculated by the frontend
            try:
                final_total_from_payload = Decimal(request_data.get("total_amount", '0.00'))
                 # Basic validation: Ensure it's not drastically different from a server-side calculation
                 # (Recalculate server-side for verification)
                server_calculated_total = order.calculate_total_price(tip_to_add=order.tip_amount)
                if abs(final_total_from_payload - server_calculated_total) > Decimal('0.01'):
                     print(f"Warning: Discrepancy between frontend total ({final_total_from_payload}) and server total ({server_calculated_total}). Using server calculated total.")
                     order.total_price = server_calculated_total
                else:
                     order.total_price = final_total_from_payload # Trust frontend total if close enough
            except (TypeError, decimal.InvalidOperation):
                 print(f"Warning: Invalid total_amount received ('{request_data.get('total_amount')}'), recalculating server-side.")
                 order.total_price = order.calculate_total_price(tip_to_add=order.tip_amount) # Fallback to server calculation

            order.save() # Save order changes (including tip, status, discount, total)
            print(f"Order {pk} marked as completed. Final total: {order.total_price}")
            # --- END FIX ---

            # --- Get or Create/Update Payment Record ---
            # Use update_or_create for atomicity and correctness
            payment_method_str = payment_details_data.get("paymentMethod", "other")[:50] # Truncate if needed
            payment, created = Payment.objects.update_or_create(
                order=order,
                defaults={
                    'status': 'completed',
                    'amount': order.total_price, # Use the final saved order total
                    'payment_method': payment_method_str,
                    'is_split_payment': payment_details_data.get("splitPayment", False) or (len(transactions_data) > 1)
                }
            )
            action_word = "Created" if created else "Updated"
            print(f"{action_word} Payment {payment.id} for Order {pk}. Status: {payment.status}, Amount: {payment.amount}, Method: {payment.payment_method}, Split: {payment.is_split_payment}")


            # --- Create PaymentTransaction records ---
            # Only process if transactions_data is actually present and is a list
            if isinstance(transactions_data, list) and transactions_data:
                total_paid_in_transactions = Decimal(0)
                # Clear existing transactions first? Only if necessary. Usually append.
                # Let's clear to represent the *final* state accurately based on frontend payload
                payment.transactions.all().delete()
                print(f"Cleared existing transactions for Payment {payment.id} before adding new ones.")

                for txn_data in transactions_data:
                    method = txn_data.get('method', 'other').lower()[:50] # Truncate if needed
                    amount_str = str(txn_data.get('amount', '0'))
                    try:
                        amount = Decimal(amount_str)
                        if amount <= 0:
                            print(f"Warning: Skipping transaction with zero/negative amount: {amount_str}")
                            continue
                    except decimal.InvalidOperation:
                        print(f"Warning: Invalid amount '{amount_str}' in transaction data. Skipping.")
                        continue

                    total_paid_in_transactions += amount

                    metadata = {}
                    card_info = txn_data.get('cardInfo', {})
                    flow_data = txn_data.get('flowData', {})
                    payment_in_flow = flow_data.get('payment', {}) if isinstance(flow_data.get('payment'), dict) else {}

                    if method == 'credit':
                        metadata['card_brand'] = card_info.get('brand') or payment_in_flow.get('cardInfo', {}).get('brand')
                        metadata['card_last4'] = card_info.get('last4') or payment_in_flow.get('cardInfo', {}).get('last4')
                        metadata['stripe_payment_status'] = payment_in_flow.get('status')
                        metadata['stripe_payment_timestamp'] = payment_in_flow.get('timestamp')
                    elif method == 'cash':
                        metadata['cashTendered'] = txn_data.get('cashTendered')
                        metadata['change'] = txn_data.get('change')

                    if payment.is_split_payment:
                         metadata['splitDetails'] = txn_data.get('splitDetails', {})


                    # Extract external transaction ID robustly
                    external_txn_id = txn_data.get('transactionId') or \
                                      txn_data.get('transaction_id') or \
                                      payment_in_flow.get('transactionId') or \
                                      payment_in_flow.get('transaction_id') # Check multiple common keys

                    # Create the transaction record
                    payment_txn = PaymentTransaction.objects.create(
                        parent_payment=payment,
                        payment_method=method,
                        amount=amount,
                        status='completed', # Assume completed if sent in final payload
                        transaction_id=external_txn_id,
                        # Safely serialize metadata
                        metadata_json=json.dumps(metadata, cls=DecimalEncoder) if metadata else None
                    )
                    print(f"Created PaymentTransaction {payment_txn.id}: Method={method}, Amount={amount}, ExtID={external_txn_id or 'N/A'}")

                # --- Final Verification (Optional but Recommended) ---
                # Compare total paid in transactions vs final order total
                if abs(total_paid_in_transactions - order.total_price) > Decimal('0.01'):
                     print(f"Warning: Discrepancy! Final Order total ({order.total_price}) != Sum of transactions ({total_paid_in_transactions}). Payment amount might be inaccurate if transactions are incomplete.")
                     # Optionally update payment.amount again if needed, but it should be correct from update_or_create
                     # payment.amount = total_paid_in_transactions
                     # payment.save(update_fields=['amount'])
                else:
                     print(f"Final amounts match: Order Total={order.total_price}, Transactions Sum={total_paid_in_transactions}")

            else:
                 print("No detailed transaction data provided in payload, skipping transaction record creation.")


            # --- Response ---
            order.refresh_from_db() # Refresh to get latest state
            print(f"Order {pk} completion process finished successfully.")

            return Response({
                "status": "success",
                "message": "Order completed successfully",
                "order": OrderSerializer(order).data # Use the refreshed order
            })

        except Order.DoesNotExist:
             print(f"Error: Order {pk} not found or not in 'in_progress' state.")
             return Response({"status": "error", "message": "Order not found or not in 'in_progress' state"}, status=status.HTTP_404_NOT_FOUND)
        except Discount.DoesNotExist:
             print(f"Error: Invalid Discount ID provided.")
             return Response({"status": "error", "message": "Invalid Discount ID provided."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            print(f"--- Error Completing Order {pk} ---")
            traceback.print_exc()
            # Try to give a more specific error if possible
            error_message = str(e)
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            if isinstance(e, (TypeError, ValueError, decimal.InvalidOperation)):
                 error_message = "Invalid data format received in request."
                 status_code = status.HTTP_400_BAD_REQUEST

            return Response({"status": "error", "message": error_message}, status=status_code)

# Helper for JSON serialization of Decimal
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Keep precision, return as string
            return str(obj)
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)


class UpdateOrderStatus(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update an order's status
        """
        order = get_object_or_404(Order, id=pk)

        # Check if the status is valid for the order source
        new_status = request.data.get('status')

        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate status transitions
        valid_statuses_for_source = []
        if order.source == 'website':
            valid_statuses_for_source = ['pending', 'preparing', 'completed', 'cancelled']
        else:  # POS order
            valid_statuses_for_source = ['saved', 'in_progress', 'completed', 'voided']

        if new_status not in valid_statuses_for_source:
            return Response(
                {"error": f"Invalid status '{new_status}' for {order.source} order. Must be one of: {', '.join(valid_statuses_for_source)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the order status
        order.status = new_status
        order.save()

        return Response(OrderSerializer(order).data)

class ApplyOrderDiscount(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        """Apply a discount to an order"""
        try:
            # Ensure order is in a state where discount can be applied (e.g., in_progress)
            order = get_object_or_404(Order.objects.select_related('payment'), id=pk, user=request.user, status='in_progress')
            discount_id = request.data.get('discount_id')

            if not discount_id:
                return Response({'error': 'discount_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                discount = Discount.objects.get(id=discount_id, is_active=True)
            except Discount.DoesNotExist:
                return Response({'error': 'Discount not found or inactive'}, status=status.HTTP_404_NOT_FOUND)

            # Check if discount is valid for the order items/amount
            subtotal = sum(item.unit_price * item.quantity for item in order.items.all())
            if not discount.is_valid(subtotal): # Pass order amount for validation checks
                return Response({'error': 'Discount is not applicable to this order'}, status=status.HTTP_400_BAD_REQUEST)

            # Apply the discount and recalculate total
            order.discount = discount
            order.calculate_total_price() # This calculates and sets discount_amount and total_price
            order.save()

            # Update associated payment amount
            payment = getattr(order, 'payment', None) # Use getattr for safe access
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                # Create payment if it doesn't exist
                 Payment.objects.create(order=order, status='pending', amount=order.total_price)


            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def delete(self, request, pk):
        """Remove a discount from an order"""
        try:
            order = get_object_or_404(Order.objects.select_related('payment'), id=pk, user=request.user, status='in_progress')

            # Check if there's a discount to remove
            if not order.discount:
                return Response({'message': 'No discount applied to this order'}, status=status.HTTP_200_OK)

            # Remove the discount and recalculate
            order.discount = None
            order.discount_amount = 0
            order.calculate_total_price() # Recalculate without discount
            order.save()

            # Update associated payment amount
            payment = getattr(order, 'payment', None)
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                 Payment.objects.create(order=order, status='pending', amount=order.total_price)


            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)