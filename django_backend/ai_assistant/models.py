from django.conf import settings
from django.db import models


class AssistantSettings(models.Model):
    ASSISTANT_TYPE_CHOICES = [
        ("tatito_ai", "Tatito AI"),
        ("aria", "Aria"),
    ]

    assistant_type = models.CharField(
        max_length=30,
        choices=ASSISTANT_TYPE_CHOICES,
        default="tatito_ai",
        unique=True,
    )

    assistant_name = models.CharField(
        max_length=150,
        default="Tatito AI Assistant",
    )

    is_enabled = models.BooleanField(default=True)

    disclaimer_text = models.TextField(
        default=(
            "This AI assistant provides general health information and "
            "is not a substitute for professional medical advice."
        )
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.assistant_name

class SuggestedChip(models.Model):
    text = models.CharField(max_length=150, unique=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.text


class QueryLog(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_query_logs",
    )
    query = models.TextField()
    reply_summary = models.TextField(blank=True)
    flagged = models.BooleanField(default=False)
    doctor_review_requested = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AI Query #{self.id}"


class SafetyRule(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    keyword = models.CharField(max_length=150, unique=True)
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="high",
    )
    escalation_message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["keyword"]

    def __str__(self):
        return f"{self.keyword} - {self.severity}"