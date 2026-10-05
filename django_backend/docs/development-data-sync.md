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
local data, and uses foreign-key and many-to-many relations through the same
stable keys.
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
python manage.py seed_pharmacy_development_data
python manage.py seed_lab_tests_development_data
```

`seed_care_development_data` also seeds the fictional Health Records examples.
They include four stable fictional patients with lab reports, prescriptions,
vaccinations, allergies, and multiple historical vital readings. Existing CARE
patients and Health Records are updated by development key rather than
duplicated. Refresh the CARE and Health Records data with
`python manage.py seed_care_development_data`, or refresh Health Records alone
with `python manage.py seed_health_records_development_data`.

The seed commands require `DEBUG=True` and update only their own stable
development records.

`seed_pharmacy_development_data` creates Module 07's fictional 15-product
catalog, inventory batches, reviewable prescription, placed order, and three
delivery dispatch orders covering assigned, out-for-delivery, and delivered
states. It reuses existing patients and active delivery partners
where available; when needed, it creates stable fictional customers and
ensures there are at least two active delivery partners for assignment tests.
The seeded packed orders have matching batch allocations and stock adjustments.
The command is idempotent and participates in the same `export_dev_data` /
`import_dev_data` snapshot workflow. Prescription file paths and patient
addresses are omitted or anonymized by the shared exporter.

`seed_lab_tests_development_data` creates fictional tests, taxonomies, a
package, a health-check bundle, diagnostic-centre services, scan bookings and
phlebotomists with stable development keys. Lab test/package/bundle test
selections are exported as stable many-to-many development-key relations.
Patient and staff names/contact data, centre contact/location details, and
uploaded lab/scan report paths are sanitized by the shared exporter. The seed
is idempotent and participates in the same export/import snapshot workflow.

The Pharmacy order API reads its tax percentage from `PHARMACY_TAX_RATE`.
It defaults to `0.00` because no tax jurisdiction or rate is defined in this
development environment; configure a percentage before using tax totals for
real orders.

If both developers changed the same record since their last shared baseline,
import/export stops with a conflict instead of overwriting either version.
Review both versions, resolve the intended values in the local SQL record, and
make the snapshot match that resolution before importing/exporting again.
