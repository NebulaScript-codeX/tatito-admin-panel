from datetime import date, timedelta
from decimal import Decimal

import jwt
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role, RolePermission
from care.models import (
    Appointment,
    AppointmentSlot,
    CarePatient,
    CarePayment,
    Doctor,
    RefundRequest,
    Specialty,
)
from dashboard.models import PlatformUser
from health_records.models import LabBooking
from lab_tests.models import LabTest
from pharmacy.models import PharmacyOrder

from .models import (
    CommerceRefundRequest,
    CommerceTransaction,
    HealthPlanBenefitUsage,
    HealthPlanCalculatorConfig,
    HealthPlan,
    PlanOrder,
    PlanSubscriptionChange,
    WalletTransaction,
)
from .services import build_orders, build_transactions


class CommerceApiTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name="Commerce Test Admin")
        RolePermission.objects.create(
            role=role,
            module="orders_payments",
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
        )
        RolePermission.objects.create(role=role, module="dashboard", can_view=True)
        RolePermission.objects.create(
            role=role,
            module="health_plans",
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
        )
        RolePermission.objects.create(
            role=role, module="lab_tests", can_view=True, can_edit=True
        )
        admin = User.objects.create_user("commerce-admin", password="TestPassword123!")
        AdminProfile.objects.create(user=admin, role=role)
        self.api = APIClient()
        self.api.force_authenticate(user=admin)
        self.admin = admin

        self.patient = CarePatient.objects.create(
            external_id="wallet-patient-1", name="Commerce Patient"
        )
        self.platform_patient = PlatformUser.objects.create(
            id="wallet-patient-1",
            name="Commerce Patient",
            email="commerce-patient@example.com",
            role=PlatformUser.Role.PATIENT,
        )
        self.pharmacy_order = PharmacyOrder.objects.create(
            patient=self.patient,
            address="Test address",
            total=Decimal("125.00"),
            subtotal=Decimal("125.00"),
        )

    def make_appointment(self, payment_status=Appointment.PaymentStatus.PENDING):
        specialty = Specialty.objects.create(name="Commerce Specialty")
        doctor = Doctor.objects.create(
            name="Commerce Doctor",
            specialty=specialty,
            city="Pune",
            degree="MBBS",
            fee=Decimal("500.00"),
            verification_status=Doctor.VerificationStatus.VERIFIED,
        )
        on = date.today() + timedelta(days=3)
        slot = AppointmentSlot.objects.create(
            doctor=doctor,
            date=on,
            weekday=on.weekday(),
            start_time="09:00",
            end_time="09:30",
            duration_minutes=30,
        )
        return Appointment.objects.create(
            doctor=doctor,
            patient=self.patient,
            slot=slot,
            doctor_name=doctor.name,
            patient_name=self.patient.name,
            specialty_name=specialty.name,
            date=on,
            start_time="09:00",
            end_time="09:30",
            fee=Decimal("500.00"),
            payment_status=payment_status,
        )

    def test_orders_aggregate_existing_pharmacy_lab_and_appointment_records(self):
        appointment = self.make_appointment()
        lab_test = LabTest.objects.create(
            name="CBC", code="COMMERCE-CBC", price=Decimal("250.00")
        )
        LabBooking.objects.create(
            patient=self.patient,
            lab_test=lab_test,
            test_name=lab_test.name,
            specimen_date=date.today(),
        )

        response = self.api.get("/api/admin/orders-payments/orders/")

        self.assertEqual(response.status_code, 200)
        types = {row["type"] for row in response.data["results"]}
        self.assertTrue({"pharmacy", "appointment", "lab"}.issubset(types))
        lab_row = next(row for row in response.data["results"] if row["type"] == "lab")
        self.assertEqual(lab_row["amount"], "250.00")
        filtered = self.api.get(
            "/api/admin/orders-payments/orders/?type=appointment&payment_status=pending"
        )
        self.assertEqual([row["id"] for row in filtered.data["results"]], [str(appointment.pk)])
        dated = self.api.get(
            f"/api/admin/orders-payments/orders/?date_from={timezone.localdate().isoformat()}&date_to={timezone.localdate().isoformat()}"
        )
        self.assertIn(
            str(appointment.pk),
            [row["id"] for row in dated.data["results"] if row["type"] == "appointment"],
        )

    def test_manual_pharmacy_transaction_updates_source_order_and_invoice(self):
        created = self.api.post(
            "/api/admin/orders-payments/transactions/",
            {
                "order_type": "pharmacy",
                "order_id": str(self.pharmacy_order.pk),
                "patient_id": str(self.patient.pk),
                "method": "card",
                "amount": "125.00",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        entry_id = created.data["transaction"]["id"]
        self.assertEqual(
            CommerceTransaction.objects.get(pk=entry_id).pharmacy_order,
            self.pharmacy_order,
        )
        paid = self.api.post(
            f"/api/admin/orders-payments/transactions/{entry_id}/successful/",
            {},
            format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        dashboard = self.api.get("/api/dashboard/overview/?period=7")
        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        self.assertEqual(dashboard.data["live_stats"]["revenue"], "125.00")
        self.pharmacy_order.refresh_from_db()
        self.assertEqual(self.pharmacy_order.payment_status, PharmacyOrder.PaymentStatus.PAID)

        invoices = self.api.get("/api/admin/orders-payments/invoices/")
        self.assertEqual(invoices.status_code, 200)
        self.assertEqual(invoices.data["results"][0]["amount"], "125.00")
        detail = self.api.get(
            f"/api/admin/orders-payments/orders/pharmacy/{self.pharmacy_order.pk}/"
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["items"], [])

    def test_legacy_appointment_transaction_status_updates_source_records(self):
        appointment = self.make_appointment()
        payment = CarePayment.objects.create(
            appointment=appointment,
            patient_id=self.patient.external_id,
            doctor=appointment.doctor,
            amount=appointment.fee,
            kind=CarePayment.Kind.CONSULTATION,
            status=CarePayment.Status.PENDING,
        )

        failed = self.api.post(
            f"/api/admin/orders-payments/transactions/source/care/{payment.pk}/failed/",
            {},
            format="json",
        )

        self.assertEqual(failed.status_code, 200, failed.data)
        payment.refresh_from_db()
        appointment.refresh_from_db()
        self.assertEqual(payment.status, CarePayment.Status.FAILED)
        self.assertEqual(appointment.payment_status, Appointment.PaymentStatus.FAILED)
        row = next(row for row in build_transactions() if row["id"] == str(payment.pk))
        self.assertEqual(row["status"], CommerceTransaction.Status.FAILED)

        paid = self.api.post(
            f"/api/admin/orders-payments/transactions/source/care/{payment.pk}/successful/",
            {},
            format="json",
        )

        self.assertEqual(paid.status_code, 200, paid.data)
        payment.refresh_from_db()
        appointment.refresh_from_db()
        self.assertEqual(payment.status, CarePayment.Status.PAID)
        self.assertEqual(appointment.payment_status, Appointment.PaymentStatus.PAID)
        row = next(row for row in build_transactions() if row["id"] == str(payment.pk))
        self.assertEqual(row["status"], CommerceTransaction.Status.SUCCESSFUL)

    def test_legacy_pharmacy_transaction_status_updates_order_and_invoice(self):
        paid = self.api.post(
            f"/api/admin/orders-payments/transactions/source/pharmacy/{self.pharmacy_order.pk}/successful/",
            {},
            format="json",
        )

        self.assertEqual(paid.status_code, 200, paid.data)
        self.pharmacy_order.refresh_from_db()
        self.assertEqual(
            self.pharmacy_order.payment_status, PharmacyOrder.PaymentStatus.PAID
        )
        self.assertEqual(self.pharmacy_order.invoice_number, f"INV-PH-{self.pharmacy_order.pk:08d}")
        row = next(
            row
            for row in build_transactions()
            if row["id"] == f"pharmacy-{self.pharmacy_order.pk}"
        )
        self.assertEqual(row["status"], CommerceTransaction.Status.SUCCESSFUL)

        invalid = self.api.post(
            "/api/admin/orders-payments/transactions/source/care/not-a-uuid/failed/",
            {},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400, invalid.data)

    def test_cancelled_paid_appointment_refund_to_wallet_updates_every_record(self):
        appointment = self.make_appointment(Appointment.PaymentStatus.PAID)
        payment = CarePayment.objects.create(
            appointment=appointment,
            patient_id=self.patient.external_id,
            doctor=appointment.doctor,
            amount=appointment.fee,
            kind=CarePayment.Kind.CONSULTATION,
            status=CarePayment.Status.PAID,
            payment_method=CarePayment.PaymentMethod.CARD,
        )
        refund = RefundRequest.objects.create(
            appointment=appointment,
            payment=payment,
            patient_id=self.patient.external_id,
            amount=payment.amount,
            reason="Cancelled appointment",
        )

        response = self.api.post(
            f"/api/admin/orders-payments/refunds/care/{refund.pk}/approve/",
            {"destination": "wallet"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.platform_patient.refresh_from_db()
        payment.refresh_from_db()
        appointment.refresh_from_db()
        refund.refresh_from_db()
        self.assertEqual(self.platform_patient.wallet_balance, Decimal("500.00"))
        self.assertEqual(payment.status, CarePayment.Status.REFUNDED)
        self.assertEqual(appointment.payment_status, Appointment.PaymentStatus.REFUNDED)
        self.assertEqual(refund.destination, "wallet")
        self.assertEqual(WalletTransaction.objects.filter(user=self.platform_patient).count(), 1)
        self.assertTrue(
            CommerceTransaction.objects.filter(
                kind=CommerceTransaction.Kind.REFUND,
                order_type="appointment",
                order_id=str(appointment.pk),
                method=CommerceTransaction.Method.WALLET,
            ).exists()
        )
        refund_transaction = CommerceTransaction.objects.get(
            kind=CommerceTransaction.Kind.REFUND,
            order_type="appointment",
            order_id=str(appointment.pk),
        )
        self.assertIsNotNone(refund_transaction.original_transaction)
        self.assertEqual(refund_transaction.appointment, appointment)
        self.assertEqual(
            refund_transaction.original_transaction.appointment, appointment
        )
        order = next(row for row in build_orders() if row["id"] == str(appointment.pk))
        self.assertEqual(order["payment_status"], "refunded")
        summary = self.api.get("/api/admin/orders-payments/transactions/").data["summary"]
        self.assertEqual(summary["refunded"], "500.00")

    def test_refund_rejection_requires_reason_and_keeps_payment_paid(self):
        appointment = self.make_appointment(Appointment.PaymentStatus.PAID)
        payment = CarePayment.objects.create(
            appointment=appointment,
            patient_id=self.patient.external_id,
            doctor=appointment.doctor,
            amount=appointment.fee,
            kind=CarePayment.Kind.CONSULTATION,
            status=CarePayment.Status.PAID,
        )
        refund = RefundRequest.objects.create(
            appointment=appointment,
            payment=payment,
            amount=payment.amount,
        )
        path = f"/api/admin/orders-payments/refunds/care/{refund.pk}/reject/"
        invalid = self.api.post(path, {"reason": " "}, format="json")
        self.assertEqual(invalid.status_code, 400)
        rejected = self.api.post(path, {"reason": "Not eligible"}, format="json")
        self.assertEqual(rejected.status_code, 200, rejected.data)
        payment.refresh_from_db()
        refund.refresh_from_db()
        self.assertEqual(payment.status, CarePayment.Status.PAID)
        self.assertEqual(refund.rejection_reason, "Not eligible")

    def test_paid_lab_cancellation_creates_refund_and_wallet_credit(self):
        lab_test = LabTest.objects.create(
            name="Commerce Refund Test",
            code="COMMERCE-REFUND",
            price=Decimal("250.00"),
        )
        booking = LabBooking.objects.create(
            patient=self.patient,
            lab_test=lab_test,
            test_name=lab_test.name,
            specimen_date=date.today(),
            status=LabBooking.Status.BOOKED,
        )
        created = self.api.post(
            "/api/admin/orders-payments/transactions/",
            {
                "order_type": "lab",
                "order_id": str(booking.pk),
                "patient_id": str(self.patient.pk),
                "method": "card",
                "amount": "250.00",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        transaction_id = created.data["transaction"]["id"]
        source_payment = CommerceTransaction.objects.get(pk=transaction_id)
        self.assertEqual(source_payment.lab_booking, booking)
        paid = self.api.post(
            f"/api/admin/orders-payments/transactions/{transaction_id}/successful/",
            {},
            format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)

        cancelled = self.api.post(
            f"/api/admin/lab-tests/bookings/{booking.pk}/transition/",
            {"status": LabBooking.Status.CANCELLED},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        refund = CommerceRefundRequest.objects.get(transaction_id=transaction_id)
        approved = self.api.post(
            f"/api/admin/orders-payments/refunds/commerce/{refund.pk}/approve/",
            {"destination": "wallet"},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        self.platform_patient.refresh_from_db()
        self.assertEqual(self.platform_patient.wallet_balance, Decimal("250.00"))
        refund_entry = CommerceTransaction.objects.get(
            kind=CommerceTransaction.Kind.REFUND,
            order_type="lab",
            order_id=str(booking.pk),
        )
        self.assertEqual(refund_entry.lab_booking, booking)
        self.assertEqual(refund_entry.original_transaction, source_payment)
        self.assertTrue(
            refund_entry.method == CommerceTransaction.Method.WALLET
        )

    def test_plan_order_payment_cancellation_and_refund_are_persisted(self):
        plan = HealthPlan.objects.filter(code="family").first()
        if plan is None:
            plan = HealthPlan.objects.create(
                code="family",
                name="Family Care",
                monthly_price=Decimal("799.00"),
                annual_monthly_price=Decimal("649.00"),
            )
        created = self.api.post(
            "/api/admin/orders-payments/transactions/",
            {
                "order_type": "plan",
                "plan_code": plan.code,
                "billing_period": "annual",
                "patient_id": str(self.patient.pk),
                "method": "upi",
                "amount": str(plan.annual_monthly_price * 12),
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        entry_id = created.data["transaction"]["id"]
        order_id = created.data["transaction"]["order_id"]
        self.api.post(
            f"/api/admin/orders-payments/transactions/{entry_id}/successful/",
            {},
            format="json",
        )
        order = PlanOrder.objects.get(pk=order_id)
        self.assertEqual(order.payment_status, PlanOrder.PaymentStatus.PAID)
        self.assertEqual(order.status, PlanOrder.Status.ACTIVE)
        self.assertIsNotNone(order.starts_at)
        self.assertGreater(order.ends_at, order.starts_at)

        cancelled = self.api.post(
            f"/api/admin/orders-payments/orders/plan/{order_id}/cancel/",
            {},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        refund = CommerceRefundRequest.objects.get(transaction_id=entry_id)
        approved = self.api.post(
            f"/api/admin/orders-payments/refunds/commerce/{refund.pk}/approve/",
            {"destination": "original_method"},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, PlanOrder.PaymentStatus.REFUNDED)
        self.assertEqual(order.status, PlanOrder.Status.CANCELLED)

    @override_settings(CUSTOMER_JWT_SECRET="commerce-test-secret-that-is-at-least-32-bytes")
    def test_health_plan_renewal_updates_same_order_and_preserves_history(self):
        plan = HealthPlan.objects.get(code="family")
        now = timezone.now()
        original = PlanOrder.objects.create(
            plan=plan,
            patient=self.patient,
            platform_user=self.platform_patient,
            billing_period=PlanOrder.BillingPeriod.MONTHLY,
            amount=plan.monthly_price,
            status=PlanOrder.Status.EXPIRED,
            payment_status=PlanOrder.PaymentStatus.PAID,
            payment_method=CommerceTransaction.Method.UPI,
            starts_at=now - timedelta(days=25),
            ends_at=now - timedelta(days=5),
        )
        renewal = self.api.post(
            f"/api/admin/health-plans/subscriptions/{original.pk}/action/",
            {"action": "renew"},
            format="json",
        )
        self.assertEqual(renewal.status_code, 201, renewal.data)
        current = PlanOrder.objects.get(pk=renewal.data["id"])
        self.assertEqual(current.pk, original.pk)
        self.assertEqual(PlanOrder.objects.filter(platform_user=self.platform_patient).count(), 1)
        self.assertEqual(current.status, PlanOrder.Status.EXPIRED)
        self.assertEqual(current.payment_status, PlanOrder.PaymentStatus.PAID)
        pending_transaction = CommerceTransaction.objects.get(
            plan_order=current,
            kind=CommerceTransaction.Kind.PAYMENT,
        )
        self.assertEqual(pending_transaction.status, CommerceTransaction.Status.PENDING)
        change = PlanSubscriptionChange.objects.get(transaction=pending_transaction)
        self.assertEqual(change.change_type, PlanSubscriptionChange.ChangeType.RENEWAL)

        paid = self.api.post(
            f"/api/admin/orders-payments/transactions/{pending_transaction.pk}/successful/",
            {},
            format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        original.refresh_from_db()
        self.assertEqual(original.status, PlanOrder.Status.ACTIVE)
        self.assertEqual(original.payment_status, PlanOrder.PaymentStatus.PAID)
        self.assertEqual(original.pk, current.pk)
        self.assertIsNotNone(original.starts_at)
        self.assertGreater(original.ends_at, original.starts_at)
        self.assertEqual(
            original.history_entries.filter(event_type="renewal_completed").count(),
            1,
        )

        token = jwt.encode(
            {"sub": self.platform_patient.pk, "role": PlatformUser.Role.PATIENT},
            settings.CUSTOMER_JWT_SECRET,
            algorithm="HS256",
        )
        patient_api = APIClient()
        patient_api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        public_rows = patient_api.get("/api/health-plans/my-subscriptions/")
        public_current = next(
            row for row in public_rows.data["results"] if row["id"] == original.pk
        )
        self.assertEqual(public_current["payment_status"], PlanOrder.PaymentStatus.PAID)
        history = self.api.get(
            f"/api/admin/health-plans/subscriptions/{original.pk}/history/"
        )
        self.assertEqual(history.status_code, 200, history.data)
        self.assertTrue(
            any(row["event_type"] == "renewal_completed" for row in history.data["results"])
        )
        renewal_payment = next(
            row for row in history.data["results"]
            if row["event_type"] == "renewal_payment"
        )
        self.assertEqual(
            renewal_payment["snapshot"]["transaction_id"],
            pending_transaction.pk,
        )
        self.assertEqual(
            renewal_payment["snapshot"]["payment_method"],
            CommerceTransaction.Method.UPI,
        )
        self.assertEqual(
            renewal_payment["snapshot"]["payment_status"],
            CommerceTransaction.Status.SUCCESSFUL,
        )
        deactivated = self.api.post(
            f"/api/admin/health-plans/subscriptions/{original.pk}/action/",
            {"action": "deactivate"},
            format="json",
        )
        self.assertEqual(deactivated.status_code, 200, deactivated.data)
        reactivated = self.api.post(
            f"/api/admin/health-plans/subscriptions/{original.pk}/action/",
            {"action": "activate"},
            format="json",
        )
        self.assertEqual(reactivated.status_code, 200, reactivated.data)
        blocked = self.api.post(
            f"/api/admin/health-plans/subscriptions/{original.pk}/action/",
            {"action": "block"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 200, blocked.data)
        original.refresh_from_db()
        self.assertTrue(original.is_blocked)
        archived = self.api.post(
            f"/api/admin/health-plans/subscriptions/{original.pk}/action/",
            {"action": "archive"},
            format="json",
        )
        self.assertEqual(archived.status_code, 200, archived.data)
        original.refresh_from_db()
        self.assertTrue(original.is_archived)
        public_rows = patient_api.get("/api/health-plans/my-subscriptions/")
        self.assertFalse(any(row["id"] == original.pk for row in public_rows.data["results"]))
        latest_history = self.api.get(
            f"/api/admin/health-plans/subscriptions/{original.pk}/history/"
        )
        self.assertEqual(latest_history.status_code, 200, latest_history.data)
        latest_events = {row["event_type"] for row in latest_history.data["results"]}
        self.assertTrue({"deactivate", "activate", "block", "archive"} <= latest_events)

    def test_health_plan_admin_crud_updates_public_catalog_and_guards_active_delete(self):
        created = self.api.post(
            "/api/admin/health-plans/plans/",
            {
                "code": "test-plus",
                "name": "Test Plus",
                "monthly_price": "600.00",
                "annual_monthly_price": "480.00",
                "maximum_family_members": 3,
                "is_popular": True,
                "free_consultations_per_month": 4,
                "pharmacy_discount_percent": "15.00",
                "lab_discount_percent": "10.00",
                "custom_benefits": ["Priority support"],
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        plan_id = created.data["id"]
        public = APIClient().get("/api/health-plans/")
        row = next(item for item in public.data["results"] if item["code"] == "test-plus")
        self.assertEqual(row["benefits"]["pharmacy_discount_percent"], "15.00")
        self.assertIn("Priority support", row["features"])
        self.assertEqual(row["annual_saving_percent"], "20.00")

        deactivated = self.api.patch(
            f"/api/admin/health-plans/plans/{plan_id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deactivated.status_code, 200, deactivated.data)
        self.assertFalse(HealthPlan.objects.get(pk=plan_id).is_active)
        public = APIClient().get("/api/health-plans/")
        self.assertFalse(any(item["code"] == "test-plus" for item in public.data["results"]))

        reactivated = self.api.patch(
            f"/api/admin/health-plans/plans/{plan_id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(reactivated.status_code, 200, reactivated.data)
        public = APIClient().get("/api/health-plans/")
        self.assertTrue(any(item["code"] == "test-plus" for item in public.data["results"]))

        order = PlanOrder.objects.create(
            plan_id=plan_id,
            patient=self.patient,
            platform_user=self.platform_patient,
            billing_period=PlanOrder.BillingPeriod.MONTHLY,
            amount=Decimal("30.00"),
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=20),
        )
        blocked = self.api.delete(f"/api/admin/health-plans/plans/{plan_id}/")
        self.assertEqual(blocked.status_code, 400, blocked.data)
        order.status = PlanOrder.Status.EXPIRED
        order.save(update_fields=["status"])
        deleted = self.api.delete(f"/api/admin/health-plans/plans/{plan_id}/")
        self.assertEqual(deleted.status_code, 400, deleted.data)
        self.assertIn("history", str(deleted.data).lower())

    @override_settings(CUSTOMER_JWT_SECRET="commerce-test-secret-that-is-at-least-32-bytes")
    def test_health_plan_family_limit_calculator_and_wallet_refund(self):
        plan = HealthPlan.objects.get(code="family")
        plan.maximum_family_members = 3
        plan.save(update_fields=["maximum_family_members"])
        created = self.api.post(
            "/api/admin/health-plans/subscriptions/",
            {
                "plan_id": plan.pk,
                "patient_id": self.platform_patient.pk,
                "billing_period": "monthly",
                "payment_method": "card",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        subscription_id = created.data["id"]
        plan.free_consultations_per_month = 4
        plan.save(update_fields=["free_consultations_per_month"])
        HealthPlanBenefitUsage.objects.create(
            subscription_id=subscription_id,
            benefit_code="consultation",
            quantity=2,
            period_start=timezone.localdate().replace(day=1),
            source_type="test",
            source_id="usage-test-1",
        )
        usage = self.api.get(
            f"/api/admin/health-plans/benefit-usage/?subscription={subscription_id}"
        )
        self.assertEqual(usage.status_code, 200, usage.data)
        consultation_usage = next(
            row for row in usage.data["results"] if row["benefit_code"] == "consultation"
        )
        self.assertEqual(consultation_usage["used"], 2)
        self.assertEqual(consultation_usage["limit"], 4)
        self.assertEqual(consultation_usage["remaining"], 2)
        self.assertEqual(created.data["payment"]["status"], CommerceTransaction.Status.PENDING)
        self.assertEqual(created.data["payment"]["amount"], created.data["amount"])
        self.assertEqual(CommerceTransaction.objects.filter(
            order_type=CommerceTransaction.OrderType.PLAN,
            order_id=str(subscription_id),
            kind=CommerceTransaction.Kind.PAYMENT,
        ).count(), 1)
        token = jwt.encode(
            {"sub": self.platform_patient.pk, "role": PlatformUser.Role.PATIENT},
            settings.CUSTOMER_JWT_SECRET,
            algorithm="HS256",
        )
        patient_api = APIClient()
        patient_api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        public_memberships = patient_api.get("/api/health-plans/my-subscriptions/")
        self.assertEqual(public_memberships.status_code, 200, public_memberships.data)
        public_subscription = next(
            row for row in public_memberships.data["results"]
            if row["id"] == subscription_id
        )
        self.assertEqual(public_subscription["payment"]["reference"], created.data["payment"]["reference"])
        self.assertEqual(public_subscription["usage"][0]["remaining"], 2)
        family = self.api.post(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
            {"name": "Family Member", "relationship": "Spouse"},
            format="json",
        )
        self.assertEqual(family.status_code, 201, family.data)
        duplicate = self.api.post(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
            {"name": "Family Member", "relationship": "Spouse"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400, duplicate.data)
        self.assertIn("already", str(duplicate.data).lower())
        over_limit = self.api.post(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
            {"name": "Second Member"},
            format="json",
        )
        self.assertEqual(over_limit.status_code, 201, over_limit.data)
        over_limit = self.api.post(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
            {"name": "Third Member"},
            format="json",
        )
        self.assertEqual(over_limit.status_code, 400)
        admin_family = self.api.get(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/"
        )
        self.assertEqual(admin_family.data["count"], 2)
        self.assertTrue(admin_family.data["results"][0]["created_at"])
        website_family = patient_api.get(
            f"/api/health-plans/my-subscriptions/{subscription_id}/family/"
        )
        self.assertEqual(website_family.data["count"], 2)

        settings_response = self.api.patch(
            "/api/admin/health-plans/calculator/",
            {
                "doctor_visits_min": 1,
                "doctor_visits_max": 8,
                "doctor_visits_default": 3,
            },
            format="json",
        )
        self.assertEqual(settings_response.status_code, 200, settings_response.data)
        self.assertEqual(
            APIClient().get("/api/health-plans/").data["calculator"]["doctor_visits_default"],
            3,
        )

        order = PlanOrder.objects.create(
            plan=plan,
            patient=self.patient,
            platform_user=self.platform_patient,
            billing_period=PlanOrder.BillingPeriod.MONTHLY,
            amount=plan.monthly_price,
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30),
        )
        payment = CommerceTransaction.objects.create(
            reference="PLAN-REFUND-TEST",
            kind=CommerceTransaction.Kind.PAYMENT,
            status=CommerceTransaction.Status.SUCCESSFUL,
            method=CommerceTransaction.Method.CARD,
            amount=order.amount,
            order_type=CommerceTransaction.OrderType.PLAN,
            order_id=str(order.pk),
            patient=self.patient,
            platform_user=self.platform_patient,
            plan_order=order,
            patient_name=self.patient.name,
        )
        refund = CommerceRefundRequest.objects.create(
            transaction=payment,
            amount=payment.amount,
            reason="Eligible plan refund",
        )
        approved = self.api.post(
            f"/api/admin/health-plans/refunds/{refund.pk}/",
            {"action": "approve"},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        order.refresh_from_db()
        self.platform_patient.refresh_from_db()
        self.assertEqual(order.status, PlanOrder.Status.CANCELLED)
        self.assertEqual(order.payment_status, PlanOrder.PaymentStatus.REFUNDED)
        self.assertEqual(self.platform_patient.wallet_balance, plan.monthly_price)
        self.assertEqual(WalletTransaction.objects.filter(user=self.platform_patient).count(), 1)
        public_after_refund = patient_api.get("/api/health-plans/my-subscriptions/")
        refunded_subscription = next(
            row for row in public_after_refund.data["results"]
            if row["id"] == order.pk
        )
        self.assertEqual(refunded_subscription["status"], PlanOrder.Status.CANCELLED)
        self.assertEqual(refunded_subscription["payment_status"], PlanOrder.PaymentStatus.REFUNDED)
        self.assertEqual(refunded_subscription["refund"]["status"], CommerceRefundRequest.Status.APPROVED)
        admin_refund = self.api.get("/api/admin/health-plans/refunds/")
        refund_row = next(row for row in admin_refund.data["results"] if row["id"] == refund.pk)
        self.assertEqual(refund_row["payment_transaction_id"], payment.pk)
        self.assertTrue(refund_row["refund_transactions"])

    def test_vip_subscription_allows_configured_household_family_members(self):
        plan = HealthPlan.objects.get(code="vip")
        self.assertEqual(plan.maximum_family_members, 5)
        created = self.api.post(
            "/api/admin/health-plans/subscriptions/",
            {
                "plan_id": plan.pk,
                "patient_id": self.platform_patient.pk,
                "billing_period": "monthly",
                "payment_method": "card",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        subscription_id = created.data["id"]

        for index in range(4):
            response = self.api.post(
                f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
                {"name": f"VIP Family Member {index + 1}", "relationship": "Family"},
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.data)

        family = self.api.get(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/"
        )
        self.assertEqual(family.status_code, 200, family.data)
        self.assertEqual(family.data["count"], 4)
        self.assertEqual(family.data["limit"], 4)

        over_limit = self.api.post(
            f"/api/admin/health-plans/subscriptions/{subscription_id}/family/",
            {"name": "One Too Many"},
            format="json",
        )
        self.assertEqual(over_limit.status_code, 400, over_limit.data)

    @override_settings(CUSTOMER_JWT_SECRET="commerce-test-secret-that-is-at-least-32-bytes")
    def test_patient_plan_checkout_persists_pending_order_and_payment(self):
        plan = HealthPlan.objects.get(code="family")
        token = jwt.encode(
            {"sub": self.platform_patient.pk, "role": PlatformUser.Role.PATIENT},
            settings.CUSTOMER_JWT_SECRET,
            algorithm="HS256",
        )
        response = APIClient().post(
            "/api/health-plans/subscribe/",
            {
                "plan_code": plan.code,
                "billing_period": "annual",
                "method": "card",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, 201, response.data)
        order = PlanOrder.objects.get(pk=response.data["order_id"])
        payment = CommerceTransaction.objects.get(order_type="plan", order_id=str(order.pk))
        self.assertEqual(order.platform_user, self.platform_patient)
        self.assertEqual(order.status, PlanOrder.Status.PENDING)
        self.assertEqual(order.payment_status, PlanOrder.PaymentStatus.PENDING)
        self.assertEqual(payment.status, CommerceTransaction.Status.PENDING)
        self.assertEqual(payment.plan_order, order)
        self.assertEqual(payment.amount, plan.annual_monthly_price * 12)
        self.assertEqual(payment.amount, order.amount)
        patient_api = APIClient()
        patient_api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        mine = patient_api.get(
            "/api/health-plans/my-subscriptions/",
            HTTP_AUTHORIZATION=f"******",
        )
        self.assertEqual(mine.status_code, 200, mine.data)
        self.assertEqual(mine.data["count"], 1)
        self.assertEqual(mine.data["results"][0]["id"], order.pk)
        self.assertEqual(mine.data["results"][0]["payment"]["reference"], payment.reference)
        self.assertEqual(mine.data["results"][0]["currency"], "INR")
        self.assertEqual(mine.data["results"][0]["transactions"][0]["transaction_id"], payment.pk)

        member = patient_api.post(
            f"/api/health-plans/my-subscriptions/{order.pk}/family/",
            {"name": "Aarav Patient", "relationship": "Child", "email": ""},
            format="json",
            HTTP_AUTHORIZATION=f"******",
        )
        self.assertEqual(member.status_code, 201, member.data)
        updated = patient_api.patch(
            f"/api/health-plans/my-subscriptions/{order.pk}/family/{member.data['id']}/",
            {"name": "Aarav Updated"},
            format="json",
            HTTP_AUTHORIZATION=f"******",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        admin_members = self.api.get(
            f"/api/admin/health-plans/subscriptions/{order.pk}/family/"
        )
        self.assertEqual(admin_members.status_code, 200, admin_members.data)
        self.assertEqual(admin_members.data["results"][0]["name"], "Aarav Updated")
        self.assertEqual(admin_members.data["results"][0]["created_at"], member.data["created_at"])
        removed = patient_api.delete(
            f"/api/health-plans/my-subscriptions/{order.pk}/family/{member.data['id']}/"
        )
        self.assertEqual(removed.status_code, 204)
        admin_members = self.api.get(
            f"/api/admin/health-plans/subscriptions/{order.pk}/family/"
        )
        self.assertEqual(admin_members.data["results"], [])

        other_patient = PlatformUser.objects.create(
            id="other-plan-patient",
            name="Other Patient",
            email="other-plan-patient@example.com",
            role=PlatformUser.Role.PATIENT,
        )
        other_token = jwt.encode(
            {"sub": other_patient.pk, "role": PlatformUser.Role.PATIENT},
            settings.CUSTOMER_JWT_SECRET,
            algorithm="HS256",
        )
        other_api = APIClient()
        other_api.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")
        foreign = other_api.get(
            f"/api/health-plans/my-subscriptions/{order.pk}/family/",
            HTTP_AUTHORIZATION=f"******",
        )
        self.assertEqual(foreign.status_code, 404)

    def test_wallet_credit_and_overdraft_are_validated_and_ledgered(self):
        credited = self.api.post(
            f"/api/admin/orders-payments/wallets/{self.platform_patient.pk}/adjust/",
            {"direction": "credit", "amount": "20.00", "reason": "Wallet test"},
            format="json",
        )
        self.assertEqual(credited.status_code, 200, credited.data)
        overdraft = self.api.post(
            f"/api/admin/orders-payments/wallets/{self.platform_patient.pk}/adjust/",
            {"direction": "debit", "amount": "21.00", "reason": "Too much"},
            format="json",
        )
        self.assertEqual(overdraft.status_code, 400)
        self.platform_patient.refresh_from_db()
        self.assertEqual(self.platform_patient.wallet_balance, Decimal("20.00"))
        self.assertEqual(WalletTransaction.objects.filter(user=self.platform_patient).count(), 1)
        history = self.api.get(
            f"/api/admin/orders-payments/wallets/{self.platform_patient.pk}/transactions/"
        )
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data["results"]), 1)

    def test_revenue_summary_uses_existing_and_ledger_transactions(self):
        appointment = self.make_appointment(Appointment.PaymentStatus.PAID)
        CarePayment.objects.create(
            appointment=appointment,
            patient_id=self.patient.external_id,
            doctor=appointment.doctor,
            amount=appointment.fee,
            kind=CarePayment.Kind.CONSULTATION,
            status=CarePayment.Status.PAID,
        )
        response = self.api.get("/api/admin/orders-payments/revenue/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_collected"], "500.00")
        self.assertEqual(
            response.data["revenue_by_module"]["appointment"], "500.00"
        )
        selected_period = self.api.get(
            f"/api/admin/orders-payments/transactions/?date_from={timezone.localdate().isoformat()}&date_to={timezone.localdate().isoformat()}"
        )
        self.assertEqual(selected_period.data["summary"]["total_collected"], "500.00")
