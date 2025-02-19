# project/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from hardware import routing as hardware_routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ajeenPOS.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            hardware_routing.websocket_urlpatterns
        )
    ),
})