# hardware/urls.py
from django.urls import path
from .views import CashDrawerView, DebugSimulationView, DrawerStateView, ReceiptPrinterView

urlpatterns = [
    path('cash-drawer/open/', CashDrawerView.as_view(), name='open-drawer'),
    path('cash-drawer/state/', DrawerStateView.as_view(), name='drawer-state'),
    path('receipt/print/', ReceiptPrinterView.as_view(), name='print-receipt'),
    path('debug/simulate-<str:mode>/', DebugSimulationView.as_view(), name='debug-simulation'),
]