import "./healthRecords.css";
import { adminApi, getAdminFile } from "./adminApi.js";
import {
  hasPermission,
  isAdminAuthenticated,
  refreshAdminSession,
} from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";
import { renderAdminLayout } from "./adminLayout.js";

const API = "/lab-tests/";
const sections = [
  { id: "tests", label: "Tests Catalog", count: "tests" },
  { id: "health-checks", label: "Health Checks", count: "health_checks" },
  { id: "packages", label: "Packages", count: "packages" },
  { id: "categories", label: "Organ Profiles", count: "organ_categories" },
  { id: "radiology", label: "Radiology Scans", count: "radiology" },
  { id: "bookings", label: "Sample Collection", count: "bookings" },
];
const resources = {
  tests: "tests/",
  "health-checks": "health-checks/",
  packages: "packages/",
  categories: "organ-categories/",
  radiology: "radiology/",
  bookings: "bookings/",
  "radiology-bookings": "radiology-bookings/",
};
const state = {
  app: null,
  events: null,
  active: "tests",
  radiologyBookingSearch: "",
  summary: {},
  meta: { patients: [], centres: [], tests: [], packages: [], phlebotomists: [], categories: [] },
  records: {},
  radiologyBookings: [],
  search: "",
  organCategoryFilter: "",
  loading: true,
  error: "",
  modal: null,
  requestId: 0,
  searchTimer: null,
};

const can = (permission) => hasPermission("lab_tests", permission);
const valueText = (value) => value === null || value === undefined || value === "" ? "—" : escapeHtml(String(value));
const money = (value) => value === null || value === undefined || value === ""
  ? "—"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const label = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateText = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
};
const dateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const numberOrNull = (value) => value === "" || value === null || value === undefined ? null : Number(value);
const list = (response) => Array.isArray(response) ? response : Array.isArray(response?.results) ? response.results : [];
const selected = (resource, id) => (state.records[resource] || []).find((item) => String(item.id) === String(id))
  || (resource === "radiology-bookings" ? state.radiologyBookings : []).find((item) => String(item.id) === String(id));

function showToast(message) {
  if (typeof window.thpShowToast === "function") window.thpShowToast(message);
}

function apiErrorMessage(error, fallback) {
  const data = error?.data;
  if (data && typeof data === "object") {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const items = Array.isArray(value) ? value : [value];
      return items
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => field === "non_field_errors" || field === "detail"
          ? item
          : `${label(field)}: ${item}`);
    });
    if (messages.length) return messages.join(" ");
  }
  return error?.message || fallback;
}

function statusBadge(status) {
  const tone = ["active", "done", "report_uploaded", "report_ready", "completed", "collected", "in_lab"].includes(status)
    ? "is-good"
    : ["booked", "scheduled", "assigned", "pending"].includes(status)
      ? "is-warning"
      : ["cancelled", "inactive", "rejected"].includes(status)
        ? "is-danger"
        : "is-neutral";
  return `<span class="thp-lab-badge ${tone}">${escapeHtml(label(status))}</span>`;
}

function action(actionName, text, id, secondary = true, disabled = false) {
  return `<button type="button" class="${secondary ? "thp-admin-secondary-button" : "thp-admin-primary-button"} thp-lab-action" data-lab-action="${escapeHtml(actionName)}" data-id="${escapeHtml(id ?? "")}" ${disabled ? "disabled" : ""}>${escapeHtml(text)}</button>`;
}

function table(headers, rows, minWidth = 760) {
  return `<div class="thp-admin-table-wrapper thp-lab-table-wrap"><table class="thp-admin-table thp-lab-table" style="--lab-table-min:${minWidth}px">
    <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${headers.length}"><div class="thp-lab-empty">No matching records found.</div></td></tr>`}</tbody>
  </table></div>`;
}

function statusSelect(record, options, attr) {
  return `<select aria-label="Change status" data-lab-status="${escapeHtml(record.id)}" data-lab-status-kind="${attr}">
    <option value="">Update status</option>
    ${options.map((status) => `<option value="${status}">${escapeHtml(label(status))}</option>`).join("")}
  </select>`;
}

function searchToolbar(placeholder, resource, records, searchKey = "search", filter = "") {
  const query = searchKey === "radiologyBookingSearch" ? state.radiologyBookingSearch : state.search;
  return `<div class="thp-lab-toolbar"><label class="thp-lab-search">
    <span class="thp-admin-sr-only">Search ${escapeHtml(placeholder.replace(/^Search\s+|…$/g, ""))}</span>
    <input type="search" data-lab-search="${searchKey}" value="${escapeHtml(query)}" placeholder="${escapeHtml(placeholder)}" />
  </label><div class="thp-lab-toolbar-actions">${filter}${exportButton(resource, records)}</div></div>`;
}

function heading(title, description, buttons = "") {
  return `<header class="thp-admin-panel-heading thp-lab-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><div class="thp-lab-heading-actions">${buttons}</div></header>`;
}

function exportButton(resource, records) {
  return action("export", "Export CSV", resource, true, !records.length);
}

function rowActions(resource, record) {
  return `<td class="thp-lab-row-actions">
    <div class="thp-lab-icon-actions">
      ${iconAction(`view:${resource}`, "View", record.id, '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>')}
      ${can("edit") ? iconAction(`edit:${resource}`, "Edit", record.id, '<path d="m15 5 4 4"/><path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z"/>') : ""}
      ${can("delete") ? iconAction(`delete:${resource}`, "Delete", record.id, '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5m4-5v5"/>', true) : ""}
    </div>
  </td>`;
}

