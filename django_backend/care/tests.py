import json
import os
import tempfile
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission
from audit.models import AuditLog
from care.models import (
    Appointment,
    AppointmentSlot,
    CarePayment,
    CarePatient,
    CareSetting,
    Doctor,
    DoctorLeave,
    DoctorPayout,
    InstantConsult,
    RefundRequest,
    Review,
    Specialty,
    WeeklySchedule,
)


class CareAdminApiTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name="CARE test admin")
        RolePermission.objects.create(
            role=role,
            module="doctors",
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
        )
        RolePermission.objects.create(role=role, module="dashboard", can_view=True)
        user = User.objects.create_user(username="care-test-admin", password="test-password")
        AdminProfile.objects.create(user=user, role=role)
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.user = user
        self.family = Specialty.objects.create(name="Family Medicine")
        self.cardiology = Specialty.objects.create(name="Cardiology")
        self.patient = CarePatient.objects.create(
            external_id="patient-1",
            name="Test Patient",
        )
        self.doctor = Doctor.objects.create(
            name="Dr. Test",
            specialty=self.family,
            city="Pune",
            degree="MBBS",
            fee=Decimal("500.00"),
            consultation_type=Doctor.ConsultationType.BOTH,
            verification_status=Doctor.VerificationStatus.VERIFIED,
            available=True,
        )

    def make_slot(self, *, on=None, start=time(9), doctor=None, status="available"):
        on = on or (timezone.localdate() + timedelta(days=4))
        doctor = doctor or self.doctor
        slot, _ = AppointmentSlot.objects.get_or_create(
            doctor=doctor,
            date=on,
            start_time=start,
            defaults={
                "weekday": on.weekday(),
                "end_time": (datetime.combine(on, start) + timedelta(minutes=30)).time(),
                "duration_minutes": 30,
                "status": status,
            },
        )
        return slot

    def make_appointment(self, slot=None, *, status="booked", payment_status="pending"):
        slot = slot or self.make_slot()
        slot.status = "booked"
        slot.save(update_fields=["status"])
        return Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient,
            slot=slot,
            doctor_name=self.doctor.name,
            patient_name=self.patient.name,
            specialty_name=self.family.name,
            date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            fee=Decimal("500.00"),
            status=status,
            payment_status=payment_status,
        )

    def test_doctor_create_edit_view_search_filter_delete_and_approved_rating(self):
        created = self.client.post(
            "/api/admin/care/doctors/",
            {
                "name": "Dr. New",
                "specialty": self.family.name,
                "city": "Pune",
                "degree": "MBBS",
                "fee": 500,
                "type": "Both",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        doctor_id = created.data["doctor"]["id"]
        self.assertEqual(created.data["doctor"]["verification_status"], "pending")
        self.assertEqual(created.data["doctor"]["rating"], 0)

        edit = self.client.patch(
            f"/api/admin/care/doctors/{doctor_id}/",
            {"city": "Mumbai", "fee": 700, "qualifications": "MBBS, MD", "license_details": "DEV licence"},
            format="json",
        )
        self.assertEqual(edit.status_code, 200, edit.data)
        self.assertEqual(edit.data["doctor"]["city"], "Mumbai")
        self.assertEqual(edit.data["doctor"]["license_details"], "DEV licence")
        view = self.client.get(f"/api/admin/care/doctors/{doctor_id}/")
        self.assertEqual(view.data["doctor"]["specialty"], self.family.name)

        pending_review = Review.objects.create(
            doctor_id=doctor_id,
            patient_name="Sample",
            rating=1,
            moderation_status=Review.ModerationStatus.PENDING,
        )
        approved_review = Review.objects.create(
            doctor_id=doctor_id,
            patient_name="Sample",
            rating=5,
            moderation_status=Review.ModerationStatus.APPROVED,
        )
        filtered = self.client.get("/api/admin/care/doctors/?search=Dr.%20New&verification_status=pending")
        self.assertEqual(len(filtered.data["results"]), 1)
        self.assertEqual(filtered.data["results"][0]["rating"], 5)
        self.assertEqual(filtered.data["results"][0]["reviews"], 1)
        self.client.post(
            f"/api/admin/care/reviews/{pending_review.pk}/action/approve/",
            {},
            format="json",
        )
        self.assertEqual(Doctor.objects.get(pk=doctor_id).rating_summary, {"rating": 3.0, "reviews": 2})
        self.client.post(
            f"/api/admin/care/reviews/{approved_review.pk}/action/hide/",
            {},
            format="json",
        )
        self.assertEqual(Doctor.objects.get(pk=doctor_id).rating_summary, {"rating": 1.0, "reviews": 1})

        deleted = self.client.delete(f"/api/admin/care/doctors/{doctor_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Doctor.objects.filter(pk=doctor_id).exists())

    def test_specialty_edit_activation_and_delete_restriction(self):
        response = self.client.post(
            "/api/admin/care/specialties/",
            {"name": "Neurology", "icon": "brain", "description": "Nerve care", "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        specialty_id = response.data["specialty"]["id"]
        self.assertEqual(self.client.get(f"/api/admin/care/specialties/{specialty_id}/").status_code, 200)
        edit = self.client.patch(
            f"/api/admin/care/specialties/{specialty_id}/",
            {"name": "Neurology", "is_active": True},
            format="json",
        )
        self.assertTrue(edit.data["specialty"]["is_active"])
        self.assertEqual(self.client.delete(f"/api/admin/care/specialties/{self.family.pk}/").status_code, 409)
        self.assertEqual(self.client.delete(f"/api/admin/care/specialties/{specialty_id}/").status_code, 204)

    def test_slots_schedule_leave_booking_and_double_booking_protection(self):
        on = timezone.localdate() + timedelta(days=(7 - timezone.localdate().weekday()) % 7 or 7)
        schedule = self.client.post(
            "/api/admin/care/schedules/",
            {
                "doctor_id": str(self.doctor.pk),
                "weekday": on.weekday(),
                "start_time": "09:00",
                "end_time": "10:00",
                "duration_minutes": 15,
                "is_working": True,
            },
            format="json",
        )
        self.assertEqual(schedule.status_code, 200, schedule.data)
        slots = self.client.get(f"/api/admin/care/slots/?doctor_id={self.doctor.pk}&date={on.isoformat()}")
        self.assertEqual(len(slots.data["results"]), 4)
        slot_id = slots.data["results"][0]["id"]
        blocked = self.client.patch(
            f"/api/admin/care/slots/{slot_id}/",
            {"status": "blocked"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 200)
        self.assertEqual(
            self.client.patch(f"/api/admin/care/slots/{slot_id}/", {"status": "available"}, format="json").status_code,
            200,
        )
        booked = self.client.post(
            "/api/admin/care/appointments/",
            {"patient_id": str(self.patient.pk), "slot_id": slot_id},
            format="json",
        )
        self.assertEqual(booked.status_code, 201, booked.data)
        self.assertEqual(booked.data["appointment"]["status"], "booked")
        self.assertEqual(
            self.client.delete(f"/api/admin/care/slots/{slot_id}/").status_code,
            409,
        )
        self.assertEqual(
            self.client.patch(f"/api/admin/care/slots/{slot_id}/", {"status": "blocked"}, format="json").status_code,
            409,
        )
        duplicate = self.client.post(
            "/api/admin/care/appointments/",
            {"patient_id": str(self.patient.pk), "slot_id": slot_id},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            Appointment._meta.constraints[0].name,
            "care_unique_active_appointment_slot",
        )

        leave_date = on + timedelta(days=7)
        leave_date += timedelta(days=(on.weekday() - leave_date.weekday()) % 7)
        leave = self.client.post(
            "/api/admin/care/leaves/",
            {"doctor_id": str(self.doctor.pk), "date": leave_date.isoformat(), "reason": "Leave"},
            format="json",
        )
        self.assertEqual(leave.status_code, 201, leave.data)
        leave_slots = self.client.get(
            f"/api/admin/care/slots/?doctor_id={self.doctor.pk}&date={leave_date.isoformat()}"
        )
        self.assertEqual(leave_slots.data["results"], [])

    def test_slot_create_edit_overlap_leave_and_delete_rules(self):
        on = timezone.localdate() + timedelta(days=5)
        payload = {
            "doctor_id": str(self.doctor.pk),
            "date": on.isoformat(),
            "weekday": on.weekday(),
            "start_time": "11:00",
            "end_time": "11:10",
            "duration_minutes": 10,
            "status": "available",
        }
        missing_doctor = {key: value for key, value in payload.items() if key != "doctor_id"}
        self.assertEqual(
            self.client.post("/api/admin/care/slots/", missing_doctor, format="json").status_code,
            400,
        )
        created = self.client.post("/api/admin/care/slots/", payload, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        slot_id = created.data["slot"]["id"]
        self.assertTrue(AppointmentSlot.objects.filter(pk=slot_id).exists())
        self.assertEqual(created.data["slot"]["status"], AppointmentSlot.Status.AVAILABLE)

        overlapping = {**payload, "start_time": "11:05", "end_time": "11:15"}
        self.assertEqual(
            self.client.post("/api/admin/care/slots/", overlapping, format="json").status_code,
            409,
        )
        invalid_duration = {**payload, "end_time": "11:20"}
        self.assertEqual(
            self.client.post("/api/admin/care/slots/", invalid_duration, format="json").status_code,
            400,
        )

        edited = self.client.put(
            f"/api/admin/care/slots/{slot_id}/",
            {"start_time": "11:10", "end_time": "11:20"},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data["slot"]["start_time"], "11:10:00")

        DoctorLeave.objects.create(doctor=self.doctor, date=on + timedelta(days=1))
        leave_slot = {**payload, "date": (on + timedelta(days=1)).isoformat(),
                      "weekday": (on + timedelta(days=1)).weekday()}
        self.assertEqual(
            self.client.post("/api/admin/care/slots/", leave_slot, format="json").status_code,
            409,
        )
        self.assertEqual(
            self.client.delete(f"/api/admin/care/slots/{slot_id}/").status_code,
            204,
        )
        self.assertFalse(AppointmentSlot.objects.filter(pk=slot_id).exists())

    def test_care_navigation_resources_return_live_sql_counts(self):
        expected_counts = {
            "appointments": 0,
            "doctors": 1,
            "slots": 0,
            "instant-consults": 0,
            "specialties": 2,
            "reviews": 0,
        }
        for resource, expected in expected_counts.items():
            response = self.client.get(f"/api/admin/care/{resource}/?page_size=1")
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["total"], expected, resource)
        payouts = self.client.get("/api/admin/care/payouts/?page_size=1")
        self.assertEqual(payouts.status_code, 200, payouts.data)
        self.assertEqual(len(payouts.data["results"]), 1)
        payout_count = self.client.get("/api/admin/care/payouts/?count_only=true")
        self.assertEqual(payout_count.data["total"], 0)

    def test_care_patient_and_payout_search_use_sql_records(self):
        CarePatient.objects.create(external_id="patient-2", name="Searchable Patient")
        patients = self.client.get("/api/admin/care/patients/?search=searchable")
        self.assertEqual(patients.status_code, 200, patients.data)
        self.assertEqual([row["name"] for row in patients.data["results"]], ["Searchable Patient"])

        Doctor.objects.create(
            name="Dr. Other",
            specialty=self.cardiology,
            city="Delhi",
            degree="MBBS",
            fee=Decimal("700.00"),
            consultation_type=Doctor.ConsultationType.BOTH,
        )
        payouts = self.client.get("/api/admin/care/payouts/?search=other")
        self.assertEqual(payouts.status_code, 200, payouts.data)
        self.assertEqual([row["doctor_name"] for row in payouts.data["results"]], ["Dr. Other"])

    def test_appointment_timeline_reschedule_cancel_refund_complete_and_no_show(self):
        first = self.make_slot(on=timezone.localdate() + timedelta(days=5))
        second = self.make_slot(on=timezone.localdate() + timedelta(days=6), start=time(10))
        appointment = self.make_appointment(first)
        self.assertEqual(
            self.client.post(f"/api/admin/care/appointments/{appointment.pk}/action/confirm/", {}, format="json").status_code,
            200,
        )
        moved = self.client.post(
            f"/api/admin/care/appointments/{appointment.pk}/action/reschedule/",
            {"slot_id": str(second.pk)},
            format="json",
        )
        self.assertEqual(moved.status_code, 200, moved.data)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, AppointmentSlot.Status.AVAILABLE)
        self.assertEqual(second.status, AppointmentSlot.Status.BOOKED)
        details = self.client.get(f"/api/admin/care/appointments/{appointment.pk}/")
        self.assertGreaterEqual(len(details.data["appointment"]["history"]), 2)

        payment = CarePayment.objects.create(
            appointment=appointment,
            patient_id=self.patient.external_id,
            doctor=self.doctor,
            amount=appointment.fee,
            kind=CarePayment.Kind.CONSULTATION,
            status=CarePayment.Status.PAID,
        )
        appointment.payment_status = Appointment.PaymentStatus.PAID
        appointment.save(update_fields=["payment_status"])
        cancelled = self.client.post(
            f"/api/admin/care/appointments/{appointment.pk}/action/cancel/",
            {},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        refund = RefundRequest.objects.get(appointment=appointment)
        self.assertEqual(refund.payment_id, payment.pk)
        self.assertEqual(refund.status, RefundRequest.Status.PENDING)
        self.assertEqual(appointment.slot.status, AppointmentSlot.Status.AVAILABLE)

        completed = self.make_appointment(
            self.make_slot(on=timezone.localdate() + timedelta(days=8), start=time(11))
        )
        result = self.client.post(
            f"/api/admin/care/appointments/{completed.pk}/action/complete/",
            {"diagnosis": "Migraine", "prescription_notes": "Rest and hydrate."},
            format="json",
        )
        self.assertEqual(result.status_code, 200, result.data)
        completed.refresh_from_db()
        self.assertEqual(completed.status, Appointment.Status.COMPLETED)
        self.assertEqual(completed.diagnosis, "Migraine")
        self.assertEqual(completed.prescription_notes, "Rest and hydrate.")

        no_show = self.make_appointment(
            self.make_slot(on=timezone.localdate() + timedelta(days=9), start=time(12))
        )
        result = self.client.post(
            f"/api/admin/care/appointments/{no_show.pk}/action/no-show/",
            {},
            format="json",
        )
        self.assertEqual(result.status_code, 200)
        no_show.refresh_from_db()
        self.assertEqual(no_show.status, Appointment.Status.NO_SHOW)
        self.assertEqual(no_show.slot.status, AppointmentSlot.Status.AVAILABLE)

    def test_instant_consult_queue_timer_assignment_call_log_and_doctor_online(self):
        queue = self.client.post(
            "/api/admin/care/instant-consults/",
            {"patient_id": str(self.patient.pk), "consultation_type": "Video"},
            format="json",
        )
        self.assertEqual(queue.status_code, 201, queue.data)
        consult = InstantConsult.objects.get(pk=queue.data["consult"]["id"])
        InstantConsult.objects.filter(pk=consult.pk).update(
            created_at=timezone.now() - timedelta(minutes=20)
        )
        row = self.client.get("/api/admin/care/instant-consults/").data["results"][0]
        self.assertGreaterEqual(row["waiting_seconds"], 900)
        self.assertTrue(row["waiting_over_15_minutes"])
        self.assertEqual(
            self.client.post(f"/api/admin/care/doctors/{self.doctor.pk}/action/offline/", {}, format="json").status_code,
            200,
        )
        self.doctor.refresh_from_db()
        self.assertFalse(self.doctor.available)
        self.client.post(f"/api/admin/care/doctors/{self.doctor.pk}/action/online/", {}, format="json")
        assigned = self.client.post(
            f"/api/admin/care/instant-consults/{consult.pk}/action/assign/",
            {"doctor_id": str(self.doctor.pk)},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200, assigned.data)
        self.assertEqual(
            self.client.post(f"/api/admin/care/instant-consults/{consult.pk}/action/start/", {}, format="json").status_code,
            200,
        )
        InstantConsult.objects.filter(pk=consult.pk).update(
            started_at=timezone.now() - timedelta(minutes=3)
        )
        ended = self.client.post(
            f"/api/admin/care/instant-consults/{consult.pk}/action/end/",
            {},
            format="json",
        )
        self.assertEqual(ended.status_code, 200, ended.data)
        self.assertGreaterEqual(ended.data["consult"]["duration_seconds"], 180)
        call_log = self.client.get("/api/admin/care/call-logs/")
        self.assertEqual(len(call_log.data["results"]), 1)
        self.assertEqual(call_log.data["results"][0]["consultation_type"], "Video")

    def test_review_moderation_and_rating_only_uses_approved_reviews(self):
        review = Review.objects.create(
            doctor=self.doctor,
            patient_name="Test Patient",
            rating=4,
            comment="Good",
        )
        self.assertEqual(self.doctor.rating_summary, {"rating": 0.0, "reviews": 0})
        approved = self.client.post(
            f"/api/admin/care/reviews/{review.pk}/action/approve/",
            {},
            format="json",
        )
        self.assertEqual(approved.data["rating"], {"rating": 4.0, "reviews": 1})
        hidden = self.client.post(
            f"/api/admin/care/reviews/{review.pk}/action/hide/",
            {},
            format="json",
        )
        self.assertEqual(hidden.data["rating"], {"rating": 0.0, "reviews": 0})
        self.assertEqual(self.client.delete(f"/api/admin/care/reviews/{review.pk}/").status_code, 200)

    def test_payout_calculates_from_setting_pays_once_and_writes_audit(self):
        setting = self.client.post(
            "/api/admin/care/settings/",
            {"commission_percent": 20},
            format="json",
        )
        self.assertEqual(setting.status_code, 200)
        appointment = self.make_appointment(
            self.make_slot(on=timezone.localdate() - timedelta(days=3)),
            status=Appointment.Status.COMPLETED,
            payment_status=Appointment.PaymentStatus.PAID,
        )
        appointment.save(update_fields=["status", "payment_status", "updated_at"])
        period = appointment.date.strftime("%Y-%m")
        listed = self.client.get(f"/api/admin/care/payouts/?period={period}")
        row = next(item for item in listed.data["results"] if item["doctor_id"] == str(self.doctor.pk))
        self.assertEqual(row["consultation_count"], 1)
        self.assertEqual(Decimal(str(row["commission_percent"])), Decimal("20.00"))
        paid = self.client.post(
            f"/api/admin/care/payouts/{row['id']}/action/pay/",
            {},
            format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(CarePayment.objects.filter(payout_id=paid.data["payout"]["id"]).count(), 1)
        duplicate = self.client.post(
            f"/api/admin/care/payouts/{row['id']}/action/pay/",
            {},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertTrue(AuditLog.objects.filter(module="doctors", action="pay").exists())

    @override_settings(DEBUG=True)
    def test_sql_demo_seed_and_export_import_are_idempotent_and_sanitized(self):
        call_command("seed_care_development_data", verbosity=0)
        counts = (
            Doctor.objects.filter(is_development_data=True).count(),
            Appointment.objects.filter(is_development_data=True).count(),
            Review.objects.filter(is_development_data=True).count(),
        )
        call_command("seed_care_development_data", verbosity=0)
        self.assertEqual(
            counts,
            (
                Doctor.objects.filter(is_development_data=True).count(),
                Appointment.objects.filter(is_development_data=True).count(),
                Review.objects.filter(is_development_data=True).count(),
            ),
        )
        self.assertEqual(counts, (4, 5, 4))
        self.assertTrue(
            InstantConsult.objects.filter(
                is_development_data=True,
                status=InstantConsult.Status.WAITING,
                created_at__lt=timezone.now() - timedelta(minutes=15),
            ).exists()
        )
        self.assertTrue(Review.objects.filter(moderation_status=Review.ModerationStatus.HIDDEN).exists())
        self.assertTrue(Review.objects.filter(moderation_status=Review.ModerationStatus.PENDING).exists())
        self.assertTrue(DoctorPayout.objects.filter(status=DoctorPayout.Status.PENDING).exists())
        self.assertTrue(DoctorPayout.objects.filter(status=DoctorPayout.Status.PAID).exists())
        doctor = Doctor.objects.get(development_key="dev-care-doctor-asha")
        self.assertEqual(doctor.rating_summary, {"rating": 4.5, "reviews": 2})

        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "care-data.json")
            call_command("export_dev_data", output=path, verbosity=0)
            with open(path, encoding="utf-8") as source:
                snapshot = json.load(source)
            with open(path, "rb") as source:
                exported_bytes = source.read()
            self.assertIn("DEV Sample Patient", json.dumps(snapshot))
            self.assertIn("Fictional development diagnosis.", json.dumps(snapshot))
            self.assertNotIn("Seasonal allergy", json.dumps(snapshot))
            self.assertNotIn('"external_id": "dev-patient-one"', json.dumps(snapshot))
            self.assertNotIn('"patient_id": "dev-patient-one"', json.dumps(snapshot))
            call_command("import_dev_data", input=path, verbosity=0)
            call_command("export_dev_data", output=path, verbosity=0)
            with open(path, "rb") as source:
                self.assertEqual(source.read(), exported_bytes)
            doctor.name = "Changed locally"
            doctor.save(update_fields=["name", "updated_at"])
            call_command("import_dev_data", input=path, verbosity=0)
            call_command("import_dev_data", input=path, verbosity=0)
            doctor.refresh_from_db()
            self.assertEqual(doctor.name, "Changed locally")
            self.assertEqual(Doctor.objects.filter(development_key="dev-care-doctor-asha").count(), 1)
            remote_doctor = next(
                item for item in snapshot
                if item["development_key"] == "dev-care-doctor-asha"
            )
            remote_doctor["fields"]["name"] = "Remote competing edit"
            with open(path, "w", encoding="utf-8") as output:
                json.dump(snapshot, output)
            with self.assertRaises(CommandError):
                call_command("import_dev_data", input=path, verbosity=0)
            doctor.refresh_from_db()
            self.assertEqual(doctor.name, "Changed locally")

    def test_shared_snapshot_merges_development_records_from_both_developers(self):
        specialty = Specialty.objects.create(
            development_key="dev-care-shared-specialty",
            is_development_data=True,
            name="Shared Development Specialty",
        )

        def add_developer_records(suffix):
            doctor = Doctor.objects.create(
                development_key=f"dev-care-doctor-{suffix}",
                is_development_data=True,
                name=f"DEV Doctor {suffix}",
                specialty=specialty,
                city="Development",
                degree="MBBS",
                fee=Decimal("500.00"),
            )
            patient = CarePatient.objects.create(
                development_key=f"dev-care-patient-{suffix}",
                is_development_data=True,
                external_id=f"private-patient-{suffix}",
                name=f"Private Patient {suffix}",
            )
            slot = self.make_slot(doctor=doctor)
            slot.development_key = f"dev-care-slot-{suffix}"
            slot.is_development_data = True
            slot.save(update_fields=["development_key", "is_development_data"])
            appointment = Appointment.objects.create(
                development_key=f"dev-care-appointment-{suffix}",
                is_development_data=True,
                doctor=doctor,
                patient=patient,
                slot=slot,
                doctor_name=doctor.name,
                patient_name=patient.name,
                specialty_name=specialty.name,
                date=slot.date,
                start_time=slot.start_time,
                end_time=slot.end_time,
                fee=doctor.fee,
            )
            review = Review.objects.create(
                development_key=f"dev-care-review-{suffix}",
                is_development_data=True,
                doctor=doctor,
                patient_name=patient.name,
                patient_id=patient.external_id,
                rating=5,
                moderation_status=Review.ModerationStatus.APPROVED,
            )
            return appointment, review

        add_developer_records("developer-a")
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "shared.json")
            call_command("export_dev_data", output=path, verbosity=0)
            call_command("import_dev_data", input=path, verbosity=0)
            add_developer_records("developer-b")
            call_command("export_dev_data", output=path, verbosity=0)
            with open(path, encoding="utf-8") as source:
                snapshot = json.load(source)

            for model_label, prefix in (
                ("care.doctor", "dev-care-doctor-"),
                ("care.appointment", "dev-care-appointment-"),
                ("care.review", "dev-care-review-"),
            ):
                keys = {
                    row["development_key"]
                    for row in snapshot
                    if row["model"] == model_label
                    and row["development_key"].startswith(prefix)
                }
                self.assertEqual(
                    keys,
                    {f"{prefix}developer-a", f"{prefix}developer-b"},
                )
            self.assertNotIn("Private Patient", json.dumps(snapshot))
            call_command("import_dev_data", input=path, verbosity=0)
            call_command("import_dev_data", input=path, verbosity=0)
            self.assertEqual(
                Appointment.objects.filter(
                    development_key__in=(
                        "dev-care-appointment-developer-a",
                        "dev-care-appointment-developer-b",
                    )
                ).count(),
                2,
            )

    def test_dashboard_reads_live_care_metrics_from_sql(self):
        self.make_appointment(status=Appointment.Status.COMPLETED, payment_status=Appointment.PaymentStatus.PAID)
        Review.objects.create(doctor=self.doctor, rating=5, moderation_status=Review.ModerationStatus.PENDING)
        consult = InstantConsult.objects.create(
            patient_id=self.patient.external_id,
            patient_name=self.patient.name,
            status=InstantConsult.Status.WAITING,
            consultation_type="Audio",
        )
        InstantConsult.objects.filter(pk=consult.pk).update(
            created_at=timezone.now() - timedelta(minutes=20)
        )
        response = self.client.get("/api/dashboard/overview/?period=7")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["care"]["total_doctors"], 1)
        self.assertEqual(response.data["care"]["appointment_statuses"]["completed"], 1)
        self.assertEqual(response.data["needs_attention"]["pending_reviews"], 1)
        self.assertEqual(response.data["needs_attention"]["patients_waiting_over_15_minutes"], 1)
        self.assertIn("django:care", response.data["meta"]["sources"]["care"])
