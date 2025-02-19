from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .models import Order, OrderItem
from .serializers import OrderSerializer
from products.models import Product
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from datetime import timedelta
import json
from django.http import JsonResponse


# ✅ List Orders (Now Updates Instead of Duplicating)
class OrderList(generics.ListCreateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

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


# ✅ Complete an Order (Checkout)
class CompleteOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        """
        Completes an order by setting the status to "completed".
        """
        try:
            order = get_object_or_404(Order, id=pk, user=request.user, status="in_progress")
            order.status = "completed"
            order.payment_status = request.data.get("payment_status", "paid")
            order.save()
            
            return Response({
                "status": "success",  # Add this explicit status field
                "message": "Order completed successfully",
                "order": OrderSerializer(order).data
            })
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=500)
