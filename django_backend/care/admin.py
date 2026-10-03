from django.contrib import admin

from .models import (
    Appointment,
    AppointmentSlot,
    AppointmentTimeline,
    CallLog,
    CarePayment,
    CarePatient,
    CareSetting,
    Doctor,
    DoctorLeave,
    DoctorPayout,
    InstantConsult,
    RefundRequest,
    Review,
    Specialty,
    WeeklySchedule,
)


class DevelopmentDataAdmin(admin.ModelAdmin):
    list_display = ("__str__", "is_development_data", "development_key")
    list_filter = ("is_development_data",)
    search_fields = ("development_key",)


@admin.register(Specialty)
class SpecialtyAdmin(DevelopmentDataAdmin):
    search_fields = ("name", "description", "development_key")


@admin.register(Doctor)
class DoctorAdmin(DevelopmentDataAdmin):
    list_display = ("name", "specialty", "city", "verification_status", "is_development_data")
    list_filter = ("verification_status", "is_development_data")
    search_fields = ("name", "city", "development_key")


for model in (
    WeeklySchedule,
    DoctorLeave,
    AppointmentSlot,
    CarePatient,
    Appointment,
    AppointmentTimeline,
    CarePayment,
    RefundRequest,
    InstantConsult,
    CallLog,
    Review,
    DoctorPayout,
    CareSetting,
):
    admin.site.register(model, DevelopmentDataAdmin)
