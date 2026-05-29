from rest_framework import serializers

from apps.accounts.models import Membership, StudentGroup, TelegramUser


class TelegramUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramUser
        fields = ["id", "telegram_id", "first_name", "last_name", "username", "photo_url"]


class StudentGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGroup
        fields = ["id", "name", "telegram_chat_id", "currency"]


class MembershipSerializer(serializers.ModelSerializer):
    user = TelegramUserSerializer(read_only=True)
    group = StudentGroupSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "group", "role"]
