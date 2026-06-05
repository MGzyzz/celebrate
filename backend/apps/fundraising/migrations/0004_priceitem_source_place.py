import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("fundraising", "0003_remove_selected_group"),
        ("places", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="priceitem",
            name="source_place",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="price_items",
                to="places.placeidea",
            ),
        ),
    ]
