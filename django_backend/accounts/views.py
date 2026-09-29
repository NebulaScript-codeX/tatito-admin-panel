from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny

from .models import AdminProfile
from rest_framework.permissions import AllowAny
from .permissions import IsAdminUser


class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {
                    "success": False,
                    "message": "Username and password are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {
                    "success": False,
                    "message": "Invalid username or password.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            admin_profile = user.admin_profile
        except AdminProfile.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "This account is not an admin account.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active or not admin_profile.is_active:
            return Response(
                {
                    "success": False,
                    "message": "This admin account is inactive.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "admin": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}".strip(),
                    "role": admin_profile.role.name,
                },
            },
            status=status.HTTP_200_OK,
        )


class AdminMeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        profile = request.user.admin_profile

        return Response(
            {
                "success": True,
                "admin": {
                    "id": request.user.id,
                    "username": request.user.username,
                    "email": request.user.email,
                    "name": (
                        f"{request.user.first_name} "
                        f"{request.user.last_name}"
                    ).strip(),
                    "role": profile.role.name,
                },
            }
        )