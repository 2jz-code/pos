from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product  # ✅ Import Product model

# ✅ Add ProductSerializer to include product details
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price"]  # ✅ Include necessary product fields

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)  # ✅ Nest Product details

    class Meta:
        model = OrderItem
        fields = ["id", "quantity", "order", "product"]  # ✅ Now includes product details

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)  # ✅ Include item details

    class Meta:
        model = Order
        fields = '__all__'
