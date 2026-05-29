from django.contrib import admin

from apps.accounts.models import Membership, StudentGroup, TelegramUser


@admin.register(TelegramUser)
class TelegramUserAdmin(admin.ModelAdmin):
    list_display = ("telegram_id", "username", "first_name", "created_at")
    search_fields = ("telegram_id", "username", "first_name", "last_name")


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "telegram_chat_id", "currency", "created_at")
    search_fields = ("name", "telegram_chat_id")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "group", "role", "created_at")
    list_filter = ("role", "group")
