import pytest
from rest_framework.test import APIClient
from apps.accounts import middleware as mw
from apps.accounts import services as svc
import apps.fundraising.views as fv

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


@pytest.mark.django_db
def test_selected_group_type_rejected(monkeypatch, organizer_user, fundraising):
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/price-items/current/", {
        "title": "Торт",
        "category": "Еда",
        "quantity": 1,
        "unit": "шт",
        "unitPrice": 5000,
        "itemType": "selected_group",
    }, format="json")
    assert resp.status_code == 400
    assert "тип" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_group_alias_rejected(monkeypatch, organizer_user, fundraising):
    """Frontend may send 'group' — must also be rejected after cleanup."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/price-items/current/", {
        "title": "Торт",
        "category": "Еда",
        "quantity": 1,
        "unit": "шт",
        "unitPrice": 5000,
        "itemType": "group",
    }, format="json")
    assert resp.status_code == 400
