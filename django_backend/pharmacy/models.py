from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from care.models import CarePatient
from dashboard.models import DevelopmentRecord, PlatformUser
from health_records.models import PrescriptionUpload
from marketing.models import Coupon
from providers.models import HealthcareProvider


class PharmacyCategory(DevelopmentRecord):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PharmacyBrand(DevelopmentRecord):
    name = models.CharField(max_length=120, unique=True)
    country = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PharmacyProduct(DevelopmentRecord):
    category = models.ForeignKey(
        PharmacyCategory, on_delete=models.PROTECT, related_name="products"
    )
    brand = models.ForeignKey(
        PharmacyBrand, on_delete=models.PROTECT, related_name="products"
    )
    partner_pharmacy = models.ForeignKey(
        HealthcareProvider,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="pharmacy_products",
        limit_choices_to={"provider_type": HealthcareProvider.ProviderType.PHARMACY},
    )
    name = models.CharField(max_length=240)
    pack_size = models.CharField(max_length=120)
    mrp = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    image_url = models.URLField(max_length=1000, blank=True)
    description = models.TextField(blank=True)
    low_stock_threshold = models.PositiveIntegerField(default=10)
    rx_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        indexes = [models.Index(fields=["category", "brand", "is_active"])]

    @property
    def selling_price(self):
        return (self.mrp * (Decimal("1") - self.discount_percent / Decimal("100"))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    @property
    def stock(self):
        return self.inventory_batches.filter(
            expiry_date__gte=timezone.localdate()
        ).aggregate(total=Sum("quantity"))["total"] or 0

    @property
    def stock_status(self):
        stock = self.stock
        if stock == 0:
            return "out_of_stock"
        if stock <= self.low_stock_threshold:
            return "low_stock"
        return "in_stock"

    def __str__(self):
        return self.name


class PharmacyBatch(DevelopmentRecord):
    product = models.ForeignKey(
        PharmacyProduct, on_delete=models.PROTECT, related_name="inventory_batches"
    )
    batch_number = models.CharField(max_length=100, unique=True)
    expiry_date = models.DateField(db_index=True)
    quantity = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expiry_date", "batch_number"]

    @property
    def expiry_status(self):
        days_remaining = (self.expiry_date - timezone.localdate()).days
        if days_remaining < 0:
            return "expired"
        if days_remaining <= 60:
            return "near_expiry"
        return "normal"

    def __str__(self):
        return self.batch_number


class PharmacyOrder(DevelopmentRecord):
    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        VERIFIED = "verified", "Verified"
        PACKED = "packed", "Packed"
        DISPATCHED = "dispatched", "Dispatched"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        CASH_ON_DELIVERY = "cash_on_delivery", "Cash on delivery"
        CARD = "card", "Card"
        UPI = "upi", "UPI"
        WALLET = "wallet", "Wallet"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUND_PENDING = "refund_pending", "Refund pending"
        REFUNDED = "refunded", "Refunded"

    patient = models.ForeignKey(
        CarePatient, on_delete=models.PROTECT, related_name="pharmacy_orders"
    )
    address = models.TextField()
    coupon = models.ForeignKey(
        Coupon, null=True, blank=True, on_delete=models.PROTECT, related_name="pharmacy_orders"
    )
    payment_method = models.CharField(
        max_length=24, choices=PaymentMethod.choices, default=PaymentMethod.CASH_ON_DELIVERY
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PLACED, db_index=True
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    product_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    plan_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coupon_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_number = models.CharField(max_length=40, null=True, blank=True, unique=True)
    invoice_issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    prescriptions = models.ManyToManyField(
        PrescriptionUpload, blank=True, related_name="pharmacy_orders"
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def order_number(self):
        return f"PH-{self.pk:06d}" if self.pk else ""

    def __str__(self):
        return self.order_number


class PharmacyOrderLine(DevelopmentRecord):
    order = models.ForeignKey(
        PharmacyOrder, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        PharmacyProduct, on_delete=models.PROTECT, related_name="order_lines"
    )
    product_name = models.CharField(max_length=240)
    quantity = models.PositiveIntegerField()
    unit_mrp = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    line_discount = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"


class PharmacyInventoryAdjustment(DevelopmentRecord):
    batch = models.ForeignKey(
        PharmacyBatch, on_delete=models.PROTECT, related_name="adjustments"
    )
    delta = models.IntegerField()
    reason = models.CharField(max_length=500)
    order = models.ForeignKey(
        PharmacyOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inventory_adjustments",
    )
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class PharmacyCouponUse(DevelopmentRecord):
    coupon = models.ForeignKey(
        Coupon, on_delete=models.PROTECT, related_name="pharmacy_uses"
    )
    patient = models.ForeignKey(
        CarePatient, on_delete=models.PROTECT, related_name="pharmacy_coupon_uses"
    )
    order = models.OneToOneField(
        PharmacyOrder, on_delete=models.CASCADE, related_name="coupon_use"
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PharmacyOrderBatchAllocation(DevelopmentRecord):
    order_line = models.ForeignKey(
        PharmacyOrderLine, on_delete=models.CASCADE, related_name="batch_allocations"
    )
    batch = models.ForeignKey(
        PharmacyBatch, on_delete=models.PROTECT, related_name="order_allocations"
    )
    quantity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order_line", "batch"], name="pharmacy_unique_order_batch_allocation"
            )
        ]


class PharmacyDeliveryAssignment(DevelopmentRecord):
    class Status(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"

    order = models.OneToOneField(
        PharmacyOrder, on_delete=models.CASCADE, related_name="delivery"
    )
    partner = models.ForeignKey(
        PlatformUser,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="pharmacy_deliveries",
        limit_choices_to={"role": PlatformUser.Role.PARTNER},
    )
    eta = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=24, choices=Status.choices, default=Status.ASSIGNED, db_index=True
    )
    updated_at = models.DateTimeField(auto_now=True)


class PharmacyRefund(DevelopmentRecord):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REJECTED = "rejected", "Rejected"

    order = models.OneToOneField(
        PharmacyOrder, on_delete=models.PROTECT, related_name="refund"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    reason = models.CharField(max_length=500)
    destination = models.CharField(max_length=20, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
