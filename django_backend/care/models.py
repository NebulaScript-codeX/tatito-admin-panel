import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class DevelopmentRecord(models.Model):
    development_key = models.CharField(
        max_length=120, unique=True, null=True, blank=True, db_index=True
    )
    is_development_data = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True


class Specialty(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    icon = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Doctor(DevelopmentRecord):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    class ConsultationType(models.TextChoices):
        ONLINE = "Online", "Online"
        IN_PERSON = "In-person", "In-person"
        BOTH = "Both", "Both"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    specialty = models.ForeignKey(
        Specialty, on_delete=models.PROTECT, related_name="doctors"
    )
    photo = models.URLField(max_length=500, blank=True)
    degree = models.CharField(max_length=200)
    qualifications = models.TextField(blank=True)
    license_details = models.CharField(max_length=300, blank=True)
    experience = models.CharField(max_length=100, blank=True)
    hospital = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    consultation_type = models.CharField(
        max_length=16, choices=ConsultationType.choices, default=ConsultationType.BOTH
    )
    available = models.BooleanField(default=True)
    bio = models.TextField(blank=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    @property
    def rating_summary(self):
        aggregate = self.reviews.filter(
            moderation_status=Review.ModerationStatus.APPROVED
        ).aggregate(average=models.Avg("rating"), count=models.Count("id"))
        return {
            "rating": round(float(aggregate["average"] or 0), 1),
            "reviews": aggregate["count"],
        }

    def __str__(self):
        return self.name


class WeeklySchedule(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name="schedules"
    )
    weekday = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(6)]
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField(
        choices=[(10, "10 minutes"), (15, "15 minutes"), (20, "20 minutes"), (30, "30 minutes")],
        default=30,
    )
    is_working = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["doctor__name", "weekday"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "weekday"], name="care_unique_doctor_weekday"
            )
        ]


class DoctorLeave(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="leaves")
    date = models.DateField()
    reason = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(fields=["doctor", "date"], name="care_unique_doctor_leave")
        ]


class AppointmentSlot(DevelopmentRecord):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        BLOCKED = "blocked", "Blocked"
        BOOKED = "booked", "Booked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField(db_index=True)
    weekday = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField(
        choices=[(10, "10 minutes"), (15, "15 minutes"), (20, "20 minutes"), (30, "30 minutes")]
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.AVAILABLE, db_index=True
    )
    block_reason = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "date", "start_time"], name="care_unique_doctor_slot"
            )
        ]


class DoctorSlotExclusion(models.Model):
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name="slot_exclusions"
    )
    date = models.DateField()
    start_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "date", "start_time"],
                name="care_unique_doctor_slot_exclusion",
            )
        ]


class CarePatient(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    external_id = models.CharField(max_length=100, blank=True, db_index=True)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class Appointment(DevelopmentRecord):
    class Status(models.TextChoices):
        BOOKED = "booked", "Booked"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no-show", "No-show"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="appointments")
    patient = models.ForeignKey(
        CarePatient, on_delete=models.PROTECT, related_name="appointments"
    )
    slot = models.ForeignKey(
        AppointmentSlot, on_delete=models.PROTECT, related_name="appointments"
    )
    doctor_name = models.CharField(max_length=200)
    patient_name = models.CharField(max_length=200)
    specialty_name = models.CharField(max_length=120)
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    fee = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.BOOKED, db_index=True
    )
    payment_status = models.CharField(
        max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    diagnosis = models.TextField(blank=True)
    prescription_notes = models.TextField(blank=True)
    medicines = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date", "-start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["slot"],
                condition=models.Q(status__in=["booked", "confirmed"]),
                name="care_unique_active_appointment_slot",
            )
        ]


class AppointmentTimeline(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name="history"
    )
    action = models.CharField(max_length=40)
    actor_id = models.CharField(max_length=100, blank=True)
    actor = models.CharField(max_length=150, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]


class CarePayment(DevelopmentRecord):
    class Kind(models.TextChoices):
        CONSULTATION = "consultation", "Consultation"
        DOCTOR_PAYOUT = "doctor_payout", "Doctor payout"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card"
        UPI = "upi", "UPI"
        WALLET = "wallet", "Wallet"
        CASH = "cash", "Cash"
        OTHER = "other", "Not recorded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        Appointment, null=True, blank=True, on_delete=models.PROTECT, related_name="payment"
    )
    payout = models.OneToOneField(
        "DoctorPayout", null=True, blank=True, on_delete=models.PROTECT, related_name="payment"
    )
    patient_id = models.CharField(max_length=100, blank=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    plan_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(
        max_length=16, choices=PaymentMethod.choices, default=PaymentMethod.OTHER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class RefundRequest(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        Appointment, on_delete=models.PROTECT, related_name="refund_requests"
    )
    payment = models.ForeignKey(
        CarePayment, on_delete=models.PROTECT, related_name="refund_requests"
    )
    patient_id = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    reason = models.TextField(blank=True)
    destination = models.CharField(max_length=20, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-created_at"]


class InstantConsult(DevelopmentRecord):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.CharField(max_length=100, blank=True)
    patient_name = models.CharField(max_length=200)
    doctor = models.ForeignKey(
        Doctor, null=True, blank=True, on_delete=models.PROTECT, related_name="instant_consults"
    )
    doctor_name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.WAITING, db_index=True)
    queue_position = models.PositiveIntegerField(default=1)
    consultation_type = models.CharField(max_length=8, choices=[("Video", "Video"), ("Audio", "Audio")])
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at"]


class CallLog(DevelopmentRecord):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consult = models.OneToOneField(
        InstantConsult, on_delete=models.PROTECT, related_name="call_log"
    )
    doctor = models.ForeignKey(Doctor, null=True, on_delete=models.PROTECT, related_name="call_logs")
    doctor_name = models.CharField(max_length=200, blank=True)
    patient_id = models.CharField(max_length=100, blank=True)
    patient_name = models.CharField(max_length=200, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_seconds = models.PositiveIntegerField(default=0)
    consultation_type = models.CharField(max_length=8, choices=[("Video", "Video"), ("Audio", "Audio")])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Review(DevelopmentRecord):
    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        HIDDEN = "hidden", "Hidden"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="reviews")
    patient_id = models.CharField(max_length=100, blank=True)
    patient_name = models.CharField(max_length=200, blank=True)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    moderation_status = models.CharField(
        max_length=12, choices=ModerationStatus.choices, default=ModerationStatus.PENDING, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-created_at"]


class DoctorPayout(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="payouts")
    doctor_name = models.CharField(max_length=200)
    period = models.CharField(max_length=7)
    consultation_count = models.PositiveIntegerField(default=0)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-period", "doctor_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "period"], name="care_unique_doctor_payout_period"
            )
        ]


class CareSetting(DevelopmentRecord):
    key = models.CharField(max_length=80, primary_key=True)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    updated_by = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
