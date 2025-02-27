from django.urls import path
from .views_website import (
    WebsiteTokenObtainPairView, 
    WebsiteTokenRefreshView, 
    WebsiteRegisterUserView,
    website_user_profile,
    check_website_authentication,
    has_website_refresh_token,
    website_logout_view
)

urlpatterns = [
    path('website/token/', WebsiteTokenObtainPairView.as_view(), name='website_token_obtain_pair'),
    path('website/token/refresh/', WebsiteTokenRefreshView.as_view(), name='website_token_refresh'),
    path('website/register/', WebsiteRegisterUserView.as_view(), name='website_register'),
    path('website/profile/', website_user_profile, name='website_profile'),
    path('website/auth/', check_website_authentication, name='check-auth'),
    path('website/refresh-check/', has_website_refresh_token, name='refresh-token-check'),
    path('website/logout/', website_logout_view, name='logout')
]