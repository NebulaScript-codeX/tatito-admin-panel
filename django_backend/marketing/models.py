from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Promotion(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    cta_text = models.CharField(max_length=80, blank=True)
    cta_link = models.CharField(max_length=500, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_promotions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError({"end_date": "End date must be after start date."})

    def save(self, *args, **kwargs):
        self.title = self.title.strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Coupon(models.Model):

    DISCOUNT_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("flat", "Flat"),
    ]

    APPLIES_TO_CHOICES = [
        ("pharmacy", "Pharmacy"),
        ("lab", "Lab"),
        ("doctor", "Doctor"),
        ("plans", "Plans"),
        ("all", "All"),
    ]

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPE_CHOICES,
    )

    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    maximum_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    applies_to = models.CharField(
        max_length=20,
        choices=APPLIES_TO_CHOICES,
        default="all",
    )

    start_date = models.DateTimeField()

    expiry_date = models.DateTimeField()

    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    per_user_limit = models.PositiveIntegerField(
        default=1,
    )

    usage_count = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_coupons",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def clean(self):
        errors = {}

        if self.discount_value <= 0:
            errors["discount_value"] = (
                "Discount value must be greater than zero."
            )

        if self.discount_type == "percentage":
            if self.discount_value > 100:
                errors["discount_value"] = (
                    "Percentage discount cannot exceed 100%."
                )

        if self.maximum_discount is not None:
            if self.maximum_discount <= 0:
                errors["maximum_discount"] = (
                    "Maximum discount must be greater than zero."
                )

        if self.minimum_order_amount < 0:
            errors["minimum_order_amount"] = (
                "Minimum order amount cannot be negative."
            )

        if self.start_date and self.expiry_date:
            if self.expiry_date <= self.start_date:
                errors["expiry_date"] = (
                    "Expiry date must be after the start date."
                )

        if self.usage_limit is not None:
            if self.usage_limit < 1:
                errors["usage_limit"] = (
                    "Usage limit must be at least 1."
                )

            if self.usage_count > self.usage_limit:
                errors["usage_count"] = (
                    "Usage count cannot exceed the usage limit."
                )

        if self.per_user_limit < 1:
            errors["per_user_limit"] = (
                "Per-user limit must be at least 1."
            )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expiry_date

    @property
    def is_fully_used(self):
        return (
            self.usage_limit is not None
            and self.usage_count >= self.usage_limit
        )

    @property
    def is_currently_active(self):
        now = timezone.now()

        return (
            self.is_active
            and self.start_date <= now < self.expiry_date
            and not self.is_fully_used
        )

    def __str__(self):
        return self.code


class CouponUsage(models.Model):

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name="usages",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="coupon_usages",
    )

    used_at = models.DateTimeField(
        auto_now_add=True,
    )

    order_reference = models.CharField(
        max_length=100,
        blank=True,
    )

    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        ordering = ["-used_at"]

    def __str__(self):
        return f"{self.coupon.code} - {self.user.username}"


class FeaturedPromotion(models.Model):
    badge_text = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)
    colour = models.CharField(max_length=50, default="#075f50")
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_featured_promotions",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.title


class PromotionalContent(models.Model):
    PLACEMENT_CHOICES = [
        ("home", "Home"),
        ("pharmacy", "Pharmacy"),
    ]

    CONTENT_TYPE_CHOICES = [
        ("banner", "Banner"),
        ("offer_strip", "Offer Strip"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)

    placement = models.CharField(
        max_length=20,
        choices=PLACEMENT_CHOICES,
    )

    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPE_CHOICES,
    )

    image_url = models.CharField(
        max_length=500,
        blank=True,
    )

    colour = models.CharField(
        max_length=50,
        default="#075f50",
    )

    is_active = models.BooleanField(default=True)

    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_promotional_content",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.title