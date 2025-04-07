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
        # Make sure we're not overwriting the tax-inclusive total with the subtotal
        # Only update if the amounts differ significantly (more than a penny)
        if abs(instance.order.total_price - instance.amount) > 0.01:
            # Update the order's total_price to match the payment amount
            instance.order.total_price = instance.amount
            # Use update_fields to avoid triggering other signals unnecessarily
            instance.order.save(update_fields=['total_price'])