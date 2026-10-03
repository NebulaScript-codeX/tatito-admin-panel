from django.db import models
from django.utils import timezone


class DevelopmentRecord(models.Model):
    development_key = models.CharField(max_length=120, unique=True, null=True, blank=True)
    is_development_data = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True


class PlatformDoctor(DevelopmentRecord):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    id = models.CharField(max_length=120, primary_key=True)
    name = models.CharField(max_length=200)
    specialty = models.CharField(max_length=200)
    city = models.CharField(max_length=100, blank=True)
    detail = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    rating = models.CharField(max_length=30, blank=True)
    reviews = models.CharField(max_length=30, blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    initials = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=40, default="teal")
    next = models.CharField(max_length=120, blank=True)
    consultation_type = models.CharField(max_length=80, default="Online & In-Person")
    photo = models.URLField(max_length=500, blank=True)
    offer_text = models.CharField(max_length=300, blank=True)
    verified = models.BooleanField(default=True)
    verification_status = models.CharField(
        max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.VERIFIED
    )
    rejection_reason = models.TextField(blank=True)
    suspension_reason = models.TextField(blank=True)
    available = models.BooleanField(default=True)
    qualification = models.CharField(max_length=200, blank=True)
    experience = models.CharField(max_length=100, blank=True)
    owner = models.ForeignKey(
        "PlatformUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_doctor_profiles",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class PlatformUser(DevelopmentRecord):
    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        DOCTOR = "doctor", "Doctor"
        PARTNER = "partner", "Partner"

    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=200)
    email = models.EmailField(max_length=254, unique=True)
    mobile = models.CharField(max_length=40, blank=True)
    city = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=40, blank=True)
    date_of_birth = models.CharField(max_length=40, blank=True)
    blood_group = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices)
    doctor = models.ForeignKey(
        PlatformDoctor,
        db_column="doctor_id",
        to_field="id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_users",
    )
    status = models.CharField(max_length=20, default="active")
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    password_hash = models.CharField(max_length=255, blank=True)
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wallet_transactions = models.JSONField(default=list, blank=True)
    family_members = models.JSONField(default=list, blank=True)
    addresses = models.JSONField(default=list, blank=True)
    partner_role = models.CharField(max_length=100, blank=True)
    availability = models.CharField(max_length=20, default="available")
    verification_status = models.CharField(max_length=20, default="pending")
    rejection_reason = models.TextField(blank=True)
    suspension_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self):
        return self.name


class PlatformReview(DevelopmentRecord):
    id = models.CharField(max_length=64, primary_key=True)
    doctor = models.ForeignKey(
        PlatformDoctor,
        db_column="doctor_id",
        to_field="id",
        on_delete=models.CASCADE,
        related_name="platform_reviews",
    )
    patient_id = models.CharField(max_length=64, blank=True)
    patient_name = models.CharField(max_length=200)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()
    is_seed = models.BooleanField(default=False)
    moderation_status = models.CharField(max_length=16, default="pending", db_index=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at", "id"]


class DevelopmentSyncState(models.Model):
    model_label = models.CharField(max_length=120)
    development_key = models.CharField(max_length=120)
    synced_hash = models.CharField(max_length=64)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["model_label", "development_key"],
                name="dashboard_unique_dev_sync_record",
            )
        ]
