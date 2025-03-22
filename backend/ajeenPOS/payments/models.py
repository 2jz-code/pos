from django.db import models
from orders.models import Order

# payments/models.py
from django.db import models
from orders.models import Order
import json

# payments/models.py
from django.db import models
from orders.models import Order
import json

class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('credit', 'Credit Card'),
        ('split', 'Split Payment'),
    ]
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    payment_method = models.CharField(max_length=255, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    payment_method_id = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # For split payments
    is_split_payment = models.BooleanField(default=False)
    transactions_json = models.TextField(blank=True, null=True) # Store transaction details as JSON
    
    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id} - {self.status}"
    
    def set_transactions(self, transactions):
        """Store transactions list as JSON"""
        try:
            # For debugging
            print(f"Setting transactions: {transactions}")
            print(f"Type: {type(transactions)}")
            
            # Handle different input types more robustly
            if transactions is None:
                self.transactions_json = None
            elif isinstance(transactions, (list, dict)):
                self.transactions_json = json.dumps(transactions)
            else:
                # Try to convert to string and then validate as JSON
                try:
                    json_str = str(transactions)
                    # Validate it's proper JSON by parsing it
                    json.loads(json_str)
                    self.transactions_json = json_str
                except (ValueError, TypeError):
                    # If all else fails, store as a simple JSON string
                    self.transactions_json = json.dumps({"data": str(transactions)})
            
            # For debugging
            print(f"Resulting transactions_json: {self.transactions_json}")
            self.save()
        except Exception as e:
            print(f"Error in set_transactions: {str(e)}")
            # Don't let JSON serialization errors prevent saving
            self.transactions_json = json.dumps({"error": "Failed to serialize transaction data"})
            self.save()
    
    def get_transactions(self):
        """Retrieve transactions from JSON"""
        if not self.transactions_json:
            return []
        try:
            return json.loads(self.transactions_json)
        except json.JSONDecodeError:
            return []
    
    def get_split_details(self):
        """Extract split details from transactions_json if available"""
        if not self.transactions_json:
            return None
        
        try:
            data = json.loads(self.transactions_json)
            # Check if the JSON contains a splitDetails key
            if isinstance(data, dict) and 'splitDetails' in data:
                return data['splitDetails']
            # For backward compatibility - check if the first transaction has splitDetails
            elif isinstance(data, list) and len(data) > 0 and 'splitDetails' in data[0]:
                return data[0]['splitDetails']
            return None
        except (json.JSONDecodeError, IndexError, TypeError):
            return None