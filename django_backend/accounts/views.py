from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from audit.services import log_action

from .models import AdminProfile, Role, RolePermission
from .modules import ACTIONS, MODULE_KEYS, MODULES, SUPER_ADMIN
from .permissions import (
    IsAdminUser,
    ModulePermission,
    get_active_profile,
    is_super_admin,
    permission_matrix,
)


def admin_payload(user, profile):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "role": profile.role.name,
        "permissions": permission_matrix(profile),
    }


def fail(message, code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({"success": False, "message": message, **extra}, status=code)


# ---------------------------------------------------------------- auth

class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return fail("Username and password are required.")

        user = authenticate(username=username, password=password)

        if user is None:
            log_action(request, "login_failed", module="auth",
                       description=f"Failed login for '{str(username)[:60]}'",
                       metadata={"username": str(username)[:150]})
            return fail("Invalid username or password.", status.HTTP_401_UNAUTHORIZED)

        try:
            admin_profile = user.admin_profile
        except AdminProfile.DoesNotExist:
            return fail("This account is not an admin account.", status.HTTP_403_FORBIDDEN)

        if not user.is_active or not admin_profile.is_active:
            log_action(request, "login_blocked", module="auth", actor=user,
                       description="Login attempt on inactive admin account")
            return fail("This admin account is inactive.", status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        log_action(request, "login", module="auth", actor=user,
                   target_type="admin", target_id=user.id,
                   description=f"{user.username} logged in")

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "admin": admin_payload(user, admin_profile),
            },
            status=status.HTTP_200_OK,
        )


class AdminMeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        profile = request.user.admin_profile
        return Response({"success": True, "admin": admin_payload(request.user, profile)})


class AdminLogoutView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass  # already expired/blacklisted: logout still succeeds
        log_action(request, "logout", module="auth", target_type="admin",
                   target_id=request.user.id, description=f"{request.user.username} logged out")
        return Response({"success": True, "message": "Logged out."})


class ModuleListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "success": True,
            "modules": [{"key": k, "label": label} for k, label in MODULES],
            "actions": list(ACTIONS),
        })


# ---------------------------------------------------------------- staff

def staff_payload(profile):
    user = profile.user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "role": {"id": profile.role_id, "name": profile.role.name},
        "is_active": bool(user.is_active and profile.is_active),
        "last_login": user.last_login,
        "created_at": profile.created_at,
    }


def _check_password(password, user=None):
    try:
        validate_password(password, user)
    except ValidationError as exc:
        return list(exc.messages)
    return None


def _can_touch(actor_profile, target_profile, new_role=None):
    """Only Super Admins may manage Super Admin accounts or grant that role."""
    if is_super_admin(actor_profile):
        return True
    if is_super_admin(target_profile):
        return False
    if new_role is not None and new_role.name == SUPER_ADMIN:
        return False
    return True


def _active_super_admins():
    return AdminProfile.objects.filter(
        role__name=SUPER_ADMIN, is_active=True, user__is_active=True
    )


