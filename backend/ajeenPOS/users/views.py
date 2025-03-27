from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework import status, generics
from django.contrib.auth import get_user_model, authenticate
from .serializers import UserSerializer
from .permissions import IsAdminUser  # Import custom permission

User = get_user_model()

# ✅ Login View (Stores Tokens in HttpOnly Cookies)
class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Set cookies for authentication
            response = Response({"message": "Login successful"}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="pos_access_token",
                value=str(access_token),
                httponly=True,
                max_age=5,  # 5 minutes
                path="/api/",
                samesite="Lax",
                secure=False  # Set to True in production (HTTPS)
            )
            response.set_cookie(
                key="pos_refresh_token",
                value=str(refresh),
                httponly=True,
                max_age=60 * 60 * 24 * 7,  # 7 days
                path="/api/",
                samesite="Lax",
                secure=False  # Set to True in production
            )
            return response

        return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)


# ✅ Token Refresh View (Uses Refresh Token from Cookies)
class CustomTokenRefreshView(APIView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("pos_refresh_token")

        if not refresh_token:
            return Response({"error": "Refresh token missing"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            access_token = refresh.access_token

            response = Response({"message": "Token refreshed"}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="pos_access_token",
                value=str(access_token),
                httponly=True,
                max_age=5 * 60,  # 5 minutes
                path="/api/",
                samesite="Lax",
                secure=False  # Set to True in production
            )
            return response

        except Exception:
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)


class CheckAuthView(APIView):
    def get(self, request):
        access_token = request.COOKIES.get("pos_access_token")

        if not access_token:
            return Response({"authenticated": False, "is_admin": False}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = AccessToken(access_token)
            user = User.objects.get(id=token["user_id"])
            return Response({
                "authenticated": True,
                "username": user.username,
                "is_admin": user.role == 'admin'  # Check role field directly
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({"authenticated": False, "is_admin": False}, status=status.HTTP_401_UNAUTHORIZED)



# ✅ Logout View (Clears Cookies & Blacklists Refresh Token)
class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get("pos_refresh_token")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()  # Blacklist the refresh token
                except Exception:
                    pass  # Ignore errors if token is already blacklisted or invalid

            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            response.delete_cookie("pos_access_token", path='/api/')
            response.delete_cookie("pos_refresh_token", path='/api/')
            return response

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Register New User (Only Admins & Managers can add users)
class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        # Get the request data
        data = request.data.copy()
        
        # If confirm_password is missing but password exists, add it
        if 'password' in data and 'confirm_password' not in data:
            data['confirm_password'] = data['password']
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Return appropriate response
        return Response(
            {"message": "User created successfully", "id": user.id, "username": user.username},
            status=status.HTTP_201_CREATED
        )

# Get All Users (Only Admins can view users)
class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class UserUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]