from django.conf import settings
from django.db import models


class PlatformSettings(models.Model):
    """
    Singleton configuration for the Tatito platform.
    Only one PlatformSettings record should exist.
    """

    site_name = models.CharField(max_length=150, default="Tatito Health+")
    logo_url = models.CharField(max_length=500, blank=True)
    favicon_url = models.CharField(max_length=500, blank=True)

    support_email = models.EmailField(blank=True)
    support_phone = models.CharField(max_length=30, blank=True)
    contact_address = models.TextField(blank=True)

    social_facebook = models.URLField(blank=True)
    social_instagram = models.URLField(blank=True)
    social_twitter = models.URLField(blank=True)
    social_linkedin = models.URLField(blank=True)

    footer_text = models.TextField(blank=True)

    announcement_enabled = models.BooleanField(default=False)
    announcement_text = models.TextField(blank=True)

    maintenance_mode = models.BooleanField(default=False)

    currency = models.CharField(max_length=10, default="INR")
    currency_symbol = models.CharField(max_length=10, default="₹")
    date_format = models.CharField(max_length=50, default="DD/MM/YYYY")
    timezone = models.CharField(max_length=100, default="Asia/Kolkata")

    tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )

    doctor_commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )

    delivery_fee_rule = models.CharField(
        max_length=100,
        default="flat",
    )
    delivery_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    payment_gateway_name = models.CharField(
        max_length=100,
        blank=True,
    )
    payment_gateway_mode = models.CharField(
        max_length=30,
        default="test",
    )
    payment_gateway_public_key = models.CharField(
        max_length=500,
        blank=True,
    )

    otp_enabled = models.BooleanField(default=True)
    otp_expiry_minutes = models.PositiveIntegerField(default=5)
    session_timeout_minutes = models.PositiveIntegerField(default=30)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_settings_updates",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"

    def __str__(self):
        return self.site_name


class SystemNotificationSetting(models.Model):
    event_key = models.CharField(max_length=100, unique=True)
    event_name = models.CharField(max_length=150)
    enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.event_name


class AddonSetting(models.Model):
    addon_key = models.CharField(max_length=100, unique=True)
    addon_name = models.CharField(max_length=150)
    enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.addon_name