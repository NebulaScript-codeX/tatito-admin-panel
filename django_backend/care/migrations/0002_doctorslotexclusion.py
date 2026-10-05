import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("care", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DoctorSlotExclusion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField()),
                ("start_time", models.TimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "doctor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="slot_exclusions",
                        to="care.doctor",
                    ),
                ),
            ],
            options={
                "ordering": ["date", "start_time"],
            },
        ),
        migrations.AddConstraint(
            model_name="doctorslotexclusion",
            constraint=models.UniqueConstraint(
                fields=("doctor", "date", "start_time"),
                name="care_unique_doctor_slot_exclusion",
            ),
        ),
    ]
