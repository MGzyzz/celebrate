from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.events.views import CurrentEventView, CurrentParticipationView, EventViewSet, ParticipationOrganizerView, ParticipationViewSet


router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("participations", ParticipationViewSet, basename="participation")

urlpatterns = [
    path("events/current/", CurrentEventView.as_view(), name="current-event"),
    path("participation/current/", CurrentParticipationView.as_view(), name="current-participation"),
    path("participation/organizer/", ParticipationOrganizerView.as_view(), name="participation-organizer"),
] + router.urls
