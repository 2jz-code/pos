from django.urls import path
from .views import (
    OrderList, 
    OrderDetail, 
    ResumeOrder, 
    CompleteOrder, 
    StartOrder, 
    UpdateInProgressOrder, 
    GetInProgressOrder
)

urlpatterns = [
    path("orders/", OrderList.as_view(), name="orders"),  # ✅ List & Save Order
    path("orders/<int:pk>/", OrderDetail.as_view(), name="order-detail"),  # ✅ Get, Update, Delete Order
    path("orders/<int:pk>/resume/", ResumeOrder.as_view(), name="resume-order"),  # ✅ Resume a saved order
    path("orders/<int:pk>/complete/", CompleteOrder.as_view(), name="complete-order"),  # ✅ Complete an order

    # ✅ New Endpoints for Auto-Saving & Handling In-Progress Orders
    path("orders/start/", StartOrder.as_view(), name="start-order"),  # ✅ Start a new in-progress order
    path("orders/in_progress/update/", UpdateInProgressOrder.as_view(), name="update-in-progress-order"),  # ✅ Auto-save cart changes
    path("orders/in_progress/", GetInProgressOrder.as_view(), name="get-in-progress-order"),  # ✅ Fetch latest in-progress order
]
