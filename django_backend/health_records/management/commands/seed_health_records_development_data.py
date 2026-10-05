from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from audit.models import AuditLog
from care.models import Appointment, CarePatient
from dashboard.models import PlatformUser
from health_records.models import (
    Allergy,
    LabBooking,
    PrescriptionUpload,
    Vaccination,
    VitalReading,
)


PATIENTS = (
    {
        "slug": "one",
        "name": "Ananya Kulkarni",
        "email": "ananya.kulkarni@example.test",
        "mobile": "+91 90000 00001",
        "date_of_birth": "1988-04-12",
        "gender": "Female",
        "blood_group": "O+",
        "city": "Pune",
        "user_key": "dev-admin-user-patient-one",
    },
    {
        "slug": "two",
        "name": "Rohan Deshmukh",
        "email": "rohan.deshmukh@example.test",
        "mobile": "+91 90000 00002",
        "date_of_birth": "1976-09-03",
        "gender": "Male",
        "blood_group": "B+",
        "city": "Mumbai",
        "user_key": "dev-admin-user-patient-two",
    },
    {
        "slug": "three",
        "name": "Kavya Nair",
        "email": "kavya.nair@example.test",
        "mobile": "+91 90000 00003",
        "date_of_birth": "1993-02-21",
        "gender": "Female",
        "blood_group": "A+",
        "city": "Bengaluru",
        "user_key": "dev-health-record-user-three",
    },
    {
        "slug": "four",
        "name": "Aarav Iyer",
        "email": "aarav.iyer@example.test",
        "mobile": "+91 90000 00004",
        "date_of_birth": "1968-11-18",
        "gender": "Male",
        "blood_group": "AB+",
        "city": "Chennai",
        "user_key": "dev-health-record-user-four",
    },
    {
        "slug": "five",
        "name": "Meera Joshi",
        "email": "meera.joshi@example.test",
        "mobile": "+91 90000 00005",
        "date_of_birth": "1985-07-09",
        "gender": "Female",
        "blood_group": "A-",
        "city": "Pune",
        "user_key": "dev-health-record-user-five",
    },
)


def key(value):
    return f"dev-health-record-{value}"


