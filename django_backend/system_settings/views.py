from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from audit.services import log_action

from .models import (
    AddonSetting,
    PlatformSettings,
    SystemNotificationSetting,
)
from .serializers import (
    AddonSettingSerializer,
    PlatformSettingsSerializer,
    SystemNotificationSettingSerializer,
)


class PlatformSettingsView(APIView):
    permission_classes = [ModulePermission]
    module = "settings"

    def get(self, request):
        settings = PlatformSettings.objects.get(pk=1)

        return Response({
            "success": True,
            "settings": PlatformSettingsSerializer(settings).data,
            "notifications": SystemNotificationSettingSerializer(
                SystemNotificationSetting.objects.all().order_by("event_name"),
                many=True,
            ).data,
            "addons": AddonSettingSerializer(
                AddonSetting.objects.all().order_by("addon_name"),
                many=True,
            ).data,
        })

    def patch(self, request):
        settings = PlatformSettings.objects.get(pk=1)

        serializer = PlatformSettingsSerializer(
            settings,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors,
                },
                status=400,
            )

        settings = serializer.save(updated_by=request.user)

        log_action(
            request,
            "edit",
            module="settings",
            target_type="platform_settings",
            target_id=settings.pk,
            description="Updated platform settings",
        )

        return Response({
            "success": True,
            "settings": PlatformSettingsSerializer(settings).data,
        })


class SystemNotificationSettingsView(APIView):
    permission_classes = [ModulePermission]
    module = "settings"

    def patch(self, request, pk):
        try:
            setting = SystemNotificationSetting.objects.get(pk=pk)
        except SystemNotificationSetting.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Notification setting not found.",
                },
                status=404,
            )

        serializer = SystemNotificationSettingSerializer(
            setting,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors,
                },
                status=400,
            )

        setting = serializer.save()

        log_action(
            request,
            "edit",
            module="settings",
            target_type="notification_setting",
            target_id=setting.pk,
            description=f"Updated notification setting: {setting.event_name}",
        )

        return Response({
            "success": True,
            "setting": SystemNotificationSettingSerializer(setting).data,
        })


class AddonSettingsView(APIView):
    permission_classes = [ModulePermission]
    module = "settings"

    def patch(self, request, pk):
        try:
            addon = AddonSetting.objects.get(pk=pk)
        except AddonSetting.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Addon setting not found.",
                },
                status=404,
            )

        serializer = AddonSettingSerializer(
            addon,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors,
                },
                status=400,
            )

        addon = serializer.save()

        log_action(
            request,
            "edit",
            module="settings",
            target_type="addon_setting",
            target_id=addon.pk,
            description=f"Updated addon setting: {addon.addon_name}",
        )

        return Response({
            "success": True,
            "setting": AddonSettingSerializer(addon).data,
        })

class SettingsBackupExportView(APIView):
    permission_classes = [ModulePermission]
    module = "settings"

    def get(self, request):
        settings = PlatformSettings.objects.get(pk=1)

        backup = {
            "platform_settings": PlatformSettingsSerializer(settings).data,
            "notification_settings": SystemNotificationSettingSerializer(
                SystemNotificationSetting.objects.all().order_by("event_name"),
                many=True,
            ).data,
            "addon_settings": AddonSettingSerializer(
                AddonSetting.objects.all().order_by("addon_name"),
                many=True,
            ).data,
        }

        return Response({
            "success": True,
            "backup": backup,
        })

class SettingsBackupImportView(APIView):
    permission_classes = [ModulePermission]
    module = "settings"

    def post(self, request):
        backup = request.data.get("backup")

        if not isinstance(backup, dict):
            return Response(
                {
                    "success": False,
                    "message": "Invalid backup data.",
                },
                status=400,
            )

        settings_data = backup.get("platform_settings")

        if isinstance(settings_data, dict):
            settings = PlatformSettings.objects.get(pk=1)

            allowed_fields = {
                field.name
                for field in PlatformSettings._meta.fields
                if field.name not in {"id", "updated_by", "updated_at"}
            }

            update_data = {
                key: value
                for key, value in settings_data.items()
                if key in allowed_fields
            }

            serializer = PlatformSettingsSerializer(
                settings,
                data=update_data,
                partial=True,
            )

            if not serializer.is_valid():
                return Response(
                    {
                        "success": False,
                        "errors": serializer.errors,
                    },
                    status=400,
                )

            serializer.save(updated_by=request.user)

        notification_data = backup.get("notification_settings", [])

        if isinstance(notification_data, list):
            for item in notification_data:
                event_key = item.get("event_key")

                if not event_key:
                    continue

                SystemNotificationSetting.objects.filter(
                    event_key=event_key
                ).update(
                    enabled=bool(item.get("enabled", True))
                )

        addon_data = backup.get("addon_settings", [])

        if isinstance(addon_data, list):
            for item in addon_data:
                addon_key = item.get("addon_key")

                if not addon_key:
                    continue

                AddonSetting.objects.filter(
                    addon_key=addon_key
                ).update(
                    enabled=bool(item.get("enabled", True))
                )

        log_action(
            request,
            "edit",
            module="settings",
            target_type="settings_backup",
            target_id=1,
            description="Restored settings backup",
        )

        return Response({
            "success": True,
            "message": "Settings backup restored successfully.",
        })