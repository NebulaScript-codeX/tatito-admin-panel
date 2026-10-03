from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from audit.models import AuditLog
from dashboard.models import PlatformDoctor, PlatformReview, PlatformUser


USERS = (
    {
        "development_key": "dev-admin-user-patient-one",
        "id": "dev-admin-user-patient-one",
        "name": "DEV Sample Patient",
        "email": "patient-one@example.test",
        "role": PlatformUser.Role.PATIENT,
        "status": "active",
        "is_active": True,
        "is_blocked": False,
        "city": "Development",
        "password_hash": "",
    },
    {
        "development_key": "dev-admin-user-patient-two",
        "id": "dev-admin-user-patient-two",
        "name": "DEV Sample Patient Two",
        "email": "patient-two@example.test",
        "role": PlatformUser.Role.PATIENT,
        "status": "active",
        "is_active": True,
        "is_blocked": False,
        "city": "Development",
        "password_hash": "",
    },
    {
        "development_key": "dev-admin-user-doctor-one",
        "id": "dev-admin-user-doctor-one",
        "name": "DEV Sample Doctor",
        "email": "doctor-one@example.test",
        "role": PlatformUser.Role.DOCTOR,
        "status": "pending",
        "verification_status": "pending",
        "is_active": True,
        "is_blocked": False,
        "city": "Development",
        "password_hash": "",
    },
)

DOCTORS = (
    {
        "development_key": "dev-admin-doctor-one",
        "id": "dev-admin-doctor-one",
        "name": "DEV Sample Doctor",
        "specialty": "Cardiology",
        "city": "Development",
        "location": "Development Clinic",
        "fee": Decimal("500.00"),
        "verification_status": "pending",
        "verified": False,
    },
    {
        "development_key": "dev-admin-doctor-two",
        "id": "dev-admin-doctor-two",
        "name": "DEV Sample Doctor Two",
        "specialty": "Dermatology",
        "city": "Development",
        "location": "Development Clinic",
        "fee": Decimal("650.00"),
        "verification_status": "verified",
        "verified": True,
    },
)


class Command(BaseCommand):
    help = "Seed clearly fictional SQL development users, doctors, reviews, and audit activity."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Admin development data can only be seeded when DEBUG=True.")

        doctors = {}
        for values in DOCTORS:
            key = values["development_key"]
            doctor, _ = PlatformDoctor.objects.update_or_create(
                development_key=key,
                defaults={
                    **values,
                    "is_development_data": True,
                    "available": True,
                    "consultation_type": "Both",
                },
            )
            doctors[key] = doctor

        users = {}
        for values in USERS:
            key = values["development_key"]
            defaults = {
                **values,
                "is_development_data": True,
                "availability": "available",
                "wallet_balance": Decimal("250.00") if values["role"] == "patient" else Decimal("0.00"),
                "wallet_transactions": [],
                "family_members": [],
                "addresses": [],
            }
            if values["role"] == PlatformUser.Role.DOCTOR:
                defaults["doctor"] = doctors["dev-admin-doctor-one"]
            user, _ = PlatformUser.objects.update_or_create(
                development_key=key,
                defaults=defaults,
            )
            users[key] = user

        doctors["dev-admin-doctor-one"].owner = users["dev-admin-user-doctor-one"]
        doctors["dev-admin-doctor-one"].save(update_fields=["owner"])

        for key, doctor, rating in (
            ("dev-admin-review-one", doctors["dev-admin-doctor-one"], 5),
            ("dev-admin-review-two", doctors["dev-admin-doctor-two"], 4),
        ):
            PlatformReview.objects.update_or_create(
                development_key=key,
                defaults={
                    "id": key,
                    "doctor": doctor,
                    "patient_id": "",
                    "patient_name": "DEV Sample Patient",
                    "rating": rating,
                    "comment": "Fictional development review.",
                    "is_seed": True,
                    "moderation_status": "approved",
                    "created_at": timezone.now(),
                    "is_development_data": True,
                },
            )

        AuditLog.objects.update_or_create(
            development_key="dev-admin-audit-dashboard-sample",
            defaults={
                "is_development_data": True,
                "actor": None,
                "actor_username": "Development Admin",
                "actor_role": "Super Admin",
                "action": "view",
                "module": "dashboard",
                "target_type": "development_sample",
                "target_id": "",
                "description": "Development sample activity.",
                "metadata": {},
                "ip_address": None,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Admin SQL development data is ready (3 users, 2 doctors, "
                "2 reviews, and sample admin activity)."
            )
        )
