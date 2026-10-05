from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone

from care.models import Appointment, CarePayment, CarePatient, RefundRequest
from dashboard.models import PlatformUser
from health_records.models import LabBooking
from lab_tests.models import ScanBooking
from pharmacy.models import PharmacyOrder, PharmacyRefund

from .models import (
    CommerceRefundRequest,
    CommerceTransaction,
    HealthPlanBenefitUsage,
    PlanOrder,
    WalletTransaction,
)


def _method(value):
    value = str(value or "").lower()
    if value in {"cash_on_delivery", "cod", "cash"}:
        return CommerceTransaction.Method.CASH
    if value in {"card", "upi", "wallet", "bank_transfer", "other"}:
        return value
    return CommerceTransaction.Method.OTHER


def _patient_row(patient):
    if patient is None:
        return None, ""
    return patient.pk, patient.name


def _latest_transactions():
    latest = {}
    for row in CommerceTransaction.objects.filter(kind=CommerceTransaction.Kind.PAYMENT).order_by(
        "-created_at", "-id"
    ):
        latest.setdefault((row.order_type, row.order_id), row)
    return latest


def _refund_states():
    states = {}
    for item in CommerceRefundRequest.objects.filter(
        status__in=(CommerceRefundRequest.Status.PENDING, CommerceRefundRequest.Status.APPROVED)
    ):
        transaction_row = item.transaction
        states[(transaction_row.order_type, transaction_row.order_id)] = (
            "refund_pending"
            if item.status == CommerceRefundRequest.Status.PENDING
            else "refunded"
        )
    for refund in RefundRequest.objects.filter(
        status__in=(RefundRequest.Status.PENDING, RefundRequest.Status.APPROVED)
    ).select_related("appointment"):
        states[("appointment", str(refund.appointment_id))] = (
            "refund_pending"
            if refund.status == RefundRequest.Status.PENDING
            else "refunded"
        )
    for refund in PharmacyRefund.objects.filter(
        status__in=(PharmacyRefund.Status.PENDING, PharmacyRefund.Status.COMPLETED)
    ).select_related("order"):
        states[("pharmacy", str(refund.order_id))] = (
            "refund_pending"
            if refund.status == PharmacyRefund.Status.PENDING
            else "refunded"
        )
    return states


def _effective_payment_status(order_type, order_id, default, latest, refunds):
    refund = refunds.get((order_type, str(order_id)))
    if refund:
        return refund
    payment = latest.get((order_type, str(order_id)))
    if payment:
        if payment.status == CommerceTransaction.Status.SUCCESSFUL:
            return "paid"
        if payment.status == CommerceTransaction.Status.FAILED:
            return "failed"
        return "pending"
    return default


