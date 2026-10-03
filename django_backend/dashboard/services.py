"""Aggregate dashboard metrics from Django ORM-backed Admin modules."""
from collections import Counter
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Count
from .models import PlatformDoctor, PlatformUser

VALID_PERIODS = ("today", "7", "30")

# metric -> what the backend is missing. Keeps the API honest and self-documenting.
UNAVAILABLE = {
    "pending_medicine_orders": "No medicine/pharmacy orders model.",
    "lab_test_bookings": "No lab-test bookings model.",
    "sample_collections": "No sample-collections model.",
    "prescription_reviews": "No prescriptions model.",
    "internship_applications": "No internship-applications model in the Node backend.",
    "low_stock_products": "No products/inventory model.",
    "unassigned_sample_bookings": "No sample-bookings model.",
    "open_support_tickets": "No support-tickets model.",
    "revenue_trend": "Depends on revenue (no payments model).",
    "revenue_by_module": "Depends on revenue (no payments model).",
    "order_trend": "Depends on medicine orders (no orders model).",
    "recent_orders": "No orders model.",
}

SOURCES = {
    "total_users": "django:dashboard.PlatformUser",
    "new_patients": "django:dashboard.PlatformUser (role=patient, created_at in period)",
    "user_registration_trend": "django:dashboard.PlatformUser.created_at",
    "total_doctors": "django:dashboard.PlatformDoctor",
    "doctor_verifications": "django:dashboard.PlatformDoctor (verification_status=pending)",
    "recent_users": "django:dashboard.PlatformUser",
    "admin_activity": "django:audit.AuditLog",
    "users_by_role": "django:dashboard.PlatformUser grouped by role",
    "doctors_by_specialty": "django:dashboard.PlatformDoctor grouped by specialty",
    "healthcare_providers": "django:providers.HealthcareProvider",
    "provider_documents": "django:providers.ProviderDocument",
    "coupons_offers": "django:marketing.Coupon, Promotion, FeaturedPromotion, PromotionalContent",
    "care": "django:care.Doctor, Appointment, InstantConsult, Review, DoctorPayout",
}


def dashboard_tz():
    return ZoneInfo(getattr(settings, "DASHBOARD_TIMEZONE", "Asia/Kolkata"))


def normalize_period(value):
    value = str(value or "7").lower()
    return value if value in VALID_PERIODS else "7"


def period_window(period, now=None):
    """(start, end) as aware UTC datetimes. Boundaries follow DASHBOARD_TIMEZONE."""
    tz = dashboard_tz()
    local_now = (now or datetime.now(dt_timezone.utc)).astimezone(tz)
    midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    days_back = {"today": 0, "7": 6, "30": 29}[period]
    start_local = midnight - timedelta(days=days_back)
    return start_local.astimezone(dt_timezone.utc), local_now.astimezone(dt_timezone.utc)


def _trend(period, start, end):
    """Zero-filled registration counts, hourly for today and daily otherwise."""
    tz = dashboard_tz()
    hourly = period == "today"
    counts = Counter()
    registrations = (
        PlatformUser.objects.filter(created_at__gte=start, created_at__lte=end)
        .values_list("created_at", flat=True)
        .iterator()
    )
    for created_at in registrations:
        local_created_at = created_at.astimezone(tz)
        key = local_created_at.strftime(
            "%Y-%m-%d %H:00" if hourly else "%Y-%m-%d"
        )
        counts[key] += 1

    series = []
    cursor = start.astimezone(tz)
    last = end.astimezone(tz)
    step = timedelta(hours=1) if hourly else timedelta(days=1)
    while cursor <= last:
        key = cursor.strftime("%Y-%m-%d %H:00") if hourly else cursor.strftime("%Y-%m-%d")
        series.append({
            "date": key,
            "label": cursor.strftime("%H:00") if hourly else cursor.strftime("%d %b"),
            "count": counts.get(key, 0),
        })
        cursor += step
    return series


