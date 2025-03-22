# payments/serializers.py
from rest_framework import serializers
from .models import Payment
import json

class PaymentTransactionSerializer(serializers.Serializer):
    """Serializer for payment transaction details stored in JSON"""
    method = serializers.CharField()
    amount = serializers.FloatField()
    cashTendered = serializers.FloatField(required=False)
    change = serializers.FloatField(required=False)
    
    # Add additional fields that might be in transactions
    splitPayment = serializers.BooleanField(required=False)
    isSplitPayment = serializers.BooleanField(required=False)
    
    # Allow additional fields
    def __init__(self, *args, **kwargs):
        # Allow unknown fields
        super().__init__(*args, **kwargs)
        self.fields.update({f"splitDetails": serializers.JSONField(required=False)})

class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for the Payment model"""
    transactions = serializers.SerializerMethodField()
    splitDetails = serializers.SerializerMethodField()
    rawTransactionData = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_method', 'payment_intent_id', 
            'payment_method_id', 'amount', 'status',
            'is_split_payment', 'transactions', 'splitDetails',
            'rawTransactionData', 'created_at', 'updated_at'
        ]
    
    def get_rawTransactionData(self, obj):
        """Return the raw transaction JSON for debugging"""
        return obj.transactions_json
    
    def get_transactions(self, obj):
        """Get transactions from JSON field"""
        try:
            if not obj.transactions_json:
                return []
                
            data = json.loads(obj.transactions_json)
            
            # Handle different JSON structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'transactions' in data:
                return data['transactions']
            return []
        except json.JSONDecodeError as e:
            print(f"JSON decode error in get_transactions: {str(e)}")
            print(f"JSON data: {obj.transactions_json}")
            return []
        except Exception as e:
            print(f"Unexpected error in get_transactions: {str(e)}")
            return []
    
    def get_splitDetails(self, obj):
        """Get split details from transactions JSON"""
        try:
            if not obj.transactions_json:
                return None
                
            data = json.loads(obj.transactions_json)
            
            # Handle different JSON structures
            if isinstance(data, dict) and 'splitDetails' in data:
                return data['splitDetails']
            elif isinstance(data, list) and len(data) > 0 and 'splitDetails' in data[0]:
                return data[0]['splitDetails']
            return None
        except json.JSONDecodeError as e:
            print(f"JSON decode error in get_splitDetails: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error in get_splitDetails: {str(e)}")
            return None