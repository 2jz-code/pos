from django.urls import path
from .views import LoginView, LogoutView, RegisterUserView, UserListView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("register/", RegisterUserView.as_view(), name="register"),
    path("users/", UserListView.as_view(), name="users"),
]
