from django.urls import path

from .views import CareActionView, CareCollectionView, CareDetailView

urlpatterns = [
    path("<str:resource>/", CareCollectionView.as_view(), name="care-collection"),
    path(
        "<str:resource>/<str:pk>/action/<str:action>/",
        CareActionView.as_view(),
        name="care-action",
    ),
    path("<str:resource>/<str:pk>/", CareDetailView.as_view(), name="care-detail"),
]
