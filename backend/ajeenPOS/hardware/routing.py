# hardware/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/hardware/$', consumers.HardwareConsumer.as_asgi()),
]