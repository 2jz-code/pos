# orders/urls_website.py

from django.urls import path
# Import standard website views
from .views_website import (
    WebsiteCartView,
    WebsiteCartItemView,
    WebsiteCheckoutView,
    WebsiteOrderListView,
    WebsiteOrderDetailView,
    ReorderView,
)
# Import the new guest views
from .views_guest import GuestCartView, GuestOrderDetailView, GuestCheckoutView # <--- Import GuestCheckoutView

urlpatterns = [
    # --- Cart endpoints ---
    path('cart/', WebsiteCartView.as_view(), name='website-cart'), # GET (auth user), POST (auth/guest add)
    path('cart/items/<int:item_id>/', WebsiteCartItemView.as_view(), name='website-cart-item'), # PUT (auth/guest update)
    path('cart/items/<int:item_id>/remove/', WebsiteCartItemView.as_view(), name='website-cart-item-remove'), # DELETE (auth/guest remove)

    # --- New Guest Cart endpoint (GET) ---
    path('guest-cart/', GuestCartView.as_view(), name='website-guest-cart'), # <--- ADDED

    # --- Checkout endpoint ---
    path('checkout/', WebsiteCheckoutView.as_view(), name='website-checkout'), # POST (auth/guest)
    path('guest-checkout/', GuestCheckoutView.as_view(), name='website-guest-checkout'), # POST (Guest Users) <--- ADDED

    # --- Authenticated Order endpoints ---
    path('orders/', WebsiteOrderListView.as_view(), name='website-orders'), # GET (auth user)
    path('orders/<int:order_id>/', WebsiteOrderDetailView.as_view(), name='website-order-detail'), # GET (auth user)
    path('reorder/', ReorderView.as_view(), name='reorder'), # POST (auth user)

    # --- Guest Order Lookup endpoint ---
    # Ensure this uses the view imported from views_guest
    path('guest-order/', GuestOrderDetailView.as_view(), name='website-guest-order-lookup'), # POST (guest lookup)
]