from decimal import Decimal, ROUND_HALF_UP
from mimetypes import guess_type

from django.conf import settings
from django.db import transaction
from django.db.models import Count, F, Q, Sum
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
from audit.services import log_action
from care.models import CarePatient
from commerce.plans import active_plan_subscription, record_benefit_usage
from dashboard.models import PlatformUser
from health_records.models import PrescriptionUpload
from marketing.models import Coupon
from providers.models import HealthcareProvider

from .models import (
    PharmacyBatch,
    PharmacyBrand,
    PharmacyCategory,
    PharmacyCouponUse,
    PharmacyDeliveryAssignment,
    PharmacyInventoryAdjustment,
    PharmacyOrder,
    PharmacyOrderBatchAllocation,
    PharmacyOrderLine,
    PharmacyProduct,
    PharmacyRefund,
)
from .serializers import (
    PharmacyBatchSerializer,
    PharmacyBrandSerializer,
    PharmacyCategorySerializer,
    PharmacyDeliveryUpdateSerializer,
    PharmacyOrderCreateSerializer,
    PharmacyOrderSerializer,
    PharmacyPrescriptionSerializer,
    PharmacyProductSerializer,
)


class PharmacyWorkflowPermission(ModulePermission):
    module = "pharmacy"

    def has_permission(self, request, view):
        view.module = self.module
        action_name = getattr(view, "action", "")
        if action_name in {
            "approve",
            "reject",
            "save_notes",
            "adjust",
            "advance",
            "update_delivery",
            "prescription_file",
        }:
            if action_name == "prescription_file":
                action = "view"
            else:
                action = "edit"
            return has_module_permission(request.user, self.module, action)
        return super().has_permission(request, view)


def _log_pharmacy_action(request, action, target_type, target_id, description, metadata=None):
    log_action(
        request,
        action,
        module="pharmacy",
        target_type=target_type,
        target_id=target_id,
        description=description,
        metadata=metadata or {},
    )


def _product_queryset():
    return (
        PharmacyProduct.objects.select_related(
            "category", "brand", "partner_pharmacy"
        )
        .annotate(
            available_stock=Sum(
                "inventory_batches__quantity",
                filter=Q(inventory_batches__expiry_date__gte=timezone.localdate()),
            )
        )
    )


class PharmacySummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]

    def get(self, request):
        counts = {
            "products": PharmacyProduct.objects.count(),
            "orders": PharmacyOrder.objects.count(),
            "prescriptions": PrescriptionUpload.objects.count(),
            "batches": PharmacyBatch.objects.count(),
            "delivery": PharmacyDeliveryAssignment.objects.count(),
            "categories": PharmacyCategory.objects.count(),
            "brands": PharmacyBrand.objects.count(),
        }
        return Response(counts)


class PharmacyMetaView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]

    def get(self, request):
        now = timezone.now()
        coupons = Coupon.objects.filter(
            is_active=True,
            applies_to__in=("pharmacy", "all"),
            start_date__lte=now,
            expiry_date__gt=now,
        ).order_by("code")
        available_coupons = [
            coupon
            for coupon in coupons
            if not coupon.is_fully_used
        ]
        patients = CarePatient.objects.all().order_by("name")[:500]
        return Response(
            {
                "patients": [
                    {"id": str(patient.pk), "name": patient.name}
                    for patient in patients
                ],
                "pharmacies": list(
                    HealthcareProvider.objects.filter(
                        provider_type=HealthcareProvider.ProviderType.PHARMACY,
                        status=HealthcareProvider.Status.ACTIVE,
                    )
                    .order_by("name")
                    .values("id", "name")
                ),
                "partners": list(
                    PlatformUser.objects.filter(
                        role=PlatformUser.Role.PARTNER,
                        is_active=True,
                        is_blocked=False,
                    )
                    .order_by("name")
                    .values("id", "name")
                ),
                "coupons": [
                    {"id": coupon.pk, "code": coupon.code}
                    for coupon in available_coupons
                ],
                "categories": list(
                    PharmacyCategory.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name")
                ),
                "brands": list(
                    PharmacyBrand.objects.filter(is_active=True)
                    .order_by("name")
                    .values("id", "name")
                ),
                "products": [
                    {
                        "id": product.pk,
                        "name": product.name,
                        "selling_price": str(product.selling_price),
                        "rx_required": product.rx_required,
                    }
                    for product in _product_queryset()
                    .filter(is_active=True)
                    .order_by("name")
                ],
            }
        )


