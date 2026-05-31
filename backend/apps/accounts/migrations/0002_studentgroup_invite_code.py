import secrets

import apps.accounts.models
from django.db import migrations, models


def make_code():
    return secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]


def fill_invite_codes(apps, schema_editor):
    StudentGroup = apps.get_model("accounts", "StudentGroup")
    seen = set(StudentGroup.objects.exclude(invite_code="").values_list("invite_code", flat=True))
    for group in StudentGroup.objects.filter(invite_code=""):
        code = make_code()
        while code in seen:
            code = make_code()
        seen.add(code)
        group.invite_code = code
        group.save(update_fields=["invite_code"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentgroup",
            name="invite_code",
            field=models.CharField(blank=True, db_index=True, max_length=16, unique=True),
        ),
        migrations.RunPython(fill_invite_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="studentgroup",
            name="invite_code",
            field=models.CharField(
                db_index=True,
                default=apps.accounts.models.generate_invite_code,
                max_length=16,
                unique=True,
            ),
        ),
    ]
