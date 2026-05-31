from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.places.geocoding import geocode_place
from apps.places.models import PlaceIdea


class Command(BaseCommand):
    help = "Fill latitude and longitude for place ideas that only have an address."

    def handle(self, *args, **options):
        places = PlaceIdea.objects.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True)).exclude(address="")
        updated = 0
        skipped = 0

        for place in places:
            coords = geocode_place(place.title, place.address)
            if not coords:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"Skipped: {place.title}"))
                continue

            place.latitude, place.longitude = coords
            place.save(update_fields=["latitude", "longitude", "updated_at"])
            updated += 1
            self.stdout.write(self.style.SUCCESS(f"Updated: {place.title}"))

        self.stdout.write(f"Done. Updated: {updated}. Skipped: {skipped}.")
