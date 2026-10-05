from django.conf import settings
from django.db import models


class InternshipTrack(models.Model):
    TRACK_TYPES = [
        ("fellowship", "Fellowship"),
        ("clinical_rotation", "Clinical Rotation"),
        ("lab_pathology", "Lab Pathology"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("closed", "Closed"),
    ]

    title = models.CharField(max_length=255)
    track_type = models.CharField(
        max_length=30,
        choices=TRACK_TYPES,
    )
    organisation = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    duration = models.CharField(max_length=100, blank=True)
    weekly_hours = models.PositiveIntegerField(default=0)
    monthly_stipend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    skills = models.JSONField(default=list, blank=True)
    open_positions = models.PositiveIntegerField(default=0)

    syllabus = models.TextField(blank=True)
    application_deadline = models.DateTimeField(
        null=True,
        blank=True,
    )
    eligibility = models.TextField(blank=True)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="open",
    )

    is_published = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_internship_tracks",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class InternshipApplication(models.Model):
    STATUS_CHOICES = [
        ("applied", "Applied"),
        ("case_review", "Case Review"),
        ("selected", "Selected"),
        ("rejected", "Rejected"),
    ]

    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()

    track = models.ForeignKey(
        InternshipTrack,
        on_delete=models.CASCADE,
        related_name="applications",
    )

    cv_url = models.URLField(blank=True)
    statement_of_intent = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="applied",
    )

    case_review_schedule = models.DateTimeField(
        null=True,
        blank=True,
    )

    offer_sent = models.BooleanField(default=False)

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.applicant_name} - {self.track.title}"


class InternshipPartner(models.Model):
    name = models.CharField(max_length=255)
    organisation_type = models.CharField(
        max_length=100,
        blank=True,
    )
    contact_name = models.CharField(
        max_length=255,
        blank=True,
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(
        max_length=50,
        blank=True,
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InternshipAlumni(models.Model):
    name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=255,
        blank=True,
    )
    testimonial = models.TextField()
    photo_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.name