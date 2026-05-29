from django.db import models


class TelegramUser(models.Model):
    telegram_id = models.BigIntegerField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True)
    photo_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Пользователь Telegram"
        verbose_name_plural = "Пользователи Telegram"
        indexes = [
            models.Index(fields=["telegram_id"]),
            models.Index(fields=["username"]),
        ]

    def __str__(self) -> str:
        return self.username or self.first_name


class StudentGroup(models.Model):
    name = models.CharField(max_length=255)
    telegram_chat_id = models.BigIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=8, default="KZT")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Группа студентов"
        verbose_name_plural = "Группы студентов"
        indexes = [
            models.Index(fields=["telegram_chat_id"]),
        ]

    def __str__(self) -> str:
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        PARTICIPANT = "participant", "Участник"
        ORGANIZER = "organizer", "Организатор"
        ADMIN = "admin", "Администратор"

    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name="memberships")
    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.PARTICIPANT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Участник группы"
        verbose_name_plural = "Участники групп"
        constraints = [
            models.UniqueConstraint(fields=["user", "group"], name="unique_user_group_membership"),
        ]
        indexes = [
            models.Index(fields=["group", "role"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.group}"
