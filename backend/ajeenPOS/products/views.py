from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, status
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

# Add this to views.py
class CategoryDetail(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a category."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminUser()]
        return []  # Allow anyone to GET a category
    
    def update(self, request, *args, **kwargs):
        """Handle category update with validation"""
        try:
            # Call the parent update method
            response = super().update(request, *args, **kwargs)
            return response
        except Exception as e:
            # Handle any errors during update
            return Response(
                {"detail": f"Failed to update category: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        category_id = category.id
        category_name = category.name
        
        # Get all products for this category with detailed information
        products_in_category = category.products.all()
        product_count = products_in_category.count()
        
        # Check if there are products in this category
        if product_count > 0:
            # Get first 5 product names for the error message
            product_sample = list(products_in_category.values('id', 'name')[:5])
            product_names = ", ".join([p['name'] for p in product_sample])
            
            # Log detailed information for debugging
            logger.warning(
                f"Attempted to delete category {category_id}: '{category_name}' with {product_count} products. "
                f"Sample products: {product_names}"
            )
            
            # Return a detailed error response
            return Response({
                "detail": "Cannot delete category with existing products. Please reassign or delete the products first.",
                "category": {
                    "id": category_id,
                    "name": category_name
                },
                "product_count": product_count,
                "product_sample": product_sample
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # If no products, proceed with deletion
        return super().destroy(request, *args, **kwargs)

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
