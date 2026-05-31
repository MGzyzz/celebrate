# Анализ архитектуры системы

Дата: 2026-05-31  
Проверял: агент (Claude Sonnet 4.6)

---

## Как устроена система в целом

```
Telegram → initData в каждый запрос
                  ↓
         TelegramInitDataRequiredMiddleware (validate HMAC)
                  ↓
         GET /api/bootstrap/ → все данные одним запросом
                  ↓
         React Query кэш ["bootstrap"] → DesignApp.tsx (весь UI)
                  ↓
         Мутации → invalidateQueries(["bootstrap"]) → рефетч
```

**Стек:** Django + DRF, PostgreSQL, React + Vite + TypeScript, Yandex Maps/Suggest/Geocoder.

---

## Хорошие решения ✅

### Stateless Telegram auth
Каждый запрос проверяет `X-Telegram-Init-Data` через HMAC-SHA256 (файл `backend/apps/accounts/services.py`). Нет сессий, нет JWT. Для Telegram Mini App это правильный паттерн — `initData` генерируется Telegram при каждом открытии и содержит timestamp + подпись.

### Bootstrap-паттерн
`GET /api/bootstrap/` возвращает всё (события, места, сборы, участников, счёт) за один запрос. Для одного класса (~30 человек) это идеально — вместо 10 запросов один. Все мутации инвалидируют кэш через React Query.

### UniqueConstraint везде
- `Membership` — один пользователь одна роль в группе
- `PlaceVote` — нельзя проголосовать дважды
- `Participation` — одна запись об участии на человека на событие
- `Invoice` — один счёт на человека в сборе

### Бюджетная валидация в модели
`PriceItem.save()` вызывает `full_clean()`, которая проверяет что утверждённые товары не превышают бюджет сбора. Защита на уровне модели, не только API.

### `finalize_fundraising` — `@transaction.atomic`
Финализация создаёт счета для всех участников атомарно. Если что-то упадёт — откатывается целиком.

### Инфраструктура dev-окружения
- `vite.config.ts` проксирует `/api` → backend: никаких CORS проблем при разработке
- `docker-compose.yml` маппит Postgres на порт `5433` (не `5432`) — не конфликтует с локальным Postgres
- `YANDEX_GEOCODER_API_KEY` дефолтится на `YANDEX_MAPS_API_KEY` — один ключ работает для обоих сервисов

---

## Проблемы и риски ⚠️

### 1. N+1 запросы в BootstrapView

**Файл:** `backend/apps/events/bootstrap.py`

```python
# В цикле по местам — N запросов:
"supported": place.votes.filter(user=user).exists()

# В цикле по участникам — N запросов:
invoice = fundraising.invoices.filter(user=participation.user).first()
```

Для 30 участников + 5 мест = **35 лишних SQL-запросов** на каждый bootstrap.

**Как починить:**
```python
# В _places():
event.place_ideas.annotate(...).prefetch_related("votes")

# Вместо per-place exists() — сделать set голосов заранее:
user_votes = set(PlaceVote.objects.filter(
    place__event=event, user=user
).values_list("place_id", flat=True))

# В _participants():
event.participations.select_related("user").prefetch_related(
    Prefetch("user__invoices", queryset=Invoice.objects.filter(fundraising=active_fundraising))
)
```

---

### 2. ModelViewSets открыты без auth и без scope по группе

**Файлы:** `backend/apps/places/urls.py`, `backend/apps/fundraising/urls.py`

Эти эндпоинты работают без проверки Telegram initData и возвращают данные **всех групп**:

```
GET /api/places/          → все места всех групп
GET /api/fundraisings/    → все сборы всех групп
GET /api/invoices/        → все счета всех пользователей
GET /api/price-items/     → все товары всех сборов
GET /api/place-votes/     → все голоса
```

`IsAuthenticatedOrReadOnly` из DRF не работает, потому что `authentication_classes = []` во всех views. Middleware защищает от неподписанных запросов, но не scope-ирует данные по группе.

**Для MVP с одним классом не критично.** Перед расширением на несколько классов нужно либо добавить group-scope фильтрацию в ViewSets, либо убрать ViewSets из публичных роутов (оставить только в admin/internal).

---

### 3. Округление счетов теряет тенге

**Файл:** `backend/apps/fundraising/services.py`, строка 34

