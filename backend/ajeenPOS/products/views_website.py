# products/views_website.py
from rest_framework import generics, status
from rest_framework.response import Response
from django.utils.text import slugify
from .models import Product, Category
from .serializers_website import WebsiteProductSerializer, WebsiteCategorySerializer

class WebsiteProductList(generics.ListAPIView):
    """
    API endpoint for listing products on the website frontend.
    Allows filtering by category.
    """
    serializer_class = WebsiteProductSerializer
    
    def get_queryset(self):
        queryset = Product.objects.all()
        
        # Filter by category if provided
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context

class WebsiteProductDetail(generics.RetrieveAPIView):
    """
    API endpoint for retrieving product details by name on the website frontend.
    Uses the product name as the lookup field.
    """
    queryset = Product.objects.all()
    serializer_class = WebsiteProductSerializer
    lookup_field = 'name'
    
    def get_object(self):
        """
        Override to handle URL-encoded product names properly
        """
        name = self.kwargs.get('name')
        # The frontend is already sending URL-encoded names,
        # Django's URL resolver handles the decoding
        
        # Try to find the product by exact name match
        try:
            return Product.objects.get(name=name)
        except Product.DoesNotExist:
            # If exact match fails, try case-insensitive search
            products = Product.objects.filter(name__iexact=name)
            if products.exists():
                return products.first()
            
            # If all else fails, raise the exception
            raise

class WebsiteCategoryList(generics.ListAPIView):
    """
    API endpoint for listing categories on the website frontend.
    """
    queryset = Category.objects.all()
    serializer_class = WebsiteCategorySerializer