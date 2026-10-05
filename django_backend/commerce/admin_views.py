from uuid import uuid4

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from care.models import CarePatient
from dashboard.models import PlatformUser

from .models import (
    CommerceRefundRequest,
    CommerceTransaction,
    HealthPlan,
    HealthPlanBenefitUsage,
    HealthPlanCalculatorConfig,
    PlanFamilyMember,
    PlanOrder,
    PlanSubscriptionChange,
    PlanSubscriptionHistory,
)
from .plans import (
    expire_plan_subscriptions,
    plan_public_row,
    subscription_usage,
    validate_plan_family_member,
)
from .services import ensure_refund_for_cancelled_order, platform_user_for_patient, resolve_patient
from .subscription_lifecycle import (
    record_subscription_history,
    stage_subscription_change,
    subscription_snapshot,
)


PLAN_FIELDS = {
    "code",
    "name",
    "monthly_price",
    "annual_monthly_price",
    "badge",
    "tagline",
    "color",
    "features",
    "exclusions",
    "maximum_family_members",
    "is_popular",
    "free_consultations_per_month",
    "pharmacy_discount_percent",
    "lab_discount_percent",
    "free_home_sample_count",
    "annual_checkup_count",
    "ambulance_discount_percent",
    "care_manager",
    "custom_benefits",
    "is_active",
}


def _plan_data(plan):
    data = plan_public_row(plan)
    subscribers = getattr(plan, "_active_subscriber_count", None)
    if subscribers is None:
        now = timezone.now()
        subscribers = plan.orders.filter(
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            starts_at__lte=now,
            ends_at__gt=now,
        ).count()
    data.update(
        {
            "id": plan.pk,
            "legacy_features": plan.features if isinstance(plan.features, list) else [],
            "subscribers": subscribers,
        }
    )
    return data


def _save_plan(plan, payload, *, creating=False):
    unknown = set(payload) - PLAN_FIELDS
    if unknown:
        raise ValidationError({"fields": f"Unsupported plan fields: {', '.join(sorted(unknown))}."})
    for field, value in payload.items():
        setattr(plan, field, value)
    if creating and not plan.code:
        plan.code = slugify(plan.name)[:40]
    if not plan.code:
        raise ValidationError({"code": "A plan code is required."})
    try:
        plan.full_clean()
    except DjangoValidationError as exc:
        raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    plan.save()
    return plan


