from rest_framework import serializers

from apps.fundraising.models import Fundraising, Invoice, ItemCategory, PriceItem, PriceItemSupport


class ItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCategory
        fields = ["id", "group", "name", "sort_order"]


class FundraisingSerializer(serializers.ModelSerializer):
    approved_total = serializers.IntegerField(read_only=True)
    remaining_budget = serializers.IntegerField(read_only=True)

    class Meta:
        model = Fundraising
        fields = [
            "id",
            "event",
            "title",
            "description",
            "target_amount",
            "deadline",
            "status",
            "approved_total",
            "remaining_budget",
            "finalized_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["finalized_at", "created_at", "updated_at"]


class PriceItemSerializer(serializers.ModelSerializer):
    total_price = serializers.IntegerField(read_only=True)

    class Meta:
        model = PriceItem
        fields = [
            "id",
            "fundraising",
            "author",
            "category",
            "duplicate_of",
            "title",
            "quantity",
            "unit",
            "unit_price",
            "total_price",
            "item_type",
            "status",
            "comment",
            "store_url",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PriceItemSupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceItemSupport
        fields = ["id", "item", "user", "requested_quantity", "created_at"]
        read_only_fields = ["created_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "fundraising",
            "user",
            "amount",
            "common_amount",
            "alcohol_amount",
            "individual_amount",
            "rounding_delta",
            "status",
            "sent_at",
            "paid_at",
            "payment_method",
            "organizer_comment",
            "created_at",
        ]
        read_only_fields = ["created_at"]
