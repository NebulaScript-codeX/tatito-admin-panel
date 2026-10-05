from datetime import datetime

from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission

from .models import AuditLog


class AuditLogListView(APIView):
    """GET /api/admin/audit-logs/ (needs audit_logs.view). Read-only by design."""

    permission_classes = [ModulePermission]
    module = "audit_logs"

    def get(self, request):
        qs = AuditLog.objects.all()
        p = request.query_params
        for field in ("action", "module"):
            if p.get(field):
                qs = qs.filter(**{field: p[field]})
        if p.get("actor"):
            qs = qs.filter(actor_username__icontains=p["actor"])
        d_from, d_to = parse_date(p.get("from") or ""), parse_date(p.get("to") or "")
        if p.get("search"):
            search = p["search"].strip()

            from django.db.models import Q

            qs = qs.filter(
                Q(actor_username__icontains=search)
                | Q(actor_role__icontains=search)
                | Q(action__icontains=search)
                | Q(module__icontains=search)
                | Q(target_type__icontains=search)
                | Q(target_id__icontains=search)
                | Q(description__icontains=search)
                | Q(ip_address__icontains=search)
            )
        if d_from:
            qs = qs.filter(created_at__date__gte=d_from)
        if d_to:
            qs = qs.filter(created_at__date__lte=d_to)

        try:
            page = max(int(p.get("page", 1)), 1)
            size = min(max(int(p.get("page_size", 25)), 1), 100)
        except ValueError:
            page, size = 1, 25
        total = qs.count()
        rows = qs[(page - 1) * size: page * size]
        return Response({
            "success": True, "total": total, "page": page, "page_size": size,
            "results": [{
                "id": e.id, "actor": e.actor_username or "system", "role": e.actor_role,
                "action": e.action, "module": e.module, "target_type": e.target_type,
                "target_id": e.target_id, "description": e.description,
                "metadata": e.metadata, "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat(),
            } for e in rows],
        })
