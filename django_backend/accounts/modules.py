"""
Central registry of admin modules, actions and system roles.

The 19 module keys mirror the admin sidebar (admin/adminLayout.js) one-to-one.
Keep both lists in sync; MODULES here is the backend source of truth.
"""

SUPER_ADMIN = "Super Admin"

ACTIONS = ("view", "create", "edit", "delete")

MODULES = [
    ("dashboard", "Dashboard"),
    ("users", "Users"),
    ("staff", "Staff, Roles & Admin Accounts"),
    ("providers", "Healthcare Providers"),
    ("doctors", "Doctors & Appointments"),
    ("health_records", "Health Records"),
    ("pharmacy", "Pharmacy"),
    ("lab_tests", "Lab Tests"),
    ("orders_payments", "Orders & Payments"),
    ("health_plans", "Health Plans"),
    ("coupons_offers_marketing", "Coupons, Offers & Marketing"),
    ("content", "Content"),
    ("internships", "Internships"),
    ("promotions", "Manage Promotions"),
    ("support", "Support & Communication"),
    ("ai_assistant", "AI Assistant"),
    ("reports", "Reports & Analytics"),
    ("uploaded_files", "Uploaded Files & Documents"),
    ("settings", "Settings & Security"),
    ("audit_logs", "Audit Logs"),
]

MODULE_KEYS = [key for key, _ in MODULES]

SYSTEM_ROLES = {
    "Super Admin": "Full access to every module and action.",
    "Doctor": "Clinical staff: doctors & appointments, health records.",
    "Pharmacist": "Pharmacy and pharmacy orders.",
    "Lab Technician": "Lab tests and sample collections.",
    "Support Agent": "Support and read access to users/appointments.",
    "Content Manager": "Blogs and content.",
    "Internship HR": "Internship applications and postings.",
}

# Conservative starter matrix for non-super-admin roles.
# {role: {module: "vced"-style string of allowed actions: v=view c=create e=edit d=delete}}
DEFAULT_PERMISSIONS = {
    "Doctor": {"dashboard": "v", "doctors": "ve", "health_records": "ve"},
    "Pharmacist": {"dashboard": "v", "pharmacy": "vce", "orders_payments": "v"},
    "Lab Technician": {"dashboard": "v", "lab_tests": "ve"},
    "Support Agent": {"dashboard": "v", "users": "v", "doctors": "v", "support": "vce"},
    "Content Manager": {"dashboard": "v", "content": "vced", "health_plans": "v"},
    "Internship HR": {"dashboard": "v", "internships": "vced"},
}

ACTION_LETTER = {"v": "view", "c": "create", "e": "edit", "d": "delete"}
