from django.contrib.auth.models import User
from django.db import models
from django.utils.text import slugify


class BlogCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Blog Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class BlogTag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Blog Tag"
        verbose_name_plural = "Blog Tags"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Blog(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)

    category = models.ForeignKey(
        BlogCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blogs",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_blogs",
    )

    cover_image = models.URLField(max_length=500, blank=True)
    content = models.TextField()
    other_images = models.JSONField(default=list, blank=True)

    tags = models.ManyToManyField(
        BlogTag,
        blank=True,
        related_name="blogs",
    )

    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
    )
    publish_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

        if self.status == self.STATUS_PUBLISHED and not self.publish_date:
            from django.utils import timezone
            self.publish_date = timezone.now()

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class HomepageBanner(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    link_url = models.URLField(max_length=500, blank=True)

    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return self.title


class Announcement(models.Model):
    title = models.CharField(max_length=255)
    message = models.TextField()
    link_url = models.URLField(max_length=500, blank=True)

    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return self.title


class FeaturedService(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon_url = models.URLField(max_length=500, blank=True)
    link_url = models.URLField(max_length=500, blank=True)

    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return self.title


class FAQ(models.Model):
    CATEGORY_PHARMACY = "pharmacy"
    CATEGORY_PLANS = "plans"
    CATEGORY_FELLOWSHIP = "fellowship"
    CATEGORY_GENERAL = "general"

    CATEGORY_CHOICES = [
        (CATEGORY_PHARMACY, "Pharmacy"),
        (CATEGORY_PLANS, "Plans"),
        (CATEGORY_FELLOWSHIP, "Fellowship"),
        (CATEGORY_GENERAL, "General"),
    ]

    question = models.CharField(max_length=500)
    answer = models.TextField()

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_GENERAL,
        db_index=True,
    )

    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "display_order", "-id"]

    def __str__(self):
        return self.question


class Testimonial(models.Model):
    name = models.CharField(max_length=255)
    text = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    section = models.CharField(max_length=100, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return self.name


class TrustStat(models.Model):
    label = models.CharField(max_length=255)
    value = models.CharField(max_length=100)

    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return f"{self.value} - {self.label}"


class WebsitePage(models.Model):
    PAGE_TERMS = "terms"
    PAGE_PRIVACY = "privacy"
    PAGE_ABOUT = "about"
    PAGE_OTHER = "other"

    PAGE_CHOICES = [
        (PAGE_TERMS, "Terms"),
        (PAGE_PRIVACY, "Privacy"),
        (PAGE_ABOUT, "About"),
        (PAGE_OTHER, "Other"),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    page_type = models.CharField(
        max_length=20,
        choices=PAGE_CHOICES,
        default=PAGE_OTHER,
    )
    content = models.TextField()

    is_published = models.BooleanField(default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class City(models.Model):
    name = models.CharField(max_length=150, unique=True)
    state = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    display_order = models.PositiveIntegerField(default=0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name