def _safe_user(user):
    """Whitelisted fields only - never expose account credentials."""
    return {
        "id": user.pk,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _group_counts(queryset, field, key_name, limit=None, fallback="Unspecified"):
    rows = (
        queryset.values(field)
        .annotate(count=Count("id"))
        .order_by("-count", field)
    )
    if limit:
        rows = rows[:limit]
    return [
        {key_name: row[field] or fallback, "count": row["count"]}
        for row in rows
    ]


def _merge_counts(*groups, key_name, limit=None):
    totals = {}
    for group in groups:
        for row in group:
            key = row.get(key_name) or "Unspecified"
            totals[key] = totals.get(key, 0) + row["count"]
    rows = [
        {key_name: key, "count": count}
        for key, count in sorted(totals.items(), key=lambda item: (-item[1], item[0]))
    ]
    return rows[:limit] if limit else rows


def build_overview(
    period,
    can_see_users=True,
    audit_rows=None,
    provider_stats=None,
    coupon_stats=None,
    care_stats=None,
):
    start, end = period_window(period)
    users = PlatformUser.objects.all()
    doctors = PlatformDoctor.objects.all()
    new_patients = users.filter(
        role=PlatformUser.Role.PATIENT,
        created_at__gte=start,
        created_at__lte=end,
    )

    platform_overview = {
        "total_users": users.count(),
        "total_doctors": doctors.count(),
        "care_total_doctors": (care_stats or {}).get("total_doctors"),
        "care_verified_doctors": (care_stats or {}).get("verified_doctors"),
        "care_pending_doctors": (care_stats or {}).get("pending_doctors"),
        "total_hospitals": (provider_stats or {}).get("total_hospitals"),
        "total_clinics": (provider_stats or {}).get("total_clinics"),
        "total_diagnostic_centres": (provider_stats or {}).get(
            "total_diagnostic_centres"
        ),
        "total_pharmacies": (provider_stats or {}).get("total_pharmacies"),
    }

    live_stats = {
        "today_appointments": (care_stats or {}).get("today_appointments"),
        "pending_medicine_orders": None,
        "lab_test_bookings": None,
        "sample_collections": None,
        "revenue": (care_stats or {}).get("consultation_revenue"),
        "new_patients": new_patients.count(),
    }

    needs_attention = {
        "doctor_verifications": (
            doctors.filter(
                verification_status=PlatformDoctor.VerificationStatus.PENDING
            ).count()
            + (care_stats or {}).get("pending_doctors", 0)
        ),
        "provider_approvals": (provider_stats or {}).get("provider_approvals"),
        "document_verifications": (provider_stats or {}).get(
            "document_verifications"
        ),
        "pending_reviews": (care_stats or {}).get("pending_reviews"),
        "refund_requests": (care_stats or {}).get("pending_refunds"),
        "unassigned_instant_consults": (care_stats or {}).get("unassigned_consults"),
        "pending_payouts": (care_stats or {}).get("pending_payouts"),
        "patients_waiting_over_15_minutes": (care_stats or {}).get(
            "waiting_over_15_minutes"
        ),
        "internship_applications": None,
        "low_stock_products": None,
        "unassigned_sample_bookings": None,
        "open_support_tickets": None,
    }

    charts = {
        "revenue_trend": [],
        "revenue_by_module": [],
        "appointments_by_specialty": (care_stats or {}).get("appointments_by_specialty", []),
        "user_registration_trend": _trend(period, start, end),
        "order_trend": [],
    }

    # Real, period-independent breakdowns used by the dashboard distribution
    # panels. Kept outside `charts` so the 5-chart contract stays untouched.
    distributions = {
        "users_by_role": _group_counts(users, "role", "role"),
        "doctors_by_specialty": _merge_counts(
            _group_counts(doctors, "specialty", "specialty"),
            (care_stats or {}).get("doctors_by_specialty", []),
            key_name="specialty",
            limit=8,
        ),
    }

    recent_users = []
    if can_see_users:
        recent_users = [_safe_user(user) for user in users[:5]]

    return {
        "period": period,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "platform_overview": platform_overview,
        "live_stats": live_stats,
        "care": care_stats,
        "needs_attention": needs_attention,
        "coupons_offers": coupon_stats,
        "charts": charts,
        "distributions": distributions,
        "recent_activity": {
            "users": recent_users,
            "appointments": (care_stats or {}).get("recent_appointments", []),
            "orders": [],
            "admin_activity": audit_rows if audit_rows is not None else [],
        },
    }


def unavailable_list():
    return [{"metric": k, "reason": v} for k, v in UNAVAILABLE.items()]
