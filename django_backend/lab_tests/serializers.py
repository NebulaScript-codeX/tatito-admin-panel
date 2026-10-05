from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers

from care.models import CarePatient
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


class LabTestCategorySerializer(serializers.ModelSerializer):
    test_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LabTestCategory
        fields = ("id", "name", "description", "is_active", "test_count")


class OrganProfileCategorySerializer(serializers.ModelSerializer):
    test_count = serializers.SerializerMethodField()
    test_ids = serializers.PrimaryKeyRelatedField(
        source="tests",
        queryset=LabTest.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    tests = serializers.SerializerMethodField()

    class Meta:
        model = OrganProfileCategory
        fields = (
            "id",
            "name",
            "description",
            "is_active",
            "test_ids",
            "tests",
            "test_count",
        )

    def get_tests(self, instance):
        return [
            {"id": test.pk, "name": test.name, "code": test.code}
            for test in instance.tests.all()
        ]

    def get_test_count(self, instance):
        return instance.tests.count()


class LabTestSerializer(serializers.ModelSerializer):
    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre",
        queryset=HealthcareProvider.objects.filter(
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.ACTIVE,
        ),
        required=False,
        allow_null=True,
    )
    centre_name = serializers.CharField(source="centre.name", read_only=True, allow_null=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        source="categories",
        queryset=LabTestCategory.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    categories = serializers.SerializerMethodField()
    organ_category_ids = serializers.PrimaryKeyRelatedField(
        source="organ_categories",
        queryset=OrganProfileCategory.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    organ_categories = serializers.SerializerMethodField()

    class Meta:
        model = LabTest
        fields = (
            "id",
            "name",
            "code",
            "centre_id",
            "centre_name",
            "category_ids",
            "categories",
            "organ_category_ids",
            "organ_categories",
            "specimen",
            "fasting_required",
            "turnaround_hours",
            "biomarker_count",
            "price",
            "mrp",
            "discount_percent",
            "is_active",
        )

    def get_categories(self, instance):
        return [
            {"id": category.pk, "name": category.name}
            for category in instance.categories.all()
        ]

    def get_organ_categories(self, instance):
        return [
            {"id": category.pk, "name": category.name}
            for category in instance.organ_categories.all()
        ]

    def validate_code(self, value):
        value = value.strip().upper()
        queryset = LabTest.objects.filter(code__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A lab test with this code already exists.")
        return value

    def validate_biomarker_count(self, value):
        if value < 1:
            raise serializers.ValidationError("A lab test must contain at least one biomarker.")
        return value

    def validate(self, attrs):
        mrp = attrs.get("mrp", self.instance.mrp if self.instance else None)
        discount = attrs.get(
            "discount_percent",
            self.instance.discount_percent if self.instance else Decimal("0.00"),
        )
        if mrp is not None:
            attrs["price"] = (mrp * (Decimal("100") - discount) / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        return attrs


class LabTestPackageSerializer(serializers.ModelSerializer):
    test_ids = serializers.PrimaryKeyRelatedField(
        source="tests",
        queryset=LabTest.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    tests = serializers.SerializerMethodField()
    biomarker_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LabTestPackage
        fields = (
            "id",
            "name",
            "description",
            "badge",
            "test_ids",
            "tests",
            "biomarker_count",
            "price",
            "discount_percent",
            "turnaround_hours",
            "is_active",
        )

    def get_tests(self, instance):
        return [
            {"id": test.pk, "name": test.name, "code": test.code}
            for test in instance.tests.all()
        ]

    def validate(self, attrs):
        if "tests" in attrs and not attrs["tests"]:
            raise serializers.ValidationError("A package must include at least one lab test.")
        if self.instance is None and not attrs.get("tests"):
            raise serializers.ValidationError(
                {"test_ids": "A package must include at least one lab test."}
            )
        return attrs


class HealthCheckBundleSerializer(serializers.ModelSerializer):
    test_ids = serializers.PrimaryKeyRelatedField(
        source="tests",
        queryset=LabTest.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    tests = serializers.SerializerMethodField()
    test_count = serializers.IntegerField(read_only=True)
    biomarker_count = serializers.IntegerField(read_only=True)
    calculated_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = HealthCheckBundle
        fields = (
            "id",
            "name",
            "description",
            "recommended_target",
            "test_ids",
            "tests",
            "test_count",
            "biomarker_count",
            "calculated_price",
            "price",
            "is_active",
        )

    def get_tests(self, instance):
        return [
            {"id": test.pk, "name": test.name, "code": test.code}
            for test in instance.tests.all()
        ]

    def validate(self, attrs):
        if "tests" in attrs and not attrs["tests"]:
            raise serializers.ValidationError("A health check bundle must include at least one test.")
        if self.instance is None and not attrs.get("tests"):
            raise serializers.ValidationError(
                {"test_ids": "A health check bundle must include at least one test."}
            )
        return attrs


class RadiologyServiceSerializer(serializers.ModelSerializer):
    centre_name = serializers.CharField(source="centre.name", read_only=True)

    class Meta:
        model = RadiologyService
        fields = (
            "id",
            "name",
            "centre",
            "centre_name",
            "modality",
            "description",
            "price",
            "turnaround_hours",
            "is_active",
        )

    def validate_centre(self, value):
        if value.provider_type != HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE:
            raise serializers.ValidationError("Choose a diagnostic centre.")
        if value.status != HealthcareProvider.Status.ACTIVE:
            raise serializers.ValidationError("Choose an active diagnostic centre.")
        return value


class ScanBookingSerializer(serializers.ModelSerializer):
    patient_id = serializers.PrimaryKeyRelatedField(
        source="patient", queryset=CarePatient.objects.all()
    )
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre",
        queryset=HealthcareProvider.objects.filter(
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.ACTIVE,
        ),
    )
    centre_name = serializers.CharField(source="centre.name", read_only=True)
    radiology_service_id = serializers.PrimaryKeyRelatedField(
        source="radiology_service",
        queryset=RadiologyService.objects.filter(is_active=True),
    )
    service_name = serializers.CharField(
        source="radiology_service.name", read_only=True
    )
    modality = serializers.CharField(source="radiology_service.modality", read_only=True)
    price = serializers.DecimalField(
        source="radiology_service.price", max_digits=10, decimal_places=2, read_only=True
    )
    report_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = ScanBooking
        fields = (
            "id",
            "patient_id",
            "patient_name",
            "centre_id",
            "centre_name",
            "radiology_service_id",
            "service_name",
            "modality",
            "price",
            "scheduled_at",
            "notes",
            "status",
            "report_pdf_url",
            "completed_at",
        )
        read_only_fields = ("status", "completed_at")

    def validate(self, attrs):
        centre = attrs.get("centre", self.instance.centre if self.instance else None)
        service = attrs.get(
            "radiology_service",
            self.instance.radiology_service if self.instance else None,
        )
        if centre and service and service.centre_id != centre.pk:
            raise serializers.ValidationError(
                {"radiology_service_id": "Choose a radiology service at the selected centre."}
            )
        scheduled_at = attrs.get(
            "scheduled_at", self.instance.scheduled_at if self.instance else None
        )
        if scheduled_at and scheduled_at <= timezone.now():
            raise serializers.ValidationError(
                {"scheduled_at": "Choose a scan time in the future."}
            )
        return attrs

    def get_report_pdf_url(self, instance):
        if not instance.report_file:
            return ""
        return (
            f"/api/admin/lab-tests/radiology-bookings/{instance.pk}/report-file/"
        )


class PhlebotomistSerializer(serializers.ModelSerializer):
    available = serializers.SerializerMethodField()

    class Meta:
        model = Phlebotomist
        fields = (
            "id",
            "name",
            "phone",
            "email",
            "is_active",
            "is_available",
            "available",
        )

    def get_available(self, instance):
        return bool(instance.is_active and instance.is_available)


class LabBookingSerializer(serializers.ModelSerializer):
    patient_id = serializers.PrimaryKeyRelatedField(
        source="patient", queryset=CarePatient.objects.all()
    )
    address = serializers.CharField(max_length=500, allow_blank=False)
    time_slot = serializers.CharField(max_length=100, allow_blank=False)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    test_id = serializers.PrimaryKeyRelatedField(
        source="lab_test",
        queryset=LabTest.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    package_id = serializers.PrimaryKeyRelatedField(
        source="lab_package",
        queryset=LabTestPackage.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    test_ids = serializers.PrimaryKeyRelatedField(
        source="lab_tests",
        queryset=LabTest.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    package_ids = serializers.PrimaryKeyRelatedField(
        source="lab_packages",
        queryset=LabTestPackage.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    health_check_id = serializers.PrimaryKeyRelatedField(
        source="health_check_bundle",
        queryset=HealthCheckBundle.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre",
        queryset=HealthcareProvider.objects.filter(
            provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE,
            status=HealthcareProvider.Status.ACTIVE,
        ),
    )
    phlebotomist_id = serializers.PrimaryKeyRelatedField(
        source="assigned_phlebotomist",
        queryset=Phlebotomist.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    test_name = serializers.CharField(read_only=True)
    tests = serializers.SerializerMethodField()
    packages = serializers.SerializerMethodField()
    phlebotomist_name = serializers.CharField(
        source="assigned_phlebotomist.name", read_only=True, allow_null=True
    )
    centre_name = serializers.CharField(source="centre.name", read_only=True)
    report_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = LabBooking
        fields = (
            "id",
            "patient_id",
            "patient_name",
            "test_id",
            "package_id",
            "test_ids",
            "tests",
            "package_ids",
            "packages",
            "health_check_id",
            "test_name",
            "centre_id",
            "centre_name",
            "scheduled_at",
            "address",
            "time_slot",
            "specimen_date",
            "subtotal",
            "plan_discount",
            "total",
            "status",
            "phlebotomist_id",
            "phlebotomist_name",
            "report_pdf_url",
            "completed_at",
        )
        read_only_fields = (
            "specimen_date",
            "subtotal",
            "plan_discount",
            "total",
            "status",
            "completed_at",
        )

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields["phlebotomist_id"].read_only = True
        return fields

    def validate(self, attrs):
        if "lab_tests" in attrs and attrs.get("lab_test") is not None:
            raise serializers.ValidationError(
                {"test_ids": "Use either test_ids or legacy test_id, not both."}
            )
        if "lab_packages" in attrs and attrs.get("lab_package") is not None:
            raise serializers.ValidationError(
                {"package_ids": "Use either package_ids or legacy package_id, not both."}
            )

        selected_tests = attrs.get("lab_tests")
        if selected_tests is None:
            legacy_test = attrs.get(
                "lab_test", self.instance.lab_test if self.instance else None
            )
            selected_tests = [legacy_test] if legacy_test else []
            if self.instance and "lab_tests" not in attrs:
                selected_tests.extend(self.instance.lab_tests.all())

        selected_packages = attrs.get("lab_packages")
        if selected_packages is None:
            legacy_package = attrs.get(
                "lab_package", self.instance.lab_package if self.instance else None
            )
            selected_packages = [legacy_package] if legacy_package else []
            if self.instance and "lab_packages" not in attrs:
                selected_packages.extend(self.instance.lab_packages.all())

        health_check = attrs.get(
            "health_check_bundle",
            self.instance.health_check_bundle if self.instance else None,
        )
        selection_count = len({test.pk for test in selected_tests})
        selection_count += len({package.pk for package in selected_packages})
        if health_check:
            selection_count += 1
        if selection_count < 1:
            raise serializers.ValidationError(
                {
                    "test_ids": "Select at least one test, package, or health check."
                }
            )
        if health_check and (selected_tests or selected_packages):
            raise serializers.ValidationError(
                {
                    "health_check_id": (
                        "A health check cannot be combined with individual tests or packages."
                    )
                }
            )
        scheduled_at = attrs.get(
            "scheduled_at", self.instance.scheduled_at if self.instance else None
        )
        if scheduled_at is None:
            raise serializers.ValidationError(
                {"scheduled_at": "This field is required."}
            )
        if scheduled_at <= timezone.now():
            raise serializers.ValidationError(
                {"scheduled_at": "Choose a booking time in the future."}
            )
        return attrs

    def get_tests(self, instance):
        tests = {test.pk: test for test in instance.lab_tests.all()}
        if instance.lab_test_id:
            tests[instance.lab_test_id] = instance.lab_test
        return [
            {"id": test.pk, "name": test.name, "code": test.code}
            for test in sorted(tests.values(), key=lambda test: test.name)
        ]

    def get_packages(self, instance):
        packages = {package.pk: package for package in instance.lab_packages.all()}
        if instance.lab_package_id:
            packages[instance.lab_package_id] = instance.lab_package
        return [
            {"id": package.pk, "name": package.name}
            for package in sorted(packages.values(), key=lambda package: package.name)
        ]

    def get_report_pdf_url(self, instance):
        if instance.report_file:
            return f"/api/admin/lab-tests/bookings/{instance.pk}/report-file/"
        return instance.report_pdf_url


class LabReportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, uploaded_file):
        if uploaded_file.name.rsplit(".", 1)[-1].lower() != "pdf":
            raise serializers.ValidationError("Lab reports must be uploaded as a PDF.")
        if uploaded_file.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Lab reports must be 20 MB or smaller.")
        if not uploaded_file.read(5).startswith(b"%PDF"):
            raise serializers.ValidationError("The uploaded file is not a valid PDF.")
        uploaded_file.seek(0)
        return uploaded_file
