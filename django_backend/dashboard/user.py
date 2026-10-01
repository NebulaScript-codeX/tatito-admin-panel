import hashlib
import re
from datetime import datetime, timezone as dt_timezone
from uuid import uuid4

try:
    import bcrypt
except ImportError:  # pragma: no cover
    bcrypt = None

from bson import ObjectId
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission

from . import mongo
from .services import DOCTORS, USERS, _safe_user


VALID_ROLES = {"patient", "doctor", "partner"}
VALID_STATUS_VALUES = {"active", "blocked", "deactivated", "pending", "verified", "rejected", "suspended"}


def _hash_password(password):
    value = str(password or "").encode("utf-8")
    if bcrypt is not None:
        return bcrypt.hashpw(value, bcrypt.gensalt()).decode("utf-8")
    salt = "tatito-health-plus-admin"
    return hashlib.pbkdf2_hmac("sha256", value, salt.encode("utf-8"), 100000).hex()


def _resolve_user_status(doc):
    if doc.get("status") in VALID_STATUS_VALUES:
        return doc["status"]
    if doc.get("isBlocked"):
        return "blocked"
    if doc.get("isActive") is False:
        return "deactivated"
    if doc.get("verificationStatus") in VALID_STATUS_VALUES:
        return doc["verificationStatus"]
    return "active"


def _resolve_active(doc):
    if doc.get("isBlocked"):
        return False
    if doc.get("isActive") is False:
        return False
    status_value = _resolve_user_status(doc)
    return status_value not in {"blocked", "deactivated", "suspended", "rejected"}


def _serialize_user(doc, doctor=None):
    if doctor is None and doc.get("doctorId"):
        doctor = mongo.get_mongo_database()[DOCTORS].find_one(
            {"_id": str(doc["doctorId"])},
        )
    row = _safe_user(doc)
    row["mobile"] = doc.get("mobile", "")
    row["doctor_id"] = doc.get("doctorId") or ""
    row["city"] = (doctor or {}).get("city") or doc.get("city", "")
    row["gender"] = doc.get("gender", "")
    row["date_of_birth"] = doc.get("dateOfBirth") or doc.get("date_of_birth", "")
    row["blood_group"] = doc.get("bloodGroup") or doc.get("blood_group", "")
    row["status"] = _resolve_user_status(doc)
    row["is_active"] = _resolve_active(doc)
    row["is_blocked"] = bool(doc.get("isBlocked"))
    row["wallet_balance"] = float(doc.get("walletBalance") or 0)
    row["wallet_transactions"] = doc.get("walletTransactions") or []
    row["family_members"] = doc.get("familyMembers") or []
    row["addresses"] = doc.get("addresses") or []
    row["partner_role"] = doc.get("partnerRole") or ""
    row["availability"] = doc.get("availability") or "available"
    row["specialty"] = (doctor or {}).get("specialty") or doc.get("specialty", "")
    row["location"] = (doctor or {}).get("location") or doc.get("location", "")
    row["hospital"] = row["location"]
    row["bio"] = (doctor or {}).get("detail") or doc.get("bio", "")
    row["fee"] = (doctor or {}).get("fee", doc.get("fee"))
    row["verification_status"] = doc.get("verificationStatus") or row["status"]
    row["rejection_reason"] = doc.get("rejectionReason") or ""
    row["suspension_reason"] = doc.get("suspensionReason") or ""
    row["created_at"] = doc.get("createdAt")
    row["updated_at"] = doc.get("updatedAt")
    return row


