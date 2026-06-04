import pytest
from rest_framework.test import APIClient
from apps.accounts import middleware as mw
from apps.accounts import services as svc
import apps.fundraising.views as fv
from apps.fundraising.models import PriceItem

FAKE_INIT = "fake-init-data"


def _client(monkeypatch, user):
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
def proposed_item(fundraising, category, organizer_user):
    return PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Шампанское",
        quantity=12,
        unit="бут",
        unit_price=6000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.PROPOSED,
    )


@pytest.mark.django_db
def test_approve_without_type_keeps_original_type(monkeypatch, organizer_user, proposed_item):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(f"/api/price-items/{proposed_item.pk}/approve/", {}, format="json")
    assert resp.status_code == 200
    proposed_item.refresh_from_db()
    assert proposed_item.status == PriceItem.Status.APPROVED
    assert proposed_item.item_type == PriceItem.ItemType.COMMON


@pytest.mark.django_db
def test_approve_with_type_changes_type(monkeypatch, organizer_user, proposed_item):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        f"/api/price-items/{proposed_item.pk}/approve/",
        {"itemType": "alcohol"},
        format="json",
    )
    assert resp.status_code == 200
    proposed_item.refresh_from_db()
    assert proposed_item.status == PriceItem.Status.APPROVED
    assert proposed_item.item_type == PriceItem.ItemType.ALCOHOL


@pytest.mark.django_db
def test_approve_with_invalid_type_returns_400(monkeypatch, organizer_user, proposed_item):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        f"/api/price-items/{proposed_item.pk}/approve/",
        {"itemType": "selected_group"},
        format="json",
    )
    assert resp.status_code == 400
