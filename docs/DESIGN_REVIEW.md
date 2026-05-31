# Design Review — перенос дизайна и структура проекта

Дата: 2026-05-31  
Проверял: агент (Claude Sonnet 4.6)

---

## 1. Перенос дизайна: статус по каждому экрану

### Источник дизайна
`Design for telegram app/` — прототип на plain React (CDN), без TypeScript и сборки.  
Файлы: `app-main.jsx`, `app-ui.jsx`, `app-data.js`, `app-i18n.js`, `screens-*.jsx`, `frames/`.

### Куда перенесено
`frontend/src/design/DesignApp.tsx` — монолитный TypeScript файл (1791 строк).  
Данные: `frontend/src/design/data.ts`.  
i18n: `frontend/src/design/i18n.ts`.

### Статус экранов

| Экран в дизайне | Экран во фронтенде | Статус |
|---|---|---|
| HomeScreen (participant) | HomeScreen | ✅ Перенесён, расширен для organizer |
| ConfirmScreen | ConfirmScreen | ✅ Перенесён точно |
| PlacesScreen (список + карта) | PlacesScreen | ✅ Перенесён, добавлена реальная Yandex Maps |
| PlaceScreen (детали) | PlaceScreen | ✅ Перенесён, добавлены voting/support |
| AddPlaceScreen | AddPlaceScreen | ✅ Перенесён, добавлены Yandex Suggest подсказки |
| CollectionsScreen | CollectionsScreen | ✅ Перенесён |
| CollectionScreen | CollectionScreen | ✅ Перенесён |
| AddItemScreen (с дублями) | AddItemScreen | ✅ Перенесён |
| InvoiceScreen | InvoiceScreen | ✅ Перенесён, оплата динамична из backend |
| ParticipantsScreen | ParticipantsScreen | ✅ Перенесён, добавлены фильтры |
| ParticipantScreen | ParticipantScreen | ✅ Перенесён |
| FinalizeScreen | FinalizeScreen | ✅ Перенесён |
| ProfileScreen | ProfileScreen | ✅ Перенесён с отличиями (см. ниже) |
| Onboarding | Onboarding | ✅ Перенесён |
| StatesScreen | StatesScreen | ✅ Перенесён |
| — | JoinGroupScreen | 🆕 Новый экран (нет в дизайне) |
| — | CreateCollectionScreen | 🆕 Новый экран (нет в дизайне) |

### Статус UI-компонентов

| Компонент в дизайне | Во фронтенде | Статус |
|---|---|---|
| Icon (inline SVG путь) | Icon через lucide-react | ✅ Заменён на lucide — аналогичный визуал |
| Btn | Btn (inline) | ✅ |
| Badge | Badge (inline) | ✅ |
| BudgetProgress | BudgetProgress (inline в DesignApp) | ✅ |
| Chip | Chip (inline) | ✅ |
| TopBar | TopBar (inline) | ✅ |
| BottomNav | BottomNav (inline) | ✅ |
| Sheet | Sheet (inline, не используется) | ⚠️ Определён, нигде не вызван |
| Modal | Modal (inline) | ✅ (FinalizeScreen) |
| Toast | Toast (inline) | ✅ |
| Skeleton | Skeleton (inline) | ✅ |
| StateView | StateView (inline) | ✅ |
| Field / Input / Stepper | (inline) | ✅ Input расширен + loading spinner |
| Avatar | Avatar (inline) | ✅ |
| Card / SectionLabel | (inline) | ✅ |
| IOSDevice / TweaksPanel | Не перенесены | ✅ Правильно — это только для прототипа |

### CSS

`styles.css` воспроизводит все дизайн-переменные (`--accent`, `--bg`, `--surface-*`, `--st-*`, `--sep-*`).  
Все ключевые классы из дизайна (`event-hero`, `quick-grid`, `quick-action`, `stat-box`, `invoice-shortcut`, `suggest`, `ob-art-box`, `select-card`, `duplicate-card`, `coords`, `lrow-chev`) присутствуют в `styles.css`. **CSS перенесён полностью.**

---

## 2. Отличия фронтенда от дизайна (намеренные изменения)

| Место | Дизайн | Фронтенд | Причина |
|---|---|---|---|
| ProfileScreen: переключение роли | Сегментированный контрол (participant/organizer) | Роль из backend, нет переключателя | Роль определяется Membership в БД |
| ProfileScreen: версия | «v1 · прототип» | Динамическая версия из `package.json` (`__APP_VERSION__`) | Автоматизация версий |
| ProfileScreen: ссылка «UI-состояния» | Есть в settings listcard | Убрана | Намеренно убрана |
| InvoiceScreen: реквизиты | Хардкодированные «+7 707...» | Динамические из `event.payment.phone/holder` | Backend-данные |
| HomeScreen hero | gradient card с inline style | `.event-hero` CSS класс | Стиль вынесен в CSS |
| HomeScreen: кнопка «Открыть сбор» | Всегда видна в quick actions | Скрыта для участника без статуса "in" | UX: не показывать нерелевантное |
| Organizer view в HomeScreen | Не было в дизайне | Добавлена панель с ссылкой на участников | Новая функциональность |
| CollectionScreen: смета | Нет раздела «Смета товаров» | Добавлен CalcLine breakdown | Детализация бюджета |

