from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from dashboard.models import DevelopmentRecord, PlatformUser
from care.models import CarePatient


class HealthPlan(DevelopmentRecord):
    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=160)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    annual_monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    badge = models.CharField(max_length=80, blank=True)
    tagline = models.TextField(blank=True)
    color = models.CharField(max_length=24, blank=True)
    features = models.JSONField(default=list, blank=True)
    exclusions = models.JSONField(default=list, blank=True)
    maximum_family_members = models.PositiveSmallIntegerField(default=1)
    is_popular = models.BooleanField(default=False, db_index=True)
    free_consultations_per_month = models.PositiveSmallIntegerField(null=True, blank=True)
    pharmacy_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    lab_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    free_home_sample_count = models.PositiveSmallIntegerField(default=0)
    annual_checkup_count = models.PositiveSmallIntegerField(default=0)
    ambulance_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    care_manager = models.BooleanField(default=False)
    custom_benefits = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["monthly_price", "id"]


class HealthPlanCalculatorConfig(DevelopmentRecord):
    doctor_visits_min = models.PositiveSmallIntegerField(default=1)
    doctor_visits_max = models.PositiveSmallIntegerField(default=10)
    doctor_visits_default = models.PositiveSmallIntegerField(default=2)
    pharmacy_spend_min = models.PositiveSmallIntegerField(default=500)
    pharmacy_spend_max = models.PositiveSmallIntegerField(default=10000)
    pharmacy_spend_step = models.PositiveSmallIntegerField(default=250)
    pharmacy_spend_default = models.PositiveSmallIntegerField(default=3000)
    lab_spend_min = models.PositiveSmallIntegerField(default=500)
    lab_spend_max = models.PositiveSmallIntegerField(default=20000)
    lab_spend_step = models.PositiveSmallIntegerField(default=500)
    lab_spend_default = models.PositiveSmallIntegerField(default=4000)
    consultation_value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("500.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Health plan calculator configuration"


class PlanOrder(DevelopmentRecord):
    class BillingPeriod(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        ANNUAL = "annual", "Annual"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUND_PENDING = "refund_pending", "Refund pending"
        REFUNDED = "refunded", "Refunded"

    plan = models.ForeignKey(HealthPlan, on_delete=models.PROTECT, related_name="orders")
    patient = models.ForeignKey(
        CarePatient, null=True, blank=True, on_delete=models.PROTECT, related_name="plan_orders"
    )
    platform_user = models.ForeignKey(
        PlatformUser, null=True, blank=True, on_delete=models.PROTECT, related_name="plan_orders"
    )
    billing_period = models.CharField(max_length=12, choices=BillingPeriod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    payment_method = models.CharField(max_length=24, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    is_deactivated = models.BooleanField(default=False, db_index=True)
    is_blocked = models.BooleanField(default=False, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    replaces = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="replaced_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def order_number(self):
        return f"PL-{self.pk:06d}" if self.pk else ""


class PlanSubscriptionHistory(DevelopmentRecord):
    subscription = models.ForeignKey(
        PlanOrder, on_delete=models.PROTECT, related_name="history_entries"
    )
    event_type = models.CharField(max_length=32, db_index=True)
    snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class PlanFamilyMember(DevelopmentRecord):
    subscription = models.ForeignKey(
        PlanOrder, on_delete=models.CASCADE, related_name="family_members"
    )
    name = models.CharField(max_length=160)
    relationship = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    platform_user = models.ForeignKey(
        PlatformUser, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="health_plan_family_members",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class HealthPlanBenefitUsage(DevelopmentRecord):
    subscription = models.ForeignKey(
        PlanOrder, on_delete=models.PROTECT, related_name="benefit_usage"
    )
    benefit_code = models.CharField(max_length=32, db_index=True)
    quantity = models.PositiveSmallIntegerField(default=1)
    period_start = models.DateField(db_index=True)
    source_type = models.CharField(max_length=32)
    source_id = models.CharField(max_length=100)
    detail = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "benefit_code", "source_type", "source_id"],
                name="commerce_unique_plan_benefit_event",
            )
        ]


class CommerceTransaction(DevelopmentRecord):
    class Kind(models.TextChoices):
        PAYMENT = "payment", "Payment"
        REFUND = "refund", "Refund"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"

    class Method(models.TextChoices):
        CARD = "card", "Card"
        UPI = "upi", "UPI"
        WALLET = "wallet", "Wallet"
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        OTHER = "other", "Not recorded"

    class OrderType(models.TextChoices):
        PHARMACY = "pharmacy", "Pharmacy"
        APPOINTMENT = "appointment", "Appointment"
        LAB = "lab", "Lab"
        SCAN = "scan", "Scan"
        PLAN = "plan", "Plan"
        MANUAL = "manual", "Manual"

    reference = models.CharField(max_length=40, unique=True)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.PAYMENT)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    method = models.CharField(max_length=24, choices=Method.choices, default=Method.OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    order_type = models.CharField(max_length=16, choices=OrderType.choices, default=OrderType.MANUAL, db_index=True)
    order_id = models.CharField(max_length=100, blank=True, db_index=True)
    patient = models.ForeignKey(
        CarePatient, null=True, blank=True, on_delete=models.SET_NULL, related_name="commerce_transactions"
    )
    platform_user = models.ForeignKey(
        PlatformUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    pharmacy_order = models.ForeignKey(
        "pharmacy.PharmacyOrder",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    appointment = models.ForeignKey(
        "care.Appointment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    lab_booking = models.ForeignKey(
        "health_records.LabBooking",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    scan_booking = models.ForeignKey(
        "lab_tests.ScanBooking",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    plan_order = models.ForeignKey(
        "commerce.PlanOrder",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commerce_transactions",
    )
    patient_name = models.CharField(max_length=200, blank=True)
    original_transaction = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="refund_transactions"
    )
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class PlanSubscriptionChange(DevelopmentRecord):
    class ChangeType(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        RENEWAL = "renewal", "Renewal"
        UPGRADE = "upgrade", "Upgrade"
        DOWNGRADE = "downgrade", "Downgrade"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    subscription = models.ForeignKey(
        PlanOrder, on_delete=models.PROTECT, related_name="pending_changes"
    )
    change_type = models.CharField(max_length=12, choices=ChangeType.choices)
    target_plan = models.ForeignKey(HealthPlan, on_delete=models.PROTECT)
    billing_period = models.CharField(max_length=12, choices=PlanOrder.BillingPeriod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=24, blank=True)
    transaction = models.OneToOneField(
        CommerceTransaction, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="plan_subscription_change",
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at", "-id"]


class CommerceRefundRequest(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class Destination(models.TextChoices):
        ORIGINAL = "original_method", "Original payment method"
        WALLET = "wallet", "Patient wallet"

    transaction = models.ForeignKey(
        CommerceTransaction, on_delete=models.PROTECT, related_name="refund_requests"
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    reason = models.TextField(blank=True)
    destination = models.CharField(max_length=20, choices=Destination.choices, blank=True)
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["transaction"],
                name="commerce_unique_refund_per_transaction",
            )
        ]


class WalletTransaction(DevelopmentRecord):
    class Direction(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"

    user = models.ForeignKey(
        PlatformUser, on_delete=models.PROTECT, related_name="commerce_wallet_transactions"
    )
    direction = models.CharField(max_length=8, choices=Direction.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    refund_request = models.ForeignKey(
        CommerceRefundRequest, null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_transactions"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
