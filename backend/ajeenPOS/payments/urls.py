from django.urls import path
from .views import (
    CreatePaymentIntentView, PaymentWebhookView, ProcessPaymentView, ConfirmPaymentView,
    PaymentListView, PaymentDetailView, PaymentRefundView  # Add these new views
)
from .terminal_views import (
    CheckPaymentCompletionView, SimulateCardPresentationView, TerminalPaymentCaptureView,
    ReaderStatusView, TerminalPaymentIntentView, ConnectionTokenView, PaymentIntentStatusView,
    ProcessPaymentMethodView, CancelTerminalActionView
)

urlpatterns = [
    # Existing paths
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('process-payment/', ProcessPaymentView.as_view(), name='process-payment'),
    path('confirm-payment/', ConfirmPaymentView.as_view(), name='confirm-payment'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),

    # Terminal Endpoints
    path('terminal/connection-token/', ConnectionTokenView.as_view(), name='terminal-connection-token'),
    path('terminal/capture-payment/', TerminalPaymentCaptureView.as_view(), name='terminal-capture-payment'),
    path('terminal/create-payment-intent/', TerminalPaymentIntentView.as_view(), name='terminal-create-payment-intent'),
    path('terminal/present-payment-method/', SimulateCardPresentationView.as_view(), name='terminal-present-payment-method'),
    path('terminal/reader-status/', ReaderStatusView.as_view(), name='terminal-reader-status'),
    path('terminal/payment-status/<str:payment_intent_id>/', PaymentIntentStatusView.as_view(), name='terminal-payment-status'),
    path('terminal/process-payment-method/', ProcessPaymentMethodView.as_view(), name='terminal-process-payment-method'),
    path('terminal/check-payment-completion/<str:payment_intent_id>/', CheckPaymentCompletionView.as_view(), name='check-payment-completion'),
    path('terminal/cancel-action/', CancelTerminalActionView.as_view(), name='terminal-cancel-action'),

    # New endpoints for payment management
    path('', PaymentListView.as_view(), name='payment-list'),
    path('<int:payment_id>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('<int:payment_id>/refund/', PaymentRefundView.as_view(), name='payment-refund'),
]