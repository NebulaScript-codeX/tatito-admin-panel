from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DiagnosticCentreListView,
    HealthCheckBundleViewSet,
    LabBookingViewSet,
    LabTestCategoryViewSet,
    LabTestPackageViewSet,
    LabTestSummaryView,
    LabTestMetaView,
    LabTestViewSet,
    OrganProfileCategoryViewSet,
    PhlebotomistViewSet,
    RadiologyServiceViewSet,
    ScanBookingViewSet,
)

router = DefaultRouter()
router.register("tests", LabTestViewSet, basename="lab-test")
router.register("categories", LabTestCategoryViewSet, basename="lab-test-category")
router.register(
    "organ-categories", OrganProfileCategoryViewSet, basename="lab-organ-category"
)
router.register("packages", LabTestPackageViewSet, basename="lab-test-package")
router.register(
    "health-checks", HealthCheckBundleViewSet, basename="lab-health-check"
)
router.register("radiology", RadiologyServiceViewSet, basename="lab-radiology")
router.register("radiology-bookings", ScanBookingViewSet, basename="radiology-booking")
# Retain the initial endpoint name as a compatibility alias.
router.register("scan-bookings", ScanBookingViewSet, basename="scan-booking")
router.register("bookings", LabBookingViewSet, basename="lab-booking")
router.register("phlebotomists", PhlebotomistViewSet, basename="lab-phlebotomist")

urlpatterns = [
    path("summary/", LabTestSummaryView.as_view(), name="lab-test-summary"),
    path("meta/", LabTestMetaView.as_view(), name="lab-test-meta"),
    path("centres/", DiagnosticCentreListView.as_view(), name="lab-test-centres"),
] + router.urls
