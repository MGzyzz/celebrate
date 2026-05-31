import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Register or delete the Telegram bot webhook."

    def add_arguments(self, parser):
        parser.add_argument(
            "webhook_url",
            nargs="?",
            default="",
            help="Full HTTPS URL to POST /api/bot/webhook/ (omit with --delete)",
        )
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Remove the currently registered webhook",
        )
        parser.add_argument(
            "--info",
            action="store_true",
            help="Show current webhook info",
        )

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError("TELEGRAM_BOT_TOKEN is not configured.")

        base = f"https://api.telegram.org/bot{token}"

        if options["info"]:
            self._call(base + "/getWebhookInfo", b"{}")
            return

        if options["delete"]:
            self._call(base + "/deleteWebhook", b"{}")
            return

        url = options["webhook_url"]
        if not url:
            raise CommandError("Provide a webhook_url or use --delete / --info.")
        if not url.startswith("https://"):
            raise CommandError("Telegram requires an HTTPS webhook URL.")

        payload = json.dumps({"url": url}).encode("utf-8")
        self._call(base + "/setWebhook", payload)

    def _call(self, url: str, data: bytes) -> None:
        req = Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except URLError as exc:
            raise CommandError(f"Telegram API request failed: {exc}") from exc

        if result.get("ok"):
            description = result.get("description") or result.get("result") or "OK"
            self.stdout.write(self.style.SUCCESS(str(description)))
        else:
            raise CommandError(f"Telegram API error: {result}")
