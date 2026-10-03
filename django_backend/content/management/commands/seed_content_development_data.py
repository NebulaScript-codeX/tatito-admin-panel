from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

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


CATEGORIES = (
    {
        "name": "DEV Sample Wellness",
        "description": "Fictional development content for wellness education.",
        "is_active": True,
    },
    {
        "name": "DEV Sample Patient Guides",
        "description": "Fictional development content for patient guides.",
        "is_active": False,
    },
)

TAGS = (
    {"name": "DEV Sample Prevention", "is_active": True},
    {"name": "DEV Sample Healthy Living", "is_active": True},
    {"name": "DEV Sample Archive", "is_active": False},
)

BLOGS = (
    {
        "slug": "dev-sample-building-healthy-habits",
        "title": "DEV Sample: Building Healthy Habits",
        "category": "DEV Sample Wellness",
        "tags": ("DEV Sample Healthy Living", "DEV Sample Prevention"),
        "content": "Fictional development article about practical daily wellness habits.",
        "seo_title": "DEV Sample: Building Healthy Habits",
        "seo_description": "Fictional development content for the Content page.",
        "status": Blog.STATUS_PUBLISHED,
    },
    {
        "slug": "dev-sample-preventive-care-checklist",
        "title": "DEV Sample: Preventive Care Checklist",
        "category": "DEV Sample Patient Guides",
        "tags": ("DEV Sample Prevention",),
        "content": "Fictional development article describing a general preventive-care checklist.",
        "seo_title": "DEV Sample: Preventive Care Checklist",
        "seo_description": "Fictional development content for the Content page.",
        "status": Blog.STATUS_DRAFT,
    },
    {
        "slug": "dev-sample-understanding-health-screenings",
        "title": "DEV Sample: Understanding Health Screenings",
        "category": "DEV Sample Wellness",
        "tags": ("DEV Sample Archive",),
        "content": "Fictional development article explaining routine health screening concepts.",
        "seo_title": "DEV Sample: Understanding Health Screenings",
        "seo_description": "Fictional development content for the Content page.",
        "status": Blog.STATUS_PUBLISHED,
    },
)

BANNERS = (
    {
        "title": "DEV Sample: Care for Every Day",
        "description": "Fictional homepage banner for local development.",
        "image_url": "",
        "link_url": "/doctors",
        "display_order": 900,
        "is_active": True,
    },
    {
        "title": "DEV Sample: Seasonal Wellness",
        "description": "Inactive fictional banner for status demonstrations.",
        "image_url": "",
        "link_url": "/health",
        "display_order": 901,
        "is_active": False,
    },
)

ANNOUNCEMENTS = (
    {
        "title": "DEV Sample: Extended Support Hours",
        "message": "Fictional announcement used only for local development.",
        "link_url": "/support",
        "display_order": 900,
        "is_active": True,
    },
    {
        "title": "DEV Sample: Service Update",
        "message": "Inactive fictional announcement for status demonstrations.",
        "link_url": "",
        "display_order": 901,
        "is_active": False,
    },
)

FEATURED_SERVICES = (
    {
        "title": "DEV Sample: Find a Doctor",
        "description": "Fictional featured service for local development.",
        "icon_url": "",
        "link_url": "/doctors",
        "display_order": 900,
        "is_active": True,
    },
    {
        "title": "DEV Sample: Health Plans",
        "description": "Inactive fictional service for status demonstrations.",
        "icon_url": "",
        "link_url": "/health-plans",
        "display_order": 901,
        "is_active": False,
    },
)

FAQS = (
    {
        "question": "DEV Sample: How can I prepare for a routine appointment?",
        "answer": "Bring a list of questions and any information requested by your care provider.",
        "category": FAQ.CATEGORY_GENERAL,
        "display_order": 900,
        "is_active": True,
    },
    {
        "question": "DEV Sample: Where can I find plan information?",
        "answer": "Review the plan details provided by the service team.",
        "category": FAQ.CATEGORY_PLANS,
        "display_order": 901,
        "is_active": False,
    },
    {
        "question": "DEV Sample: How do I contact the care team?",
        "answer": "Use the support options listed in your account to contact the care team.",
        "category": FAQ.CATEGORY_GENERAL,
        "display_order": 902,
        "is_active": True,
    },
)

