import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.events.models import Event
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
def test_create_event_success(monkeypatch, organizer_user):
    """POST creates event and returns 201 with event payload."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        "/api/events/current/",
        {
            "title": "Выпускной 11А",
            "eventDate": "2026-06-20",
            "description": "Большой праздник",
            "paymentPhone": "+7 777 000 00 00",
            "paymentHolder": "Дана К.",
        },
        format="json",
    )

    assert resp.status_code == 201
    assert resp.data["title"] == "Выпускной 11А"
    assert resp.data["description"] == "Большой праздник"
    assert resp.data["date"] == "2026-06-20"
    assert resp.data["dateLabel"] == "20 июня 2026"
    assert resp.data["payment"]["phone"] == "+7 777 000 00 00"
    assert Event.objects.filter(title="Выпускной 11А").exists()


@pytest.mark.django_db
def test_create_event_no_title_returns_400(monkeypatch, organizer_user):
    """POST with empty title returns 400."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/events/current/", {"title": ""}, format="json")

    assert resp.status_code == 400
    assert "название" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_create_event_duplicate_returns_400(monkeypatch, organizer_user, event):
    """POST when event already exists returns 400."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/events/current/", {"title": "Дубль"}, format="json")

    assert resp.status_code == 400
    assert "уже создано" in resp.data["detail"]


@pytest.mark.django_db
def test_create_event_invalid_date_returns_400(monkeypatch, organizer_user):
    """POST with bad eventDate format returns 400."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        "/api/events/current/",
        {"title": "Выпускной", "eventDate": "not-a-date"},
        format="json",
    )

    assert resp.status_code == 400
    assert "дат" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_create_event_participant_returns_403(monkeypatch, group, event):
    """POST requires organizer/admin role."""
    participant = make_participant(group, event, 9911, "Participant")
    client = _client(monkeypatch, participant)
    resp = client.post("/api/events/current/", {"title": "Выпускной"}, format="json")

    assert resp.status_code == 403


@pytest.mark.django_db
def test_patch_event_success(monkeypatch, organizer_user, event):
    """PATCH updates existing event and returns 200."""
    client = _client(monkeypatch, organizer_user)
    resp = client.patch(
        "/api/events/current/",
        {
            "title": "Обновленное название",
            "description": "Новый текст",
            "eventDate": "",
            "paymentPhone": "+7 777 000 00 00",
            "paymentHolder": "",
        },
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["title"] == "Обновленное название"
    assert resp.data["description"] == "Новый текст"
    assert resp.data["date"] == ""
    assert resp.data["payment"]["phone"] == "+7 777 000 00 00"
    event.refresh_from_db()
    assert event.title == "Обновленное название"
    assert event.description == "Новый текст"
    assert event.event_date is None
    assert event.payment_phone == "+7 777 000 00 00"
    assert event.payment_holder == ""


@pytest.mark.django_db
def test_patch_event_no_event_returns_404(monkeypatch, organizer_user):
    """PATCH when no event exists returns 404."""
    client = _client(monkeypatch, organizer_user)
    resp = client.patch("/api/events/current/", {"title": "Title"}, format="json")

    assert resp.status_code == 404


@pytest.mark.django_db
def test_patch_current_participation_updates_status(monkeypatch, group, event):
    """PATCH persists current user's participation status."""
    user = make_participant(group, event, 9921, "Participant")
    client = _client(monkeypatch, user)

    resp = client.patch("/api/participation/current/", {"status": "out"}, format="json")

    assert resp.status_code == 200
    assert resp.data["participation"] == "out"
    participation = Participation.objects.get(event=event, user=user)
    assert participation.status == Participation.Status.NOT_PARTICIPATING


@pytest.mark.django_db
def test_patch_current_participation_creates_default_record(monkeypatch, group, event):
    """PATCH creates a participation row if a group member does not have one yet."""
    user = TelegramUser.objects.create(telegram_id=9922, first_name="NewParticipant")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)
    client = _client(monkeypatch, user)

    resp = client.patch("/api/participation/current/", {"status": "maybe"}, format="json")

    assert resp.status_code == 200
    assert resp.data["participation"] == "maybe"
    assert Participation.objects.get(event=event, user=user).status == Participation.Status.THINKING


@pytest.mark.django_db
def test_patch_current_participation_invalid_status_returns_400(monkeypatch, group, event):
    """PATCH rejects unknown frontend status values."""
    user = make_participant(group, event, 9923, "Participant")
    client = _client(monkeypatch, user)

    resp = client.patch("/api/participation/current/", {"status": "bad"}, format="json")

    assert resp.status_code == 400
    assert "статус" in resp.data["detail"].lower()
