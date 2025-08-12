from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from api.models import Tournament
from api.serializers import TournamentSerializer


class TournamentViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Tournament.objects.all().order_by("-id")
    serializer_class = TournamentSerializer
