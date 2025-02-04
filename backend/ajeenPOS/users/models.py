from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('cashier', 'Cashier'),
        ('manager', 'Manager'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')

    groups = models.ManyToManyField(Group, related_name="customuser_groups", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="customuser_permissions", blank=True)  # Add blank=True
