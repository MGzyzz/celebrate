import pytest
from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import Membership, StudentGroup, TelegramUser
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem


@pytest.fixture
def group():
    return StudentGroup.objects.create(name="Test Group")


@pytest.fixture
def organizer_user(group):
    user = TelegramUser.objects.create(telegram_id=1001, first_name="Organizer")
    Membership.objects.create(user=user, group=group, role=Membership.Role.ORGANIZER)
    return user


@pytest.fixture
def event(group):
    return Event.objects.create(
        group=group,
        title="Graduation",
        status=Event.Status.ACTIVE,
    )


@pytest.fixture
def fundraising(event):
    return Fundraising.objects.create(
        event=event,
        title="Graduation Fund",
        target_amount=300000,
        deadline=timezone.now() + timedelta(days=30),
        status=Fundraising.Status.ACTIVE,
    )


@pytest.fixture
def category(group):
    return ItemCategory.objects.create(group=group, name="General")


def make_participant(group, event, telegram_id, first_name, status=Participation.Status.PARTICIPATING):
    user = TelegramUser.objects.create(telegram_id=telegram_id, first_name=first_name)
    Membership.objects.create(user=user, group=group, role=Membership.Role.PARTICIPANT)
    Participation.objects.create(event=event, user=user, status=status)
    return user
