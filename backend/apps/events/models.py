from django.core.validators import MinValueValidator
from django.db import models

from apps.accounts.models import StudentGroup, TelegramUser


class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активно"
        ARCHIVED = "archived", "В архиве"

    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date = models.DateField(null=True, blank=True)
    payment_phone = models.CharField("Номер Kaspi организатора", max_length=32, blank=True)
    payment_holder = models.CharField("Владелец Kaspi", max_length=150, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Событие"
        verbose_name_plural = "События"
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["event_date"]),
        ]

    def __str__(self) -> str:
        return self.title


class Participation(models.Model):
    class Status(models.TextChoices):
        PARTICIPATING = "participating", "Участвует"
        NOT_PARTICIPATING = "not_participating", "Не участвует"
        THINKING = "thinking", "Думает"
        UNKNOWN = "unknown", "Не ответил"

    class PaymentShare(models.TextChoices):
        REGULAR = "regular", "Обычная доля"
        NO_ALCOHOL = "no_alcohol", "Без алкоголя"
        INDIVIDUAL = "individual", "Индивидуальная доля"
        EXEMPT = "exempt", "Освобожден от оплаты"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="participations")
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name="participations")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PARTICIPATING)
    payment_share = models.CharField(max_length=32, choices=PaymentShare.choices, default=PaymentShare.REGULAR)
    custom_share_amount = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Optional fixed amount in KZT for individual share participants.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Участие в событии"
        verbose_name_plural = "Участие в событиях"
        constraints = [
            models.UniqueConstraint(fields=["event", "user"], name="unique_event_user_participation"),
        ]
        indexes = [
            models.Index(fields=["event", "status"]),
            models.Index(fields=["event", "payment_share"]),
        ]

    def __str__(self) -> str:
        return f"{self.user}: {self.status}"
