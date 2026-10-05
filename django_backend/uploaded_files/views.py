from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from audit.services import log_action

from .models import MediaFile, UserDocument
from .serializers import MediaFileSerializer, UserDocumentSerializer


class UserDocumentListView(APIView):
    permission_classes = [ModulePermission]
    module = "uploaded_files"

    def get(self, request):
        queryset = UserDocument.objects.select_related("owner").all()

        owner = request.query_params.get("owner")
        document_type = request.query_params.get("document_type")
        document_status = request.query_params.get("status")
        search = request.query_params.get("search")

        if owner:
            queryset = queryset.filter(owner_id=owner)

        if document_type:
            queryset = queryset.filter(document_type=document_type)

        if document_status:
            queryset = queryset.filter(status=document_status)

        if search:
            queryset = queryset.filter(
                original_name__icontains=search
            ) | queryset.filter(
                owner__name__icontains=search
            ) | queryset.filter(
                owner__email__icontains=search
            )

        serializer = UserDocumentSerializer(
            queryset,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class UserDocumentReviewView(APIView):
    permission_classes = [ModulePermission]
    module = "uploaded_files"

    def patch(self, request, pk):
        try:
            document = UserDocument.objects.select_related("owner").get(pk=pk)
        except UserDocument.DoesNotExist:
            return Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")

        if new_status not in {
            UserDocument.Status.VERIFIED,
            UserDocument.Status.REJECTED,
        }:
            return Response(
                {"detail": "Status must be verified or rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = str(
            request.data.get("rejection_reason", "")
        ).strip()

        if new_status == UserDocument.Status.REJECTED and not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document.status = new_status
        document.rejection_reason = (
            rejection_reason
            if new_status == UserDocument.Status.REJECTED
            else ""
        )
        document.reviewed_at = timezone.now()
        document.save(
            update_fields=[
                "status",
                "rejection_reason",
                "reviewed_at",
            ]
        )

        log_action(
            request=request,
            action="review",
            module="uploaded_files",
            target_type="UserDocument",
            target_id=str(document.id),
            description=(
                f"Document {document.original_name} marked "
                f"{new_status}."
            ),
            metadata={
                "status": new_status,
                "rejection_reason": rejection_reason,
                "owner_id": str(document.owner_id),
            },
        )

        serializer = UserDocumentSerializer(
            document,
            context={"request": request},
        )
        return Response(serializer.data)


class MediaFileListCreateView(APIView):
    permission_classes = [ModulePermission]
    module = "uploaded_files"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = MediaFile.objects.all()

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                original_name__icontains=search
            )

        serializer = MediaFileSerializer(
            queryset,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {"detail": "A file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        media_file = MediaFile.objects.create(
            original_name=uploaded_file.name,
            file=uploaded_file,
        )

        log_action(
            request=request,
            action="create",
            module="uploaded_files",
            target_type="MediaFile",
            target_id=str(media_file.id),
            description=f"Media file {media_file.original_name} uploaded.",
        )

        serializer = MediaFileSerializer(
            media_file,
            context={"request": request},
        )
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class MediaFileDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "uploaded_files"

    def patch(self, request, pk):
        try:
            media_file = MediaFile.objects.get(pk=pk)
        except MediaFile.DoesNotExist:
            return Response(
                {"detail": "Media file not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_name = str(request.data.get("original_name", "")).strip()

        if not new_name:
            return Response(
                {"detail": "File name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_name = media_file.original_name
        media_file.original_name = new_name
        media_file.save(update_fields=["original_name"])

        log_action(
            request=request,
            action="update",
            module="uploaded_files",
            target_type="MediaFile",
            target_id=str(media_file.id),
            description=f"Media file renamed from {old_name} to {new_name}.",
            metadata={
                "old_name": old_name,
                "new_name": new_name,
            },
        )

        serializer = MediaFileSerializer(
            media_file,
            context={"request": request},
        )
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            media_file = MediaFile.objects.get(pk=pk)
        except MediaFile.DoesNotExist:
            return Response(
                {"detail": "Media file not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_name = media_file.original_name
        media_file.delete()

        log_action(
            request=request,
            action="delete",
            module="uploaded_files",
            target_type="MediaFile",
            target_id=str(pk),
            description=f"Media file {file_name} deleted.",
        )

        return Response(status=status.HTTP_204_NO_CONTENT)