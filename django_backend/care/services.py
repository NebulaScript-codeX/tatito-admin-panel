from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
import re
import uuid

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from .models import (
    Appointment,
    AppointmentSlot,
    AppointmentTimeline,
    CallLog,
    CarePayment,
    CarePatient,
    CareSetting,
    Doctor,
    DoctorLeave,
    DoctorPayout,
    InstantConsult,
    RefundRequest,
    Review,
    Specialty,
    WeeklySchedule,
)


ACTIVE_APPOINTMENT_STATUSES = (
    Appointment.Status.BOOKED,
    Appointment.Status.CONFIRMED,
)
SLOT_DURATIONS = {10, 15, 20, 30}
WEEKDAYS = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}


def new_id():
    return uuid.uuid4()


def now():
    return timezone.now()


def parse_boolean(value, default=None):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False
    return None


def safe_limit(value, default=100, maximum=250):
    try:
        return min(max(int(value), 1), maximum)
    except (TypeError, ValueError):
        return default


def as_iso(value):
    return value.isoformat() if value is not None else None


def model_row(instance):
    row = {
        "id": str(instance.pk),
        "development_key": instance.development_key,
        "is_development_data": instance.is_development_data,
    }
    for field in instance._meta.concrete_fields:
        name = field.name
        value = getattr(instance, name)
        if name in {"id", "development_key", "is_development_data"}:
            continue
        if field.is_relation:
            row[name] = str(value) if value is not None else None
        elif isinstance(value, (date, datetime, time)):
            row[name] = as_iso(value)
        elif isinstance(value, Decimal):
            row[name] = float(value)
        else:
            row[name] = value
    return row


def doctor_row(doctor):
    rating = doctor.rating_summary
    return {
        **model_row(doctor),
        "doctorId": str(doctor.pk),
        "specialty": doctor.specialty.name,
        "hospital": doctor.hospital,
        "location": doctor.hospital,
        "qualifications": doctor.qualifications,
        "consultation_type": doctor.consultation_type,
        "verification_status": doctor.verification_status,
        **rating,
    }


def review_row(review):
    return {
        **model_row(review),
        "doctorId": str(review.doctor_id),
        "patientName": review.patient_name,
        "moderationStatus": review.moderation_status,
    }


def appointment_row(appointment):
    return {
        **model_row(appointment),
        "doctor_id": str(appointment.doctor_id),
        "patient_id": appointment.patient.external_id or str(appointment.patient_id),
        "slot_id": str(appointment.slot_id),
        "specialty": appointment.specialty_name,
        "period": appointment.date.strftime("%Y-%m"),
        "history": [model_row(event) for event in appointment.history.all()],
    }


def serialize_resource(resource, instance):
    row = model_row(instance)
    if resource == "doctors":
        return doctor_row(instance)
    if resource == "reviews":
        return review_row(instance)
    if resource == "appointments":
        return appointment_row(instance)
    if resource == "instant-consults":
        row["doctor_id"] = str(instance.doctor_id or "")
        waited = max(int((now() - instance.created_at).total_seconds()), 0)
        row["waiting_seconds"] = waited if instance.status == InstantConsult.Status.WAITING else 0
        row["waiting_over_15_minutes"] = (
            instance.status == InstantConsult.Status.WAITING and waited >= 900
        )
    if resource == "slots":
        row["doctor_id"] = str(instance.doctor_id)
        appointment = instance.appointments.filter(
            status__in=ACTIVE_APPOINTMENT_STATUSES
        ).select_related("patient").first()
        row["patient_name"] = appointment.patient_name if appointment else ""
        row["appointment_id"] = str(appointment.pk) if appointment else ""
    if resource == "schedules":
        row["doctor_id"] = str(instance.doctor_id)
        row["weekday_name"] = WEEKDAYS.get(instance.weekday, "")
    if resource == "leaves":
        row["doctor_id"] = str(instance.doctor_id)
    if resource == "payouts":
        row["doctor_id"] = str(instance.doctor_id)
    if resource == "payments":
        row["doctor_id"] = str(instance.doctor_id)
        row["appointment_id"] = str(instance.appointment_id or "")
        row["payout_id"] = str(instance.payout_id or "")
    if resource == "refunds":
        row["appointment_id"] = str(instance.appointment_id)
        row["payment_id"] = str(instance.payment_id)
    if resource == "call-logs":
        row["doctor_id"] = str(instance.doctor_id or "")
        row["consult_id"] = str(instance.consult_id)
    return row


