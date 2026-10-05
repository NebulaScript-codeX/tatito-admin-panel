from rest_framework import serializers

from .models import (
    AddonSetting,
    PlatformSettings,
    SystemNotificationSetting,
)


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = [
            "id",
            "site_name",
            "logo_url",
            "favicon_url",
            "support_email",
            "support_phone",
            "contact_address",
            "social_facebook",
            "social_instagram",
            "social_twitter",
            "social_linkedin",
            "footer_text",
            "announcement_enabled",
            "announcement_text",
            "maintenance_mode",
            "currency",
            "currency_symbol",
            "date_format",
            "timezone",
            "tax_percentage",
            "doctor_commission_percentage",
            "delivery_fee_rule",
            "delivery_fee_amount",
            "payment_gateway_name",
            "payment_gateway_mode",
            "payment_gateway_public_key",
            "otp_enabled",
            "otp_expiry_minutes",
            "session_timeout_minutes",
            "updated_by",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "updated_by",
            "updated_at",
        ]

    def validate_tax_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Tax percentage must be between 0 and 100."
            )
        return value

    def validate_doctor_commission_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Doctor commission percentage must be between 0 and 100."
            )
        return value

    def validate_delivery_fee_amount(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Delivery fee cannot be negative."
            )
        return value

    def validate_otp_expiry_minutes(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "OTP expiry must be at least 1 minute."
            )
        return value

    def validate_session_timeout_minutes(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Session timeout must be at least 1 minute."
            )
        return value


class SystemNotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemNotificationSetting
        fields = [
            "id",
            "event_key",
            "event_name",
            "enabled",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "updated_at",
        ]


class AddonSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddonSetting
        fields = [
            "id",
            "addon_key",
            "addon_name",
            "enabled",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "updated_at",
        ]