def _subscription_row(order):
    usage = subscription_usage(order) if order.plan_id else []
    transactions = list(
        CommerceTransaction.objects.filter(
            Q(plan_order=order)
            | Q(order_type=CommerceTransaction.OrderType.PLAN, order_id=str(order.pk))
        ).order_by("-created_at", "-id")
    )
    payment = next(
        (
            entry
            for entry in transactions
            if entry.kind == CommerceTransaction.Kind.PAYMENT
        ),
        None,
    )
    refund = (
        CommerceRefundRequest.objects.filter(
            Q(transaction__plan_order=order)
            | Q(
                transaction__order_type=CommerceTransaction.OrderType.PLAN,
                transaction__order_id=str(order.pk),
            )
        )
        .select_related("transaction")
        .order_by("-created_at", "-id")
        .first()
    )
    replacement_ids = list(
        order.replaced_by.order_by("-created_at", "-id").values_list("id", flat=True)
    )
    return {
        "id": order.pk,
        "subscription_id": order.pk,
        "order_number": order.order_number,
        "plan_id": order.plan_id,
        "plan_code": order.plan.code,
        "plan_name": order.plan.name,
        "patient_id": str(order.patient_id or order.platform_user_id or ""),
        "patient_name": (
            order.patient.name
            if order.patient_id
            else order.platform_user.name
            if order.platform_user_id
            else ""
        ),
        "billing_period": order.billing_period,
        "amount": str(order.amount),
        "currency": "INR",
        "status": order.status,
        "payment_status": order.payment_status,
        "is_deactivated": order.is_deactivated,
        "is_blocked": order.is_blocked,
        "is_archived": order.is_archived,
        "payment_method": order.payment_method,
        "starts_at": order.starts_at.isoformat() if order.starts_at else None,
        "ends_at": order.ends_at.isoformat() if order.ends_at else None,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "renewal_of_id": order.replaces_id,
        "renewed_by_ids": replacement_ids,
        "family_member_count": order.family_members.count(),
        "maximum_family_members": order.plan.maximum_family_members,
        "usage": usage,
        "payment": (
            {
                "id": payment.pk,
                "transaction_id": payment.pk,
                "order_id": payment.order_id,
                "reference": payment.reference,
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
                "id": row.pk,
                "transaction_id": row.pk,
                "order_id": row.order_id,
                "reference": row.reference,
                "kind": row.kind,
                "status": row.status,
                "method": row.method,
                "amount": str(row.amount),
                "created_at": row.created_at.isoformat(),
                "original_transaction_id": row.original_transaction_id,
            }
            for row in transactions
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
        "family_members": [
            {
                "id": member.pk,
                "name": member.name,
                "relationship": member.relationship,
                "email": member.email,
                "platform_user_id": member.platform_user_id,
                "created_at": member.created_at.isoformat(),
            }
            for member in order.family_members.all()
        ],
        "maximum_family_members": order.plan.maximum_family_members,
    }


def _amount_for_plan(plan, period):
    if period not in PlanOrder.BillingPeriod.values:
        raise ValidationError({"billing_period": "Select monthly or annual billing."})
    monthly = (
        plan.annual_monthly_price
        if period == PlanOrder.BillingPeriod.ANNUAL
        else plan.monthly_price
    )
    amount = monthly * (12 if period == PlanOrder.BillingPeriod.ANNUAL else 1)
    if amount <= 0:
        raise ValidationError({"amount": "Plan price must be greater than zero."})
    return amount


def _create_plan_order(*, plan, patient, platform_user, period, method, replaces=None):
    amount = _amount_for_plan(plan, period)
    order = PlanOrder.objects.create(
        plan=plan,
        patient=patient,
        platform_user=platform_user,
        billing_period=period,
        amount=amount,
        payment_method=method,
        replaces=replaces,
        is_development_data=False,
    )
    CommerceTransaction.objects.create(
        reference=f"TX-{uuid4().hex[:14].upper()}",
        kind=CommerceTransaction.Kind.PAYMENT,
        status=CommerceTransaction.Status.PENDING,
        method=method,
        amount=amount,
        order_type=CommerceTransaction.OrderType.PLAN,
        order_id=str(order.pk),
        patient=patient,
        platform_user=platform_user,
        plan_order=order,
        patient_name=patient.name if patient else platform_user.name,
        note="Health plan payment is pending confirmation.",
        is_development_data=False,
    )
    return order


class HealthPlanAdminCollectionView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"

    def get(self, request):
        expire_plan_subscriptions()
        now = timezone.now()
        plans = HealthPlan.objects.annotate(
            _active_subscriber_count=Count(
                "orders",
                filter=Q(
                    orders__status=PlanOrder.Status.ACTIVE,
                    orders__payment_status=PlanOrder.PaymentStatus.PAID,
                    orders__starts_at__lte=now,
                    orders__ends_at__gt=now,
                ),
            )
        )
        rows = [_plan_data(plan) for plan in plans]
        return Response({
            "results": rows,
            "count": len(rows),
            "total_count": len(rows),
            "active_count": sum(1 for plan in rows if plan["is_active"]),
        })

    def post(self, request):
        plan = _save_plan(HealthPlan(is_development_data=False), request.data, creating=True)
        return Response(_plan_data(plan), status=201)


class HealthPlanAdminDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"get": "view"}

    def get(self, request, plan_id):
        return Response(_plan_data(get_object_or_404(HealthPlan, pk=plan_id)))

    def patch(self, request, plan_id):
        plan = get_object_or_404(HealthPlan, pk=plan_id)
        plan = _save_plan(plan, request.data)
        return Response(_plan_data(plan))

    def delete(self, request, plan_id):
        expire_plan_subscriptions()
        plan = get_object_or_404(HealthPlan, pk=plan_id)
        if plan.orders.filter(
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            ends_at__gt=timezone.now(),
        ).exists():
            raise ValidationError({"detail": "A plan with active subscribers cannot be deleted."})
        if plan.orders.exists():
            raise ValidationError(
                {"detail": "Plans with subscription history cannot be deleted; deactivate the plan instead."}
            )
        plan.delete()
        return Response(status=204)


