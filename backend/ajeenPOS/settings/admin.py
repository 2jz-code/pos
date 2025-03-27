# settings/admin.py
from django.contrib import admin
from .models import SecuritySettings, TerminalLocation, TerminalReader

@admin.register(SecuritySettings)
class SecuritySettingsAdmin(admin.ModelAdmin):
    list_display = ['id', 'two_factor_auth', 'session_timeout', 'password_expiry_days', 'ip_restriction_enabled', 'last_updated']
    readonly_fields = ['last_updated', 'updated_by']
    
    def has_add_permission(self, request):
        # Prevent adding new settings objects - we only want one instance
        return not SecuritySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deleting the settings object
        return False
    
    def save_model(self, request, obj, form, change):
        # Set the updated_by field to the current user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TerminalLocation)
class TerminalLocationAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'city', 'state', 'country', 'created_at']
    search_fields = ['display_name', 'city', 'state']
    list_filter = ['country']


@admin.register(TerminalReader)
class TerminalReaderAdmin(admin.ModelAdmin):
    list_display = ['label', 'location', 'device_type', 'status', 'last_seen']
    list_filter = ['status', 'device_type', 'location']
    search_fields = ['label', 'serial_number']