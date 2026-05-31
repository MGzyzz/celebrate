from django.db import migrations, models


def set_existing_unknown_to_participating(apps, schema_editor):
    Participation = apps.get_model("events", "Participation")
    Participation.objects.filter(status="unknown").update(status="participating")


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0002_event_payment_holder_event_payment_phone"),
    ]

    operations = [
        migrations.AlterField(
            model_name="participation",
            name="status",
            field=models.CharField(
                choices=[
                    ("participating", "Участвует"),
                    ("not_participating", "Не участвует"),
                    ("thinking", "Думает"),
                    ("unknown", "Не ответил"),
                ],
                default="participating",
                max_length=32,
            ),
        ),
        migrations.RunPython(set_existing_unknown_to_participating, migrations.RunPython.noop),
    ]
