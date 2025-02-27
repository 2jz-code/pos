# orders/routing.py

from django.urls import re_path
from .consumers import WebsiteOrderStatusConsumer

websocket_urlpatterns = [
    # Remove the ^ at the beginning of the pattern
    re_path(r'ws/website/orders/(?P<order_id>\d+)/$', WebsiteOrderStatusConsumer.as_asgi()),
]