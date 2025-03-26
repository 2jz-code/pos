# Create a management command in payments/management/commands/sync_order_payments.py

from django.core.management.base import BaseCommand
from payments.models import Payment

class Command(BaseCommand):
    help = 'Synchronize payment amounts to order total_price'

    def handle(self, *args, **options):
        payments = Payment.objects.filter(status='completed').select_related('order')
        updated_count = 0
        
        for payment in payments:
            if payment.amount and payment.order and payment.order.total_price != payment.amount:
                payment.order.total_price = payment.amount
                payment.order.save(update_fields=['total_price'])
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {updated_count} orders with their payments"))