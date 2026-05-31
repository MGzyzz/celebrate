from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Count
from rest_framework import decorators, exceptions, response, status, views, viewsets

from apps.accounts.models import Membership
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.models import Event
from apps.places.geocoding import geocode_place_with_diagnostics
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


def _parse_coordinate(value, field_name):
    if value in ("", None):
        return None, None
    try:
        return Decimal(str(value)), None
    except (InvalidOperation, TypeError, ValueError):
        return None, f"Некорректное значение {field_name}: {value}."


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
        yandex_uri = str(request.data.get("yandexUri", "")).strip()

        try:
            estimated_price = int(request.data.get("estimatedPrice", 0) or 0)
            capacity = int(request.data.get("capacity", 0) or 0)
        except (TypeError, ValueError):
            return response.Response({"detail": "Цена и вместимость должны быть целыми числами."}, status=status.HTTP_400_BAD_REQUEST)

        latitude, latitude_error = _parse_coordinate(request.data.get("latitude"), "latitude")
        longitude, longitude_error = _parse_coordinate(request.data.get("longitude"), "longitude")
        if latitude_error or longitude_error:
            return response.Response(
                {
                    "detail": latitude_error or longitude_error,
                    "source": "places.create.coordinates",
                    "code": "invalid_coordinates",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if latitude is None or longitude is None:
            if not settings.YANDEX_GEOCODER_API_KEY:
                return response.Response(
                    {
                        "detail": "Не удалось определить координаты: backend YANDEX_GEOCODER_API_KEY не настроен.",
                        "source": "places.create.geocoding",
                        "code": "yandex_key_missing",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            coords, geocoding_failure = geocode_place_with_diagnostics(title, address, yandex_uri)
            if not coords:
                return response.Response(
                    {
                        "detail": geocoding_failure.detail
                        if geocoding_failure
                        else "Не удалось определить координаты по названию и адресу. Уточните адрес или выберите подсказку Yandex.",
                        "source": "places.create.geocoding",
                        "code": geocoding_failure.code if geocoding_failure else "geocoding_failed",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            latitude, longitude = coords

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

    @decorators.action(detail=True, methods=["post"], authentication_classes=[], permission_classes=[])
    def support(self, request, pk=None):
        user = _telegram_user(request)
        place = self.get_object()
        membership = Membership.objects.filter(user=user, group=place.event.group).first()
        if not membership:
            raise exceptions.PermissionDenied("Пользователь не состоит в группе этого события.")

        vote, created = PlaceVote.objects.get_or_create(place=place, user=user)
        votes_count = place.votes.count()
        return response.Response(
            {
                "id": vote.id,
                "place": place.id,
                "created": created,
                "votes_count": votes_count,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PlaceVoteViewSet(viewsets.ModelViewSet):
    queryset = PlaceVote.objects.select_related("place", "user").all()
    serializer_class = PlaceVoteSerializer
