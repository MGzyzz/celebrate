from django.urls import path

from apps.places.views import CurrentPlaceCreateView, PlaceSupportView

urlpatterns = [
    path("places/current/", CurrentPlaceCreateView.as_view(), name="current-place-create"),
    path("places/<int:pk>/support/", PlaceSupportView.as_view(), name="place-support"),
]