---

## 3. Мёртвый (лишний) код — нужно удалить

Это самая важная часть. Когда дизайн подключили через `DesignApp.tsx`, старый scaffold остался в проекте. Ни один из этих файлов не импортируется из `App.tsx` или `main.tsx`.

### `src/pages/` — папка полностью мёртвая

Все 5 файлов **не импортируются нигде**:

- `src/pages/EventHomePage.tsx`
- `src/pages/FundraisingPage.tsx`
- `src/pages/ParticipantsPage.tsx`
- `src/pages/PlacesPage.tsx`
- `src/pages/ProfilePage.tsx`

Это старый scaffold, созданный до интеграции дизайна. Все они используют старую разметку, старые компоненты и не связаны с текущим UI.

### `src/components/` — частично мёртвая папка

Не импортируются нигде за пределами собственного определения:

- `src/components/AppShell.tsx` — старая навигация на `NavLink` (react-router-dom), не вызывается
- `src/components/BudgetProgress.tsx` — своя версия, DesignApp.tsx имеет свой `BudgetProgress` inline
- `src/components/StatusBadge.tsx` — не используется
- `src/components/TelegramOnlyGuard.tsx` — временно отключён (убран из App.tsx), не используется

### `src/lib/useTelegramTheme.ts` — не импортируется нигде

### `BrowserRouter` в `main.tsx` — лишняя обёртка

`main.tsx` оборачивает приложение в `<BrowserRouter>`, но `DesignApp.tsx` управляет навигацией самостоятельно через собственный stack-based nav. `BrowserRouter` не влияет на работу, но создаёт путаницу.

### `vite.config.d.ts` и `vite.config.js` — скомпилированные артефакты

Эти файлы — результат компиляции `vite.config.ts`. Они не должны быть в репозитории.

---

## 4. Структура проекта — взгляд нового разработчика

```
frontend/src/
├── App.tsx              ← точка входа: API-мутации + DesignApp
├── main.tsx             ← React root + QueryClient + BrowserRouter (лишний)
├── styles.css           ← все стили приложения
├── design/
│   ├── DesignApp.tsx    ← ВСЯ логика UI (1791 строк). Это основной файл.
│   ├── data.ts          ← типы + fallback-данные
│   └── i18n.ts          ← переводы (ru + kk)
├── api/
│   ├── client.ts        ← базовый fetch с ApiError
│   ├── bootstrap.ts     ← GET /api/bootstrap/
│   ├── accounts.ts      ← POST /api/auth/join-group/
│   ├── fundraising.ts   ← POST /api/fundraising/current/ и items
│   └── places.ts        ← POST /api/places/current/ и support
│
│ ↓ Следующие папки содержат МЁРТВЫЙ КОД (не используются):
│
├── pages/               ← старый scaffold, все файлы мёртвые
├── components/          ← частично мёртвый scaffold
└── lib/                 ← useTelegramTheme.ts не используется
```

### Как работает приложение (кратко для нового разработчика)

1. `main.tsx` запускает React, QueryClient, вызывает `WebApp.ready()`.
2. `App.tsx` делает `useQuery("bootstrap")` → получает все данные одним запросом.
3. `DesignApp.tsx` получает данные через props и рендерит весь UI.
4. Навигация: собственный stack per tab (`nav.stacks`), без react-router.
5. Мутации (создать сбор, место, etc.) через `useMutation` в `App.tsx`, передаются как `onCreateX` props.
6. Тема: `localStorage("vyp_theme")`, язык: state в DesignApp.
7. Роль: из `appData.me.role` (backend определяет через Membership).

---

## 5. Открытые баги (из AGENT_HANDOFF.md, не закрыты)

1. `Sheet` компонент определён в DesignApp.tsx но нигде не вызывается — или он был заменён или забыт.
2. Ошибки при добавлении места без Telegram initData — ожидаемо, но нужно тестировать только внутри Telegram.
3. Координаты мест: если Yandex URI не приходит, `latitude/longitude` могут быть пустыми — backend делает geocode fallback.

---

## 6. Рекомендации для следующего агента

### Безопасно удалить (мёртвый код):
```
frontend/src/pages/           # вся папка
frontend/src/components/AppShell.tsx
frontend/src/components/BudgetProgress.tsx
frontend/src/components/StatusBadge.tsx
frontend/src/components/TelegramOnlyGuard.tsx
frontend/src/lib/useTelegramTheme.ts
frontend/vite.config.d.ts
frontend/vite.config.js
```

### Рассмотреть:
- Убрать `BrowserRouter` из `main.tsx` или оставить — не ломает ничего.
- Проверить, нужен ли `Sheet` компонент — если нет, удалить.
- Решить судьбу `TelegramOnlyGuard` — включить обратно в prod или удалить.

### Перед удалением кода:
- Запустить `npm run lint` и убедиться что нет импортов.
- Запустить `npm run build` и проверить что нет ошибок.