def build_orders():
    latest = _latest_transactions()
    refunds = _refund_states()
    rows = []

    for order in PharmacyOrder.objects.select_related("patient").prefetch_related(
        "items"
    ):
        patient_id, patient_name = _patient_row(order.patient)
        payment_status = _effective_payment_status(
            "pharmacy", order.pk, order.payment_status, latest, refunds
        )
        rows.append(
            {
                "id": str(order.pk),
                "order_number": order.order_number,
                "type": "pharmacy",
                "patient_id": str(patient_id),
                "patient_name": patient_name,
                "description": ", ".join(
                    f"{line.product_name} × {line.quantity}" for line in order.items.all()
                ),
                "amount": str(order.total),
                "payment_status": payment_status,
                "payment_method": _method(order.payment_method),
                "status": order.status,
                "date": order.created_at.isoformat(),
                "invoice_available": payment_status == "paid",
            }
        )

    appointments = Appointment.objects.select_related(
        "patient", "payment", "doctor"
    )
    for order in appointments:
        patient_id, patient_name = _patient_row(order.patient)
        payment = CarePayment.objects.filter(appointment_id=order.pk).first()
        method = payment.payment_method if payment else ""
        payment_status = _effective_payment_status(
            "appointment", order.pk, order.payment_status, latest, refunds
        )
        rows.append(
            {
                "id": str(order.pk),
                "order_number": f"AP-{str(order.pk)[:8].upper()}",
                "type": "appointment",
                "patient_id": str(patient_id),
                "patient_name": patient_name,
                "description": f"{order.doctor_name} · {order.specialty_name}",
                "amount": str(payment.amount if payment else order.fee),
                "payment_status": payment_status,
                "payment_method": _method(method),
                "status": order.status,
                "date": order.created_at.isoformat(),
                "invoice_available": payment_status == "paid",
            }
        )

    bookings = LabBooking.objects.select_related(
        "patient", "lab_test", "lab_package", "health_check_bundle"
    ).prefetch_related("lab_tests", "lab_packages")
    for order in bookings:
        patient_id, patient_name = _patient_row(order.patient)
        calculated_amount = Decimal("0.00")
        if order.lab_test_id:
            calculated_amount += order.lab_test.price
        if order.lab_package_id:
            calculated_amount += order.lab_package.price
        if order.health_check_bundle_id:
            calculated_amount += order.health_check_bundle.price
        calculated_amount += sum(order.lab_tests.values_list("price", flat=True), Decimal("0.00"))
        calculated_amount += sum(order.lab_packages.values_list("price", flat=True), Decimal("0.00"))
        amount = order.total if order.subtotal else calculated_amount
        payment_status = _effective_payment_status(
            "lab", order.pk, "pending", latest, refunds
        )
        rows.append(
            {
                "id": str(order.pk),
                "order_number": f"LB-{order.pk:06d}",
                "type": "lab",
                "patient_id": str(patient_id),
                "patient_name": patient_name,
                "description": order.test_name,
                "amount": str(amount),
                "subtotal": str(order.subtotal or calculated_amount),
                "plan_discount": str(order.plan_discount),
                "payment_status": payment_status,
                "payment_method": _method(""),
                "status": order.status,
                "date": order.created_at.isoformat(),
                "invoice_available": payment_status == "paid",
            }
        )

    for order in ScanBooking.objects.select_related(
        "patient", "radiology_service"
    ):
        patient_id, patient_name = _patient_row(order.patient)
        payment_status = _effective_payment_status(
            "scan", order.pk, "pending", latest, refunds
        )
        rows.append(
            {
                "id": str(order.pk),
                "order_number": f"SC-{order.pk:06d}",
                "type": "scan",
                "patient_id": str(patient_id),
                "patient_name": patient_name,
                "description": order.radiology_service.name,
                "amount": str(order.radiology_service.price),
                "payment_status": payment_status,
                "payment_method": _method(""),
                "status": order.status,
                "date": order.created_at.isoformat(),
                "invoice_available": payment_status == "paid",
            }
        )

    for order in PlanOrder.objects.select_related("patient", "platform_user", "plan"):
        patient_id, patient_name = _patient_row(order.patient)
        if order.patient is None and order.platform_user_id:
            patient_id, patient_name = order.platform_user_id, order.platform_user.name
        payment_status = _effective_payment_status(
            "plan", order.pk, order.payment_status, latest, refunds
        )
        rows.append(
            {
                "id": str(order.pk),
                "order_number": order.order_number,
                "type": "plan",
                "patient_id": str(patient_id or ""),
                "patient_name": patient_name,
                "description": f"{order.plan.name} ({order.billing_period})",
                "amount": str(order.amount),
                "payment_status": payment_status,
                "payment_method": _method(order.payment_method),
                "status": order.status,
                "date": order.created_at.isoformat(),
                "invoice_available": payment_status == "paid",
            }
        )

    return sorted(rows, key=lambda row: row["date"], reverse=True)


