from django.urls import path
from .views import VerifyRegistrationView

urlpatterns = [
    path('verify/', VerifyRegistrationView.as_view(), name='verify-registration'),
]
