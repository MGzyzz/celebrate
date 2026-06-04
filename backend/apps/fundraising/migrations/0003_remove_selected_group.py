from django.db import migrations, models


def convert_selected_group(apps, schema_editor):
    PriceItem = apps.get_model("fundraising", "PriceItem")
    PriceItem.objects.filter(item_type="selected_group").update(item_type="common")


class Migration(migrations.Migration):
    dependencies = [
        ("fundraising", "0002_invoice_claimed_at"),
    ]

    operations = [
        migrations.RunPython(convert_selected_group, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="priceitem",
            name="item_type",
            field=models.CharField(
                choices=[
                    ("common", "Общий"),
                    ("alcohol", "Алкоголь"),
                    ("individual", "Индивидуальный"),
                ],
                default="common",
                max_length=32,
            ),
        ),
    ]
