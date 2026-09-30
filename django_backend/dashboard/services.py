"""
Dashboard aggregation.

Every number here is read from the Node app's MongoDB. The only collections the
Node app currently defines are:  users (User.js), doctors (Doctor.js),
reviews (Review.js). Anything else the dashboard spec asks for has NO backend
source yet, so it is returned as null / [] and listed in `meta.unavailable`
- never estimated, never guessed from similarly named collections.
"""
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.conf import settings

# Node model -> Mongo collection (Mongoose pluralises model names).
USERS = "users"
DOCTORS = "doctors"

VALID_PERIODS = ("today", "7", "30")

# metric -> what the backend is missing. Keeps the API honest and self-documenting.
UNAVAILABLE = {
    "total_hospitals": "No hospitals collection/model in the Node backend.",
    "total_clinics": "No clinics collection/model in the Node backend.",
    "total_diagnostic_centres": "No diagnostic-centres collection/model in the Node backend.",
    "total_pharmacies": "No pharmacies collection/model in the Node backend.",
    "today_appointments": "No appointments model (only Doctor/User/Review exist).",
    "pending_medicine_orders": "No medicine/pharmacy orders model.",
    "lab_test_bookings": "No lab-test bookings model.",
    "sample_collections": "No sample-collections model.",
    "revenue": "No payments/orders/bookings model to derive revenue from.",
    "provider_approvals": "No provider (hospital/clinic/lab/pharmacy) model.",
    "document_verifications": "No documents/verification model.",
    "prescription_reviews": "No prescriptions model.",
    "refund_requests": "No refunds/payments model.",
    "internship_applications": "No internship-applications model in the Node backend.",
    "low_stock_products": "No products/inventory model.",
    "unassigned_sample_bookings": "No sample-bookings model.",
    "open_support_tickets": "No support-tickets model.",
    "revenue_trend": "Depends on revenue (no payments model).",
    "revenue_by_module": "Depends on revenue (no payments model).",
    "appointments_by_specialty": "Depends on appointments (no appointments model).",
    "order_trend": "Depends on medicine orders (no orders model).",
    "recent_appointments": "No appointments model.",
    "recent_orders": "No orders model.",
}

SOURCES = {
    "total_users": "mongo:users",
    "new_patients": "mongo:users (role=patient, createdAt in period)",
    "user_registration_trend": "mongo:users.createdAt",
    "total_doctors": "mongo:doctors",
    "doctor_verifications": "mongo:doctors (verified=false)",
    "recent_users": "mongo:users",
    "admin_activity": "django:audit.AuditLog",
    "users_by_role": "mongo:users grouped by role",
    "doctors_by_specialty": "mongo:doctors grouped by specialty",
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


def _iso(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt_timezone.utc)
        return value.isoformat()
    return value


def _count(collection, query=None):
    return collection.count_documents(query or {})


def _trend(collection, period, start, end, extra_query=None, date_field="createdAt"):
    """Zero-filled count-per-bucket series (hourly for 'today', daily otherwise)."""
    tz = dashboard_tz()
    hourly = period == "today"
    query = {date_field: {"$gte": start, "$lte": end}}
    if extra_query:
        query.update(extra_query)

    counts = {}
    for doc in collection.find(query, {date_field: 1}):
        stamp = doc.get(date_field)
        if not isinstance(stamp, datetime):
            continue
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=dt_timezone.utc)
        local = stamp.astimezone(tz)
        key = local.strftime("%Y-%m-%d %H:00") if hourly else local.strftime("%Y-%m-%d")
        counts[key] = counts.get(key, 0) + 1

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


def _group_counts(collection, field, key_name, limit=None, fallback="Unspecified"):
    """[{key_name: value, count: n}] sorted by count desc, straight from Mongo."""
    pipeline = [
        {"$group": {"_id": "$" + field, "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
    ]
    if limit:
        pipeline.append({"$limit": limit})
    return [
        {key_name: row["_id"] or fallback, "count": row["count"]}
        for row in collection.aggregate(pipeline)
    ]


def _safe_user(doc):
    """Whitelisted fields only - never leak passwordHash."""
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", ""),
        "created_at": _iso(doc.get("createdAt")),
    }


def build_overview(db, period, can_see_users=True, audit_rows=None):
    start, end = period_window(period)
    users = db[USERS]
    doctors = db[DOCTORS]

    in_period = {"$gte": start, "$lte": end}

    platform_overview = {
        "total_users": _count(users),
        "total_doctors": _count(doctors),
        "total_hospitals": None,
        "total_clinics": None,
        "total_diagnostic_centres": None,
        "total_pharmacies": None,
    }

    live_stats = {
        "today_appointments": None,
        "pending_medicine_orders": None,
        "lab_test_bookings": None,
        "sample_collections": None,
        "revenue": None,
        "new_patients": _count(users, {"role": "patient", "createdAt": in_period}),
    }

    needs_attention = {
        "doctor_verifications": _count(doctors, {"verified": False}),
        "provider_approvals": None,
        "document_verifications": None,
        "prescription_reviews": None,
        "refund_requests": None,
        "internship_applications": None,
        "low_stock_products": None,
        "unassigned_sample_bookings": None,
        "open_support_tickets": None,
    }

    charts = {
        "revenue_trend": [],
        "revenue_by_module": [],
        "appointments_by_specialty": [],
        "user_registration_trend": _trend(users, period, start, end),
        "order_trend": [],
    }

    # Real, period-independent breakdowns used by the dashboard distribution
    # panels. Kept outside `charts` so the 5-chart contract stays untouched.
    distributions = {
        "users_by_role": _group_counts(users, "role", "role"),
        "doctors_by_specialty": _group_counts(doctors, "specialty", "specialty", limit=8),
    }

    recent_users = []
    if can_see_users:
        recent_users = [
            _safe_user(d) for d in users.find({}, {"passwordHash": 0}).sort("createdAt", -1).limit(5)
        ]

    return {
        "period": period,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "platform_overview": platform_overview,
        "live_stats": live_stats,
        "needs_attention": needs_attention,
        "charts": charts,
        "distributions": distributions,
        "recent_activity": {
            "users": recent_users,
            "appointments": [],
            "orders": [],
            "admin_activity": audit_rows if audit_rows is not None else [],
        },
    }


def unavailable_list():
    return [{"metric": k, "reason": v} for k, v in UNAVAILABLE.items()]
