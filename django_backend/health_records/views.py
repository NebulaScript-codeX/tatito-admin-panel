from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission, get_active_profile, has_module_permission, is_super_admin
from audit.models import AuditLog
from audit.services import log_action
from care.models import Appointment, CarePatient
from dashboard.models import PlatformUser

from .models import Allergy, LabBooking, PrescriptionUpload, Vaccination, VitalReading


class HealthRecordPermission(ModulePermission):
    module = "health_records"

    def has_permission(self, request, view):
        profile = get_active_profile(request.user)
        if profile is None:
            return False
        if is_super_admin(profile):
            return True
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            action = "view"
        elif request.method == "POST":
            action = "view" if getattr(view, "is_access_log", False) else "create"
        elif request.method in {"PATCH", "PUT"}:
            action = "edit"
        elif request.method == "DELETE":
            action = "delete"
        else:
            return False
        return has_module_permission(request.user, self.module, action)


def error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "message": message}, status=code)


def resource_label(resource):
    return {
        "vaccinations": "vaccination",
        "allergies": "allergy",
        "vitals": "vital",
    }.get(resource, resource)


def get_patient(patient_id):
    try:
        return CarePatient.objects.filter(pk=patient_id).first()
    except (ValidationError, ValueError, TypeError):
        return None


def patient_payload(patient):
    account = None
    if patient.external_id:
        account = PlatformUser.objects.filter(
            pk=patient.external_id,
            role=PlatformUser.Role.PATIENT,
        ).first()
    return {
        "id": str(patient.pk),
        "external_id": patient.external_id,
        "name": patient.name,
        "date_of_birth": account.date_of_birth if account else "",
        "blood_group": account.blood_group if account else "",
        "mobile": account.mobile if account else "",
        "email": account.email if account else "",
        "city": account.city if account else "",
        "status": account.status if account else "",
    }


def audit_access(request, patient, record_type):
    staff_name = request.user.get_full_name().strip() or request.user.username
    log_action(
        request,
        action="health_record_access",
        module="health_records",
        target_type="patient",
        target_id=patient.pk,
        description=f"Viewed {record_type.replace('_', ' ')} for {patient.name}",
        metadata={
            "patient_id": str(patient.pk),
            "patient_name": patient.name,
            "record_type": record_type,
            "staff_name": staff_name,
        },
    )


def serialize_lab_booking(item):
    return {
        "id": item.pk,
        "test_name": item.test_name,
        "specimen_date": item.specimen_date.isoformat(),
        "phlebotomist": item.phlebotomist,
        "pathologist": item.pathologist,
        "status": item.status,
        "clinical_summary": item.clinical_summary,
        "report_pdf_url": item.report_pdf_url,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
    }


def serialize_appointment_prescription(item):
    return {
        "id": str(item.pk),
        "source": "completed_appointment",
        "prescription_number": "",
        "doctor_name": item.doctor_name,
        "diagnosis": item.diagnosis,
        "medicines": item.medicines,
        "instructions": item.prescription_notes,
        "issued_on": item.completed_at.date().isoformat() if item.completed_at else item.date.isoformat(),
        "pdf_url": "",
        "appointment_date": item.date.isoformat(),
    }


def serialize_upload(item):
    return {
        "id": item.pk,
        "source": "approved_upload",
        "prescription_number": item.prescription_number,
        "doctor_name": item.doctor_name or (
            item.appointment.doctor_name if item.appointment else ""
        ),
        "diagnosis": item.diagnosis or (
            item.appointment.diagnosis if item.appointment else ""
        ),
        "medicines": item.medicines or (
            item.appointment.medicines if item.appointment else []
        ),
        "instructions": item.instructions or (
            item.appointment.prescription_notes if item.appointment else ""
        ),
        "issued_on": item.issued_on.isoformat() if item.issued_on else "",
        "pdf_url": item.pdf_url,
        "appointment_date": item.appointment.date.isoformat() if item.appointment else "",
    }


def serialize_vaccination(item):
    return {
        "id": item.pk,
        "vaccine": item.vaccine,
        "administered_on": item.administered_on.isoformat(),
        "dose": item.dose,
        "next_due": item.next_due.isoformat() if item.next_due else "",
    }


def serialize_allergy(item):
    return {
        "id": item.pk,
        "allergy": item.allergy,
        "severity": item.severity,
    }


def serialize_vital(item):
    return {
        "id": item.pk,
        "recorded_at": item.recorded_at.isoformat(),
        "systolic_bp": item.systolic_bp,
        "diastolic_bp": item.diastolic_bp,
        "sugar": float(item.sugar),
        "weight": float(item.weight),
        "height": float(item.height),
        "pulse": item.pulse,
    }


class HealthRecordPatientListView(APIView):
    permission_classes = [HealthRecordPermission]

    def get(self, request):
        patients = CarePatient.objects.all()
        search = (request.query_params.get("search") or "").strip()[:100]
        if search:
            patients = patients.filter(
                Q(name__icontains=search) | Q(external_id__icontains=search)
            )
        patients = patients[:100]
        return Response({
            "success": True,
            "results": [patient_payload(patient) for patient in patients],
        })


