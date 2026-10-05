import { isAdminAuthenticated, hasPermission, refreshAdminSession } from "./adminAuth.js";
import { renderAdminLayout } from "./adminLayout.js";
import { escapeHtml } from "./adminChart.js";
import {
  createCareRecord,
  deleteCareRecord,
  getCareCollection,
  getCareRecord,
  runCareAction,
  updateCareRecord,
} from "./adminApi.js";

const TABS = [
  ["appointments", "Appointments"],
  ["doctors", "Doctors"],
  ["slots", "Weekly Slots"],
  ["instant-consults", "Instant Consult"],
  ["specialties", "Specialties"],
  ["reviews", "Reviews"],
  ["payouts", "Payouts"],
];

const titles = {
  doctors: ["Clinical Specialists", "Verified practitioners available for patient scheduling.", "Add Doctor"],
  specialties: ["Medical Specialties", "Clinical departments and practitioner taxonomy.", "Add Specialty"],
  schedules: ["Schedules & Leaves", "Configure weekly doctor hours and planned leave.", "Add Schedule"],
  leaves: ["Doctor Leave Dates", "Review planned leave and protect booked appointments.", ""],
  slots: ["Weekly Doctor Availability Grid", "Booked slots stay locked. Update working hours and availability for the selected doctor.", "+ Add Slot"],
  appointments: ["Clinical Consultations Pipeline", "Manage booked consultations, outcomes, and appointment timelines.", "Book Appointment"],
  "instant-consults": ["Live Tele-Triage Waiting Queue", "Track patient wait time and escalate consultations waiting longer than 15 minutes.", "Add to Queue"],
  reviews: ["Patient Doctor Reviews", "Moderate patient feedback; only approved reviews affect doctor ratings.", ""],
  payouts: ["Physician Compensation & Payouts", "Net payouts calculated from completed consultations and the configured commission.", "Commission Settings"],
  payments: ["Consultation Payments", "Review consultation charges and doctor payout transactions.", ""],
  refunds: ["Refund Requests", "Review refund requests linked to cancelled paid appointments.", ""],
  "call-logs": ["Instant Consult Call Logs", "Completed calls, consultation type, and duration.", ""],
};

