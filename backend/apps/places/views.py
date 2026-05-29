from django.db.models import Count
from rest_framework import exceptions, response, status, views, viewsets

from apps.accounts.models import Membership
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.models import Event
from apps.places.models import PlaceIdea, PlaceVote
from apps.places.serializers import PlaceIdeaSerializer, PlaceVoteSerializer


def _telegram_user(request):
    try:
        payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
        return upsert_telegram_user_from_init_data(payload)
    except (TelegramAuthError, KeyError, ValueError) as exc:
        raise exceptions.PermissionDenied(str(exc)) from exc


def _current_membership(user):
    return Membership.objects.select_related("group").filter(user=user).first()


def _current_event(group):
    return group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first() or group.events.order_by(
        "-created_at"
    ).first()


class CurrentPlaceCreateView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        user = _telegram_user(request)
        membership = _current_membership(user)
        if not membership:
            raise exceptions.PermissionDenied("Пользователь не состоит в группе.")

        event = _current_event(membership.group)
        if not event:
            return response.Response({"detail": "Сначала создайте событие."}, status=status.HTTP_400_BAD_REQUEST)

        title = str(request.data.get("title", "")).strip()
        address = str(request.data.get("address", "")).strip()
        if not title:
            return response.Response({"detail": "Укажите название места."}, status=status.HTTP_400_BAD_REQUEST)
        if not address:
            return response.Response({"detail": "Укажите адрес места."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            estimated_price = int(request.data.get("estimatedPrice", 0) or 0)
            capacity = int(request.data.get("capacity", 0) or 0)
        except (TypeError, ValueError):
            return response.Response({"detail": "Цена и вместимость должны быть целыми числами."}, status=status.HTTP_400_BAD_REQUEST)

        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        place = PlaceIdea.objects.create(
            event=event,
            author=user,
            title=title,
            address=address,
            latitude=latitude if latitude not in ("", None) else None,
            longitude=longitude if longitude not in ("", None) else None,
            estimated_price=max(estimated_price, 0),
            capacity=max(capacity, 0),
            description=str(request.data.get("description", "")).strip(),
            amenities=request.data.get("amenities", []),
            author_comment=str(request.data.get("authorComment", "")).strip(),
            status=PlaceIdea.Status.PROPOSED,
            interest_color=PlaceIdea.InterestColor.BLUE,
        )
        return response.Response(PlaceIdeaSerializer(place).data, status=status.HTTP_201_CREATED)


class PlaceIdeaViewSet(viewsets.ModelViewSet):
    queryset = PlaceIdea.objects.select_related("event", "author").annotate(votes_count=Count("votes"))
    serializer_class = PlaceIdeaSerializer


class PlaceVoteViewSet(viewsets.ModelViewSet):
    queryset = PlaceVote.objects.select_related("place", "user").all()
    serializer_class = PlaceVoteSerializer
