from django.db import transaction
from django.db.models import Q

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminUser, ModulePermission
from audit.services import log_action

from .models import (
    InternshipAlumni,
    InternshipApplication,
    InternshipPartner,
    InternshipTrack,
)
from .serializers import (
    InternshipAlumniSerializer,
    InternshipApplicationSerializer,
    InternshipPartnerSerializer,
    InternshipTrackSerializer,
)


MODULE = "internships"


class InternshipTrackViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipTrackSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
        ModulePermission,
    ]
    module = MODULE

    def get_queryset(self):
        queryset = InternshipTrack.objects.all()

        search = self.request.query_params.get("search", "").strip()
        track_type = self.request.query_params.get("track_type")
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(organisation__icontains=search)
                | Q(description__icontains=search)
            )

        if track_type:
            queryset = queryset.filter(track_type=track_type)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def perform_create(self, serializer):
        track = serializer.save(created_by=self.request.user)

        log_action(
            self.request,
            action="create",
            module=MODULE,
            target_type="InternshipTrack",
            target_id=track.id,
            description=f"Created internship track: {track.title}",
        )

    def perform_update(self, serializer):
        track = serializer.save()

        log_action(
            self.request,
            action="update",
            module=MODULE,
            target_type="InternshipTrack",
            target_id=track.id,
            description=f"Updated internship track: {track.title}",
        )


    def perform_destroy(self, instance):
        track_title = instance.title
        track_id = instance.id

        instance.delete()

        log_action(
            self.request,
            action="delete",
            module=MODULE,
            target_type="InternshipTrack",
            target_id=track_id,
            description=f"Deleted internship track: {track_title}",
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="toggle-publish",
    )
    def toggle_publish(self, request, pk=None):
        track = self.get_object()

        track.is_published = not track.is_published
        track.save(update_fields=["is_published", "updated_at"])

        log_action(
            request,
            action="publish" if track.is_published else "unpublish",
            module=MODULE,
            target_type="InternshipTrack",
            target_id=track.id,
            description=(
                f"{'Published' if track.is_published else 'Unpublished'} "
                f"internship track: {track.title}"
            ),
        )

        return Response(
            {
                "message": (
                    "Track published."
                    if track.is_published
                    else "Track unpublished."
                ),
                "track": self.get_serializer(track).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="toggle-status",
    )
    def toggle_status(self, request, pk=None):
        track = self.get_object()

        track.status = (
            "closed"
            if track.status == "open"
            else "open"
        )

        track.save(update_fields=["status", "updated_at"])

        log_action(
            request,
            action="status_change",
            module=MODULE,
            target_type="InternshipTrack",
            target_id=track.id,
            description=f"Changed internship track '{track.title}' status to {track.status}.",
        )

        return Response(
            {
                "message": (
                    "Track closed."
                    if track.status == "closed"
                    else "Track opened."
                ),
                "track": self.get_serializer(track).data,
            }
        )


class InternshipApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipApplicationSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
        ModulePermission,
    ]
    module = MODULE

    def get_queryset(self):
        queryset = InternshipApplication.objects.select_related(
            "track"
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")
        track_id = self.request.query_params.get("track")

        if search:
            queryset = queryset.filter(
                Q(applicant_name__icontains=search)
                | Q(applicant_email__icontains=search)
                | Q(track__title__icontains=search)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if track_id:
            queryset = queryset.filter(track_id=track_id)

        return queryset

    @action(
        detail=True,
        methods=["post"],
        url_path="select",
    )
    @transaction.atomic
    def select_application(self, request, pk=None):
        application = (
            InternshipApplication.objects
            .select_for_update()
            .select_related("track")
            .get(pk=pk)
        )

        if application.status == "selected":
            return Response(
                {"error": "Application is already selected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.status != "case_review":
            return Response(
                {
                    "error": (
                        "Application must be in Case Review "
                        "before it can be selected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.status != "case_review":
            return Response(
                {
                    "error": (
                        "Application must be in Case Review "
                        "before it can be selected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        track = (
            InternshipTrack.objects
            .select_for_update()
            .get(pk=application.track_id)
        )

        if track.status != "open":
            return Response(
                {"error": "This internship track is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if track.open_positions <= 0:
            return Response(
                {
                    "error": (
                        "No open positions are available "
                        "for this track."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If another application was previously selected,
        # do not allow duplicate selection.
        application.status = "selected"
        application.save(
            update_fields=["status", "updated_at"]
        )

        track.open_positions -= 1

        if track.open_positions == 0:
            track.status = "closed"

        track.save(
            update_fields=[
                "open_positions",
                "status",
                "updated_at",
            ]
        )

        log_action(
            request,
            action="select",
            module=MODULE,
            target_type="InternshipApplication",
            target_id=application.id,
            description=(
                f"Selected applicant {application.applicant_name} "
                f"for internship track: {track.title}"
            ),
            metadata={
                "track_id": track.id,
                "remaining_positions": track.open_positions,
            },
        )

        return Response(
            {
                "message": "Applicant selected successfully.",
                "application": self.get_serializer(
                    application
                ).data,
                "track": InternshipTrackSerializer(
                    track
                ).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="revert-selection",
    )
    @transaction.atomic
    def revert_selection(self, request, pk=None):
        application = (
            InternshipApplication.objects
            .select_for_update()
            .select_related("track")
            .get(pk=pk)
        )

        if application.status != "selected":
            return Response(
                {
                    "error": (
                        "This application is not currently selected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        track = (
            InternshipTrack.objects
            .select_for_update()
            .get(pk=application.track_id)
        )

        application.status = "case_review"
        application.save(
            update_fields=["status", "updated_at"]
        )

        track.open_positions += 1

        if track.status == "closed":
            track.status = "open"

        track.save(
            update_fields=[
                "open_positions",
                "status",
                "updated_at",
            ]
        )

        log_action(
            request,
            action="revert_selection",
            module=MODULE,
            target_type="InternshipApplication",
            target_id=application.id,
            description=(
                f"Reverted selection for applicant "
                f"{application.applicant_name} "
                f"from internship track: {track.title}"
            ),
            metadata={
                "track_id": track.id,
                "restored_positions": track.open_positions,
            },
        )

        return Response(
            {
                "message": "Selection reverted successfully.",
                "application": self.get_serializer(
                    application
                ).data,
                "track": InternshipTrackSerializer(
                    track
                ).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="send-offer",
    )
    def send_offer(self, request, pk=None):
        application = self.get_object()

        if application.status != "selected":
            return Response(
                {
                    "error": (
                        "An offer can only be sent "
                        "to a selected applicant."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.offer_sent = True
        application.save(
            update_fields=["offer_sent", "updated_at"]
        )

        log_action(
            request,
            action="send_offer",
            module=MODULE,
            target_type="InternshipApplication",
            target_id=application.id,
            description=(
                f"Offer marked as sent to "
                f"{application.applicant_name}."
            ),
            metadata={
                "applicant_email": application.applicant_email,
            },
        )

        return Response(
            {
                "message": "Offer marked as sent.",
                "application": self.get_serializer(
                    application
                ).data,
            }
        )


class InternshipPartnerViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipPartnerSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
        ModulePermission,
    ]
    module = MODULE

    def get_queryset(self):
        queryset = InternshipPartner.objects.all()

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(organisation_type__icontains=search)
                | Q(contact_name__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class InternshipAlumniViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipAlumniSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
        ModulePermission,
    ]
    module = MODULE

    def get_queryset(self):
        queryset = InternshipAlumni.objects.all()

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(role__icontains=search)
                | Q(testimonial__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset