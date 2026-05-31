from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import decorators, exceptions, response, status, views, viewsets

from apps.accounts.models import Membership
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem, PriceItemSupport
from apps.fundraising.serializers import (
    FundraisingSerializer,
    InvoiceSerializer,
    ItemCategorySerializer,
    PriceItemSerializer,
    PriceItemSupportSerializer,
)
from apps.fundraising.services import finalize_fundraising, find_duplicate_items


def _telegram_user(request):
    try:
        payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
        return upsert_telegram_user_from_init_data(payload)
    except (TelegramAuthError, KeyError, ValueError) as exc:
        raise exceptions.PermissionDenied(str(exc)) from exc


def _current_membership(user):
    return Membership.objects.select_related("group").filter(user=user).first()


def _require_organizer(user):
    membership = _current_membership(user)
    organizer_roles = {Membership.Role.ORGANIZER, Membership.Role.ADMIN}
    if not membership or membership.role not in organizer_roles:
        raise exceptions.PermissionDenied("Только организатор может выполнять это действие.")
    return membership


def _current_event(group):
    return group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first() or group.events.order_by(
        "-created_at"
    ).first()


class ItemCategoryViewSet(viewsets.ModelViewSet):
    queryset = ItemCategory.objects.select_related("group").all()
    serializer_class = ItemCategorySerializer


class CurrentFundraisingCreateView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)
        event = _current_event(membership.group)
        if not event:
            return response.Response({"detail": "Сначала создайте событие."}, status=status.HTTP_400_BAD_REQUEST)

        title = str(request.data.get("title", "")).strip()
        description = str(request.data.get("description", "")).strip()
        try:
            target_amount = int(request.data.get("targetAmount", 0))
            deadline_days = int(request.data.get("deadlineDays", 0))
        except (TypeError, ValueError):
            return response.Response({"detail": "Бюджет и дедлайн должны быть целыми числами."}, status=status.HTTP_400_BAD_REQUEST)

        if not title:
            return response.Response({"detail": "Укажите название сбора."}, status=status.HTTP_400_BAD_REQUEST)
        if target_amount < 0:
            return response.Response({"detail": "Бюджет не может быть ниже 0."}, status=status.HTTP_400_BAD_REQUEST)
        if deadline_days < 1:
            return response.Response({"detail": "Дедлайн должен быть минимум 1 день."}, status=status.HTTP_400_BAD_REQUEST)

        fundraising = Fundraising.objects.create(
            event=event,
            title=title,
            description=description,
            target_amount=target_amount,
            deadline=timezone.now() + timedelta(days=deadline_days),
            status=Fundraising.Status.ACTIVE,
        )
        return response.Response(FundraisingSerializer(fundraising).data, status=status.HTTP_201_CREATED)


class CurrentPriceItemCreateView(views.APIView):
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

        fundraising = event.fundraisings.filter(status__in=[Fundraising.Status.ACTIVE, Fundraising.Status.DRAFT]).order_by(
            "-created_at"
        ).first()
        if not fundraising:
            return response.Response({"detail": "Сначала создайте активный сбор."}, status=status.HTTP_400_BAD_REQUEST)

        title = str(request.data.get("title", "")).strip()
        category_name = str(request.data.get("category", "other")).strip() or "other"
        unit = str(request.data.get("unit", "шт")).strip() or "шт"
        item_type = str(request.data.get("itemType", PriceItem.ItemType.COMMON)).strip()
        if item_type == "group":
            item_type = PriceItem.ItemType.SELECTED_GROUP

        try:
            quantity = int(request.data.get("quantity", 1))
            unit_price = int(request.data.get("unitPrice", 0))
        except (TypeError, ValueError):
            return response.Response({"detail": "Количество и цена должны быть целыми числами."}, status=status.HTTP_400_BAD_REQUEST)

        if not title:
            return response.Response({"detail": "Укажите название товара."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return response.Response({"detail": "Количество должно быть минимум 1."}, status=status.HTTP_400_BAD_REQUEST)
        if unit_price < 0:
            return response.Response({"detail": "Цена не может быть ниже 0."}, status=status.HTTP_400_BAD_REQUEST)
        if item_type not in PriceItem.ItemType.values:
            return response.Response({"detail": "Некорректный тип товара."}, status=status.HTTP_400_BAD_REQUEST)

        category, _ = ItemCategory.objects.get_or_create(group=membership.group, name=category_name)
        try:
            item = PriceItem.objects.create(
                fundraising=fundraising,
                author=user,
                category=category,
                title=title,
                quantity=quantity,
                unit=unit,
                unit_price=unit_price,
                item_type=item_type,
                status=PriceItem.Status.PROPOSED,
                comment=str(request.data.get("comment", "")).strip(),
                store_url=str(request.data.get("storeUrl", "")).strip(),
            )
        except DjangoValidationError as exc:
            return response.Response(
                {"detail": "; ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return response.Response(PriceItemSerializer(item).data, status=status.HTTP_201_CREATED)


class FundraisingViewSet(viewsets.ModelViewSet):
    queryset = Fundraising.objects.select_related("event", "event__group").all()
    serializer_class = FundraisingSerializer

    def perform_create(self, serializer):
        user = _telegram_user(self.request)
        membership = _require_organizer(user)
        event = serializer.validated_data["event"]
        if event.group_id != membership.group_id:
            raise exceptions.PermissionDenied("Нельзя создать сбор для другой группы.")
        serializer.save()

    @decorators.action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        user = _telegram_user(request)
        fundraising = self.get_object()
        membership = _require_organizer(user)
        if fundraising.event.group_id != membership.group_id:
            raise exceptions.PermissionDenied("Нельзя завершить сбор другой группы.")

        recipients_count = fundraising.event.participations.filter(status=Participation.Status.PARTICIPATING).count()
        approved_total = sum(
            item.total_price for item in fundraising.items.filter(status=PriceItem.Status.APPROVED)
        )
        if recipients_count == 0:
            return response.Response({"detail": "Некому отправлять счета."}, status=status.HTTP_400_BAD_REQUEST)
        if approved_total <= 0:
            return response.Response({"detail": "Нельзя финализировать сбор без утвержденных товаров."}, status=status.HTTP_400_BAD_REQUEST)

        invoices = finalize_fundraising(fundraising)
        return response.Response(InvoiceSerializer(invoices, many=True).data)


class PriceItemViewSet(viewsets.ModelViewSet):
    queryset = PriceItem.objects.select_related("fundraising", "author", "category").all()
    serializer_class = PriceItemSerializer

    @decorators.action(detail=False, methods=["get"])
    def duplicates(self, request):
        fundraising_id = request.query_params.get("fundraising")
        query = request.query_params.get("q", "")
        fundraising = Fundraising.objects.get(pk=fundraising_id)
        items = find_duplicate_items(fundraising, query)
        return response.Response(PriceItemSerializer(items, many=True).data)


class PriceItemSupportViewSet(viewsets.ModelViewSet):
    queryset = PriceItemSupport.objects.select_related("item", "user").all()
    serializer_class = PriceItemSupportSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("fundraising", "user").all()
    serializer_class = InvoiceSerializer
