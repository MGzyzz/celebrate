from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import TelegramUserSerializer
from apps.accounts.services import (
    TelegramAuthError,
    upsert_telegram_user_from_init_data,
    validate_telegram_init_data,
)


class TelegramAuthView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        init_data = request.data.get("initData") or request.headers.get("X-Telegram-Init-Data", "")

        if not settings.TELEGRAM_BOT_TOKEN:
            return Response(
                {"detail": "TELEGRAM_BOT_TOKEN is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            payload = validate_telegram_init_data(init_data)
            user = upsert_telegram_user_from_init_data(payload)
        except (TelegramAuthError, KeyError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"user": TelegramUserSerializer(user).data})
