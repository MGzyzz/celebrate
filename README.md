# Outlet Graduation Mini App

Telegram Mini App для планирования выпускного: места на карте, сборы средств, прайс-лист, участники и счета.

## Стек

- Backend: Django, Django REST Framework, PostgreSQL.
- Frontend: React, Vite, TypeScript, Telegram Web Apps SDK.
- Карты: Yandex Maps.

## Структура

```text
backend/   Django API
frontend/  Telegram Mini App frontend
docs/      дополнительные документы
```

## Backend

```bash
cd backend
cp .env.example .env
poetry install
poetry run python manage.py migrate
poetry run python manage.py runserver
```

Локальная база через Docker:

```bash
docker compose up -d postgres
```

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Для карты укажите ключ Yandex Maps JavaScript API в `frontend/.env`:

```env
VITE_YANDEX_MAPS_API_KEY=ваш_ключ
```

После изменения `.env` перезапустите `npm run dev`.

Dev URL:

```text
http://localhost:5173
```

## Документы

- [PROJECT_PLAN.md](PROJECT_PLAN.md) - продуктовый и технический план.
- [DESIGN_BRIEF.md](DESIGN_BRIEF.md) - отдельное ТЗ для дизайнера.

## Важные правила продукта

- Пользователь не редактирует товар после добавления.
- Дубли товаров показываются как подсказки.
- Остаток бюджета после финализации показывается организатору, но не собирается.
- Счета считаются по индивидуальным долям.
- Суммы показываются целыми числами в тенге.
- Оплату подтверждает организатор.