def validate_doctor(payload, partial=False):
    errors = {}
    name = str(payload.get("name") or "").strip()
    specialty_name = str(payload.get("specialty") or "").strip()
    city = str(payload.get("city") or "").strip()
    degree = str(payload.get("degree") or "").strip()
    try:
        fee = Decimal(str(payload.get("fee", 0))).quantize(Decimal("0.01"))
        if not fee.is_finite() or fee < 0 or fee > Decimal("1000000"):
            raise InvalidOperation
    except (InvalidOperation, TypeError, ValueError):
        fee = Decimal("0.00")
        errors["fee"] = "Consultation fee must be between 0 and 1,000,000."
    consultation_type = str(
        payload.get("consultation_type", payload.get("type", "Both")) or "Both"
    ).strip()
    if consultation_type not in Doctor.ConsultationType.values:
        errors["type"] = "Choose Online, In-person, or Both."
    for field, value, label in (
        ("name", name, "Doctor name"),
        ("specialty", specialty_name, "Specialty"),
        ("city", city, "City"),
        ("degree", degree, "Degree"),
    ):
        if not partial or field in payload:
            if field == "name" and len(value) < 2:
                errors[field] = f"{label} must be at least 2 characters."
            elif not value:
                errors[field] = f"{label} is required."
    available = parse_boolean(payload.get("available", True), default=True)
    if available is None:
        errors["available"] = "Availability must be true or false."
    if errors:
        return None, errors
    data = {
        "name": name,
        "specialty": specialty_name,
        "city": city,
        "degree": degree,
        "qualifications": str(payload.get("qualifications") or "").strip(),
        "license_details": str(payload.get("license_details") or "").strip(),
        "experience": str(payload.get("experience") or "").strip(),
        "hospital": str(payload.get("hospital") or payload.get("location") or "").strip(),
        "fee": fee,
        "consultation_type": consultation_type,
        "available": available,
        "bio": str(payload.get("bio") or payload.get("detail") or "").strip(),
        "photo": str(payload.get("photo") or "").strip(),
    }
    return data, {}


def doctor_rating(doctor):
    value = doctor.reviews.filter(
        moderation_status=Review.ModerationStatus.APPROVED
    ).aggregate(average=Avg("rating"), count=Count("id"))
    return {
        "rating": round(float(value["average"] or 0), 1),
        "reviews": value["count"],
    }


def create_timeline(appointment, action, actor, details=None):
    return AppointmentTimeline.objects.create(
        appointment=appointment,
        action=action,
        actor_id=str(getattr(actor, "pk", "") or ""),
        actor=getattr(actor, "username", "") or "system",
        details=details or {},
        is_development_data=appointment.is_development_data,
        development_key=(
            f"{appointment.development_key}-timeline-{uuid.uuid4().hex[:8]}"
            if appointment.development_key
            else None
        ),
    )


def generate_slots(doctor, target_date):
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)
    if DoctorLeave.objects.filter(doctor=doctor, date=target_date).exists():
        return []
    schedule = WeeklySchedule.objects.filter(
        doctor=doctor, weekday=target_date.weekday(), is_working=True
    ).first()
    if not schedule:
        return []
    duration = schedule.duration_minutes
    if duration not in SLOT_DURATIONS or not schedule.start_time or not schedule.end_time:
        raise ValueError("Schedule is missing valid working hours or slot duration.")
    if schedule.end_time <= schedule.start_time:
        raise ValueError("Schedule end must be later than its start.")
    cursor = datetime.combine(target_date, schedule.start_time)
    finish = datetime.combine(target_date, schedule.end_time)
    slots = []
    while cursor + timedelta(minutes=duration) <= finish:
        end = cursor + timedelta(minutes=duration)
        slot, _ = AppointmentSlot.objects.get_or_create(
            doctor=doctor,
            date=target_date,
            start_time=cursor.time(),
            defaults={
                "weekday": target_date.weekday(),
                "end_time": end.time(),
                "duration_minutes": duration,
                "is_development_data": doctor.is_development_data,
                "development_key": (
                    f"{doctor.development_key}-slot-{target_date.isoformat()}-{cursor:%H%M}"
                    if doctor.development_key
                    else None
                ),
            },
        )
        if (slot.end_time, slot.duration_minutes) != (end.time(), duration):
            if slot.status == AppointmentSlot.Status.BOOKED:
                raise ValueError("Cannot change a schedule while its slots are booked.")
            slot.end_time = end.time()
            slot.duration_minutes = duration
            slot.save(update_fields=["end_time", "duration_minutes", "updated_at"])
        slots.append(slot)
        cursor = end
    return slots


def commission_rate():
    setting, _ = CareSetting.objects.get_or_create(
        key="doctor_commission_percent", defaults={"value": Decimal("15.00")}
    )
    return setting.value


