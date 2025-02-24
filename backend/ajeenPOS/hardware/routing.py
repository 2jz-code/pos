# hardware/routing.py
from django.urls import re_path
from .consumers.cash_drawer import CashDrawerConsumer
from .consumers.card_payment import CardPaymentConsumer

websocket_urlpatterns = [
    # Cash drawer operations endpoint
    re_path(r'ws/hardware/cash-drawer/$', CashDrawerConsumer.as_asgi()),
    
    # Card payment operations endpoint
    re_path(r'ws/hardware/card-payment/$', CardPaymentConsumer.as_asgi()),
]