from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from dashboard.dev_data import export_snapshot, import_snapshot
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission
from audit.models import AuditLog
from care.models import CarePatient
from health_records.models import LabBooking
from providers.models import HealthcareProvider

from .models import (
    HealthCheckBundle,
    LabTest,
    LabTestCategory,
    LabTestPackage,
    OrganProfileCategory,
    Phlebotomist,
    RadiologyService,
    ScanBooking,
)


class LabTestsApiTests(TestCase):
    def setUp(self):
        call_command("seed_admin_roles", verbosity=0)
        self.admin = User.objects.create_user(
            "lab-tests-admin",
            "lab-tests-admin@example.test",
            "StrongPassword9!",
        )
        AdminProfile.objects.create(
            user=self.admin, role=Role.objects.get(name="Super Admin")
        )
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.patient = CarePatient.objects.create(name="Nisha Rao")
        self.centre = HealthcareProvider.objects.create(
            name="Harborview Diagnostics",
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.ACTIVE,
        )
        self.category = LabTestCategory.objects.create(
            name="Core Lab Tests", description="Routine diagnostics."
        )
        self.test = LabTest.objects.create(
            name="Complete Blood Count",
            code="CBC-001",
            specimen="EDTA blood",
            price=Decimal("480.00"),
            biomarker_count=24,
        )
        self.test.categories.add(self.category)

    def tearDown(self):
        for booking in LabBooking.objects.all():
            if booking.report_file:
                booking.report_file.delete(save=False)
        for booking in ScanBooking.objects.all():
            if booking.report_file:
                booking.report_file.delete(save=False)

    def _booking_payload(self, **overrides):
        payload = {
            "patient_id": str(self.patient.pk),
            "test_id": self.test.pk,
            "centre_id": self.centre.pk,
            "scheduled_at": (timezone.now() + timedelta(days=1)).isoformat(),
            "address": "12 River Walk, Pune",
            "time_slot": "08:00-10:00",
        }
        payload.update(overrides)
        return payload

    def _create_booking(self, **overrides):
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(**overrides),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_catalog_resources_support_crud_and_category_multi_assignment(self):
        category = self.api.post(
            "/api/admin/lab-tests/categories/",
            {"name": "Preventive Screening", "description": "Screening panels."},
            format="json",
        )
        self.assertEqual(category.status_code, 201, category.data)
        created_test = self.api.post(
            "/api/admin/lab-tests/tests/",
            {
                "name": "Thyroid Profile",
                "code": "THY-006",
                "category_ids": [self.category.pk, category.data["id"]],
                "specimen": "Serum",
                "fasting_required": False,
                "turnaround_hours": 24,
                "biomarker_count": 3,
                "price": "620.00",
            },
            format="json",
        )
        self.assertEqual(created_test.status_code, 201, created_test.data)
        self.assertEqual(len(created_test.data["categories"]), 2)
        edited = self.api.patch(
            f"/api/admin/lab-tests/tests/{created_test.data['id']}/",
            {"price": "650.00", "category_ids": [category.data["id"]]},
            format="json",
        )
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(len(edited.data["categories"]), 1)
        self.assertEqual(
            self.api.get("/api/admin/lab-tests/tests/").status_code, 200
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/tests/{created_test.data['id']}/"
            ).status_code,
            204,
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/categories/{category.data['id']}/"
            ).status_code,
            204,
        )

        radiology = self.api.post(
            "/api/admin/lab-tests/radiology/",
            {
                "name": "Chest X-ray",
                "centre": self.centre.pk,
                "modality": "X-ray",
                "price": "650.00",
            },
            format="json",
        )
        self.assertEqual(radiology.status_code, 201, radiology.data)
        radiology_update = self.api.patch(
            f"/api/admin/lab-tests/radiology/{radiology.data['id']}/",
            {"description": "Two-view chest radiograph."},
            format="json",
        )
        self.assertEqual(radiology_update.status_code, 200)
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/radiology/{radiology.data['id']}/"
            ).status_code,
            204,
        )

        phlebotomist = self.api.post(
            "/api/admin/lab-tests/phlebotomists/",
            {
                "name": "Maya Nair",
                "phone": "+91-90000-41021",
                "email": "maya@example.test",
                "is_active": True,
                "is_available": True,
            },
            format="json",
        )
        self.assertEqual(phlebotomist.status_code, 201, phlebotomist.data)
        phlebotomist_id = phlebotomist.data["id"]
        self.assertEqual(
            [person["id"] for person in self.api.get(
                "/api/admin/lab-tests/phlebotomists/"
            ).data],
            [phlebotomist_id],
        )
        updated_phlebotomist = self.api.patch(
            f"/api/admin/lab-tests/phlebotomists/{phlebotomist_id}/",
            {"is_available": False, "is_active": False},
            format="json",
        )
        self.assertEqual(updated_phlebotomist.status_code, 200, updated_phlebotomist.data)
        self.assertFalse(updated_phlebotomist.data["is_available"])
        self.assertFalse(updated_phlebotomist.data["is_active"])
        self.assertEqual(
            self.api.get(
                f"/api/admin/lab-tests/phlebotomists/{phlebotomist_id}/"
            ).data["name"],
            "Maya Nair",
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/phlebotomists/{phlebotomist_id}/"
            ).status_code,
            204,
        )

    def test_package_biomarker_count_is_derived_from_assigned_tests(self):
        second_test = LabTest.objects.create(
            name="Thyroid Profile",
            code="THY-006",
            price=Decimal("620.00"),
            biomarker_count=3,
        )
        response = self.api.post(
            "/api/admin/lab-tests/packages/",
            {
                "name": "Wellness Panel",
                "description": "A combined panel.",
                "test_ids": [self.test.pk, second_test.pk],
                "price": "990.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["biomarker_count"], 27)
        self.assertEqual(
            self.api.patch(
                f"/api/admin/lab-tests/packages/{response.data['id']}/",
                {"test_ids": [second_test.pk]},
                format="json",
            ).data["biomarker_count"],
            3,
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/packages/{response.data['id']}/"
            ).status_code,
            204,
        )

    def test_test_price_is_calculated_from_mrp_and_discount(self):
        response = self.api.post(
            "/api/admin/lab-tests/tests/",
            {
                "name": "Lipid Profile",
                "code": "LIP-014",
                "centre_id": self.centre.pk,
                "specimen": "Serum",
                "turnaround_hours": 24,
                "biomarker_count": 8,
                "mrp": "1200.00",
                "discount_percent": "15.00",
                "price": "1.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["price"], "1020.00")
        self.assertEqual(response.data["mrp"], "1200.00")
        self.assertEqual(response.data["centre_id"], self.centre.pk)

        package = self.api.post(
            "/api/admin/lab-tests/packages/",
            {
                "name": "Fever Panel",
                "badge": "fever_special",
                "test_ids": [self.test.pk],
                "price": "700.00",
                "discount_percent": "10.00",
                "turnaround_hours": 12,
            },
            format="json",
        )
        self.assertEqual(package.status_code, 201, package.data)
        self.assertEqual(package.data["badge"], "fever_special")
        self.assertEqual(package.data["discount_percent"], "10.00")
        self.assertEqual(package.data["turnaround_hours"], 12)

    def test_health_check_bundles_and_organ_categories_are_distinct_sql_resources(self):
        organ = self.api.post(
            "/api/admin/lab-tests/organ-categories/",
            {
                "name": "Heart Profile",
                "description": "Cardiac and lipid tests.",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(organ.status_code, 201, organ.data)
        second_organ = self.api.post(
            "/api/admin/lab-tests/organ-categories/",
            {"name": "Metabolic Profile"},
            format="json",
        )
        self.assertEqual(second_organ.status_code, 201, second_organ.data)
        assigned = self.api.patch(
            f"/api/admin/lab-tests/tests/{self.test.pk}/",
            {
                "organ_category_ids": [organ.data["id"], second_organ.data["id"]]
            },
            format="json",
        )
        self.assertEqual(assigned.status_code, 200, assigned.data)
        self.assertEqual(len(assigned.data["organ_categories"]), 2)
        self.assertEqual(assigned.data["organ_categories"][0]["name"], "Heart Profile")
        filtered = self.api.get(
            "/api/admin/lab-tests/tests/",
            {"organ_category": organ.data["id"]},
        )
        self.assertEqual([row["id"] for row in filtered.data], [self.test.pk])
        self.assertEqual(
            self.api.get("/api/admin/lab-tests/organ-categories/").data[0]["test_count"],
            1,
        )
        category_detail = self.api.get(
            f"/api/admin/lab-tests/organ-categories/{organ.data['id']}/"
        )
        self.assertEqual(category_detail.data["test_ids"], [self.test.pk])
        self.assertEqual(category_detail.data["tests"][0]["name"], self.test.name)
        removed = self.api.patch(
            f"/api/admin/lab-tests/organ-categories/{organ.data['id']}/",
            {"test_ids": []},
            format="json",
        )
        self.assertEqual(removed.status_code, 200, removed.data)
        self.assertEqual(removed.data["test_ids"], [])
        self.assertEqual(removed.data["test_count"], 0)
        updated_organ = self.api.patch(
            f"/api/admin/lab-tests/organ-categories/{organ.data['id']}/",
            {"name": "Heart Profile Updated"},
            format="json",
        )
        self.assertEqual(updated_organ.status_code, 200)
        self.assertEqual(updated_organ.data["name"], "Heart Profile Updated")
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/organ-categories/{organ.data['id']}/"
            ).status_code,
            204,
        )
        remaining_categories = self.api.get(
            f"/api/admin/lab-tests/tests/{self.test.pk}/"
        ).data["organ_categories"]
        self.assertEqual([item["id"] for item in remaining_categories], [second_organ.data["id"]])

        second_test = LabTest.objects.create(
            name="Fasting Glucose",
            code="GLU-008",
            price=Decimal("220.00"),
            biomarker_count=1,
        )
        bundle = self.api.post(
            "/api/admin/lab-tests/health-checks/",
            {
                "name": "Cardiometabolic Check",
                "description": "A preventative check.",
                "recommended_target": "Adults 35+",
                "test_ids": [self.test.pk, second_test.pk],
                "price": "850.00",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(bundle.status_code, 201, bundle.data)
        self.assertEqual(bundle.data["test_count"], 2)
        self.assertEqual(bundle.data["biomarker_count"], 25)
        self.assertEqual(bundle.data["calculated_price"], "700.00")
        changed = self.api.patch(
            f"/api/admin/lab-tests/health-checks/{bundle.data['id']}/",
            {"test_ids": [second_test.pk], "price": "260.00"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.assertEqual(changed.data["test_count"], 1)
        self.assertEqual(changed.data["biomarker_count"], 1)
        self.assertEqual(changed.data["calculated_price"], "220.00")
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/health-checks/{bundle.data['id']}/"
            ).status_code,
            204,
        )
        self.assertEqual(HealthCheckBundle.objects.count(), 0)
        self.assertEqual(OrganProfileCategory.objects.count(), 1)

    def test_health_check_bundle_can_be_booked_as_its_own_resource(self):
        bundle = HealthCheckBundle.objects.create(
            name="Heart Health Check",
            recommended_target="Adults 35+",
            price=Decimal("900.00"),
        )
        bundle.tests.add(self.test)
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(
                test_id=None,
                health_check_id=bundle.pk,
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["health_check_id"], bundle.pk)
        self.assertEqual(response.data["test_name"], bundle.name)
        self.assertEqual(
            LabBooking.objects.get(pk=response.data["id"]).health_check_bundle,
            bundle,
        )

    def test_booking_accepts_multiple_tests_and_packages_together(self):
        other_test = LabTest.objects.create(
            name="Fasting Glucose",
            code="GLU-021",
            price=Decimal("220.00"),
            biomarker_count=1,
        )
        package = LabTestPackage.objects.create(
            name="Metabolic Pair", price=Decimal("800.00")
        )
        package.tests.add(other_test)
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(
                test_id=None,
                package_id=None,
                test_ids=[self.test.pk, other_test.pk],
                package_ids=[package.pk],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertCountEqual(
            [test["id"] for test in response.data["tests"]],
            [self.test.pk, other_test.pk],
        )
        self.assertEqual(response.data["package_ids"], [package.pk])
        self.assertEqual(
            response.data["test_name"],
            "Complete Blood Count, Fasting Glucose, Metabolic Pair",
        )
        booking = LabBooking.objects.get(pk=response.data["id"])
        self.assertEqual(booking.lab_tests.count(), 2)
        self.assertEqual(list(booking.lab_packages.all()), [package])

    def test_booking_requires_at_least_one_test_or_package(self):
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(test_id=None),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("test_ids", response.data)

    def test_booking_requires_address_and_time_slot(self):
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(address="", time_slot=""),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("address", response.data)
        self.assertIn("time_slot", response.data)

        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(address="12 River Walk, Pune", time_slot=""),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("time_slot", response.data)

    def test_catalog_delete_validation_prevents_broken_booking_relations(self):
        package = LabTestPackage.objects.create(
            name="Booked Panel", price=Decimal("850.00")
        )
        package.tests.add(self.test)
        created = self._create_booking(
            test_id=None,
            package_id=None,
            test_ids=[self.test.pk],
            package_ids=[package.pk],
        )
        self.assertEqual(
            self.api.delete(f"/api/admin/lab-tests/tests/{self.test.pk}/").status_code,
            400,
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/packages/{package.pk}/"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/bookings/{created['id']}/"
            ).status_code,
            204,
        )

        service = RadiologyService.objects.create(
            name="Booked Chest X-ray",
            centre=self.centre,
            modality="X-ray",
            price=Decimal("650.00"),
        )
        scan = self.api.post(
            "/api/admin/lab-tests/radiology-bookings/",
            {
                "patient_id": self.patient.pk,
                "centre_id": self.centre.pk,
                "radiology_service_id": service.pk,
                "scheduled_at": (timezone.now() + timedelta(days=2)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(scan.status_code, 201, scan.data)
        self.assertEqual(
            self.api.delete(
                f"/api/admin/lab-tests/radiology/{service.pk}/"
            ).status_code,
            400,
        )

    def test_lab_meta_lists_patient_active_centres_and_available_phlebotomists(self):
        available = Phlebotomist.objects.create(name="Available Collector")
        Phlebotomist.objects.create(
            name="Unavailable Collector", is_available=False
        )
        inactive_centre = HealthcareProvider.objects.create(
            name="Inactive Diagnostics",
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.INACTIVE,
        )
        response = self.api.get("/api/admin/lab-tests/meta/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            [row["id"] for row in response.data["patients"]],
            [str(self.patient.pk)],
        )
        self.assertEqual(
            [row["id"] for row in response.data["centres"]],
            [self.centre.pk],
        )
        self.assertNotIn(
            inactive_centre.pk,
            [row["id"] for row in response.data["centres"]],
        )
        self.assertEqual(
            [row["id"] for row in response.data["phlebotomists"]],
            [available.pk],
        )

    def test_booking_assignment_transitions_report_storage_and_health_records(self):
        phlebotomist = Phlebotomist.objects.create(
            name="Arjun Mehta", email="arjun@example.test"
        )
        created = self._create_booking()
        booking_id = created["id"]
        self.assertEqual(created["status"], LabBooking.Status.BOOKED)
        self.assertEqual(created["address"], "12 River Walk, Pune")
        self.assertEqual(created["time_slot"], "08:00-10:00")

        assigned = self.api.post(
            f"/api/admin/lab-tests/bookings/{booking_id}/assign/",
            {"phlebotomist_id": phlebotomist.pk},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200, assigned.data)
        self.assertEqual(assigned.data["status"], LabBooking.Status.ASSIGNED)
        phlebotomist.refresh_from_db()
        self.assertFalse(phlebotomist.is_available)

        for next_status in (LabBooking.Status.COLLECTED, LabBooking.Status.IN_LAB):
            moved = self.api.post(
                f"/api/admin/lab-tests/bookings/{booking_id}/transition/",
                {"status": next_status},
                format="json",
            )
            self.assertEqual(moved.status_code, 200, moved.data)
            self.assertEqual(moved.data["status"], next_status)

        invalid_transition = self.api.post(
            f"/api/admin/lab-tests/bookings/{booking_id}/transition/",
            {"status": LabBooking.Status.REPORT_READY},
            format="json",
        )
        self.assertEqual(invalid_transition.status_code, 400)

        report = SimpleUploadedFile(
            "result.pdf", b"%PDF-1.4\nfictional laboratory results\n%%EOF", "application/pdf"
        )
        uploaded = self.api.post(
            f"/api/admin/lab-tests/bookings/{booking_id}/report/",
            {"file": report},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.data)
        self.assertEqual(uploaded.data["status"], LabBooking.Status.REPORT_READY)
        audit_entry = AuditLog.objects.get(
            module="lab_tests",
            action="report_ready",
            target_type="lab_booking",
            target_id=str(booking_id),
        )
        self.assertIn("Lab report ready", audit_entry.description)
        self.assertEqual(audit_entry.metadata["patient_id"], str(self.patient.pk))
        dashboard = self.api.get("/api/dashboard/overview/")
        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        self.assertEqual(
            dashboard.data["recent_activity"]["admin_activity"][0]["action"],
            "report_ready",
        )
        booking = LabBooking.objects.get(pk=booking_id)
        self.assertTrue(booking.report_file)
        self.assertIn("lab-reports/", booking.report_file.name)
        self.assertNotIn("/media/", booking.report_file.name)
        report_contents = booking.report_file.read()
        booking.report_file.close()
        self.assertEqual(
            report_contents, b"%PDF-1.4\nfictional laboratory results\n%%EOF"
        )
        phlebotomist.refresh_from_db()
        self.assertTrue(phlebotomist.is_available)

        visible = self.api.get(
            "/api/admin/health-records/lab-reports/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(visible.status_code, 200, visible.data)
        self.assertEqual(len(visible.data["results"]), 1)
        report_url = visible.data["results"][0]["report_pdf_url"]
        self.assertEqual(
            report_url,
            f"/api/admin/health-records/lab-reports/{booking_id}/file/",
        )
        self.assertNotIn("/media/", report_url)
        report_response = self.api.get(report_url)
        self.assertEqual(report_response.status_code, 200)
        self.assertEqual(
            b"".join(report_response.streaming_content),
            b"%PDF-1.4\nfictional laboratory results\n%%EOF",
        )
        unauthenticated = APIClient().get(report_url)
        self.assertIn(unauthenticated.status_code, (401, 403))

    def test_unavailable_phlebotomist_is_rejected(self):
        unavailable = Phlebotomist.objects.create(
            name="Unavailable Collector",
            email="unavailable@example.test",
            is_available=False,
        )
        response = self.api.post(
            "/api/admin/lab-tests/bookings/",
            self._booking_payload(phlebotomist_id=unavailable.pk),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(LabBooking.objects.exists())

    def test_scan_booking_workflow_and_report_upload(self):
        service = RadiologyService.objects.create(
            name="Chest X-ray (PA)",
            centre=self.centre,
            modality="X-ray",
            price=Decimal("650.00"),
            turnaround_hours=8,
        )
        create = self.api.post(
            "/api/admin/lab-tests/radiology-bookings/",
            {
                "patient_id": str(self.patient.pk),
                "centre_id": self.centre.pk,
                "radiology_service_id": service.pk,
                "scheduled_at": (timezone.now() + timedelta(days=2)).isoformat(),
                "notes": "Bring prior images if available.",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.data)
        booking_id = create.data["id"]
        self.assertEqual(create.data["status"], ScanBooking.Status.BOOKED)
        self.assertEqual(create.data["service_name"], service.name)
        self.assertEqual(create.data["modality"], "X-ray")
        self.assertEqual(create.data["price"], "650.00")

        wrong_centre = HealthcareProvider.objects.create(
            name="Other Diagnostics",
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.ACTIVE,
        )
        mismatch = self.api.post(
            "/api/admin/lab-tests/radiology-bookings/",
            {
                "patient_id": str(self.patient.pk),
                "centre_id": wrong_centre.pk,
                "radiology_service_id": service.pk,
                "scheduled_at": (timezone.now() + timedelta(days=3)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(mismatch.status_code, 400)

        scheduled = self.api.post(
            f"/api/admin/lab-tests/radiology-bookings/{booking_id}/transition/",
            {"status": ScanBooking.Status.SCHEDULED},
            format="json",
        )
        self.assertEqual(scheduled.status_code, 200, scheduled.data)
        self.assertEqual(scheduled.data["status"], ScanBooking.Status.SCHEDULED)
        done = self.api.post(
            f"/api/admin/lab-tests/radiology-bookings/{booking_id}/transition/",
            {"status": ScanBooking.Status.DONE},
            format="json",
        )
        self.assertEqual(done.status_code, 200, done.data)
        self.assertIsNotNone(done.data["completed_at"])
        self.assertEqual(done.data["status"], ScanBooking.Status.DONE)

        report = SimpleUploadedFile(
            "scan-result.pdf", b"%PDF-1.4\nfictional scan report\n%%EOF", "application/pdf"
        )
        uploaded = self.api.post(
            f"/api/admin/lab-tests/radiology-bookings/{booking_id}/report/",
            {"file": report},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.data)
        self.assertEqual(uploaded.data["status"], ScanBooking.Status.REPORT_UPLOADED)
        self.assertIn("radiology-bookings/", uploaded.data["report_pdf_url"])
        stored = ScanBooking.objects.get(pk=booking_id)
        self.assertIn("scan-reports/", stored.report_file.name)
        payload = stored.report_file.read()
        stored.report_file.close()
        self.assertEqual(payload, b"%PDF-1.4\nfictional scan report\n%%EOF")
        download = self.api.get(uploaded.data["report_pdf_url"])
        self.assertEqual(download.status_code, 200)
        self.assertEqual(
            b"".join(download.streaming_content),
            b"%PDF-1.4\nfictional scan report\n%%EOF",
        )

    def test_scan_booking_rejects_report_before_scan_is_done(self):
        service = RadiologyService.objects.create(
            name="CT Head",
            centre=self.centre,
            modality="CT",
            price=Decimal("5200.00"),
        )
        create = self.api.post(
            "/api/admin/lab-tests/scan-bookings/",
            {
                "patient_id": str(self.patient.pk),
                "centre_id": self.centre.pk,
                "radiology_service_id": service.pk,
                "scheduled_at": (timezone.now() + timedelta(days=1)).isoformat(),
            },
            format="json",
        )
        response = self.api.post(
            f"/api/admin/lab-tests/radiology-bookings/{create.data['id']}/report/",
            {
                "file": SimpleUploadedFile(
                    "scan.pdf", b"%PDF-1.4\nreport", "application/pdf"
                )
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ScanBooking.objects.get(pk=create.data["id"]).report_file)

    def test_role_permissions_gate_lab_tests_mutations(self):
        role = Role.objects.get(name="Lab Technician")
        permission = RolePermission.objects.get(role=role, module="lab_tests")
        permission.can_create = False
        permission.save(update_fields=["can_create"])
        technician = User.objects.create_user(
            "lab-technician",
            "lab-tech@example.test",
            "StrongPassword9!",
        )
        AdminProfile.objects.create(user=technician, role=role)
        api = APIClient()
        api.force_authenticate(technician)
        denied = api.post(
            "/api/admin/lab-tests/tests/",
            {
                "name": "Denied Test",
                "code": "DENIED-001",
                "price": "100.00",
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(api.get("/api/admin/lab-tests/tests/").status_code, 200)

    def test_development_seed_is_idempotent_and_reuses_existing_patient_centre(self):
        with override_settings(DEBUG=True):
            call_command("seed_lab_tests_development_data", verbosity=0)
        first_counts = (
            LabTestCategory.objects.count(),
            OrganProfileCategory.objects.count(),
            LabTest.objects.count(),
            LabTestPackage.objects.count(),
            HealthCheckBundle.objects.count(),
            Phlebotomist.objects.count(),
            LabBooking.objects.count(),
            HealthcareProvider.objects.filter(
                provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE
            ).count(),
        )
        with override_settings(DEBUG=True):
            call_command("seed_lab_tests_development_data", verbosity=0)
        second_counts = (
            LabTestCategory.objects.count(),
            OrganProfileCategory.objects.count(),
            LabTest.objects.count(),
            LabTestPackage.objects.count(),
            HealthCheckBundle.objects.count(),
            Phlebotomist.objects.count(),
            LabBooking.objects.count(),
            HealthcareProvider.objects.filter(
                provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE
            ).count(),
        )
        self.assertEqual(first_counts, second_counts)
        self.assertTrue(
            CarePatient.objects.filter(
                development_key="dev-lab-tests-patient-aarav",
                name="Aarav Kulkarni",
            ).exists()
        )
        self.assertEqual(
            HealthcareProvider.objects.filter(
                development_key="dev-lab-tests-centre-northstar",
                name="Northstar Diagnostics",
            ).count(),
            1,
        )
        package = LabTestPackage.objects.get(
            development_key="dev-lab-tests-package-wellness"
        )
        self.assertEqual(
            set(package.tests.values_list("code", flat=True)),
            {"LAB-CBC-001", "LAB-CMP-014", "LAB-THY-006"},
        )
        health_check = HealthCheckBundle.objects.get(
            development_key="dev-lab-tests-health-check-heart"
        )
        self.assertEqual(
            set(health_check.tests.values_list("code", flat=True)),
            {"LAB-CBC-001", "LAB-CMP-014"},
        )

    def test_lab_development_seed_exports_sanitized_m2m_and_imports_bundle_links(self):
        with override_settings(DEBUG=True):
            call_command("seed_lab_tests_development_data", verbosity=0)
        snapshot_path = Path(__file__).resolve().parent / "lab-tests-snapshot-test.json"
        try:
            export_snapshot(str(snapshot_path))
            snapshot_text = snapshot_path.read_text(encoding="utf-8")
            self.assertIn("DEV Sample Diagnostic Centre Northstar", snapshot_text)
            self.assertIn("DEV Sample Lab Test", snapshot_text)
            self.assertNotIn("Aarav Kulkarni", snapshot_text)
            self.assertNotIn("maya.nair@northstar.example.test", snapshot_text)

            package = LabTestPackage.objects.get(
                development_key="dev-lab-tests-package-wellness"
            )
            health_check = HealthCheckBundle.objects.get(
                development_key="dev-lab-tests-health-check-heart"
            )
            LabBooking.objects.filter(
                development_key="dev-lab-tests-sample-booking"
            ).delete()
            package.delete()
            health_check.delete()
            self.assertGreaterEqual(import_snapshot(str(snapshot_path)), 2)

            package = LabTestPackage.objects.get(
                development_key="dev-lab-tests-package-wellness"
            )
            health_check = HealthCheckBundle.objects.get(
                development_key="dev-lab-tests-health-check-heart"
            )
            self.assertEqual(package.tests.count(), 3)
            self.assertEqual(health_check.tests.count(), 2)
        finally:
            snapshot_path.unlink(missing_ok=True)
