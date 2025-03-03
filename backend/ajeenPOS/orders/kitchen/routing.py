# orders/kitchen/routing.py
from django.urls import re_path
from .consumers import KitchenOrderConsumer

websocket_urlpatterns = [
    re_path(r'ws/kitchen/orders/$', KitchenOrderConsumer.as_asgi()),
]