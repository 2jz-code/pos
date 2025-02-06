from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),  # ✅ Allows setting category as an ID
        write_only=True  # ✅ Ensure it's used for input, not output
    )
    category_name = serializers.CharField(source="category.name", read_only=True)  # ✅ Read-only category name

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "category", "category_name", "description"]

