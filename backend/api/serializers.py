# api/serializers.py
from rest_framework import serializers
from .models import Site, FormatTag, Tournament, Session, SessionTournament


# Base CRUD serializers
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
        fields = "__all__"  # includes type/game/speed/table_size/target_name/seat_value


class SessionTournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionTournament
        fields = "__all__"


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = "__all__"
        read_only_fields = ("user",)


# Frontend-friendly (for session detail)
class TournamentSlimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "site",
            "buy_in",
            "prize_won",
            "entries_used",
            "rebuys",
            "addons",
            "start_time",
            "end_time",
            "type",
            "game",
            "speed",
            "table_size",  # NEW
            "target_name",
            "seat_value",  # NEW (optional)
            "format_tags",  # tag IDs
        ]


class SessionDetailSerializer(serializers.ModelSerializer):
    tournaments = serializers.SerializerMethodField()
    total_buyins = serializers.SerializerMethodField()
    total_prize = serializers.SerializerMethodField()
    net = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id",
            "user",
            "start_time",
            "end_time",
            "notes",
            "tournaments",
            "total_buyins",
            "total_prize",
            "net",
        ]
        read_only_fields = ("user",)

    def get_tournaments(self, obj):
        qs = (
            Tournament.objects.filter(tournament_sessions__session=obj)
            .select_related("site")
            .prefetch_related("format_tags")
        )
        return TournamentSlimSerializer(qs, many=True).data

    def _total_in_for_t(self, t):
        b = float(t.buy_in or 0)
        return (
            b * max(1, t.entries_used or 1) + b * (t.rebuys or 0) + b * (t.addons or 0)
        )

    def get_total_buyins(self, obj):
        return sum(
            self._total_in_for_t(t)
            for t in Tournament.objects.filter(tournament_sessions__session=obj)
        )

    def get_total_prize(self, obj):
        return sum(
            float(t.prize_won or 0)
            for t in Tournament.objects.filter(tournament_sessions__session=obj)
        )

    def get_net(self, obj):
        return self.get_total_prize(obj) - self.get_total_buyins(obj)
