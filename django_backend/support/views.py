from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ContactQuery,
    EmergencyRequest,
    Notification,
    NotificationTemplate,
    SupportTicket,
    SupportTicketMessage,
)
from .serializers import (
    ContactQuerySerializer,
    EmergencyRequestSerializer,
    NotificationSerializer,
    NotificationTemplateSerializer,
    SupportTicketMessageSerializer,
    SupportTicketSerializer,
)


class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.select_related(
        "user",
        "assignee",
    ).prefetch_related("messages")
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        category = self.request.query_params.get("category")

        if search:
            queryset = queryset.filter(
                Q(ticket_id__icontains=search)
                | Q(subject__icontains=search)
                | Q(category__icontains=search)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if priority:
            queryset = queryset.filter(priority=priority)

        if category:
            queryset = queryset.filter(category__iexact=category)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        ticket = self.get_object()
        message = request.data.get("message", "").strip()

        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        SupportTicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            message=message,
            message_type="reply",
        )

        if ticket.status == "open":
            ticket.status = "in_progress"
            ticket.save(update_fields=["status", "updated_at"])

        return Response(
            SupportTicketSerializer(ticket).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="internal-note")
    def internal_note(self, request, pk=None):
        ticket = self.get_object()
        message = request.data.get("message", "").strip()

        if not message:
            return Response(
                {"detail": "Note is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        SupportTicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            message=message,
            message_type="internal_note",
        )

        return Response(
            SupportTicketSerializer(ticket).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = "closed"
        ticket.save(update_fields=["status", "updated_at"])

        return Response(SupportTicketSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = "open"
        ticket.save(update_fields=["status", "updated_at"])

        return Response(SupportTicketSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        assignee_id = request.data.get("assignee")

        if not assignee_id:
            return Response(
                {"detail": "Assignee is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.assignee_id = assignee_id

        if ticket.status == "open":
            ticket.status = "in_progress"

        ticket.save(update_fields=["assignee", "status", "updated_at"])

        return Response(SupportTicketSerializer(ticket).data)


class ContactQueryViewSet(viewsets.ModelViewSet):
    queryset = ContactQuery.objects.all()
    serializer_class = ContactQuerySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(subject__icontains=search)
                | Q(message__icontains=search)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        query = self.get_object()
        query.status = "read"
        query.save(update_fields=["status", "updated_at"])

        return Response(ContactQuerySerializer(query).data)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        query = self.get_object()
        query.status = "replied"
        query.save(update_fields=["status", "updated_at"])

        return Response(ContactQuerySerializer(query).data)


class EmergencyRequestViewSet(viewsets.ModelViewSet):
    queryset = EmergencyRequest.objects.select_related(
        "user",
        "assigned_staff",
    )
    serializer_class = EmergencyRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")

        if search:
            queryset = queryset.filter(
                Q(request_type__icontains=search)
                | Q(location__icontains=search)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        emergency = self.get_object()
        staff_id = request.data.get("assigned_staff")

        if not staff_id:
            return Response(
                {"detail": "Assigned staff is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        emergency.assigned_staff_id = staff_id
        emergency.status = "assigned"
        emergency.save(
            update_fields=[
                "assigned_staff",
                "status",
                "updated_at",
            ]
        )

        return Response(EmergencyRequestSerializer(emergency).data)

    @action(detail=True, methods=["post"], url_path="mark-handled")
    def mark_handled(self, request, pk=None):
        emergency = self.get_object()
        emergency.status = "handled"
        emergency.save(update_fields=["status", "updated_at"])

        return Response(EmergencyRequestSerializer(emergency).data)


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        channel = self.request.query_params.get("channel")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(subject__icontains=search)
                | Q(body__icontains=search)
            )

        if channel:
            queryset = queryset.filter(channel=channel)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"], url_path="send-test")
    def send_test(self, request, pk=None):
        template = self.get_object()

        return Response(
            {
                "detail": "Test notification prepared successfully.",
                "template": template.name,
                "channel": template.channel,
                "subject": template.subject,
                "body": template.body,
            }
        )


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.select_related(
        "recipient",
        "sender",
    )
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        audience = self.request.query_params.get("audience")
        channel = self.request.query_params.get("channel")

        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search)
                | Q(message__icontains=search)
                | Q(provider_group__icontains=search)
            )

        if audience:
            queryset = queryset.filter(audience=audience)

        if channel:
            queryset = queryset.filter(channel=channel)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)