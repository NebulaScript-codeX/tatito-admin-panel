from django.db import migrations


def seed_default_platform_settings(apps, schema_editor):
    PlatformSettings = apps.get_model("system_settings", "PlatformSettings")
    database = schema_editor.connection.alias

    PlatformSettings.objects.using(database).get_or_create(
        pk=1,
        defaults={
            "site_name": "Tatito Health+",
            "logo_url": "",
            "favicon_url": "",
            "support_email": "",
            "support_phone": "",
            "contact_address": "",
            "social_facebook": "",
            "social_instagram": "",
            "social_twitter": "",
            "social_linkedin": "",
            "footer_text": "",
            "announcement_enabled": False,
            "announcement_text": "",
            "maintenance_mode": False,
            "currency": "INR",
            "currency_symbol": "₹",
            "date_format": "DD/MM/YYYY",
            "timezone": "Asia/Kolkata",
            "tax_percentage": 0,
            "doctor_commission_percentage": 0,
            "delivery_fee_rule": "flat",
            "delivery_fee_amount": 0,
            "payment_gateway_name": "",
            "payment_gateway_mode": "test",
            "payment_gateway_public_key": "",
            "otp_enabled": True,
            "otp_expiry_minutes": 5,
            "session_timeout_minutes": 30,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("system_settings", "0003_system_notification_events"),
    ]

    operations = [
        migrations.RunPython(
            seed_default_platform_settings,
            migrations.RunPython.noop,
        ),
    ]