def build_order_detail(order_type, order_id):
    row = next(
        (item for item in build_orders() if item["type"] == order_type and item["id"] == str(order_id)),
        None,
    )
    if row is None:
        return None
    if order_type == "pharmacy":
        order = PharmacyOrder.objects.prefetch_related("items").get(pk=order_id)
        row["items"] = [
            {
                "name": item.product_name,
                "quantity": item.quantity,
                "amount": str(item.line_total),
            }
            for item in order.items.all()
        ]
        row["subtotal"] = str(order.subtotal)
        row["plan_discount"] = str(order.plan_discount)
        row["tax"] = str(order.tax)
    elif order_type == "appointment":
        order = Appointment.objects.get(pk=order_id)
        row["items"] = [
            {
                "name": f"{order.doctor_name} appointment",
                "quantity": 1,
                "amount": str(order.fee),
            }
        ]
    elif order_type == "lab":
        order = LabBooking.objects.get(pk=order_id)
        items = []
        for test in order.lab_tests.all():
            items.append({"name": test.name, "quantity": 1, "amount": str(test.price)})
        if order.lab_test_id:
            items.append(
                {"name": order.lab_test.name, "quantity": 1, "amount": str(order.lab_test.price)}
            )
        for package in order.lab_packages.all():
            items.append(
                {"name": package.name, "quantity": 1, "amount": str(package.price)}
            )
        if order.lab_package_id:
            items.append(
                {"name": order.lab_package.name, "quantity": 1, "amount": str(order.lab_package.price)}
            )
        if order.health_check_bundle_id:
            items.append(
                {
                    "name": order.health_check_bundle.name,
                    "quantity": 1,
                    "amount": str(order.health_check_bundle.price),
                }
            )
        row["items"] = items
        row["subtotal"] = str(order.subtotal or Decimal(row["amount"]))
        row["plan_discount"] = str(order.plan_discount)
    elif order_type == "scan":
        order = ScanBooking.objects.select_related("radiology_service").get(pk=order_id)
        row["items"] = [
            {
                "name": order.radiology_service.name,
                "quantity": 1,
                "amount": str(order.radiology_service.price),
            }
        ]
    elif order_type == "plan":
        order = PlanOrder.objects.select_related("plan", "patient", "platform_user").get(pk=order_id)
        row["items"] = [
            {
                "name": f"{order.plan.name} ({order.billing_period})",
                "quantity": 1,
                "amount": str(order.amount),
            }
        ]
    return row


