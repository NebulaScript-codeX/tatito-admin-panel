from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AdminProfile, Role

from .models import Promotion


class PromotionApiTests(TestCase):
	def setUp(self):
		call_command("seed_admin_roles", verbosity=0)
		role = Role.objects.get(name="Super Admin")
		self.admin = User.objects.create_user(
			username="promotion-admin",
			email="promotion-admin@example.com",
			password="StrongPass!234",
		)
		AdminProfile.objects.create(user=self.admin, role=role)
		self.api = APIClient()
		self.api.force_authenticate(user=self.admin)
		self.url = "/api/admin/marketing/promotions/"
		self.payload = {
			"title": "Spring Health Check",
			"description": "Book a preventive health check.",
			"image_url": "https://example.com/spring-banner.png",
			"cta_text": "Book now",
			"cta_link": "/health-checks",
			"start_date": (timezone.now() + timedelta(days=1)).isoformat(),
			"end_date": (timezone.now() + timedelta(days=14)).isoformat(),
			"is_active": True,
		}

	def test_promotion_crud_search_and_status_are_persisted(self):
		created = self.api.post(self.url, self.payload, format="json")
		self.assertEqual(created.status_code, 201)
		promotion_id = created.data["id"]
		self.assertEqual(created.data["created_by"], self.admin.id)
		self.assertEqual(Promotion.objects.get(pk=promotion_id).title, self.payload["title"])

		searched = self.api.get(self.url, {"search": "Spring"})
		self.assertEqual(len(searched.data), 1)
		self.assertEqual(searched.data[0]["id"], promotion_id)

		updated = self.api.patch(
			f"{self.url}{promotion_id}/",
			{"title": "Spring Wellness Campaign", "is_active": False},
			format="json",
		)
		self.assertEqual(updated.status_code, 200)
		self.assertEqual(updated.data["status"], "inactive")
		self.assertEqual(Promotion.objects.get(pk=promotion_id).title, "Spring Wellness Campaign")
		inactive = self.api.get(self.url, {"status": "inactive"})
		self.assertEqual([item["id"] for item in inactive.data], [promotion_id])

		deleted = self.api.delete(f"{self.url}{promotion_id}/")
		self.assertEqual(deleted.status_code, 204)
		self.assertFalse(Promotion.objects.filter(pk=promotion_id).exists())

	def test_promotion_date_range_is_validated(self):
		payload = {
			**self.payload,
			"start_date": (timezone.now() + timedelta(days=3)).isoformat(),
			"end_date": (timezone.now() + timedelta(days=2)).isoformat(),
		}
		response = self.api.post(self.url, payload, format="json")
		self.assertEqual(response.status_code, 400)
		self.assertIn("end_date", response.data)
		self.assertEqual(Promotion.objects.count(), 0)

	def test_promotion_api_enforces_module_permissions(self):
		role = Role.objects.create(name="No Promotions")
		user = User.objects.create_user(
			username="no-promotions",
			email="no-promotions@example.com",
			password="StrongPass!234",
		)
		AdminProfile.objects.create(user=user, role=role)
		client = APIClient()
		client.force_authenticate(user=user)

		self.assertEqual(client.get(self.url).status_code, 403)
		self.assertEqual(client.post(self.url, self.payload, format="json").status_code, 403)

		promotion = Promotion.objects.create(
			title="Existing promotion",
			start_date=timezone.now(),
			end_date=timezone.now() + timedelta(days=1),
		)
		self.assertEqual(
			client.patch(
				f"{self.url}{promotion.id}/",
				{"title": "Unauthorized edit"},
				format="json",
			).status_code,
			403,
		)
		self.assertEqual(client.delete(f"{self.url}{promotion.id}/").status_code, 403)
