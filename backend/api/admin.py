from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Site, FormatTag, Tournament, Session, SessionTournament


# Custom User Admin to show poker-related info
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "session_count",
        "total_profit",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "date_joined")

    def session_count(self, obj):
        return obj.sessions.count()

    session_count.short_description = "Sessions"

    def total_profit(self, obj):
        total = 0
        for session in obj.sessions.all():
            for st in session.session_tournaments.all():
                tournament = st.tournament
                profit = (
                    float(tournament.prize_won or 0)
                    + float(tournament.bounties_won or 0)
                ) - float(tournament.buy_in or 0)
                total += profit

        color = "green" if total >= 0 else "red"
        return format_html('<span style="color: {};">${:,.2f}</span>', color, total)

    total_profit.short_description = "Total Profit"


# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "tournament_count", "total_volume")
    list_filter = ("type",)
    search_fields = ("name", "notes")
    ordering = ("name",)

    def tournament_count(self, obj):
        return obj.tournaments.count()

    tournament_count.short_description = "Tournaments"

    def total_volume(self, obj):
        total = sum(float(t.buy_in or 0) for t in obj.tournaments.all())
        return f"${total:,.2f}"

    total_volume.short_description = "Total Volume"


@admin.register(FormatTag)
class FormatTagAdmin(admin.ModelAdmin):
    list_display = ("label", "tournament_count", "usage_percentage")
    search_fields = ("label",)
    ordering = ("label",)

    def tournament_count(self, obj):
        return obj.tournaments.count()

    tournament_count.short_description = "Used in Tournaments"

    def usage_percentage(self, obj):
        total_tournaments = Tournament.objects.count()
        if total_tournaments == 0:
            return "0%"
        usage = (obj.tournaments.count() / total_tournaments) * 100
        return f"{usage:.1f}%"

    usage_percentage.short_description = "Usage %"


