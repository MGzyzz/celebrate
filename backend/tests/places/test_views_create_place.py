import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser

FAKE_INIT = "fake-init-data"
URL = "/api/places/current/"


def _client(monkeypatch, user):
    from apps.accounts import middleware as mw
    from apps.accounts import services as svc
    import apps.places.views as pv

    tg_validate = lambda _: {"id": user.telegram_id}
    tg_upsert = lambda _: user

    monkeypatch.setattr(svc, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", tg_upsert)
    monkeypatch.setattr(mw, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(pv, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(pv, "upsert_telegram_user_from_init_data", tg_upsert)

    c = APIClient()
    c.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return c


@pytest.mark.django_db
def test_place_requires_estimated_price(monkeypatch, group, event):
    """Creating a place without estimatedPrice must return 400."""
    user = TelegramUser.objects.create(telegram_id=7001, first_name="User")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)
    client = _client(monkeypatch, user)
    resp = client.post(
        URL,
        {
            "title": "Лофт Высота",
            "address": "Алматы, Достык 5",
            "estimatedPrice": 0,
            "latitude": "43.2",
            "longitude": "76.9",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "стоимость" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_place_zero_price_rejected(monkeypatch, group, event):
    """estimatedPrice must be greater than 0 — missing field is also rejected."""
    user = TelegramUser.objects.create(telegram_id=7002, first_name="User2")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)
    client = _client(monkeypatch, user)
    resp = client.post(
        URL,
        {
            "title": "Бесплатный зал",
            "address": "Алматы, тест",
            "latitude": "43.2",
            "longitude": "76.9",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "стоимость" in resp.data["detail"].lower()
