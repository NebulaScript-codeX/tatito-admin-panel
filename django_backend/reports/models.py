from django.db import models


class ReportExportLog(models.Model):
    REPORT_TYPES = [
        ("registrations", "Registration Report"),
        ("appointments", "Appointment Report"),
        ("orders", "Order Report"),
        ("lab_tests", "Lab Test Report"),
        ("payments", "Payment Report"),
        ("subscriptions", "Subscription Report"),
        ("applications", "Application Report"),
    ]

    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    filters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_report_type_display()} - {self.created_at}"