# discounts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiscountViewSet

router = DefaultRouter()
router.register(r'', DiscountViewSet)

urlpatterns = [
    path('', include(router.urls)),
]