class HealthPlanSubscriptionsView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"post": "create"}

    def get(self, request):
        expire_plan_subscriptions()
        rows = [
            _subscription_row(order)
            for order in PlanOrder.objects.select_related(
                "plan", "patient", "platform_user"
            ).prefetch_related("family_members")
        ]
        now = timezone.now()
        return Response({
            "results": rows,
            "count": len(rows),
            "total_count": len(rows),
            "active_count": PlanOrder.objects.filter(
                status=PlanOrder.Status.ACTIVE,
                payment_status=PlanOrder.PaymentStatus.PAID,
                is_deactivated=False,
                is_blocked=False,
                is_archived=False,
                starts_at__lte=now,
                ends_at__gt=now,
            ).count(),
            "archived_count": PlanOrder.objects.filter(is_archived=True).count(),
        })

    def post(self, request):
        plan = get_object_or_404(HealthPlan, pk=request.data.get("plan_id"), is_active=True)
        patient_key = str(request.data.get("patient_id") or "").strip()
        if not patient_key:
            raise ValidationError({"patient_id": "Choose a patient."})
        patient = resolve_patient(patient_key)
        platform_user = PlatformUser.objects.filter(
            pk=patient_key,
            role=PlatformUser.Role.PATIENT,
            is_active=True,
            is_blocked=False,
        ).first()
        platform_user = platform_user or platform_user_for_patient(patient)
        if platform_user is None:
            raise ValidationError(
                {"patient_id": "Choose a patient linked to an active website account so the subscription can sync to the website."}
            )
        if PlanOrder.objects.filter(
            platform_user=platform_user,
            is_archived=False,
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            ends_at__gt=timezone.now(),
        ).exists():
            raise ValidationError(
                {"subscription": "The patient already has an active health plan."}
            )
        method = request.data.get("payment_method", CommerceTransaction.Method.OTHER)
        if method not in CommerceTransaction.Method.values:
            raise ValidationError({"payment_method": "Select a supported payment method."})
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
                    raise ValidationError({"subscription": "Unblock and activate the patient's existing subscription first."})
                if existing.pending_changes.filter(status=PlanSubscriptionChange.Status.PENDING).exists():
                    raise ValidationError({"subscription": "A subscription change is already awaiting payment."})
                if existing.status == PlanOrder.Status.PENDING and existing.payment_status == PlanOrder.PaymentStatus.PENDING:
                    raise ValidationError({"subscription": "The patient's subscription is already awaiting payment."})
                change_type = (
                    PlanSubscriptionChange.ChangeType.RENEWAL
                    if existing.starts_at
                    else PlanSubscriptionChange.ChangeType.PURCHASE
                )
                stage_subscription_change(
                    existing,
                    change_type,
                    plan,
                    request.data.get("billing_period"),
                    method,
                )
                return Response(_subscription_row(existing), status=201)
            order = _create_plan_order(
                plan=plan,
                patient=patient,
                platform_user=platform_user,
                period=request.data.get("billing_period"),
                method=method,
            )
        return Response(_subscription_row(order), status=201)


