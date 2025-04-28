# combined-project/backend/delivery_integrations/urls.py

from django.urls import path, include
from . import views # <-- IMPORT VIEWS NOW

# URLs for internal API calls from your frontend (POS or Website backend)
api_urlpatterns = [
    path('drive/status/<int:order_id>/', views.GetDriveDeliveryStatusView.as_view(), name='get-drive-delivery-status'),
    path('drive/cancel/<int:order_id>/', views.CancelDriveDeliveryView.as_view(), name='cancel-drive-delivery'),
]

# URLs for incoming webhooks from delivery platforms
webhook_urlpatterns = [
    # URL for DoorDash Drive status updates
    path('doordash/status/', views.DoorDashDriveStatusWebhookView.as_view(), name='doordash-drive-status-webhook'),
]

# Combine lists for the main include in ajeenPOS/urls.py
urlpatterns = [
    path('api/', include(api_urlpatterns)),
    path('webhooks/', include(webhook_urlpatterns)),
]