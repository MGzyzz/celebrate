import pytest
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
