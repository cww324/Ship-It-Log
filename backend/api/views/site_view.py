from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from api.models import Site
from api.serializers import SiteSerializer


class SiteViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Site.objects.all().order_by("name")
    serializer_class = SiteSerializer
