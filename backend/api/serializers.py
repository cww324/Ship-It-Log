from rest_framework import serializers
from .models import Site, FormatTag, Tournament, Session, SessionTournament


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = "__all__"


class FormatTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormatTag
        fields = "__all__"


class TournamentSerializer(serializers.ModelSerializer):
    format_tags = serializers.PrimaryKeyRelatedField(
        many=True, queryset=FormatTag.objects.all(), required=False
    )

    class Meta:
        model = Tournament
        fields = "__all__"


class SessionTournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionTournament
        fields = "__all__"


class SessionSerializer(serializers.ModelSerializer):
    # You can POST tournaments via IDs later, for now keep it simple.
    class Meta:
        model = Session
        fields = "__all__"
        read_only_fields = ("user",)
