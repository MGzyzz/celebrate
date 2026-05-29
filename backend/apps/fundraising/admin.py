from django.contrib import admin

from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem, PriceItemSupport


@admin.register(Fundraising)
class FundraisingAdmin(admin.ModelAdmin):
    list_display = ("title", "event", "target_amount", "deadline", "status", "finalized_at")
    list_filter = ("status", "event")
    search_fields = ("title", "description")


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "sort_order")
    list_filter = ("group",)
    search_fields = ("name",)


@admin.register(PriceItem)
class PriceItemAdmin(admin.ModelAdmin):
    list_display = ("title", "fundraising", "category", "quantity", "unit_price", "item_type", "status")
    list_filter = ("status", "item_type", "category")
    search_fields = ("title", "comment")


@admin.register(PriceItemSupport)
class PriceItemSupportAdmin(admin.ModelAdmin):
    list_display = ("item", "user", "requested_quantity", "created_at")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("fundraising", "user", "amount", "status", "sent_at", "paid_at")
    list_filter = ("status", "fundraising")
