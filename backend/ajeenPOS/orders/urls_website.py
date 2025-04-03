from django.urls import path
from .views_website import (
    WebsiteCartView,
    WebsiteCartItemView,
    WebsiteCheckoutView,
    WebsiteOrderListView,
    WebsiteOrderDetailView,
    GuestOrderDetailView,
    ReorderView,
)

urlpatterns = [
    # Cart endpoints
    path('cart/', WebsiteCartView.as_view(), name='website-cart'),
    path('cart/items/<int:item_id>/', WebsiteCartItemView.as_view(), name='website-cart-item'),
    path('cart/items/<int:item_id>/remove/', WebsiteCartItemView.as_view(), name='website-cart-item-remove'),
    
    # Checkout endpoint
    path('checkout/', WebsiteCheckoutView.as_view(), name='website-checkout'),
    
    # Order endpoints
    path('orders/', WebsiteOrderListView.as_view(), name='website-orders'),
    path('orders/<int:order_id>/', WebsiteOrderDetailView.as_view(), name='website-order-detail'),
    path('reorder/', ReorderView.as_view(), name='reorder'),

    
    # Guest order lookup
    path('guest-order/', GuestOrderDetailView.as_view(), name='website-guest-order'),
]