class StaffListCreateView(APIView):
    permission_classes = [ModulePermission]
    module = "staff"

    def get(self, request):
        qs = AdminProfile.objects.select_related("user", "role").order_by("user__username")
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(user__username__icontains=search) | qs.filter(user__email__icontains=search)
        return Response({"success": True, "results": [staff_payload(p) for p in qs]})

    @transaction.atomic
    def post(self, request):
        data = request.data
        username = str(data.get("username") or "").strip()
        email = str(data.get("email") or "").strip()
        password = data.get("password") or ""
        role = Role.objects.filter(pk=data.get("role_id")).first()

        errors = {}
        if not username:
            errors["username"] = "Username is required."
        elif User.objects.filter(username__iexact=username).exists():
            errors["username"] = "Username already exists."
        try:
            validate_email(email)
        except ValidationError:
            errors["email"] = "A valid email is required."
        if role is None:
            errors["role_id"] = "A valid role is required."
        if not password:
            errors["password"] = "Password is required."
        else:
            pw_errors = _check_password(password)
            if pw_errors:
                errors["password"] = pw_errors
        if errors:
            return fail("Validation failed.", errors=errors)

        actor_profile = request.user.admin_profile
        if role.name == SUPER_ADMIN and not is_super_admin(actor_profile):
            return fail("Only a Super Admin can create Super Admin accounts.", status.HTTP_403_FORBIDDEN)

        user = User.objects.create_user(
            username=username, email=email, password=password,
            first_name=str(data.get("first_name") or "").strip(),
            last_name=str(data.get("last_name") or "").strip(),
        )
        profile = AdminProfile.objects.create(user=user, role=role, is_active=True)
        log_action(request, "create", module="staff", target_type="admin_account",
                   target_id=user.id, description=f"Created admin account '{username}' with role {role.name}",
                   metadata={"username": username, "role": role.name})
        return Response({"success": True, "staff": staff_payload(profile)}, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "staff"

    def _profile(self, pk):
        return AdminProfile.objects.select_related("user", "role").filter(user_id=pk).first()

    def get(self, request, pk):
        profile = self._profile(pk)
        if not profile:
            return fail("Staff account not found.", status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "staff": staff_payload(profile)})

    @transaction.atomic
    def patch(self, request, pk):
        profile = self._profile(pk)
        if not profile:
            return fail("Staff account not found.", status.HTTP_404_NOT_FOUND)

        actor_profile = request.user.admin_profile
        data = request.data
        new_role = None
        if "role_id" in data:
            new_role = Role.objects.filter(pk=data.get("role_id")).first()
            if new_role is None:
                return fail("A valid role is required.", errors={"role_id": "Invalid role."})

        if not _can_touch(actor_profile, profile, new_role):
            return fail("Only a Super Admin can manage Super Admin accounts.", status.HTTP_403_FORBIDDEN)

        user = profile.user
        changes = {}
        if "email" in data:
            email = str(data.get("email") or "").strip()
            try:
                validate_email(email)
            except ValidationError:
                return fail("A valid email is required.", errors={"email": "Invalid email."})
            if email != user.email:
                changes["email"] = email
                user.email = email
        for field in ("first_name", "last_name"):
            if field in data:
                value = str(data.get(field) or "").strip()
                if value != getattr(user, field):
                    changes[field] = value
                    setattr(user, field, value)

        role_change = None
        if new_role is not None and new_role.pk != profile.role_id:
            if user.pk == request.user.pk:
                return fail("You cannot change your own role.", status.HTTP_403_FORBIDDEN)
            if (is_super_admin(profile) and new_role.name != SUPER_ADMIN
                    and _active_super_admins().count() <= 1):
                return fail("Cannot demote the last active Super Admin.")
            role_change = (profile.role.name, new_role.name)
            profile.role = new_role

        user.save()
        profile.save()

        if changes:
            log_action(request, "edit", module="staff", target_type="admin_account",
                       target_id=user.id, description=f"Edited admin account '{user.username}'",
                       metadata={"fields": sorted(changes.keys())})
        if role_change:
            log_action(request, "role_change", module="staff", target_type="admin_account",
                       target_id=user.id,
                       description=f"Role of '{user.username}' changed {role_change[0]} -> {role_change[1]}",
                       metadata={"from": role_change[0], "to": role_change[1]})

        profile.refresh_from_db()
        return Response({"success": True, "staff": staff_payload(profile)})

    put = patch


