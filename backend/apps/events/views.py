from rest_framework import viewsets

from apps.events.models import Event, Participation
from apps.events.serializers import EventSerializer, ParticipationSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("group").all()
    serializer_class = EventSerializer


class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.select_related("event", "user").all()
    serializer_class = ParticipationSerializer
