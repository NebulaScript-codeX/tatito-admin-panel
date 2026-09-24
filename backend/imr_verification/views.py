from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.nmc_scraper import fetch_doctor_imr_records

class VerifyRegistrationView(APIView):
    """
    API endpoint: POST /api/v1/imr/verify/
    Payload: { "registration_no": "1720" }
    """
    def post(self, request):
        reg_no = request.data.get('registration_no', '').strip()
        if not reg_no:
            return Response(
                {'error': 'Registration number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            page = int(request.data.get('page', 1))
        except (ValueError, TypeError):
            page = 1

        try:
            per_page = int(request.data.get('per_page', 25))
        except (ValueError, TypeError):
            per_page = 25

        try:
            records, pagination = fetch_doctor_imr_records(reg_no, page=page, per_page=per_page)
            total = pagination.get('total', len(records))
            count = len(records)

            # Case A: Exactly 1 doctor found -> Returns detail record directly
            if total == 1 and count >= 1 and page == 1:
                return Response({
                    'status': 'single_match',
                    'count': 1,
                    'doctor': records[0]
                }, status=status.HTTP_200_OK)

            # Case B: Multiple doctors found -> Returns list for table
            elif count > 0:
                return Response({
                    'status': 'multiple_matches',
                    'count': total,
                    'pagination': pagination,
                    'doctors': records
                }, status=status.HTTP_200_OK)

            # Case C: 0 doctors found
            else:
                return Response({
                    'status': 'no_match',
                    'count': 0,
                    'message': 'Would you like to continue manually?'
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'status': 'no_match',
                'count': 0,
                'message': 'Would you like to continue manually?'
            }, status=status.HTTP_200_OK)
