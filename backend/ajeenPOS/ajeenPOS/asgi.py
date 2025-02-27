import os
import django

# Set the Django settings module first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ajeenPOS.settings')

# Setup Django explicitly before any models are imported
django.setup()

# Now import Django-related modules
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

# Only import app modules after Django is fully set up
from hardware.routing import websocket_urlpatterns as hardware_websocket_urlpatterns
from orders.routing import websocket_urlpatterns as orders_websocket_urlpatterns

# Combine the websocket URL patterns from both apps
combined_websocket_urlpatterns = hardware_websocket_urlpatterns + orders_websocket_urlpatterns

# Define the ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(combined_websocket_urlpatterns)
    )
})