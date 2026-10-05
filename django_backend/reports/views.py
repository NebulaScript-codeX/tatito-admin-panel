from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from care.models import Appointment, CarePayment, RefundRequest
from dashboard.models import PlatformDoctor, PlatformUser
from health_records.models import LabBooking
from internships.models import InternshipApplication
from accounts.permissions import ModulePermission


class ReportsView(APIView):
    permission_classes = [ModulePermission]
    module = "reports"

    def get_date_range(self, request):
        today = timezone.localdate()

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            start = (
                datetime.strptime(start_date, "%Y-%m-%d").date()
                if start_date
                else today - timedelta(days=30)
            )
            end = (
                datetime.strptime(end_date, "%Y-%m-%d").date()
                if end_date
                else today
            )
        except ValueError:
            start = today - timedelta(days=30)
            end = today

        if start > end:
            start, end = end, start

        return start, end

    def in_range(self, field, start, end):
        return {
            f"{field}__date__gte": start,
            f"{field}__date__lte": end,
        }

    def registrations(self, start, end):
        users = PlatformUser.objects.filter(
            **self.in_range("created_at", start, end)
        )

        doctors = PlatformDoctor.objects.filter(
            **self.in_range("created_at", start, end)
        )

        return {
            "total_users": users.count(),
            "patients": users.filter(
                role=PlatformUser.Role.PATIENT
            ).count(),
            "doctors": users.filter(
                role=PlatformUser.Role.DOCTOR
            ).count(),
            "partners": users.filter(
                role=PlatformUser.Role.PARTNER
            ).count(),
            "doctor_profiles_registered": doctors.count(),
        }

    def appointments(self, start, end):
        queryset = Appointment.objects.filter(
            date__gte=start,
            date__lte=end,
        )

        status_breakdown = list(
            queryset.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        specialty_breakdown = list(
            queryset.values("specialty_name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return {
            "total": queryset.count(),
            "status_breakdown": status_breakdown,
            "specialty_breakdown": specialty_breakdown,
        }

    def payments(self, start, end):
        payments = CarePayment.objects.filter(
            **self.in_range("created_at", start, end)
        )

        paid = payments.filter(
            status=CarePayment.Status.PAID
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        pending = payments.filter(
            status=CarePayment.Status.PENDING
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        refunded = payments.filter(
            status=CarePayment.Status.REFUNDED
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        refund_requests = RefundRequest.objects.filter(
            **self.in_range("created_at", start, end)
        )

        return {
            "collected": float(paid),
            "pending": float(pending),
            "refunded": float(refunded),
            "refund_requests": refund_requests.count(),
            "payment_count": payments.count(),
            "revenue_by_module": [
                {
                    "module": "Doctor Consultation",
                    "amount": float(
                        payments.filter(
                            kind=CarePayment.Kind.CONSULTATION,
                            status=CarePayment.Status.PAID,
                        ).aggregate(total=Sum("amount"))["total"]
                        or Decimal("0")
                    ),
                }
            ],
        }

    def lab_tests(self, start, end):
        queryset = LabBooking.objects.filter(
            specimen_date__gte=start,
            specimen_date__lte=end,
        )

        status_breakdown = list(
            queryset.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        completed = queryset.filter(
            status=LabBooking.Status.COMPLETED
        ).count()

        return {
            "total_bookings": queryset.count(),
            "completed_reports": completed,
            "status_breakdown": status_breakdown,
        }

    def applications(self, start, end):
        queryset = InternshipApplication.objects.filter(
            applied_at__date__gte=start,
            applied_at__date__lte=end,
        )

        stage_breakdown = list(
            queryset.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        track_breakdown = list(
            queryset.values(
                "track__title",
                "track__track_type",
            )
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return {
            "total": queryset.count(),
            "stage_breakdown": stage_breakdown,
            "track_breakdown": track_breakdown,
        }

    def unavailable_report(self, reason):
        return {
            "available": False,
            "reason": reason,
            "data": [],
        }

    def get(self, request):
        start, end = self.get_date_range(request)

        report = request.query_params.get("report", "all")

        reports = {}

        if report in ("all", "registrations"):
            reports["registrations"] = self.registrations(start, end)

        if report in ("all", "appointments"):
            reports["appointments"] = self.appointments(start, end)

        if report in ("all", "lab_tests"):
            reports["lab_tests"] = self.lab_tests(start, end)

        if report in ("all", "payments"):
            reports["payments"] = self.payments(start, end)

        if report in ("all", "applications"):
            reports["applications"] = self.applications(start, end)

        if report in ("all", "orders"):
            reports["orders"] = self.unavailable_report(
                "No medicine/pharmacy order model is available in the current Django backend."
            )

        if report in ("all", "subscriptions"):
            reports["subscriptions"] = self.unavailable_report(
                "No health-plan subscription model is available in the current Django backend."
            )

        return Response(
            {
                "success": True,
                "date_range": {
                    "start": start,
                    "end": end,
                },
                "reports": reports,
            }
        )