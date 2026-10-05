from django.db import transaction


def link_partner_user_to_provider(provider):
    from dashboard.models import PlatformUser

    if not provider.email:
        return None
    with transaction.atomic():
        users = list(
            PlatformUser.objects.select_for_update()
            .filter(
                role=PlatformUser.Role.PARTNER,
                email__iexact=provider.email,
                healthcare_provider__isnull=True,
            )
            .order_by("pk")
        )
        if len(users) != 1:
            return None

        from providers.models import HealthcareProvider

        locked_provider = HealthcareProvider.objects.select_for_update().filter(
            pk=provider.pk,
            email__iexact=users[0].email,
        ).first()
        if (
            locked_provider is None
            or PlatformUser.objects.filter(
                healthcare_provider=locked_provider
            ).exists()
        ):
            return None

        user = users[0]
        user.healthcare_provider = locked_provider
        user.save(update_fields=["healthcare_provider", "updated_at"])
        return user


def link_provider_to_partner_user(user):
    from dashboard.models import PlatformUser
    from providers.models import HealthcareProvider

    if user.role != PlatformUser.Role.PARTNER or not user.email:
        return None
    with transaction.atomic():
        locked_user = PlatformUser.objects.select_for_update().filter(
            pk=user.pk,
            role=PlatformUser.Role.PARTNER,
            email__iexact=user.email,
            healthcare_provider__isnull=True,
        ).first()
        if locked_user is None:
            return None

        providers = list(
            HealthcareProvider.objects.select_for_update()
            .filter(
                email__iexact=locked_user.email,
                platform_user__isnull=True,
            )
            .order_by("pk")
        )
        if len(providers) != 1:
            return None

        provider = providers[0]
        locked_user.healthcare_provider = provider
        locked_user.save(update_fields=["healthcare_provider", "updated_at"])
        user.healthcare_provider = provider
        return provider
