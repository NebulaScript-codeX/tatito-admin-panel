import "./healthRecords.css";
import {
  createHealthRecord,
  deleteHealthRecord,
  getAdminFile,
  getHealthRecordAccessLog,
  getCachedHealthRecordCounts,
  getHealthRecordCollection,
  getHealthRecordCounts,
  getHealthRecordPatient,
  getHealthRecordPatients,
  refreshHealthRecordCounts,
  updateHealthRecord,
} from "./adminApi.js";
import {
  hasPermission,
  isAdminAuthenticated,
  refreshAdminSession,
} from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";
import { renderAdminLayout } from "./adminLayout.js";

const tabs = [
  { id: "lab-reports", label: "Lab Reports" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "vaccinations", label: "Vaccinations" },
  { id: "allergies-vitals", label: "Allergies & Vitals" },
  { id: "access-log", label: "Access Log" },
];

const state = {
  app: null,
  patient: null,
  activeTab: "lab-reports",
  patients: [],
  records: emptyRecords(),
  searchTimer: null,
  searchRequestId: 0,
  patientSelectionRequestId: 0,
  recordRequestId: 0,
};

function emptyRecords() {
  return {
    "lab-reports": [],
    prescriptions: [],
    vaccinations: [],
    allergies: [],
    vitals: [],
    "access-log": [],
  };
}

