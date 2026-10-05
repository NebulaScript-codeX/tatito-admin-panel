from decimal import Decimal
from uuid import uuid4

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import (
    CommerceTransaction,
    PlanOrder,
    PlanSubscriptionChange,
    PlanSubscriptionHistory,
)
from .plans import subscription_end


def subscription_snapshot(order):
    return {
        "subscription_id": order.pk,
        "order_number": order.order_number,
        "plan_id": order.plan_id,
        "plan_name": order.plan.name,
        "amount": str(order.amount),
        "billing_period": order.billing_period,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "starts_at": order.starts_at.isoformat() if order.starts_at else None,
        "ends_at": order.ends_at.isoformat() if order.ends_at else None,
        "is_deactivated": order.is_deactivated,
        "is_blocked": order.is_blocked,
        "is_archived": order.is_archived,
        "captured_at": timezone.now().isoformat(),
    }


def record_subscription_history(order, event_type, snapshot):
    return PlanSubscriptionHistory.objects.create(
        subscription=order,
        event_type=event_type,
        snapshot=snapshot,
        is_development_data=False,
    )


def stage_subscription_change(subscription, change_type, plan, billing_period, method):
    if billing_period not in PlanOrder.BillingPeriod.values:
        raise ValidationError({"billing_period": "Select monthly or annual billing."})
    monthly = (
        plan.annual_monthly_price
        if billing_period == PlanOrder.BillingPeriod.ANNUAL
        else plan.monthly_price
    )
    amount = monthly * (
        12 if billing_period == PlanOrder.BillingPeriod.ANNUAL else 1
    )
    if amount <= Decimal("0"):
        raise ValidationError({"amount": "Plan price must be greater than zero."})
    with transaction.atomic():
        change = PlanSubscriptionChange.objects.create(
            subscription=subscription,
            change_type=change_type,
            target_plan=plan,
            billing_period=billing_period,
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
            order_id=str(subscription.pk),
            patient=subscription.patient,
            platform_user=subscription.platform_user,
            plan_order=subscription,
            patient_name=(
                subscription.patient.name
                if subscription.patient_id
                else subscription.platform_user.name
            ),
            note=f"Health plan {change_type} payment is pending confirmation.",
            is_development_data=False,
        )
        change.transaction = payment
        change.save(update_fields=["transaction"])
        record_subscription_history(
            subscription,
            f"{change_type}_requested",
            {
                "before": subscription_snapshot(subscription),
                "requested": {
                    "change_id": change.pk,
                    "plan_id": plan.pk,
                    "plan_name": plan.name,
                    "amount": str(amount),
                    "billing_period": billing_period,
                    "payment_method": method,
                    "transaction_id": payment.pk,
                    "transaction_reference": payment.reference,
                    "payment_status": payment.status,
                },
            },
        )
    return change


def complete_subscription_change(change, payment):
    subscription = (
        PlanOrder.objects.select_for_update()
        .select_related("plan")
        .get(pk=change.subscription_id)
    )
    if subscription.is_deactivated or subscription.is_blocked or subscription.is_archived:
        raise ValidationError({"status": "A blocked, deactivated, or archived subscription cannot be renewed."})
    before = subscription_snapshot(subscription)
    changed_at = timezone.now()
    starts_at = changed_at
    ends_at = None
    if change.change_type in {
        PlanSubscriptionChange.ChangeType.UPGRADE,
        PlanSubscriptionChange.ChangeType.DOWNGRADE,
    }:
        starts_at = subscription.starts_at or changed_at
        ends_at = subscription.ends_at
    elif (
        change.change_type == PlanSubscriptionChange.ChangeType.RENEWAL
        and subscription.status == PlanOrder.Status.ACTIVE
        and subscription.ends_at
        and subscription.ends_at > changed_at
    ):
        starts_at = subscription.ends_at
    subscription.plan = change.target_plan
    subscription.billing_period = change.billing_period
    subscription.amount = change.amount
    subscription.payment_method = payment.method
    subscription.status = PlanOrder.Status.ACTIVE
    subscription.payment_status = PlanOrder.PaymentStatus.PAID
    subscription.starts_at = starts_at
    subscription.ends_at = ends_at or subscription_end(starts_at, change.billing_period)
    subscription.cancelled_at = None
    subscription.save(update_fields=[
        "plan",
        "billing_period",
        "amount",
        "payment_method",
        "status",
        "payment_status",
        "starts_at",
        "ends_at",
        "cancelled_at",
        "updated_at",
    ])
    change.status = PlanSubscriptionChange.Status.SUCCESSFUL
    change.completed_at = changed_at
    change.save(update_fields=["status", "completed_at"])
    record_subscription_history(
        subscription,
        f"{change.change_type}_completed",
        {
            "before": before,
            "after": subscription_snapshot(subscription),
            "transaction_id": payment.pk,
            "transaction_reference": payment.reference,
            "payment_status": payment.status,
        },
    )
    return subscription


def fail_subscription_change(change, payment):
    if change.status != PlanSubscriptionChange.Status.PENDING:
        return
    change.status = PlanSubscriptionChange.Status.FAILED
    change.completed_at = timezone.now()
    change.save(update_fields=["status", "completed_at"])
    record_subscription_history(
        change.subscription,
        f"{change.change_type}_failed",
        {
            "subscription": subscription_snapshot(change.subscription),
            "requested": {
                "change_id": change.pk,
                "plan_id": change.target_plan_id,
                "plan_name": change.target_plan.name,
                "amount": str(change.amount),
                "billing_period": change.billing_period,
                "transaction_id": payment.pk,
                "transaction_reference": payment.reference,
                "payment_status": payment.status,
            },
        },
    )
