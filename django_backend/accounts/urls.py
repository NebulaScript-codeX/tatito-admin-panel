from django.urls import path

from .views import (
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    ModuleListView,
    RoleDetailView,
    RoleListCreateView,
    RolePermissionsView,
    StaffActiveToggleView,
    StaffDetailView,
    StaffListCreateView,
    StaffResetPasswordView,
)

urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin-login"),
    path("logout/", AdminLogoutView.as_view(), name="admin-logout"),
    path("me/", AdminMeView.as_view(), name="admin-me"),
    path("modules/", ModuleListView.as_view(), name="admin-modules"),
    path("staff/", StaffListCreateView.as_view(), name="staff-list"),
    path("staff/<int:pk>/", StaffDetailView.as_view(), name="staff-detail"),
    path("staff/<int:pk>/deactivate/", StaffActiveToggleView.as_view(activate=False), name="staff-deactivate"),
    path("staff/<int:pk>/activate/", StaffActiveToggleView.as_view(activate=True), name="staff-activate"),
    path("staff/<int:pk>/reset-password/", StaffResetPasswordView.as_view(), name="staff-reset-password"),
    path("roles/", RoleListCreateView.as_view(), name="role-list"),
    path("roles/<int:pk>/", RoleDetailView.as_view(), name="role-detail"),
    path("roles/<int:pk>/permissions/", RolePermissionsView.as_view(), name="role-permissions"),
]
