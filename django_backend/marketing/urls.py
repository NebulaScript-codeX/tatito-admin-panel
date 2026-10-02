from rest_framework.routers import DefaultRouter

from .views import (
    CouponViewSet,
    CouponUsageViewSet,
    FeaturedPromotionViewSet,
    PromotionalContentViewSet,
    PromotionViewSet,
)

router = DefaultRouter()

router.register(r"coupons", CouponViewSet, basename="coupon")
router.register(r"coupon-usage", CouponUsageViewSet, basename="coupon-usage")
router.register(
    r"featured-promotions",
    FeaturedPromotionViewSet,
    basename="featured-promotion",
)
router.register(
    r"promotional-content",
    PromotionalContentViewSet,
    basename="promotional-content",
)
router.register(
    r"promotions",
    PromotionViewSet,
    basename="promotion",
)

urlpatterns = router.urls