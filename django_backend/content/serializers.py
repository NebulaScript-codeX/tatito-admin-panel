from rest_framework import serializers
from .models import (
    BlogCategory,
    BlogTag,
    Blog,
    HomepageBanner,
    Announcement,
    FeaturedService,
    FAQ,
    Testimonial,
    TrustStat,
    WebsitePage,
    City,
)


class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = "__all__"


class BlogTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogTag
        fields = "__all__"


class BlogSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )
    author_name = serializers.SerializerMethodField()
    tag_names = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = "__all__"
        read_only_fields = [
            "slug",
            "created_at",
            "updated_at",
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return None

    def get_tag_names(self, obj):
        return list(obj.tags.values_list("name", flat=True))


class HomepageBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageBanner
        fields = "__all__"


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = "__all__"


class FeaturedServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedService
        fields = "__all__"


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = "__all__"


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = "__all__"


class TrustStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrustStat
        fields = "__all__"


class WebsitePageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsitePage
        fields = "__all__"
        read_only_fields = [
            "slug",
            "created_at",
            "updated_at",
        ]


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = "__all__"