from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTMiddleware(MiddlewareMixin):
    def process_request(self, request):
        """Extracts JWT token from cookies and sets it in the Authorization header"""
        # Print debugging information
        print(f"Path: {request.path}")
        print(f"POS access token: {request.COOKIES.get('pos_access_token')}")
        print(f"Website access token: {request.COOKIES.get('website_access_token')}")
        
        if "HTTP_AUTHORIZATION" not in request.META:
            # Website endpoints
            if request.path.startswith('/api/website/'):
                access_token = request.COOKIES.get('website_access_token')
                if access_token:
                    print(f"Setting website token for {request.path}")
                    request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
            # POS endpoints
            else:
                access_token = request.COOKIES.get('pos_access_token')
                if access_token:
                    print(f"Setting POS token for {request.path}")
                    request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"