# settings/urls.py
from django.urls import path
from .views import (
    SecuritySettingsView,
    TerminalLocationListView,
    TerminalLocationDetailView,
    TerminalReaderListView,
    StripeLocationSyncView,
    StripeReaderSyncView
)

urlpatterns = [
    # Security settings
    path('security/', SecuritySettingsView.as_view(), name='security-settings'),
    
    # Terminal locations
    path('terminal/locations/', TerminalLocationListView.as_view(), name='terminal-location-list'),
    path('terminal/locations/<int:pk>/', TerminalLocationDetailView.as_view(), name='terminal-location-detail'),
    path('terminal/locations/sync/', StripeLocationSyncView.as_view(), name='terminal-location-sync'),
    
    # Terminal readers
    path('terminal/readers/', TerminalReaderListView.as_view(), name='terminal-reader-list'),
    path('terminal/readers/sync/', StripeReaderSyncView.as_view(), name='terminal-reader-sync'),
]