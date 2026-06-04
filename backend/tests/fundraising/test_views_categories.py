import pytest
from rest_framework.test import APIClient
from apps.accounts import middleware as mw
from apps.accounts import services as svc
from apps.accounts.models import Membership, StudentGroup, TelegramUser
import apps.fundraising.views as fv
from apps.fundraising.models import ItemCategory, PriceItem

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
def participant_user(group, event):
    from apps.events.models import Participation
    user = TelegramUser.objects.create(telegram_id=9001, first_name="Participant")
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)
    Participation.objects.create(event=event, user=user, status=Participation.Status.PARTICIPATING)
    return user


@pytest.mark.django_db
def test_organizer_can_list_categories(monkeypatch, organizer_user, category):
    client = _client(monkeypatch, organizer_user)
    resp = client.get("/api/fundraising/categories/")
    assert resp.status_code == 200
    assert any(c["name"] == "General" for c in resp.data)


@pytest.mark.django_db
def test_participant_can_list_categories(monkeypatch, participant_user, category):
    client = _client(monkeypatch, participant_user)
    resp = client.get("/api/fundraising/categories/")
    assert resp.status_code == 200


@pytest.mark.django_db
def test_organizer_can_create_category(monkeypatch, organizer_user):
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/fundraising/categories/", {"name": "Развлечения"}, format="json")
    assert resp.status_code == 201
    assert resp.data["name"] == "Развлечения"


@pytest.mark.django_db
def test_participant_cannot_create_category(monkeypatch, participant_user):
    client = _client(monkeypatch, participant_user)
    resp = client.post("/api/fundraising/categories/", {"name": "Новая"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_duplicate_category_rejected(monkeypatch, organizer_user, category):
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/fundraising/categories/", {"name": "General"}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_organizer_can_delete_empty_category(monkeypatch, organizer_user, category):
    client = _client(monkeypatch, organizer_user)
    resp = client.delete(f"/api/fundraising/categories/{category.pk}/")
    assert resp.status_code == 204
    assert not ItemCategory.objects.filter(pk=category.pk).exists()


@pytest.mark.django_db
def test_category_with_items_cannot_be_deleted(monkeypatch, organizer_user, category, fundraising):
    PriceItem.objects.create(
        fundraising=fundraising,
        author=organizer_user,
        category=category,
        title="Торт",
        quantity=1,
        unit="шт",
        unit_price=5000,
        item_type="common",
        status=PriceItem.Status.PROPOSED,
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.delete(f"/api/fundraising/categories/{category.pk}/")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_empty_name_rejected(monkeypatch, organizer_user):
    client = _client(monkeypatch, organizer_user)
    resp = client.post("/api/fundraising/categories/", {"name": ""}, format="json")
    assert resp.status_code == 400
    assert "название" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_other_group_organizer_cannot_delete_category(monkeypatch, category):
    """Organizer from another group gets 404, not the category."""
    from apps.events.models import Event
    other_group = StudentGroup.objects.create(name="Other Group")
    other_user = TelegramUser.objects.create(telegram_id=9999, first_name="OtherOrg")
    Membership.objects.create(user=other_user, group=other_group, role=Membership.Role.ORGANIZER)
    Event.objects.create(group=other_group, title="Other Event", status=Event.Status.ACTIVE)

    client = _client(monkeypatch, other_user)
    resp = client.delete(f"/api/fundraising/categories/{category.pk}/")
    assert resp.status_code == 404
