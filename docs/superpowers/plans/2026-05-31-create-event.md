# Create Event In-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Организатор создаёт и редактирует событие прямо в приложении без Django admin.

**Architecture:** Новый `CurrentEventView` (POST + PATCH) в `backend/apps/events/views.py` принимает данные события и сохраняет в `Event` модели. Фронтенд добавляет `EventSetupScreen`, который показывается автоматически на вкладке Home если у организатора нет события, и доступен из профиля для редактирования.

**Tech Stack:** Django REST Framework (backend), React + TypeScript + React Query (frontend), pytest + APIClient (тесты).

---

## Файловая карта

| Файл | Действие | Что делает |
|---|---|---|
| `backend/apps/events/views.py` | Modify | Добавить `CurrentEventView`, `_telegram_user`, `_require_organizer`, `_current_event`, `_event_response_payload` |
| `backend/apps/events/urls.py` | Modify | Зарегистрировать `events/current/` перед router.urls |
| `backend/tests/events/test_event_current_view.py` | Create | Тесты для POST и PATCH /api/events/current/ |
| `frontend/src/api/events.ts` | Create | `createEvent` и `updateEvent` API функции |
| `frontend/src/App.tsx` | Modify | Два новых useMutation + props для DesignApp |
| `frontend/src/design/DesignApp.tsx` | Modify | Тип ScreenName, Ctx, DesignAppProps, EventSetupScreen, ScreenSwitch, getTitle, ProfileScreen |

---

## Task 1: Backend — CurrentEventView

**Files:**
- Modify: `backend/apps/events/views.py`
- Modify: `backend/apps/events/urls.py`
- Create: `backend/tests/events/test_event_current_view.py`

- [ ] **Step 1: Написать тесты**

Создать файл `backend/tests/events/test_event_current_view.py`:

```python
import pytest
from rest_framework.test import APIClient

from apps.events.models import Event

FAKE_INIT = "fake-init-data"


def _client(monkeypatch, user):
    from apps.accounts import services as svc
    monkeypatch.setattr(svc, "validate_telegram_init_data", lambda _: {"id": user.telegram_id})
    monkeypatch.setattr(svc, "upsert_telegram_user_from_init_data", lambda _: user)
    c = APIClient()
    c.credentials(HTTP_X_TELEGRAM_INIT_DATA=FAKE_INIT)
    return c


@pytest.mark.django_db
def test_create_event_success(monkeypatch, organizer_user):
    """POST creates event and returns 201 with event payload."""
    client = _client(monkeypatch, organizer_user)
    resp = client.post(
        "/api/events/current/",
        {"title": "Выпускной 11А", "eventDate": "2026-06-20"},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["title"] == "Выпускной 11А"
    assert resp.data["date"] == "2026-06-20"
    assert resp.data["dateLabel"] == "20 июня 2026"
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
def test_patch_event_success(monkeypatch, organizer_user, event):
    """PATCH updates existing event and returns 200."""
    client = _client(monkeypatch, organizer_user)
    resp = client.patch(
        "/api/events/current/",
        {"title": "Обновлённое название", "paymentPhone": "+7 777 000 00 00"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["title"] == "Обновлённое название"
    event.refresh_from_db()
    assert event.title == "Обновлённое название"
    assert event.payment_phone == "+7 777 000 00 00"


@pytest.mark.django_db
def test_patch_event_no_event_returns_404(monkeypatch, organizer_user):
    """PATCH when no event exists returns 404."""
    client = _client(monkeypatch, organizer_user)
    resp = client.patch("/api/events/current/", {"title": "Title"}, format="json")
    assert resp.status_code == 404
```

- [ ] **Step 2: Запустить тесты — убедиться что падают**

```
cd backend
poetry run pytest tests/events/test_event_current_view.py -v
```

Ожидаемый результат: все 6 тестов FAILED с `ImportError` или `404` (URL не зарегистрирован).

