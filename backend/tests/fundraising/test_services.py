import pytest
from apps.events.models import Participation
from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem
from apps.fundraising.services import finalize_fundraising
from conftest import make_participant


@pytest.mark.django_db
def test_rounding_remainder_goes_to_first_invoice(group, event, fundraising, category):
    """100 000 ÷ 3 = 33333 r 1 → amounts must be [33333, 33333, 33334], total == 100000."""
    for i in range(3):
        make_participant(group, event, 2000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Table",
        quantity=1,
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    amounts = sorted(inv.amount for inv in invoices)
    assert amounts == [33333, 33333, 33334]
    assert sum(amounts) == 100000

    adjusted = next(inv for inv in invoices if inv.rounding_delta != 0)
    assert adjusted.rounding_delta == 1


@pytest.mark.django_db
def test_rounding_exact_division_no_delta(group, event, fundraising, category):
    """100 000 ÷ 4 = 25 000 exactly → all rounding_delta == 0."""
    for i in range(4):
        make_participant(group, event, 3000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Venue",
        quantity=1,
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    for inv in invoices:
        assert inv.amount == 25000
        assert inv.rounding_delta == 0


@pytest.mark.django_db
def test_total_always_preserved(group, event, fundraising, category):
    """Sum of all invoice amounts must equal approved_total for any participant count."""
    for i in range(7):
        make_participant(group, event, 4000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Food",
        quantity=1,
        unit_price=100003,  # 100003 ÷ 7 = 14286 r 1
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)
    assert sum(inv.amount for inv in invoices) == 100003


@pytest.mark.django_db
def test_alcohol_remainder_goes_to_first_alcohol_participant(group, event, fundraising, category):
    """100 000 ÷ 3 alcohol participants = 33333 r 1 → first alcohol participant's invoice gets +1 tenge."""
    users = [make_participant(group, event, 5000 + i, f"AlcUser{i}") for i in range(3)]
    # All 3 are regular (drink alcohol) by default

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Wine",
        quantity=1,
        unit_price=100000,
        item_type=PriceItem.ItemType.ALCOHOL,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    # 100000 % 3 = 1 → exactly one invoice carries the alcohol remainder of 1
    alcohol_deltas = [inv.rounding_delta for inv in invoices]
    assert alcohol_deltas.count(1) == 1
    assert alcohol_deltas.count(0) == 2

    amounts = sorted(inv.alcohol_amount for inv in invoices)
    assert amounts == [33333, 33333, 33334]
    assert sum(inv.amount for inv in invoices) == 100000


@pytest.mark.django_db
def test_alcohol_remainder_skips_no_alcohol_participant(group, event, fundraising, category):
    """When participant[0] is NO_ALCOHOL and participant[1] drinks, the alcohol remainder lands on participant[1]."""
    no_alc_user = make_participant(group, event, 6000, "NoAlcUser")
    alc_user1 = make_participant(group, event, 6001, "AlcUser1")
    alc_user2 = make_participant(group, event, 6002, "AlcUser2")

    # Mark the first participant as NO_ALCOHOL
    Participation.objects.filter(event=event, user=no_alc_user).update(
        payment_share=Participation.PaymentShare.NO_ALCOHOL
    )

    # 100 001 ÷ 2 alcohol participants = 50 000 r 1 → remainder goes to first alcohol drinker, not the NO_ALCOHOL one
    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Beer",
        quantity=1,
        unit_price=100001,
        item_type=PriceItem.ItemType.ALCOHOL,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    invoice_by_user = {inv.user_id: inv for inv in invoices}

    # NO_ALCOHOL participant should have zero alcohol_amount and zero rounding_delta from alcohol
    no_alc_invoice = invoice_by_user[no_alc_user.pk]
    assert no_alc_invoice.alcohol_amount == 0

    # The two alcohol drinkers split 100 001; one gets 50 001, the other 50 000
    alc_amounts = sorted(
        invoice_by_user[u.pk].alcohol_amount for u in (alc_user1, alc_user2)
    )
    assert alc_amounts == [50000, 50001]

    # The remainder (+1) must NOT be on the NO_ALCOHOL participant
    assert no_alc_invoice.rounding_delta == 0 or no_alc_invoice.alcohol_amount == 0
    assert sum(inv.alcohol_amount for inv in invoices) == 100001