class SessionTournamentInline(admin.TabularInline):
    model = SessionTournament
    extra = 0
    readonly_fields = ("tournament_link", "profit_display")
    fields = ("tournament_link", "profit_display")

    def tournament_link(self, obj):
        if obj.tournament:
            url = reverse("admin:api_tournament_change", args=[obj.tournament.pk])
            return format_html('<a href="{}">{}</a>', url, obj.tournament.name)
        return "-"

    tournament_link.short_description = "Tournament"

    def profit_display(self, obj):
        if obj.tournament:
            profit = (
                float(obj.tournament.prize_won or 0)
                + float(obj.tournament.bounties_won or 0)
            ) - float(obj.tournament.buy_in or 0)
            color = "green" if profit >= 0 else "red"
            return format_html(
                '<span style="color: {};">${:,.2f}</span>', color, profit
            )
        return "-"

    profit_display.short_description = "Profit"


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "start_time",
        "duration",
        "tournament_count",
        "total_buyins",
        "total_prizes",
        "net_profit",
    )
    list_filter = ("start_time", "user")
    search_fields = ("user__username", "notes")
    date_hierarchy = "start_time"
    ordering = ("-start_time",)
    inlines = [SessionTournamentInline]
    readonly_fields = ("profit_summary",)

    fieldsets = (
        (None, {"fields": ("user", "start_time", "end_time", "notes")}),
        ("Summary", {"fields": ("profit_summary",), "classes": ("collapse",)}),
    )

    def duration(self, obj):
        if obj.end_time and obj.start_time:
            delta = obj.end_time - obj.start_time
            hours = delta.total_seconds() / 3600
            return f"{hours:.1f}h"
        return "Ongoing"

    duration.short_description = "Duration"

    def tournament_count(self, obj):
        return obj.session_tournaments.count()

    tournament_count.short_description = "Tournaments"

    def total_buyins(self, obj):
        total = sum(
            float(st.tournament.buy_in or 0) for st in obj.session_tournaments.all()
        )
        return f"${total:,.2f}"

    total_buyins.short_description = "Total Buy-ins"

    def total_prizes(self, obj):
        total = sum(
            float(st.tournament.prize_won or 0) + float(st.tournament.bounties_won or 0)
            for st in obj.session_tournaments.all()
        )
        return f"${total:,.2f}"

    total_prizes.short_description = "Total Prizes"

    def net_profit(self, obj):
        buyins = sum(
            float(st.tournament.buy_in or 0) for st in obj.session_tournaments.all()
        )
        prizes = sum(
            float(st.tournament.prize_won or 0) + float(st.tournament.bounties_won or 0)
            for st in obj.session_tournaments.all()
        )
        profit = prizes - buyins
        color = "green" if profit >= 0 else "red"
        return format_html(
            '<span style="color: {}; font-weight: bold;">${:,.2f}</span>', color, profit
        )

    net_profit.short_description = "Net Profit"

    def profit_summary(self, obj):
        tournaments = obj.session_tournaments.all()
        if not tournaments:
            return "No tournaments in this session"

        html = '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background: #f0f0f0;"><th>Tournament</th><th>Buy-in</th><th>Prize</th><th>Bounties</th><th>Profit</th></tr>'

        total_profit = 0
        for st in tournaments:
            t = st.tournament
            buyin = float(t.buy_in or 0)
            prize = float(t.prize_won or 0)
            bounties = float(t.bounties_won or 0)
            profit = prize + bounties - buyin
            total_profit += profit

            color = "green" if profit >= 0 else "red"
            html += f"""
            <tr>
                <td>{t.name}</td>
                <td>${buyin:,.2f}</td>
                <td>${prize:,.2f}</td>
                <td>${bounties:,.2f}</td>
                <td style="color: {color}; font-weight: bold;">${profit:,.2f}</td>
            </tr>
            """

        total_color = "green" if total_profit >= 0 else "red"
        html += f"""
        <tr style="background: #f0f0f0; font-weight: bold;">
            <td>TOTAL</td>
            <td colspan="3"></td>
            <td style="color: {total_color};">${total_profit:,.2f}</td>
        </tr>
        </table>
        """

        return mark_safe(html)

    profit_summary.short_description = "Session Breakdown"


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "site",
        "buy_in",
        "prize_won",
        "bounties_won",
        "profit_display",
        "start_time",
        "status",
        "user_link",
    )
    list_filter = (
        "site",
        "type",
        "game",
        "speed",
        "table_size",
        "start_time",
        "end_time",
    )
    search_fields = ("name", "notes", "tournament_sessions__session__user__username")
    date_hierarchy = "start_time"
    ordering = ("-start_time",)
    filter_horizontal = ("format_tags",)

    fieldsets = (
        (
            "Basic Info",
            {"fields": ("name", "site", "buy_in", "start_time", "end_time")},
        ),
        (
            "Tournament Details",
            {"fields": ("type", "game", "speed", "table_size", "format_tags")},
        ),
        (
            "Results",
            {
                "fields": (
                    "prize_won",
                    "bounties_won",
                    "entries_used",
                    "rebuys",
                    "addons",
                )
            },
        ),
        (
            "Satellite Info",
            {"fields": ("target_name", "seat_value"), "classes": ("collapse",)},
        ),
        ("Notes", {"fields": ("notes",), "classes": ("collapse",)}),
    )

    def profit_display(self, obj):
        profit = (float(obj.prize_won or 0) + float(obj.bounties_won or 0)) - float(
            obj.buy_in or 0
        )
        color = "green" if profit >= 0 else "red"
        return format_html(
            '<span style="color: {}; font-weight: bold;">${:,.2f}</span>', color, profit
        )

    profit_display.short_description = "Profit"
    profit_display.admin_order_field = "prize_won"

    def status(self, obj):
        if obj.end_time:
            if float(obj.prize_won or 0) > 0:
                return format_html('<span style="color: green;">✓ Cashed</span>')
            else:
                return format_html('<span style="color: red;">✗ Busted</span>')
        else:
            return format_html('<span style="color: orange;">⏳ Active</span>')

    status.short_description = "Status"

    def user_link(self, obj):
        session_tournament = obj.tournament_sessions.first()
        if session_tournament and session_tournament.session.user:
            user = session_tournament.session.user
            url = reverse("admin:auth_user_change", args=[user.pk])
            return format_html('<a href="{}">{}</a>', url, user.username)
        return "-"

    user_link.short_description = "Player"


@admin.register(SessionTournament)
class SessionTournamentAdmin(admin.ModelAdmin):
    list_display = ("session_link", "tournament_link", "user_link", "profit_display")
    list_filter = ("session__start_time", "tournament__site")
    search_fields = ("session__user__username", "tournament__name")

    def session_link(self, obj):
        url = reverse("admin:api_session_change", args=[obj.session.pk])
        return format_html('<a href="{}">Session #{}</a>', url, obj.session.pk)

    session_link.short_description = "Session"

    def tournament_link(self, obj):
        url = reverse("admin:api_tournament_change", args=[obj.tournament.pk])
        return format_html('<a href="{}">{}</a>', url, obj.tournament.name)

    tournament_link.short_description = "Tournament"

    def user_link(self, obj):
        user = obj.session.user
        url = reverse("admin:auth_user_change", args=[user.pk])
        return format_html('<a href="{}">{}</a>', url, user.username)

    user_link.short_description = "Player"

    def profit_display(self, obj):
        profit = (
            float(obj.tournament.prize_won or 0)
            + float(obj.tournament.bounties_won or 0)
        ) - float(obj.tournament.buy_in or 0)
        color = "green" if profit >= 0 else "red"
        return format_html(
            '<span style="color: {}; font-weight: bold;">${:,.2f}</span>', color, profit
        )

    profit_display.short_description = "Profit"


# Customize admin site headers
admin.site.site_header = "ShipIt Log Admin"
admin.site.site_title = "ShipIt Log Admin Portal"
admin.site.index_title = "Welcome to ShipIt Log Administration"
