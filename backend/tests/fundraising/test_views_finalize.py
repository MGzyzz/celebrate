import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TelegramUser
from apps.fundraising.models import Fundraising, ItemCategory, PriceItem
from apps.events.models import Participation
from conftest import make_participant

FAKE_INIT = "fake-init-data"
URL = "/api/fundraisings/current/finalize/"


def _client(monkeypatch, user):
    from apps.accounts import middleware as mw
    from apps.accounts import services as svc
    import apps.fundraising.views as fv

    tg_validate = lambda _: {"id": user.telegram_id}
    tg_upsert = lambda _: user

    monkeypatch.setattr(svc, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", tg_upsert)
    monkeypatch.setattr(mw, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(fv, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(fv, "upsert_telegram_user_from_init_data", tg_upsert)

    c = APIClient()
    c.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return c


@pytest.fixture
def approved_item(fundraising, category, organizer_user):
    return PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Торт",
        quantity=1,
        unit="шт",
        unit_price=10000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )


@pytest.mark.django_db
def test_finalize_success(monkeypatch, organizer_user, group, event, fundraising, approved_item):
    """Organizer with approved items and participants gets 200 with invoice list."""
    participant = make_participant(group, event, 5001, "Alice")
    client = _client(monkeypatch, organizer_user)

    resp = client.post(URL)

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    invoice = data[0]
    assert invoice["userId"] == str(participant.id)
    assert invoice["name"] == str(participant)
    assert invoice["amount"] == 10000
    assert "common" in invoice
    assert "alcohol" in invoice
    assert "individual" in invoice


@pytest.mark.django_db
def test_finalize_no_approved_items(monkeypatch, organizer_user, group, event, fundraising, category):
    """Fundraising with no approved items returns 400 mentioning 'товар'."""
    # Only a proposed (not approved) item
    PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Шарики",
        quantity=5,
        unit="шт",
        unit_price=200,
        status=PriceItem.Status.PROPOSED,
    )
    make_participant(group, event, 5002, "Bob")
    client = _client(monkeypatch, organizer_user)

    resp = client.post(URL)

    assert resp.status_code == 400
    assert "товар" in resp.json()["detail"].lower()


@pytest.mark.django_db
def test_finalize_no_participants(monkeypatch, organizer_user, group, event, fundraising, approved_item):
    """Approved items but no participating users returns 400 mentioning 'участник'."""
    # No participants added
    client = _client(monkeypatch, organizer_user)

    resp = client.post(URL)

    assert resp.status_code == 400
    assert "участник" in resp.json()["detail"].lower()


@pytest.mark.django_db
def test_finalize_participant_cannot_finalize(monkeypatch, group, event, fundraising, approved_item):
    """Participant user calling the finalize endpoint gets 403."""
    participant = make_participant(group, event, 5003, "Charlie")
    client = _client(monkeypatch, participant)

    resp = client.post(URL)

    assert resp.status_code == 403


@pytest.mark.django_db
def test_finalize_individual_item_charged_to_assigned_participant(
    monkeypatch, organizer_user, group, event, fundraising, approved_item, category
):
    """Individual item (assigned to Alice) adds its total to Alice's invoice only."""
    alice = make_participant(group, event, 5010, "Alice")
    bob = make_participant(group, event, 5011, "Bob")
    # Individual item assigned to Alice (organizer approves it)
    PriceItem.objects.create(
        fundraising=fundraising,
        author=alice,
        category=category,
        title="5 пицц для Алисы",
        quantity=5,
        unit="шт",
        unit_price=2000,
        item_type=PriceItem.ItemType.INDIVIDUAL,
        assigned_to=alice,
        status=PriceItem.Status.APPROVED,
    )

    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL)

    assert resp.status_code == 200
    invoices = {inv["userId"]: inv for inv in resp.json()}
    assert invoices[str(alice.id)]["individual"] == 10000  # 5 * 2000
    assert invoices[str(bob.id)]["individual"] == 0


@pytest.mark.django_db
def test_finalize_individual_item_unassigned_participant_not_affected(
    monkeypatch, organizer_user, group, event, fundraising, approved_item, category
):
    """Individual item for a non-participating user has no effect on any invoice."""
    participant = make_participant(group, event, 5012, "Charlie")
    non_participant = TelegramUser.objects.create(telegram_id=5013, first_name="Ghost")
    PriceItem.objects.create(
        fundraising=fundraising,
        author=non_participant,
        category=category,
        title="Товар призрака",
        quantity=1,
        unit="шт",
        unit_price=5000,
        item_type=PriceItem.ItemType.INDIVIDUAL,
        assigned_to=non_participant,
        status=PriceItem.Status.APPROVED,
    )

    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL)

    assert resp.status_code == 200
    invoices = {inv["userId"]: inv for inv in resp.json()}
    assert invoices[str(participant.id)]["individual"] == 0
