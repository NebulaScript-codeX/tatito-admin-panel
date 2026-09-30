import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission, has_module_permission
from audit.models import AuditLog

from . import mongo
from .services import (
    SOURCES,
    build_overview,
    normalize_period,
    unavailable_list,
)

logger = logging.getLogger(__name__)


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


class DashboardOverviewView(APIView):
    """GET /api/dashboard/overview/?period=today|7|30  (needs dashboard.view)."""

    permission_classes = [ModulePermission]
    module = "dashboard"

    def get(self, request):
        period = normalize_period(request.query_params.get("period"))
        can_users = has_module_permission(request.user, "users", "view")
        can_audit = has_module_permission(request.user, "audit_logs", "view")

        audit_rows = None
        if can_audit:
            audit_rows = [serialize_audit(e) for e in AuditLog.objects.select_related("actor")[:10]]

        try:
            data = build_overview(
                mongo.get_mongo_database(), period,
                can_see_users=can_users, audit_rows=audit_rows,
            )
        except Exception:  # noqa: BLE001 - never leak driver internals to the client
            logger.exception("Dashboard aggregation failed")
            return Response(
                {"success": False, "message": "Dashboard data source is unavailable."},
                status=503,
            )

        restricted = []
        if not can_users:
            restricted.append("recent_activity.users")
        if not can_audit:
            restricted.append("recent_activity.admin_activity")

        return Response({
            "success": True,
            **data,
            "meta": {
                "sources": SOURCES,
                "unavailable": unavailable_list(),
                "restricted": restricted,
            },
        })
