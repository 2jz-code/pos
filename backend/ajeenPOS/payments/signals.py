# payments/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment

@receiver(post_save, sender=Payment)
def sync_payment_amount_to_order(sender, instance, created, **kwargs):
    """
    Synchronize payment amount to the related order's total_price
    """
    if instance.amount and instance.order:
        # Only update if the amounts differ
        if instance.order.total_price != instance.amount:
            # Update the order's total_price to match the payment amount
            instance.order.total_price = instance.amount
            # Use update_fields to avoid triggering other signals unnecessarily
            instance.order.save(update_fields=['total_price'])