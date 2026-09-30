from django.core.management.base import BaseCommand

from accounts.models import Role, RolePermission
from accounts.modules import ACTION_LETTER, DEFAULT_PERMISSIONS, SUPER_ADMIN, SYSTEM_ROLES


class Command(BaseCommand):
    help = "Create the 7 system roles and a starter permission matrix (idempotent; never overwrites edited matrices)."

    def handle(self, *args, **options):
        for name, description in SYSTEM_ROLES.items():
            role, created = Role.objects.get_or_create(
                name=name, defaults={"description": description, "is_system_role": True}
            )
            if not role.is_system_role:
                role.is_system_role = True
                role.save(update_fields=["is_system_role"])
            if options.get("verbosity", 1) > 0:
                self.stdout.write(f"{'created' if created else 'exists '} role: {name}")

            if name == SUPER_ADMIN or role.permissions.exists():
                continue  # Super Admin is implicit; existing matrices are left alone
            for module, letters in DEFAULT_PERMISSIONS.get(name, {}).items():
                flags = {f"can_{ACTION_LETTER[c]}": True for c in letters}
                RolePermission.objects.create(role=role, module=module, **flags)
