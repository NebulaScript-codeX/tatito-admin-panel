from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import Appointment, CarePatient
from dashboard.models import PlatformUser

from commerce.models import (
    CommerceRefundRequest,
    CommerceTransaction,
    HealthPlan,
    HealthPlanBenefitUsage,
    HealthPlanCalculatorConfig,
    PlanFamilyMember,
    PlanOrder,
    WalletTransaction,
)
from commerce.services import apply_wallet_change


KEY_PREFIX = "dev-health-plan"


def key(value):
    return f"{KEY_PREFIX}-{value}"


class Command(BaseCommand):
    help = "Seed linked, idempotent Health Plans development records (DEBUG only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Health Plans development data can only be seeded when DEBUG=True.")
        with transaction.atomic():
            plans = self._plans()
            patients = self._patients()
            if not patients:
                raise CommandError(
                    "No existing patient accounts are linked to care patients; seed existing patient data first."
                )
            self._calculator_config()
            orders = self._subscriptions(plans, patients)
            self._family_members(orders)
            self._benefit_usage(orders, patients)
            self._refunds(orders)
        self.stdout.write(self.style.SUCCESS("Health Plans development data is ready."))

    def _plans(self):
        plans = {plan.code: plan for plan in HealthPlan.objects.all()}
        missing = {"starter", "family", "executive", "vip"} - plans.keys()
        if missing:
            raise CommandError(
                "Expected existing shared website plan catalog entries are missing: "
                + ", ".join(sorted(missing))
            )
        return plans

    def _patients(self):
        linked_patients = {}
        for patient in CarePatient.objects.exclude(external_id="").select_related():
            user = PlatformUser.objects.filter(
                pk=patient.external_id,
                role=PlatformUser.Role.PATIENT,
            ).first()
            if user:
                linked_patients[user.name] = (patient, user)
        return linked_patients

    def _calculator_config(self):
        if HealthPlanCalculatorConfig.objects.order_by("id").exists():
            return
        HealthPlanCalculatorConfig.objects.create(
            development_key=key("calculator-default"),
            **{
                "doctor_visits_min": 1,
                "doctor_visits_max": 10,
                "doctor_visits_default": 2,
                "pharmacy_spend_min": 500,
                "pharmacy_spend_max": 10000,
                "pharmacy_spend_step": 250,
                "pharmacy_spend_default": 3000,
                "lab_spend_min": 500,
                "lab_spend_max": 20000,
                "lab_spend_step": 500,
                "lab_spend_default": 4000,
                "consultation_value": Decimal("500.00"),
                "is_development_data": True,
            },
        )

    def _subscriptions(self, plans, patients):
        now = timezone.now()
        definitions = (
            {
                "key": "active-family-ananya",
                "patient": "Ananya Kulkarni",
                "plan": "family",
                "period": PlanOrder.BillingPeriod.MONTHLY,
                "status": PlanOrder.Status.ACTIVE,
                "payment_status": PlanOrder.PaymentStatus.PAID,
                "starts_at": now - timedelta(days=8),
                "ends_at": now + timedelta(days=22),
            },
            {
                "key": "renewed-executive-rohan-old",
                "patient": "Rohan Deshmukh",
                "plan": "executive",
                "period": PlanOrder.BillingPeriod.ANNUAL,
                "status": PlanOrder.Status.EXPIRED,
                "payment_status": PlanOrder.PaymentStatus.PAID,
                "starts_at": now - timedelta(days=400),
                "ends_at": now - timedelta(days=35),
            },
            {
                "key": "renewed-executive-rohan-current",
                "patient": "Rohan Deshmukh",
                "plan": "executive",
                "period": PlanOrder.BillingPeriod.ANNUAL,
                "status": PlanOrder.Status.ACTIVE,
                "payment_status": PlanOrder.PaymentStatus.PAID,
                "starts_at": now - timedelta(days=35),
                "ends_at": now + timedelta(days=330),
                "replaces_key": "renewed-executive-rohan-old",
            },
            {
                "key": "cancelled-starter-aarav",
                "patient": "Aarav Iyer",
                "plan": "starter",
                "period": PlanOrder.BillingPeriod.MONTHLY,
                "status": PlanOrder.Status.CANCELLED,
                "payment_status": PlanOrder.PaymentStatus.PAID,
                "starts_at": now - timedelta(days=55),
                "ends_at": now - timedelta(days=25),
                "cancelled_at": now - timedelta(days=25),
            },
            {
                "key": "pending-refund-vip-meera",
                "patient": "Meera Joshi",
                "plan": "vip",
                "period": PlanOrder.BillingPeriod.MONTHLY,
                "status": PlanOrder.Status.ACTIVE,
                "payment_status": PlanOrder.PaymentStatus.REFUND_PENDING,
                "starts_at": now - timedelta(days=5),
                "ends_at": now + timedelta(days=25),
            },
            {
                "key": "approved-refund-family-kavya",
                "patient": "Kavya Nair",
                "plan": "family",
                "period": PlanOrder.BillingPeriod.MONTHLY,
                "status": PlanOrder.Status.CANCELLED,
                "payment_status": PlanOrder.PaymentStatus.REFUNDED,
                "starts_at": now - timedelta(days=10),
                "ends_at": now + timedelta(days=20),
                "cancelled_at": now - timedelta(days=8),
            },
        )
        orders = {}
        for definition in definitions:
            user_name = definition["patient"]
            if user_name not in patients:
                continue
            patient, user = patients[user_name]
            plan = plans[definition["plan"]]
            amount = (
                plan.annual_monthly_price * 12
                if definition["period"] == PlanOrder.BillingPeriod.ANNUAL
                else plan.monthly_price
            )
            replaces = (
                orders.get(definition["replaces_key"])
                if definition.get("replaces_key")
                else None
            )
            defaults = {
                "plan": plan,
                "patient": patient,
                "platform_user": user,
                "billing_period": definition["period"],
                "amount": amount,
                "status": definition["status"],
                "payment_status": definition["payment_status"],
                "payment_method": "upi",
                "starts_at": definition["starts_at"],
                "ends_at": definition["ends_at"],
                "cancelled_at": definition.get("cancelled_at"),
                "replaces": replaces,
                "is_development_data": True,
            }
            order, _ = PlanOrder.objects.update_or_create(
                development_key=key(definition["key"]),
                defaults=defaults,
            )
            orders[definition["key"]] = order
            self._payment(order, patient, user)
        return orders

    def _payment(self, order, patient, user):
        transaction_row, _ = CommerceTransaction.objects.update_or_create(
            development_key=key(f"payment-{order.development_key.removeprefix(KEY_PREFIX + '-')}"),
            defaults={
                "reference": f"DEV-PLAN-PAY-{order.pk}",
                "kind": CommerceTransaction.Kind.PAYMENT,
                "status": CommerceTransaction.Status.SUCCESSFUL,
                "method": CommerceTransaction.Method.UPI,
                "amount": order.amount,
                "order_type": CommerceTransaction.OrderType.PLAN,
                "order_id": str(order.pk),
                "patient": patient,
                "platform_user": user,
                "plan_order": order,
                "patient_name": patient.name,
                "note": "Development Health Plan payment record.",
                "is_development_data": True,
            },
        )
        if order.payment_status == PlanOrder.PaymentStatus.PENDING:
            transaction_row.status = CommerceTransaction.Status.PENDING
            transaction_row.save(update_fields=["status"])
        return transaction_row

    def _family_members(self, orders):
        subscription = orders.get("active-family-ananya")
        if not subscription or not subscription.plan.maximum_family_members:
            return
        family = (
            ("Ananya's family member - spouse", "Spouse", "ananya.family@example.test"),
            ("Ananya's family member - child", "Child", "ananya.child@example.test"),
        )
        for index, (name, relationship, email) in enumerate(family, start=1):
            PlanFamilyMember.objects.update_or_create(
                development_key=key(f"family-member-ananya-{index}"),
                defaults={
                    "subscription": subscription,
                    "name": name,
                    "relationship": relationship,
                    "email": email,
                    "is_development_data": True,
                },
            )

    def _benefit_usage(self, orders, patients):
        examples = (
            ("active-family-ananya", "consultation", "Ananya Kulkarni", 2),
            ("renewed-executive-rohan-current", "consultation", "Rohan Deshmukh", 1),
            ("renewed-executive-rohan-current", "annual_checkup", "Rohan Deshmukh", 1),
        )
        for order_key, benefit_code, patient_name, count in examples:
            order = orders.get(order_key)
            if not order:
                continue
            period_start = timezone.localdate().replace(
                month=1, day=1
            ) if benefit_code == "annual_checkup" else timezone.localdate().replace(day=1)
            appointments = (
                list(
                    Appointment.objects.filter(
                        patient=order.patient,
                        status=Appointment.Status.COMPLETED,
                        payment_status=Appointment.PaymentStatus.PAID,
                        date__gte=order.starts_at.date(),
                    ).order_by("date", "start_time")[:count]
                )
                if benefit_code == "consultation"
                else []
            )
            for index in range(1, count + 1):
                appointment = appointments[index - 1] if len(appointments) >= index else None
                HealthPlanBenefitUsage.objects.update_or_create(
                    development_key=key(f"usage-{order_key}-{benefit_code}-{index}"),
                    defaults={
                        "subscription": order,
                        "benefit_code": benefit_code,
                        "quantity": 1,
                        "period_start": period_start,
                        "source_type": "appointment" if appointment else "development",
                        "source_id": (
                            str(appointment.pk)
                            if appointment
                            else key(f"source-{order_key}-{benefit_code}-{index}")
                        ),
                        "detail": (
                            f"Completed consultation for {patient_name}."
                            if appointment
                            else f"Development usage example for {patient_name}."
                        ),
                        "is_development_data": True,
                    },
                )

    def _refunds(self, orders):
        examples = (
            ("pending-refund-vip-meera", CommerceRefundRequest.Status.PENDING, "refund-pending", False),
            ("approved-refund-family-kavya", CommerceRefundRequest.Status.APPROVED, "refund-approved", True),
        )
        for order_key, status, refund_key, credit_wallet in examples:
            order = orders.get(order_key)
            if not order:
                continue
            payment = CommerceTransaction.objects.get(
                plan_order=order,
                kind=CommerceTransaction.Kind.PAYMENT,
            )
            request, _ = CommerceRefundRequest.objects.update_or_create(
                development_key=key(refund_key),
                defaults={
                    "transaction": payment,
                    "status": status,
                    "amount": order.amount,
                    "reason": "Development example: patient requested a refund within 30 days.",
                    "destination": (
                        CommerceRefundRequest.Destination.WALLET
                        if credit_wallet
                        else ""
                    ),
                    "rejection_reason": "",
                    "reviewed_at": timezone.now() if credit_wallet else None,
                    "is_development_data": True,
                },
            )
            if not credit_wallet:
                continue
            user = order.platform_user
            refund, _ = CommerceTransaction.objects.update_or_create(
                development_key=key("refund-approved-kavya"),
                defaults={
                    "reference": f"DEV-PLAN-REF-{order.pk}",
                    "kind": CommerceTransaction.Kind.REFUND,
                    "status": CommerceTransaction.Status.SUCCESSFUL,
                    "method": CommerceTransaction.Method.WALLET,
                    "amount": order.amount,
                    "order_type": CommerceTransaction.OrderType.PLAN,
                    "order_id": str(order.pk),
                    "patient": order.patient,
                    "platform_user": user,
                    "plan_order": order,
                    "patient_name": order.patient.name,
                    "original_transaction": payment,
                    "note": "Development Health Plan refund credited to patient wallet.",
                    "is_development_data": True,
                },
            )
            if not WalletTransaction.objects.filter(refund_request=request).exists():
                apply_wallet_change(
                    user,
                    WalletTransaction.Direction.CREDIT,
                    request.amount,
                    "Health Plan 30-day refund",
                    refund_request=request,
                )
                wallet_entry = WalletTransaction.objects.get(refund_request=request)
                wallet_entry.development_key = key("wallet-refund-kavya")
                wallet_entry.is_development_data = True
                wallet_entry.save(update_fields=["development_key", "is_development_data"])
            refund.save(update_fields=["updated_at"])
