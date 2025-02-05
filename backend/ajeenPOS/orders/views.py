from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
from products.models import Product
from django.shortcuts import get_object_or_404

# ✅ List Orders & Create a New Order
class OrderList(generics.ListCreateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]  # ✅ Require authentication

    def post(self, request, *args, **kwargs):
        """
        Create a new order with items and associate it with the authenticated user.
        """
        data = request.data
        user = request.user  # ✅ Automatically get the logged-in user

        order = Order.objects.create(user=user, status="saved")  # ✅ Assign user

        for item in data.get("items", []):
            product = get_object_or_404(Product, id=item["product_id"])
            OrderItem.objects.create(order=order, product=product, quantity=item["quantity"])

        order.calculate_total_price()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

# ✅ Get, Update, or Delete an Order
class OrderDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def patch(self, request, *args, **kwargs):
        """
        Updates an existing order instead of creating a new one.
        """
        order = self.get_object()
        data = request.data

        # ✅ Clear existing order items
        order.items.all().delete()

        # ✅ Add new order items
        for item in data.get("items", []):
            product = get_object_or_404(Product, id=item["product_id"])
            OrderItem.objects.create(order=order, product=product, quantity=item["quantity"])

        order.status = data.get("status", order.status)
        order.calculate_total_price()
        order.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


# ✅ Resume a Saved Order
class ResumeOrder(APIView):
    def post(self, request, pk, *args, **kwargs):
        """
        Resume a saved order and set status to 'in-progress'.
        """
        order = get_object_or_404(Order, id=pk, status="saved")
        order.status = "in-progress"
        order.save()
        return Response({"message": "Order resumed successfully", "order": OrderSerializer(order).data})


# ✅ Complete an Order (Checkout)
class CompleteOrder(APIView):
    def post(self, request, pk, *args, **kwargs):
        """
        Completes an order by setting the status to "completed" and updating payment status.
        """
        order = get_object_or_404(Order, id=pk, status="in-progress")

        payment_status = request.data.get("payment_status", "paid")  # Default to 'paid'
        order.status = "completed"
        order.payment_status = payment_status
        order.save()
        return Response({"message": "Order completed successfully", "order": OrderSerializer(order).data})
