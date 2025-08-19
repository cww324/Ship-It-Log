import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token
from api.models import Site, FormatTag, Tournament, Session, SessionTournament


class Command(BaseCommand):
    help = "Seed comprehensive realistic poker data for analytics"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing test data before seeding",
        )
        parser.add_argument(
            "--months",
            type=int,
            default=6,
            help="Number of months of historical data (default: 6)",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing test data...")
            User.objects.filter(is_superuser=False).delete()
            Site.objects.all().delete()
            Tournament.objects.all().delete()
            Session.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleared existing test data"))

        # Create format tags
        self.create_format_tags()

        # Create realistic poker sites
        sites = self.create_sites()

        # Create users with different profiles
        users = self.create_users()

        # Create tournaments over the specified period
        months = options["months"]
        tournaments = self.create_tournaments(sites, months)

        # Create sessions and link tournaments
        self.create_comprehensive_sessions(users, tournaments, months)

        # Add format tags to tournaments
        self.add_format_tags_to_tournaments()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {months} months of data:\n"
                f"- {len(users)} users\n"
                f"- {len(sites)} sites\n"
                f"- {len(tournaments)} tournaments\n"
                f"- {Session.objects.count()} sessions\n"
                f"- {SessionTournament.objects.count()} session-tournament links"
            )
        )

    def create_format_tags(self):
        """Create format tags"""
        tags = [
            "NLH",
            "PLO",
            "PLO5",
            "PLO8",
            "Mixed",
            "Turbo",
            "Hyper",
            "Deepstack",
            "Regular",
            "PKO",
            "Mystery Bounty",
            "Freezeout",
            "Re-entry",
            "Online",
            "Live",
            "6-max",
            "8-max",
            "9-max",
            "HU",
        ]
        for tag in tags:
            FormatTag.objects.get_or_create(label=tag)

    def create_sites(self):
        """Create realistic poker sites"""
        sites_data = [
            # US-focused sites
            {
                "name": "ACR (Americas Card Room)",
                "type": Site.ONLINE,
                "notes": "Primary US site - high tournament volume",
            },
            {
                "name": "BetOnline",
                "type": Site.ONLINE,
                "notes": "US site - medium tournament volume",
            },
            {
                "name": "Ignition",
                "type": Site.ONLINE,
                "notes": "US site - lower tournament volume",
            },
            {
                "name": "ClubWPT Gold",
                "type": Site.ONLINE,
                "notes": "US site - small tournament volume",
            },
            {
                "name": "CoinPoker",
                "type": Site.ONLINE,
                "notes": "Crypto-based site - growing volume",
            },
            # European/Global sites
            {
                "name": "PokerStars",
                "type": Site.ONLINE,
                "notes": "Global leader - high volume",
            },
            {
                "name": "GGPoker",
                "type": Site.ONLINE,
                "notes": "Major international site",
            },
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
        ]

        sites = []
        for site_data in sites_data:
            site, created = Site.objects.get_or_create(
                name=site_data["name"], defaults=site_data
            )
            sites.append(site)

        return sites

    def create_users(self):
        """Create users with different playing profiles"""
        user_profiles = [
            # High-volume players for analytics (500-1k tournaments)
            {
                "username": "TourneyGrinder",
                "email": "tourneygrinder@example.com",
                "first_name": "Tourney",
                "last_name": "Grinder",
                "profile": "high_volume_winner",  # Winning player
                "sessions_per_week": 5,
                "tournaments_per_session": (8, 16),
                "preferred_sites": ["ACR (Americas Card Room)", "BetOnline"],
                "target_tournaments": 800,
            },
            {
                "username": "MTTShark",
                "email": "mttshark@example.com",
                "first_name": "MTT",
                "last_name": "Shark",
                "profile": "high_volume_loser",  # Losing player for contrast
                "sessions_per_week": 6,
                "tournaments_per_session": (6, 14),
                "preferred_sites": ["ACR (Americas Card Room)", "Ignition"],
                "target_tournaments": 1000,
            },
            # European player
            {
                "username": "EuroGrinder",
                "email": "eurogrinder@example.com",
                "first_name": "Euro",
                "last_name": "Grinder",
                "profile": "euro_player",
                "sessions_per_week": 4,
                "tournaments_per_session": (10, 18),
                "preferred_sites": ["PokerStars", "GGPoker"],
                "target_tournaments": 600,
            },
            # Medium volume players
            {
                "username": "CircuitPro",
                "email": "circuitpro@example.com",
                "first_name": "Circuit",
                "last_name": "Pro",
                "profile": "live_circuit",
                "sessions_per_week": 3,
                "tournaments_per_session": (2, 6),
                "preferred_sites": [
                    "Harrah's Cherokee",
                    "Aria Casino",
                    "ACR (Americas Card Room)",
                ],
                "target_tournaments": 200,
            },
            {
                "username": "MixedPlayer1",
                "email": "mixedplayer1@example.com",
                "first_name": "Mixed",
                "last_name": "Player",
                "profile": "balanced",
                "sessions_per_week": 4,
                "tournaments_per_session": (4, 10),
                "preferred_sites": [
                    "ACR (Americas Card Room)",
                    "BetOnline",
                    "ClubWPT Gold",
                ],
                "target_tournaments": 350,
            },
            # Lower volume players
            {
                "username": "WeekendWarrior",
                "email": "weekendwarrior@example.com",
                "first_name": "Weekend",
                "last_name": "Warrior",
                "profile": "recreational",
                "sessions_per_week": 2,
                "tournaments_per_session": (2, 6),
                "preferred_sites": ["BetOnline", "Ignition"],
                "target_tournaments": 120,
            },
            {
                "username": "SatelliteKing",
                "email": "satelliteking@example.com",
                "first_name": "Satellite",
                "last_name": "King",
                "profile": "satellite_specialist",
                "sessions_per_week": 4,
                "tournaments_per_session": (6, 12),
                "preferred_sites": ["ACR (Americas Card Room)", "PokerStars"],
                "target_tournaments": 400,
            },
            {
                "username": "CryptoPlayer",
                "email": "cryptoplayer@example.com",
                "first_name": "Crypto",
                "last_name": "Player",
                "profile": "crypto_focused",
                "sessions_per_week": 3,
                "tournaments_per_session": (3, 8),
                "preferred_sites": ["CoinPoker", "ACR (Americas Card Room)"],
                "target_tournaments": 250,
            },
        ]

        users = []
        for i, profile in enumerate(user_profiles, 1):
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

                # Create authentication token for the user
                Token.objects.get_or_create(user=user)
                self.stdout.write(f"Created token for {user.username}")

            # Store profile data
            for key, value in profile.items():
                if key not in ["username", "email", "first_name", "last_name"]:
                    setattr(user, key, value)

            users.append(user)

        return users

    def create_tournaments(self, sites, months):
        """Create tournaments over the specified time period"""
        tournaments = []

        # Get site objects
        site_map = {site.name: site for site in sites}

        # Tournament templates by site
        tournament_templates = {
            "ACR (Americas Card Room)": [
                {
                    "name": "Sunday Special $215",
                    "buy_in": 215,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "Daily $109",
                    "buy_in": 109,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Turbo $55", "buy_in": 55, "game": "NLHE", "speed": "turbo"},
                {"name": "PKO $82", "buy_in": 82, "game": "NLHE", "speed": "regular"},
                {
                    "name": "Mini Main $33",
                    "buy_in": 33,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "PLO Daily $44",
                    "buy_in": 44,
                    "game": "PLO",
                    "speed": "regular",
                },
                {
                    "name": "Hyper Turbo $22",
                    "buy_in": 22,
                    "game": "NLHE",
                    "speed": "hyper",
                },
                {
                    "name": "High Roller $530",
                    "buy_in": 530,
                    "game": "NLHE",
                    "speed": "regular",
                },
            ],
            "BetOnline": [
                {
                    "name": "Sunday Major $162",
                    "buy_in": 162,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Daily $55", "buy_in": 55, "game": "NLHE", "speed": "regular"},
                {"name": "Turbo $33", "buy_in": 33, "game": "NLHE", "speed": "turbo"},
                {"name": "PKO $44", "buy_in": 44, "game": "NLHE", "speed": "regular"},
                {
                    "name": "Mini $16.50",
                    "buy_in": 16.50,
                    "game": "NLHE",
                    "speed": "regular",
                },
            ],
            "PokerStars": [
                {
                    "name": "Sunday Million",
                    "buy_in": 215,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Hot $55", "buy_in": 55, "game": "NLHE", "speed": "turbo"},
                {
                    "name": "Bounty Builder $109",
                    "buy_in": 109,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "Mini Sunday Million",
                    "buy_in": 22,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "High Roller $2100",
                    "buy_in": 2100,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "PLO Bounty $82",
                    "buy_in": 82,
                    "game": "PLO",
                    "speed": "regular",
                },
            ],
            "GGPoker": [
                {
                    "name": "Daily Main Event",
                    "buy_in": 150,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "PLO Bounty",
                    "buy_in": 82.50,
                    "game": "PLO",
                    "speed": "regular",
                },
                {
                    "name": "Mystery Bounty $44",
                    "buy_in": 44,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "High Roller $1050",
                    "buy_in": 1050,
                    "game": "NLHE",
                    "speed": "regular",
                },
            ],
            "Ignition": [
                {
                    "name": "Sunday $100K GTD",
                    "buy_in": 162,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {
                    "name": "Daily $25K GTD",
                    "buy_in": 55,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Turbo $27", "buy_in": 27, "game": "NLHE", "speed": "turbo"},
            ],
            "ClubWPT Gold": [
                {
                    "name": "Sunday Championship",
                    "buy_in": 33,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Daily $22", "buy_in": 22, "game": "NLHE", "speed": "regular"},
            ],
            "CoinPoker": [
                {
                    "name": "Sunday Storm",
                    "buy_in": 110,
                    "game": "NLHE",
                    "speed": "regular",
                },
                {"name": "Daily $44", "buy_in": 44, "game": "NLHE", "speed": "regular"},
                {
                    "name": "Crypto Turbo $27",
                    "buy_in": 27,
                    "game": "NLHE",
                    "speed": "turbo",
                },
            ],
        }

        # Daily tournament counts by site
        daily_counts = {
            "ACR (Americas Card Room)": (20, 30),
            "BetOnline": (10, 15),
            "PokerStars": (25, 35),
            "GGPoker": (20, 30),
            "Ignition": (8, 12),
            "ClubWPT Gold": (5, 8),
            "CoinPoker": (6, 10),
        }

        # Generate tournaments for the past X months
        start_date = timezone.now() - timedelta(days=months * 30)

        for day_offset in range(months * 30):
            current_date = start_date + timedelta(days=day_offset)

            for site_name, templates in tournament_templates.items():
                if site_name in site_map:
                    site = site_map[site_name]
                    min_count, max_count = daily_counts[site_name]
                    daily_tournament_count = random.randint(min_count, max_count)

                    for _ in range(daily_tournament_count):
                        template = random.choice(templates)

                        # Random start time during the day
                        start_time = current_date.replace(
                            hour=random.randint(12, 23),
                            minute=random.choice([0, 15, 30, 45]),
                            second=0,
                            microsecond=0,
                        )

                        # Duration based on speed
                        if template["speed"] == "hyper":
                            duration = random.randint(1, 2)
                        elif template["speed"] == "turbo":
                            duration = random.randint(2, 4)
                        else:
                            duration = random.randint(4, 8)

                        end_time = start_time + timedelta(hours=duration)

                        tournament = Tournament.objects.create(
                            name=template["name"],
                            site=site,
                            buy_in=Decimal(str(template["buy_in"])),
                            prize_won=Decimal("0.00"),
                            start_time=start_time,
                            end_time=end_time,
                            type=Tournament.Type.MTT,
                            game=getattr(Tournament.Game, template["game"]),
                            speed=getattr(Tournament.Speed, template["speed"].upper()),
                            table_size=Tournament.TableSize.EIGHT,
                            notes=f"Generated tournament for {current_date.strftime('%Y-%m-%d')}",
                        )
                        tournaments.append(tournament)

        return tournaments

    def create_comprehensive_sessions(self, users, tournaments, months):
        """Create realistic sessions for each user based on their profile"""

        for user in users:
            self.stdout.write(
                f"Creating sessions for {user.username} (target: {user.target_tournaments} tournaments)"
            )

            sessions_created = 0
            tournaments_played = 0

            # Calculate session distribution over time
            total_weeks = months * 4
            sessions_per_week = user.sessions_per_week
            total_sessions_needed = int(total_weeks * sessions_per_week)

            # Distribute sessions over the time period
            start_date = timezone.now() - timedelta(days=months * 30)

            for week in range(total_weeks):
                week_start = start_date + timedelta(weeks=week)

                # Create sessions for this week
                for session_num in range(sessions_per_week):
                    if tournaments_played >= user.target_tournaments:
                        break

                    # Random day in the week
                    session_date = week_start + timedelta(days=random.randint(0, 6))

                    # Adjust for user preferences
                    if user.profile == "recreational":
                        # Weekend warrior - prefer weekends
                        if session_date.weekday() < 5 and random.random() < 0.7:
                            session_date += timedelta(days=(5 - session_date.weekday()))

                    # Session timing
                    if user.profile == "euro_player":
                        # European times
                        start_hour = random.randint(14, 20)  # 2 PM - 8 PM local
                    else:
                        # US times
                        start_hour = random.randint(18, 23)  # 6 PM - 11 PM local

                    start_time = session_date.replace(
                        hour=start_hour,
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
                        notes=f"{user.profile} session - {duration_hours} hours",
                    )
                    sessions_created += 1

                    # Add tournaments to this session
                    min_tournaments, max_tournaments = user.tournaments_per_session
                    tournaments_in_session = random.randint(
                        min_tournaments, max_tournaments
                    )

                    # Find available tournaments for this session
                    preferred_sites = [site for site in user.preferred_sites]
                    available_tournaments = [
                        t
                        for t in tournaments
                        if (
                            t.site.name in preferred_sites
                            and t.start_time.date() == session_date.date()
                            and t.start_time >= start_time
                            and t.start_time <= end_time
                        )
                    ]

                    if available_tournaments:
                        selected_count = min(
                            tournaments_in_session, len(available_tournaments)
                        )
                        selected_tournaments = random.sample(
                            available_tournaments, selected_count
                        )

                        for tournament in selected_tournaments:
                            if tournaments_played >= user.target_tournaments:
                                break

                            # Set results based on player profile
                            self.set_tournament_results(tournament, user)

                            SessionTournament.objects.create(
                                session=session, tournament=tournament
                            )
                            tournaments_played += 1

                if tournaments_played >= user.target_tournaments:
                    break

            self.stdout.write(
                f"  Created {sessions_created} sessions with {tournaments_played} tournaments"
            )

    def set_tournament_results(self, tournament, user):
        """Set realistic tournament results based on user profile"""

        # Base cash rates by profile
        cash_rates = {
            "high_volume_winner": 0.22,  # 22% cash rate (winning player)
            "high_volume_loser": 0.12,  # 12% cash rate (losing player)
            "euro_player": 0.18,
            "live_circuit": 0.25,  # Live players typically cash more
            "balanced": 0.16,
            "recreational": 0.14,
            "satellite_specialist": 0.15,  # Different success metric
            "crypto_focused": 0.16,
        }

        cash_rate = cash_rates.get(user.profile, 0.15)

        if random.random() < cash_rate:
            # Player cashed
            if user.profile == "satellite_specialist" and tournament.buy_in <= 50:
                # Satellite wins are typically seat values
                multiplier = random.uniform(8.0, 15.0)
            elif user.profile == "high_volume_winner":
                # Winning player gets better results
                multiplier = random.uniform(1.2, 35.0)
            elif user.profile == "high_volume_loser":
                # Losing player gets smaller cashes
                multiplier = random.uniform(1.1, 8.0)
            else:
                # Standard distribution
                multiplier = random.uniform(1.1, 20.0)

            tournament.prize_won = tournament.buy_in * Decimal(str(multiplier))

            # Add bounties for PKO tournaments
            if "PKO" in tournament.name or "Bounty" in tournament.name:
                bounty_count = random.randint(1, 5)
                bounty_value = tournament.buy_in * Decimal("0.1")
                tournament.bounties_won = bounty_value * bounty_count

            tournament.save()

    def add_format_tags_to_tournaments(self):
        """Add appropriate format tags to tournaments"""
        tournaments = Tournament.objects.all()

        for tournament in tournaments:
            tags_to_add = []

            # Game type
            if tournament.game == Tournament.Game.NLHE:
                tags_to_add.append("NLH")
            elif tournament.game == Tournament.Game.PLO:
                tags_to_add.append("PLO")

            # Speed
            if tournament.speed == Tournament.Speed.TURBO:
                tags_to_add.append("Turbo")
            elif tournament.speed == Tournament.Speed.HYPER:
                tags_to_add.append("Hyper")
            elif tournament.speed == Tournament.Speed.DEEPSTACK:
                tags_to_add.append("Deepstack")
            else:
                tags_to_add.append("Regular")

            # Special formats
            if "PKO" in tournament.name or "Bounty" in tournament.name:
                if "Mystery" in tournament.name:
                    tags_to_add.append("Mystery Bounty")
                else:
                    tags_to_add.append("PKO")

            # Table size
            if tournament.table_size == Tournament.TableSize.SIX:
                tags_to_add.append("6-max")
            elif tournament.table_size == Tournament.TableSize.EIGHT:
                tags_to_add.append("8-max")
            elif tournament.table_size == Tournament.TableSize.FULL:
                tags_to_add.append("9-max")

            # Site type
            if tournament.site.type == Site.ONLINE:
                tags_to_add.append("Online")
            else:
                tags_to_add.append("Live")

            # Add tags
            for tag_label in tags_to_add:
                try:
                    tag = FormatTag.objects.get(label=tag_label)
                    tournament.format_tags.add(tag)
                except FormatTag.DoesNotExist:
                    pass