class HealthPlanSubscriptionActionView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"post": "edit"}

    def post(self, request, subscription_id):
        action = str(request.data.get("action") or "").strip().lower()
        with transaction.atomic():
            order = get_object_or_404(
                PlanOrder.objects.select_for_update().select_related(
                    "plan", "patient", "platform_user"
                ),
                pk=subscription_id,
            )
            if action in {
                "deactivate", "activate", "block", "unblock", "archive", "restore"
            }:
                if action == "activate" and order.is_archived:
                    raise ValidationError({"status": "An archived subscription cannot be activated."})
                if action == "restore" and not order.is_archived:
                    raise ValidationError({"status": "This subscription is not archived."})
                before = subscription_snapshot(order)
                if action == "deactivate":
                    order.is_deactivated = True
                elif action == "activate":
                    order.is_deactivated = False
                elif action == "block":
                    order.is_blocked = True
                elif action == "unblock":
                    order.is_blocked = False
                elif action == "restore":
                    order.is_archived = False
                else:
                    order.is_archived = True
                order.save(update_fields=[
                    "is_deactivated", "is_blocked", "is_archived", "updated_at"
                ])
                record_subscription_history(
                    order,
                    action,
                    {"before": before, "after": subscription_snapshot(order)},
                )
                return Response(_subscription_row(order))
            if action == "cancel":
                if order.status != PlanOrder.Status.ACTIVE:
                    raise ValidationError({"status": "Only active subscriptions can be cancelled."})
                before = subscription_snapshot(order)
                order.status = PlanOrder.Status.CANCELLED
                order.cancelled_at = timezone.now()
                order.save(update_fields=["status", "cancelled_at", "updated_at"])
                record_subscription_history(
                    order,
                    "cancelled",
                    {"before": before, "after": subscription_snapshot(order)},
                )
                ensure_refund_for_cancelled_order("plan", order.pk, "Health plan cancelled.")
                return Response(_subscription_row(order))
            if action not in {"renew", "upgrade", "downgrade"}:
                raise ValidationError({"action": "Choose a supported subscription action."})
            if order.is_archived or order.is_blocked or order.is_deactivated:
                raise ValidationError({"status": "Archived, blocked, or deactivated subscriptions cannot be changed."})
            if order.pending_changes.filter(status=PlanSubscriptionChange.Status.PENDING).exists():
                raise ValidationError({"status": "A subscription change is already awaiting payment."})
            if action == "renew" and order.status not in {
                PlanOrder.Status.ACTIVE,
                PlanOrder.Status.EXPIRED,
                PlanOrder.Status.CANCELLED,
            }:
                raise ValidationError({"status": "Only active, expired, or cancelled subscriptions can be renewed."})
            if action in {"upgrade", "downgrade"} and order.status != PlanOrder.Status.ACTIVE:
                raise ValidationError({"status": "Only active subscriptions can be changed."})
            plan_id = request.data.get("plan_id") if action != "renew" else order.plan_id
            plan = get_object_or_404(HealthPlan, pk=plan_id, is_active=True)
            period = request.data.get("billing_period") or order.billing_period
            method = request.data.get("payment_method") or order.payment_method
            if method not in CommerceTransaction.Method.values:
                raise ValidationError({"payment_method": "Select a supported payment method."})
            if action == "upgrade" and plan.monthly_price <= order.plan.monthly_price:
                raise ValidationError({"plan_id": "Choose a plan with a higher monthly price."})
            if action == "downgrade" and plan.monthly_price >= order.plan.monthly_price:
                raise ValidationError({"plan_id": "Choose a plan with a lower monthly price."})
            stage_subscription_change(
                order,
                (
                    PlanSubscriptionChange.ChangeType.RENEWAL
                    if action == "renew"
                    else action
                ),
                plan,
                period,
                method,
            )
        return Response(_subscription_row(order), status=201)


