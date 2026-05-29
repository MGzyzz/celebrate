from django.urls import path

from apps.accounts.views import TelegramAuthView


urlpatterns = [
    path("telegram/", TelegramAuthView.as_view(), name="telegram-auth"),
]
