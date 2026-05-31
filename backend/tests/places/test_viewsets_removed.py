import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.events.models import Event
from apps.places.models import PlaceIdea

FAKE_INIT = "fake-init-data"


def _client(monkeypatch, user):
    from apps.accounts import services as svc
    import apps.accounts.middleware as mw
    import apps.places.views as pv

    tg_validate = lambda _: {"id": user.telegram_id}
    tg_upsert = lambda _: user

    # Patch every module that imports these functions directly.
    monkeypatch.setattr(svc, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", tg_upsert)
    monkeypatch.setattr(mw, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(pv, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(pv, "upsert_telegram_user_from_init_data", tg_upsert)
    c = APIClient()
    c.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return c


@pytest.mark.django_db
def test_place_list_endpoint_removed(monkeypatch):
    """GET /api/places/ must return 404 after ViewSet removal (authenticated to bypass middleware)."""
    user = TelegramUser.objects.create(telegram_id=6001, first_name="TestUser")
    client = _client(monkeypatch, user)
    resp = client.get("/api/places/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_fundraising_list_endpoint_removed(monkeypatch):
    """GET /api/fundraisings/ must return 404 after ViewSet removal (authenticated to bypass middleware)."""
    user = TelegramUser.objects.create(telegram_id=6002, first_name="TestUser2")
    client = _client(monkeypatch, user)
    resp = client.get("/api/fundraisings/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_place_support_still_works(monkeypatch, group, event):
    """POST /api/places/{id}/support/ must still work for authenticated users."""
    user = TelegramUser.objects.create(telegram_id=5001, first_name="Voter")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)

    organizer = TelegramUser.objects.create(telegram_id=5002, first_name="Org")
    place = PlaceIdea.objects.create(
        event=event, author=organizer, title="Nice Venue",
        address="Test St 1", status=PlaceIdea.Status.PROPOSED,
        interest_color=PlaceIdea.InterestColor.BLUE,
    )

    client = _client(monkeypatch, user)
    resp = client.post(f"/api/places/{place.pk}/support/")
    assert resp.status_code in (200, 201)
    assert resp.data["created"] is True
