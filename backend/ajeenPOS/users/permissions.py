from rest_framework import permissions
from django.contrib.auth.models import Group

class IsInGroup(permissions.BasePermission):
    """
    Custom permission to check if the user is in a specific group.
    """

    def __init__(self, group_name):
        self.group_name = group_name

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name=self.group_name).exists()
