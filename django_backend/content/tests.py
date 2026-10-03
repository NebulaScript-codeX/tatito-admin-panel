from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from content.models import (
    Announcement,
    Blog,
    BlogCategory,
    BlogTag,
    City,
    FAQ,
    FeaturedService,
    HomepageBanner,
    Testimonial,
    TrustStat,
    WebsitePage,
)


class ContentDevelopmentDataTests(TestCase):
    @override_settings(DEBUG=True)
    def test_seed_is_idempotent_and_creates_each_content_type(self):
        call_command("seed_content_development_data", verbosity=0)
        call_command("seed_content_development_data", verbosity=0)

        self.assertEqual(Blog.objects.filter(slug__startswith="dev-sample-").count(), 3)
        self.assertEqual(
            BlogCategory.objects.filter(name__startswith="DEV Sample ").count(), 2
        )
        self.assertEqual(BlogTag.objects.filter(name__startswith="DEV Sample ").count(), 3)
        self.assertEqual(
            HomepageBanner.objects.filter(title__startswith="DEV Sample:").count(), 2
        )
        self.assertEqual(
            Announcement.objects.filter(title__startswith="DEV Sample:").count(), 2
        )
        self.assertEqual(
            FeaturedService.objects.filter(title__startswith="DEV Sample:").count(), 2
        )
        self.assertEqual(FAQ.objects.filter(question__startswith="DEV Sample:").count(), 3)
        self.assertEqual(Testimonial.objects.filter(name__startswith="DEV Sample ").count(), 2)
        self.assertEqual(TrustStat.objects.filter(label__startswith="DEV Sample ").count(), 4)
        self.assertEqual(WebsitePage.objects.filter(slug__startswith="dev-sample-").count(), 2)
        self.assertEqual(City.objects.filter(name__startswith="DEV Sample ").count(), 5)

    @override_settings(DEBUG=False)
    def test_seed_is_disabled_outside_debug_mode(self):
        with self.assertRaises(CommandError):
            call_command("seed_content_development_data", verbosity=0)
