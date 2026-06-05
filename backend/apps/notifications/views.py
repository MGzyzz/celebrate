import html
import json
import logging
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.events.bootstrap import _ru_date

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


def _bot_request(method: str, payload: dict) -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN is not configured")
        return
    data = json.dumps(payload).encode("utf-8")
    req = Request(
        f"{TELEGRAM_API_BASE}/bot{token}/{method}",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(req, timeout=5):
            pass
    except URLError as exc:
        logger.error("Telegram %s failed: %s", method, exc)


def _send_message(chat_id: int, text: str, reply_markup: dict | None = None) -> None:
    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    _bot_request("sendMessage", payload)


def _answer_callback_query(callback_query_id: str, text: str = "", alert: bool = False) -> None:
    _bot_request("answerCallbackQuery", {
        "callback_query_id": callback_query_id,
        "text": text,
        "show_alert": alert,
    })


def _handle_paid_callback(callback_query: dict) -> None:
    from apps.accounts.models import Membership
    from apps.fundraising.models import Invoice

    callback_id = callback_query["id"]
    data = callback_query.get("data", "")
    from_id = str(callback_query.get("from", {}).get("id", ""))

    invoice_id = data.split(":", 1)[1]
    try:
        invoice = Invoice.objects.select_related(
            "user", "fundraising__event__group"
        ).get(pk=invoice_id)
    except Invoice.DoesNotExist:
        _answer_callback_query(callback_id, "Счёт не найден.", alert=True)
        return

    if str(invoice.user.telegram_id) != from_id:
        _answer_callback_query(callback_id, "Это не твой счёт.", alert=True)
        return

    if invoice.claimed_at:
        _answer_callback_query(callback_id, "Запрос уже отправлен. Ожидай подтверждения организатора.")
        return

    invoice.claimed_at = timezone.now()
    invoice.save(update_fields=["claimed_at"])

    _answer_callback_query(callback_id, "Запрос отправлен организатором. Ожидай подтверждения ⏳")
    _notify_organizer_about_claim(invoice)


def _notify_organizer_about_claim(invoice) -> None:
    from apps.accounts.models import Membership

    group = invoice.fundraising.event.group
    organizer = (
        Membership.objects.select_related("user")
        .filter(group=group, role__in=[Membership.Role.ORGANIZER, Membership.Role.ADMIN])
        .first()
    )
    if not organizer or not organizer.user.telegram_id:
        return

    user_name = html.escape(str(invoice.user))
    amount = f"{invoice.amount:,}".replace(",", " ")
    event_title = html.escape(invoice.fundraising.event.title)

    text = (
        f"<b>Запрос на подтверждение оплаты</b>\n\n"
        f"<b>{user_name}</b> заявил об оплате — <b>{amount} тг</b>\n"
        f"Сбор: {event_title}\n\n"
        f"Проверьте платёж и отметьте оплату в приложении."
    )
    _send_message(organizer.user.telegram_id, text)


@csrf_exempt
@require_POST
def webhook(request):
    try:
        update = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return HttpResponse(status=400)

    # /start → кнопка открытия Mini App
    message = update.get("message", {})
    text = (message.get("text") or "").strip()
    chat_id = message.get("chat", {}).get("id")

    if chat_id and text.startswith("/start"):
        mini_app_url = getattr(settings, "MINI_APP_URL", "")
        if mini_app_url:
            _send_message(
                chat_id,
                "Привет! Открой приложение для планирования выпускного:",
                reply_markup={"inline_keyboard": [[
                    {"text": "Открыть приложение", "web_app": {"url": mini_app_url}},
                ]]},
            )
        else:
            _send_message(chat_id, "Привет! Приложение ещё не настроено.")

    # Кнопка «Я оплатил»
    callback_query = update.get("callback_query")
    if callback_query:
        data = callback_query.get("data", "")
        if data.startswith("paid:"):
            _handle_paid_callback(callback_query)
        else:
            _answer_callback_query(callback_query["id"])

    return HttpResponse(status=200)