class Command(BaseCommand):
    help = "Seed idempotent, fictional, SQL-backed Health Records development data."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Health Records development data requires DEBUG=True.")

        with transaction.atomic():
            patients = {}
            for values in PATIENTS:
                user_key = values["user_key"]
                user, _ = PlatformUser.objects.update_or_create(
                    development_key=user_key,
                    defaults={
                        "id": user_key,
                        "name": values["name"],
                        "email": values["email"],
                        "mobile": values["mobile"],
                        "city": values["city"],
                        "gender": values["gender"],
                        "date_of_birth": values["date_of_birth"],
                        "blood_group": values["blood_group"],
                        "role": PlatformUser.Role.PATIENT,
                        "status": "active",
                        "is_active": True,
                        "is_blocked": False,
                        "is_development_data": True,
                    },
                )
                slug = values["slug"]
                patients[slug], _ = CarePatient.objects.update_or_create(
                    development_key=f"dev-care-patient-{slug}",
                    defaults={
                        "external_id": user.pk,
                        "name": values["name"],
                        "is_development_data": True,
                    },
                )

            LabBooking.objects.filter(
                development_key=key("completed-cmp")
            ).delete()
            PrescriptionUpload.objects.filter(
                development_key=key("approved-rx")
            ).delete()
            Vaccination.objects.filter(
                development_key__in=[
                    key("vaccination-one-flu"),
                    key("vaccination-two-tdap"),
                    key("vaccination-three-hepb"),
                    key("vaccination-four-flu"),
                ]
            ).delete()

            today = timezone.localdate()
            now = timezone.now()
            lab_reports = (
                ("one", "Lipid Profile", 52, "Total cholesterol 182 mg/dL; LDL 104 mg/dL; HDL 54 mg/dL; triglycerides 120 mg/dL."),
                ("two", "Complete Blood Count (CBC)", 43, "Haemoglobin 14.1 g/dL; white-cell and platelet counts within reference range."),
                ("three", "Thyroid Profile", 35, "TSH 2.4 mIU/L; free T4 and free T3 within reference range."),
                ("four", "HbA1c", 24, "HbA1c 6.2%; fasting glucose 112 mg/dL; clinician follow-up advised."),
                ("five", "Liver Function Test", 12, "ALT 24 U/L; AST 22 U/L; bilirubin and albumin within reference range."),
            )
            for slug, test_name, days_ago, summary in lab_reports:
                LabBooking.objects.update_or_create(
                    development_key=key(f"completed-{slug}"),
                    defaults={
                        "patient": patients[slug],
                        "test_name": test_name,
                        "specimen_date": today - timedelta(days=days_ago),
                        "phlebotomist": "Nisha Patil",
                        "pathologist": "Dr. Vivek Menon",
                        "status": LabBooking.Status.COMPLETED,
                        "clinical_summary": summary,
                        "report_pdf_url": "",
                        "completed_at": now - timedelta(days=days_ago),
                        "is_development_data": True,
                    },
                )
            LabBooking.objects.filter(development_key=key("pending-cbc")).delete()

            prescriptions = (
                ("one", "HR-RX-AN-01", "Dr. Asha Rao", "Seasonal allergic rhinitis", [
                    {"name": "Cetirizine", "dose": "10 mg once each evening", "duration": "7 days"},
                    {"name": "Saline nasal spray", "dose": "One spray per nostril", "duration": "As needed"},
                ], "Avoid known triggers; review if symptoms persist.", 48),
                ("two", "HR-RX-RD-01", "Dr. Kabir Mehta", "Iron deficiency under follow-up", [
                    {"name": "Ferrous ascorbate", "dose": "100 mg after food", "duration": "8 weeks"},
                ], "Repeat complete blood count in eight weeks.", 40),
                ("three", "HR-RX-KN-01", "Dr. Meera Shah", "Primary hypothyroidism", [
                    {"name": "Levothyroxine", "dose": "25 mcg before breakfast", "duration": "Review in 6 weeks"},
                ], "Take on an empty stomach; repeat thyroid profile as advised.", 32),
                ("four", "HR-RX-AI-01", "Dr. Kabir Mehta", "Prediabetes", [
                    {"name": "Metformin", "dose": "500 mg with evening meal", "duration": "30 days"},
                ], "Continue lifestyle measures and home glucose monitoring.", 21),
                ("five", "HR-RX-MJ-01", "Dr. Asha Rao", "Vitamin D insufficiency", [
                    {"name": "Cholecalciferol", "dose": "60,000 IU once weekly", "duration": "6 weeks"},
                ], "Take with a meal; repeat vitamin D level at follow-up.", 10),
            )
            for slug, number, doctor, diagnosis, medicines, instructions, days_ago in prescriptions:
                appointment = Appointment.objects.filter(
                    patient=patients[slug],
                    status=Appointment.Status.COMPLETED,
                ).order_by("-date", "-start_time").first()
                PrescriptionUpload.objects.update_or_create(
                    development_key=key(f"approved-rx-{slug}"),
                    defaults={
                        "patient": patients[slug],
                        "appointment": appointment,
                        "prescription_number": number,
                        "doctor_name": appointment.doctor_name if appointment else doctor,
                        "diagnosis": diagnosis,
                        "medicines": medicines,
                        "instructions": instructions,
                        "issued_on": today - timedelta(days=days_ago),
                        "status": PrescriptionUpload.Status.APPROVED,
                        "pdf_url": "",
                        "is_development_data": True,
                    },
                )
            PrescriptionUpload.objects.filter(development_key=key("pending-rx")).delete()

            vaccinations = (
                ("one", "Influenza vaccine", 330, "Annual dose", 35),
                ("two", "Tdap vaccine", 270, "Booster dose", 90),
                ("three", "Hepatitis B vaccine", 150, "Dose 2", 30),
                ("four", "Influenza vaccine", 300, "Annual dose", 60),
                ("five", "COVID-19 vaccine", 240, "Updated booster", 120),
            )
            for slug, vaccine, next_due_days, dose, days_ago in vaccinations:
                Vaccination.objects.update_or_create(
                    development_key=key(f"vaccination-{slug}"),
                    defaults={
                        "patient": patients[slug],
                        "vaccine": vaccine,
                        "administered_on": today - timedelta(days=days_ago),
                        "dose": dose,
                        "next_due": today + timedelta(days=next_due_days),
                        "is_development_data": True,
                    },
                )

            allergies = (
                ("one-pollen", "Pollen", Allergy.Severity.MILD),
                ("one-penicillin", "Penicillin", Allergy.Severity.SEVERE),
                ("two-latex", "Natural rubber latex", Allergy.Severity.MODERATE),
                ("three-peanut", "Peanut", Allergy.Severity.SEVERE),
                ("four-shellfish", "Shellfish", Allergy.Severity.MODERATE),
                ("five-dust", "House dust mite", Allergy.Severity.MILD),
            )
            for slug, allergy, severity in allergies:
                patient_slug = slug.split("-", 1)[0]
                Allergy.objects.update_or_create(
                    development_key=key(f"allergy-{slug}"),
                    defaults={
                        "patient": patients[patient_slug],
                        "allergy": allergy,
                        "severity": severity,
                        "is_development_data": True,
                    },
                )

            vitals = (
                ("one", ((124, 82, "94.0", "65.2", "162.0", 74), (120, 80, "91.0", "64.8", "162.0", 72), (118, 78, "89.0", "64.5", "162.0", 70))),
                ("two", ((136, 88, "108.0", "82.0", "174.0", 84), (132, 86, "104.0", "81.0", "174.0", 82), (128, 84, "99.0", "80.6", "174.0", 79))),
                ("three", ((118, 76, "90.0", "59.2", "160.0", 72), (116, 74, "88.0", "58.8", "160.0", 70), (114, 72, "86.0", "58.5", "160.0", 68))),
                ("four", ((146, 92, "158.0", "75.4", "168.0", 82), (140, 90, "149.0", "74.8", "168.0", 79), (136, 86, "142.0", "74.2", "168.0", 76))),
                ("five", ((122, 80, "98.0", "61.5", "158.0", 76), (120, 78, "94.0", "61.2", "158.0", 74), (118, 76, "91.0", "60.9", "158.0", 72))),
            )
            for slug, readings in vitals:
                for index, (systolic, diastolic, sugar, weight, height, pulse) in enumerate(readings):
                    recorded_at = timezone.make_aware(
                        timezone.datetime.combine(
                            today - timedelta(days=(len(readings) - index - 1) * 30),
                            timezone.datetime.min.time().replace(hour=9),
                        ),
                        timezone.get_current_timezone(),
                    )
                    VitalReading.objects.update_or_create(
                        development_key=key(f"vital-{slug}-{index + 1}"),
                        defaults={
                            "patient": patients[slug],
                            "recorded_at": recorded_at,
                            "systolic_bp": systolic,
                            "diastolic_bp": diastolic,
                            "sugar": Decimal(sugar),
                            "weight": Decimal(weight),
                            "height": Decimal(height),
                            "pulse": pulse,
                            "is_development_data": True,
                        },
                    )

            for patient in patients.values():
                for index, record_type in enumerate(("patient_chart", "lab_reports", "prescriptions")):
                    log_key = f"dev-health-record-access-{patient.development_key.rsplit('-', 1)[-1]}-{record_type}"
                    log = AuditLog.objects.update_or_create(
                        development_key=log_key,
                        defaults={
                            "actor": None,
                            "actor_username": "Priya Shah",
                            "actor_role": "Clinician",
                            "action": "health_record_access",
                            "module": "health_records",
                            "target_type": "patient",
                            "target_id": str(patient.pk),
                            "description": f"Viewed {record_type.replace('_', ' ')} for {patient.name}",
                            "metadata": {
                                "patient_id": str(patient.pk),
                                "patient_name": patient.name,
                                "record_type": record_type,
                                "staff_name": "Priya Shah",
                            },
                            "is_development_data": True,
                        },
                    )[0]
                    AuditLog.objects.filter(pk=log.pk).update(
                        created_at=now - timedelta(days=20 - index)
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "Health Records development data is ready (5 linked patients, "
                "5 completed lab reports, 5 approved prescriptions, vaccinations, "
                "allergies, vitals, and access history)."
            )
        )
