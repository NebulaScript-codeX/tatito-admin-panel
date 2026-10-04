from rest_framework import serializers

from .models import (
    ContactQuery,
    EmergencyRequest,
    Notification,
    NotificationTemplate,
    SupportTicket,
    SupportTicketMessage,
)


class SupportTicketMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketMessage
        fields = [
            "id",
            "ticket",
            "author",
            "author_name",
            "message",
            "message_type",
            "created_at",
        ]
        read_only_fields = ["author", "created_at"]

    def get_author_name(self, obj):
        if not obj.author:
            return None
        return getattr(obj.author, "name", None) or getattr(
            obj.author,
            "username",
            None,
        )


class SupportTicketSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    messages = SupportTicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "ticket_id",
            "subject",
            "user",
            "user_name",
            "category",
            "priority",
            "status",
            "assignee",
            "assignee_name",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "ticket_id",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        if not obj.user:
            return None
        return getattr(obj.user, "name", None) or getattr(
            obj.user,
            "username",
            None,
        )

    def get_assignee_name(self, obj):
        if not obj.assignee:
            return None
        return getattr(obj.assignee, "name", None) or getattr(
            obj.assignee,
            "username",
            None,
        )


class ContactQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactQuery
        fields = [
            "id",
            "name",
            "email",
            "subject",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class EmergencyRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    assigned_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyRequest
        fields = [
            "id",
            "user",
            "user_name",
            "request_type",
            "priority",
            "location",
            "assigned_staff",
            "assigned_staff_name",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_user_name(self, obj):
        if not obj.user:
            return None
        return getattr(obj.user, "name", None) or getattr(
            obj.user,
            "username",
            None,
        )

    def get_assigned_staff_name(self, obj):
        if not obj.assigned_staff:
            return None
        return getattr(obj.assigned_staff, "name", None) or getattr(
            obj.assigned_staff,
            "username",
            None,
        )


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = [
            "id",
            "name",
            "channel",
            "subject",
            "body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "audience",
            "recipient",
            "recipient_name",
            "provider_group",
            "channel",
            "subject",
            "message",
            "sender",
            "sender_name",
            "created_at",
        ]
        read_only_fields = ["sender", "created_at"]

    def get_recipient_name(self, obj):
        if not obj.recipient:
            return None
        return getattr(obj.recipient, "name", None) or getattr(
            obj.recipient,
            "username",
            None,
        )

    def get_sender_name(self, obj):
        if not obj.sender:
            return None
        return getattr(obj.sender, "name", None) or getattr(
            obj.sender,
            "username",
            None,
        )