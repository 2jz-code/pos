from django.db import models
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()

class Order(models.Model):
    STATUS_CHOICES = [
        # POS-specific statuses
        ("saved", "Saved"),
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
        ("voided", "Voided"),
        # Website-specific statuses
        ("pending", "Pending"),
        ("cancelled", "Cancelled"),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("refunded", "Refunded"),
    ]
    
    ORDER_SOURCE_CHOICES = [
        ("pos", "Point of Sale"),
        ("website", "Website"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="saved")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rewards_profile_id = models.IntegerField(null=True, blank=True)

    # Fields for website orders (guest checkout)
    guest_id = models.CharField(max_length=255, blank=True, null=True)
    guest_first_name = models.CharField(max_length=100, blank=True, null=True)
    guest_last_name = models.CharField(max_length=100, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    
    # Flag to identify the source of the order
    source = models.CharField(max_length=10, choices=ORDER_SOURCE_CHOICES, default="pos")

    def calculate_total_price(self):
        """Recalculate order total based on items."""
        total = sum(item.product.price * item.quantity for item in self.items.all())
        self.total_price = total
        self.save()
        return total

    def __str__(self):
        if self.source == "pos":
            return f"POS Order {self.id} - {self.status} - ${self.total_price}"
        else:
            if self.user:
                return f"Web Order {self.id} by {self.user.username} - {self.status} - ${self.total_price}"
            else:
                return f"Web Order {self.id} by Guest ({self.guest_first_name} {self.guest_last_name}) - {self.status} - ${self.total_price}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    
    # Store price at time of order (important for price changes)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Set the unit price from the product if not already set
        if self.unit_price is None and self.product:
            self.unit_price = self.product.price
        super().save(*args, **kwargs)
    
    def get_total_price(self):
        """Calculate the total price for this item"""
        return (self.unit_price or self.product.price) * self.quantity
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order {self.order.id})"
    


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    guest_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checked_out = models.BooleanField(default=False)
    
    def __str__(self):
        if self.user:
            return f"Cart for {self.user.username}"
        else:
            return f"Cart for Guest ({self.guest_id})"
    
    def get_total_price(self):
        """Calculate the total price of all items in the cart."""
        return sum(item.get_total_price() for item in self.items.all())

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
    
    def get_total_price(self):
        return self.product.price * self.quantity