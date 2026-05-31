# Дизайн: создание и редактирование события из приложения

Дата: 2026-05-31  
Статус: approved

---

## Контекст

Сейчас событие создаётся только через Django admin. Организатор открывает приложение, видит "Настройте событие в админке" и не может двигаться дальше без доступа к серверу. Нужно дать организатору возможность создавать и редактировать событие прямо в приложении.

---

## Цель

- Организатор создаёт событие из приложения без Django admin.
- После создания события доступны все остальные функции (создание сбора, места и т.д.).
- Организатор может редактировать событие позже через профиль.

---

## Backend

### Новый файл: `backend/apps/events/views.py`

Класс `CurrentEventView(APIView)`:

**`POST /api/events/current/`** — создание события
- Требует роль organizer или admin (`_require_organizer`)
- Если событие для группы уже существует → 400 `"Событие уже создано."`
- Создаёт `Event` для группы организатора со статусом `ACTIVE`
- Возвращает 201 + payload события

**`PATCH /api/events/current/`** — редактирование события
- Требует роль organizer или admin
- Находит текущее событие группы (`_current_event`)
- Если события нет → 404
- Обновляет только переданные поля
- Возвращает 200 + обновлённый payload

**Поля запроса (оба метода):**

| Поле | Тип | Обязательно | Описание |
|---|---|---|---|
| `title` | string | POST: да, PATCH: нет | Название события |
| `eventDate` | string (ISO date) | нет | Дата выпускного |
| `description` | string | нет | Описание |
| `paymentPhone` | string | нет | Номер Kaspi |
| `paymentHolder` | string | нет | Владелец Kaspi |

**Ответ — единый формат** для обоих методов:
```json
{
  "id": "1",
  "title": "Выпускной 11А",
  "date": "2026-06-20",
  "dateLabel": "20 июня 2026",
  "school": "Гимназия №1",
  "payment": { "phone": "+7 777 ...", "holder": "Дана К." }
}
```

### Подключение URL

В `backend/apps/events/urls.py`:
```python
path("events/current/", CurrentEventView.as_view(), name="current-event"),
```

### Переиспользуемые хелперы из `fundraising/views.py`

Перенести в `backend/apps/accounts/utils.py` (или дублировать в events/views.py):
- `_telegram_user(request)`
- `_require_organizer(user)` → возвращает membership
- `_current_event(group)`

Дублировать в `events/views.py` — не трогать работающий код fundraising.

---

## Frontend

### Новый файл: `frontend/src/api/events.ts`

```typescript
export type CreateEventPayload = {
  title: string;
  eventDate?: string;
  description?: string;
  paymentPhone?: string;
  paymentHolder?: string;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export async function createEvent(payload: CreateEventPayload): Promise<unknown>
export async function updateEvent(payload: UpdateEventPayload): Promise<unknown>
```

### Изменения в `App.tsx`

Два новых `useMutation`:
- `createEventMutation` → вызывает `createEvent`, после успеха `invalidateQueries(["bootstrap"])`
- `updateEventMutation` → вызывает `updateEvent`, после успеха `invalidateQueries(["bootstrap"])`

Передаются в `DesignApp` как `onCreateEvent` и `onUpdateEvent`.

### Новый экран `EventSetupScreen` в `DesignApp.tsx`

Один компонент для создания и редактирования:

```
EventSetupScreen
  props: ctx, mode: "create" | "edit"
```

**Поля:**
- Название (Input, обязательно)
- Дата выпускного (стандартный `<input type="date">`, отправляет ISO строку `YYYY-MM-DD`)
- Описание (textarea, опционально)
- Номер Kaspi (Input, опционально)
- Владелец Kaspi (Input, опционально)

В режиме `edit` поля предзаполнены из `ctx.data.event`.

**Навигация — режим create:**  
Показывается автоматически когда `ctx.role === "organizer"` && `!ctx.data.event?.id`.  
Вместо `ScreenSwitch` рендерится `EventSetupScreen mode="create"`.

**Навигация — режим edit:**  
Из профиля добавляется строка «Настройки события» → `ctx.nav.push("eventsetup")`.  
В `ScreenSwitch` добавляется case `"eventsetup"` → `EventSetupScreen mode="edit"`.

### Изменения в `Ctx` и `DesignAppProps`

```typescript
// В Ctx:
createEvent: (payload: CreateEventPayload) => Promise<unknown>;
isCreatingEvent: boolean;
updateEvent: (payload: UpdateEventPayload) => Promise<unknown>;
isUpdatingEvent: boolean;

// В DesignAppProps:
onCreateEvent?: (payload: CreateEventPayload) => Promise<unknown>;
isCreatingEvent?: boolean;
onUpdateEvent?: (payload: UpdateEventPayload) => Promise<unknown>;
isUpdatingEvent?: boolean;
```

---

## Поток данных

```
Organizer opens app, no event
        ↓
bootstrap → { event: null, me.role: "organizer" }
        ↓
EventSetupScreen (mode=create)
        ↓
User fills form → POST /api/events/current/
        ↓
Success → invalidateQueries(["bootstrap"])
        ↓
Bootstrap refetches → event now exists
        ↓
Main screen rendered normally
```

Редактирование:
```
Profile → "Настройки события" → EventSetupScreen (mode=edit)
        ↓
User changes fields → PATCH /api/events/current/
        ↓
invalidateQueries(["bootstrap"]) → TopBar обновляется
```

---

## Обработка ошибок

- Пустое название → фронтенд-валидация, не отправляет запрос
- `PATCH` без события → 404 backend, показывается через `getErrorText`
- Нет роли организатора → 403 backend, показывается через `getErrorText`
- Сетевая ошибка → `getErrorText` с fallback сообщением

---

## Что НЕ входит в scope

- Удаление события (только через admin)
- Смена статуса события (active/draft/archived) из приложения
- Управление участниками группы из приложения