class HealthPlanSubscriptionHistoryView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"

    def get(self, request, subscription_id):
        order = get_object_or_404(
            PlanOrder.objects.select_related("plan", "patient", "platform_user"),
            pk=subscription_id,
        )
        patient_identity = Q(pk=order.pk)
        if order.platform_user_id:
            patient_identity |= Q(platform_user_id=order.platform_user_id)
        if order.patient_id:
            patient_identity |= Q(patient_id=order.patient_id)
            if order.patient.external_id:
                patient_identity |= Q(platform_user_id=order.patient.external_id)
        patient_orders = list(
            PlanOrder.objects.select_related("plan", "patient", "platform_user")
            .filter(patient_identity)
            .order_by("-created_at", "-id")
        )
        patient_order_ids = [str(row.pk) for row in patient_orders]
        order_by_id = {str(row.pk): row for row in patient_orders}
        rows = []
        for legacy in patient_orders:
            rows.append({
                "id": f"subscription-{legacy.pk}",
                "event_type": "subscription_record" if legacy.pk == order.pk else "previous_subscription",
                "created_at": legacy.updated_at.isoformat(),
                "snapshot": subscription_snapshot(legacy),
            })
            rows.extend({
                "id": f"history-{legacy.pk}-{entry.pk}",
                "event_type": entry.event_type,
                "created_at": entry.created_at.isoformat(),
                "snapshot": entry.snapshot,
            } for entry in legacy.history_entries.all())

        payments = list(
            CommerceTransaction.objects.filter(
                Q(plan_order__in=patient_orders)
                | Q(
                    order_type=CommerceTransaction.OrderType.PLAN,
                    order_id__in=patient_order_ids,
                ),
                kind=CommerceTransaction.Kind.PAYMENT,
            ).select_related("plan_order__plan").order_by("-created_at", "-id")
        )
        payment_ids = [payment.pk for payment in payments]
        for payment in payments:
            related_order = payment.plan_order or order_by_id.get(payment.order_id)
            if related_order is None:
                continue
            change = getattr(payment, "plan_subscription_change", None)
            rows.append({
                "id": f"payment-{payment.pk}",
                "event_type": f"{change.change_type}_payment" if change else "payment",
                "created_at": payment.created_at.isoformat(),
                "snapshot": {
                    "subscription_id": related_order.pk,
                    "order_number": related_order.order_number,
                    "plan_id": change.target_plan_id if change else related_order.plan_id,
                    "plan_name": change.target_plan.name if change else related_order.plan.name,
                    "amount": str(payment.amount),
                    "billing_period": change.billing_period if change else related_order.billing_period,
                    "status": related_order.status,
                    "payment_status": payment.status,
                    "payment_method": payment.method,
                    "starts_at": related_order.starts_at.isoformat() if related_order.starts_at else None,
                    "ends_at": related_order.ends_at.isoformat() if related_order.ends_at else None,
                    "is_deactivated": related_order.is_deactivated,
                    "is_blocked": related_order.is_blocked,
                    "is_archived": related_order.is_archived,
                    "transaction_id": payment.pk,
                    "transaction_reference": payment.reference,
                    "order_id": payment.order_id,
                },
            })

        refunds = CommerceRefundRequest.objects.filter(
            transaction_id__in=payment_ids
        ).select_related("transaction").order_by("-created_at", "-id")
        for refund in refunds:
            payment = refund.transaction
            related_order = payment.plan_order or order_by_id.get(payment.order_id)
            if related_order is None:
                continue
            rows.append({
                "id": f"refund-{refund.pk}",
                "event_type": f"refund_{refund.status}",
                "created_at": (refund.reviewed_at or refund.created_at).isoformat(),
                "snapshot": {
                    "subscription_id": related_order.pk,
                    "order_number": related_order.order_number,
                    "plan_id": related_order.plan_id,
                    "plan_name": related_order.plan.name,
                    "amount": str(refund.amount),
                    "billing_period": related_order.billing_period,
                    "status": related_order.status,
                    "payment_status": payment.status,
                    "payment_method": payment.method,
                    "transaction_id": payment.pk,
                    "transaction_reference": payment.reference,
                    "order_id": payment.order_id,
                    "reason": refund.reason,
                    "refund_status": refund.status,
                    "rejection_reason": refund.rejection_reason,
                },
            })
        rows.sort(key=lambda row: (row["created_at"], str(row["id"])), reverse=True)
        return Response({"results": rows, "count": len(rows)})


