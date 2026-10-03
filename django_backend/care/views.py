from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
import uuid
from django.core.exceptions import ValidationError

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    ModulePermission,
    get_active_profile,
    has_module_permission,
    is_super_admin,
)

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
from .services import (
    ACTIVE_APPOINTMENT_STATUSES,
    SLOT_DURATIONS,
    WEEKDAYS,
    audit_action,
    appointment_row,
    calculate_payout,
    commission_rate,
    create_timeline,
    doctor_rating,
    doctor_row,
    generate_slots,
    get_payout,
    list_queryset,
    model_row,
    now,
    parse_boolean,
    parse_slot_date,
    parse_time,
    safe_limit,
    safe_period,
    serialize_resource,
    validate_doctor,
)


class CareModulePermission(ModulePermission):
    def has_permission(self, request, view):
        profile = get_active_profile(request.user)
        if profile is None:
            return False
        if is_super_admin(profile):
            return True
        action = "view"
        if request.method == "POST":
            action = "edit" if isinstance(view, CareActionView) or (
                isinstance(view, CareCollectionView)
                and getattr(view, "kwargs", {}).get("resource")
                in {"schedules", "leaves", "settings"}
            ) else "create"
        if request.method in {"PATCH", "PUT"}:
            action = "edit"
        elif request.method == "DELETE":
            action = "delete"
        return has_module_permission(request.user, "doctors", action)


def fail(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)


def audit(request, action, target_type, target_id, description, metadata=None):
    audit_action(request, action, target_type, target_id, description, metadata)


def get_patient(patient_id):
    patient = CarePatient.objects.filter(external_id=str(patient_id)).first()
    if patient:
        return patient
    try:
        return CarePatient.objects.filter(pk=patient_id).first()
    except (ValidationError, ValueError, TypeError):
        return None


def dev_key(prefix):
    return f"dev-care-{prefix}-{uuid.uuid4().hex}"


