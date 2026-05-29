import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from django.conf import settings

from apps.accounts.models import TelegramUser


class TelegramAuthError(ValueError):
    pass


def validate_telegram_init_data(init_data: str) -> dict:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise TelegramAuthError("TELEGRAM_BOT_TOKEN is not configured.")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("Telegram initData hash is missing.")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramAuthError("Telegram initData signature is invalid.")

    return parsed


def upsert_telegram_user_from_init_data(init_data_payload: dict) -> TelegramUser:
    raw_user = init_data_payload.get("user")
    if not raw_user:
        raise TelegramAuthError("Telegram initData user payload is missing.")

    user_payload = json.loads(raw_user)
    telegram_id = user_payload["id"]
    defaults = {
        "first_name": user_payload.get("first_name", ""),
        "last_name": user_payload.get("last_name", ""),
        "username": user_payload.get("username", ""),
        "photo_url": user_payload.get("photo_url", ""),
    }
    user, _ = TelegramUser.objects.update_or_create(telegram_id=telegram_id, defaults=defaults)
    return user
