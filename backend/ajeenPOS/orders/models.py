from django.db import models
from products.models import Product
from django.contrib.auth import get_user_model
from decimal import Decimal
from decimal import Decimal, ROUND_HALF_UP

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

    discount = models.ForeignKey('discounts.Discount', on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def calculate_total_price(self, tip_to_add=Decimal('0.00')):
        """Recalculate order total based on items and discounts."""
        
        # --- FIX: Use item.get_total_price() which uses the stored unit_price ---
        # This ensures the price at the time of order creation is used.
        subtotal = sum(item.get_total_price() for item in self.items.all())
        # --- End FIX ---
        
        # Apply discount if present
        if self.discount:
            # Ensure discount calculations also use the correct item total (get_total_price)
            # instead of potentially outdated item.product.price * item.quantity
            if self.discount.apply_to == 'order':
                 # Order-level discounts likely use the subtotal calculated above, which is now correct.
                self.discount_amount = self.discount.calculate_discount_amount(subtotal) 
            elif self.discount.apply_to == 'product':
                self.discount_amount = Decimal('0.00') # Ensure Decimal start
                for item in self.items.all():
                    if self.discount.products.filter(id=item.product.id).exists():
                        item_total = item.get_total_price() # Use stored price total
                        if self.discount.discount_type == 'percentage':
                            item_discount = (self.discount.value / Decimal('100.0')) * item_total # Use Decimal
                        else: # Fixed amount
                            item_discount = min(self.discount.value, item_total)
                        self.discount_amount += item_discount
            elif self.discount.apply_to == 'category':
                self.discount_amount = Decimal('0.00') # Ensure Decimal start
                for item in self.items.all():
                    if hasattr(item.product, 'category') and item.product.category and self.discount.categories.filter(id=item.product.category.id).exists():
                        item_total = item.get_total_price() # Use stored price total
                        if self.discount.discount_type == 'percentage':
                            item_discount = (self.discount.value / Decimal('100.0')) * item_total # Use Decimal
                        else: # Fixed amount
                            item_discount = min(self.discount.value, item_total)
                        self.discount_amount += item_discount
        else:
            self.discount_amount = Decimal('0.00')
        
        # Calculate discounted subtotal (ensure non-negative)
        discounted_subtotal = max(Decimal('0.00'), subtotal - self.discount_amount)
        
        # Calculate tax (10% - ensure using Decimal for calculation)
        tax_amount = (discounted_subtotal * Decimal('0.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) # Example tax calc
        
        self.tip_amount = tip_to_add # Assign tip passed as argument

        # Set the final price including tax and tip
        self.total_price = discounted_subtotal + tax_amount + self.tip_amount 
        
        # Explicitly save the calculated fields to the database instance
        self.save(update_fields=['total_price', 'discount_amount', 'tip_amount']) 
        
        return self.total_price

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