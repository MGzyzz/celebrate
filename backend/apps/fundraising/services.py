from django.db import transaction
from django.utils import timezone

from apps.events.models import Participation
from apps.fundraising.models import Fundraising, Invoice, PriceItem


def find_duplicate_items(fundraising: Fundraising, query: str):
    normalized = " ".join(query.lower().split())
    if not normalized:
        return PriceItem.objects.none()
    return fundraising.items.filter(normalized_title__icontains=normalized).order_by("title")[:10]


@transaction.atomic
def finalize_fundraising(fundraising: Fundraising) -> list[Invoice]:
    participants = Participation.objects.select_related("user").filter(
        event=fundraising.event,
        status=Participation.Status.PARTICIPATING,
    ).order_by("pk")
    common_items = fundraising.items.filter(status=PriceItem.Status.APPROVED, item_type=PriceItem.ItemType.COMMON)
    alcohol_items = fundraising.items.filter(status=PriceItem.Status.APPROVED, item_type=PriceItem.ItemType.ALCOHOL)

    common_total = sum(item.total_price for item in common_items)
    alcohol_total = sum(item.total_price for item in alcohol_items)

    # INDIVIDUAL participants are included here: they pay common_share + custom_share_amount (their fixed
    # individual amount is added on top of the common split, not instead of it).
    regular_participants = [p for p in participants if p.payment_share != Participation.PaymentShare.EXEMPT]
    alcohol_participant_pks = {
        p.pk
        for p in regular_participants
        if p.payment_share not in {Participation.PaymentShare.NO_ALCOHOL, Participation.PaymentShare.EXEMPT}
    }

    common_share = common_total // len(regular_participants) if regular_participants else 0
    common_remainder = common_total % len(regular_participants) if regular_participants else 0
    alcohol_share = alcohol_total // len(alcohol_participant_pks) if alcohol_participant_pks else 0
    alcohol_remainder = alcohol_total % len(alcohol_participant_pks) if alcohol_participant_pks else 0

    invoices = []
    first_regular_done = False
    first_alcohol_done = False

    for participation in regular_participants:
        is_alcohol = participation.pk in alcohol_participant_pks

        c_extra = common_remainder if not first_regular_done else 0
        a_extra = alcohol_remainder if (is_alcohol and not first_alcohol_done) else 0

        common_amount = common_share + c_extra
        alcohol_amount = (alcohol_share + a_extra) if is_alcohol else 0
        individual_amount = participation.custom_share_amount
        amount = common_amount + alcohol_amount + individual_amount
        rounding_delta = c_extra + a_extra

        if not first_regular_done:
            first_regular_done = True
        if is_alcohol and not first_alcohol_done:
            first_alcohol_done = True

        invoice, _ = Invoice.objects.update_or_create(
            fundraising=fundraising,
            user=participation.user,
            defaults={
                "amount": amount,
                "common_amount": common_amount,
                "alcohol_amount": alcohol_amount,
                "individual_amount": individual_amount,
                "rounding_delta": rounding_delta,
                "status": Invoice.Status.PENDING,
            },
        )
        invoices.append(invoice)

    fundraising.status = Fundraising.Status.FINISHED
    fundraising.finalized_at = timezone.now()
    fundraising.save(update_fields=["status", "finalized_at", "updated_at"])
    return invoices
