from django.conf import settings
from django.db import models


class SupportTicket(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]

    ticket_id = models.CharField(max_length=30, unique=True, editable=False)
    subject = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
    )
    category = models.CharField(max_length=100)
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_id:
            last_ticket = (
                SupportTicket.objects
                .order_by("-id")
                .values_list("id", flat=True)
                .first()
            )
            next_number = (last_ticket or 0) + 1
            self.ticket_id = f"TKT-{next_number:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_id} - {self.subject}"


class SupportTicketMessage(models.Model):
    MESSAGE_TYPES = [
        ("reply", "Reply"),
        ("internal_note", "Internal Note"),
    ]

    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_ticket_messages",
    )
    message = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPES,
        default="reply",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ticket.ticket_id} - {self.message_type}"


class ContactQuery(models.Model):
    STATUS_CHOICES = [
        ("unread", "Unread"),
        ("read", "Read"),
        ("replied", "Replied"),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="unread",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.subject}"


class EmergencyRequest(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("assigned", "Assigned"),
        ("handled", "Handled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emergency_requests",
    )
    request_type = models.CharField(max_length=100)
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="high",
    )
    location = models.CharField(max_length=255, blank=True)
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_emergency_requests",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.request_type} - {self.status}"


class NotificationTemplate(models.Model):
    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("email", "Email"),
        ("push", "Push"),
    ]

    name = models.CharField(max_length=150, unique=True)
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
    )
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Notification(models.Model):
    AUDIENCE_CHOICES = [
        ("individual", "Individual User"),
        ("all_users", "All Users"),
        ("provider_group", "Provider Group"),
    ]

    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("email", "Email"),
        ("push", "Push"),
    ]

    audience = models.CharField(
        max_length=30,
        choices=AUDIENCE_CHOICES,
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_admin_notifications",
    )
    provider_group = models.CharField(max_length=100, blank=True)
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
    )
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_admin_notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.channel} - {self.audience}"