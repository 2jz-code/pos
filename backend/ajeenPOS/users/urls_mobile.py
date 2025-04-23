# users/urls_mobile.py

from django.urls import path
from .views_mobile import (
    MobileTokenObtainPairView,
    MobileTokenRefreshView,
    MobileRegisterUserView,
    mobile_user_profile,
    # mobile_logout_view # Uncomment if using the explicit logout view
)

urlpatterns = [
    # Example: /api/mobile/token/
    path('mobile/token/', MobileTokenObtainPairView.as_view(), name='mobile_token_obtain_pair'),
    # Example: /api/mobile/token/refresh/
    path('mobile/token/refresh/', MobileTokenRefreshView.as_view(), name='mobile_token_refresh'),
    # Example: /api/mobile/register/
    path('mobile/register/', MobileRegisterUserView.as_view(), name='mobile_register'),
    # Example: /api/mobile/profile/
    path('mobile/profile/', mobile_user_profile, name='mobile_profile'),
    # Example: /api/mobile/logout/ (Optional)
    # path('mobile/logout/', mobile_logout_view, name='mobile_logout'),
]