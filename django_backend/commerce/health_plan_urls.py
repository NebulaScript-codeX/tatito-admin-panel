from django.urls import path

from .admin_views import (
    HealthPlanAdminCollectionView,
    HealthPlanAdminDetailView,
    HealthPlanBenefitUsageView,
    HealthPlanCalculatorView,
    HealthPlanFamilyView,
    HealthPlanPatientsView,
    HealthPlanRefundsView,
    HealthPlanSubscriptionActionView,
    HealthPlanSubscriptionHistoryView,
    HealthPlanSubscriptionsView,
)

urlpatterns = [
    path("plans/", HealthPlanAdminCollectionView.as_view(), name="admin-health-plans"),
    path("plans/<int:plan_id>/", HealthPlanAdminDetailView.as_view(), name="admin-health-plan-detail"),
    path("calculator/", HealthPlanCalculatorView.as_view(), name="admin-health-plan-calculator"),
    path("patients/", HealthPlanPatientsView.as_view(), name="admin-health-plan-patients"),
    path("subscriptions/", HealthPlanSubscriptionsView.as_view(), name="admin-health-plan-subscriptions"),
    path("subscriptions/<int:subscription_id>/action/", HealthPlanSubscriptionActionView.as_view(), name="admin-health-plan-subscription-action"),
    path("subscriptions/<int:subscription_id>/history/", HealthPlanSubscriptionHistoryView.as_view(), name="admin-health-plan-subscription-history"),
    path("subscriptions/<int:subscription_id>/family/", HealthPlanFamilyView.as_view(), name="admin-health-plan-family"),
    path("subscriptions/<int:subscription_id>/family/<int:member_id>/", HealthPlanFamilyView.as_view(), name="admin-health-plan-family-detail"),
    path("benefit-usage/", HealthPlanBenefitUsageView.as_view(), name="admin-health-plan-benefit-usage"),
    path("refunds/", HealthPlanRefundsView.as_view(), name="admin-health-plan-refunds"),
    path("refunds/<int:refund_id>/", HealthPlanRefundsView.as_view(), name="admin-health-plan-refund-action"),
]
