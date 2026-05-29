from rest_framework import serializers

from apps.accounts.serializers import TelegramUserSerializer
from apps.events.models import Event, Participation


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "id",
            "group",
            "title",
            "description",
            "event_date",
            "payment_phone",
            "payment_holder",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ParticipationSerializer(serializers.ModelSerializer):
    user = TelegramUserSerializer(read_only=True)

    class Meta:
        model = Participation
        fields = ["id", "event", "user", "status", "payment_share", "custom_share_amount", "updated_at"]
        read_only_fields = ["updated_at"]
