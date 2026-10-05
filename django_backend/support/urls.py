from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContactQueryViewSet,
    EmergencyRequestViewSet,
    NotificationTemplateViewSet,
    NotificationViewSet,
    SupportTicketViewSet,
)

router = DefaultRouter()

router.register(
    r"tickets",
    SupportTicketViewSet,
    basename="support-ticket",
)

router.register(
    r"contact-queries",
    ContactQueryViewSet,
    basename="contact-query",
)

router.register(
    r"emergency-requests",
    EmergencyRequestViewSet,
    basename="emergency-request",
)

router.register(
    r"notification-templates",
    NotificationTemplateViewSet,
    basename="notification-template",
)

router.register(
    r"notifications",
    NotificationViewSet,
    basename="notification",
)

urlpatterns = [
    path("", include(router.urls)),
]