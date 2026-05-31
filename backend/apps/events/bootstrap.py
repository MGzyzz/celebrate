from django.db.models import Count
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Membership
from apps.accounts.serializers import TelegramUserSerializer
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, PriceItem
from apps.places.models import PlaceIdea


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
                    "me": self._user_payload(user),
                    "needsGroupCode": not group,
                    "event": None,
                    "places": [],
                    "collections": [],
                    "items": [],
                    "participants": [],
                    "myInvoice": None,
                }
            )

        fundraisings = list(event.fundraisings.all().order_by("-created_at"))
        active_fundraising = fundraisings[0] if fundraisings else None

        return Response(
            {
                "user": TelegramUserSerializer(user).data,
                "event": self._event_payload(event),
                "me": self._me_payload(user, event),
                "places": [self._place_payload(place, index, user) for index, place in enumerate(self._places(event))],
                "collections": [self._fundraising_payload(fundraising) for fundraising in fundraisings],
                "items": [self._item_payload(item) for item in self._items(active_fundraising)],
                "participants": [self._participant_payload(participation, active_fundraising) for participation in self._participants(event)],
                "myInvoice": self._invoice_payload(user, active_fundraising),
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
            "school": event.group.name,
            "date": event.event_date.isoformat() if event.event_date else "",
            "dateLabel": event.event_date.strftime("%d.%m.%Y") if event.event_date else "",
            "payment": {
                "phone": event.payment_phone,
                "holder": event.payment_holder,
            },
        }

    @staticmethod
    def _user_payload(user):
        return {
            "id": str(user.id),
            "name": user.first_name,
            "role": Membership.Role.PARTICIPANT,
            "participation": "none",
        }

    @staticmethod
    def _me_payload(user, event):
        participation = event.participations.filter(user=user).first()
        membership = Membership.objects.filter(user=user, group=event.group).first()
        role = (
            Membership.Role.ORGANIZER
            if membership and membership.role in {Membership.Role.ORGANIZER, Membership.Role.ADMIN}
            else Membership.Role.PARTICIPANT
        )
        return {
            "id": str(user.id),
            "name": user.first_name,
            "role": role,
            "participation": participation.status if participation else Participation.Status.UNKNOWN,
        }

    @staticmethod
    def _places(event):
        return event.place_ideas.annotate(votes_count=Count("votes")).order_by("-votes_count", "-created_at")

    @staticmethod
    def _place_payload(place, index, user):
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
            "votes": place.votes_count,
            "supported": place.votes.filter(user=user).exists(),
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
        return fundraising.items.select_related("category", "author").prefetch_related("supports").order_by("-created_at")

    @staticmethod
    def _item_payload(item):
        item_type = "group" if item.item_type == PriceItem.ItemType.SELECTED_GROUP else item.item_type
        return {
            "id": str(item.id),
            "name": item.title,
            "cat": item.category.name,
            "type": item_type,
            "qty": item.quantity,
            "unit": item.unit,
            "price": item.unit_price,
            "approved": item.status == PriceItem.Status.APPROVED,
            "by": item.author.first_name if item.author else "",
            "support": item.supports.count(),
        }

    @staticmethod
    def _participants(event):
        return event.participations.select_related("user").order_by("user__first_name")

    @staticmethod
    def _participant_payload(participation, fundraising):
        invoice = None
        if fundraising:
            invoice = fundraising.invoices.filter(user=participation.user).first()

        return {
            "id": str(participation.user.id),
            "name": str(participation.user),
            "participation": {
                Participation.Status.PARTICIPATING: "in",
                Participation.Status.NOT_PARTICIPATING: "out",
                Participation.Status.THINKING: "maybe",
                Participation.Status.UNKNOWN: "none",
            }[participation.status],
            "payCat": {
                Participation.PaymentShare.REGULAR: "regular",
                Participation.PaymentShare.NO_ALCOHOL: "noalco",
                Participation.PaymentShare.INDIVIDUAL: "individual",
                Participation.PaymentShare.EXEMPT: "exempt",
            }[participation.payment_share],
            "paid": invoice.status == Invoice.Status.PAID if invoice else False,
            "invoice": invoice.amount if invoice else 0,
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