- [ ] **Step 3: Реализовать CurrentEventView**

Заменить содержимое `backend/apps/events/views.py`:

```python
from datetime import date

from rest_framework import exceptions, response, status, views, viewsets

from apps.accounts.models import Membership
from apps.accounts.services import TelegramAuthError, upsert_telegram_user_from_init_data, validate_telegram_init_data
from apps.events.bootstrap import _ru_date
from apps.events.models import Event, Participation
from apps.events.serializers import EventSerializer, ParticipationSerializer


def _telegram_user(request):
    try:
        payload = validate_telegram_init_data(request.headers.get("X-Telegram-Init-Data", ""))
        return upsert_telegram_user_from_init_data(payload)
    except (TelegramAuthError, KeyError, ValueError) as exc:
        raise exceptions.PermissionDenied(str(exc)) from exc


def _require_organizer(user):
    membership = Membership.objects.select_related("group").filter(user=user).first()
    organizer_roles = {Membership.Role.ORGANIZER, Membership.Role.ADMIN}
    if not membership or membership.role not in organizer_roles:
        raise exceptions.PermissionDenied("Только организатор может выполнять это действие.")
    return membership


def _current_event(group):
    return (
        group.events.filter(status=Event.Status.ACTIVE).order_by("-created_at").first()
        or group.events.order_by("-created_at").first()
    )


def _event_response_payload(event):
    return {
        "id": str(event.id),
        "title": event.title,
        "date": event.event_date.isoformat() if event.event_date else "",
        "dateLabel": _ru_date(event.event_date) if event.event_date else "",
        "school": event.group.name,
        "payment": {
            "phone": event.payment_phone,
            "holder": event.payment_holder,
        },
    }


class CurrentEventView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)

        if _current_event(membership.group):
            return response.Response(
                {"detail": "Событие уже создано."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = str(request.data.get("title", "")).strip()
        if not title:
            return response.Response(
                {"detail": "Укажите название события."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_date_raw = request.data.get("eventDate")
        try:
            parsed_date = date.fromisoformat(event_date_raw) if event_date_raw else None
        except (ValueError, TypeError):
            return response.Response(
                {"detail": "Неверный формат даты. Используйте YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = Event.objects.create(
            group=membership.group,
            title=title,
            description=str(request.data.get("description", "")).strip(),
            event_date=parsed_date,
            payment_phone=str(request.data.get("paymentPhone", "")).strip(),
            payment_holder=str(request.data.get("paymentHolder", "")).strip(),
            status=Event.Status.ACTIVE,
        )
        return response.Response(_event_response_payload(event), status=status.HTTP_201_CREATED)

    def patch(self, request):
        user = _telegram_user(request)
        membership = _require_organizer(user)

        event = _current_event(membership.group)
        if not event:
            return response.Response(
                {"detail": "Событие не найдено."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "title" in request.data:
            title = str(request.data["title"]).strip()
            if not title:
                return response.Response(
                    {"detail": "Укажите название события."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            event.title = title

        if "eventDate" in request.data:
            event_date_raw = request.data["eventDate"]
            try:
                event.event_date = date.fromisoformat(event_date_raw) if event_date_raw else None
            except (ValueError, TypeError):
                return response.Response(
                    {"detail": "Неверный формат даты. Используйте YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if "description" in request.data:
            event.description = str(request.data["description"]).strip()
        if "paymentPhone" in request.data:
            event.payment_phone = str(request.data["paymentPhone"]).strip()
        if "paymentHolder" in request.data:
            event.payment_holder = str(request.data["paymentHolder"]).strip()

        event.save()
        return response.Response(_event_response_payload(event))


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("group").all()
    serializer_class = EventSerializer


class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.select_related("event", "user").all()
    serializer_class = ParticipationSerializer
```

- [ ] **Step 4: Зарегистрировать URL**

Заменить содержимое `backend/apps/events/urls.py`:

```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.events.views import CurrentEventView, EventViewSet, ParticipationViewSet


router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("participations", ParticipationViewSet, basename="participation")

urlpatterns = [
    path("events/current/", CurrentEventView.as_view(), name="current-event"),
] + router.urls
```

- [ ] **Step 5: Запустить тесты — убедиться что проходят**

```
poetry run pytest tests/events/test_event_current_view.py -v
```

Ожидаемый результат: 6 тестов PASSED.

- [ ] **Step 6: Полный прогон тестов**

```
poetry run pytest
```

Ожидаемый результат: 21 passed (15 старых + 6 новых).

- [ ] **Step 7: Проверить систему**

```
poetry run python manage.py check
```

Ожидаемый результат: `System check identified no issues (0 silenced).`

- [ ] **Step 8: Коммит**

```
git add backend/apps/events/views.py backend/apps/events/urls.py backend/tests/events/test_event_current_view.py
git commit -m "feat: add CurrentEventView POST/PATCH for in-app event creation"
```

---

## Task 2: Frontend — API client

**Files:**
- Create: `frontend/src/api/events.ts`

- [ ] **Step 1: Создать файл**

Создать `frontend/src/api/events.ts`:

```typescript
import { apiRequest } from "./client";

export type CreateEventPayload = {
  title: string;
  eventDate?: string;
  description?: string;
  paymentPhone?: string;
  paymentHolder?: string;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export async function createEvent(payload: CreateEventPayload): Promise<unknown> {
  return apiRequest("/events/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(payload: UpdateEventPayload): Promise<unknown> {
  return apiRequest("/events/current/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 2: Коммит**

```
git add frontend/src/api/events.ts
git commit -m "feat: add events API client for createEvent and updateEvent"
```

---

## Task 3: Frontend — App.tsx mutations

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Добавить импорты**

В начало `frontend/src/App.tsx` добавить импорт после существующих:

```typescript
import { createEvent, CreateEventPayload, updateEvent, UpdateEventPayload } from "./api/events";
```

- [ ] **Step 2: Добавить mutations**

После `joinGroupMutation` добавить:

```typescript
  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const updateEventMutation = useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
```

- [ ] **Step 3: Передать props в DesignApp**

В JSX `<DesignApp ...>` после `isJoiningGroup` добавить:

```tsx
      onCreateEvent={(payload) => createEventMutation.mutateAsync(payload)}
      isCreatingEvent={createEventMutation.isPending}
      onUpdateEvent={(payload) => updateEventMutation.mutateAsync(payload)}
      isUpdatingEvent={updateEventMutation.isPending}
```

- [ ] **Step 4: Проверить линтер**

```
cd frontend && npm run lint
```

Ожидаемый результат: exit code 0.

- [ ] **Step 5: Коммит**

```
git add frontend/src/App.tsx
git commit -m "feat: wire createEvent and updateEvent mutations in App.tsx"
```

---

## Task 4: Frontend — EventSetupScreen в DesignApp

**Files:**
- Modify: `frontend/src/design/DesignApp.tsx`

Все изменения в этом таске вносятся в один файл. Делай их последовательно.

- [ ] **Step 1: Расширить тип ScreenName**

Найти:
```typescript
  | "states";
```

Заменить на:
```typescript
  | "states"
  | "eventsetup";
