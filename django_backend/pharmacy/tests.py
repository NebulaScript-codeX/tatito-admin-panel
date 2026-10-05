from datetime import timedelta
from decimal import Decimal
from tempfile import TemporaryDirectory

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role
from care.models import CarePatient
from dashboard.models import PlatformUser
from health_records.models import PrescriptionUpload
from marketing.models import Coupon
from providers.models import HealthcareProvider

from .models import (
    PharmacyBatch,
    PharmacyBrand,
    PharmacyCategory,
    PharmacyDeliveryAssignment,
    PharmacyInventoryAdjustment,
    PharmacyOrder,
    PharmacyProduct,
    PharmacyRefund,
)


class PharmacyApiTests(TestCase):
    def setUp(self):
        call_command("seed_admin_roles", verbosity=0)
        self.admin = User.objects.create_user(
            "pharmacy-admin",
            "pharmacy-admin@example.test",
            "StrongPassword9!",
        )
        self.super_admin = Role.objects.get(name="Super Admin")
        AdminProfile.objects.create(user=self.admin, role=self.super_admin)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

        self.patient = CarePatient.objects.create(name="DEV API Patient")
        self.pharmacy = HealthcareProvider.objects.create(
            name="DEV API Pharmacy",
            provider_type=HealthcareProvider.ProviderType.PHARMACY,
            status=HealthcareProvider.Status.ACTIVE,
        )
        self.partner = PlatformUser.objects.create(
            id="dev-api-delivery-partner",
            name="DEV API Delivery Partner",
            email="delivery-api@example.test",
            role=PlatformUser.Role.PARTNER,
            status="active",
            is_active=True,
            is_blocked=False,
        )
        self.category = PharmacyCategory.objects.create(name="DEV API Wellness")
        self.brand = PharmacyBrand.objects.create(name="DEV API Generic")
        self.product = PharmacyProduct.objects.create(
            name="DEV API Vitamin",
            category=self.category,
            brand=self.brand,
            partner_pharmacy=self.pharmacy,
            pack_size="10 tablets",
            mrp=Decimal("20.00"),
            discount_percent=Decimal("12.50"),
            low_stock_threshold=3,
        )
        self.batch = PharmacyBatch.objects.create(
            product=self.product,
            batch_number="DEV-API-BATCH-1",
            expiry_date=timezone.localdate() + timedelta(days=120),
            quantity=10,
        )

    def create_rx_product(self):
        return PharmacyProduct.objects.create(
            name="DEV API Rx Product",
            category=self.category,
            brand=self.brand,
            pack_size="20 tablets",
            mrp=Decimal("16.00"),
            rx_required=True,
            low_stock_threshold=2,
        )

    def create_order(
        self, *, product=None, quantity=2, prescription_ids=None, coupon_code=""
    ):
        product = product or self.product
        return self.api.post(
            "/api/admin/pharmacy/orders/",
            {
                "patient_id": str(self.patient.pk),
                "address": "Development delivery address",
                "items": [{"product_id": product.pk, "quantity": quantity}],
                "prescription_ids": prescription_ids or [],
                "payment_method": "cash_on_delivery",
                "delivery_fee": "3.00",
                "coupon_code": coupon_code,
            },
            format="json",
        )

    def test_products_use_sql_stock_prices_filters_and_protected_taxonomies(self):
        response = self.api.get(
            "/api/admin/pharmacy/products/",
            {"search": "vitamin", "category": self.category.pk},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertEqual(item["stock"], 10)
        self.assertEqual(item["stock_status"], "in_stock")
        self.assertEqual(item["selling_price"], Decimal("17.50"))
        PharmacyBatch.objects.create(
            product=self.product,
            batch_number="DEV-API-EXPIRED",
            expiry_date=timezone.localdate() - timedelta(days=1),
            quantity=99,
        )
        product_after_expiry = self.api.get(
            f"/api/admin/pharmacy/products/{self.product.pk}/"
        )
        self.assertEqual(product_after_expiry.data["stock"], 10)

        category_delete = self.api.delete(
            f"/api/admin/pharmacy/categories/{self.category.pk}/"
        )
        brand_delete = self.api.delete(
            f"/api/admin/pharmacy/brands/{self.brand.pk}/"
        )
        self.assertEqual(category_delete.status_code, 400)
        self.assertIn("products", category_delete.data["error"])
        self.assertEqual(brand_delete.status_code, 400)
        self.assertIn("products", brand_delete.data["error"])

        created = self.api.post(
            "/api/admin/pharmacy/categories/",
            {"name": "DEV API Respiratory", "description": "Category"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        edited = self.api.patch(
            f"/api/admin/pharmacy/categories/{created.data['id']}/",
            {"name": "DEV API Respiratory Updated"},
            format="json",
        )
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.data["name"], "DEV API Respiratory Updated")

        created_brand = self.api.post(
            "/api/admin/pharmacy/brands/",
            {"name": "DEV API New Brand", "country": "Development"},
            format="json",
        )
        self.assertEqual(created_brand.status_code, 201, created_brand.data)
        edited_brand = self.api.patch(
            f"/api/admin/pharmacy/brands/{created_brand.data['id']}/",
            {"country": "Updated"},
            format="json",
        )
        self.assertEqual(edited_brand.status_code, 200)
        self.assertEqual(edited_brand.data["country"], "Updated")
        metadata = self.api.get("/api/admin/pharmacy/meta/")
        self.assertIn(
            "DEV API Respiratory Updated",
            [item["name"] for item in metadata.data["categories"]],
        )
        self.assertIn("DEV API New Brand", [item["name"] for item in metadata.data["brands"]])

    def test_product_create_edit_search_and_activation_persist(self):
        response = self.api.post(
            "/api/admin/pharmacy/products/",
            {
                "name": "DEV API New Medicine",
                "brand": self.brand.pk,
                "category": self.category.pk,
                "pack_size": "5 units",
                "mrp": "10.00",
                "discount_percent": "25",
                "image_url": "",
                "description": "Development product",
                "low_stock_threshold": 4,
                "rx_required": False,
                "is_active": True,
                "partner_pharmacy": self.pharmacy.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        product_id = response.data["id"]
        self.assertEqual(response.data["selling_price"], Decimal("7.50"))

        self.api.patch(
            f"/api/admin/pharmacy/products/{product_id}/",
            {"discount_percent": "10", "is_active": False},
            format="json",
        )
        search = self.api.get(
            "/api/admin/pharmacy/products/", {"search": "new medicine"}
        )
        self.assertEqual(search.status_code, 200)
        updated = next(item for item in search.data if item["id"] == product_id)
        self.assertFalse(updated["is_active"])
        self.assertEqual(updated["selling_price"], Decimal("9.00"))

    def test_batch_create_adjustment_reason_and_stock_persist(self):
        self.batch.expiry_date = timezone.localdate() + timedelta(days=45)
        self.batch.save(update_fields=["expiry_date"])
        near_expiry = self.api.get("/api/admin/pharmacy/batches/")
        self.assertEqual(near_expiry.status_code, 200)
        self.assertEqual(near_expiry.data[0]["expiry_status"], "near_expiry")

        created = self.api.post(
            "/api/admin/pharmacy/batches/",
            {
                "product": self.product.pk,
                "batch_number": "DEV-API-BATCH-2",
                "expiry_date": (timezone.localdate() + timedelta(days=200)).isoformat(),
                "quantity": 5,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        adjustment = self.api.post(
            f"/api/admin/pharmacy/batches/{created.data['id']}/adjust/",
            {"delta": -2, "reason": "Damaged stock"},
            format="json",
        )
        self.assertEqual(adjustment.status_code, 200, adjustment.data)
        adjustment_batch = PharmacyBatch.objects.get(pk=created.data["id"])
        self.assertEqual(adjustment_batch.quantity, 3)
        self.assertTrue(
            PharmacyInventoryAdjustment.objects.filter(
                batch=adjustment_batch, delta=-2, reason="Damaged stock"
            ).exists()
        )
        rejected = self.api.post(
            f"/api/admin/pharmacy/batches/{created.data['id']}/adjust/",
            {"delta": -4, "reason": "Over correction"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)
        adjustment_batch.refresh_from_db()
        self.assertEqual(adjustment_batch.quantity, 3)

    def test_prescription_upload_approve_reject_notes_and_file_preview(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            uploaded = SimpleUploadedFile(
                "prescription.pdf",
                b"%PDF-1.4 development sample",
                content_type="application/pdf",
            )
            created = self.api.post(
                "/api/admin/pharmacy/prescriptions/",
                {
                    "patient": str(self.patient.pk),
                    "prescription_number": "DEV-API-RX-1",
                    "doctor_name": "DEV API Doctor",
                    "file": uploaded,
                },
                format="multipart",
            )
            self.assertEqual(created.status_code, 201, created.data)
            prescription_id = created.data["id"]
            file_response = self.api.get(created.data["file_url"])
            self.assertEqual(file_response.status_code, 200)
            self.assertIn(b"%PDF", b"".join(file_response.streaming_content))

        # Approval and rejection are persisted only for pending records.
        approved = self.api.post(
            f"/api/admin/pharmacy/prescriptions/{prescription_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        record = PrescriptionUpload.objects.get(pk=prescription_id)
        self.assertEqual(record.status, PrescriptionUpload.Status.APPROVED)

        second = PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-API-RX-2",
            pdf_url="https://example.test/prescription.pdf",
        )
        note = self.api.patch(
            f"/api/admin/pharmacy/prescriptions/{second.pk}/",
            {"internal_notes": "Verify signature"},
            format="json",
        )
        self.assertEqual(note.status_code, 200, note.data)
        rejected = self.api.post(
            f"/api/admin/pharmacy/prescriptions/{second.pk}/reject/",
            {"reason": "The provider signature is missing."},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        second.refresh_from_db()
        self.assertEqual(second.status, PrescriptionUpload.Status.REJECTED)
        self.assertEqual(second.rejection_reason, "The provider signature is missing.")
        self.assertEqual(second.internal_notes, "Verify signature")
        missing_reason = self.api.post(
            f"/api/admin/pharmacy/prescriptions/{second.pk}/reject/",
            {"reason": " "},
            format="json",
        )
        self.assertEqual(missing_reason.status_code, 400)

    def test_rx_order_verify_pack_dispatch_deliver_and_invalid_transitions(self):
        rx_product = self.create_rx_product()
        rx_batch = PharmacyBatch.objects.create(
            product=rx_product,
            batch_number="DEV-API-RX-BATCH",
            expiry_date=timezone.localdate() + timedelta(days=90),
            quantity=7,
        )
        prescription = PrescriptionUpload.objects.create(
            patient=self.patient,
            prescription_number="DEV-API-RX-ORDER",
            pdf_url="https://example.test/rx.pdf",
        )
        order = self.create_order(
            product=rx_product,
            quantity=3,
            prescription_ids=[prescription.pk],
        )
        self.assertEqual(order.status_code, 201, order.data)
        order_id = order.data["id"]
        unapproved = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "verified"},
            format="json",
        )
        self.assertEqual(unapproved.status_code, 400)

        self.api.post(
            f"/api/admin/pharmacy/prescriptions/{prescription.pk}/approve/",
            {},
            format="json",
        )
        verified = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "verified"},
            format="json",
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["status"], "verified")
        self.assertTrue(verified.data["invoice_number"])
        self.assertTrue(verified.data["invoice_issued_at"])

        packed = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "packed"},
            format="json",
        )
        self.assertEqual(packed.status_code, 200, packed.data)
        rx_batch.refresh_from_db()
        self.assertEqual(rx_batch.quantity, 4)
        invalid = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

        assignment = self.api.patch(
            f"/api/admin/pharmacy/orders/{order_id}/delivery/",
            {
                "partner_id": self.partner.pk,
                "eta": (timezone.now() + timedelta(hours=2)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(assignment.status_code, 200, assignment.data)
        out_for_delivery = self.api.patch(
            f"/api/admin/pharmacy/orders/{order_id}/delivery/",
            {"status": "out_for_delivery"},
            format="json",
        )
        self.assertEqual(out_for_delivery.status_code, 200)
        self.assertEqual(out_for_delivery.data["status"], "dispatched")
        delivered = self.api.patch(
            f"/api/admin/pharmacy/orders/{order_id}/delivery/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(delivered.status_code, 200)
        self.assertEqual(delivered.data["status"], "delivered")
        self.assertEqual(delivered.data["payment_status"], "pending")
        cancelled = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 400)

    def test_order_pricing_insufficient_stock_atomicity_and_cancel_restoration(self):
        order = self.create_order(quantity=3)
        self.assertEqual(order.status_code, 201, order.data)
        self.assertEqual(order.data["subtotal"], "60.00")
        self.assertEqual(order.data["product_discount"], "7.50")
        self.assertEqual(order.data["delivery_fee"], "3.00")
        self.assertEqual(order.data["total"], "55.50")
        order_id = order.data["id"]
        self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "verified"},
            format="json",
        )
        insufficient = self.create_order(quantity=100)
        self.assertEqual(insufficient.status_code, 201)
        self.api.post(
            f"/api/admin/pharmacy/orders/{insufficient.data['id']}/advance/",
            {"status": "verified"},
            format="json",
        )
        before = self.batch.quantity
        failed_pack = self.api.post(
            f"/api/admin/pharmacy/orders/{insufficient.data['id']}/advance/",
            {"status": "packed"},
            format="json",
        )
        self.assertEqual(failed_pack.status_code, 400)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.quantity, before)

        packed = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "packed"},
            format="json",
        )
        self.assertEqual(packed.status_code, 200)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.quantity, 7)
        paid_order = PharmacyOrder.objects.get(pk=order_id)
        paid_order.payment_status = PharmacyOrder.PaymentStatus.PAID
        paid_order.save(update_fields=["payment_status"])
        cancelled = self.api.post(
            f"/api/admin/pharmacy/orders/{order_id}/advance/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200)
        self.batch.refresh_from_db()
        paid_order.refresh_from_db()
        self.assertEqual(self.batch.quantity, 10)
        self.assertEqual(paid_order.payment_status, PharmacyOrder.PaymentStatus.REFUND_PENDING)
        self.assertTrue(PharmacyRefund.objects.filter(order=paid_order, amount=paid_order.total).exists())

    @override_settings(PHARMACY_TAX_RATE="10.00")
    def test_pharmacy_coupon_discount_tax_and_usage_are_persisted(self):
        now = timezone.now()
        coupon = Coupon.objects.create(
            code="DEVPHARM10",
            discount_type="percentage",
            discount_value=Decimal("10.00"),
            maximum_discount=Decimal("2.00"),
            minimum_order_amount=Decimal("10.00"),
            applies_to="pharmacy",
            start_date=now - timedelta(days=1),
            expiry_date=now + timedelta(days=1),
            usage_limit=5,
            per_user_limit=1,
        )
        metadata = self.api.get("/api/admin/pharmacy/meta/")
        self.assertEqual(metadata.status_code, 200)
        self.assertIn("DEVPHARM10", [item["code"] for item in metadata.data["coupons"]])

        response = self.create_order(quantity=3, coupon_code="DEVPHARM10")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["coupon_discount"], "2.00")
        self.assertEqual(response.data["tax"], "5.35")
        self.assertEqual(response.data["total"], "58.85")
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 1)

        repeated = self.create_order(quantity=1, coupon_code="DEVPHARM10")
        self.assertEqual(repeated.status_code, 400)
        self.assertTrue(
            PharmacyOrder.objects.filter(coupon=coupon, patient=self.patient).count() == 1
        )

    def test_development_seed_provides_idempotent_sql_delivery_dispatch_records(self):
        with TemporaryDirectory() as media_root, override_settings(
            DEBUG=True, MEDIA_ROOT=media_root
        ):
            call_command("seed_pharmacy_development_data", verbosity=0)

            seeded_products = PharmacyProduct.objects.filter(
                development_key__startswith="dev-pharmacy-product-"
            )
            self.assertEqual(seeded_products.count(), 15)
            product_response = self.api.get("/api/admin/pharmacy/products/")
            self.assertEqual(product_response.status_code, 200)
            returned_product_ids = {
                item["id"] for item in product_response.data
            }
            self.assertTrue(
                set(seeded_products.values_list("id", flat=True)).issubset(
                    returned_product_ids
                )
            )

            orders = PharmacyOrder.objects.filter(
                development_key__startswith="dev-pharmacy-dispatch-order-"
            )
            assignments = PharmacyDeliveryAssignment.objects.filter(order__in=orders)
            self.assertEqual(orders.count(), 3)
            self.assertEqual(assignments.count(), 3)
            self.assertSetEqual(
                set(orders.values_list("status", flat=True)),
                {
                    PharmacyOrder.Status.PACKED,
                    PharmacyOrder.Status.DISPATCHED,
                    PharmacyOrder.Status.DELIVERED,
                },
            )
            self.assertEqual(
                len(set(orders.values_list("patient__name", flat=True))),
                3,
            )
            self.assertEqual(
                len(set(orders.values_list("address", flat=True))),
                3,
            )
            self.assertEqual(len(set(orders.values_list("created_at", flat=True))), 3)
            self.assertEqual(
                len(set(assignments.values_list("eta", flat=True))),
                3,
            )

            response = self.api.get("/api/admin/pharmacy/orders/")
            self.assertEqual(response.status_code, 200)
            dispatch_rows = [
                row
                for row in response.data
                if row["order_number"].startswith("PH-")
                and row["status"]
                in {
                    PharmacyOrder.Status.PACKED,
                    PharmacyOrder.Status.DISPATCHED,
                    PharmacyOrder.Status.DELIVERED,
                }
            ]
            self.assertEqual(len(dispatch_rows), 3)
            self.assertEqual(
                {
                    row["delivery"]["status"]
                    for row in dispatch_rows
                },
                {
                    PharmacyDeliveryAssignment.Status.ASSIGNED,
                    PharmacyDeliveryAssignment.Status.OUT_FOR_DELIVERY,
                    PharmacyDeliveryAssignment.Status.DELIVERED,
                },
            )
            self.assertTrue(
                all(row["delivery"]["partner_name"] for row in dispatch_rows)
            )
            self.assertGreaterEqual(
                len(
                    {
                        row["delivery"]["partner_name"]
                        for row in dispatch_rows
                    }
                ),
                2,
            )

            call_command("seed_pharmacy_development_data", verbosity=0)
            self.assertEqual(seeded_products.count(), 15)
            self.assertEqual(orders.count(), 3)
            self.assertEqual(assignments.count(), 3)
            self.assertEqual(
                PharmacyBatch.objects.get(
                    development_key="dev-pharmacy-batch-vitamin-d3"
                ).quantity,
                30,
            )
            self.assertEqual(
                PharmacyBatch.objects.get(
                    development_key="dev-pharmacy-batch-first-aid"
                ).quantity,
                2,
            )

    def test_pharmacist_role_has_module_crud_without_delete(self):
        pharmacist = Role.objects.get(name="Pharmacist")
        permissions = pharmacist.permissions.get(module="pharmacy")
        self.assertTrue(permissions.can_view)
        self.assertTrue(permissions.can_create)
        self.assertTrue(permissions.can_edit)
        self.assertFalse(permissions.can_delete)