class HealthPlanFamilyView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"post": "edit", "patch": "edit", "delete": "edit"}

    def get(self, request, subscription_id):
        subscription = get_object_or_404(
            PlanOrder.objects.select_related("plan").prefetch_related(
                "family_members", "family_members__platform_user"
            ),
            pk=subscription_id,
        )
        members = [_family_member_row(row) for row in subscription.family_members.all()]
        return Response({
            "results": members,
            "count": len(members),
            "limit": max(subscription.plan.maximum_family_members - 1, 0),
            "subscription_id": subscription.pk,
            "patient_id": str(subscription.platform_user_id or subscription.patient_id or ""),
            "patient_name": (
                subscription.platform_user.name
                if subscription.platform_user_id
                else subscription.patient.name
                if subscription.patient_id
                else ""
            ),
        })

    def post(self, request, subscription_id):
        with transaction.atomic():
            subscription = get_object_or_404(
                PlanOrder.objects.select_for_update().select_related(
                    "plan", "patient", "platform_user"
                ),
                pk=subscription_id,
            )
            if subscription.family_members.count() >= max(
                subscription.plan.maximum_family_members - 1, 0
            ):
                raise ValidationError({"family_members": "The plan family-member limit has been reached."})
            member = validate_plan_family_member(
                subscription, request.data, PlanFamilyMember(
                    subscription=subscription,
                    is_development_data=False,
                )
            )
            member.save()
        return Response(_family_member_row(member), status=201)

    def patch(self, request, subscription_id, member_id=None):
        if member_id is None:
            raise ValidationError({"member": "Choose a family member to update."})
        with transaction.atomic():
            subscription = get_object_or_404(
                PlanOrder.objects.select_for_update().select_related(
                    "plan", "patient", "platform_user"
                ),
                pk=subscription_id,
            )
            member = get_object_or_404(
                PlanFamilyMember.objects.select_for_update(),
                pk=member_id,
                subscription=subscription,
            )
            validate_plan_family_member(subscription, request.data, member)
            member.save(update_fields=["name", "relationship", "email"])
        return Response(_family_member_row(member))

    def delete(self, request, subscription_id, member_id=None):
        with transaction.atomic():
            subscription = get_object_or_404(
                PlanOrder.objects.select_for_update(),
                pk=subscription_id,
            )
            member = get_object_or_404(
                PlanFamilyMember.objects.select_for_update(),
                pk=member_id,
                subscription=subscription,
            )
            member.delete()
        return Response(status=204)


def _family_member_row(member):
    return {
        "id": member.pk,
        "subscription_id": member.subscription_id,
        "name": member.name,
        "relationship": member.relationship,
        "email": member.email,
        "platform_user_id": member.platform_user_id,
        "platform_user_name": member.platform_user.name if member.platform_user_id else "",
        "created_at": member.created_at.isoformat(),
    }


