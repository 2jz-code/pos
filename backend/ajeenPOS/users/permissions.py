from rest_framework import permissions
from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission

class IsAdminGroup(BasePermission):
    """
    Custom permission to check if the user is in the Admin group.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name="Admin").exists()
