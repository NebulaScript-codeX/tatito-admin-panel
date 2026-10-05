from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    AssistantSettings,
    QueryLog,
    SafetyRule,
    SuggestedChip,
)
from .serializers import (
    AssistantSettingsSerializer,
    QueryLogSerializer,
    SafetyRuleSerializer,
    SuggestedChipSerializer,
)


class AssistantSettingsViewSet(viewsets.ModelViewSet):
    queryset = AssistantSettings.objects.all()
    serializer_class = AssistantSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        assistant_type = self.request.query_params.get("assistant_type")

        if assistant_type:
            queryset = queryset.filter(assistant_type=assistant_type)

        return queryset.order_by("id")


class SuggestedChipViewSet(viewsets.ModelViewSet):
    queryset = SuggestedChip.objects.all()
    serializer_class = SuggestedChipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(text__icontains=search)
            )

        return queryset.order_by("display_order", "id")


class QueryLogViewSet(viewsets.ModelViewSet):
    queryset = QueryLog.objects.select_related("patient")
    serializer_class = QueryLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        flagged = self.request.query_params.get("flagged")

        if search:
            queryset = queryset.filter(
                Q(query__icontains=search)
                | Q(reply_summary__icontains=search)
                | Q(patient__username__icontains=search)
                | Q(patient__email__icontains=search)
            )

        if flagged in {"true", "false"}:
            queryset = queryset.filter(
                flagged=flagged == "true"
            )

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"], url_path="send-to-doctor")
    def send_to_doctor(self, request, pk=None):
        query_log = self.get_object()

        query_log.doctor_review_requested = True
        query_log.save(update_fields=["doctor_review_requested"])

        return Response(
            QueryLogSerializer(
                query_log,
                context={"request": request},
            ).data
        )


class SafetyRuleViewSet(viewsets.ModelViewSet):
    queryset = SafetyRule.objects.all()
    serializer_class = SafetyRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        severity = self.request.query_params.get("severity")

        if search:
            queryset = queryset.filter(
                Q(keyword__icontains=search)
                | Q(escalation_message__icontains=search)
            )

        if severity:
            queryset = queryset.filter(severity=severity)

        return queryset.order_by("keyword")

    @action(detail=False, methods=["post"], url_path="test")
    def test_query(self, request):
        query = str(request.data.get("query", "")).strip()

        if not query:
            return Response(
                {"detail": "Query is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = SafetyRule.objects.all()

        matched_rule = None

        for rule in rules:
            if rule.keyword.lower() in query.lower():
                matched_rule = rule
                break

        if matched_rule:
            reply = matched_rule.escalation_message

            query_log = QueryLog.objects.create(
                patient=request.user,
                query=query,
                reply_summary=reply,
                flagged=True,
            )

            return Response(
                {
                    "reply": reply,
                    "flagged": True,
                    "safety_rule": SafetyRuleSerializer(
                        matched_rule
                    ).data,
                    "query_log": QueryLogSerializer(
                        query_log,
                        context={"request": request},
                    ).data,
                }
            )

        reply = (
            "This is a sample AI response for testing purposes. "
            "Please consult a qualified healthcare professional for "
            "personalized medical advice."
        )

        query_log = QueryLog.objects.create(
            patient=request.user,
            query=query,
            reply_summary=reply,
            flagged=False,
        )

        return Response(
            {
                "reply": reply,
                "flagged": False,
                "safety_rule": None,
                "query_log": QueryLogSerializer(
                    query_log,
                    context={"request": request},
                ).data,
            }
        )