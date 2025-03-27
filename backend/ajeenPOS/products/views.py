from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from users.permissions import IsAdminUser
import logging

# Categories (Anyone can view, Admins & Managers can add)
class CategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == "POST":  # Restrict adding categories
            return [IsAdminUser()]
        return []  # Allow anyone to GET categories

# Products (Anyone can view, Admins & Managers can add)
logger = logging.getLogger(__name__)

class ProductList(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        print("Checking permissions for POST request...")

        if self.request.method == "POST":
            is_authenticated = self.request.user.is_authenticated
            is_admin = self.request.user.groups.filter(name="Admin").exists()

            print(f"User Authenticated: {is_authenticated}")
            print(f"User Admin Status: {is_admin}")

            return [IsAuthenticated(), IsAdminUser()]

        return [AllowAny()]

    def post(self, request, *args, **kwargs):
        print(f"POST request received. User: {request.user} - Authenticated: {request.user.is_authenticated}")

        if request.user.is_anonymous:
            print("Unauthorized POST request by an anonymous user.")
            return Response({"error": "User is not authenticated"}, status=401)

        print(f"POST request accepted from user: {request.user}")
        return super().post(request, *args, **kwargs)


# Products (Retrieve, Update, Delete)
class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a product by its name instead of ID."""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = "name"  # ✅ Use `name` instead of `id`

    def get_permissions(self):
        if self.request.method in ["PUT", "DELETE"]:  # ✅ Restrict updates/deletions to Admins
            return [IsAdminUser()]
        return []  # ✅ Allow anyone to GET a product
