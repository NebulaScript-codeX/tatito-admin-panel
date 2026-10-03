from rest_framework.routers import DefaultRouter

from .views import (
    InternshipAlumniViewSet,
    InternshipApplicationViewSet,
    InternshipPartnerViewSet,
    InternshipTrackViewSet,
)


router = DefaultRouter()

router.register(
    r"tracks",
    InternshipTrackViewSet,
    basename="admin-internship-tracks",
)

router.register(
    r"applications",
    InternshipApplicationViewSet,
    basename="admin-internship-applications",
)

router.register(
    r"partners",
    InternshipPartnerViewSet,
    basename="admin-internship-partners",
)

router.register(
    r"alumni",
    InternshipAlumniViewSet,
    basename="admin-internship-alumni",
)

urlpatterns = router.urls