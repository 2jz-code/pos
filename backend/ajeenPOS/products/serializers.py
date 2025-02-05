from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)  # ✅ Extract category name

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "category_name", "description"]  # ✅ Include category_name

