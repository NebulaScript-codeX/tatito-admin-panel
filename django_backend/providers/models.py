from pathlib import Path
import uuid

from django.core.exceptions import ValidationError
from django.db import models


def provider_document_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"provider-documents/{instance.provider_id}/{uuid.uuid4().hex}{extension}"


class HealthcareProvider(models.Model):
    class ProviderType(models.TextChoices):
        HOSPITAL = "hospital", "Hospital"
        CLINIC = "clinic", "Clinic"
        DIAGNOSTIC_CENTRE = "diagnostic_centre", "Diagnostic Centre"
        PHARMACY = "pharmacy", "Pharmacy"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=200)
    provider_type = models.CharField(max_length=32, choices=ProviderType.choices)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    registration_number = models.CharField(max_length=120, blank=True)
    registration_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    type_details = models.JSONField(default=dict, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "name"]

    def clean(self):
        if self.status != self.Status.REJECTED and self.rejection_reason:
            raise ValidationError(
                {"rejection_reason": "Only rejected providers can have a rejection reason."}
            )

    def __str__(self):
        return self.name


class ProviderDocument(models.Model):
    class Kind(models.TextChoices):
        REGISTRATION_CERTIFICATE = "registration_certificate", "Registration Certificate"
        LICENCE = "licence", "Licence"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    provider = models.ForeignKey(
        HealthcareProvider,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=provider_document_upload_to)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    rejection_reason = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-uploaded_at", "id"]

    def __str__(self):
        return f"{self.provider.name}: {self.original_name}"