class PlatformUserListView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request):
        query = {}
        role = request.query_params.get("role")
        if role in VALID_ROLES:
            query["role"] = role
        search = (request.query_params.get("search") or "").strip()[:100]
        if search:
            pattern = re.escape(search)
            query["$or"] = [
                {"name": {"$regex": pattern, "$options": "i"}},
                {"email": {"$regex": pattern, "$options": "i"}},
                {"mobile": {"$regex": pattern, "$options": "i"}},
            ]

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)
        except ValueError:
            page, size = 1, 20

        coll = mongo.get_mongo_database()[USERS]
        total = coll.count_documents(query)
        docs = coll.find(query, {"passwordHash": 0}).sort("createdAt", -1).skip((page - 1) * size).limit(size)
        results = [_serialize_user(d) for d in docs]
        return Response({"success": True, "total": total, "page": page, "page_size": size, "results": results})

    def post(self, request):
        payload = request.data or {}
        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        mobile = str(payload.get("mobile") or "").strip()
        role = str(payload.get("role") or "").strip().lower()
        password = payload.get("password")
        user_status = str(payload.get("status") or "active").strip().lower()
        availability = str(payload.get("availability") or "available").strip().lower()

        if not name:
            return Response({"success": False, "message": "Name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({"success": False, "message": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in VALID_ROLES:
            return Response({"success": False, "message": "Role must be one of patient, doctor, or partner."}, status=status.HTTP_400_BAD_REQUEST)
        if user_status not in VALID_STATUS_VALUES:
            return Response({"success": False, "message": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        if availability not in {"available", "unavailable"}:
            return Response({"success": False, "message": "Availability must be available or unavailable."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor_fee = float(payload.get("fee") or 0)
        except (TypeError, ValueError):
            return Response({"success": False, "message": "Consultation fee must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)
        if doctor_fee < 0 or doctor_fee > 1000000:
            return Response({"success": False, "message": "Consultation fee must be between 0 and 1000000."}, status=status.HTTP_400_BAD_REQUEST)

        database = mongo.get_mongo_database()
        coll = database[USERS]
        if coll.find_one({"email": email}):
            return Response({"success": False, "message": "A user with this email already exists."}, status=status.HTTP_409_CONFLICT)

        hashed = _hash_password(password or f"Tatito@{email}")
        doc = {
            "name": name,
            "email": email,
            "mobile": mobile,
            "role": role,
            "doctorId": None,
            "passwordHash": hashed,
            "status": user_status,
            "isActive": True,
            "isBlocked": False,
            "walletBalance": float(payload.get("walletBalance") or 0),
            "walletTransactions": payload.get("walletTransactions") or [],
            "familyMembers": payload.get("familyMembers") or [],
            "addresses": payload.get("addresses") or [],
            "partnerRole": payload.get("partnerRole") or "",
            "availability": availability,
            "city": str(payload.get("city") or "").strip(),
            "gender": str(payload.get("gender") or "").strip(),
            "dateOfBirth": str(payload.get("dateOfBirth") or payload.get("date_of_birth") or "").strip(),
            "bloodGroup": str(payload.get("bloodGroup") or payload.get("blood_group") or "").strip(),
            "verificationStatus": payload.get("verificationStatus") or (user_status if role == "doctor" and user_status in {"pending", "verified", "rejected", "suspended"} else "pending"),
            "rejectionReason": payload.get("rejectionReason") or "",
            "suspensionReason": payload.get("suspensionReason") or "",
            "createdAt": datetime.now(dt_timezone.utc),
            "updatedAt": datetime.now(dt_timezone.utc),
        }
        result = coll.insert_one(doc)
        doctor = None
        if role == "doctor":
            doctor_id = str(payload.get("doctorId") or f"doc-{uuid4().hex}").strip()
            doctors = database[DOCTORS]
            doctor = doctors.find_one({"_id": doctor_id})
            if doctor and doctor.get("owner"):
                coll.delete_one({"_id": result.inserted_id})
                return Response({"success": False, "message": "This doctor profile is already linked to another account."}, status=status.HTTP_409_CONFLICT)
            doctor_values = {
                "name": name,
                "specialty": str(payload.get("specialty") or "General Physician").strip(),
                "city": str(payload.get("city") or "").strip(),
                "detail": str(payload.get("bio") or payload.get("detail") or "").strip(),
                "location": str(payload.get("location") or payload.get("hospital") or "").strip(),
                "fee": doctor_fee,
                "verificationStatus": doc["verificationStatus"],
                "verified": doc["verificationStatus"] == "verified",
                "available": True,
                "owner": result.inserted_id,
                "updatedAt": datetime.now(dt_timezone.utc),
            }
            try:
                if doctor:
                    doctors.update_one({"_id": doctor_id}, {"$set": doctor_values})
                else:
                    doctors.insert_one({"_id": doctor_id, **doctor_values, "createdAt": datetime.now(dt_timezone.utc)})
                coll.update_one({"_id": result.inserted_id}, {"$set": {"doctorId": doctor_id}})
            except Exception:
                coll.delete_one({"_id": result.inserted_id})
                raise
        created = coll.find_one({"_id": result.inserted_id}, {"passwordHash": 0})
        if role == "doctor":
            doctor = database[DOCTORS].find_one({"_id": created["doctorId"]})
        return Response({"success": True, "user": _serialize_user(created, doctor)}, status=status.HTTP_201_CREATED)


class PlatformUserDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def _user(self, pk):
        coll = mongo.get_mongo_database()[USERS]
        try:
            doc = coll.find_one({"_id": ObjectId(str(pk))})
        except Exception:
            doc = None
        return doc

    def get(self, request, pk):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "user": _serialize_user(doc)})

    def patch(self, request, pk):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = request.data or {}
        updates = {}
        for field in ("name", "email", "mobile", "role", "doctorId", "status", "isActive", "isBlocked", "partnerRole", "availability", "verificationStatus", "rejectionReason", "suspensionReason", "city", "gender", "dateOfBirth", "date_of_birth", "bloodGroup", "blood_group"):
            if field in payload:
                value = payload.get(field)
                if field in {"name", "email", "mobile", "doctorId", "partnerRole", "rejectionReason", "suspensionReason", "city", "gender", "dateOfBirth", "date_of_birth", "bloodGroup", "blood_group"} and value is not None:
                    updates[field] = str(value).strip() if field != "email" else str(value).strip().lower()
                else:
                    updates[field] = value
        if "date_of_birth" in updates:
            updates["dateOfBirth"] = updates.pop("date_of_birth")
        if "blood_group" in updates:
            updates["bloodGroup"] = updates.pop("blood_group")
        if "email" in updates and not updates["email"]:
            return Response({"success": False, "message": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if "role" in updates and updates["role"] not in VALID_ROLES:
            return Response({"success": False, "message": "Role must be a valid user role."}, status=status.HTTP_400_BAD_REQUEST)
        if "status" in updates and updates["status"] not in VALID_STATUS_VALUES:
            return Response({"success": False, "message": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        if "availability" in updates and updates["availability"] not in {"available", "unavailable"}:
            return Response({"success": False, "message": "Availability must be available or unavailable."}, status=status.HTTP_400_BAD_REQUEST)
        if "role" in updates:
            updates["role"] = str(updates["role"]).strip().lower()
            if updates["role"] not in VALID_ROLES:
                return Response({"success": False, "message": "Role must be a valid user role."}, status=status.HTTP_400_BAD_REQUEST)

        doctor_updates = {}
        doctor_fields = {
            "name": "name",
            "specialty": "specialty",
            "city": "city",
            "location": "location",
            "hospital": "location",
            "bio": "detail",
            "detail": "detail",
            "fee": "fee",
        }
        for source, target in doctor_fields.items():
            if source in payload:
                value = payload.get(source)
                if target == "fee":
                    try:
                        value = float(value)
                    except (TypeError, ValueError):
                        return Response({"success": False, "message": "Consultation fee must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)
                    if value < 0 or value > 1000000:
                        return Response({"success": False, "message": "Consultation fee must be between 0 and 1000000."}, status=status.HTTP_400_BAD_REQUEST)
                elif value is not None:
                    value = str(value).strip()
                doctor_updates[target] = value
        if doc.get("role") == "doctor" and updates.get("status") in {"pending", "verified", "rejected", "suspended"}:
            updates["verificationStatus"] = updates["status"]
            doctor_updates["verificationStatus"] = updates["status"]
            doctor_updates["verified"] = updates["status"] == "verified"
        if updates:
            updates["updatedAt"] = datetime.now(dt_timezone.utc)
            mongo.get_mongo_database()[USERS].update_one({"_id": doc["_id"]}, {"$set": updates})
        database = mongo.get_mongo_database()
        if doctor_updates and (doc.get("role") == "doctor" or updates.get("role") == "doctor"):
            doctor_id = doc.get("doctorId")
            if not doctor_id:
                doctor_id = f"doc-{uuid4().hex}"
                doctor_updates.setdefault("name", updates.get("name", doc.get("name", "")))
                doctor_updates.setdefault("specialty", "General Physician")
                doctor_updates.setdefault("city", updates.get("city", doc.get("city", "")))
                doctor_updates.setdefault("detail", "")
                doctor_updates.setdefault("location", "")
                doctor_updates.setdefault("fee", 0)
                doctor_updates.update({"_id": doctor_id, "owner": doc["_id"], "verified": False, "verificationStatus": "pending", "available": True, "createdAt": datetime.now(dt_timezone.utc)})
                database[DOCTORS].insert_one(doctor_updates)
                database[USERS].update_one({"_id": doc["_id"]}, {"$set": {"doctorId": doctor_id}})
            else:
                doctors = database[DOCTORS]
                existing_doctor = doctors.find_one({"_id": str(doctor_id)})
                if existing_doctor:
                    doctors.update_one({"_id": str(doctor_id)}, {"$set": {**doctor_updates, "updatedAt": datetime.now(dt_timezone.utc)}})
                else:
                    doctor_updates.setdefault("name", updates.get("name", doc.get("name", "")))
                    doctor_updates.setdefault("specialty", "General Physician")
                    doctor_updates.setdefault("city", updates.get("city", doc.get("city", "")))
                    doctor_updates.setdefault("detail", "")
                    doctor_updates.setdefault("location", "")
                    doctor_updates.setdefault("fee", 0)
                    doctor_updates.update({"_id": str(doctor_id), "owner": doc["_id"], "verified": False, "verificationStatus": "pending", "available": True, "createdAt": datetime.now(dt_timezone.utc)})
                    doctors.insert_one(doctor_updates)
        refreshed = database[USERS].find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        doctor = database[DOCTORS].find_one({"_id": str(refreshed.get("doctorId"))}) if refreshed.get("doctorId") else None
        return Response({"success": True, "user": _serialize_user(refreshed, doctor)})

    def delete(self, request, pk):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        mongo.get_mongo_database()[USERS].delete_one({"_id": doc["_id"]})
        return Response({"success": True, "message": "User deleted."})


def _serialize_doctor(doc):
    return {
        "id": str(doc.get("_id", "")),
        "doctorId": str(doc.get("_id", "")),
        "name": doc.get("name", ""),
        "specialty": doc.get("specialty", ""),
        "city": doc.get("city", ""),
        "detail": doc.get("detail", ""),
        "bio": doc.get("detail", ""),
        "location": doc.get("location", ""),
        "hospital": doc.get("location", ""),
        "fee": doc.get("fee", 0),
        "rating": doc.get("rating", ""),
        "photo": doc.get("photo", ""),
        "credentialStatus": doc.get("verificationStatus") or ("verified" if doc.get("verified") else "pending"),
        "verification_status": doc.get("verificationStatus") or ("verified" if doc.get("verified") else "pending"),
        "available": doc.get("available", True),
    }


class PlatformDoctorListView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request):
        docs = mongo.get_mongo_database()[DOCTORS].find().sort("_id", 1)
        return Response({"success": True, "results": [_serialize_doctor(doc) for doc in docs]})


class PlatformDoctorDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "users"

    def patch(self, request, pk):
        database = mongo.get_mongo_database()
        collection = database[DOCTORS]
        doctor = collection.find_one({"_id": str(pk)})
        if not doctor:
            return Response({"success": False, "message": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data or {}
        fields = {
            "name": "name",
            "specialty": "specialty",
            "city": "city",
            "location": "location",
            "hospital": "location",
            "bio": "detail",
            "detail": "detail",
            "fee": "fee",
        }
        updates = {}
        for source, target in fields.items():
            if source not in payload:
                continue
            value = payload[source]
            if target == "fee":
                try:
                    value = float(value)
                except (TypeError, ValueError):
                    return Response({"success": False, "message": "Consultation fee must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)
                if value < 0 or value > 1000000:
                    return Response({"success": False, "message": "Consultation fee must be between 0 and 1000000."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                value = str(value or "").strip()
            updates[target] = value

        if "name" in updates and len(updates["name"]) < 2:
            return Response({"success": False, "message": "Doctor name must be at least 2 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if "specialty" in updates and not updates["specialty"]:
            return Response({"success": False, "message": "Specialty is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not updates:
            return Response({"success": False, "message": "No valid doctor fields provided for update."}, status=status.HTTP_400_BAD_REQUEST)

        updates["updatedAt"] = datetime.now(dt_timezone.utc)
        collection.update_one({"_id": str(pk)}, {"$set": updates})
        refreshed = collection.find_one({"_id": str(pk)})
        return Response({"success": True, "doctor": _serialize_doctor(refreshed)})

    def delete(self, request, pk):
        database = mongo.get_mongo_database()
        deleted = database[DOCTORS].delete_one({"_id": str(pk)})
        if not deleted.deleted_count:
            return Response({"success": False, "message": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        database["reviews"].delete_many({"doctorId": str(pk)})
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlatformDoctorStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def post(self, request, pk, action):
        if action not in {"approve", "reject", "suspend", "reinstate"}:
            return Response({"success": False, "message": "Unsupported doctor status action."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason") or "").strip()
        if action in {"reject", "suspend"} and not reason:
            return Response({"success": False, "message": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        database = mongo.get_mongo_database()
        doctors = database[DOCTORS]
        doctor = doctors.find_one({"_id": str(pk)})
        if not doctor:
            return Response({"success": False, "message": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        next_status = "verified" if action in {"approve", "reinstate"} else action
        now = datetime.now(dt_timezone.utc)
        doctor_updates = {
            "verified": next_status == "verified",
            "verificationStatus": next_status,
            "rejectionReason": reason if action == "reject" else "",
            "suspensionReason": reason if action == "suspend" else "",
            "updatedAt": now,
        }
        doctors.update_one({"_id": str(pk)}, {"$set": doctor_updates})

        owner_id = doctor.get("owner")
        if owner_id is not None:
            users = database[USERS]
            users.update_one(
                {"_id": owner_id},
                {"$set": {
                    "status": next_status,
                    "verificationStatus": next_status,
                    "isActive": next_status == "verified",
                    "isBlocked": False,
                    "rejectionReason": doctor_updates["rejectionReason"],
                    "suspensionReason": doctor_updates["suspensionReason"],
                    "updatedAt": now,
                }},
            )

        refreshed = doctors.find_one({"_id": str(pk)})
        return Response({
            "success": True,
            "doctor": _serialize_doctor(refreshed),
            "message": f"Doctor {next_status}.",
        })


class PlatformUserStatusView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def _user(self, pk):
        coll = mongo.get_mongo_database()[USERS]
        try:
            return coll.find_one({"_id": ObjectId(str(pk))})
        except Exception:
            return None

    def post(self, request, pk, action):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        reason = str(request.data.get("reason") or "").strip()
        if action in {"block", "deactivate", "suspend", "reject"} and not reason:
            return Response({"success": False, "message": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        coll = mongo.get_mongo_database()[USERS]
        if action == "block":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "blocked", "isBlocked": True, "isActive": False, "updatedAt": datetime.now(dt_timezone.utc), "rejectionReason": "", "suspensionReason": ""}})
        elif action == "unblock":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "active", "isBlocked": False, "isActive": True, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif action == "deactivate":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "deactivated", "isBlocked": False, "isActive": False, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif action == "reactivate":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "active", "isBlocked": False, "isActive": True, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif action == "approve":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "verified", "verificationStatus": "verified", "isActive": True, "updatedAt": datetime.now(dt_timezone.utc), "rejectionReason": "", "suspensionReason": ""}})
        elif action == "reject":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "rejected", "verificationStatus": "rejected", "rejectionReason": reason, "suspensionReason": "", "isActive": False, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif action == "suspend":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "suspended", "verificationStatus": "suspended", "suspensionReason": reason, "rejectionReason": "", "isActive": False, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif action == "reinstate":
            coll.update_one({"_id": doc["_id"]}, {"$set": {"status": "verified", "verificationStatus": "verified", "suspensionReason": "", "rejectionReason": "", "isActive": True, "updatedAt": datetime.now(dt_timezone.utc)}})
        refreshed = coll.find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        return Response({"success": True, "user": _serialize_user(refreshed), "message": f"{action.title()} completed."})


class PlatformWalletActionView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit"}

    def _user(self, pk):
        coll = mongo.get_mongo_database()[USERS]
        try:
            return coll.find_one({"_id": ObjectId(str(pk))})
        except Exception:
            return None

    def post(self, request, pk, direction):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        amount = request.data.get("amount")
        reason = str(request.data.get("reason") or "").strip()
        if not reason:
            return Response({"success": False, "message": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return Response({"success": False, "message": "Amount must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({"success": False, "message": "Amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        coll = mongo.get_mongo_database()[USERS]
        current = float(doc.get("walletBalance") or 0)
        next_balance = current + amount if direction == "credit" else current - amount
        if direction == "debit" and next_balance < 0:
            return Response({"success": False, "message": "Wallet debit exceeds available balance."}, status=status.HTTP_400_BAD_REQUEST)
        transaction = {"type": direction, "amount": amount, "reason": reason, "createdAt": datetime.now(dt_timezone.utc)}
        updated = {"walletBalance": next_balance, "updatedAt": datetime.now(dt_timezone.utc)}
        transactions = list(doc.get("walletTransactions") or [])
        transactions.append(transaction)
        updated["walletTransactions"] = transactions
        coll.update_one({"_id": doc["_id"]}, {"$set": updated})
        refreshed = coll.find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        return Response({"success": True, "user": _serialize_user(refreshed), "transaction": transaction})


class PlatformRelationshipCollectionView(APIView):
    permission_classes = [ModulePermission]
    module = "users"
    action_map = {"post": "edit", "patch": "edit", "delete": "delete"}

    def _user(self, pk):
        coll = mongo.get_mongo_database()[USERS]
        try:
            return coll.find_one({"_id": ObjectId(str(pk))})
        except Exception:
            return None

    def post(self, request, pk, kind):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        coll = mongo.get_mongo_database()[USERS]
        payload = request.data or {}
        value = payload.get("value") or payload
        if kind == "familyMembers":
            member = {"name": str(value.get("name") or "").strip(), "relation": str(value.get("relation") or "").strip(), "dob": str(value.get("dob") or "").strip(), "phone": str(value.get("phone") or "").strip()}
            if not member["name"] or not member["relation"]:
                return Response({"success": False, "message": "Family member name and relation are required."}, status=status.HTTP_400_BAD_REQUEST)
            members = list(doc.get("familyMembers") or [])
            members.append(member)
            coll.update_one({"_id": doc["_id"]}, {"$set": {"familyMembers": members, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif kind == "addresses":
            address = {"label": str(value.get("label") or "Home").strip(), "line1": str(value.get("line1") or "").strip(), "line2": str(value.get("line2") or "").strip(), "city": str(value.get("city") or "").strip(), "state": str(value.get("state") or "").strip(), "pinCode": str(value.get("pinCode") or "").strip(), "country": str(value.get("country") or "").strip(), "isDefault": bool(value.get("isDefault"))}
            if not address["line1"] or not address["city"]:
                return Response({"success": False, "message": "Address line and city are required."}, status=status.HTTP_400_BAD_REQUEST)
            addresses = list(doc.get("addresses") or [])
            addresses.append(address)
            coll.update_one({"_id": doc["_id"]}, {"$set": {"addresses": addresses, "updatedAt": datetime.now(dt_timezone.utc)}})
        refreshed = coll.find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        return Response({"success": True, "user": _serialize_user(refreshed)})

    def patch(self, request, pk, kind, item_id):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = request.data or {}
        coll = mongo.get_mongo_database()[USERS]
        if kind == "familyMembers":
            members = list(doc.get("familyMembers") or [])
            try:
                index = int(item_id)
            except ValueError:
                return Response({"success": False, "message": "Invalid family member id."}, status=status.HTTP_400_BAD_REQUEST)
            if index < 0 or index >= len(members):
                return Response({"success": False, "message": "Family member not found."}, status=status.HTTP_404_NOT_FOUND)
            members[index].update({k: str(v).strip() if isinstance(v, str) else v for k, v in payload.items()})
            coll.update_one({"_id": doc["_id"]}, {"$set": {"familyMembers": members, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif kind == "addresses":
            addresses = list(doc.get("addresses") or [])
            try:
                index = int(item_id)
            except ValueError:
                return Response({"success": False, "message": "Invalid address id."}, status=status.HTTP_400_BAD_REQUEST)
            if index < 0 or index >= len(addresses):
                return Response({"success": False, "message": "Address not found."}, status=status.HTTP_404_NOT_FOUND)
            addresses[index].update({k: str(v).strip() if isinstance(v, str) else v for k, v in payload.items()})
            coll.update_one({"_id": doc["_id"]}, {"$set": {"addresses": addresses, "updatedAt": datetime.now(dt_timezone.utc)}})
        refreshed = coll.find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        return Response({"success": True, "user": _serialize_user(refreshed)})

    def delete(self, request, pk, kind, item_id):
        doc = self._user(pk)
        if not doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        coll = mongo.get_mongo_database()[USERS]
        if kind == "familyMembers":
            members = list(doc.get("familyMembers") or [])
            try:
                index = int(item_id)
            except ValueError:
                return Response({"success": False, "message": "Invalid family member id."}, status=status.HTTP_400_BAD_REQUEST)
            if index < 0 or index >= len(members):
                return Response({"success": False, "message": "Family member not found."}, status=status.HTTP_404_NOT_FOUND)
            del members[index]
            coll.update_one({"_id": doc["_id"]}, {"$set": {"familyMembers": members, "updatedAt": datetime.now(dt_timezone.utc)}})
        elif kind == "addresses":
            addresses = list(doc.get("addresses") or [])
            try:
                index = int(item_id)
            except ValueError:
                return Response({"success": False, "message": "Invalid address id."}, status=status.HTTP_400_BAD_REQUEST)
            if index < 0 or index >= len(addresses):
                return Response({"success": False, "message": "Address not found."}, status=status.HTTP_404_NOT_FOUND)
            del addresses[index]
            coll.update_one({"_id": doc["_id"]}, {"$set": {"addresses": addresses, "updatedAt": datetime.now(dt_timezone.utc)}})
        refreshed = coll.find_one({"_id": doc["_id"]}, {"passwordHash": 0})
        return Response({"success": True, "user": _serialize_user(refreshed)})
