from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthView

router = DefaultRouter()

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('', include(router.urls)),
]