def calculate_payout(doctor, period):
    total = Appointment.objects.filter(
        doctor=doctor,
        status=Appointment.Status.COMPLETED,
        date__year=int(period[:4]),
        date__month=int(period[5:7]),
    ).aggregate(count=Count("id"), gross=Sum("fee"))
    gross = Decimal(total["gross"] or 0).quantize(Decimal("0.01"))
    commission = commission_rate()
    net = (gross * (Decimal("100") - commission) / Decimal("100")).quantize(
        Decimal("0.01")
    )
    return {
        "consultation_count": total["count"],
        "gross_amount": gross,
        "commission_percent": commission,
        "net_payable": net,
    }


def get_payout(doctor, period):
    calculation = calculate_payout(doctor, period)
    payout = DoctorPayout.objects.filter(doctor=doctor, period=period).first()
    if payout is None and calculation["consultation_count"]:
        payout, _ = DoctorPayout.objects.get_or_create(
            doctor=doctor,
            period=period,
            defaults={
                "doctor_name": doctor.name,
                **calculation,
                "development_key": (
                    f"{doctor.development_key}-payout-{period}"
                    if doctor.development_key
                    else None
                ),
                "is_development_data": doctor.is_development_data,
            },
        )
    if payout and payout.status == DoctorPayout.Status.PENDING:
        payout.doctor_name = doctor.name
        payout.consultation_count = calculation["consultation_count"]
        payout.gross_amount = calculation["gross_amount"]
        payout.commission_percent = calculation["commission_percent"]
        payout.net_payable = calculation["net_payable"]
        payout.save(update_fields=[
            "doctor_name",
            "consultation_count",
            "gross_amount",
            "commission_percent",
            "net_payable",
        ])
    return payout, calculation


def list_queryset(resource, params):
    mapping = {
        "specialties": Specialty.objects.all(),
        "schedules": WeeklySchedule.objects.select_related("doctor").all(),
        "leaves": DoctorLeave.objects.select_related("doctor").all(),
        "slots": AppointmentSlot.objects.select_related("doctor").prefetch_related(
            "appointments__patient"
        ).all(),
        "appointments": Appointment.objects.select_related(
            "doctor", "patient", "slot"
        ).prefetch_related("history"),
        "instant-consults": InstantConsult.objects.select_related("doctor").all(),
        "reviews": Review.objects.select_related("doctor").all(),
        "payouts": DoctorPayout.objects.select_related("doctor").all(),
        "payments": CarePayment.objects.select_related("doctor", "appointment", "payout").all(),
        "refunds": RefundRequest.objects.select_related("appointment", "payment").all(),
        "call-logs": CallLog.objects.select_related("doctor", "consult").all(),
    }
    if resource == "doctors":
        queryset = Doctor.objects.select_related("specialty").prefetch_related("reviews").all()
    else:
        queryset = mapping.get(resource)
        if queryset is None:
            raise KeyError(resource)
    search = (params.get("search") or "").strip()[:100]
    if search:
        if resource == "doctors":
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(specialty__name__icontains=search)
                | Q(city__icontains=search)
                | Q(hospital__icontains=search)
            )
        elif resource == "specialties":
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))
        elif resource == "appointments":
            queryset = queryset.filter(
                Q(patient_name__icontains=search)
                | Q(doctor_name__icontains=search)
                | Q(specialty_name__icontains=search)
                | Q(status__icontains=search)
            )
        elif resource == "instant-consults":
            queryset = queryset.filter(
                Q(patient_name__icontains=search) | Q(doctor_name__icontains=search) | Q(status__icontains=search)
            )
        elif resource == "reviews":
            queryset = queryset.filter(
                Q(patient_name__icontains=search) | Q(comment__icontains=search) | Q(doctor__name__icontains=search)
            )
        elif resource == "payouts":
            queryset = queryset.filter(Q(doctor_name__icontains=search) | Q(status__icontains=search) | Q(period__icontains=search))
        elif resource in {"schedules", "leaves", "slots", "payments", "refunds", "call-logs"}:
            queryset = queryset.filter(doctor__name__icontains=search) if hasattr(queryset.model, "doctor") else queryset
    status_value = params.get("status")
    if status_value:
        status_field = "moderation_status" if resource == "reviews" else "status"
        if any(field.name == status_field for field in queryset.model._meta.fields):
            queryset = queryset.filter(**{status_field: status_value})
    if params.get("active") in {"true", "false"} and resource == "specialties":
        queryset = queryset.filter(is_active=params["active"] == "true")
    for key, field_name in (
        ("doctor_id", "doctor_id"),
        ("weekday", "weekday"),
        ("date", "date"),
    ):
        if params.get(key):
            queryset = queryset.filter(**{field_name: params[key]})
    return queryset.order_by("-created_at") if resource in {"appointments", "reviews", "instant-consults", "payouts", "payments", "refunds", "call-logs"} else queryset


