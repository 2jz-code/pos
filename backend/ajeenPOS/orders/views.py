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
from django.db import transaction  # Import transaction
import json
import decimal  # Import decimal
from django.http import JsonResponse
from rest_framework.pagination import PageNumberPagination
from discounts.models import Discount
from decimal import Decimal
from django.db.models import F
from hardware.controllers.receipt_printer import ReceiptPrinterController
import logging

logger = logging.getLogger(__name__)


class OrderPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


# ✅ List Orders (Now Updates Instead of Duplicating)
class OrderList(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = OrderPagination

    def get_serializer_class(self):
        """Use different serializers for list and detail views"""
        if self.request.method == "GET":
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        """
        Get optimized queryset with proper prefetching to reduce database queries
        """
        # Start with base queryset
        # Added payment__transactions to prefetch related transactions
        queryset = (
            Order.objects.select_related("user", "payment", "discount")
            .prefetch_related("items__product", "payment__transactions")
            .order_by("-created_at")
        )

        # Apply filters
        source = self.request.query_params.get("source")
        status_param = self.request.query_params.get("status")

        if source:
            queryset = queryset.filter(source=source)

        if status_param and status_param != "all":
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
            return Response(
                OrderSerializer(existing_order).data, status=status.HTTP_200_OK
            )

        # If no in-progress order exists, create a new saved order
        data = request.data
        order = Order.objects.create(user=user, status="saved")

        for item in data.get("items", []):
            product = get_object_or_404(Product, id=item["product_id"])
            # Ensure unit_price is stored
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item["quantity"],
                unit_price=product.price,
            )

        order.calculate_total_price()
        order.save()  # Save order to get ID before creating payment
        # Ensure payment is created for saved orders too
        Payment.objects.get_or_create(
            order=order, defaults={"status": "pending", "amount": order.total_price}
        )
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
            with transaction.atomic():  # Wrap item update in transaction
                order.items.all().delete()  # Clear existing items

                for item_data in data["items"]:
                    product = get_object_or_404(Product, id=item_data["id"])
                    # Ensure unit_price is stored when updating items
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data["quantity"],
                        unit_price=product.price,  # Store current price
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
            if order.status == "in_progress":
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

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
        Payment.objects.create(
            order=new_order, status="pending", amount=decimal.Decimal("0.00")
        )  # Initialize payment with 0 amount
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
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Use select_related to fetch payment along with order
            order = get_object_or_404(
                Order.objects.select_related("payment"),
                id=order_id,
                user=user,
                status="in_progress",
            )
        except Order.DoesNotExist:
            return Response(
                {"error": "In-progress order not found or does not belong to user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():  # Wrap updates in a transaction
            # ✅ Remove old items linked to this order
            order.items.all().delete()

            # ✅ Add new items to the order
            for item_data in request.data.get("items", []):
                try:
                    # Frontend might send product ID as 'id' or 'product_id'
                    product_id = item_data.get("id") or item_data.get("product_id")
                    if not product_id:
                        continue  # Skip if no product ID
                    product = get_object_or_404(Product, id=product_id)
                    # Ensure unit_price is stored
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data["quantity"],
                        unit_price=product.price,
                    )
                except Product.DoesNotExist:
                    print(
                        f"Warning: Product ID {product_id} not found during cart update for order {order_id}"
                    )
                    # Optionally return an error:
                    # return Response({"error": f"Product ID {product_id} not found"}, status=status.HTTP_400_BAD_REQUEST)
                except KeyError:
                    print(
                        f"Warning: Missing 'quantity' for item during cart update for order {order_id}"
                    )
                    # Optionally return an error:
                    # return Response({"error": "Missing 'quantity' for an item"}, status=status.HTTP_400_BAD_REQUEST)

            # ✅ Recalculate total price and save order
            order.calculate_total_price()  # This should handle discounts if applied
            order.save()

            # ✅ Update associated Payment amount
            # Use the prefetched payment object if available
            payment = getattr(order, "payment", None)
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                # If somehow payment doesn't exist, create it
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

        return Response(
            {"message": "Order auto-saved", "order": OrderSerializer(order).data}
        )


# ✅ Resume a Saved Order
class ResumeOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        allowed_statuses = ["saved", "in_progress"]
        order = get_object_or_404(
            Order.objects.select_related("payment").prefetch_related("items__product"),
            id=pk,
            user=request.user,
            status__in=allowed_statuses,  # Use the list here
        )
        # If resuming a saved order, change status to in_progress
        order.status = "in_progress"
        order.save()

        # Get or create payment record if it somehow doesn't exist
        payment, created = Payment.objects.get_or_create(
            order=order, defaults={"status": "pending", "amount": order.total_price}
        )
        if (
            payment.status != "pending"
        ):  # Ensure payment status is pending when resuming
            payment.status = "pending"
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
        order = (
            Order.objects.filter(user=user, status="in_progress")
            .order_by("-created_at")
            .first()
        )

        if order:
            # Ensure payment exists
            Payment.objects.get_or_create(
                order=order, defaults={"status": "pending", "amount": order.total_price}
            )
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

        return Response(
            {"message": "No active order found"}, status=status.HTTP_404_NOT_FOUND
        )


class CompleteOrder(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic  # Wrap the entire completion process in a transaction
    def post(self, request, pk, *args, **kwargs):
        try:
            print(f"--- Completing Order {pk} ---")
            # Log the raw request body for debugging
            try:
                print(
                    "Request Body RAW:", request.body.decode("utf-8")
                )  # Decode bytes to string
            except Exception as decode_err:
                print("Request Body Decode Error:", decode_err)
                print("Request Body (bytes):", request.body)

            request_data = request.data  # Use a shorter variable name

            # --- FIX: Idempotency Check ---
            # 1. Fetch the order first without status check
            try:
                order = get_object_or_404(
                    Order.objects.select_related("discount", "payment"),
                    id=pk,
                    user=request.user,
                )
            except Order.DoesNotExist:
                print(f"Error: Order {pk} not found for user {request.user.id}.")
                return Response(
                    {"status": "error", "message": "Order not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # 2. Check current status
            if order.status == "completed":
                print(f"Order {pk} is already completed. Returning success.")
                # Return success, potentially with the existing order data
                return Response(
                    {
                        "status": "success",
                        "message": "Order is already completed",
                        "order": OrderSerializer(order).data,
                    },
                    status=status.HTTP_200_OK,
                )  # Use 200 OK for idempotency success

            if order.status != "in_progress":
                print(
                    f"Error: Order {pk} has status '{order.status}' and cannot be completed."
                )
                return Response(
                    {
                        "status": "error",
                        "message": f"Order cannot be completed from status '{order.status}'",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )  # Bad request if not in correct initial state
            # --- END FIX ---

            # If we reach here, the order exists, belongs to the user, and IS 'in_progress'
            print(
                f"Order {pk} found and is in 'in_progress' state. Proceeding with completion."
            )

            # Extract payment details from the request body
            payment_details_data = request_data.get("payment_details", {})
            transactions_data = payment_details_data.get("transactions", [])

            print(
                f"Order Status Before: {order.status}, Payment Status Before: {order.payment_status}"
            )
            print(
                f"Transactions data received: {len(transactions_data)} transaction(s)"
            )

            # Extract Tip Amount
            try:
                frontend_tip_amount = Decimal(request_data.get("tip_amount", "0.00"))
                if frontend_tip_amount < 0:
                    frontend_tip_amount = Decimal("0.00")  # Ensure non-negative
            except (TypeError, decimal.InvalidOperation):
                print(
                    f"Warning: Invalid tip_amount received ('{request_data.get('tip_amount')}'), defaulting to 0.00"
                )
                frontend_tip_amount = Decimal("0.00")
            order.tip_amount = frontend_tip_amount  # Save tip
            print(f"Extracted Tip Amount: {order.tip_amount}")

            # Update Order Status and Details
            order.status = "completed"
            order.payment_status = (
                "paid"  # Assume paid if this endpoint is hit successfully
            )

            # Apply/Remove discount based on payload
            discount_id = request_data.get("discount_id")
            if discount_id:
                try:
                    discount = Discount.objects.get(id=discount_id, is_active=True)
                    order.discount = discount
                    try:
                        order.discount_amount = Decimal(
                            request_data.get("discount_amount", "0.00")
                        )
                        if order.discount_amount < 0:
                            order.discount_amount = Decimal("0.00")
                    except (TypeError, decimal.InvalidOperation):
                        order.discount_amount = Decimal("0.00")

                    # Increment usage count atomically
                    discount.used_count = F("used_count") + 1
                    discount.save(update_fields=["used_count"])
                    print(
                        f"Applied discount {discount_id}. Amount: {order.discount_amount}"
                    )
                except Discount.DoesNotExist:
                    print(
                        f"Warning: Discount ID {discount_id} not found or inactive, not applying discount."
                    )
                    order.discount = None
                    order.discount_amount = Decimal("0.00")
            else:
                order.discount = None
                order.discount_amount = Decimal("0.00")
                print("No discount applied.")

            # Use the total_amount from the payload, verify against server calculation
            try:
                final_total_from_payload = Decimal(
                    request_data.get("total_amount", "0.00")
                )
                server_calculated_total = order.calculate_total_price(
                    tip_to_add=order.tip_amount
                )  # Recalculate for verification
                if abs(final_total_from_payload - server_calculated_total) > Decimal(
                    "0.01"
                ):
                    print(
                        f"Warning: Discrepancy between frontend total ({final_total_from_payload}) and server total ({server_calculated_total}). Using server calculated total."
                    )
                    order.total_price = server_calculated_total
                else:
                    order.total_price = (
                        final_total_from_payload  # Trust frontend if close
                    )
            except (TypeError, decimal.InvalidOperation):
                print(
                    f"Warning: Invalid total_amount received ('{request_data.get('total_amount')}'), recalculating server-side."
                )
                order.total_price = order.calculate_total_price(
                    tip_to_add=order.tip_amount
                )  # Fallback

            order.save()  # Save order changes
            print(f"Order {pk} marked as completed. Final total: {order.total_price}")

            # Get or Create/Update Payment Record
            payment_method_str = payment_details_data.get("paymentMethod", "other")[:50]
            payment, created = Payment.objects.update_or_create(
                order=order,
                defaults={
                    "status": "completed",
                    "amount": order.total_price,
                    "payment_method": payment_method_str,
                    "is_split_payment": payment_details_data.get("splitPayment", False)
                    or (len(transactions_data) > 1),
                },
            )
            action_word = "Created" if created else "Updated"
            print(
                f"{action_word} Payment {payment.id} for Order {pk}. Status: {payment.status}, Amount: {payment.amount}, Method: {payment.payment_method}, Split: {payment.is_split_payment}"
            )

            # Create PaymentTransaction records
            if isinstance(transactions_data, list) and transactions_data:
                total_paid_in_transactions = Decimal(0)
                payment.transactions.all().delete()  # Clear previous before adding final set
                print(
                    f"Cleared existing transactions for Payment {payment.id} before adding new ones."
                )

                for txn_data in transactions_data:
                    method = txn_data.get("method", "other").lower()[:50]
                    amount_str = str(txn_data.get("amount", "0"))
                    try:
                        amount = Decimal(amount_str)
                        if amount <= 0:
                            print(
                                f"Warning: Skipping transaction with zero/negative amount: {amount_str}"
                            )
                            continue
                    except decimal.InvalidOperation:
                        print(
                            f"Warning: Invalid amount '{amount_str}' in transaction data. Skipping."
                        )
                        continue

                    total_paid_in_transactions += amount
                    metadata = {}
                    card_info = txn_data.get("cardInfo", {})
                    flow_data = txn_data.get("flowData", {})
                    payment_in_flow = (
                        flow_data.get("payment", {})
                        if isinstance(flow_data.get("payment"), dict)
                        else {}
                    )

                    if method == "credit":
                        metadata["card_brand"] = card_info.get(
                            "brand"
                        ) or payment_in_flow.get("cardInfo", {}).get("brand")
                        metadata["card_last4"] = card_info.get(
                            "last4"
                        ) or payment_in_flow.get("cardInfo", {}).get("last4")
                        metadata["stripe_payment_status"] = payment_in_flow.get(
                            "status"
                        )
                        metadata["stripe_payment_timestamp"] = payment_in_flow.get(
                            "timestamp"
                        )
                    elif method == "cash":
                        metadata["cashTendered"] = txn_data.get("cashTendered")
                        metadata["change"] = txn_data.get("change")

                    if payment.is_split_payment:
                        metadata["splitDetails"] = txn_data.get("splitDetails", {})

                    external_txn_id = (
                        txn_data.get("transactionId")
                        or txn_data.get("transaction_id")
                        or payment_in_flow.get("transactionId")
                        or payment_in_flow.get("transaction_id")
                    )

                    payment_txn = PaymentTransaction.objects.create(
                        parent_payment=payment,
                        payment_method=method,
                        amount=amount,
                        status="completed",
                        transaction_id=external_txn_id,
                        metadata_json=(
                            json.dumps(metadata, cls=DecimalEncoder)
                            if metadata
                            else None
                        ),
                    )
                    print(
                        f"Created PaymentTransaction {payment_txn.id}: Method={method}, Amount={amount}, ExtID={external_txn_id or 'N/A'}"
                    )

                # Final Verification
                if abs(total_paid_in_transactions - order.total_price) > Decimal(
                    "0.01"
                ):
                    print(
                        f"Warning: Discrepancy! Final Order total ({order.total_price}) != Sum of transactions ({total_paid_in_transactions})."
                    )
                else:
                    print(
                        f"Final amounts match: Order Total={order.total_price}, Transactions Sum={total_paid_in_transactions}"
                    )
            else:
                print(
                    "No detailed transaction data provided in payload, skipping transaction record creation."
                )

            # --- Response ---
            order.refresh_from_db()  # Refresh to get latest state
            print(f"Order {pk} completion process finished successfully.")

            return Response(
                {
                    "status": "success",
                    "message": "Order completed successfully",
                    "order": OrderSerializer(order).data,  # Use the refreshed order
                }
            )

        # Removed the specific Order.DoesNotExist catch here as it's handled by the idempotency check above

        except Discount.DoesNotExist:
            print(
                f"Error: Invalid Discount ID provided during completion of order {pk}."
            )
            return Response(
                {"status": "error", "message": "Invalid Discount ID provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            import traceback

            print(f"--- Error Completing Order {pk} ---")
            traceback.print_exc()
            error_message = str(e)
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            if isinstance(e, (TypeError, ValueError, decimal.InvalidOperation)):
                error_message = "Invalid data format received in request."
                status_code = status.HTTP_400_BAD_REQUEST
            # Return generic error for other exceptions
            return Response(
                {
                    "status": "error",
                    "message": "An internal error occurred during order completion.",
                },
                status=status_code,
            )


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
        Update an order's status and conditionally void the related payment.
        """
        # --- MODIFICATION: Use select_related to fetch payment efficiently ---
        order = get_object_or_404(Order.objects.select_related("payment"), id=pk)
        # --- END MODIFICATION ---

        # Check if the status is valid for the order source
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status transitions
        valid_statuses_for_source = []
        if order.source == "website":
            # Website orders cannot be 'voided' according to this logic
            valid_statuses_for_source = [
                "pending",
                "preparing",  # Assuming 'preparing' is a valid status
                "completed",
                "cancelled",
            ]
        else:  # POS order
            # POS orders can be 'voided'
            valid_statuses_for_source = ["saved", "in_progress", "completed", "voided"]

        if new_status not in valid_statuses_for_source:
            return Response(
                {
                    "error": f"Invalid status '{new_status}' for {order.source} order. Must be one of: {', '.join(valid_statuses_for_source)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update the order status
        order.status = new_status
        order.save()

        # --- ADDED LOGIC: Update payment status if order is voided ---
        if new_status == "voided":
            try:
                # Access the related payment via the OneToOneField relationship
                payment = order.payment
                payment.status = "voided"
                payment.payment_method = "other"
                # Use update_fields to be specific and potentially avoid triggering other signals
                payment.save(update_fields=["status", "payment_method"])
                print(
                    f"Payment {payment.id} status updated to voided for voided Order {order.id}"
                )  # Optional: for logging/debugging
            except Payment.DoesNotExist:
                # This case *shouldn't* happen if POS orders always have a payment created,
                # but it's good practice to handle it.
                print(
                    f"Warning: Payment record not found for Order {order.id} when voiding."
                )
            except AttributeError:
                # Handle case where the 'payment' relation might not be loaded correctly (less likely with select_related)
                print(
                    f"Error: Could not access payment attribute for Order {order.id} when voiding."
                )
            except Exception as e:
                # Log any other unexpected errors during payment update
                print(
                    f"Error updating payment status to voided for Order {order.id}: {e}"
                )
        # --- END ADDED LOGIC ---

        return Response(OrderSerializer(order).data)


class ApplyOrderDiscount(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        """Apply a discount to an order"""
        try:
            # Ensure order is in a state where discount can be applied (e.g., in_progress)
            order = get_object_or_404(
                Order.objects.select_related("payment"),
                id=pk,
                user=request.user,
                status="in_progress",
            )
            discount_id = request.data.get("discount_id")

            if not discount_id:
                return Response(
                    {"error": "discount_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                discount = Discount.objects.get(id=discount_id, is_active=True)
            except Discount.DoesNotExist:
                return Response(
                    {"error": "Discount not found or inactive"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if discount is valid for the order items/amount
            subtotal = sum(
                item.unit_price * item.quantity for item in order.items.all()
            )
            if not discount.is_valid(
                subtotal
            ):  # Pass order amount for validation checks
                return Response(
                    {"error": "Discount is not applicable to this order"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Apply the discount and recalculate total
            order.discount = discount
            order.calculate_total_price()  # This calculates and sets discount_amount and total_price
            order.save()

            # Update associated payment amount
            payment = getattr(order, "payment", None)  # Use getattr for safe access
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                # Create payment if it doesn't exist
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def delete(self, request, pk):
        """Remove a discount from an order"""
        try:
            order = get_object_or_404(
                Order.objects.select_related("payment"),
                id=pk,
                user=request.user,
                status="in_progress",
            )

            # Check if there's a discount to remove
            if not order.discount:
                return Response(
                    {"message": "No discount applied to this order"},
                    status=status.HTTP_200_OK,
                )

            # Remove the discount and recalculate
            order.discount = None
            order.discount_amount = 0
            order.calculate_total_price()  # Recalculate without discount
            order.save()

            # Update associated payment amount
            payment = getattr(order, "payment", None)
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReprintReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            order = get_object_or_404(
                Order.objects.select_related("payment", "discount").prefetch_related(
                    "items__product", "payment__transactions"
                ),
                id=pk,
                status="completed",
            )
            logger.info(f"Reprint request received for completed Order ID: {pk}")
            serialized_order = OrderSerializer(order).data
            receipt_data_for_print = {
                "id": serialized_order.get("id"),
                "timestamp": serialized_order.get("created_at"),
                "customer_name": serialized_order.get("created_by"),
                "items": [
                    {
                        "product_name": item.get("product", {}).get(
                            "name", "Unknown Item"
                        ),
                        "quantity": item.get("quantity"),
                        "unit_price": item.get("product", {}).get("price", 0.00),
                    }
                    for item in serialized_order.get("items", [])
                ],
                "subtotal": None,
                "tax": None,
                "total_amount": serialized_order.get("total_price"),
                "payment": {
                    "method": serialized_order.get("payment", {}).get("payment_method"),
                    "amount_tendered": None,
                    "change": None,
                    "transactions": serialized_order.get("payment", {}).get(
                        "transactions", []
                    ),
                    "is_split_payment": serialized_order.get("payment", {}).get(
                        "is_split_payment"
                    ),
                },
                "open_drawer": False,
            }
            try:
                printer_controller = ReceiptPrinterController()
                print_result = printer_controller.print_transaction_receipt(
                    receipt_data_for_print
                )  # Keep original call for now, modify controller
                if print_result.get("status") == "success":
                    logger.info(f"Successfully sent reprint request for Order ID: {pk}")
                    return Response(
                        {"message": "Receipt reprint initiated successfully."},
                        status=status.HTTP_200_OK,
                    )
                else:
                    logger.error(
                        f"Reprint failed for Order ID: {pk}. Reason: {print_result.get('message')}"
                    )
                    return Response(
                        {
                            "error": f"Failed to initiate reprint: {print_result.get('message')}"
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            except Exception as printer_err:
                logger.error(
                    f"Error initializing or using printer controller for Order ID {pk}: {printer_err}",
                    exc_info=True,
                )
                return Response(
                    {"error": "Printer service unavailable."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        except Order.DoesNotExist:
            logger.warning(f"Reprint failed: Completed Order ID {pk} not found.")
            return Response(
                {"error": "Completed order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(
                f"Unexpected error during reprint for Order ID {pk}: {e}", exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
