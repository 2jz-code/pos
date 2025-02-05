from django.db import models
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()

class Order(models.Model):
    STATUS_CHOICES = [
        ("saved", "Saved"),         # ✅ Order is saved but not completed
        ("in-progress", "In Progress"),  # ✅ Order is open in the POS system
        ("completed", "Completed"), # ✅ Order is finalized
        ("voided", "Voided"),   # ✅ Order was voided
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("refunded", "Refunded"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)  # ✅ Who created the order?
    created_at = models.DateTimeField(auto_now_add=True)  # ✅ Timestamp when order was made
    updated_at = models.DateTimeField(auto_now=True)  # ✅ Timestamp when order was last modified
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="saved")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # ✅ Stores order total

    def calculate_total_price(self):
        """Recalculate order total based on items."""
        total = sum(item.product.price * item.quantity for item in self.items.all())
        self.total_price = total
        self.save()
        return total

    def __str__(self):
        return f"Order {self.id} - {self.status} - ${self.total_price}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order {self.order.id})"
