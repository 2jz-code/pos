from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTMiddleware(MiddlewareMixin):
    def process_request(self, request):
        """Extracts JWT token from cookies and sets it in the Authorization header"""
        if "HTTP_AUTHORIZATION" not in request.META and "access_token" in request.COOKIES:
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {request.COOKIES['access_token']}"