class HealthRecordPatientDetailView(APIView):
    permission_classes = [HealthRecordPermission]

    def get(self, request, patient_id):
        patient = get_patient(patient_id)
        if not patient:
            return error("Patient not found.", status.HTTP_404_NOT_FOUND)
        audit_access(request, patient, "patient_chart")
        return Response({"success": True, "patient": patient_payload(patient)})


class HealthRecordCountsView(APIView):
    permission_classes = [HealthRecordPermission]

    def get(self, request):
        patient_id = request.query_params.get("patient_id")
        patient = None
        if patient_id:
            patient = get_patient(patient_id)
            if not patient:
                return error("Choose a valid patient.")

        lab_reports = LabBooking.objects.filter(status=LabBooking.Status.COMPLETED)
        completed_appointments = Appointment.objects.filter(
            status=Appointment.Status.COMPLETED,
        )
        approved_prescriptions = PrescriptionUpload.objects.filter(
            status=PrescriptionUpload.Status.APPROVED,
        )
        vaccinations = Vaccination.objects.all()
        allergies = Allergy.objects.all()
        vitals = VitalReading.objects.all()
        access_logs = AuditLog.objects.filter(
            module="health_records",
            action="health_record_access",
            target_type="patient",
        )

        if patient is not None:
            lab_reports = lab_reports.filter(patient=patient)
            completed_appointments = completed_appointments.filter(patient=patient)
            approved_prescriptions = approved_prescriptions.filter(patient=patient)
            vaccinations = vaccinations.filter(patient=patient)
            allergies = allergies.filter(patient=patient)
            vitals = vitals.filter(patient=patient)
            access_logs = access_logs.filter(target_id=str(patient.pk))

        return Response({
            "success": True,
            "counts": {
                "lab-reports": lab_reports.count(),
                "prescriptions": completed_appointments.count() + approved_prescriptions.count(),
                "vaccinations": vaccinations.count(),
                "allergies-vitals": allergies.count() + vitals.count(),
                "access-log": access_logs.count(),
            },
        })


class HealthRecordCollectionView(APIView):
    permission_classes = [HealthRecordPermission]
    writable_resources = {
        "vaccinations": (Vaccination, serialize_vaccination),
        "allergies": (Allergy, serialize_allergy),
        "vitals": (VitalReading, serialize_vital),
    }

    def get(self, request, resource):
        patient = get_patient(request.query_params.get("patient_id"))
        if not patient:
            return error("Choose a valid patient.", status.HTTP_400_BAD_REQUEST)
        if resource == "lab-reports":
            audit_access(request, patient, "lab_reports")
            rows = LabBooking.objects.filter(
                patient=patient, status=LabBooking.Status.COMPLETED
            )
            return Response({
                "success": True,
                "results": [serialize_lab_booking(item) for item in rows],
            })
        if resource == "prescriptions":
            audit_access(request, patient, "prescriptions")
            appointments = Appointment.objects.filter(
                patient=patient,
                status=Appointment.Status.COMPLETED,
            )
            uploads = PrescriptionUpload.objects.filter(
                patient=patient,
                status=PrescriptionUpload.Status.APPROVED,
            ).select_related("appointment")
            rows = [
                serialize_appointment_prescription(item)
                for item in appointments
            ] + [serialize_upload(item) for item in uploads]
            rows.sort(key=lambda item: item["issued_on"] or "", reverse=True)
            return Response({"success": True, "results": rows})
        if resource in self.writable_resources:
            audit_access(request, patient, resource)
            model, serializer = self.writable_resources[resource]
            rows = model.objects.filter(patient=patient)
            if resource == "vitals":
                rows = rows.order_by("-recorded_at", "-id")
            return Response({
                "success": True,
                "results": [serializer(item) for item in rows],
            })
        return error("Unknown health record resource.", status.HTTP_404_NOT_FOUND)

    def post(self, request, resource):
        if resource not in self.writable_resources:
            return error("This record type is read-only.", status.HTTP_405_METHOD_NOT_ALLOWED)
        patient = get_patient(request.data.get("patient_id"))
        if not patient:
            return error("Choose a valid patient.")
        values, message = self._validate(resource, request.data)
        if message:
            return error(message)
        model, serializer = self.writable_resources[resource]
        with transaction.atomic():
            item = model.objects.create(patient=patient, **values)
            log_action(
                request,
                action="create",
                module="health_records",
                target_type=resource_label(resource),
                target_id=item.pk,
                description=f"Added {resource_label(resource)} for {patient.name}",
            )
        return Response(
            {"success": True, "record": serializer(item)},
            status=status.HTTP_201_CREATED,
        )

    def _validate(self, resource, data):
        if resource == "vaccinations":
            vaccine = str(data.get("vaccine") or "").strip()
            dose = str(data.get("dose") or "").strip()
            administered_on = parse_date(str(data.get("administered_on") or ""))
            next_due_value = str(data.get("next_due") or "").strip()
            next_due = parse_date(next_due_value) if next_due_value else None
            if not vaccine or not dose or not administered_on:
                return {}, "Vaccine, date, and dose are required."
            if next_due_value and not next_due:
                return {}, "Enter a valid next due date."
            return {
                "vaccine": vaccine[:200],
                "administered_on": administered_on,
                "dose": dose[:100],
                "next_due": next_due,
            }, ""
        if resource == "allergies":
            allergy = str(data.get("allergy") or "").strip()
            severity = str(data.get("severity") or "").strip().lower()
            if not allergy:
                return {}, "Allergy is required."
            if severity not in Allergy.Severity.values:
                return {}, "Choose a valid allergy severity."
            return {"allergy": allergy[:200], "severity": severity}, ""
        if resource == "vitals":
            try:
                systolic = int(data.get("systolic_bp"))
                diastolic = int(data.get("diastolic_bp"))
                sugar = Decimal(str(data.get("sugar")))
                weight = Decimal(str(data.get("weight")))
                height = Decimal(str(data.get("height")))
                pulse = int(data.get("pulse"))
            except (TypeError, ValueError, InvalidOperation):
                return {}, "Enter valid values for every vital."
            if not all(value.is_finite() for value in (sugar, weight, height)):
                return {}, "Enter finite numeric values for sugar, weight, and height."
            recorded_text = str(data.get("recorded_at") or "").strip()
            recorded_at = parse_datetime(recorded_text) if recorded_text else timezone.now()
            if recorded_at is None:
                return {}, "Enter a valid recorded date and time."
            if timezone.is_naive(recorded_at):
                recorded_at = timezone.make_aware(recorded_at, timezone.get_current_timezone())
            if not 40 <= systolic <= 300 or not 20 <= diastolic <= 200:
                return {}, "Blood pressure values are outside the accepted range."
            if not 20 <= pulse <= 250 or min(sugar, weight, height) <= 0:
                return {}, "Enter positive values within the accepted range."
            return {
                "recorded_at": recorded_at,
                "systolic_bp": systolic,
                "diastolic_bp": diastolic,
                "sugar": sugar,
                "weight": weight,
                "height": height,
                "pulse": pulse,
            }, ""
        return {}, "Unknown health record resource."