class StaffActiveToggleView(APIView):
    """POST /staff/<id>/deactivate/ and /staff/<id>/activate/ (Edit permission)."""

    permission_classes = [ModulePermission]
    module = "staff"
    action_map = {"post": "edit"}
    activate = False

    @transaction.atomic
    def post(self, request, pk):
        profile = AdminProfile.objects.select_related("user", "role").filter(user_id=pk).first()
        if not profile:
            return fail("Staff account not found.", status.HTTP_404_NOT_FOUND)
        if not _can_touch(request.user.admin_profile, profile):
            return fail("Only a Super Admin can manage Super Admin accounts.", status.HTTP_403_FORBIDDEN)

        if not self.activate:
            if profile.user_id == request.user.pk:
                return fail("You cannot deactivate your own account.", status.HTTP_403_FORBIDDEN)
            if is_super_admin(profile) and _active_super_admins().count() <= 1 \
                    and profile in _active_super_admins():
                return fail("Cannot deactivate the last active Super Admin.")

        # Only the admin profile is toggled: the existing login flow then answers
        # "This admin account is inactive." and every protected API rejects the account.
        profile.is_active = self.activate
        profile.save(update_fields=["is_active", "updated_at"])

        if not self.activate:
            for token in OutstandingToken.objects.filter(user=profile.user):
                BlacklistedToken.objects.get_or_create(token=token)

        verb = "activate" if self.activate else "deactivate"
        log_action(request, verb, module="staff", target_type="admin_account",
                   target_id=profile.user_id,
                   description=f"{verb.capitalize()}d admin account '{profile.user.username}'")
        return Response({"success": True, "staff": staff_payload(profile)})


class StaffResetPasswordView(APIView):
    permission_classes = [ModulePermission]
    module = "staff"
    action_map = {"post": "edit"}

    @transaction.atomic
    def post(self, request, pk):
        profile = AdminProfile.objects.select_related("user", "role").filter(user_id=pk).first()
        if not profile:
            return fail("Staff account not found.", status.HTTP_404_NOT_FOUND)
        if not _can_touch(request.user.admin_profile, profile):
            return fail("Only a Super Admin can manage Super Admin accounts.", status.HTTP_403_FORBIDDEN)

        new_password = request.data.get("new_password") or ""
        if not new_password:
            return fail("new_password is required.", errors={"new_password": "Required."})
        pw_errors = _check_password(new_password, profile.user)
        if pw_errors:
            return fail("Password too weak.", errors={"new_password": pw_errors})

        profile.user.set_password(new_password)
        profile.user.save(update_fields=["password"])
        for token in OutstandingToken.objects.filter(user=profile.user):
            BlacklistedToken.objects.get_or_create(token=token)

        log_action(request, "password_reset", module="staff", target_type="admin_account",
                   target_id=profile.user_id,
                   description=f"Password reset for '{profile.user.username}'")
        return Response({"success": True, "message": "Password reset."})


# ---------------------------------------------------------------- roles

def role_payload(role, with_permissions=True):
    data = {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system_role": role.is_system_role,
        "staff_count": role.admin_profiles.count(),
    }
    if with_permissions:
        if role.name == SUPER_ADMIN:
            data["permissions"] = {m: {a: True for a in ACTIONS} for m in MODULE_KEYS}
        else:
            rows = {p.module: p for p in role.permissions.all()}
            data["permissions"] = {
                m: {a: bool(rows.get(m) and getattr(rows[m], f"can_{a}")) for a in ACTIONS}
                for m in MODULE_KEYS
            }
    return data


