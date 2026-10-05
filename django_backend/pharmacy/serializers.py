from decimal import Decimal

from rest_framework import serializers

from care.models import CarePatient
from dashboard.models import PlatformUser
from health_records.models import PrescriptionUpload
from providers.models import HealthcareProvider

from .models import (
    PharmacyBatch,
    PharmacyBrand,
    PharmacyCategory,
    PharmacyDeliveryAssignment,
    PharmacyOrder,
    PharmacyOrderLine,
    PharmacyProduct,
)


class PharmacyCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PharmacyCategory
        fields = ("id", "name", "description", "is_active", "product_count")


class PharmacyBrandSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PharmacyBrand
        fields = ("id", "name", "country", "is_active", "product_count")


class PharmacyProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    partner_pharmacy_name = serializers.CharField(
        source="partner_pharmacy.name", read_only=True, allow_null=True
    )
    selling_price = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyProduct
        fields = (
            "id",
            "name",
            "brand",
            "brand_name",
            "category",
            "category_name",
            "pack_size",
            "mrp",
            "discount_percent",
            "selling_price",
            "image_url",
            "description",
            "stock",
            "stock_status",
            "low_stock_threshold",
            "rx_required",
            "is_active",
            "partner_pharmacy",
            "partner_pharmacy_name",
        )

    def get_selling_price(self, instance):
        return instance.selling_price

    def get_stock(self, instance):
        if hasattr(instance, "available_stock"):
            return instance.available_stock or 0
        return instance.stock

    def get_stock_status(self, instance):
        stock = self.get_stock(instance)
        if stock == 0:
            return "out_of_stock"
        if stock <= instance.low_stock_threshold:
            return "low_stock"
        return "in_stock"

    def validate_partner_pharmacy(self, value):
        if value and value.provider_type != HealthcareProvider.ProviderType.PHARMACY:
            raise serializers.ValidationError("Choose a pharmacy partner.")
        return value

    def validate_mrp(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("MRP must be greater than zero.")
        return value


class PharmacyBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    expiry_status = serializers.CharField(read_only=True)

    class Meta:
        model = PharmacyBatch
        fields = (
            "id",
            "product",
            "product_name",
            "batch_number",
            "expiry_date",
            "quantity",
            "expiry_status",
        )

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("A new batch must contain at least one unit.")
        return value


class PharmacyPrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    reviewer_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file = serializers.FileField(
        write_only=True, required=False, allow_empty_file=False
    )

    class Meta:
        model = PrescriptionUpload
        fields = (
            "id",
            "patient",
            "patient_name",
            "prescription_number",
            "doctor_name",
            "diagnosis",
            "medicines",
            "instructions",
            "issued_on",
            "status",
            "pdf_url",
            "file_url",
            "file",
            "internal_notes",
            "rejection_reason",
            "reviewer_name",
            "reviewed_at",
            "created_at",
        )
        read_only_fields = (
            "status",
            "rejection_reason",
            "reviewer_name",
            "reviewed_at",
            "created_at",
        )

    def get_reviewer_name(self, instance):
        if not instance.reviewed_by:
            return ""
        return instance.reviewed_by.get_full_name().strip() or instance.reviewed_by.username

    def get_file_url(self, instance):
        return f"/api/admin/pharmacy/prescriptions/{instance.pk}/file/" if instance.file else ""

    def validate_file(self, uploaded_file):
        extension = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
        if extension not in {"pdf", "jpg", "jpeg", "png"}:
            raise serializers.ValidationError("Upload a PDF, JPG, JPEG, or PNG prescription.")
        if uploaded_file.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Prescription files must be 10 MB or smaller.")
        return uploaded_file


class PharmacyOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyOrderLine
        fields = (
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_mrp",
            "unit_price",
            "line_subtotal",
            "line_discount",
            "line_total",
        )


class PharmacyDeliverySerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source="partner.name", read_only=True, allow_null=True)

    class Meta:
        model = PharmacyDeliveryAssignment
        fields = ("id", "partner", "partner_name", "eta", "status", "updated_at")
        read_only_fields = ("id", "status", "updated_at")


class PharmacyOrderSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    coupon_code = serializers.CharField(source="coupon.code", read_only=True, allow_null=True)
    items = PharmacyOrderLineSerializer(many=True, read_only=True)
    delivery = PharmacyDeliverySerializer(read_only=True)
    prescription_ids = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyOrder
        fields = (
            "id",
            "order_number",
            "patient",
            "patient_name",
            "items",
            "address",
            "coupon",
            "coupon_code",
            "prescription_ids",
            "payment_method",
            "payment_status",
            "status",
            "subtotal",
            "product_discount",
            "plan_discount",
            "coupon_discount",
            "delivery_fee",
            "tax",
            "total",
            "invoice_number",
            "invoice_issued_at",
            "delivery",
            "created_at",
        )

    def get_prescription_ids(self, instance):
        return list(instance.prescriptions.values_list("id", flat=True))


class PharmacyOrderLineInputSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=PharmacyProduct.objects.filter(is_active=True)
    )
    quantity = serializers.IntegerField(min_value=1, max_value=10000)


class PharmacyOrderCreateSerializer(serializers.Serializer):
    patient_id = serializers.PrimaryKeyRelatedField(
        source="patient", queryset=CarePatient.objects.all()
    )
    address = serializers.CharField(max_length=2000)
    items = PharmacyOrderLineInputSerializer(many=True, allow_empty=False)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    prescription_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=PrescriptionUpload.objects.all(),
        required=False,
        allow_empty=True,
    )
    payment_method = serializers.ChoiceField(choices=PharmacyOrder.PaymentMethod.choices)
    delivery_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )

    def validate(self, attrs):
        products = [line["product"].pk for line in attrs["items"]]
        if len(products) != len(set(products)):
            raise serializers.ValidationError(
                {"items": "Add each product once and update its quantity instead."}
            )
        if not attrs["address"].strip():
            raise serializers.ValidationError({"address": "A delivery address is required."})
        return attrs


class PharmacyDeliveryUpdateSerializer(serializers.Serializer):
    partner_id = serializers.PrimaryKeyRelatedField(
        source="partner",
        queryset=PlatformUser.objects.filter(
            role=PlatformUser.Role.PARTNER, is_active=True, is_blocked=False
        ),
        required=False,
    )
    eta = serializers.DateTimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=PharmacyDeliveryAssignment.Status.choices, required=False
    )
