from django.urls import path
from .views import LoginView, LogoutView, RegisterUserView, UserListView, CheckAuthView, CustomTokenRefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("check-auth/", CheckAuthView.as_view(), name="check_auth"),
    path("token/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterUserView.as_view(), name="register"),
    path("users/", UserListView.as_view(), name="users"),
]
