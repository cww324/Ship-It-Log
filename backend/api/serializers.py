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
        fields = ["id", "user", "start_time", "end_time", "notes"]
        read_only_fields = ("user", "start_time")  # start_time is set automatically


# Frontend-friendly (for session detail)
class TournamentSlimSerializer(serializers.ModelSerializer):
    bounties_won = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "site",
            "buy_in",
            "prize_won",
            "bounties_won",  # NEW: PKO bounties
            "entries_used",
            "rebuys",
            "addons",
            "start_time",
            "end_time",
            "type",
            "game",
            "speed",
            "table_size",
            "target_name",
            "seat_value",
            "format_tags",  # tag IDs
        ]

    def get_bounties_won(self, obj):
        # Handle case where bounties_won field doesn't exist yet (before migration)
        return float(getattr(obj, "bounties_won", 0) or 0)


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
            float(t.prize_won or 0) + float(getattr(t, "bounties_won", 0) or 0)
            for t in Tournament.objects.filter(tournament_sessions__session=obj)
        )

    def get_net(self, obj):
        return self.get_total_prize(obj) - self.get_total_buyins(obj)


# Enhanced serializers for Excel-like accordion interface
class TournamentAccordionSerializer(serializers.ModelSerializer):
    """Optimized tournament serializer for accordion display"""
    site_name = serializers.CharField(source="site.name", read_only=True)
    site_type = serializers.CharField(source="site.type", read_only=True)
    total_won = serializers.SerializerMethodField()
    net_profit = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    format_tag_labels = serializers.SerializerMethodField()
    
    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "site",
            "site_name",
            "site_type",
            "buy_in",
            "prize_won",
            "bounties_won",
            "total_won",
            "net_profit",
            "entries_used",
            "rebuys",
            "addons",
            "start_time",
            "end_time",
            "status",
            "type",
            "game",
            "speed",
            "table_size",
            "target_name",
            "seat_value",
            "format_tags",
            "format_tag_labels",
            "notes",
        ]
    
    def get_total_won(self, obj):
        """Total winnings = prize + bounties"""
        prize = float(obj.prize_won or 0)
        bounties = float(getattr(obj, "bounties_won", 0) or 0)
        return prize + bounties
        
    def get_net_profit(self, obj):
        """Net profit for this tournament"""
        total_won = self.get_total_won(obj)
        total_invested = (
            float(obj.buy_in or 0) * max(1, obj.entries_used or 1) +
            float(obj.buy_in or 0) * (obj.rebuys or 0) +
            float(obj.buy_in or 0) * (obj.addons or 0)
        )
        return total_won - total_invested
        
    def get_status(self, obj):
        """Tournament status: Active, Won, Lost, etc."""
        if not obj.end_time:
            return "Active"
        
        if self.get_net_profit(obj) > 0:
            return "Won"
        elif self.get_total_won(obj) > 0:
            return "Cashed"
        else:
            return "Busted"
            
    def get_format_tag_labels(self, obj):
        """Get format tag labels for display"""
        return [tag.label for tag in obj.format_tags.all()]


class SessionAccordionSerializer(serializers.ModelSerializer):
    """Enhanced session serializer for Excel-like accordion display"""
    tournaments = TournamentAccordionSerializer(many=True, read_only=True)
    
    # Aggregated stats for session-level display
    tournament_count = serializers.SerializerMethodField()
    total_buyins = serializers.SerializerMethodField()
    avg_buyin = serializers.SerializerMethodField()
    total_winnings = serializers.SerializerMethodField()
    net_profit = serializers.SerializerMethodField()
    win_count = serializers.SerializerMethodField()
    loss_count = serializers.SerializerMethodField()
    active_count = serializers.SerializerMethodField()
    session_duration = serializers.SerializerMethodField()
    main_sites = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            "id",
            "user",
            "start_time",
            "end_time",
            "notes",
            "tournaments",
            "tournament_count",
            "total_buyins",
            "avg_buyin",
            "total_winnings",
            "net_profit",
            "win_count",
            "loss_count",
            "active_count",
            "session_duration",
            "main_sites",
        ]
        read_only_fields = ("user",)
    
    def get_tournaments_qs(self, obj):
        """Get optimized tournament queryset"""
        return Tournament.objects.filter(
            tournament_sessions__session=obj
        ).select_related("site").prefetch_related("format_tags")
    
    def get_tournament_count(self, obj):
        return self.get_tournaments_qs(obj).count()
        
    def get_total_buyins(self, obj):
        total = 0
        for t in self.get_tournaments_qs(obj):
            buy_in = float(t.buy_in or 0)
            total += buy_in * max(1, t.entries_used or 1)
            total += buy_in * (t.rebuys or 0)
            total += buy_in * (t.addons or 0)
        return total
        
    def get_avg_buyin(self, obj):
        tournaments = self.get_tournaments_qs(obj)
        count = tournaments.count()
        if count == 0:
            return 0
        return self.get_total_buyins(obj) / count
        
    def get_total_winnings(self, obj):
        total = 0
        for t in self.get_tournaments_qs(obj):
            total += float(t.prize_won or 0)
            total += float(getattr(t, "bounties_won", 0) or 0)
        return total
        
    def get_net_profit(self, obj):
        return self.get_total_winnings(obj) - self.get_total_buyins(obj)
        
    def get_win_count(self, obj):
        """Count tournaments with positive net profit"""
        count = 0
        for t in self.get_tournaments_qs(obj):
            total_won = float(t.prize_won or 0) + float(getattr(t, "bounties_won", 0) or 0)
            buy_in = float(t.buy_in or 0)
            total_invested = buy_in * max(1, t.entries_used or 1) + buy_in * (t.rebuys or 0)
            if total_won > total_invested:
                count += 1
        return count
        
    def get_loss_count(self, obj):
        """Count tournaments with zero winnings (busted)"""
        return self.get_tournaments_qs(obj).filter(
            prize_won=0, bounties_won=0
        ).count()
        
    def get_active_count(self, obj):
        """Count active (ongoing) tournaments"""
        return self.get_tournaments_qs(obj).filter(end_time__isnull=True).count()
        
    def get_session_duration(self, obj):
        """Session duration in minutes"""
        if not obj.end_time:
            return None
        
        from django.utils import timezone
        start = obj.start_time
        end = obj.end_time
        if start and end:
            duration = end - start
            return int(duration.total_seconds() / 60)
        return None
        
    def get_main_sites(self, obj):
        """Get list of main sites played in this session"""
        sites = self.get_tournaments_qs(obj).values_list(
            "site__name", flat=True
        ).distinct()
        return list(sites)[:3]  # Limit to top 3 sites
