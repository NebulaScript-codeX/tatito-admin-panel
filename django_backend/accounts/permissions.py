from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allows access only to authenticated users
    who have an active AdminProfile.
    """

    message = "You do not have permission to access the admin panel."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        try:
            profile = user.admin_profile
        except Exception:
            return False

        return user.is_active and profile.is_active