from django.urls import path
from .views import (
    LoginView, LogoutView, RegisterUserView, UserListView, CheckAuthView, 
    CustomTokenRefreshView, UserDetailView, UserUpdateView, UserDeleteView, CurrentUserView
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("check-auth/", CheckAuthView.as_view(), name="check_auth"),
    path("token/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterUserView.as_view(), name="register"),
    path("users/", UserListView.as_view(), name="users"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user_detail"),
    path("users/<int:pk>/update/", UserUpdateView.as_view(), name="user_update"),
    path("users/<int:pk>/delete/", UserDeleteView.as_view(), name="user_delete"),
    path("current-user/", CurrentUserView.as_view(), name="current_user"),

]
