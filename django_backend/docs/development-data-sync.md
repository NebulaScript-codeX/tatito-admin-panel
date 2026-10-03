# Shared Admin development data

The Admin APIs use Django ORM and the configured SQL database. The checked-in,
sanitized development snapshot is:

```text
dashboard/fixtures/development/admin_data.json
```

For a new checkout, configure a local SQL database, then run:

```powershell
python manage.py migrate
python manage.py import_dev_data
```

To contribute local development records, export and commit the merged snapshot:

```powershell
python manage.py export_dev_data
git add dashboard/fixtures/development/admin_data.json
git commit -m "Sync development data"
```

After pulling a teammate's snapshot, run `python manage.py import_dev_data`.
Export includes only records explicitly tagged with `is_development_data=True`
and a stable, unique `development_key` beginning with `dev-`. The import
upserts by this key, preserves records absent from the snapshot, never deletes
local data, and uses foreign-key relations through the same stable keys.
Re-export after a successful import before editing shared records so the local
database has the latest common baseline.

Snapshots are JSON, sorted deterministically, and omit credentials, passwords,
patient identifiers, contact details, clinical notes, uploaded file paths, and
other patient-specific content. Seed fictional records when needed with:

```powershell
python manage.py seed_care_development_data
python manage.py seed_admin_development_data
python manage.py seed_dashboard_development_data
python manage.py seed_content_development_data
```

The seed commands require `DEBUG=True` and update only their own stable
development records.

If both developers changed the same record since their last shared baseline,
import/export stops with a conflict instead of overwriting either version.
Review both versions, resolve the intended values in the local SQL record, and
make the snapshot match that resolution before importing/exporting again.
