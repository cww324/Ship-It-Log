# backend/shipitlog/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token),  # login to get a token
    path("api/", include("api.urls")),  # all app routes
]
