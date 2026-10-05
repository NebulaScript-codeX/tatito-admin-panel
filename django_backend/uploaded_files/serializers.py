from rest_framework import serializers

from .models import MediaFile, UserDocument


class UserDocumentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True)
    document_type_label = serializers.CharField(
        source="get_document_type_display",
        read_only=True,
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = UserDocument
        fields = [
            "id",
            "owner",
            "owner_name",
            "document_type",
            "document_type_label",
            "original_name",
            "file_url",
            "status",
            "status_label",
            "rejection_reason",
            "uploaded_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "owner_name",
            "document_type_label",
            "status_label",
            "file_url",
            "uploaded_at",
            "reviewed_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""

        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class MediaFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaFile
        fields = [
            "id",
            "original_name",
            "file_url",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "file_url",
            "uploaded_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""

        url = obj.file.url
        return request.build_absolute_uri(url) if request else url