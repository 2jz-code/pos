# settings/models.py
from django.db import models
from django.conf import settings

class SecuritySettings(models.Model):
    """Model for storing global security settings"""
    two_factor_auth = models.BooleanField(default=False)
    session_timeout = models.IntegerField(default=30)  # minutes
    password_expiry_days = models.IntegerField(default=90)  # 0 = never expires
    ip_restriction_enabled = models.BooleanField(default=False)
    allowed_ips = models.TextField(blank=True)  # Store IPs as comma-separated values
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='security_updates'
    )
    
    class Meta:
        verbose_name = 'Security Settings'
        verbose_name_plural = 'Security Settings'
    
    def __str__(self):
        return f"Security Settings (Last updated: {self.last_updated})"
    
    @classmethod
    def get_settings(cls):
        """Get or create security settings"""
        settings_obj, created = cls.objects.get_or_create(pk=1)
        return settings_obj
    
    def get_allowed_ips_list(self):
        """Get allowed IPs as a list"""
        if not self.allowed_ips:
            return []
        return [ip.strip() for ip in self.allowed_ips.split(',') if ip.strip()]
    
    def set_allowed_ips_list(self, ip_list):
        """Set allowed IPs from a list"""
        self.allowed_ips = ','.join(ip_list)


class TerminalLocation(models.Model):
    """Model for Stripe Terminal locations"""
    display_name = models.CharField(max_length=255)
    stripe_location_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Address fields
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=2, default='US')  # ISO country code
    postal_code = models.CharField(max_length=20)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Terminal Location'
        verbose_name_plural = 'Terminal Locations'
    
    def __str__(self):
        return self.display_name
    
    def get_address_dict(self):
        """Return address as a dictionary for Stripe API"""
        return {
            'line1': self.address_line1,
            'line2': self.address_line2 or '',
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'postal_code': self.postal_code
        }


class TerminalReader(models.Model):
    """Model for Stripe Terminal readers"""
    label = models.CharField(max_length=255)
    stripe_reader_id = models.CharField(max_length=255, blank=True, null=True)
    location = models.ForeignKey(TerminalLocation, on_delete=models.SET_NULL, null=True, related_name='readers')
    device_type = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50, default='offline')
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Terminal Reader'
        verbose_name_plural = 'Terminal Readers'
    
    def __str__(self):
        return f"{self.label} ({self.status})"