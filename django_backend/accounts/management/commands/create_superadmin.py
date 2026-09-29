from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from accounts.models import Role, AdminProfile, RolePermission


MODULES = [
    "dashboard",
    "users",
    "staff",
    "providers",
    "doctors",
    "health_records",
    "pharmacy",
    "lab_tests",
    "orders_payments",
    "health_plans",
    "coupons_offers_marketing",
    "content",
    "internships",
    "support",
    "ai_assistant",
    "reports",
    "uploaded_files",
    "settings",
    "audit_logs",
]


class Command(BaseCommand):
    help = "Create the Tatito Super Admin account and default roles"

    def handle(self, *args, **options):
        roles = [
            ("Super Admin", "Full access to the admin panel", True),
            ("Doctor", "Doctor administration access", True),
            ("Pharmacist", "Pharmacy administration access", True),
            ("Lab Technician", "Lab test administration access", True),
            ("Support Agent", "Support administration access", True),
            ("Content Manager", "Content and marketing administration access", True),
            ("Internship HR", "Internship administration access", True),
        ]

        for name, description, is_system_role in roles:
            Role.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "is_system_role": is_system_role,
                },
            )

        super_admin_role = Role.objects.get(name="Super Admin")

        for module in MODULES:
            RolePermission.objects.update_or_create(
                role=super_admin_role,
                module=module,
                defaults={
                    "can_view": True,
                    "can_create": True,
                    "can_edit": True,
                    "can_delete": True,
                },
            )

        username = "admin"
        email = "admin@tatito.health"

        user = User.objects.filter(username=username).first()

        if user:
            self.stdout.write(
                self.style.WARNING(
                    f"User '{username}' already exists. Updating admin profile."
                )
            )
        else:
            password = input("Enter password for admin: ")

            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )

        user.email = email
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save()

        AdminProfile.objects.update_or_create(
            user=user,
            defaults={
                "role": super_admin_role,
                "is_active": True,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Tatito Super Admin and default roles created successfully."
            )
        )