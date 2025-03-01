from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product  # ✅ Import Product model
from django.contrib.auth import get_user_model

User = get_user_model()

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
    items = OrderItemSerializer(many=True, read_only=True)
    user_details = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'payment_status', 'total_price', 
            'created_at', 'updated_at', 'source', 'items', 
            'user', 'user_details', 'created_by',
            'guest_first_name', 'guest_last_name', 'guest_email'
        ]
    
    def get_user_details(self, obj):
        """Return user details if a user exists"""
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username
            }
        return None
    
    def get_created_by(self, obj):
        """Format the creator's name for display"""
        if obj.user:
            return obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        else:
            return "Guest Customer"
