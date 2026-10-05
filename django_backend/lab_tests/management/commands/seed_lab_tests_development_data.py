from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import CarePatient
from health_records.models import LabBooking
from providers.models import HealthcareProvider

from lab_tests.models import (
    HealthCheckBundle,
    LabTest,
    LabTestCategory,
    LabTestPackage,
    OrganProfileCategory,
    Phlebotomist,
    RadiologyService,
    ScanBooking,
)


def development_key(value):
    return f"dev-lab-tests-{value}"


def get_development_record(model, key, *, lookup, defaults):
    record = model.objects.filter(development_key=key).first()
    if record:
        return record
    return model.objects.filter(**lookup).first() or model.objects.create(
        development_key=key,
        is_development_data=True,
        **defaults,
    )


class Command(BaseCommand):
    help = "Seed idempotent fictional SQL development data for Lab Tests."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Lab Tests development data requires DEBUG=True.")

        with transaction.atomic():
            category_specs = (
                ("Core Diagnostics", "Routine blood and chemistry panels.", "core"),
                ("Preventive Health", "Fictional screening and wellness tests.", "preventive"),
                ("Imaging", "Radiology services at partner diagnostic centres.", "imaging"),
            )
            categories = {}
            for name, description, slug in category_specs:
                categories[slug] = get_development_record(
                    LabTestCategory,
                    development_key(f"category-{slug}"),
                    lookup={"name": name},
                    defaults={"name": name, "description": description, "is_active": True},
                )

            organ_category_specs = (
                ("Heart Health", "Cardiovascular and lipid profile tests.", "heart"),
                ("Metabolic Health", "Glucose and metabolic markers.", "metabolic"),
                ("Thyroid Profile", "Thyroid hormone tests.", "thyroid"),
                ("Diabetes", "Glucose and long-term blood sugar screening.", "diabetes"),
                ("Kidney", "Renal function and electrolyte screening.", "kidney"),
                ("Liver", "Liver enzyme and function screening.", "liver"),
                ("Women's Health", "Preventive tests relevant to women's health.", "womens-health"),
                ("Senior Citizen", "Preventive health screening for older adults.", "senior-citizen"),
            )
            organ_categories = {}
            for name, description, slug in organ_category_specs:
                organ_categories[slug] = get_development_record(
                    OrganProfileCategory,
                    development_key(f"organ-category-{slug}"),
                    lookup={"name": name},
                    defaults={"name": name, "description": description, "is_active": True},
                )

            test_specs = (
                {
                    "name": "Complete Blood Count",
                    "code": "LAB-CBC-001",
                    "specimen": "EDTA blood",
                    "fasting_required": False,
                    "turnaround_hours": 12,
                    "biomarker_count": 24,
                    "price": Decimal("480.00"),
                    "mrp": Decimal("600.00"),
                    "discount_percent": Decimal("20.00"),
                    "category_slugs": ("core", "preventive"),
                    "organ_category_slugs": ("heart", "senior-citizen"),
                },
                {
                    "name": "Comprehensive Metabolic Panel",
                    "code": "LAB-CMP-014",
                    "specimen": "Serum",
                    "fasting_required": True,
                    "turnaround_hours": 24,
                    "biomarker_count": 14,
                    "price": Decimal("760.00"),
                    "mrp": Decimal("950.00"),
                    "discount_percent": Decimal("20.00"),
                    "category_slugs": ("core", "preventive"),
                    "organ_category_slugs": ("metabolic", "diabetes", "kidney", "liver"),
                },
                {
                    "name": "Thyroid Profile",
                    "code": "LAB-THY-006",
                    "specimen": "Serum",
                    "fasting_required": False,
                    "turnaround_hours": 24,
                    "biomarker_count": 3,
                    "price": Decimal("620.00"),
                    "mrp": Decimal("775.00"),
                    "discount_percent": Decimal("20.00"),
                    "category_slugs": ("core", "preventive"),
                    "organ_category_slugs": ("thyroid", "womens-health"),
                },
            )
            tests = {}
            for item in test_specs:
                defaults = {
                    key: value
                    for key, value in item.items()
                    if key not in {"category_slugs", "organ_category_slugs"}
                }
                test = get_development_record(
                    LabTest,
                    development_key(f"test-{item['code'].lower()}"),
                    lookup={"code": item["code"]},
                    defaults={**defaults, "is_active": True},
                )
                for field, value in defaults.items():
                    setattr(test, field, value)
                test.save()
                test.categories.set(
                    categories[slug] for slug in item["category_slugs"]
                )
                test.organ_categories.set(
                    organ_categories[slug]
                    for slug in item["organ_category_slugs"]
                )
                tests[item["code"]] = test

            package = get_development_record(
                LabTestPackage,
                development_key("package-wellness"),
                lookup={"name": "Everyday Wellness Panel"},
                defaults={
                    "name": "Everyday Wellness Panel",
                    "description": "A fictional preventive panel for development use.",
                    "price": Decimal("1490.00"),
                    "badge": LabTestPackage.Badge.BEST_VALUE,
                    "discount_percent": Decimal("15.00"),
                    "turnaround_hours": 36,
                    "is_active": True,
                },
            )
            package.badge = LabTestPackage.Badge.BEST_VALUE
            package.discount_percent = Decimal("15.00")
            package.turnaround_hours = 36
            package.save(update_fields=["badge", "discount_percent", "turnaround_hours"])
            package.tests.set(
                (tests["LAB-CBC-001"], tests["LAB-CMP-014"], tests["LAB-THY-006"])
            )

            health_check = get_development_record(
                HealthCheckBundle,
                development_key("health-check-heart"),
                lookup={"name": "Heart Health Check"},
                defaults={
                    "name": "Heart Health Check",
                    "description": "Fictional preventive panel for cardiovascular risk screening.",
                    "recommended_target": "Adults 35+ or people with cardiovascular risk factors",
                    "price": Decimal("1180.00"),
                    "is_active": True,
                },
            )
            health_check.tests.set(
                (tests["LAB-CBC-001"], tests["LAB-CMP-014"])
            )

            centre = HealthcareProvider.objects.filter(
                provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
                status=HealthcareProvider.Status.ACTIVE,
                is_development_data=True,
                development_key__startswith="dev-",
            ).order_by("name").first()
            if centre is None:
                centre, _ = HealthcareProvider.objects.get_or_create(
                    development_key=development_key("centre-northstar"),
                    defaults={
                        "is_development_data": True,
                        "name": "Northstar Diagnostics",
                        "provider_type": HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
                        "status": HealthcareProvider.Status.ACTIVE,
                        "city": "Pune",
                        "state": "Maharashtra",
                        "address": "48 Aundh Road, Pune",
                        "phone": "+91-20-4100-2211",
                        "email": "care@northstar.example.test",
                    },
                )
            for test in tests.values():
                if test.centre_id is None:
                    test.centre = centre
                    test.save(update_fields=["centre"])

            radiology = get_development_record(
                RadiologyService,
                development_key("radiology-chest-xray"),
                lookup={"name": "Chest X-ray (PA)", "centre": centre},
                defaults={
                    "name": "Chest X-ray (PA)",
                    "centre": centre,
                    "modality": "X-ray",
                    "description": "Fictional development radiology service.",
                    "price": Decimal("650.00"),
                    "turnaround_hours": 6,
                    "is_active": True,
                },
            )

            phlebotomists = []
            for name, email, phone, slug in (
                ("Maya Nair", "maya.nair@northstar.example.test", "+91-90000-41021", "maya"),
                ("Arjun Mehta", "arjun.mehta@northstar.example.test", "+91-90000-41022", "arjun"),
            ):
                phlebotomists.append(
                    get_development_record(
                        Phlebotomist,
                        development_key(f"phlebotomist-{slug}"),
                        lookup={"email": email},
                        defaults={
                            "name": name,
                            "email": email,
                            "phone": phone,
                            "is_active": True,
                            "is_available": True,
                        },
                    )
                )

            patient = CarePatient.objects.filter(
                development_key=development_key("patient-aarav")
            ).first()
            if patient is None:
                patient = CarePatient.objects.create(
                    name="Aarav Kulkarni",
                    external_id="dev-lab-patient-aarav",
                    development_key=development_key("patient-aarav"),
                    is_development_data=True,
                )
            sample_booking, _ = LabBooking.objects.get_or_create(
                development_key=development_key("sample-booking"),
                defaults={
                    "patient": patient,
                    "test_name": package.name,
                    "lab_package": package,
                    "centre": centre,
                    "scheduled_at": timezone.now() + timedelta(days=2),
                    "address": "18 Baner Road, Pune",
                    "time_slot": "08:00-10:00",
                    "specimen_date": timezone.localdate() + timedelta(days=2),
                    "status": LabBooking.Status.BOOKED,
                },
            )
            booking_updates = []
            if not sample_booking.address:
                sample_booking.address = "18 Baner Road, Pune"
                booking_updates.append("address")
            if not sample_booking.time_slot:
                sample_booking.time_slot = "08:00-10:00"
                booking_updates.append("time_slot")
            if booking_updates:
                sample_booking.save(update_fields=booking_updates)
            sample_booking.lab_tests.set(
                (tests["LAB-CBC-001"], tests["LAB-CMP-014"], tests["LAB-THY-006"])
            )
            sample_booking.lab_packages.set((package,))

            ScanBooking.objects.get_or_create(
                development_key=development_key("sample-scan-booking"),
                defaults={
                    "patient": patient,
                    "centre": centre,
                    "radiology_service": radiology,
                    "scheduled_at": timezone.now() + timedelta(days=4),
                    "notes": "Bring prior chest imaging if available.",
                    "status": ScanBooking.Status.BOOKED,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Lab Tests development data is ready "
                f"({len(tests)} tests, {len(categories)} categories, 1 package, "
                f"1 health check, {len(organ_categories)} organ categories, "
                f"{len(phlebotomists)} phlebotomists)."
            )
        )
