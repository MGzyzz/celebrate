from datetime import date

from rest_framework import exceptions, response, status, views, viewsets

from apps.accounts.models import Membership
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.bootstrap import _ru_date
from apps.events.models import Event, Participation
from apps.events.serializers import EventSerializer, ParticipationSerializer


PARTICIPATION_STATUS_TO_CLIENT = {
    Participation.Status.PARTICIPATING: "in",
    Participation.Status.NOT_PARTICIPATING: "out",
    Participation.Status.THINKING: "maybe",
    Participation.Status.UNKNOWN: "none",
}

PARTICIPATION_STATUS_FROM_CLIENT = {
    "in": Participation.Status.PARTICIPATING,
    "out": Participation.Status.NOT_PARTICIPATING,
    "maybe": Participation.Status.THINKING,
    "none": Participation.Status.UNKNOWN,
    Participation.Status.PARTICIPATING: Participation.Status.PARTICIPATING,
    Participation.Status.NOT_PARTICIPATING: Participation.Status.NOT_PARTICIPATING,
    Participation.Status.THINKING: Participation.Status.THINKING,
    Participation.Status.UNKNOWN: Participation.Status.UNKNOWN,
}


def _telegram_user(request):
    try:
        payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
        return upsert_telegram_user_from_init_data(payload)
    except (TelegramAuthError, KeyError, ValueError) as exc:
        raise exceptions.PermissionDenied(str(exc)) from exc


def _require_organizer(user):
    membership = Membership.objects.select_related("group").filter(user=user).first()
    organizer_roles = {Membership.Role.ORGANIZER, Membership.Role.ADMIN}
    if not membership or membership.role not in organizer_roles:
        raise exceptions.PermissionDenied("Только организатор может выполнять это действие.")
    return membership


def _current_event(group):
    return group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first() or group.events.order_by(
        "-created_at"
    ).first()


def _event_response_payload(event):
    return {
        "id": str(event.id),
        "title": event.title,
        "description": event.description,
        "date": event.event_date.isoformat() if event.event_date else "",
        "dateLabel": _ru_date(event.event_date) if event.event_date else "",
        "school": event.group.name,
        "payment": {
            "phone": event.payment_phone,
            "holder": event.payment_holder,
        },
    }


def _participation_response_payload(participation):
    return {
        "id": str(participation.id),
        "status": participation.status,
        "participation": PARTICIPATION_STATUS_TO_CLIENT[participation.status],
    }


def _parse_event_date(raw_value):
    try:
        return date.fromisoformat(raw_value) if raw_value else None
    except (TypeError, ValueError):
        return None


def _text(raw_value):
    return "" if raw_value is None else str(raw_value).strip()


class CurrentEventView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)

        if _current_event(membership.group):
            return response.Response(
                {"detail": "Событие уже создано."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = _text(request.data.get("title", ""))
        if not title:
            return response.Response(
                {"detail": "Укажите название события."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_date_raw = request.data.get("eventDate")
        parsed_date = _parse_event_date(event_date_raw)
        if event_date_raw not in (None, "") and parsed_date is None:
            return response.Response(
                {"detail": "Неверный формат даты. Используйте YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = Event.objects.create(
            group=membership.group,
            title=title,
            description=_text(request.data.get("description", "")),
            event_date=parsed_date,
            payment_phone=_text(request.data.get("paymentPhone", "")),
            payment_holder=_text(request.data.get("paymentHolder", "")),
            status=Event.Status.ACTIVE,
        )
        return response.Response(_event_response_payload(event), status=status.HTTP_201_CREATED)

    def patch(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)

        event = _current_event(membership.group)
        if not event:
            return response.Response(
                {"detail": "Событие не найдено."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "title" in request.data:
            title = _text(request.data["title"])
            if not title:
                return response.Response(
                    {"detail": "Укажите название события."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            event.title = title

        if "eventDate" in request.data:
            event_date_raw = request.data["eventDate"]
            parsed_date = _parse_event_date(event_date_raw)
            if event_date_raw not in (None, "") and parsed_date is None:
                return response.Response(
                    {"detail": "Неверный формат даты. Используйте YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            event.event_date = parsed_date

        if "description" in request.data:
            event.description = _text(request.data["description"])
        if "paymentPhone" in request.data:
            event.payment_phone = _text(request.data["paymentPhone"])
        if "paymentHolder" in request.data:
            event.payment_holder = _text(request.data["paymentHolder"])

        event.save()
        return response.Response(_event_response_payload(event))


class CurrentParticipationView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request):
        user = _telegram_user(request)
        membership = Membership.objects.select_related("group").filter(user=user).first()
        if not membership:
            raise exceptions.PermissionDenied("Пользователь не состоит в группе.")

        event = _current_event(membership.group)
        if not event:
            return response.Response(
                {"detail": "Сначала создайте событие."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_status = str(request.data.get("status", "")).strip()
        participation_status = PARTICIPATION_STATUS_FROM_CLIENT.get(requested_status)
        if not participation_status:
            return response.Response(
                {"detail": "Некорректный статус участия."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation, _created = Participation.objects.get_or_create(
            event=event,
            user=user,
            defaults={"status": participation_status},
        )
        if participation.status != participation_status:
            participation.status = participation_status
            participation.save(update_fields=["status", "updated_at"])

        return response.Response(_participation_response_payload(participation))


PAYMENT_SHARE_FROM_CLIENT = {
    "regular": Participation.PaymentShare.REGULAR,
    "noalco": Participation.PaymentShare.NO_ALCOHOL,
    "individual": Participation.PaymentShare.INDIVIDUAL,
    "exempt": Participation.PaymentShare.EXEMPT,
}

PAYMENT_SHARE_TO_CLIENT = {v: k for k, v in PAYMENT_SHARE_FROM_CLIENT.items()}


class ParticipationOrganizerView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)

        event = _current_event(membership.group)
        if not event:
            return response.Response(
                {"detail": "Событие не найдено."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_id = str(request.data.get("userId", "")).strip()
        if not user_id:
            return response.Response(
                {"detail": "Укажите userId."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_share_key = str(request.data.get("paymentShare", "")).strip()
        if payment_share_key not in PAYMENT_SHARE_FROM_CLIENT:
            return response.Response(
                {"detail": "Некорректная категория оплаты."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation = Participation.objects.filter(event=event, user__id=user_id).first()
        if not participation:
            return response.Response(
                {"detail": "Участник не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )

        participation.payment_share = PAYMENT_SHARE_FROM_CLIENT[payment_share_key]

        if payment_share_key == "individual":
            try:
                custom_amount = int(request.data.get("customShareAmount", 0))
            except (TypeError, ValueError):
                custom_amount = 0
            participation.custom_share_amount = max(0, custom_amount)
        else:
            participation.custom_share_amount = 0

        participation.save(update_fields=["payment_share", "custom_share_amount", "updated_at"])

        return response.Response({
            "id": str(participation.user.id),
            "paymentShare": payment_share_key,
            "customShareAmount": participation.custom_share_amount,
        })


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("group").all()
    serializer_class = EventSerializer


class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.select_related("event", "user").all()
    serializer_class = ParticipationSerializer
