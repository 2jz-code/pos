"""
URL configuration for ajeenPOS project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path('api/', include('users.urls_website')),
    path("api/", include("products.urls")),
    path('api/website/', include('products.urls_website')),
    path("api/", include("orders.urls")),
    path('api/website/', include('orders.urls_website')),
    path("api/reports/", include("reports.urls")),
    path('api/hardware/', include('hardware.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/settings/', include('settings.urls')),
    path('api/rewards/', include('rewards.urls')),
    path('api/discounts/', include('discounts.urls')),
    path('api/website/rewards/', include('rewards.urls')),
    path('api/', include('users.urls_mobile')),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
