from django.utils import timezone
from rest_framework import serializers

from .models import ( Coupon, CouponUsage, FeaturedPromotion, PromotionalContent,)

class CouponSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    is_fully_used = serializers.ReadOnlyField()
    is_currently_active = serializers.ReadOnlyField()

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "discount_value",
            "maximum_discount",
            "minimum_order_amount",
            "applies_to",
            "start_date",
            "expiry_date",
            "usage_limit",
            "per_user_limit",
            "usage_count",
            "is_active",
            "is_expired",
            "is_fully_used",
            "is_currently_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "usage_count",
            "created_by",
            "created_at",
            "updated_at",
            "is_expired",
            "is_fully_used",
            "is_currently_active",
        ]

    def validate_code(self, value):
        code = value.strip().upper()

        if not code:
            raise serializers.ValidationError(
                "Coupon code cannot be empty."
            )

        queryset = Coupon.objects.filter(code=code)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A coupon with this code already exists."
            )

        return code

    def validate_discount_value(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Discount value must be greater than zero."
            )

        discount_type = self.initial_data.get("discount_type")

        if discount_type == "percentage" and value > 100:
            raise serializers.ValidationError(
                "Percentage discount cannot exceed 100%."
            )

        return value

    def validate_maximum_discount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "Maximum discount must be greater than zero."
            )

        return value

    def validate_minimum_order_amount(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Minimum order amount cannot be negative."
            )

        return value

    def validate_usage_limit(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError(
                "Usage limit must be at least 1."
            )

        return value

    def validate_per_user_limit(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Per-user limit must be at least 1."
            )

        return value

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            self.instance.start_date if self.instance else None,
        )

        expiry_date = attrs.get(
            "expiry_date",
            self.instance.expiry_date if self.instance else None,
        )

        if start_date and expiry_date and expiry_date <= start_date:
            raise serializers.ValidationError({
                "expiry_date": "Expiry date must be after the start date."
            })

        usage_limit = attrs.get(
            "usage_limit",
            self.instance.usage_limit if self.instance else None,
        )

        if (
            usage_limit is not None
            and self.instance
            and self.instance.usage_count > usage_limit
        ):
            raise serializers.ValidationError({
                "usage_limit": (
                    "Usage limit cannot be lower than the current usage count."
                )
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)


class CouponUsageSerializer(serializers.ModelSerializer):
    coupon_code = serializers.CharField(
        source="coupon.code",
        read_only=True,
    )

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = CouponUsage
        fields = [
            "id",
            "coupon",
            "coupon_code",
            "user",
            "username",
            "used_at",
            "order_reference",
            "discount_amount",
        ]
        read_only_fields = [
            "id",
            "coupon_code",
            "username",
            "used_at",
        ]


class FeaturedPromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedPromotion
        fields = [
            "id",
            "badge_text",
            "title",
            "description",
            "link",
            "colour",
            "is_active",
            "display_order",
            "created_by",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)


class PromotionalContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionalContent
        fields = [
            "id",
            "title",
            "description",
            "link",
            "placement",
            "content_type",
            "image_url",
            "colour",
            "is_active",
            "display_order",
            "created_by",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)


class FeaturedPromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedPromotion
        fields = [
            "id",
            "badge_text",
            "title",
            "description",
            "link",
            "colour",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value

    def validate_badge_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Badge text is required.")
        return value


class PromotionalContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionalContent
        fields = [
            "id",
            "title",
            "description",
            "image_url",
            "link",
            "content_type",
            "placement",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value