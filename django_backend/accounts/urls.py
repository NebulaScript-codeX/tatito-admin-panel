from django.urls import path

from .views import AdminLoginView, AdminMeView


urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin-login"),
    path("me/", AdminMeView.as_view(), name="admin-me"),
]