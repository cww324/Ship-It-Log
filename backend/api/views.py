from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Site, FormatTag, Tournament, Session, SessionTournament
from .serializers import (
    SiteSerializer,
    FormatTagSerializer,
    TournamentSerializer,
    SessionSerializer,
    SessionTournamentSerializer,
    SessionDetailSerializer,
)
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"ok": True})


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all().order_by("name")
    serializer_class = SiteSerializer
    permission_classes = [permissions.AllowAny]


class FormatTagViewSet(viewsets.ReadOnlyModelViewSet):  # read-only presets
    queryset = FormatTag.objects.all().order_by("label")
    serializer_class = FormatTagSerializer
    permission_classes = [permissions.AllowAny]


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = (
        Tournament.objects.select_related("site").prefetch_related("format_tags").all()
    )
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]  # keep open for now


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅ require login

    def get_queryset(self):
        # Only the logged-in user's sessions
        return Session.objects.filter(user=self.request.user).select_related("user")

    def get_serializer_class(self):
        # Detail returns totals + tournaments
        if self.action in ["retrieve"]:
            return SessionDetailSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        # Save as the current user
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def attach_tournaments(self, request, pk=None):
        """Attach existing tournaments by ID to this session."""
        session = self.get_object()  # already scoped to request.user via get_queryset
        ids = request.data.get("tournament_ids", [])
        created = 0
        for tid in ids:
            SessionTournament.objects.get_or_create(session=session, tournament_id=tid)
            created += 1
        return Response({"attached": created})

    @action(detail=True, methods=["post"])
    def create_and_attach(self, request, pk=None):
        """Create tournaments and attach them to this session."""
        session = self.get_object()
        payload = request.data.get("tournaments", [])
        out = []
        for t in payload:
            ser = TournamentSerializer(data=t)
            ser.is_valid(raise_exception=True)
            tour = ser.save()
            SessionTournament.objects.get_or_create(session=session, tournament=tour)
            out.append(ser.data)
        # return the updated session detail
        detail = SessionDetailSerializer(session, context={"request": request})
        return Response(detail.data)


class SessionTournamentViewSet(viewsets.ModelViewSet):
    queryset = SessionTournament.objects.all()
    serializer_class = SessionTournamentSerializer
    permission_classes = [permissions.IsAuthenticated]  # safer
