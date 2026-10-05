from rest_framework import serializers

from .models import (
    AssistantSettings,
    QueryLog,
    SafetyRule,
    SuggestedChip,
)


class AssistantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantSettings
        fields = [
            "id",
            "assistant_name",
            "is_enabled",
            "disclaimer_text",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class SuggestedChipSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuggestedChip
        fields = [
            "id",
            "text",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QueryLogSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = QueryLog
        fields = [
            "id",
            "patient",
            "patient_name",
            "query",
            "reply_summary",
            "flagged",
            "doctor_review_requested",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "created_at",
        ]

    def get_patient_name(self, obj):
        if not obj.patient:
            return "Unknown Patient"

        return (
            obj.patient.get_full_name()
            or getattr(obj.patient, "username", None)
            or getattr(obj.patient, "email", None)
            or "Unknown Patient"
        )


class SafetyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyRule
        fields = [
            "id",
            "keyword",
            "severity",
            "escalation_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]