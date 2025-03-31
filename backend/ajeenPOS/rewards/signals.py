# rewards/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from django.db import models

from orders.models import Order
from .models import RewardsProfile, PointsRule, PointTransaction
from users.models import CustomUser

@receiver(post_save, sender=Order)
def award_points_for_order(sender, instance, created, **kwargs):
    """Award points when an order is marked as completed"""
    # Only process when an order is completed and paid
    if instance.status != 'completed' or instance.payment_status != 'paid':
        return
    
    # Find or create rewards profile
    profile = None
    
    # For registered users (website orders)
    if instance.user and instance.user.is_website_user:
        try:
            profile = instance.user.rewards_profile
        except RewardsProfile.DoesNotExist:
            profile = RewardsProfile.objects.create(user=instance.user)
    
    # For POS orders with rewards_profile_id
    elif instance.rewards_profile_id:
        try:
            profile = RewardsProfile.objects.get(id=instance.rewards_profile_id)
        except RewardsProfile.DoesNotExist:
            print(f"Rewards profile with ID {instance.rewards_profile_id} not found")
            return
    
    # If no profile could be found or created, exit
    if not profile:
        return
    
    # Check if points have already been awarded for this order
    if PointTransaction.objects.filter(
        profile=profile,
        transaction_type='earn',
        source='order',
        reference=f"Order #{instance.id}"
    ).exists():
        print(f"Points already awarded for order #{instance.id}, skipping")
        return
    
    # Calculate points based on active rules
    points_to_award = calculate_points_for_order(instance, profile)
    
    # Award the points if applicable
    if points_to_award > 0:
        profile.add_points(
            points=points_to_award,
            source='order',
            reference=f"Order #{instance.id}"
        )
        print(f"Awarded {points_to_award} points to profile #{profile.id} for order #{instance.id}")

def calculate_points_for_order(order, profile):
    """Calculate points for an order based on active rules"""
    total_points = 0
    order_total = Decimal(str(order.total_price))
    
    # Get all active rules
    active_rules = PointsRule.objects.filter(is_active=True)
    
    # Process standard points-per-dollar rules
    standard_rules = active_rules.filter(
        is_product_specific=False,
        is_promotion=False
    )
    
    for rule in standard_rules:
        if order_total >= rule.minimum_order_amount:
            # Calculate points: total × points per dollar
            points = int(order_total * rule.points_per_dollar)
            total_points += points
    
    # Process product-specific rules if needed
    product_rules = active_rules.filter(is_product_specific=True)
    
    if product_rules.exists():
        # Get all product IDs in the order
        order_product_ids = set(item.product.id for item in order.items.all())
        
        for rule in product_rules:
            if rule.product_id in order_product_ids:
                # Find the matching order item
                for item in order.items.all():
                    if item.product.id == rule.product_id:
                        # Add points based on quantity purchased
                        total_points += rule.product_points * item.quantity
    
    # Apply promotional multipliers if applicable
    from django.utils import timezone
    now = timezone.now()
    
    # Filter promotions by date conditions instead of using the method
    promo_rules = active_rules.filter(
        is_promotion=True,
        is_active=True
    ).filter(
        # Either promotion_start is null or it's before now
        models.Q(promotion_start__isnull=True) | models.Q(promotion_start__lte=now)
    ).filter(
        # Either promotion_end is null or it's after now
        models.Q(promotion_end__isnull=True) | models.Q(promotion_end__gte=now)
    )
    
    if promo_rules.exists() and total_points > 0:
        # Get the highest multiplier if multiple promotions exist
        highest_multiplier = max(rule.multiplier for rule in promo_rules)
        total_points = int(total_points * highest_multiplier)
    
    # Apply tier bonuses
    tier_multipliers = {
        'bronze': 1.0,
        'silver': 1.1,  # 10% bonus
        'gold': 1.25,   # 25% bonus
        'platinum': 1.5  # 50% bonus
    }
    
    tier_multiplier = tier_multipliers.get(profile.tier, 1.0)
    total_points = int(total_points * Decimal(str(tier_multiplier)))
    
    return total_points

@receiver(post_save, sender=CustomUser)
def create_rewards_profile(sender, instance, created, **kwargs):
    # Only create rewards profile if user is a website user AND has opted in
    if created and instance.is_website_user and instance.is_rewards_opted_in:
        RewardsProfile.objects.create(user=instance)

# Add another signal to handle when a user opts in after account creation
@receiver(post_save, sender=CustomUser)
def handle_rewards_opt_in(sender, instance, created, **kwargs):
    # If this is an existing user who just opted in
    if not created and instance.is_rewards_opted_in:
        # Check if they already have a profile
        if not hasattr(instance, 'rewards_profile'):
            # Create a new rewards profile
            RewardsProfile.objects.create(user=instance)