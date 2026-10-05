from django.urls import path

from .views import (
    HealthRecordAccessLogView,
    HealthRecordCollectionView,
    HealthRecordCountsView,
    HealthRecordLabReportFileView,
    HealthRecordItemView,
    HealthRecordPatientDetailView,
    HealthRecordPatientListView,
)

urlpatterns = [
    path("patients/", HealthRecordPatientListView.as_view(), name="health-record-patients"),
    path("counts/", HealthRecordCountsView.as_view(), name="health-record-counts"),
    path(
        "patients/<uuid:patient_id>/",
        HealthRecordPatientDetailView.as_view(),
        name="health-record-patient",
    ),
    path(
        "patients/<uuid:patient_id>/access-log/",
        HealthRecordAccessLogView.as_view(),
        name="health-record-access-log",
    ),
    path(
        "lab-reports/<int:pk>/file/",
        HealthRecordLabReportFileView.as_view(),
        name="health-record-lab-report-file",
    ),
    path("<str:resource>/", HealthRecordCollectionView.as_view(), name="health-record-collection"),
    path(
        "<str:resource>/<int:pk>/",
        HealthRecordItemView.as_view(),
        name="health-record-item",
    ),
]
