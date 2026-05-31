from django.contrib import admin
from django.urls import include, path

from apps.events.bootstrap import BootstrapView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/bootstrap/", BootstrapView.as_view(), name="bootstrap"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.events.urls")),
    path("api/", include("apps.places.urls")),
    path("api/", include("apps.fundraising.urls")),
    path("api/", include("apps.notifications.urls")),
]