class PharmacyProductViewSet(viewsets.ModelViewSet):
    serializer_class = PharmacyProductSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]

    def get_queryset(self):
        queryset = _product_queryset()
        search = self.request.query_params.get("search", "").strip()[:100]
        category = self.request.query_params.get("category")
        brand = self.request.query_params.get("brand")
        status_filter = self.request.query_params.get("status")
        stock_status = self.request.query_params.get("stock_status")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(brand__name__icontains=search)
                | Q(category__name__icontains=search)
                | Q(description__icontains=search)
            )
        if category:
            queryset = queryset.filter(category_id=category)
        if brand:
            queryset = queryset.filter(brand_id=brand)
        if status_filter in {"active", "inactive"}:
            queryset = queryset.filter(is_active=status_filter == "active")
        if stock_status == "out_of_stock":
            queryset = queryset.filter(
                Q(available_stock__isnull=True) | Q(available_stock=0)
            )
        elif stock_status == "low_stock":
            queryset = queryset.filter(
                available_stock__gt=0,
                available_stock__lte=F("low_stock_threshold"),
            )
        elif stock_status == "in_stock":
            queryset = queryset.filter(
                available_stock__gt=F("low_stock_threshold")
            )
        return queryset

    def perform_create(self, serializer):
        product = serializer.save()
        _log_pharmacy_action(
            self.request,
            "create",
            "pharmacy_product",
            product.pk,
            f"Added pharmacy product: {product.name}",
        )

    def perform_update(self, serializer):
        product = serializer.save()
        _log_pharmacy_action(
            self.request,
            "edit",
            "pharmacy_product",
            product.pk,
            f"Updated pharmacy product: {product.name}",
        )

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if product.inventory_batches.exists():
            raise ValidationError(
                {"error": "This product has inventory batches. Adjust or archive its batches first."}
            )
        if product.order_lines.exists():
            raise ValidationError(
                {"error": "This product appears in pharmacy orders and cannot be deleted."}
            )
        product_name = product.name
        product_id = product.pk
        product.delete()
        _log_pharmacy_action(
            request, "delete", "pharmacy_product", product_id, f"Deleted pharmacy product: {product_name}"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PharmacyCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = PharmacyCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]
    queryset = PharmacyCategory.objects.annotate(product_count=Count("products"))

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()[:100]
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return queryset

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.products.exists():
            raise ValidationError(
                {"error": "This category is used by products. Reassign those products before deleting it."}
            )
        return super().destroy(request, *args, **kwargs)


class PharmacyBrandViewSet(viewsets.ModelViewSet):
    serializer_class = PharmacyBrandSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]
    queryset = PharmacyBrand.objects.annotate(product_count=Count("products"))

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()[:100]
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(country__icontains=search))
        return queryset

    def destroy(self, request, *args, **kwargs):
        brand = self.get_object()
        if brand.products.exists():
            raise ValidationError(
                {"error": "This brand is used by products. Reassign those products before deleting it."}
            )
        return super().destroy(request, *args, **kwargs)


