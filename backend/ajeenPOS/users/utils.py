# users/utils.py in POS backend
from rest_framework.response import Response
from .models import UserSession
import secrets
from datetime import timedelta
from django.utils import timezone
from .models import UserSession

def create_user_session(user, is_website=False, refresh_token_expiration_days=7):
    """Create a session for a user, identifying whether it's a website or POS session"""
    session_identifier = secrets.token_hex(16)
    
    UserSession.objects.create(
        user=user,
        session_identifier=session_identifier,
        refresh_token=None,
        expires_at=timezone.now() + timedelta(days=refresh_token_expiration_days),
        is_active=True,
        is_website_session=is_website
    )
    return session_identifier

def update_session_expiration(session_identifier):
    try:
        session = UserSession.objects.get(session_identifier=session_identifier)
        session.refresh_expiration()
    except UserSession.DoesNotExist:
        pass

def get_existing_user_session(user, is_website=False):
    try:
        session = UserSession.objects.filter(
            user=user, 
            is_active=True,
            is_website_session=is_website
        ).latest('created_at')
        
        if not session.is_expired():
            return session.session_identifier
    except UserSession.DoesNotExist:
        return None

def handle_expired_token(request):
    """Handle expired tokens and check session validity"""
    session_identifier = request.COOKIES.get('session_token')
    
    if not session_identifier:
        return None
        
    try:
        session = UserSession.objects.get(session_identifier=session_identifier)
        
        if session.is_expired():
            session.is_active = False  # Mark the session as inactive
            session.save()
            return Response({'error': 'Your session has expired. Please log in again.'}, status=401)
            
        # Session exists but no refresh token - unusual state
        return Response({'error': 'Invalid session. Please log in again.'}, status=401)
    except UserSession.DoesNotExist:
        return None