const dateText = (value, includeTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : escapeHtml(String(value));

function recordActionsMarkup(resource, record) {
  return `
    <button type="button" class="thp-admin-secondary-button" data-health-record-view="${resource}" data-record-id="${record.id}">View</button>
    ${hasPermission("health_records", "edit") ? `<button type="button" class="thp-admin-secondary-button" data-health-record-edit="${resource}" data-record-id="${record.id}">Edit</button>` : ""}
    ${hasPermission("health_records", "delete") ? `<button type="button" class="thp-admin-secondary-button is-danger" data-health-record-delete="${resource}" data-record-id="${record.id}">Delete</button>` : ""}
  `;
}

function showToast(message) {
  if (typeof window.thpShowToast === "function") {
    window.thpShowToast(message);
  }
}

function setStatus(message = "", isError = false) {
  const status = state.app?.querySelector("#health-records-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  status.hidden = !message;
}

function patientCardMarkup(patient) {
  const initials = String(patient.name || "P")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const summary = [
    patient.date_of_birth ? `DOB: ${patient.date_of_birth}` : "",
    patient.gender || "",
    patient.blood_group ? `Blood: ${patient.blood_group}` : "",
    patient.mobile ? `Contact: ${patient.mobile}` : "",
  ].filter(Boolean).join(" · ");
  return `
    <div class="thp-hr-patient-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
    <div class="thp-hr-patient-copy">
      <strong>${escapeHtml(patient.name)}</strong>
      <span>${summary ? escapeHtml(summary) : `Patient ID: ${escapeHtml(patient.external_id || patient.id)}`}</span>
    </div>
    <div class="thp-hr-patient-meta">
      ${patient.city ? `<span>${escapeHtml(patient.city)}</span>` : ""}
      ${patient.email ? `<span>${escapeHtml(patient.email)}</span>` : ""}
    </div>
  `;
}

function patientResultsMarkup() {
  const container = state.app.querySelector("#health-record-patient-results");
  if (!container) return;
  const query = state.app.querySelector("#health-record-patient-search")?.value.trim() || "";
  if (!query) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  container.innerHTML = state.patients.length
    ? state.patients.map((patient) => `
        <button type="button" class="thp-hr-patient-result" role="option" data-health-record-patient="${escapeHtml(patient.id)}">
          <strong>${escapeHtml(patient.name)}</strong>
          <span>${escapeHtml(patient.external_id || patient.id)}${patient.mobile ? ` · ${escapeHtml(patient.mobile)}` : ""}</span>
        </button>
      `).join("")
    : `<p class="thp-hr-patient-no-results" role="status">No patients match “${escapeHtml(query)}”.</p>`;
  container.hidden = false;
}

function emptyState(title, message) {
  return `
    <div class="thp-hr-empty-state" role="status">
      <span class="thp-hr-empty-icon" aria-hidden="true">+</span>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function tableMarkup(headers, rows, className = "") {
  return `
    <div class="thp-hr-table-wrap">
      <table class="thp-hr-table ${className}">
        <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${headers.length}">${emptyState("No records yet", "Records for this patient will appear here when available.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderLabReports() {
  const records = state.records["lab-reports"];
  const query = state.app.querySelector("#health-record-list-search")?.value.trim().toLowerCase() || "";
  const rows = records.filter((record) =>
    [record.test_name, record.phlebotomist, record.pathologist, record.clinical_summary]
      .some((value) => String(value || "").toLowerCase().includes(query)),
  ).map((record) => `
    <tr>
      <td><strong>${escapeHtml(record.test_name)}</strong><small>${escapeHtml(record.clinical_summary || "Diagnostic report")}</small></td>
      <td>${dateText(record.specimen_date)}</td>
      <td>${displayValue(record.phlebotomist)}</td>
      <td>${displayValue(record.pathologist)}</td>
      <td><span class="thp-hr-status is-final">${escapeHtml(record.status === "report_ready" ? "Report ready" : "Completed")}</span></td>
      <td class="thp-hr-summary">${displayValue(record.clinical_summary)}</td>
      <td>${record.report_pdf_url
       ? `<button type="button" class="thp-admin-secondary-button thp-hr-view-link" data-health-record-report="${escapeHtml(record.report_pdf_url)}">View PDF</button>`
        : '<span class="thp-hr-muted">No PDF attached</span>'}</td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-hr-panel">
      <header class="thp-hr-panel-heading">
        <div><h2>Diagnostic Lab Reports</h2><p>Completed lab bookings and signed findings</p></div>
      </header>
      <div class="thp-hr-toolbar"><label class="thp-hr-record-search"><span class="thp-admin-sr-only">Search lab reports</span><input id="health-record-list-search" type="search" placeholder="Search reports..." /></label></div>
      ${tableMarkup(["Diagnostic test", "Specimen date", "Phlebotomist", "Pathologist", "Status", "Clinical summary", "Report"], rows)}
      <p class="thp-hr-readonly-note">Lab reports are read-only in the Admin Panel.</p>
    </section>
  `;
}

function renderPrescriptions() {
  const records = state.records.prescriptions;
  const query = state.app.querySelector("#health-record-list-search")?.value.trim().toLowerCase() || "";
  const filtered = records.filter((record) =>
    [record.prescription_number, record.doctor_name, record.diagnosis, record.instructions]
      .concat((record.medicines || []).map((medicine) => medicine.name))
      .some((value) => String(value || "").toLowerCase().includes(query)),
  );
  return `
    <section class="thp-hr-prescription-list">
      ${filtered.length ? filtered.map((record) => `
        <article class="thp-admin-panel thp-hr-prescription-card">
          <header class="thp-hr-prescription-heading">
            <div><span class="thp-hr-eyebrow">${escapeHtml(record.prescription_number || "Completed appointment prescription")}</span>
              <h2>${escapeHtml(record.diagnosis || "Prescription")}</h2>
            </div>
            <div class="thp-hr-prescription-doctor"><strong>${escapeHtml(record.doctor_name || "Doctor not listed")}</strong><span>${dateText(record.issued_on || record.appointment_date)}</span><span class="thp-hr-status is-final">${escapeHtml(record.status || "approved")}</span></div>
          </header>
          ${record.medicines?.length ? `
            <div class="thp-hr-medicine-table-wrap"><table class="thp-hr-table thp-hr-medicine-table">
              <thead><tr><th>Medicine name</th><th>Dosage instruction</th><th>Duration</th></tr></thead>
              <tbody>${record.medicines.map((medicine) => `
                <tr><td><strong>${escapeHtml(medicine.name || medicine.medicine || "—")}</strong></td>
                  <td>${displayValue(medicine.dose || medicine.dosage || medicine.instructions)}</td>
                  <td>${displayValue(medicine.duration)}</td></tr>
              `).join("")}</tbody>
            </table></div>
          ` : `<p class="thp-hr-no-medicines">No medicine details were recorded for this completed appointment.</p>`}
          ${record.instructions ? `<p class="thp-hr-instructions"><strong>Doctor instructions:</strong> ${escapeHtml(record.instructions)}</p>` : ""}
          ${record.pdf_url ? `<a class="thp-admin-secondary-button thp-hr-view-link" href="${escapeHtml(record.pdf_url)}" target="_blank" rel="noopener noreferrer">View prescription</a>` : ""}
        </article>
      `).join("") : emptyState("No prescriptions found", "Completed appointments and approved prescription uploads will appear here.")}
      <p class="thp-hr-readonly-note">Prescriptions are read-only in the Admin Panel.</p>
    </section>
  `;
}

function renderVaccinations() {
  const records = state.records.vaccinations;
  const query = state.app.querySelector("#health-record-list-search")?.value.trim().toLowerCase() || "";
  const rows = records.filter((record) =>
    [record.vaccine, record.dose].some((value) => String(value || "").toLowerCase().includes(query)),
  ).map((record) => `
    <tr>
      <td><strong>${escapeHtml(record.vaccine)}</strong></td>
      <td>${dateText(record.administered_on)}</td>
      <td>${escapeHtml(record.dose)}</td>
      <td>${dateText(record.next_due)}</td>
      <td class="thp-hr-row-actions">${recordActionsMarkup("vaccinations", record)}</td>
    </tr>
  `).join("");
  const canCreate = hasPermission("health_records", "create");
  return `
    <section class="thp-admin-panel thp-hr-panel">
      <header class="thp-hr-panel-heading"><div><h2>Immunization Records</h2><p>Vaccine administrations, doses, and next due dates</p></div>
        ${canCreate ? '<button type="button" class="thp-admin-primary-button" data-health-record-create="vaccinations">+ Add Vaccine</button>' : ""}
      </header>
      <div class="thp-hr-toolbar"><label class="thp-hr-record-search"><span class="thp-admin-sr-only">Search vaccinations</span><input id="health-record-list-search" type="search" placeholder="Search vaccinations..." /></label></div>
      ${tableMarkup(["Vaccine", "Administered date", "Dose", "Next due", "Actions"], rows)}
    </section>
  `;
}

function metricChart(records, key, title, unit, color) {
  const values = records
    .map((record) => ({ value: Number(record[key]), date: record.recorded_at }))
    .filter((item) => Number.isFinite(item.value))
    .slice(0, 12)
    .reverse();
  if (!values.length) {
    return `<article class="thp-hr-vital-chart"><h3>${escapeHtml(title)}</h3><p>No history available</p></article>`;
  }
  const width = 360;
  const height = 112;
  const padding = { top: 12, right: 14, bottom: 12, left: 14 };
  const minValue = Math.min(...values.map((item) => item.value));
  const maxValue = Math.max(...values.map((item) => item.value));
  const spread = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
  const low = minValue - spread * 0.2;
  const high = maxValue + spread * 0.2;
  const x = (index) =>
    padding.left + (index * (width - padding.left - padding.right)) / Math.max(values.length - 1, 1);
  const y = (value) =>
    height - padding.bottom - ((value - low) / (high - low)) * (height - padding.top - padding.bottom);
  const path = values.map((item, index) => `${index ? "L" : "M"} ${x(index).toFixed(1)} ${y(item.value).toFixed(1)}`).join(" ");
  return `
    <article class="thp-hr-vital-chart">
      <header><h3>${escapeHtml(title)}</h3><strong>${values.at(-1).value} ${escapeHtml(unit)}</strong></header>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(`${title} trend chart`)}">
        <path class="thp-hr-chart-grid" d="M${padding.left} ${height * .25}H${width - padding.right} M${padding.left} ${height * .5}H${width - padding.right} M${padding.left} ${height * .75}H${width - padding.right}"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${values.map((item, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(item.value).toFixed(1)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"><title>${dateText(item.date)}: ${item.value} ${escapeHtml(unit)}</title></circle>`).join("")}
      </svg>
      <footer><span>${dateText(values[0].date)}</span><span>${dateText(values.at(-1).date)}</span></footer>
    </article>
  `;
}

function renderAllergiesAndVitals() {
  const allergies = state.records.allergies;
  const query = state.app.querySelector("#health-record-allergy-search")?.value.trim().toLowerCase() || "";
  const allergyRows = allergies.filter((record) =>
    [record.allergy, record.severity].some((value) => String(value || "").toLowerCase().includes(query)),
  ).map((record) => `
    <tr>
      <td><strong>${escapeHtml(record.allergy)}</strong></td>
      <td><span class="thp-hr-severity is-${escapeHtml(record.severity)}">${escapeHtml(record.severity)}</span></td>
      <td class="thp-hr-row-actions">${recordActionsMarkup("allergies", record)}</td>
    </tr>
  `).join("");
  const vitals = state.records.vitals;
  const vitalRows = vitals.map((record) => `
    <tr><td>${dateText(record.recorded_at, true)}</td><td>${record.systolic_bp}/${record.diastolic_bp} mmHg</td><td>${record.sugar} mg/dL</td><td>${record.weight} kg</td><td>${record.height} cm</td><td>${record.pulse} BPM</td>
      <td class="thp-hr-row-actions">${recordActionsMarkup("vitals", record)}</td>
    </tr>
  `).join("");
  return `
    <div class="thp-hr-health-grid">
      <section class="thp-admin-panel thp-hr-panel">
        <header class="thp-hr-panel-heading"><div><h2>Allergies</h2><p>Recorded allergies and severity</p></div>
          ${hasPermission("health_records", "create") ? '<button type="button" class="thp-admin-primary-button" data-health-record-create="allergies">+ Add Allergy</button>' : ""}
        </header>
        <div class="thp-hr-toolbar"><label class="thp-hr-record-search"><span class="thp-admin-sr-only">Search allergies</span><input id="health-record-allergy-search" type="search" placeholder="Search allergies..." /></label></div>
        ${tableMarkup(["Allergy", "Severity", "Actions"], allergyRows)}
      </section>
      <section class="thp-admin-panel thp-hr-panel thp-hr-vitals-panel">
        <header class="thp-hr-panel-heading"><div><h2>Vitals &amp; Longitudinal Trends</h2><p>Patient measurements recorded over time</p></div>
          ${hasPermission("health_records", "create") ? '<button type="button" class="thp-admin-primary-button" data-health-record-create="vitals">+ Record Vitals</button>' : ""}
        </header>
        <div class="thp-hr-vitals-chart-grid">
          ${metricChart(vitals, "systolic_bp", "Systolic BP", "mmHg", "#c83333")}
          ${metricChart(vitals, "diastolic_bp", "Diastolic BP", "mmHg", "#138c80")}
          ${metricChart(vitals, "sugar", "Sugar", "mg/dL", "#e58a1f")}
          ${metricChart(vitals, "weight", "Weight", "kg", "#516fc1")}
          ${metricChart(vitals, "height", "Height", "cm", "#8a5fb5")}
          ${metricChart(vitals, "pulse", "Pulse", "BPM", "#d15782")}
        </div>
        <div class="thp-hr-table-section"><h3>Recorded Vitals</h3>
          ${tableMarkup(["Recorded", "Blood pressure", "Sugar", "Weight", "Height", "Pulse", "Actions"], vitalRows)}
        </div>
      </section>
    </div>
  `;
}

function renderAccessLog() {
  const query = state.app.querySelector("#health-record-list-search")?.value.trim().toLowerCase() || "";
  const rows = state.records["access-log"].filter((record) =>
    [record.staff_name, record.patient, record.record_type, record.role]
      .some((value) => String(value || "").toLowerCase().includes(query)),
  ).map((record) => `
    <tr><td><strong>${escapeHtml(record.staff_name)}</strong></td><td><span class="thp-hr-role">${escapeHtml(record.role || "Staff")}</span></td><td>${dateText(record.created_at, true)}</td><td>${escapeHtml(record.record_type.replaceAll("_", " "))}</td></tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-hr-panel">
      <header class="thp-hr-panel-heading"><div><h2>Electronic Chart Access Log</h2><p>Read-only access trail recorded automatically whenever a patient record is opened</p></div></header>
      <div class="thp-hr-toolbar"><label class="thp-hr-record-search"><span class="thp-admin-sr-only">Search access activity</span><input id="health-record-list-search" type="search" placeholder="Search access activity..." /></label></div>
      ${tableMarkup(["Authorized staff", "Role", "Timestamp", "Record type"], rows)}
    </section>
  `;
}

function renderActivePanel() {
  const panel = state.app?.querySelector("#health-records-panel");
  if (!panel) return;
  if (!state.patient) {
    panel.hidden = true;
    const empty = state.app.querySelector("#health-records-empty");
    if (empty) empty.hidden = false;
    return;
  }
  panel.hidden = false;
  if (state.activeTab === "lab-reports") panel.innerHTML = renderLabReports();
  else if (state.activeTab === "prescriptions") panel.innerHTML = renderPrescriptions();
  else if (state.activeTab === "vaccinations") panel.innerHTML = renderVaccinations();
  else if (state.activeTab === "allergies-vitals") panel.innerHTML = renderAllergiesAndVitals();
  else panel.innerHTML = renderAccessLog();
}

function renderPanelPreservingSearch(searchId) {
  const input = state.app.querySelector(`#${searchId}`);
  const value = input?.value || "";
  const selectionStart = input?.selectionStart;
  const selectionEnd = input?.selectionEnd;
  renderActivePanel();
  const refreshedInput = state.app.querySelector(`#${searchId}`);
  if (!refreshedInput) return;
  refreshedInput.value = value;
  refreshedInput.focus();
  if (selectionStart !== null && selectionEnd !== null) {
    refreshedInput.setSelectionRange(selectionStart, selectionEnd);
  }
}

function updateTabBadges(counts) {
  for (const tab of tabs) {
    const badge = state.app?.querySelector(`[data-health-record-count="${tab.id}"]`);
    if (badge) badge.textContent = counts
      ? String(counts[tab.id] ?? 0)
      : "—";
  }
}

async function loadTab(tabId) {
  if (!state.patient) return;
  const requestId = ++state.recordRequestId;
  const patientId = state.patient.id;
  const app = state.app;
  const eventSignal = app._healthRecordsEvents.signal;
  const isCurrentRequest = () =>
    requestId === state.recordRequestId &&
    state.patient?.id === patientId &&
    !eventSignal.aborted;
  state.activeTab = tabId;
  state.app.querySelectorAll("[data-health-record-tab]").forEach((button) => {
    const active = button.dataset.healthRecordTab === tabId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  setStatus("Loading patient records…");
  renderActivePanel();
  try {
    if (tabId === "lab-reports" || tabId === "prescriptions" || tabId === "vaccinations") {
      const response = await getHealthRecordCollection(tabId, patientId);
      if (!isCurrentRequest()) return;
      state.records[tabId] = response.results || [];
    } else if (tabId === "allergies-vitals") {
      const [allergies, vitals] = await Promise.all([
        getHealthRecordCollection("allergies", patientId),
        getHealthRecordCollection("vitals", patientId),
      ]);
      if (!isCurrentRequest()) return;
      state.records.allergies = allergies.results || [];
      state.records.vitals = vitals.results || [];
    } else {
      const response = await getHealthRecordAccessLog(patientId);
      if (!isCurrentRequest()) return;
      state.records["access-log"] = response.results || [];
    }
    if (!isCurrentRequest()) return;
    setStatus();
    renderActivePanel();
  } catch (error) {
    if (!isCurrentRequest()) return;
    setStatus(error?.message || "Unable to load patient records.", true);
    state.app.querySelector("#health-records-panel").innerHTML = `
      ${emptyState(
        "Records could not be loaded",
        "Please retry. No patient data has been changed.",
      )}
      <div class="thp-hr-retry-action">
        <button type="button" class="thp-admin-secondary-button" data-health-record-retry>Retry</button>
      </div>
    `;
  }
}

async function searchPatients(query, requestId) {
  try {
    const response = await getHealthRecordPatients(query);
    if (requestId !== state.searchRequestId) return;
    state.patients = response.results || [];
    patientResultsMarkup();
  } catch (error) {
    setStatus(error?.message || "Patient search failed.", true);
  }
}

async function selectPatient(patientId, app) {
  const selectionRequestId = ++state.patientSelectionRequestId;
  const eventSignal = app._healthRecordsEvents.signal;
  state.recordRequestId += 1;
  state.patient = null;
  state.activeTab = "lab-reports";
  state.records = emptyRecords();

  const patientSearch = app.querySelector("#health-record-patient-search");
  const patientCard = app.querySelector("#health-record-patient-card");
  const tabsElement = app.querySelector("#health-record-tabs");
  const empty = app.querySelector("#health-records-empty");
  const panel = app.querySelector("#health-records-panel");
  const modal = app.querySelector("#health-record-modal");
  if (!patientSearch || !patientCard || !tabsElement || !empty || !panel || !modal) {
    throw new Error("Health Records chart elements are unavailable.");
  }

  patientSearch.value = "";
  patientResultsMarkup();
  patientCard.hidden = true;
  patientCard.innerHTML = "";
  tabsElement.hidden = true;
  updateTabBadges(null);
  modal.hidden = true;
  modal.innerHTML = "";
  empty.hidden = true;
  panel.hidden = false;
  panel.innerHTML = emptyState(
    "Loading patient records",
    "The selected patient's records are being loaded.",
  );
  setStatus("Opening patient chart…");

  const isCurrentSelection = () =>
    selectionRequestId === state.patientSelectionRequestId &&
    state.app === app &&
    !eventSignal.aborted &&
    window.location.hash.startsWith("#/admin/health-records");

  try {
    const response = await getHealthRecordPatient(patientId);
    if (!isCurrentSelection()) return;
    state.patient = response.patient;
    patientCard.innerHTML = patientCardMarkup(state.patient);
    patientCard.hidden = false;
    tabsElement.hidden = false;
    await loadTab("lab-reports");
    if (!isCurrentSelection()) return;

    try {
      const counts = await getHealthRecordCounts(patientId);
      if (isCurrentSelection()) updateTabBadges(counts);
    } catch (error) {
      if (isCurrentSelection()) {
        setStatus(error?.message || "Unable to load Health Records counts.", true);
      }
    }
  } catch (error) {
    if (!isCurrentSelection()) return;
    setStatus(error?.message || "Unable to open this patient's chart.", true);
    panel.innerHTML = `
      ${emptyState(
        "Records could not be loaded",
        "Please retry. No patient data has been changed.",
      )}
      <div class="thp-hr-retry-action">
        <button type="button" class="thp-admin-secondary-button" data-health-record-patient-retry="${escapeHtml(patientId)}">Retry</button>
      </div>
    `;
  }
}

function recordFor(resource, id) {
  const records = resource === "vitals"
    ? state.records.vitals
    : resource === "allergies"
      ? state.records.allergies
      : state.records.vaccinations;
  return records.find((record) => String(record.id) === String(id));
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function openRecordModal(resource, record = null, readOnly = false) {
  const modal = state.app.querySelector("#health-record-modal");
  const creating = !record;
  const resourceLabel = resource === "vaccinations"
    ? "vaccination"
    : resource === "allergies"
      ? "allergy"
      : "vitals";
  const actionTitle = readOnly
    ? "View"
    : creating
      ? (resource === "vitals" ? "Record" : "Add")
      : "Edit";
  const title = `${actionTitle} ${resourceLabel}`;
  let fields = "";
  if (resource === "vaccinations") {
    fields = `
      <label class="thp-admin-form-group"><span>Vaccine</span><input name="vaccine" maxlength="200" value="${escapeHtml(record?.vaccine || "")}" required /></label>
      <label class="thp-admin-form-group"><span>Date</span><input name="administered_on" type="date" value="${escapeHtml(record?.administered_on || "")}" required /></label>
      <label class="thp-admin-form-group"><span>Dose</span><input name="dose" maxlength="100" value="${escapeHtml(record?.dose || "")}" required /></label>
      <label class="thp-admin-form-group"><span>Next due</span><input name="next_due" type="date" value="${escapeHtml(record?.next_due || "")}" /></label>
    `;
  } else if (resource === "allergies") {
    fields = `
      <label class="thp-admin-form-group"><span>Allergy</span><input name="allergy" maxlength="200" value="${escapeHtml(record?.allergy || "")}" required /></label>
      <label class="thp-admin-form-group"><span>Severity</span><select name="severity" required>
        <option value="">Select severity</option>
        ${["mild", "moderate", "severe"].map((severity) => `<option value="${severity}" ${record?.severity === severity ? "selected" : ""}>${severity.charAt(0).toUpperCase() + severity.slice(1)}</option>`).join("")}
      </select></label>
    `;
  } else {
    fields = `
      <label class="thp-admin-form-group"><span>Recorded date and time</span><input name="recorded_at" type="datetime-local" value="${escapeHtml(localDateTime(record?.recorded_at) || localDateTime(new Date().toISOString()))}" required /></label>
      <label class="thp-admin-form-group"><span>Systolic blood pressure (mmHg)</span><input name="systolic_bp" type="number" min="40" max="300" value="${escapeHtml(record?.systolic_bp ?? "")}" required /></label>
      <label class="thp-admin-form-group"><span>Diastolic blood pressure (mmHg)</span><input name="diastolic_bp" type="number" min="20" max="200" value="${escapeHtml(record?.diastolic_bp ?? "")}" required /></label>
      <label class="thp-admin-form-group"><span>Sugar (mg/dL)</span><input name="sugar" type="number" min="0.1" step="0.1" value="${escapeHtml(record?.sugar ?? "")}" required /></label>
      <label class="thp-admin-form-group"><span>Weight (kg)</span><input name="weight" type="number" min="0.1" step="0.01" value="${escapeHtml(record?.weight ?? "")}" required /></label>
      <label class="thp-admin-form-group"><span>Height (cm)</span><input name="height" type="number" min="0.1" step="0.01" value="${escapeHtml(record?.height ?? "")}" required /></label>
      <label class="thp-admin-form-group"><span>Pulse (BPM)</span><input name="pulse" type="number" min="20" max="250" value="${escapeHtml(record?.pulse ?? "")}" required /></label>
    `;
  }
  modal.innerHTML = `
    <div class="thp-admin-modal-backdrop" data-health-record-modal-close></div>
    <section class="thp-admin-modal-card thp-hr-modal-card" role="dialog" aria-modal="true" aria-labelledby="health-record-modal-title">
      <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">PATIENT HEALTH RECORD</p><h2 id="health-record-modal-title">${escapeHtml(title)}</h2></div>
        <button type="button" class="thp-admin-modal-close" data-health-record-modal-close aria-label="Close">×</button>
      </header>
      ${readOnly
        ? `<div class="thp-hr-form-grid">${fields}</div>`
        : `<form data-health-record-form="${resource}" data-record-id="${record?.id || ""}">
            <div class="thp-hr-form-grid">${fields}</div>
            <p class="thp-hr-modal-error" id="health-record-modal-error" role="alert" hidden></p>
            <footer class="thp-admin-modal-footer">
              <button type="button" class="thp-admin-secondary-button" data-health-record-modal-close>Cancel</button>
              <button type="submit" class="thp-admin-primary-button">${creating ? "Save record" : "Save changes"}</button>
            </footer>
          </form>`
      }
      ${readOnly ? `<footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-health-record-modal-close>Close</button></footer>` : ""}
    </section>
  `;
  modal.hidden = false;
  if (readOnly) {
    modal.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = true;
    });
  }
  const initialFocus = readOnly
    ? modal.querySelector("[data-health-record-modal-close]")
    : modal.querySelector("input, select");
  initialFocus?.focus();
}

function closeRecordModal() {
  const modal = state.app.querySelector("#health-record-modal");
  modal.hidden = true;
  modal.innerHTML = "";
}

async function refreshCurrentTab() {
  await loadTab(state.activeTab);
}

async function refreshCounts() {
  try {
    const counts = await getHealthRecordCounts(state.patient?.id || "");
    updateTabBadges(counts);
  } catch (error) {
    setStatus(error?.message || "Unable to refresh Health Records counts.", true);
    return;
  }
  try {
    await refreshHealthRecordCounts();
  } catch (error) {
    console.error("Unable to refresh global Health Records counts.", error);
    setStatus(error?.message || "Unable to refresh global Health Records counts.", true);
  }
}

async function handleRecordForm(event) {
  const form = event.target.closest("[data-health-record-form]");
  if (!form) return;
  event.preventDefault();
  const resource = form.dataset.healthRecordForm;
  const data = Object.fromEntries(new FormData(form));
  data.patient_id = state.patient.id;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  const error = form.querySelector("#health-record-modal-error");
  try {
    if (form.dataset.recordId) {
      await updateHealthRecord(resource, form.dataset.recordId, data);
    } else {
      await createHealthRecord(resource, data);
    }
    closeRecordModal();
    showToast("Health record saved.");
    await refreshCurrentTab();
    await refreshCounts();
  } catch (caught) {
    error.textContent = caught?.message || "Unable to save this health record.";
    error.hidden = false;
    submit.disabled = false;
  }
}

async function deleteRecord(resource, id) {
  const record = recordFor(resource, id);
  const label = record?.vaccine || record?.allergy || "health record";
  if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
  try {
    await deleteHealthRecord(resource, id);
    showToast("Health record deleted.");
    await refreshCurrentTab();
    await refreshCounts();
  } catch (error) {
    showToast(error?.message || "Unable to delete this health record.");
  }
}

function attachEvents(app) {
  app._healthRecordsEvents?.abort();
  const controller = new AbortController();
  app._healthRecordsEvents = controller;
  const options = { signal: controller.signal };

  app.addEventListener("input", (event) => {
    if (event.target.id === "health-record-patient-search") {
      window.clearTimeout(state.searchTimer);
      const query = event.target.value.trim();
      const requestId = ++state.searchRequestId;
      if (!query) {
        state.patients = [];
        patientResultsMarkup();
        return;
      }
      state.searchTimer = window.setTimeout(() => searchPatients(query, requestId), 220);
    } else if (event.target.id === "health-record-list-search") {
      renderPanelPreservingSearch("health-record-list-search");
    } else if (event.target.id === "health-record-allergy-search") {
      renderPanelPreservingSearch("health-record-allergy-search");
    }
  }, options);

  app.addEventListener("click", async (event) => {
    const reportButton = event.target.closest("[data-health-record-report]");
    if (reportButton) {
      const reportWindow = window.open("", "_blank");
      if (!reportWindow) {
        setStatus("Allow pop-ups to view the protected lab report.", true);
        return;
      }
      reportWindow.opener = null;
      reportButton.disabled = true;
      try {
        const reportPath = reportButton.dataset.healthRecordReport.replace(
          /^\/api\/admin(?=\/)/,
          "",
        );
        const file = await getAdminFile(reportPath);
        const url = URL.createObjectURL(file);
        reportWindow.location.replace(url);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        reportWindow.close();
        setStatus(error?.message || "Unable to open the lab report.", true);
      } finally {
        reportButton.disabled = false;
      }
      return;
    }
    if (event.target.closest("[data-health-record-retry]")) {
      await loadTab(state.activeTab);
      return;
    }
    const patientRetry = event.target.closest("[data-health-record-patient-retry]");
    if (patientRetry) {
      await selectPatient(patientRetry.dataset.healthRecordPatientRetry, app);
      return;
    }
    const patientButton = event.target.closest("[data-health-record-patient]");
    if (patientButton) {
      const patientId = patientButton.dataset.healthRecordPatient;
      await selectPatient(patientId, app);
      return;
    }
    const tab = event.target.closest("[data-health-record-tab]");
    if (tab) {
      await loadTab(tab.dataset.healthRecordTab);
      return;
    }
    const create = event.target.closest("[data-health-record-create]");
    if (create && state.patient) {
      openRecordModal(create.dataset.healthRecordCreate);
      return;
    }
    const viewRecord = event.target.closest("[data-health-record-view]");
    if (viewRecord) {
      const resource = viewRecord.dataset.healthRecordView;
      const record = recordFor(resource, viewRecord.dataset.recordId);
      if (record) openRecordModal(resource, record, true);
      return;
    }
    const edit = event.target.closest("[data-health-record-edit]");
    if (edit) {
      const resource = edit.dataset.healthRecordEdit;
      const record = recordFor(resource, edit.dataset.recordId);
      if (record) openRecordModal(resource, record);
      return;
    }
    const remove = event.target.closest("[data-health-record-delete]");
    if (remove) {
      await deleteRecord(remove.dataset.healthRecordDelete, remove.dataset.recordId);
      return;
    }
    if (event.target.closest("[data-health-record-modal-close]")) closeRecordModal();
  }, options);

  app.addEventListener("submit", handleRecordForm, options);
  app.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !app.querySelector("#health-record-modal").hidden) {
      closeRecordModal();
    }
  }, options);
}