function iconAction(actionName, title, id, iconPath, danger = false) {
  return `<button type="button" class="thp-lab-icon-button${danger ? " is-danger" : ""}" data-lab-action="${escapeHtml(actionName)}" data-id="${escapeHtml(id ?? "")}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPath}</svg>
  </button>`;
}

function searchRecords(records, fields = []) {
  const query = state.search.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) => fields.some((field) => {
    const value = field.split(".").reduce((item, key) => item?.[key], record);
    const searchable = Array.isArray(value)
      ? value.map((item) => item && typeof item === "object"
        ? Object.values(item).join(" ")
        : String(item ?? "")).join(" ")
      : String(value ?? "");
    return searchable.toLowerCase().includes(query);
  }));
}

function renderDefinitions(resource, title, description, headers, rows, placeholder, minWidth) {
  const records = searchRecords(state.records[resource] || [], resource === "tests"
    ? ["name", "code", "specimen", "organ_categories"]
    : resource === "categories" ? ["name", "description"]
      : resource === "packages" ? ["name", "badge", "description"]
        : ["name", "description", "recommended_target"]);
  const create = can("create") ? action(`add:${resource}`, resource === "tests" ? "Add Test" : resource === "health-checks" ? "Add Health Check" : resource === "packages" ? "Add Package" : resource === "categories" ? "Add Organ Profile" : "Add Scan", "", false) : "";
  return `<section class="thp-admin-panel thp-lab-panel">
    ${heading(title, description, create)}
    ${searchToolbar(
      placeholder,
      resource,
      records,
      "search",
      resource === "tests"
        ? `<select aria-label="Filter by organ profile" data-lab-organ-filter><option value="">All organ profiles</option>${optionList(state.meta.categories, state.organCategoryFilter)}</select>`
        : "",
    )}
    ${state.loading ? `<div class="thp-lab-empty" role="status">Loading ${escapeHtml(title.toLowerCase())}…</div>` : table(headers, rows(records), minWidth)}
  </section>`;
}

function renderTests() {
  return renderDefinitions("tests", "Tests Catalog", "Manage diagnostic tests, pricing and availability.",
    ["Test", "Organ profiles", "Specimen", "Turnaround", "Price", "Biomarkers", "Status", "Actions"],
    (records) => records.map((test) => `<tr>
      <td><strong>${valueText(test.name)}</strong><small>${valueText(test.code)}</small></td>
      <td>${valueText((test.organ_categories || []).map((category) => category.name || category).join(", ") || test.organ_category_names)}</td>
      <td>${valueText(test.specimen)}</td><td>${valueText(test.turnaround_hours)} hrs</td>
      <td><strong>${money(test.price)}</strong>${test.mrp != null ? `<small>MRP ${money(test.mrp)} · ${valueText(test.discount_percent ?? 0)}% off</small>` : ""}</td>
      <td>${valueText(test.biomarker_count)}</td><td>${statusBadge(test.is_active ? "active" : "inactive")}</td>${rowActions("tests", test)}
    </tr>`).join(""), "Search tests by name, code or specimen…", 1050);
}

function renderHealthChecks() {
  return renderDefinitions("health-checks", "Health Checks", "Curated preventive health panels and recommended audiences.",
    ["Health check", "Description", "Recommended target", "Included tests", "Tests", "Biomarkers", "Price", "Calculated price", "Status", "Actions"],
    (records) => records.map((check) => `<tr>
      <td><strong>${valueText(check.name)}</strong></td><td>${valueText(check.description)}</td>
      <td>${valueText(check.recommended_target)}</td>
      <td>${valueText((check.tests || []).map((test) => test.name || test).join(", "))}</td>
      <td>${valueText(check.test_count ?? check.tests?.length ?? 0)}</td>
      <td>${valueText(check.biomarker_count)}</td><td>${money(check.price)}</td><td>${money(check.calculated_price)}</td>
      <td>${statusBadge(check.is_active === false ? "inactive" : "active")}</td>${rowActions("health-checks", check)}
    </tr>`).join(""), "Search health checks…", 940);
}

function renderPackages() {
  return renderDefinitions("packages", "Lab Packages", "Build test bundles with server-calculated biomarker totals.",
    ["Package", "Badge", "Tests included", "Biomarkers", "Turnaround", "Price", "Status", "Actions"],
    (records) => records.map((item) => `<tr>
      <td><strong>${valueText(item.name)}</strong></td><td>${valueText(item.badge)}</td>
      <td>${valueText((item.tests || []).map((test) => test.name || test).join(", "))}</td>
      <td>${valueText(item.biomarker_count)}</td><td>${valueText(item.turnaround_hours)} hrs</td>
      <td><strong>${money(item.price)}</strong>${item.discount_percent != null ? `<small>${valueText(item.discount_percent)}% off</small>` : ""}</td>
      <td>${statusBadge(item.is_active === false ? "inactive" : "active")}</td>${rowActions("packages", item)}
    </tr>`).join(""), "Search packages…", 1080);
}

function renderCategories() {
  return renderDefinitions("categories", "Organ Profiles", "Organ groups used to organize tests in the catalog.",
    ["Organ profile", "Description", "Tests", "Status", "Actions"],
    (records) => records.map((item) => `<tr><td><strong>${valueText(item.name)}</strong></td>
      <td>${valueText(item.description)}</td><td>${valueText(item.test_count ?? item.tests_count ?? 0)}</td>
      <td>${statusBadge(item.is_active === false ? "inactive" : "active")}</td>${rowActions("categories", item)}</tr>`).join(""),
    "Search organ profiles…", 760);
}

