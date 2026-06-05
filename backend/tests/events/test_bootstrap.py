import pytest
from datetime import date

from apps.events.bootstrap import BootstrapView, _ru_date
from django.test.utils import CaptureQueriesContext
from django.db import connection

from apps.accounts.models import Membership, TelegramUser
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, PriceItem
from apps.places.models import PlaceIdea, PlaceVote
from conftest import make_participant


# ── Task 3: dateLabel tests ───────────────────────────────────────────────────

def test_ru_date_june():
    assert _ru_date(date(2026, 6, 20)) == "20 июня 2026"


def test_ru_date_january():
    assert _ru_date(date(2026, 1, 5)) == "5 января 2026"


def test_ru_date_december():
    assert _ru_date(date(2025, 12, 31)) == "31 декабря 2025"


# ── Task 4: N+1 tests ────────────────────────────────────────────────────────


def _make_place(event, author, idx):
    return PlaceIdea.objects.create(
        event=event,
        author=author,
        title=f"Place {idx}",
        address=f"Addr {idx}",
        status=PlaceIdea.Status.PROPOSED,
        interest_color=PlaceIdea.InterestColor.BLUE,
    )


@pytest.mark.django_db
def test_compute_user_voted_ids_is_single_query(group, event):
    """_compute_user_voted_ids must issue exactly 1 SQL query regardless of place count."""
    organizer = TelegramUser.objects.create(telegram_id=8001, first_name="Org")
    Membership.objects.create(user=organizer, group=group, role=Membership.Role.ORGANIZER)
    for i in range(5):
        _make_place(event, organizer, i)

    with CaptureQueriesContext(connection) as ctx:
        BootstrapView._compute_user_voted_ids(event, organizer)

    assert len(ctx.captured_queries) == 1


@pytest.mark.django_db
def test_build_invoice_map_is_single_query(group, event, fundraising):
    """_build_invoice_map must issue exactly 1 SQL query regardless of participant count."""
    for i in range(10):
        p = make_participant(group, event, 7000 + i, f"P{i}")
        Invoice.objects.create(
            fundraising=fundraising,
            user=p,
            amount=10000,
            status=Invoice.Status.PENDING,
        )

    with CaptureQueriesContext(connection) as ctx:
        BootstrapView._build_invoice_map(fundraising)

    assert len(ctx.captured_queries) == 1


@pytest.mark.django_db
def test_build_invoice_map_returns_empty_for_none():
    """_build_invoice_map(None) must return empty dict without error."""
    result = BootstrapView._build_invoice_map(None)
    assert result == {}


@pytest.mark.django_db
def test_me_payload_defaults_participant_to_in(group, event):
    """A participant without a Participation row is created as participating by default."""
    user = TelegramUser.objects.create(telegram_id=8101, first_name="NewParticipant")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)

    payload = BootstrapView._me_payload(user, event)

    assert payload["participation"] == "in"
    participation = Participation.objects.get(event=event, user=user)
    assert participation.status == Participation.Status.PARTICIPATING


@pytest.mark.django_db
def test_me_payload_maps_existing_backend_status(group, event):
    """Backend statuses must be converted to frontend status keys."""
    user = make_participant(group, event, 8102, "Thinking", status=Participation.Status.THINKING)

    payload = BootstrapView._me_payload(user, event)

    assert payload["participation"] == "maybe"


@pytest.mark.django_db
def test_item_payload_includes_source_place_id(group, event, fundraising, category):
    place = PlaceIdea.objects.create(
        event=event,
        title="Test Place",
        estimated_price=100000,
        status=PlaceIdea.Status.PROPOSED,
    )
    item = PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Test Place",
        quantity=1,
        unit="аренда",
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.PROPOSED,
        source_place=place,
    )
    payload = BootstrapView._item_payload(item)
    assert payload["source_place_id"] == str(place.pk)


@pytest.mark.django_db
def test_item_payload_source_place_id_none_when_not_set(fundraising, category):
    item = PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Regular Item",
        quantity=1,
        unit="шт",
        unit_price=5000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.PROPOSED,
    )
    payload = BootstrapView._item_payload(item)
    assert payload["source_place_id"] is None


@pytest.mark.django_db
def test_place_payload_includes_photo(group, event, organizer_user):
    place = PlaceIdea.objects.create(
        event=event,
        author=organizer_user,
        title="Фото место",
        estimated_price=100000,
        status=PlaceIdea.Status.PROPOSED,
        photo_url="https://example.com/photo.jpg",
    )
    payload = BootstrapView._place_payload(place, 0, set())
    assert payload["photo"] == "https://example.com/photo.jpg"


@pytest.mark.django_db
def test_place_payload_photo_none_when_empty(group, event, organizer_user):
    place = PlaceIdea.objects.create(
        event=event,
        author=organizer_user,
        title="Без фото",
        estimated_price=100000,
        status=PlaceIdea.Status.PROPOSED,
        photo_url="",
    )
    payload = BootstrapView._place_payload(place, 0, set())
    assert payload["photo"] is None
