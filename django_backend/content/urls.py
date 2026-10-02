from rest_framework.routers import DefaultRouter

from .views import (
    AnnouncementViewSet,
    BlogCategoryViewSet,
    BlogTagViewSet,
    BlogViewSet,
    CityViewSet,
    FAQViewSet,
    FeaturedServiceViewSet,
    HomepageBannerViewSet,
    TestimonialViewSet,
    TrustStatViewSet,
    WebsitePageViewSet,
)


router = DefaultRouter()

router.register(
    r"blog-categories",
    BlogCategoryViewSet,
    basename="admin-blog-categories",
)

router.register(
    r"blog-tags",
    BlogTagViewSet,
    basename="admin-blog-tags",
)

router.register(
    r"blogs",
    BlogViewSet,
    basename="admin-blogs",
)

router.register(
    r"homepage-banners",
    HomepageBannerViewSet,
    basename="admin-homepage-banners",
)

router.register(
    r"announcements",
    AnnouncementViewSet,
    basename="admin-announcements",
)

router.register(
    r"featured-services",
    FeaturedServiceViewSet,
    basename="admin-featured-services",
)

router.register(
    r"faqs",
    FAQViewSet,
    basename="admin-faqs",
)

router.register(
    r"testimonials",
    TestimonialViewSet,
    basename="admin-testimonials",
)

router.register(
    r"trust-stats",
    TrustStatViewSet,
    basename="admin-trust-stats",
)

router.register(
    r"website-pages",
    WebsitePageViewSet,
    basename="admin-website-pages",
)

router.register(
    r"cities",
    CityViewSet,
    basename="admin-cities",
)

urlpatterns = router.urls