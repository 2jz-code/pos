# payments/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Payment
import json

class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'payment_method', 'amount', 'status', 'is_split_payment', 'created_at')
    list_filter = ('status', 'payment_method', 'is_split_payment')
    search_fields = ('order__id', 'payment_intent_id')
    readonly_fields = ('created_at', 'updated_at', 'formatted_transactions')
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order', 'status', 'amount')
        }),
        ('Payment Method', {
            'fields': ('payment_method', 'payment_intent_id', 'payment_method_id')
        }),
        ('Split Payment Information', {
            'fields': ('is_split_payment', 'formatted_transactions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def formatted_transactions(self, obj):
        """Format the transactions JSON for better readability in the admin"""
        if not obj.transactions_json:
            return "No transaction data available"
        
        try:
            # Try to load and format the JSON
            data = json.loads(obj.transactions_json)
            formatted_json = json.dumps(data, indent=4)
            
            # Format as preformatted text
            return format_html('<pre style="max-height: 300px; overflow-y: auto;">{}</pre>', formatted_json)
        except json.JSONDecodeError:
            # If it's not valid JSON, show the raw data
            return format_html('<div>Invalid JSON data:</div><pre>{}</pre>', obj.transactions_json)
        except Exception as e:
            # Handle any other errors
            return f"Error displaying transaction data: {str(e)}"
    
    formatted_transactions.short_description = "Transactions Data"

admin.site.register(Payment, PaymentAdmin)