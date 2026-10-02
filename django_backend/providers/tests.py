import tempfile
from unittest import mock
from pathlib import Path

import mongomock
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission
from audit.models import AuditLog
from marketing.models import Coupon, FeaturedPromotion, Promotion, PromotionalContent

from .models import HealthcareProvider, ProviderDocument


class HealthcareProviderApiTests(TestCase):
    def setUp(self):
        self.media_dir = tempfile.TemporaryDirectory()
        self.media_settings = override_settings(MEDIA_ROOT=self.media_dir.name)
        self.media_settings.enable()
        role = Role.objects.create(name="Provider test admin")
        RolePermission.objects.create(
            role=role,
            module="providers",
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
        )
        RolePermission.objects.create(
            role=role,
            module="dashboard",
            can_view=True,
        )
        RolePermission.objects.create(
            role=role,
            module="audit_logs",
            can_view=True,
        )
        RolePermission.objects.create(
            role=role,
            module="coupons_offers_marketing",
            can_view=True,
        )
        user = User.objects.create_user(username="provider-test-admin", password="test")
        AdminProfile.objects.create(user=user, role=role)
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def tearDown(self):
        self.media_settings.disable()
        self.media_dir.cleanup()

    def test_provider_directory_starts_empty_and_create_is_pending(self):
        response = self.client.get("/api/admin/providers/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data, [])

        for provider_type in HealthcareProvider.ProviderType.values:
            create_response = self.client.post(
                "/api/admin/providers/",
                {
                    "name": f"External {provider_type}",
                    "provider_type": provider_type,
                    "type_details": {},
                },
                format="json",
            )
            self.assertEqual(create_response.status_code, 201)
            self.assertEqual(create_response.data["provider_type"], provider_type)
            self.assertEqual(create_response.data["status"], HealthcareProvider.Status.PENDING)
        self.assertEqual(HealthcareProvider.objects.count(), 4)
        filtered = self.client.get(
            "/api/admin/providers/?provider_type=clinic&status=pending&search=clinic"
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(len(filtered.data), 1)
        self.assertEqual(filtered.data[0]["provider_type"], "clinic")

    def test_indian_mobile_validation_is_consistent_for_create_and_edit(self):
        created = self.client.post(
            "/api/admin/providers/",
            {
                "name": "Mobile Clinic",
                "provider_type": "clinic",
                "phone": "+91 98765 43210",
                "type_details": {},
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["phone"], "9876543210")
        provider_id = created.data["id"]

        invalid_create = self.client.post(
            "/api/admin/providers/",
            {
                "name": "Invalid Mobile Clinic",
                "provider_type": "clinic",
                "phone": "1234567890",
                "type_details": {},
            },
            format="json",
        )
        self.assertEqual(invalid_create.status_code, 400)
        self.assertIn("phone", invalid_create.data)

        edited = self.client.patch(
            f"/api/admin/providers/{provider_id}/",
            {"phone": "09876543210"},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data["phone"], "9876543210")

        invalid_edit = self.client.patch(
            f"/api/admin/providers/{provider_id}/",
            {"phone": "1234567890"},
            format="json",
        )
        self.assertEqual(invalid_edit.status_code, 400)
        self.assertIn("phone", invalid_edit.data)
        provider = HealthcareProvider.objects.get(pk=provider_id)
        self.assertEqual(provider.phone, "9876543210")

    def test_provider_actions_are_logged_and_visible_in_dashboard_activity(self):
        created = self.client.post(
            "/api/admin/providers/",
            {
                "name": "Activity Clinic",
                "provider_type": "clinic",
                "phone": "9876543210",
                "type_details": {},
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        provider_id = created.data["id"]

        edited = self.client.patch(
            f"/api/admin/providers/{provider_id}/",
            {"name": "Updated Activity Clinic"},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        viewed = self.client.get(f"/api/admin/providers/{provider_id}/")
        self.assertEqual(viewed.status_code, 200, viewed.data)

        approved = self.client.post(
            f"/api/admin/providers/{provider_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        rejected = self.client.post(
            f"/api/admin/providers/{provider_id}/reject/",
            {"reason": "Please update the registration details."},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        deleted = self.client.delete(f"/api/admin/providers/{provider_id}/")
        self.assertEqual(deleted.status_code, 204)

        expected_actions = {"create", "edit", "view", "approve", "reject", "delete"}
        entries = list(
            AuditLog.objects.filter(
                module="providers",
                target_type="healthcare_provider",
                target_id=str(provider_id),
            )
        )
        self.assertEqual({entry.action for entry in entries}, expected_actions)
        self.assertTrue(
            all(entry.actor_username == "provider-test-admin" for entry in entries)
        )
        self.assertTrue(
            all("Activity Clinic" in entry.description for entry in entries)
        )

        audit_response = self.client.get("/api/admin/audit-logs/?module=providers")
        self.assertEqual(audit_response.status_code, 200, audit_response.data)
        self.assertTrue(
            any(
                entry["target_id"] == str(provider_id)
                and entry["actor"] == "provider-test-admin"
                for entry in audit_response.data["results"]
            )
        )

        mongo_database = mongomock.MongoClient()["provider_dashboard_test"]
        with mock.patch(
            "dashboard.views.mongo.get_mongo_database",
            return_value=mongo_database,
        ):
            dashboard = self.client.get("/api/dashboard/overview/?period=7")
        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        dashboard_entries = dashboard.data["recent_activity"]["admin_activity"]
        self.assertTrue(
            any(
                entry["module"] == "providers"
                and entry["actor"] == "provider-test-admin"
                and "Activity Clinic" in entry["description"]
                for entry in dashboard_entries
            )
        )

    def test_dashboard_provider_and_coupon_metrics_are_live_and_development_seed_is_idempotent(self):
        with override_settings(DEBUG=True):
            call_command("seed_dashboard_development_data", verbosity=0)
            call_command("seed_dashboard_development_data", verbosity=0)

        self.assertEqual(HealthcareProvider.objects.count(), 4)
        self.assertEqual(Coupon.objects.count(), 2)
        self.assertEqual(Promotion.objects.count(), 1)
        self.assertEqual(FeaturedPromotion.objects.count(), 1)
        self.assertEqual(PromotionalContent.objects.count(), 1)
        provider_list = self.client.get("/api/admin/providers/")
        self.assertEqual(provider_list.status_code, 200, provider_list.data)
        self.assertEqual(len(provider_list.data), 4)

        mongo_database = mongomock.MongoClient()["provider_dashboard_metrics_test"]
        with mock.patch(
            "dashboard.views.mongo.get_mongo_database",
            return_value=mongo_database,
        ):
            dashboard = self.client.get("/api/dashboard/overview/?period=7")

        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        self.assertEqual(
            dashboard.data["platform_overview"]["total_hospitals"],
            1,
        )
        self.assertEqual(dashboard.data["platform_overview"]["total_clinics"], 1)
        self.assertEqual(
            dashboard.data["platform_overview"]["total_diagnostic_centres"],
            1,
        )
        self.assertEqual(dashboard.data["platform_overview"]["total_pharmacies"], 1)
        self.assertEqual(dashboard.data["needs_attention"]["provider_approvals"], 2)
        self.assertEqual(dashboard.data["coupons_offers"]["total_coupons"], 2)
        self.assertEqual(dashboard.data["coupons_offers"]["active_coupons"], 2)
        self.assertEqual(dashboard.data["coupons_offers"]["active_offers"], 3)

    @override_settings(DEBUG=False)
    def test_development_seed_command_refuses_non_debug_settings(self):
        from django.core.management import CommandError

        with self.assertRaises(CommandError):
            call_command("seed_dashboard_development_data", verbosity=0)

    def test_edit_delete_and_provider_status_workflow(self):
        provider = HealthcareProvider.objects.create(
            name="Community Clinic",
            provider_type=HealthcareProvider.ProviderType.CLINIC,
        )
        update = self.client.patch(
            f"/api/admin/providers/{provider.pk}/",
            {"name": "Updated Community Clinic"},
            format="json",
        )
        self.assertEqual(update.status_code, 200, update.data)
        self.assertEqual(update.data["name"], "Updated Community Clinic")

        reject_without_reason = self.client.post(
            f"/api/admin/providers/{provider.pk}/reject/",
            {},
            format="json",
        )
        self.assertEqual(reject_without_reason.status_code, 400)

        reject = self.client.post(
            f"/api/admin/providers/{provider.pk}/reject/",
            {"reason": "Registration details need correction."},
            format="json",
        )
        self.assertEqual(reject.status_code, 200)
        self.assertEqual(reject.data["status"], HealthcareProvider.Status.REJECTED)

        approve = self.client.post(
            f"/api/admin/providers/{provider.pk}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve.status_code, 200)
        self.assertEqual(approve.data["status"], HealthcareProvider.Status.ACTIVE)

        deactivate = self.client.post(
            f"/api/admin/providers/{provider.pk}/deactivate/",
            {},
            format="json",
        )
        self.assertEqual(deactivate.data["status"], HealthcareProvider.Status.INACTIVE)

        activate = self.client.post(
            f"/api/admin/providers/{provider.pk}/activate/",
            {},
            format="json",
        )
        self.assertEqual(activate.data["status"], HealthcareProvider.Status.ACTIVE)

        delete = self.client.delete(f"/api/admin/providers/{provider.pk}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(HealthcareProvider.objects.filter(pk=provider.pk).exists())

    def test_document_upload_review_and_rejection_validation(self):
        provider = HealthcareProvider.objects.create(
            name="North Lab",
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
        )
        upload = SimpleUploadedFile("licence.pdf", b"licence contents", content_type="application/pdf")
        response = self.client.post(
            f"/api/admin/providers/{provider.pk}/documents/",
            {"kind": "licence", "file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        document_id = response.data["id"]
        self.assertEqual(response.data["status"], "pending")

        reject_without_reason = self.client.patch(
            f"/api/admin/providers/{provider.pk}/documents/{document_id}/",
            {"status": "rejected"},
            format="json",
        )
        self.assertEqual(reject_without_reason.status_code, 400)

        verified = self.client.patch(
            f"/api/admin/providers/{provider.pk}/documents/{document_id}/",
            {"status": "verified"},
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.data["status"], "verified")

        rejected = self.client.patch(
            f"/api/admin/providers/{provider.pk}/documents/{document_id}/",
            {"status": "rejected", "rejection_reason": "Blurry scan."},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.data["rejection_reason"], "Blurry scan.")
        document_actions = set(
            AuditLog.objects.filter(
                module="providers",
                target_type="provider_document",
                target_id=str(document_id),
            ).values_list("action", flat=True)
        )
        self.assertEqual(document_actions, {"create", "verify", "reject"})
        self.assertTrue(
            AuditLog.objects.filter(
                module="providers",
                target_type="provider_document",
                target_id=str(document_id),
                action="verify",
                description__contains="North Lab",
            ).exists()
        )

        document_path = Path(ProviderDocument.objects.get(pk=document_id).file.path)
        deleted = self.client.delete(f"/api/admin/providers/{provider.pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(document_path.exists())

    def test_unsupported_document_extension_is_rejected(self):
        provider = HealthcareProvider.objects.create(
            name="Green Pharmacy",
            provider_type=HealthcareProvider.ProviderType.PHARMACY,
        )
        upload = SimpleUploadedFile("script.exe", b"not a document")
        response = self.client.post(
            f"/api/admin/providers/{provider.pk}/documents/",
            {"kind": "other", "file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

        oversized = SimpleUploadedFile(
            "oversized.pdf",
            b"x" * (10 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )
        oversized_response = self.client.post(
            f"/api/admin/providers/{provider.pk}/documents/",
            {"kind": "other", "file": oversized},
            format="multipart",
        )
        self.assertEqual(oversized_response.status_code, 400)
