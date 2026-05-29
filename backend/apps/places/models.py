from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.accounts.models import TelegramUser
from apps.events.models import Event


class PlaceIdea(models.Model):
    class Status(models.TextChoices):
        PROPOSED = "proposed", "Предложено"
        APPROVED = "approved", "Утверждено"
        REJECTED = "rejected", "Отклонено"

    class InterestColor(models.TextChoices):
        GRAY = "gray", "Серый"
        BLUE = "blue", "Синий"
        GREEN = "green", "Зеленый"
        YELLOW = "yellow", "Желтый"
        RED = "red", "Красный"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="place_ideas")
    author = models.ForeignKey(TelegramUser, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    source_url = models.URLField(blank=True)
    photo_url = models.URLField(blank=True)
    estimated_price = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    capacity = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    amenities = models.JSONField(default=list, blank=True)
    rent_terms = models.TextField(blank=True)
    pros = models.TextField(blank=True)
    cons = models.TextField(blank=True)
    author_comment = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PROPOSED)
    interest_color = models.CharField(max_length=16, choices=InterestColor.choices, default=InterestColor.BLUE)
    interest_score = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Идея места"
        verbose_name_plural = "Идеи мест"
        indexes = [
            models.Index(fields=["event", "status"]),
            models.Index(fields=["event", "interest_color"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self) -> str:
        return self.title


class PlaceVote(models.Model):
    place = models.ForeignKey(PlaceIdea, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name="place_votes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Голос за место"
        verbose_name_plural = "Голоса за места"
        constraints = [
            models.UniqueConstraint(fields=["place", "user"], name="unique_place_vote"),
        ]
        indexes = [
            models.Index(fields=["place", "created_at"]),
        ]
