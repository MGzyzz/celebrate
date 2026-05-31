import json
import logging
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


def _send_message(chat_id: int, text: str, reply_markup: dict | None = None) -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN is not configured")
        return

    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup

    data = json.dumps(payload).encode("utf-8")
    req = Request(
        f"{TELEGRAM_API_BASE}/bot{token}/sendMessage",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(req, timeout=5):
            pass
    except URLError as exc:
        logger.error("Telegram sendMessage failed: %s", exc)


@csrf_exempt
@require_POST
def webhook(request):
    try:
        update = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return HttpResponse(status=400)

    message = update.get("message", {})
    text = (message.get("text") or "").strip()
    chat_id = message.get("chat", {}).get("id")

    if not chat_id:
        return HttpResponse(status=200)

    if text.startswith("/start"):
        mini_app_url = settings.MINI_APP_URL
        if mini_app_url:
            _send_message(
                chat_id,
                "Привет! 👋 Открой приложение для планирования выпускного:",
                reply_markup={
                    "inline_keyboard": [[
                        {
                            "text": "🎓 Открыть приложение",
                            "web_app": {"url": mini_app_url},
                        }
                    ]]
                },
            )
        else:
            _send_message(chat_id, "Привет! Приложение ещё не настроено.")

    return HttpResponse(status=200)
