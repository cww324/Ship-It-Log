import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from api.models import Site, FormatTag, Tournament, Session, SessionTournament


class Command(BaseCommand):
    help = "Seed the database with test users, sites, tournaments, and sessions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--users",
            type=int,
            default=8,
            help="Number of users to create (default: 8)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing test data before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing test data...")
            # Don't delete superusers
            User.objects.filter(is_superuser=False).delete()
            Site.objects.all().delete()
            Tournament.objects.all().delete()
            Session.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleared existing test data"))

        # Ensure format tags exist
        self.create_format_tags()

        # Create sites
        sites = self.create_sites()

        # Create users with different playing styles
        users = self.create_users(options["users"])

        # Create tournaments
        tournaments = self.create_tournaments(sites)

        # Create sessions with tournaments based on player types
        self.create_sessions_and_tournaments(users, tournaments)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded database with {len(users)} users, "
                f"{len(sites)} sites, {len(tournaments)} tournaments, and sessions"
            )
        )

    def create_format_tags(self):
        """Ensure format tags exist"""
        tags = [
            "NLH",
            "PLO",
            "Turbo",
            "Hyper",
            "Deepstack",
            "PKO",
            "Mystery Bounty",
            "Freezeout",
            "Re-entry",
            "Online",
            "Live",
            "6-max",
            "9-max",
        ]
        for tag in tags:
            FormatTag.objects.get_or_create(label=tag)

    def create_sites(self):
        """Create poker sites"""
        sites_data = [
            # Online sites
            {"name": "PokerStars", "type": Site.ONLINE},
            {"name": "GGPoker", "type": Site.ONLINE},
            {"name": "888poker", "type": Site.ONLINE},
            {"name": "partypoker", "type": Site.ONLINE},
            {"name": "ACR", "type": Site.ONLINE},
            # Live venues
            {
                "name": "Harrah's Cherokee",
                "type": Site.LIVE,
                "notes": "Cherokee, NC - WSOP Circuit venue",
            },
            {"name": "Aria Casino", "type": Site.LIVE, "notes": "Las Vegas, NV"},
            {"name": "Bellagio", "type": Site.LIVE, "notes": "Las Vegas, NV"},
            {"name": "Commerce Casino", "type": Site.LIVE, "notes": "Los Angeles, CA"},
            {"name": "Borgata", "type": Site.LIVE, "notes": "Atlantic City, NJ"},
            {"name": "Bicycle Casino", "type": Site.LIVE, "notes": "Bell Gardens, CA"},
        ]

        sites = []
        for site_data in sites_data:
            site, created = Site.objects.get_or_create(
                name=site_data["name"], defaults=site_data
            )
            sites.append(site)

        return sites

    def create_users(self, count):
        """Create test users with different playing styles"""
        user_profiles = [
            # Tournament-only players (3 users)
            {
                "username": "TourneyGrinder",
                "type": "tournament_only",
                "email": "tourneygrinder@example.com",
                "style": "online_volume",  # High volume online player
                "first_name": "Tourney",
                "last_name": "Grinder",
            },
            {
                "username": "MTTShark",
                "type": "tournament_only",
                "email": "mttshark@example.com",
                "style": "online_selective",  # Selective high-stakes online
                "first_name": "MTT",
                "last_name": "Shark",
            },
            {
                "username": "CircuitPro",
                "type": "tournament_only",
                "email": "circuitpro@example.com",
                "style": "live_circuit",  # Live circuit grinder
                "first_name": "Circuit",
                "last_name": "Pro",
            },
            # Mixed players (2 users) - tournament focus for now
            {
                "username": "MixedPlayer1",
                "type": "mixed",
                "email": "mixedplayer1@example.com",
                "style": "balanced",
                "first_name": "Mixed",
                "last_name": "Player",
            },
            {
                "username": "CashTourneyPro",
                "type": "mixed",
                "email": "cashtourneypro@example.com",
                "style": "professional",
                "first_name": "CashTourney",
                "last_name": "Pro",
            },
            # Regular players
            {
                "username": "WeekendWarrior",
                "type": "regular",
                "email": "weekendwarrior@example.com",
                "style": "recreational",
                "first_name": "Weekend",
                "last_name": "Warrior",
            },
            {
                "username": "SatelliteKing",
                "type": "regular",
                "email": "satelliteking@example.com",
                "style": "satellite_specialist",
                "first_name": "Satellite",
                "last_name": "King",
            },
            {
                "username": "LiveLocalPro",
                "type": "regular",
                "email": "livelocalpro@example.com",
                "style": "live_local",
                "first_name": "LiveLocal",
                "last_name": "Pro",
            },
        ]

        users = []
        for i in range(min(count, len(user_profiles))):
            profile = user_profiles[i]

            user, created = User.objects.get_or_create(
                username=profile["username"],
                defaults={
                    "email": profile["email"],
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                },
            )
            if created:
                user.set_password("testpass123")
                user.save()

            # Store the player type and style for later use
            user.player_type = profile["type"]
            user.playing_style = profile["style"]
            users.append(user)

        return users

    def create_tournaments(self, sites):
        """Create various tournaments over the past 30 days"""
        tournaments = []

        # Get site objects for easy reference
        pokerstars = next((s for s in sites if s.name == "PokerStars"), None)
        ggpoker = next((s for s in sites if s.name == "GGPoker"), None)
        poker888 = next((s for s in sites if s.name == "888poker"), None)
        partypoker = next((s for s in sites if s.name == "partypoker"), None)
        acr = next((s for s in sites if s.name == "ACR"), None)
        cherokee = next((s for s in sites if s.name == "Harrah's Cherokee"), None)
        aria = next((s for s in sites if s.name == "Aria Casino"), None)
        bellagio = next((s for s in sites if s.name == "Bellagio"), None)

        # Tournament templates
        online_templates = [
            # PokerStars
            {
                "name": "Sunday Million",
                "site": pokerstars,
                "buy_in": 215,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Hot $55",
                "site": pokerstars,
                "buy_in": 55,
                "game": "NLHE",
                "speed": "turbo",
                "table_size": "6max",
            },
            {
                "name": "Bounty Builder $109",
                "site": pokerstars,
                "buy_in": 109,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Mini Sunday Million",
                "site": pokerstars,
                "buy_in": 22,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Turbo Series $33",
                "site": pokerstars,
                "buy_in": 33,
                "game": "NLHE",
                "speed": "turbo",
                "table_size": "6max",
            },
            {
                "name": "High Roller $530",
                "site": pokerstars,
                "buy_in": 530,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            # GGPoker
            {
                "name": "Daily Main Event",
                "site": ggpoker,
                "buy_in": 150,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "PLO Bounty",
                "site": ggpoker,
                "buy_in": 82.50,
                "game": "PLO",
                "speed": "regular",
                "table_size": "6max",
            },
            {
                "name": "Mystery Bounty $44",
                "site": ggpoker,
                "buy_in": 44,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "High Roller $1050",
                "site": ggpoker,
                "buy_in": 1050,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            # 888poker
            {
                "name": "Sunday Challenge",
                "site": poker888,
                "buy_in": 90,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Turbo Mega Deep",
                "site": poker888,
                "buy_in": 55,
                "game": "NLHE",
                "speed": "turbo",
                "table_size": "6max",
            },
            {
                "name": "PKO Tournament",
                "site": poker888,
                "buy_in": 33,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            # partypoker
            {
                "name": "Sunday High Roller",
                "site": partypoker,
                "buy_in": 530,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Daily Legends",
                "site": partypoker,
                "buy_in": 55,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Bounty Hunter",
                "site": partypoker,
                "buy_in": 109,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            # ACR
            {
                "name": "Sunday Special",
                "site": acr,
                "buy_in": 215,
                "game": "NLHE",
                "speed": "regular",
                "table_size": "8max",
            },
            {
                "name": "Turbo $55",
                "site": acr,
                "buy_in": 55,
                "game": "NLHE",
                "speed": "turbo",
                "table_size": "6max",
            },
        ]

        # WSOP Circuit at Cherokee (2 weeks ago)
        circuit_start = timezone.now() - timedelta(days=20)
        circuit_tournaments = [
            {
                "name": "Circuit Event #1 - $400 NLH",
                "site": cherokee,
                "buy_in": 400,
                "day": 0,
            },
            {
                "name": "Circuit Event #2 - $600 NLH",
                "site": cherokee,
                "buy_in": 600,
                "day": 1,
            },
            {
                "name": "Circuit Event #3 - $1,125 NLH",
                "site": cherokee,
                "buy_in": 1125,
                "day": 2,
            },
            {
                "name": "Circuit Event #4 - $400 PLO",
                "site": cherokee,
                "buy_in": 400,
                "day": 3,
            },
            {
                "name": "Circuit Event #5 - $800 NLH",
                "site": cherokee,
                "buy_in": 800,
                "day": 4,
            },
            {
                "name": "Circuit Event #6 - $400 NLH Turbo",
                "site": cherokee,
                "buy_in": 400,
                "day": 5,
            },
            {
                "name": "Circuit Event #7 - $1,700 Main Event Day 1A",
                "site": cherokee,
                "buy_in": 1700,
                "day": 6,
            },
            {
                "name": "Circuit Event #7 - $1,700 Main Event Day 1B",
                "site": cherokee,
                "buy_in": 1700,
                "day": 7,
            },
            {
                "name": "Circuit Event #7 - $1,700 Main Event Day 2",
                "site": cherokee,
                "buy_in": 0,
                "day": 8,
            },  # Day 2, no additional buy-in
            {
                "name": "Circuit Event #8 - $600 NLH",
                "site": cherokee,
                "buy_in": 600,
                "day": 9,
            },
            {
                "name": "Circuit Event #9 - $400 NLH",
                "site": cherokee,
                "buy_in": 400,
                "day": 10,
            },
            {
                "name": "Circuit Event #10 - $1,125 High Roller",
                "site": cherokee,
                "buy_in": 1125,
                "day": 11,
            },
        ]

        # Create Circuit tournaments
        for circuit_event in circuit_tournaments:
            start_time = circuit_start + timedelta(
                days=circuit_event["day"], hours=12
            )  # Noon start
            end_time = start_time + timedelta(
                hours=random.randint(8, 14)
            )  # 8-14 hour tournaments

            tournament = Tournament.objects.create(
                name=circuit_event["name"],
                site=circuit_event["site"],
                buy_in=Decimal(str(circuit_event["buy_in"])),
                prize_won=Decimal("0.00"),  # Will be set when creating sessions
                start_time=start_time,
                end_time=end_time,
                type=Tournament.Type.MTT,
                game=(
                    Tournament.Game.PLO
                    if "PLO" in circuit_event["name"]
                    else Tournament.Game.NLHE
                ),
                speed=(
                    Tournament.Speed.TURBO
                    if "Turbo" in circuit_event["name"]
                    else Tournament.Speed.REGULAR
                ),
                table_size=Tournament.TableSize.FULL,
                notes=f"WSOP Circuit Cherokee Event",
            )
            tournaments.append(tournament)

        # Create online tournaments for the past 30 days
        for days_ago in range(30):
            date = timezone.now() - timedelta(days=days_ago)

            # Skip circuit days for online tournaments (reduce overlap)
            if 14 <= days_ago <= 26:
                daily_tournaments = random.randint(8, 12)  # Fewer during circuit
            else:
                daily_tournaments = random.randint(15, 25)  # Normal online volume

            for _ in range(daily_tournaments):
                template = random.choice(online_templates)

                # Randomize start time within the day
                start_time = date.replace(
                    hour=random.randint(14, 23),  # 2 PM to 11 PM starts
                    minute=random.choice([0, 15, 30, 45]),  # Tournament start times
                    second=0,
                    microsecond=0,
                )

                # Tournament duration based on speed
                if template["speed"] == "turbo":
                    duration_hours = random.randint(2, 4)
                elif template["speed"] == "hyper":
                    duration_hours = random.randint(1, 2)
                else:  # regular
                    duration_hours = random.randint(4, 8)

                end_time = start_time + timedelta(hours=duration_hours)

                tournament = Tournament.objects.create(
                    name=template["name"],
                    site=template["site"],
                    buy_in=Decimal(str(template["buy_in"])),
                    prize_won=Decimal("0.00"),  # Will be set when creating sessions
                    start_time=start_time,
                    end_time=end_time,
                    type=Tournament.Type.MTT,
                    game=getattr(Tournament.Game, template["game"]),
                    speed=getattr(Tournament.Speed, template["speed"].upper()),
                    table_size=getattr(
                        Tournament.TableSize,
                        template["table_size"].upper().replace("MAX", ""),
                    ),
                    notes=f"Online tournament on {date.strftime('%Y-%m-%d')}",
                )
                tournaments.append(tournament)

        return tournaments

    def create_sessions_and_tournaments(self, users, tournaments):
        """Create sessions and link them to tournaments based on player types"""

        for user in users:
            self.stdout.write(
                f"Creating sessions for {user.username} ({user.playing_style})"
            )

            if user.playing_style == "live_circuit":
                self.create_circuit_sessions(user, tournaments)
            elif user.playing_style in ["online_volume", "online_selective"]:
                self.create_online_sessions(user, tournaments)
            elif user.playing_style == "live_local":
                self.create_live_local_sessions(user, tournaments)
            elif user.playing_style == "satellite_specialist":
                self.create_satellite_sessions(user, tournaments)
            else:  # balanced, professional, recreational
                self.create_mixed_sessions(user, tournaments)

    def create_circuit_sessions(self, user, tournaments):
        """Create WSOP Circuit session for live circuit player"""
        # Find Cherokee circuit tournaments
        circuit_tournaments = [
            t for t in tournaments if t.site.name == "Harrah's Cherokee"
        ]

        if circuit_tournaments:
            # Create one big session for the entire circuit
            circuit_start = min(t.start_time for t in circuit_tournaments)
            circuit_end = max(t.end_time for t in circuit_tournaments)

            session = Session.objects.create(
                user=user,
                start_time=circuit_start,
                end_time=circuit_end,
                notes="WSOP Circuit Cherokee - 2 week trip, played 12 events, cashed in 3",
            )

            # Add tournaments to session (play 8-12 of the 12 available)
            tournaments_to_play = random.sample(
                circuit_tournaments, random.randint(8, 12)
            )

            for tournament in tournaments_to_play:
                # Set realistic results
                if random.random() < 0.25:  # 25% cash rate for circuit pro
                    multiplier = random.uniform(1.2, 8.0)
                    tournament.prize_won = tournament.buy_in * Decimal(str(multiplier))
                    tournament.save()

                SessionTournament.objects.create(session=session, tournament=tournament)

        # Also create some regular live sessions
        self.create_live_local_sessions(user, tournaments, session_count=3)

    def create_online_sessions(self, user, tournaments):
        """Create online sessions with multi-tabling"""
        online_tournaments = [t for t in tournaments if t.site.type == Site.ONLINE]

        if user.playing_style == "online_volume":
            session_count = random.randint(20, 30)  # High volume
            tournaments_per_session = (6, 18)
        else:  # online_selective
            session_count = random.randint(10, 15)  # More selective
            tournaments_per_session = (3, 8)

        for _ in range(session_count):
            # Random date in past 30 days (avoid circuit period)
            days_ago = (
                random.randint(0, 13)
                if random.random() < 0.7
                else random.randint(27, 29)
            )
            session_date = timezone.now() - timedelta(days=days_ago)

            # Evening session
            start_time = session_date.replace(
                hour=random.randint(18, 21),
                minute=random.choice([0, 15, 30, 45]),
                second=0,
                microsecond=0,
            )

            # Session duration
            duration_hours = random.randint(3, 8)
            end_time = start_time + timedelta(hours=duration_hours)

            session = Session.objects.create(
                user=user,
                start_time=start_time,
                end_time=end_time,
                notes=f"Online grinding session - {duration_hours} hours",
            )

            # Find tournaments that could be played during this session
            available_tournaments = [
                t
                for t in online_tournaments
                if (
                    t.start_time.date() == session_date.date()
                    and t.start_time >= start_time
                    and t.start_time <= end_time
                )
            ]

            if available_tournaments:
                num_tournaments = random.randint(*tournaments_per_session)
                selected_tournaments = random.sample(
                    available_tournaments,
                    min(num_tournaments, len(available_tournaments)),
                )

                for tournament in selected_tournaments:
                    # Set results (15% cash rate)
                    if random.random() < 0.15:
                        multiplier = random.uniform(1.1, 25.0)
                        tournament.prize_won = tournament.buy_in * Decimal(
                            str(multiplier)
                        )
                        tournament.save()

                    SessionTournament.objects.create(
                        session=session, tournament=tournament
                    )

    def create_live_local_sessions(self, user, tournaments, session_count=None):
        """Create local live casino sessions"""
        live_sites = ["Aria Casino", "Bellagio", "Commerce Casino", "Borgata"]
        live_tournaments = [t for t in tournaments if t.site.name in live_sites]

        if not session_count:
            session_count = random.randint(6, 12)

        for _ in range(session_count):
            # Random weekend day in past 30 days
            days_ago = random.randint(0, 29)
            session_date = timezone.now() - timedelta(days=days_ago)

            # Adjust to weekend if recreational player
            if user.playing_style == "recreational":
                # Move to nearest weekend
                weekday = session_date.weekday()
                if weekday < 5:  # Monday-Friday
                    days_to_weekend = 5 - weekday  # Days to Saturday
                    session_date += timedelta(days=days_to_weekend)

            start_time = session_date.replace(
                hour=random.randint(11, 15),  # Late morning/afternoon start
                minute=0,
                second=0,
                microsecond=0,
            )

            # Live session duration
            duration_hours = random.randint(6, 12)
            end_time = start_time + timedelta(hours=duration_hours)

            session = Session.objects.create(
                user=user,
                start_time=start_time,
                end_time=end_time,
                notes=f"Live casino session - {duration_hours} hours",
            )

            # Find live tournaments for this day
            available_tournaments = [
                t
                for t in live_tournaments
                if (
                    t.start_time.date() == session_date.date()
                    and t.start_time >= start_time
                    and t.start_time <= end_time
                )
            ]

            if available_tournaments:
                # Live players typically play 1-3 tournaments per session
                num_tournaments = random.randint(1, min(3, len(available_tournaments)))
                selected_tournaments = random.sample(
                    available_tournaments, num_tournaments
                )

                for tournament in selected_tournaments:
                    # Set results (20% cash rate for live)
                    if random.random() < 0.20:
                        multiplier = random.uniform(1.2, 15.0)
                        tournament.prize_won = tournament.buy_in * Decimal(
                            str(multiplier)
                        )
                        tournament.save()

                    SessionTournament.objects.create(
                        session=session, tournament=tournament
                    )

    def create_satellite_sessions(self, user, tournaments):
        """Create sessions focused on satellite tournaments"""
        # Find low buy-in tournaments (satellites)
        satellite_tournaments = [
            t for t in tournaments if t.buy_in <= 50 and t.site.type == Site.ONLINE
        ]

        session_count = random.randint(15, 25)  # Satellite specialists play often

        for _ in range(session_count):
            days_ago = random.randint(0, 29)
            session_date = timezone.now() - timedelta(days=days_ago)

            start_time = session_date.replace(
                hour=random.randint(19, 22),
                minute=random.choice([0, 30]),
                second=0,
                microsecond=0,
            )

            duration_hours = random.randint(2, 5)  # Shorter sessions
            end_time = start_time + timedelta(hours=duration_hours)

            session = Session.objects.create(
                user=user,
                start_time=start_time,
                end_time=end_time,
                notes=f"Satellite grinding session - {duration_hours} hours",
            )

            available_tournaments = [
                t
                for t in satellite_tournaments
                if (
                    t.start_time.date() == session_date.date()
                    and t.start_time >= start_time
                    and t.start_time <= end_time
                )
            ]

            if available_tournaments:
                num_tournaments = random.randint(3, 8)  # Focus on volume
                selected_tournaments = random.sample(
                    available_tournaments,
                    min(num_tournaments, len(available_tournaments)),
                )

                for tournament in selected_tournaments:
                    # Satellites have different success metrics
                    if random.random() < 0.12:  # 12% win rate
                        # Satellite wins are typically seat values
                        tournament.prize_won = tournament.buy_in * Decimal(
                            str(random.randint(8, 15))
                        )
                        tournament.save()

                    SessionTournament.objects.create(
                        session=session, tournament=tournament
                    )

    def create_mixed_sessions(self, user, tournaments):
        """Create mixed sessions for balanced/professional/recreational players"""
        all_tournaments = tournaments

        if user.playing_style == "recreational":
            session_count = random.randint(4, 8)  # Weekend warrior
            tournaments_per_session = (2, 6)
        elif user.playing_style == "professional":
            session_count = random.randint(18, 25)  # Professional volume
            tournaments_per_session = (4, 12)
        else:  # balanced
            session_count = random.randint(12, 18)
            tournaments_per_session = (3, 8)

        for _ in range(session_count):
            days_ago = random.randint(0, 29)
            session_date = timezone.now() - timedelta(days=days_ago)

            # Recreational players prefer weekends
            if user.playing_style == "recreational":
                weekday = session_date.weekday()
                if (
                    weekday < 5 and random.random() < 0.7
                ):  # 70% chance to move to weekend
                    days_to_weekend = 5 - weekday
                    session_date += timedelta(days=days_to_weekend)

            start_time = session_date.replace(
                hour=random.randint(18, 22),
                minute=random.choice([0, 15, 30, 45]),
                second=0,
                microsecond=0,
            )

            duration_hours = random.randint(3, 7)
            end_time = start_time + timedelta(hours=duration_hours)

            session = Session.objects.create(
                user=user,
                start_time=start_time,
                end_time=end_time,
                notes=f"Mixed session - {duration_hours} hours",
            )

            # Mix of online and live tournaments
            available_tournaments = [
                t
                for t in all_tournaments
                if (
                    t.start_time.date() == session_date.date()
                    and t.start_time >= start_time
                    and t.start_time <= end_time
                )
            ]

            if available_tournaments:
                num_tournaments = random.randint(*tournaments_per_session)
                selected_tournaments = random.sample(
                    available_tournaments,
                    min(num_tournaments, len(available_tournaments)),
                )

                for tournament in selected_tournaments:
                    # Standard cash rate
                    cash_rate = 0.18 if user.playing_style == "professional" else 0.15
                    if random.random() < cash_rate:
                        multiplier = random.uniform(1.1, 20.0)
                        tournament.prize_won = tournament.buy_in * Decimal(
                            str(multiplier)
                        )
                        tournament.save()

                    SessionTournament.objects.create(
                        session=session, tournament=tournament
                    )

        # Add format tags to tournaments
        self.add_format_tags_to_tournaments()

    def add_format_tags_to_tournaments(self):
        """Add appropriate format tags to all tournaments"""
        tournaments = Tournament.objects.all()

        for tournament in tournaments:
            tags_to_add = []

            # Game type tags
            if tournament.game == Tournament.Game.NLHE:
                tags_to_add.append("NLH")
            elif tournament.game == Tournament.Game.PLO:
                tags_to_add.append("PLO")

            # Speed tags
            if tournament.speed == Tournament.Speed.TURBO:
                tags_to_add.append("Turbo")
            elif tournament.speed == Tournament.Speed.HYPER:
                tags_to_add.append("Hyper")
            elif tournament.speed == Tournament.Speed.DEEPSTACK:
                tags_to_add.append("Deepstack")

            # Bounty tags
            if "Bounty" in tournament.name:
                if "Mystery" in tournament.name:
                    tags_to_add.append("Mystery Bounty")
                else:
                    tags_to_add.append("PKO")

            # Table size tags
            if tournament.table_size == Tournament.TableSize.SIX:
                tags_to_add.append("6-max")
            elif tournament.table_size == Tournament.TableSize.FULL:
                tags_to_add.append("9-max")

            # Site type tags
            if tournament.site.type == Site.ONLINE:
                tags_to_add.append("Online")
            else:
                tags_to_add.append("Live")

            # Add the tags
            for tag_label in tags_to_add:
                try:
                    tag = FormatTag.objects.get(label=tag_label)
                    tournament.format_tags.add(tag)
                except FormatTag.DoesNotExist:
                    pass
