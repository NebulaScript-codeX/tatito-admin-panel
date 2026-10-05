from django.db import migrations


def enable_vip_household_members(apps, schema_editor):
    HealthPlan = apps.get_model("commerce", "HealthPlan")
    HealthPlan.objects.using(schema_editor.connection.alias).filter(
        code="vip",
        maximum_family_members=1,
    ).update(maximum_family_members=5)


class Migration(migrations.Migration):
    dependencies = [("commerce", "0009_rescale_existing_calculator_defaults")]

    operations = [
        migrations.RunPython(
            enable_vip_household_members,
            migrations.RunPython.noop,
        ),
    ]
