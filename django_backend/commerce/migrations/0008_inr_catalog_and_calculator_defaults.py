from decimal import Decimal

import django.core.validators
from django.db import migrations, models


PLAN_PRICES = {
    "starter": (Decimal("299.00"), Decimal("249.00")),
    "family": (Decimal("799.00"), Decimal("649.00")),
    "executive": (Decimal("1499.00"), Decimal("1249.00")),
    "vip": (Decimal("2999.00"), Decimal("2499.00")),
}


def update_plan_prices(apps, schema_editor):
    HealthPlan = apps.get_model("commerce", "HealthPlan")
    alias = schema_editor.connection.alias
    for code, (monthly, annual_monthly) in PLAN_PRICES.items():
        HealthPlan.objects.using(alias).filter(code=code).update(
            monthly_price=monthly,
            annual_monthly_price=annual_monthly,
        )


class Migration(migrations.Migration):
    dependencies = [("commerce", "0007_backfill_structured_plan_benefits")]

    operations = [
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="pharmacy_spend_min",
            field=models.PositiveSmallIntegerField(default=500),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="pharmacy_spend_max",
            field=models.PositiveSmallIntegerField(default=10000),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="pharmacy_spend_step",
            field=models.PositiveSmallIntegerField(default=250),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="pharmacy_spend_default",
            field=models.PositiveSmallIntegerField(default=3000),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="lab_spend_min",
            field=models.PositiveSmallIntegerField(default=500),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="lab_spend_max",
            field=models.PositiveSmallIntegerField(default=20000),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="lab_spend_step",
            field=models.PositiveSmallIntegerField(default=500),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="lab_spend_default",
            field=models.PositiveSmallIntegerField(default=4000),
        ),
        migrations.AlterField(
            model_name="healthplancalculatorconfig",
            name="consultation_value",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("500.00"),
                max_digits=8,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
            ),
        ),
        migrations.RunPython(update_plan_prices, migrations.RunPython.noop),
    ]
