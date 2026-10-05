from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone

from care.models import (
    Appointment,
    AppointmentSlot,
    AppointmentTimeline,
    CallLog,
    CarePatient,
    CarePayment,
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
from care.services import calculate_payout, create_timeline, generate_slots


def key(value):
    return f"dev-care-{value}"


def upcoming_weekday(weekday, min_days=1):
    today = timezone.localdate()
    difference = (weekday - today.weekday()) % 7
    if difference < min_days:
        difference += 7
    return today + timedelta(days=difference)


def previous_weekday(weekday):
    today = timezone.localdate()
    difference = (today.weekday() - weekday) % 7 or 7
    return today - timedelta(days=difference)


def create_sample_appointment(doctor, patient, when, start, status, paid):
    slot_end = (datetime.combine(when, start) + timedelta(minutes=30)).time()
    slot, _ = AppointmentSlot.objects.update_or_create(
        development_key=key(f"slot-asha-{status}"),
        defaults={
            "doctor": doctor,
            "date": when,
            "weekday": when.weekday(),
            "start_time": start,
            "end_time": slot_end,
            "duration_minutes": 30,
            "status": AppointmentSlot.Status.BOOKED if status in {"booked", "confirmed"} else AppointmentSlot.Status.AVAILABLE,
            "block_reason": "",
            "is_development_data": True,
        },
    )
    appointment, created = Appointment.objects.update_or_create(
        development_key=key(f"appointment-{status}"),
        defaults={
            "doctor": doctor,
            "patient": patient,
            "slot": slot,
            "doctor_name": doctor.name,
            "patient_name": patient.name,
            "specialty_name": doctor.specialty.name,
            "date": when,
            "start_time": start,
            "end_time": slot_end,
            "fee": doctor.fee,
            "status": status,
            "payment_status": Appointment.PaymentStatus.PAID if paid else Appointment.PaymentStatus.PENDING,
            "diagnosis": "Seasonal allergy" if status == Appointment.Status.COMPLETED else "",
            "prescription_notes": "Continue routine care" if status == Appointment.Status.COMPLETED else "",
            "medicines": [{"name": "Sample medicine", "dose": "As directed"}] if status == Appointment.Status.COMPLETED else [],
            "completed_at": timezone.now() if status == Appointment.Status.COMPLETED else None,
            "is_development_data": True,
        },
    )
    if created:
        AppointmentTimeline.objects.create(
            appointment=appointment,
            action=status,
            actor="Development data",
            details={"seeded": True},
            development_key=key(f"timeline-{status}"),
            is_development_data=True,
        )
    CarePayment.objects.update_or_create(
        development_key=key(f"payment-{status}"),
        defaults={
            "appointment": appointment,
            "payout": None,
            "patient_id": patient.external_id,
            "doctor": doctor,
            "amount": doctor.fee,
            "kind": CarePayment.Kind.CONSULTATION,
            "status": CarePayment.Status.PAID if paid else CarePayment.Status.PENDING,
            "is_development_data": True,
        },
    )
    return appointment


class Command(BaseCommand):
    help = "Create an idempotent, SQL-backed and clearly labelled Module 05 demo dataset."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("CARE development data can only be seeded when DEBUG=True.")
        with transaction.atomic():
            specialties = {}
            specialty_values = (
                ("family-medicine", "Family Medicine", "stethoscope", "General primary care.", True),
                ("cardiology", "Cardiology", "heart-pulse", "Heart and circulatory health.", True),
                ("dermatology", "Dermatology", "sparkles", "Skin health and treatment.", True),
                ("pediatrics", "Pediatrics", "baby", "Child health.", False),
            )
            for slug, name, icon, description, active in specialty_values:
                specialty, _ = Specialty.objects.update_or_create(
                    name=name,
                    defaults={
                        "icon": icon,
                        "description": description,
                        "is_active": active,
                        "development_key": key(f"specialty-{slug}"),
                        "is_development_data": True,
                    },
                )
                specialties[slug] = specialty

            doctors = {}
            doctor_values = (
                ("asha", "DEV Dr. Asha Rao", "family-medicine", "Pune", "Development Clinic", 500, "Both", "verified", True, "MBBS, MD", "10 years"),
                ("kabir", "DEV Dr. Kabir Mehta", "cardiology", "Mumbai", "Demo Heart Centre", 850, "Online", "verified", False, "MBBS, DM", "12 years"),
                ("meera", "DEV Dr. Meera Shah", "dermatology", "Nagpur", "Demo Skin Clinic", 650, "In-person", "pending", True, "MBBS, DVD", "6 years"),
                ("arjun", "DEV Dr. Arjun Das", "family-medicine", "Nashik", "Demo Family Clinic", 400, "Both", "rejected", False, "MBBS", "3 years"),
            )
            for slug, name, specialty, city, hospital, fee, kind, verification, online, degree, experience in doctor_values:
                doctor, _ = Doctor.objects.update_or_create(
                    development_key=key(f"doctor-{slug}"),
                    defaults={
                        "name": name,
                        "specialty": specialties[specialty],
                        "photo": "",
                        "degree": degree,
                        "qualifications": f"{degree}; demo qualification",
                        "license_details": f"DEV-{slug.upper()}-LICENCE",
                        "experience": experience,
                        "hospital": hospital,
                        "city": city,
                        "fee": Decimal(fee),
                        "consultation_type": kind,
                        "available": online,
                        "bio": "Sample profile for Module 05 development and QA.",
                        "verification_status": verification,
                        "is_development_data": True,
                    },
                )
                doctors[slug] = doctor

            patients = {}
            for slug, name in (("one", "Ananya Kulkarni"), ("two", "Rohan Deshmukh")):
                patients[slug], _ = CarePatient.objects.update_or_create(
                    development_key=key(f"patient-{slug}"),
                    defaults={
                        "external_id": f"dev-admin-user-patient-{slug}",
                        "name": name,
                        "is_development_data": True,
                    },
                )

            schedules = (
                ("asha", 0, "09:00", "12:00", 30),
                ("kabir", 1, "10:00", "12:00", 20),
                ("meera", 2, "09:00", "12:00", 15),
                ("arjun", 3, "09:00", "12:00", 10),
                ("asha", 4, "13:00", "16:00", 30),
            )
            for slug, weekday, start, end, duration in schedules:
                WeeklySchedule.objects.update_or_create(
                    development_key=key(f"schedule-{slug}-{weekday}"),
                    defaults={
                        "doctor": doctors[slug],
                        "weekday": weekday,
                        "start_time": time.fromisoformat(start),
                        "end_time": time.fromisoformat(end),
                        "duration_minutes": duration,
                        "is_working": True,
                        "is_development_data": True,
                    },
                )

            leave_date = timezone.localdate() + timedelta(days=28)
            while leave_date.weekday() != 3:
                leave_date += timedelta(days=1)
            leave = DoctorLeave.objects.update_or_create(
                development_key=key("leave-arjun"),
                defaults={
                    "doctor": doctors["arjun"],
                    "date": leave_date,
                    "reason": "Development sample leave",
                    "is_development_data": True,
                },
            )[0]
            leave_slot_time = time(9, 0)
            slot_end = (datetime.combine(leave_date, leave_slot_time) + timedelta(minutes=10)).time()
            AppointmentSlot.objects.update_or_create(
                development_key=key("blocked-slot-leave"),
                defaults={
                    "doctor": doctors["arjun"],
                    "date": leave_date,
                    "weekday": leave_date.weekday(),
                    "start_time": leave_slot_time,
                    "end_time": slot_end,
                    "duration_minutes": 10,
                    "status": AppointmentSlot.Status.BLOCKED,
                    "block_reason": "leave",
                    "is_development_data": True,
                },
            )

            review_values = (
                ("approved-one", "asha", patients["one"], 5, "Kind and clear.", Review.ModerationStatus.APPROVED),
                ("approved-two", "asha", patients["two"], 4, "Helpful follow-up.", Review.ModerationStatus.APPROVED),
                ("hidden", "kabir", patients["one"], 2, "Development-only hidden sample.", Review.ModerationStatus.HIDDEN),
                ("pending", "meera", patients["two"], 5, "Development-only pending sample.", Review.ModerationStatus.PENDING),
            )
            for slug, doctor, patient, rating, comment, moderation in review_values:
                Review.objects.update_or_create(
                    development_key=key(f"review-{slug}"),
                    defaults={
                        "doctor": doctors[doctor],
                        "patient_id": patient.external_id,
                        "patient_name": patient.name,
                        "rating": rating,
                        "comment": comment,
                        "moderation_status": moderation,
                        "is_development_data": True,
                    },
                )

            booking_date = upcoming_weekday(0, min_days=2)
            confirmed_date = booking_date + timedelta(days=7)
            completed_date = previous_weekday(0)
            cancelled_date = booking_date + timedelta(days=14)
            no_show_date = completed_date - timedelta(days=7)
            appointments = [
                create_sample_appointment(doctors["asha"], patients["one"], booking_date, time(9, 0), Appointment.Status.BOOKED, False),
                create_sample_appointment(doctors["asha"], patients["two"], confirmed_date, time(9, 30), Appointment.Status.CONFIRMED, False),
                create_sample_appointment(doctors["asha"], patients["one"], completed_date, time(10, 0), Appointment.Status.COMPLETED, True),
                create_sample_appointment(doctors["asha"], patients["two"], cancelled_date, time(10, 0), Appointment.Status.CANCELLED, True),
                create_sample_appointment(doctors["asha"], patients["one"], no_show_date, time(10, 30), Appointment.Status.NO_SHOW, False),
            ]
            cancelled = appointments[3]
            cancelled_payment = cancelled.payment
            RefundRequest.objects.update_or_create(
                development_key=key("refund-cancelled-paid"),
                defaults={
                    "appointment": cancelled,
                    "payment": cancelled_payment,
                    "patient_id": cancelled_payment.patient_id,
                    "amount": cancelled_payment.amount,
                    "status": RefundRequest.Status.PENDING,
                    "is_development_data": True,
                },
            )
            cancelled.payment_status = Appointment.PaymentStatus.PAID
            cancelled.save(update_fields=["payment_status", "updated_at"])

            available_date = upcoming_weekday(4, min_days=1)
            try:
                generate_slots(doctors["asha"], available_date)
            except ValueError as error:
                raise CommandError(f"Unable to create sample available slots: {error}") from error

            online_consult, _ = InstantConsult.objects.update_or_create(
                development_key=key("consult-waiting-long"),
                defaults={
                    "patient_id": patients["one"].external_id,
                    "patient_name": patients["one"].name,
                    "doctor": None,
                    "doctor_name": "",
                    "status": InstantConsult.Status.WAITING,
                    "queue_position": 1,
                    "consultation_type": "Video",
                    "is_development_data": True,
                },
            )
            InstantConsult.objects.filter(pk=online_consult.pk).update(
                created_at=timezone.now() - timedelta(minutes=20)
            )
            completed_consult, _ = InstantConsult.objects.update_or_create(
                development_key=key("consult-completed-audio"),
                defaults={
                    "patient_id": patients["two"].external_id,
                    "patient_name": patients["two"].name,
                    "doctor": doctors["asha"],
                    "doctor_name": doctors["asha"].name,
                    "status": InstantConsult.Status.COMPLETED,
                    "queue_position": 0,
                    "consultation_type": "Audio",
                    "started_at": timezone.now() - timedelta(minutes=8),
                    "ended_at": timezone.now() - timedelta(minutes=2),
                    "duration_seconds": 360,
                    "is_development_data": True,
                },
            )
            CallLog.objects.update_or_create(
                development_key=key("call-completed-audio"),
                defaults={
                    "consult": completed_consult,
                    "doctor": doctors["asha"],
                    "doctor_name": doctors["asha"].name,
                    "patient_id": patients["two"].external_id,
                    "patient_name": patients["two"].name,
                    "start_time": completed_consult.started_at,
                    "end_time": completed_consult.ended_at,
                    "duration_seconds": completed_consult.duration_seconds,
                    "consultation_type": "Audio",
                    "is_development_data": True,
                },
            )

            CareSetting.objects.update_or_create(
                key="doctor_commission_percent",
                defaults={
                    "value": Decimal("15.00"),
                    "development_key": key("setting-commission"),
                    "is_development_data": True,
                },
            )
            period = completed_date.strftime("%Y-%m")
            pending_payout, _ = DoctorPayout.objects.update_or_create(
                development_key=key("payout-pending-asha"),
                defaults={
                    "doctor": doctors["asha"],
                    "doctor_name": doctors["asha"].name,
                    "period": period,
                    **calculate_payout(doctors["asha"], period),
                    "status": DoctorPayout.Status.PENDING,
                    "paid_at": None,
                    "is_development_data": True,
                },
            )
            paid_payout, _ = DoctorPayout.objects.update_or_create(
                development_key=key("payout-paid-kabir"),
                defaults={
                    "doctor": doctors["kabir"],
                    "doctor_name": doctors["kabir"].name,
                    "period": period,
                    "consultation_count": 3,
                    "gross_amount": Decimal("2550.00"),
                    "commission_percent": Decimal("15.00"),
                    "net_payable": Decimal("2167.50"),
                    "status": DoctorPayout.Status.PAID,
                    "paid_at": timezone.now() - timedelta(days=1),
                    "is_development_data": True,
                },
            )
            CarePayment.objects.update_or_create(
                development_key=key("payment-paid-payout-kabir"),
                defaults={
                    "appointment": None,
                    "payout": paid_payout,
                    "patient_id": "",
                    "doctor": doctors["kabir"],
                    "amount": paid_payout.net_payable,
                    "kind": CarePayment.Kind.DOCTOR_PAYOUT,
                    "status": CarePayment.Status.PAID,
                    "is_development_data": True,
                },
            )

            call_command("seed_health_records_development_data", verbosity=0)

            self.stdout.write(self.style.SUCCESS(
                f"CARE SQL demo data is ready: {len(doctors)} doctors, {len(specialties)} specialties, "
                f"{len(appointments)} appointments, 1 pending payout."
            ))
