from django.urls import path
from .views import ProductList, ProductDetail, CategoryList

urlpatterns = [
    path("categories/", CategoryList.as_view(), name="category-list"),  # Anyone can view, only admins can add
    path("", ProductList.as_view(), name="product-list"),  # Anyone can view, only admins can add
    path("<int:pk>/", ProductDetail.as_view(), name="product-detail"),  # Anyone can view, only admins can update/delete
]