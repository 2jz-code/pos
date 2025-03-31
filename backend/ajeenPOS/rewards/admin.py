# rewards/admin.py
from django.contrib import admin
from .models import RewardsProfile, PointTransaction, Reward, RewardRedemption, PointsRule

@admin.register(RewardsProfile)
class RewardsProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'points_balance', 'lifetime_points', 'tier', 'created_at']
    list_filter = ['tier']
    search_fields = ['user__username', 'user__email', 'guest_email']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = ['profile', 'points', 'transaction_type', 'source', 'created_at']
    list_filter = ['transaction_type', 'source']
    search_fields = ['profile__user__username', 'reference']
    readonly_fields = ['created_at']

@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ['name', 'points_required', 'is_active']
    list_filter = ['is_active', 'discount_type', 'free_product']
    search_fields = ['name', 'description']

@admin.register(RewardRedemption)
class RewardRedemptionAdmin(admin.ModelAdmin):
    list_display = ['profile', 'reward', 'points_used', 'is_used', 'redeemed_at']
    list_filter = ['is_used']
    search_fields = ['profile__user__username', 'redemption_code']
    readonly_fields = ['redeemed_at', 'used_at']

@admin.register(PointsRule)
class PointsRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'points_per_dollar', 'is_product_specific', 'is_promotion', 'is_active']
    list_filter = ['is_active', 'is_product_specific', 'is_promotion']
    search_fields = ['name', 'description']