# backend/shipitlog/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from api.views.auth_view import register, user_profile

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token),  # login to get a token
    path("api/auth/register/", register),  # register new account
    path("api/auth/profile/", user_profile),  # get user profile
    path("api/", include("api.urls")),  # all app routes
]
