# discounts/models.py
from django.db import models
from django.utils import timezone
from products.models import Product, Category
from decimal import Decimal

class Discount(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    APPLY_TO_CHOICES = [
        ('order', 'Entire Order'),
        ('product', 'Specific Products'),
        ('category', 'Product Categories'),
    ]
    
    DISCOUNT_CATEGORY_CHOICES = [
        ('promotional', 'Promotional Discount'),
        ('permanent', 'Permanent Discount'),
    ]
    
    discount_category = models.CharField(
        max_length=15, 
        choices=DISCOUNT_CATEGORY_CHOICES,
        default='promotional',
        help_text="Whether this is a time-limited promotion or a permanent discount"
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    apply_to = models.CharField(max_length=10, choices=APPLY_TO_CHOICES)
    
    # For specific product or category discounts
    products = models.ManyToManyField(Product, blank=True, related_name='discounts')
    categories = models.ManyToManyField(Category, blank=True, related_name='discounts')
    
    # For automatic discounts
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Usage limits
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum number of times this discount can be used")
    used_count = models.PositiveIntegerField(default=0, help_text="Number of times this discount has been used")
    
    # Minimum requirements
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    def is_valid(self, order_amount=None):
        """Check if the discount is currently valid"""
        # Check if active
        if not self.is_active:
            return False
        
        # For permanent discounts, skip date checks
        if self.discount_category == 'permanent':
            # Only check usage limit and minimum order amount
            if self.usage_limit and self.used_count >= self.usage_limit:
                return False
            
            if self.minimum_order_amount and order_amount and order_amount < self.minimum_order_amount:
                return False
            
            return True
        
        # For promotional discounts, check dates
        now = timezone.now()
        
        # Check date range - only if start_date is not None
        if self.start_date is not None and now < self.start_date:
            return False
        if self.end_date is not None and now > self.end_date:
            return False
        
        # Check usage limit
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        
        # Check minimum order amount
        if self.minimum_order_amount and order_amount and order_amount < self.minimum_order_amount:
            return False
        
        return True
    
    def calculate_discount_amount(self, base_amount):
        """Calculate the discount amount based on the discount type and value"""
        # Convert base_amount to Decimal if it's not already
        if not isinstance(base_amount, Decimal):
            base_amount = Decimal(str(base_amount))
            
        if self.discount_type == 'percentage':
            return (self.value / Decimal('100')) * base_amount
        else:  # fixed amount
            return min(self.value, base_amount)  # Don't exceed the base amount