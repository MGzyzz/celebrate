from django.contrib import admin

from apps.events.models import Event, Participation


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "event_date", "payment_phone", "status", "created_at")
    list_filter = ("status", "group")
    search_fields = ("title", "description")
    fieldsets = (
        (None, {"fields": ("group", "title", "description", "event_date", "status")}),
        ("Оплата", {"fields": ("payment_phone", "payment_holder")}),
    )


@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "status", "payment_share", "custom_share_amount", "updated_at")
    list_filter = ("status", "payment_share", "event")
