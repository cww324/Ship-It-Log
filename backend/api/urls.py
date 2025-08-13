from rest_framework.routers import DefaultRouter
from api.views.health_view import HealthView
from api.views.site_view import SiteViewSet
from api.views.format_tag_view import FormatTagViewSet
from api.views.tournament_view import TournamentViewSet
from api.views.session_view import SessionViewSet
from api.views.session_tournament_view import SessionTournamentViewSet
from django.urls import path

router = DefaultRouter()
router.register(r"sites", SiteViewSet, basename="site")
router.register(r"format-tags", FormatTagViewSet, basename="format-tag")
router.register(r"tournaments", TournamentViewSet, basename="tournament")
router.register(r"sessions", SessionViewSet, basename="session")
router.register(
    r"session-tournaments", SessionTournamentViewSet, basename="session-tournament"
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
]
urlpatterns += router.urls
