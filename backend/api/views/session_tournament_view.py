from rest_framework import viewsets, permissions
from api.models import SessionTournament
from api.serializers import SessionTournamentSerializer


class SessionTournamentViewSet(viewsets.ModelViewSet):
    queryset = SessionTournament.objects.all()
    serializer_class = SessionTournamentSerializer
    permission_classes = [permissions.IsAuthenticated]  # safer
