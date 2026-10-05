from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import CarePatient
from dashboard.models import PlatformUser
from health_records.models import PrescriptionUpload
from providers.models import HealthcareProvider

from pharmacy.models import (
    PharmacyBatch,
    PharmacyBrand,
    PharmacyCategory,
    PharmacyDeliveryAssignment,
    PharmacyInventoryAdjustment,
    PharmacyOrder,
    PharmacyOrderBatchAllocation,
    PharmacyOrderLine,
    PharmacyProduct,
)


def key(value):
    return f"dev-pharmacy-{value}"


def get_or_create_development_name(model, *, name, development_key, defaults):
    instance = model.objects.filter(development_key=development_key).first()
    if instance:
        return instance
    instance = model.objects.filter(name=name).first()
    if instance:
        return instance
    return model.objects.create(
        name=name,
        development_key=development_key,
        is_development_data=True,
        **defaults,
    )


class Command(BaseCommand):
    help = "Create idempotent, fictional SQL development data for Pharmacy."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Pharmacy development data can only be seeded when DEBUG=True.")

        with transaction.atomic():
            patient = CarePatient.objects.filter(
                development_key="dev-care-patient-one"
            ).first() or CarePatient.objects.order_by("name").first()
            if patient is None:
                patient = CarePatient.objects.create(
                    name="DEV Sample Patient",
                    external_id="",
                    development_key=key("patient"),
                    is_development_data=True,
                )

            category_values = (
                ("Daily Wellness", "vitamins", "Fictional development wellness products."),
                ("Diabetes Care", "diabetes", "Fictional development glucose-care products."),
                ("First Aid", "first-aid", "Fictional development first-aid products."),
            )
            categories = {
                slug: get_or_create_development_name(
                    PharmacyCategory,
                    name=name,
                    development_key=key(f"category-{slug}"),
                    defaults={"description": description, "is_active": True},
                )
                for name, slug, description in category_values
            }

            brand_values = (
                ("DEV TatitoCare", "tatitocare", "Development"),
                ("DEV Generic Health", "generic-health", "Development"),
            )
            brands = {
                slug: get_or_create_development_name(
                    PharmacyBrand,
                    name=name,
                    development_key=key(f"brand-{slug}"),
                    defaults={"country": country, "is_active": True},
                )
                for name, slug, country in brand_values
            }

            partner = HealthcareProvider.objects.filter(
                provider_type=HealthcareProvider.ProviderType.PHARMACY,
                status=HealthcareProvider.Status.ACTIVE,
            ).order_by("name").first()
            if partner is None:
                partner = HealthcareProvider.objects.filter(
                    development_key=key("pharmacy-partner")
                ).first()
                if partner is None:
                    partner = HealthcareProvider.objects.create(
                        name="DEV Pharmacy Partner",
                        provider_type=HealthcareProvider.ProviderType.PHARMACY,
                        email="dev-pharmacy@example.test",
                        city="Development",
                        state="Development",
                        status=HealthcareProvider.Status.ACTIVE,
                        development_key=key("pharmacy-partner"),
                        is_development_data=True,
                    )

            delivery_patients = [patient]
            delivery_patient_names = {patient.name}
            for existing_patient in CarePatient.objects.exclude(
                pk=patient.pk
            ).order_by("name", "pk"):
                if existing_patient.name not in delivery_patient_names:
                    delivery_patients.append(existing_patient)
                    delivery_patient_names.add(existing_patient.name)
                if len(delivery_patients) == 3:
                    break
            for name, slug in (
                ("DEV Dispatch Customer North", "delivery-customer-north"),
                ("DEV Dispatch Customer South", "delivery-customer-south"),
            ):
                if len(delivery_patients) == 3:
                    break
                customer = CarePatient.objects.filter(
                    development_key=key(slug)
                ).first()
                if customer is None:
                    customer = CarePatient.objects.filter(name=name).first()
                if customer is None:
                    customer = CarePatient.objects.create(
                        name=name,
                        external_id="",
                        development_key=key(slug),
                        is_development_data=True,
                    )
                if customer.name not in delivery_patient_names:
                    delivery_patients.append(customer)
                    delivery_patient_names.add(customer.name)

            delivery_partners = list(
                PlatformUser.objects.filter(
                    role=PlatformUser.Role.PARTNER,
                    is_active=True,
                    is_blocked=False,
                ).order_by("name", "id")
            )
            if not delivery_partners:
                primary_delivery_partner, _ = PlatformUser.objects.update_or_create(
                    development_key=key("delivery-partner"),
                    defaults={
                        "id": key("delivery-partner"),
                        "name": "DEV Central Delivery Partner",
                        "email": "dev-delivery-partner@example.test",
                        "role": PlatformUser.Role.PARTNER,
                        "status": "active",
                        "is_active": True,
                        "is_blocked": False,
                        "city": "Development",
                        "password_hash": "",
                        "partner_role": "Delivery Partner",
                        "availability": "available",
                        "wallet_balance": Decimal("0.00"),
                        "wallet_transactions": [],
                        "family_members": [],
                        "addresses": [],
                        "is_development_data": True,
                    },
                )
                delivery_partners.append(primary_delivery_partner)
            if len(delivery_partners) < 2:
                second_delivery_partner, _ = PlatformUser.objects.update_or_create(
                    development_key=key("delivery-partner-two"),
                    defaults={
                        "id": key("delivery-partner-two"),
                        "name": "DEV Lakeside Delivery Partner",
                        "email": "dev-delivery-partner-two@example.test",
                        "role": PlatformUser.Role.PARTNER,
                        "status": "active",
                        "is_active": True,
                        "is_blocked": False,
                        "city": "Development",
                        "password_hash": "",
                        "partner_role": "Delivery Partner",
                        "availability": "available",
                        "wallet_balance": Decimal("0.00"),
                        "wallet_transactions": [],
                        "family_members": [],
                        "addresses": [],
                        "is_development_data": True,
                    },
                )
                delivery_partners.append(second_delivery_partner)

            product_values = (
                {
                    "slug": "vitamin-d3",
                    "name": "DEV Vitamin D3 1000 IU",
                    "category": "vitamins",
                    "brand": "tatitocare",
                    "pack_size": "30 tablets",
                    "mrp": Decimal("15.00"),
                    "discount_percent": Decimal("10.00"),
                    "low_stock_threshold": 8,
                    "rx_required": False,
                    "description": "Fictional development catalog product.",
                },
                {
                    "slug": "metformin",
                    "name": "DEV Metformin 500 mg",
                    "category": "diabetes",
                    "brand": "generic-health",
                    "pack_size": "30 tablets",
                    "mrp": Decimal("12.00"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 5,
                    "rx_required": True,
                    "description": "Fictional Rx-required development catalog product.",
                },
                {
                    "slug": "first-aid",
                    "name": "DEV First Aid Dressing Pack",
                    "category": "first-aid",
                    "brand": "generic-health",
                    "pack_size": "1 pack",
                    "mrp": Decimal("8.00"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 5,
                    "rx_required": False,
                    "description": "Fictional development catalog product.",
                },
                {
                    "slug": "vitamin-c",
                    "name": "DEV Vitamin C 500 mg",
                    "category": "vitamins",
                    "brand": "tatitocare",
                    "pack_size": "30 tablets",
                    "mrp": Decimal("9.50"),
                    "discount_percent": Decimal("5.00"),
                    "low_stock_threshold": 8,
                    "rx_required": False,
                    "description": "Fictional development vitamin supplement.",
                },
                {
                    "slug": "zinc",
                    "name": "DEV Zinc 20 mg",
                    "category": "vitamins",
                    "brand": "generic-health",
                    "pack_size": "30 tablets",
                    "mrp": Decimal("7.25"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 6,
                    "rx_required": False,
                    "description": "Fictional development mineral supplement.",
                },
                {
                    "slug": "electrolyte",
                    "name": "DEV Oral Rehydration Salts",
                    "category": "first-aid",
                    "brand": "generic-health",
                    "pack_size": "5 sachets",
                    "mrp": Decimal("5.00"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 10,
                    "rx_required": False,
                    "description": "Fictional development electrolyte product.",
                },
                {
                    "slug": "calcium",
                    "name": "DEV Calcium Plus D3",
                    "category": "vitamins",
                    "brand": "tatitocare",
                    "pack_size": "30 tablets",
                    "mrp": Decimal("11.00"),
                    "discount_percent": Decimal("8.00"),
                    "low_stock_threshold": 6,
                    "rx_required": False,
                    "description": "Fictional development calcium supplement.",
                },
                {
                    "slug": "glucose-strips",
                    "name": "DEV Glucose Test Strips",
                    "category": "diabetes",
                    "brand": "generic-health",
                    "pack_size": "25 strips",
                    "mrp": Decimal("18.00"),
                    "discount_percent": Decimal("5.00"),
                    "low_stock_threshold": 4,
                    "rx_required": False,
                    "description": "Fictional development glucose-monitoring supply.",
                },
                {
                    "slug": "cotton-roll",
                    "name": "DEV Sterile Cotton Roll",
                    "category": "first-aid",
                    "brand": "generic-health",
                    "pack_size": "100 g",
                    "mrp": Decimal("4.50"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 7,
                    "rx_required": False,
                    "description": "Fictional development first-aid supply.",
                },
                {
                    "slug": "adhesive-bandages",
                    "name": "DEV Adhesive Bandages",
                    "category": "first-aid",
                    "brand": "tatitocare",
                    "pack_size": "20 strips",
                    "mrp": Decimal("6.00"),
                    "discount_percent": Decimal("10.00"),
                    "low_stock_threshold": 8,
                    "rx_required": False,
                    "description": "Fictional development first-aid supply.",
                },
                {
                    "slug": "antiseptic",
                    "name": "DEV Antiseptic Solution",
                    "category": "first-aid",
                    "brand": "generic-health",
                    "pack_size": "100 ml",
                    "mrp": Decimal("8.50"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 5,
                    "rx_required": False,
                    "description": "Fictional development first-aid product.",
                },
                {
                    "slug": "hand-sanitizer",
                    "name": "DEV Hand Sanitizer",
                    "category": "first-aid",
                    "brand": "tatitocare",
                    "pack_size": "100 ml",
                    "mrp": Decimal("3.75"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 8,
                    "rx_required": False,
                    "description": "Fictional development hygiene product.",
                },
                {
                    "slug": "omega-3",
                    "name": "DEV Omega-3 Softgels",
                    "category": "vitamins",
                    "brand": "tatitocare",
                    "pack_size": "30 softgels",
                    "mrp": Decimal("16.00"),
                    "discount_percent": Decimal("12.50"),
                    "low_stock_threshold": 4,
                    "rx_required": False,
                    "description": "Fictional development wellness supplement.",
                },
                {
                    "slug": "thermometer",
                    "name": "DEV Digital Thermometer",
                    "category": "first-aid",
                    "brand": "generic-health",
                    "pack_size": "1 device",
                    "mrp": Decimal("14.00"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 3,
                    "rx_required": False,
                    "description": "Fictional development health-monitoring device.",
                },
                {
                    "slug": "lancets",
                    "name": "DEV Safety Lancets",
                    "category": "diabetes",
                    "brand": "generic-health",
                    "pack_size": "25 lancets",
                    "mrp": Decimal("6.75"),
                    "discount_percent": Decimal("0.00"),
                    "low_stock_threshold": 5,
                    "rx_required": False,
                    "description": "Fictional development glucose-monitoring supply.",
                },
            )
            products = {}
            for values in product_values:
                slug = values["slug"]
                product, _ = PharmacyProduct.objects.update_or_create(
                    development_key=key(f"product-{slug}"),
                    defaults={
                        **{
                            field: value
                            for field, value in values.items()
                            if field != "slug"
                        },
                        "category": categories[values["category"]],
                        "brand": brands[values["brand"]],
                        "partner_pharmacy": partner,
                        "image_url": "",
                        "is_active": True,
                        "is_development_data": True,
                    },
                )
                products[slug] = product

            batches = {}
            batch_specs = [
                ("vitamin-d3", "DEV-VITD3-01", 300, 32),
                ("metformin", "DEV-MET-01", 300, 18),
                ("first-aid", "DEV-FIRST-AID-01", 30, 3),
            ] + [
                (values["slug"], f"DEV-{values['slug'].upper()}-01", 240, 24)
                for values in product_values
                if values["slug"] not in {"vitamin-d3", "metformin", "first-aid"}
            ]
            batch_base_quantities = {
                slug: quantity
                for slug, _batch_number, _expiry_days, quantity in batch_specs
            }
            for slug, batch_number, expiry_days, quantity in batch_specs:
                batches[slug], _ = PharmacyBatch.objects.update_or_create(
                    development_key=key(f"batch-{slug}"),
                    defaults={
                        "product": products[slug],
                        "batch_number": batch_number,
                        "expiry_date": timezone.localdate() + timedelta(days=expiry_days),
                        "quantity": quantity,
                        "is_development_data": True,
                    },
                )

            prescription, _ = PrescriptionUpload.objects.update_or_create(
                development_key=key("prescription-pending"),
                defaults={
                    "patient": patient,
                    "prescription_number": "DEV-PHARMACY-RX-001",
                    "doctor_name": "DEV Sample Doctor",
                    "diagnosis": "Fictional development diagnosis.",
                    "medicines": [{"name": products["metformin"].name, "dose": "As directed"}],
                    "instructions": "Fictional development prescription; not for clinical use.",
                    "issued_on": timezone.localdate(),
                    "status": PrescriptionUpload.Status.PENDING,
                    "pdf_url": "",
                    "internal_notes": "",
                    "rejection_reason": "",
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "is_development_data": True,
                },
            )
            if not prescription.file:
                fixture = (
                    Path(__file__).resolve().parents[2]
                    / "fixtures"
                    / "development"
                    / "sample-prescription.svg"
                )
                with fixture.open("rb") as source:
                    prescription.file.save(
                        "dev-sample-prescription.svg", File(source), save=True
                    )

            order, created = PharmacyOrder.objects.get_or_create(
                development_key=key("order-placed"),
                defaults={
                    "patient": patient,
                    "address": "Development address; not a real delivery location.",
                    "payment_method": PharmacyOrder.PaymentMethod.CASH_ON_DELIVERY,
                    "payment_status": PharmacyOrder.PaymentStatus.PENDING,
                    "status": PharmacyOrder.Status.PLACED,
                    "subtotal": Decimal("30.00"),
                    "product_discount": Decimal("3.00"),
                    "coupon_discount": Decimal("0.00"),
                    "delivery_fee": Decimal("0.00"),
                    "tax": Decimal("0.00"),
                    "total": Decimal("27.00"),
                    "is_development_data": True,
                },
            )
            if created:
                PharmacyOrderLine.objects.create(
                    order=order,
                    product=products["vitamin-d3"],
                    product_name=products["vitamin-d3"].name,
                    quantity=2,
                    unit_mrp=Decimal("15.00"),
                    unit_price=Decimal("13.50"),
                    line_subtotal=Decimal("30.00"),
                    line_discount=Decimal("3.00"),
                    line_total=Decimal("27.00"),
                    development_key=key("order-line-placed-vitamin-d3"),
                    is_development_data=True,
                )

            dispatch_fixtures = (
                {
                    "slug": "assigned",
                    "product_slug": "vitamin-d3",
                    "patient": delivery_patients[0],
                    "product": products["vitamin-d3"],
                    "batch": batches["vitamin-d3"],
                    "address": "14 Cedar Lane, North Development District",
                    "order_status": PharmacyOrder.Status.PACKED,
                    "delivery_status": PharmacyDeliveryAssignment.Status.ASSIGNED,
                    "partner": delivery_partners[0],
                    "created_days_ago": 1,
                    "eta_delta": timedelta(hours=8),
                },
                {
                    "slug": "in-transit",
                    "product_slug": "first-aid",
                    "patient": delivery_patients[1],
                    "product": products["first-aid"],
                    "batch": batches["first-aid"],
                    "address": "Unit 3, Market Street, South Development District",
                    "order_status": PharmacyOrder.Status.DISPATCHED,
                    "delivery_status": PharmacyDeliveryAssignment.Status.OUT_FOR_DELIVERY,
                    "partner": delivery_partners[-1],
                    "created_days_ago": 2,
                    "eta_delta": timedelta(hours=2),
                },
                {
                    "slug": "delivered",
                    "product_slug": "vitamin-d3",
                    "patient": delivery_patients[2],
                    "product": products["vitamin-d3"],
                    "batch": batches["vitamin-d3"],
                    "address": "27 Riverwalk Avenue, East Development District",
                    "order_status": PharmacyOrder.Status.DELIVERED,
                    "delivery_status": PharmacyDeliveryAssignment.Status.DELIVERED,
                    "partner": delivery_partners[0],
                    "created_days_ago": 4,
                    "eta_delta": timedelta(days=-1),
                },
            )
            seeded_at = timezone.now()
            dispatch_stock_used = {slug: 0 for slug in batch_base_quantities}
            for fixture in dispatch_fixtures:
                slug = fixture["slug"]
                product = fixture["product"]
                quantity = 1
                subtotal = product.mrp * quantity
                line_total = product.selling_price * quantity
                line_discount = subtotal - line_total
                delivery_fee = Decimal("4.99")
                taxable = line_total + delivery_fee
                tax_rate = Decimal(str(settings.PHARMACY_TAX_RATE))
                tax = (taxable * tax_rate / Decimal("100")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                order_total = taxable + tax
                order, order_created = PharmacyOrder.objects.get_or_create(
                    development_key=key(f"dispatch-order-{slug}"),
                    defaults={
                        "patient": fixture["patient"],
                        "address": fixture["address"],
                        "payment_method": PharmacyOrder.PaymentMethod.CASH_ON_DELIVERY,
                        "payment_status": PharmacyOrder.PaymentStatus.PENDING,
                        "status": fixture["order_status"],
                        "subtotal": subtotal,
                        "product_discount": line_discount,
                        "coupon_discount": Decimal("0.00"),
                        "delivery_fee": delivery_fee,
                        "tax": tax,
                        "total": order_total,
                        "is_development_data": True,
                    },
                )
                order_created_at = seeded_at - timedelta(
                    days=fixture["created_days_ago"]
                )
                if order_created:
                    order.invoice_number = f"INV-PH-{order.pk:08d}"
                    order.invoice_issued_at = order_created_at
                    order.save(
                        update_fields=["invoice_number", "invoice_issued_at", "updated_at"]
                    )
                PharmacyOrder.objects.filter(pk=order.pk).update(
                    created_at=order_created_at
                )

                order_line, _ = PharmacyOrderLine.objects.get_or_create(
                    development_key=key(f"dispatch-order-line-{slug}"),
                    defaults={
                        "order": order,
                        "product": product,
                        "product_name": product.name,
                        "quantity": quantity,
                        "unit_mrp": product.mrp,
                        "unit_price": product.selling_price,
                        "line_subtotal": subtotal,
                        "line_discount": line_discount,
                        "line_total": line_total,
                        "is_development_data": True,
                    },
                )
                eta = seeded_at + fixture["eta_delta"]
                PharmacyDeliveryAssignment.objects.get_or_create(
                    order=order,
                    defaults={
                        "partner": fixture["partner"],
                        "eta": eta,
                        "status": fixture["delivery_status"],
                        "is_development_data": True,
                    },
                )
                PharmacyOrderBatchAllocation.objects.get_or_create(
                    development_key=key(f"dispatch-allocation-{slug}"),
                    defaults={
                        "order_line": order_line,
                        "batch": fixture["batch"],
                        "quantity": quantity,
                        "is_development_data": True,
                    },
                )
                PharmacyInventoryAdjustment.objects.get_or_create(
                    development_key=key(f"dispatch-adjustment-{slug}"),
                    defaults={
                        "batch": fixture["batch"],
                        "delta": -quantity,
                        "reason": f"Development order {order.order_number} packed",
                        "order": order,
                        "created_by": None,
                        "is_development_data": True,
                    },
                )
                if order.status != PharmacyOrder.Status.CANCELLED:
                    dispatch_stock_used[fixture["product_slug"]] += quantity

            for slug, used_quantity in dispatch_stock_used.items():
                batches[slug].quantity = max(
                    batch_base_quantities[slug] - used_quantity, 0
                )
                batches[slug].save(update_fields=["quantity", "updated_at"])

        self.stdout.write(
            self.style.SUCCESS(
                "Pharmacy SQL development data is ready "
                "(15 products, inventory batches, a prescription, an order, 3 delivery dispatches, "
                "and delivery partners)."
            )
        )
