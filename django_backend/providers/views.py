from pathlib import Path

from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from accounts.permissions import has_module_permission

from .models import HealthcareProvider, ProviderDocument
from .serializers import HealthcareProviderSerializer, ProviderDocumentSerializer


class ProviderWorkflowPermission(ModulePermission):
    def has_permission(self, request, view):
        action = getattr(view, "action", "")
        if action in {"approve", "reject", "activate", "deactivate"}:
            return has_module_permission(request.user, "providers", "edit")
        permission_action = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "edit",
            "partial_update": "edit",
            "destroy": "delete",
        }.get(action)
        if permission_action:
            return has_module_permission(request.user, "providers", permission_action)
        return False


class HealthcareProviderViewSet(viewsets.ModelViewSet):
    queryset = HealthcareProvider.objects.prefetch_related("documents").all()
    serializer_class = HealthcareProviderSerializer
    permission_classes = [ProviderWorkflowPermission]
    module = "providers"

    def get_queryset(self):
        queryset = super().get_queryset()
        provider_type = self.request.query_params.get("provider_type")
        status_filter = self.request.query_params.get("status")
        verification_status = self.request.query_params.get("verification_status")
        search = self.request.query_params.get("search", "").strip()
        if provider_type:
            queryset = queryset.filter(provider_type=provider_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if verification_status:
            queryset = queryset.filter(documents__status=verification_status)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(registration_number__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
            )
        return queryset.distinct()

    def perform_create(self, serializer):
        serializer.save(status=HealthcareProvider.Status.PENDING)

    def perform_destroy(self, instance):
        for document in instance.documents.all():
            document.file.delete(save=False)
        instance.delete()

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[ProviderWorkflowPermission],
    )
    def approve(self, request, pk=None):
        provider = self.get_object()
        provider.status = HealthcareProvider.Status.ACTIVE
        provider.rejection_reason = ""
        provider.save(update_fields=["status", "rejection_reason", "updated_at"])
        return Response(self.get_serializer(provider).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[ProviderWorkflowPermission],
    )
    def reject(self, request, pk=None):
        reason = str(request.data.get("reason") or "").strip()
        if not reason:
            return Response(
                {"reason": ["A rejection reason is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        provider = self.get_object()
        provider.status = HealthcareProvider.Status.REJECTED
        provider.rejection_reason = reason
        provider.save(update_fields=["status", "rejection_reason", "updated_at"])
        return Response(self.get_serializer(provider).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[ProviderWorkflowPermission],
    )
    def activate(self, request, pk=None):
        provider = self.get_object()
        provider.status = HealthcareProvider.Status.ACTIVE
        provider.rejection_reason = ""
        provider.save(update_fields=["status", "rejection_reason", "updated_at"])
        return Response(self.get_serializer(provider).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[ProviderWorkflowPermission],
    )
    def deactivate(self, request, pk=None):
        provider = self.get_object()
        provider.status = HealthcareProvider.Status.INACTIVE
        provider.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(provider).data)


class ProviderDocumentListCreateView(APIView):
    permission_classes = [ModulePermission]
    module = "providers"
    action_map = {"post": "edit"}
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk):
        provider = get_object_or_404(HealthcareProvider, pk=pk)
        return Response(
            ProviderDocumentSerializer(provider.documents.all(), many=True).data
        )

    def post(self, request, pk):
        provider = get_object_or_404(HealthcareProvider, pk=pk)
        serializer = ProviderDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save(provider=provider)
        return Response(
            ProviderDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED,
        )


class ProviderDocumentDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "providers"
    action_map = {"patch": "edit", "delete": "delete"}

    def patch(self, request, pk, document_id):
        document = get_object_or_404(
            ProviderDocument,
            pk=document_id,
            provider_id=pk,
        )
        document_status = request.data.get("status")
        if document_status not in ProviderDocument.Status.values:
            return Response(
                {"status": ["Choose pending, verified, or rejected."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = str(request.data.get("rejection_reason") or "").strip()
        if document_status == ProviderDocument.Status.REJECTED and not reason:
            return Response(
                {"rejection_reason": ["A rejection reason is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        document.status = document_status
        document.rejection_reason = (
            reason if document_status == ProviderDocument.Status.REJECTED else ""
        )
        document.reviewed_at = timezone.now()
        document.save(
            update_fields=["status", "rejection_reason", "reviewed_at"]
        )
        return Response(ProviderDocumentSerializer(document).data)

    def delete(self, request, pk, document_id):
        document = get_object_or_404(
            ProviderDocument,
            pk=document_id,
            provider_id=pk,
        )
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProviderDocumentFileView(APIView):
    permission_classes = [ModulePermission]
    module = "providers"

    def get(self, request, document_id):
        document = get_object_or_404(ProviderDocument, pk=document_id)
        file_handle = document.file.open("rb")
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=Path(document.original_name).name,
        )
