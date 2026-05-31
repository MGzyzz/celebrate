from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Membership, StudentGroup
from apps.accounts.serializers import MembershipSerializer, TelegramUserSerializer
from apps.accounts.services import (
    TelegramAuthError,
    upsert_telegram_user_from_init_data,
    validate_telegram_init_data,
)
from apps.events.models import Event, Participation


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


class JoinGroupByCodeView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        code = str(request.data.get("code", "")).strip().upper()
        if not code:
            return Response({"detail": "Введите код группы.", "code": "group_code_required"}, status=400)

        try:
            payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
            user = upsert_telegram_user_from_init_data(payload)
        except (TelegramAuthError, KeyError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=403)

        group = StudentGroup.objects.filter(invite_code=code).first()
        if not group:
            return Response({"detail": "Группа с таким кодом не найдена.", "code": "group_code_invalid"}, status=404)

        membership, _created = Membership.objects.get_or_create(
            user=user,
            group=group,
            defaults={"role": Membership.Role.PARTICIPANT},
        )

        event = group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first() or group.events.order_by(
            "-created_at"
        ).first()
        if event:
            Participation.objects.get_or_create(user=user, event=event)

        return Response({"membership": MembershipSerializer(membership).data})
