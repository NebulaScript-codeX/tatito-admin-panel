from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminUser, ModulePermission
from audit.models import AuditLog

from .models import (
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
from .serializers import (
    AnnouncementSerializer,
    BlogCategorySerializer,
    BlogSerializer,
    BlogTagSerializer,
    CitySerializer,
    FAQSerializer,
    FeaturedServiceSerializer,
    HomepageBannerSerializer,
    TestimonialSerializer,
    TrustStatSerializer,
    WebsitePageSerializer,
)


CONTENT_MODULE = "content"


def write_audit(request, action_name, target_type, target_id, description):
    user = request.user

    AuditLog.objects.create(
        actor=user,
        actor_username=user.username,
        actor_role=(
            user.admin_profile.role.name
            if hasattr(user, "admin_profile") and user.admin_profile.role
            else ""
        ),
        action=action_name,
        module=CONTENT_MODULE,
        target_type=target_type,
        target_id=str(target_id),
        description=description,
        metadata={},
    )


class BaseContentViewSet(viewsets.ModelViewSet):
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
        ModulePermission,
    ]
    module = CONTENT_MODULE

    def perform_create(self, serializer):
        instance = serializer.save()
        write_audit(
            self.request,
            "create",
            instance.__class__.__name__,
            instance.pk,
            f"Created {instance.__class__.__name__} #{instance.pk}.",
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        write_audit(
            self.request,
            "update",
            instance.__class__.__name__,
            instance.pk,
            f"Updated {instance.__class__.__name__} #{instance.pk}.",
        )

    def perform_destroy(self, instance):
        target_type = instance.__class__.__name__
        target_id = instance.pk

        instance.delete()

        write_audit(
            self.request,
            "delete",
            target_type,
            target_id,
            f"Deleted {target_type} #{target_id}.",
        )


class BlogCategoryViewSet(BaseContentViewSet):
    serializer_class = BlogCategorySerializer

    def get_queryset(self):
        queryset = BlogCategory.objects.all().order_by("name")

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class BlogTagViewSet(BaseContentViewSet):
    serializer_class = BlogTagSerializer

    def get_queryset(self):
        queryset = BlogTag.objects.all().order_by("name")

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(name__icontains=search)

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class BlogViewSet(BaseContentViewSet):
    serializer_class = BlogSerializer

    def get_queryset(self):
        queryset = Blog.objects.select_related(
            "category",
            "author",
        ).prefetch_related("tags").order_by("-created_at")

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        author = self.request.query_params.get("author")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(content__icontains=search)
                | Q(seo_title__icontains=search)
                | Q(seo_description__icontains=search)
            )

        if status_filter in {"draft", "published"}:
            queryset = queryset.filter(status=status_filter)

        if category:
            queryset = queryset.filter(category_id=category)

        if author:
            queryset = queryset.filter(author_id=author)

        return queryset

    @action(
        detail=True,
        methods=["post"],
        url_path="publish",
    )
    def publish(self, request, pk=None):
        blog = self.get_object()

        blog.status = "published"
        if not blog.publish_date:
            from django.utils import timezone
            blog.publish_date = timezone.now()

        blog.save(update_fields=["status", "publish_date", "updated_at"])

        write_audit(
            request,
            "publish",
            "Blog",
            blog.pk,
            f"Published blog #{blog.pk}.",
        )

        return Response(self.get_serializer(blog).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="unpublish",
    )
    def unpublish(self, request, pk=None):
        blog = self.get_object()

        blog.status = "draft"
        blog.save(update_fields=["status", "updated_at"])

        write_audit(
            request,
            "unpublish",
            "Blog",
            blog.pk,
            f"Unpublished blog #{blog.pk}.",
        )

        return Response(self.get_serializer(blog).data)

    def perform_create(self, serializer):
        instance = serializer.save(
            author=self.request.user,
        )

        write_audit(
            self.request,
            "create",
            "Blog",
            instance.pk,
            f"Created blog #{instance.pk}.",
        )


