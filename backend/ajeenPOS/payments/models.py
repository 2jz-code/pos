from django.db import models
from orders.models import Order  # Assuming Order is in orders app
import json

# Keep Payment model largely the same for now, but prepare for transactions
class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partially_refunded', 'Partially Refunded'), # Added status
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('credit', 'Credit Card'),
        ('split', 'Split Payment'),
        ('other', 'Other'), # Added for flexibility
    ]

    # Assuming OneToOne relationship is correct as per original model
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    # This field will represent the overall method (e.g., 'cash', 'credit', 'split')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    # This amount should reflect the final confirmed/paid amount for the *entire* order
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Overall status of the payment for the order
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Flag to indicate if multiple transactions were involved
    is_split_payment = models.BooleanField(default=False)

    # --- Deprecated Field ---
    # transactions_json = models.TextField(blank=True, null=True) # Keep for potential data migration, but don't use for new logic

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id} - {self.status}"

# --- New Model ---
class PaymentTransaction(models.Model):
    """Represents an individual transaction or part of a split payment."""
    TRANSACTION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    TRANSACTION_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('credit', 'Credit Card'),
        ('other', 'Other'), # e.g., gift card, loyalty points
    ]

    parent_payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    payment_method = models.CharField(max_length=50, choices=TRANSACTION_METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS_CHOICES, default='pending')
    timestamp = models.DateTimeField(auto_now_add=True)
    # Store external IDs (like Stripe PI or Charge ID) here
    transaction_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    # Store specific details (card last 4, cash tendered/change) here
    metadata_json = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['timestamp'] # Order transactions by time

    def __str__(self):
        return f"Txn {self.id} ({self.payment_method}) for Payment {self.parent_payment.id} - {self.amount} [{self.status}]"

    def set_metadata(self, data):
        """Safely store metadata as JSON"""
        try:
            self.metadata_json = json.dumps(data)
        except TypeError:
            self.metadata_json = json.dumps({'error': 'Data not serializable'})
        # Consider calling self.save() here or letting the calling code handle saving

    def get_metadata(self):
        """Safely retrieve metadata from JSON"""
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except json.JSONDecodeError:
            return {'error': 'Invalid JSON in metadata'}