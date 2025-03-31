# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import CustomUser

# Register your models here.
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    
    # Update the fieldsets to include is_rewards_opted_in in Personal info section
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'is_rewards_opted_in')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Role', {'fields': ('role', 'is_pos_user', 'is_website_user')}),
    )
    
    # Update add_fieldsets to include is_rewards_opted_in as well
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'is_rewards_opted_in')}),
        ('Role', {'fields': ('role', 'is_pos_user', 'is_website_user')}),
    )
    
    # Add is_rewards_opted_in to list_display to show it in the user list
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_rewards_opted_in', 'role', 'is_staff')
    
    # Add is_rewards_opted_in to list_filter to enable filtering by this field
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'is_rewards_opted_in', 'role')

admin.site.register(CustomUser, CustomUserAdmin)  # Re-register with modifications