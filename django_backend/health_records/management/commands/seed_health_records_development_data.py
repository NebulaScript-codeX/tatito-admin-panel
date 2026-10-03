from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import CarePatient
from health_records.models import Allergy, LabBooking, PrescriptionUpload, Vaccination, VitalReading


def key(value):
    return f"dev-health-record-{value}"


class Command(BaseCommand):
    help = "Seed idempotent fictional SQL Health Records development data."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Health Records development data requires DEBUG=True.")

        with transaction.atomic():
            patients = {}
            for slug, name in (
                ("one", "Ananya Kulkarni"),
                ("two", "Rohan Deshmukh"),
                ("three", "Kavya Nair"),
                ("four", "Aarav Iyer"),
            ):
                patients[slug], _ = CarePatient.objects.update_or_create(
                    development_key=f"dev-care-patient-{slug}",
                    defaults={
                        "external_id": f"dev-patient-{slug}",
                        "name": name,
                        "is_development_data": True,
                    },
                )

            today = timezone.localdate()
            for slug, test_name, days_ago, summary in (
                ("one", "Comprehensive Metabolic Panel", 18, "Glucose 92 mg/dL; creatinine 0.8 mg/dL; electrolytes within expected limits."),
                ("two", "Complete Blood Count", 11, "Haemoglobin 13.8 g/dL; white cell and platelet counts within expected limits."),
                ("three", "Thyroid Function Panel", 8, "TSH 2.1 mIU/L; free T4 within expected limits."),
                ("four", "Fasting Glucose and HbA1c", 4, "Fasting glucose 142 mg/dL; HbA1c 7.1%; follow-up recommended."),
            ):
                LabBooking.objects.update_or_create(
                    development_key=key("completed-cmp" if slug == "one" else f"completed-{slug}"),
                    defaults={
                        "patient": patients[slug],
                        "test_name": test_name,
                        "specimen_date": today - timedelta(days=days_ago),
                        "phlebotomist": "Nisha Patil",
                        "pathologist": "Dr. Vivek Menon",
                        "status": LabBooking.Status.COMPLETED,
                        "clinical_summary": summary,
                        "report_pdf_url": "",
                        "completed_at": timezone.now() - timedelta(days=days_ago),
                        "is_development_data": True,
                    },
                )
            LabBooking.objects.update_or_create(
                development_key=key("pending-cbc"),
                defaults={
                    "patient": patients["two"],
                    "test_name": "Vitamin D and B12 Panel",
                    "specimen_date": today - timedelta(days=1),
                    "phlebotomist": "",
                    "pathologist": "",
                    "status": LabBooking.Status.PENDING,
                    "clinical_summary": "",
                    "report_pdf_url": "",
                    "completed_at": None,
                    "is_development_data": True,
                },
            )

            for slug, number, doctor, diagnosis, medicine, instruction, days_ago in (
                ("one", "HR-RX-AN-01", "Dr. Asha Rao", "Seasonal allergic rhinitis", "Cetirizine 10 mg", "Take one tablet in the evening for 7 days.", 12),
                ("two", "HR-RX-RD-01", "Dr. Kabir Mehta", "Mild iron-deficiency anaemia", "Ferrous ascorbate", "Take after food; repeat blood count in 8 weeks.", 9),
                ("three", "HR-RX-KN-01", "Dr. Meera Shah", "Primary hypothyroidism", "Levothyroxine 25 mcg", "Take once daily before breakfast; review thyroid profile in 6 weeks.", 7),
                ("four", "HR-RX-AI-01", "Dr. Kabir Mehta", "Type 2 diabetes mellitus", "Metformin 500 mg", "Take with meals as prescribed; continue glucose monitoring.", 3),
            ):
                PrescriptionUpload.objects.update_or_create(
                    development_key=key("approved-rx" if slug == "one" else f"approved-rx-{slug}"),
                    defaults={
                        "patient": patients[slug],
                        "appointment": None,
                        "prescription_number": number,
                        "doctor_name": doctor,
                        "diagnosis": diagnosis,
                        "medicines": [
                            {"name": medicine, "dose": instruction, "duration": "As directed by clinician"},
                        ],
                        "instructions": "Fictional development record for demonstration.",
                        "issued_on": today - timedelta(days=days_ago),
                        "status": PrescriptionUpload.Status.APPROVED,
                        "pdf_url": "",
                        "is_development_data": True,
                    },
                )
            PrescriptionUpload.objects.update_or_create(
                development_key=key("pending-rx"),
                defaults={
                    "patient": patients["two"],
                    "appointment": None,
                    "prescription_number": "DEV-HR-RX-2",
                    "doctor_name": "DEV Dr. Kabir Mehta",
                    "diagnosis": "",
                    "medicines": [],
                    "instructions": "",
                    "issued_on": today,
                    "status": PrescriptionUpload.Status.PENDING,
                    "pdf_url": "",
                    "is_development_data": True,
                },
            )

            for slug, patient, vaccine, days_ago, dose, next_due in (
                ("one-flu", patients["one"], "Influenza vaccine", 30, "Annual dose", 335),
                ("two-tdap", patients["two"], "Tdap vaccine", 90, "Booster", 275),
                ("three-hepb", patients["three"], "Hepatitis B vaccine", 60, "Dose 2", 120),
                ("four-flu", patients["four"], "Influenza vaccine", 45, "Annual dose", 320),
            ):
                Vaccination.objects.update_or_create(
                    development_key=key(f"vaccination-{slug}"),
                    defaults={
                        "patient": patient,
                        "vaccine": vaccine,
                        "administered_on": today - timedelta(days=days_ago),
                        "dose": dose,
                        "next_due": today + timedelta(days=next_due),
                        "is_development_data": True,
                    },
                )

            for slug, patient, allergy, severity in (
                ("one-pollen", patients["one"], "Pollen", Allergy.Severity.MILD),
                ("one-penicillin", patients["one"], "Penicillin", Allergy.Severity.SEVERE),
                ("two-latex", patients["two"], "Natural rubber latex", Allergy.Severity.MODERATE),
                ("three-peanut", patients["three"], "Peanut", Allergy.Severity.SEVERE),
                ("four-shellfish", patients["four"], "Shellfish", Allergy.Severity.MODERATE),
            ):
                Allergy.objects.update_or_create(
                    development_key=key(f"allergy-{slug}"),
                    defaults={
                        "patient": patient,
                        "allergy": allergy,
                        "severity": severity,
                        "is_development_data": True,
                    },
                )

            for patient_slug, patient, values in (
                ("one", patients["one"], ((124, 82, "94.0", "65.2", "162.0", 74), (120, 80, "91.0", "64.8", "162.0", 72), (118, 78, "89.0", "64.5", "162.0", 70))),
                ("two", patients["two"], ((136, 88, "108.0", "82.0", "174.0", 84), (132, 86, "104.0", "81.0", "174.0", 82), (128, 84, "99.0", "80.6", "174.0", 79))),
                ("three", patients["three"], ((118, 76, "90.0", "59.2", "160.0", 72), (116, 74, "88.0", "58.8", "160.0", 70), (114, 72, "86.0", "58.5", "160.0", 68))),
                ("four", patients["four"], ((146, 92, "158.0", "75.4", "168.0", 82), (140, 90, "149.0", "74.8", "168.0", 79), (136, 86, "142.0", "74.2", "168.0", 76))),
            ):
                for index, (systolic, diastolic, sugar, weight, height, pulse) in enumerate(values):
                    VitalReading.objects.update_or_create(
                        development_key=key(f"vital-{patient_slug}-{index + 1}"),
                        defaults={
                            "patient": patient,
                            "recorded_at": timezone.make_aware(
                                timezone.datetime.combine(
                                    today - timedelta(days=(len(values) - index - 1) * 18),
                                    timezone.datetime.min.time(),
                                ),
                                timezone.get_current_timezone(),
                            ),
                            "systolic_bp": systolic,
                            "diastolic_bp": diastolic,
                            "sugar": Decimal(sugar),
                            "weight": Decimal(weight),
                            "height": Decimal(height),
                            "pulse": pulse,
                            "is_development_data": True,
                        },
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "Health Records development data is ready (4 patients, completed/pending "
                "lab bookings and prescription uploads, vaccinations, allergies, and vitals)."
            )
        )