class RoleListCreateView(APIView):
    permission_classes = [ModulePermission]
    module = "staff"

    def get(self, request):
        roles = Role.objects.prefetch_related("permissions").order_by("id")
        return Response({"success": True, "results": [role_payload(r) for r in roles]})

    @transaction.atomic
    def post(self, request):
        name = str(request.data.get("name") or "").strip()
        if not name:
            return fail("Role name is required.", errors={"name": "Required."})
        if Role.objects.filter(name__iexact=name).exists():
            return fail("Role already exists.", errors={"name": "Already exists."})
        role = Role.objects.create(
            name=name, description=str(request.data.get("description") or "").strip()
        )
        log_action(request, "create", module="staff", target_type="role",
                   target_id=role.id, description=f"Created role '{role.name}'")
        return Response({"success": True, "role": role_payload(role)}, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = [ModulePermission]
    module = "staff"

    def get(self, request, pk):
        role = Role.objects.filter(pk=pk).first()
        if role is None:
            return fail("Role not found.", status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "role": role_payload(role)})

    @transaction.atomic
    def patch(self, request, pk):
        role = Role.objects.select_for_update().filter(pk=pk).first()
        if role is None:
            return fail("Role not found.", status.HTTP_404_NOT_FOUND)
        if role.is_system_role or role.name == SUPER_ADMIN:
            return fail("System roles cannot be renamed.", status.HTTP_403_FORBIDDEN)

        changes = {}
        if "name" in request.data:
            name = str(request.data.get("name") or "").strip()
            if not name:
                return fail("Role name is required.", errors={"name": "Required."})
            if Role.objects.filter(name__iexact=name).exclude(pk=role.pk).exists():
                return fail("Role already exists.", errors={"name": "Already exists."})
            if name != role.name:
                changes["name"] = {"from": role.name, "to": name}
                role.name = name
        if "description" in request.data:
            description = str(request.data.get("description") or "").strip()
            if description != role.description:
                changes["description"] = True
                role.description = description

        if not changes:
            return Response({"success": True, "role": role_payload(role)})
        role.save()
        log_action(request, "edit", module="staff", target_type="role",
                   target_id=role.id, description=f"Updated role '{role.name}'",
                   metadata={"changes": changes})
        return Response({"success": True, "role": role_payload(role)})

    @transaction.atomic
    def delete(self, request, pk):
        role = Role.objects.select_for_update().filter(pk=pk).first()
        if role is None:
            return fail("Role not found.", status.HTTP_404_NOT_FOUND)
        if role.is_system_role or role.name == SUPER_ADMIN:
            return fail("System roles cannot be deleted.", status.HTTP_403_FORBIDDEN)

        assigned_staff = role.admin_profiles.count()
        if assigned_staff:
            return fail(
                "This role is still assigned to staff. Reassign those accounts before deleting it.",
                status.HTTP_409_CONFLICT,
                assigned_staff=assigned_staff,
            )

        role_name = role.name
        role_id = role.id
        try:
            role.delete()
        except ProtectedError:
            return fail(
                "This role was assigned to staff and cannot be deleted.",
                status.HTTP_409_CONFLICT,
            )
        log_action(request, "delete", module="staff", target_type="role",
                   target_id=role_id, description=f"Deleted role '{role_name}'")
        return Response(status=status.HTTP_204_NO_CONTENT)


class RolePermissionsView(APIView):
    """GET / PUT the permission matrix of one role (PUT needs staff.edit)."""

    permission_classes = [ModulePermission]
    module = "staff"

    def get(self, request, pk):
        role = Role.objects.filter(pk=pk).first()
        if not role:
            return fail("Role not found.", status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "role": role_payload(role)})

    @transaction.atomic
    def put(self, request, pk):
        role = Role.objects.filter(pk=pk).first()
        if not role:
            return fail("Role not found.", status.HTTP_404_NOT_FOUND)
        if role.name == SUPER_ADMIN:
            return fail("Super Admin permissions cannot be modified.", status.HTTP_403_FORBIDDEN)
        if not is_super_admin(request.user.admin_profile) and \
                role.pk == request.user.admin_profile.role_id:
            return fail("You cannot change the permissions of your own role.", status.HTTP_403_FORBIDDEN)

        matrix = request.data.get("permissions")
        if not isinstance(matrix, dict):
            return fail("'permissions' must be an object of {module: {view, create, edit, delete}}.")
        unknown = [m for m in matrix if m not in MODULE_KEYS]
        if unknown:
            return fail("Unknown modules.", errors={"modules": unknown})

        before = role_payload(role)["permissions"]
        for module_key, actions in matrix.items():
            if not isinstance(actions, dict):
                return fail(f"Invalid permissions for '{module_key}'.")
            RolePermission.objects.update_or_create(
                role=role, module=module_key,
                defaults={f"can_{a}": bool(actions.get(a, False)) for a in ACTIONS},
            )
        after = role_payload(Role.objects.get(pk=pk))["permissions"]
        changed = sorted(m for m in MODULE_KEYS if before[m] != after[m])
        log_action(request, "permission_change", module="staff", target_type="role",
                   target_id=role.id,
                   description=f"Permissions updated for role '{role.name}'",
                   metadata={"modules_changed": changed})
        return Response({"success": True, "role": role_payload(Role.objects.get(pk=pk))})
