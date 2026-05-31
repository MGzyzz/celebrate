from django.urls import path

from apps.notifications.views import webhook

urlpatterns = [
    path("bot/webhook/", webhook, name="bot-webhook"),
]
