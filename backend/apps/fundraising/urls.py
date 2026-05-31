from django.urls import path

from apps.fundraising.views import CurrentFundraisingCreateView, CurrentPriceItemCreateView

urlpatterns = [
    path("fundraisings/current/", CurrentFundraisingCreateView.as_view(), name="current-fundraising-create"),
    path("price-items/current/", CurrentPriceItemCreateView.as_view(), name="current-price-item-create"),
]