def build_transactions():
    rows = []
    seen = set()
    commerce_rows = list(
        CommerceTransaction.objects.select_related("patient", "platform_user")
    )
    for entry in commerce_rows:
        key = (entry.order_type, entry.order_id, entry.kind)
        if entry.order_type != "manual":
            seen.add(key)
        rows.append(
            {
                "id": str(entry.pk),
                "source": "commerce",
                "reference": entry.reference,
                "order_type": entry.order_type,
                "order_id": entry.order_id,
                "order_number": _order_number(entry.order_type, entry.order_id),
                "patient_name": entry.patient_name
                or getattr(entry.patient, "name", "")
                or getattr(entry.platform_user, "name", ""),
                "method": entry.method,
                "amount": str(entry.amount),
                "status": entry.status,
                "kind": entry.kind,
                "date": entry.created_at.isoformat(),
                "note": entry.note,
            }
        )

    for payment in CarePayment.objects.filter(
        kind=CarePayment.Kind.CONSULTATION
    ).select_related("appointment", "appointment__patient"):
        if not payment.appointment_id:
            continue
        key = ("appointment", str(payment.appointment_id), "payment")
        if key in seen:
            continue
        rows.append(
            {
                "id": str(payment.pk),
                "source": "care",
                "reference": f"CARE-{str(payment.pk)[:12].upper()}",
                "order_type": "appointment",
                "order_id": str(payment.appointment_id),
                "order_number": f"AP-{str(payment.appointment_id)[:8].upper()}",
                "patient_name": payment.appointment.patient.name,
                "method": _method(payment.payment_method),
                "amount": str(payment.amount),
                "status": {
                    CarePayment.Status.PAID: CommerceTransaction.Status.SUCCESSFUL,
                    CarePayment.Status.REFUNDED: CommerceTransaction.Status.SUCCESSFUL,
                    CarePayment.Status.FAILED: CommerceTransaction.Status.FAILED,
                }.get(payment.status, CommerceTransaction.Status.PENDING),
                "kind": "payment",
                "date": payment.created_at.isoformat(),
                "note": "",
            }
        )
        refund = RefundRequest.objects.filter(
            payment=payment, status=RefundRequest.Status.APPROVED
        ).first()
        refund_key = ("appointment", str(payment.appointment_id), "refund")
        if refund and refund_key not in seen:
            rows.append(
                {
                    "id": str(refund.pk),
                    "reference": f"RF-CARE-{str(refund.pk)[:10].upper()}",
                    "order_type": "appointment",
                    "order_id": str(payment.appointment_id),
                    "order_number": f"AP-{str(payment.appointment_id)[:8].upper()}",
                    "patient_name": payment.appointment.patient.name,
                    "method": _method(refund.destination or payment.payment_method),
                    "amount": str(refund.amount),
                    "status": CommerceTransaction.Status.SUCCESSFUL,
                    "kind": "refund",
                    "date": (refund.reviewed_at or refund.created_at).isoformat(),
                    "note": "Refund",
                }
            )

    for order in PharmacyOrder.objects.select_related("patient"):
        key = ("pharmacy", str(order.pk), "payment")
        if key in seen:
            continue
        status = {
            PharmacyOrder.PaymentStatus.PAID: "successful",
            PharmacyOrder.PaymentStatus.FAILED: "failed",
            PharmacyOrder.PaymentStatus.PENDING: "pending",
            PharmacyOrder.PaymentStatus.REFUNDED: "successful",
            PharmacyOrder.PaymentStatus.REFUND_PENDING: "pending",
        }.get(order.payment_status, "pending")
        rows.append(
            {
                "id": f"pharmacy-{order.pk}",
                "source": "pharmacy",
                "reference": f"PH-{order.pk:08d}",
                "order_type": "pharmacy",
                "order_id": str(order.pk),
                "order_number": order.order_number,
                "patient_name": order.patient.name,
                "method": _method(order.payment_method),
                "amount": str(order.total),
                "status": status,
                "kind": "payment",
                "date": order.created_at.isoformat(),
                "note": "",
            }
        )
        refund = PharmacyRefund.objects.filter(
            order=order, status=PharmacyRefund.Status.COMPLETED
        ).first()
        refund_key = ("pharmacy", str(order.pk), "refund")
        if refund and refund_key not in seen:
            rows.append(
                {
                    "id": str(refund.pk),
                    "reference": f"RF-PH-{order.pk:08d}",
                    "order_type": "pharmacy",
                    "order_id": str(order.pk),
                    "order_number": order.order_number,
                    "patient_name": order.patient.name,
                    "method": _method(refund.destination or order.payment_method),
                    "amount": str(refund.amount),
                    "status": CommerceTransaction.Status.SUCCESSFUL,
                    "kind": "refund",
                    "date": refund.updated_at.isoformat(),
                    "note": "Refund",
                }
            )
    return sorted(rows, key=lambda row: row["date"], reverse=True)


def _order_number(order_type, order_id):
    if not order_id:
        return ""
    if order_type == "pharmacy":
        return f"PH-{int(order_id):06d}" if str(order_id).isdigit() else ""
    if order_type == "appointment":
        return f"AP-{str(order_id)[:8].upper()}"
    prefixes = {"lab": "LB", "scan": "SC", "plan": "PL"}
    prefix = prefixes.get(order_type)
    return f"{prefix}-{order_id}" if prefix else ""


def resolve_patient(patient_id):
    if patient_id in (None, ""):
        return None
    try:
        patient_pk = CarePatient._meta.pk.to_python(patient_id)
    except DjangoValidationError:
        patient_pk = None
    patient = CarePatient.objects.filter(pk=patient_pk).first() if patient_pk else None
    if patient is None:
        patient = CarePatient.objects.filter(external_id=str(patient_id)).first()
    return patient


def platform_user_for_patient(patient):
    if patient is None or not patient.external_id:
        return None
    return PlatformUser.objects.filter(
        pk=patient.external_id, role=PlatformUser.Role.PATIENT
    ).first()


