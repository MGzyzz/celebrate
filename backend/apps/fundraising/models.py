from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from apps.accounts.models import TelegramUser
from apps.events.models import Event


class Fundraising(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активен"
        LOCKED = "locked", "Закрыт для изменений"
        FINISHED = "finished", "Завершен"
        CANCELLED = "cancelled", "Отменен"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="fundraisings")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    target_amount = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    deadline = models.DateTimeField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Сбор средств"
        verbose_name_plural = "Сборы средств"
        indexes = [
            models.Index(fields=["event", "status"]),
            models.Index(fields=["deadline"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def approved_total(self) -> int:
        return sum(item.total_price for item in self.items.filter(status=PriceItem.Status.APPROVED))

    @property
    def remaining_budget(self) -> int:
        return max(self.target_amount - self.approved_total, 0)


class ItemCategory(models.Model):
    group = models.ForeignKey("accounts.StudentGroup", on_delete=models.CASCADE, related_name="item_categories")
    name = models.CharField(max_length=120)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Категория товара"
        verbose_name_plural = "Категории товаров"
        constraints = [
            models.UniqueConstraint(fields=["group", "name"], name="unique_category_per_group"),
        ]
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class PriceItem(models.Model):
    class Status(models.TextChoices):
        PROPOSED = "proposed", "Предложен"
        APPROVED = "approved", "Утвержден"
        REJECTED = "rejected", "Отклонен"
        PURCHASED = "purchased", "Куплен"

    class ItemType(models.TextChoices):
        COMMON = "common", "Общий"
        ALCOHOL = "alcohol", "Алкоголь"
        INDIVIDUAL = "individual", "Индивидуальный"

    fundraising = models.ForeignKey(Fundraising, on_delete=models.CASCADE, related_name="items")
    author = models.ForeignKey(TelegramUser, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(ItemCategory, on_delete=models.PROTECT, related_name="items")
    duplicate_of = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="duplicates")
    source_place = models.ForeignKey(
        "places.PlaceIdea",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="price_items",
    )
    title = models.CharField(max_length=255)
    normalized_title = models.CharField(max_length=255, db_index=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit = models.CharField(max_length=32, default="шт")
    unit_price = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    item_type = models.CharField(max_length=32, choices=ItemType.choices, default=ItemType.COMMON)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PROPOSED)
    comment = models.TextField(blank=True)
    store_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Товар прайс-листа"
        verbose_name_plural = "Товары прайс-листа"
        indexes = [
            models.Index(fields=["fundraising", "status"]),
            models.Index(fields=["fundraising", "normalized_title"]),
            models.Index(fields=["item_type"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def total_price(self) -> int:
        return self.quantity * self.unit_price

    def clean(self) -> None:
        if self.status == self.Status.APPROVED:
            current_total = 0
            if self.fundraising_id:
                approved_items = self.fundraising.items.filter(status=self.Status.APPROVED)
                if self.pk:
                    approved_items = approved_items.exclude(pk=self.pk)
                current_total = sum(item.total_price for item in approved_items)

            if current_total + self.total_price > self.fundraising.target_amount:
                raise ValidationError("Approved items cannot exceed fundraising target amount.")

    def save(self, *args, **kwargs):
        self.normalized_title = " ".join(self.title.lower().split())
        self.full_clean()
        return super().save(*args, **kwargs)


class PriceItemSupport(models.Model):
    item = models.ForeignKey(PriceItem, on_delete=models.CASCADE, related_name="supports")
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name="supported_items")
    requested_quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Поддержка товара"
        verbose_name_plural = "Поддержки товаров"
        constraints = [
            models.UniqueConstraint(fields=["item", "user"], name="unique_item_support"),
        ]


class Invoice(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает оплаты"
        PAID = "paid", "Оплачен"
        CANCELLED = "cancelled", "Отменен"

    fundraising = models.ForeignKey(Fundraising, on_delete=models.CASCADE, related_name="invoices")
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name="invoices")
    amount = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    common_amount = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    alcohol_amount = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    individual_amount = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    rounding_delta = models.IntegerField(default=0)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_method = models.CharField(max_length=120, blank=True)
    organizer_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Счет"
        verbose_name_plural = "Счета"
        constraints = [
            models.UniqueConstraint(fields=["fundraising", "user"], name="unique_invoice_per_user"),
        ]
        indexes = [
            models.Index(fields=["fundraising", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user}: {self.amount}"
