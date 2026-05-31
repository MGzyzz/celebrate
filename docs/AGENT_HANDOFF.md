# Agent Handoff

Дата: 2026-05-31  
Проект: Telegram Mini App для планирования выпускного, мест, сборов и участников.

## Контекст продукта

- Приложение запускается как Telegram Mini App.
- Основные роли: участник и организатор.
- Участник видит событие, свой статус участия, места, сборы, свой счет и профиль.
- Организатор управляет событием, участниками, местами, сборами, товарами и финальным расчетом.
- Валюта: тенге, суммы целые, без десятых.
- Для карт выбран Yandex Maps.

## Стек

- Backend: Django, Django REST Framework, PostgreSQL, Poetry.
- Frontend: React, Vite, TypeScript.
- Telegram: Mini App через `window.Telegram.WebApp.initData`.
- Карты и подсказки: Yandex Maps JS API + Yandex Geosuggest API.

## Что уже сделано

- Инициализирован проект с backend/frontend структурой.
- Добавлены Django-приложения для аккаунтов, событий, мест, сборов и bootstrap API.
- Добавлены модели с русскими `verbose_name` / `verbose_name_plural` для админки.
- Настроены миграции и работа с PostgreSQL через Docker.
- Подключен frontend-дизайн из папки `Design for telegram app`.
- Подключен реальный backend bootstrap вместо моков.
- Добавлено создание сбора средств.
- Добавлено создание товаров в сборе через API.
- Добавлено утверждение товаров организатором.
- Добавлена базовая логика участников и ролей.
- Добавлена тема: светлая, темная, системная. Выбор сохраняется в `localStorage`.
- Убрана кнопка `UI-состояние` из профиля.
- В профиле вместо `Выпускной Mini App · v1` показывается версия приложения из `package.json`.
- Числовые поля бюджета/цены/вместимости форматируются как `1 000`, `10 000`.
- Добавлены поля оплаты организатора: Kaspi номер/владелец.
- Подключены Yandex-подсказки для добавления места:
  - поиск по названию;
  - поиск по адресу;
  - поддержка русских и латинских запросов типа `Dostyk`;
  - loader внутри input;
  - после выбора подсказки должны подставляться адрес и координаты.
- Добавлено создание места через backend API `POST /api/places/current/`.
- При ошибке API frontend теперь должен показывать реальный `detail/error` из backend, а не только общую фразу.
- Ограничение на открытие frontend в браузере временно убрано, чтобы смотреть ошибки.

## Документация

- `docs/AGENT_HANDOFF.md` — этот файл, обновляется после каждой сессии
- `docs/DESIGN_REVIEW.md` — сравнение дизайна и фронтенда, список мёртвого кода (2026-05-31)
- `docs/ARCHITECTURE_ANALYSIS.md` — анализ архитектурных решений, баги, приоритеты (2026-05-31)
- `docs/IMPLEMENTATION_NOTES.md` — исходные заметки по MVP порядку и безопасности

## Важные файлы

- Backend settings: `backend/config/settings.py`
- Telegram middleware: `backend/apps/accounts/middleware.py`
- Bootstrap API: `backend/apps/events/bootstrap.py`
- Создание мест: `backend/apps/places/views.py`
- Создание товаров/сборов: `backend/apps/fundraising/views.py`
- Frontend entry: `frontend/src/App.tsx`
- Основной UI: `frontend/src/design/DesignApp.tsx`
- API client: `frontend/src/api/client.ts`
- Places API: `frontend/src/api/places.ts`
- Vite config/version/allowed hosts: `frontend/vite.config.ts`
- Frontend env: `frontend/.env`
- Backend env: `backend/.env`

## Переменные окружения

Не печатать значения ключей в чат и не коммитить реальные секреты.

Backend:

- Telegram bot token.
- PostgreSQL настройки.
- Django secret/debug/allowed hosts.

Frontend:

- `VITE_API_BASE_URL=/api`
- `VITE_BACKEND_ORIGIN=http://127.0.0.1:8000`
- `VITE_YANDEX_MAPS_API_KEY`
- `VITE_YANDEX_SUGGEST_API_KEY`
- `VITE_ALLOWED_HOSTS` для ngrok host.

## Текущие проверки

- `npm run lint` во frontend проходил после последних правок.
- Backend ранее проходил `poetry run python manage.py check`.
- Для проверки локальной БД может понадобиться запуск команд вне sandbox, потому что доступ к `127.0.0.1:5433` может блокироваться.

## Известные текущие проблемы

- При добавлении места пользователь увидел ошибку:
  `Не удалось добавить место. Проверьте событие, группу и соединение.`
  Вероятные причины:
  - попытка отправить API-запрос из обычного браузера без Telegram `initData`;
  - Telegram-пользователь не состоит в группе;
  - нет активного/созданного события для группы;
  - backend вернул конкретный `detail`, но раньше frontend его скрывал.