class HealthPlanBenefitUsageView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"

    def get(self, request):
        usage = HealthPlanBenefitUsage.objects.select_related(
            "subscription", "subscription__plan", "subscription__patient",
            "subscription__platform_user",
        )
        subscription_id = request.query_params.get("subscription")
        if subscription_id:
            usage = usage.filter(subscription_id=subscription_id)
        groups = {}
        for event in usage:
            key = (event.subscription_id, event.benefit_code, event.period_start)
            group = groups.setdefault(
                key,
                {
                    "subscription": event.subscription,
                    "benefit_code": event.benefit_code,
                    "period_start": event.period_start,
                    "used": 0,
                    "event_count": 0,
                    "latest": event,
                },
            )
            group["used"] += event.quantity
            group["event_count"] += 1
            if event.created_at > group["latest"].created_at:
                group["latest"] = event

        benefit_labels = {
            "consultation": "Free consultations / month",
            "home_sample": "Free home samples / year",
            "annual_checkup": "Annual checkups / year",
            "pharmacy_discount": "Pharmacy discount",
            "lab_discount": "Lab discount",
        }
        serialized = []
        for group in groups.values():
            subscription = group["subscription"]
            plan = subscription.plan
            benefit_code = group["benefit_code"]
            allowances = {
                "consultation": (
                    plan.free_consultations_per_month,
                    "Unlimited" if plan.free_consultations_per_month is None
                    else plan.free_consultations_per_month,
                ),
                "home_sample": (
                    plan.free_home_sample_count, plan.free_home_sample_count
                ),
                "annual_checkup": (
                    plan.annual_checkup_count, plan.annual_checkup_count
                ),
                "pharmacy_discount": (
                    None, f"{plan.pharmacy_discount_percent}% per eligible order"
                ),
                "lab_discount": (
                    None, f"{plan.lab_discount_percent}% per eligible booking"
                ),
            }
            limit, allowed = allowances.get(
                benefit_code,
                (None, "Not configured as a capped benefit"),
            )
            used = group["used"]
            remaining = max(limit - used, 0) if limit is not None else None
            if limit is None:
                status_label = (
                    "unlimited" if benefit_code == "consultation" else "unmetered"
                )
            else:
                status_label = "exhausted" if remaining == 0 else "available"
            latest = group["latest"]
            serialized.append({
                "id": latest.pk,
                "subscription_id": subscription.pk,
                "order_number": subscription.order_number,
                "patient_id": str(
                    subscription.platform_user_id or subscription.patient_id or ""
                ),
                "patient_name": (
                    subscription.patient.name
                    if subscription.patient_id
                    else subscription.platform_user.name
                    if subscription.platform_user_id
                    else ""
                ),
                "plan_name": plan.name,
                "benefit_code": benefit_code,
                "benefit": benefit_labels.get(
                    benefit_code, benefit_code.replace("_", " ").title()
                ),
                "quantity": used,
                "used": used,
                "limit": limit,
                "allowed": allowed,
                "remaining": remaining,
                "status": status_label,
                "period_start": group["period_start"].isoformat(),
                "event_count": group["event_count"],
                "source_type": latest.source_type,
                "source_id": latest.source_id,
                "detail": latest.detail,
                "usage_date": latest.created_at.isoformat(),
                "created_at": latest.created_at.isoformat(),
            })
        return Response({"results": serialized, "count": len(serialized)})


class HealthPlanPatientsView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"

    def get(self, request):
        accounts = list(
            PlatformUser.objects.filter(
                role=PlatformUser.Role.PATIENT,
                is_active=True,
                is_blocked=False,
            ).order_by("name").values("id", "name")[:500]
        )
        patients = {
            str(row.external_id): row.name
            for row in CarePatient.objects.filter(
                external_id__in=[str(account["id"]) for account in accounts]
            )
        }
        results = [
            {
                "id": str(account["id"]),
                "name": patients.get(str(account["id"])) or account["name"],
            }
            for account in accounts
        ]
        return Response({"results": sorted(results, key=lambda row: row["name"].lower())})


