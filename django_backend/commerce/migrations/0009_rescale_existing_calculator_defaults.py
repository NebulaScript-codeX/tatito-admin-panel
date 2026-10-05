from decimal import Decimal

from django.db import migrations


INTEGER_DEFAULTS = {
    "pharmacy_spend_min": (20, 500),
    "pharmacy_spend_max": (400, 10000),
    "pharmacy_spend_step": (10, 250),
    "pharmacy_spend_default": (80, 3000),
    "lab_spend_min": (50, 500),
    "lab_spend_max": (800, 20000),
    "lab_spend_step": (25, 500),
    "lab_spend_default": (200, 4000),
}


def rescale_calculator_defaults(apps, schema_editor):
    Config = apps.get_model("commerce", "HealthPlanCalculatorConfig")
    alias = schema_editor.connection.alias
    for config in Config.objects.using(alias).all():
        changed = []
        for field, (old_value, new_value) in INTEGER_DEFAULTS.items():
            if getattr(config, field) == old_value:
                setattr(config, field, new_value)
                changed.append(field)
        if config.consultation_value == Decimal("50.00"):
            config.consultation_value = Decimal("500.00")
            changed.append("consultation_value")
        if changed:
            config.save(using=alias, update_fields=changed)

    Config.objects.using(alias).filter(
        development_key="dev-health-plan-calculator-default",
        is_development_data=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("commerce", "0008_inr_catalog_and_calculator_defaults")]

    operations = [
        migrations.RunPython(rescale_calculator_defaults, migrations.RunPython.noop),
    ]
