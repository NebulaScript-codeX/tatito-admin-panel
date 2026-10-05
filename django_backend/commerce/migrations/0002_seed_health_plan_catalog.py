from decimal import Decimal

from django.db import migrations


PLANS = [
    {
        "code": "starter",
        "name": "Tatito Starter",
        "monthly_price": Decimal("12.00"),
        "annual_monthly_price": Decimal("9.00"),
        "badge": "ESSENTIAL CARE",
        "tagline": "Ideal for individuals seeking everyday wellness & quick GP visits.",
        "color": "teal",
        "features": [
            "2 Free Doctor Consultations / month",
            "15% Off All Pharmacy Orders",
            "10% Discount on Lab Tests & Diagnostics",
            "Digital Encrypted Health Vault (HIPAA)",
            "Standard Email & Chat Support",
        ],
        "exclusions": [
            "Free Home Sample Collection",
            "Annual Full Body Health Checkup",
            "Dedicated Family Care Manager",
            "Free Emergency Ambulance Service",
        ],
    },
    {
        "code": "family",
        "name": "Tatito Family Care",
        "monthly_price": Decimal("29.00"),
        "annual_monthly_price": Decimal("22.00"),
        "badge": "MOST POPULAR",
        "tagline": "Complete medical protection for up to 4 family members.",
        "color": "coral",
        "features": [
            "Up to 4 Family Members Included",
            "6 Free Doctor Consultations / month",
            "25% Off All Pharmacy Orders + Free Express Delivery",
            "25% Discount on All Lab Tests",
            "1 Free Full Body Health Checkup / year",
            "24/7 Priority Telehealth Helpline",
            "Free Home Sample Collection",
        ],
        "exclusions": [
            "Dedicated Personal Doctor",
            "100% Covered Emergency Ambulance",
        ],
    },
    {
        "code": "executive",
        "name": "Tatito Executive Gold",
        "monthly_price": Decimal("59.00"),
        "annual_monthly_price": Decimal("44.00"),
        "badge": "PREMIUM HEALTH",
        "tagline": "Comprehensive coverage for high-performing professionals & seniors.",
        "color": "gold",
        "features": [
            "Unlimited 24/7 Online Video Consultations",
            "35% Off All Pharmacy Orders & Medical Devices",
            "35% Off All Lab Tests & Radiology Scans",
            "2 Free Executive Health Packages / year",
            "Dedicated Personal Care Manager",
            "Free Doorstep Sample Collection 24/7",
            "Priority Appointment Booking (< 2 hrs)",
        ],
        "exclusions": ["Global Specialist Second Opinion"],
    },
    {
        "code": "vip",
        "name": "Tatito VIP Concierge",
        "monthly_price": Decimal("99.00"),
        "annual_monthly_price": Decimal("79.00"),
        "badge": "ULTIMATE VIP CARE",
        "tagline": "White-glove concierge healthcare & emergency coverage for the entire family.",
        "color": "navy",
        "features": [
            "Unlimited Consultations for Entire Household",
            "50% Off Pharmacy & Free Same-Day Express Delivery",
            "Free Annual Comprehensive Health & Genome Screening",
            "Dedicated Named Personal Doctor & Care Team",
            "100% Covered Emergency Ambulance Dispatch",
            "Global Specialist 2nd Opinion Concierge",
            "Zero Co-pay Specialist Visits & Direct Hospital Desk",
        ],
        "exclusions": [],
    },
]


def seed_plans(apps, schema_editor):
    HealthPlan = apps.get_model("commerce", "HealthPlan")
    for data in PLANS:
        HealthPlan.objects.using(schema_editor.connection.alias).update_or_create(
            code=data["code"],
            defaults={
                **data,
                "is_active": True,
                "is_development_data": False,
            },
        )


def unseed_plans(apps, schema_editor):
    HealthPlan = apps.get_model("commerce", "HealthPlan")
    HealthPlan.objects.using(schema_editor.connection.alias).filter(
        code__in=[plan["code"] for plan in PLANS],
        orders__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("commerce", "0001_initial")]

    operations = [migrations.RunPython(seed_plans, unseed_plans)]