def audit_action(request, action, target_type, target_id, description, metadata=None):
    from audit.services import log_action

    return log_action(
        request,
        action,
        module="doctors",
        target_type=target_type,
        target_id=target_id,
        description=description,
        metadata=metadata or {},
    )


def parse_slot_date(value):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def parse_time(value):
    try:
        return time.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def safe_period(value):
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", str(value or "")):
        return timezone.localdate().strftime("%Y-%m")
    return value


def refresh_queue_positions():
    for index, consult in enumerate(
        InstantConsult.objects.filter(
            status__in=[
                InstantConsult.Status.WAITING,
                InstantConsult.Status.ASSIGNED,
                InstantConsult.Status.IN_PROGRESS,
            ]
        ).order_by("created_at", "id"),
        start=1,
    ):
        if consult.queue_position != index:
            InstantConsult.objects.filter(pk=consult.pk).update(queue_position=index)


def care_dashboard_stats():
    today = timezone.localdate()
    completed = Appointment.objects.filter(
        status=Appointment.Status.COMPLETED,
        payment_status=Appointment.PaymentStatus.PAID,
    )
    grouped = (
        completed.values("specialty_name")
        .annotate(count=Count("id"))
        .order_by("-count", "specialty_name")[:8]
    )
    pending_reviews = Review.objects.filter(
        moderation_status=Review.ModerationStatus.PENDING
    ).count()
    waiting_consults = InstantConsult.objects.filter(status=InstantConsult.Status.WAITING)
    waiting_over_15 = waiting_consults.filter(
        created_at__lt=now() - timedelta(minutes=15)
    ).count()
    completed_periods = (
        Appointment.objects.filter(status=Appointment.Status.COMPLETED)
        .order_by()
        .values("doctor_id", "date__year", "date__month")
        .annotate(consultation_count=Count("id"))
    )
    paid_periods = set(
        DoctorPayout.objects.filter(status=DoctorPayout.Status.PAID).values_list(
            "doctor_id", "period"
        )
    )
    pending_payouts = sum(
        1
        for item in completed_periods
        if (
            item["doctor_id"],
            f"{item['date__year']:04d}-{item['date__month']:02d}",
        )
        not in paid_periods
    )
    status_counts = {
        status: Appointment.objects.filter(status=status).count()
        for status, _label in Appointment.Status.choices
    }
    return {
        "total_doctors": Doctor.objects.count(),
        "verified_doctors": Doctor.objects.filter(verification_status=Doctor.VerificationStatus.VERIFIED).count(),
        "pending_doctors": Doctor.objects.filter(verification_status=Doctor.VerificationStatus.PENDING).count(),
        "online_doctors": Doctor.objects.filter(available=True, verification_status=Doctor.VerificationStatus.VERIFIED).count(),
        "offline_doctors": Doctor.objects.filter(available=False).count(),
        "active_specialties": Specialty.objects.filter(is_active=True).count(),
        "today_appointments": Appointment.objects.filter(date=today).count(),
        "today_appointment_statuses": {
            status: Appointment.objects.filter(date=today, status=status).count()
            for status, _label in Appointment.Status.choices
        },
        "appointment_statuses": status_counts,
        "consultation_revenue": float(completed.aggregate(total=Sum("fee"))["total"] or 0),
        "appointments_by_specialty": [
            {"specialty": item["specialty_name"], "count": item["count"]}
            for item in grouped
        ],
        "doctors_by_specialty": [
            {"specialty": item["name"], "count": item["doctor_count"]}
            for item in Specialty.objects.annotate(doctor_count=Count("doctors"))
            .filter(doctor_count__gt=0)
            .order_by("-doctor_count", "name")
            .values("name", "doctor_count")[:8]
        ],
        "recent_appointments": [
            {
                "id": str(item.pk),
                "patient_name": item.patient_name,
                "doctor_name": item.doctor_name,
                "date": item.date.isoformat(),
                "status": item.status,
            }
            for item in Appointment.objects.order_by("-created_at")[:5]
        ],
        "upcoming_appointments": Appointment.objects.filter(
            status__in=ACTIVE_APPOINTMENT_STATUSES, date__gte=today
        ).count(),
        "pending_reviews": pending_reviews,
        "pending_refunds": RefundRequest.objects.filter(status=RefundRequest.Status.PENDING).count(),
        "unassigned_consults": waiting_consults.count(),
        "waiting_over_15_minutes": waiting_over_15,
        "pending_payouts": pending_payouts,
    }
