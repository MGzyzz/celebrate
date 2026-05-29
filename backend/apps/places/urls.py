from rest_framework.routers import DefaultRouter

from django.urls import path

from apps.places.views import CurrentPlaceCreateView, PlaceIdeaViewSet, PlaceVoteViewSet


router = DefaultRouter()
router.register("places", PlaceIdeaViewSet, basename="place")
router.register("place-votes", PlaceVoteViewSet, basename="place-vote")

urlpatterns = [
    path("places/current/", CurrentPlaceCreateView.as_view(), name="current-place-create"),
    *router.urls,
]
