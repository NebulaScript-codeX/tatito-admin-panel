from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    HealthcareProviderViewSet,
    ProviderDocumentDetailView,
    ProviderDocumentFileView,
    ProviderDocumentListCreateView,
)

router = DefaultRouter()
router.register("providers", HealthcareProviderViewSet, basename="healthcare-providers")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "providers/<int:pk>/documents/",
        ProviderDocumentListCreateView.as_view(),
        name="provider-documents",
    ),
    path(
        "providers/<int:pk>/documents/<int:document_id>/",
        ProviderDocumentDetailView.as_view(),
        name="provider-document-detail",
    ),
    path(
        "providers/documents/<int:document_id>/file/",
        ProviderDocumentFileView.as_view(),
        name="provider-document-file",
    ),
]
