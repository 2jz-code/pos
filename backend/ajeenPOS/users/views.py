# backend/users/views.py

from rest_framework.views import APIView
from rest_framework.response import Response

# Import AllowAny permission class
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework import (
    status,
    generics,
    serializers,
)  # Import serializers for validation error
from django.contrib.auth import get_user_model, authenticate
from django.core.exceptions import PermissionDenied

# Import Django settings
from django.conf import settings
from .serializers import UserSerializer
from .permissions import IsAdminUser, IsOwnerUser, CanEditUser

User = get_user_model()


# ✅ Login View (Stores Tokens in HttpOnly Cookies)
class LoginView(APIView):
    # Add this line to allow anyone to access this view
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Determine if cookies should be secure based on DEBUG setting
            # Use imported settings object
            secure_cookie = not settings.DEBUG

            # Set cookies for authentication
            response = Response(
                {"message": "Login successful"}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                key="pos_access_token",
                value=str(access_token),
                httponly=True,
                # Use access token lifetime from imported settings
                max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
                path="/api/",  # Be specific with path if possible
                samesite="Lax",  # Or 'Strict' if applicable
                secure=secure_cookie,  # Set dynamically based on DEBUG
            )
            response.set_cookie(
                key="pos_refresh_token",
                value=str(refresh),
                httponly=True,
                # Use refresh token lifetime from imported settings
                max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
                path="/api/",  # Be specific with path if possible
                samesite="Lax",  # Or 'Strict'
                secure=secure_cookie,  # Set dynamically based on DEBUG
            )
            return response

        return Response(
            {"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED
        )


# ✅ Token Refresh View (Uses Refresh Token from Cookies)
class CustomTokenRefreshView(APIView):
    # Allow anyone to attempt refreshing a token (validation happens inside)
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("pos_refresh_token")

        if not refresh_token:
            return Response(
                {"error": "Refresh token missing"}, status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = refresh.access_token

            # Determine if cookies should be secure based on DEBUG setting
            # Use imported settings object
            secure_cookie = not settings.DEBUG

            response = Response(
                {"message": "Token refreshed"}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                key="pos_access_token",
                value=str(access_token),
                httponly=True,
                # Use access token lifetime from imported settings
                max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
                path="/api/",
                samesite="Lax",
                secure=secure_cookie,  # Set dynamically
            )
            # Note: Refresh token cookie is NOT reset here, it persists until logout or expiry
            return response

        except Exception:
            # Consider logging the exception here for debugging
            return Response(
                {"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED
            )


class CheckAuthView(APIView):
    # Allow anyone to check auth (validation happens inside)
    permission_classes = [AllowAny]

    def get(self, request):
        access_token = request.COOKIES.get("pos_access_token")

        if not access_token:
            return Response(
                {"authenticated": False, "is_admin": False}, status=status.HTTP_200_OK
            )  # Return 200, just not authenticated

        try:
            token = AccessToken(access_token)
            # Ensure token hasn't expired (AccessToken doesn't raise error on init for expired)
            # token.verify() # This would raise TokenError if expired, but might be too strict for just checking
            user = User.objects.get(id=token["user_id"])
            return Response(
                {
                    "authenticated": True,
                    "username": user.username,
                    # Check role field directly - safer than relying on is_staff/is_superuser
                    "is_admin": user.role in ["admin", "owner"],
                },
                status=status.HTTP_200_OK,
            )
        except User.DoesNotExist:
            # User associated with token doesn't exist anymore
            return Response(
                {"authenticated": False, "is_admin": False}, status=status.HTTP_200_OK
            )
        except Exception:  # Catches TokenError (invalid/expired) and others
            # Consider logging the exception
            # If token is invalid/expired, they are not authenticated
            return Response(
                {"authenticated": False, "is_admin": False}, status=status.HTTP_200_OK
            )


# ✅ Logout View (Clears Cookies & Blacklists Refresh Token)
class LogoutView(APIView):
    # Allow anyone to attempt logout
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.COOKIES.get("pos_refresh_token")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()  # Blacklist the refresh token
                except Exception:
                    # Ignore errors if token is already blacklisted or invalid
                    # Consider logging this scenario
                    pass

            response = Response(
                {"message": "Logged out successfully"}, status=status.HTTP_200_OK
            )
            # Ensure path matches where cookies were set
            response.delete_cookie("pos_access_token", path="/api/")
            response.delete_cookie("pos_refresh_token", path="/api/")
            return response

        except Exception as e:
            # Consider logging the exception e
            return Response(
                {"error": "An error occurred during logout."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# Register New User (Only Admins & Owners can add users)
class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [
        IsAdminUser
    ]  # IsAdminUser permission likely checks for 'admin' or 'owner' role

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if "password" in data and "confirm_password" not in data:
            data["confirm_password"] = data["password"]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        headers = self.get_success_headers(serializer.data)
        # Return the serialized user data upon successful creation
        return Response(
            {"message": "User created successfully", "user": serializer.data},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


# Get All Users (Only Admins & Owners can view users)
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by("username")  # Good practice to order
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class UserUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [
        IsAdminUser,
        CanEditUser,
    ]  # Ensure CanEditUser handles self-edit correctly

    def perform_update(self, serializer):
        instance = self.get_object()
        # Use validated_data which excludes read_only fields
        new_data = serializer.validated_data
        requesting_user = self.request.user

        # Prevent non-owners from making anyone an owner
        if (
            "role" in new_data
            and new_data["role"] == "owner"
            and requesting_user.role != "owner"
        ):
            raise PermissionDenied("Only owners can assign the owner role.")

        # Prevent admins from making anyone else an admin (only owners can)
        if (
            "role" in new_data
            and new_data["role"] == "admin"
            and instance.role != "admin"
            and requesting_user.role != "owner"
        ):
            raise PermissionDenied("Only owners can promote users to admin.")

        # Prevent non-owners from changing an owner's role
        if (
            instance.role == "owner"
            and "role" in new_data
            and new_data["role"] != "owner"
            and requesting_user.role != "owner"
        ):
            raise PermissionDenied("Only owners can change another owner's role.")

        # Prevent non-owners from changing an admin's role (unless it's the admin themselves)
        if (
            instance.role == "admin"
            and "role" in new_data
            and new_data["role"] != "admin"
            and requesting_user.role != "owner"
            and requesting_user.id != instance.id
        ):
            raise PermissionDenied("Only owners can demote admins.")

        # Handle password update separately if provided in validated_data
        # Note: Password field might need 'write_only=True' in serializer
        password = new_data.pop("password", None)
        confirm_password = new_data.pop(
            "confirm_password", None
        )  # Assuming this is also in serializer

        # Update other fields via serializer.save()
        # Pass the remaining validated_data to save
        instance = serializer.save()  # serializer already has instance context

        # Set new password if provided and validated (matching should happen in serializer)
        if password:
            # Re-fetch instance just in case? Or rely on serializer.save() returning updated instance
            instance.set_password(password)
            instance.save(update_fields=["password"])


class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [
        IsAdminUser,
        CanEditUser,
    ]  # Ensure CanEditUser prevents self-delete if needed

    def perform_destroy(self, instance):
        requesting_user = self.request.user

        # Prevent deleting oneself (optional, but often good practice)
        if instance.id == requesting_user.id:
            raise PermissionDenied("Users cannot delete their own accounts.")

        # Prevent non-owners from deleting owners
        if instance.role == "owner" and requesting_user.role != "owner":
            raise PermissionDenied("Only owners can delete other owners.")

        # Prevent non-owners from deleting admins
        if instance.role == "admin" and requesting_user.role != "owner":
            raise PermissionDenied("Only owners can delete admins.")

        instance.delete()


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]  # Requires a valid token

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# --- Website/Mobile Specific Views ---
# Ensure these also have appropriate permission_classes if needed
# from .views_website import *
# from .views_mobile import *
