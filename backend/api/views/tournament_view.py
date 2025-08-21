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

    def paginate_queryset(self, queryset):
        """
        Override pagination to allow disabling it for stats calculations.
        If 'no_pagination' query parameter is present, return all results.
        """
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        # Only tournaments from user's sessions (security fix)
        queryset = (
            Tournament.objects.filter(
                tournament_sessions__session__user=self.request.user
            )
            .distinct()
            .order_by("-id")
        )
        
        # Apply filtering based on query parameters
        request = self.request
        
        # Date filtering
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        
        if date_from:
            try:
                queryset = queryset.filter(start_time__date__gte=date_from)
            except ValueError:
                pass
        if date_to:
            try:
                queryset = queryset.filter(start_time__date__lte=date_to)
            except ValueError:
                pass
        
        # Stakes filtering
        buy_in_min = request.query_params.get('buy_in_min')
        buy_in_max = request.query_params.get('buy_in_max')
        
        if buy_in_min:
            try:
                from decimal import Decimal
                queryset = queryset.filter(buy_in__gte=Decimal(buy_in_min))
            except (ValueError, TypeError):
                pass
        
        if buy_in_max:
            try:
                from decimal import Decimal
                queryset = queryset.filter(buy_in__lte=Decimal(buy_in_max))
            except (ValueError, TypeError):
                pass
        
        # Sites filtering
        sites = request.query_params.get('sites')
        if sites:
            try:
                site_ids = [int(s.strip()) for s in sites.split(',') if s.strip()]
                queryset = queryset.filter(site__id__in=site_ids)
            except ValueError:
                pass
        
        # Game types filtering
        game_types = request.query_params.get('game_types')
        if game_types:
            game_list = [g.strip() for g in game_types.split(',') if g.strip()]
            queryset = queryset.filter(game__in=game_list)
        
        # Tournament types filtering
        tournament_types = request.query_params.get('tournament_types')
        if tournament_types:
            type_list = [t.strip() for t in tournament_types.split(',') if t.strip()]
            queryset = queryset.filter(type__in=type_list)
        
        # Speeds filtering
        speeds = request.query_params.get('speeds')
        if speeds:
            speed_list = [s.strip() for s in speeds.split(',') if s.strip()]
            queryset = queryset.filter(speed__in=speed_list)
        
        # Table sizes filtering
        table_sizes = request.query_params.get('table_sizes')
        if table_sizes:
            size_list = [s.strip() for s in table_sizes.split(',') if s.strip()]
            queryset = queryset.filter(table_size__in=size_list)
        
        # Format tags filtering
        format_tags = request.query_params.get('format_tags')
        if format_tags:
            try:
                tag_ids = [int(t.strip()) for t in format_tags.split(',') if t.strip()]
                queryset = queryset.filter(format_tags__id__in=tag_ids)
            except ValueError:
                pass
        
        # Results filtering
        results_filter = request.query_params.get('results_filter')
        if results_filter:
            if results_filter == 'winning':
                queryset = queryset.filter(prize_won__gt=0)
            elif results_filter == 'losing':
                queryset = queryset.filter(prize_won=0)
            elif results_filter == 'breakeven':
                # This is tricky - need to calculate net profit
                # For now, just filter tournaments where prize_won equals buy_in
                from django.db.models import F
                queryset = queryset.filter(prize_won=F('buy_in'))
        
        return queryset

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
