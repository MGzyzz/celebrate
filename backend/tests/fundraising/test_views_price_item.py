import pytest
from unittest.mock import patch
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.test import APIClient

from apps.fundraising.models import PriceItem
from conftest import make_participant

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


@pytest.mark.django_db
def test_price_item_validation_error_returns_400(monkeypatch, group, event, fundraising, category):
    """If PriceItem.save() raises DjangoValidationError, view must return 400 not 500."""
    user = make_participant(group, event, 9001, "Alice")
    client = _client(monkeypatch, user)

    with patch("apps.fundraising.models.PriceItem.save", side_effect=DjangoValidationError("Budget exceeded.")):
        resp = client.post(
            "/api/price-items/current/",
            {
                "title": "Test item",
                "category": "General",
                "quantity": 1,
                "unit": "шт",
                "unitPrice": 1000,
                "itemType": "common",
            },
            format="json",
        )

    assert resp.status_code == 400
    assert "Budget exceeded." in resp.data["detail"]


@pytest.mark.django_db
def test_organizer_item_auto_approved(monkeypatch, organizer_user, group, event, fundraising, category):
    """Items created by an organizer must be immediately approved, not proposed."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        "/api/price-items/current/",
        {
            "title": "Организаторский товар",
            "category": "General",
            "quantity": 1,
            "unit": "шт",
            "unitPrice": 5000,
            "itemType": "common",
        },
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["status"] == PriceItem.Status.APPROVED


@pytest.mark.django_db
def test_participant_item_stays_proposed(monkeypatch, group, event, fundraising, category):
    """Items created by a participant must remain in proposed state."""
    user = make_participant(group, event, 9002, "Bob")
    client = _client(monkeypatch, user)
    resp = client.post(
        "/api/price-items/current/",
        {
            "title": "Участнический товар",
            "category": "General",
            "quantity": 1,
            "unit": "шт",
            "unitPrice": 3000,
            "itemType": "common",
        },
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["status"] == PriceItem.Status.PROPOSED