class CareCollectionView(APIView):
    permission_classes = [CareModulePermission]
    module = "doctors"

    def get(self, request, resource):
        if resource == "settings":
            return Response({"success": True, "commission_percent": float(commission_rate())})
        if resource == "payouts" and request.query_params.get("count_only") == "true":
            return Response({
                "success": True,
                "total": DoctorPayout.objects.count(),
                "results": [],
            })
        if resource == "patients":
            rows = CarePatient.objects.order_by("name")
            search = (request.query_params.get("search") or "").strip()[:100]
            if search:
                rows = rows.filter(
                    Q(name__icontains=search) | Q(external_id__icontains=search)
                )
            rows = rows[:250]
            return Response({
                "success": True,
                "results": [
                    {"id": str(item.pk), "external_id": item.external_id, "name": item.name}
                    for item in rows
                ],
            })
        if resource == "slots" and request.query_params.get("date") and request.query_params.get("doctor_id"):
            target_date = parse_slot_date(request.query_params["date"])
            if not target_date:
                return fail("Enter a valid slot date.")
            doctor = Doctor.objects.filter(pk=request.query_params["doctor_id"]).first()
            if not doctor:
                return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
            try:
                slots = generate_slots(doctor, target_date)
            except ValueError as error:
                return fail(str(error))
            return Response({
                "success": True,
                "results": [serialize_resource("slots", item) for item in slots],
            })
        if resource == "payouts":
            period = safe_period(request.query_params.get("period"))
            rows = []
            doctors = Doctor.objects.all()
            search = (request.query_params.get("search") or "").strip()[:100]
            if search:
                doctors = doctors.filter(name__icontains=search)
            for doctor in doctors:
                payout, calculation = get_payout(doctor, period)
                rows.append({
                    "id": str(payout.pk) if payout else f"{doctor.pk}:{period}",
                    "doctor_id": str(doctor.pk),
                    "doctor_name": doctor.name,
                    "period": period,
                    **calculation,
                    "status": payout.status if payout else DoctorPayout.Status.PENDING,
                    "paid_at": payout.paid_at.isoformat() if payout and payout.paid_at else None,
                })
            return Response({
                "success": True,
                "commission_percent": float(commission_rate()),
                "results": rows,
            })
        try:
            queryset = list_queryset(resource, request.query_params)
        except KeyError:
            return fail("Unknown CARE resource.", status.HTTP_404_NOT_FOUND)
        if resource == "doctors":
            verification = request.query_params.get("verification_status") or request.query_params.get("status")
            if verification:
                queryset = queryset.filter(verification_status=verification)
        page = max(int(request.query_params.get("page", 1) or 1), 1)
        limit = safe_limit(request.query_params.get("page_size"), default=100)
        total = queryset.count()
        rows = queryset[(page - 1) * limit:page * limit]
        return Response({
            "success": True,
            "total": total,
            "page": page,
            "page_size": limit,
            "results": [serialize_resource(resource, item) for item in rows],
        })

    def post(self, request, resource):
        data = request.data or {}
        if resource == "doctors":
            values, errors = validate_doctor(data)
            if errors:
                return fail("Please correct the doctor details.", errors=errors)
            specialty = Specialty.objects.filter(name=values.pop("specialty"), is_active=True).first()
            if not specialty:
                return fail("Choose an active specialty.")
            doctor = Doctor.objects.create(
                specialty=specialty,
                **values,
            )
            audit(request, "create", "doctor", doctor.pk, f"Added doctor {doctor.name}")
            return Response({"success": True, "doctor": doctor_row(doctor)}, status=status.HTTP_201_CREATED)
        if resource == "slots":
            doctor_id = data.get("doctor_id")
            if not doctor_id:
                return fail("Doctor is required.", errors={"doctor_id": "Choose a doctor."})
            try:
                doctor = Doctor.objects.filter(pk=doctor_id).first()
            except (ValidationError, ValueError, TypeError):
                doctor = None
            slot_date = parse_slot_date(data.get("date"))
            weekday = data.get("weekday")
            start = parse_time(data.get("start_time"))
            end = parse_time(data.get("end_time"))
            try:
                duration = int(data.get("duration_minutes"))
                weekday = int(weekday)
            except (TypeError, ValueError):
                return fail("Choose a weekday and slot duration.")
            requested_status = str(data.get("status") or AppointmentSlot.Status.AVAILABLE)
            if not doctor:
                return fail("Choose an existing doctor.", status.HTTP_404_NOT_FOUND)
            if not slot_date:
                return fail("Choose a valid slot date.", errors={"date": "A valid date is required."})
            if weekday not in WEEKDAYS or slot_date.weekday() != weekday:
                return fail("The selected day must match the slot date.", errors={"weekday": "Choose the weekday matching the date."})
            if not start:
                return fail("Start time is required.", errors={"start_time": "This field is required."})
            if not end or end <= start:
                return fail("End time must be after start time.", errors={"end_time": "Enter a time after the start time."})
            if duration not in SLOT_DURATIONS:
                return fail("Slot duration must be 10, 15, 20, or 30 minutes.", errors={"duration_minutes": "Choose a supported duration."})
            if requested_status not in {AppointmentSlot.Status.AVAILABLE, AppointmentSlot.Status.BLOCKED}:
                return fail("Slot status must be Available or Blocked.")
            if (datetime.combine(slot_date, end) - datetime.combine(slot_date, start)).total_seconds() != duration * 60:
                return fail("End time must match the selected slot duration.", errors={"end_time": "The time range must match the selected duration."})
            if DoctorLeave.objects.filter(doctor=doctor, date=slot_date).exists():
                return fail("A slot cannot be added on this doctor's leave date.", status.HTTP_409_CONFLICT)
            try:
                with transaction.atomic():
                    Doctor.objects.select_for_update().get(pk=doctor.pk)
                    conflicts = AppointmentSlot.objects.filter(
                        doctor=doctor,
                        date=slot_date,
                        start_time__lt=end,
                        end_time__gt=start,
                    )
                    if conflicts.exists():
                        return fail("This slot overlaps an existing slot.", status.HTTP_409_CONFLICT)
                    slot = AppointmentSlot.objects.create(
                        doctor=doctor,
                        date=slot_date,
                        weekday=weekday,
                        start_time=start,
                        end_time=end,
                        duration_minutes=duration,
                        status=requested_status,
                        block_reason="manual" if requested_status == AppointmentSlot.Status.BLOCKED else "",
                    )
            except IntegrityError:
                return fail("This slot conflicts with an existing slot.", status.HTTP_409_CONFLICT)
            audit(request, "create", "doctor_slot", slot.pk, f"Added {requested_status} slot for {doctor.name} on {slot_date}")
            return Response({"success": True, "slot": serialize_resource("slots", slot)}, status=status.HTTP_201_CREATED)
        if resource == "specialties":
            name = str(data.get("name") or "").strip()
            active = parse_boolean(data.get("is_active"), default=True)
            if not name:
                return fail("Specialty name is required.", errors={"name": "This field is required."})
            if active is None:
                return fail("Active status must be true or false.")
            try:
                specialty = Specialty.objects.create(
                    name=name,
                    icon=str(data.get("icon") or "").strip(),
                    description=str(data.get("description") or "").strip(),
                    is_active=active,
                )
            except IntegrityError:
                return fail("A specialty with this name already exists.", status.HTTP_409_CONFLICT)
            audit(request, "create", "specialty", specialty.pk, f"Added specialty {name}")
            return Response({"success": True, "specialty": model_row(specialty)}, status=status.HTTP_201_CREATED)
        if resource == "schedules":
            doctor = Doctor.objects.filter(pk=data.get("doctor_id")).first()
            try:
                weekday = int(data.get("weekday"))
                duration = int(data.get("duration_minutes", 30))
            except (TypeError, ValueError):
                return fail("Weekday and slot duration are required.")
            working = parse_boolean(data.get("is_working"), default=True)
            start = parse_time(data.get("start_time"))
            end = parse_time(data.get("end_time"))
            if not doctor:
                return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
            if weekday not in WEEKDAYS or duration not in {10, 15, 20, 30}:
                return fail("Choose a valid weekday and slot duration.")
            if working is None:
                return fail("Working status must be true or false.")
            if working and (not start or not end or end <= start):
                return fail("Enter valid working hours with an end time after the start time.")
            if not working:
                start = end = None
            try:
                with transaction.atomic():
                    schedule, _ = WeeklySchedule.objects.update_or_create(
                        doctor=doctor,
                        weekday=weekday,
                        defaults={
                            "start_time": start,
                            "end_time": end,
                            "duration_minutes": duration,
                            "is_working": working,
                        },
                    )
                    if AppointmentSlot.objects.filter(
                        doctor=doctor,
                        weekday=weekday,
                        date__gte=timezone.localdate(),
                        status=AppointmentSlot.Status.BOOKED,
                    ).exists():
                        raise ValueError("Cannot change this schedule while future slots are booked.")
                    AppointmentSlot.objects.filter(
                        doctor=doctor,
                        weekday=weekday,
                        date__gte=timezone.localdate(),
                        status__in=[AppointmentSlot.Status.AVAILABLE, AppointmentSlot.Status.BLOCKED],
                        appointments__isnull=True,
                    ).delete()
            except ValueError as error:
                return fail(str(error), status.HTTP_409_CONFLICT)
            audit(request, "edit", "doctor_schedule", doctor.pk, f"Updated {WEEKDAYS[weekday]} schedule")
            return Response({"success": True, "schedule": serialize_resource("schedules", schedule)})
        if resource == "leaves":
            doctor = Doctor.objects.filter(pk=data.get("doctor_id")).first()
            leave_date = parse_slot_date(data.get("date"))
            if not doctor:
                return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
            if not leave_date:
                return fail("Enter a valid leave date.")
            if AppointmentSlot.objects.filter(
                doctor=doctor, date=leave_date, status=AppointmentSlot.Status.BOOKED
            ).exists():
                return fail("Doctor already has booked appointments on this leave date.", status.HTTP_409_CONFLICT)
            try:
                with transaction.atomic():
                    leave = DoctorLeave.objects.create(
                        doctor=doctor,
                        date=leave_date,
                        reason=str(data.get("reason") or "").strip(),
                    )
                    AppointmentSlot.objects.filter(
                        doctor=doctor, date=leave_date, status=AppointmentSlot.Status.AVAILABLE
                    ).update(status=AppointmentSlot.Status.BLOCKED, block_reason="leave")
            except IntegrityError:
                return fail("Leave is already recorded for this date.", status.HTTP_409_CONFLICT)
            audit(request, "edit", "doctor_leave", leave.pk, f"Recorded doctor leave for {leave_date}")
            return Response({"success": True, "leave": serialize_resource("leaves", leave)}, status=status.HTTP_201_CREATED)
        if resource == "appointments":
            return self._book(request, data)
        if resource == "instant-consults":
            patient = get_patient(data.get("patient_id") or "")
            if not patient:
                return fail("Choose an existing patient.", status.HTTP_404_NOT_FOUND)
            kind = str(data.get("consultation_type") or "Video")
            if kind not in {"Video", "Audio"}:
                return fail("Consultation type must be Video or Audio.")
            with transaction.atomic():
                active_count = InstantConsult.objects.select_for_update().filter(
                    status__in=[
                        InstantConsult.Status.WAITING,
                        InstantConsult.Status.ASSIGNED,
                        InstantConsult.Status.IN_PROGRESS,
                    ]
                ).count()
                consult = InstantConsult.objects.create(
                    patient_id=patient.external_id or str(patient.pk),
                    patient_name=patient.name,
                    consultation_type=kind,
                    queue_position=active_count + 1,
                )
            audit(request, "create", "instant_consult", consult.pk, f"Added {consult.patient_name} to the consult queue")
            return Response({"success": True, "consult": serialize_resource(resource, consult)}, status=status.HTTP_201_CREATED)
        if resource == "reviews":
            return fail("Reviews are created by patients. Use moderation actions to approve or hide them.", status.HTTP_405_METHOD_NOT_ALLOWED)
        if resource == "settings":
            try:
                rate = Decimal(str(data.get("commission_percent"))).quantize(Decimal("0.01"))
                if not rate.is_finite() or rate < 0 or rate > 100:
                    raise InvalidOperation
            except (InvalidOperation, TypeError, ValueError):
                return fail("Commission must be between 0 and 100 percent.")
            CareSetting.objects.update_or_create(
                key="doctor_commission_percent",
                defaults={"value": rate, "updated_by": str(request.user.pk)},
            )
            audit(request, "edit", "care_setting", "doctor_commission_percent", f"Updated doctor commission to {rate:g}%")
            return Response({"success": True, "commission_percent": float(rate)})
        return fail("Unknown CARE resource.", status.HTTP_404_NOT_FOUND)

    def _book(self, request, data):
        patient = get_patient(data.get("patient_id") or "")
        if not patient:
            return fail("Choose an existing patient account.", status.HTTP_404_NOT_FOUND)
        try:
            with transaction.atomic():
                slot = AppointmentSlot.objects.select_for_update().select_related("doctor").filter(
                    pk=data.get("slot_id")
                ).first()
                if not slot or slot.status != AppointmentSlot.Status.AVAILABLE:
                    return fail("This appointment slot is no longer available.", status.HTTP_409_CONFLICT)
                doctor = slot.doctor
                if DoctorLeave.objects.filter(doctor=doctor, date=slot.date).exists():
                    return fail("Doctor is on leave for this date.", status.HTTP_409_CONFLICT)
                if (
                    doctor.verification_status != Doctor.VerificationStatus.VERIFIED
                    or not doctor.available
                ):
                    return fail("Only verified, available doctors can be booked.")
                slot.status = AppointmentSlot.Status.BOOKED
                slot.save(update_fields=["status", "updated_at"])
                appointment = Appointment.objects.create(
                    doctor=doctor,
                    patient=patient,
                    slot=slot,
                    doctor_name=doctor.name,
                    patient_name=patient.name,
                    specialty_name=doctor.specialty.name,
                    date=slot.date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    fee=doctor.fee,
                )
                payment = CarePayment.objects.create(
                    appointment=appointment,
                    patient_id=patient.external_id or str(patient.pk),
                    doctor=doctor,
                    amount=doctor.fee,
                    kind=CarePayment.Kind.CONSULTATION,
                    status=CarePayment.Status.PENDING,
                )
                create_timeline(appointment, "booked", request.user, {"slot_id": str(slot.pk)})
        except IntegrityError:
            return fail("This slot already has an active appointment.", status.HTTP_409_CONFLICT)
        audit(request, "create", "appointment", appointment.pk, f"Booked appointment for {appointment.patient_name} with {appointment.doctor_name}")
        return Response({"success": True, "appointment": appointment_row(appointment)}, status=status.HTTP_201_CREATED)


