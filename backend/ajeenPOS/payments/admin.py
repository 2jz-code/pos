# payments/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, PaymentTransaction # Import both models
import json

class PaymentTransactionInline(admin.TabularInline):
    """Inline admin for PaymentTransaction"""
    model = PaymentTransaction
    extra = 0 # Don't show extra empty forms
    readonly_fields = ('timestamp', 'formatted_metadata')
    # Reduce the number of fields shown for brevity in inline view
    fields = ('payment_method', 'amount', 'status', 'transaction_id', 'formatted_metadata', 'timestamp')

    def formatted_metadata(self, obj):
        """Format metadata JSON for display"""
        metadata = obj.get_metadata()
        if not metadata:
            return "N/A"
        # Pretty print the JSON
        formatted_json = json.dumps(metadata, indent=2)
        # Limit height and make scrollable
        return format_html('<pre style="max-height: 100px; overflow-y: auto; background-color: #f8f8f8; border: 1px solid #eee; padding: 5px;">{}</pre>', formatted_json)

    formatted_metadata.short_description = "Metadata"

class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_link', 'payment_method', 'amount', 'status', 'is_split_payment', 'created_at', 'transaction_count')
    list_filter = ('status', 'payment_method', 'is_split_payment', 'created_at')
    search_fields = ('order__id', 'transactions__transaction_id') # Search by order ID or related transaction ID
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('order',) # Optimize fetching order
    inlines = [PaymentTransactionInline] # Add the inline transactions

    fieldsets = (
        ('Order Information', {
            'fields': ('order', 'status', 'amount')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'is_split_payment') # Simplified fields
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def order_link(self, obj):
        # Make the order field clickable
        from django.urls import reverse
        link = reverse("admin:orders_order_change", args=[obj.order.id])
        return format_html('<a href="{}">Order #{}</a>', link, obj.order.id)
    order_link.short_description = 'Order'

    def transaction_count(self, obj):
        # Display the number of associated transactions
        return obj.transactions.count()
    transaction_count.short_description = '# Transactions'


# Register PaymentTransaction model separately if needed for direct access
@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'parent_payment_link', 'payment_method', 'amount', 'status', 'timestamp', 'transaction_id')
    list_filter = ('status', 'payment_method', 'timestamp')
    search_fields = ('parent_payment__id', 'transaction_id', 'metadata_json')
    readonly_fields = ('timestamp', 'formatted_metadata')
    list_select_related = ('parent_payment__order',) # Optimize parent payment loading

    fieldsets = (
        (None, {
            'fields': ('parent_payment', 'payment_method', 'amount', 'status')
        }),
        ('Details', {
            'fields': ('transaction_id', 'formatted_metadata', 'timestamp')
        }),
    )

    def parent_payment_link(self, obj):
        # Link to the parent payment
        from django.urls import reverse
        link = reverse("admin:payments_payment_change", args=[obj.parent_payment.id])
        return format_html('<a href="{}">Payment #{} (Order #{})</a>', link, obj.parent_payment.id, obj.parent_payment.order.id)
    parent_payment_link.short_description = 'Parent Payment'

    def formatted_metadata(self, obj):
        """Format metadata JSON for display"""
        metadata = obj.get_metadata()
        if not metadata:
            return "N/A"
        formatted_json = json.dumps(metadata, indent=2)
        # Limit height and make scrollable
        return format_html('<pre style="max-height: 200px; overflow-y: auto; background-color: #f8f8f8; border: 1px solid #eee; padding: 5px;">{}</pre>', formatted_json)
    formatted_metadata.short_description = "Metadata"


# Register the Payment model with the updated admin class
admin.site.register(Payment, PaymentAdmin)