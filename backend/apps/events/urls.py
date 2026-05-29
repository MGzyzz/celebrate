from rest_framework.routers import DefaultRouter

from apps.events.views import EventViewSet, ParticipationViewSet


router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("participations", ParticipationViewSet, basename="participation")

urlpatterns = router.urls
