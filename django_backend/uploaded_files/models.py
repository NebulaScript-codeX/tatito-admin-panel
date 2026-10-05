from django.db import models


class UserDocument(models.Model):
    class DocumentType(models.TextChoices):
        MEDICAL_LICENSE = "medical_license", "Medical Licence"
        ID_PROOF = "id_proof", "ID Proof"
        DEGREE_CERTIFICATE = "degree_certificate", "Degree Certificate"
        REGISTRATION_CERTIFICATE = "registration_certificate", "Registration Certificate"
        PHARMACY_LICENSE = "pharmacy_license", "Pharmacy Licence"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    owner = models.ForeignKey(
        "dashboard.PlatformUser",
        on_delete=models.CASCADE,
        related_name="uploaded_documents",
    )
    document_type = models.CharField(
        max_length=40,
        choices=DocumentType.choices,
    )
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to="user-documents/")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    rejection_reason = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.original_name} - {self.owner.name}"


class MediaFile(models.Model):
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to="media-manager/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.original_name