# combined-project/backend/delivery_integrations/models.py

from django.db import models
from orders.models import Order # Make sure this import points to your Order model

class DoorDashDriveDelivery(models.Model):
    """
    Stores DoorDash Drive specific information related to an order delivery request.
    """
    # Link to the specific Order that this delivery is for
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='doordash_drive_delivery'
    )
    # Store the unique Delivery ID provided by DoorDash Drive upon creation
    # This is the primary key for tracking with DoorDash
    doordash_delivery_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="The external_delivery_id returned by DoorDash Drive API"
    )
    # Optional: Store the Quote ID if using the quoting flow
    doordash_quote_id = models.CharField(max_length=100, null=True, blank=True, unique=True)

    # Store the tracking URL for the customer/staff
    tracking_url = models.URLField(max_length=512, null=True, blank=True)

    # DoorDash Drive specific status tracking
    # (Refer to DoorDash Drive webhook documentation for exact status strings)
    DRIVE_STATUS_CHOICES = [
        ('CREATED', 'Delivery Created'), # Local status before confirmation
        ('DASHER_CONFIRMED', 'Dasher Confirmed'),
        ('DASHER_ARRIVED_AT_PICKUP', 'Dasher Arrived at Pickup'),
        ('PICKED_UP', 'Picked Up by Dasher'),
        ('DASHER_ARRIVED_AT_DROPOFF', 'Dasher Arrived at Dropoff'),
        ('DROPPED_OFF', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        # Add other relevant statuses like DASHER_CONFIRMATION_DENIED, RETURNED, etc.
    ]
    delivery_status = models.CharField(
        max_length=50,
        choices=DRIVE_STATUS_CHOICES,
        default='CREATED', # Start with a local status
        help_text="Current status based on Drive webhooks"
    )

    # Store pickup/dropoff addresses used in the request for reference (optional)
    pickup_address_details = models.TextField(null=True, blank=True)
    dropoff_address_details = models.TextField(null=True, blank=True)

    # Store the raw payload of the last status update webhook (optional but helpful)
    last_webhook_payload = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DoorDash Drive Delivery {self.doordash_delivery_id} for Order {self.order.id}"

    class Meta:
        verbose_name = "DoorDash Drive Delivery"
        verbose_name_plural = "DoorDash Drive Deliveries"