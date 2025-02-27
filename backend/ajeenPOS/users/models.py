# users/models.py in POS backend

from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('cashier', 'Cashier'),
        ('manager', 'Manager'),
        ('customer', 'Website Customer'),  # Add website customer role
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')
    
    # Add fields from website user model
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # Flag to identify which system the user belongs to
    is_pos_user = models.BooleanField(default=True)
    is_website_user = models.BooleanField(default=False)
    
    # Add website-specific fields
    website_profile_created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    groups = models.ManyToManyField(Group, related_name="customuser_groups", blank=True)
    user_permissions = models.ManyToManyField(
        Permission, related_name="customuser_permissions", blank=True
    )

    def save(self, *args, **kwargs):
        # Ensure customers are marked as website users
        if self.role == 'customer':
            self.is_pos_user = False
            self.is_website_user = True
        super().save(*args, **kwargs)

class UserSession(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    session_identifier = models.CharField(max_length=255, unique=True)
    refresh_token = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    # Identify which system this session belongs to
    is_website_session = models.BooleanField(default=False)

    def __str__(self):
        return f"Session for {self.user.username} - Active: {self.is_active}"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def refresh_expiration(self, days=14):
        """
        Refreshes the session expiration date by extending it.
        """
        self.expires_at = timezone.now() + timedelta(days=days)
        self.save()