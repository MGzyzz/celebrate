import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.fundraising.models import ItemCategory, PriceItem

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
def approved_item(organizer_user, fundraising, category):
    return PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Торт",
        quantity=1,
        unit="шт",
        unit_price=15000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )


@pytest.mark.django_db
def test_organizer_can_delete_approved_item(monkeypatch, organizer_user, approved_item):
    client = _client(monkeypatch, organizer_user)
    resp = client.delete(f"/api/price-items/{approved_item.pk}/")
    assert resp.status_code == 204
    assert not PriceItem.objects.filter(pk=approved_item.pk).exists()


@pytest.mark.django_db
def test_participant_cannot_delete_item(monkeypatch, group, event, fundraising, approved_item):
    participant = TelegramUser.objects.create(telegram_id=8001, first_name="Part")
    Membership.objects.create(user=participant, group=group, role=Membership.Role.PARTICIPANT)
    client = _client(monkeypatch, participant)
    resp = client.delete(f"/api/price-items/{approved_item.pk}/")
    assert resp.status_code == 403
    assert PriceItem.objects.filter(pk=approved_item.pk).exists()


@pytest.mark.django_db
def test_delete_nonexistent_item_returns_404(monkeypatch, organizer_user):
    client = _client(monkeypatch, organizer_user)
    resp = client.delete("/api/price-items/99999/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_organizer_cannot_delete_other_groups_item(monkeypatch, organizer_user, approved_item):
    from apps.accounts.models import StudentGroup
    other_group = StudentGroup.objects.create(name="Other Group")
    other_org = TelegramUser.objects.create(telegram_id=8002, first_name="OtherOrg")
    Membership.objects.create(user=other_org, group=other_group, role=Membership.Role.ORGANIZER)
    client = _client(monkeypatch, other_org)
    resp = client.delete(f"/api/price-items/{approved_item.pk}/")
    assert resp.status_code == 403
    assert PriceItem.objects.filter(pk=approved_item.pk).exists()
