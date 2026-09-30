from django.contrib import admin
from django.urls import include, path

from dashboard.user import PlatformUserListView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Admin authentication and role/permission APIs
    path("api/admin/", include("accounts.urls")),

    # Module 11 - Coupons / Offers / Marketing
    path(
        "api/admin/marketing/",
        include("marketing.urls"),
    ),

    # Dashboard APIs
    path(
        "api/admin/users/",
        PlatformUserListView.as_view(),
        name="platform-users",
    ),
    path(
        "api/admin/audit-logs/",
        include("audit.urls"),
    ),
    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),
]