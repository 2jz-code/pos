# users/views_website.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.contrib.auth import authenticate
import uuid

from .serializers import WebsiteUserSerializer
from .utils import create_user_session, update_session_expiration, get_existing_user_session, handle_expired_token
from .permissions import IsWebsiteUser
from .models import CustomUser

class WebsiteTokenObtainPairView(APIView):
    """Custom login view for website users"""
    
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user and user.is_website_user:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Create or update session
            session_identifier = get_existing_user_session(user, is_website=True) or \
                                create_user_session(user, is_website=True)
            update_session_expiration(session_identifier)
            
            # Create response with cookies
            res = Response({'message': 'Login successful!'}, status=status.HTTP_200_OK)
            res.set_cookie(
                key='website_access_token',
                value=access_token,
                httponly=True,
                max_age=300,  # 5 minutes
                path='/api/',
                samesite='Lax',
                secure=False  # Set to True in production with HTTPS
            )
            res.set_cookie(
                key='website_refresh_token',
                value=refresh_token,
                httponly=True,
                max_age=60 * 60 * 24 * 7,  # 7 days
                path='/api/',
                samesite='Lax',
                secure=False  # Set to True in production with HTTPS
            )
            res.set_cookie(
                key='website_session_token',
                value=session_identifier,
                httponly=True,
                max_age=60 * 60 * 24 * 14,  # 14 days
                path='/api/',
                samesite='Lax',
                secure=False  # Set to True in production with HTTPS
            )
            return res
        
        return Response({'error': 'Invalid credentials or not a website user'}, 
                        status=status.HTTP_401_UNAUTHORIZED)

class WebsiteTokenRefreshView(APIView):
    """Refresh token view for website users"""
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('website_refresh_token')
        session_identifier = request.COOKIES.get('website_session_token')
        
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                
                # Verify this is a website user
                user_id = refresh.payload.get('user_id')
                user = CustomUser.objects.get(id=user_id)
                
                if not user.is_website_user:
                    return Response({'error': 'Not a website user'}, 
                                   status=status.HTTP_401_UNAUTHORIZED)
                
                access_token = str(refresh.access_token)
                
                # Update session expiration
                if session_identifier:
                    update_session_expiration(session_identifier)
                
                # Set the new access token in cookie
                res = Response({'message': 'Token refreshed!'}, status=status.HTTP_200_OK)
                res.set_cookie(
                    key='website_access_token',
                    value=access_token,
                    httponly=True,
                    max_age=300,  # 5 minutes
                    path='/api/',
                    samesite='Lax',
                    secure=False  # Set to True in production with HTTPS
                )
                return res
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            # Call handle_expired_token to check session validity only if the refresh token is missing
            session_response = handle_expired_token(request)
            if session_response:
                return session_response

            # If no refresh token or session identifier is present, treat the user as a guest
            guest_id = str(uuid.uuid4())  # Generate a unique guest ID
            res = Response({'message': 'Guest access allowed'}, status=status.HTTP_200_OK)
            res.set_cookie(
                key='guest_id',
                value=guest_id,
                httponly=True,
                max_age=60 * 60 * 24 * 7,  # Guest ID expires in 7 days
                path='/api/',
                samesite='Lax',
                secure=False  # Use True in production for HTTPS
            )
            return res

class WebsiteRegisterUserView(APIView):
    """Register a new website user"""
    
    def post(self, request):
        serializer = WebsiteUserSerializer(data=request.data)
        if serializer.is_valid():
            # Set role to customer and mark as website user
            user = serializer.save(
                role='customer',
                is_website_user=True,
                is_pos_user=False
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsWebsiteUser])  # Ensure user is authenticated and is a website user
def website_user_profile(request):
    user = request.user

    if request.method == 'GET':
        # Return the user profile information using the serializer
        serializer = WebsiteUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        # Update the user profile information
        serializer = WebsiteUserSerializer(user, data=request.data, partial=True)  # Allow partial updates
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data  # Return the updated user data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsWebsiteUser])
def check_website_authentication(request):
    """Check if the user is authenticated as a website user"""
    return Response({'isAuthenticated': True}, status=status.HTTP_200_OK)

@api_view(['GET'])
def has_website_refresh_token(request):
    """Check if the request contains a valid refresh token"""
    refresh_token = request.COOKIES.get('website_refresh_token')
    guest_id = request.COOKIES.get('guest_id')
    
    if refresh_token:
        try:
            # Attempt to create a RefreshToken instance to check if it's valid
            token = RefreshToken(refresh_token)
            
            # Verify this is a website user
            user_id = token.payload.get('user_id')
            user = CustomUser.objects.get(id=user_id)
            
            if not user.is_website_user:
                return Response({'hasRefreshToken': False, 'isGuest': bool(guest_id)}, status=400)
                
            return Response({'hasRefreshToken': True, 'isGuest': False}, status=200)
        except Exception:
            # If the token is invalid or expired, check if there's a guest ID
            if guest_id:
                return Response({'hasRefreshToken': False, 'isGuest': True}, status=200)
            return Response({'hasRefreshToken': False, 'isGuest': False}, status=400)
    else:
        # If no refresh token, check if there's a guest ID
        if guest_id:
            return Response({'hasRefreshToken': False, 'isGuest': True}, status=200)
        return Response({'hasRefreshToken': False, 'isGuest': False}, status=400)

@api_view(['POST'])
def website_logout_view(request):
    """Logout a website user by clearing cookies"""
    response = Response({'message': 'Logged out successfully!'}, status=status.HTTP_200_OK)

    # Delete the cookies
    response.delete_cookie('website_access_token', path='/api/')
    response.delete_cookie('website_refresh_token', path='/api/')
    response.delete_cookie('website_session_token', path='/api/')

    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsWebsiteUser])
def toggle_rewards_opt_in(request):
    """Toggle the user's rewards opt-in status"""
    user = request.user
    
    # Get the desired opt-in status from the request
    opt_in = request.data.get('opt_in')
    
    if opt_in is None:
        return Response(
            {'error': 'opt_in parameter is required (true/false)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update the user's opt-in status
    user.is_rewards_opted_in = opt_in
    user.save()
    
    # If opting in and no rewards profile exists, one will be created via the signal
    
    return Response({
        'message': f"Rewards opt-in status updated to {opt_in}",
        'is_rewards_opted_in': user.is_rewards_opted_in,
        'has_rewards_profile': hasattr(user, 'rewards_profile')
    })