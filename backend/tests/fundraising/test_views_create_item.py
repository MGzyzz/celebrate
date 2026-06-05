import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.fundraising.models import Fundraising, ItemCategory, PriceItem
from conftest import make_participant

FAKE_INIT = "fake-init-data"
URL = "/api/price-items/current/"


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


@pytest.mark.django_db
def test_individual_item_assigned_to_author(monkeypatch, group, event, fundraising, category):
    """INDIVIDUAL item: assigned_to is set to the author."""
    user = make_participant(group, event, 8001, "Alice")
    client = _client(monkeypatch, user)

    resp = client.post(URL, {
        "title": "5 пицц для себя",
        "category": "food",
        "quantity": 5,
        "unit": "шт",
        "unitPrice": 2000,
        "itemType": "individual",
    }, format="json")

    assert resp.status_code == 201
    item = PriceItem.objects.get(title="5 пицц для себя")
    assert item.assigned_to == user


@pytest.mark.django_db
def test_common_item_assigned_to_is_null(monkeypatch, group, event, fundraising, category):
    """COMMON item: assigned_to is null."""
    user = make_participant(group, event, 8002, "Bob")
    client = _client(monkeypatch, user)

    resp = client.post(URL, {
        "title": "Торт общий",
        "category": "food",
        "quantity": 1,
        "unit": "шт",
        "unitPrice": 10000,
        "itemType": "common",
    }, format="json")

    assert resp.status_code == 201
    item = PriceItem.objects.get(title="Торт общий")
    assert item.assigned_to is None
