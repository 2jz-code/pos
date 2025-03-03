from django.urls import path
from .views import CreatePaymentIntentView, PaymentWebhookView, ProcessPaymentView, ConfirmPaymentView

urlpatterns = [
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('process-payment/', ProcessPaymentView.as_view(), name='process-payment'),
    path('confirm-payment/', ConfirmPaymentView.as_view(), name='confirm-payment'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
]