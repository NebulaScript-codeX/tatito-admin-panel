import tempfile
from pathlib import Path

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission

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