export async function renderAdminHealthRecords(app) {
  if (!isAdminAuthenticated()) {
    window.location.hash = "#/admin/login";
    return;
  }
  try {
    await refreshAdminSession();
  } catch {
    window.location.hash = "#/admin/login";
    return;
  }
  if (!window.location.hash.startsWith("#/admin/health-records")) return;
  if (!hasPermission("health_records", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  state.app = app;
  state.patient = null;
  state.activeTab = "lab-reports";
  state.patients = [];
  state.records = {
    "lab-reports": [],
    prescriptions: [],
    vaccinations: [],
    allergies: [],
    vitals: [],
    "access-log": [],
  };

  const content = `
    <section class="thp-hr-page" id="health-records-workspace">
      <section class="thp-admin-panel thp-hr-patient-banner" id="health-record-patient-card" hidden></section>
      <nav class="thp-hr-tabs" id="health-record-tabs" aria-label="Patient health record sections" role="tablist" hidden>
        ${tabs.map((tab, index) => `
          <button type="button" class="thp-hr-tab ${index === 0 ? "is-active" : ""}" role="tab" id="health-record-tab-${tab.id}" aria-selected="${index === 0}" aria-controls="health-records-panel" tabindex="${index === 0 ? 0 : -1}" data-health-record-tab="${tab.id}">
            ${escapeHtml(tab.label)} <span class="thp-hr-tab-count" data-health-record-count="${tab.id}">${getCachedHealthRecordCounts()?.[tab.id] ?? "—"}</span>
          </button>
        `).join("")}
      </nav>
      <p class="thp-hr-feedback" id="health-records-status" role="status" hidden></p>
      <div id="health-records-empty">${emptyState("Select a patient to view health records", "Search for a patient above to open their medical chart.")}</div>
      <section class="thp-hr-content" id="health-records-panel" role="tabpanel" aria-labelledby="health-record-tab-lab-reports" hidden></section>
      <div class="thp-admin-modal thp-hr-modal" id="health-record-modal" hidden></div>
    </section>
  `;
  const patientSearch = `
    <div class="thp-hr-search-wrap">
      <label class="thp-hr-patient-search-label" for="health-record-patient-search">Patient</label>
      <input id="health-record-patient-search" type="search" placeholder="Search patients..." autocomplete="off" aria-controls="health-record-patient-results" aria-expanded="false" />
      <div class="thp-hr-patient-results" id="health-record-patient-results" role="listbox" hidden></div>
    </div>
  `;
  renderAdminLayout(app, "health_records", content, {
    subtitle: "Read-focused patient charts and a complete access trail.",
    actions: patientSearch,
  });
  state.app = app;
  attachEvents(app);
  app.addEventListener("thp-health-record-counts-updated", (event) => {
    if (!state.patient) updateTabBadges(event.detail);
  }, { signal: app._healthRecordsEvents.signal });

  getHealthRecordCounts()
    .then((counts) => {
      if (!state.patient) updateTabBadges(counts);
    })
    .catch((error) => {
      setStatus(error?.message || "Unable to load Health Records counts.", true);
    });

  try {
    const response = await getHealthRecordPatients("");
    state.patients = response.results || [];
    const input = app.querySelector("#health-record-patient-search");
    input.addEventListener("focus", () => {
      if (!input.value.trim()) {
        input.value = " ";
        patientResultsMarkup();
        input.value = "";
        app.querySelector("#health-record-patient-results").hidden = false;
        app.querySelector("#health-record-patient-results").innerHTML = state.patients.length
          ? state.patients.map((patient) => `
              <button type="button" class="thp-hr-patient-result" role="option" data-health-record-patient="${escapeHtml(patient.id)}">
                <strong>${escapeHtml(patient.name)}</strong>
                <span>${escapeHtml(patient.external_id || patient.id)}${patient.mobile ? ` · ${escapeHtml(patient.mobile)}` : ""}</span>
              </button>
            `).join("")
          : `<p class="thp-hr-patient-no-results" role="status">No patients are available.</p>`;
      }
    }, { signal: app._healthRecordsEvents.signal });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        const results = app.querySelector("#health-record-patient-results");
        if (results && !results.contains(document.activeElement)) results.hidden = true;
      }, 120);
    }, { signal: app._healthRecordsEvents.signal });
  } catch (error) {
    setStatus(error?.message || "Unable to load patients.", true);
  }
}
