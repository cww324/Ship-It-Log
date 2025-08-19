from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from api.views.health_view import HealthView
from api.views.site_view import SiteViewSet
from api.views.format_tag_view import FormatTagViewSet
from api.views.tournament_view import TournamentViewSet
from api.views.session_view import SessionViewSet
from api.views.session_tournament_view import SessionTournamentViewSet
from api.views import auth_view
from api.views import analytics_view
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
    # Authentication endpoints
    path("auth/token/", obtain_auth_token, name="api_token_auth"),
    path("auth/register/", auth_view.register, name="register"),
    path("auth/profile/", auth_view.user_profile, name="profile"),
    # Analytics endpoints
    path("analytics/profit-over-time/", analytics_view.profit_over_time, name="analytics_profit_over_time"),
    path("analytics/monthly-performance/", analytics_view.monthly_performance, name="analytics_monthly_performance"),
    path("analytics/win-loss-distribution/", analytics_view.win_loss_distribution, name="analytics_win_loss_distribution"),
    path("analytics/game-type-analysis/", analytics_view.game_type_analysis, name="analytics_game_type_analysis"),
    path("analytics/session-length-vs-profit/", analytics_view.session_length_vs_profit, name="analytics_session_length_vs_profit"),
    path("analytics/summary/", analytics_view.analytics_summary, name="analytics_summary"),
]
urlpatterns += router.urls
