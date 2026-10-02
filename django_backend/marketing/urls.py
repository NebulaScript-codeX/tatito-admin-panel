from rest_framework.routers import DefaultRouter

from .views import (
    CouponViewSet,
    CouponUsageViewSet,
    FeaturedPromotionViewSet,
    PromotionalContentViewSet,
)


router = DefaultRouter()

router.register(
    r"coupons",
    CouponViewSet,
    basename="admin-coupons",
)

router.register(
    r"coupon-usages",
    CouponUsageViewSet,
    basename="admin-coupon-usages",
)

router.register(
    r"featured-promotions",
    FeaturedPromotionViewSet,
    basename="admin-featured-promotions",
)

router.register(
    r"promotional-content",
    PromotionalContentViewSet,
    basename="admin-promotional-content",
)

urlpatterns = router.urls