class HomepageBannerViewSet(BaseContentViewSet):
    serializer_class = HomepageBannerSerializer

    def get_queryset(self):
        queryset = HomepageBanner.objects.all().order_by(
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        banner = self.get_object()

        banner.is_active = not banner.is_active
        banner.save(update_fields=["is_active", "updated_at"])

        write_audit(
            request,
            "update",
            "HomepageBanner",
            banner.pk,
            f"Changed homepage banner #{banner.pk} active status.",
        )

        return Response(self.get_serializer(banner).data)

    @action(detail=True, methods=["post"], url_path="move-up")
    def move_up(self, request, pk=None):
        return self._move(request, self.get_object(), "up")

    @action(detail=True, methods=["post"], url_path="move-down")
    def move_down(self, request, pk=None):
        return self._move(request, self.get_object(), "down")

    def _move(self, request, banner, direction):
        if direction == "up":
            neighbour = (
                HomepageBanner.objects
                .filter(display_order__lt=banner.display_order)
                .order_by("-display_order")
                .first()
            )
        else:
            neighbour = (
                HomepageBanner.objects
                .filter(display_order__gt=banner.display_order)
                .order_by("display_order")
                .first()
            )

        if neighbour:
            banner.display_order, neighbour.display_order = (
                neighbour.display_order,
                banner.display_order,
            )

            banner.save(update_fields=["display_order", "updated_at"])
            neighbour.save(update_fields=["display_order", "updated_at"])

            write_audit(
                request,
                "update",
                "HomepageBanner",
                banner.pk,
                f"Reordered homepage banner #{banner.pk}.",
            )

        return Response(self.get_serializer(banner).data)


class AnnouncementViewSet(BaseContentViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        queryset = Announcement.objects.all().order_by(
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(message__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class FeaturedServiceViewSet(BaseContentViewSet):
    serializer_class = FeaturedServiceSerializer

    def get_queryset(self):
        queryset = FeaturedService.objects.all().order_by(
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class FAQViewSet(BaseContentViewSet):
    serializer_class = FAQSerializer

    def get_queryset(self):
        queryset = FAQ.objects.all().order_by(
            "category",
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        category = self.request.query_params.get("category")
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(question__icontains=search)
                | Q(answer__icontains=search)
            )

        if category:
            queryset = queryset.filter(category=category)

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class TestimonialViewSet(BaseContentViewSet):
    serializer_class = TestimonialSerializer

    def get_queryset(self):
        queryset = Testimonial.objects.all().order_by(
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")
        section = self.request.query_params.get("section")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(text__icontains=search)
                | Q(section__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        if section:
            queryset = queryset.filter(section=section)

        return queryset


class TrustStatViewSet(BaseContentViewSet):
    serializer_class = TrustStatSerializer

    def get_queryset(self):
        queryset = TrustStat.objects.all().order_by(
            "display_order",
            "-created_at",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(label__icontains=search)
                | Q(value__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset


class WebsitePageViewSet(BaseContentViewSet):
    serializer_class = WebsitePageSerializer

    def get_queryset(self):
        queryset = WebsitePage.objects.all().order_by("-updated_at")

        search = self.request.query_params.get("search", "").strip()
        page_type = self.request.query_params.get("page_type")
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(content__icontains=search)
            )

        if page_type:
            queryset = queryset.filter(page_type=page_type)

        if status_filter == "published":
            queryset = queryset.filter(is_published=True)
        elif status_filter == "draft":
            queryset = queryset.filter(is_published=False)

        return queryset

    @action(detail=True, methods=["post"], url_path="toggle-published")
    def toggle_published(self, request, pk=None):
        page = self.get_object()

        page.is_published = not page.is_published
        page.save(update_fields=["is_published", "updated_at"])

        write_audit(
            request,
            "update",
            "WebsitePage",
            page.pk,
            f"Changed website page #{page.pk} publication status.",
        )

        return Response(self.get_serializer(page).data)


class CityViewSet(BaseContentViewSet):
    serializer_class = CitySerializer

    def get_queryset(self):
        queryset = City.objects.all().order_by(
            "display_order",
            "name",
        )

        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(state__icontains=search)
            )

        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        return queryset