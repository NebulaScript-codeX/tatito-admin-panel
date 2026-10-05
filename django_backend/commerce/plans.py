from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from care.models import CarePatient
from dashboard.models import PlatformUser

from .models import HealthPlanBenefitUsage, PlanFamilyMember, PlanOrder
from .services import platform_user_for_patient


def plan_benefit_lines(plan):
    lines = []
    consultation_limit = plan.free_consultations_per_month
    if consultation_limit is None:
        lines.append("Unlimited free doctor consultations")
    elif consultation_limit:
        lines.append(f"{consultation_limit} free doctor consultations / month")
    if plan.pharmacy_discount_percent:
        lines.append(f"{plan.pharmacy_discount_percent.normalize():g}% off pharmacy orders")
    if plan.lab_discount_percent:
        lines.append(f"{plan.lab_discount_percent.normalize():g}% off lab tests")
    if plan.free_home_sample_count:
        lines.append(f"{plan.free_home_sample_count} free home sample collections")
    if plan.annual_checkup_count:
        lines.append(f"{plan.annual_checkup_count} annual checkup(s)")
    if plan.ambulance_discount_percent:
        if plan.ambulance_discount_percent == 100:
            lines.append("Emergency ambulance covered")
        else:
            lines.append(f"{plan.ambulance_discount_percent.normalize():g}% ambulance benefit")
    if plan.care_manager:
        lines.append("Dedicated care manager")
    if isinstance(plan.custom_benefits, list):
        lines.extend(
            str(item).strip()
            for item in plan.custom_benefits
            if isinstance(item, str) and item.strip()
        )
    legacy = plan.features if isinstance(plan.features, list) else []
    for item in legacy:
        if isinstance(item, str) and item.strip() and item.strip() not in lines:
            lines.append(item.strip())
    return lines


def plan_public_row(plan):
    annual_monthly = Decimal(plan.annual_monthly_price)
    monthly = Decimal(plan.monthly_price)
    saving = (
        max(Decimal("0"), (monthly - annual_monthly) * 100 / monthly)
        if monthly
        else Decimal("0")
    )
    return {
        "code": plan.code,
        "name": plan.name,
        "monthly_price": str(monthly),
        "annual_monthly_price": str(annual_monthly),
        "annual_price": str((annual_monthly * 12).quantize(Decimal("0.01"))),
        "annual_saving_percent": str(saving.quantize(Decimal("0.01"))),
        "badge": plan.badge,
        "tagline": plan.tagline,
        "color": plan.color,
        "features": plan_benefit_lines(plan),
        "exclusions": plan.exclusions if isinstance(plan.exclusions, list) else [],
        "maximum_family_members": plan.maximum_family_members,
        "is_popular": plan.is_popular,
        "benefits": {
            "free_consultations_per_month": plan.free_consultations_per_month,
            "pharmacy_discount_percent": str(plan.pharmacy_discount_percent),
            "lab_discount_percent": str(plan.lab_discount_percent),
            "free_home_sample_count": plan.free_home_sample_count,
            "annual_checkup_count": plan.annual_checkup_count,
            "ambulance_discount_percent": str(plan.ambulance_discount_percent),
            "care_manager": plan.care_manager,
            "custom_benefits": plan.custom_benefits if isinstance(plan.custom_benefits, list) else [],
        },
        "is_active": plan.is_active,
    }


def patient_account(patient):
    if patient is None or not patient.external_id:
        return None
    return PlatformUser.objects.filter(
        pk=patient.external_id,
        role=PlatformUser.Role.PATIENT,
        is_active=True,
        is_blocked=False,
    ).first()


def active_plan_subscription(patient):
    expire_plan_subscriptions()
    account = patient_account(patient)
    if account is None:
        return None
    now = timezone.now()
    return (
        PlanOrder.objects.select_related("plan", "platform_user")
        .filter(
            platform_user=account,
            status=PlanOrder.Status.ACTIVE,
            payment_status=PlanOrder.PaymentStatus.PAID,
            is_deactivated=False,
            is_blocked=False,
            is_archived=False,
            starts_at__lte=now,
            ends_at__gt=now,
        )
        .order_by("-starts_at", "-created_at")
        .first()
    )


def current_month_start(on=None):
    on = on or timezone.localdate()
    return date(on.year, on.month, 1)


def current_year_start(on=None):
    on = on or timezone.localdate()
    return date(on.year, 1, 1)


def subscription_end(started_at, billing_period):
    months = 12 if billing_period == PlanOrder.BillingPeriod.ANNUAL else 1
    month_index = started_at.month - 1 + months
    year = started_at.year + month_index // 12
    month = month_index % 12 + 1
    day = min(started_at.day, monthrange(year, month)[1])
    return started_at.replace(year=year, month=month, day=day)


def expire_plan_subscriptions():
    now = timezone.now()
    PlanOrder.objects.filter(
        status=PlanOrder.Status.ACTIVE,
        payment_status=PlanOrder.PaymentStatus.PAID,
        ends_at__lte=now,
    ).update(status=PlanOrder.Status.EXPIRED, updated_at=now)


