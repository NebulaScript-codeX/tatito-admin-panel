from django.core.management.base import BaseCommand, CommandError

from dashboard.dev_data import import_snapshot


class Command(BaseCommand):
    help = "Safely merge the shared development snapshot into SQL without deleting local records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            default="dashboard/fixtures/development/admin_data.json",
            help="Snapshot path relative to the Django project.",
        )

    def handle(self, *args, **options):
        try:
            count = import_snapshot(options["input"])
        except ValueError as error:
            raise CommandError(str(error)) from error
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported or updated {count} development records from {options['input']}."
            )
        )
