from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from marketing.models import (
    Coupon,
    FeaturedPromotion,
    Promotion,
    PromotionalContent,
)
from providers.models import HealthcareProvider


PROVIDERS = (
    {
        "name": "DEV Seed Hospital",
        "provider_type": HealthcareProvider.ProviderType.HOSPITAL,
        "registration_number": "DEV-SEED-HOSPITAL-001",
        "status": HealthcareProvider.Status.PENDING,
    },
    {
        "name": "DEV Seed Clinic",
        "provider_type": HealthcareProvider.ProviderType.CLINIC,
        "registration_number": "DEV-SEED-CLINIC-001",
        "status": HealthcareProvider.Status.ACTIVE,
    },
    {
        "name": "DEV Seed Diagnostic Centre",
        "provider_type": HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
        "registration_number": "DEV-SEED-DIAGNOSTIC-001",
        "status": HealthcareProvider.Status.PENDING,
    },
    {
        "name": "DEV Seed Pharmacy",
        "provider_type": HealthcareProvider.ProviderType.PHARMACY,
        "registration_number": "DEV-SEED-PHARMACY-001",
        "status": HealthcareProvider.Status.ACTIVE,
    },
)


class Command(BaseCommand):
    help = "Idempotently seed clearly labelled Dashboard development data."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Dashboard development data can only be seeded when DEBUG=True."
            )

        now = timezone.now()
        for values in PROVIDERS:
            registration_number = values["registration_number"]
            defaults = {
                **values,
                "phone": "9876543210",
                "email": f"{registration_number.lower()}@example.test",
                "city": "Development",
                "state": "Development",
                "pincode": "000000",
                "type_details": {"development_seed": True},
            }
            provider, created = HealthcareProvider.objects.get_or_create(
                registration_number=registration_number,
                defaults=defaults,
            )
            if not created:
                for field, value in defaults.items():
                    setattr(provider, field, value)
                provider.save()

        coupon_specs = (
            {
                "code": "DEV-HEALTH-10",
                "discount_type": "percentage",
                "discount_value": Decimal("10.00"),
                "maximum_discount": Decimal("250.00"),
                "applies_to": "all",
            },
            {
                "code": "DEV-PHARMACY-50",
                "discount_type": "flat",
                "discount_value": Decimal("50.00"),
                "maximum_discount": None,
                "applies_to": "pharmacy",
            },
        )
        for spec in coupon_specs:
            defaults = {
                **spec,
                "minimum_order_amount": Decimal("100.00"),
                "start_date": now - timedelta(days=1),
                "expiry_date": now + timedelta(days=365),
                "usage_limit": None,
                "per_user_limit": 1,
                "usage_count": 0,
                "is_active": True,
            }
            coupon, created = Coupon.objects.get_or_create(
                code=spec["code"],
                defaults=defaults,
            )
            if not created:
                for field, value in defaults.items():
                    setattr(coupon, field, value)
                coupon.save()

        promotion, created = Promotion.objects.get_or_create(
            title="DEV Seed Seasonal Offer",
            defaults={
                "description": "Development-only sample promotion.",
                "cta_text": "Explore offer",
                "cta_link": "/offers",
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=30),
                "is_active": True,
            },
        )
        if not created:
            promotion.start_date = now - timedelta(days=1)
            promotion.end_date = now + timedelta(days=30)
            promotion.is_active = True
            promotion.save()

        FeaturedPromotion.objects.get_or_create(
            title="DEV Seed Featured Offer",
            defaults={
                "badge_text": "Development",
                "description": "Development-only featured offer.",
                "link": "/offers",
                "is_active": True,
                "display_order": 999,
            },
        )
        PromotionalContent.objects.get_or_create(
            title="DEV Seed Pharmacy Offer",
            defaults={
                "description": "Development-only pharmacy offer.",
                "link": "/pharmacy",
                "placement": "pharmacy",
                "content_type": "offer_strip",
                "is_active": True,
                "display_order": 999,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Dashboard development data is ready "
                "(4 providers, 2 coupons, and sample offers)."
            )
        )
