from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PharmacyBatchViewSet,
    PharmacyBrandViewSet,
    PharmacyCategoryViewSet,
    PharmacyMetaView,
    PharmacyOrderViewSet,
    PharmacyPrescriptionViewSet,
    PharmacyProductViewSet,
    PharmacySummaryView,
)

router = DefaultRouter()
router.register("products", PharmacyProductViewSet, basename="pharmacy-product")
router.register("categories", PharmacyCategoryViewSet, basename="pharmacy-category")
router.register("brands", PharmacyBrandViewSet, basename="pharmacy-brand")
router.register("batches", PharmacyBatchViewSet, basename="pharmacy-batch")
router.register("prescriptions", PharmacyPrescriptionViewSet, basename="pharmacy-prescription")
router.register("orders", PharmacyOrderViewSet, basename="pharmacy-order")

urlpatterns = [
    path("summary/", PharmacySummaryView.as_view(), name="pharmacy-summary"),
    path("meta/", PharmacyMetaView.as_view(), name="pharmacy-meta"),
] + router.urls
