from django.core.management.base import BaseCommand, CommandError

from dashboard.dev_data import export_snapshot


class Command(BaseCommand):
    help = "Merge tagged, sanitized Admin development records into the shared SQL snapshot."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="dashboard/fixtures/development/admin_data.json",
            help="Snapshot path relative to the Django project.",
        )

    def handle(self, *args, **options):
        try:
            count = export_snapshot(options["output"])
        except ValueError as error:
            raise CommandError(str(error)) from error
        self.stdout.write(
            self.style.SUCCESS(
                f"Exported and merged {count} development records to {options['output']}."
            )
        )
