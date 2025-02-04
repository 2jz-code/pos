from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import CustomUser

# Register your models here.
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role',)}),
    )

admin.site.register(CustomUser, CustomUserAdmin)  # Re-register with modifications