```

- [ ] **Step 2: Расширить тип Ctx**

Найти в `type Ctx`:
```typescript
  joinGroup: (code: string) => Promise<unknown>;
  isJoiningGroup: boolean;
};
```

Заменить на:
```typescript
  joinGroup: (code: string) => Promise<unknown>;
  isJoiningGroup: boolean;
  createEvent: (payload: { title: string; eventDate?: string; description?: string; paymentPhone?: string; paymentHolder?: string }) => Promise<unknown>;
  isCreatingEvent: boolean;
  updateEvent: (payload: { title?: string; eventDate?: string; description?: string; paymentPhone?: string; paymentHolder?: string }) => Promise<unknown>;
  isUpdatingEvent: boolean;
};
```

- [ ] **Step 3: Расширить тип DesignAppProps**

Найти:
```typescript
  onJoinGroup?: (code: string) => Promise<unknown>;
  isJoiningGroup?: boolean;
};
```

Заменить на:
```typescript
  onJoinGroup?: (code: string) => Promise<unknown>;
  isJoiningGroup?: boolean;
  onCreateEvent?: (payload: { title: string; eventDate?: string; description?: string; paymentPhone?: string; paymentHolder?: string }) => Promise<unknown>;
  isCreatingEvent?: boolean;
  onUpdateEvent?: (payload: { title?: string; eventDate?: string; description?: string; paymentPhone?: string; paymentHolder?: string }) => Promise<unknown>;
  isUpdatingEvent?: boolean;
};
```

- [ ] **Step 4: Добавить defaults в деструктуризацию DesignApp**

Найти:
```typescript
  onJoinGroup = async () => undefined,
  isJoiningGroup = false,
}: DesignAppProps) {
```

Заменить на:
```typescript
  onJoinGroup = async () => undefined,
  isJoiningGroup = false,
  onCreateEvent = async () => undefined,
  isCreatingEvent = false,
  onUpdateEvent = async () => undefined,
  isUpdatingEvent = false,
}: DesignAppProps) {
```

- [ ] **Step 5: Добавить в объект ctx**

Найти:
```typescript
    joinGroup: onJoinGroup,
    isJoiningGroup,
  };
```

Заменить на:
```typescript
    joinGroup: onJoinGroup,
    isJoiningGroup,
    createEvent: onCreateEvent,
    isCreatingEvent,
    updateEvent: onUpdateEvent,
    isUpdatingEvent,
  };
```

- [ ] **Step 6: Добавить case "eventsetup" в getTitle**

Найти:
```typescript
    case "states":
      return [t("ui_states")];
    default:
      return [""];
```

Заменить на:
```typescript
    case "states":
      return [t("ui_states")];
    case "eventsetup":
      return ["Настройки события"];
    default:
      return [""];
```

Также обновить case "home" чтобы показывал правильный заголовок когда нет события:

Найти:
```typescript
    case "home":
      return [t("nav_home"), ctx.data.event.dateLabel];
```

Заменить на:
```typescript
    case "home":
      if (ctx.role === "organizer" && !ctx.data.event?.id) {
        return ["Создать событие"];
      }
      return [t("nav_home"), ctx.data.event.dateLabel];
```

- [ ] **Step 7: Добавить case "eventsetup" в ScreenSwitch**

Найти:
```typescript
    case "states":
      return <StatesScreen ctx={ctx} />;
    default:
      return null;
```

Заменить на:
```typescript
    case "states":
      return <StatesScreen ctx={ctx} />;
    case "eventsetup":
      return <EventSetupScreen ctx={ctx} mode="edit" />;
    default:
      return null;
```

Также обновить case "home" в ScreenSwitch — показывать форму создания для организатора без события:

Найти:
```typescript
    case "home":
      return <HomeScreen ctx={ctx} />;
```

Заменить на:
```typescript
    case "home":
      if (ctx.role === "organizer" && !ctx.data.event?.id) {
        return <EventSetupScreen ctx={ctx} mode="create" />;
      }
      return <HomeScreen ctx={ctx} />;
