from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission

from .models import AdminNotificationReadState


class AdminNotificationReadStateTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        super_admin_role = Role.objects.create(name="Super Admin")
        cls.admin = User.objects.create_user(
            username="notification-admin",
            password="StrongNotification9!Password",
        )
        AdminProfile.objects.create(user=cls.admin, role=super_admin_role)

        dashboard_role = Role.objects.create(name="Dashboard Viewer")
        RolePermission.objects.create(
            role=dashboard_role,
            module="dashboard",
            can_view=True,
        )
        cls.dashboard_admin = User.objects.create_user(
            username="notification-dashboard-admin",
            password="StrongNotification9!Password",
        )
        AdminProfile.objects.create(
            user=cls.dashboard_admin,
            role=dashboard_role,
        )

        restricted_role = Role.objects.create(name="Restricted")
        cls.restricted_admin = User.objects.create_user(
            username="notification-restricted-admin",
            password="StrongNotification9!Password",
        )
        AdminProfile.objects.create(
            user=cls.restricted_admin,
            role=restricted_role,
        )

    def setUp(self):
        self.api = APIClient()

    def test_read_state_is_persisted_per_admin(self):
        self.api.force_authenticate(user=self.admin)
        keys = ["attention:providers:Provider approvals", "activity:42"]

        initial = self.api.get(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": ",".join(keys)},
        )

        self.assertEqual(initial.status_code, 200, initial.data)
        self.assertEqual(
            initial.data["read_states"],
            [{"key": key, "is_read": False} for key in keys],
        )

        marked = self.api.post(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": keys},
            format="json",
        )

        self.assertEqual(marked.status_code, 200, marked.data)
        self.assertEqual(
            marked.data["read_states"],
            [{"key": key, "is_read": True} for key in keys],
        )
        self.assertEqual(
            AdminNotificationReadState.objects.filter(user=self.admin).count(),
            2,
        )

        relogin_api = APIClient()
        relogin_api.force_authenticate(user=self.admin)
        persisted_state = relogin_api.get(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": ",".join(keys)},
        )
        self.assertEqual(persisted_state.status_code, 200)
        self.assertEqual(
            persisted_state.data["read_states"],
            [{"key": key, "is_read": True} for key in keys],
        )

        self.api.force_authenticate(user=self.dashboard_admin)
        other_admin_state = self.api.get(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": ",".join(keys)},
        )
        self.assertEqual(other_admin_state.status_code, 200)
        self.assertEqual(
            other_admin_state.data["read_states"],
            [{"key": key, "is_read": False} for key in keys],
        )

    def test_read_state_requires_admin_module_access_and_valid_keys(self):
        anonymous = self.api.get(
            "/api/admin/audit-logs/notification-read-state/",
        )
        self.assertEqual(anonymous.status_code, 401)

        self.api.force_authenticate(user=self.restricted_admin)
        forbidden = self.api.post(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": ["activity:42"]},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        self.api.force_authenticate(user=self.admin)
        invalid = self.api.post(
            "/api/admin/audit-logs/notification-read-state/",
            {"keys": ["x" * 256]},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

# Create your tests here.
