# users/views_mobile.py

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication # Standard Bearer token auth
from rest_framework.exceptions import AuthenticationFailed
from .models import CustomUser
from .serializers import WebsiteUserSerializer # Reuse website serializer for mobile users
from .permissions import IsWebsiteUser # Reuse permission, assumes mobile users are website users

# --- Token Views ---

class MobileTokenObtainPairView(TokenObtainPairView):
    """
    Login view for mobile app users.
    Takes username and password, returns access and refresh tokens in response body.
    """
    # Uses the default TokenObtainPairSerializer which handles token generation

    def post(self, request, *args, **kwargs):
        # Use the parent class's logic to validate credentials and generate tokens
        try:
            response = super().post(request, *args, **kwargs)

            # Optional: Add check after successful login if only website users can use mobile
            # Decode the access token to get the user ID without hitting the DB again yet
            # Note: This part might be better handled by permissions on protected views
            # from rest_framework_simplejwt.tokens import AccessToken
            # try:
            #     token_data = AccessToken(response.data.get('access'))
            #     user_id = token_data['user_id']
            #     user = CustomUser.objects.get(id=user_id)
            #     if not user.is_website_user:
            #         return Response({"error": "User is not authorized for mobile access."},
            #                         status=status.HTTP_403_FORBIDDEN)
            # except (CustomUser.DoesNotExist, TokenError, KeyError):
            #      return Response({"error": "Failed to verify user type."},
            #                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return response

        except AuthenticationFailed as e: # Catch potential auth failures if overriding post
             return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
             # Catch other potential errors during login process
             return Response({"error": "An unexpected error occurred during login."}, status=status.HTTP_400_BAD_REQUEST)


class MobileTokenRefreshView(TokenRefreshView):
    """
    Refresh token view for mobile app users.
    Takes refresh token in body, returns new access token in body.
    """
    # Uses the default TokenRefreshSerializer
    pass # Inherits all necessary logic


# --- Registration View ---

class MobileRegisterUserView(generics.CreateAPIView):
    """
    Register a new user via the mobile app.
    """
    queryset = CustomUser.objects.all()
    serializer_class = WebsiteUserSerializer # Use the same serializer as website registration

    def perform_create(self, serializer):
        # Automatically set the user role and type for mobile/website registration
        serializer.save(
            role='customer',    # Default role for self-registered users
            is_website_user=True, # Mobile users are considered website users
            is_pos_user=False   # Not POS users
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            # Return only success message, user needs to log in separately
            return Response(
                {"message": "Registration successful. Please log in."},
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
             # Catch potential validation errors or other issues
             return Response(serializer.errors if hasattr(serializer, 'errors') else {'error': str(e)},
                             status=status.HTTP_400_BAD_REQUEST)


# --- Profile View ---

@api_view(['GET', 'PUT'])
# Use standard JWTAuthentication to read Bearer token from header
@authentication_classes([JWTAuthentication])
# Ensure user is logged in and is a website user (adjust permission if needed)
@permission_classes([IsAuthenticated, IsWebsiteUser])
def mobile_user_profile(request):
    """
    Get or Update the profile for the authenticated mobile user.
    """
    user = request.user

    if request.method == 'GET':
        serializer = WebsiteUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        # Use partial=True to allow updating only specific fields
        serializer = WebsiteUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- Optional: Logout View (Server-side token invalidation - SimpleJWT handles blacklist) ---
# Simple JWT's `BLACKLIST_AFTER_ROTATION = True` and the client discarding tokens
# is often sufficient. Explicit blacklist endpoint might be needed if not rotating
# or for immediate invalidation.

# from rest_framework_simplejwt.tokens import RefreshToken
#
# @api_view(['POST'])
# @authentication_classes([JWTAuthentication])
# @permission_classes([IsAuthenticated])
# def mobile_logout_view(request):
#     """
#     Logout view to blacklist the refresh token.
#     Client should discard tokens regardless.
#     """
#     try:
#         refresh_token = request.data.get("refresh")
#         if not refresh_token:
#             return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
#
#         token = RefreshToken(refresh_token)
#         token.blacklist()
#         return Response({"message": "Logout successful. Token blacklisted."}, status=status.HTTP_200_OK)
#     except TokenError as e:
#         return Response({"error": f"Invalid token: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
#     except Exception as e:
#         return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)