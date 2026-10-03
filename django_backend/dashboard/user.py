from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission

from .models import PlatformDoctor, PlatformReview, PlatformUser


VALID_ROLES = {choice for choice, _ in PlatformUser.Role.choices}
VALID_STATUS_VALUES = {
    "active", "blocked", "deactivated", "pending", "verified", "rejected", "suspended",
}
DOCTOR_STATUS_VALUES = {
    status for status, _ in PlatformDoctor.VerificationStatus.choices
}


def _response(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "message": message}, status=code)


def _user_status(user):
    if user.status in VALID_STATUS_VALUES:
        return user.status
    if user.is_blocked:
        return "blocked"
    if not user.is_active:
        return "deactivated"
    if user.verification_status in VALID_STATUS_VALUES:
        return user.verification_status
    return "active"


def _user_active(user):
    return (
        not user.is_blocked
        and user.is_active
        and _user_status(user) not in {"blocked", "deactivated", "suspended", "rejected"}
    )


def _serialize_user(user, doctor=None):
    doctor = doctor or user.doctor
    location = (doctor.location if doctor else "") or ""
    return {
        "id": str(user.pk),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "mobile": user.mobile,
        "doctor_id": str(user.doctor_id or ""),
        "city": (doctor.city if doctor else "") or user.city,
        "gender": user.gender,
        "date_of_birth": user.date_of_birth,
        "blood_group": user.blood_group,
        "status": _user_status(user),
        "is_active": _user_active(user),
        "is_blocked": user.is_blocked,
        "wallet_balance": float(user.wallet_balance),
        "wallet_transactions": user.wallet_transactions or [],
        "family_members": user.family_members or [],
        "addresses": user.addresses or [],
        "partner_role": user.partner_role,
        "availability": user.availability,
        "specialty": (doctor.specialty if doctor else "") or "",
        "location": location,
        "hospital": location,
        "bio": (doctor.detail if doctor else "") or "",
        "fee": float(doctor.fee) if doctor else None,
        "verification_status": user.verification_status or _user_status(user),
        "rejection_reason": user.rejection_reason,
        "suspension_reason": user.suspension_reason,
    }


def _serialize_doctor(doctor):
    verification_status = doctor.verification_status or (
        "verified" if doctor.verified else "pending"
    )
    return {
        "id": str(doctor.pk),
        "doctorId": str(doctor.pk),
        "name": doctor.name,
        "specialty": doctor.specialty,
        "city": doctor.city,
        "detail": doctor.detail,
        "bio": doctor.detail,
        "location": doctor.location,
        "hospital": doctor.location,
        "fee": float(doctor.fee),
        "rating": doctor.rating,
        "photo": doctor.photo,
        "credentialStatus": verification_status,
        "verification_status": verification_status,
        "available": doctor.available,
    }


def _user_or_none(pk):
    return PlatformUser.objects.select_related("doctor").filter(pk=pk).first()


def _doctor_values(payload, *, defaults=None):
    defaults = defaults or {}
    name = str(payload.get("name", defaults.get("name", "")) or "").strip()
    specialty = str(payload.get("specialty", defaults.get("specialty", "")) or "").strip()
    city = str(payload.get("city", defaults.get("city", "")) or "").strip()
    location = str(
        payload.get(
            "location",
            payload.get("hospital", defaults.get("location", "")),
        )
        or ""
    ).strip()
    detail = str(
        payload.get("bio", payload.get("detail", defaults.get("detail", ""))) or ""
    ).strip()
    try:
        fee = Decimal(str(payload.get("fee", defaults.get("fee", 0)) or 0))
        if not fee.is_finite() or fee < 0 or fee > Decimal("1000000"):
            raise InvalidOperation
    except (InvalidOperation, TypeError, ValueError):
        return None, "Consultation fee must be between 0 and 1000000."
    if len(name) < 2:
        return None, "Doctor name must be at least 2 characters."
    if not specialty:
        return None, "Specialty is required."
    return {
        "name": name,
        "specialty": specialty,
        "city": city,
        "location": location,
        "detail": detail,
        "fee": fee,
    }, None


