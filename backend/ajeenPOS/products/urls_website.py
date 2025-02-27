# products/urls_website.py
from django.urls import path
from .views_website import WebsiteProductList, WebsiteProductDetail, WebsiteCategoryList

urlpatterns = [
    path('products/', WebsiteProductList.as_view(), name='website-product-list'),
    path('products/<str:name>/', WebsiteProductDetail.as_view(), name='website-product-detail'),
    path('categories/', WebsiteCategoryList.as_view(), name='website-category-list'),
]