# orders/views_website.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string

from .models import Order, OrderItem, Cart, CartItem
from .serializers_website import WebsiteOrderSerializer, CartSerializer, CartItemSerializer
from products.models import Product
from users.permissions import IsWebsiteUser

class WebsiteCartView(APIView):
    """
    Handle cart operations for website users
    """

    def get_cart(self, request):
        """Helper method to get or create a cart for a user or guest"""
        guest_id = None
        
        if request.user.is_authenticated and request.user.is_website_user:
            cart, created = Cart.objects.get_or_create(
                user=request.user,
                checked_out=False
            )
        else:
            # For guest users
            guest_id = request.COOKIES.get('guest_id')
            if not guest_id:
                guest_id = get_random_string(32)
                
            cart, created = Cart.objects.get_or_create(
                guest_id=guest_id,
                checked_out=False
            )
            # Only return the guest_id if it was newly created
            guest_id = guest_id if created or not request.COOKIES.get('guest_id') else None
            
        return cart, guest_id
    
    def get(self, request):
        """Get the current cart contents"""
        cart, guest_id = self.get_cart(request)
        
        # Pass request in the context to the serializer
        serializer = CartSerializer(cart, context={'request': request})
        
        response = Response(serializer.data)
        
        # Set guest ID cookie if needed
        if guest_id:
            response.set_cookie(
                'guest_id', 
                guest_id, 
                max_age=60*60*24*30,  # 30 days
                httponly=True,
                samesite='Lax'
            )
            
        return response
    
    def post(self, request):
        """Add an item to the cart"""
        cart, guest_id = self.get_cart(request)
        
        # Validate request data
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        
        if not product_id:
            return Response(
                {'error': 'Product ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if quantity <= 0:
            return Response(
                {'error': 'Quantity must be positive'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use the serializer to create/update cart item
        serializer = CartItemSerializer(data={
            'product_id': product_id,
            'quantity': quantity
        })
        
        if serializer.is_valid():
            serializer.save(cart=cart)
            
            # Get updated cart - include request context
            cart_serializer = CartSerializer(cart, context={'request': request})
            
            # Prepare response
            response = Response(cart_serializer.data, status=status.HTTP_201_CREATED)
            
            # Set guest ID cookie if needed
            if guest_id:
                response.set_cookie(
                    'guest_id', 
                    guest_id, 
                    max_age=60*60*24*30,  # 30 days
                    httponly=True,
                    samesite='Lax'
                )
                
            return response
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WebsiteCartItemView(APIView):
    """
    Handle operations on individual cart items for website users
    """
    def get_cart(self, request):
        """Helper method to get a cart for a user or guest"""
        if request.user.is_authenticated and request.user.is_website_user:
            cart, _ = Cart.objects.get_or_create(
                user=request.user,
                checked_out=False
            )
            return cart
        
        guest_id = request.COOKIES.get('guest_id')
        if not guest_id:
            return None
            
        cart, _ = Cart.objects.get_or_create(
            guest_id=guest_id,
            checked_out=False
        )
        return cart

    def put(self, request, item_id):
        """Update the quantity of a cart item"""
        cart = self.get_cart(request)
        
        if not cart:
            return Response(
                {'error': 'No active cart found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CartItemSerializer(
            cart_item, 
            data={'product_id': cart_item.product.id, 'quantity': request.data.get('quantity', 1)},
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Return updated cart with request context
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, item_id):
        """Remove an item from the cart"""
        cart = self.get_cart(request)
        
        if not cart:
            return Response(
                {'error': 'No active cart found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find and delete the cart item
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()
            
            # Return updated cart with request context
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class WebsiteCheckoutView(APIView):
    """
    Handle checkout process for website orders
    """
    permission_classes = [] # Allow both authenticated and guest users
    
    def post(self, request):
        """Create an order from cart contents"""
        # Get cart
        if request.user.is_authenticated and request.user.is_website_user:
            cart = Cart.objects.filter(
                user=request.user,
                checked_out=False
            ).first()
            user = request.user
            guest_id = None
        else:
            guest_id = request.COOKIES.get('guest_id')
            if not guest_id:
                return Response(
                    {'error': 'No cart found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            cart = Cart.objects.filter(
                guest_id=guest_id,
                checked_out=False
            ).first()
            user = None
        
        if not cart or not cart.items.exists():
            return Response(
                {'error': 'Cart is empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get guest information for guest checkout
        guest_data = {}
        if not user:
            guest_data = {
                'guest_id': guest_id,
                'guest_first_name': request.data.get('first_name', ''),
                'guest_last_name': request.data.get('last_name', ''),
                'guest_email': request.data.get('email', '')
            }
            
            # Validate required guest information
            if not all([
                guest_data['guest_first_name'], 
                guest_data['guest_last_name'], 
                guest_data['guest_email']
            ]):
                return Response(
                    {'error': 'Guest information required (first_name, last_name, email)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create the order
        order = Order.objects.create(
            user=user,
            status='pending',
            source='website',
            **guest_data
        )
        
        # Add order items
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price  # Store current price
            )
        
        # Calculate total price
        order.calculate_total_price()
        
        # Mark cart as checked out
        cart.checked_out = True
        cart.save()
        
        # Return order data with explicit order_id in the response
        serializer = WebsiteOrderSerializer(order)
        response_data = serializer.data
        response_data['order_id'] = order.id  # Explicitly include order_id
        
        return Response(response_data, status=status.HTTP_201_CREATED)

class WebsiteOrderListView(APIView):
    """
    List orders for website users
    """
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    def get(self, request):
        orders = Order.objects.filter(
            user=request.user,
            source='website'
        ).order_by('-created_at')
        
        serializer = WebsiteOrderSerializer(orders, many=True)
        return Response(serializer.data)

class WebsiteOrderDetailView(APIView):
    """
    Get details of a specific order for website users
    """
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    def get(self, request, order_id=None):
        # If order_id is in the URL, use it
        if order_id:
            try:
                order = Order.objects.get(
                    id=order_id,
                    user=request.user,
                    source='website'
                )
                serializer = WebsiteOrderSerializer(order, context={'request': request})
                return Response(serializer.data)
            except Order.DoesNotExist:
                return Response(
                    {'error': 'Order not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # If no order_id is provided, return the most recent order
        try:
            order = Order.objects.filter(
                user=request.user,
                source='website'
            ).order_by('-created_at').first()
            
            if not order:
                return Response(
                    {'error': 'No orders found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            serializer = WebsiteOrderSerializer(order, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GuestOrderDetailView(APIView):
    """
    Get details of an order for guest users (using guest_id and email)
    """
    def post(self, request):
        guest_id = request.COOKIES.get('guest_id')
        email = request.data.get('email')
        order_id = request.data.get('order_id')
        
        if not all([guest_id, email, order_id]):
            return Response(
                {'error': 'Missing required information'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(
                id=order_id,
                guest_id=guest_id,
                guest_email=email,
                source='website'
            )
            serializer = WebsiteOrderSerializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )