from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from uuid import UUID, uuid4

import jwt
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from care.models import Appointment, CarePayment, RefundRequest
from dashboard.models import PlatformUser
from health_records.models import LabBooking
from lab_tests.models import ScanBooking
from pharmacy.models import PharmacyOrder, PharmacyRefund

from .models import (
    CommerceRefundRequest,
    CommerceTransaction,
    HealthPlan,
    HealthPlanBenefitUsage,
    HealthPlanCalculatorConfig,
    PlanFamilyMember,
    PlanOrder,
    PlanSubscriptionChange,
    WalletTransaction,
)
from .plans import (
    expire_plan_subscriptions,
    plan_public_row,
    subscription_end,
    subscription_usage,
    validate_plan_family_member,
)
from .services import (
    apply_wallet_change,
    build_order_detail,
    build_orders,
    build_transactions,
    ensure_refund_for_cancelled_order,
    platform_user_for_patient,
    refund_sources,
    resolve_patient,
)
from .subscription_lifecycle import (
    complete_subscription_change,
    fail_subscription_change,
    record_subscription_history,
    subscription_snapshot,
)


def _decimal(value, field="amount"):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field: "Enter a valid amount."})
    if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
        raise ValidationError({field: "Amount must be positive with at most two decimal places."})
    return amount.quantize(Decimal("0.01"))


def _patient_account_from_request(request):
    header = request.headers.get("Authorization", "")
    token = header[7:].strip() if header.startswith("Bearer ") else ""
    if not token:
        raise AuthenticationFailed("Sign in with your patient account to view health plan details.")
    try:
        payload = jwt.decode(
            token,
            settings.CUSTOMER_JWT_SECRET,
            algorithms=["HS256"],
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Your patient session is invalid or expired.") from exc
    if payload.get("role") != PlatformUser.Role.PATIENT:
        raise PermissionDenied("Only patient accounts can view health plan details.")
    return get_object_or_404(
        PlatformUser,
        pk=str(payload.get("sub") or ""),
        role=PlatformUser.Role.PATIENT,
        is_active=True,
        is_blocked=False,
    )


def _date_bound(value, end=False):
    if not value:
        return None
    try:
        parsed = date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError({"date": "Use YYYY-MM-DD for date filters."})
    local_tz = timezone.get_current_timezone()
    boundary = datetime.combine(
        parsed + (timedelta(days=1) if end else timedelta()), time.min
    )
    return timezone.make_aware(boundary, local_tz)


def _filtered_orders(params):
    rows = build_orders()
    order_type = params.get("type")
    payment_status = params.get("payment_status")
    start = _date_bound(params.get("date_from"))
    end = _date_bound(params.get("date_to"), end=True)
    if order_type:
        rows = [row for row in rows if row["type"] == order_type]
    if payment_status:
        rows = [row for row in rows if row["payment_status"] == payment_status]
    if start:
        rows = [
            row for row in rows
            if datetime.fromisoformat(row["date"]) >= start
        ]
    if end:
        rows = [
            row for row in rows
            if datetime.fromisoformat(row["date"]) < end
        ]
    return rows


def _filtered_transactions(params):
    rows = build_transactions()
    if params.get("type"):
        rows = [row for row in rows if row["order_type"] == params["type"]]
    if params.get("status"):
        rows = [row for row in rows if row["status"] == params["status"]]
    if params.get("date_from"):
        start = _date_bound(params["date_from"])
        rows = [row for row in rows if datetime.fromisoformat(row["date"]) >= start]
    if params.get("date_to"):
        end = _date_bound(params["date_to"], end=True)
        rows = [row for row in rows if datetime.fromisoformat(row["date"]) < end]
    return rows


def _summaries(rows):
    collected = sum(
        (Decimal(row["amount"]) for row in rows if row["kind"] == "payment" and row["status"] == "successful"),
        Decimal("0.00"),
    )
    pending = sum(
        (Decimal(row["amount"]) for row in rows if row["kind"] == "payment" and row["status"] == "pending"),
        Decimal("0.00"),
    )
    refunded = sum(
        (Decimal(row["amount"]) for row in rows if row["kind"] == "refund" and row["status"] == "successful"),
        Decimal("0.00"),
    )
    by_module = {}
    for row in rows:
        if row["kind"] != "payment" or row["status"] != "successful":
            continue
        by_module[row["order_type"]] = str(
            Decimal(by_module.get(row["order_type"], "0.00")) + Decimal(row["amount"])
        )
    return {
        "total_collected": str(collected),
        "pending": str(pending),
        "refunded": str(refunded),
        "revenue_by_module": by_module,
    }


def _get_order(type_name, order_id):
    return next(
        (row for row in build_orders() if row["type"] == type_name and row["id"] == str(order_id)),
        None,
    )


def _create_care_payment(appointment, amount, method):
    payment, created = CarePayment.objects.get_or_create(
        appointment=appointment,
        defaults={
            "doctor": appointment.doctor,
            "patient_id": appointment.patient.external_id,
            "amount": amount,
            "kind": CarePayment.Kind.CONSULTATION,
            "status": CarePayment.Status.PENDING,
            "payment_method": method,
        },
    )
    if not created and payment.status == CarePayment.Status.PAID:
        raise ValidationError({"order_id": "This appointment is already paid."})
    return payment


def _sync_transaction_status(entry):
    if entry.kind != CommerceTransaction.Kind.PAYMENT:
        return
    paid = entry.status == CommerceTransaction.Status.SUCCESSFUL
    failed = entry.status == CommerceTransaction.Status.FAILED
    subscription_change = (
        PlanSubscriptionChange.objects.select_for_update()
        .select_related("subscription", "target_plan")
        .filter(transaction=entry, status=PlanSubscriptionChange.Status.PENDING)
        .first()
        if entry.order_type == CommerceTransaction.OrderType.PLAN
        else None
    )
    if subscription_change:
        if paid:
            complete_subscription_change(subscription_change, entry)
        elif failed:
            fail_subscription_change(subscription_change, entry)
        return
    order = _get_order(entry.order_type, entry.order_id) if entry.order_id else None
    if paid and order and str(order.get("status", "")).lower() in {"cancelled", "canceled"}:
        raise ValidationError({"status": "A cancelled order cannot be paid."})
    if entry.order_type == CommerceTransaction.OrderType.PHARMACY and entry.order_id.isdigit():
        order = PharmacyOrder.objects.select_for_update().filter(pk=entry.order_id).first()
        if order:
            order.payment_status = (
                PharmacyOrder.PaymentStatus.PAID
                if paid
                else PharmacyOrder.PaymentStatus.FAILED
                if failed
                else PharmacyOrder.PaymentStatus.PENDING
            )
            order.payment_method = entry.method
            if paid and not order.invoice_number:
                order.invoice_number = f"INV-PH-{order.pk:08d}"
                order.invoice_issued_at = timezone.now()
            order.save(
                update_fields=[
                    "payment_status",
                    "payment_method",
                    "invoice_number",
                    "invoice_issued_at",
                    "updated_at",
                ]
            )
    elif entry.order_type == CommerceTransaction.OrderType.APPOINTMENT:
        appointment = Appointment.objects.select_for_update().filter(pk=entry.order_id).first()
        if appointment:
            payment = CarePayment.objects.select_for_update().filter(
                appointment=appointment
            ).first()
            if payment:
                payment.status = (
                    CarePayment.Status.PAID
                    if paid
                    else CarePayment.Status.FAILED
                    if failed
                    else CarePayment.Status.PENDING
                )
                payment.payment_method = entry.method
                payment.save(update_fields=["status", "payment_method"])
            appointment.payment_status = (
                Appointment.PaymentStatus.PAID
                if paid
                else Appointment.PaymentStatus.FAILED
                if failed
                else Appointment.PaymentStatus.PENDING
            )
            appointment.save(update_fields=["payment_status", "updated_at"])
    elif entry.order_type == CommerceTransaction.OrderType.PLAN:
        order = PlanOrder.objects.select_for_update().filter(pk=entry.order_id).first()
        if order:
            if paid and order.status == PlanOrder.Status.CANCELLED:
                raise ValidationError({"status": "A cancelled order cannot be paid."})
            before = subscription_snapshot(order) if paid else None
            if paid:
                started_at = timezone.now()
                if order.replaces_id:
                    PlanOrder.objects.select_for_update().filter(
                        pk=order.replaces_id,
                        status=PlanOrder.Status.ACTIVE,
                    ).update(
                        status=PlanOrder.Status.CANCELLED,
                        cancelled_at=started_at,
                        updated_at=started_at,
                    )
                order.status = PlanOrder.Status.ACTIVE
                order.starts_at = started_at
                order.ends_at = subscription_end(started_at, order.billing_period)
            order.payment_status = (
                PlanOrder.PaymentStatus.PAID
                if paid
                else PlanOrder.PaymentStatus.FAILED
                if failed
                else PlanOrder.PaymentStatus.PENDING
            )
            order.payment_method = entry.method
            order.save(
                update_fields=[
                    "status",
                    "payment_status",
                    "payment_method",
                    "starts_at",
                    "ends_at",
                    "updated_at",
                ]
            )
            if paid:
                order.refresh_from_db()
                record_subscription_history(
                    order,
                    "purchase_completed",
                    {
                        "before": before,
                        "after": subscription_snapshot(order),
                        "transaction_id": entry.pk,
                        "transaction_reference": entry.reference,
                        "payment_status": entry.status,
                    },
                )


def _source_relation_fields(order_type, order_id):
    source_models = {
        CommerceTransaction.OrderType.PHARMACY: ("pharmacy_order", PharmacyOrder),
        CommerceTransaction.OrderType.APPOINTMENT: ("appointment", Appointment),
        CommerceTransaction.OrderType.LAB: ("lab_booking", LabBooking),
        CommerceTransaction.OrderType.SCAN: ("scan_booking", ScanBooking),
        CommerceTransaction.OrderType.PLAN: ("plan_order", PlanOrder),
    }
    source = source_models.get(order_type)
    if source is None:
        return {}
    field_name, model = source
    if not model.objects.filter(pk=order_id).exists():
        return {}
    return {f"{field_name}_id": order_id}


def _transaction_from_order(request, data):
    order_type = str(data.get("order_type") or "manual")
    allowed = {choice for choice, _ in CommerceTransaction.OrderType.choices}
    if order_type not in allowed:
        raise ValidationError({"order_type": "Select a supported order type."})
    amount = _decimal(data.get("amount"))
    method = data.get("method")
    if method not in {choice for choice, _ in CommerceTransaction.Method.choices}:
        raise ValidationError({"method": "Select a supported payment method."})
    patient_id = data.get("patient_id")
    patient = resolve_patient(patient_id)
    platform_user = (
        PlatformUser.objects.filter(
            pk=str(patient_id or ""),
            role=PlatformUser.Role.PATIENT,
            is_active=True,
            is_blocked=False,
        ).first()
        if patient_id
        else None
    )
    platform_user = platform_user or platform_user_for_patient(patient)
    if patient is None and platform_user:
        patient = resolve_patient(platform_user.pk)
    patient_name = str(data.get("patient_name") or "").strip()
    order_id = str(data.get("order_id") or "").strip()
    note = str(data.get("note") or "").strip()

    if order_type == CommerceTransaction.OrderType.PLAN and not order_id:
        plan_code = str(data.get("plan_code") or "").strip()
        period = str(data.get("billing_period") or "")
        plan = get_object_or_404(HealthPlan, code=plan_code, is_active=True)
        if patient is None and platform_user is None:
            raise ValidationError({"patient_id": "Select the patient for this plan order."})
        if period not in PlanOrder.BillingPeriod.values:
            raise ValidationError({"billing_period": "Select monthly or annual billing."})
        monthly = plan.annual_monthly_price if period == "annual" else plan.monthly_price
        expected = monthly * (12 if period == "annual" else 1)
        if amount != expected:
            raise ValidationError({"amount": "The amount must match the selected plan price."})
        order = PlanOrder.objects.create(
            plan=plan,
            patient=patient,
            platform_user=platform_user or platform_user_for_patient(patient),
            billing_period=period,
            amount=amount,
            payment_method=method,
            is_development_data=False,
        )
        platform_user = order.platform_user
        order_id = str(order.pk)
        patient_name = (
            patient.name if patient else platform_user.name if platform_user else patient_name
        )
    elif order_type != CommerceTransaction.OrderType.MANUAL:
        if not order_id:
            raise ValidationError({"order_id": "Choose an existing order."})
        order = _get_order(order_type, order_id)
        if order is None:
            raise ValidationError({"order_id": "The selected order was not found."})
        if patient and str(order["patient_id"]) != str(patient.pk):
            raise ValidationError({"patient_id": "Patient does not match the selected order."})
        if platform_user:
            order_patient = resolve_patient(order["patient_id"])
            order_platform_user = platform_user_for_patient(order_patient)
            if order_platform_user and order_platform_user.pk != platform_user.pk:
                raise ValidationError({"patient_id": "Patient does not match the selected order."})
            if not order_platform_user and not patient and str(order["patient_id"]) != str(platform_user.pk):
                raise ValidationError({"patient_id": "Patient does not match the selected order."})
        if amount != Decimal(order["amount"]):
            raise ValidationError({"amount": "Payment must match the order total."})
        if order["payment_status"] in {"paid", "refunded", "refund_pending"}:
            raise ValidationError({"order_id": "This order cannot accept another payment."})
        if CommerceTransaction.objects.filter(
            order_type=order_type,
            order_id=order_id,
            kind=CommerceTransaction.Kind.PAYMENT,
            status__in=(
                CommerceTransaction.Status.PENDING,
                CommerceTransaction.Status.SUCCESSFUL,
            ),
        ).exists():
            raise ValidationError({"order_id": "A payment is already pending for this order."})
        patient = resolve_patient(order["patient_id"])
        if order_type == CommerceTransaction.OrderType.PLAN:
            plan_order = PlanOrder.objects.select_related("platform_user").filter(
                pk=order_id
            ).first()
            platform_user = plan_order.platform_user if plan_order else None
        else:
            platform_user = platform_user_for_patient(patient)
        patient_name = order["patient_name"]
        if order_type == CommerceTransaction.OrderType.APPOINTMENT:
            _create_care_payment(Appointment.objects.get(pk=order_id), amount, method)

    if not patient_name and not patient and not platform_user:
        raise ValidationError({"patient_name": "Select a patient or enter a patient name."})
    entry = CommerceTransaction.objects.create(
        reference=f"TX-{uuid4().hex[:14].upper()}",
        kind=CommerceTransaction.Kind.PAYMENT,
        status=CommerceTransaction.Status.PENDING,
        method=method,
        amount=amount,
        order_type=order_type,
        order_id=order_id,
        patient=patient,
        platform_user=platform_user or platform_user_for_patient(patient),
        patient_name=patient_name
        or (patient.name if patient else "")
        or (platform_user.name if platform_user else ""),
        note=note,
        created_by=request.user,
        is_development_data=False,
        **_source_relation_fields(order_type, order_id),
    )
    return entry


class CommerceOrdersView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        rows = _filtered_orders(request.query_params)
        return Response({"results": rows, "count": len(rows)})


class CommerceOrderDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request, order_type, order_id):
        detail = build_order_detail(order_type, order_id)
        if detail is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(detail)


class CommerceTransactionsView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        rows = _filtered_transactions(request.query_params)
        return Response(
            {"results": rows, "count": len(rows), "summary": _summaries(rows)}
        )

    def post(self, request):
        with transaction.atomic():
            entry = _transaction_from_order(request, request.data)
        return Response(
            {"success": True, "transaction": _transaction_row(entry)},
            status=status.HTTP_201_CREATED,
        )


def _transaction_row(entry):
    return {
        "id": str(entry.pk),
        "reference": entry.reference,
        "order_type": entry.order_type,
        "order_id": entry.order_id,
        "patient_name": entry.patient_name or getattr(entry.patient, "name", ""),
        "method": entry.method,
        "amount": str(entry.amount),
        "status": entry.status,
        "kind": entry.kind,
        "date": entry.created_at.isoformat(),
        "note": entry.note,
    }


class CommerceTransactionStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"
    action_map = {"post": "edit"}

    def post(self, request, transaction_id, target):
        target = target.lower()
        if target not in {CommerceTransaction.Status.SUCCESSFUL, CommerceTransaction.Status.FAILED}:
            raise ValidationError({"status": "Only paid or failed are supported."})
        with transaction.atomic():
            entry = get_object_or_404(
                CommerceTransaction.objects.select_for_update(), pk=transaction_id
            )
            if entry.kind != CommerceTransaction.Kind.PAYMENT:
                raise ValidationError({"status": "Refund transactions cannot be changed."})
            if entry.status == CommerceTransaction.Status.SUCCESSFUL:
                raise ValidationError({"status": "A successful payment cannot be changed."})
            entry.status = target
            entry.save(update_fields=["status", "updated_at"])
            _sync_transaction_status(entry)
        return Response({"success": True, "transaction": _transaction_row(entry)})


class CommerceSourceTransactionStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"
    action_map = {"post": "edit"}

    def post(self, request, source, transaction_id, target):
        target = target.lower()
        if target not in {CommerceTransaction.Status.SUCCESSFUL, CommerceTransaction.Status.FAILED}:
            raise ValidationError({"status": "Only paid or failed are supported."})

        with transaction.atomic():
            if source == "care":
                try:
                    payment_id = UUID(transaction_id)
                except (TypeError, ValueError, AttributeError):
                    raise ValidationError({"transaction_id": "Invalid appointment payment ID."})
                payment = get_object_or_404(
                    CarePayment.objects.select_for_update().select_related("appointment"),
                    pk=payment_id,
                    kind=CarePayment.Kind.CONSULTATION,
                )
                if not payment.appointment_id:
                    raise ValidationError({"transaction_id": "This payment is not linked to an appointment."})
                if payment.status == CarePayment.Status.REFUNDED:
                    raise ValidationError({"status": "A refunded payment cannot be changed."})
                if (
                    target == CommerceTransaction.Status.SUCCESSFUL
                    and payment.appointment.status == Appointment.Status.CANCELLED
                ):
                    raise ValidationError({"status": "A cancelled appointment cannot be paid."})
                payment.status = (
                    CarePayment.Status.PAID
                    if target == CommerceTransaction.Status.SUCCESSFUL
                    else CarePayment.Status.FAILED
                )
                payment.save(update_fields=["status"])
                appointment = payment.appointment
                appointment.payment_status = (
                    Appointment.PaymentStatus.PAID
                    if target == CommerceTransaction.Status.SUCCESSFUL
                    else Appointment.PaymentStatus.FAILED
                )
                appointment.save(update_fields=["payment_status", "updated_at"])
            elif source == "pharmacy":
                if not transaction_id.isdigit():
                    raise ValidationError({"transaction_id": "Invalid pharmacy order ID."})
                order = get_object_or_404(
                    PharmacyOrder.objects.select_for_update().select_related("patient"),
                    pk=transaction_id,
                )
                if order.payment_status in {
                    PharmacyOrder.PaymentStatus.REFUNDED,
                    PharmacyOrder.PaymentStatus.REFUND_PENDING,
                }:
                    raise ValidationError({"status": "A refunded payment cannot be changed."})
                if (
                    target == CommerceTransaction.Status.SUCCESSFUL
                    and order.status == PharmacyOrder.Status.CANCELLED
                ):
                    raise ValidationError({"status": "A cancelled order cannot be paid."})
                order.payment_status = (
                    PharmacyOrder.PaymentStatus.PAID
                    if target == CommerceTransaction.Status.SUCCESSFUL
                    else PharmacyOrder.PaymentStatus.FAILED
                )
                if target == CommerceTransaction.Status.SUCCESSFUL and not order.invoice_number:
                    order.invoice_number = f"INV-PH-{order.pk:08d}"
                    order.invoice_issued_at = timezone.now()
                order.save(
                    update_fields=[
                        "payment_status",
                        "invoice_number",
                        "invoice_issued_at",
                        "updated_at",
                    ]
                )
            else:
                raise ValidationError({"source": "Unsupported transaction source."})

        return Response(
            {
                "success": True,
                "source": source,
                "transaction_id": transaction_id,
                "status": target,
            }
        )


class CommerceRevenueView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        rows = _filtered_transactions(request.query_params)
        return Response(_summaries(rows))


class CommerceRefundsView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        return Response({"results": refund_sources()})


def _refund_transaction(source_type, source_id, amount, method, patient, patient_name, actor):
    original = CommerceTransaction.objects.filter(
        order_type=source_type,
        order_id=str(source_id),
        kind=CommerceTransaction.Kind.PAYMENT,
        status=CommerceTransaction.Status.SUCCESSFUL,
    ).order_by("-created_at").first()
    return CommerceTransaction.objects.create(
        reference=f"RF-{uuid4().hex[:14].upper()}",
        kind=CommerceTransaction.Kind.REFUND,
        status=CommerceTransaction.Status.SUCCESSFUL,
        method=method,
        amount=amount,
        order_type=source_type,
        order_id=str(source_id),
        patient=patient,
        platform_user=original.platform_user if original else platform_user_for_patient(patient),
        patient_name=patient_name
        or (original.patient_name if original else "")
        or (original.platform_user.name if original and original.platform_user_id else ""),
        original_transaction=original,
        note="Refund approved",
        created_by=actor,
        is_development_data=False,
        **_source_relation_fields(source_type, source_id),
    )


def _ensure_legacy_payment_transaction(source, item, actor):
    if source == "care":
        order_type = CommerceTransaction.OrderType.APPOINTMENT
        order_id = str(item.appointment_id)
        patient = item.appointment.patient
        amount = item.payment.amount
        method = item.payment.payment_method
        paid_at = item.payment.created_at
        patient_name = patient.name
    else:
        order_type = CommerceTransaction.OrderType.PHARMACY
        order_id = str(item.order_id)
        patient = item.order.patient
        amount = item.order.total
        method = item.order.payment_method
        paid_at = item.order.created_at
        patient_name = patient.name

    existing = CommerceTransaction.objects.filter(
        order_type=order_type,
        order_id=order_id,
        kind=CommerceTransaction.Kind.PAYMENT,
        status=CommerceTransaction.Status.SUCCESSFUL,
    ).first()
    if existing:
        return existing

    entry = CommerceTransaction.objects.create(
        reference=f"TX-{uuid4().hex[:14].upper()}",
        kind=CommerceTransaction.Kind.PAYMENT,
        status=CommerceTransaction.Status.SUCCESSFUL,
        method=_commerce_method(method),
        amount=amount,
        order_type=order_type,
        order_id=order_id,
        patient=patient,
        platform_user=platform_user_for_patient(patient),
        patient_name=patient_name,
        note=f"Synchronized from the existing {source} payment record.",
        created_by=actor,
        is_development_data=False,
        **_source_relation_fields(order_type, order_id),
    )
    CommerceTransaction.objects.filter(pk=entry.pk).update(created_at=paid_at)
    return entry


class CommerceRefundActionView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"
    action_map = {"post": "edit"}

    def post(self, request, source, refund_id, action):
        action = action.lower()
        if action not in {"approve", "reject"}:
            raise ValidationError({"action": "Choose approve or reject."})
        reason = str(request.data.get("reason") or "").strip()
        destination = str(request.data.get("destination") or "")
        if action == "reject" and not reason:
            raise ValidationError({"reason": "A rejection reason is required."})
        if action == "approve" and destination not in CommerceRefundRequest.Destination.values:
            raise ValidationError({"destination": "Choose the original method or patient wallet."})

        with transaction.atomic():
            item, order_type, order_id, patient, amount, payment_method = _lock_refund(
                source, refund_id
            )
            if item.status != "pending":
                raise ValidationError({"status": "Only pending refunds can be reviewed."})
            if (
                action == "approve"
                and source == "commerce"
                and item.transaction.order_type == CommerceTransaction.OrderType.PLAN
            ):
                destination = CommerceRefundRequest.Destination.WALLET
            if action == "reject":
                _reject_refund(source, item, reason, request.user)
                return Response({"success": True, "refund": {"id": str(refund_id), "status": "rejected"}})

            if source in {"care", "pharmacy"}:
                _ensure_legacy_payment_transaction(source, item, request.user)
                _approve_legacy_refund(source, item, destination, request.user)
            else:
                _approve_commerce_refund(item, destination, request.user)

            payment_method = (
                CommerceTransaction.Method.WALLET
                if destination == CommerceRefundRequest.Destination.WALLET
                else payment_method
            )
            _refund_transaction(
                order_type,
                order_id,
                amount,
                _commerce_method(payment_method),
                patient,
                patient.name if patient else "",
                request.user,
            )
        return Response(
            {
                "success": True,
                "refund": {
                    "id": str(refund_id),
                    "status": "approved",
                    "destination": destination,
                },
            }
        )


def _lock_refund(source, refund_id):
    if source == "care":
        item = get_object_or_404(
            RefundRequest.objects.select_for_update().select_related(
                "appointment", "appointment__patient", "payment"
            ),
            pk=refund_id,
        )
        return (
            item,
            "appointment",
            str(item.appointment_id),
            item.appointment.patient,
            item.amount,
            item.payment.payment_method,
        )
    if source == "pharmacy":
        item = get_object_or_404(
            PharmacyRefund.objects.select_for_update().select_related(
                "order", "order__patient"
            ),
            pk=refund_id,
        )
        return (
            item,
            "pharmacy",
            str(item.order_id),
            item.order.patient,
            item.amount,
            item.order.payment_method,
        )
    if source == "commerce":
        item = get_object_or_404(
            CommerceRefundRequest.objects.select_for_update().select_related(
                "transaction", "transaction__patient", "transaction__platform_user"
            ),
            pk=refund_id,
        )
        original = item.transaction
        return (
            item,
            original.order_type,
            original.order_id,
            original.patient,
            item.amount,
            original.method,
        )
    raise ValidationError({"source": "Unsupported refund source."})


def _wallet_credit(patient, amount, reason, actor, refund_item, platform_user=None):
    user = platform_user or platform_user_for_patient(patient)
    if user is None:
        raise ValidationError(
            {"patient": "This patient has no linked platform wallet; no refund was processed."}
        )
    try:
        apply_wallet_change(
            user,
            "credit",
            amount,
            reason,
            actor=actor,
            refund_request=refund_item if isinstance(refund_item, CommerceRefundRequest) else None,
        )
    except ValueError as exc:
        raise ValidationError({"wallet": str(exc)}) from exc


def _approve_legacy_refund(source, item, destination, actor):
    if source == "care":
        if item.payment.status != CarePayment.Status.PAID or item.amount != item.payment.amount:
            raise ValidationError({"payment": "The linked payment is not fully refundable."})
        _wallet_credit(
            item.appointment.patient,
            item.amount,
            f"Refund for AP-{str(item.appointment_id)[:8].upper()}",
            actor,
            item,
        ) if destination == CommerceRefundRequest.Destination.WALLET else None
        item.status = RefundRequest.Status.APPROVED
        item.destination = destination
        item.reviewed_at = timezone.now()
        item.reviewed_by = str(actor.pk)
        item.save(update_fields=["status", "destination", "reviewed_at", "reviewed_by"])
        item.payment.status = CarePayment.Status.REFUNDED
        item.payment.save(update_fields=["status"])
        item.appointment.payment_status = Appointment.PaymentStatus.REFUNDED
        item.appointment.save(update_fields=["payment_status", "updated_at"])
    else:
        if item.order.payment_status != PharmacyOrder.PaymentStatus.REFUND_PENDING:
            raise ValidationError({"payment": "The linked order is not awaiting a refund."})
        if item.amount != item.order.total:
            raise ValidationError({"amount": "Partial pharmacy refunds are not supported."})
        _wallet_credit(
            item.order.patient,
            item.amount,
            f"Refund for {item.order.order_number}",
            actor,
            item,
        ) if destination == CommerceRefundRequest.Destination.WALLET else None
        item.status = PharmacyRefund.Status.COMPLETED
        item.destination = destination
        item.rejection_reason = ""
        item.save(update_fields=["status", "destination", "rejection_reason", "updated_at"])
        item.order.payment_status = PharmacyOrder.PaymentStatus.REFUNDED
        item.order.save(update_fields=["payment_status", "updated_at"])


def _approve_commerce_refund(item, destination, actor):
    original = item.transaction
    if original.kind != CommerceTransaction.Kind.PAYMENT or original.status != CommerceTransaction.Status.SUCCESSFUL:
        raise ValidationError({"payment": "The linked payment is not refundable."})
    if item.amount != original.amount:
        raise ValidationError({"amount": "Partial refunds are not supported."})
    _wallet_credit(
        original.patient,
        item.amount,
        f"Refund for {original.order_type} order {original.order_id}",
        actor,
        item,
        platform_user=original.platform_user,
    ) if destination == CommerceRefundRequest.Destination.WALLET else None
    item.status = CommerceRefundRequest.Status.APPROVED
    item.destination = destination
    item.reviewed_by = actor
    item.reviewed_at = timezone.now()
    item.save(update_fields=["status", "destination", "reviewed_by", "reviewed_at"])
    if original.order_type == "plan":
        PlanOrder.objects.filter(pk=original.order_id).update(
            status=PlanOrder.Status.CANCELLED,
            cancelled_at=timezone.now(),
            payment_status=PlanOrder.PaymentStatus.REFUNDED,
            updated_at=timezone.now(),
        )


def _reject_refund(source, item, reason, actor):
    item.status = "rejected"
    if source == "care":
        item.rejection_reason = reason
        item.reviewed_at = timezone.now()
        item.reviewed_by = str(actor.pk)
        item.save(update_fields=["status", "rejection_reason", "reviewed_at", "reviewed_by"])
    elif source == "pharmacy":
        item.status = PharmacyRefund.Status.REJECTED
        item.rejection_reason = reason
        item.save(update_fields=["status", "rejection_reason", "updated_at"])
        item.order.payment_status = PharmacyOrder.PaymentStatus.PAID
        item.order.save(update_fields=["payment_status", "updated_at"])
    else:
        item.rejection_reason = reason
        item.reviewed_at = timezone.now()
        item.reviewed_by = actor
        item.save(update_fields=["status", "rejection_reason", "reviewed_at", "reviewed_by"])
        if item.transaction.order_type == CommerceTransaction.OrderType.PLAN:
            PlanOrder.objects.filter(pk=item.transaction.order_id).update(
                payment_status=PlanOrder.PaymentStatus.PAID,
                updated_at=timezone.now(),
            )


class CommerceInvoicesView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        rows = [
            row
            for row in build_orders()
            if row["payment_status"] == "paid"
        ]
        return Response(
            {
                "results": [
                    {
                        **row,
                        "invoice_number": _invoice_number(row),
                    }
                    for row in rows
                ]
            }
        )


def _invoice_number(order):
    if order["type"] == "pharmacy":
        source = PharmacyOrder.objects.filter(pk=order["id"]).first()
        if source:
            if not source.invoice_number:
                source.invoice_number = f"INV-PH-{source.pk:08d}"
                source.invoice_issued_at = timezone.now()
                source.save(update_fields=["invoice_number", "invoice_issued_at", "updated_at"])
            return source.invoice_number
    prefix = {"appointment": "AP", "lab": "LB", "scan": "SC", "plan": "PL"}.get(
        order["type"], "TX"
    )
    return f"INV-{prefix}-{order['id']}"


def _commerce_method(value):
    value = str(value or "").lower()
    if value in {"cash_on_delivery", "cod"}:
        return CommerceTransaction.Method.CASH
    if value in {choice for choice, _ in CommerceTransaction.Method.choices}:
        return value
    return CommerceTransaction.Method.OTHER


class CommerceWalletsView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        users = PlatformUser.objects.filter(
            role=PlatformUser.Role.PATIENT
        ).order_by("name", "id")
        rows = []
        for user in users:
            patient = resolve_patient(user.pk)
            rows.append(
                {
                    "id": str(user.pk),
                    "patient_id": str(patient.pk) if patient else str(user.pk),
                    "name": user.name,
                    "phone": user.mobile,
                    "email": user.email,
                    "balance": str(user.wallet_balance),
                }
            )
        return Response({"results": rows})

    def post(self, request, user_id=None):
        if user_id is None:
            raise ValidationError({"user_id": "Select a patient wallet."})
        direction = str(request.data.get("direction") or "")
        if direction not in {"credit", "debit"}:
            raise ValidationError({"direction": "Choose credit or debit."})
        amount = _decimal(request.data.get("amount"))
        reason = str(request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Reason is required."})
        user = get_object_or_404(
            PlatformUser.objects.filter(role=PlatformUser.Role.PATIENT), pk=user_id
        )
        try:
            user, _entry = apply_wallet_change(
                user, direction, amount, reason, actor=request.user
            )
        except ValueError as exc:
            raise ValidationError({"wallet": str(exc)}) from exc
        return Response({"success": True, "user_id": str(user.pk), "balance": str(user.wallet_balance)})


class CommerceWalletHistoryView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request, user_id):
        user = get_object_or_404(
            PlatformUser.objects.filter(role=PlatformUser.Role.PATIENT), pk=user_id
        )
        def history_key(direction, amount, reason):
            try:
                normalized_amount = str(Decimal(str(amount)).quantize(Decimal("0.01")))
            except (InvalidOperation, TypeError, ValueError):
                normalized_amount = str(amount)
            return str(direction), normalized_amount, str(reason or "")

        entries = [
            {
                "id": str(row.pk),
                "direction": row.direction,
                "amount": str(row.amount),
                "balance_after": str(row.balance_after),
                "reason": row.reason,
                "date": row.created_at.isoformat(),
            }
            for row in WalletTransaction.objects.filter(user=user)
        ]
        legacy = user.wallet_transactions or []
        recorded = {
            history_key(row["direction"], row["amount"], row["reason"])
            for row in entries
        }
        if isinstance(legacy, list):
            for index, item in enumerate(legacy):
                if not isinstance(item, dict):
                    continue
                key = history_key(
                    item.get("type", ""), item.get("amount", ""), item.get("reason", "")
                )
                if key in recorded:
                    continue
                recorded.add(key)
                entries.append({
                    "id": f"legacy-{index}",
                    "direction": item.get("type", ""),
                    "amount": str(item.get("amount", "")),
                    "balance_after": "",
                    "reason": item.get("reason", ""),
                    "date": item.get("createdAt", ""),
                })
        entries.sort(key=lambda row: row["date"], reverse=True)
        return Response({"user_id": str(user.pk), "balance": str(user.wallet_balance), "results": entries})


class CommercePlanCatalogView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"

    def get(self, request):
        return Response(
            {
                "results": list(
                    HealthPlan.objects.filter(is_active=True).values(
                        "code",
                        "name",
                        "monthly_price",
                        "annual_monthly_price",
                        "badge",
                        "tagline",
                        "color",
                        "features",
                        "exclusions",
                    )
                )
            }
        )


class PublicHealthPlansView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        plans = HealthPlan.objects.filter(is_active=True)
        config, _ = HealthPlanCalculatorConfig.objects.get_or_create(
            pk=1, defaults={"is_development_data": False}
        )
        return Response(
            {
                "results": [plan_public_row(plan) for plan in plans],
                "calculator": _public_calculator_row(config),
            }
        )


def _public_calculator_row(config):
    return {
        "doctor_visits_min": config.doctor_visits_min,
        "doctor_visits_max": config.doctor_visits_max,
        "doctor_visits_default": config.doctor_visits_default,
        "pharmacy_spend_min": config.pharmacy_spend_min,
        "pharmacy_spend_max": config.pharmacy_spend_max,
        "pharmacy_spend_step": config.pharmacy_spend_step,
        "pharmacy_spend_default": config.pharmacy_spend_default,
        "lab_spend_min": config.lab_spend_min,
        "lab_spend_max": config.lab_spend_max,
        "lab_spend_step": config.lab_spend_step,
        "lab_spend_default": config.lab_spend_default,
        "consultation_value": str(config.consultation_value),
    }


class PublicHealthPlanCalculatorView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        config, _ = HealthPlanCalculatorConfig.objects.get_or_create(
            pk=1, defaults={"is_development_data": False}
        )
        return Response(_public_calculator_row(config))


