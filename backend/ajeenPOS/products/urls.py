from django.urls import path
from .views import ProductList, ProductDetail, CategoryList

urlpatterns = [
    path("products/categories/", CategoryList.as_view(), name="category-list"),  # Anyone can view, only admins can add
    path("products/", ProductList.as_view(), name="product-list"),  # Anyone can view, only admins can add
    path("products/<str:name>/", ProductDetail.as_view(), name="product-detail"),  # Anyone can view, only admins can update/delete
]