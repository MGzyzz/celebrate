# Bug Fix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 bugs and technical debt items identified in `docs/ARCHITECTURE_ANALYSIS.md`.

**Architecture:** Django 5.2 + DRF backend (`backend/`), React 18 + TypeScript + Vite frontend (`frontend/`). Tests live in `backend/tests/` and use pytest-django (`cd backend && poetry run pytest`). Each task is independent; Tasks 3 and 4 both touch `bootstrap.py` — commit them together.

**Tech Stack:** Django 5.2, DRF 3.15, pytest-django 4.9; React 18, TypeScript, Vite.

---

## File Map

| Task | Files modified |
|---|---|
| 1 | `backend/apps/fundraising/services.py`, `backend/tests/fundraising/test_services.py` |
| 2 | `backend/apps/fundraising/views.py`, `backend/tests/fundraising/test_views_price_item.py` |
| 3+4 | `backend/apps/events/bootstrap.py`, `backend/tests/events/test_bootstrap.py` |
| 5 | `frontend/src/App.tsx`, `frontend/src/design/DesignApp.tsx` |
| 6 | `backend/apps/places/views.py`, `backend/apps/places/urls.py`, `backend/apps/fundraising/urls.py`, `backend/tests/places/test_viewsets_removed.py` |
| 7 | `frontend/package.json` (via npm command) |

---

## Shared Test Infrastructure (create once before tasks 1–4)

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/fundraising/__init__.py`
- Create: `backend/tests/events/__init__.py`
- Create: `backend/tests/places/__init__.py`
- Create: `backend/conftest.py`

- [ ] **Step: Create test package files**

```
# Create these four empty files:
backend/tests/__init__.py           (empty)
backend/tests/fundraising/__init__.py  (empty)
backend/tests/events/__init__.py    (empty)
backend/tests/places/__init__.py    (empty)
```

- [ ] **Step: Create backend/conftest.py**

```python
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
```

- [ ] **Step: Verify conftest is discoverable**

```bash
cd backend && poetry run pytest --collect-only 2>&1 | head -20
```

Expected: no import errors, 0 items collected (no test files yet).

---

## Task 1: Fix rounding in `finalize_fundraising`

**Problem:** `100 000 ÷ 26 = 3 846 × 26 = 99 996` — up to N−1 тенге lost. `Invoice.rounding_delta` field exists but is never populated.

**Fix:** Use `%` operator for remainder and add it to the first invoice. Assign remainder of alcohol separately (first alcohol participant).

**Files:**
- Modify: `backend/apps/fundraising/services.py`
- Create: `backend/tests/fundraising/test_services.py`

- [ ] **Step 1.1: Write failing tests**

Create `backend/tests/fundraising/test_services.py`:

```python
import pytest
from datetime import timedelta

from django.utils import timezone

from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem
from apps.fundraising.services import finalize_fundraising
from conftest import make_participant