def _public_subscription_row(order):
    transactions = list(
        CommerceTransaction.objects.filter(
            Q(plan_order=order)
            | Q(order_type=CommerceTransaction.OrderType.PLAN, order_id=str(order.pk))
        )
        .order_by("-created_at", "-id")
    )
    payment = next(
        (
            entry
            for entry in transactions
            if entry.kind == CommerceTransaction.Kind.PAYMENT
        ),
        None,
    )
    refund = CommerceRefundRequest.objects.filter(
        Q(transaction__plan_order=order)
        | Q(
            transaction__order_type=CommerceTransaction.OrderType.PLAN,
            transaction__order_id=str(order.pk),
        )
    ).order_by("-created_at", "-id").first()
    return {
        "id": order.pk,
        "subscription_id": order.pk,
        "order_number": order.order_number,
        "plan_code": order.plan.code,
        "plan_name": order.plan.name,
        "billing_period": order.billing_period,
        "amount": str(order.amount),
        "currency": "INR",
        "status": order.status,
        "payment_status": order.payment_status,
        "starts_at": order.starts_at.isoformat() if order.starts_at else None,
        "ends_at": order.ends_at.isoformat() if order.ends_at else None,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "renewal_of_id": order.replaces_id,
        "renewed_by_ids": list(
            order.replaced_by.order_by("-created_at", "-id").values_list("id", flat=True)
        ),
        "payment": (
            {
                "reference": payment.reference,
                "transaction_id": payment.pk,
                "order_id": payment.order_id,
                "status": payment.status,
                "method": payment.method,
                "amount": str(payment.amount),
                "created_at": payment.created_at.isoformat(),
            }
            if payment
            else None
        ),
        "transactions": [
            {
                "id": entry.pk,
                "transaction_id": entry.pk,
                "order_id": entry.order_id,
                "reference": entry.reference,
                "kind": entry.kind,
                "status": entry.status,
                "method": entry.method,
                "amount": str(entry.amount),
                "created_at": entry.created_at.isoformat(),
                "original_transaction_id": entry.original_transaction_id,
            }
            for entry in transactions
        ],
        "refund": (
            {
                "id": refund.pk,
                "status": refund.status,
                "amount": str(refund.amount),
                "reason": refund.reason,
                "destination": refund.destination,
                "rejection_reason": refund.rejection_reason,
                "payment_transaction_id": refund.transaction_id,
                "requested_at": refund.created_at.isoformat(),
                "reviewed_at": refund.reviewed_at.isoformat() if refund.reviewed_at else None,
            }
            if refund
            else None
        ),
        "usage": subscription_usage(order),
        "family_members": [
            {
                "id": member.pk,
                "name": member.name,
                "relationship": member.relationship,
                "email": member.email,
                "created_at": member.created_at.isoformat(),
            }
            for member in order.family_members.all()
        ],
        "family_member_count": order.family_members.count(),
        "maximum_family_members": order.plan.maximum_family_members,
    }


class PublicHealthPlanSubscriptionsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        account = _patient_account_from_request(request)
        expire_plan_subscriptions()
        orders = PlanOrder.objects.filter(
            Q(platform_user=account) | Q(patient__external_id=account.pk)
        ).filter(is_archived=False).select_related("plan", "patient", "platform_user").prefetch_related(
            "family_members"
        )
        rows = [_public_subscription_row(order) for order in orders]
        return Response({"results": rows, "count": len(rows)})


class PublicHealthPlanFamilyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _subscription(self, request, subscription_id, *, lock=False):
        account = _patient_account_from_request(request)
        queryset = PlanOrder.objects.select_related(
            "plan", "patient", "platform_user"
        ).filter(pk=subscription_id).filter(
            Q(platform_user=account) | Q(patient__external_id=account.pk)
        ).filter(is_archived=False, is_blocked=False, is_deactivated=False)
        if lock:
            queryset = queryset.select_for_update()
        return get_object_or_404(queryset)

    def get(self, request, subscription_id):
        subscription = self._subscription(request, subscription_id)
        members = [
            {
                "id": member.pk,
                "name": member.name,
                "relationship": member.relationship,
                "email": member.email,
                "created_at": member.created_at.isoformat(),
            }
            for member in subscription.family_members.all()
        ]
        return Response({
            "results": members,
            "count": len(members),
            "limit": max(subscription.plan.maximum_family_members - 1, 0),
        })

    def post(self, request, subscription_id):
        with transaction.atomic():
            subscription = self._subscription(request, subscription_id, lock=True)
            if subscription.family_members.count() >= max(
                subscription.plan.maximum_family_members - 1, 0
            ):
                raise ValidationError({"family_members": "The plan family-member limit has been reached."})
            member = validate_plan_family_member(
                subscription,
                request.data,
                PlanFamilyMember(
                    subscription=subscription,
                    is_development_data=False,
                ),
            )
            member.save()
        return Response(
            {
                "id": member.pk,
                "name": member.name,
                "relationship": member.relationship,
                "email": member.email,
                "created_at": member.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, subscription_id, member_id):
        with transaction.atomic():
            subscription = self._subscription(request, subscription_id, lock=True)
            member = get_object_or_404(
                PlanFamilyMember.objects.select_for_update(),
                pk=member_id,
                subscription_id=subscription_id,
            )
            validate_plan_family_member(subscription, request.data, member)
            member.save(update_fields=["name", "relationship", "email"])
        return Response({
            "id": member.pk,
            "name": member.name,
            "relationship": member.relationship,
            "email": member.email,
            "created_at": member.created_at.isoformat(),
        })

    def delete(self, request, subscription_id, member_id):
        with transaction.atomic():
            self._subscription(request, subscription_id, lock=True)
            member = get_object_or_404(
                PlanFamilyMember.objects.select_for_update(),
                pk=member_id,
                subscription_id=subscription_id,
            )
            member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicHealthPlanRefundRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        header = request.headers.get("Authorization", "")
        token = header[7:].strip() if header.startswith("Bearer ") else ""
        if not token:
            return Response(
                {"detail": "Sign in with your patient account to request a refund."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            payload = jwt.decode(
                token,
                settings.CUSTOMER_JWT_SECRET,
                algorithms=["HS256"],
            )
        except jwt.InvalidTokenError:
            return Response(
                {"detail": "Your patient session is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if payload.get("role") != PlatformUser.Role.PATIENT:
            return Response(
                {"detail": "Only patient accounts can request a plan refund."},
                status=status.HTTP_403_FORBIDDEN,
            )
        account = get_object_or_404(
            PlatformUser,
            pk=str(payload.get("sub") or ""),
            role=PlatformUser.Role.PATIENT,
            is_active=True,
            is_blocked=False,
        )
        order_id = request.data.get("subscription_id")
        with transaction.atomic():
            order = get_object_or_404(
                PlanOrder.objects.select_for_update(),
                pk=order_id,
                platform_user=account,
                status=PlanOrder.Status.ACTIVE,
                payment_status=PlanOrder.PaymentStatus.PAID,
            )
            refund_start = order.starts_at or order.created_at
            if timezone.now() - refund_start > timedelta(days=30):
                raise ValidationError({"refund": "The 30-day money-back period has expired."})
            if HealthPlanBenefitUsage.objects.filter(
                subscription=order, benefit_code="consultation"
            ).exists():
                raise ValidationError(
                    {"refund": "A refund is unavailable after a free consultation has been used."}
                )
            payment = CommerceTransaction.objects.filter(
                order_type=CommerceTransaction.OrderType.PLAN,
                order_id=str(order.pk),
                kind=CommerceTransaction.Kind.PAYMENT,
                status=CommerceTransaction.Status.SUCCESSFUL,
            ).order_by("-created_at").first()
            if payment is None:
                raise ValidationError({"payment": "A successful plan payment was not found."})
            refund, created = CommerceRefundRequest.objects.get_or_create(
                transaction=payment,
                defaults={
                    "amount": payment.amount,
                    "reason": str(request.data.get("reason") or "30-day plan guarantee")[:2000],
                    "is_development_data": False,
                },
            )
            if not created:
                raise ValidationError({"refund": "A refund request already exists for this plan."})
            order.payment_status = PlanOrder.PaymentStatus.REFUND_PENDING
            order.save(update_fields=["payment_status", "updated_at"])
        return Response(
            {"success": True, "refund_id": refund.pk, "status": refund.status},
            status=status.HTTP_201_CREATED,
        )


class PublicPlanSubscribeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        header = request.headers.get("Authorization", "")
        token = header[7:].strip() if header.startswith("Bearer ") else ""
        if not token:
            return Response(
                {"detail": "Sign in with an online patient account to place a plan order."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            payload = jwt.decode(
                token,
                settings.CUSTOMER_JWT_SECRET,
                algorithms=["HS256"],
            )
        except jwt.InvalidTokenError:
            return Response(
                {"detail": "Your patient session is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if payload.get("role") != PlatformUser.Role.PATIENT:
            return Response(
                {"detail": "Only patient accounts can subscribe to a health plan."},
                status=status.HTTP_403_FORBIDDEN,
            )
        platform_user = PlatformUser.objects.filter(
            pk=str(payload.get("sub") or ""),
            role=PlatformUser.Role.PATIENT,
            is_active=True,
            is_blocked=False,
        ).first()
        if platform_user is None:
            return Response(
                {"detail": "The signed-in patient is not linked to an admin-panel account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        plan = get_object_or_404(
            HealthPlan,
            code=str(request.data.get("plan_code") or ""),
            is_active=True,
        )
        if PlanOrder.objects.filter(
            platform_user=platform_user,
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            is_deactivated=False,
            is_blocked=False,
            is_archived=False,
            ends_at__gt=timezone.now(),
        ).exists():
            raise ValidationError(
                {"subscription": "An active health plan already exists for this patient."}
            )
        period = str(request.data.get("billing_period") or "")
        if period not in PlanOrder.BillingPeriod.values:
            raise ValidationError({"billing_period": "Select monthly or annual billing."})
        method = str(request.data.get("method") or "")
        if method not in {
            CommerceTransaction.Method.CARD,
            CommerceTransaction.Method.UPI,
            CommerceTransaction.Method.CASH,
        }:
            raise ValidationError({"method": "Select Card, UPI or Cash."})
        monthly_price = (
            plan.annual_monthly_price
            if period == PlanOrder.BillingPeriod.ANNUAL
            else plan.monthly_price
        )
        amount = monthly_price * (12 if period == PlanOrder.BillingPeriod.ANNUAL else 1)
        patient = resolve_patient(platform_user.pk)
        with transaction.atomic():
            existing = (
                PlanOrder.objects.select_for_update()
                .filter(platform_user=platform_user, is_archived=False)
                .select_related("plan", "patient", "platform_user")
                .order_by("-updated_at", "-created_at", "-id")
                .first()
            )
            if existing:
                if existing.is_blocked or existing.is_deactivated:
                    raise ValidationError({"subscription": "This subscription is blocked or deactivated."})
                if existing.pending_changes.filter(status=PlanSubscriptionChange.Status.PENDING).exists():
                    raise ValidationError({"subscription": "A subscription payment is already pending."})
                change_type = (
                    PlanSubscriptionChange.ChangeType.RENEWAL
                    if existing.starts_at
                    else PlanSubscriptionChange.ChangeType.PURCHASE
                )
                change = stage_subscription_change(existing, change_type, plan, period, method)
                order = existing
                payment = change.transaction
            else:
                order = PlanOrder.objects.create(
                    plan=plan,
                    patient=patient,
                    platform_user=platform_user,
                    billing_period=period,
                    amount=amount,
                    payment_method=method,
                    is_development_data=False,
                )
                payment = CommerceTransaction.objects.create(
                    reference=f"TX-{uuid4().hex[:14].upper()}",
                    kind=CommerceTransaction.Kind.PAYMENT,
                    status=CommerceTransaction.Status.PENDING,
                    method=method,
                    amount=amount,
                    order_type=CommerceTransaction.OrderType.PLAN,
                    order_id=str(order.pk),
                    plan_order=order,
                    patient=patient,
                    platform_user=platform_user,
                    patient_name=platform_user.name,
                    note="Plan checkout submitted; payment confirmation is pending.",
                    is_development_data=False,
                )
        return Response(
            {
                "success": True,
                "order_id": str(order.pk),
                "order_number": order.order_number,
                "payment_status": order.payment_status,
                "transaction_id": payment.reference,
                "amount": str(amount),
            },
            status=status.HTTP_201_CREATED,
        )


class CommercePlanCancelView(APIView):
    permission_classes = [ModulePermission]
    module = "orders_payments"
    action_map = {"post": "edit"}

    def post(self, request, order_id):
        with transaction.atomic():
            order = get_object_or_404(PlanOrder.objects.select_for_update(), pk=order_id)
            if order.status == PlanOrder.Status.CANCELLED:
                raise ValidationError({"status": "This plan order is already cancelled."})
            order.status = PlanOrder.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            ensure_refund_for_cancelled_order("plan", order.pk, "Plan order cancelled.")
        return Response({"success": True, "order_id": str(order.pk), "status": order.status})
