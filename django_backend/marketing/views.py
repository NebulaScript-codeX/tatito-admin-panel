from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminUser

from accounts.permissions import ModulePermission

from .models import Coupon, CouponUsage, Promotion
from .serializers import (
    CouponSerializer,
    CouponUsageSerializer,
    PromotionSerializer,
)


class PromotionViewSet(viewsets.ModelViewSet):
    serializer_class = PromotionSerializer
    permission_classes = [ModulePermission]
    module = "promotions"

    def get_queryset(self):
        queryset = Promotion.objects.all()
        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CouponViewSet(viewsets.ModelViewSet):
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Coupon.objects.all().order_by("-created_at")

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")
        applies_to = self.request.query_params.get("applies_to")

        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(applies_to__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)

        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        elif status_filter == "expired":
            queryset = queryset.filter(
                expiry_date__lte=timezone.now()
            )

        if applies_to:
            queryset = queryset.filter(applies_to=applies_to)

        return queryset

    def destroy(self, request, *args, **kwargs):
        coupon = self.get_object()

        coupon.delete()

        return Response(
            {"message": "Coupon deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="toggle-status",
    )
    def toggle_status(self, request, pk=None):
        coupon = self.get_object()

        coupon.is_active = not coupon.is_active
        coupon.save()

        serializer = self.get_serializer(coupon)

        return Response({
            "message": (
                "Coupon activated."
                if coupon.is_active
                else "Coupon deactivated."
            ),
            "coupon": serializer.data,
        })

    @action(
        detail=False,
        methods=["post"],
        url_path="validate",
    )
    def validate_coupon(self, request):

        code = request.data.get("code")
        order_amount = request.data.get("order_amount")
        applies_to = request.data.get("applies_to")

        if not code:
            return Response(
                {"error": "Coupon code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order_amount is None:
            return Response(
                {"error": "Order amount is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order_amount = Decimal(str(order_amount))
        except Exception:
            return Response(
                {"error": "Invalid order amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order_amount < 0:
            return Response(
                {"error": "Order amount cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = code.strip().upper()

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response(
                {"error": "Invalid coupon code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        if not coupon.is_active:
            return Response(
                {"error": "This coupon is inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now < coupon.start_date:
            return Response(
                {"error": "This coupon is not active yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now >= coupon.expiry_date:
            return Response(
                {"error": "This coupon has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if coupon.is_fully_used:
            return Response(
                {"error": "This coupon has reached its usage limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order_amount < coupon.minimum_order_amount:
            return Response(
                {
                    "error": (
                        f"Minimum order amount for this coupon is "
                        f"{coupon.minimum_order_amount}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            applies_to
            and coupon.applies_to != "all"
            and coupon.applies_to != applies_to
        ):
            return Response(
                {
                    "error": (
                        f"This coupon cannot be used for {applies_to}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        user_usage_count = CouponUsage.objects.filter(
            coupon=coupon,
            user=user,
        ).count()

        if user_usage_count >= coupon.per_user_limit:
            return Response(
                {
                    "error": (
                        "You have already reached the usage limit "
                        "for this coupon."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if coupon.discount_type == "percentage":
            discount_amount = (
                order_amount * coupon.discount_value / Decimal("100")
            )

            if coupon.maximum_discount is not None:
                discount_amount = min(
                    discount_amount,
                    coupon.maximum_discount,
                )

        else:
            discount_amount = coupon.discount_value

        discount_amount = min(
            discount_amount,
            order_amount,
        )

        final_amount = order_amount - discount_amount

        return Response({
            "valid": True,
            "message": "Coupon applied successfully.",
            "coupon": CouponSerializer(coupon).data,
            "discount_amount": str(
                discount_amount.quantize(Decimal("0.01"))
            ),
            "final_amount": str(
                final_amount.quantize(Decimal("0.01"))
            ),
        })


    @action(
        detail=False,
        methods=["post"],
        url_path="apply",
    )
    def apply_coupon(self, request):
        code = request.data.get("code")
        order_amount = request.data.get("order_amount")
        applies_to = request.data.get("applies_to")
        order_reference = request.data.get("order_reference", "")

        if not code:
            return Response(
                {"error": "Coupon code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order_amount is None:
            return Response(
                {"error": "Order amount is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order_amount = Decimal(str(order_amount))
        except Exception:
            return Response(
                {"error": "Invalid order amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order_amount < 0:
            return Response(
                {"error": "Order amount cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = code.strip().upper()

        with transaction.atomic():
            try:
                coupon = (
                    Coupon.objects
                    .select_for_update()
                    .get(code=code)
                )
            except Coupon.DoesNotExist:
                return Response(
                    {"error": "Invalid coupon code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            now = timezone.now()

            if not coupon.is_active:
                return Response(
                    {"error": "This coupon is inactive."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if now < coupon.start_date:
                return Response(
                    {"error": "This coupon is not active yet."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if now >= coupon.expiry_date:
                return Response(
                    {"error": "This coupon has expired."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if coupon.is_fully_used:
                return Response(
                    {
                        "error": (
                            "This coupon has reached its usage limit."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if order_amount < coupon.minimum_order_amount:
                return Response(
                    {
                        "error": (
                            f"Minimum order amount for this coupon is "
                            f"{coupon.minimum_order_amount}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                applies_to
                and coupon.applies_to != "all"
                and coupon.applies_to != applies_to
            ):
                return Response(
                    {
                        "error": (
                            f"This coupon cannot be used for {applies_to}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = request.user

            user_usage_count = CouponUsage.objects.filter(
                coupon=coupon,
                user=user,
            ).count()

            if user_usage_count >= coupon.per_user_limit:
                return Response(
                    {
                        "error": (
                            "You have already reached the usage limit "
                            "for this coupon."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if coupon.discount_type == "percentage":
                discount_amount = (
                    order_amount
                    * coupon.discount_value
                    / Decimal("100")
                )

                if coupon.maximum_discount is not None:
                    discount_amount = min(
                        discount_amount,
                        coupon.maximum_discount,
                    )

            else:
                discount_amount = coupon.discount_value

            discount_amount = min(
                discount_amount,
                order_amount,
            )

            final_amount = order_amount - discount_amount

            usage = CouponUsage.objects.create(
                coupon=coupon,
                user=user,
                order_reference=order_reference,
                discount_amount=discount_amount.quantize(
                    Decimal("0.01")
                ),
            )

            coupon.usage_count += 1
            coupon.save(
                update_fields=["usage_count", "updated_at"]
            )

        return Response(
            {
                "success": True,
                "message": "Coupon applied successfully.",
                "coupon": CouponSerializer(coupon).data,
                "usage_id": usage.id,
                "order_reference": order_reference,
                "discount_amount": str(
                    discount_amount.quantize(Decimal("0.01"))
                ),
                "final_amount": str(
                    final_amount.quantize(Decimal("0.01"))
                ),
                "usage_count": coupon.usage_count,
            },
            status=status.HTTP_200_OK,
        )
    @action(
        detail=True,
        methods=["get"],
        url_path="usage",
    )
    
    def usage(self, request, pk=None):
        coupon = self.get_object()

        usages = CouponUsage.objects.filter(
            coupon=coupon
        ).select_related("user")

        serializer = CouponUsageSerializer(
            usages,
            many=True,
        )

        return Response(serializer.data)


class CouponUsageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CouponUsageSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return CouponUsage.objects.select_related(
            "coupon",
            "user",
        ).order_by("-used_at")