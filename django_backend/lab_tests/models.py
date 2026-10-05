from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from dashboard.models import DevelopmentRecord
from providers.models import HealthcareProvider


class LabTestCategory(DevelopmentRecord):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OrganProfileCategory(DevelopmentRecord):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class LabTest(DevelopmentRecord):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=40, unique=True)
    centre = models.ForeignKey(
        HealthcareProvider,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="lab_tests",
        limit_choices_to={"provider_type": HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE},
    )
    categories = models.ManyToManyField(
        LabTestCategory, blank=True, related_name="tests"
    )
    organ_categories = models.ManyToManyField(
        OrganProfileCategory, blank=True, related_name="tests"
    )
    specimen = models.CharField(max_length=100, blank=True)
    fasting_required = models.BooleanField(default=False)
    turnaround_hours = models.PositiveSmallIntegerField(default=24)
    biomarker_count = models.PositiveSmallIntegerField(default=1)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    mrp = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class LabTestPackage(DevelopmentRecord):
    class Badge(models.TextChoices):
        POPULAR = "popular", "Popular"
        BEST_VALUE = "best_value", "Best Value"
        FEVER_SPECIAL = "fever_special", "Fever Special"

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    badge = models.CharField(max_length=20, choices=Badge.choices, blank=True)
    tests = models.ManyToManyField(LabTest, related_name="packages")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
    )
    turnaround_hours = models.PositiveSmallIntegerField(default=24)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    @property
    def biomarker_count(self):
        return sum(self.tests.values_list("biomarker_count", flat=True))

    def __str__(self):
        return self.name


class HealthCheckBundle(DevelopmentRecord):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    recommended_target = models.CharField(max_length=200, blank=True)
    tests = models.ManyToManyField(LabTest, related_name="health_check_bundles")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    @property
    def test_count(self):
        return self.tests.count()

    @property
    def biomarker_count(self):
        return sum(self.tests.values_list("biomarker_count", flat=True))

    @property
    def calculated_price(self):
        return sum(self.tests.values_list("price", flat=True), Decimal("0.00"))

    def __str__(self):
        return self.name


class RadiologyService(DevelopmentRecord):
    name = models.CharField(max_length=200)
    centre = models.ForeignKey(
        HealthcareProvider,
        on_delete=models.PROTECT,
        related_name="radiology_services",
        limit_choices_to={"provider_type": HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE},
    )
    modality = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    turnaround_hours = models.PositiveSmallIntegerField(default=24)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.name} - {self.centre.name}"


class ScanBooking(DevelopmentRecord):
    class Status(models.TextChoices):
        BOOKED = "booked", "Booked"
        SCHEDULED = "scheduled", "Scheduled"
        DONE = "done", "Done"
        REPORT_UPLOADED = "report_uploaded", "Report Uploaded"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey(
        "care.CarePatient", on_delete=models.PROTECT, related_name="scan_bookings"
    )
    centre = models.ForeignKey(
        HealthcareProvider,
        on_delete=models.PROTECT,
        related_name="scan_bookings",
        limit_choices_to={"provider_type": HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE},
    )
    radiology_service = models.ForeignKey(
        RadiologyService, on_delete=models.PROTECT, related_name="bookings"
    )
    scheduled_at = models.DateTimeField(db_index=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.BOOKED, db_index=True
    )
    report_file = models.FileField(
        upload_to="health-records/scan-reports/", blank=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at", "id"]

    def __str__(self):
        return f"{self.radiology_service.name} - {self.patient.name}"


class Phlebotomist(DevelopmentRecord):
    name = models.CharField(max_length=160)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_available = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name
