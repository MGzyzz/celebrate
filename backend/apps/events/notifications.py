import json
import threading
import urllib.request

from django.conf import settings

from apps.events.bootstrap import _ru_date


def _fmt_amount(amount: int) -> str:
    """Format an integer with Russian thousands separator (space)."""
    return f"{amount:,}".replace(",", " ")


def _build_message(fundraising, invoice) -> str:
    event = fundraising.event
    user = invoice.user
    deadline_date = _ru_date(fundraising.deadline.date())

    amount = _fmt_amount(invoice.amount)
    common_amount = _fmt_amount(invoice.common_amount)
    alcohol_amount = _fmt_amount(invoice.alcohol_amount)

    lines = [
        f"\U0001f393 {event.title} — твой счёт готов!",
        "",
        f"Итого: {amount} тг",
        "",
        "Из чего:",
        f"• Общая часть: {common_amount} тг",
    ]

    if invoice.alcohol_amount != 0:
        lines.append(f"• Алкоголь: {alcohol_amount} тг")

    lines.append("")
    lines.append(f"Оплати до {deadline_date}:")

    payment_phone = event.payment_phone or ""
    payment_holder = event.payment_holder or ""

    if payment_phone:
        lines.append(f"{payment_phone} ({payment_holder})")
        lines.append(f"Комментарий: {event.title} — {user.first_name}")

    lines.append("")
    lines.append("Организатор подтвердит оплату вручную.")

    return "\n".join(lines)


def _send_one(token: str, chat_id, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception:
        pass


def _send_all(token: str, fundraising, invoices) -> None:
    for invoice in invoices:
        try:
            message = _build_message(fundraising, invoice)
            _send_one(token, invoice.user.telegram_id, message)
        except Exception:
            pass


def send_finalize_notifications(fundraising, invoices) -> None:
    """Send payment notification to each invoice recipient via Telegram.

    Runs in a background daemon thread so it does not block the view response.
    Silently no-ops when TELEGRAM_BOT_TOKEN is not configured.
    """
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not token:
        return
    t = threading.Thread(
        target=_send_all,
        args=(token, fundraising, list(invoices)),
        daemon=True,
    )
    t.start()
