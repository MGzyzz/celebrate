from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.fundraising.views import (
    CurrentFundraisingCreateView,
    CurrentPriceItemCreateView,
    FundraisingViewSet,
    InvoiceViewSet,
    ItemCategoryViewSet,
    PriceItemSupportViewSet,
    PriceItemViewSet,
)


router = DefaultRouter()
router.register("categories", ItemCategoryViewSet, basename="category")
router.register("fundraisings", FundraisingViewSet, basename="fundraising")
router.register("price-items", PriceItemViewSet, basename="price-item")
router.register("price-item-supports", PriceItemSupportViewSet, basename="price-item-support")
router.register("invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("fundraisings/current/", CurrentFundraisingCreateView.as_view(), name="current-fundraising-create"),
    path("price-items/current/", CurrentPriceItemCreateView.as_view(), name="current-price-item-create"),
    *router.urls,
]
