from rest_framework.permissions import BasePermission

from .modules import ACTIONS, MODULE_KEYS, SUPER_ADMIN


def get_active_profile(user):
    """Return the user's AdminProfile if the account is fully active, else None."""
    if not user or not user.is_authenticated or not user.is_active:
        return None
    profile = getattr(user, "admin_profile", None)
    if profile is None or not profile.is_active:
        return None
    return profile


class IsAdminUser(BasePermission):
    """Authenticated user with an active AdminProfile (user + profile active)."""

    message = "You do not have permission to access the admin panel."

    def has_permission(self, request, view):
        return get_active_profile(request.user) is not None


def is_super_admin(profile):
    return profile.role.name == SUPER_ADMIN


def permission_matrix(profile):
    """{module: {view, create, edit, delete}} for every known module."""
    matrix = {}
    if is_super_admin(profile):
        for key in MODULE_KEYS:
            matrix[key] = {action: True for action in ACTIONS}
        return matrix

    granted = {p.module: p for p in profile.role.permissions.all()}
    for key in MODULE_KEYS:
        row = granted.get(key)
        matrix[key] = {
            "view": bool(row and row.can_view),
            "create": bool(row and row.can_create),
            "edit": bool(row and row.can_edit),
            "delete": bool(row and row.can_delete),
        }
    return matrix


def has_module_permission(user, module, action):
    profile = get_active_profile(user)
    if profile is None:
        return False
    if is_super_admin(profile):
        return True
    perm = profile.role.permissions.filter(module=module).first()
    return bool(perm and getattr(perm, f"can_{action}", False))


HTTP_ACTION = {
    "GET": "view", "HEAD": "view", "OPTIONS": "view",
    "POST": "create", "PUT": "edit", "PATCH": "edit", "DELETE": "delete",
}


class ModulePermission(BasePermission):
    """
    Server-side RBAC. A view sets `module` and (optionally) `action_map`
    ({"post": "edit"}) to override the default HTTP-method -> action mapping.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if get_active_profile(request.user) is None:
            return False
        module = getattr(view, "module", None)
        if not module or module not in MODULE_KEYS:
            return False  # fail closed
        view_action = getattr(view, "action", None)

        ACTION_MAP = {
            "list": "view",
            "retrieve": "view",
            "create": "create",
            "update": "edit",
            "partial_update": "edit",
            "destroy": "delete",

            "toggle_status": "edit",
            "move_up": "edit",
            "move_down": "edit",
        }

        action = ACTION_MAP.get(view_action)

        if action is None:
            action_map = getattr(view, "action_map", {})
            action = action_map.get(request.method.lower())

        if action is None:
            action = HTTP_ACTION.get(request.method)

        if action is None:
            return False
        if action is None:
            return False
        return has_module_permission(request.user, module, action)
