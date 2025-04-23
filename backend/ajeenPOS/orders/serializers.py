from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product  # ✅ Import Product model
from django.contrib.auth import get_user_model
from payments.serializers import PaymentSerializer, Payment
User = get_user_model()

# ✅ Add ProductSerializer to include product details
class NestedProductSerializer(serializers.ModelSerializer):
    class Meta:
        # Use the actual Product model from OrderItem's relationship
        model = OrderItem.product.field.related_model
        fields = ["id", "name", "price", "category"] # <-- Include 'category' (the ID)
        read_only_fields = fields  # ✅ Include necessary product fields

class OrderItemSerializer(serializers.ModelSerializer):
    product = NestedProductSerializer(read_only=True)  # ✅ Nest Product details

    class Meta:
        model = OrderItem
        fields = ["id", "quantity", "order", "product"]  # ✅ Now includes product details

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_details = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    discount_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'payment_status', 'total_price', 
            'created_at', 'updated_at', 'source', 'items', 
            'user', 'user_details', 'created_by',
            'guest_first_name', 'guest_last_name', 'guest_email',
            'payment', 'discount', 'discount_amount', 'discount_details'
        ]
    
    def get_discount_details(self, obj):
        """Return discount details if a discount exists"""
        if obj.discount:
            return {
                'id': obj.discount.id,
                'name': obj.discount.name,
                'code': obj.discount.code,
                'discount_type': obj.discount.discount_type,
                'value': float(obj.discount.value),
                'amount_applied': float(obj.discount_amount)
            }
        return None
    
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
    
    def get_payment(self, obj):
        """Get payment information if available"""
        try:
            # Use related_name='payment' from the Payment model
            payment = obj.payment
            return PaymentSerializer(payment).data
        except Payment.DoesNotExist:
            return None
        except Exception as e:
            # Log the error for debugging
            print(f"Error retrieving payment for order {obj.id}: {str(e)}")
            return None

class OrderListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for order listings that doesn't include nested item details
    """
    created_by = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    payment_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'payment_status', 'total_price', 
            'created_at', 'updated_at', 'source', 'created_by',
            'guest_first_name', 'guest_last_name', 'item_count'
        ]
    
    def get_created_by(self, obj):
        """Format the creator's name for display"""
        if obj.user:
            return obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        else:
            return "Guest Customer"
    
    def get_item_count(self, obj):
        """Return the count of items in the order"""
        return obj.items.count()