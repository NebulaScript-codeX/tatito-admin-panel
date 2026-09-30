from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    path(
        "api/admin/",
        include("accounts.urls"),
    ),

    path(
        "api/admin/marketing/",
        include("marketing.urls"),
    ),
]