def benefit_period_start(code, on=None):
    on = on or timezone.localdate()
    return current_year_start(on) if code in {"annual_checkup", "home_sample"} else current_month_start(on)


def usage_total(subscription, code, period_start=None):
    start = period_start or benefit_period_start(code)
    return sum(
        HealthPlanBenefitUsage.objects.filter(
            subscription=subscription,
            benefit_code=code,
            period_start=start,
        ).values_list("quantity", flat=True)
    )


@transaction.atomic
def record_benefit_usage(
    subscription,
    code,
    source_type,
    source_id,
    *,
    quantity=1,
    detail="",
    period_start=None,
):
    subscription = PlanOrder.objects.select_for_update().select_related("plan").get(
        pk=subscription.pk
    )
    start = period_start or benefit_period_start(code)
    entry, created = HealthPlanBenefitUsage.objects.get_or_create(
        subscription=subscription,
        benefit_code=code,
        source_type=source_type,
        source_id=str(source_id),
        defaults={
            "quantity": quantity,
            "period_start": start,
            "detail": detail[:240],
            "is_development_data": False,
        },
    )
    if not created:
        return entry

    limit = (
        subscription.plan.free_consultations_per_month
        if code == "consultation"
        else subscription.plan.free_home_sample_count
        if code == "home_sample"
        else subscription.plan.annual_checkup_count
        if code == "annual_checkup"
        else None
    )
    if limit is not None and usage_total(subscription, code, start) > limit:
        entry.delete()
        raise ValidationError({"benefit": "This plan benefit has reached its usage limit."})
    return entry


def subscription_usage(subscription):
    today = timezone.localdate()
    plan = subscription.plan
    benefits = [
        (
            "consultation",
            "Free consultations / month",
            plan.free_consultations_per_month,
            "Unlimited" if plan.free_consultations_per_month is None else plan.free_consultations_per_month,
            current_month_start(today),
        ),
        (
            "home_sample",
            "Free home samples / year",
            plan.free_home_sample_count,
            plan.free_home_sample_count,
            current_year_start(today),
        ),
        (
            "annual_checkup",
            "Annual checkups / year",
            plan.annual_checkup_count,
            plan.annual_checkup_count,
            current_year_start(today),
        ),
        (
            "pharmacy_discount",
            "Pharmacy discount uses / month",
            None,
            f"{plan.pharmacy_discount_percent}% per eligible order",
            current_month_start(today),
        ),
        (
            "lab_discount",
            "Lab discount uses / month",
            None,
            f"{plan.lab_discount_percent}% per eligible booking",
            current_month_start(today),
        ),
    ]
    usage = []
    for code, label, limit, allowed, start in benefits:
        used = usage_total(subscription, code, start)
        remaining = max(limit - used, 0) if limit is not None else None
        usage.append({
            "code": code,
            "label": label,
            "used": used,
            "limit": limit,
            "allowed": allowed,
            "remaining": remaining,
            "status": (
                "unlimited"
                if limit is None and code == "consultation"
                else "unmetered"
                if limit is None
                else "exhausted"
                if remaining == 0
                else "available"
            ),
            "period_start": start.isoformat(),
        })
    return usage


def validate_plan_family_member(subscription, payload, member=None):
    allowed_fields = {"name", "relationship", "email"}
    unknown_fields = set(payload) - allowed_fields
    if unknown_fields:
        raise ValidationError(
            {"fields": f"Unsupported fields: {', '.join(sorted(unknown_fields))}."}
        )
    if subscription.platform_user_id is None and subscription.patient_id is None:
        raise ValidationError({"subscription": "The subscription has no linked patient."})
    linked_account = platform_user_for_patient(subscription.patient)
    if (
        linked_account
        and subscription.platform_user_id
        and linked_account.pk != subscription.platform_user_id
    ):
        raise ValidationError(
            {"subscription": "The patient and account linked to this subscription do not match."}
        )

    member = member or PlanFamilyMember(subscription=subscription)
    for field in allowed_fields.intersection(payload):
        setattr(member, field, str(payload[field] or "").strip())
    if not member.name:
        raise ValidationError({"name": "Enter a family member name."})

    duplicate_query = PlanFamilyMember.objects.filter(
        subscription=subscription,
        name__iexact=member.name,
        relationship__iexact=member.relationship,
        email__iexact=member.email,
    )
    if member.pk:
        duplicate_query = duplicate_query.exclude(pk=member.pk)
    if duplicate_query.exists():
        raise ValidationError(
            {"family_member": "This family member is already on the subscription."}
        )
    if member.email:
        duplicate_email = PlanFamilyMember.objects.filter(
            subscription=subscription,
            email__iexact=member.email,
        )
        if member.pk:
            duplicate_email = duplicate_email.exclude(pk=member.pk)
        if duplicate_email.exists():
            raise ValidationError(
                {"email": "This email is already used by another family member on the subscription."}
            )

    try:
        member.full_clean()
    except DjangoValidationError as exc:
        raise ValidationError(
            exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        )
    return member
