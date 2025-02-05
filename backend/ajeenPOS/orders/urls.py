from django.urls import path
from .views import OrderList, OrderDetail, ResumeOrder, CompleteOrder

urlpatterns = [
    path("orders/", OrderList.as_view(), name="orders"),
    path("orders/<int:pk>/", OrderDetail.as_view(), name="order-detail"),
    path("orders/<int:pk>/resume/", ResumeOrder.as_view(), name="resume-order"),  # ✅ Resume a saved order
    path("orders/<int:pk>/complete/", CompleteOrder.as_view(), name="complete-order"),  # ✅ Complete order
]
