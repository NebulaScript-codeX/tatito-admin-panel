from rest_framework import serializers

from .models import (
    InternshipAlumni,
    InternshipApplication,
    InternshipPartner,
    InternshipTrack,
)


class InternshipTrackSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    application_count = serializers.SerializerMethodField()

    class Meta:
        model = InternshipTrack
        fields = "__all__"
        read_only_fields = [
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_application_count(self, obj):
        return obj.applications.count()


class InternshipApplicationSerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(
        source="track.title",
        read_only=True,
    )

    class Meta:
        model = InternshipApplication
        fields = "__all__"
        read_only_fields = [
            "applied_at",
            "updated_at",
            "offer_sent",
        ]


class InternshipPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipPartner
        fields = "__all__"
        read_only_fields = [
            "created_at",
            "updated_at",
        ]


class InternshipAlumniSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipAlumni
        fields = "__all__"
        read_only_fields = [
            "created_at",
            "updated_at",
        ]