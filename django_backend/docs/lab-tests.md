# Lab Tests development API

All resources are SQL-backed and are available under `/api/admin/lab-tests/`.
Requests require an active admin profile and the corresponding `lab_tests`
module permission. The Lab Technician role has view/edit access by default;
create/delete actions require those permissions to be granted to the role.

## Resource endpoints

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `summary/` | GET | Counts and booking counts by status |
| `meta/` | GET | Patients, active diagnostic centres, available phlebotomists, tests, packages, health checks, and organ categories for forms |
| `tests/` | GET, POST | Test catalog; filter with `search`, `category`, `active` |
| `tests/{id}/` | GET, PUT, PATCH, DELETE | Test details |
| `categories/` | GET, POST | Categories |
| `categories/{id}/` | GET, PUT, PATCH, DELETE | Category details |
| `packages/` | GET, POST | Panels made from one or more lab tests |
| `packages/{id}/` | GET, PUT, PATCH, DELETE | Package details |
| `health-checks/` | GET, POST | Distinct health-check bundles |
| `health-checks/{id}/` | GET, PUT, PATCH, DELETE | Health-check bundle details |
| `organ-categories/` | GET, POST | Organ Profile taxonomy |
| `organ-categories/{id}/` | GET, PUT, PATCH, DELETE | Organ category details |
| `radiology/` | GET, POST | Radiology services attached to diagnostic centres |
| `radiology/{id}/` | GET, PUT, PATCH, DELETE | Radiology service details |
| `radiology-bookings/` | GET, POST | Booked radiology scans; filter by `status`, `patient_id`, `centre_id` |
| `radiology-bookings/{id}/` | GET, PUT, PATCH, DELETE | Scan booking details |
| `radiology-bookings/{id}/transition/` | POST | Transition `booked → scheduled → done`; eligible bookings may be cancelled |
| `radiology-bookings/{id}/report/` | POST | Upload multipart PDF field `file` after the scan is done |
| `radiology-bookings/{id}/report-file/` | GET | Download the stored scan PDF |
| `centres/` | GET | Existing diagnostic-centre provider rows |
| `bookings/` | GET, POST | Lab bookings; filter by `status` or `patient_id` |
| `bookings/{id}/` | GET, PUT, PATCH, DELETE | Booking details |
| `bookings/{id}/assign/` | POST | Assign an available phlebotomist using `phlebotomist_id` |
| `bookings/{id}/transition/` | POST | Advance `assigned → collected → in_lab`; can cancel eligible bookings |
| `bookings/{id}/report/` | POST | Upload multipart PDF field `file` after `in_lab` |
| `bookings/{id}/report-file/` | GET | Download the stored PDF |
| `phlebotomists/` | GET, POST | Phlebotomist roster; `?available=true` filters available staff |
| `phlebotomists/{id}/` | GET, PUT, PATCH, DELETE | Phlebotomist details |

Test payloads use `category_ids: [id, ...]` and
`organ_category_ids: [id, ...]`. They also accept an optional `centre_id`,
`mrp`, and `discount_percent`; when MRP is supplied, the API calculates the
selling `price` from MRP and discount (rounded to cents). Package payloads use
`test_ids: [id, ...]`, `badge`, `discount_percent`, and `turnaround_hours`;
`biomarker_count` is the sum of linked test biomarker counts. Health-check
bundles are separate from packages. Their payload has
`name`, `description`, `recommended_target`, `test_ids: [id, ...]`, `price`,
and `is_active`; responses include expanded `tests`, calculated `test_count`,
`biomarker_count`, and `calculated_price` (the sum of linked test prices).
`price` remains the curated bundle price. Tests also accept `organ_category_ids: [id, ...]`
for the separate Organ Profile taxonomy; expanded `organ_categories` are
returned, and tests can be filtered with `?organ_category={id}`. Organ
category resources have `name`, `description`, `is_active`, and editable
`test_ids: [id, ...]`; responses include expanded assigned tests and a current
`test_count`.

Radiology definitions are separate reusable services, with fields `name`,
`centre`, `modality`, `description`, `price`, `turnaround_hours`, and
`is_active`; response adds `centre_name`. Scan-booking payload uses
`patient_id`, `centre_id`, `radiology_service_id`, `scheduled_at`, and optional
`notes`. The service must belong to the selected centre. Serialized bookings
include patient/centre/service names, service `modality` and `price`,
`report_pdf_url`, and `completed_at`. Status is server-managed:
`booked → scheduled → done → report_uploaded`; PDF upload is allowed only
after `done`. The original `/scan-bookings/` endpoint remains as a compatibility
alias for `/radiology-bookings/`.

Booking payloads use `patient_id`, `centre_id`, `scheduled_at`, `address`,
`time_slot`, and at least one selection using `test_ids: [id, ...]`
and/or `package_ids: [id, ...]`.
Legacy singular `test_id` and `package_id` are accepted. `health_check_id` can
be used on its own for a curated check. An optional `phlebotomist_id` assigns
the booking at creation. Booking responses include selected ID arrays and
expanded `tests`/`packages`. Booking status is
server-managed and follows
`booked → assigned → collected → in_lab → report_ready`.

Bookings are the existing Health Records `LabBooking` SQL rows. Successful PDF
uploads are stored as files on that row, set it to `report_ready`, and make it
visible in `/api/admin/health-records/lab-reports/?patient_id=...`. The
Health Records payload includes `report_pdf_url`.

When a report becomes ready, Lab Tests writes a `log_action` audit entry with
action `report_ready`, module `lab_tests`, booking/patient context, and a clear
description. The existing admin activity feed/bell consumes this audit entry.
This is an audit/operational notification only; there is no patient push or SMS
delivery channel, and no duplicate notification system is created.

## Development seed

With `DJANGO_DEBUG=true`, run from `django_backend`:

```powershell
..\.venv\Scripts\python.exe manage.py seed_lab_tests_development_data
```

The seed is idempotent, uses fictional examples, reuses an existing patient and
active diagnostic centre where available, and creates only the missing records.
