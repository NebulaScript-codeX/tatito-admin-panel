from .models import AuditLog

# Never persist secrets, whatever a caller passes in metadata.
_SENSITIVE = {"password", "new_password", "old_password", "token", "access", "refresh"}


def _clean(metadata):
    return {k: v for k, v in (metadata or {}).items() if k.lower() not in _SENSITIVE}


def _client_ip(request):
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def log_action(request, action, module="", target_type="", target_id="",
               description="", metadata=None, actor=None):
    """Write one real audit entry. `actor` defaults to request.user."""
    actor = actor or (getattr(request, "user", None) if request else None)
    if actor is not None and not getattr(actor, "is_authenticated", False):
        actor = None

    role_name = ""
    if actor is not None:
        profile = getattr(actor, "admin_profile", None)
        role_name = profile.role.name if profile else ""

    return AuditLog.objects.create(
        actor=actor,
        actor_username=actor.username if actor else "",
        actor_role=role_name,
        action=action,
        module=module,
        target_type=target_type,
        target_id=str(target_id) if target_id != "" else "",
        description=description[:500],
        metadata=_clean(metadata),
        ip_address=_client_ip(request),
    )