@transaction.atomic
def apply_wallet_change(user, direction, amount, reason, actor=None, refund_request=None):
    user = PlatformUser.objects.select_for_update().get(pk=user.pk)
    current = Decimal(str(user.wallet_balance or 0))
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    next_balance = current + amount if direction == "credit" else current - amount
    if next_balance < 0:
        raise ValueError("Wallet debit exceeds available balance.")
    entry = {
        "type": direction,
        "amount": float(amount),
        "reason": reason,
        "createdAt": timezone.now().isoformat(),
    }
    user.wallet_balance = next_balance
    user.wallet_transactions = [*(user.wallet_transactions or []), entry]
    user.save(update_fields=["wallet_balance", "wallet_transactions"])
    WalletTransaction.objects.create(
        user=user,
        direction=direction,
        amount=amount,
        balance_after=next_balance,
        reason=reason,
        refund_request=refund_request,
        created_by=actor,
    )
    return user, entry


def refund_sources():
    results = []
    for row in RefundRequest.objects.select_related(
        "appointment", "appointment__patient", "payment"
    ):
        results.append(
            {
                "id": str(row.pk),
                "source": "care",
                "order_type": "appointment",
                "order_id": str(row.appointment_id),
                "order_number": _order_number("appointment", row.appointment_id),
                "patient_name": row.appointment.patient.name,
                "amount": str(row.amount),
                "status": row.status,
                "reason": row.reason,
                "rejection_reason": row.rejection_reason,
                "destination": row.destination,
                "date": row.created_at.isoformat(),
            }
        )
    for row in PharmacyRefund.objects.select_related("order", "order__patient"):
        results.append(
            {
                "id": str(row.pk),
                "source": "pharmacy",
                "order_type": "pharmacy",
                "order_id": str(row.order_id),
                "order_number": row.order.order_number,
                "patient_name": row.order.patient.name,
                "amount": str(row.amount),
                "status": row.status,
                "reason": row.reason,
                "rejection_reason": row.rejection_reason,
                "destination": row.destination,
                "date": row.created_at.isoformat(),
            }
        )
    for row in CommerceRefundRequest.objects.select_related(
        "transaction", "transaction__patient"
    ):
        results.append(
            {
                "id": str(row.pk),
                "source": "commerce",
                "order_type": row.transaction.order_type,
                "order_id": row.transaction.order_id,
                "order_number": _order_number(
                    row.transaction.order_type, row.transaction.order_id
                ),
                "patient_name": row.transaction.patient_name
                or getattr(row.transaction.patient, "name", ""),
                "amount": str(row.amount),
                "status": row.status,
                "reason": row.reason,
                "rejection_reason": row.rejection_reason,
                "destination": row.destination,
                "date": row.created_at.isoformat(),
            }
        )
    return sorted(results, key=lambda item: item["date"], reverse=True)


@transaction.atomic
def ensure_refund_for_cancelled_order(order_type, order_id, reason):
    payment = (
        CommerceTransaction.objects.select_for_update()
        .filter(
            order_type=order_type,
            order_id=str(order_id),
            kind=CommerceTransaction.Kind.PAYMENT,
            status=CommerceTransaction.Status.SUCCESSFUL,
        )
        .order_by("-created_at")
        .first()
    )
    if payment is None:
        return None
    if order_type == "plan":
        order = PlanOrder.objects.select_for_update().filter(pk=order_id).first()
        if (
            order is None
            or timezone.now() - (order.starts_at or order.created_at) > timedelta(days=30)
            or HealthPlanBenefitUsage.objects.filter(
                subscription=order, benefit_code="consultation"
            ).exists()
        ):
            return None
    if CommerceRefundRequest.objects.filter(
        transaction=payment,
        status__in=(
            CommerceRefundRequest.Status.PENDING,
            CommerceRefundRequest.Status.APPROVED,
        ),
    ).exists():
        return None
    refund = CommerceRefundRequest.objects.create(
        transaction=payment,
        amount=payment.amount,
        reason=reason,
        is_development_data=False,
    )
    if order_type == "plan":
        PlanOrder.objects.filter(pk=order_id).update(
            payment_status=PlanOrder.PaymentStatus.REFUND_PENDING,
            updated_at=timezone.now(),
        )
    return refund