class PharmacyBatchViewSet(viewsets.ModelViewSet):
    serializer_class = PharmacyBatchSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]
    queryset = PharmacyBatch.objects.select_related("product")
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get("product")
        search = self.request.query_params.get("search", "").strip()[:100]
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(batch_number__icontains=search)
            )
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        _log_pharmacy_action(
            request,
            "create",
            "pharmacy_batch",
            batch.pk,
            f"Added inventory batch {batch.batch_number} for {batch.product.name}",
        )
        return Response(self.get_serializer(batch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        with transaction.atomic():
            batch = get_object_or_404(
                PharmacyBatch.objects.select_for_update().select_related("product"), pk=pk
            )
            try:
                delta = int(request.data.get("delta"))
            except (TypeError, ValueError):
                raise ValidationError({"delta": "Enter a non-zero whole-number adjustment."})
            reason = str(request.data.get("reason") or "").strip()
            if delta == 0:
                raise ValidationError({"delta": "Adjustment must not be zero."})
            if not reason:
                raise ValidationError({"reason": "An adjustment reason is required."})
            if batch.quantity + delta < 0:
                raise ValidationError({"delta": "Adjustment cannot reduce this batch below zero units."})
            batch.quantity += delta
            batch.save(update_fields=["quantity", "updated_at"])
            PharmacyInventoryAdjustment.objects.create(
                batch=batch,
                delta=delta,
                reason=reason[:500],
                created_by=request.user,
            )
        _log_pharmacy_action(
            request,
            "edit",
            "pharmacy_batch",
            batch.pk,
            f"Adjusted inventory for batch {batch.batch_number}",
            {"delta": delta, "reason": reason[:500]},
        )
        return Response(self.get_serializer(batch).data)


class PharmacyPrescriptionViewSet(viewsets.GenericViewSet):
    serializer_class = PharmacyPrescriptionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = PrescriptionUpload.objects.select_related("patient", "reviewed_by")

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        search = self.request.query_params.get("search", "").strip()[:100]
        if status_filter in dict(PrescriptionUpload.Status.choices):
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(patient__name__icontains=search)
                | Q(prescription_number__icontains=search)
                | Q(doctor_name__icontains=search)
                | Q(diagnosis__icontains=search)
            )
        return queryset

    def list(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data.get("file") and not serializer.validated_data.get("pdf_url"):
            raise ValidationError({"file": "Upload a prescription file or provide a prescription URL."})
        prescription = serializer.save(
            status=PrescriptionUpload.Status.PENDING,
            rejection_reason="",
            reviewed_by=None,
            reviewed_at=None,
        )
        _log_pharmacy_action(
            request,
            "create",
            "prescription",
            prescription.pk,
            f"Added prescription for {prescription.patient.name}",
        )
        return Response(
            self.get_serializer(prescription).data, status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, pk=None):
        prescription = self.get_object()
        prescription.internal_notes = str(request.data.get("internal_notes") or "").strip()
        prescription.save(update_fields=["internal_notes"])
        _log_pharmacy_action(
            request,
            "edit",
            "prescription",
            prescription.pk,
            f"Updated internal prescription notes for {prescription.patient.name}",
        )
        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        with transaction.atomic():
            prescription = get_object_or_404(
                PrescriptionUpload.objects.select_for_update().select_related("patient"),
                pk=pk,
            )
            if prescription.status != PrescriptionUpload.Status.PENDING:
                raise ValidationError({"status": "Only pending prescriptions can be approved."})
            prescription.status = PrescriptionUpload.Status.APPROVED
            prescription.rejection_reason = ""
            prescription.reviewed_by = request.user
            prescription.reviewed_at = timezone.now()
            prescription.save(
                update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"]
            )
        _log_pharmacy_action(
            request, "approve", "prescription", prescription.pk, f"Approved prescription for {prescription.patient.name}"
        )
        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        reason = str(request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "A rejection reason is required."})
        with transaction.atomic():
            prescription = get_object_or_404(
                PrescriptionUpload.objects.select_for_update().select_related("patient"),
                pk=pk,
            )
            if prescription.status != PrescriptionUpload.Status.PENDING:
                raise ValidationError({"status": "Only pending prescriptions can be rejected."})
            prescription.status = PrescriptionUpload.Status.REJECTED
            prescription.rejection_reason = reason[:2000]
            prescription.reviewed_by = request.user
            prescription.reviewed_at = timezone.now()
            prescription.save(
                update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"]
            )
        _log_pharmacy_action(
            request,
            "reject",
            "prescription",
            prescription.pk,
            f"Rejected prescription for {prescription.patient.name}",
            {"reason": reason[:500]},
        )
        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=["get"], url_path="file")
    def prescription_file(self, request, pk=None):
        prescription = self.get_object()
        if not prescription.file:
            raise ValidationError({"file": "No uploaded prescription file is available."})
        content_type = guess_type(prescription.file.name)[0] or "application/octet-stream"
        response = FileResponse(
            prescription.file.open("rb"),
            content_type=content_type,
            as_attachment=False,
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response


class PharmacyOrderViewSet(viewsets.GenericViewSet):
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, PharmacyWorkflowPermission]
    queryset = (
        PharmacyOrder.objects.select_related("patient", "coupon")
        .prefetch_related("items", "prescriptions")
        .select_related("delivery__partner")
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()[:100]
        status_filter = self.request.query_params.get("status")
        if status_filter in dict(PharmacyOrder.Status.choices):
            queryset = queryset.filter(status=status_filter)
        if search:
            filters = (
                Q(patient__name__icontains=search)
                | Q(address__icontains=search)
            )
            order_prefix = "PH-"
            if search.upper().startswith(order_prefix):
                order_digits = search[len(order_prefix):].lstrip("0")
                if order_digits.isdigit():
                    filters |= Q(pk=int(order_digits))
            elif search.isdigit():
                filters |= Q(pk=int(search))
            queryset = queryset.filter(filters)
        return queryset

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request):
        input_serializer = PharmacyOrderCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        values = input_serializer.validated_data
        lines = values["items"]
        patient = values["patient"]
        prescription_ids = values.get("prescription_ids", [])
        mismatched = [
            item for item in prescription_ids if item.patient_id != patient.pk
        ]
        if mismatched:
            raise ValidationError(
                {"prescription_ids": "Selected prescriptions must belong to this patient."}
            )

        coupon_code = values.get("coupon_code", "").strip().upper()
        coupon = None
        with transaction.atomic():
            if coupon_code:
                coupon = Coupon.objects.select_for_update().filter(code=coupon_code).first()
                now = timezone.now()
                if not coupon:
                    raise ValidationError({"coupon_code": "Coupon code was not found."})
                if (
                    not coupon.is_currently_active
                    or coupon.applies_to not in {"pharmacy", "all"}
                ):
                    raise ValidationError(
                        {"coupon_code": "This coupon is not currently available for pharmacy orders."}
                    )
                if coupon.usage_limit is not None and coupon.usage_count >= coupon.usage_limit:
                    raise ValidationError({"coupon_code": "This coupon has reached its usage limit."})
                if coupon.discount_type == "percentage" and coupon.discount_value > 100:
                    raise ValidationError({"coupon_code": "Coupon percentage is invalid."})
                if (
                    PharmacyCouponUse.objects.filter(coupon=coupon, patient=patient).count()
                    >= coupon.per_user_limit
                ):
                    raise ValidationError(
                        {"coupon_code": "This patient has reached the coupon usage limit."}
                    )

            subtotal = Decimal("0.00")
            product_discount = Decimal("0.00")
            line_values = []
            locked_products = {
                product.pk: product
                for product in PharmacyProduct.objects.select_for_update().filter(
                    pk__in=[line["product"].pk for line in lines], is_active=True
                )
            }
            if len(locked_products) != len(lines):
                raise ValidationError(
                    {"items": "One or more products are no longer active."}
                )
            for line in lines:
                product = locked_products[line["product"].pk]
                quantity = line["quantity"]
                line_subtotal = (product.mrp * quantity).quantize(Decimal("0.01"))
                line_total = (product.selling_price * quantity).quantize(Decimal("0.01"))
                line_discount = line_subtotal - line_total
                subtotal += line_subtotal
                product_discount += line_discount
                line_values.append(
                    (product, quantity, line_subtotal, line_discount, line_total)
                )

            product_discounted_subtotal = subtotal - product_discount
            if coupon and product_discounted_subtotal < coupon.minimum_order_amount:
                raise ValidationError(
                    {"coupon_code": f"Minimum order amount for this coupon is {coupon.minimum_order_amount}."}
                )
            subscription = active_plan_subscription(patient)
            plan_discount = Decimal("0.00")
            if subscription and subscription.plan.pharmacy_discount_percent:
                plan_discount = (
                    product_discounted_subtotal
                    * subscription.plan.pharmacy_discount_percent
                    / Decimal("100")
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            discounted_subtotal = max(
                Decimal("0.00"), product_discounted_subtotal - plan_discount
            )
            coupon_discount = Decimal("0.00")
            if coupon:
                if coupon.discount_type == "percentage":
                    coupon_discount = discounted_subtotal * coupon.discount_value / Decimal("100")
                    if coupon.maximum_discount is not None:
                        coupon_discount = min(coupon_discount, coupon.maximum_discount)
                else:
                    coupon_discount = coupon.discount_value
                coupon_discount = min(coupon_discount, discounted_subtotal).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

            delivery_fee = values["delivery_fee"].quantize(Decimal("0.01"))
            tax_rate = Decimal(str(settings.PHARMACY_TAX_RATE))
            if tax_rate < 0 or tax_rate > 100:
                raise ValidationError({"tax": "Configured pharmacy tax rate must be from 0 to 100."})
            taxable = max(
                Decimal("0.00"),
                discounted_subtotal - coupon_discount + delivery_fee,
            )
            tax = (taxable * tax_rate / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            total = taxable + tax
            order = PharmacyOrder.objects.create(
                patient=patient,
                address=values["address"].strip(),
                coupon=coupon,
                payment_method=values["payment_method"],
                subtotal=subtotal,
                product_discount=product_discount,
                plan_discount=plan_discount,
                coupon_discount=coupon_discount,
                delivery_fee=delivery_fee,
                tax=tax,
                total=total,
            )
            for product, quantity, line_subtotal, line_discount, line_total in line_values:
                PharmacyOrderLine.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    quantity=quantity,
                    unit_mrp=product.mrp,
                    unit_price=product.selling_price,
                    line_subtotal=line_subtotal,
                    line_discount=line_discount,
                    line_total=line_total,
                )
            if prescription_ids:
                order.prescriptions.set(prescription_ids)
            if subscription and plan_discount:
                record_benefit_usage(
                    subscription,
                    "pharmacy_discount",
                    "pharmacy_order",
                    order.pk,
                    detail=f"Applied {subscription.plan.pharmacy_discount_percent}% plan discount.",
                    period_start=timezone.localdate().replace(day=1),
                )
            if coupon:
                PharmacyCouponUse.objects.create(
                    coupon=coupon,
                    patient=patient,
                    order=order,
                    discount_amount=coupon_discount,
                    is_development_data=False,
                )
                coupon.usage_count += 1
                coupon.save(update_fields=["usage_count", "updated_at"])

        _log_pharmacy_action(
            request,
            "create",
            "pharmacy_order",
            order.pk,
            f"Created pharmacy order {order.order_number} for {patient.name}",
            {"total": str(order.total)},
        )
        return Response(
            self.get_serializer(self.get_queryset().get(pk=order.pk)).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def advance(self, request, pk=None):
        target = str(request.data.get("status") or "").strip()
        transitions = {
            PharmacyOrder.Status.PLACED: PharmacyOrder.Status.VERIFIED,
            PharmacyOrder.Status.VERIFIED: PharmacyOrder.Status.PACKED,
        }
        with transaction.atomic():
            order = get_object_or_404(
                PharmacyOrder.objects.select_for_update().select_related("patient"),
                pk=pk,
            )
            if target == PharmacyOrder.Status.CANCELLED:
                if order.status in {
                    PharmacyOrder.Status.DELIVERED,
                    PharmacyOrder.Status.CANCELLED,
                }:
                    raise ValidationError({"status": "Delivered or cancelled orders cannot be cancelled."})
                allocations = PharmacyOrderBatchAllocation.objects.select_for_update().filter(
                    order_line__order=order
                ).select_related("batch")
                for allocation in allocations:
                    batch = PharmacyBatch.objects.select_for_update().get(pk=allocation.batch_id)
                    batch.quantity += allocation.quantity
                    batch.save(update_fields=["quantity", "updated_at"])
                    PharmacyInventoryAdjustment.objects.create(
                        batch=batch,
                        delta=allocation.quantity,
                        reason=f"Stock restored after cancellation of {order.order_number}",
                        order=order,
                        created_by=request.user,
                    )
                if order.payment_status == PharmacyOrder.PaymentStatus.PAID:
                    PharmacyRefund.objects.get_or_create(
                        order=order,
                        defaults={
                            "amount": order.total,
                            "reason": f"Cancellation of {order.order_number}",
                            "is_development_data": False,
                        },
                    )
                    order.payment_status = PharmacyOrder.PaymentStatus.REFUND_PENDING
                order.status = PharmacyOrder.Status.CANCELLED
                order.save(update_fields=["status", "payment_status", "updated_at"])
            elif target == PharmacyOrder.Status.VERIFIED:
                if order.status != PharmacyOrder.Status.PLACED:
                    raise ValidationError({"status": "Only placed orders can be verified."})
                requires_rx = order.items.filter(product__rx_required=True).exists()
                if requires_rx and not order.prescriptions.filter(
                    patient=order.patient, status=PrescriptionUpload.Status.APPROVED
                ).exists():
                    raise ValidationError(
                        {"prescriptions": "Attach an approved prescription for this patient before verifying this order."}
                    )
                order.status = PharmacyOrder.Status.VERIFIED
                order.invoice_number = f"INV-PH-{order.pk:08d}"
                order.invoice_issued_at = timezone.now()
                order.save(
                    update_fields=[
                        "status",
                        "invoice_number",
                        "invoice_issued_at",
                        "updated_at",
                    ]
                )
            elif target == PharmacyOrder.Status.PACKED:
                if order.status != PharmacyOrder.Status.VERIFIED:
                    raise ValidationError({"status": "Only verified orders can be packed."})
                for line in order.items.select_related("product").all():
                    remaining = line.quantity
                    batches = PharmacyBatch.objects.select_for_update().filter(
                        product=line.product,
                        quantity__gt=0,
                        expiry_date__gte=timezone.localdate(),
                    ).order_by("expiry_date", "created_at", "pk")
                    for batch in batches:
                        taken = min(batch.quantity, remaining)
                        if not taken:
                            continue
                        batch.quantity -= taken
                        batch.save(update_fields=["quantity", "updated_at"])
                        PharmacyOrderBatchAllocation.objects.create(
                            order_line=line, batch=batch, quantity=taken
                        )
                        PharmacyInventoryAdjustment.objects.create(
                            batch=batch,
                            delta=-taken,
                            reason=f"Order {order.order_number} packed",
                            order=order,
                            created_by=request.user,
                        )
                        remaining -= taken
                        if not remaining:
                            break
                    if remaining:
                        raise ValidationError(
                            {"stock": f"Insufficient unexpired stock for {line.product_name}."}
                        )
                order.status = PharmacyOrder.Status.PACKED
                order.save(update_fields=["status", "updated_at"])
            else:
                raise ValidationError(
                    {"status": "Valid next statuses are verified, packed, or cancelled."}
                )

        _log_pharmacy_action(
            request,
            "edit",
            "pharmacy_order",
            order.pk,
            f"Updated pharmacy order {order.order_number} to {order.status}",
            {"status": order.status},
        )
        return Response(self.get_serializer(self.get_queryset().get(pk=order.pk)).data)

    @action(detail=True, methods=["patch"], url_path="delivery")
    def update_delivery(self, request, pk=None):
        serializer = PharmacyDeliveryUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        with transaction.atomic():
            order = get_object_or_404(PharmacyOrder.objects.select_for_update(), pk=pk)
            if order.status not in {
                PharmacyOrder.Status.PACKED,
                PharmacyOrder.Status.DISPATCHED,
            }:
                raise ValidationError(
                    {"status": "Delivery can be assigned after an order is packed."}
                )
            assignment = (
                PharmacyDeliveryAssignment.objects.select_for_update()
                .filter(order=order)
                .first()
            )
            if assignment is None:
                if "partner" not in values:
                    raise ValidationError({"partner_id": "Assign an active delivery partner."})
                if values.get("status"):
                    raise ValidationError(
                        {"status": "Assign a delivery partner before changing delivery status."}
                    )
                assignment = PharmacyDeliveryAssignment(
                    order=order,
                    partner=values["partner"],
                    eta=values.get("eta"),
                    status=PharmacyDeliveryAssignment.Status.ASSIGNED,
                )
                assignment.save()
            else:
                requested_status = values.get("status")
                if requested_status:
                    allowed = {
                        PharmacyDeliveryAssignment.Status.ASSIGNED:
                            (PharmacyDeliveryAssignment.Status.OUT_FOR_DELIVERY,),
                        PharmacyDeliveryAssignment.Status.OUT_FOR_DELIVERY:
                            (PharmacyDeliveryAssignment.Status.DELIVERED,),
                    }
                    if requested_status not in allowed.get(assignment.status, ()):
                        raise ValidationError(
                            {"status": "Delivery must progress from assigned to out for delivery to delivered."}
                        )
                    if not assignment.partner_id:
                        raise ValidationError({"partner_id": "Assign a delivery partner first."})
                    assignment.status = requested_status
                    if requested_status == PharmacyDeliveryAssignment.Status.OUT_FOR_DELIVERY:
                        order.status = PharmacyOrder.Status.DISPATCHED
                        order.save(update_fields=["status", "updated_at"])
                    elif requested_status == PharmacyDeliveryAssignment.Status.DELIVERED:
                        order.status = PharmacyOrder.Status.DELIVERED
                        order.save(update_fields=["status", "updated_at"])
                if "partner" in values:
                    assignment.partner = values["partner"]
                if "eta" in values:
                    assignment.eta = values["eta"]
                assignment.save()
        _log_pharmacy_action(
            request,
            "edit",
            "pharmacy_delivery",
            assignment.pk,
            f"Updated delivery for {order.order_number}",
            {"status": assignment.status},
        )
        return Response(
            self.get_serializer(self.get_queryset().get(pk=order.pk)).data
        )
