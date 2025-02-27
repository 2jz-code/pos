# products/serializers_website.py
from rest_framework import serializers
from .models import Category, Product

class WebsiteCategorySerializer(serializers.ModelSerializer):
    """Serializer for categories in the website frontend"""
    class Meta:
        model = Category
        fields = ['id', 'name']

class WebsiteProductSerializer(serializers.ModelSerializer):
    """
    Serializer for products in the website frontend with proper category nesting
    and image handling
    """
    # Properly nest the category instead of just providing an ID
    category = WebsiteCategorySerializer(read_only=True)
    
    # Add image URL field for frontend display
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'description', 'category', 'image_url']
    
    def get_image_url(self, obj):
        """Get the product image URL or return None"""
        if obj.image and hasattr(obj.image, 'url'):
            return self.context['request'].build_absolute_uri(obj.image.url)
        return None