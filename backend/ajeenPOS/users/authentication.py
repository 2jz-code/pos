from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class WebsiteCookieJWTAuthentication(JWTAuthentication):
    """JWT authentication using cookies for website users"""
    
    def authenticate(self, request):
        # Check if the access_token is present in the cookies
        access_token = request.COOKIES.get('website_access_token')
        if access_token:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            
            # Only allow website users to authenticate through this method
            if user and user.is_website_user:
                return user, validated_token
            
            # If POS user tries to access website endpoints
            if user and not user.is_website_user:
                raise AuthenticationFailed('POS users cannot access website resources')
                
        return None