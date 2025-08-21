from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from api.models import Session, SessionTournament, Tournament
from api.serializers import (
    SessionSerializer,
    SessionDetailSerializer,
    SessionAccordionSerializer,
    TournamentSerializer,
    TournamentSlimSerializer,
    TournamentAccordionSerializer,
)


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅ require login

    def get_queryset(self):
        # Only the logged-in user's sessions
        return Session.objects.filter(user=self.request.user).select_related("user")

    def get_serializer_class(self):
        # Both list and detail return totals + tournaments for frontend compatibility
        if self.action in ["retrieve", "list"]:
            return SessionDetailSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        # Save as the current user with current timestamp
        serializer.save(user=self.request.user, start_time=timezone.now())

    @action(detail=True, methods=["post"])
    def attach_tournaments(self, request, pk=None):
        """Attach existing tournaments by ID to this session."""
        session = self.get_object()  # already scoped to request.user via get_queryset
        ids = request.data.get("tournament_ids", [])
        created = 0
        for tid in ids:
            SessionTournament.objects.get_or_create(session=session, tournament_id=tid)
            created += 1
        return Response({"attached": created})

    @action(detail=True, methods=["post"])
    def create_and_attach(self, request, pk=None):
        """Create tournaments and attach them to this session."""
        session = self.get_object()
        payload = request.data.get("tournaments", [])
        out = []
        for t in payload:
            ser = TournamentSerializer(data=t)
            ser.is_valid(raise_exception=True)
            tour = ser.save()
            SessionTournament.objects.get_or_create(session=session, tournament=tour)
            out.append(ser.data)
        # return the updated session detail
        detail = SessionDetailSerializer(session, context={"request": request})
        return Response(detail.data)

    @action(detail=True, methods=["post"])
    def quick_tournament(self, request, pk=None):
        """Quickly add tournament with just name, site, and buy_in"""
        session = self.get_object()

        # Validate required fields
        name = request.data.get("name")
        site = request.data.get("site")
        buy_in = request.data.get("buy_in")

        if not name:
            return Response({"error": "Tournament name is required"}, status=400)
        if not site:
            return Response({"error": "Site is required"}, status=400)
        if not buy_in:
            return Response({"error": "Buy-in amount is required"}, status=400)

        try:
            buy_in = float(buy_in)
            if buy_in < 0:
                return Response({"error": "Buy-in cannot be negative"}, status=400)
        except (ValueError, TypeError):
            return Response({"error": "Invalid buy-in amount"}, status=400)

        # Minimal required fields for quick tournament creation
        data = {
            "name": name.strip(),
            "site": int(site),
            "buy_in": buy_in,
            "start_time": timezone.now().isoformat(),
            "prize_won": 0,
            "entries_used": 1,
            "rebuys": 0,
            "addons": 0,
            "notes": request.data.get("notes", ""),
            # Set defaults for new fields
            "type": request.data.get("type", "MTT"),
            "game": request.data.get("game", "NLHE"),
            "speed": request.data.get("speed", "regular"),
            "table_size": request.data.get("table_size", "8max"),
        }

        # Create tournament
        serializer = TournamentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        tournament = serializer.save()

        # Attach to session
        SessionTournament.objects.create(session=session, tournament=tournament)

        return Response(
            {
                "message": "Tournament added to session",
                "tournament": TournamentSlimSerializer(tournament).data,
            }
        )

    @action(detail=True, methods=["get"])
    def active_tournaments(self, request, pk=None):
        """Get only active tournaments (no end_time) for this session"""
        session = self.get_object()
        active = (
            Tournament.objects.filter(
                tournament_sessions__session=session, end_time__isnull=True
            )
            .select_related("site")
            .prefetch_related("format_tags")
        )
        return Response(TournamentSlimSerializer(active, many=True).data)

    @action(detail=True, methods=["get"])
    def completed_tournaments(self, request, pk=None):
        """Get only completed tournaments (has end_time) for this session"""
        session = self.get_object()
        completed = (
            Tournament.objects.filter(
                tournament_sessions__session=session, end_time__isnull=False
            )
            .select_related("site")
            .prefetch_related("format_tags")
        )
        return Response(TournamentSlimSerializer(completed, many=True).data)

    @action(detail=False, methods=["post"])
    def quick_session(self, request):
        """Find or create a session for the given date"""
        from rest_framework import status
        from datetime import datetime

        date_str = request.data.get("date")
        if not date_str:
            return Response(
                {"error": "Date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse the date
            date_obj = datetime.fromisoformat(date_str).date()

            # Look for existing session on this date
            existing_session = Session.objects.filter(
                user=request.user, start_time__date=date_obj
            ).first()

            if existing_session:
                return Response({"id": existing_session.id, "existing": True})

            # Create new session
            session = Session.objects.create(
                user=request.user,
                start_time=timezone.now(),
                notes=f"Auto-created session for {date_str}",
            )

            return Response(
                {"id": session.id, "existing": False}, status=status.HTTP_201_CREATED
            )

        except ValueError:
            return Response(
                {"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"])
    def accordion_view(self, request):
        """Get sessions optimized for Excel-like accordion display with filtering"""
        from decimal import Decimal
        
        sessions = self.get_queryset().prefetch_related(
            "session_tournaments__tournament__site",
            "session_tournaments__tournament__format_tags"
        )
        
        # Add date filtering if provided
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        
        if date_from:
            try:
                sessions = sessions.filter(start_time__date__gte=date_from)
            except ValueError:
                pass
        if date_to:
            try:
                sessions = sessions.filter(start_time__date__lte=date_to)
            except ValueError:
                pass
        
        # Filter by tournament criteria
        buy_in_min = request.query_params.get('buy_in_min')
        buy_in_max = request.query_params.get('buy_in_max')
        sites = request.query_params.get('sites')
        game_types = request.query_params.get('game_types')
        tournament_types = request.query_params.get('tournament_types')
        speeds = request.query_params.get('speeds')
        table_sizes = request.query_params.get('table_sizes')
        format_tags = request.query_params.get('format_tags')
        results_filter = request.query_params.get('results_filter')
        
        # Apply tournament-based filters by filtering sessions that have tournaments matching criteria
        if any([buy_in_min, buy_in_max, sites, game_types, tournament_types, speeds, table_sizes, format_tags, results_filter]):
            tournament_filters = {}
            
            if buy_in_min:
                try:
                    tournament_filters['session_tournaments__tournament__buy_in__gte'] = Decimal(buy_in_min)
                except (ValueError, TypeError):
                    pass
            
            if buy_in_max:
                try:
                    tournament_filters['session_tournaments__tournament__buy_in__lte'] = Decimal(buy_in_max)
                except (ValueError, TypeError):
                    pass
            
            if sites:
                try:
                    site_ids = [int(s.strip()) for s in sites.split(',') if s.strip()]
                    tournament_filters['session_tournaments__tournament__site__id__in'] = site_ids
                except ValueError:
                    pass
            
            if game_types:
                game_list = [g.strip() for g in game_types.split(',') if g.strip()]
                tournament_filters['session_tournaments__tournament__game__in'] = game_list
            
            if tournament_types:
                type_list = [t.strip() for t in tournament_types.split(',') if t.strip()]
                tournament_filters['session_tournaments__tournament__type__in'] = type_list
            
            if speeds:
                speed_list = [s.strip() for s in speeds.split(',') if s.strip()]
                tournament_filters['session_tournaments__tournament__speed__in'] = speed_list
            
            if table_sizes:
                size_list = [s.strip() for s in table_sizes.split(',') if s.strip()]
                tournament_filters['session_tournaments__tournament__table_size__in'] = size_list
            
            if format_tags:
                try:
                    tag_ids = [int(t.strip()) for t in format_tags.split(',') if t.strip()]
                    tournament_filters['session_tournaments__tournament__format_tags__id__in'] = tag_ids
                except ValueError:
                    pass
            
            if tournament_filters:
                sessions = sessions.filter(**tournament_filters).distinct()
        
        # Results filtering (winning/losing sessions) - will be applied after serialization
        # since it requires calculating session totals
            
        # Limit results for performance
        limit = int(request.query_params.get("limit", 50))
        sessions = sessions[:limit]
        
        serializer = SessionAccordionSerializer(sessions, many=True)
        session_data = serializer.data
        
        # Apply results filter if specified
        if results_filter:
            filtered_sessions = []
            for session in session_data:
                net_profit = session.get('net_profit', 0)
                if results_filter == 'winning' and net_profit > 0:
                    filtered_sessions.append(session)
                elif results_filter == 'losing' and net_profit < 0:
                    filtered_sessions.append(session)
                elif results_filter == 'breakeven' and net_profit == 0:
                    filtered_sessions.append(session)
                elif results_filter == 'all':
                    filtered_sessions.append(session)
            session_data = filtered_sessions
        
        return Response(session_data)

    @action(detail=True, methods=["patch"])
    def bulk_update_tournaments(self, request, pk=None):
        """Bulk update multiple tournaments in this session"""
        session = self.get_object()
        tournament_updates = request.data.get("tournaments", [])
        
        updated_tournaments = []
        errors = []
        
        for update_data in tournament_updates:
            tournament_id = update_data.get("id")
            if not tournament_id:
                errors.append({"error": "Tournament ID required"})
                continue
                
            try:
                # Verify tournament belongs to this session
                tournament = Tournament.objects.get(
                    id=tournament_id,
                    tournament_sessions__session=session
                )
                
                # Update tournament with provided data
                serializer = TournamentAccordionSerializer(
                    tournament,
                    data=update_data,
                    partial=True
                )
                
                if serializer.is_valid():
                    updated_tournament = serializer.save()
                    updated_tournaments.append(serializer.data)
                else:
                    errors.append({
                        "tournament_id": tournament_id,
                        "errors": serializer.errors
                    })
                    
            except Tournament.DoesNotExist:
                errors.append({
                    "tournament_id": tournament_id,
                    "error": "Tournament not found in this session"
                })
            except Exception as e:
                errors.append({
                    "tournament_id": tournament_id,
                    "error": str(e)
                })
        
        # Return updated session data
        session_serializer = SessionAccordionSerializer(session)
        
        return Response({
            "session": session_serializer.data,
            "updated_count": len(updated_tournaments),
            "errors": errors
        })
