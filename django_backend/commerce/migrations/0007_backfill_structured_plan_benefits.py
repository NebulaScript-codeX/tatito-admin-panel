import re

from django.db import migrations


def backfill_plan_benefits(apps, schema_editor):
    HealthPlan = apps.get_model("commerce", "HealthPlan")
    alias = schema_editor.connection.alias
    for plan in HealthPlan.objects.using(alias).all().iterator():
        features = plan.features if isinstance(plan.features, list) else []
        text = " ".join(str(item) for item in features)
        consultation = re.search(r"(\d+)\s+Free Doctor Consultations?\s*/\s*month", text, re.I)
        pharmacy = re.search(r"(\d+(?:\.\d+)?)%\s+Off[^.]*Pharmacy", text, re.I)
        lab = re.search(r"(\d+(?:\.\d+)?)%\s+Discount[^.]*Lab", text, re.I)
        family = re.search(r"(?:Up to\s+)?(\d+)\s+Family Members?", text, re.I)
        checkups = re.search(r"(\d+)\s+Free (?:Full Body Health Checkup|Executive Health Packages?)\s*/\s*year", text, re.I)
        ambulance = re.search(r"(\d+(?:\.\d+)?)%\s+Covered Emergency Ambulance", text, re.I)
        plan.free_consultations_per_month = (
            int(consultation.group(1))
            if consultation
            else None
            if re.search(r"Unlimited.*Consultations?", text, re.I)
            else 0
        )
        plan.pharmacy_discount_percent = pharmacy.group(1) if pharmacy else 0
        plan.lab_discount_percent = lab.group(1) if lab else 0
        plan.maximum_family_members = int(family.group(1)) if family else 1
        plan.free_home_sample_count = int(
            bool(re.search(r"Free (?:Doorstep )?Home Sample Collection|Free Doorstep Sample Collection", text, re.I))
        )
        plan.annual_checkup_count = int(checkups.group(1)) if checkups else int(
            bool(re.search(r"Free Annual Comprehensive Health", text, re.I))
        )
        plan.ambulance_discount_percent = ambulance.group(1) if ambulance else 0
        plan.care_manager = bool(re.search(r"Care Manager|Care Team", text, re.I))
        plan.is_popular = "popular" in (plan.badge or "").lower()
        plan.save(
            using=alias,
            update_fields=[
                "free_consultations_per_month",
                "pharmacy_discount_percent",
                "lab_discount_percent",
                "maximum_family_members",
                "free_home_sample_count",
                "annual_checkup_count",
                "ambulance_discount_percent",
                "care_manager",
                "is_popular",
            ],
        )


class Migration(migrations.Migration):
    dependencies = [("commerce", "0006_healthplancalculatorconfig_and_more")]

    operations = [
        migrations.RunPython(backfill_plan_benefits, migrations.RunPython.noop),
    ]
