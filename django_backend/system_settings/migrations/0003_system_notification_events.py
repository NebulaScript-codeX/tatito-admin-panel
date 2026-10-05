from django.db import migrations


def seed_system_notification_events(apps, schema_editor):
    SystemNotificationSetting = apps.get_model(
        "system_settings",
        "SystemNotificationSetting",
    )

    events = [
        ("new_order", "New Order"),
        ("pending_verification", "Pending Verification"),
        ("low_stock", "Low Stock"),
        ("refund_request", "Refund Request"),
    ]

    for event_key, event_name in events:
        SystemNotificationSetting.objects.get_or_create(
            event_key=event_key,
            defaults={
                "event_name": event_name,
                "enabled": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("system_settings", "0002_addonsetting_systemnotificationsetting_and_more"),
    ]

    operations = [
        migrations.RunPython(
            seed_system_notification_events,
            migrations.RunPython.noop,
        ),
    ]