from django.urls import path
from .views import CreatePaymentIntentView, PaymentWebhookView, ProcessPaymentView, ConfirmPaymentView
from .terminal_views import CheckPaymentCompletionView ,SimulateCardPresentationView, TerminalPaymentCaptureView, ReaderStatusView, TerminalPaymentIntentView, ConnectionTokenView, PaymentIntentStatusView, ProcessPaymentMethodView
urlpatterns = [
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('process-payment/', ProcessPaymentView.as_view(), name='process-payment'),
    path('confirm-payment/', ConfirmPaymentView.as_view(), name='confirm-payment'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),


    # Terminal Endpoints
    path('terminal/connection-token/', ConnectionTokenView.as_view(), name='terminal-simulate-present-payment-method'),
    path('terminal/capture-payment/', TerminalPaymentCaptureView.as_view(), name='terminal-simulate-present-payment-method'),
    path('terminal/create-payment-intent/', TerminalPaymentIntentView.as_view(), name='terminal-simulate-present-payment-method'),
    path('terminal/present-payment-method/', SimulateCardPresentationView.as_view(), name='terminal-simulate-present-payment-method'),
    path('terminal/reader-status/', ReaderStatusView.as_view(), name='terminal-simulate-present-payment-method'),
    path('terminal/payment-status/<str:payment_intent_id>/', PaymentIntentStatusView.as_view(), name='terminal-payment-status'),
    path('terminal/process-payment-method/', ProcessPaymentMethodView.as_view(), name='terminal-process-payment-method'),
    path('terminal/check-payment-completion/<str:payment_intent_id>/', CheckPaymentCompletionView.as_view(), name='check-payment-completion'),
]