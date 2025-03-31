# rewards/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Admin routes using viewsets
router = DefaultRouter()
router.register(r'admin/rules', views.AdminPointsRuleViewSet)
router.register(r'admin/rewards', views.AdminRewardViewSet)
router.register(r'admin/profiles', views.AdminRewardsProfileViewSet, basename='admin-profiles')

urlpatterns = [
    # Customer-facing endpoints
    path('profile/', views.RewardsProfileView.as_view(), name='rewards-profile'),
    path('transactions/', views.PointTransactionListView.as_view(), name='point-transactions'),
    path('rewards/', views.RewardListView.as_view(), name='rewards-list'),
    path('redeem/', views.RewardRedemptionView.as_view(), name='redeem-reward'),
    path('redemptions/', views.RewardRedemptionListView.as_view(), name='redemption-list'),
    
    # POS system endpoints
    path('verify-code/', views.VerifyRedemptionCodeView.as_view(), name='verify-redemption-code'),
    path('profiles/by-phone/<str:phone>/', views.AdminRewardsProfileViewSet.as_view({'get': 'by_phone'}), name='profile-by-phone'),
    path('profiles/register/', views.AdminRewardsProfileViewSet.as_view({'post': 'register'}), name='register-profile'),
    
    # Admin endpoints (viewsets)
    path('', include(router.urls)),
]