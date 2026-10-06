from django.urls import path

from .views import AdminNotificationReadStateView, AuditLogListView

urlpatterns = [
    path("", AuditLogListView.as_view(), name="audit-log-list"),
    path(
        "notification-read-state/",
        AdminNotificationReadStateView.as_view(),
        name="admin-notification-read-state",
    ),
]
