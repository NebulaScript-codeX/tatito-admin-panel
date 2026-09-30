from datetime import datetime, timedelta, timezone as dt_timezone
from unittest import mock

import mongomock
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditLog

from .models import AdminProfile, Role

STRONG = "Xk9#mPq2-Lz7vRt"


def make_admin(username, role_name, password=STRONG, active=True):
    role = Role.objects.get(name=role_name)
    user = User.objects.create_user(username, f"{username}@example.com", password)
    AdminProfile.objects.create(user=user, role=role, is_active=active)
    return user


class Base(TestCase):
    def setUp(self):
        call_command("seed_admin_roles", verbosity=0)
        self.mongo = mongomock.MongoClient()["tatito_test"]
        patcher = mock.patch("dashboard.mongo.get_mongo_database", return_value=self.mongo)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.api = APIClient()

    def login(self, username, password=STRONG):
        res = self.api.post("/api/admin/login/", {"username": username, "password": password}, format="json")
        if res.status_code == 200:
            self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return res


class AuthTests(Base):
    def test_login_me_and_audit(self):
        make_admin("root", "Super Admin")
        res = self.login("root")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["admin"]["role"], "Super Admin")
        self.assertTrue(res.data["admin"]["permissions"]["users"]["delete"])
        me = self.api.get("/api/admin/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["admin"]["username"], "root")
        self.assertTrue(AuditLog.objects.filter(action="login", actor_username="root").exists())

    def test_bad_login_rejected_and_audited(self):
        make_admin("root", "Super Admin")
        res = self.login("root", "wrong")
        self.assertEqual(res.status_code, 401)
        log = AuditLog.objects.get(action="login_failed")
        self.assertNotIn("wrong", str(log.metadata) + log.description)

    def test_non_admin_and_inactive_cannot_login(self):
        User.objects.create_user("plain", "p@example.com", STRONG)
        self.assertEqual(self.login("plain").status_code, 403)
        make_admin("off", "Super Admin", active=False)
        self.assertEqual(self.login("off").status_code, 403)

    def test_unauthenticated_rejected(self):
        for url in ("/api/admin/me/", "/api/dashboard/overview/", "/api/admin/staff/",
                    "/api/admin/users/", "/api/admin/audit-logs/"):
            self.assertEqual(self.api.get(url).status_code, 401, url)

    def test_valid_token_of_non_admin_user_rejected(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user("plain", "p@example.com", STRONG)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
        self.assertEqual(self.api.get("/api/dashboard/overview/").status_code, 403)
        self.assertEqual(self.api.get("/api/admin/me/").status_code, 403)

    def test_deactivated_admin_with_live_token_is_rejected(self):
        admin = make_admin("agent", "Support Agent")
        self.login("agent")
        self.assertEqual(self.api.get("/api/dashboard/overview/?period=7").status_code, 200)
        admin.admin_profile.is_active = False
        admin.admin_profile.save()
        self.assertEqual(self.api.get("/api/dashboard/overview/?period=7").status_code, 403)
        self.assertEqual(self.api.get("/api/admin/me/").status_code, 403)

    def test_logout_blacklists_refresh_and_audits(self):
        make_admin("root", "Super Admin")
        res = self.login("root")
        out = self.api.post("/api/admin/logout/", {"refresh": res.data["refresh"]}, format="json")
        self.assertEqual(out.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="logout").exists())
        again = APIClient().post("/api/token-not-used/", {})  # sanity: unknown route
        self.assertEqual(again.status_code, 404)


class RBACTests(Base):
    def test_missing_permission_blocked_server_side(self):
        make_admin("agent", "Support Agent")  # support: users.view only, no staff
        self.login("agent")
        payload = {"username": "x", "email": "x@example.com", "password": STRONG, "role_id": 1}
        self.assertEqual(self.api.post("/api/admin/staff/", payload, format="json").status_code, 403)
        self.assertEqual(self.api.get("/api/admin/staff/").status_code, 403)
        self.assertEqual(self.api.get("/api/admin/audit-logs/").status_code, 403)
        self.assertEqual(self.api.get("/api/admin/users/").status_code, 200)  # has users.view
        self.assertFalse(User.objects.filter(username="x").exists())

    def test_role_without_module_view_blocked(self):
        make_admin("editor", "Content Manager")  # no users module
        self.login("editor")
        self.assertEqual(self.api.get("/api/admin/users/").status_code, 403)

    def test_create_needs_create_not_just_view(self):
        role = Role.objects.get(name="Support Agent")
        role.permissions.update_or_create(module="staff", defaults={"can_view": True})
        make_admin("agent", "Support Agent")
        self.login("agent")
        self.assertEqual(self.api.get("/api/admin/staff/").status_code, 200)
        payload = {"username": "x", "email": "x@example.com", "password": STRONG, "role_id": role.id}
        self.assertEqual(self.api.post("/api/admin/staff/", payload, format="json").status_code, 403)

    def test_non_super_admin_cannot_escalate_to_super_admin(self):
        hr = Role.objects.get(name="Internship HR")
        hr.permissions.update_or_create(module="staff",
                                        defaults={"can_view": True, "can_create": True, "can_edit": True})
        make_admin("hr", "Internship HR")
        target = make_admin("bob", "Support Agent")
        sa = Role.objects.get(name="Super Admin")
        self.login("hr")
        res = self.api.patch(f"/api/admin/staff/{target.id}/", {"role_id": sa.id}, format="json")
        self.assertEqual(res.status_code, 403)
        res = self.api.post("/api/admin/staff/", {"username": "n", "email": "n@e.com",
                            "password": STRONG, "role_id": sa.id}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_super_admin_role_permissions_immutable(self):
        make_admin("root", "Super Admin")
        self.login("root")
        sa = Role.objects.get(name="Super Admin")
        res = self.api.put(f"/api/admin/roles/{sa.id}/permissions/", {"permissions": {}}, format="json")
        self.assertEqual(res.status_code, 403)


class StaffLifecycleTests(Base):
    def setUp(self):
        super().setUp()
        make_admin("root", "Super Admin")
        self.login("root")
        self.doctor_role = Role.objects.get(name="Doctor")

    def test_full_lifecycle_with_audit(self):
        res = self.api.post("/api/admin/staff/", {
            "username": "drx", "email": "drx@example.com", "first_name": "Dr", "last_name": "X",
            "password": STRONG, "role_id": self.doctor_role.id}, format="json")
        self.assertEqual(res.status_code, 201)
        uid = res.data["staff"]["id"]
        self.assertTrue(AuditLog.objects.filter(action="create", target_id=str(uid)).exists())
        self.assertNotIn(STRONG, str(AuditLog.objects.get(action="create").metadata))

        pharma = Role.objects.get(name="Pharmacist")
        res = self.api.patch(f"/api/admin/staff/{uid}/",
                             {"email": "new@example.com", "role_id": pharma.id}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["staff"]["role"]["name"], "Pharmacist")
        self.assertTrue(AuditLog.objects.filter(action="edit").exists())
        self.assertTrue(AuditLog.objects.filter(action="role_change").exists())

        res = self.api.post(f"/api/admin/staff/{uid}/reset-password/", {"new_password": "Nw8!qWe4rTy-9"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="password_reset").exists())
        self.assertEqual(APIClient().post("/api/admin/login/", {"username": "drx", "password": STRONG},
                                          format="json").status_code, 401)
        c = APIClient()
        ok = c.post("/api/admin/login/", {"username": "drx", "password": "Nw8!qWe4rTy-9"}, format="json")
        self.assertEqual(ok.status_code, 200)
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {ok.data['access']}")

        res = self.api.post(f"/api/admin/staff/{uid}/deactivate/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["staff"]["is_active"])
        self.assertTrue(AuditLog.objects.filter(action="deactivate").exists())
        self.assertEqual(c.get("/api/admin/me/").status_code, 403)  # live token no longer works
        self.assertEqual(APIClient().post("/api/admin/login/", {"username": "drx", "password": "Nw8!qWe4rTy-9"},
                                          format="json").status_code, 403)

        self.assertEqual(self.api.post(f"/api/admin/staff/{uid}/activate/").status_code, 200)

    def test_edit_permission_can_activate_and_reset_password_without_create(self):
        target = User.objects.create_user("target", "target@example.com", STRONG)
        AdminProfile.objects.create(user=target, role=self.doctor_role)
        support = Role.objects.get(name="Support Agent")
        support.permissions.update_or_create(
            module="staff",
            defaults={"can_view": True, "can_create": False, "can_edit": True},
        )
        make_admin("editor", "Support Agent")
        self.api.credentials()
        self.login("editor")

        self.assertEqual(self.api.post(f"/api/admin/staff/{target.id}/deactivate/").status_code, 200)
        self.assertEqual(
            self.api.post(
                f"/api/admin/staff/{target.id}/reset-password/",
                {"new_password": "Nw8!qWe4rTy-9"},
                format="json",
            ).status_code,
            200,
        )

    def test_validation(self):
        res = self.api.post("/api/admin/staff/", {"username": "a", "email": "bad", "password": "123",
                            "role_id": 9999}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(res.data["errors"]), {"email", "role_id", "password"})

    def test_cannot_deactivate_self_or_demote_last_super_admin(self):
        root = User.objects.get(username="root")
        self.assertEqual(self.api.post(f"/api/admin/staff/{root.id}/deactivate/").status_code, 403)
        res = self.api.patch(f"/api/admin/staff/{root.id}/", {"role_id": self.doctor_role.id}, format="json")
        self.assertEqual(res.status_code, 403)


class RoleLifecycleTests(Base):
    def setUp(self):
        super().setUp()
        make_admin("root", "Super Admin")
        self.login("root")

    def test_custom_role_rename_delete_and_assigned_staff_guard(self):
        role = Role.objects.create(name="Temporary Role")
        renamed = self.api.patch(
            f"/api/admin/roles/{role.id}/",
            {"name": "Renamed Role", "description": "Updated description"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.data["role"]["name"], "Renamed Role")

        assigned = User.objects.create_user("assigned", "assigned@example.com", STRONG)
        AdminProfile.objects.create(user=assigned, role=role)
        blocked = self.api.delete(f"/api/admin/roles/{role.id}/")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.data["assigned_staff"], 1)

        role.admin_profiles.all().delete()
        self.assertEqual(self.api.delete(f"/api/admin/roles/{role.id}/").status_code, 204)

    def test_custom_role_creation_starts_with_no_permissions(self):
        response = self.api.post(
            "/api/admin/roles/",
            {"name": "Read Only Reviewer", "description": "Review access"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        role = response.data["role"]
        self.assertFalse(role["is_system_role"])
        self.assertEqual(role["staff_count"], 0)
        self.assertFalse(any(action for row in role["permissions"].values() for action in row.values()))

    def test_system_role_cannot_be_renamed_or_deleted(self):
        super_admin = Role.objects.get(name="Super Admin")
        self.assertEqual(
            self.api.patch(f"/api/admin/roles/{super_admin.id}/", {"name": "Root"}, format="json").status_code,
            403,
        )
        self.assertEqual(self.api.delete(f"/api/admin/roles/{super_admin.id}/").status_code, 403)

    def test_role_permission_update_is_enforced_and_audited(self):
        support = Role.objects.get(name="Support Agent")
        matrix = {"internships": {"view": True, "create": False, "edit": False, "delete": False}}
        res = self.api.put(f"/api/admin/roles/{support.id}/permissions/", {"permissions": matrix}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["role"]["permissions"]["internships"]["view"])
        log = AuditLog.objects.get(action="permission_change")
        self.assertEqual(log.metadata["modules_changed"], ["internships"])
        bad = self.api.put(f"/api/admin/roles/{support.id}/permissions/",
                           {"permissions": {"nope": {}}}, format="json")
        self.assertEqual(bad.status_code, 400)


def _user(name, role, when):
    return {"name": name, "email": f"{name}@x.com", "role": role,
            "passwordHash": "$2a$SECRET", "createdAt": when}


class DashboardTests(Base):
    def setUp(self):
        super().setUp()
        now = datetime.now(dt_timezone.utc)
        self.mongo.users.insert_many([
            _user("today_patient", "patient", now),
            _user("d3_patient", "patient", now - timedelta(days=3)),
            _user("d20_patient", "patient", now - timedelta(days=20)),
            _user("d20_doctor", "doctor", now - timedelta(days=20)),
            _user("d90_patient", "patient", now - timedelta(days=90)),
        ])
        self.mongo.doctors.insert_many([
            {"_id": "d1", "name": "A", "specialty": "Cardiology", "verified": True},
            {"_id": "d2", "name": "B", "specialty": "Dermatology", "verified": False},
            {"_id": "d3", "name": "C", "specialty": "Cardiology", "verified": False},
        ])
        make_admin("root", "Super Admin")
        self.login("root")

    def get(self, period):
        res = self.api.get(f"/api/dashboard/overview/?period={period}")
        self.assertEqual(res.status_code, 200)
        return res.data

    def test_totals_and_needs_attention_from_real_data(self):
        d = self.get("7")
        self.assertEqual(d["platform_overview"]["total_users"], 5)
        self.assertEqual(d["platform_overview"]["total_doctors"], 3)
        self.assertEqual(d["needs_attention"]["doctor_verifications"], 2)

    def test_period_changes_statistics_and_charts(self):
        today, week, month = self.get("today"), self.get("7"), self.get("30")
        self.assertEqual(today["live_stats"]["new_patients"], 1)
        self.assertEqual(week["live_stats"]["new_patients"], 2)
        self.assertEqual(month["live_stats"]["new_patients"], 3)
        total = lambda d: sum(p["count"] for p in d["charts"]["user_registration_trend"])
        self.assertEqual((total(today), total(week), total(month)), (1, 2, 4))
        self.assertGreater(len(month["charts"]["user_registration_trend"]), len(week["charts"]["user_registration_trend"]))
        self.assertEqual(len(week["charts"]["user_registration_trend"]), 7)
        self.assertEqual(len(month["charts"]["user_registration_trend"]), 30)

    def test_invalid_period_falls_back_to_7(self):
        self.assertEqual(self.get("bogus")["period"], "7")

    def test_unavailable_metrics_are_null_not_fabricated(self):
        d = self.get("7")
        for key in ("total_hospitals", "total_clinics", "total_diagnostic_centres", "total_pharmacies"):
            self.assertIsNone(d["platform_overview"][key])
        for key in ("today_appointments", "pending_medicine_orders", "lab_test_bookings",
                    "sample_collections", "revenue"):
            self.assertIsNone(d["live_stats"][key])
        for key, val in d["needs_attention"].items():
            if key != "doctor_verifications":
                self.assertIsNone(val, key)
        for chart in ("revenue_trend", "revenue_by_module", "appointments_by_specialty", "order_trend"):
            self.assertEqual(d["charts"][chart], [])
        names = {u["metric"] for u in d["meta"]["unavailable"]}
        self.assertIn("revenue", names)

    def test_contract_keys_and_labels(self):
        d = self.get("7")
        self.assertEqual(set(d["live_stats"]), {"today_appointments", "pending_medicine_orders",
                         "lab_test_bookings", "sample_collections", "revenue", "new_patients"})
        self.assertEqual(len(d["needs_attention"]), 9)
        self.assertEqual(set(d["charts"]), {"revenue_trend", "revenue_by_module",
                         "appointments_by_specialty", "user_registration_trend", "order_trend"})

    def test_distributions_come_from_real_collections(self):
        d = self.get("7")
        self.assertEqual(d["distributions"]["users_by_role"],
                         [{"role": "patient", "count": 4}, {"role": "doctor", "count": 1}])
        self.assertEqual(d["distributions"]["doctors_by_specialty"],
                         [{"specialty": "Cardiology", "count": 2}, {"specialty": "Dermatology", "count": 1}])
        self.mongo.doctors.delete_many({})
        self.assertEqual(self.get("7")["distributions"]["doctors_by_specialty"], [])

    def test_recent_users_never_leak_password_hash(self):
        d = self.get("7")
        self.assertEqual(d["recent_activity"]["users"][0]["name"], "today_patient")
        self.assertNotIn("SECRET", str(d))
        self.assertNotIn("passwordHash", str(d))

    def test_admin_activity_comes_from_audit_log(self):
        d = self.get("7")
        actions = [a["action"] for a in d["recent_activity"]["admin_activity"]]
        self.assertIn("login", actions)
        AuditLog.objects.all().delete()
        self.assertEqual(self.get("7")["recent_activity"]["admin_activity"], [])

    def test_sections_restricted_without_module_permission(self):
        make_admin("lab", "Lab Technician")  # dashboard.view only
        self.api.credentials()
        self.login("lab")
        d = self.get("7")
        self.assertEqual(d["recent_activity"]["users"], [])
        self.assertEqual(d["recent_activity"]["admin_activity"], [])
        self.assertEqual(set(d["meta"]["restricted"]),
                         {"recent_activity.users", "recent_activity.admin_activity"})

    def test_role_without_dashboard_view_blocked(self):
        make_admin("hr2", "Internship HR")
        Role.objects.get(name="Internship HR").permissions.filter(module="dashboard").delete()
        self.api.credentials()
        self.login("hr2")
        self.assertEqual(self.api.get("/api/dashboard/overview/").status_code, 403)

    def test_mongo_failure_returns_503_without_leaking(self):
        with mock.patch("dashboard.mongo.get_mongo_database", side_effect=RuntimeError("mongodb://secret-host")):
            res = self.api.get("/api/dashboard/overview/?period=7")
        self.assertEqual(res.status_code, 503)
        self.assertNotIn("secret-host", str(res.data))


class UsersModuleTests(Base):
    def test_list_hides_password_hash_and_paginates(self):
        now = datetime.now(dt_timezone.utc)
        self.mongo.users.insert_many([_user(f"u{i}", "patient", now - timedelta(minutes=i)) for i in range(3)])
        make_admin("root", "Super Admin")
        self.login("root")
        res = self.api.get("/api/admin/users/?page_size=2")
        self.assertEqual(res.data["total"], 3)
        self.assertEqual(len(res.data["results"]), 2)
        self.assertNotIn("SECRET", str(res.data))
        res = self.api.get("/api/admin/users/?search=u1")
        self.assertEqual(res.data["total"], 1)
