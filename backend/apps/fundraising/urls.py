from django.urls import path

from apps.fundraising.views import ApprovePriceItemView, CurrentFundraisingCreateView, CurrentFundraisingFinalizeView, CurrentPriceItemCreateView, RejectPriceItemView

urlpatterns = [
    path("fundraisings/current/finalize/", CurrentFundraisingFinalizeView.as_view(), name="current-fundraising-finalize"),
    path("fundraisings/current/", CurrentFundraisingCreateView.as_view(), name="current-fundraising-create"),
    path("price-items/current/", CurrentPriceItemCreateView.as_view(), name="current-price-item-create"),
    path("price-items/<int:pk>/approve/", ApprovePriceItemView.as_view(), name="price-item-approve"),
    path("price-items/<int:pk>/reject/", RejectPriceItemView.as_view(), name="price-item-reject"),
]
