# discounts/serializers.py
from rest_framework import serializers
from .models import Discount
from products.serializers import ProductSerializer, CategorySerializer

class DiscountSerializer(serializers.ModelSerializer):
    # Define products_details and categories_details properly
    products_details = serializers.SerializerMethodField()
    categories_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Discount
        fields = [
            'id', 'name', 'code', 'description', 'discount_type', 'value', 
            'apply_to', 'products', 'categories', 'products_details', 
            'categories_details', 'is_active', 'start_date', 'end_date',
            'usage_limit', 'used_count', 'minimum_order_amount',
            'discount_category', 'created_at', 'updated_at'
        ]
        read_only_fields = ['used_count', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Convert empty string to None for code field
        if 'code' in validated_data and validated_data['code'] == '':
            validated_data['code'] = None
        
        return super().create(validated_data)
    
    def get_products_details(self, obj):
        """Get detailed information about associated products"""
        return ProductSerializer(obj.products.all(), many=True).data

    def get_categories_details(self, obj):
        """Get detailed information about associated categories"""
        return CategorySerializer(obj.categories.all(), many=True).data
    
    def validate(self, data):
        """
        Custom validation to handle dates and usage_limit based on discount_category
        """
        # For permanent discounts, dates should be null
        if data.get('discount_category') == 'permanent':
            data['start_date'] = None
            data['end_date'] = None
        
        # Ensure usage_limit is either a positive integer or null
        if 'usage_limit' in data and data['usage_limit'] is not None:
            try:
                usage_limit = int(data['usage_limit'])
                if usage_limit < 0:
                    raise serializers.ValidationError({"usage_limit": "Usage limit must be a positive integer"})
                data['usage_limit'] = usage_limit
            except (ValueError, TypeError):
                raise serializers.ValidationError({"usage_limit": "A valid integer is required"})
        
        return data