# orders/serializers_website.py

from rest_framework import serializers
from .models import Order, OrderItem, Cart, CartItem
from products.models import Product

class ProductSummarySerializer(serializers.ModelSerializer):
    """
    Simplified product representation for cart and orders
    """
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'image']
    
    def get_image(self, obj):
        """Return the product image URL"""
        if hasattr(obj, 'get_image') and callable(getattr(obj, 'get_image')):
            return obj.get_image()
        return None

class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for cart items with product details and calculated total
    """
    product = ProductSummarySerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True,
        source='product'
    )
    total_price = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    item_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'product_name', 'item_price', 
                  'quantity', 'total_price', 'added_at', 'image_url']
        read_only_fields = ['id', 'product_name', 'item_price', 'added_at', 'image_url']
    
    def get_total_price(self, obj):
        """Calculate total price for the cart item"""
        price = obj.product.price if obj.product else 0
        quantity = obj.quantity if obj.quantity else 0
        return float(price * quantity)
    
    def get_image_url(self, obj):
        """Get the product image URL"""
        request = self.context.get('request')
        if obj.product.image and hasattr(obj.product.image, 'url') and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None
    
    def create(self, validated_data):
        """
        Create a new cart item or update quantity if product already exists in cart
        """
        cart = validated_data.get('cart')
        product = validated_data.get('product')
        quantity = validated_data.get('quantity', 1)
        
        # Check if product already exists in cart
        existing_item = CartItem.objects.filter(cart=cart, product=product).first()
        
        if existing_item:
            # Update quantity of existing item
            existing_item.quantity += quantity
            existing_item.save()
            return existing_item
        
        # Create new cart item
        return CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=quantity
        )

class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for shopping cart with calculated totals and nested items
    """
    items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'item_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_items(self, obj):
        """Get cart items with request context passed through"""
        return CartItemSerializer(
            obj.items.all(), 
            many=True, 
            context=self.context
        ).data
    
    def get_total_price(self, obj):
        """Calculate total price for all items in cart"""
        return float(obj.get_total_price())
    
    def get_item_count(self, obj):
        """Count the number of items in cart"""
        return obj.items.count()

class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for order items with product details and calculated totals
    """
    product = ProductSummarySerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    item_price = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'item_price', 'unit_price', 'total_price', 'image_url']
        read_only_fields = ['id', 'unit_price']
    
    def get_total_price(self, obj):
        """Calculate total price for the order item"""
        return float(obj.get_total_price())
    
    def get_image_url(self, obj):
        """Get the product image URL"""
        request = self.context.get('request')
        if obj.product.image and hasattr(obj.product.image, 'url') and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None
    
from decimal import Decimal, ROUND_HALF_UP

class WebsiteOrderSerializer(serializers.ModelSerializer):
    """
    Comprehensive order serializer for website orders
    """
    items = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    customer_name = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'payment_status', 
            'payment_status_display', 'total_price', 'items',
            'created_at', 'updated_at', 'customer_name',
            'guest_first_name', 'guest_last_name', 'guest_email',
            'subtotal', 'tax', 'delivery_fee', 'total_amount'
        ]
        read_only_fields = [
            'id', 'status_display', 'payment_status_display',
            'total_price', 'created_at', 'updated_at'
        ]
    
    def get_items(self, obj):
        """Get order items with request context passed through"""
        return OrderItemSerializer(
            obj.items.all(), 
            many=True, 
            context=self.context
        ).data
    
    def get_customer_name(self, obj):
        """Return customer name (authenticated user or guest)"""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return f"{obj.guest_first_name} {obj.guest_last_name}".strip() or "Guest"
    
    def get_subtotal(self, obj):
        """Calculate subtotal based on stored item prices before discounts and tax."""
        # Sum the stored price * quantity for each item
        subtotal = sum(item.get_total_price() for item in obj.items.all())
        return float(subtotal) # Return as float

    def get_tax(self, obj):
        """Calculate tax based on the actual discount and 10% rate."""
        subtotal = sum(item.get_total_price() for item in obj.items.all())
        discount_amount = obj.discount_amount or Decimal('0.00')
        discounted_subtotal = max(Decimal('0.00'), subtotal - discount_amount)
        tax_amount = (discounted_subtotal * Decimal('0.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) # Use 10%
        return float(tax_amount)
    
    def get_delivery_fee(self, obj):
        """Return delivery fee"""
        return 0.00  # Default to 0 for now
    
    def get_total_amount(self, obj):
        """Return the stored total_price which includes subtotal, discount, tax, and tip."""
        # The obj.total_price already includes everything correctly calculated by the model
        return float(obj.total_price)