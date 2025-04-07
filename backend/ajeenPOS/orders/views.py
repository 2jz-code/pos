from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from payments.models import Payment
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderListSerializer
from products.models import Product
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from datetime import timezone
import json
from django.http import JsonResponse
from rest_framework.pagination import PageNumberPagination
from discounts.models import Discount
import decimal


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
        queryset = Order.objects.select_related('user').prefetch_related(
            'items__product',
            'payment'
        ).order_by('-created_at')
        
        # Apply filters
        source = self.request.query_params.get('source')
        status = self.request.query_params.get('status')
        
        if source:
            queryset = queryset.filter(source=source)
        
        if status and status != 'all':
            queryset = queryset.filter(status=status)
            
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
            OrderItem.objects.create(order=order, product=product, quantity=item["quantity"])

        order.calculate_total_price()
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
            order.items.all().delete()  # Clear existing items

            for item in data["items"]:
                product = get_object_or_404(Product, id=item["id"])
                OrderItem.objects.create(order=order, product=product, quantity=item["quantity"])

        # ✅ Update status if provided (e.g., 'saved', 'completed')
        if "status" in data:
            order.status = data["status"]

        order.calculate_total_price()
        order.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
    

# ✅ Start Order (Ensures Only One In-Progress Order)
class StartOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Starts a new 'in_progress' order without checking for existing ones.
        """
        user = request.user
        new_order = Order.objects.create(user=user, status="in_progress")
        payment = Payment.objects.create(order=new_order, status = "pending", )
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

        # ✅ Ensure the order belongs to the user and is still in-progress
        order = get_object_or_404(Order, id=order_id, user=user, status="in_progress")

        # ✅ Remove old items linked to this order
        order.items.all().delete()

        # ✅ Add new items to the order
        for item in request.data.get("items", []):
            try:
                product = get_object_or_404(Product, id=item["id"])
                OrderItem.objects.create(order=order, product=product, quantity=item["quantity"])
            except Product.DoesNotExist:
                return Response({"error": f"Product ID {item['id']} not found"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Recalculate total price
        order.calculate_total_price()
        payment = get_object_or_404(Payment, order=order)
        payment.amount = order.calculate_total_price()
        payment.save()
        order.save()

        return Response({"message": "Order auto-saved", "order": OrderSerializer(order).data})



# ✅ Resume a Saved Order
class ResumeOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        order = get_object_or_404(
            Order.objects.prefetch_related("items__product"),
            id=pk, user=request.user, status__in=["saved", "in_progress"]
        )

        if order.status == "saved":
            order.status = "in_progress"
            order.save()

        # ✅ Debugging: Print serialized order before returning response
        serialized_order = OrderSerializer(order).data
        
        return JsonResponse(serialized_order, safe=False)



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
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
        
        return Response({"message": "No active order found"}, status=status.HTTP_404_NOT_FOUND)


class CompleteOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            # Log the incoming request data for debugging
            print("CompleteOrder received data:", json.dumps(request.data, indent=2))
            
            order = get_object_or_404(Order, id=pk, user=request.user, status="in_progress")
            
            # IMPORTANT: Save the original discount before any changes
            original_discount = order.discount
            original_discount_amount = order.discount_amount
            
            order.status = "completed"
            order.payment_status = request.data.get("payment_status", "paid")
            
            # Process discount if provided
            discount_id = request.data.get("discount_id")
            if discount_id:
                try:
                    from discounts.models import Discount
                    discount = Discount.objects.get(id=discount_id)
                    
                    # Explicitly set the discount
                    order.discount = discount
                    
                    # Get discount amount from request or calculate it
                    discount_amount = request.data.get("discount_amount")
                    if discount_amount:
                        order.discount_amount = decimal.Decimal(discount_amount)
                    else:
                        # Calculate if not provided
                        subtotal = sum(item.product.price * item.quantity for item in order.items.all())
                        order.discount_amount = discount.calculate_discount_amount(subtotal)
                    
                    from decimal import Decimal
                    # Recalculate total price with discount AND TAX
                    subtotal = sum(item.product.price * item.quantity for item in order.items.all())
                    discounted_subtotal = subtotal - order.discount_amount
                    tax_amount = discounted_subtotal * Decimal(0.1)  # 10% tax
                    order.total_price = discounted_subtotal + tax_amount
                    
                    # Increment discount usage count
                    discount.used_count += 1
                    discount.save()
                    
                    print(f"Applied discount {discount_id} with amount {order.discount_amount} to order {pk}")
                except Discount.DoesNotExist:
                    print(f"Discount with ID {discount_id} not found")
                    # If the discount no longer exists, retain the original discount
                    order.discount = original_discount
                    order.discount_amount = original_discount_amount
            else:
                # If no discount, still need to calculate with tax
                order.calculate_total_price()

            order.save()
            # Get or create payment
            payment, created = Payment.objects.get_or_create(order=order)
            
            # Update payment record
            payment_data = request.data.get("payment_details") or request.data.get("paymentDetails", {})
            payment_method = payment_data.get("paymentMethod") or request.data.get("payment_method")
            
            payment.payment_method = payment_method
            payment.status = "completed"
            
            # Ensure payment amount reflects the discounted total
            payment.amount = order.total_price
            
            # Handle split payments
            if payment_method == "split":
                payment.is_split_payment = True
                
                # Get transactions and split details
                transactions = payment_data.get("transactions", [])
                split_details = payment_data.get("splitDetails")
                
                # Store the complete payment details
                try:
                    # Create a complete structure with all payment data
                    complete_payment_data = {
                        "transactions": transactions,
                        "splitDetails": split_details,
                        "totalPaid": payment_data.get("totalPaid"),
                        "splitPayment": payment_data.get("splitPayment", True),
                        "paymentMethod": payment_method,
                        "completed_at": payment_data.get("completed_at") or timezone.now().isoformat()
                    }
                    
                    # Store this complete structure
                    payment.transactions_json = json.dumps(complete_payment_data)
                    print(f"Stored payment data: {payment.transactions_json}")
                except Exception as e:
                    print(f"Error storing payment data: {str(e)}")
                    # Fallback to storing just the transactions
                    if transactions:
                        payment.set_transactions(transactions)
            
            payment.save()
            
            # After everything is saved, verify the discount was properly applied
            order.refresh_from_db()
            print(f"Final order state: discount_id={order.discount_id}, discount_amount={order.discount_amount}, total_price={order.total_price}")
            
            return Response({
                "status": "success",
                "message": "Order completed successfully",
                "order": OrderSerializer(order).data
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "status": "error",
                "message": str(e)
            }, status=500)

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
        if order.source == 'website':
            valid_statuses = ['pending', 'preparing', 'completed', 'cancelled']
            if new_status not in valid_statuses:
                return Response(
                    {"error": f"Invalid status for website order. Must be one of: {', '.join(valid_statuses)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:  # POS order
            valid_statuses = ['saved', 'in_progress', 'completed', 'voided']
            if new_status not in valid_statuses:
                return Response(
                    {"error": f"Invalid status for POS order. Must be one of: {', '.join(valid_statuses)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update the order status
        order.status = new_status
        order.save()
        
        return Response(OrderSerializer(order).data)
    
class ApplyOrderDiscount(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """Apply a discount to an order"""
        try:
            order = get_object_or_404(Order, id=pk, user=request.user)
            discount_id = request.data.get('discount_id')
            
            if not discount_id:
                return Response({
                    'error': 'discount_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                discount = Discount.objects.get(id=discount_id, is_active=True)
            except Discount.DoesNotExist:
                return Response({
                    'error': 'Discount not found or inactive'
                }, status=status.HTTP_404_NOT_FOUND)
                
            # Check if discount is valid
            subtotal = sum(item.product.price * item.quantity for item in order.items.all())
            if not discount.is_valid(subtotal):
                return Response({
                    'error': 'Discount is not applicable to this order'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Apply the discount
            order.discount = discount
            order.calculate_total_price()  # This will calculate the discount amount
            
            return Response(OrderSerializer(order).data)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, pk):
        """Remove a discount from an order"""
        try:
            order = get_object_or_404(Order, id=pk, user=request.user)
            
            # Check if there's a discount to remove
            if not order.discount:
                return Response({
                    'message': 'No discount applied to this order'
                }, status=status.HTTP_200_OK)
                
            # Remove the discount
            order.discount = None
            order.discount_amount = 0
            order.calculate_total_price()
            
            return Response(OrderSerializer(order).data)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)