@pytest.mark.django_db
def test_rounding_remainder_goes_to_first_invoice(group, event, fundraising, category):
    """100 000 ÷ 3 = 33333 r 1 → amounts must be [33333, 33333, 33334], total == 100000."""
    for i in range(3):
        make_participant(group, event, 2000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Table",
        quantity=1,
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    amounts = sorted(inv.amount for inv in invoices)
    assert amounts == [33333, 33333, 33334]
    assert sum(amounts) == 100000

    adjusted = next(inv for inv in invoices if inv.rounding_delta != 0)
    assert adjusted.rounding_delta == 1


@pytest.mark.django_db
def test_rounding_exact_division_no_delta(group, event, fundraising, category):
    """100 000 ÷ 4 = 25 000 exactly → all rounding_delta == 0."""
    for i in range(4):
        make_participant(group, event, 3000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Venue",
        quantity=1,
        unit_price=100000,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)

    for inv in invoices:
        assert inv.amount == 25000
        assert inv.rounding_delta == 0


@pytest.mark.django_db
def test_total_always_preserved(group, event, fundraising, category):
    """Sum of all invoice amounts must equal approved_total for any participant count."""
    for i in range(7):
        make_participant(group, event, 4000 + i, f"User{i}")

    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Food",
        quantity=1,
        unit_price=100003,  # 100003 ÷ 7 = 14286 r 1
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    invoices = finalize_fundraising(fundraising)
    assert sum(inv.amount for inv in invoices) == 100003
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd backend && poetry run pytest tests/fundraising/test_services.py -v
```

Expected: 3 FAILED (function/fixture not yet adjusted).

- [ ] **Step 1.3: Apply rounding fix to services.py**

Replace the body of `finalize_fundraising` in `backend/apps/fundraising/services.py` — change the share computation and the invoice loop:

```python
@transaction.atomic
def finalize_fundraising(fundraising: Fundraising) -> list[Invoice]:
    participants = Participation.objects.select_related("user").filter(
        event=fundraising.event,
        status=Participation.Status.PARTICIPATING,
    )
    common_items = fundraising.items.filter(status=PriceItem.Status.APPROVED, item_type=PriceItem.ItemType.COMMON)
    alcohol_items = fundraising.items.filter(status=PriceItem.Status.APPROVED, item_type=PriceItem.ItemType.ALCOHOL)

    common_total = sum(item.total_price for item in common_items)
    alcohol_total = sum(item.total_price for item in alcohol_items)

    regular_participants = [p for p in participants if p.payment_share != Participation.PaymentShare.EXEMPT]
    alcohol_participant_pks = {
        p.pk
        for p in regular_participants
        if p.payment_share not in {Participation.PaymentShare.NO_ALCOHOL, Participation.PaymentShare.EXEMPT}
    }

    common_share = common_total // len(regular_participants) if regular_participants else 0
    common_remainder = (common_total % len(regular_participants)) if regular_participants else 0
    alcohol_share = alcohol_total // len(alcohol_participant_pks) if alcohol_participant_pks else 0
    alcohol_remainder = (alcohol_total % len(alcohol_participant_pks)) if alcohol_participant_pks else 0

    invoices = []
    first_regular_done = False
    first_alcohol_done = False

    for participation in regular_participants:
        is_alcohol = participation.pk in alcohol_participant_pks

        c_extra = common_remainder if not first_regular_done else 0
        a_extra = alcohol_remainder if (is_alcohol and not first_alcohol_done) else 0

        common_amount = common_share + c_extra
        alcohol_amount = (alcohol_share + a_extra) if is_alcohol else 0
        individual_amount = participation.custom_share_amount
        amount = common_amount + alcohol_amount + individual_amount
        rounding_delta = c_extra + a_extra

        if not first_regular_done:
            first_regular_done = True
        if is_alcohol and not first_alcohol_done:
            first_alcohol_done = True

        invoice, _ = Invoice.objects.update_or_create(
            fundraising=fundraising,
            user=participation.user,
            defaults={
                "amount": amount,
                "common_amount": common_amount,
                "alcohol_amount": alcohol_amount,
                "individual_amount": individual_amount,
                "rounding_delta": rounding_delta,
                "status": Invoice.Status.PENDING,
            },
        )
        invoices.append(invoice)

    fundraising.status = Fundraising.Status.FINISHED
    fundraising.finalized_at = timezone.now()
    fundraising.save(update_fields=["status", "finalized_at", "updated_at"])
    return invoices
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
cd backend && poetry run pytest tests/fundraising/test_services.py -v
```

Expected: 3 PASSED.

- [ ] **Step 1.5: Run full backend checks**

```bash
cd backend && poetry run python manage.py check && poetry run pytest
```

Expected: System check OK, all tests pass.

- [ ] **Step 1.6: Commit**

```bash
git add backend/apps/fundraising/services.py backend/tests/ backend/conftest.py
git commit -m "fix: distribute rounding remainder to first invoice in finalize_fundraising

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Wrap ValidationError in 400 in CurrentPriceItemCreateView

**Problem:** `PriceItem.save()` calls `full_clean()` which can raise `django.core.exceptions.ValidationError` (e.g., when approved items would exceed budget). DRF does not catch this — produces HTTP 500 instead of 400.

**Files:**
- Modify: `backend/apps/fundraising/views.py`
- Create: `backend/tests/fundraising/test_views_price_item.py`

- [ ] **Step 2.1: Write failing test**

Create `backend/tests/fundraising/test_views_price_item.py`:

```python
import pytest
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Membership, StudentGroup, TelegramUser
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, ItemCategory, PriceItem
from conftest import make_participant

FAKE_INIT_DATA = "fake-init-data"


def _client_with_auth(monkeypatch, user):
    """Return an APIClient whose Telegram auth resolves to `user`."""
    from apps.accounts import services as svc

    monkeypatch.setattr(svc, "validate_telegram_init_data", lambda _data: {"id": user.telegram_id})
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", lambda _payload: user)
    client = APIClient()
    client.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT_DATA)
    return client


@pytest.mark.django_db
def test_price_item_over_budget_returns_400(monkeypatch, group, event, fundraising, category):
    """Creating an APPROVED item that pushes total over budget should return 400, not 500."""
    user = make_participant(group, event, 9001, "Alice")

    # Fill budget: target_amount=300000, one approved item at 299999
    PriceItem.objects.create(
        fundraising=fundraising,
        category=category,
        title="Existing",
        quantity=1,
        unit_price=299999,
        item_type=PriceItem.ItemType.COMMON,
        status=PriceItem.Status.APPROVED,
    )

    client = _client_with_auth(monkeypatch, user)
    resp = client.post(
        "/api/price-items/current/",
        {
            "title": "Over budget item",
            "category": "General",
            "quantity": 1,
            "unit": "шт",
            "unitPrice": 2,          # 299999 + 2 = 300001 > 300000
            "itemType": "common",
        },
        format="json",
    )

    # Before the fix this would be 500; after fix it must be 400
    assert resp.status_code == 400
    assert "detail" in resp.data
```

- [ ] **Step 2.2: Run test to confirm it fails (500 or other non-400)**

```bash
cd backend && poetry run pytest tests/fundraising/test_views_price_item.py -v
```

Expected: FAILED — `AssertionError: assert 500 == 400` (or similar).

- [ ] **Step 2.3: Apply fix to views.py**

In `backend/apps/fundraising/views.py`, add import at top:

```python
from django.core.exceptions import ValidationError as DjangoValidationError
```

Then in `CurrentPriceItemCreateView.post`, replace:

```python
        item = PriceItem.objects.create(
            fundraising=fundraising,
            author=user,
            category=category,
            title=title,
            quantity=quantity,
            unit=unit,
            unit_price=unit_price,
            item_type=item_type,
            status=PriceItem.Status.PROPOSED,
            comment=str(request.data.get("comment", "")).strip(),
            store_url=str(request.data.get("storeUrl", "")).strip(),
        )
        return response.Response(PriceItemSerializer(item).data, status=status.HTTP_201_CREATED)
```

With:

```python
        try:
            item = PriceItem.objects.create(
                fundraising=fundraising,
                author=user,
                category=category,
                title=title,
                quantity=quantity,
                unit=unit,
                unit_price=unit_price,
                item_type=item_type,
                status=PriceItem.Status.PROPOSED,
                comment=str(request.data.get("comment", "")).strip(),
                store_url=str(request.data.get("storeUrl", "")).strip(),
            )
        except DjangoValidationError as exc:
            return response.Response(
                {"detail": "; ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return response.Response(PriceItemSerializer(item).data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 2.4: Run test to confirm it passes**

```bash
cd backend && poetry run pytest tests/fundraising/test_views_price_item.py -v
```

Expected: PASSED.

- [ ] **Step 2.5: Run full backend checks**

```bash
cd backend && poetry run python manage.py check && poetry run pytest
```

Expected: System check OK, all tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add backend/apps/fundraising/views.py backend/tests/fundraising/test_views_price_item.py
git commit -m "fix: return 400 instead of 500 when PriceItem exceeds budget

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Fix dateLabel format ("20.06.2026" → "20 июня 2026")

**Problem:** `event.event_date.strftime("%d.%m.%Y")` produces `"20.06.2026"`. Design uses `"20 июня 2026"`.

**Fix:** Use a hardcoded Russian genitive month array — no locale middleware dependency.

**Files:**
- Modify: `backend/apps/events/bootstrap.py`
- Create: `backend/tests/events/test_bootstrap.py`

- [ ] **Step 3.1: Write failing test**

Create `backend/tests/events/test_bootstrap.py`:

```python
import pytest
from datetime import date

from apps.events.bootstrap import BootstrapView


class _MockEvent:
    """Minimal stand-in for Event, enough for _event_payload."""
    event_date = date(2026, 6, 20)
    title = "Graduation"
    payment_phone = "+77071234567"
    payment_holder = "Organizer"
    group = type("G", (), {"name": "School 1"})()


def test_date_label_russian_format():
    payload = BootstrapView._event_payload(_MockEvent())
    assert payload["dateLabel"] == "20 июня 2026"


def test_date_label_january():
    class E(_MockEvent):
        event_date = date(2026, 1, 5)
    assert BootstrapView._event_payload(E())["dateLabel"] == "5 января 2026"


def test_date_label_none():
    class E(_MockEvent):
        event_date = None
    assert BootstrapView._event_payload(E())["dateLabel"] == ""
```

- [ ] **Step 3.2: Run test to confirm it fails**

```bash
cd backend && poetry run pytest tests/events/test_bootstrap.py::test_date_label_russian_format -v
```

Expected: FAILED — `assert "20.06.2026" == "20 июня 2026"`.

- [ ] **Step 3.3: Apply fix to bootstrap.py**

In `backend/apps/events/bootstrap.py`, add the helper function and constant before the `BootstrapView` class (after imports):

```python
_RU_MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


def _ru_date(d) -> str:
    return f"{d.day} {_RU_MONTHS[d.month - 1]} {d.year}"
```

Then in `_event_payload`, replace:

```python
"dateLabel": event.event_date.strftime("%d.%m.%Y") if event.event_date else "",
```

With:

```python
"dateLabel": _ru_date(event.event_date) if event.event_date else "",
```

- [ ] **Step 3.4: Run all date tests**

```bash
cd backend && poetry run pytest tests/events/test_bootstrap.py -v
```

Expected: 3 PASSED (the N+1 tests haven't been written yet so only these 3 run).

---

## Task 4: Fix N+1 queries in bootstrap

**Problem (35 extra SQL per bootstrap with 30 participants + 5 places):**
1. `place.votes.filter(user=user).exists()` — 1 query per place
2. `fundraising.invoices.filter(user=participation.user).first()` — 1 query per participant

**Fix:** Precompute a set of voted place IDs and a dict of user_id → Invoice before the loops.

**Files:**
- Modify: `backend/apps/events/bootstrap.py`
- Append tests to: `backend/tests/events/test_bootstrap.py`

- [ ] **Step 4.1: Write failing query-count tests**

Append to `backend/tests/events/test_bootstrap.py`:

```python
import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection
from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import Membership, StudentGroup, TelegramUser
from apps.events.models import Event, Participation
from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem
from apps.places.models import PlaceIdea
from apps.events.bootstrap import BootstrapView
from conftest import make_participant


def _make_place(event, author, idx):
    return PlaceIdea.objects.create(
        event=event,
        author=author,
        title=f"Place {idx}",
        address=f"Addr {idx}",
        status=PlaceIdea.Status.PROPOSED,
        interest_color=PlaceIdea.InterestColor.BLUE,
    )


@pytest.mark.django_db
def test_bootstrap_votes_no_n_plus_1(group, event, fundraising, category):
    """Query count for votes must NOT grow with number of places."""
    organizer = TelegramUser.objects.create(telegram_id=8001, first_name="Org")
    Membership.objects.create(user=organizer, group=group, role=Membership.Role.ORGANIZER)

    for i in range(5):
        _make_place(event, organizer, i)

    view = BootstrapView()

    with CaptureQueriesContext(connection) as ctx_2places:
        view._compute_user_voted_ids(event, organizer)
    queries_2 = len(ctx_2places.captured_queries)

    # After fix, this should be exactly 1 query regardless of place count
    assert queries_2 == 1


@pytest.mark.django_db
def test_bootstrap_invoices_no_n_plus_1(group, event, fundraising, category):
    """Query count for invoice lookup must NOT grow with participant count."""
    organizer = TelegramUser.objects.create(telegram_id=8002, first_name="Org")
    Membership.objects.create(user=organizer, group=group, role=Membership.Role.ORGANIZER)

    for i in range(10):
        p = make_participant(group, event, 7000 + i, f"P{i}")
        Invoice.objects.create(
            fundraising=fundraising,
            user=p,
            amount=10000,
            status=Invoice.Status.PENDING,
        )

    with CaptureQueriesContext(connection) as ctx:
        BootstrapView._build_invoice_map(fundraising)
    queries = len(ctx.captured_queries)

    assert queries == 1
```

- [ ] **Step 4.2: Run tests to confirm they fail (methods don't exist yet)**

```bash
cd backend && poetry run pytest tests/events/test_bootstrap.py::test_bootstrap_votes_no_n_plus_1 tests/events/test_bootstrap.py::test_bootstrap_invoices_no_n_plus_1 -v
```

Expected: 2 FAILED — `AttributeError: type object 'BootstrapView' has no attribute '_compute_user_voted_ids'`.

- [ ] **Step 4.3: Apply N+1 fix to bootstrap.py**

Add imports at top of `backend/apps/events/bootstrap.py`:

```python
from apps.places.models import PlaceIdea, PlaceVote
```

(Replace the existing `from apps.places.models import PlaceIdea` line.)

Add two new static methods to `BootstrapView`:

```python
@staticmethod
def _compute_user_voted_ids(event, user) -> set:
    return set(
        PlaceVote.objects.filter(place__event=event, user=user).values_list("place_id", flat=True)
    )

@staticmethod
def _build_invoice_map(fundraising) -> dict:
    if not fundraising:
        return {}
    return {inv.user_id: inv for inv in Invoice.objects.filter(fundraising=fundraising)}
```

Update `_place_payload` signature — change `user` parameter to `user_voted_ids`:

```python
@staticmethod
def _place_payload(place, index, user_voted_ids: set):
    x = 24 + (index * 13) % 56
    y = 24 + (index * 17) % 52
    return {
        "id": str(place.id),
        "name": place.title,
        "interest": {
            "gray": "low",
            "blue": "new",
            "green": "high",
            "yellow": "debate",
            "red": "problem",
        }.get(place.interest_color, "new"),
        "votes": place.votes_count,
        "supported": place.id in user_voted_ids,
        "address": place.address,
        "district": place.address,
        "price": place.estimated_price,
        "capacity": place.capacity,
        "lat": float(place.latitude) if place.latitude is not None else None,
        "lng": float(place.longitude) if place.longitude is not None else None,
        "x": x,
        "y": y,
        "desc": place.description,
        "amenities": place.amenities,
        "rent": place.rent_terms,
        "pros": [line for line in place.pros.splitlines() if line],
        "cons": [line for line in place.cons.splitlines() if line],
        "note": place.author_comment,
        "author": place.author.first_name if place.author else "",
    }
```

Update `_participant_payload` — change `fundraising` parameter to `invoice`:

```python
@staticmethod
def _participant_payload(participation, invoice):
    return {
        "id": str(participation.user.id),
        "name": str(participation.user),
        "participation": {
            Participation.Status.PARTICIPATING: "in",
            Participation.Status.NOT_PARTICIPATING: "out",
            Participation.Status.THINKING: "maybe",
            Participation.Status.UNKNOWN: "none",
        }[participation.status],
        "payCat": {
            Participation.PaymentShare.REGULAR: "regular",
            Participation.PaymentShare.NO_ALCOHOL: "noalco",
            Participation.PaymentShare.INDIVIDUAL: "individual",
            Participation.PaymentShare.EXEMPT: "exempt",
        }[participation.payment_share],
        "paid": invoice.status == Invoice.Status.PAID if invoice else False,
        "invoice": invoice.amount if invoice else 0,
    }
```

Update the `get()` method's response assembly block. Replace:

```python
        return Response(
            {
                "user": TelegramUserSerializer(user).data,
                "event": self._event_payload(event),
                "me": self._me_payload(user, event),
                "places": [self._place_payload(place, index, user) for index, place in enumerate(self._places(event))],
                "collections": [self._fundraising_payload(fundraising) for fundraising in fundraisings],
                "items": [self._item_payload(item) for item in self._items(active_fundraising)],
                "participants": [self._participant_payload(participation, active_fundraising) for participation in self._participants(event)],
                "myInvoice": self._invoice_payload(user, active_fundraising),
            }
        )
```

With:

```python
        user_voted_ids = self._compute_user_voted_ids(event, user)
        invoice_map = self._build_invoice_map(active_fundraising)

        return Response(
            {
                "user": TelegramUserSerializer(user).data,
                "event": self._event_payload(event),
                "me": self._me_payload(user, event),
                "places": [self._place_payload(place, index, user_voted_ids) for index, place in enumerate(self._places(event))],
                "collections": [self._fundraising_payload(fundraising) for fundraising in fundraisings],
                "items": [self._item_payload(item) for item in self._items(active_fundraising)],
                "participants": [self._participant_payload(p, invoice_map.get(p.user_id)) for p in self._participants(event)],
                "myInvoice": self._invoice_payload(user, active_fundraising),
            }
        )
```

- [ ] **Step 4.4: Run all bootstrap tests**

```bash
cd backend && poetry run pytest tests/events/test_bootstrap.py -v
```

Expected: All 5 PASSED.

- [ ] **Step 4.5: Run full backend checks**

```bash
cd backend && poetry run python manage.py check && poetry run pytest
```

Expected: System check OK, all tests pass.

- [ ] **Step 4.6: Commit tasks 3+4 together**

```bash
git add backend/apps/events/bootstrap.py backend/tests/events/test_bootstrap.py
git commit -m "fix: Russian date format for dateLabel; fix N+1 queries in bootstrap

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Bootstrap error handling in frontend

**Problem:** When bootstrap returns 403 or 500, `initialData` falls back to `emptyAppData` and DesignApp shows "Событие не создано" instead of a real error message with a retry button. `isError` from React Query is never passed to DesignApp.

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/design/DesignApp.tsx`

No backend changes. No new test files (frontend unit tests aren't set up in this project).

- [ ] **Step 5.1: Add isError + onRetry props to DesignApp**

In `frontend/src/design/DesignApp.tsx`, find `type DesignAppProps` and add two fields:

```typescript
type DesignAppProps = {
  initialData?: AppData;
  dataSource?: "api" | "fallback";
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onCreateCollection?: ...  // rest unchanged
```

In the function signature default parameters, add:

```typescript
export function DesignApp({
  initialData = fallbackData,
  dataSource = "fallback",
  isLoading = false,
  isError = false,
  onRetry,
  onCreateCollection = async () => undefined,
  // ... rest unchanged
```

At the top of the `DesignApp` function body, after all the `useState` calls but before the first `return`, add the error guard (immediately before `if (isLoading) return <AppSkeleton />`):

```tsx
  if (isError) {
    return (
      <div className="scroll screen-anim">
        <div className="screen-pad stack">
          <StateView
            icon="warn"
            title="Не удалось загрузить данные"
            sub="Проверьте соединение и попробуйте снова."
            action={
              onRetry ? (
                <Btn full icon="refresh" onClick={onRetry}>
                  Повторить
                </Btn>
              ) : undefined
            }
          />
        </div>
      </div>
    );
  }
```

- [ ] **Step 5.2: Pass isError and onRetry from App.tsx**

In `frontend/src/App.tsx`, update the `<DesignApp ...>` JSX:

```tsx
  return (
    <DesignApp
      initialData={bootstrapQuery.data ?? emptyAppData}
      dataSource={bootstrapQuery.isSuccess ? "api" : "fallback"}
      isLoading={bootstrapQuery.isLoading}
      isError={bootstrapQuery.isError}
      onRetry={() => bootstrapQuery.refetch()}
      onCreateCollection={(payload) => createFundraisingMutation.mutateAsync(payload)}
      isCreatingCollection={createFundraisingMutation.isPending}
      onCreateItem={(payload) => createPriceItemMutation.mutateAsync(payload)}
      isCreatingItem={createPriceItemMutation.isPending}
      onCreatePlace={(payload) => createPlaceMutation.mutateAsync(payload)}
      isCreatingPlace={createPlaceMutation.isPending}
      onSupportPlace={(placeId) => supportPlaceMutation.mutateAsync(placeId)}
      onJoinGroup={(code) => joinGroupMutation.mutateAsync(code)}
      isJoiningGroup={joinGroupMutation.isPending}
    />
  );
```

- [ ] **Step 5.3: Verify lint passes**

```bash
cd frontend && npm run lint
```

Expected: no errors or warnings about new props.

- [ ] **Step 5.4: Verify build passes**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5.5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/design/DesignApp.tsx
git commit -m "feat: show error state with retry button when bootstrap fails

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Remove open ModelViewSet endpoints from public routes

**Problem:** `GET /api/places/`, `GET /api/fundraisings/`, `GET /api/invoices/`, etc. return data from ALL groups with no authentication. `IsAuthenticatedOrReadOnly` allows anonymous GET requests because DRF sessions aren't used.

**Fix:** Remove the ViewSet registrations from the public routers. Extract the `support` action (used by frontend) to a standalone `PlaceSupportView`. The `finalize` action is not currently called by the frontend and can stay in code but won't be exposed until properly wired.

**Files:**
- Modify: `backend/apps/places/views.py`
- Modify: `backend/apps/places/urls.py`
- Modify: `backend/apps/fundraising/urls.py`
- Create: `backend/tests/places/test_viewsets_removed.py`

- [ ] **Step 6.1: Write test verifying support endpoint still works and list is gone**

Create `backend/tests/places/test_viewsets_removed.py`:

```python
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership, StudentGroup, TelegramUser
from apps.events.models import Event
from apps.places.models import PlaceIdea

FAKE_INIT = "fake-init-data"


def _client(monkeypatch, user):
    from apps.accounts import services as svc
    monkeypatch.setattr(svc, "validate_telegram_init_data", lambda _: {"id": user.telegram_id})
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", lambda _: user)
    c = APIClient()
    c.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return c


@pytest.mark.django_db
def test_place_list_endpoint_removed(group, event):
    """GET /api/places/ must return 404 after ViewSet removal."""
    c = APIClient()
    resp = c.get("/api/places/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_fundraising_list_endpoint_removed(group, event):
    """GET /api/fundraisings/ must return 404 after ViewSet removal."""
    c = APIClient()
    resp = c.get("/api/fundraisings/")
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
```

- [ ] **Step 6.2: Run tests to confirm list tests pass (404) and support test fails (not yet migrated)**

```bash
cd backend && poetry run pytest tests/places/test_viewsets_removed.py -v
```

Expected: `test_place_list_endpoint_removed` PASSED, `test_fundraising_list_endpoint_removed` PASSED, `test_place_support_still_works` FAILED (endpoint moved).

Actually the list tests may FAIL too if ViewSets are still registered (they'd return 200, not 404). That's fine — all 3 should fail initially.

- [ ] **Step 6.3: Add PlaceSupportView to places/views.py**

In `backend/apps/places/views.py`, add after `CurrentPlaceCreateView` and before `PlaceIdeaViewSet`:

```python
from django.shortcuts import get_object_or_404


class PlaceSupportView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, pk):
        user = _telegram_user(request)
        place = get_object_or_404(PlaceIdea, pk=pk)
        membership = Membership.objects.filter(user=user, group=place.event.group).first()
        if not membership:
            raise exceptions.PermissionDenied("Пользователь не состоит в группе этого события.")

        vote, created = PlaceVote.objects.get_or_create(place=place, user=user)
        votes_count = place.votes.count()
        return response.Response(
            {
                "id": vote.id,
                "place": place.id,
                "created": created,
                "votes_count": votes_count,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
```

- [ ] **Step 6.4: Update places/urls.py**

Replace the full content of `backend/apps/places/urls.py` with:

```python
from django.urls import path

from apps.places.views import CurrentPlaceCreateView, PlaceSupportView

urlpatterns = [
    path("places/current/", CurrentPlaceCreateView.as_view(), name="current-place-create"),
    path("places/<int:pk>/support/", PlaceSupportView.as_view(), name="place-support"),
]
```

- [ ] **Step 6.5: Update fundraising/urls.py**

Replace the full content of `backend/apps/fundraising/urls.py` with:

```python
from django.urls import path

from apps.fundraising.views import CurrentFundraisingCreateView, CurrentPriceItemCreateView

urlpatterns = [
    path("fundraisings/current/", CurrentFundraisingCreateView.as_view(), name="current-fundraising-create"),
    path("price-items/current/", CurrentPriceItemCreateView.as_view(), name="current-price-item-create"),
]
```

- [ ] **Step 6.6: Run all tests**

```bash
cd backend && poetry run pytest tests/places/test_viewsets_removed.py -v
```

Expected: All 3 PASSED.

- [ ] **Step 6.7: Run full backend checks**

```bash
cd backend && poetry run python manage.py check && poetry run pytest
```

Expected: System check OK, all tests pass.

- [ ] **Step 6.8: Commit**

```bash
git add backend/apps/places/views.py backend/apps/places/urls.py backend/apps/fundraising/urls.py backend/tests/places/
git commit -m "fix: remove open ModelViewSet endpoints; expose only action-specific views

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Remove unused react-router-dom dependency

**Problem:** `react-router-dom` is listed in `frontend/package.json` but was only used in the deleted scaffold files (`src/pages/`). No code imports it.

**Files:**
- Modify: `frontend/package.json` (via npm)

- [ ] **Step 7.1: Confirm nothing imports react-router-dom**

```bash
cd frontend && grep -r "react-router" src/
```

Expected: no output (zero matches).

- [ ] **Step 7.2: Uninstall**

```bash
cd frontend && npm uninstall react-router-dom
```

Expected: Package removed from `package.json` and `node_modules`.

- [ ] **Step 7.3: Verify build still passes**

```bash
cd frontend && npm run build
```

Expected: Build succeeds, no errors.

- [ ] **Step 7.4: Verify lint still passes**

```bash
cd frontend && npm run lint
```

Expected: No errors.

- [ ] **Step 7.5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: remove unused react-router-dom dependency

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Note: Sheet component

The `Sheet` component referenced in `docs/DESIGN_REVIEW.md` no longer exists in `DesignApp.tsx` — only `MapSheet` remains, which IS used. No action needed.

---

## Summary

| # | Task | Files | Checks |
|---|---|---|---|
| 1 | Rounding in finalize | services.py | pytest |
| 2 | ValidationError → 400 | fundraising/views.py | pytest |
| 3+4 | dateLabel + N+1 | bootstrap.py | pytest |
| 5 | Frontend error state | App.tsx, DesignApp.tsx | lint + build |
| 6 | Remove open ViewSets | places/*, fundraising/urls.py | pytest |
| 7 | Remove react-router-dom | package.json | build + lint |