- В консоли React появился warning:
  `Encountered two children with the same key, Алматы, микрорайон Самал-2, 111`
  Значит список Yandex-подсказок рендерится с неуникальным key, скорее всего по адресу/названию. Следующему агенту нужно заменить key в `SuggestList` на стабильный уникальный ключ, например `${item.title}-${item.address}-${item.lat}-${item.lng}-${index}` или заранее дедуплицировать suggestions.

- Если место добавляется без координат, карта показывает предупреждение про `latitude/longitude`. После выбора Yandex-подсказки координаты должны сохраняться автоматически. Нужно перепроверить payload в Network и backend response.

- `docs/IMPLEMENTATION_NOTES.md` частично устарел: там указано, что frontend browser guard включен, но сейчас он временно снят для отладки.

## Как запускать локально

Backend:

```bash
cd backend
poetry install
poetry run python manage.py migrate
poetry run python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

PostgreSQL:

```bash
docker compose up -d
```

Для Telegram Mini App через ngrok:

```bash
ngrok http 5173
```

Затем добавить ngrok host в `VITE_ALLOWED_HOSTS` и URL Mini App в настройках Telegram bot.

## Что лучше сделать дальше

1. Повторить добавление места и посмотреть реальную ошибку backend-а в UI/Network.
2. Проверить, что после выбора подсказки Yandex в payload уходят `latitude` и `longitude`.
3. Если ошибка из-за Telegram auth, тестировать добавление места только внутри Telegram Mini App.
4. Если ошибка из-за группы/события, проверить `Membership` и `Event` в базе.
5. Обновить или удалить устаревшую строку про browser guard в `docs/IMPLEMENTATION_NOTES.md`, когда режим доступа будет окончательно решен.
6. Проверить, нужен ли компонент `Sheet` в `DesignApp.tsx` — он определён, но нигде не используется.


## Session Update 2026-05-31

### Rule for next agents

- Update this file after every work session: completed changes, decisions, checks run, and remaining work.
- Do not write real secrets or API keys into chat or docs. Use present/len/fingerprint diagnostics.
- If backend models change, record migrations and whether `poetry run python manage.py migrate` is needed.
- If frontend API contracts change, record related files in `frontend/src/api/*`, `frontend/src/App.tsx`, and `frontend/src/design/DesignApp.tsx`.
- Remove accidental temporary files before handing off.

### Current session summary

- Fixed Yandex suggestion duplicate React keys.
- Added frontend `ApiError` diagnostics with status, path, body, and backend source/code metadata.
- Reworked place creation and geocoding:
  - frontend no longer blocks save on Yandex `scriptError`;
  - live search no longer calls `ymaps.geocode` on every keystroke;
  - suggestions use direct Yandex Suggest API;
  - selected suggestions can send `yandexUri` to backend;
  - backend geocoding service added in `backend/apps/places/geocoding.py`;
  - backend uses `YANDEX_GEOCODER_API_KEY` and `https://geocode-maps.yandex.ru/v1/`;
  - geocoding failures return detailed source/code.
- Added `poetry run python manage.py geocode_places` to backfill coordinates.
- Added place voting endpoint `POST /api/places/{id}/support/`; bootstrap returns `supported`; frontend keeps supported state after reload and avoids double-counting optimistic votes.
- Fixed UI issues: route button overflow, map sheet title/address layout, avatar centering, hiding empty place fields, skeleton loading for bootstrap, and removing UI states link from profile.
- Main screen now hides `Open collection` when the user is not participating; organizers can still open it.
- Removed forced redirect to Participants for organizers after reload.
- Added group-code onboarding flow:
  - `StudentGroup.invite_code`;
  - migration `backend/apps/accounts/migrations/0002_studentgroup_invite_code.py`;
  - admin exposes invite code;
  - endpoint `POST /api/auth/join-group/`;
  - bootstrap no longer falls back to the first group when membership is missing;
  - frontend shows group-code input when `needsGroupCode` is true.

### Checks

- `npm run lint` passed after frontend changes.
- `poetry run python manage.py check` passed after backend changes.
- `poetry run python manage.py makemigrations --check --dry-run` reported no changes detected.
- User reported migrations were applied.

### Notes

- Yandex Geocoder keys may take about 30 minutes to activate; this caused earlier `403 Invalid api key`.
- Current architecture allows multiple organizers in one group/fundraising because role is stored in `Membership` and `Fundraising` belongs to `Event`, not to one organizer.
- After `.env` changes, restart the relevant server; Telegram WebView may need a full Mini App reopen to clear stale frontend bundle.

## Session Update 2026-05-31 - Yandex Suggest Region

### Completed

- Read all files in `docs/` before changing code.
- Updated `frontend/src/design/DesignApp.tsx` so Yandex Suggest queries are biased to `Алматы Казахстан` and `Казахстан`.
- Added client-side filtering for Yandex Suggest results:
  - reject obvious non-Kazakhstan results such as Russia/Moscow;
  - keep Kazakhstan/Almaty results only;
  - sort Almaty results before broader Kazakhstan matches.

### Checks

- `npm run lint` passed.

## Session Update 2026-05-31 - Cleanup (dead code removal)

### Completed

- Removed dead scaffold that remained after DesignApp integration:
  - Deleted `frontend/src/pages/` (5 files: EventHomePage, FundraisingPage, ParticipantsPage, PlacesPage, ProfilePage) — none were imported.
  - Deleted `frontend/src/components/` (AppShell, BudgetProgress, StatusBadge, TelegramOnlyGuard) — all unused.
  - Deleted `frontend/src/lib/useTelegramTheme.ts` — unused.
  - Deleted `frontend/vite.config.d.ts` and `frontend/vite.config.js` — compiled artifacts that shouldn't be committed.
  - Removed `BrowserRouter` import and wrapper from `frontend/src/main.tsx` — DesignApp manages its own stack navigation; react-router was vestigial.
- Created `docs/DESIGN_REVIEW.md` with full design-transfer verification, component checklist, and dead-code audit.

### Checks

- Verified with `grep` before deletion that none of the removed files were imported anywhere.
- `node_modules` not installed locally — TypeScript check not run. Run `npm install && npm run lint` after next deploy.

### Notes

- `react-router-dom` is now only used in `package.json` as a dependency (it was only used in the deleted files). Consider removing it from `package.json` as well once confirmed nothing else needs it.
- `src/components/` folder is now gone. All UI components live in `src/design/DesignApp.tsx`.

---

## Session Update 2026-05-31 — Bug Fix Batch

### Completed

All bugs and technical debt from `docs/ARCHITECTURE_ANALYSIS.md` fixed:

1. **Rounding fix** — `backend/apps/fundraising/services.py`: remainder from integer division distributed to first invoice; `Invoice.rounding_delta` now populated. Participants queried with `.order_by("pk")` for stable remainder assignment.
2. **ValidationError → 400** — `backend/apps/fundraising/views.py`: `PriceItem.objects.create()` wrapped in `try/except DjangoValidationError` → returns `{"detail": "..."}` with HTTP 400.
3. **dateLabel format** — `backend/apps/events/bootstrap.py`: `_ru_date()` helper produces "20 июня 2026" instead of "20.06.2026".
4. **N+1 fix** — `backend/apps/events/bootstrap.py`: `_compute_user_voted_ids()` and `_build_invoice_map()` precompute votes set and invoice dict before loops. 35 extra SQL queries per bootstrap eliminated.
5. **Frontend error state** — `frontend/src/App.tsx` + `frontend/src/design/DesignApp.tsx`: added `isError` and `onRetry` props; bootstrap failure shows `StateView` with retry button instead of empty screen. Also added `refresh: RotateCcw` icon to `iconMap`.
6. **ViewSet security** — `backend/apps/places/views.py`, `urls.py` + `backend/apps/fundraising/urls.py`: removed all open `ModelViewSet` endpoints (`GET /api/places/`, `/api/fundraisings/`, etc.). Extracted `PlaceSupportView` as standalone `APIView`. Dead `PlaceIdeaViewSet`/`PlaceVoteViewSet` classes removed.
7. **react-router-dom removed** — `frontend/package.json`: uninstalled unused dependency.

### Test Infrastructure Added

- `backend/conftest.py` — shared fixtures: `group`, `event`, `fundraising`, `category`, `organizer_user`, `make_participant()`
- `backend/tests/fundraising/test_services.py` — 5 tests for rounding
- `backend/tests/fundraising/test_views_price_item.py` — 1 test for ValidationError→400
- `backend/tests/events/test_bootstrap.py` — 6 tests for dateLabel + N+1
- `backend/tests/places/test_viewsets_removed.py` — 3 tests for ViewSet removal + support

### Checks

- `poetry run python manage.py check` — 0 issues
- `poetry run pytest` — **15 passed**
- `npm run lint` and `npm run build` — clean
- No new migrations needed (no model changes)

### Notes

- `FundraisingViewSet` with `finalize` action still exists in `views.py` but is no longer exposed via URLs. Wire up when frontend needs it.
- `Sheet` component that was flagged in DESIGN_REVIEW.md turned out to be `MapSheet` which IS used — no action needed.
- All architecture issues from `docs/ARCHITECTURE_ANALYSIS.md` are now resolved. Only remaining item: ModelViewSets scope (fixed) and `bootstrapQuery.retry: false` (low priority — consider `retry: 1` for production).