class HealthRecordItemView(APIView):
    permission_classes = [HealthRecordPermission]
    writable_resources = {
        "vaccinations": (Vaccination, serialize_vaccination),
        "allergies": (Allergy, serialize_allergy),
        "vitals": (VitalReading, serialize_vital),
    }

    def patch(self, request, resource, pk):
        return self._save(request, resource, pk)

    def put(self, request, resource, pk):
        return self._save(request, resource, pk)

    def _save(self, request, resource, pk):
        if resource not in self.writable_resources:
            return error("This record type is read-only.", status.HTTP_405_METHOD_NOT_ALLOWED)
        model, serializer = self.writable_resources[resource]
        item = model.objects.filter(pk=pk).select_related("patient").first()
        if not item:
            return error("Health record not found.", status.HTTP_404_NOT_FOUND)
        data = {**serializer(item), **request.data, "patient_id": str(item.patient_id)}
        values, message = HealthRecordCollectionView()._validate(resource, data)
        if message:
            return error(message)
        with transaction.atomic():
            for field, value in values.items():
                setattr(item, field, value)
            item.save()
            log_action(
                request,
                action="update",
                module="health_records",
                target_type=resource_label(resource),
                target_id=item.pk,
                description=f"Updated {resource_label(resource)} for {item.patient.name}",
            )
        return Response({"success": True, "record": serializer(item)})

    def delete(self, request, resource, pk):
        if resource not in {"vaccinations", "allergies"}:
            return error("This record type cannot be deleted.", status.HTTP_405_METHOD_NOT_ALLOWED)
        model, _ = self.writable_resources[resource]
        item = model.objects.filter(pk=pk).select_related("patient").first()
        if not item:
            return error("Health record not found.", status.HTTP_404_NOT_FOUND)
        patient_name = item.patient.name
        with transaction.atomic():
            item.delete()
            log_action(
                request,
                action="delete",
                module="health_records",
                target_type=resource_label(resource),
                target_id=pk,
                description=f"Deleted {resource_label(resource)} for {patient_name}",
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class HealthRecordAccessLogView(APIView):
    permission_classes = [HealthRecordPermission]
    is_access_log = True

    def get(self, request, patient_id):
        patient = get_patient(patient_id)
        if not patient:
            return error("Patient not found.", status.HTTP_404_NOT_FOUND)
        audit_access(request, patient, "access_log")
        rows = AuditLog.objects.filter(
            module="health_records",
            action="health_record_access",
            target_type="patient",
            target_id=str(patient.pk),
        ).order_by("-created_at", "-id")[:100]
        return Response({
            "success": True,
            "results": [
                {
                    "id": item.pk,
                    "staff_name": item.metadata.get("staff_name") or item.actor_username or "system",
                    "role": item.actor_role,
                    "patient": item.metadata.get("patient_name", patient.name),
                    "record_type": item.metadata.get("record_type", "patient_chart"),
                    "created_at": item.created_at.isoformat(),
                }
                for item in rows
            ],
        })
