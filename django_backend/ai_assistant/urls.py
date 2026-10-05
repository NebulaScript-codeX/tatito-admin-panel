from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssistantSettingsViewSet,
    QueryLogViewSet,
    SafetyRuleViewSet,
    SuggestedChipViewSet,
)


router = DefaultRouter()

router.register(
    r"settings",
    AssistantSettingsViewSet,
    basename="ai-settings",
)

router.register(
    r"chips",
    SuggestedChipViewSet,
    basename="ai-chip",
)

router.register(
    r"query-logs",
    QueryLogViewSet,
    basename="ai-query-log",
)

router.register(
    r"safety-rules",
    SafetyRuleViewSet,
    basename="ai-safety-rule",
)


urlpatterns = [
    path("", include(router.urls)),
]