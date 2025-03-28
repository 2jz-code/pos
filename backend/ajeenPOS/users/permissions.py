from rest_framework import permissions
from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'owner']

class IsOwnerUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'owner'

# users/permissions.py
class CanEditUser(BasePermission):
    """
    Permission to check if a user can edit another user.
    - Owners can edit anyone
    - Admins can edit anyone except owners and other admins
    - Others cannot edit users
    """
    def has_object_permission(self, request, view, obj):
        # If the user is an owner
        if request.user.role == 'owner':
            return True
            
        # If target user is an owner, only owners can edit them
        if obj.role == 'owner':
            return request.user.role == 'owner'
            
        # If target user is an admin, only owners and the admin themselves can edit
        if obj.role == 'admin':
            return request.user.role == 'owner' or request.user.id == obj.id
            
        # Admins can edit non-owner, non-admin users
        if request.user.role == 'admin':
            return True
            
        # No other roles can edit users
        return False

class IsWebsiteUser(BasePermission):
    """
    Allows access only to website users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_website_user)

class IsPOSUser(BasePermission):
    """
    Allows access only to POS users (admin, cashier, manager).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_pos_user)