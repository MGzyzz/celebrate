import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.events.models import Participation
from conftest import make_participant

FAKE_INIT = "fake-init-data"


def _client(monkeypatch, user):
    from apps.accounts import middleware as mw
    from apps.accounts import services as svc
    import apps.events.views as ev

    tg_validate = lambda _: {"id": user.telegram_id}
    tg_upsert = lambda _: user

    monkeypatch.setattr(svc, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", tg_upsert)
    monkeypatch.setattr(mw, "validate_telegram_init_data", tg_validate)
    monkeypatch.setattr(ev, "validate_telegram_init_data", tg_validate, raising=False)
    monkeypatch.setattr(ev, "upsert_telegram_user_from_init_data", tg_upsert, raising=False)

    client = APIClient()
    client.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return client


@pytest.mark.django_db
def test_update_payment_share_success(monkeypatch, organizer_user, group, event):
    """Organizer updates participant's paymentShare to 'noalco' → 200, DB updated."""
    participant = make_participant(group, event, 5001, "Alice")
    client = _client(monkeypatch, organizer_user)

    resp = client.patch(
        "/api/participation/organizer/",
        {"userId": str(participant.id), "paymentShare": "noalco"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["id"] == str(participant.id)
    assert resp.data["paymentShare"] == "noalco"

    participation = Participation.objects.get(event=event, user=participant)
    assert participation.payment_share == Participation.PaymentShare.NO_ALCOHOL


@pytest.mark.django_db
def test_update_payment_share_individual_with_amount(monkeypatch, organizer_user, group, event):
    """Organizer updates to 'individual' with customShareAmount=5000 → 200, custom_share_amount==5000 in DB."""
    participant = make_participant(group, event, 5002, "Bob")
    client = _client(monkeypatch, organizer_user)

    resp = client.patch(
        "/api/participation/organizer/",
        {"userId": str(participant.id), "paymentShare": "individual", "customShareAmount": 5000},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["paymentShare"] == "individual"
    assert resp.data["customShareAmount"] == 5000

    participation = Participation.objects.get(event=event, user=participant)
    assert participation.payment_share == Participation.PaymentShare.INDIVIDUAL
    assert participation.custom_share_amount == 5000


@pytest.mark.django_db
def test_update_invalid_share(monkeypatch, organizer_user, group, event):
    """Invalid paymentShare value → 400."""
    participant = make_participant(group, event, 5003, "Carol")
    client = _client(monkeypatch, organizer_user)

    resp = client.patch(
        "/api/participation/organizer/",
        {"userId": str(participant.id), "paymentShare": "badvalue"},
        format="json",
    )

    assert resp.status_code == 400
    assert "категори" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_participant_cannot_update(monkeypatch, group, event):
    """Non-organizer calling endpoint → 403."""
    participant = make_participant(group, event, 5004, "Dave")
    client = _client(monkeypatch, participant)

    resp = client.patch(
        "/api/participation/organizer/",
        {"userId": "1", "paymentShare": "noalco"},
        format="json",
    )

    assert resp.status_code == 403


@pytest.mark.django_db
def test_user_not_found(monkeypatch, organizer_user, group, event):
    """Unknown userId → 404."""
    client = _client(monkeypatch, organizer_user)

    resp = client.patch(
        "/api/participation/organizer/",
        {"userId": "99999", "paymentShare": "regular"},
        format="json",
    )

    assert resp.status_code == 404
    assert "участник" in resp.data["detail"].lower()
