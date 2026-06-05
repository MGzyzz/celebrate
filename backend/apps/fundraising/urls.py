from django.urls import path

from apps.fundraising.views import (
    ApprovePriceItemView,
    CategoryDeleteView,
    CategoryListCreateView,
    CurrentFundraisingCreateView,
    CurrentFundraisingFinalizeView,
    CurrentPriceItemCreateView,
    DeletePriceItemView,
    RejectPriceItemView,
    SetFundraisingPlaceView,
)

urlpatterns = [
    path("fundraisings/current/finalize/", CurrentFundraisingFinalizeView.as_view(), name="current-fundraising-finalize"),
    path("fundraisings/current/set-place/", SetFundraisingPlaceView.as_view(), name="current-fundraising-set-place"),
    path("fundraisings/current/", CurrentFundraisingCreateView.as_view(), name="current-fundraising-create"),
    path("fundraising/categories/<int:pk>/", CategoryDeleteView.as_view(), name="category-delete"),
    path("fundraising/categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("price-items/current/", CurrentPriceItemCreateView.as_view(), name="current-price-item-create"),
    path("price-items/<int:pk>/approve/", ApprovePriceItemView.as_view(), name="price-item-approve"),
    path("price-items/<int:pk>/reject/", RejectPriceItemView.as_view(), name="price-item-reject"),
    path("price-items/<int:pk>/", DeletePriceItemView.as_view(), name="price-item-delete"),
]
