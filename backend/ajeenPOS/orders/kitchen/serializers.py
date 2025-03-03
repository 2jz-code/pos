# orders/kitchen/serializers.py
from rest_framework import serializers
from ..models import Order, OrderItem
from products.models import Product

class KitchenProductSerializer(serializers.ModelSerializer):
    """Simplified product representation for kitchen display"""
    class Meta:
        model = Product
        fields = ['id', 'name', 'category']

class KitchenOrderItemSerializer(serializers.ModelSerializer):
    """Order item serializer for kitchen display"""
    product = KitchenProductSerializer(read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'quantity', 'product']

class KitchenOrderSerializer(serializers.ModelSerializer):
    """Order serializer for kitchen display system"""
    items = KitchenOrderItemSerializer(many=True, read_only=True)
    time_elapsed = serializers.SerializerMethodField()
    source_display = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    kitchen_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'kitchen_status', 'created_at', 'updated_at', 
            'items', 'source', 'source_display', 'time_elapsed', 
            'customer_name', 'total_price'
        ]
    
    def get_time_elapsed(self, obj):
        """Calculate time elapsed since order creation in minutes"""
        from django.utils import timezone
        time_diff = timezone.now() - obj.created_at
        return int(time_diff.total_seconds() / 60)
    
    def get_source_display(self, obj):
        """Format source for display"""
        return "Online Order" if obj.source == "website" else "POS Order"
    
    def get_customer_name(self, obj):
        """Get customer name"""
        if obj.source == "website":
            if obj.guest_first_name or obj.guest_last_name:
                return f"{obj.guest_first_name} {obj.guest_last_name}".strip()
            return "Guest Customer"
        else:
            return obj.created_by if hasattr(obj, 'created_by') and obj.created_by else "POS Customer"
    
    def get_kitchen_status(self, obj):
        """
        Get a unified kitchen status regardless of order source
        Maps different source-specific statuses to kitchen-friendly statuses
        """
        if obj.source == 'website':
            if obj.status == 'pending':
                return 'pending'
            elif obj.status == 'preparing':
                return 'preparing'
            else:
                return obj.status
        elif obj.source == 'pos':
            if obj.status == 'saved':
                return 'pending'
            elif obj.status == 'in_progress':
                return 'preparing'
            else:
                return obj.status
        
        return obj.status