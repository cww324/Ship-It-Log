from django.core.management.base import BaseCommand
from api.models import FormatTag

DEFAULTS = [
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


class Command(BaseCommand):
    help = "Seed default FormatTag rows (safe to run multiple times)."

    def handle(self, *args, **opts):
        created = 0
        for label in DEFAULTS:
            _, was_created = FormatTag.objects.get_or_create(label=label)
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new tags"))
