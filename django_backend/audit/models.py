from django.conf import settings
from django.db import models

from dashboard.models import DevelopmentRecord


class AuditLog(DevelopmentRecord):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    # Snapshots so entries stay meaningful if the account is later removed/renamed.
    actor_username = models.CharField(max_length=150, blank=True)
    actor_role = models.CharField(max_length=100, blank=True)

    action = models.CharField(max_length=50, db_index=True)
    module = models.CharField(max_length=100, blank=True, db_index=True)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.actor_username} {self.action}"


class AdminNotificationReadState(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_notification_read_states",
    )
    notification_key = models.CharField(max_length=255)
    is_read = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "notification_key"],
                name="uniq_admin_notification_read",
            ),
        ]
