from django.urls import path

from .views import (
    MediaFileDetailView,
    MediaFileListCreateView,
    UserDocumentListView,
    UserDocumentReviewView,
)

urlpatterns = [
    path("documents/", UserDocumentListView.as_view(), name="documents"),
    path(
        "documents/<int:pk>/review/",
        UserDocumentReviewView.as_view(),
        name="document-review",
    ),
    path(
        "media/",
        MediaFileListCreateView.as_view(),
        name="media-list-create",
    ),
    path(
        "media/<int:pk>/",
        MediaFileDetailView.as_view(),
        name="media-detail",
    ),
]