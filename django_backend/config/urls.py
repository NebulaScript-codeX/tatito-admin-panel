from django.contrib import admin
from django.urls import include, path

from dashboard.user import PlatformUserListView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/admin/users/", PlatformUserListView.as_view(), name="platform-users"),
    path("api/admin/audit-logs/", include("audit.urls")),
    path("api/admin/", include("accounts.urls")),
    path("api/dashboard/", include("dashboard.urls")),
]
