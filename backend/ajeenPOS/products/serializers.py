# combined-project/backend/products/serializers.py
from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    # Change 1: Remove write_only=True to make category ID readable
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        # write_only=True  <-- REMOVE this line
        # You might want to add required=False, allow_null=True if a product might not have a category
        required=False,
        allow_null=True,
    )
    # Change 2: Keep category_name for display purposes if needed
    category_name = serializers.CharField(
        source="category.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Product
        # Change 3: Ensure 'category' (the ID field) is included in the fields list
        fields = [
            "id",
            "name",
            "price",
            "image",
            "category",  # <-- Ensure this (the ID field) is listed
            "category_name",
            "description",
        ]
