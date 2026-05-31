from django.urls import path

from apps.accounts.views import JoinGroupByCodeView, TelegramAuthView


urlpatterns = [
    path("telegram/", TelegramAuthView.as_view(), name="telegram-auth"),
    path("join-group/", JoinGroupByCodeView.as_view(), name="join-group"),
]
