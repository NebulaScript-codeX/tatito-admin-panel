from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from decimal import Decimal
from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission, has_module_permission
from audit.models import AuditLog
from marketing.models import Coupon, FeaturedPromotion, Promotion, PromotionalContent
from providers.models import HealthcareProvider, ProviderDocument
from care.services import care_dashboard_stats
from health_records.models import LabBooking, PrescriptionUpload
from lab_tests.models import Phlebotomist
from pharmacy.models import PharmacyOrder, PharmacyProduct
from commerce.services import build_transactions, refund_sources

from .services import (
    SOURCES,
    build_overview,
    normalize_period,
    period_window,
    pharmacy_order_dashboard_data,
    unavailable_list,
)

def serialize_audit(entry):
    return {
        "id": entry.id,
        "actor": entry.actor_username or "system",
        "role": entry.actor_role,
        "action": entry.action,
        "module": entry.module,
        "description": entry.description,
        "created_at": entry.created_at.isoformat(),
    }


def provider_dashboard_stats():
    provider_counts = HealthcareProvider.objects.aggregate(
        total_hospitals=Count(
            "id", filter=Q(provider_type=HealthcareProvider.ProviderType.HOSPITAL)
        ),
        total_clinics=Count(
            "id", filter=Q(provider_type=HealthcareProvider.ProviderType.CLINIC)
        ),
        total_diagnostic_centres=Count(
            "id",
            filter=Q(
                provider_type=HealthcareProvider.ProviderType.DIAGNOSTIC_CENTRE
            ),
        ),
        total_pharmacies=Count(
            "id", filter=Q(provider_type=HealthcareProvider.ProviderType.PHARMACY)
        ),
        provider_approvals=Count(
            "id", filter=Q(status=HealthcareProvider.Status.PENDING)
        ),
    )
    return {
        **provider_counts,
        "document_verifications": ProviderDocument.objects.filter(
            status=ProviderDocument.Status.PENDING
        ).count(),
    }


def coupon_dashboard_stats():
    now = timezone.now()
    stats = {
        "total_coupons": Coupon.objects.count(),
        "active_coupons": Coupon.objects.filter(
            is_active=True,
            start_date__lte=now,
            expiry_date__gt=now,
        )
        .filter(Q(usage_limit__isnull=True) | Q(usage_count__lt=F("usage_limit")))
        .count(),
        "active_promotions": Promotion.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gt=now,
        ).count(),
        "active_featured_promotions": FeaturedPromotion.objects.filter(
            is_active=True
        ).count(),
        "active_promotional_content": PromotionalContent.objects.filter(
            is_active=True
        ).count(),
    }
    stats["active_offers"] = sum(
        value
        for key, value in stats.items()
        if key.startswith("active_") and key != "active_coupons"
    )
    return stats


def pharmacy_dashboard_stats(period):
    start, end = period_window(period)
    order_data = pharmacy_order_dashboard_data(period, start, end)
    active_stock = PharmacyProduct.objects.filter(is_active=True).annotate(
        available_stock=Sum(
            "inventory_batches__quantity",
            filter=Q(inventory_batches__expiry_date__gte=timezone.localdate()),
        )
    )
    return {
        **order_data,
        "pending_medicine_orders": PharmacyOrder.objects.filter(
            status=PharmacyOrder.Status.PLACED
        ).count(),
        "prescription_reviews": PrescriptionUpload.objects.filter(
            status=PrescriptionUpload.Status.PENDING
        ).count(),
        "low_stock_products": active_stock.filter(
            Q(available_stock__isnull=True)
            | Q(available_stock__lte=F("low_stock_threshold"))
        ).count(),
    }


def lab_tests_dashboard_stats():
    bookings = LabBooking.objects.exclude(status=LabBooking.Status.CANCELLED)
    return {
        "lab_test_bookings": bookings.count(),
        "sample_collections": bookings.filter(
            status__in=(
                LabBooking.Status.COLLECTED,
                LabBooking.Status.IN_LAB,
                LabBooking.Status.REPORT_READY,
                LabBooking.Status.COMPLETED,
            )
        ).count(),
        "unassigned_sample_bookings": bookings.filter(
            status__in=(LabBooking.Status.PENDING, LabBooking.Status.BOOKED),
            assigned_phlebotomist__isnull=True,
        ).count(),
        "active_phlebotomists": Phlebotomist.objects.filter(
            is_active=True
        ).count(),
    }