function renderRadiology() {
  const scans = searchRecords(state.records.radiology || [], ["name", "modality", "centre_name"]);
  const bookingQuery = state.radiologyBookingSearch.trim().toLowerCase();
  const bookings = state.radiologyBookings.filter((booking) =>
    !bookingQuery || ["patient_name", "service_name", "centre_name", "status"]
      .some((field) => String(booking[field] ?? "").toLowerCase().includes(bookingQuery)));
  const definition = `<section class="thp-admin-panel thp-lab-panel">
    ${heading("Radiology Scan Services", "Manage scan definitions and diagnostic centre pricing.", can("create") ? action("add:radiology", "Add Scan", "", false) : "")}
    ${searchToolbar("Search scan services…", "radiology", scans)}
    ${state.loading ? `<div class="thp-lab-empty">Loading radiology services…</div>` : table(["Scan service", "Modality", "Centre", "Price", "Turnaround", "Status", "Actions"], scans.map((scan) => `<tr>
      <td><strong>${valueText(scan.name)}</strong></td><td>${valueText(scan.modality)}</td><td>${valueText(scan.centre_name || scan.centre_label)}</td>
      <td>${money(scan.price)}</td><td>${valueText(scan.turnaround_hours)} hrs</td>
      <td>${statusBadge(scan.is_active === false ? "inactive" : "active")}</td>${rowActions("radiology", scan)}</tr>`).join(""), 940)}
  </section>`;
  const bookingRows = bookings.map((booking) => {
    const canSchedule = booking.status === "booked";
    const next = booking.status === "scheduled" ? "done" : "";
    return `<tr><td><strong>${valueText(booking.patient_name)}</strong><small>${valueText(booking.patient_id)}</small></td>
      <td>${valueText(booking.service_name || booking.radiology_service_name || booking.scan_name)}</td>
      <td>${valueText(booking.centre_name)}</td><td>${dateText(booking.scheduled_at, true)}</td>
      <td>${statusBadge(booking.status)}</td><td class="thp-lab-row-actions">
        ${can("edit") && canSchedule ? statusSelect(booking, ["scheduled"], "radiology-bookings") : ""}
        ${can("edit") && next ? statusSelect(booking, [next], "radiology-bookings") : ""}
        ${can("edit") && ["booked", "scheduled"].includes(booking.status) ? statusSelect(booking, ["cancelled"], "radiology-bookings") : ""}
        ${action("view:radiology-bookings", "View", booking.id)}
        ${can("edit") ? action("edit:radiology-bookings", "Edit", booking.id) : ""}
        ${can("delete") ? action("delete:radiology-bookings", "Delete", booking.id) : ""}
        ${can("edit") && booking.status === "done" ? `<form class="thp-lab-upload-form" data-lab-scan-report="${escapeHtml(booking.id)}"><label>Upload PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label><button type="submit" class="thp-admin-secondary-button thp-lab-action">Upload</button></form>` : ""}
        ${booking.report_pdf_url ? action("download-scan-report", "Download PDF", booking.id) : ""}
      </td></tr>`;
  }).join("");
  const bookingsPanel = `<section class="thp-admin-panel thp-lab-panel">
    ${heading("Radiology Bookings", "Track scheduled scans and report progress.", can("create") ? action("add:radiology-bookings", "Create Booking", "", false) : "")}
    ${searchToolbar("Search radiology bookings…", "radiology-bookings", bookings, "radiologyBookingSearch")}
    ${state.loading ? `<div class="thp-lab-empty">Loading radiology bookings…</div>` : table(["Patient", "Scan", "Centre", "Scheduled", "Status", "Actions"], bookingRows, 980)}
  </section>`;
  return definition + bookingsPanel;
}

