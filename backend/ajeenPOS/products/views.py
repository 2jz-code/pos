from rest_framework import generics, permissions
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

# Categories (Anyone can view, Admins can add)
class CategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAdminUser()]
        return []

# Products (Anyone can view, Admins can add)
class ProductList(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == "POST":  # Only restrict POST (adding)
            return [permissions.IsAdminUser()]
        return []  # Allow anyone to GET products

# Products (Retrieve, Update, Delete)
class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "DELETE"]:  # Restrict updates/deletions
            return [permissions.IsAdminUser()]
        return []  # Allow anyone to GET a product
