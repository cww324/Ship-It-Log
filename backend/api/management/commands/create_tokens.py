from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    help = "Create authentication tokens for all users"

    def handle(self, *args, **options):
        users = User.objects.all()
        created_count = 0

        for user in users:
            token, created = Token.objects.get_or_create(user=user)
            if created:
                created_count += 1
                self.stdout.write(f"Created token for {user.username}")
            else:
                self.stdout.write(f"Token already exists for {user.username}")

        self.stdout.write(self.style.SUCCESS(f"Total tokens created: {created_count}"))
