import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, StudentGroup
from apps.events.models import Event
from apps.fundraising.models import Fundraising, ItemCategory, PriceItem

FAKE_INIT = "fake-init-data"


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
def item(fundraising, category, organizer_user):
    return PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Торт",
        quantity=1,
        unit="шт",
        unit_price=50000,
        status=PriceItem.Status.PROPOSED,
    )


@pytest.mark.django_db
def test_organizer_can_approve_proposed_item(monkeypatch, organizer_user, item):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(f"/api/price-items/{item.pk}/approve/")
    assert resp.status_code == 200
    item.refresh_from_db()
    assert item.status == PriceItem.Status.APPROVED


@pytest.mark.django_db
def test_organizer_can_reject_proposed_item(monkeypatch, organizer_user, item):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(f"/api/price-items/{item.pk}/reject/")
    assert resp.status_code == 200
    item.refresh_from_db()
    assert item.status == PriceItem.Status.REJECTED


@pytest.mark.django_db
def test_participant_cannot_approve_item(monkeypatch, fundraising, category, group):
    from apps.accounts.models import TelegramUser
    participant = TelegramUser.objects.create(telegram_id=9001, first_name="Student")
    Membership.objects.create(user=participant, group=group, role=Membership.Role.PARTICIPANT)
    item = PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Шарики",
        quantity=10,
        unit="шт",
        unit_price=500,
        status=PriceItem.Status.PROPOSED,
    )
    client = _client(monkeypatch, participant)
    resp = client.post(f"/api/price-items/{item.pk}/approve/")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_approve_nonexistent_item_returns_404(monkeypatch, organizer_user):
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/price-items/99999/approve/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_approve_item_exceeding_budget_returns_400(monkeypatch, organizer_user, fundraising, category):
    """Approving an item whose total would exceed the fundraising target returns 400."""
    expensive = PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Дорогой товар",
        quantity=1,
        unit="шт",
        unit_price=fundraising.target_amount + 1,
        status=PriceItem.Status.PROPOSED,
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.post(f"/api/price-items/{expensive.pk}/approve/")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_organizer_cannot_approve_item_from_other_group(monkeypatch, organizer_user):
    other_group = StudentGroup.objects.create(name="Other Group")
    other_event = Event.objects.create(group=other_group, title="Other Event", status=Event.Status.ACTIVE)
    from django.utils import timezone
    from datetime import timedelta
    other_fund = Fundraising.objects.create(
        event=other_event,
        title="Other Fund",
        target_amount=100000,
        deadline=timezone.now() + timedelta(days=10),
        status=Fundraising.Status.ACTIVE,
    )
    other_cat = ItemCategory.objects.create(group=other_group, name="Other")
    other_item = PriceItem.objects.create(
        fundraising=other_fund,
        category=other_cat,
        title="Чужой товар",
        quantity=1,
        unit="шт",
        unit_price=1000,
        status=PriceItem.Status.PROPOSED,
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.post(f"/api/price-items/{other_item.pk}/approve/")
    assert resp.status_code == 403
