import re
from pathlib import Path

from rest_framework import serializers

from .models import HealthcareProvider, ProviderDocument


class ProviderDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file = serializers.FileField(write_only=True, required=True)

    class Meta:
        model = ProviderDocument
        fields = (
            "id",
            "kind",
            "original_name",
            "file",
            "file_url",
            "status",
            "rejection_reason",
            "uploaded_at",
            "reviewed_at",
        )
        read_only_fields = (
            "id",
            "original_name",
            "file_url",
            "status",
            "rejection_reason",
            "uploaded_at",
            "reviewed_at",
        )

    def get_file_url(self, instance):
        return f"/api/admin/providers/documents/{instance.pk}/file/"

    def validate_file(self, uploaded_file):
        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in {".pdf", ".jpg", ".jpeg", ".png"}:
            raise serializers.ValidationError(
                "Upload a PDF, JPG, JPEG, or PNG document."
            )
        if uploaded_file.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Documents must be 10 MB or smaller.")
        return uploaded_file

    def create(self, validated_data):
        uploaded_file = validated_data["file"]
        validated_data["original_name"] = Path(uploaded_file.name).name[:255]
        return super().create(validated_data)


class HealthcareProviderSerializer(serializers.ModelSerializer):
    documents = ProviderDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = HealthcareProvider
        fields = (
            "id",
            "name",
            "provider_type",
            "phone",
            "email",
            "address",
            "city",
            "state",
            "pincode",
            "registration_number",
            "registration_date",
            "status",
            "type_details",
            "rejection_reason",
            "documents",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "rejection_reason",
            "documents",
            "created_at",
            "updated_at",
        )

    def validate_type_details(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Type-specific details must be an object.")
        return value

    def validate_phone(self, value):
        phone = str(value or "").strip()
        if not phone:
            return ""
        if len(phone) > 20 or not re.fullmatch(r"\+?[0-9\s()-]+", phone):
            raise serializers.ValidationError("Enter a valid Indian mobile number.")

        digits = re.sub(r"\D", "", phone)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if not re.fullmatch(r"[6-9]\d{9}", digits):
            raise serializers.ValidationError("Enter a valid Indian mobile number.")
        return digits
