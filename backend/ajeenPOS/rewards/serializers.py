# rewards/serializers.py
from rest_framework import serializers
from .models import (
    RewardsProfile, PointTransaction, Reward, 
    RewardRedemption, PointsRule
)

class RewardsProfileSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = RewardsProfile
        fields = [
            'id', 'username', 'points_balance', 'lifetime_points',
            'tier', 'created_at', 'updated_at'
        ]
        read_only_fields = ['points_balance', 'lifetime_points', 'tier']
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return f"Guest ({obj.guest_email})"

class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = [
            'id', 'points', 'transaction_type', 'source',
            'reference', 'created_at'
        ]
        read_only_fields = ['created_at']

class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = [
            'id', 'name', 'description', 'points_required',
            'is_active', 'discount_type', 'discount_value',
            'free_product', 'product_id'
        ]

class RewardRedemptionSerializer(serializers.ModelSerializer):
    reward_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RewardRedemption
        fields = [
            'id', 'reward', 'reward_name', 'points_used', 'redeemed_at',
            'redemption_code', 'is_used', 'used_at'
        ]
        read_only_fields = ['redeemed_at', 'used_at', 'points_used']
    
    def get_reward_name(self, obj):
        return obj.reward.name

class PointsRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsRule
        fields = [
            'id', 'name', 'description', 'points_per_dollar',
            'minimum_order_amount', 'is_product_specific',
            'product_id', 'product_points', 'is_promotion',
            'multiplier', 'promotion_start', 'promotion_end',
            'is_active'
        ]