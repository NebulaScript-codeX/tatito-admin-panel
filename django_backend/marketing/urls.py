from rest_framework.routers import DefaultRouter

from .views import CouponViewSet, CouponUsageViewSet


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

urlpatterns = router.urls