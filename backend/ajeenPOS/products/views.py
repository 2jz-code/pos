from rest_framework import generics
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from users.permissions import IsInGroup  # Import custom group permission

# Categories (Anyone can view, Admins & Managers can add)
class CategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == "POST":  # Restrict adding categories
            return [IsInGroup("Admin")]
        return []  # Allow anyone to GET categories

# Products (Anyone can view, Admins & Managers can add)
class ProductList(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == "POST":  # Restrict adding products
            return [IsInGroup("Admin")]
        return []  # Allow anyone to GET products

# Products (Retrieve, Update, Delete)
class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "DELETE"]:  # Restrict updates/deletions
            return [IsInGroup("Admin")]
        return []  # Allow anyone to GET a product
