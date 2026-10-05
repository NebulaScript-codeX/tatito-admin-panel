from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser, ModulePermission, has_module_permission
from commerce.plans import active_plan_subscription, record_benefit_usage
from audit.services import log_action
from care.models import CarePatient
from commerce.services import ensure_refund_for_cancelled_order
from health_records.models import LabBooking
from providers.models import HealthcareProvider

from .models import (
    HealthCheckBundle,
    LabTest,
    LabTestCategory,
    LabTestPackage,
    OrganProfileCategory,
    Phlebotomist,
    RadiologyService,
    ScanBooking,
)
from .serializers import (
    LabBookingSerializer,
    HealthCheckBundleSerializer,
    LabReportUploadSerializer,
    LabTestCategorySerializer,
    LabTestPackageSerializer,
    LabTestSerializer,
    OrganProfileCategorySerializer,
    PhlebotomistSerializer,
    RadiologyServiceSerializer,
    ScanBookingSerializer,
)


class LabTestsPermission(ModulePermission):
    module = "lab_tests"

    def has_permission(self, request, view):
        view.module = self.module
        if getattr(view, "action", "") in {
            "assign",
            "transition",
            "report",
            "report_file",
        }:
            return has_module_permission(
                request.user,
                self.module,
                "view"
                if view.action == "report_file"
                else "edit",
            )
        return super().has_permission(request, view)


ADMIN_PERMISSIONS = [IsAuthenticated, IsAdminUser, LabTestsPermission]


def audit_lab_action(request, action_name, target_type, target_id, description):
    log_action(
        request,
        action=action_name,
        module="lab_tests",
        target_type=target_type,
        target_id=target_id,
        description=description,
    )


class LabTestSummaryView(APIView):
    permission_classes = ADMIN_PERMISSIONS

    def get(self, request):
        bookings = LabBooking.objects.all()
        return Response(
            {
                "tests": LabTest.objects.count(),
                "active_tests": LabTest.objects.filter(is_active=True).count(),
                "categories": LabTestCategory.objects.count(),
                "organ_categories": OrganProfileCategory.objects.count(),
                "packages": LabTestPackage.objects.count(),
                "health_checks": HealthCheckBundle.objects.count(),
                "radiology": RadiologyService.objects.count(),
                "radiology_bookings": ScanBooking.objects.count(),
                "scan_bookings": ScanBooking.objects.count(),
                "bookings": bookings.count(),
                "bookings_by_status": {
                    status_key: bookings.filter(status=status_key).count()
                    for status_key, _label in LabBooking.Status.choices
                },
                "phlebotomists": Phlebotomist.objects.count(),
                "available_phlebotomists": Phlebotomist.objects.filter(
                    is_active=True, is_available=True
                ).count(),
            }
        )


class LabTestMetaView(APIView):
    permission_classes = ADMIN_PERMISSIONS

    def get(self, request):
        return Response(
            {
                "patients": [
                    {"id": str(patient.pk), "name": patient.name}
                    for patient in CarePatient.objects.order_by("name")[:1000]
                ],
                "centres": list(
                    HealthcareProvider.objects.filter(
                        provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
                        status=HealthcareProvider.Status.ACTIVE,
                    )
                    .order_by("name")
                    .values("id", "name")
                ),
                "phlebotomists": [
                    {
                        "id": person.pk,
                        "name": person.name,
                        "phone": person.phone,
                        "email": person.email,
                        "is_active": person.is_active,
                        "is_available": person.is_available,
                        "available": True,
                    }
                    for person in Phlebotomist.objects.filter(
                        is_active=True, is_available=True
                    ).order_by("name")
                ],
                "tests": list(
                    LabTest.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name", "code", "biomarker_count", "price")
                ),
                "packages": list(
                    LabTestPackage.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name", "price")
                ),
                "health_checks": list(
                    HealthCheckBundle.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name", "price")
                ),
                "organ_categories": list(
                    OrganProfileCategory.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name")
                ),
            }
        )


class LabTestViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestSerializer
    permission_classes = ADMIN_PERMISSIONS

    def get_queryset(self):
        rows = LabTest.objects.prefetch_related("categories")
        category = self.request.query_params.get("category")
        organ_category = self.request.query_params.get("organ_category")
        search = self.request.query_params.get("search", "").strip()[:100]
        active = self.request.query_params.get("active")
        if category:
            rows = rows.filter(categories__pk=category)
        if organ_category:
            rows = rows.filter(organ_categories__pk=organ_category)
        if search:
            rows = rows.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
                | Q(categories__name__icontains=search)
                | Q(organ_categories__name__icontains=search)
            )
        if active in {"true", "false"}:
            rows = rows.filter(is_active=(active == "true"))
        return rows.distinct()

    def perform_create(self, serializer):
        test = serializer.save()
        audit_lab_action(
            self.request, "create", "lab_test", test.pk, f"Created lab test {test.name}"
        )

    def perform_destroy(self, instance):
        if (
            instance.bookings.exists()
            or instance.multi_bookings.exists()
            or instance.packages.exists()
            or instance.health_check_bundles.exists()
        ):
            raise ValidationError(
                {
                    "error": (
                        "Remove this test from bookings, packages, and health check "
                        "bundles before deleting it."
                    )
                }
            )
        super().perform_destroy(instance)


class LabTestCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestCategorySerializer
    permission_classes = ADMIN_PERMISSIONS

    def get_queryset(self):
        return LabTestCategory.objects.annotate(test_count=Count("tests", distinct=True))

    def perform_create(self, serializer):
        category = serializer.save()
        audit_lab_action(
            self.request,
            "create",
            "lab_test_category",
            category.pk,
            f"Created lab test category {category.name}",
        )

    def perform_destroy(self, instance):
        if instance.tests.exists():
            raise ValidationError({"error": "Remove tests from this category before deleting it."})
        super().perform_destroy(instance)


class OrganProfileCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = OrganProfileCategorySerializer
    permission_classes = ADMIN_PERMISSIONS

    def get_queryset(self):
        return OrganProfileCategory.objects.annotate(
            test_count=Count("tests", distinct=True)
        )

    def perform_destroy(self, instance):
        if instance.tests.exists():
            raise ValidationError(
                {"error": "Remove tests from this organ category before deleting it."}
            )
        super().perform_destroy(instance)


class LabTestPackageViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestPackageSerializer
    permission_classes = ADMIN_PERMISSIONS

    def get_queryset(self):
        return LabTestPackage.objects.prefetch_related("tests")

    def perform_create(self, serializer):
        package = serializer.save()
        audit_lab_action(
            self.request,
            "create",
            "lab_test_package",
            package.pk,
            f"Created lab test package {package.name}",
        )

    def perform_destroy(self, instance):
        if instance.bookings.exists() or instance.multi_bookings.exists():
            raise ValidationError(
                {"error": "Packages used by bookings cannot be deleted."}
            )
        super().perform_destroy(instance)


class HealthCheckBundleViewSet(viewsets.ModelViewSet):
    serializer_class = HealthCheckBundleSerializer
    permission_classes = ADMIN_PERMISSIONS

    def get_queryset(self):
        return HealthCheckBundle.objects.prefetch_related("tests")

    def perform_create(self, serializer):
        bundle = serializer.save()
        audit_lab_action(
            self.request,
            "create",
            "health_check_bundle",
            bundle.pk,
            f"Created health check bundle {bundle.name}",
        )

    def perform_destroy(self, instance):
        if instance.bookings.exists():
            raise ValidationError(
                {"error": "Bundles used by bookings cannot be deleted."}
            )
        super().perform_destroy(instance)


class RadiologyServiceViewSet(viewsets.ModelViewSet):
    serializer_class = RadiologyServiceSerializer
    permission_classes = ADMIN_PERMISSIONS
    queryset = RadiologyService.objects.select_related("centre")

    def get_queryset(self):
        rows = super().get_queryset()
        centre = self.request.query_params.get("centre")
        if centre:
            rows = rows.filter(centre_id=centre)
        return rows

    def perform_destroy(self, instance):
        if instance.bookings.exists():
            raise ValidationError(
                {"error": "Radiology services used by bookings cannot be deleted."}
            )
        super().perform_destroy(instance)


