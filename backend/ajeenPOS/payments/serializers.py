# payments/serializers.py
from rest_framework import serializers
from .models import Payment, PaymentTransaction # Import both models
import json

class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for the PaymentTransaction model"""
    metadata = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = [
            'id',
            'payment_method',
            'amount',
            'status',
            'timestamp',
            'transaction_id',
            'metadata', # Use the method field
            # 'metadata_json', # Exclude raw json unless needed for debug
            'parent_payment', # Include foreign key ID
        ]
        read_only_fields = ['id', 'timestamp', 'parent_payment']

    def get_metadata(self, obj):
        """Parse metadata JSON"""
        return obj.get_metadata()

class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for the Payment model"""
    # Use the related_name 'transactions' from PaymentTransaction model
    transactions = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'order', # Include order ID
            'payment_method', # Overall method (e.g., 'split')
            'amount', # Total amount paid across transactions
            'status', # Overall status (e.g., 'partially_refunded')
            'is_split_payment',
            'transactions', # Nested list of individual transactions
            'created_at',
            'updated_at'
        ]
        # Removed fields: payment_intent_id, payment_method_id, transactions_json related fields