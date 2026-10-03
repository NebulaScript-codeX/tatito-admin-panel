from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission, has_module_permission
from audit.models import AuditLog
from marketing.models import Coupon, FeaturedPromotion, Promotion, PromotionalContent
from providers.models import HealthcareProvider, ProviderDocument
from care.services import care_dashboard_stats

from .services import (
    SOURCES,
    build_overview,
    normalize_period,
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


class DashboardOverviewView(APIView):
    """GET /api/dashboard/overview/?period=today|7|30  (needs dashboard.view)."""

    permission_classes = [ModulePermission]
    module = "dashboard"

    def get(self, request):
        period = normalize_period(request.query_params.get("period"))
        can_users = has_module_permission(request.user, "users", "view")
        can_audit = has_module_permission(request.user, "audit_logs", "view")
        can_providers = has_module_permission(request.user, "providers", "view")
        can_coupons = has_module_permission(
            request.user, "coupons_offers_marketing", "view"
        )

        audit_rows = None
        if can_audit:
            audit_rows = [
                serialize_audit(entry)
                for entry in AuditLog.objects.select_related("actor")[:10]
            ]
        provider_stats = provider_dashboard_stats() if can_providers else None
        coupon_stats = coupon_dashboard_stats() if can_coupons else None
        care_stats = None
        if has_module_permission(request.user, "doctors", "view"):
            care_stats = care_dashboard_stats()
        data = build_overview(
            period,
            can_see_users=can_users,
            audit_rows=audit_rows,
            provider_stats=provider_stats,
            coupon_stats=coupon_stats,
            care_stats=care_stats,
        )

        restricted = []
        if not can_users:
            restricted.append("recent_activity.users")
        if not can_audit:
            restricted.append("recent_activity.admin_activity")
        if not can_providers:
            restricted.append("providers")
        if not can_coupons:
            restricted.append("coupons_offers_marketing")

        return Response({
            "success": True,
            **data,
            "meta": {
                "sources": SOURCES,
                "unavailable": unavailable_list(),
                "restricted": restricted,
            },
        })
