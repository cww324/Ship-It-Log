# Generated migration for adding bounties_won field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_tournament_game_tournament_seat_value_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="bounties_won",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
