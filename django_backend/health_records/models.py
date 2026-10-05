from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from pathlib import Path
import uuid

from care.models import Appointment, CarePatient, DevelopmentRecord


def prescription_file_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"health-records/prescriptions/{uuid.uuid4().hex}{extension}"


def lab_report_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"health-records/lab-reports/{uuid.uuid4().hex}{extension}"


class LabBooking(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        BOOKED = "booked", "Booked"
        ASSIGNED = "assigned", "Assigned"
        COLLECTED = "collected", "Collected"
        IN_LAB = "in_lab", "In lab"
        REPORT_READY = "report_ready", "Report ready"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey(
        CarePatient, on_delete=models.PROTECT, related_name="lab_bookings"
    )
    test_name = models.CharField(max_length=200)
    specimen_date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    plan_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    phlebotomist = models.CharField(max_length=150, blank=True)
    pathologist = models.CharField(max_length=150, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    clinical_summary = models.TextField(blank=True)
    report_pdf_url = models.URLField(max_length=1000, blank=True)
    report_file = models.FileField(
        upload_to=lab_report_upload_to, blank=True
    )
    lab_test = models.ForeignKey(
        "lab_tests.LabTest",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    lab_package = models.ForeignKey(
        "lab_tests.LabTestPackage",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    health_check_bundle = models.ForeignKey(
        "lab_tests.HealthCheckBundle",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    lab_tests = models.ManyToManyField(
        "lab_tests.LabTest", blank=True, related_name="multi_bookings"
    )
    lab_packages = models.ManyToManyField(
        "lab_tests.LabTestPackage", blank=True, related_name="multi_bookings"
    )
    centre = models.ForeignKey(
        "providers.HealthcareProvider",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="lab_bookings",
    )
    address = models.CharField(max_length=500, blank=True)
    time_slot = models.CharField(max_length=100, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    assigned_phlebotomist = models.ForeignKey(
        "lab_tests.Phlebotomist",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="lab_bookings",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-specimen_date", "-id"]

    def __str__(self):
        return f"{self.test_name} - {self.patient.name}"


class PrescriptionUpload(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    patient = models.ForeignKey(
        CarePatient, on_delete=models.PROTECT, related_name="prescription_uploads"
    )
    appointment = models.ForeignKey(
        Appointment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="prescription_uploads",
    )
    prescription_number = models.CharField(max_length=100, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    diagnosis = models.TextField(blank=True)
    medicines = models.JSONField(default=list, blank=True)
    instructions = models.TextField(blank=True)
    issued_on = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    pdf_url = models.URLField(max_length=1000, blank=True)
    file = models.FileField(upload_to=prescription_file_upload_to, blank=True)
    internal_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_pharmacy_prescriptions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_on", "-created_at"]

    def __str__(self):
        return self.prescription_number or f"Prescription for {self.patient.name}"


class Vaccination(DevelopmentRecord):
    patient = models.ForeignKey(
        CarePatient, on_delete=models.CASCADE, related_name="vaccinations"
    )
    vaccine = models.CharField(max_length=200)
    administered_on = models.DateField()
    dose = models.CharField(max_length=100)
    next_due = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-administered_on", "-id"]

    def __str__(self):
        return f"{self.vaccine} - {self.patient.name}"


class Allergy(DevelopmentRecord):
    class Severity(models.TextChoices):
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"

    patient = models.ForeignKey(
        CarePatient, on_delete=models.CASCADE, related_name="allergies"
    )
    allergy = models.CharField(max_length=200)
    severity = models.CharField(max_length=12, choices=Severity.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["allergy", "id"]
        verbose_name_plural = "allergies"

    def __str__(self):
        return f"{self.allergy} - {self.patient.name}"


class VitalReading(DevelopmentRecord):
    patient = models.ForeignKey(
        CarePatient, on_delete=models.CASCADE, related_name="vital_readings"
    )
    recorded_at = models.DateTimeField()
    systolic_bp = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(40), MaxValueValidator(300)]
    )
    diastolic_bp = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(20), MaxValueValidator(200)]
    )
    sugar = models.DecimalField(
        max_digits=6, decimal_places=1, validators=[MinValueValidator(0)]
    )
    weight = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )
    height = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )
    pulse = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(20), MaxValueValidator(250)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["recorded_at", "id"]

    def __str__(self):
        return f"Vitals for {self.patient.name} on {self.recorded_at:%Y-%m-%d}"
