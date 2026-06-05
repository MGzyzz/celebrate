from django.db.models import Count
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Membership
from apps.accounts.serializers import TelegramUserSerializer
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem
from apps.places.models import PlaceIdea, PlaceVote


PARTICIPATION_STATUS_TO_CLIENT = {
    Participation.Status.PARTICIPATING: "in",
    Participation.Status.NOT_PARTICIPATING: "out",
    Participation.Status.THINKING: "maybe",
    Participation.Status.UNKNOWN: "none",
}

_RU_MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


def _ru_date(d) -> str:
    return f"{d.day} {_RU_MONTHS[d.month - 1]} {d.year}"


class BootstrapView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
            user = upsert_telegram_user_from_init_data(payload)
        except (TelegramAuthError, KeyError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=403)

        group = self._get_group(user)
        event = self._get_event(group)
        if not group or not event:
            return Response(
                {
                    "user": TelegramUserSerializer(user).data,
                    "me": self._user_payload(user, group),
                    "needsGroupCode": not group,
                    "event": None,
                    "places": [],
                    "collections": [],
                    "items": [],
                    "participants": [],
                    "myInvoice": None,
                    "categories": [],
                }
            )

        fundraisings = list(event.fundraisings.all().order_by("-created_at"))
        active_fundraising = fundraisings[0] if fundraisings else None

        user_voted_ids = self._compute_user_voted_ids(event, user)
        invoice_map = self._build_invoice_map(active_fundraising)

        return Response(
            {
                "user": TelegramUserSerializer(user).data,
                "event": self._event_payload(event),
                "me": self._me_payload(user, event),
                "places": [self._place_payload(place, index, user_voted_ids) for index, place in enumerate(self._places(event))],
                "collections": [self._fundraising_payload(fundraising) for fundraising in fundraisings],
                "items": [self._item_payload(item) for item in self._items(active_fundraising)],
                "participants": [self._participant_payload(p, invoice_map.get(p.user_id)) for p in self._participants(event)],
                "myInvoice": self._invoice_payload(user, active_fundraising),
                "categories": [
                    {"id": str(cat.pk), "name": cat.name, "itemCount": cat.item_count}
                    for cat in ItemCategory.objects.filter(group=group).annotate(
                        item_count=Count("items")
                    ).order_by("sort_order", "name")
                ],
            }
        )

    @staticmethod
    def _get_group(user):
        membership = Membership.objects.select_related("group").filter(user=user).first()
        if membership:
            return membership.group
        return None

    @staticmethod
    def _get_event(group):
        if not group:
            return None
        return group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first() or group.events.order_by(
            "-created_at"
        ).first()

    @staticmethod
    def _event_payload(event):
        return {
            "id": str(event.id),
            "title": event.title,
            "description": event.description,
            "school": event.group.name,
            "date": event.event_date.isoformat() if event.event_date else "",
            "dateLabel": _ru_date(event.event_date) if event.event_date else "",
            "payment": {
                "phone": event.payment_phone,
                "holder": event.payment_holder,
            },
        }

    @staticmethod
    def _user_payload(user, group=None):
        role = Membership.Role.PARTICIPANT
        if group:
            membership = Membership.objects.filter(user=user, group=group).first()
            if membership and membership.role in {Membership.Role.ORGANIZER, Membership.Role.ADMIN}:
                role = Membership.Role.ORGANIZER
        return {
            "id": str(user.id),
            "name": user.first_name,
            "role": role,
            "participation": "in",
        }

    @staticmethod
    def _me_payload(user, event):
        membership = Membership.objects.filter(user=user, group=event.group).first()
        role = (
            Membership.Role.ORGANIZER
            if membership and membership.role in {Membership.Role.ORGANIZER, Membership.Role.ADMIN}
            else Membership.Role.PARTICIPANT
        )
        participation = event.participations.filter(user=user).first()
        if not participation and role == Membership.Role.PARTICIPANT:
            participation = Participation.objects.create(
                event=event,
                user=user,
                status=Participation.Status.PARTICIPATING,
            )
        return {
            "id": str(user.id),
            "name": user.first_name,
            "role": role,
            "participation": (
                PARTICIPATION_STATUS_TO_CLIENT[participation.status]
                if participation
                else PARTICIPATION_STATUS_TO_CLIENT[Participation.Status.UNKNOWN]
            ),
        }

    @staticmethod
    def _places(event):
        return event.place_ideas.annotate(votes_count=Count("votes")).order_by("-votes_count", "-created_at")

    @staticmethod
    def _compute_user_voted_ids(event, user) -> set:
        return set(
            PlaceVote.objects.filter(place__event=event, user=user).values_list("place_id", flat=True)
        )

    @staticmethod
    def _build_invoice_map(fundraising) -> dict:
        if not fundraising:
            return {}
        return {inv.user_id: inv for inv in Invoice.objects.filter(fundraising=fundraising)}

    @staticmethod
    def _place_payload(place, index, user_voted_ids: set):
        # Temporary visual coordinates for the placeholder map until real Yandex Maps is connected.
        x = 24 + (index * 13) % 56
        y = 24 + (index * 17) % 52
        return {
            "id": str(place.id),
            "name": place.title,
            "interest": {
                "gray": "low",
                "blue": "new",
                "green": "high",
                "yellow": "debate",
                "red": "problem",
            }.get(place.interest_color, "new"),
            "votes": getattr(place, "votes_count", 0),
            "supported": place.id in user_voted_ids,
            "address": place.address,
            "district": place.address,
            "price": place.estimated_price,
            "capacity": place.capacity,
            "lat": float(place.latitude) if place.latitude is not None else None,
            "lng": float(place.longitude) if place.longitude is not None else None,
            "x": x,
            "y": y,
            "desc": place.description,
            "amenities": place.amenities,
            "rent": place.rent_terms,
            "pros": [line for line in place.pros.splitlines() if line],
            "cons": [line for line in place.cons.splitlines() if line],
            "note": place.author_comment,
            "author": place.author.first_name if place.author else "",
            "photo": place.photo_url or None,
        }

    @staticmethod
    def _fundraising_payload(fundraising):
        approved_items = fundraising.items.filter(status=PriceItem.Status.APPROVED)
        proposed_items = fundraising.items.filter(status=PriceItem.Status.PROPOSED)
        approved_total = sum(item.total_price for item in approved_items)
        status = {
            Fundraising.Status.DRAFT: "draft",
            Fundraising.Status.ACTIVE: "active",
            Fundraising.Status.LOCKED: "locked",
            Fundraising.Status.FINISHED: "done",
            Fundraising.Status.CANCELLED: "cancelled",
        }[fundraising.status]
        return {
            "id": str(fundraising.id),
            "title": fundraising.title,
            "status": status,
            "deadline": fundraising.deadline.date().isoformat(),
            "planned": fundraising.target_amount,
            "approved": approved_total,
            "collected": sum(invoice.amount for invoice in fundraising.invoices.filter(status=Invoice.Status.PAID)),
            "itemsApproved": approved_items.count(),
            "itemsProposed": proposed_items.count(),
        }

    @staticmethod
    def _items(fundraising):
        if not fundraising:
            return []
        return fundraising.items.select_related("category", "author", "source_place").prefetch_related("supports").order_by("-created_at")

    @staticmethod
    def _item_payload(item):
        item_type = item.item_type
        _status_map = {
            PriceItem.Status.PROPOSED: "proposed",
            PriceItem.Status.APPROVED: "approved",
            PriceItem.Status.REJECTED: "rejected",
            PriceItem.Status.PURCHASED: "purchased",
        }
        return {
            "id": str(item.id),
            "name": item.title,
            "cat": item.category.name,
            "type": item_type,
            "qty": item.quantity,
            "unit": item.unit,
            "price": item.unit_price,
            "status": _status_map.get(item.status, "proposed"),
            "approved": item.status == PriceItem.Status.APPROVED,
            "by": item.author.first_name if item.author else "",
            "support": item.supports.count(),
            "source_place_id": str(item.source_place_id) if item.source_place_id else None,
        }

    @staticmethod
    def _participants(event):
        return event.participations.select_related("user").order_by("user__first_name")

    @staticmethod
    def _participant_payload(participation, invoice):
        return {
            "id": str(participation.user.id),
            "name": str(participation.user),
            "participation": PARTICIPATION_STATUS_TO_CLIENT[participation.status],
            "payCat": {
                Participation.PaymentShare.REGULAR: "regular",
                Participation.PaymentShare.NO_ALCOHOL: "noalco",
                Participation.PaymentShare.INDIVIDUAL: "individual",
                Participation.PaymentShare.EXEMPT: "exempt",
            }[participation.payment_share],
            "paid": invoice.status == Invoice.Status.PAID if invoice else False,
            "claimed": invoice.claimed_at is not None if invoice else False,
            "invoice": invoice.amount if invoice else 0,
            "customShareAmount": participation.custom_share_amount,
        }

    @staticmethod
    def _invoice_payload(user, fundraising):
        if not fundraising:
            return None
        invoice = fundraising.invoices.filter(user=user).first()
        if not invoice:
            return None
        return {
            "total": invoice.amount,
            "common": invoice.common_amount,
            "alcohol": invoice.alcohol_amount,
            "individual": invoice.individual_amount,
            "deadline": fundraising.deadline.date().isoformat(),
            "paid": invoice.status == Invoice.Status.PAID,
            "individualItems": [],
        }