class ScanBookingViewSet(viewsets.ModelViewSet):
    serializer_class = ScanBookingSerializer
    permission_classes = ADMIN_PERMISSIONS
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        rows = ScanBooking.objects.select_related(
            "patient", "centre", "radiology_service"
        )
        status_filter = self.request.query_params.get("status")
        patient = self.request.query_params.get("patient_id")
        centre = self.request.query_params.get("centre_id")
        if status_filter:
            rows = rows.filter(status=status_filter)
        if patient:
            rows = rows.filter(patient_id=patient)
        if centre:
            rows = rows.filter(centre_id=centre)
        return rows

    def perform_destroy(self, instance):
        if instance.report_file:
            raise ValidationError(
                {"error": "Scan bookings with an uploaded report cannot be deleted."}
            )
        super().perform_destroy(instance)

    def perform_create(self, serializer):
        booking = serializer.save(status=ScanBooking.Status.BOOKED)
        audit_lab_action(
            self.request,
            "create",
            "scan_booking",
            booking.pk,
            f"Booked {booking.radiology_service.name} for {booking.patient.name}",
        )

    def perform_update(self, serializer):
        if serializer.instance.status != ScanBooking.Status.BOOKED:
            raise ValidationError({"status": "Only booked scans can be edited."})
        serializer.save()

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transition(self, request, pk=None):
        booking = self.get_object()
        target_status = request.data.get("status")
        allowed_transitions = {
            ScanBooking.Status.BOOKED: {
                ScanBooking.Status.SCHEDULED,
                ScanBooking.Status.CANCELLED,
            },
            ScanBooking.Status.SCHEDULED: {
                ScanBooking.Status.DONE,
                ScanBooking.Status.CANCELLED,
            },
        }
        if target_status not in allowed_transitions.get(booking.status, set()):
            raise ValidationError(
                {"status": "Invalid scan transition. Expected Booked → Scheduled → Done."}
            )
        booking.status = target_status
        if target_status == ScanBooking.Status.DONE:
            booking.completed_at = timezone.now()
            booking.save(update_fields=["status", "completed_at", "updated_at"])
        else:
            booking.save(update_fields=["status", "updated_at"])
        if target_status == ScanBooking.Status.CANCELLED:
            ensure_refund_for_cancelled_order(
                "scan", booking.pk, f"Cancellation of scan booking {booking.pk}"
            )
        audit_lab_action(
            request,
            "scan_transition",
            "scan_booking",
            booking.pk,
            f"Changed scan booking {booking.pk} to {booking.status}",
        )
        return Response(self.get_serializer(booking).data)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def report(self, request, pk=None):
        booking = self.get_object()
        if booking.status != ScanBooking.Status.DONE:
            raise ValidationError(
                {"status": "A scan report can only be uploaded after the scan is done."}
            )
        serializer = LabReportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking.report_file = serializer.validated_data["file"]
        booking.status = ScanBooking.Status.REPORT_UPLOADED
        booking.completed_at = booking.completed_at or timezone.now()
        booking.save(update_fields=["report_file", "status", "completed_at", "updated_at"])
        audit_lab_action(
            request,
            "scan_report_upload",
            "scan_booking",
            booking.pk,
            f"Uploaded scan report for booking {booking.pk}",
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["get"], url_path="report-file")
    def report_file(self, request, pk=None):
        booking = self.get_object()
        if not booking.report_file:
            raise ValidationError({"report": "No scan report has been uploaded."})
        return FileResponse(
            booking.report_file.open("rb"),
            content_type="application/pdf",
            filename=f"scan-report-{booking.pk}.pdf",
        )


class PhlebotomistViewSet(viewsets.ModelViewSet):
    serializer_class = PhlebotomistSerializer
    permission_classes = ADMIN_PERMISSIONS
    queryset = Phlebotomist.objects.all()

    def get_queryset(self):
        rows = super().get_queryset()
        available = self.request.query_params.get("available")
        if available == "true":
            rows = rows.filter(is_active=True, is_available=True)
        elif available == "false":
            rows = rows.filter(Q(is_active=False) | Q(is_available=False))
        return rows

    def perform_destroy(self, instance):
        if instance.lab_bookings.exists():
            raise ValidationError(
                {"error": "Phlebotomists with booking history cannot be deleted."}
            )
        super().perform_destroy(instance)


