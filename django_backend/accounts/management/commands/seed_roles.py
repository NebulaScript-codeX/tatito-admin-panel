from django.core.management.base import BaseCommand

from accounts.models import Role, RolePermission


ROLES = {
    "Super Admin": {
        "description": "Full access to the entire admin panel.",
        "is_system_role": True,
    },
    "Doctor": {
        "description": "Manage own appointments, slots, reviews, payouts and patient records.",
        "is_system_role": True,
    },
    "Pharmacist": {
        "description": "Manage pharmacy products, inventory, prescriptions, orders and chat.",
        "is_system_role": True,
    },
    "Lab Technician": {
        "description": "Manage lab tests, packages, sample collection and report uploads.",
        "is_system_role": True,
    },
    "Support Agent": {
        "description": "Manage support tickets, contact queries, emergency requests and notifications.",
        "is_system_role": True,
    },
    "Content Manager": {
        "description": "Manage content, coupons, offers, marketing and AI assistant settings.",
        "is_system_role": True,
    },
    "Internship HR": {
        "description": "Manage internship tracks, applications, partners and alumni.",
        "is_system_role": True,
    },
}


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


ROLE_MODULE_ACCESS = {
    "Super Admin": MODULES,

    "Doctor": [
        "dashboard",
        "doctors",
        "health_records",
    ],

    "Pharmacist": [
        "dashboard",
        "pharmacy",
        "orders_payments",
    ],

    "Lab Technician": [
        "dashboard",
        "lab_tests",
    ],

    "Support Agent": [
        "dashboard",
        "support",
    ],

    "Content Manager": [
        "dashboard",
        "content",
        "coupons_offers_marketing",
        "ai_assistant",
    ],

    "Internship HR": [
        "dashboard",
        "internships",
    ],
}


class Command(BaseCommand):
    help = "Seed default Tatito admin roles and permissions."

    def handle(self, *args, **options):
        for role_name, role_data in ROLES.items():
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults=role_data,
            )

            if not created:
                changed = False

                for field, value in role_data.items():
                    if getattr(role, field) != value:
                        setattr(role, field, value)
                        changed = True

                if changed:
                    role.save()

            allowed_modules = set(ROLE_MODULE_ACCESS.get(role_name, []))

            for module in MODULES:
                is_allowed = module in allowed_modules

                if role_name == "Super Admin":
                    permissions = {
                        "can_view": True,
                        "can_create": True,
                        "can_edit": True,
                        "can_delete": True,
                    }
                else:
                    permissions = {
                        "can_view": is_allowed,
                        "can_create": is_allowed,
                        "can_edit": is_allowed,
                        "can_delete": is_allowed,
                    }

                RolePermission.objects.update_or_create(
                    role=role,
                    module=module,
                    defaults=permissions,
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Seeded role: {role_name}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Default Tatito admin roles and permissions seeded successfully."
            )
        )