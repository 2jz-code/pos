# discounts/admin.py
from django.contrib import admin
from .models import Discount

# discounts/admin.py
class DiscountAdmin(admin.ModelAdmin):
    # Add field to list_display
    list_display = ('name', 'code', 'discount_type', 'value', 'apply_to', 'discount_category', 'is_active', 'start_date', 'end_date', 'used_count')
    
    # Add to list_filter
    list_filter = ('discount_type', 'apply_to', 'discount_category', 'is_active')
    
    # Update fieldsets
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description', 'is_active')
        }),
        ('Discount Details', {
            'fields': ('discount_type', 'value', 'apply_to', 'discount_category')
        }),
        ('Target Items', {
            'fields': ('products', 'categories'),
            'classes': ('collapse',)
        }),
        ('Validity Period', {
            'fields': ('start_date', 'end_date')
        }),
        ('Usage Limits', {
            'fields': ('usage_limit', 'used_count', 'minimum_order_amount')
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ('used_count',)
        return self.readonly_fields

admin.site.register(Discount, DiscountAdmin)