from django.db import models
from django.contrib.auth.models import User


class Site(models.Model):
    ONLINE = "online"
    LIVE = "live"
    TYPE_CHOICES = [(ONLINE, "Online"), (LIVE, "Live")]

    name = models.CharField(max_length=120)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=ONLINE)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name


class FormatTag(models.Model):
    label = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.label


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="tournaments")
    buy_in = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    prize_won = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    entries_used = models.IntegerField(default=1)  # 1 = no re-entry, 2+ = re-entries
    rebuys = models.IntegerField(default=0)
    addons = models.IntegerField(default=0)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    format_tags = models.ManyToManyField(
        FormatTag, related_name="tournaments", blank=True
    )

    def __str__(self):
        return f"{self.name} @ {self.site.name}"


class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Session #{self.id} by {self.user.username}"


class SessionTournament(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="session_tournaments"
    )
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="tournament_sessions"
    )

    class Meta:
        unique_together = ("session", "tournament")