function renderBookings() {
  const records = searchRecords(state.records.bookings || [], ["patient_name", "test_name", "centre_name", "phlebotomist_name", "status"]);
  const rows = records.map((booking) => {
    const next = {
      assigned: "collected",
      collected: "in_lab",
    }[booking.status];
    const canAssign = booking.status === "booked";
    return `<tr>
      <td><strong>${valueText(booking.patient_name)}</strong><small>${valueText(booking.patient_id)}</small></td>
      <td>${valueText(booking.test_name || booking.test_names?.join(", ") || booking.package_names?.join(", ") || booking.items?.map((item) => item.name).join(", "))}</td>
      <td>${valueText(booking.centre_name)}</td><td>${dateText(booking.scheduled_at, true)}</td><td>${valueText(booking.address)}</td>
      <td>${valueText(booking.phlebotomist_name || "Unassigned")}</td><td>${statusBadge(booking.status)}</td>
      <td class="thp-lab-row-actions">
        ${can("edit") && canAssign ? `<form class="thp-lab-inline-form" data-lab-assign="${escapeHtml(booking.id)}">
          <select name="phlebotomist_id" aria-label="Assign phlebotomist" required><option value="">Assign phlebotomist</option>${state.meta.phlebotomists.filter((person) => person.available !== false && person.is_active !== false).map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`).join("")}</select>
          <button class="thp-admin-secondary-button thp-lab-action" type="submit">Assign</button></form>` : ""}
        ${can("edit") && next ? action(`booking-transition:${next}`, label(next), booking.id) : ""}
        ${can("edit") && ["booked", "assigned", "collected", "in_lab"].includes(booking.status) ? action("booking-transition:cancelled", "Cancel", booking.id) : ""}
        ${can("edit") && booking.status === "in_lab" ? `<form class="thp-lab-upload-form" data-lab-report="${escapeHtml(booking.id)}"><label>Upload PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label><button type="submit" class="thp-admin-secondary-button thp-lab-action">Upload</button></form>` : ""}
        ${booking.report_pdf_url ? action("download-report", "Download PDF", booking.id) : ""}
      </td>
    </tr>`;
  }).join("");
  return `<section class="thp-admin-panel thp-lab-panel">
    ${heading("Sample Collection Bookings", "Schedule patient collections, assign phlebotomists and follow each sample.", can("create") ? action("add:bookings", "Create Booking", "", false) : "")}
    ${searchToolbar("Search patient, test, centre or status…", "bookings", records)}
    ${state.loading ? `<div class="thp-lab-empty" role="status">Loading sample bookings…</div>` : table(["Patient", "Tests / packages", "Centre", "Collection time", "Address", "Phlebotomist", "Status", "Actions"], rows, 1380)}
    ${!state.meta.phlebotomists.length ? `<p class="thp-lab-help">No phlebotomists are available in SQL yet. Add an active phlebotomist before assigning collections.</p>` : ""}
  </section>`;
}

function renderActiveSection() {
  if (state.active === "tests") return renderTests();
  if (state.active === "health-checks") return renderHealthChecks();
  if (state.active === "packages") return renderPackages();
  if (state.active === "categories") return renderCategories();
  if (state.active === "radiology") return renderRadiology();
  return renderBookings();
}

function input(name, title, value = "", type = "text", attrs = "") {
  return `<label class="thp-admin-form-group"><span>${escapeHtml(title)}</span><input name="${name}" type="${type}" value="${escapeHtml(value ?? "")}" ${attrs} /></label>`;
}
function textarea(name, title, value = "", attrs = "") {
  return `<label class="thp-admin-form-group"><span>${escapeHtml(title)}</span><textarea name="${name}" ${attrs}>${escapeHtml(value ?? "")}</textarea></label>`;
}
function select(name, title, options, value = "", attrs = "") {
  return `<label class="thp-admin-form-group"><span>${escapeHtml(title)}</span><select name="${name}" ${attrs}>${options}</select></label>`;
}
function optionList(items, selectedIds = [], getText = (item) => item.name) {
  const selectedSet = new Set((Array.isArray(selectedIds) ? selectedIds : [selectedIds]).map(String));
  return items.map((item) => `<option value="${escapeHtml(item.id)}" ${selectedSet.has(String(item.id)) ? "selected" : ""}>${escapeHtml(getText(item))}</option>`).join("");
}
function booleanField(name, text, checked) {
  return `<label class="thp-lab-checkbox"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span>${escapeHtml(text)}</span></label>`;
}
function testMultiSelect(record, field = "test_ids", text = "Included tests") {
  const tests = state.meta.tests;
  const initial = record?.[field] || record?.tests?.map((test) => test.id) || [];
  return select(field, text, optionList(tests, initial, (test) => `${test.name}${test.code ? ` · ${test.code}` : ""}`), "", 'multiple size="5" required');
}

function formFields(type, record) {
  const r = record || {};
  if (type.endsWith(":tests")) return `
    ${input("name", "Test name", r.name, "text", "required maxlength='200'")}
    ${input("code", "Test code", r.code, "text", "required maxlength='40'")}
    ${select("organ_category_ids", "Organ profiles", optionList(state.meta.categories || [], r.organ_category_ids || r.organ_categories?.map((item) => item.id)), "", 'multiple size="4"')}
    ${select("specimen", "Specimen", ["Blood", "Urine", "Stool", "Saliva", "Swab", "Other"].map((item) => `<option value="${item.toLowerCase()}" ${String(r.specimen || "").toLowerCase() === item.toLowerCase() ? "selected" : ""}>${item}</option>`).join(""), "", "required")}
    ${input("turnaround_hours", "Turnaround (hours)", r.turnaround_hours, "number", "min='0' step='1' required")}
    ${input("biomarker_count", "Number of parameters", r.biomarker_count ?? 1, "number", "min='1' step='1' required")}
    ${input("mrp", "MRP", r.mrp, "number", "min='0.01' step='0.01' required")}
    ${input("discount_percent", "Discount (%)", r.discount_percent ?? 0, "number", "min='0' max='100' step='0.01' data-lab-discount")}
    ${input("price", "Selling price", r.price, "number", "min='0.01' step='0.01' readonly required")}
    ${select("centre_id", "Diagnostic centre", `<option value="">Any centre</option>${optionList(state.meta.centres, r.centre_id || r.centre)}`)}
    ${booleanField("fasting_required", "Fasting required", r.fasting_required)}
    ${booleanField("is_active", "Active", r.is_active !== false)}`;
  if (type.endsWith(":health-checks")) return `
    ${input("name", "Health check name", r.name, "text", "required maxlength='200'")}
    ${textarea("description", "Description", r.description)}
    ${input("recommended_target", "Recommended target", r.recommended_target, "text", "maxlength='200'")}
    ${testMultiSelect(r)}
    ${input("price", "Price", r.price, "number", "min='0' step='0.01' required")}
    ${booleanField("is_active", "Active", r.is_active !== false)}
    <p class="thp-lab-form-note">Biomarker totals are calculated automatically from the selected tests.</p>`;
  if (type.endsWith(":packages")) return `
    ${input("name", "Package name", r.name, "text", "required maxlength='200'")}
    ${select("badge", "Badge", `<option value="">No badge</option>${["popular", "best_value", "fever_special"].map((item) => `<option value="${item}" ${r.badge === item ? "selected" : ""}>${escapeHtml(label(item))}</option>`).join("")}`)}
    ${textarea("description", "Description", r.description)}
    ${testMultiSelect(r)}
    ${input("price", "Price", r.price, "number", "min='0' step='0.01' required")}
    ${input("discount_percent", "Discount (%)", r.discount_percent ?? 0, "number", "min='0' max='100' step='0.01'")}
    ${input("turnaround_hours", "Turnaround (hours)", r.turnaround_hours, "number", "min='0' step='1'")}
    ${booleanField("is_active", "Active", r.is_active !== false)}
    <p class="thp-lab-form-note">Biomarker count is read-only and computed by the server.</p>`;
  if (type.endsWith(":categories")) return `
    ${input("name", "Organ profile name", r.name, "text", "required maxlength='120'")}
    ${textarea("description", "Description", r.description)}
    ${testMultiSelect(r, "test_ids", "Assigned tests")}
    ${booleanField("is_active", "Active", r.is_active !== false)}`;
  if (type.endsWith(":radiology")) return `
    ${input("name", "Scan service", r.name, "text", "required maxlength='200'")}
    ${select("modality", "Modality", ["xray", "ultrasound", "ct", "mri", "mammography", "pet", "other"].map((item) => `<option value="${item}" ${r.modality === item ? "selected" : ""}>${escapeHtml(label(item))}</option>`).join(""), "", "required")}
    ${select("centre", "Diagnostic centre", `<option value="">Choose centre</option>${optionList(state.meta.centres, r.centre)}`, "", "required")}
    ${input("price", "Price", r.price, "number", "min='0' step='0.01' required")}
    ${input("turnaround_hours", "Turnaround (hours)", r.turnaround_hours, "number", "min='0' step='1'")}
    ${textarea("description", "Description", r.description)}
    ${booleanField("is_active", "Active", r.is_active !== false)}`;
  if (type.endsWith(":bookings")) return `
    ${select("patient_id", "Patient", `<option value="">Choose patient</option>${optionList(state.meta.patients, r.patient_id)}`, "", "required")}
    ${select("test_ids", "Tests", optionList(state.meta.tests, r.test_ids || r.test_id ? (r.test_ids || [r.test_id]) : [], (test) => `${test.name}${test.code ? ` · ${test.code}` : ""}`), "", 'multiple size="5"')}
    ${select("package_ids", "Packages", optionList(state.meta.packages, r.package_ids || r.package_id ? (r.package_ids || [r.package_id]) : []), "", 'multiple size="4"')}
    ${select("centre_id", "Collection centre", `<option value="">Choose centre</option>${optionList(state.meta.centres, r.centre_id)}`, "", "required")}
    ${input("scheduled_at", "Collection date and time", dateTimeInput(r.scheduled_at), "datetime-local", "required")}
    ${input("address", "Collection address", r.address, "text", "required maxlength='500'")}
    ${input("slot", "Collection time slot", r.slot || r.time_slot, "text", "required maxlength='100'")}`;
  if (type.endsWith(":radiology-bookings")) return `
    ${select("patient_id", "Patient", `<option value="">Choose patient</option>${optionList(state.meta.patients, r.patient_id)}`, "", "required")}
    ${select("radiology_service_id", "Scan service", `<option value="">Choose scan</option>${optionList(state.records.radiology || [], r.radiology_service_id || r.service_id)}`, "", "required")}
    ${select("centre_id", "Diagnostic centre", `<option value="">Choose centre</option>${optionList(state.meta.centres, r.centre_id)}`, "", "required")}
    ${input("scheduled_at", "Scheduled date and time", dateTimeInput(r.scheduled_at), "datetime-local", "required")}`;
  return "";
}

function modalMarkup() {
  if (!state.modal) return "";
  const { type, record = {} } = state.modal;
  const [mode, resource] = type.split(":");
  const titles = {
    tests: "Test",
    "health-checks": "Health Check",
    packages: "Package",
    categories: "Organ Profile",
    radiology: "Radiology Scan",
    bookings: "Sample Collection Booking",
    "radiology-bookings": "Radiology Booking",
  };
  const title = mode === "view" ? `View ${titles[resource]}` : `${mode === "add" ? "Add" : "Edit"} ${titles[resource]}`;
  const readonly = mode === "view";
  return `<div class="thp-admin-modal thp-lab-modal" role="presentation">
    <div class="thp-admin-modal-backdrop" data-lab-close></div>
    <section class="thp-admin-modal-card thp-lab-modal-card" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title">
      <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">LAB TESTS ADMINISTRATION</p><h2 id="lab-modal-title">${escapeHtml(title)}</h2></div><button type="button" class="thp-admin-modal-close" data-lab-close aria-label="Close">×</button></header>
      <form class="thp-admin-modal-form thp-lab-form" data-lab-form="${escapeHtml(type)}" data-record-id="${escapeHtml(record.id ?? "")}">
        <fieldset ${readonly ? "disabled" : ""}><div class="thp-admin-form-grid">${formFields(type, record)}</div></fieldset>
        <p class="thp-lab-modal-error" data-lab-modal-error role="alert" hidden></p>
        <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button thp-lab-action" data-lab-close>Cancel</button>
          ${readonly ? "" : `<button type="submit" class="thp-admin-primary-button thp-lab-action">${mode === "add" ? "Create" : "Save changes"}</button>`}
        </footer>
      </form>
    </section>
  </div>`;
}

function render() {
  if (!state.app || !window.location.hash.includes("/admin/lab-tests")) return;
  const tabs = sections.map((section) => {
    const count = section.id === "health-checks"
      ? state.summary[section.count] ?? state.records["health-checks"]?.length
      : state.summary[section.count];
    return `<button type="button" role="tab" aria-selected="${state.active === section.id}" class="thp-hr-tab ${state.active === section.id ? "is-active" : ""}" data-lab-tab="${section.id}">
      ${escapeHtml(section.label)}<span class="thp-hr-tab-count">${count ?? "—"}</span></button>`;
  }).join("");
  const content = state.error
    ? `<section class="thp-admin-panel thp-lab-panel"><p class="thp-lab-error" role="alert">${escapeHtml(state.error)}</p><button type="button" class="thp-admin-secondary-button thp-lab-action" data-lab-action="retry">Retry</button></section>`
    : renderActiveSection();
  renderAdminLayout(state.app, "lab_tests", `
    <div class="thp-lab-page">
      <nav class="thp-hr-tabs thp-lab-tabs" role="tablist" aria-label="Lab tests sections">${tabs}</nav>
      ${content}
      ${modalMarkup()}
    </div>`, { subtitle: "Manage test definitions, health checks, packages, radiology and sample collections." });
  if (state.modal) state.app.querySelector("#lab-modal-title")?.focus();
}

async function getRows(path) {
  return list(await adminApi(`${API}${path}`));
}

async function loadMeta() {
  const meta = await adminApi(`${API}meta/`);
  state.meta = {
    patients: list(meta?.patients),
    centres: list(meta?.centres),
    tests: list(meta?.tests),
    packages: list(meta?.packages),
    phlebotomists: list(meta?.phlebotomists),
    categories: list(meta?.organ_categories || meta?.categories),
  };
  if (!state.meta.categories.length) state.meta.categories = await getRows(resources.categories);
}

async function loadSection({ preserveSearch = false } = {}) {
  const requestId = ++state.requestId;
  const searchInput = state.app?.querySelector("[data-lab-search]");
  const query = preserveSearch ? searchInput?.value ?? state.search : state.search;
  const selectionStart = searchInput?.selectionStart;
  const selectionEnd = searchInput?.selectionEnd;
  const active = state.active;
  state.search = query;
  state.loading = true;
  state.error = "";
  render();
  try {
    if (active === "radiology") {
      const [services, bookings] = await Promise.all([getRows(resources.radiology), getRows(resources["radiology-bookings"])]);
      if (requestId !== state.requestId) return;
      state.records.radiology = services;
      state.radiologyBookings = bookings;
    } else {
      const path = active === "tests" && state.organCategoryFilter
        ? `${resources[active]}?organ_category=${encodeURIComponent(state.organCategoryFilter)}`
        : resources[active];
      state.records[active] = await getRows(path);
      if (requestId !== state.requestId) return;
    }
    state.loading = false;
    render();
    if (preserveSearch) {
      const inputNode = state.app.querySelector("[data-lab-search]");
      inputNode?.focus();
      inputNode?.setSelectionRange(selectionStart ?? query.length, selectionEnd ?? query.length);
    }
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.loading = false;
    state.error = apiErrorMessage(error, `Unable to load ${active}.`);
    render();
  }
}

async function refreshData() {
  state.loading = true;
  state.error = "";
  render();
  try {
    const [summary] = await Promise.all([
      adminApi(`${API}summary/`),
      loadMeta(),
    ]);
    state.summary = summary || {};
    await loadSection();
  } catch (error) {
    state.loading = false;
    state.error = apiErrorMessage(error, "Unable to load lab tests data.");
    render();
  }
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function exportCsv(resource, records) {
  if (!records.length) return;
  const fields = {
    tests: ["name", "code", "organ_category_names", "specimen", "fasting_required", "turnaround_hours", "price", "mrp", "discount_percent", "biomarker_count", "is_active"],
    "health-checks": ["name", "description", "recommended_target", "included_tests", "test_count", "biomarker_count", "price", "calculated_price", "is_active"],
    packages: ["name", "badge", "price", "discount_percent", "turnaround_hours", "biomarker_count", "is_active"],
    categories: ["name", "description", "test_count", "is_active"],
    radiology: ["name", "modality", "centre_name", "price", "turnaround_hours", "is_active"],
    bookings: ["patient_name", "test_name", "centre_name", "scheduled_at", "address", "phlebotomist_name", "status"],
    "radiology-bookings": ["patient_name", "service_name", "centre_name", "scheduled_at", "status"],
  }[resource];
  const exportRecords = records.map((record) => ({
    ...record,
    organ_category_names: (record.organ_categories || []).map((category) => category.name || category).join(", "),
    included_tests: (record.tests || []).map((test) => test.name || test).join(", "),
    test_name: record.test_name || [...(record.test_names || []), ...(record.package_names || [])].join(", "),
    service_name: record.service_name || record.radiology_service_name || record.scan_name,
  }));
  const csv = [fields, ...exportRecords.map((record) => fields.map((field) => record[field]))]
    .map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tatito-lab-tests-${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formDataToPayload(form, resource) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  const multi = [...form.querySelectorAll("select[multiple]")];
  for (const control of multi) payload[control.name] = [...control.selectedOptions].map((option) => option.value);
  for (const field of ["fasting_required", "is_active"]) {
    const control = form.elements.namedItem(field);
    if (control) payload[field] = control.checked;
  }
  for (const field of ["turnaround_hours", "biomarker_count", "price", "mrp", "discount_percent"]) {
    if (field in payload) payload[field] = numberOrNull(payload[field]);
  }
  if (resource === "tests") {
    payload.organ_category_ids = (payload.organ_category_ids || []).map((id) => Number(id));
    payload.centre_id = payload.centre_id ? Number(payload.centre_id) : null;
  } else if (resource === "health-checks" || resource === "packages") {
    payload.test_ids = (payload.test_ids || []).map((id) => Number(id));
  } else if (resource === "categories") {
    payload.test_ids = (payload.test_ids || []).map((id) => Number(id));
  } else if (resource === "radiology") {
    payload.centre = payload.centre ? Number(payload.centre) : null;
  } else if (resource === "bookings") {
    payload.test_ids = (payload.test_ids || []).map((id) => Number(id));
    payload.package_ids = (payload.package_ids || []).map((id) => Number(id));
  } else if (resource === "radiology-bookings") {
    payload.patient_id = Number(payload.patient_id);
    payload.radiology_service_id = Number(payload.radiology_service_id);
    payload.centre_id = Number(payload.centre_id);
  }
  for (const key of ["patient_id", "centre_id"]) {
    if (key in payload && payload[key] && typeof payload[key] === "string") payload[key] = Number(payload[key]);
  }
  if (payload.scheduled_at) payload.scheduled_at = new Date(payload.scheduled_at).toISOString();
  if (payload.slot !== undefined) payload.time_slot = payload.slot;
  delete payload.slot;
  return payload;
}

async function saveForm(form) {
  const [mode, resource] = form.dataset.labForm.split(":");
  const id = form.dataset.recordId;
  const payload = formDataToPayload(form, resource);
  const button = form.querySelector('[type="submit"]');
  const errorNode = form.querySelector("[data-lab-modal-error]");
  button.disabled = true;
  errorNode.hidden = true;
  if (resource === "bookings" && !payload.test_ids.length && !payload.package_ids.length) {
    errorNode.textContent = "Choose at least one lab test or package.";
    errorNode.hidden = false;
    button.disabled = false;
    return;
  }
  try {
    await adminApi(`${API}${resources[resource]}${mode === "edit" ? `${encodeURIComponent(id)}/` : ""}`, {
      method: mode === "edit" ? "PATCH" : "POST",
      body: payload,
    });
    state.modal = null;
    state.search = "";
    showToast(`${resource === "categories" ? "Organ profile" : label(resource).replace(/s$/, "")} saved.`);
  } catch (error) {
    errorNode.textContent = apiErrorMessage(error, "Unable to save this record.");
    errorNode.hidden = false;
    button.disabled = false;
    return;
  }
  try {
    const summary = await adminApi(`${API}summary/`);
    state.summary = summary || {};
    await loadSection();
  } catch (error) {
    state.error = apiErrorMessage(error, "The record was saved, but the page could not be refreshed.");
    render();
  }
}

async function handleClick(event) {
  const tab = event.target.closest("[data-lab-tab]");
  if (tab) {
    state.active = tab.dataset.labTab;
    state.search = "";
    state.organCategoryFilter = "";
    state.radiologyBookingSearch = "";
    state.error = "";
    await loadSection();
    return;
  }
  if (event.target.closest("[data-lab-close]")) {
    state.modal = null;
    render();
    return;
  }
  const button = event.target.closest("[data-lab-action]");
  if (!button) return;
  const { labAction, id } = button.dataset;
  if (labAction === "retry") return refreshData();
  if (labAction === "export") {
    const records = id === "radiology-bookings" ? state.radiologyBookings : state.records[id] || [];
    return exportCsv(id, records);
  }
  if (labAction === "download-report" || labAction === "download-scan-report") {
    try {
      button.disabled = true;
      const endpoint = labAction === "download-scan-report" ? "radiology-bookings" : "bookings";
      const blob = await getAdminFile(`${API}${endpoint}/${encodeURIComponent(id)}/report-file/`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${endpoint === "radiology-bookings" ? "radiology" : "lab"}-report-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      state.error = apiErrorMessage(error, "Unable to download the report.");
      render();
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (labAction.startsWith("add:") || labAction.startsWith("edit:") || labAction.startsWith("view:")) {
    const [mode, resource] = labAction.split(":");
    const record = mode === "add" ? {} : selected(resource === "radiology-bookings" ? resource : resource, id) || {};
    state.modal = { type: labAction, record };
    render();
    state.app.querySelector("[data-lab-form] input, [data-lab-form] select, [data-lab-form] textarea")?.focus();
    return;
  }
  if (labAction.startsWith("delete:")) {
    const resource = labAction.split(":")[1];
    const record = selected(resource, id);
    if (!window.confirm(`Delete "${record?.name || record?.patient_name || "this record"}"? This cannot be undone.`)) return;
    try {
      await adminApi(`${API}${resources[resource]}${encodeURIComponent(id)}/`, { method: "DELETE" });
      showToast("Record deleted.");
      const summary = await adminApi(`${API}summary/`);
      state.summary = summary || {};
      await loadSection();
    } catch (error) {
      state.error = apiErrorMessage(error, "Unable to delete this record.");
      render();
    }
    return;
  }
  if (labAction.startsWith("booking-transition:")) {
    const status = labAction.split(":")[1];
    try {
      await adminApi(`${API}bookings/${encodeURIComponent(id)}/transition/`, { method: "POST", body: { status } });
      showToast(`Sample status updated to ${label(status)}.`);
      await refreshData();
    } catch (error) {
      state.error = apiErrorMessage(error, "Unable to update the booking status.");
      render();
    }
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("[data-lab-form], [data-lab-assign], [data-lab-report], [data-lab-scan-report]");
  if (!form) return;
  event.preventDefault();
  if (form.matches("[data-lab-form]")) return saveForm(form);
  if (form.matches("[data-lab-assign]")) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const phlebotomist_id = Number(new FormData(form).get("phlebotomist_id"));
      await adminApi(`${API}bookings/${encodeURIComponent(form.dataset.labAssign)}/assign/`, {
        method: "POST",
        body: { phlebotomist_id },
      });
      showToast("Phlebotomist assigned.");
      await refreshData();
    } catch (error) {
      state.error = apiErrorMessage(error, "Unable to assign the phlebotomist.");
      render();
    }
    return;
  }
  const isScanReport = form.matches("[data-lab-scan-report]");
  const file = new FormData(form).get("file");
  if (!file || file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    form.querySelector("input[type=file]")?.setCustomValidity("Choose a PDF report.");
    form.querySelector("input[type=file]")?.reportValidity();
    return;
  }
  form.querySelector("input[type=file]")?.setCustomValidity("");
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const payload = new FormData();
  payload.append("file", file);
  try {
    const collection = isScanReport ? "radiology-bookings" : "bookings";
    const bookingId = isScanReport ? form.dataset.labScanReport : form.dataset.labReport;
    await adminApi(`${API}${collection}/${encodeURIComponent(bookingId)}/report/`, { method: "POST", body: payload });
    showToast(isScanReport ? "Radiology report uploaded." : "Lab report uploaded.");
    await refreshData();
  } catch (error) {
    state.error = apiErrorMessage(error, "Unable to upload the report.");
    render();
  }
}

function bindEvents(app) {
  state.events?.abort();
  state.events = new AbortController();
  const { signal } = state.events;
  app.addEventListener("click", (event) => void handleClick(event), { signal });
  app.addEventListener("submit", (event) => void handleSubmit(event), { signal });
  app.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modal) {
      state.modal = null;
      render();
    }
  }, { signal });
  app.addEventListener("change", async (event) => {
    const categoryFilter = event.target.closest("[data-lab-organ-filter]");
    if (categoryFilter) {
      state.organCategoryFilter = categoryFilter.value;
      await loadSection();
      return;
    }
    const selectNode = event.target.closest("[data-lab-status]");
    if (!selectNode || !selectNode.value) return;
    const id = selectNode.dataset.labStatus;
    const kind = selectNode.dataset.labStatusKind;
    const status = selectNode.value;
    selectNode.disabled = true;
    try {
      const isScanBooking = kind === "radiology-bookings";
      await adminApi(
        `${API}${resources[kind]}${encodeURIComponent(id)}/${isScanBooking ? "transition/" : ""}`,
        { method: isScanBooking ? "POST" : "PATCH", body: { status } },
      );
      showToast(`Radiology booking updated to ${label(status)}.`);
      await refreshData();
    } catch (error) {
      state.error = apiErrorMessage(error, "Unable to update radiology booking.");
      render();
    }
  }, { signal });
  app.addEventListener("input", (event) => {
    const modalForm = event.target.closest('[data-lab-form$=":tests"]');
    if (modalForm && (event.target.name === "mrp" || event.target.name === "discount_percent")) {
      const mrp = Number(modalForm.elements.namedItem("mrp")?.value);
      const discount = Number(modalForm.elements.namedItem("discount_percent")?.value || 0);
      const price = modalForm.elements.namedItem("price");
      if (Number.isFinite(mrp) && Number.isFinite(discount) && price) {
        price.value = Math.max(0, mrp * (1 - discount / 100)).toFixed(2);
      }
    }
    const input = event.target.closest("[data-lab-search]");
    if (!input) return;
    const searchKey = input.dataset.labSearch;
    state[searchKey] = input.value;
    const { selectionStart, selectionEnd } = event.target;
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      render();
      const focusedInput = state.app.querySelector(`[data-lab-search="${searchKey}"]`);
      focusedInput?.focus();
      focusedInput?.setSelectionRange(selectionStart ?? state[searchKey].length, selectionEnd ?? state[searchKey].length);
    }, 180);
  }, { signal });
  window.addEventListener("hashchange", () => {
    if (!window.location.hash.includes("/admin/lab-tests")) {
      state.events?.abort();
      clearTimeout(state.searchTimer);
      state.requestId += 1;
    }
  }, { signal });
}

export async function renderAdminLabTests(app) {
  state.events?.abort();
  clearTimeout(state.searchTimer);
  state.app = app;
  state.active = "tests";
  state.records = {};
  state.radiologyBookings = [];
  state.search = "";
  state.organCategoryFilter = "";
  state.radiologyBookingSearch = "";
  state.error = "";
  state.modal = null;
  state.loading = true;
  state.requestId += 1;
  if (!isAdminAuthenticated()) {
    window.location.hash = "#/admin/login";
    return;
  }
  await refreshAdminSession();
  if (!hasPermission("lab_tests", "view")) {
    renderAdminLayout(app, "lab_tests", `<section class="thp-admin-panel thp-lab-panel"><h2>Access restricted</h2><p>Your account does not have permission to view Lab Tests.</p></section>`);
    return;
  }
  bindEvents(app);
  render();
  await refreshData();
}
