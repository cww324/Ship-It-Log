# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteViewSet,
    FormatTagViewSet,
    TournamentViewSet,
    SessionViewSet,
    SessionTournamentViewSet,
    HealthView,  # optional; nice for a quick ping
)

router = DefaultRouter()
router.register(r"sites", SiteViewSet, basename="site")
router.register(r"format-tags", FormatTagViewSet, basename="format-tag")
router.register(r"tournaments", TournamentViewSet, basename="tournament")
router.register(r"sessions", SessionViewSet, basename="session")
router.register(
    r"session-tournaments", SessionTournamentViewSet, basename="session-tournament"
)

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthView.as_view(), name="health"),  # optional
]
