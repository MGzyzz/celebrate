import html
import json
import threading
import urllib.request

from django.conf import settings

from apps.events.bootstrap import _ru_date


def _fmt_amount(amount: int) -> str:
    return f"{amount:,}".replace(",", " ")  # narrow no-break space — стандарт для рус. чисел


def _e(text: str) -> str:
    return html.escape(str(text))


def _build_message(fundraising, invoice, approved_items=None) -> tuple[str, dict]:
    event = fundraising.event
    user = invoice.user
    deadline = _ru_date(fundraising.deadline.date())

    amount_str = _fmt_amount(invoice.amount)
    payment_phone = (event.payment_phone or "").strip()
    payment_holder = (event.payment_holder or "").strip()
    comment = f"{event.title} — {user.first_name}"

    # --- Детализация счёта ---
    breakdown_lines = [f"Общая часть: {_fmt_amount(invoice.common_amount)} тг"]
    if invoice.alcohol_amount > 0:
        breakdown_lines.append(f"Алкоголь: {_fmt_amount(invoice.alcohol_amount)} тг")
    if invoice.individual_amount > 0:
        breakdown_lines.append(f"Индивидуально: {_fmt_amount(invoice.individual_amount)} тг")

    # --- Чек товаров ---
    items_lines = []
    if approved_items:
        for it in approved_items:
            qty_str = f" ({it.quantity} {it.unit})" if it.quantity > 1 else ""
            items_lines.append(f"• {_e(it.title)}{qty_str} — {_fmt_amount(it.total_price)} тг")

    parts = [
        f"<b>{_e(event.title)} — твой счёт готов</b>",
        "",
        f"<b>{_e(amount_str)} тг</b>",
        f"Срок оплаты: <i>{_e(deadline)}</i>",
        "",
        f"<blockquote expandable>{_e(chr(10).join(breakdown_lines))}</blockquote>",
    ]

    if items_lines:
        parts += [
            "",
            f"<blockquote expandable>Товары:\n{chr(10).join(items_lines)}</blockquote>",
        ]

    if payment_phone:
        parts += [
            "",
            f"Kaspi: <code>{_e(payment_phone)}</code>  {_e(payment_holder)}",
            f"Комментарий: <code>{_e(comment)}</code>",
        ]

    parts += [
        "",
        "<i>Организатор подтвердит оплату вручную.</i>",
    ]

    text = "\n".join(parts)

    reply_markup = {
        "inline_keyboard": [[
            {"text": "↗ Открыть Kaspi", "url": "https://kaspi.kz"},
            {"text": "✓ Я оплатил", "callback_data": f"paid:{invoice.id}"},
        ]]
    }

    return text, reply_markup


def _send_one(token: str, chat_id, text: str, reply_markup: dict) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": reply_markup,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception:
        pass


def _send_all(token: str, fundraising, invoices) -> None:
    from apps.fundraising.models import PriceItem
    shared_items = list(
        fundraising.items.filter(
            status=PriceItem.Status.APPROVED,
            item_type__in=[PriceItem.ItemType.COMMON, PriceItem.ItemType.ALCOHOL],
        ).order_by("item_type", "title")
    )
    individual_items = list(
        fundraising.items.filter(
            status=PriceItem.Status.APPROVED,
            item_type=PriceItem.ItemType.INDIVIDUAL,
        ).order_by("title")
    )
    for invoice in invoices:
        try:
            my_individual = [it for it in individual_items if it.assigned_to_id == invoice.user_id]
            text, reply_markup = _build_message(fundraising, invoice, shared_items + my_individual)
            _send_one(token, invoice.user.telegram_id, text, reply_markup)
        except Exception:
            pass


def send_finalize_notifications(fundraising, invoices) -> None:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not token:
        return
    t = threading.Thread(
        target=_send_all,
        args=(token, fundraising, list(invoices)),
        daemon=True,
    )
    t.start()
