from django.contrib import admin

from apps.places.models import PlaceIdea, PlaceVote


@admin.register(PlaceIdea)
class PlaceIdeaAdmin(admin.ModelAdmin):
    list_display = ("title", "event", "status", "interest_color", "estimated_price", "capacity")
    list_filter = ("status", "interest_color", "event")
    search_fields = ("title", "address", "description")


@admin.register(PlaceVote)
class PlaceVoteAdmin(admin.ModelAdmin):
    list_display = ("place", "user", "created_at")