TESTIMONIALS = (
    {
        "name": "DEV Sample Patient One",
        "text": "Fictional development testimonial demonstrating approved-site content.",
        "rating": 5,
        "section": "DEV Sample Patient Stories",
        "is_active": True,
        "display_order": 900,
    },
    {
        "name": "DEV Sample Patient Two",
        "text": "Inactive fictional testimonial for status demonstrations.",
        "rating": 4,
        "section": "DEV Sample Patient Stories",
        "is_active": False,
        "display_order": 901,
    },
)

TRUST_STATS = (
    {
        "label": "DEV Sample Care Members",
        "value": "25K+",
        "display_order": 900,
        "is_active": True,
    },
    {
        "label": "DEV Sample Partner Clinics",
        "value": "120+",
        "display_order": 901,
        "is_active": False,
    },
    {
        "label": "DEV Sample Completed Consultations",
        "value": "8K+",
        "display_order": 902,
        "is_active": True,
    },
    {
        "label": "DEV Sample Patient Satisfaction",
        "value": "98%",
        "display_order": 903,
        "is_active": True,
    },
)

WEBSITE_PAGES = (
    {
        "slug": "dev-sample-about",
        "title": "DEV Sample: About Tatito Health+",
        "page_type": WebsitePage.PAGE_ABOUT,
        "content": "Fictional development page content for the About page.",
        "is_published": True,
    },
    {
        "slug": "dev-sample-privacy",
        "title": "DEV Sample: Privacy Information",
        "page_type": WebsitePage.PAGE_PRIVACY,
        "content": "Fictional development page content for privacy information.",
        "is_published": False,
    },
)

CITIES = (
    {"name": "DEV Sample City One", "state": "Development", "is_active": True, "display_order": 900},
    {"name": "DEV Sample City Two", "state": "Development", "is_active": False, "display_order": 901},
    {"name": "DEV Sample City Three", "state": "Development", "is_active": True, "display_order": 902},
    {"name": "DEV Sample City Four", "state": "Development", "is_active": True, "display_order": 903},
    {"name": "DEV Sample City Five", "state": "Development", "is_active": True, "display_order": 904},
)


class Command(BaseCommand):
    help = "Idempotently seed fictional SQL content for local development."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Content development data can only be seeded when DEBUG=True."
            )

        categories = {
            values["name"]: BlogCategory.objects.get_or_create(
                name=values["name"],
                defaults={key: value for key, value in values.items() if key != "name"},
            )[0]
            for values in CATEGORIES
        }
        tags = {
            values["name"]: BlogTag.objects.get_or_create(
                name=values["name"],
                defaults={key: value for key, value in values.items() if key != "name"},
            )[0]
            for values in TAGS
        }

        for values in BLOGS:
            blog, _ = Blog.objects.get_or_create(
                slug=values["slug"],
                defaults={
                    "title": values["title"],
                    "category": categories[values["category"]],
                    "content": values["content"],
                    "seo_title": values["seo_title"],
                    "seo_description": values["seo_description"],
                    "status": values["status"],
                    "publish_date": (
                        timezone.now()
                        if values["status"] == Blog.STATUS_PUBLISHED
                        else None
                    ),
                },
            )
            blog.tags.add(*(tags[tag_name] for tag_name in values["tags"]))

        for model, entries, lookup in (
            (HomepageBanner, BANNERS, "title"),
            (Announcement, ANNOUNCEMENTS, "title"),
            (FeaturedService, FEATURED_SERVICES, "title"),
            (FAQ, FAQS, "question"),
            (Testimonial, TESTIMONIALS, "name"),
            (TrustStat, TRUST_STATS, "label"),
            (WebsitePage, WEBSITE_PAGES, "slug"),
            (City, CITIES, "name"),
        ):
            for values in entries:
                key = values[lookup]
                model.objects.get_or_create(
                    **{lookup: key},
                    defaults={field: value for field, value in values.items() if field != lookup},
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Content SQL development data is ready "
                "(3 blogs, 2 categories, 3 tags, 2 banners, 2 announcements, "
                "2 services, 3 FAQs, 2 testimonials, 4 trust stats, "
                "2 website pages, and 5 cities)."
            )
        )
