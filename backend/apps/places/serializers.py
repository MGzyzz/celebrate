from rest_framework import serializers

from apps.places.models import PlaceIdea, PlaceVote


class PlaceIdeaSerializer(serializers.ModelSerializer):
    votes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PlaceIdea
        fields = [
            "id",
            "event",
            "author",
            "title",
            "description",
            "address",
            "latitude",
            "longitude",
            "source_url",
            "photo_url",
            "estimated_price",
            "capacity",
            "amenities",
            "rent_terms",
            "pros",
            "cons",
            "author_comment",
            "status",
            "interest_color",
            "interest_score",
            "votes_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PlaceVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceVote
        fields = ["id", "place", "user", "created_at"]
        read_only_fields = ["created_at"]
