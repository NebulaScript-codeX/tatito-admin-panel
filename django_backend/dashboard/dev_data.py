import hashlib
import json
import uuid
from datetime import timezone as dt_timezone
from pathlib import Path

from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction

from audit.models import AuditLog
from care.models import (
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
from dashboard.models import (
    DevelopmentSyncState,
    PlatformDoctor,
    PlatformReview,
    PlatformUser,
)
from health_records.models import Allergy, LabBooking, PrescriptionUpload, Vaccination, VitalReading
from marketing.models import Coupon, FeaturedPromotion, Promotion, PromotionalContent
from providers.models import HealthcareProvider, ProviderDocument


MODEL_ORDER = (
    Specialty,
    Doctor,
    CarePatient,
    LabBooking,
    Vaccination,
    Allergy,
    VitalReading,
    WeeklySchedule,
    DoctorLeave,
    AppointmentSlot,
    Appointment,
    PrescriptionUpload,
    AppointmentTimeline,
    DoctorPayout,
    CarePayment,
    RefundRequest,
    InstantConsult,
    CallLog,
    Review,
    CareSetting,
    PlatformDoctor,
    PlatformUser,
    PlatformReview,
    HealthcareProvider,
    ProviderDocument,
    Coupon,
    Promotion,
    FeaturedPromotion,
    PromotionalContent,
    AuditLog,
)
MODEL_BY_LABEL = {model._meta.label_lower: model for model in MODEL_ORDER}
SECRET_FIELD_NAMES = {
    "password",
    "password_hash",
    "passwordhash",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret_key",
}
NATURAL_PRIMARY_KEY_FIELDS = {
    ("care.caresetting", "key"),
}


def _development_label(record, prefix):
    suffix = record.development_key.rsplit("-", 1)[-1]
    return f"{prefix} {suffix.replace('_', ' ').title()}"


def _related_development_doctor_name(record):
    doctor = getattr(record, "doctor", None)
    if (
        doctor is not None
        and doctor.is_development_data
        and doctor.development_key
        and doctor.development_key.startswith("dev-")
    ):
        return _development_label(doctor, "DEV Doctor")
    return "Development Doctor"


def _safe_fields(model, field_name, value, record):
    if field_name.lower() in SECRET_FIELD_NAMES:
        raise ValueError(f"Refusing to export credential field {field_name} on {model._meta.label}.")

    if model is CarePatient and field_name == "name":
        return "DEV Sample Patient"
    if model is CarePatient and field_name == "external_id":
        return ""
    if model is LabBooking:
        if field_name == "test_name":
            return "DEV Sample Completed Lab Test"
        if field_name in {"phlebotomist", "pathologist"}:
            return "DEV Sample Clinical Staff" if value else ""
        if field_name == "clinical_summary":
            return "Fictional development laboratory summary."
        if field_name == "report_pdf_url":
            return ""
    if model is PrescriptionUpload:
        if field_name == "prescription_number":
            return _development_label(record, "DEV Prescription")
        if field_name == "doctor_name":
            return _related_development_doctor_name(record)
        if field_name == "diagnosis":
            return "Fictional development diagnosis." if value else ""
        if field_name == "medicines":
            return (
                [{"name": "Development sample medicine", "dose": "As directed"}]
                if value
                else []
            )
        if field_name == "instructions":
            return "Fictional development prescription instructions." if value else ""
        if field_name == "pdf_url":
            return ""
    if model is Vaccination and field_name == "vaccine":
        return "DEV Sample Vaccine"
    if model is Allergy and field_name == "allergy":
        return "DEV Sample Allergy"
    if model in {Appointment, Review} and field_name == "patient_name":
        return "DEV Sample Patient"
    if model in {CarePayment, RefundRequest, Review} and field_name == "patient_id":
        return ""
    if model is Appointment and field_name in {"diagnosis", "prescription_notes"}:
        if not value:
            return ""
        return (
            "Fictional development diagnosis."
            if field_name == "diagnosis"
            else "Fictional development prescription."
        )
    if model is Appointment and field_name == "medicines":
        return (
            [{"name": "Development sample medicine", "dose": "As directed"}]
            if value
            else []
        )
    if model is AppointmentTimeline and field_name in {"actor_id", "actor"}:
        return "Development Admin" if field_name == "actor" else ""
    if model is AppointmentTimeline and field_name == "details":
        return {}
    if model is RefundRequest and field_name in {"reason", "reviewed_by"}:
        return "Development sample refund" if field_name == "reason" else "Development Admin"
    if model is InstantConsult and field_name == "patient_name":
        return "DEV Sample Patient"
    if model is InstantConsult and field_name == "patient_id":
        return ""
    if model is CallLog and field_name == "patient_name":
        return "DEV Sample Patient"
    if model is CallLog and field_name == "patient_id":
        return ""
    if model is Review and field_name == "moderated_by":
        return ""
    if model is CareSetting and field_name == "updated_by":
        return "Development Admin"
    if model is Doctor and field_name in {"photo", "bio"}:
        return "" if field_name != "bio" else "Fictional development doctor profile."
    if model is Doctor and field_name == "name":
        return _development_label(record, "DEV Doctor")
    if model is Doctor and field_name == "license_details":
        return _development_label(record, "DEV Licence")
    if field_name == "doctor_name" and model in {
        Appointment,
        DoctorPayout,
        InstantConsult,
        CallLog,
    }:
        return _related_development_doctor_name(record)
    if model is PlatformUser:
        if field_name == "email":
            key = hashlib.sha256(record.development_key.encode()).hexdigest()[:16]
            return f"dev-{key}@example.test"
        if field_name == "name":
            return f"DEV Sample {record.role.title()}"
        if field_name in {
            "mobile", "gender", "date_of_birth", "blood_group", "password_hash",
            "rejection_reason", "suspension_reason",
        }:
            return ""
        if field_name == "city":
            return "Development"
        if field_name in {"family_members", "addresses"}:
            return []
        if field_name == "wallet_transactions":
            return [
                {
                    "type": item.get("type", "credit"),
                    "amount": item.get("amount", 0),
                    "reason": "Development sample transaction",
                    "createdAt": item.get("createdAt", ""),
                }
                for item in (value or [])
                if isinstance(item, dict)
            ]
    if model is PlatformDoctor:
        if field_name == "name":
            return "DEV Sample Doctor"
        if field_name in {"rejection_reason", "suspension_reason", "photo"}:
            return ""
        if field_name == "city":
            return "Development"
        if field_name == "location":
            return "Development Clinic"
    if model is PlatformReview:
        if field_name == "patient_id":
            return ""
        if field_name == "patient_name":
            return "DEV Sample Patient"
        if field_name == "comment":
            return "Fictional development review."
    if model is HealthcareProvider:
        if field_name == "name":
            return "DEV Sample Healthcare Provider"
        if field_name in {"phone", "address", "pincode", "registration_date"}:
            return "" if field_name != "registration_date" else None
        if field_name == "registration_number":
            digest = hashlib.sha256(record.development_key.encode()).hexdigest()[:12]
            return f"DEV-{digest.upper()}"
        if field_name == "email":
            key = hashlib.sha256(record.development_key.encode()).hexdigest()[:16]
            return f"dev-provider-{key}@example.test"
        if field_name == "city":
            return "Development"
        if field_name == "state":
            return "Development"
        if field_name == "type_details":
            return {}
    if model is ProviderDocument:
        if field_name == "file":
            return ""
        if field_name == "original_name":
            return "Development sample document"
        if field_name == "rejection_reason":
            return ""
    if model is AuditLog:
        if field_name == "actor_username":
            return "Development Admin"
        if field_name in {"actor_role", "target_id", "ip_address"}:
            return None if field_name == "ip_address" else ""
        if field_name in {"description", "metadata"}:
            return "Development sample activity." if field_name == "description" else {}
    return value


def record_snapshot(record):
    model = type(record)
    if not getattr(record, "is_development_data", False):
        raise ValueError(f"{model._meta.label} {record.pk} is not tagged as development data.")
    key = record.development_key
    if not key or not key.startswith("dev-"):
        raise ValueError(f"{model._meta.label} {record.pk} has no safe development key.")

    fields = {}
    relations = {}
    for field in record._meta.concrete_fields:
        if (
            (field.primary_key and (model._meta.label_lower, field.name) not in NATURAL_PRIMARY_KEY_FIELDS)
            or field.name in {"development_key", "is_development_data"}
        ):
            continue
        if field.name.lower() in SECRET_FIELD_NAMES:
            continue
        if field.is_relation:
            related = getattr(record, field.name)
            if related is None:
                relations[field.name] = None
            elif (
                hasattr(related, "development_key")
                and related.is_development_data
                and related.development_key
                and related.development_key.startswith("dev-")
            ):
                relations[field.name] = related.development_key
            elif field.null:
                relations[field.name] = None
            else:
                raise ValueError(
                    f"{model._meta.label} {key} references untagged "
                    f"{field.remote_field.model._meta.label} data through {field.name}."
                )
            continue
        value = getattr(record, field.attname)
        value = _safe_fields(model, field.name, value, record)
        if isinstance(field, models.DateTimeField) and value is not None:
            value = value.astimezone(dt_timezone.utc).isoformat(
                timespec="microseconds"
            ).replace("+00:00", "Z")
        fields[field.name] = value
    return {
        "model": model._meta.label_lower,
        "development_key": key,
        "fields": fields,
        "relations": relations,
    }


def record_hash(record):
    payload = json.dumps(
        record,
        sort_keys=True,
        separators=(",", ":"),
        cls=DjangoJSONEncoder,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _load_snapshot(path, *, allow_missing=False):
    try:
        with open(path, encoding="utf-8") as source:
            rows = json.load(source)
    except FileNotFoundError:
        if allow_missing:
            return {}
        raise ValueError(f"Development snapshot does not exist: {path}.")
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Unable to read development snapshot {path}: {error}") from error
    if not isinstance(rows, list):
        raise ValueError("Development snapshot must contain a JSON list.")
    indexed = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Development snapshot contains a malformed record.")
        label = row.get("model")
        key = row.get("development_key")
        if label not in MODEL_BY_LABEL or not isinstance(key, str) or not key.startswith("dev-"):
            raise ValueError(f"Snapshot contains an unsupported development record: {label} {key}.")
        signature = (label, key)
        if signature in indexed:
            raise ValueError(f"Duplicate development record in snapshot: {label} {key}.")
        if not isinstance(row.get("fields"), dict) or not isinstance(row.get("relations"), dict):
            raise ValueError(f"Malformed fields or relations for {label} {key}.")
        indexed[signature] = row
    return indexed


def _local_records():
    records = {}
    for model in MODEL_ORDER:
        for instance in model.objects.filter(
            is_development_data=True,
            development_key__startswith="dev-",
        ):
            row = record_snapshot(instance)
            records[(row["model"], row["development_key"])] = row
    return records


def _conflict_lines(conflicts):
    return "\n".join(
        f"  Entity: {label} | ID: {key}\n"
        "  Local version: modified by current developer\n"
        "  Incoming version: modified by another developer"
        for label, key in sorted(conflicts)
    )


def export_snapshot(path):
    shared = _load_snapshot(path, allow_missing=True)
    local = _local_records()
    merged = dict(shared)
    conflicts = []
    new_baselines = {}

    for signature, local_row in local.items():
        shared_row = shared.get(signature)
        local_hash = record_hash(local_row)
        baseline = DevelopmentSyncState.objects.filter(
            model_label=signature[0],
            development_key=signature[1],
        ).values_list("synced_hash", flat=True).first()
        if shared_row is None:
            merged[signature] = local_row
            new_baselines[signature] = local_hash
            continue
        shared_hash = record_hash(shared_row)
        if local_hash == shared_hash:
            new_baselines[signature] = local_hash
        elif baseline is None:
            conflicts.append(signature)
        else:
            local_changed = local_hash != baseline
            shared_changed = shared_hash != baseline
            if local_changed and shared_changed:
                conflicts.append(signature)
            elif local_changed:
                merged[signature] = local_row
                new_baselines[signature] = local_hash
            else:
                new_baselines[signature] = shared_hash

    if conflicts:
        raise ValueError(
            "Development data conflict detected:\n" + _conflict_lines(conflicts)
            + "\nResolve these records before exporting."
        )

    ordered = [merged[key] for key in sorted(merged)]
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    try:
        with open(temporary_path, "w", encoding="utf-8", newline="\n") as output:
            json.dump(ordered, output, cls=DjangoJSONEncoder, indent=2, ensure_ascii=False)
            output.write("\n")
        temporary_path.replace(output_path)
    except OSError as error:
        raise ValueError(f"Unable to write development snapshot {path}: {error}") from error

    with transaction.atomic():
        for signature, digest in new_baselines.items():
            DevelopmentSyncState.objects.update_or_create(
                model_label=signature[0],
                development_key=signature[1],
                defaults={"synced_hash": digest},
            )
    return len(ordered)


def _resolve_model(label):
    model = MODEL_BY_LABEL.get(label)
    if model is None or not hasattr(model, "is_development_data"):
        raise ValueError(f"Snapshot model {label} is not an enabled development model.")
    return model


def _prepare_rows(rows):
    prepared = []
    for model in MODEL_ORDER:
        signature = (model._meta.label_lower, "")
        model_rows = [
            (key, row) for (label, key), row in rows.items()
            if label == model._meta.label_lower
        ]
        for key, row in model_rows:
            signature = (model._meta.label_lower, key)
            model = _resolve_model(signature[0])
            values = {}
            for name, value in row["fields"].items():
                try:
                    field = model._meta.get_field(name)
                except Exception as error:
                    raise ValueError(f"Unknown field {name} on {model._meta.label}.") from error
                if (
                    (field.primary_key and (model._meta.label_lower, name) not in NATURAL_PRIMARY_KEY_FIELDS)
                    or field.is_relation
                    or name in {"development_key", "is_development_data"}
                    or name.lower() in SECRET_FIELD_NAMES
                ):
                    raise ValueError(f"Unsafe snapshot field {name} on {model._meta.label}.")
                values[field.attname] = field.to_python(value)
            for name in row["relations"]:
                try:
                    field = model._meta.get_field(name)
                except Exception as error:
                    raise ValueError(f"Unknown relation {name} on {model._meta.label}.") from error
                if not field.is_relation or field.many_to_many or field.auto_created:
                    raise ValueError(f"Invalid relation {name} on {model._meta.label}.")
            prepared.append((model, row, values))
    return prepared


def _deterministic_primary_key(model, development_key):
    primary_key = model._meta.pk
    seed = f"{model._meta.label_lower}:{development_key}"
    if primary_key.get_internal_type() == "UUIDField":
        return uuid.uuid5(uuid.NAMESPACE_URL, "tatito-development:" + seed)
    if primary_key.get_internal_type() in {"CharField", "TextField"}:
        digest = hashlib.sha256(seed.encode()).hexdigest()[:32]
        value = f"dev-{digest}"
        return value[:primary_key.max_length] if primary_key.max_length else value
    return None


def import_snapshot(path):
    rows = _load_snapshot(path)
    prepared = _prepare_rows(rows)
    conflicts = []
    local_rows = {}
    actions = {}

    for model, row, values in prepared:
        signature = (model._meta.label_lower, row["development_key"])
        instance = model.objects.filter(development_key=row["development_key"]).first()
        incoming_hash = record_hash(row)
        if instance is None:
            actions[signature] = "create"
            continue
        local_row = record_snapshot(instance)
        local_rows[signature] = local_row
        local_hash = record_hash(local_row)
        baseline = DevelopmentSyncState.objects.filter(
            model_label=signature[0],
            development_key=signature[1],
        ).values_list("synced_hash", flat=True).first()
        if local_hash == incoming_hash:
            actions[signature] = "same"
        elif baseline is None:
            conflicts.append(signature)
        elif local_hash == baseline:
            actions[signature] = "update"
        elif incoming_hash == baseline:
            actions[signature] = "keep_local"
        else:
            conflicts.append(signature)

    if conflicts:
        raise ValueError(
            "Development data conflict detected:\n" + _conflict_lines(conflicts)
            + "\nResolve these records before importing."
        )

    resolved = 0
    with transaction.atomic():
        instances = {}
        for model, row, values in prepared:
            signature = (model._meta.label_lower, row["development_key"])
            action = actions[signature]
            instance = model.objects.filter(development_key=row["development_key"]).first()
            if action == "keep_local":
                instances[signature] = instance
                continue
            if instance is None:
                instance = model()
                instance.development_key = row["development_key"]
                instance.is_development_data = True
                pk_value = _deterministic_primary_key(model, row["development_key"])
                if pk_value is not None:
                    setattr(instance, model._meta.pk.attname, pk_value)
            for attname, value in values.items():
                setattr(instance, attname, value)
            for name, related_key in row["relations"].items():
                field = model._meta.get_field(name)
                related_model = field.remote_field.model
                related = (
                    related_model.objects.filter(development_key=related_key).first()
                    if related_key
                    else None
                )
                if related is not None:
                    setattr(instance, field.name, related)
                elif field.null:
                    setattr(instance, field.name, None)
                else:
                    raise ValueError(
                        f"Missing {related_model._meta.label} development record {related_key} "
                        f"referenced by {model._meta.label} {row['development_key']}."
                    )
            instance.development_key = row["development_key"]
            instance.is_development_data = True
            instance.save()
            instances[signature] = instance

        for model, row, values in prepared:
            signature = (model._meta.label_lower, row["development_key"])
            instance = instances[signature]
            if actions[signature] == "keep_local":
                continue
            for name, related_key in row["relations"].items():
                field = model._meta.get_field(name)
                if related_key is None:
                    setattr(instance, field.name, None)
                    continue
                related_model = field.remote_field.model
                related = related_model.objects.filter(development_key=related_key).first()
                if related is None:
                    if field.null:
                        setattr(instance, field.name, None)
                        continue
                    raise ValueError(
                        f"Missing {related_model._meta.label} development record {related_key} "
                        f"referenced by {model._meta.label} {row['development_key']}."
                    )
                setattr(instance, field.name, related)
            instance.save()
            auto_timestamp_values = {
                field.attname: values[field.attname]
                for field in model._meta.concrete_fields
                if field.name in values
                and isinstance(field, models.DateTimeField)
                and (field.auto_now or field.auto_now_add)
            }
            if auto_timestamp_values:
                model.objects.filter(pk=instance.pk).update(**auto_timestamp_values)
            resolved += 1
            DevelopmentSyncState.objects.update_or_create(
                model_label=signature[0],
                development_key=signature[1],
                defaults={"synced_hash": record_hash(row)},
            )
    return resolved
