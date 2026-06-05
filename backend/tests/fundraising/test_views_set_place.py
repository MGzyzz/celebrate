import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, TelegramUser
from apps.events.models import Event
from apps.fundraising.models import Fundraising, ItemCategory, PriceItem
from apps.places.models import PlaceIdea

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
def place(event, organizer_user):
    return PlaceIdea.objects.create(
        event=event,
        author=organizer_user,
        title="Лофт Высота",
        estimated_price=220000,
        status=PlaceIdea.Status.PROPOSED,
    )


URL = "/api/fundraisings/current/set-place/"


@pytest.mark.django_db
def test_organizer_adds_place_creates_price_item(monkeypatch, organizer_user, fundraising, place):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL, {"place_id": place.pk}, format="json")
    assert resp.status_code == 201
    assert resp.data["title"] == "Аренда — Лофт Высота"
    assert resp.data["unit_price"] == 220000
    assert resp.data["status"] == PriceItem.Status.APPROVED
    item = PriceItem.objects.get(source_place=place)
    assert item.title == "Аренда — Лофт Высота"
    assert item.unit_price == 220000
    assert item.quantity == 1
    assert item.unit == "аренда"
    assert item.item_type == PriceItem.ItemType.COMMON
    assert item.status == PriceItem.Status.APPROVED
    assert item.fundraising == fundraising


@pytest.mark.django_db
def test_adding_second_place_replaces_first(monkeypatch, organizer_user, fundraising, event, place):
    category, _ = ItemCategory.objects.get_or_create(group=organizer_user.memberships.first().group, name="Место проведения")
    old_item = PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Старое место",
        quantity=1,
        unit="аренда",
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.PROPOSED,
        source_place=PlaceIdea.objects.create(
            event=event,
            title="Старое",
            estimated_price=100000,
            status=PlaceIdea.Status.PROPOSED,
        ),
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL, {"place_id": place.pk}, format="json")
    assert resp.status_code == 201
    assert resp.data["title"] == "Аренда — Лофт Высота"
    assert not PriceItem.objects.filter(pk=old_item.pk).exists()
    assert PriceItem.objects.filter(source_place=place).exists()


@pytest.mark.django_db
def test_participant_cannot_set_place(monkeypatch, group, event, fundraising, place):
    participant = TelegramUser.objects.create(telegram_id=9001, first_name="Part")
    Membership.objects.create(user=participant, group=group, role=Membership.Role.PARTICIPANT)
    client = _client(monkeypatch, participant)
    resp = client.post(URL, {"place_id": place.pk}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_place_from_other_event_returns_404(monkeypatch, organizer_user, fundraising, group):
    other_event = Event.objects.create(group=group, title="Other", status=Event.Status.ACTIVE)
    other_place = PlaceIdea.objects.create(
        event=other_event,
        title="Другое место",
        estimated_price=50000,
        status=PlaceIdea.Status.PROPOSED,
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL, {"place_id": other_place.pk}, format="json")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_nonexistent_place_returns_404(monkeypatch, organizer_user, fundraising):
    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL, {"place_id": 99999}, format="json")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_place_with_zero_price_creates_item(monkeypatch, organizer_user, fundraising, event):
    free_place = PlaceIdea.objects.create(
        event=event,
        title="Бесплатный зал",
        estimated_price=0,
        status=PlaceIdea.Status.PROPOSED,
    )
    client = _client(monkeypatch, organizer_user)
    resp = client.post(URL, {"place_id": free_place.pk}, format="json")
    assert resp.status_code == 201
    assert resp.data["unit_price"] == 0
    item = PriceItem.objects.get(source_place=free_place)
    assert item.unit_price == 0
