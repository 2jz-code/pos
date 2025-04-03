# products/urls.py
from django.urls import path
from .views import ProductList, ProductDetail, CategoryList, CategoryDetail

urlpatterns = [
    path("products/categories/", CategoryList.as_view(), name="category-list"),
    path("products/categories/<int:pk>/", CategoryDetail.as_view(), name="category-detail"),
    path("products/", ProductList.as_view(), name="product-list"),
    path("products/<str:name>/", ProductDetail.as_view(), name="product-detail"),
]