class PlatformUserListView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request):
        queryset = PlatformUser.objects.select_related("doctor")
        role = request.query_params.get("role")
        if role in VALID_ROLES:
            queryset = queryset.filter(role=role)
        search = (request.query_params.get("search") or "").strip()[:100]
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search)
                | models.Q(email__icontains=search)
                | models.Q(mobile__icontains=search)
            )
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)
        except (TypeError, ValueError):
            page, size = 1, 20
        total = queryset.count()
        rows = queryset[(page - 1) * size:page * size]
        return Response({
            "success": True,
            "total": total,
            "page": page,
            "page_size": size,
            "results": [_serialize_user(user) for user in rows],
        })

    def post(self, request):
        payload = request.data or {}
        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        mobile = str(payload.get("mobile") or "").strip()
        role = str(payload.get("role") or "").strip().lower()
        user_status = str(payload.get("status") or "active").strip().lower()
        availability = str(payload.get("availability") or "available").strip().lower()
        if not name:
            return _response("Name is required.")
        if not email:
            return _response("Email is required.")
        if role not in VALID_ROLES:
            return _response("Role must be one of patient, doctor, or partner.")
        if user_status not in VALID_STATUS_VALUES:
            return _response("Invalid status.")
        if availability not in {"available", "unavailable"}:
            return _response("Availability must be available or unavailable.")
        if PlatformUser.objects.filter(email__iexact=email).exists():
            return _response("A user with this email already exists.", status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                user = PlatformUser.objects.create(
                    id=uuid4().hex,
                    name=name,
                    email=email,
                    mobile=mobile,
                    role=role,
                    status=user_status,
                    is_active=user_status not in {"blocked", "deactivated", "rejected", "suspended"},
                    is_blocked=user_status == "blocked",
                    wallet_balance=Decimal(str(payload.get("walletBalance") or 0)),
                    wallet_transactions=payload.get("walletTransactions") or [],
                    family_members=payload.get("familyMembers") or [],
                    addresses=payload.get("addresses") or [],
                    partner_role=str(payload.get("partnerRole") or "").strip(),
                    availability=availability,
                    city=str(payload.get("city") or "").strip(),
                    gender=str(payload.get("gender") or "").strip(),
                    date_of_birth=str(payload.get("dateOfBirth") or payload.get("date_of_birth") or "").strip(),
                    blood_group=str(payload.get("bloodGroup") or payload.get("blood_group") or "").strip(),
                    verification_status=str(
                        payload.get("verificationStatus")
                        or (user_status if role == "doctor" and user_status in DOCTOR_STATUS_VALUES else "pending")
                    ),
                    rejection_reason=str(payload.get("rejectionReason") or ""),
                    suspension_reason=str(payload.get("suspensionReason") or ""),
                    password_hash=make_password(payload.get("password")) if payload.get("password") else make_password(None),
                )
                if role == PlatformUser.Role.DOCTOR:
                    values, error = _doctor_values(
                        payload,
                        defaults={
                            "name": name,
                            "specialty": "General Physician",
                            "city": user.city,
                        },
                    )
                    if error:
                        raise ValueError(error)
                    doctor_id = str(payload.get("doctorId") or f"doc-{uuid4().hex}").strip()
                    doctor = PlatformDoctor.objects.filter(pk=doctor_id).first()
                    if doctor and doctor.owner_id and doctor.owner_id != user.pk:
                        raise IntegrityError("This doctor profile is already linked to another account.")
                    if doctor:
                        for field, value in values.items():
                            setattr(doctor, field, value)
                        doctor.owner = user
                        doctor.verification_status = user.verification_status
                        doctor.verified = doctor.verification_status == "verified"
                        doctor.save()
                    else:
                        doctor = PlatformDoctor.objects.create(
                            id=doctor_id,
                            owner=user,
                            verification_status=user.verification_status,
                            verified=user.verification_status == "verified",
                            **values,
                        )
                    user.doctor = doctor
                    user.save(update_fields=["doctor", "updated_at"])
        except ValueError as error:
            return _response(str(error))
        except IntegrityError as error:
            if "already linked" in str(error):
                return _response(str(error), status.HTTP_409_CONFLICT)
            return _response("A user or doctor profile with these details already exists.", status.HTTP_409_CONFLICT)
        return Response(
            {"success": True, "user": _serialize_user(user)},
            status=status.HTTP_201_CREATED,
        )


class PlatformUserDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request, pk):
        user = _user_or_none(pk)
        if user is None:
            return _response("User not found.", status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "user": _serialize_user(user)})

    def patch(self, request, pk):
        payload = request.data or {}
        user = _user_or_none(pk)
        if user is None:
            return _response("User not found.", status.HTTP_404_NOT_FOUND)

        aliases = {
            "date_of_birth": "date_of_birth",
            "blood_group": "blood_group",
            "partnerRole": "partner_role",
            "dateOfBirth": "date_of_birth",
            "bloodGroup": "blood_group",
            "doctorId": "doctor",
            "isActive": "is_active",
            "isBlocked": "is_blocked",
            "verificationStatus": "verification_status",
            "rejectionReason": "rejection_reason",
            "suspensionReason": "suspension_reason",
        }
        allowed = {
            "name", "email", "mobile", "role", "status", "isActive", "isBlocked",
            "partnerRole", "availability", "verificationStatus", "rejectionReason",
            "suspensionReason", "city", "gender", "dateOfBirth", "date_of_birth",
            "bloodGroup", "blood_group", "doctorId",
        }
        updates = {}
        for source in allowed.intersection(payload):
            target = aliases.get(source, source)
            value = payload[source]
            if target == "doctor":
                doctor = PlatformDoctor.objects.filter(pk=str(value or "")).first()
                if value and doctor is None:
                    return _response("Doctor profile not found.", status.HTTP_404_NOT_FOUND)
                updates[target] = doctor
            elif target in {"is_active", "is_blocked"}:
                if not isinstance(value, bool):
                    return _response(f"{source} must be true or false.")
                updates[target] = value
            elif target in {"name", "email", "mobile", "role", "status", "availability",
                            "partner_role", "verification_status", "rejection_reason",
                            "suspension_reason", "city", "gender", "date_of_birth",
                            "blood_group"}:
                updates[target] = str(value or "").strip()
                if target == "email":
                    updates[target] = updates[target].lower()

        if "email" in updates:
            if not updates["email"]:
                return _response("Email is required.")
            if PlatformUser.objects.filter(email__iexact=updates["email"]).exclude(pk=user.pk).exists():
                return _response("A user with this email already exists.", status.HTTP_409_CONFLICT)
        if updates.get("role") and updates["role"] not in VALID_ROLES:
            return _response("Role must be a valid user role.")
        if updates.get("status") and updates["status"] not in VALID_STATUS_VALUES:
            return _response("Invalid status.")
        if updates.get("availability") and updates["availability"] not in {"available", "unavailable"}:
            return _response("Availability must be available or unavailable.")

        doctor_values = None
        doctor_fields = {"name", "specialty", "city", "location", "hospital", "bio", "detail", "fee"}
        if doctor_fields.intersection(payload) and (
            user.role == PlatformUser.Role.DOCTOR
            or updates.get("role") == PlatformUser.Role.DOCTOR
        ):
            defaults = {
                "name": user.name,
                "specialty": user.doctor.specialty if user.doctor else "General Physician",
                "city": user.city,
                "location": user.doctor.location if user.doctor else "",
                "detail": user.doctor.detail if user.doctor else "",
                "fee": user.doctor.fee if user.doctor else 0,
            }
            doctor_values, error = _doctor_values(payload, defaults=defaults)
            if error:
                return _response(error)

        try:
            with transaction.atomic():
                locked = PlatformUser.objects.select_for_update().get(pk=user.pk)
                for field, value in updates.items():
                    setattr(locked, field, value)
                if "status" in updates and locked.role == PlatformUser.Role.DOCTOR:
                    if locked.status in DOCTOR_STATUS_VALUES:
                        locked.verification_status = locked.status
                if doctor_values is not None:
                    doctor = locked.doctor
                    if doctor is None:
                        doctor = PlatformDoctor.objects.create(
                            id=f"doc-{uuid4().hex}",
                            owner=locked,
                            verification_status=locked.verification_status,
                            verified=locked.verification_status == "verified",
                            **doctor_values,
                        )
                        locked.doctor = doctor
                    else:
                        for field, value in doctor_values.items():
                            setattr(doctor, field, value)
                        doctor.save()
                locked.save()
                user = PlatformUser.objects.select_related("doctor").get(pk=locked.pk)
        except IntegrityError:
            return _response("A user with this email already exists.", status.HTTP_409_CONFLICT)
        return Response({"success": True, "user": _serialize_user(user)})

    def delete(self, request, pk):
        user = _user_or_none(pk)
        if user is None:
            return _response("User not found.", status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response({"success": True, "message": "User deleted."})


class PlatformDoctorListView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request):
        doctors = PlatformDoctor.objects.all()
        return Response({"success": True, "results": [_serialize_doctor(row) for row in doctors]})


class PlatformDoctorDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def patch(self, request, pk):
        doctor = PlatformDoctor.objects.filter(pk=pk).first()
        if doctor is None:
            return _response("Doctor profile not found.", status.HTTP_404_NOT_FOUND)
        payload = request.data or {}
        supported = {
            "name", "specialty", "city", "location", "hospital", "bio", "detail",
            "fee", "rating", "photo", "available",
        }
        if not supported.intersection(payload):
            return _response("No valid doctor fields provided for update.")
        values, error = _doctor_values(request.data or {}, defaults={
            "name": doctor.name,
            "specialty": doctor.specialty,
            "city": doctor.city,
            "location": doctor.location,
            "detail": doctor.detail,
            "fee": doctor.fee,
        })
        if error:
            return _response(error)
        editable = {
            "rating": "rating",
            "photo": "photo",
            "available": "available",
        }
        for source, target in editable.items():
            if source in payload:
                value = payload[source]
                if target == "available":
                    if not isinstance(value, bool):
                        return _response("Availability must be true or false.")
                else:
                    value = str(value or "").strip()
                values[target] = value
        for field, value in values.items():
            setattr(doctor, field, value)
        doctor.save()
        return Response({"success": True, "doctor": _serialize_doctor(doctor)})

    def delete(self, request, pk):
        doctor = PlatformDoctor.objects.filter(pk=pk).first()
        if doctor is None:
            return _response("Doctor profile not found.", status.HTTP_404_NOT_FOUND)
        doctor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlatformDoctorStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def post(self, request, pk, action):
        if action not in {"approve", "reject", "suspend", "reinstate"}:
            return _response("Unsupported doctor status action.")
        reason = str(request.data.get("reason") or "").strip()
        if action in {"reject", "suspend"} and not reason:
            return _response("Reason is required.")
        doctor = PlatformDoctor.objects.select_related("owner").filter(pk=pk).first()
        if doctor is None:
            return _response("Doctor profile not found.", status.HTTP_404_NOT_FOUND)
        next_status = {
            "approve": "verified",
            "reinstate": "verified",
            "reject": "rejected",
            "suspend": "suspended",
        }[action]
        now = timezone.now()
        doctor.verified = next_status == "verified"
        doctor.verification_status = next_status
        doctor.rejection_reason = reason if action == "reject" else ""
        doctor.suspension_reason = reason if action == "suspend" else ""
        doctor.updated_at = now
        doctor.save()
        if doctor.owner_id:
            owner = doctor.owner
            owner.status = next_status
            owner.verification_status = next_status
            owner.is_active = next_status == "verified"
            owner.is_blocked = False
            owner.rejection_reason = doctor.rejection_reason
            owner.suspension_reason = doctor.suspension_reason
            owner.save()
        return Response({
            "success": True,
            "doctor": _serialize_doctor(doctor),
            "message": f"Doctor {next_status}.",
        })


class PlatformUserStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def post(self, request, pk, action):
        user = _user_or_none(pk)
        if user is None:
            return _response("User not found.", status.HTTP_404_NOT_FOUND)
        reason = str(request.data.get("reason") or "").strip()
        if action in {"block", "deactivate", "suspend", "reject"} and not reason:
            return _response("Reason is required.")
        states = {
            "block": ("blocked", False, True),
            "unblock": ("active", True, False),
            "deactivate": ("deactivated", False, False),
            "reactivate": ("active", True, False),
            "approve": ("verified", True, False),
            "reject": ("rejected", False, False),
            "suspend": ("suspended", False, False),
            "reinstate": ("verified", True, False),
        }
        if action not in states:
            return _response("Unsupported user status action.")
        next_status, is_active, is_blocked = states[action]
        user.status = next_status
        user.is_active = is_active
        user.is_blocked = is_blocked
        if action in {"approve", "reject", "suspend", "reinstate"}:
            user.verification_status = next_status
        if action in {"block", "unblock", "approve", "reject", "suspend", "reinstate"}:
            user.rejection_reason = reason if action == "reject" else ""
            user.suspension_reason = reason if action == "suspend" else ""
        user.save()
        return Response({
            "success": True,
            "user": _serialize_user(user),
            "message": f"{action.title()} completed.",
        })