```

- [ ] **Step 8: Добавить компонент EventSetupScreen**

Вставить перед `function AppSkeleton()` (строка ~1656):

```tsx
function EventSetupScreen({ ctx, mode }: { ctx: Ctx; mode: "create" | "edit" }) {
  const event = ctx.data.event;
  const [title, setTitle] = useState(mode === "edit" ? event.title : "");
  const [eventDate, setEventDate] = useState(mode === "edit" ? event.date : "");
  const [description, setDescription] = useState("");
  const [paymentPhone, setPaymentPhone] = useState(mode === "edit" ? event.payment.phone : "");
  const [paymentHolder, setPaymentHolder] = useState(mode === "edit" ? event.payment.holder : "");
  const [error, setError] = useState<string | null>(null);

  const isBusy = ctx.isCreatingEvent || ctx.isUpdatingEvent;

  const submit = async () => {
    if (!title.trim()) {
      setError("Укажите название события.");
      return;
    }
    setError(null);
    try {
      if (mode === "create") {
        await ctx.createEvent({
          title: title.trim(),
          eventDate: eventDate || undefined,
          description: description.trim() || undefined,
          paymentPhone: paymentPhone.trim() || undefined,
          paymentHolder: paymentHolder.trim() || undefined,
        });
        ctx.toast("Событие создано", "check");
      } else {
        await ctx.updateEvent({
          title: title.trim(),
          eventDate: eventDate || undefined,
          description: description.trim() || undefined,
          paymentPhone: paymentPhone.trim() || undefined,
          paymentHolder: paymentHolder.trim() || undefined,
        });
        ctx.toast("Сохранено", "check");
        ctx.nav.pop();
      }
    } catch (err) {
      setError(getErrorText(err, mode === "create" ? "Не удалось создать событие." : "Не удалось сохранить."));
    }
  };

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        {mode === "create" && (
          <Notice tone="info" icon="info">
            Создайте событие чтобы открыть доступ к сборам, местам и участникам.
          </Notice>
        )}
        <Field label="Название" error={error && !title.trim() ? error : null}>
          <Input value={title} onChange={setTitle} placeholder="Например, Выпускной 11А" />
        </Field>
        <Field label="Дата выпускного" optional={ctx.t("optional")}>
          <input
            type="date"
            className="input"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </Field>
        <Field label="Описание" optional={ctx.t("optional")}>
          <textarea
            className="input textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание события"
          />
        </Field>
        <Field label="Номер Kaspi" optional={ctx.t("optional")}>
          <Input value={paymentPhone} onChange={setPaymentPhone} placeholder="+7 777 000 00 00" />
        </Field>
        <Field label="Владелец Kaspi" optional={ctx.t("optional")}>
          <Input value={paymentHolder} onChange={setPaymentHolder} placeholder="Имя Ф." />
        </Field>
        {error && <Notice tone="warn" icon="warn">{error}</Notice>}
      </div>
      <BottomAction>
        <Btn full icon="check" disabled={isBusy} onClick={submit}>
          {isBusy ? ctx.t("loading") : mode === "create" ? "Создать событие" : "Сохранить"}
        </Btn>
      </BottomAction>
    </div>
  );
}
```

- [ ] **Step 9: Добавить "Настройки события" в ProfileScreen**

Найти в `ProfileScreen`:
```typescript
        <SectionLabel>{ctx.t("theme")}</SectionLabel>
```

Заменить на:
```typescript
        {ctx.role === "organizer" && (
          <>
            <SectionLabel>Событие</SectionLabel>
            <div className="listcard">
              <button className="lrow" onClick={() => ctx.nav.push("eventsetup")}>
                <Icon name="calendar" />
                <span className="lrow-main">Настройки события</span>
                <Icon name="chevronR" />
              </button>
            </div>
          </>
        )}
        <SectionLabel>{ctx.t("theme")}</SectionLabel>
```

- [ ] **Step 10: Проверить линтер**

```
npm run lint
```

Ожидаемый результат: exit code 0.

- [ ] **Step 11: Коммит**

```
git add frontend/src/design/DesignApp.tsx
git commit -m "feat: add EventSetupScreen for in-app event create and edit"
```

---

## Финальная проверка

- [ ] Запустить все backend тесты: `poetry run pytest` → 21 passed
- [ ] Запустить frontend lint: `npm run lint` → exit 0
- [ ] Запустить frontend build: `npm run build` → exit 0
