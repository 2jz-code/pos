# rewards/models.py
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from users.models import CustomUser
from orders.models import Order

class RewardsProfile(models.Model):
    """User's rewards account with points balance and tier status"""
    TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]
    
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='rewards_profile')
    points_balance = models.IntegerField(default=0)
    lifetime_points = models.IntegerField(default=0)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='bronze')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    
    def __str__(self):
        if self.user:
            return f"{self.user.username}'s Rewards Profile - {self.points_balance} points"
        return f"Guest Rewards Profile ({self.guest_email}) - {self.points_balance} points"
    
    def add_points(self, points, source=None, reference=None):
        """Add points to the user's balance and record the transaction"""
        self.points_balance += points
        self.lifetime_points += points
        self.save()
        
        # Record the transaction
        PointTransaction.objects.create(
            profile=self,
            points=points,
            transaction_type='earn',
            source=source or 'order',
            reference=reference
        )
        
        # Check for tier upgrade
        self.check_tier_upgrade()
        
        return self.points_balance
    
    def redeem_points(self, points, source=None, reference=None):
        """Redeem points from the user's balance"""
        if points > self.points_balance:
            raise ValueError("Not enough points to redeem")
        
        self.points_balance -= points
        self.save()
        
        # Record the transaction
        PointTransaction.objects.create(
            profile=self,
            points=-points,  # Negative points for redemption
            transaction_type='redeem',
            source=source or 'order',
            reference=reference
        )
        
        return self.points_balance
    
    def check_tier_upgrade(self):
        """Check if user qualifies for a tier upgrade based on lifetime points"""
        if self.lifetime_points >= 10000 and self.tier != 'platinum':
            self.tier = 'platinum'
        elif self.lifetime_points >= 5000 and self.tier != 'gold' and self.tier != 'platinum':
            self.tier = 'gold'
        elif self.lifetime_points >= 1000 and self.tier == 'bronze':
            self.tier = 'silver'
        
        self.save()


class PointTransaction(models.Model):
    """Record of points earned or redeemed"""
    TRANSACTION_TYPES = [
        ('earn', 'Points Earned'),
        ('redeem', 'Points Redeemed'),
        ('expire', 'Points Expired'),
        ('adjust', 'Manual Adjustment'),
    ]
    
    SOURCE_TYPES = [
        ('order', 'Order Purchase'),
        ('signup', 'Account Creation'),
        ('referral', 'Friend Referral'),
        ('promotion', 'Special Promotion'),
        ('birthday', 'Birthday Reward'),
        ('manual', 'Manual Adjustment'),
    ]
    
    profile = models.ForeignKey(RewardsProfile, on_delete=models.CASCADE, related_name='transactions')
    points = models.IntegerField()  # Positive for earned, negative for redeemed
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    source = models.CharField(max_length=20, choices=SOURCE_TYPES, default='order')
    reference = models.CharField(max_length=255, blank=True, null=True)  # Order ID, etc.
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        action = "earned" if self.points > 0 else "redeemed"
        points_display = abs(self.points)
        return f"{points_display} points {action} via {self.get_source_display()}"


class Reward(models.Model):
    """Predefined rewards that users can redeem with points"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    points_required = models.IntegerField()
    is_active = models.BooleanField(default=True)
    
    # For discounts
    discount_type = models.CharField(
        max_length=20, 
        choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount')],
        blank=True, null=True
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # For free products
    free_product = models.BooleanField(default=False)
    product_id = models.IntegerField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.points_required} points)"


class RewardRedemption(models.Model):
    """Record of rewards redeemed by users"""
    profile = models.ForeignKey(RewardsProfile, on_delete=models.CASCADE, related_name='redemptions')
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE)
    points_used = models.IntegerField()
    redeemed_at = models.DateTimeField(auto_now_add=True)
    
    # If applied to an order
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Code generated for this redemption
    redemption_code = models.CharField(max_length=20, blank=True, null=True)
    
    # Tracking usage
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.reward.name} redeemed by {self.profile}"
    
    def generate_code(self):
        """Generate a unique redemption code"""
        import random
        import string
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        self.redemption_code = code
        self.save()
        return code
    
    def mark_as_used(self):
        """Mark this redemption as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()


class PointsRule(models.Model):
    """Rules for awarding points based on order amount or specific products"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # For order total-based points
    points_per_dollar = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # For product-specific points
    is_product_specific = models.BooleanField(default=False)
    product_id = models.IntegerField(blank=True, null=True)
    product_points = models.IntegerField(blank=True, null=True)
    
    # For promotional multipliers
    is_promotion = models.BooleanField(default=False)
    multiplier = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    promotion_start = models.DateTimeField(blank=True, null=True)
    promotion_end = models.DateTimeField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        if self.is_product_specific:
            return f"Product-specific rule: {self.name}"
        elif self.is_promotion:
            return f"Promotion: {self.name} ({self.multiplier}x points)"
        else:
            return f"Standard rule: {self.points_per_dollar} points per dollar"
    
    def is_valid_now(self):
        """Check if this rule is currently valid (for promotions)"""
        if not self.is_active:
            return False
        
        if self.is_promotion:
            now = timezone.now()
            if self.promotion_start and now < self.promotion_start:
                return False
            if self.promotion_end and now > self.promotion_end:
                return False
        
        return True