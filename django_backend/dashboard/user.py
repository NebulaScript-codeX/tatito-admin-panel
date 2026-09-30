import re
from datetime import datetime, timezone as dt_timezone

from bson import ObjectId
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission

from . import mongo
from .services import USERS, _safe_user


class PlatformUserListView(APIView):
    """
    GET /api/admin/users/ - read-only list of app users (Node `users` collection).
    The Node backend owns this data and its password hashing, so create/edit/delete
    are intentionally NOT implemented here (see report).
    """

    permission_classes = [ModulePermission]
    module = "users"

    def get(self, request):
        query = {}
        role = request.query_params.get("role")
        if role in ("patient", "doctor"):
            query["role"] = role
        search = (request.query_params.get("search") or "").strip()[:100]
        if search:
            pattern = re.escape(search)
            query["$or"] = [
                {"name": {"$regex": pattern, "$options": "i"}},
                {"email": {"$regex": pattern, "$options": "i"}},
            ]

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)
        except ValueError:
            page, size = 1, 20

        coll = mongo.get_mongo_database()[USERS]
        total = coll.count_documents(query)
        docs = (coll.find(query, {"passwordHash": 0}).sort("createdAt", -1)
                .skip((page - 1) * size).limit(size))
        results = []
        for d in docs:
            row = _safe_user(d)
            row["mobile"] = d.get("mobile", "")
            row["doctor_id"] = d.get("doctorId") or ""
            results.append(row)
        return Response({"success": True, "total": total, "page": page,
                         "page_size": size, "results": results})
