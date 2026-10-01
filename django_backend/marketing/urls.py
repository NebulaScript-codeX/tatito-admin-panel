from rest_framework.routers import DefaultRouter

from .views import CouponViewSet, CouponUsageViewSet, PromotionViewSet


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
    r"promotions",
    PromotionViewSet,
    basename="admin-promotions",
)

urlpatterns = router.urls