class LabBookingViewSet(viewsets.ModelViewSet):
    serializer_class = LabBookingSerializer
    permission_classes = ADMIN_PERMISSIONS
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        rows = LabBooking.objects.select_related(
            "patient",
            "lab_test",
            "lab_package",
            "health_check_bundle",
            "centre",
            "assigned_phlebotomist",
        )
        status_filter = self.request.query_params.get("status")
        patient = self.request.query_params.get("patient_id")
        if status_filter:
            rows = rows.filter(status=status_filter)
        if patient:
            rows = rows.filter(patient_id=patient)
        return rows

    def perform_destroy(self, instance):
        if instance.report_file:
            raise ValidationError(
                {"error": "Bookings with an uploaded report cannot be deleted."}
            )
        super().perform_destroy(instance)

    @transaction.atomic
    def perform_create(self, serializer):
        values = serializer.validated_data
        scheduled_at = values.get("scheduled_at")
        if scheduled_at is None:
            raise ValidationError({"scheduled_at": "This field is required."})
        tests = list(values.get("lab_tests", []))
        packages = list(values.get("lab_packages", []))
        if values.get("lab_test"):
            tests.append(values["lab_test"])
        if values.get("lab_package"):
            packages.append(values["lab_package"])
        bundle = values.get("health_check_bundle")
        selected_names = [item.name for item in tests + packages]
        if bundle:
            selected_names.append(bundle.name)
        name = ", ".join(dict.fromkeys(selected_names))
        selected_prices = {
            ("test", item.pk): item.price for item in tests
        } | {
            ("package", item.pk): item.price for item in packages
        }
        if bundle:
            selected_prices[("bundle", bundle.pk)] = bundle.price
        subtotal = sum(selected_prices.values(), Decimal("0.00"))
        subscription = active_plan_subscription(values["patient"])
        plan_discount = Decimal("0.00")
        if subscription and subscription.plan.lab_discount_percent:
            plan_discount = (
                subtotal
                * subscription.plan.lab_discount_percent
                / Decimal("100")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total = max(Decimal("0.00"), subtotal - plan_discount)
        phlebotomist = values.get("assigned_phlebotomist")
        if phlebotomist:
            self._assert_phlebotomist_available(phlebotomist, scheduled_at)
        booking = serializer.save(
            test_name=name,
            specimen_date=scheduled_at.date(),
            status=LabBooking.Status.ASSIGNED if phlebotomist else LabBooking.Status.BOOKED,
            phlebotomist=phlebotomist.name if phlebotomist else "",
            subtotal=subtotal,
            plan_discount=plan_discount,
            total=total,
            lab_test=tests[0] if len(tests) == 1 and not packages and not bundle else None,
            lab_package=(
                packages[0] if len(packages) == 1 and not tests and not bundle else None
            ),
        )
        if phlebotomist:
            phlebotomist.is_available = False
            phlebotomist.save(update_fields=["is_available", "updated_at"])
        if subscription and plan_discount:
            record_benefit_usage(
                subscription,
                "lab_discount",
                "lab_booking",
                booking.pk,
                detail=f"Applied {subscription.plan.lab_discount_percent}% plan discount.",
            )
        audit_lab_action(
            self.request,
            "create",
            "lab_booking",
            booking.pk,
            f"Booked {booking.test_name} for {booking.patient.name}",
        )

    def perform_update(self, serializer):
        booking = serializer.instance
        if booking.status != LabBooking.Status.BOOKED:
            raise ValidationError({"status": "Only booked lab visits can be edited."})
        values = serializer.validated_data
        update_fields = {}
        if "lab_tests" in values:
            update_fields["lab_test"] = None
        if "lab_packages" in values:
            update_fields["lab_package"] = None
        booking = serializer.save(**update_fields)
        booking.refresh_from_db()
        names = list(booking.lab_tests.values_list("name", flat=True))
        names.extend(booking.lab_packages.values_list("name", flat=True))
        if booking.lab_test_id:
            names.append(booking.lab_test.name)
        if booking.lab_package_id:
            names.append(booking.lab_package.name)
        if booking.health_check_bundle_id:
            names.append(booking.health_check_bundle.name)
        booking.test_name = ", ".join(dict.fromkeys(names))
        if booking.scheduled_at:
            booking.specimen_date = booking.scheduled_at.date()
        booking.save(update_fields=["test_name", "specimen_date"])

    def _assert_phlebotomist_available(self, phlebotomist, scheduled_at):
        if not phlebotomist.is_active or not phlebotomist.is_available:
            raise ValidationError(
                {"phlebotomist_id": "This phlebotomist is not available."}
            )
        conflict = LabBooking.objects.filter(
            assigned_phlebotomist=phlebotomist,
            scheduled_at=scheduled_at,
            status__in=(
                LabBooking.Status.ASSIGNED,
                LabBooking.Status.COLLECTED,
                LabBooking.Status.IN_LAB,
            ),
        ).exists()
        if conflict:
            raise ValidationError(
                {"phlebotomist_id": "This phlebotomist already has a booking at this time."}
            )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def assign(self, request, pk=None):
        booking = self.get_object()
        if booking.status != LabBooking.Status.BOOKED:
            raise ValidationError({"status": "Only booked samples can be assigned."})
        phlebotomist_id = request.data.get("phlebotomist_id")
        if not phlebotomist_id:
            raise ValidationError({"phlebotomist_id": "This field is required."})
        phlebotomist = get_object_or_404(
            Phlebotomist.objects.select_for_update(), pk=phlebotomist_id
        )
        self._assert_phlebotomist_available(phlebotomist, booking.scheduled_at)
        booking.assigned_phlebotomist = phlebotomist
        booking.phlebotomist = phlebotomist.name
        booking.status = LabBooking.Status.ASSIGNED
        booking.save(update_fields=["assigned_phlebotomist", "phlebotomist", "status"])
        phlebotomist.is_available = False
        phlebotomist.save(update_fields=["is_available", "updated_at"])
        audit_lab_action(
            request,
            "assign",
            "lab_booking",
            booking.pk,
            f"Assigned {phlebotomist.name} to lab booking {booking.pk}",
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transition(self, request, pk=None):
        booking = self.get_object()
        target = request.data.get("status")
        allowed_next = {
            LabBooking.Status.ASSIGNED: LabBooking.Status.COLLECTED,
            LabBooking.Status.COLLECTED: LabBooking.Status.IN_LAB,
        }
        if target == LabBooking.Status.CANCELLED:
            if booking.status not in {
                LabBooking.Status.BOOKED,
                LabBooking.Status.ASSIGNED,
                LabBooking.Status.COLLECTED,
                LabBooking.Status.IN_LAB,
            }:
                raise ValidationError({"status": "This booking cannot be cancelled."})
            booking.status = target
            if booking.assigned_phlebotomist_id:
                Phlebotomist.objects.filter(pk=booking.assigned_phlebotomist_id).update(
                    is_available=True
                )
        elif allowed_next.get(booking.status) == target:
            booking.status = target
        else:
            raise ValidationError(
                {"status": "Invalid status transition. Assign and upload the report using their actions."}
            )
        booking.save(update_fields=["status"])
        if target == LabBooking.Status.CANCELLED:
            ensure_refund_for_cancelled_order(
                "lab", booking.pk, f"Cancellation of lab booking {booking.pk}"
            )
        audit_lab_action(
            request,
            "transition",
            "lab_booking",
            booking.pk,
            f"Changed lab booking {booking.pk} to {booking.status}",
        )
        return Response(self.get_serializer(booking).data)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
    )
    @transaction.atomic
    def report(self, request, pk=None):
        booking = self.get_object()
        if booking.status != LabBooking.Status.IN_LAB:
            raise ValidationError({"status": "Reports can only be uploaded for samples in the lab."})
        serializer = LabReportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        booking.report_file = uploaded_file
        booking.status = LabBooking.Status.REPORT_READY
        booking.completed_at = timezone.now()
        booking.save(update_fields=["report_file", "status", "completed_at"])
        if booking.assigned_phlebotomist_id:
            Phlebotomist.objects.filter(pk=booking.assigned_phlebotomist_id).update(
                is_available=True
            )
        log_action(
            request,
            action="report_ready",
            module="lab_tests",
            target_type="lab_booking",
            target_id=booking.pk,
            description=(
                f"Lab report ready for {booking.patient.name}: {booking.test_name}"
            ),
            metadata={
                "booking_id": booking.pk,
                "patient_id": str(booking.patient_id),
                "patient_name": booking.patient.name,
                "report_status": booking.status,
            },
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["get"], url_path="report-file")
    def report_file(self, request, pk=None):
        booking = self.get_object()
        if not booking.report_file:
            raise ValidationError({"report": "No report has been uploaded."})
        return FileResponse(
            booking.report_file.open("rb"),
            content_type="application/pdf",
            filename=f"lab-report-{booking.pk}.pdf",
        )


class DiagnosticCentreListView(APIView):
    permission_classes = ADMIN_PERMISSIONS

    def get(self, request):
        centres = HealthcareProvider.objects.filter(
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE
        ).order_by("name")
        return Response(
            [
                {"id": centre.pk, "name": centre.name, "status": centre.status}
                for centre in centres
            ]
        )
