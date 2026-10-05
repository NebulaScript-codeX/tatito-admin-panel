from django.urls import path

from .views import (
    AddonSettingsView,
    PlatformSettingsView,
    SettingsBackupExportView,
    SettingsBackupImportView,
    SystemNotificationSettingsView,
)


urlpatterns = [
    path(
        "",
        PlatformSettingsView.as_view(),
        name="platform-settings",
    ),
    path(
        "notifications/<int:pk>/",
        SystemNotificationSettingsView.as_view(),
        name="system-notification-setting",
    ),
    path(
        "addons/<int:pk>/",
        AddonSettingsView.as_view(),
        name="addon-setting",
    ),
    path(
        "backup/export/",
        SettingsBackupExportView.as_view(),
        name="settings-backup-export",
    ),
    path(
        "backup/import/",
        SettingsBackupImportView.as_view(),
        name="settings-backup-import",
    ),
]