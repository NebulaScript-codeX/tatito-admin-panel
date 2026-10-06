from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role

from .models import AddonSetting, PlatformSettings, SystemNotificationSetting


class SettingsApiTests(TestCase):
    password = "SettingsTest9!Password"

    @classmethod
    def setUpTestData(cls):
        call_command("seed_admin_roles", verbosity=0)

        super_admin_role = Role.objects.get(name="Super Admin")
        cls.admin = User.objects.create_user(
            username="settings-admin",
            email="settings-admin@example.com",
            password=cls.password,
        )
        AdminProfile.objects.create(user=cls.admin, role=super_admin_role)

        pharmacist_role = Role.objects.get(name="Pharmacist")
        cls.restricted_admin = User.objects.create_user(
            username="settings-restricted-admin",
            email="settings-restricted-admin@example.com",
            password=cls.password,
        )
        AdminProfile.objects.create(
            user=cls.restricted_admin,
            role=pharmacist_role,
        )

    def setUp(self):
        self.api = APIClient()

    def login_as(self, api, user):
        response = api.post(
            "/api/admin/login/",
            {"username": user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        api.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}",
        )

    def test_get_update_and_relogin_preserve_platform_settings(self):
        self.login_as(self.api, self.admin)

        response = self.api.get("/api/admin/settings/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["settings"]["id"], 1)
        self.assertEqual(response.data["settings"]["site_name"], "Tatito Health+")
        self.assertIn("notifications", response.data)
        self.assertIn("addons", response.data)

        updated = self.api.patch(
            "/api/admin/settings/",
            {"site_name": "Tatito Admin Settings Test"},
            format="json",
        )

        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(
            updated.data["settings"]["site_name"],
            "Tatito Admin Settings Test",
        )
        self.assertEqual(
            PlatformSettings.objects.get(pk=1).site_name,
            "Tatito Admin Settings Test",
        )

        self.api.credentials()
        relogin_api = APIClient()
        self.login_as(relogin_api, self.admin)
        reloaded = relogin_api.get("/api/admin/settings/")

        self.assertEqual(reloaded.status_code, 200, reloaded.data)
        self.assertEqual(
            reloaded.data["settings"]["site_name"],
            "Tatito Admin Settings Test",
        )

    def test_invalid_settings_are_rejected_without_saving(self):
        self.login_as(self.api, self.admin)

        response = self.api.patch(
            "/api/admin/settings/",
            {"tax_percentage": 101},
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("tax_percentage", response.data["errors"])
        self.assertEqual(PlatformSettings.objects.get(pk=1).tax_percentage, 0)

    def test_notification_addon_and_backup_actions(self):
        self.login_as(self.api, self.admin)
        notification = SystemNotificationSetting.objects.get(
            event_key="new_order",
        )
        addon = AddonSetting.objects.create(
            addon_key="settings-test-addon",
            addon_name="Settings Test Addon",
        )

        notification_response = self.api.patch(
            f"/api/admin/settings/notifications/{notification.pk}/",
            {"enabled": False},
            format="json",
        )
        addon_response = self.api.patch(
            f"/api/admin/settings/addons/{addon.pk}/",
            {"enabled": False},
            format="json",
        )

        self.assertEqual(notification_response.status_code, 200)
        self.assertEqual(addon_response.status_code, 200)
        notification.refresh_from_db()
        addon.refresh_from_db()
        self.assertFalse(notification.enabled)
        self.assertFalse(addon.enabled)

        backup_response = self.api.get(
            "/api/admin/settings/backup/export/",
        )
        self.assertEqual(backup_response.status_code, 200)
        backup = backup_response.data["backup"]
        backup["platform_settings"]["site_name"] = "Restored Settings"
        for item in backup["notification_settings"]:
            if item["event_key"] == notification.event_key:
                item["enabled"] = True
        backup["addon_settings"][0]["enabled"] = True

        restore_response = self.api.post(
            "/api/admin/settings/backup/import/",
            {"backup": backup},
            format="json",
        )

        self.assertEqual(restore_response.status_code, 200, restore_response.data)
        self.assertEqual(
            PlatformSettings.objects.get(pk=1).site_name,
            "Restored Settings",
        )
        notification.refresh_from_db()
        addon.refresh_from_db()
        self.assertTrue(notification.enabled)
        self.assertTrue(addon.enabled)

    def test_settings_remain_protected_by_authentication_and_permissions(self):
        anonymous_response = self.api.get("/api/admin/settings/")
        self.assertEqual(anonymous_response.status_code, 401)

        restricted_api = APIClient()
        self.login_as(restricted_api, self.restricted_admin)
        forbidden_response = restricted_api.get("/api/admin/settings/")
        self.assertEqual(forbidden_response.status_code, 403)