class CareDetailView(APIView):
    permission_classes = [CareModulePermission]
    module = "doctors"

    def get(self, request, resource, pk):
        try:
            rows = list_queryset(resource, {})
            instance = rows.filter(pk=pk).first()
        except KeyError:
            return fail("Unknown CARE resource.", status.HTTP_404_NOT_FOUND)
        if not instance:
            return fail("Record not found.", status.HTTP_404_NOT_FOUND)
        row = serialize_resource(resource, instance)
        if resource == "appointments":
            row["history"] = [model_row(item) for item in instance.history.all()]
        key = {
            "doctors": "doctor",
            "specialties": "specialty",
            "schedules": "schedule",
            "leaves": "leave",
            "slots": "slot",
            "appointments": "appointment",
            "instant-consults": "consult",
            "reviews": "review",
            "payouts": "payout",
            "payments": "payment",
            "refunds": "refund",
            "call-logs": "call_log",
        }.get(resource, resource.rstrip("s"))
        return Response({"success": True, key: row})

    def patch(self, request, resource, pk):
        data = request.data or {}
        if resource == "doctors":
            doctor = Doctor.objects.select_related("specialty").filter(pk=pk).first()
            if not doctor:
                return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
            values, errors = validate_doctor(
                {
                    "name": doctor.name,
                    "specialty": doctor.specialty.name,
                    "city": doctor.city,
                    "degree": doctor.degree,
                    "fee": doctor.fee,
                    "available": doctor.available,
                    "consultation_type": doctor.consultation_type,
                    "qualifications": doctor.qualifications,
                    "license_details": doctor.license_details,
                    "experience": doctor.experience,
                    "hospital": doctor.hospital,
                    "photo": doctor.photo,
                    "bio": doctor.bio,
                    **data,
                },
                partial=False,
            )
            if errors:
                return fail("Please correct the doctor details.", errors=errors)
            specialty_name = values.pop("specialty")
            specialty = Specialty.objects.filter(name=specialty_name).first()
            if not specialty or (
                not specialty.is_active and specialty.pk != doctor.specialty_id
            ):
                return fail("Choose an active specialty.")
            for field, value in values.items():
                setattr(doctor, field, value)
            doctor.specialty = specialty
            doctor.save()
            audit(request, "edit", "doctor", pk, f"Updated doctor {doctor.name}")
            return Response({"success": True, "doctor": doctor_row(doctor)})
        if resource == "specialties":
            specialty = Specialty.objects.filter(pk=pk).first()
            if not specialty:
                return fail("Specialty not found.", status.HTTP_404_NOT_FOUND)
            if "name" in data and not str(data["name"]).strip():
                return fail("Specialty name is required.")
            if "is_active" in data:
                active = parse_boolean(data["is_active"])
                if active is None:
                    return fail("Active status must be true or false.")
                specialty.is_active = active
            for field in ("name", "icon", "description"):
                if field in data:
                    setattr(specialty, field, str(data[field]).strip())
            try:
                specialty.save()
            except IntegrityError:
                return fail("A specialty with this name already exists.", status.HTTP_409_CONFLICT)
            audit(request, "edit", "specialty", pk, f"Updated specialty {specialty.name}")
            return Response({"success": True, "specialty": model_row(specialty)})
        if resource == "slots":
            slot = AppointmentSlot.objects.filter(pk=pk).first()
            if not slot:
                return fail("Slot not found.", status.HTTP_404_NOT_FOUND)
            requested = data.get("status", slot.status)
            if requested == AppointmentSlot.Status.BOOKED or slot.status == AppointmentSlot.Status.BOOKED:
                return fail("A booked slot cannot be edited.", status.HTTP_409_CONFLICT)
            if requested not in {AppointmentSlot.Status.AVAILABLE, AppointmentSlot.Status.BLOCKED}:
                return fail("Slot status must be Available or Blocked.")
            with transaction.atomic():
                slot = AppointmentSlot.objects.select_for_update().get(pk=pk)
                if slot.status == AppointmentSlot.Status.BOOKED or slot.appointments.filter(
                    status__in=ACTIVE_APPOINTMENT_STATUSES
                ).exists():
                    return fail("A booked slot cannot be edited.", status.HTTP_409_CONFLICT)
                changes_schedule = any(
                    key in data for key in ("doctor_id", "date", "weekday", "start_time", "end_time", "duration_minutes")
                )
                if changes_schedule:
                    try:
                        doctor = Doctor.objects.filter(pk=data.get("doctor_id", slot.doctor_id)).first()
                    except (ValidationError, ValueError, TypeError):
                        doctor = None
                    slot_date = parse_slot_date(data.get("date", slot.date.isoformat()))
                    start = parse_time(data.get("start_time", slot.start_time.isoformat()))
                    end = parse_time(data.get("end_time", slot.end_time.isoformat()))
                    try:
                        weekday = int(data.get("weekday", slot.weekday))
                        duration = int(data.get("duration_minutes", slot.duration_minutes))
                    except (TypeError, ValueError):
                        return fail("Choose a weekday and slot duration.")
                    if not doctor:
                        return fail("Choose an existing doctor.", status.HTTP_404_NOT_FOUND)
                    if not slot_date or weekday not in WEEKDAYS or slot_date.weekday() != weekday:
                        return fail("The selected day must match the slot date.")
                    if not start or not end or end <= start:
                        return fail("End time must be after start time.")
                    if duration not in SLOT_DURATIONS:
                        return fail("Slot duration must be 10, 15, 20, or 30 minutes.")
                    if (datetime.combine(slot_date, end) - datetime.combine(slot_date, start)).total_seconds() != duration * 60:
                        return fail("End time must match the selected slot duration.")
                    if DoctorLeave.objects.filter(doctor=doctor, date=slot_date).exists():
                        return fail("A slot cannot be moved to this doctor's leave date.", status.HTTP_409_CONFLICT)
                    Doctor.objects.select_for_update().get(pk=doctor.pk)
                    conflicts = AppointmentSlot.objects.filter(
                        doctor=doctor,
                        date=slot_date,
                        start_time__lt=end,
                        end_time__gt=start,
                    ).exclude(pk=slot.pk)
                    if conflicts.exists():
                        return fail("This slot overlaps an existing slot.", status.HTTP_409_CONFLICT)
                    slot.doctor = doctor
                    slot.date = slot_date
                    slot.weekday = weekday
                    slot.start_time = start
                    slot.end_time = end
                    slot.duration_minutes = duration
                if requested == AppointmentSlot.Status.BLOCKED and slot.appointments.filter(
                    status__in=ACTIVE_APPOINTMENT_STATUSES
                ).exists():
                    return fail("A booked slot cannot be blocked.", status.HTTP_409_CONFLICT)
                if requested == AppointmentSlot.Status.AVAILABLE and slot.block_reason == "leave":
                    return fail("Slots on a leave date cannot be made available.")
                slot.status = requested
                slot.block_reason = "manual" if requested == AppointmentSlot.Status.BLOCKED else ""
                slot.save()
            audit(request, "edit", "doctor_slot", pk, f"Set slot to {requested}")
            return Response({"success": True, "slot": serialize_resource(resource, slot)})
        if resource == "reviews":
            return fail("Use review moderation actions to change review status.", status.HTTP_405_METHOD_NOT_ALLOWED)
        return fail("Use the related workflow to update this record.", status.HTTP_405_METHOD_NOT_ALLOWED)

    def put(self, request, resource, pk):
        return self.patch(request, resource, pk)

    def delete(self, request, resource, pk):
        if resource == "doctors":
            doctor = Doctor.objects.filter(pk=pk).first()
            if not doctor:
                return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
            if doctor.appointments.filter(status__in=ACTIVE_APPOINTMENT_STATUSES).exists():
                return fail("Doctor has active appointments and cannot be deleted.", status.HTTP_409_CONFLICT)
            if (
                doctor.appointments.exists()
                or doctor.payouts.exists()
                or doctor.instant_consults.exists()
                or doctor.call_logs.exists()
                or doctor.payments.exists()
            ):
                doctor.available = False
                doctor.verification_status = Doctor.VerificationStatus.SUSPENDED
                doctor.save(update_fields=["available", "verification_status", "updated_at"])
            else:
                doctor.delete()
            audit(request, "delete", "doctor", pk, f"Deleted doctor {doctor.name}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        if resource == "specialties":
            specialty = Specialty.objects.filter(pk=pk).first()
            if not specialty:
                return fail("Specialty not found.", status.HTTP_404_NOT_FOUND)
            if specialty.doctors.exists() or Appointment.objects.filter(specialty_name=specialty.name).exists():
                return fail("This specialty is used by doctors or appointments and cannot be deleted. Deactivate it instead.", status.HTTP_409_CONFLICT)
            name = specialty.name
            specialty.delete()
            audit(request, "delete", "specialty", pk, f"Deleted specialty {name}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        if resource == "reviews":
            return self._delete_review(request, pk)
        if resource == "schedules":
            schedule = WeeklySchedule.objects.filter(pk=pk).first()
            if not schedule:
                return fail("Schedule not found.", status.HTTP_404_NOT_FOUND)
            if AppointmentSlot.objects.filter(
                doctor=schedule.doctor,
                weekday=schedule.weekday,
                status=AppointmentSlot.Status.BOOKED,
            ).exists():
                return fail("A schedule with booked slots cannot be deleted.", status.HTTP_409_CONFLICT)
            schedule.delete()
            audit(request, "delete", "doctor_schedule", pk, "Deleted doctor schedule")
            return Response(status=status.HTTP_204_NO_CONTENT)
        if resource == "leaves":
            leave = DoctorLeave.objects.filter(pk=pk).first()
            if not leave:
                return fail("Leave record not found.", status.HTTP_404_NOT_FOUND)
            if AppointmentSlot.objects.filter(
                doctor=leave.doctor, date=leave.date, status=AppointmentSlot.Status.BOOKED
            ).exists():
                return fail("Leave cannot be removed while the doctor has booked slots on that date.", status.HTTP_409_CONFLICT)
            AppointmentSlot.objects.filter(
                doctor=leave.doctor, date=leave.date, status=AppointmentSlot.Status.BLOCKED, block_reason="leave"
            ).update(status=AppointmentSlot.Status.AVAILABLE, block_reason="")
            leave.delete()
            audit(request, "edit", "doctor_leave", pk, "Removed doctor leave")
            return Response(status=status.HTTP_204_NO_CONTENT)
        if resource == "slots":
            with transaction.atomic():
                slot = AppointmentSlot.objects.select_for_update().filter(pk=pk).first()
                if not slot:
                    return fail("Slot not found.", status.HTTP_404_NOT_FOUND)
                if slot.status == AppointmentSlot.Status.BOOKED or slot.appointments.exists():
                    return fail("A booked or appointment-linked slot cannot be deleted.", status.HTTP_409_CONFLICT)
                doctor_name = slot.doctor.name
                slot.delete()
            audit(request, "delete", "doctor_slot", pk, f"Deleted slot for {doctor_name}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        return fail("This record cannot be deleted directly.", status.HTTP_405_METHOD_NOT_ALLOWED)

    def _delete_review(self, request, pk):
        review = Review.objects.select_related("doctor").filter(pk=pk).first()
        if not review:
            return fail("Review not found.", status.HTTP_404_NOT_FOUND)
        doctor_id = review.doctor_id
        rating = review.rating
        review.delete()
        result = doctor_rating(Doctor.objects.get(pk=doctor_id))
        audit(request, "delete", "doctor_review", pk, f"Deleted review for doctor {doctor_id}", {"rating": rating})
        return Response({"success": True, "rating": result})


class CareActionView(APIView):
    permission_classes = [CareModulePermission]
    module = "doctors"

    def post(self, request, resource, pk, action):
        data = request.data or {}
        if resource == "doctors":
            return self._doctor_action(request, pk, action, data)
        if resource == "appointments":
            return self._appointment_action(request, pk, action, data)
        if resource == "instant-consults":
            return self._consult_action(request, pk, action, data)
        if resource == "reviews":
            return self._review_action(request, pk, action, data)
        if resource == "payouts" and action == "pay":
            return self._pay_payout(request, pk)
        if resource == "refunds" and action in {"approve", "reject"}:
            return self._refund_action(request, pk, action, data)
        return fail("Unknown action for this CARE resource.", status.HTTP_404_NOT_FOUND)

    def _doctor_action(self, request, pk, action, data):
        doctor = Doctor.objects.filter(pk=pk).first()
        if not doctor:
            return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
        if action in {"online", "offline"}:
            if action == "online" and doctor.verification_status != Doctor.VerificationStatus.VERIFIED:
                return fail("Only verified doctors can be marked online.")
            if action == "offline" and doctor.appointments.filter(status__in=ACTIVE_APPOINTMENT_STATUSES).exists():
                return fail("Doctor has active appointments and cannot be marked offline.", status.HTTP_409_CONFLICT)
            doctor.available = action == "online"
            doctor.save(update_fields=["available", "updated_at"])
        else:
            status_map = {
                "verify": Doctor.VerificationStatus.VERIFIED,
                "approve": Doctor.VerificationStatus.VERIFIED,
                "reject": Doctor.VerificationStatus.REJECTED,
                "suspend": Doctor.VerificationStatus.SUSPENDED,
                "reinstate": Doctor.VerificationStatus.VERIFIED,
            }
            if action not in status_map:
                return fail("Unknown doctor action.", status.HTTP_404_NOT_FOUND)
            reason = str(data.get("reason") or "").strip()
            if action == "reject" and not reason:
                return fail("A reason is required when rejecting a doctor.")
            if action in {"reject", "suspend"} and doctor.appointments.filter(status__in=ACTIVE_APPOINTMENT_STATUSES).exists():
                return fail("Doctor has active appointments and cannot be made unavailable.", status.HTTP_409_CONFLICT)
            doctor.verification_status = status_map[action]
            if action in {"reject", "suspend"}:
                doctor.available = False
        doctor.save()
        audit(request, action, "doctor", pk, f"{action.title()} doctor {doctor.name}")
        return Response({"success": True, "doctor": doctor_row(doctor)})

    def _appointment_action(self, request, pk, action, data):
        with transaction.atomic():
            appointment = Appointment.objects.select_for_update().select_related(
                "doctor", "patient", "slot"
            ).filter(pk=pk).first()
            if not appointment:
                return fail("Appointment not found.", status.HTTP_404_NOT_FOUND)
            if action == "confirm":
                if appointment.status != Appointment.Status.BOOKED:
                    return fail("Only booked appointments can be confirmed.", status.HTTP_409_CONFLICT)
                appointment.status = Appointment.Status.CONFIRMED
            elif action == "reschedule":
                slot_id = data.get("slot_id")
                new_slot = AppointmentSlot.objects.select_for_update().filter(pk=slot_id).first()
                if not new_slot:
                    return fail("Choose a valid new appointment slot.")
                if new_slot.doctor_id != appointment.doctor_id:
                    return fail("Reschedule to a slot belonging to the same doctor.")
                if new_slot.status != AppointmentSlot.Status.AVAILABLE:
                    return fail("Choose a genuinely free appointment slot.", status.HTTP_409_CONFLICT)
                if DoctorLeave.objects.filter(doctor=appointment.doctor, date=new_slot.date).exists():
                    return fail("Doctor is on leave for this date.", status.HTTP_409_CONFLICT)
                old_slot = appointment.slot
                new_slot.status = AppointmentSlot.Status.BOOKED
                new_slot.save(update_fields=["status", "updated_at"])
                appointment.slot = new_slot
                appointment.date = new_slot.date
                appointment.start_time = new_slot.start_time
                appointment.end_time = new_slot.end_time
                appointment.save(update_fields=["slot", "date", "start_time", "end_time", "updated_at"])
                old_slot.status = AppointmentSlot.Status.AVAILABLE
                old_slot.block_reason = ""
                old_slot.save(update_fields=["status", "block_reason", "updated_at"])
                create_timeline(
                    appointment,
                    "reschedule",
                    request.user,
                    {"from_slot_id": str(old_slot.pk), "to_slot_id": str(new_slot.pk)},
                )
                audit(request, "reschedule", "appointment", pk, f"Rescheduled appointment for {appointment.patient_name}", {
                    "date": new_slot.date.isoformat(),
                    "start_time": new_slot.start_time.isoformat(),
                })
                return Response({"success": True, "appointment": appointment_row(appointment)})
            elif action == "cancel":
                if appointment.status not in ACTIVE_APPOINTMENT_STATUSES:
                    return fail("Only booked or confirmed appointments can be cancelled.", status.HTTP_409_CONFLICT)
                appointment.status = Appointment.Status.CANCELLED
                payment = None
                if appointment.payment_status == Appointment.PaymentStatus.PAID:
                    payment = CarePayment.objects.filter(
                        appointment=appointment, status=CarePayment.Status.PAID
                    ).first()
                    if not payment:
                        return fail("Paid appointment has no linked payment; refund request was not created.", status.HTTP_409_CONFLICT)
                appointment.slot.status = AppointmentSlot.Status.AVAILABLE
                appointment.slot.block_reason = ""
                appointment.slot.save(update_fields=["status", "block_reason", "updated_at"])
                if payment:
                    RefundRequest.objects.get_or_create(
                        appointment=appointment,
                        payment=payment,
                        defaults={
                            "patient_id": payment.patient_id,
                            "amount": payment.amount,
                            "development_key": dev_key("refund") if appointment.is_development_data else None,
                            "is_development_data": appointment.is_development_data,
                        },
                    )
            elif action == "complete":
                if appointment.status not in ACTIVE_APPOINTMENT_STATUSES:
                    return fail("Only active appointments can be completed.", status.HTTP_409_CONFLICT)
                diagnosis = str(data.get("diagnosis") or "").strip()
                notes = str(data.get("prescription_notes") or "").strip()
                medicines = data.get("medicines") or []
                if not isinstance(medicines, list):
                    return fail("Medicines must be a list.")
                if not diagnosis and not notes and not medicines:
                    return fail("Add diagnosis, prescription notes, or medicines before completing.")
                appointment.diagnosis = diagnosis
                appointment.prescription_notes = notes
                appointment.medicines = medicines
                appointment.status = Appointment.Status.COMPLETED
                appointment.completed_at = now()
            elif action == "no-show":
                if appointment.status not in ACTIVE_APPOINTMENT_STATUSES:
                    return fail("Only active appointments can be marked no-show.", status.HTTP_409_CONFLICT)
                appointment.status = Appointment.Status.NO_SHOW
                appointment.slot.status = AppointmentSlot.Status.AVAILABLE
                appointment.slot.block_reason = ""
                appointment.slot.save(update_fields=["status", "block_reason", "updated_at"])
            else:
                return fail("Unsupported appointment action.", status.HTTP_404_NOT_FOUND)
            appointment.save()
            details = {"reason": str(data.get("reason") or "").strip()} if data.get("reason") else {}
            create_timeline(appointment, action, request.user, details)
        audit(request, action, "appointment", pk, f"{action.title()} appointment for {appointment.patient_name}")
        return Response({"success": True, "appointment": appointment_row(appointment)})

    def _consult_action(self, request, pk, action, data):
        with transaction.atomic():
            consult = InstantConsult.objects.select_for_update().select_related("doctor").filter(pk=pk).first()
            if not consult:
                return fail("Instant Consult was not found.", status.HTTP_404_NOT_FOUND)
            if action == "assign":
                doctor = Doctor.objects.filter(
                    pk=data.get("doctor_id"),
                    verification_status=Doctor.VerificationStatus.VERIFIED,
                    available=True,
                ).first()
                if not doctor:
                    return fail("Choose a verified, online doctor.")
                consult.doctor = doctor
                consult.doctor_name = doctor.name
                consult.status = InstantConsult.Status.ASSIGNED
                consult.assigned_at = now()
            elif action == "start":
                if consult.status != InstantConsult.Status.ASSIGNED:
                    return fail("Assign a doctor before starting the consult.", status.HTTP_409_CONFLICT)
                consult.status = InstantConsult.Status.IN_PROGRESS
                consult.started_at = now()
            elif action == "end":
                if consult.status != InstantConsult.Status.IN_PROGRESS:
                    return fail("Only active consultations can be ended.", status.HTTP_409_CONFLICT)
                ended = now()
                started = consult.started_at or ended
                seconds = max(int((ended - started).total_seconds()), 0)
                consult.status = InstantConsult.Status.COMPLETED
                consult.ended_at = ended
                consult.duration_seconds = seconds
                CallLog.objects.create(
                    consult=consult,
                    doctor=consult.doctor,
                    doctor_name=consult.doctor_name,
                    patient_id=consult.patient_id,
                    patient_name=consult.patient_name,
                    start_time=started,
                    end_time=ended,
                    duration_seconds=seconds,
                    consultation_type=consult.consultation_type,
                    development_key=dev_key("call") if consult.is_development_data else None,
                    is_development_data=consult.is_development_data,
                )
            else:
                return fail("Unsupported instant consult action.", status.HTTP_404_NOT_FOUND)
            consult.save()
        audit(request, action, "instant_consult", pk, f"{action.title()} instant consult for {consult.patient_name}")
        return Response({"success": True, "consult": serialize_resource("instant-consults", consult)})

    def _review_action(self, request, pk, action, data):
        review = Review.objects.select_related("doctor").filter(pk=pk).first()
        if not review:
            return fail("Review not found.", status.HTTP_404_NOT_FOUND)
        if action == "delete":
            return CareDetailView()._delete_review(request, pk)
        status_value = {
            "approve": Review.ModerationStatus.APPROVED,
            "hide": Review.ModerationStatus.HIDDEN,
        }.get(action)
        if status_value is None:
            return fail("Unsupported review action.", status.HTTP_404_NOT_FOUND)
        review.moderation_status = status_value
        review.moderated_at = now()
        review.moderated_by = str(request.user.pk)
        review.save(update_fields=["moderation_status", "moderated_at", "moderated_by"])
        rating = doctor_rating(review.doctor)
        audit(request, action, "doctor_review", pk, f"{action.title()} review for doctor {review.doctor_id}", {"rating": review.rating})
        return Response({"success": True, "status": status_value, "rating": rating})

    def _pay_payout(self, request, pk):
        with transaction.atomic():
            payout = None
            if ":" not in str(pk):
                try:
                    payout = DoctorPayout.objects.select_for_update().filter(pk=pk).first()
                except (ValueError, TypeError):
                    payout = None
            if payout is None:
                doctor_id, separator, period = str(pk).partition(":")
                if not separator:
                    return fail("Payout not found.", status.HTTP_404_NOT_FOUND)
                try:
                    doctor = Doctor.objects.filter(pk=doctor_id).first()
                except (ValueError, TypeError):
                    doctor = None
                if not doctor:
                    return fail("Doctor not found.", status.HTTP_404_NOT_FOUND)
                period = safe_period(period)
                calculation = calculate_payout(doctor, period)
                if not calculation["consultation_count"]:
                    return fail("There are no completed consultations to pay for this period.", status.HTTP_409_CONFLICT)
                payout, _ = DoctorPayout.objects.get_or_create(
                    doctor=doctor,
                    period=period,
                    defaults={
                        "doctor_name": doctor.name,
                        **calculation,
                        "development_key": dev_key("payout") if doctor.is_development_data else None,
                        "is_development_data": doctor.is_development_data,
                    },
                )
                payout = DoctorPayout.objects.select_for_update().get(pk=payout.pk)
            if payout.status == DoctorPayout.Status.PAID:
                return fail("This payout has already been paid.", status.HTTP_409_CONFLICT)
            payment = CarePayment.objects.create(
                payout=payout,
                doctor=payout.doctor,
                amount=payout.net_payable,
                kind=CarePayment.Kind.DOCTOR_PAYOUT,
                status=CarePayment.Status.PAID,
                development_key=dev_key("payout-payment") if payout.is_development_data else None,
                is_development_data=payout.is_development_data,
            )
            payout.status = DoctorPayout.Status.PAID
            payout.paid_at = now()
            payout.save(update_fields=["status", "paid_at"])
        audit(request, "pay", "doctor_payout", payout.pk, f"Paid doctor payout for {payout.doctor_name}", {
            "amount": str(payout.net_payable),
            "payment_id": str(payment.pk),
        })
        return Response({"success": True, "payout": serialize_resource("payouts", payout), "payment": serialize_resource("payments", payment)})

    def _refund_action(self, request, pk, action, data):
        with transaction.atomic():
            refund = RefundRequest.objects.select_for_update().filter(pk=pk).first()
            if not refund:
                return fail("Refund request not found.", status.HTTP_404_NOT_FOUND)
            if refund.status != RefundRequest.Status.PENDING:
                return fail("Only pending refund requests can be reviewed.", status.HTTP_409_CONFLICT)
            reason = str(data.get("reason") or "").strip()
            if action == "reject" and not reason:
                return fail("A reason is required when rejecting a refund.")
            refund.status = RefundRequest.Status.APPROVED if action == "approve" else RefundRequest.Status.REJECTED
            refund.reason = reason
            refund.reviewed_at = now()
            refund.reviewed_by = str(request.user.pk)
            refund.save()
            if action == "approve":
                refund.payment.status = CarePayment.Status.REFUNDED
                refund.payment.save(update_fields=["status"])
                refund.appointment.payment_status = Appointment.PaymentStatus.REFUNDED
                refund.appointment.save(update_fields=["payment_status", "updated_at"])
        audit(request, action, "refund_request", pk, f"{action.title()} refund request", {"amount": str(refund.amount), "reason": reason})
        return Response({"success": True, "refund": serialize_resource("refunds", refund)})
