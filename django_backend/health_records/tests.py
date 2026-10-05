from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission
from audit.models import AuditLog
from care.models import Appointment, AppointmentSlot, CarePatient, Doctor, Specialty
from care.services import care_dashboard_stats
from dashboard.models import PlatformUser
from dashboard.services import build_overview

from .models import Allergy, LabBooking, PrescriptionUpload, Vaccination, VitalReading


class HealthRecordsApiTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name="Health Records test admin")
        RolePermission.objects.create(
            role=role,
            module="health_records",
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
        )
        user = User.objects.create_user(username="health-records-test-admin", password="test-only-password")
        AdminProfile.objects.create(user=user, role=role)
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.user = user
        self.patient = CarePatient.objects.create(
            external_id="patient-health-test",
            name="Health Records Test Patient",
        )
        self.specialty = Specialty.objects.create(name="Health Records Test Specialty")
        self.doctor = Doctor.objects.create(
            name="DEV Dr. Health Test",
            specialty=self.specialty,
            city="Development",
            degree="MBBS",
        )

    def test_patient_view_and_each_record_tab_write_read_only_access_logs(self):
        response = self.client.get(
            f"/api/admin/health-records/patients/{self.patient.pk}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            AuditLog.objects.filter(
                module="health_records",
                target_id=str(self.patient.pk),
                action="health_record_access",
            ).count(),
            1,
        )
        logs = self.client.get(
            f"/api/admin/health-records/patients/{self.patient.pk}/access-log/"
        )
        self.assertEqual(logs.status_code, 200)
        self.assertEqual(logs.data["results"][0]["record_type"], "access_log")
        self.assertEqual(
            logs.data["results"][0]["staff_name"],
            self.user.username,
        )
        self.assertEqual(
            AuditLog.objects.filter(
                module="health_records",
                target_id=str(self.patient.pk),
                action="health_record_access",
            ).count(),
            2,
        )

    def test_lab_reports_include_only_completed_lab_bookings(self):
        LabBooking.objects.create(
            patient=self.patient,
            test_name="Completed Test",
            specimen_date=date(2026, 1, 1),
            status=LabBooking.Status.COMPLETED,
        )
        LabBooking.objects.create(
            patient=self.patient,
            test_name="Pending Test",
            specimen_date=date(2026, 1, 2),
            status=LabBooking.Status.PENDING,
        )
        response = self.client.get(
            "/api/admin/health-records/lab-reports/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["test_name"] for row in response.data["results"]], ["Completed Test"])

    def test_lab_reports_return_empty_results_for_valid_patient_without_completed_reports(self):
        response = self.client.get(
            "/api/admin/health-records/lab-reports/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"success": True, "results": []})

    def test_valid_patient_record_endpoints_return_empty_lists_without_related_data(self):
        patient_id = str(self.patient.pk)
        for resource in ("prescriptions", "vaccinations", "allergies", "vitals"):
            with self.subTest(resource=resource):
                response = self.client.get(
                    f"/api/admin/health-records/{resource}/",
                    {"patient_id": patient_id},
                )
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data, {"success": True, "results": []})

        access_log = self.client.get(
            f"/api/admin/health-records/patients/{patient_id}/access-log/"
        )
        self.assertEqual(access_log.status_code, 200, access_log.data)
        self.assertEqual(access_log.data["results"][0]["record_type"], "access_log")

    def test_counts_endpoint_returns_zero_for_empty_patient(self):
        response = self.client.get(
            "/api/admin/health-records/counts/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["counts"], {
            "lab-reports": 0,
            "prescriptions": 0,
            "vaccinations": 0,
            "allergies-vitals": 0,
            "access-log": 0,
        })

    def test_counts_endpoint_aggregates_sql_records_and_supports_patient_filter(self):
        LabBooking.objects.create(
            patient=self.patient,
            test_name="DEV Counted completed test",
            specimen_date=date(2026, 1, 1),
            status=LabBooking.Status.COMPLETED,
        )
        LabBooking.objects.create(
            patient=self.patient,
            test_name="DEV Excluded pending test",
            specimen_date=date(2026, 1, 2),
            status=LabBooking.Status.PENDING,
        )
        slot_date = timezone.localdate() - timedelta(days=2)
        slot = AppointmentSlot.objects.create(
            doctor=self.doctor,
            date=slot_date,
            weekday=slot_date.weekday(),
            start_time=time(9),
            end_time=time(9, 30),
            duration_minutes=30,
            status=AppointmentSlot.Status.BOOKED,
        )
        Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient,
            slot=slot,
            doctor_name=self.doctor.name,
            patient_name=self.patient.name,
            specialty_name=self.specialty.name,
            date=slot_date,
            start_time=time(9),
            end_time=time(9, 30),
            fee=Decimal("500.00"),
            status=Appointment.Status.COMPLETED,
        )
        PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-COUNTED-RX",
            status=PrescriptionUpload.Status.APPROVED,
        )
        PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-EXCLUDED-RX",
            status=PrescriptionUpload.Status.PENDING,
        )
        Vaccination.objects.create(
            patient=self.patient,
            vaccine="DEV Counted vaccine",
            administered_on=date(2026, 1, 1),
            dose="Dose 1",
        )
        Allergy.objects.create(
            patient=self.patient,
            allergy="DEV Counted allergy",
            severity=Allergy.Severity.MILD,
        )
        VitalReading.objects.create(
            patient=self.patient,
            recorded_at=timezone.now(),
            systolic_bp=120,
            diastolic_bp=80,
            sugar=Decimal("90.0"),
            weight=Decimal("60.00"),
            height=Decimal("165.00"),
            pulse=70,
        )
        self.client.get(
            f"/api/admin/health-records/patients/{self.patient.pk}/"
        )

        response = self.client.get(
            "/api/admin/health-records/counts/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["counts"], {
            "lab-reports": 1,
            "prescriptions": 2,
            "vaccinations": 1,
            "allergies-vitals": 2,
            "access-log": 1,
        })

        all_counts = self.client.get("/api/admin/health-records/counts/")
        self.assertEqual(all_counts.status_code, 200, all_counts.data)
        self.assertEqual(all_counts.data["counts"], response.data["counts"])

    def test_counts_endpoint_rejects_invalid_patient_id(self):
        response = self.client.get(
            "/api/admin/health-records/counts/",
            {"patient_id": "not-a-valid-patient-id"},
        )
        self.assertEqual(response.status_code, 400)

    def test_prescriptions_come_from_completed_appointments_and_approved_uploads(self):
        slot_date = timezone.localdate() - timedelta(days=2)
        slot = AppointmentSlot.objects.create(
            doctor=self.doctor,
            date=slot_date,
            weekday=slot_date.weekday(),
            start_time=time(9),
            end_time=time(9, 30),
            duration_minutes=30,
            status=AppointmentSlot.Status.BOOKED,
        )
        Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient,
            slot=slot,
            doctor_name=self.doctor.name,
            patient_name=self.patient.name,
            specialty_name=self.specialty.name,
            date=slot_date,
            start_time=time(9),
            end_time=time(9, 30),
            fee=Decimal("500.00"),
            status=Appointment.Status.COMPLETED,
            diagnosis="Completed appointment diagnosis",
            medicines=[{"name": "DEV Sample medicine"}],
        )
        PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-APPROVED-RX",
            status=PrescriptionUpload.Status.APPROVED,
        )
        PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-PENDING-RX",
            status=PrescriptionUpload.Status.PENDING,
        )
        response = self.client.get(
            "/api/admin/health-records/prescriptions/",
            {"patient_id": str(self.patient.pk)},
        )
        self.assertEqual(response.status_code, 200)
        results = response.data["results"]
        self.assertEqual(len(results), 2)
        self.assertEqual(
            {row["source"] for row in results},
            {"completed_appointment", "approved_upload"},
        )
        self.assertNotIn("DEV-PENDING-RX", {row["prescription_number"] for row in results})
        self.assertEqual(
            self.client.post(
                "/api/admin/health-records/prescriptions/",
                {"patient_id": str(self.patient.pk)},
                format="json",
            ).status_code,
            405,
        )

    def test_vaccination_and_allergy_crud_write_admin_activity(self):
        created_vaccine = self.client.post(
            "/api/admin/health-records/vaccinations/",
            {
                "patient_id": str(self.patient.pk),
                "vaccine": "DEV Influenza",
                "administered_on": "2026-01-01",
                "dose": "Dose 1",
                "next_due": "2027-01-01",
            },
            format="json",
        )
        self.assertEqual(created_vaccine.status_code, 201, created_vaccine.data)
        vaccination_id = created_vaccine.data["record"]["id"]
        self.assertEqual(
            self.client.patch(
                f"/api/admin/health-records/vaccinations/{vaccination_id}/",
                {"dose": "Booster"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(Vaccination.objects.get(pk=vaccination_id).dose, "Booster")
        self.assertEqual(
            self.client.delete(
                f"/api/admin/health-records/vaccinations/{vaccination_id}/"
            ).status_code,
            204,
        )

        created_allergy = self.client.post(
            "/api/admin/health-records/allergies/",
            {
                "patient_id": str(self.patient.pk),
                "allergy": "DEV Pollen",
                "severity": "mild",
            },
            format="json",
        )
        allergy_id = created_allergy.data["record"]["id"]
        self.assertEqual(created_allergy.status_code, 201)
        self.assertEqual(
            self.client.patch(
                f"/api/admin/health-records/allergies/{allergy_id}/",
                {"severity": "moderate"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(Allergy.objects.get(pk=allergy_id).severity, "moderate")
        self.assertEqual(
            self.client.delete(
                f"/api/admin/health-records/allergies/{allergy_id}/"
            ).status_code,
            204,
        )
        self.assertEqual(
            AuditLog.objects.filter(module="health_records", action__in=["create", "update", "delete"]).count(),
            6,
        )

    def test_vitals_can_be_added_edited_and_deleted(self):
        created = self.client.post(
            "/api/admin/health-records/vitals/",
            {
                "patient_id": str(self.patient.pk),
                "recorded_at": "2026-02-02T10:30:00Z",
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "sugar": "95",
                "weight": "70.5",
                "height": "170",
                "pulse": 72,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        record_id = created.data["record"]["id"]
        edited = self.client.patch(
            f"/api/admin/health-records/vitals/{record_id}/",
            {"systolic_bp": 124},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(VitalReading.objects.get(pk=record_id).systolic_bp, 124)
        self.assertEqual(
            self.client.delete(
                f"/api/admin/health-records/vitals/{record_id}/"
            ).status_code,
            204,
        )

    @override_settings(DEBUG=True)
    def test_development_data_seed_is_idempotent_and_safe(self):
        seeded_patient, _ = CarePatient.objects.update_or_create(
            development_key="dev-care-patient-one",
            defaults={
                "external_id": "temporary-seed-link",
                "name": "Legacy seeded patient",
                "is_development_data": True,
            },
        )
        appointment_date = timezone.localdate() - timedelta(days=2)
        slot = AppointmentSlot.objects.create(
            doctor=self.doctor,
            date=appointment_date,
            weekday=appointment_date.weekday(),
            start_time=time(9),
            end_time=time(9, 30),
            duration_minutes=30,
            status=AppointmentSlot.Status.BOOKED,
        )
        completed_appointment = Appointment.objects.create(
            doctor=self.doctor,
            patient=seeded_patient,
            slot=slot,
            doctor_name=self.doctor.name,
            patient_name=seeded_patient.name,
            specialty_name=self.specialty.name,
            date=appointment_date,
            start_time=time(9),
            end_time=time(9, 30),
            fee=Decimal("500.00"),
            status=Appointment.Status.COMPLETED,
        )
        dashboard_users_before = PlatformUser.objects.count()
        LabBooking.objects.create(
            development_key="dev-health-record-completed-cmp",
            is_development_data=True,
            patient=self.patient,
            test_name="Legacy duplicate report",
            specimen_date=date(2026, 1, 1),
            status=LabBooking.Status.COMPLETED,
        )
        PrescriptionUpload.objects.create(
            development_key="dev-health-record-approved-rx",
            is_development_data=True,
            patient=self.patient,
            prescription_number="Legacy duplicate prescription",
            status=PrescriptionUpload.Status.APPROVED,
        )
        for key in (
            "dev-health-record-vaccination-one-flu",
            "dev-health-record-vaccination-two-tdap",
            "dev-health-record-vaccination-three-hepb",
            "dev-health-record-vaccination-four-flu",
        ):
            Vaccination.objects.create(
                development_key=key,
                is_development_data=True,
                patient=self.patient,
                vaccine="Legacy duplicate vaccine",
                administered_on=date(2026, 1, 1),
                dose="Dose 1",
            )
        pharmacy_prescription = PrescriptionUpload.objects.create(
            development_key="dev-pharmacy-prescription-pending",
            is_development_data=True,
            patient=self.patient,
            prescription_number="Pharmacy workflow record",
            status=PrescriptionUpload.Status.PENDING,
        )

        call_command("seed_health_records_development_data", verbosity=0)
        call_command("seed_health_records_development_data", verbosity=0)
        self.assertEqual(
            LabBooking.objects.filter(development_key__startswith="dev-health-record-").count(),
            5,
        )
        self.assertEqual(
            Vaccination.objects.filter(development_key__startswith="dev-health-record-").count(),
            5,
        )
        self.assertTrue(PrescriptionUpload.objects.filter(pk=pharmacy_prescription.pk).exists())
        self.assertEqual(
            CarePatient.objects.filter(development_key__startswith="dev-care-patient-").count(),
            5,
        )
        self.assertEqual(
            PrescriptionUpload.objects.filter(
                development_key__startswith="dev-health-record-",
                status=PrescriptionUpload.Status.APPROVED,
            ).count(),
            5,
        )
        self.assertEqual(
            VitalReading.objects.filter(
                development_key__startswith="dev-health-record-",
            ).count(),
            15,
        )
        patients = CarePatient.objects.filter(
            development_key__in=[
                f"dev-care-patient-{slug}"
                for slug in ("one", "two", "three", "four", "five")
            ]
        )
        self.assertEqual(patients.count(), 5)
        self.assertNotIn("DEV Sample Patient", patients.values_list("name", flat=True))
        for patient in patients:
            account = PlatformUser.objects.get(pk=patient.external_id)
            self.assertEqual(patient.name, account.name)
            self.assertTrue(account.email.endswith("@example.test"))
            self.assertTrue(account.mobile)
            self.assertTrue(account.date_of_birth)
            self.assertTrue(account.gender)
        prescription = PrescriptionUpload.objects.get(
            development_key="dev-health-record-approved-rx-one"
        )
        self.assertEqual(prescription.patient, seeded_patient)
        self.assertEqual(prescription.appointment, completed_appointment)
        prescription_response = self.client.get(
            "/api/admin/health-records/prescriptions/",
            {"patient_id": str(seeded_patient.pk)},
        )
        seeded_prescription = next(
            row for row in prescription_response.data["results"]
            if row["prescription_number"] == "HR-RX-AN-01"
        )
        self.assertEqual(seeded_prescription["status"], PrescriptionUpload.Status.APPROVED)
        dashboard = build_overview("30", care_stats=care_dashboard_stats())
        self.assertEqual(
            dashboard["platform_overview"]["total_users"],
            dashboard_users_before + 5,
        )
        self.assertEqual(dashboard["live_stats"]["new_patients"], 5)
        self.assertEqual(
            AuditLog.objects.filter(
                development_key__startswith="dev-health-record-access-"
            ).count(),
            15,
        )

    @override_settings(DEBUG=True)
    def test_patient_directory_excludes_unlinked_pharmacy_customer_records(self):
        call_command("seed_health_records_development_data", verbosity=0)
        CarePatient.objects.create(
            development_key="dev-pharmacy-delivery-customer-test",
            name="Development dispatch customer",
            is_development_data=True,
        )
        response = self.client.get("/api/admin/health-records/patients/")
        self.assertEqual(response.status_code, 200, response.data)
        names = {patient["name"] for patient in response.data["results"]}
        self.assertTrue({"Ananya Kulkarni", "Rohan Deshmukh", "Kavya Nair", "Aarav Iyer", "Meera Joshi"} <= names)
        self.assertNotIn("Development dispatch customer", names)