class PlatformWalletActionView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def post(self, request, pk, direction):
        if direction not in {"credit", "debit"}:
            return _response("Unsupported wallet action.")
        reason = str(request.data.get("reason") or "").strip()
        if not reason:
            return _response("Reason is required.")
        try:
            amount = Decimal(str(request.data.get("amount")))
            if not amount.is_finite() or amount <= 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return _response("Amount must be greater than zero.")
        with transaction.atomic():
            user = PlatformUser.objects.select_for_update().filter(pk=pk).first()
            if user is None:
                return _response("User not found.", status.HTTP_404_NOT_FOUND)
            next_balance = user.wallet_balance + amount if direction == "credit" else user.wallet_balance - amount
            if next_balance < 0:
                return _response("Wallet debit exceeds available balance.")
            entry = {
                "type": direction,
                "amount": float(amount),
                "reason": reason,
                "createdAt": timezone.now().isoformat(),
            }
            user.wallet_balance = next_balance
            user.wallet_transactions = [*(user.wallet_transactions or []), entry]
            user.save()
            user = PlatformUser.objects.select_related("doctor").get(pk=user.pk)
        return Response({
            "success": True,
            "user": _serialize_user(user),
            "transaction": entry,
        })


class PlatformRelationshipCollectionView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit", "patch": "edit", "delete": "delete"}

    def _user(self, pk):
        return _user_or_none(pk)

    def _collection(self, request, pk, kind, operation, item_id=None):
        user = self._user(pk)
        if user is None:
            return _response("User not found.", status.HTTP_404_NOT_FOUND)
        if kind not in {"familyMembers", "addresses"}:
            return _response("Unsupported relationship collection.", status.HTTP_404_NOT_FOUND)
        field = "family_members" if kind == "familyMembers" else "addresses"
        values = list(getattr(user, field) or [])
        if operation == "post":
            payload = request.data or {}
            value = payload.get("value") or payload
            if kind == "familyMembers":
                item = {
                    "name": str(value.get("name") or "").strip(),
                    "relation": str(value.get("relation") or "").strip(),
                    "dob": str(value.get("dob") or "").strip(),
                    "phone": str(value.get("phone") or "").strip(),
                }
                if not item["name"] or not item["relation"]:
                    return _response("Family member name and relation are required.")
            else:
                item = {
                    "label": str(value.get("label") or "Home").strip(),
                    "line1": str(value.get("line1") or "").strip(),
                    "line2": str(value.get("line2") or "").strip(),
                    "city": str(value.get("city") or "").strip(),
                    "state": str(value.get("state") or "").strip(),
                    "pinCode": str(value.get("pinCode") or "").strip(),
                    "country": str(value.get("country") or "").strip(),
                    "isDefault": bool(value.get("isDefault")),
                }
                if not item["line1"] or not item["city"]:
                    return _response("Address line and city are required.")
            values.append(item)
        else:
            try:
                index = int(item_id)
            except (TypeError, ValueError):
                return _response(f"Invalid {kind} id.")
            if index < 0 or index >= len(values):
                return _response(f"{kind} item not found.", status.HTTP_404_NOT_FOUND)
            if operation == "patch":
                allowed_fields = (
                    {"name", "relation", "dob", "phone"}
                    if kind == "familyMembers"
                    else {"label", "line1", "line2", "city", "state", "pinCode", "country", "isDefault"}
                )
                values[index].update({
                    key: (str(value).strip() if isinstance(value, str) else value)
                    for key, value in request.data.items()
                    if key in allowed_fields
                })
            elif operation == "delete":
                del values[index]
        setattr(user, field, values)
        user.save(update_fields=[field, "updated_at"])
        user = PlatformUser.objects.select_related("doctor").get(pk=user.pk)
        return Response({"success": True, "user": _serialize_user(user)})

    def post(self, request, pk, kind):
        return self._collection(request, pk, kind, "post")

    def patch(self, request, pk, kind, item_id):
        return self._collection(request, pk, kind, "patch", item_id)

    def delete(self, request, pk, kind, item_id):
        return self._collection(request, pk, kind, "delete", item_id)
