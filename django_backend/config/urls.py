from django.contrib import admin
from django.urls import include, path

from dashboard.user import (
    PlatformDoctorDetailView,
    PlatformDoctorListView,
    PlatformDoctorStatusView,
    PlatformRelationshipCollectionView,
    PlatformUserDetailView,
    PlatformUserListView,
    PlatformUserStatusView,
    PlatformWalletActionView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Admin authentication and role/permission APIs
    path("api/admin/", include("accounts.urls")),

    # Module 11 - Coupons / Offers / Marketing
    path(
        "api/admin/marketing/",
        include("marketing.urls"),
    ),
    path(
        "api/admin/care/",
        include("care.urls"),
    ),
    path(
        "api/admin/health-records/",
        include("health_records.urls"),
    ),
    path(
        "api/admin/",
        include("providers.urls"),
    ),

    # Dashboard APIs
    path(
        "api/admin/users/",
        PlatformUserListView.as_view(),
        name="platform-users",
    ),
    path(
        "api/admin/doctors/",
        PlatformDoctorListView.as_view(),
        name="platform-doctors",
    ),
    path(
        "api/admin/doctors/<str:pk>/",
        PlatformDoctorDetailView.as_view(),
        name="platform-doctor-detail",
    ),
    path(
        "api/admin/doctors/<str:pk>/status/<str:action>/",
        PlatformDoctorStatusView.as_view(),
        name="platform-doctor-status",
    ),
    path(
        "api/admin/users/<str:pk>/",
        PlatformUserDetailView.as_view(),
        name="platform-user-detail",
    ),
    path(
        "api/admin/users/<str:pk>/status/<str:action>/",
        PlatformUserStatusView.as_view(),
        name="platform-user-status",
    ),
    path(
        "api/admin/users/<str:pk>/wallet/<str:direction>/",
        PlatformWalletActionView.as_view(),
        name="platform-wallet-action",
    ),
    path(
        "api/admin/users/<str:pk>/<str:kind>/",
        PlatformRelationshipCollectionView.as_view(),
        name="platform-relationship-list",
    ),
    path(
        "api/admin/users/<str:pk>/<str:kind>/<str:item_id>/",
        PlatformRelationshipCollectionView.as_view(),
        name="platform-relationship-item",
    ),
    path(
        "api/admin/audit-logs/",
        include("audit.urls"),
    ),
    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),

    path("api/admin/content/", include("content.urls")),

    path("api/admin/internships/", include("internships.urls")),

    path("api/admin/support/", include("support.urls")),
]