const escape = (value) => escapeHtml(value == null || value === "" ? "—" : String(value));
const dateToday = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};
const weekDates = (date) => {
  const monday = new Date(`${date}T12:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
};
const tabParent = (tab) => ({
  schedules: "slots",
  leaves: "slots",
  payments: "payouts",
  refunds: "payouts",
  "call-logs": "instant-consults",
}[tab] || tab);

export async function renderAdminDoctors(app) {
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
  if (!window.location.hash.startsWith("#/admin/doctors")) return;
  if (!hasPermission("doctors", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  const state = {
    tab: new URLSearchParams(window.location.hash.split("?")[1] || "").get("tab") === "refunds"
      ? "refunds"
      : "appointments",
    rows: [],
    specialties: [],
    doctors: [],
    patients: [],
    commissionPercent: 15,
    search: "",
    filter: "",
    date: dateToday(),
    doctorId: "",
    availableSlots: [],
    availableSlotsLoading: false,
    availableSlotsError: "",
    selectedSlotId: "",
    appointmentSlotsRequest: 0,
    tabCounts: Object.fromEntries(TABS.map(([key]) => [key, { status: "loading", value: null }])),
    loading: true,
    error: "",
    modal: null,
  };
  clearInterval(app._adminCareRefreshTimer);
  renderAdminLayout(
    app,
    "doctors",
    '<div id="admin-doctors-workspace" class="thp-care-workspace"></div>',
    { subtitle: "Clinical operations, appointments and doctor services." },
  );
  app._adminCareEvents?.abort();
  const controller = new AbortController();
  app._adminCareEvents = controller;
  const workspace = () => app.querySelector("#admin-doctors-workspace");

  function toast(message, error = false) {
    const node = document.querySelector("#toast");
    if (!node) return;
    node.classList.toggle("is-error", error);
    node.querySelector("#toast-text").textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 3200);
  }

  async function load(resource = state.tab, preserveSearchFocus = false) {
    const activeSearch = app.querySelector("[data-care-search]");
    const restoreSearchFocus = preserveSearchFocus
      && activeSearch === document.activeElement
      ? () => {
        const input = app.querySelector("[data-care-search]");
        if (!input) return;
        input.focus({ preventScroll: true });
        input.setSelectionRange(state.search.length, state.search.length);
      }
      : () => {};
    state.loading = true;
    state.error = "";
    render();
    restoreSearchFocus();
    try {
      const params = { search: state.search };
      if (state.filter) {
        params[state.tab === "doctors" ? "verification_status" : state.tab === "specialties" ? "active" : "status"] = state.filter;
      }
      if (resource === "payouts") params.period = state.date.slice(0, 7);
      if (resource === "slots") {
        const dates = weekDates(state.date);
        const days = await Promise.all(dates.map((date) => getCareCollection("slots", {
          doctor_id: state.doctorId,
          date,
          page_size: 250,
        })));
        state.rows = days.flatMap((day) => day.results || []);
      } else {
        const response = await getCareCollection(resource, params);
        state.rows = Array.isArray(response?.results) ? response.results : [];
      }
      if (resource === "doctors") state.doctors = state.rows;
      if (resource === "specialties") state.specialties = state.rows;
      state.loading = false;
      render();
      restoreSearchFocus();
    } catch (error) {
      state.rows = [];
      state.loading = false;
      state.error = error.message || "Unable to load this section.";
      render();
      restoreSearchFocus();
    }

  }

  async function loadTabCounts() {
    await Promise.all(TABS.map(async ([resource]) => {
      try {
        const response = await getCareCollection(resource, { page_size: 1, count_only: true });
        const count = Number(response?.total ?? response?.results?.length ?? 0);
        if (!Number.isFinite(count) || count < 0) {
          throw new Error(`The ${resource} count response was invalid.`);
        }
        state.tabCounts[resource] = { status: "ready", value: count };
      } catch (error) {
        state.tabCounts[resource] = { status: "error", value: null, message: error.message };
      }
      render();
    }));
  }

  async function refreshAppointmentSlots() {
    const requestId = ++state.appointmentSlotsRequest;
    const doctorId = state.modal?.doctorId;
    const date = state.modal?.date;
    state.availableSlots = [];
    state.selectedSlotId = "";
    state.availableSlotsError = "";
    state.availableSlotsLoading = Boolean(doctorId && date);
    if (!doctorId || !date) {
      state.availableSlotsError = "Choose a doctor and date";
      state.availableSlotsLoading = false;
      render();
      return;
    }
    render();
    try {
      const response = await getCareCollection("slots", {
        doctor_id: doctorId,
        date,
      });
      if (
        requestId !== state.appointmentSlotsRequest
        || state.modal?.kind !== "appointment"
      ) return;
      state.availableSlots = (response.results || []).filter(
        (slot) =>
          slot.status === "available"
          && slot.id
          && (!slot.doctor_id || String(slot.doctor_id) === String(doctorId))
          && (!slot.date || slot.date === date),
      );
    } catch (error) {
      if (
        requestId !== state.appointmentSlotsRequest
        || state.modal?.kind !== "appointment"
      ) return;
      state.availableSlotsError = "Unable to load slots";
      toast(error.message || "Unable to load appointment slots.", true);
    } finally {
      if (
        requestId === state.appointmentSlotsRequest
        && state.modal?.kind === "appointment"
      ) {
        state.availableSlotsLoading = false;
        render();
      }
    }
  }

  function field(label, name, value = "", type = "text", required = false, extra = "") {
    return `<label class="thp-admin-form-group"><span>${escape(label)}</span><input name="${escape(name)}" type="${type}" value="${escape(value === "—" ? "" : value)}" ${required ? "required" : ""} ${extra}></label>`;
  }

  function detailValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      return value.map((item) => (
        item && typeof item === "object" ? JSON.stringify(item) : String(item)
      )).join(", ") || "—";
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).replace("T", " ").replace(/Z$/, "");
  }

  function renderModal() {
    if (!state.modal) return "";
    const { kind, row = {}, mode = "create" } = state.modal;
    const edit = mode === "edit";
    if (kind === "doctor") {
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="care-modal-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">DOCTOR PROFILE</p><h2 id="care-modal-title">${edit ? "Edit Doctor" : "Add Doctor"}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close aria-label="Close">×</button></header><form id="care-doctor-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid">
        ${field("Full name", "name", row.name, "text", true)}
        <label class="thp-admin-form-group"><span>Specialty</span><select name="specialty" required><option value="">Select specialty</option>${state.specialties.filter((item) => item.is_active || (edit && row.specialty === item.name)).map((item) => `<option value="${escape(item.name)}" ${row.specialty === item.name ? "selected" : ""}>${escape(item.name)}${item.is_active ? "" : " (inactive)"}</option>`).join("")}</select></label>
        ${field("City", "city", row.city, "text", true)}
        ${field("Degree", "degree", row.degree, "text", true)}
        ${field("Qualifications", "qualifications", row.qualifications)}
        ${field("License details", "license_details", row.license_details)}
        ${field("Experience", "experience", row.experience)}
        ${field("Hospital / clinic", "hospital", row.hospital)}
        ${field("Consultation fee", "fee", row.fee ?? 0, "number", true, 'min="0" step="0.01"')}
        <label class="thp-admin-form-group"><span>Consultation type</span><select name="type"><option ${row.consultation_type === "Both" ? "selected" : ""}>Both</option><option ${row.consultation_type === "Online" ? "selected" : ""}>Online</option><option ${row.consultation_type === "In-person" ? "selected" : ""}>In-person</option></select></label>
        ${field("Photo URL", "photo", row.photo, "url")}
        <label class="thp-admin-form-group thp-care-form-wide"><span>Biography</span><textarea name="bio" rows="3">${escape(row.bio === "—" ? "" : row.bio)}</textarea></label>
        <label class="thp-admin-form-group"><span>Available</span><select name="available"><option value="true" ${row.available !== false ? "selected" : ""}>Yes</option><option value="false" ${row.available === false ? "selected" : ""}>No</option></select></label>
      </div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">${edit ? "Save Changes" : "Add Doctor"}</button></footer></form></section></div>`;
    }
    if (kind === "specialty") {
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">DOCTOR SETTINGS</p><h2>${edit ? "Edit Specialty" : "Add Specialty"}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-specialty-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid">${field("Name", "name", row.name, "text", true)}${field("Icon", "icon", row.icon)}<label class="thp-admin-form-group thp-care-form-wide"><span>Description</span><textarea name="description" rows="3">${escape(row.description === "—" ? "" : row.description)}</textarea></label><label class="thp-admin-form-group"><span>Active</span><select name="is_active"><option value="true" ${row.is_active !== false ? "selected" : ""}>Yes</option><option value="false" ${row.is_active === false ? "selected" : ""}>No</option></select></label></div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">${edit ? "Save Changes" : "Add Specialty"}</button></footer></form></section></div>`;
    }
    if (kind === "slot") {
      const selectedDoctorId = row.doctor_id || state.modal.doctorId || state.doctorId;
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="care-modal-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">WEEKLY AVAILABILITY</p><h2 id="care-modal-title">${edit ? "Edit Slot" : "Add Slot"}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close aria-label="Close">×</button></header><form id="care-slot-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid"><label class="thp-admin-form-group thp-care-form-wide"><span>Search doctor</span><input type="search" data-care-slot-doctor-search placeholder="Type a doctor's name" autocomplete="off"></label><label class="thp-admin-form-group thp-care-form-wide"><span>Doctor</span><select name="doctor_id" required>${state.doctors.map((doc) => `<option value="${escape(doc.id)}" ${doc.id === selectedDoctorId ? "selected" : ""}>${escape(doc.name)}${doc.specialty ? ` · ${escape(doc.specialty)}` : ""}</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Date</span><input name="date" type="date" data-care-slot-date value="${escape(row.date || state.date)}" required></label><label class="thp-admin-form-group"><span>Day</span><select name="weekday" data-care-slot-weekday required>${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day, index) => `<option value="${index}" ${index === (row.weekday ?? new Date(`${state.date}T12:00:00`).getDay() + 6) % 7 ? "selected" : ""}>${day}</option>`).join("")}</select></label>${field("Start time", "start_time", row.start_time || "09:00", "time", true)}${field("End time", "end_time", row.end_time || "09:30", "time", true)}<label class="thp-admin-form-group"><span>Slot duration</span><select name="duration_minutes" required>${[10, 15, 20, 30].map((minutes) => `<option value="${minutes}" ${Number(row.duration_minutes || 30) === minutes ? "selected" : ""}>${minutes} minutes</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Status</span><select name="status" required><option value="available" ${row.status !== "blocked" ? "selected" : ""}>Available</option><option value="blocked" ${row.status === "blocked" ? "selected" : ""}>Blocked</option></select></label></div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">${edit ? "Save Changes" : "Add Slot"}</button></footer></form></section></div>`;
    }
    if (kind === "schedule") {
      const selectedDoctorId = row.doctor_id || state.doctorId;
      const working = row.is_working !== false;
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">WEEKLY AVAILABILITY</p><h2>${edit ? "Edit Doctor Schedule" : "Set Doctor Schedule"}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-schedule-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid"><label class="thp-admin-form-group thp-care-form-wide"><span>Doctor</span><select name="doctor_id" required>${state.doctors.map((doc) => `<option value="${escape(doc.id)}" ${doc.id === selectedDoctorId ? "selected" : ""}>${escape(doc.name)}</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Weekday</span><select name="weekday">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day, i) => `<option value="${i}" ${i === Number(row.weekday) ? "selected" : ""}>${day}</option>`).join("")}</select></label>${field("Start time", "start_time", row.start_time || "09:00", "time", working)}${field("End time", "end_time", row.end_time || "17:00", "time", working)}<label class="thp-admin-form-group"><span>Slot duration</span><select name="duration_minutes">${[15, 30, 20, 10].map((minutes) => `<option value="${minutes}" ${Number(row.duration_minutes || 30) === minutes ? "selected" : ""}>${minutes}</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Working</span><select name="is_working" data-care-schedule-working><option value="true" ${working ? "selected" : ""}>Yes</option><option value="false" ${!working ? "selected" : ""}>No</option></select></label></div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">${edit ? "Save Changes" : "Save Schedule"}</button></footer></form></section></div>`;
    }
    if (kind === "leave") {
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">SCHEDULE MANAGEMENT</p><h2>Add Doctor Leave</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-leave-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid"><label class="thp-admin-form-group thp-care-form-wide"><span>Doctor</span><select name="doctor_id" required>${state.doctors.map((doc) => `<option value="${escape(doc.id)}">${escape(doc.name)}</option>`).join("")}</select></label>${field("Date", "date", state.date, "date", true)}${field("Reason", "reason")}</div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">Add Leave</button></footer></form></section></div>`;
    }
    if (kind === "appointment") {
      const verifiedDoctors = state.doctors.filter((doctor) => doctor.verification_status === "verified");
      const slotPlaceholder = state.availableSlotsLoading
        ? "Loading available slots…"
        : state.availableSlotsError || "No slots available";
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">APPOINTMENT BOOKING</p><h2>Book Appointment</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-appointment-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid"><label class="thp-admin-form-group"><span>Patient</span><select name="patient_id" required>${state.patients.map((patient) => `<option value="${escape(patient.id)}">${escape(patient.name)}</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Verified doctor</span><select name="doctor_id" data-care-appointment-doctor required>${verifiedDoctors.map((doctor) => `<option value="${escape(doctor.id)}" ${state.modal.doctorId === doctor.id ? "selected" : ""}>${escape(doctor.name)}</option>`).join("")}</select></label>${field("Date", "date", state.modal.date || state.date, "date", true, "data-care-appointment-date")}<label class="thp-admin-form-group"><span>Available slot</span><select name="slot_id" required><option value="" disabled ${state.selectedSlotId ? "" : "selected"}>${escape(slotPlaceholder)}</option>${state.availableSlots.map((slot) => `<option value="${escape(slot.id)}" ${state.selectedSlotId === String(slot.id) ? "selected" : ""}>${escape(slot.start_time)}–${escape(slot.end_time)}</option>`).join("")}</select></label></div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit" ${state.availableSlotsLoading || !state.availableSlots.length ? "disabled" : ""}>Book Appointment</button></footer></form></section></div>`;
    }
    if (kind === "instant-consult") {
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">INSTANT CONSULT</p><h2>Add to Queue</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-instant-consult-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid"><label class="thp-admin-form-group"><span>Patient</span><select name="patient_id" required>${state.patients.map((patient) => `<option value="${escape(patient.id)}">${escape(patient.name)}</option>`).join("")}</select></label><label class="thp-admin-form-group"><span>Call type</span><select name="consultation_type"><option>Video</option><option>Audio</option></select></label></div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">Add to Queue</button></footer></form></section></div>`;
    }
    if (kind === "commission") {
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">PAYOUT SETTINGS</p><h2>Doctor Commission</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-commission-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid">${field("Commission percent", "commission_percent", state.commissionPercent, "number", true, 'min="0" max="100" step="0.01"')}</div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button" type="submit">Save Commission</button></footer></form></section></div>`;
    }
    if (kind === "action") {
      const action = state.modal.action;
      const title = action === "delete" ? "Delete record" : action === "complete" ? "Complete appointment" : action === "reject" ? "Reject doctor" : "Assign doctor";
      const fields = action === "complete"
        ? `${field("Diagnosis", "diagnosis")}<label class="thp-admin-form-group"><span>Prescription notes</span><textarea name="prescription_notes" rows="3"></textarea></label><label class="thp-admin-form-group thp-care-form-wide"><span>Medicines (one per line)</span><textarea name="medicines" rows="3"></textarea></label>`
        : action === "reject"
          ? `<label class="thp-admin-form-group thp-care-form-wide"><span>Reason for rejection</span><textarea name="reason" rows="3" required></textarea></label>`
          : action === "assign"
            ? `<label class="thp-admin-form-group thp-care-form-wide"><span>Verified doctor</span><select name="doctor_id" required>${state.doctors.filter((doctor) => doctor.verification_status === "verified").map((doctor) => `<option value="${escape(doctor.id)}">${escape(doctor.name)}</option>`).join("")}</select></label>`
            : action === "reschedule"
              ? `${field("New date", "date", state.date, "date", true, 'data-care-reschedule-date')}<label class="thp-admin-form-group"><span>Available slot</span><select name="slot_id" required>${state.availableSlots.map((slot) => `<option value="${escape(slot.id)}">${escape(slot.start_time)}–${escape(slot.end_time)}</option>`).join("")}</select></label>`
              : `<p class="thp-care-form-wide">This action cannot be undone. Continue?</p>`;
      return `<div class="thp-admin-modal thp-care-action-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card" role="dialog" aria-modal="true"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">CONFIRM ACTION</p><h2>${title}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close>×</button></header><form id="care-action-form" class="thp-admin-modal-form"><div class="thp-admin-form-grid">${fields}</div><p class="thp-care-inline-error" role="alert"></p><footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-care-close>Cancel</button><button class="thp-admin-primary-button ${action === "delete" ? "is-danger" : ""}" type="submit">Continue</button></footer></form></section></div>`;
    }
    if (kind === "details") {
      const hiddenFields = new Set([
        "history",
        "id",
        "_id",
        "development_key",
        "is_development_data",
        "doctor",
        "doctor_id",
        "patient",
        "patient_id",
        "slot",
        "slot_id",
        "appointment_id",
        "payment_id",
        "payout_id",
        "consult_id",
      ]);
      const entries = Object.entries(row).filter(([key, value]) =>
        !hiddenFields.has(key) && value !== null && value !== "",
      );
      const wideFields = new Set([
        "bio",
        "diagnosis",
        "description",
        "details",
        "instructions",
        "medicines",
        "qualifications",
        "rejection_reason",
        "suspension_reason",
      ]);
      const history = Array.isArray(row.history) ? row.history : [];
      return `<div class="thp-admin-modal" data-care-modal><div class="thp-admin-modal-backdrop" data-care-close></div><section class="thp-admin-modal-card thp-care-detail-modal" role="dialog" aria-modal="true" aria-labelledby="care-modal-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">RECORD DETAILS</p><h2 id="care-modal-title">${escape(row.name || row.patient_name || row.doctor_name || row.patientName || "Details")}</h2></div><button type="button" class="thp-admin-modal-close" data-care-close aria-label="Close">×</button></header><div class="thp-admin-modal-form thp-care-detail-body"><dl class="thp-care-detail-grid">${entries.map(([key, value]) => `<div class="${wideFields.has(key) ? "is-wide" : ""}"><dt>${escape(key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))}</dt><dd>${escape(detailValue(value))}</dd></div>`).join("")}</dl>${history.length ? `<section class="thp-care-detail-history"><h3>Appointment timeline</h3><ol class="thp-care-timeline">${history.map((item) => `<li><strong>${escape(item.action)}</strong><span>${escape(item.actor)} · ${escape(detailValue(item.created_at))}</span>${item.details && Object.keys(item.details).length ? `<small>${escape(detailValue(item.details))}</small>` : ""}</li>`).join("")}</ol></section>` : ""}<footer class="thp-admin-modal-footer"><button class="thp-admin-primary-button" type="button" data-care-close>Close</button></footer></div></section></div>`;
    }
    return "";
  }

  function actions(row, buttons) {
    return `<div class="thp-care-row-actions">${buttons.map(([action, label, danger]) => `<button type="button" class="${danger ? "is-danger" : ""}" data-care-action="${action}" data-id="${escape(row.id)}">${label}</button>`).join("")}</div>`;
  }

  function renderTable() {
    const tab = state.tab;
    const columns = {
      doctors: ["Doctor name", "Specialty", "Hospital / clinic", "Visit type", "Consult fee", "Rating", "Status", "Actions"],
      specialties: ["Specialty title", "Description", "Active doctors", "Status", "Actions"],
      schedules: ["Doctor", "Weekday", "Hours", "Duration", "Status", "Actions"],
      leaves: ["Doctor", "Leave date", "Reason", "Actions"],
      appointments: ["Patient", "Doctor & specialty", "Scheduled slot", "Fee", "Status", "Actions"],
      "instant-consults": ["Patient", "Doctor", "Type", "Queue", "Status", "Actions"],
      reviews: ["Patient", "Doctor", "Rating", "Review", "Status", "Actions"],
      payouts: ["Doctor", "Period", "Visits", "Gross", "Commission", "Net payable", "Status", "Actions"],
      payments: ["Kind", "Patient", "Doctor", "Amount", "Status", "Created"],
      refunds: ["Patient", "Appointment", "Amount", "Status", "Created", "Actions"],
      "call-logs": ["Patient", "Doctor", "Consult type", "Duration", "Start", "End"],
    }[tab];
    if (!state.rows.length) {
      const empty = tab === "doctors" ? "No doctors found" : `No ${titles[tab][0].toLowerCase()} found`;
      return `<section class="thp-care-empty"><span class="thp-care-empty-icon" aria-hidden="true">+</span><h2>${empty}</h2><p>${tab === "doctors" ? "Add a doctor profile to start managing verification, schedules and appointments." : "Records will appear here when they are available."}</p>${tab === "doctors" && hasPermission("doctors", "create") ? '<button type="button" class="thp-admin-primary-button" data-care-open="doctor">Add Doctor</button>' : ""}</section>`;
    }
    const rowCells = (row) => {
      if (tab === "doctors") {
        const initials = (row.name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("");
        const avatar = row.photo
          ? `<img class="thp-care-doctor-avatar" src="${escape(row.photo)}" alt="" loading="lazy">`
          : `<span class="thp-care-doctor-avatar is-initials" aria-hidden="true">${escape(initials)}</span>`;
        return `<td><div class="thp-care-doctor-cell">${avatar}<span><strong>${escape(row.name)}</strong><small>${escape(row.degree)} · ${escape(row.qualifications || row.experience)}</small></span></div></td><td>${escape(row.specialty)}</td><td>${escape(row.hospital)}<small>${escape(row.city)}</small></td><td>${escape(row.consultation_type)}</td><td>₹${Number(row.fee || 0).toLocaleString("en-IN")}</td><td><span class="thp-care-rating">★ ${Number(row.rating || 0).toFixed(1)} <small>(${escape(row.reviews || 0)})</small></span></td><td><span class="thp-care-status is-${escape(row.verification_status)}">${escape(row.verification_status)}</span></td><td>${actions(row, [["view", "View"], ...(hasPermission("doctors", "edit") ? [["edit", "Edit"], ...(row.verification_status === "pending" ? [["verify", "Verify"], ["reject", "Reject"]] : []), ...(row.verification_status === "verified" ? [[row.available ? "offline" : "online", row.available ? "Go offline" : "Go online"]] : [])] : []), ...(hasPermission("doctors", "delete") ? [["delete", "Delete", true]] : [])])}</td>`;
      }
      if (tab === "specialties") {
        const activeDoctors = state.doctors.filter(
          (doctor) => doctor.specialty === row.name && doctor.verification_status === "verified",
        ).length;
        return `<td><strong>${escape(row.name)}</strong><small>${escape(row.icon)}</small></td><td>${escape(row.description)}</td><td><strong>${activeDoctors} assigned</strong></td><td><span class="thp-care-status ${row.is_active ? "is-approved" : "is-hidden"}">${row.is_active ? "Active" : "Inactive"}</span></td><td>${actions(row, [["view", "View"], ...(hasPermission("doctors", "edit") ? [["edit", "Edit"]] : []), ...(hasPermission("doctors", "delete") ? [["delete", "Delete", true]] : [])])}</td>`;
      }
      if (tab === "schedules") return `<td>${escape(state.doctors.find((doctor) => doctor.id === row.doctor_id)?.name || row.doctor_id)}</td><td>${escape(row.weekday_name || row.weekday)}</td><td>${escape(row.start_time)}–${escape(row.end_time)}</td><td>${escape(row.duration_minutes)} min</td><td>${row.is_working ? "Working" : "Off"}</td><td>${actions(row, [...(hasPermission("doctors", "edit") ? [["edit", "Edit"]] : []), ...(hasPermission("doctors", "delete") ? [["delete", "Delete", true]] : [])])}</td>`;
      if (tab === "leaves") return `<td><strong>${escape(state.doctors.find((doctor) => doctor.id === row.doctor_id)?.name || row.doctor_id)}</strong></td><td>${escape(row.date)}</td><td>${escape(row.reason)}</td><td>${actions(row, hasPermission("doctors", "delete") ? [["delete", "Remove", true]] : [])}</td>`;
      if (tab === "appointments") {
        const visitType = state.doctors.find((doctor) => doctor.id === row.doctor_id)?.consultation_type;
        const visitLabel = visitType === "Online" ? "Online visit" : visitType === "In-person" ? "In-person visit" : "Consultation";
        return `<td><strong>${escape(row.patient_name)}</strong><small>${visitLabel}</small></td><td><strong>${escape(row.doctor_name)}</strong><small>${escape(row.specialty)}</small></td><td><strong>${escape(row.date)}</strong><small>${escape(row.start_time)} – ${escape(row.end_time)}</small></td><td>₹${Number(row.fee || 0).toLocaleString("en-IN")}</td><td><span class="thp-care-status is-${escape(row.status)}">${escape(row.status)}</span><small class="thp-care-payment-status">${escape(row.payment_status)} payment</small></td><td>${actions(row, [["view", "View"], ...(hasPermission("doctors", "edit") ? [...(row.status === "booked" ? [["confirm", "Confirm"]] : []), ...(row.status === "confirmed" ? [["complete", "Complete"], ["no-show", "No-show"]] : []), ...(row.status === "booked" || row.status === "confirmed" ? [["reschedule", "Reschedule"], ["cancel", "Cancel", true]] : [])] : [])])}</td>`;
      }
      if (tab === "instant-consults") {
        const elapsed = row.status === "waiting" ? Math.max(0, Math.floor((Date.now() - Date.parse(row.created_at)) / 1000)) : 0;
        const waited = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
        return `<td><strong>${escape(row.patient_name)}</strong><small class="${elapsed >= 900 ? "thp-care-wait-alert" : ""}">${row.status === "waiting" ? `${waited}${elapsed >= 900 ? " · WAITING TOO LONG" : ""}` : "—"}</small></td><td>${escape(row.doctor_name || "Unassigned")}</td><td>${escape(row.consultation_type)}</td><td>${escape(row.queue_position)}</td><td><span class="thp-care-status is-${escape(row.status)}">${escape(row.status)}</span></td><td>${actions(row, [...(row.status === "waiting" ? [["assign", "Assign Doctor"]] : []), ...(row.status === "assigned" ? [["start", "Start"]] : []), ...(row.status === "in_progress" ? [["end", "End"]] : [])])}</td>`;
      }
      if (tab === "reviews") return `<td><strong>${escape(row.doctor_name || state.doctors.find((doctor) => doctor.id === row.doctorId)?.name || row.doctorId)}</strong></td><td>${escape(row.patientName)}</td><td><span class="thp-care-rating">★ ${escape(row.rating)} / 5</span></td><td class="thp-care-review-text">“${escape(row.comment)}”</td><td><span class="thp-care-status is-${escape(row.moderationStatus || "pending")}">${escape(row.moderationStatus || "pending")}</span></td><td>${actions(row, [...(row.moderationStatus !== "approved" ? [["approve", "Approve"]] : []), ...(row.moderationStatus !== "hidden" ? [["hide", "Hide"]] : []), ["delete", "Delete", true]])}</td>`;
      if (tab === "payouts") return `<td><strong>${escape(row.doctor_name)}</strong><small>${escape(row.period)}</small></td><td>${escape(row.consultation_count)} visits</td><td>₹${Number(row.gross_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td>${escape(row.commission_percent)}%</td><td><strong class="thp-care-net-payable">₹${Number(row.net_payable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td><td><span class="thp-care-status is-${escape(row.status)}">${escape(row.status)}</span></td><td>${row.status !== "paid" ? actions(row, [["pay", "Mark as paid"]]) : escape(row.paid_at || "Paid")}</td>`;
      if (tab === "payments") return `<td>${escape(row.kind)}</td><td>${escape(row.patient_id)}</td><td>${escape(row.doctor_id)}</td><td>₹${Number(row.amount || 0).toLocaleString("en-IN")}</td><td>${escape(row.status)}</td><td>${escape(row.created_at)}</td>`;
      if (tab === "refunds") return `<td>${escape(row.patient_id)}</td><td>${escape(row.appointment_id)}</td><td>₹${Number(row.amount || 0).toLocaleString("en-IN")}</td><td>${escape(row.status)}</td><td>${escape(row.created_at)}</td><td>${row.status === "pending" ? actions(row, [["approve", "Approve"], ["reject", "Reject", true]]) : "—"}</td>`;
      if (tab === "call-logs") return `<td>${escape(row.patient_name)}</td><td>${escape(row.doctor_name)}</td><td>${escape(row.consultation_type)}</td><td>${escape(row.duration_seconds)} sec</td><td>${escape(row.start_time)}</td><td>${escape(row.end_time)}</td>`;
      return `<td>${escape(row.patient_name)}</td><td>${escape(row.doctor_name)}</td><td>${escape(row.duration_seconds)} sec</td><td>${escape(row.start_time)}</td><td>${escape(row.end_time)}</td>`;
    };
    return `<div class="thp-admin-table-wrapper"><table class="thp-admin-table"><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${state.rows.map((row) => `<tr>${rowCells(row)}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderWeeklySlots() {
    const days = weekDates(state.date);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const doctor = state.doctors.find((item) => item.id === state.doctorId);
    return `<div class="thp-care-weekly-grid">${days.map((date) => {
      const weekday = new Date(`${date}T12:00:00`).getDay();
      const slots = state.rows.filter((slot) => slot.date === date);
    return `<section class="thp-care-day-column"><header><span>${dayNames[weekday]}</span><small>${escape(date)}</small></header>${slots.length ? slots.map((slot) => `<article class="thp-care-slot-card is-${escape(slot.status)}"><div class="thp-care-slot-meta"><span>${escape(slot.start_time)} – ${escape(slot.end_time)}</span><span class="thp-care-status is-${escape(slot.status)}">${slot.status === "booked" ? "Booked (locked)" : escape(slot.status)}</span></div>${slot.status === "booked" ? `<p class="thp-care-slot-patient">Booked by ${escape(slot.patient_name || "Patient")}</p><span class="thp-care-slot-locked">Locked by appointment</span>` : `<p class="thp-care-slot-patient">${escape(doctor?.name || "Doctor availability")}</p>${actions(slot, [...(hasPermission("doctors", "edit") ? [[slot.status === "available" ? "block" : "unblock", slot.status === "available" ? "Block slot" : "Make available"], ["edit", "Edit"]] : []), ...(hasPermission("doctors", "delete") ? [["delete", "Delete", true]] : [])])}`}</article>`).join("") : '<p class="thp-care-day-empty">No slots scheduled</p>'}</section>`;
    }).join("")}</div>`;
  }

  function renderInstantQueue() {
    const waiting = state.rows.filter((row) => row.status === "waiting").length;
    const activeDoctors = state.doctors.filter(
      (doctor) => doctor.available && doctor.verification_status === "verified",
    ).length;
    const activeCalls = state.rows.filter((row) => row.status === "in_progress").length;
    return `<div class="thp-care-queue-summary"><article><span>Waiting patients</span><strong>${waiting}</strong></article><article><span>Online physicians</span><strong>${activeDoctors} active</strong></article><article><span>Active consultations</span><strong>${activeCalls}</strong></article></div><div class="thp-care-queue-list">${state.rows.map((row) => {
      const elapsed = row.status === "waiting" ? Math.max(0, Math.floor((Date.now() - Date.parse(row.created_at)) / 1000)) : 0;
      const isLate = elapsed >= 900;
      const waited = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
      const nextAction = row.status === "waiting"
        ? ["assign", "Assign doctor"]
        : row.status === "assigned"
          ? ["start", "Start consultation"]
          : row.status === "in_progress"
            ? ["end", "End & save call log"]
            : null;
      return `<article class="thp-care-queue-card ${isLate ? "is-escalated" : ""}"><span class="thp-care-queue-icon" aria-hidden="true">+</span><div class="thp-care-queue-main"><strong>${escape(row.patient_name)}</strong>${isLate ? '<span class="thp-care-alert-label">Alert: 15+ min</span>' : ""}<small>Doctor: ${escape(row.doctor_name || "Unassigned")} · ${escape(row.consultation_type)}${row.status === "waiting" ? ` · Wait time: ${waited}` : ""}</small></div><span class="thp-care-status is-${escape(row.status)}">${escape(row.status.replace(/_/g, " "))}</span>${nextAction ? actions(row, [nextAction]) : ""}</article>`;
    }).join("")}</div>`;
  }

  function renderSubtabs() {
    const groups = {
      slots: [["slots", "Availability"], ["schedules", "Weekly schedule"], ["leaves", "Leave dates"]],
      "instant-consults": [["instant-consults", "Live queue"], ["call-logs", "Call logs"]],
      payouts: [["payouts", "Payouts"], ["payments", "Transactions"], ["refunds", "Refund requests"]],
    };
    const items = groups[tabParent(state.tab)];
    if (!items) return "";
    return `<nav class="thp-care-subtabs" aria-label="${escape(titles[tabParent(state.tab)][0])} views">${items.map(([key, label]) => `<button type="button" data-care-subtab="${key}" class="${state.tab === key ? "is-active" : ""}" aria-current="${state.tab === key ? "page" : "false"}">${label}</button>`).join("")}</nav>`;
  }

  function render() {
    const target = workspace();
    if (!target) return;
    const [heading, subtitle, addLabel] = titles[state.tab] || titles[tabParent(state.tab)];
    const canCreate = hasPermission("doctors", "create");
    const addKind = {
      doctors: "doctor",
      specialties: "specialty",
      schedules: "schedule",
      slots: "slot",
      appointments: "appointment",
      "instant-consults": "instant-consult",
    }[state.tab];
    const canEdit = hasPermission("doctors", "edit");
    const canAddCurrent = state.tab === "schedules" ? canEdit : state.tab === "payouts" ? canEdit : canCreate;
    const parentTab = tabParent(state.tab);
    const showStatusFilter = ["doctors", "reviews", "appointments", "instant-consults", "specialties"].includes(state.tab);
    const filterValues = state.tab === "doctors"
      ? ["pending", "verified", "rejected", "suspended"]
      : state.tab === "reviews"
        ? ["pending", "approved", "hidden"]
        : state.tab === "appointments"
          ? ["booked", "confirmed", "completed", "cancelled", "no-show"]
          : state.tab === "instant-consults"
            ? ["waiting", "assigned", "in_progress", "completed"]
            : ["true", "false"];
    const filterLabel = state.tab === "specialties" ? "All activity" : "All statuses";
    const sectionContent = state.tab === "slots"
      ? renderWeeklySlots()
      : state.tab === "instant-consults"
        ? renderInstantQueue()
        : renderTable();
    const nav = `<nav class="thp-care-tabs" aria-label="Doctors and appointments sections">${TABS.map(([key, label]) => {
      const count = state.tabCounts[key];
      const countText = count?.status === "ready" ? String(count.value) : count?.status === "error" ? "!" : "…";
      const countTitle = count?.status === "error" ? `Unable to load ${label.toLowerCase()} count. Use Refresh to retry.` : `${count?.status === "ready" ? count.value : "Loading"} ${label.toLowerCase()}`;
      return `<button type="button" data-care-tab="${key}" class="${parentTab === key ? "is-active" : ""}" aria-current="${parentTab === key ? "page" : "false"}"><span>${label}</span><small title="${escape(countTitle)}" aria-label="${escape(countTitle)}">${escape(countText)}</small></button>`;
    }).join("")}</nav>`;
    target.innerHTML = `${nav}<section class="thp-care-panel"><header class="thp-care-panel-heading"><div><h2>${escape(heading)}</h2><p>${escape(subtitle)}</p></div><div class="thp-care-heading-actions">${addLabel && canAddCurrent ? `<button type="button" class="thp-admin-primary-button" data-care-open="${state.tab === "payouts" ? "commission" : addKind}">${escape(addLabel)}</button>` : ""}${["schedules", "leaves"].includes(state.tab) && canCreate ? `<button type="button" class="thp-admin-secondary-button" data-care-open="leave">${state.tab === "leaves" ? "Add Leave" : "Add Leave Date"}</button>` : ""}<button type="button" class="thp-admin-secondary-button" data-care-refresh>Refresh</button></div></header>
      ${renderSubtabs()}
      <div class="thp-care-toolbar">${!["slots", "instant-consults"].includes(state.tab) || state.tab === "instant-consults" ? `<label class="thp-admin-search-box"><input type="search" data-care-search placeholder="${state.tab === "appointments" ? "Search by patient, doctor, or specialty..." : `Search ${escape(heading.toLowerCase())}...`}" value="${escapeHtml(state.search)}"></label>` : '<span class="thp-care-toolbar-hint">Select a doctor and week to review booked, available, and blocked slots.</span>'}${showStatusFilter ? `<label class="thp-admin-filter-box"><select data-care-filter><option value="">${filterLabel}</option>${filterValues.map((item) => `<option value="${item}" ${state.filter === item ? "selected" : ""}>${state.tab === "specialties" ? item === "true" ? "Active" : "Inactive" : item.replace(/_/g, " ")}</option>`).join("")}</select></label>` : ""}${["slots", "payouts"].includes(state.tab) ? `<label class="thp-admin-filter-box"><input type="${state.tab === "slots" ? "date" : "month"}" data-care-date value="${escape(state.tab === "slots" ? state.date : state.date.slice(0, 7))}"></label>` : ""}${state.tab === "slots" ? `<label class="thp-admin-filter-box"><select data-care-doctor aria-label="Select doctor">${state.doctors.map((doc) => `<option value="${escape(doc.id)}" ${state.doctorId === doc.id ? "selected" : ""}>${escape(doc.name)}${doc.specialty ? ` (${escape(doc.specialty)})` : ""}</option>`).join("")}</select></label>` : ""}<button type="button" class="thp-admin-secondary-button" data-care-clear>Clear filters</button></div>
      ${state.error ? `<div class="thp-care-error" role="alert">${escape(state.error)} <button type="button" data-care-retry>Retry</button></div>` : ""}
      ${state.loading ? '<div class="thp-care-loading" role="status">Loading…</div>' : sectionContent}
      </section>${renderModal()}`;
  }

  async function submit(form) {
    const type = form.id.replace("care-", "").replace("-form", "");
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    if (type === "doctor" || type === "specialty") {
      const active = state.modal.mode === "edit";
      if (type === "doctor") {
        body.fee = Number(body.fee);
        body.available = body.available === "true";
      } else {
        body.is_active = body.is_active === "true";
      }
      const result = active
        ? await updateCareRecord(type === "doctor" ? "doctors" : "specialties", state.modal.row.id, body)
        : await createCareRecord(type === "doctor" ? "doctors" : "specialties", body);
      return result;
    }
    if (type === "slot") {
      body.weekday = Number(body.weekday);
      body.duration_minutes = Number(body.duration_minutes);
      return state.modal.mode === "edit"
        ? updateCareRecord("slots", state.modal.row.id, body)
        : createCareRecord("slots", body);
    }
    if (type === "appointment") {
      const selectedSlot = state.availableSlots.find(
        (slot) => String(slot.id) === String(body.slot_id),
      );
      if (!selectedSlot || selectedSlot.status !== "available") {
        throw new Error("Choose an available slot before booking.");
      }
      return createCareRecord("appointments", body);
    }
    if (type === "instant-consult") return createCareRecord("instant-consults", body);
    if (type === "commission") {
      const result = await createCareRecord("settings", {
        commission_percent: Number(body.commission_percent),
      });
      state.commissionPercent = result.commission_percent;
      return result;
    }
    if (type === "schedule") {
      body.weekday = Number(body.weekday);
      body.duration_minutes = Number(body.duration_minutes);
      body.is_working = body.is_working === "true";
      return createCareRecord("schedules", body);
    }
    return createCareRecord("leaves", body);
  }

  app.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.matches("[data-care-tab]")) {
      state.tab = button.dataset.careTab;
      state.search = "";
      state.filter = "";
      await load();
    } else if (button.matches("[data-care-subtab]")) {
      state.tab = button.dataset.careSubtab;
      state.search = "";
      state.filter = "";
      await load();
    } else if (button.matches("[data-care-open]")) {
      const kind = button.dataset.careOpen;
      state.modal = { kind, mode: "create", row: {} };
      if (kind === "commission") state.modal = { kind };
      if (kind === "appointment") {
        const doctor = state.doctors.find((item) => item.verification_status === "verified" && item.available);
        state.modal.doctorId = doctor?.id || "";
        state.modal.date = state.date;
        await refreshAppointmentSlots();
        if (state.modal?.kind !== "appointment") return;
      }
      render();
    } else if (button.matches("[data-care-close]")) {
      state.modal = null;
      render();
    } else if (button.matches("[data-care-refresh], [data-care-retry]")) {
      await Promise.all([load(), loadTabCounts()]);
    } else if (button.matches("[data-care-clear]")) {
      state.search = "";
      state.filter = "";
      await load();
    } else if (button.matches("[data-care-action]")) {
      const action = button.dataset.careAction;
      const id = button.dataset.id;
      const row = state.rows.find((item) => item.id === id);
      try {
        if (action === "edit") {
          state.modal = { kind: state.tab === "doctors" ? "doctor" : state.tab === "slots" ? "slot" : state.tab === "schedules" ? "schedule" : "specialty", mode: "edit", row, doctorId: row.doctor_id };
          render();
          return;
        }
        if (action === "view") {
          const resource = state.tab;
          const response = await getCareRecord(resource, id);
          const key = resource.replace("-", "_").replace(/s$/, "");
          state.modal = { kind: "details", row: response?.[key] || response?.doctor || response?.appointment || response?.consult || response?.review || response };
          render();
          return;
        }
        if (["delete", "assign", "complete", "reject", "reschedule"].includes(action)) {
          if (action === "assign" && !state.doctors.some((doctor) => doctor.verification_status === "verified")) {
            throw new Error("There are no verified doctors available to assign.");
          }
          if (action === "reschedule") {
            state.date = row.date;
            const slotResponse = await getCareCollection("slots", {
              doctor_id: row.doctor_id,
              date: row.date,
            });
            state.availableSlots = (slotResponse.results || []).filter((slot) => slot.status === "available");
          }
          state.modal = { kind: "action", action, row };
          render();
          return;
        }
        if (action === "block" || action === "unblock") await updateCareRecord("slots", id, { status: action === "block" ? "blocked" : "available" });
        else await runCareAction(state.tab, id, action);
        toast(`${action.replace(/-/g, " ")} completed.`);
        await load();
        await loadTabCounts();
      } catch (error) {
        toast(error.message || "The requested action failed.", true);
      }
    }
  }, { signal: controller.signal });

  app.addEventListener("input", (event) => {
    if (event.target.matches("[data-care-search]")) {
      state.search = event.target.value;
      clearTimeout(render.searchTimer);
      render.searchTimer = setTimeout(() => load(state.tab, true), 250);
    } else if (event.target.matches("[data-care-slot-doctor-search]")) {
      const search = event.target.value.trim().toLowerCase();
      const select = app.querySelector('#care-slot-form select[name="doctor_id"]');
      if (!select) return;
      const selected = select.value;
      select.innerHTML = state.doctors
        .filter((doctor) => `${doctor.name} ${doctor.specialty || ""}`.toLowerCase().includes(search))
        .map((doctor) => `<option value="${escape(doctor.id)}" ${doctor.id === selected ? "selected" : ""}>${escape(doctor.name)}${doctor.specialty ? ` · ${escape(doctor.specialty)}` : ""}</option>`)
        .join("");
    }
  }, { signal: controller.signal });
  app.addEventListener("change", (event) => {
    if (event.target.matches("[data-care-filter]")) {
      state.filter = event.target.value;
      load();
    } else if (event.target.matches("[data-care-date]")) {
      state.date = event.target.value;
      load();
    } else if (event.target.matches("[data-care-doctor]")) {
      state.doctorId = event.target.value;
      load();
    } else if (event.target.matches("[data-care-slot-date]")) {
      const weekday = app.querySelector("[data-care-slot-weekday]");
      if (weekday && event.target.value) {
        weekday.value = String((new Date(`${event.target.value}T12:00:00`).getDay() + 6) % 7);
      }
    } else if (event.target.matches("[data-care-schedule-working]")) {
      const working = event.target.value === "true";
      app.querySelectorAll('#care-schedule-form input[name="start_time"], #care-schedule-form input[name="end_time"]')
        .forEach((input) => { input.required = working; });
    } else if (event.target.matches("[data-care-reschedule-date]")) {
      const appointment = state.modal?.row;
      if (!appointment) return;
      state.date = event.target.value;
      getCareCollection("slots", { doctor_id: appointment.doctor_id, date: state.date })
        .then((response) => {
          state.availableSlots = (response.results || []).filter((slot) => slot.status === "available");
          render();
        })
        .catch((error) => toast(error.message || "Unable to load appointment slots.", true));
    } else if (event.target.matches('#care-appointment-form select[name="slot_id"]')) {
      state.selectedSlotId = event.target.value;
    } else if (event.target.matches("[data-care-appointment-date], [data-care-appointment-doctor]")) {
      const dateInput = app.querySelector("[data-care-appointment-date]");
      const doctorInput = app.querySelector("[data-care-appointment-doctor]");
      if (!dateInput || !doctorInput || state.modal?.kind !== "appointment") return;
      state.modal.date = dateInput.value;
      state.modal.doctorId = doctorInput.value;
      refreshAppointmentSlots();
    }
  }, { signal: controller.signal });
  app.addEventListener("submit", async (event) => {
    const form = event.target.closest("#care-doctor-form, #care-specialty-form, #care-schedule-form, #care-slot-form, #care-leave-form, #care-appointment-form, #care-instant-consult-form, #care-commission-form, #care-action-form");
    if (!form) return;
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]');
    const errorNode = form.querySelector(".thp-care-inline-error");
    submitButton.disabled = true;
    errorNode.textContent = "";
    try {
      if (form.id === "care-action-form") {
        const action = state.modal.action;
        const data = Object.fromEntries(new FormData(form).entries());
        const row = state.modal.row;
        if (action === "delete") {
          await deleteCareRecord(state.tab, row.id);
        } else if (action === "complete") {
            data.medicines = (data.medicines || "")
              .split(/\r?\n/)
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name) => ({ name }));
            if (!data.diagnosis.trim() && !data.prescription_notes.trim() && !data.medicines.length) {
              throw new Error("Enter a diagnosis or prescription notes.");
            }
          await runCareAction(state.tab, row.id, action, data);
        } else {
          await runCareAction(state.tab, row.id, action, data);
        }
        state.modal = null;
        toast(`${action.replace(/-/g, " ")} completed.`);
        await load();
        await loadTabCounts();
        return;
      }
      const savedRecord = await submit(form);
      if (state.modal.kind === "slot" && savedRecord?.slot) {
        state.date = savedRecord.slot.date;
        state.doctorId = savedRecord.slot.doctor_id;
      }
      const message = `${state.modal.kind === "doctor" ? "Doctor" : state.modal.kind === "specialty" ? "Specialty" : state.modal.kind === "schedule" ? "Schedule" : state.modal.kind === "appointment" ? "Appointment" : state.modal.kind === "instant-consult" ? "Patient" : state.modal.kind === "commission" ? "Commission" : "Leave"} saved successfully.`;
      const savedMessage = state.modal.kind === "slot" ? "Slot saved successfully." : message;
      state.modal = null;
      toast(savedMessage);
      await load();
      await loadTabCounts();
    } catch (error) {
      errorNode.textContent = error.message || "Unable to save this record.";
      if (form.id === "care-slot-form") {
        toast(error.message || "Unable to save this slot.", true);
      }
      submitButton.disabled = false;
    }
  }, { signal: controller.signal });

  render();
  try {
    const [doctorData, specialtyData, patientData, settingsData] = await Promise.all([
      getCareCollection("doctors", { page_size: 250 }),
      getCareCollection("specialties"),
      getCareCollection("patients"),
      getCareCollection("settings"),
    ]);
    state.doctors = doctorData.results || [];
    state.doctorId = state.doctors.find((doctor) => doctor.verification_status === "verified")?.id
      || state.doctors[0]?.id
      || "";
    state.specialties = specialtyData.results || [];
    state.patients = patientData.results || [];
    state.commissionPercent = settingsData.commission_percent ?? state.commissionPercent;
  } catch {
    // load() below reports the actionable API error in the page.
  }
  await loadTabCounts();
  render();
  await load();
  app._adminCareRefreshTimer = setInterval(() => {
    if (state.tab === "instant-consults" && !state.modal) load("instant-consults");
  }, 15000);
}