```python
common_share = common_total // len(regular_participants)  # floor division
```

Пример: 100 000 тг ÷ 26 человек = 3 846 тг × 26 = **99 996 тг** (потеряно 4 тг).

Поле `Invoice.rounding_delta` в модели существует, но в сервисе никогда не заполняется.

**Как починить:** прибавлять остаток к последнему (или первому) инвойсу:
```python
remainder = common_total - common_share * len(regular_participants)
# добавить remainder к amount первого участника
```

---

### 4. Bootstrap не разделяет "загружается" и "ошибка"

**Файл:** `frontend/src/App.tsx`

```tsx
initialData={bootstrapQuery.data ?? emptyAppData}  // ошибка = пустые данные
isLoading={bootstrapQuery.isLoading}
// bootstrapQuery.isError — нигде не передаётся в DesignApp
```

Если bootstrap вернул 403 или 500 — пользователь видит экран "Событие не создано. Настройте событие в админке". Выглядит как баг настройки, а не как сетевая ошибка.

**Как починить:** добавить `isError` и `error` в props DesignApp и показывать `StateView` с кнопкой "Повторить" при ошибке.

---

### 5. `PriceItem.save()` кидает ValidationError не обёрнутый в 400

**Файл:** `backend/apps/fundraising/views.py` (`CurrentPriceItemCreateView.post`)

`PriceItem.objects.create(...)` внутри вызывает `save()` → `full_clean()` → может бросить `django.core.exceptions.ValidationError`. DRF не перехватывает `django.core.exceptions.ValidationError` автоматически — будет **HTTP 500** вместо 400.

**Как починить:**
```python
from django.core.exceptions import ValidationError as DjangoValidationError

try:
    item = PriceItem.objects.create(...)
except DjangoValidationError as exc:
    return response.Response(
        {"detail": "; ".join(exc.messages)},
        status=status.HTTP_400_BAD_REQUEST
    )
```

То же самое применимо к `PlaceIdea.objects.create()` если туда добавить валидацию.

---

### 6. Формат даты события отличается от дизайна

**Файл:** `backend/apps/events/bootstrap.py`, строка 79

```python
"dateLabel": event.event_date.strftime("%d.%m.%Y")  # → "20.06.2026"
```

Дизайн использовал `"20 июня 2026"`. Сейчас пользователь увидит "20.06.2026" в TopBar и на карточке события.

**Как починить:**
```python
from django.utils.formats import date_format
"dateLabel": date_format(event.event_date, "j E Y", use_l10n=True)
# → "20 июня 2026" при LANGUAGE_CODE = "ru-ru"
```

---

## Поверхностные наблюдения 🔍

| Место | Наблюдение |
|---|---|
| `BootstrapView._get_group` | `filter().first()` → только первая группа пользователя. Пользователь в двух классах увидит только один |
| `PlaceIdea.interest_color` | Хранит цвет ("blue", "green"), фронтенд ожидает уровень интереса ("new", "high"). Маппинг делается в `_place_payload` — работает, но хрупко |
| `initData` проверяется дважды | Middleware проверяет и выбрасывает результат. BootstrapView и каждый view заново проверяют через `_telegram_user()`. Это осознанный stateless выбор, но надо знать |
| `react-router-dom` в package.json | Больше не используется после удаления scaffold. Удалить: `npm uninstall react-router-dom` |
| `bootstrapQuery.retry: false` | Если backend временно недоступен — пользователь сразу видит пустой экран без ретрая. Для продакшна стоит `retry: 1` |
| `Sheet` компонент в DesignApp.tsx | Определён в коде, нигде не вызывается. Либо удалить, либо использовать там где сейчас inline popup |

---

## Приоритеты перед production

**Обязательно (влияет на корректность):**
1. `finalize_fundraising` — исправить округление, прибавить остаток к инвойсу
2. `PriceItem.save()` — обернуть `ValidationError` в 400 в views
3. `dateLabel` — исправить формат даты на "20 июня 2026"

**Желательно (безопасность/производительность):**
4. N+1 в bootstrap — prefetch votes и invoices
5. Bootstrap error handling — показывать ошибку пользователю вместо пустого экрана
6. ModelViewSets — добавить scope по группе или убрать из публичных роутов

**Технический долг:**
7. `npm uninstall react-router-dom`
8. `Sheet` — убрать или использовать
