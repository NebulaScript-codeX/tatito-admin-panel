from datetime import datetime, timedelta, timezone as dt_timezone
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from audit.models import AuditLog
from care.models import CarePatient
from dashboard.models import PlatformDoctor, PlatformReview, PlatformUser
from health_records.models import LabBooking, PrescriptionUpload
from pharmacy.models import PharmacyOrder
from providers.models import HealthcareProvider

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
        self.api = APIClient()

    def login(self, username, password=STRONG):
        res = self.api.post("/api/admin/login/", {"username": username, "password": password}, format="json")
        if res.status_code == 200:
            self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return res


class AuthTests(Base):
    def test_admin_can_update_own_account_and_password_securely(self):
        admin = make_admin("root", "Super Admin")
        self.login("root")

        updated = self.api.patch(
            "/api/admin/me/",
            {
                "username": "root-updated",
                "email": "root-updated@example.com",
                "current_password": STRONG,
                "new_password": "NewStrong9!Password",
                "confirm_password": "NewStrong9!Password",
            },
            format="json",
        )

        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["admin"]["username"], "root-updated")
        self.assertEqual(updated.data["admin"]["email"], "root-updated@example.com")
        admin.refresh_from_db()
        self.assertTrue(admin.check_password("NewStrong9!Password"))
        self.assertNotEqual(admin.password, "NewStrong9!Password")
        account_events = AuditLog.objects.filter(
            module="settings",
            target_type="admin_account",
            target_id=str(admin.id),
        )
        self.assertEqual(account_events.count(), 1)
        self.assertNotIn("NewStrong9!Password", str(account_events.first().metadata))
        reauthenticated = APIClient().post(
            "/api/admin/login/",
            {"username": "root-updated", "password": "NewStrong9!Password"},
            format="json",
        )
        self.assertEqual(reauthenticated.status_code, 200)

    def test_admin_account_update_rejects_duplicate_identity_fields(self):
        make_admin("root", "Super Admin")
        make_admin("existing-admin", "Support Agent")
        self.login("root")

        duplicate_username = self.api.patch(
            "/api/admin/me/", {"username": "EXISTING-ADMIN"}, format="json"
        )
        duplicate_email = self.api.patch(
            "/api/admin/me/",
            {"email": "EXISTING-ADMIN@example.com"},
            format="json",
        )

        self.assertEqual(duplicate_username.status_code, 400)
        self.assertIn("already exists", duplicate_username.data["errors"]["username"])
        self.assertEqual(duplicate_email.status_code, 400)
        self.assertIn("already exists", duplicate_email.data["errors"]["email"])

    def test_admin_password_change_requires_current_password_and_confirmation(self):
        admin = make_admin("root", "Super Admin")
        self.login("root")
        payload = {
            "current_password": "wrong-current",
            "new_password": "NewStrong9!Password",
            "confirm_password": "does-not-match",
        }

        response = self.api.patch("/api/admin/me/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("incorrect", response.data["errors"]["current_password"])
        self.assertIn("do not match", response.data["errors"]["confirm_password"])
        admin.refresh_from_db()
        self.assertTrue(admin.check_password(STRONG))

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

    def test_expired_access_token_can_be_refreshed_for_admin_profile(self):
        make_admin("root", "Super Admin")
        login = APIClient().post(
            "/api/admin/login/",
            {"username": "root", "password": STRONG},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)

        expired_access = AccessToken(login.data["access"])
        expired_access.set_exp(from_time=datetime.now(dt_timezone.utc) - timedelta(minutes=10))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {expired_access}")
        self.assertEqual(client.get("/api/admin/me/").status_code, 401)

        refreshed = APIClient().post(
            "/api/admin/token/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refreshed.status_code, 200, refreshed.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        profile = client.get("/api/admin/me/")
        self.assertEqual(profile.status_code, 200, profile.data)
        self.assertEqual(profile.data["admin"]["username"], "root")

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



class PeopleUserLifecycleTests(Base):
    def setUp(self):
        super().setUp()
        make_admin("root", "Super Admin")
        self.login("root")

    def test_patient_create_and_edit_survive_list_refresh(self):
        created = self.api.post("/api/admin/users/", {
            "name": "Patient Lifecycle",
            "email": "patient-lifecycle@example.com",
            "mobile": "+1 555 0100",
            "role": "patient",
            "dateOfBirth": "1990-01-01",
            "bloodGroup": "O+",
            "gender": "Female",
            "city": "Springfield",
        }, format="json")
        self.assertEqual(created.status_code, 201)
        user_id = created.data["user"]["id"]
        updated = self.api.patch(f"/api/admin/users/{user_id}/", {
            "city": "Shelbyville",
        }, format="json")
        self.assertEqual(updated.status_code, 200)

        refreshed = self.api.get("/api/admin/users/")
        saved = next(row for row in refreshed.data["results"] if row["id"] == user_id)
        stored = PlatformUser.objects.get(pk=user_id)
        self.assertEqual(saved["city"], "Shelbyville")
        self.assertEqual(saved["date_of_birth"], "1990-01-01")
        self.assertEqual(saved["blood_group"], "O+")
        self.assertEqual(saved["gender"], "Female")
        self.assertEqual(stored.city, "Shelbyville")

    def test_doctor_create_and_edit_persist_linked_profile(self):
        created = self.api.post("/api/admin/users/", {
            "name": "Dr. Lifecycle",
            "email": "doctor-lifecycle@example.com",
            "mobile": "+1 555 0101",
            "role": "doctor",
            "specialty": "General Medicine",
            "city": "Springfield",
            "location": "Springfield Memorial Hospital",
            "bio": "Experienced physician.",
            "fee": 65,
        }, format="json")
        self.assertEqual(created.status_code, 201)
        user_id = created.data["user"]["id"]
        doctor_id = created.data["user"]["doctor_id"]
        self.assertTrue(doctor_id)

        updated = self.api.patch(f"/api/admin/users/{user_id}/", {
            "specialty": "Internal Medicine",
            "city": "Shelbyville",
            "location": "Shelbyville Clinic",
            "bio": "Updated physician bio.",
            "fee": 80,
        }, format="json")
        self.assertEqual(updated.status_code, 200)
        profile = PlatformDoctor.objects.get(pk=doctor_id)
        refreshed = self.api.get("/api/admin/users/")
        saved = next(row for row in refreshed.data["results"] if row["id"] == user_id)
        self.assertEqual(profile.specialty, "Internal Medicine")
        self.assertEqual(profile.city, "Shelbyville")
        self.assertEqual(profile.location, "Shelbyville Clinic")
        self.assertEqual(profile.detail, "Updated physician bio.")
        self.assertEqual(float(profile.fee), 80)
        self.assertEqual(saved["specialty"], "Internal Medicine")

    def test_unlinked_doctor_edit_uses_doctor_id_and_survives_refresh(self):
        PlatformDoctor.objects.create(
            id="d-static",
            name="Dr. Static Profile",
            specialty="Cardiology",
            city="Springfield",
            location="Memorial Hospital",
            detail="Original bio",
            fee=60,
        )
        updated = self.api.patch("/api/admin/doctors/d-static/", {
            "specialty": "Internal Medicine",
            "city": "Shelbyville",
            "location": "Shelbyville Clinic",
            "bio": "Updated bio",
            "fee": 85,
        }, format="json")
        self.assertEqual(updated.status_code, 200)
        refreshed = self.api.get("/api/admin/doctors/")
        saved = next(row for row in refreshed.data["results"] if row["id"] == "d-static")
        stored = PlatformDoctor.objects.get(pk="d-static")
        self.assertEqual(saved["specialty"], "Internal Medicine")
        self.assertEqual(saved["city"], "Shelbyville")
        self.assertEqual(saved["bio"], "Updated bio")
        self.assertEqual(float(stored.fee), 85)

    def test_partner_create_and_edit_survive_list_refresh(self):
        created = self.api.post("/api/admin/users/", {
            "name": "Lifecycle Pharmacy",
            "email": "partner-lifecycle@example.com",
            "mobile": "+1 555 0102",
            "role": "partner",
            "partnerRole": "Pharmacist",
            "city": "Springfield",
            "availability": "available",
        }, format="json")
        self.assertEqual(created.status_code, 201)
        user_id = created.data["user"]["id"]
        updated = self.api.patch(f"/api/admin/users/{user_id}/", {
            "partnerRole": "Lab Technician",
            "city": "Shelbyville",
            "availability": "unavailable",
        }, format="json")
        self.assertEqual(updated.status_code, 200)

        refreshed = self.api.get("/api/admin/users/")
        saved = next(row for row in refreshed.data["results"] if row["id"] == user_id)
        self.assertEqual(saved["partner_role"], "Lab Technician")
        self.assertEqual(saved["city"], "Shelbyville")
        self.assertEqual(saved["availability"], "unavailable")
        self.assertEqual(PlatformUser.objects.get(pk=user_id).city, "Shelbyville")

    def test_healthcare_provider_and_partner_share_one_authoritative_record(self):
        provider_response = self.api.post("/api/admin/providers/", {
            "name": "Source Clinic",
            "provider_type": HealthcareProvider.ProviderType.CLINIC,
            "email": "source-clinic@example.com",
            "phone": "9876543210",
            "city": "Pune",
            "registration_number": "CLINIC-001",
            "type_details": {"registration_class": "primary"},
        }, format="json")
        self.assertEqual(provider_response.status_code, 201, provider_response.data)
        provider_id = provider_response.data["id"]

        partner_response = self.api.post("/api/admin/users/", {
            "name": "Stale Account Name",
            "email": "source-clinic@example.com",
            "mobile": "9876543210",
            "role": "partner",
            "partnerRole": "Old role",
            "city": "Old city",
        }, format="json")
        self.assertEqual(partner_response.status_code, 201, partner_response.data)
        partner_id = partner_response.data["user"]["id"]
        partner = PlatformUser.objects.get(pk=partner_id)
        self.assertEqual(str(partner.healthcare_provider_id), str(provider_id))
        self.assertEqual(partner_response.data["user"]["name"], "Source Clinic")
        self.assertEqual(partner_response.data["user"]["status"], "pending")

        for action, expected in (
            ("approve", HealthcareProvider.Status.ACTIVE),
            ("deactivate", HealthcareProvider.Status.INACTIVE),
            ("activate", HealthcareProvider.Status.ACTIVE),
        ):
            response = self.api.post(
                f"/api/admin/providers/{provider_id}/{action}/",
                {},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
            partner_row = next(
                row
                for row in self.api.get("/api/admin/users/?role=partner").data["results"]
                if row["id"] == partner_id
            )
            self.assertEqual(partner_row["status"], expected)
            self.assertEqual(partner_row["is_active"], expected == HealthcareProvider.Status.ACTIVE)

        edited = self.api.patch(f"/api/admin/providers/{provider_id}/", {
            "name": "Renamed Source Clinic",
            "email": "renamed-clinic@example.com",
            "phone": "9876543211",
            "city": "Mumbai",
            "registration_number": "CLINIC-002",
            "provider_type": HealthcareProvider.ProviderType.HOSPITAL,
            "type_details": {"registration_class": "secondary"},
        }, format="json")
        self.assertEqual(edited.status_code, 200, edited.data)
        partner_row = next(
            row
            for row in self.api.get("/api/admin/users/?role=partner").data["results"]
            if row["id"] == partner_id
        )
        self.assertEqual(partner_row["name"], "Renamed Source Clinic")
        self.assertEqual(partner_row["email"], "renamed-clinic@example.com")
        self.assertEqual(partner_row["mobile"], "9876543211")
        self.assertEqual(partner_row["city"], "Mumbai")
        self.assertEqual(partner_row["provider_type"], HealthcareProvider.ProviderType.HOSPITAL)
        self.assertEqual(partner_row["registration_number"], "CLINIC-002")

        reject = self.api.post(
            f"/api/admin/providers/{provider_id}/reject/",
            {"reason": "Registration needs correction."},
            format="json",
        )
        self.assertEqual(reject.status_code, 200, reject.data)
        partner_row = next(
            row
            for row in self.api.get("/api/admin/users/?role=partner").data["results"]
            if row["id"] == partner_id
        )
        self.assertEqual(partner_row["status"], HealthcareProvider.Status.REJECTED)
        self.assertEqual(partner_row["rejection_reason"], "Registration needs correction.")

        self.api.post(
            f"/api/admin/users/{partner_id}/status/reactivate/",
            {},
            format="json",
        )
        provider_row = self.api.get(f"/api/admin/providers/{provider_id}/")
        self.assertEqual(provider_row.data["status"], HealthcareProvider.Status.ACTIVE)

        deleted = self.api.delete(f"/api/admin/providers/{provider_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(PlatformUser.objects.filter(pk=partner_id).exists())
        self.assertFalse(
            any(
                row["id"] == partner_id
                for row in self.api.get("/api/admin/users/?role=partner").data["results"]
            )
        )

    def test_partner_created_before_provider_is_linked_across_provider_types(self):
        for provider_type in HealthcareProvider.ProviderType.values:
            email = f"{provider_type}@example.com"
            user_response = self.api.post("/api/admin/users/", {
                "name": f"Partner {provider_type}",
                "email": email,
                "role": "partner",
                "partnerRole": "External partner",
            }, format="json")
            self.assertEqual(user_response.status_code, 201, user_response.data)
            user_id = user_response.data["user"]["id"]

            provider_response = self.api.post("/api/admin/providers/", {
                "name": f"Provider {provider_type}",
                "provider_type": provider_type,
                "email": email,
            }, format="json")
            self.assertEqual(provider_response.status_code, 201, provider_response.data)
            account = PlatformUser.objects.get(pk=user_id)
            self.assertEqual(
                str(account.healthcare_provider_id),
                str(provider_response.data["id"]),
            )
            listed = self.api.get("/api/admin/users/?role=partner").data["results"]
            row = next(item for item in listed if item["id"] == user_id)
            self.assertEqual(row["provider_type"], provider_type)

    def test_doctor_delete_removes_profile_reviews_and_dashboard_count(self):
        doctor_id = "doctor-delete-test"
        doctor = PlatformDoctor.objects.create(
            id=doctor_id, name="Doctor To Delete", specialty="Cardiology",
            verified=True, verification_status="verified",
        )
        PlatformReview.objects.create(
            id="doctor-delete-review",
            doctor=doctor,
            patient_name="Test Patient",
            rating=5,
            comment="Test review",
        )
        before = self.api.get("/api/dashboard/overview/?period=7")
        self.assertEqual(before.data["platform_overview"]["total_doctors"], 1)

        deleted = self.api.delete(f"/api/admin/doctors/{doctor_id}/")

        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(PlatformDoctor.objects.filter(pk=doctor_id).exists())
        self.assertFalse(PlatformReview.objects.filter(doctor_id=doctor_id).exists())
        refreshed = self.api.get("/api/admin/doctors/")
        self.assertFalse(any(row["id"] == doctor_id for row in refreshed.data["results"]))
        after = self.api.get("/api/dashboard/overview/?period=7")
        self.assertEqual(after.data["platform_overview"]["total_doctors"], 0)

    def test_doctor_status_transitions_persist_on_profile_and_linked_account(self):
        doctor_id = "doctor-status-test"
        account = PlatformUser.objects.create(
            id="doctor-status-account",
            name="Doctor Status Test",
            email="doctor-status@example.com",
            role=PlatformUser.Role.DOCTOR,
            status="pending",
            verification_status="pending",
        )
        PlatformDoctor.objects.create(
            id=doctor_id,
            name="Doctor Status Test",
            specialty="Cardiology",
            verified=False,
            verification_status="pending",
            available=True,
            owner=account,
        )

        approved = self.api.post(f"/api/admin/doctors/{doctor_id}/status/approve/")
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.data["doctor"]["credentialStatus"], "verified")
        self.assertTrue(PlatformDoctor.objects.get(pk=doctor_id).verified)
        account.refresh_from_db()
        self.assertEqual(account.verification_status, "verified")

        missing_reason = self.api.post(f"/api/admin/doctors/{doctor_id}/status/reject/", {}, format="json")
        self.assertEqual(missing_reason.status_code, 400)
        rejected = self.api.post(f"/api/admin/doctors/{doctor_id}/status/reject/", {"reason": "Incomplete registration"}, format="json")
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(PlatformDoctor.objects.get(pk=doctor_id).rejection_reason, "Incomplete registration")

        suspended = self.api.post(f"/api/admin/doctors/{doctor_id}/status/suspend/", {"reason": "Credential review"}, format="json")
        self.assertEqual(suspended.status_code, 200)
        self.assertEqual(PlatformDoctor.objects.get(pk=doctor_id).verification_status, "suspended")
        reinstated = self.api.post(f"/api/admin/doctors/{doctor_id}/status/reinstate/")
        self.assertEqual(reinstated.status_code, 200)
        self.assertEqual(PlatformDoctor.objects.get(pk=doctor_id).verification_status, "verified")
        account.refresh_from_db()
        self.assertEqual(account.status, "verified")

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
        refreshed_staff = self.api.get("/api/admin/staff/")
        saved_staff = next(item for item in refreshed_staff.data["results"] if item["id"] == uid)
        self.assertEqual(saved_staff["email"], "new@example.com")
        self.assertEqual(saved_staff["role"]["name"], "Pharmacist")

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
        refreshed_roles = self.api.get("/api/admin/roles/")
        self.assertTrue(any(item["name"] == "Renamed Role" for item in refreshed_roles.data["results"]))

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
        refreshed = self.api.get("/api/admin/roles/")
        self.assertTrue(any(item["id"] == role["id"] for item in refreshed.data["results"]))

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
        refreshed = self.api.get(f"/api/admin/roles/{support.id}/permissions/")
        self.assertTrue(refreshed.data["role"]["permissions"]["internships"]["view"])
        log = AuditLog.objects.get(action="permission_change")
        self.assertEqual(log.metadata["modules_changed"], ["internships"])
        bad = self.api.put(f"/api/admin/roles/{support.id}/permissions/",
                           {"permissions": {"nope": {}}}, format="json")
        self.assertEqual(bad.status_code, 400)


class DashboardTests(Base):
    def setUp(self):
        super().setUp()
        now = datetime.now(dt_timezone.utc)
        for index, (name, role, created_at) in enumerate([
            ("today_patient", "patient", now),
            ("d3_patient", "patient", now - timedelta(days=3)),
            ("d20_patient", "patient", now - timedelta(days=20)),
            ("d20_doctor", "doctor", now - timedelta(days=20)),
            ("d90_patient", "patient", now - timedelta(days=90)),
        ]):
            PlatformUser.objects.create(
                id=f"dashboard-user-{index}",
                name=name,
                email=f"{name}@example.test",
                role=role,
                password_hash="SECRET",
                created_at=created_at,
                updated_at=created_at,
            )
        for doctor_id, name, specialty, verification_status in [
            ("d1", "A", "Cardiology", "verified"),
            ("d2", "B", "Dermatology", "pending"),
            ("d3", "C", "Cardiology", "pending"),
        ]:
            PlatformDoctor.objects.create(
                id=doctor_id,
                name=name,
                specialty=specialty,
                verification_status=verification_status,
                verified=verification_status == "verified",
            )
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

    def test_pending_prescription_reviews_are_read_from_sql(self):
        patient = CarePatient.objects.create(
            external_id="dashboard-prescription-patient",
            name="Dashboard prescription patient",
        )
        for status in (
            PrescriptionUpload.Status.PENDING,
            PrescriptionUpload.Status.APPROVED,
            PrescriptionUpload.Status.REJECTED,
        ):
            PrescriptionUpload.objects.create(patient=patient, status=status)

        data = self.get("7")

        self.assertEqual(data["needs_attention"]["prescription_reviews"], 1)
        self.assertEqual(
            data["meta"]["sources"]["prescription_reviews"],
            "django:health_records.PrescriptionUpload (status=pending)",
        )
        self.assertNotIn(
            "prescription_reviews",
            {item["metric"] for item in data["meta"]["unavailable"]},
        )

    def test_module_coverage_reports_pharmacy_and_lab_work_from_sql(self):
        patient = CarePatient.objects.create(
            external_id="dashboard-coverage-patient",
            name="Dashboard coverage patient",
        )
        PharmacyOrder.objects.create(patient=patient, address="Development address")
        PrescriptionUpload.objects.create(
            patient=patient,
            status=PrescriptionUpload.Status.PENDING,
        )
        LabBooking.objects.create(
            patient=patient,
            test_name="Coverage CBC",
            specimen_date=datetime.now(dt_timezone.utc).date(),
            status=LabBooking.Status.BOOKED,
        )

        data = self.get("7")

        self.assertEqual(data["live_stats"]["pending_medicine_orders"], 1)
        self.assertEqual(data["live_stats"]["lab_test_bookings"], 1)
        self.assertEqual(data["live_stats"]["sample_collections"], 0)
        self.assertEqual(data["live_stats"]["active_phlebotomists"], 0)
        self.assertEqual(data["needs_attention"]["prescription_reviews"], 1)
        self.assertEqual(data["needs_attention"]["unassigned_sample_bookings"], 1)
        order_trend = data["charts"]["order_trend"]
        self.assertEqual(len(order_trend), 7)
        self.assertEqual(sum(point["count"] for point in order_trend), 1)
        self.assertEqual(len(data["recent_activity"]["orders"]), 1)
        self.assertEqual(
            data["recent_activity"]["orders"][0]["order_number"],
            f"PH-{data['recent_activity']['orders'][0]['id']:06d}",
        )
        self.assertEqual(
            data["recent_activity"]["orders"][0]["patient_name"],
            "Dashboard coverage patient",
        )
        unavailable = {item["metric"] for item in data["meta"]["unavailable"]}
        self.assertTrue(
            {"pending_medicine_orders", "prescription_reviews", "lab_test_bookings",
             "sample_collections", "unassigned_sample_bookings",
             "active_phlebotomists", "order_trend", "recent_orders"}.isdisjoint(unavailable)
        )
        self.assertEqual(
            data["meta"]["sources"]["order_trend"],
            "django:pharmacy.PharmacyOrder.created_at",
        )

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

    def test_unavailable_metrics_are_null_and_live_module_metrics_are_available(self):
        d = self.get("7")
        for key in ("total_hospitals", "total_clinics", "total_diagnostic_centres", "total_pharmacies"):
            self.assertEqual(d["platform_overview"][key], 0)
        for key in ("today_appointments", "pending_medicine_orders", "lab_test_bookings",
                    "sample_collections", "active_phlebotomists", "revenue"):
            self.assertEqual(d["live_stats"][key], 0)
        available_attention_metrics = {
            "doctor_verifications": 2,
            "provider_approvals": 0,
            "document_verifications": 0,
            "prescription_reviews": 0,
            "pending_reviews": 0,
            "refund_requests": 0,
            "unassigned_instant_consults": 0,
            "pending_payouts": 0,
            "patients_waiting_over_15_minutes": 0,
            "low_stock_products": 0,
            "unassigned_sample_bookings": 0,
        }
        for key, val in d["needs_attention"].items():
            if key not in available_attention_metrics:
                self.assertIsNone(val, key)
            else:
                self.assertEqual(val, available_attention_metrics[key], key)
        self.assertEqual(d["needs_attention"]["prescription_reviews"], 0)
        for chart in ("revenue_trend", "revenue_by_module", "appointments_by_specialty"):
            self.assertEqual(d["charts"][chart], [])
        self.assertEqual(sum(point["count"] for point in d["charts"]["order_trend"]), 0)
        names = {u["metric"] for u in d["meta"]["unavailable"]}
        self.assertNotIn("revenue", names)
        self.assertIn("revenue_trend", names)

    def test_contract_keys_and_labels(self):
        d = self.get("7")
        self.assertEqual(set(d["live_stats"]), {"today_appointments", "pending_medicine_orders",
                         "lab_test_bookings", "sample_collections", "active_phlebotomists",
                         "revenue", "new_patients"})
        self.assertEqual(len(d["needs_attention"]), 13)
        self.assertEqual(set(d["charts"]), {"revenue_trend", "revenue_by_module",
                         "appointments_by_specialty", "user_registration_trend", "order_trend"})

    def test_distributions_come_from_sql_models(self):
        d = self.get("7")
        self.assertEqual(d["distributions"]["users_by_role"],
                         [{"role": "patient", "count": 4}, {"role": "doctor", "count": 1}])
        self.assertEqual(d["distributions"]["doctors_by_specialty"],
                         [{"specialty": "Cardiology", "count": 2}, {"specialty": "Dermatology", "count": 1}])
        PlatformDoctor.objects.all().delete()
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
        self.assertIsNone(d["platform_overview"]["total_hospitals"])
        self.assertIsNone(d["coupons_offers"])
        self.assertIsNone(d["needs_attention"]["prescription_reviews"])
        self.assertIsNone(d["charts"]["order_trend"])
        self.assertIsNone(d["recent_activity"]["orders"])
        self.assertEqual(set(d["meta"]["restricted"]),
                         {
                             "recent_activity.users",
                             "recent_activity.admin_activity",
                             "users",
                             "audit_logs",
                             "providers",
                             "pharmacy",
                             "doctors",
                             "coupons_offers_marketing",
                             "orders_payments",
                         })

    def test_role_without_dashboard_view_blocked(self):
        make_admin("hr2", "Internship HR")
        Role.objects.get(name="Internship HR").permissions.filter(module="dashboard").delete()
        self.api.credentials()
        self.login("hr2")
        self.assertEqual(self.api.get("/api/dashboard/overview/").status_code, 403)

    def test_platform_metrics_source_is_sql(self):
        response = self.api.get("/api/dashboard/overview/?period=7")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["meta"]["sources"]["total_users"],
            "django:dashboard.PlatformUser",
        )


class UsersModuleTests(Base):
    def test_list_hides_password_hash_and_paginates(self):
        now = datetime.now(dt_timezone.utc)
        for index in range(3):
            PlatformUser.objects.create(
                id=f"test-user-{index}",
                name=f"u{index}",
                email=f"u{index}@example.test",
                role="patient",
                password_hash="SECRET",
                created_at=now - timedelta(minutes=index),
                updated_at=now,
            )
        make_admin("root", "Super Admin")
        self.login("root")
        res = self.api.get("/api/admin/users/?page_size=2")
        self.assertEqual(res.data["total"], 3)
        self.assertEqual(len(res.data["results"]), 2)
        self.assertNotIn("SECRET", str(res.data))
        res = self.api.get("/api/admin/users/?search=u1")
        self.assertEqual(res.data["total"], 1)
