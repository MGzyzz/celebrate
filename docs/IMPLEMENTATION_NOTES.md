# Implementation Notes

## MVP order

1. API authentication/session strategy after Telegram `initData` validation.
2. Group, event and participation API permissions.
3. Fundraising item creation and duplicate suggestions.
4. Individual share invoice calculation.
5. Yandex Maps integration.
6. Telegram bot notifications.

## Security notes

- Do not trust Telegram user data from the frontend until `initData` is validated.
- Browser access to the frontend is blocked by `TelegramOnlyGuard`.
- API access outside Telegram is blocked by `TelegramInitDataRequiredMiddleware`.
- Scope every query by group membership.
- Keep Telegram and Yandex API keys in environment variables.
- Organizer-only actions must be permission protected before production use.

## Current scaffold limitations

- API permissions still need role-level restrictions for organizer-only actions.
- Telegram auth validates `initData`, but does not issue JWT/session tokens yet.
- Telegram notifications are placeholders.
- Yandex Maps is represented by a placeholder screen on the frontend.
- Migrations have not been generated yet.