class DashboardOverviewView(APIView):
    """GET /api/dashboard/overview/?period=today|7|30  (needs dashboard.view)."""

    permission_classes = [ModulePermission]
    module = "dashboard"

    def get(self, request):
        period = normalize_period(request.query_params.get("period"))
        can_users = has_module_permission(request.user, "users", "view")
        can_audit = has_module_permission(request.user, "audit_logs", "view")
        can_providers = has_module_permission(request.user, "providers", "view")
        can_pharmacy = has_module_permission(request.user, "pharmacy", "view")
        can_lab_tests = has_module_permission(request.user, "lab_tests", "view")
        can_coupons = has_module_permission(
            request.user, "coupons_offers_marketing", "view"
        )
        can_commerce = has_module_permission(request.user, "orders_payments", "view")

        audit_rows = None
        if can_audit:
            audit_rows = [
                serialize_audit(entry)
                for entry in AuditLog.objects.select_related("actor")[:10]
            ]
        provider_stats = provider_dashboard_stats() if can_providers else None
        pharmacy_stats = pharmacy_dashboard_stats(period) if can_pharmacy else None
        lab_tests_stats = lab_tests_dashboard_stats() if can_lab_tests else None
        coupon_stats = coupon_dashboard_stats() if can_coupons else None
        care_stats = None
        if has_module_permission(request.user, "doctors", "view"):
            care_stats = care_dashboard_stats()
        data = build_overview(
            period,
            can_see_users=can_users,
            audit_rows=audit_rows,
            provider_stats=provider_stats,
            pharmacy_stats=pharmacy_stats,
            lab_tests_stats=lab_tests_stats,
            coupon_stats=coupon_stats,
            care_stats=care_stats,
        )
        if can_commerce:
            start, end = period_window(period)
            rows = [
                row
                for row in build_transactions()
                if start <= datetime.fromisoformat(row["date"]) <= end
            ]
            collected = Decimal("0.00")
            refunded = Decimal("0.00")
            by_module = {}
            by_day = {}
            for row in rows:
                amount = Decimal(row["amount"])
                day = datetime.fromisoformat(row["date"]).date().isoformat()
                if row["kind"] == "payment" and row["status"] == "successful":
                    collected += amount
                    by_module[row["order_type"]] = by_module.get(
                        row["order_type"], Decimal("0.00")
                    ) + amount
                    by_day[day] = by_day.get(day, Decimal("0.00")) + amount
                elif row["kind"] == "refund" and row["status"] == "successful":
                    refunded += amount
                    by_module[row["order_type"]] = by_module.get(
                        row["order_type"], Decimal("0.00")
                    ) - amount
                    by_day[day] = by_day.get(day, Decimal("0.00")) - amount
            net_revenue = collected - refunded
            data["live_stats"]["revenue"] = (
                str(net_revenue) if net_revenue else 0
            )
            data["charts"]["revenue_by_module"] = [
                {"module": module, "amount": str(amount)}
                for module, amount in sorted(by_module.items())
            ]
            data["charts"]["revenue_trend"] = [
                {"date": day, "amount": str(amount)}
                for day, amount in sorted(by_day.items())
            ]
            data["needs_attention"]["refund_requests"] = sum(
                item["status"] == "pending" for item in refund_sources()
            )

        restricted = []
        if not can_users:
            restricted.append("users")
            restricted.append("recent_activity.users")
        if not can_audit:
            restricted.append("audit_logs")
            restricted.append("recent_activity.admin_activity")
        if not can_providers:
            restricted.append("providers")
        if not can_pharmacy:
            restricted.append("pharmacy")
        if not can_lab_tests:
            restricted.append("lab_tests")
        if not has_module_permission(request.user, "doctors", "view"):
            restricted.append("doctors")
        if not can_coupons:
            restricted.append("coupons_offers_marketing")
        if not can_commerce:
            restricted.append("orders_payments")

        return Response({
            "success": True,
            **data,
            "meta": {
                "sources": SOURCES,
                "unavailable": unavailable_list(),
                "restricted": restricted,
            },
        })
