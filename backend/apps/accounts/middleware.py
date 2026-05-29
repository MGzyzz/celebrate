from django.http import JsonResponse

from apps.accounts.services import TelegramAuthError, validate_telegram_init_data


class TelegramInitDataRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_validate(request.path):
            init_data = request.headers.get("X-Telegram-Init-Data", "")
            try:
                validate_telegram_init_data(init_data)
            except TelegramAuthError as exc:
                return JsonResponse(
                    {
                        "code": 403,
                        "detail": "API доступен только внутри Telegram Mini App.",
                        "error": str(exc),
                    },
                    status=403,
                )

        return self.get_response(request)

    @staticmethod
    def _should_validate(path: str) -> bool:
        return path.startswith("/api/") and path != "/api/auth/telegram/"
