# CARE development data

Run these commands from `django_backend` with the local SQL database configured:

```powershell
python manage.py seed_care_development_data
python manage.py export_dev_data
```

The seed command updates fictional CARE and Health Records examples in SQL,
including four realistic fictional Health Records patients and their linked
lab, prescription, vaccination, allergy, and historical-vitals examples.
The shared snapshot also includes development data for the other Admin modules and is stored at
`dashboard/fixtures/development/admin_data.json`. Export merges tagged records
into that snapshot; it does not replace the dataset or delete local records.
Review the sanitized snapshot before committing it.

The Module 05 demo records are defined in
`care/management/commands/seed_care_development_data.py` and are persisted
through the existing CARE Django ORM models.
Health Records examples are defined in
`health_records/management/commands/seed_health_records_development_data.py`.
The seed updates stable development records in place and preserves other SQL
records. To refresh only those examples, run
`python manage.py seed_health_records_development_data`.

After pulling an updated snapshot, import it with:

```powershell
python manage.py import_dev_data
```

Import updates or creates records by stable development key, detects divergent
edits, and preserves relationships. It does not delete records from the local
database. Both commands accept `--output` or `--input` paths for an alternate
snapshot. See [the complete Admin sync workflow](../docs/development-data-sync.md).