class HealthPlanRefundsView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"post": "edit"}

    def get(self, request):
        requests = CommerceRefundRequest.objects.filter(
            transaction__order_type=CommerceTransaction.OrderType.PLAN
        ).select_related(
            "transaction",
            "transaction__patient",
            "transaction__platform_user",
            "transaction__plan_order",
            "transaction__plan_order__plan",
            "reviewed_by",
        )
        rows = [
            {
                "id": row.pk,
                "subscription_id": row.transaction.order_id,
                "order_number": (
                    row.transaction.plan_order.order_number
                    if row.transaction.plan_order_id
                    else f"PL-{int(row.transaction.order_id):06d}"
                    if row.transaction.order_id.isdigit()
                    else row.transaction.order_id
                ),
                "plan_name": (
                    row.transaction.plan_order.plan.name
                    if row.transaction.plan_order_id
                    else ""
                ),
                "patient_name": row.transaction.patient_name
                or getattr(row.transaction.patient, "name", "")
                or getattr(row.transaction.platform_user, "name", ""),
                "payment_transaction_id": row.transaction_id,
                "payment_order_id": row.transaction.order_id,
                "payment_reference": row.transaction.reference,
                "payment_status": row.transaction.status,
                "payment_method": row.transaction.method,
                "amount": str(row.amount),
                "currency": "INR",
                "status": row.status,
                "reason": row.reason,
                "rejection_reason": row.rejection_reason,
                "destination": row.destination,
                "reviewed_by": (
                    row.reviewed_by.get_full_name() or row.reviewed_by.username
                    if row.reviewed_by_id
                    else ""
                ),
                "refund_transactions": [
                    {
                        "id": entry.pk,
                        "reference": entry.reference,
                        "status": entry.status,
                        "method": entry.method,
                        "amount": str(entry.amount),
                        "created_at": entry.created_at.isoformat(),
                    }
                    for entry in row.transaction.refund_transactions.order_by(
                        "-created_at", "-id"
                    )
                ],
                "date": row.created_at.isoformat(),
                "requested_at": row.created_at.isoformat(),
                "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
            }
            for row in requests
        ]
        return Response({
            "results": rows,
            "count": len(rows),
            "total_count": len(rows),
            "pending_count": sum(
                1 for row in rows if row["status"] == CommerceRefundRequest.Status.PENDING
            ),
        })

    def post(self, request, refund_id):
        from .views import _approve_commerce_refund, _refund_transaction, _reject_refund

        action = str(request.data.get("action") or "").lower()
        reason = str(request.data.get("reason") or "").strip()
        if action not in {"approve", "reject"}:
            raise ValidationError({"action": "Choose approve or reject."})
        if action == "reject" and not reason:
            raise ValidationError({"reason": "A rejection reason is required."})
        with transaction.atomic():
            item = get_object_or_404(
                CommerceRefundRequest.objects.select_for_update().select_related(
                    "transaction", "transaction__patient", "transaction__platform_user"
                ),
                pk=refund_id,
                transaction__order_type=CommerceTransaction.OrderType.PLAN,
            )
            if item.status != CommerceRefundRequest.Status.PENDING:
                raise ValidationError({"status": "Only pending refunds can be reviewed."})
            if action == "reject":
                _reject_refund("commerce", item, reason, request.user)
                return Response({"id": item.pk, "status": item.status})
            original = item.transaction
            _approve_commerce_refund(
                item, CommerceRefundRequest.Destination.WALLET, request.user
            )
            _refund_transaction(
                CommerceTransaction.OrderType.PLAN,
                original.order_id,
                item.amount,
                CommerceTransaction.Method.WALLET,
                original.patient,
                original.patient_name,
                request.user,
            )
        return Response({"id": item.pk, "status": item.status, "destination": "wallet"})


class HealthPlanCalculatorView(APIView):
    permission_classes = [ModulePermission]
    module = "health_plans"
    action_map = {"get": "view", "patch": "edit"}

    def get(self, request):
        config, _ = HealthPlanCalculatorConfig.objects.get_or_create(
            pk=1, defaults={"is_development_data": False}
        )
        return Response(_calculator_row(config))

    def patch(self, request):
        allowed = {
            "doctor_visits_min", "doctor_visits_max", "doctor_visits_default",
            "pharmacy_spend_min", "pharmacy_spend_max", "pharmacy_spend_step",
            "pharmacy_spend_default", "lab_spend_min", "lab_spend_max",
            "lab_spend_step", "lab_spend_default", "consultation_value",
        }
        unknown = set(request.data) - allowed
        if unknown:
            raise ValidationError({"fields": f"Unsupported fields: {', '.join(sorted(unknown))}."})
        config, _ = HealthPlanCalculatorConfig.objects.get_or_create(
            pk=1, defaults={"is_development_data": False}
        )
        for field, value in request.data.items():
            setattr(config, field, value)
        if not (
            config.doctor_visits_min <= config.doctor_visits_default <= config.doctor_visits_max
            and config.pharmacy_spend_min <= config.pharmacy_spend_default <= config.pharmacy_spend_max
            and config.lab_spend_min <= config.lab_spend_default <= config.lab_spend_max
            and config.pharmacy_spend_step > 0
            and config.lab_spend_step > 0
        ):
            raise ValidationError({"ranges": "Each default must be within its range and slider steps must be positive."})
        try:
            config.full_clean()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        config.save()
        return Response(_calculator_row(config))


def _calculator_row(config):
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
        "updated_at": config.updated_at.isoformat(),
    }
