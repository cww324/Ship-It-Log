from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from api.models import Tournament
from api.serializers import TournamentSerializer


class TournamentViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TournamentSerializer

    def get_queryset(self):
        # Only tournaments from user's sessions (security fix)
        return (
            Tournament.objects.filter(
                tournament_sessions__session__user=self.request.user
            )
            .distinct()
            .order_by("-id")
        )

    @action(detail=True, methods=["post"])
    def rebuy(self, request, pk=None):
        """Add a rebuy (increments rebuy count, updates total cost)"""
        tournament = self.get_object()

        # Validate tournament is still active
        if tournament.end_time:
            return Response(
                {"error": "Cannot rebuy in finished tournament"}, status=400
            )

        tournament.rebuys += 1
        tournament.save()
        return Response(
            {
                "rebuys": tournament.rebuys,
                "message": "Rebuy added",
                "tournament_id": tournament.id,
            }
        )

    @action(detail=True, methods=["post"])
    def add_bounty(self, request, pk=None):
        """Add a bounty won (for PKO tournaments)"""
        tournament = self.get_object()

        # Validate tournament is still active
        if tournament.end_time:
            return Response(
                {"error": "Cannot add bounty to finished tournament"}, status=400
            )

        bounty_amount = request.data.get("bounty_amount", 0)
        try:
            bounty_amount = float(bounty_amount)
            if bounty_amount <= 0:
                return Response({"error": "Bounty amount must be positive"}, status=400)
        except (ValueError, TypeError):
            return Response({"error": "Invalid bounty amount"}, status=400)

        tournament.bounties_won += bounty_amount
        tournament.save()
        return Response(
            {
                "bounties_won": float(tournament.bounties_won),
                "message": f"Bounty of ${bounty_amount} added",
                "tournament_id": tournament.id,
            }
        )

    @action(detail=True, methods=["post"])
    def bust(self, request, pk=None):
        """Mark as busted (set end_time, ensure prize_won = 0, but keep bounties)"""
        tournament = self.get_object()

        # Validate tournament is still active
        if tournament.end_time:
            return Response({"error": "Tournament is already finished"}, status=400)

        tournament.end_time = timezone.now()
        tournament.prize_won = 0  # Set main prize to 0, but keep bounties_won
        tournament.save()

        # Handle case where bounties_won field doesn't exist yet (before migration)
        bounties = float(getattr(tournament, "bounties_won", 0) or 0)
        message = "Tournament marked as busted"
        if bounties > 0:
            message += f" (kept ${bounties} in bounties)"

        return Response(
            {
                "message": message,
                "tournament_id": tournament.id,
                "end_time": tournament.end_time,
                "bounties_won": bounties,
            }
        )

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """Mark as finished with prize amount"""
        tournament = self.get_object()

        # Validate tournament is still active
        if tournament.end_time:
            return Response({"error": "Tournament is already finished"}, status=400)

        prize = request.data.get("prize_won", 0)
        try:
            prize = float(prize)
            if prize < 0:
                return Response(
                    {"error": "Prize amount cannot be negative"}, status=400
                )
        except (ValueError, TypeError):
            return Response({"error": "Invalid prize amount"}, status=400)

        tournament.end_time = timezone.now()
        tournament.prize_won = prize
        tournament.save()
        return Response(
            {
                "message": f"Tournament finished with ${prize}",
                "tournament_id": tournament.id,
                "prize_won": tournament.prize_won,
                "end_time": tournament.end_time,
            }
        )
