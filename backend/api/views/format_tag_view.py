from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from api.models import FormatTag
from api.serializers import FormatTagSerializer


class FormatTagViewSet(ModelViewSet):
    queryset = FormatTag.objects.all().order_by("label")
    serializer_class = FormatTagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
