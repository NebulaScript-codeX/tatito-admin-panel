from django.urls import path

from .views import (
    PublicHealthPlanCalculatorView,
    PublicHealthPlanFamilyView,
    PublicHealthPlanRefundRequestView,
    PublicHealthPlanSubscriptionsView,
    PublicHealthPlansView,
    PublicPlanSubscribeView,
)

urlpatterns = [
    path("", PublicHealthPlansView.as_view(), name="public-health-plans"),
    path("subscribe/", PublicPlanSubscribeView.as_view(), name="public-plan-subscribe"),
    path("calculator/", PublicHealthPlanCalculatorView.as_view(), name="public-health-plan-calculator"),
    path("my-subscriptions/", PublicHealthPlanSubscriptionsView.as_view(), name="public-health-plan-subscriptions"),
    path("my-subscriptions/<int:subscription_id>/family/", PublicHealthPlanFamilyView.as_view(), name="public-health-plan-family"),
    path("my-subscriptions/<int:subscription_id>/family/<int:member_id>/", PublicHealthPlanFamilyView.as_view(), name="public-health-plan-family-detail"),
    path("refund-requests/", PublicHealthPlanRefundRequestView.as_view(), name="public-health-plan-refund"),
]
