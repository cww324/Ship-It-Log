from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Site, FormatTag, Tournament, Session, SessionTournament
from .serializers import (
    SiteSerializer,
    FormatTagSerializer,
    TournamentSerializer,
    SessionSerializer,
    SessionTournamentSerializer,
)


class HealthView(APIView):
    def get(self, request):
        return Response({"ok": True})


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all().order_by("name")
    serializer_class = SiteSerializer
    permission_classes = [permissions.AllowAny]


class FormatTagViewSet(viewsets.ModelViewSet):
    queryset = FormatTag.objects.all().order_by("label")
    serializer_class = FormatTagSerializer
    permission_classes = [permissions.AllowAny]


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = (
        Tournament.objects.select_related("site").prefetch_related("format_tags").all()
    )
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # for now return all; later filter by request.user
        return Session.objects.all().select_related("user")

    def perform_create(self, serializer):
        # TEMP: until auth wired, use user id=1
        serializer.save(user_id=1)


class SessionTournamentViewSet(viewsets.ModelViewSet):
    queryset = SessionTournament.objects.all()
    serializer_class = SessionTournamentSerializer
    permission_classes = [permissions.AllowAny]
