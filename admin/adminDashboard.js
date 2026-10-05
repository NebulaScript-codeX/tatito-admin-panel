import "./adminDashboard.css";
import { formatINR } from "../currency.js";
import {
  getAdminToken,
  hasPermission,
  isAdminAuthenticated,
  logoutAdmin,
  refreshAdminAccessToken,
  refreshAdminSession,
} from "./adminAuth.js";
import {
  renderAdminLayout,
  isModuleAvailable,
  openModule,
} from "./adminLayout.js";
import {
  disposeCharts,
  escapeHtml,
  formatCount,
  mountLineChart,
  renderBars,
  renderDonut,
  renderEmpty,
  renderRevenueByModuleChart,
} from "./adminChart.js";
import { adminApi } from "./adminApi.js";

const DASHBOARD_API = "http://127.0.0.1:8000/api/dashboard/overview/";

const PERIODS = [
  { value: "today", label: "Today", long: "today" },
  { value: "7", label: "7 days", long: "the last 7 days" },
  { value: "30", label: "30 days", long: "the last 30 days" },
];

const state = { period: "7", requestId: 0, refreshTimer: null };

/* =========================================================
   DATA
========================================================= */

class DashboardRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchDashboard(period) {
  const token = getAdminToken();

  if (!token) {
    throw new DashboardRequestError(
      "Admin session expired. Please sign in again.",
      401,
    );
  }

  let response;

  try {
    response = await fetch(
      `${DASHBOARD_API}?period=${encodeURIComponent(period)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (response.status === 401 && await refreshAdminAccessToken()) {
      response = await fetch(
        `${DASHBOARD_API}?period=${encodeURIComponent(period)}`,
        {
          headers: { Authorization: 'Bearer ' + getAdminToken() },
        },
      );
    }
  } catch {
    throw new DashboardRequestError(
      "Cannot reach the admin server. Check that the Django backend is running.",
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new DashboardRequestError(
      response.status === 403
        ? "Your role does not have permission to view the dashboard."
        : data.message ||
            data.detail ||
            data.error ||
            "Unable to load dashboard data.",
      response.status,
    );
  }

  return data;
}

/* =========================================================
   HELPERS
========================================================= */

const isNil = (value) => value === null || value === undefined;

const metric = (value) => (isNil(value) ? "—" : formatCount(value));

function periodInfo(period) {
  return PERIODS.find((item) => item.value === period) || PERIODS[1];
}

function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function fullDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function titleCase(value) {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function initial(value) {
  return escapeHtml(
    String(value || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?",
  );
}

const ICONS = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  doctor:
    '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
  userPlus:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  refresh:
    '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
};

function icon(name, size = 18) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* =========================================================
   SECTIONS
========================================================= */

function panel({ title, subtitle = "", extra = "", body, className = "" }) {
  return `
    <section class="dash-panel ${className}">
      <header class="dash-panel-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        ${extra}
      </header>
      <div class="dash-panel-body">${body}</div>
    </section>
  `;
}

function kpiCard({
  label,
  value,
  support,
  icon: iconName,
  tone = "neutral",
  page,
}) {
  const linked = page && isModuleAvailable(page) && hasPermission(page, "view");
  const tag = linked ? "button" : "article";
  const attrs = linked
    ? `type="button" data-admin-page="${escapeHtml(page)}"`
    : "";

  return `
    <${tag} class="dash-kpi tone-${tone} ${linked ? "is-link" : ""}" ${attrs}>
      <span class="dash-kpi-icon">${icon(iconName)}</span>
      <span class="dash-kpi-body">
        <span class="dash-kpi-label">${escapeHtml(label)}</span>
        <strong class="dash-kpi-value">${value}</strong>
        <span class="dash-kpi-support">${escapeHtml(support)}</span>
      </span>
    </${tag}>
  `;
}

function renderKpis(data, period) {
  const overview = data.platform_overview || {};
  const live = data.live_stats || {};
  const attention = data.needs_attention || {};
  const roles = data.distributions?.users_by_role || [];
  const info = periodInfo(period);

  const roleCount = (role) => roles.find((item) => item.role === role)?.count;
  const patients = roleCount("patient");
  const doctorUsers = roleCount("doctor");

  const totalDoctors = overview.care_total_doctors ?? overview.total_doctors;
  const pending = attention.doctor_verifications;
  const verified =
    !isNil(overview.care_verified_doctors)
      ? overview.care_verified_doctors
      : !isNil(totalDoctors) && !isNil(pending)
        ? Math.max(totalDoctors - pending, 0)
        : null;

  return [
    kpiCard({
      label: "Total Users",
      value: metric(overview.total_users),
      support:
        !isNil(patients) || !isNil(doctorUsers)
          ? `${formatCount(patients || 0)} patients · ${formatCount(doctorUsers || 0)} doctors`
          : "Registered accounts",
      icon: "users",
      page: "users",
    }),
    kpiCard({
      label: "Total Doctors",
      value: metric(totalDoctors),
      support: isNil(verified)
        ? "Doctor profiles"
        : `${formatCount(verified)} verified`,
      icon: "doctor",
      page: "doctors",
    }),
    kpiCard({
      label: "New Patients",
      value: metric(live.new_patients),
      support: `Registered ${info.long}`,
      icon: "userPlus",
      tone: "accent",
      page: "users",
    }),
    kpiCard({
      label: "Doctor Verifications",
      value: metric(pending),
      support: isNil(pending)
        ? "Unavailable"
        : pending > 0
          ? "Awaiting review"
          : "All doctors verified",
      icon: "shield",
      tone: !isNil(pending) && pending > 0 ? "warn" : "ok",
      page: "doctors",
    }),
  ].join("");
}

function renderTrendPanel(data, period) {
  const trend = data.charts?.user_registration_trend || [];
  const total = trend.reduce(
    (sum, point) => sum + (Number(point.count) || 0),
    0,
  );
  const info = periodInfo(period);

  const body = total
    ? '<div class="dash-chart" id="dash-trend-chart"></div>'
    : renderEmpty("No new registrations", `Nobody registered ${info.long}.`);

  return panel({
    title: "User registrations",
    subtitle: total
      ? `${formatCount(total)} new ${total === 1 ? "account" : "accounts"} in ${info.long}`
      : `Accounts created in ${info.long}`,
    body,
    className: "is-chart",
  });
}

function renderRevenueByModulePanel(data, period) {
  const info = periodInfo(period);
  const restricted = (data.meta?.restricted || []).includes("orders_payments");
  const revenue = data.charts?.revenue_by_module;
  const rows = Array.isArray(revenue)
    ? revenue.map((item) => ({
        module: String(item.module || ""),
        amount: Number(item.amount) || 0,
      }))
    : [];
  const netCollected = rows.reduce((sum, item) => sum + item.amount, 0);
  const contributors = rows.filter((item) => item.amount > 0).length;
  const leader = rows.reduce(
    (best, item) => item.amount > (best?.amount || 0) ? item : best,
    null,
  );
  const currency = formatINR;
  const summary = !restricted && Array.isArray(revenue)
    ? `<div class="dash-revenue-summary" aria-label="Revenue summary">
        <div class="dash-revenue-total"><span>Net collected</span><strong>${currency(netCollected)}</strong><small>${info.long}</small></div>
        <div class="dash-revenue-highlight"><span class="dash-revenue-highlight-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></span><span><small>Top module</small><strong>${leader && leader.amount > 0 ? escapeHtml(titleCase(leader.module)) : "No revenue yet"}</strong></span></div>
        <div class="dash-revenue-contributors"><span class="dash-revenue-live-dot"></span><span><strong>${formatCount(contributors)}</strong><small>revenue-generating modules</small></span></div>
      </div>`
    : "";
  const chart = restricted
    ? renderEmpty("Revenue data is restricted", "Your role does not have access to payment and revenue records.")
    : !Array.isArray(revenue)
      ? renderEmpty("Revenue data unavailable", "Revenue reporting could not be loaded.")
      : renderRevenueByModuleChart(revenue) || renderEmpty("No revenue modules available");
  const body = `${summary}${chart}`;

  return panel({
    title: "Revenue by Healthcare Module",
    subtitle: `Payment performance across healthcare modules · ${info.long}`,
    body,
    className: "is-chart is-wide dash-revenue-panel",
  });
}

function renderRolePanel(data) {
  const roles = (data.distributions?.users_by_role || []).map((item) => ({
    label: titleCase(item.role),
    value: item.count,
  }));

  const donut = renderDonut(roles, {
    centerLabel: "Users",
    ariaLabel: "Users by role",
  });

  return panel({
    title: "Users by role",
    subtitle: "All registered accounts",
    body: donut || renderEmpty("No users yet"),
  });
}

function renderSpecialtyPanel(data) {
  const rows = (data.distributions?.doctors_by_specialty || []).map((item) => ({
    label: item.specialty,
    value: item.count,
  }));

  return panel({
    title: "Doctors by specialty",
    subtitle: rows.length
      ? "Top specialties on the platform"
      : "Doctor profiles per specialty",
    body: renderBars(rows) || renderEmpty("No doctors yet"),
    className: "dash-specialty-panel",
  });
}

/* ---- Needs attention ------------------------------------ */

const ATTENTION_ITEMS = [
  {
    key: "doctor_verifications",
    label: "Doctor Verifications",
    page: "doctors",
    icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="m17 8 2 2 4-4"/>',
    tone: "amber",
  },
  {
    key: "provider_approvals",
    label: "Provider Approvals",
    page: "providers",
    icon: '<path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/>',
    tone: "green",
  },
  {
    key: "document_verifications",
    label: "Document Verifications",
    page: "providers",
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',
    tone: "blue",
  },
  {
    key: "prescription_reviews",
    label: "Prescription Reviews",
    page: "pharmacy",
    section: "prescriptions",
    linkWhenDisconnected: true,
    icon: '<path d="M8 3h8a2 2 0 0 1 2 2v16H6V5a2 2 0 0 1 2-2Z"/><path d="M9 3.5h6M9 12h6m-6 4h4"/><path d="m15 18 1.5 1.5L20 16"/>',
    tone: "green",
  },
  {
    key: "refund_requests",
    label: "Refund Requests",
    page: "doctors",
    section: "refunds",
    icon: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
    tone: "rose",
  },
  {
    key: "pending_reviews",
    label: "Doctor Reviews",
    page: "doctors",
    icon: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    tone: "violet",
  },
  {
    key: "unassigned_instant_consults",
    label: "Unassigned Instant Consults",
    page: "doctors",
    icon: '<path d="M20 7h-9m9 5h-9m9 5h-9"/><circle cx="5" cy="7" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="5" cy="17" r="2"/>',
    tone: "blue",
  },
  {
    key: "patients_waiting_over_15_minutes",
    label: "CARE Patients Waiting 15+ Minutes",
    page: "doctors",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tone: "amber",
  },
  {
    key: "pending_payouts",
    label: "Pending Doctor Payouts",
    page: "doctors",
    icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 6V4h10v2m-5 4v7m-3-3 3 3 3-3"/>',
    tone: "green",
  },
  {
    key: "internship_applications",
    label: "Internship Applications",
    page: "internships",
    icon: '<path d="M3 7h18v13H3z"/><path d="M8 7V4h8v3m-13 5h18m-11 0v2h4v-2"/>',
    tone: "teal",
  },
  {
    key: "low_stock_products",
    label: "Low Stock Pharmacy Items",
    page: "pharmacy",
    icon: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5m-18 5 9 5 9-5"/><path d="M12 7v2"/>',
    tone: "amber",
  },
  {
    key: "unassigned_sample_bookings",
    label: "Unassigned Lab Samples",
    page: "lab_tests",
    icon: '<path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
    tone: "violet",
  },
  {
    key: "open_support_tickets",
    label: "Open Support Tickets",
    page: "support",
    icon: '<path d="M4 4h16v13H8l-4 4V4Z"/><path d="M8 9h8m-8 4h5"/>',
    tone: "blue",
  },
];

function renderAttentionPanel(data) {
  const values = data.needs_attention || {};
  const openItems = ATTENTION_ITEMS.filter((item) => {
    const value = values[item.key];
    return !isNil(value) && Number(value) > 0;
  });

  const rows = openItems.map((item) => {
    const raw = values[item.key];
    const count = Number(raw);
    const linked = isModuleAvailable(item.page) && hasPermission(item.page, "view");
    const tag = linked ? "button" : "div";
    const attrs = linked
      ? `type="button" data-admin-page="${escapeHtml(item.page)}"${item.section ? ` data-admin-section="${escapeHtml(item.section)}"` : ""}`
      : "";
    const support = linked ? "Click to resolve" : "Requires access";
    const arrow = linked ? '<span class="dash-attention-arrow" aria-hidden="true">→</span>' : "";

    return `
      <li>
        <${tag} class="dash-attention-row ${linked ? "is-link" : "is-muted"} tone-${item.tone}" ${attrs}>
          <span class="dash-attention-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${item.icon}</svg></span>
          <span class="dash-attention-copy">
            <strong class="dash-attention-label">${escapeHtml(item.label)}</strong>
            <span class="dash-attention-support">${support}</span>
          </span>
          <strong class="dash-count is-warn">${formatCount(count)}</strong>
          ${arrow}
        </${tag}>
      </li>`;
  }).join("");

  return panel({
    title: "Needs Immediate Attention",
    extra: '<span class="dash-attention-live">Live operational flags</span>',
    className: "is-wide dash-attention-panel",
    body: rows
      ? `<ul class="dash-attention">${rows}</ul>`
      : renderEmpty("Nothing needs attention", "All connected operational queues are clear."),
  });
}

function renderCareOperations(data) {
  const care = data.care;
  if (!care) {
    return panel({
      title: "CARE operations",
      subtitle: "Doctors & Appointments",
      body: renderEmpty("CARE data is restricted", "Your role does not have access to CARE operations."),
    });
  }
  const appointments = care.appointment_statuses || {};
  const metrics = [
    ["Doctors", `${formatCount(care.total_doctors)} total · ${formatCount(care.verified_doctors)} verified · ${formatCount(care.pending_doctors)} pending · ${formatCount(care.active_specialties)} active specialties`],
    ["Availability", `${formatCount(care.online_doctors)} online · ${formatCount(care.offline_doctors)} offline`],
    ["Appointments", `${formatCount(care.today_appointments)} today · ${formatCount(appointments.booked)} booked · ${formatCount(appointments.confirmed)} confirmed`],
    ["Outcomes", `${formatCount(appointments.completed)} completed · ${formatCount(appointments.cancelled)} cancelled · ${formatCount(appointments["no-show"])} no-show`],
    ["Instant Consult", `${formatCount(care.unassigned_consults)} waiting · ${formatCount(care.waiting_over_15_minutes)} waiting 15+ min`],
    ["Needs review", `${formatCount(care.pending_reviews)} reviews · ${formatCount(care.pending_payouts)} payouts · ${formatCount(care.pending_refunds)} refunds`],
  ];
  return panel({
    title: "CARE operations",
    subtitle: "Live SQL data · Doctors & Appointments",
    className: "is-wide dash-care-operations",
    body: `<ul class="dash-modules">${metrics.map(([label, value]) => `<li class="is-live"><span class="dash-status is-ok"></span><span class="dash-module-main"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></span></li>`).join("")}</ul>`,
  });
}

/* ---- Recent activity ------------------------------------ */

function renderRecentUsers(data) {
  const restricted = (data.meta?.restricted || []).includes(
    "recent_activity.users",
  );
  const users = data.recent_activity?.users || [];

  let body;
  if (restricted) {
    body = renderEmpty("Restricted", "Your role cannot view the Users module.");
  } else if (!users.length) {
    body = renderEmpty("No registrations yet");
  } else {
    body = `
      <ul class="dash-list">
        ${users
          .slice(0, 5)
          .map(
            (user) => `
              <li>
                <span class="dash-avatar">${initial(user.name)}</span>
                <span class="dash-list-main">
                  <strong>${escapeHtml(user.name || "Unnamed user")}</strong>
                  <span>${escapeHtml(user.email || "")}</span>
                </span>
                <span class="dash-list-meta">
                  <span class="dash-chip">${escapeHtml(titleCase(user.role))}</span>
                  <time title="${escapeHtml(fullDate(user.created_at))}">${escapeHtml(timeAgo(user.created_at))}</time>
                </span>
              </li>`,
          )
          .join("")}
      </ul>`;
  }

  return panel({
    title: "Recent registrations",
    subtitle: "Newest accounts on the platform",
    body,
  });
}

function renderRecentAdminActivity(data) {
  const restricted = (data.meta?.restricted || []).includes(
    "recent_activity.admin_activity",
  );
  const items = data.recent_activity?.admin_activity || [];

  let body;
  if (restricted) {
    body = renderEmpty(
      "Restricted",
      "Your role cannot view the Audit Logs module.",
    );
  } else if (!items.length) {
    body = renderEmpty("No admin activity recorded yet");
  } else {
    body = `
      <ul class="dash-list">
        ${items
          .slice(0, 5)
          .map(
            (entry) => `
              <li>
                <span class="dash-avatar">${initial(entry.actor)}</span>
                <span class="dash-list-main">
                  <strong>${escapeHtml(entry.description || titleCase(entry.action))}</strong>
                  <span>${escapeHtml(entry.actor)}${entry.role ? ` · ${escapeHtml(entry.role)}` : ""}</span>
                </span>
                <span class="dash-list-meta">
                  <span class="dash-chip">${escapeHtml(titleCase(entry.action))}</span>
                  <time title="${escapeHtml(fullDate(entry.created_at))}">${escapeHtml(timeAgo(entry.created_at))}</time>
                </span>
              </li>`,
          )
          .join("")}
      </ul>`;
  }

  const viewAll =
    isModuleAvailable("audit_logs") && hasPermission("audit_logs", "view")
      ? '<button type="button" class="dash-link" data-admin-page="audit_logs">View all</button>'
      : "";

  return panel({
    title: "Recent admin activity",
    subtitle: "Latest actions from the audit log",
    extra: viewAll,
    body,
  });
}

function activityViewAll(kind, page) {
  return isModuleAvailable(page) && hasPermission(page, "view")
    ? `<button type="button" class="dash-link" data-dashboard-activity="${kind}" aria-haspopup="dialog">View all</button>`
    : "";
}

function activityStatusTone(status) {
  const tones = {
    booked: "neutral",
    confirmed: "green",
    completed: "green",
    cancelled: "red",
    "no-show": "amber",
    placed: "amber",
    packed: "teal",
    dispatched: "teal",
    delivered: "green",
  };
  return tones[String(status || "").toLowerCase()] || "neutral";
}

function activityDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}

function activityTime(value) {
  if (!value) return "";
  const [hour, minute] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function renderUpcomingAppointments(data) {
  const appointments = data.care?.upcoming_appointment_list || [];
  const body = !data.care
    ? renderEmpty("Appointment data is restricted", "Your role does not have access to CARE operations.")
    : appointments.length
      ? `<ul class="dash-list dash-activity-list">${appointments.map((item) => {
          const date = activityDate(item.date);
          const time = activityTime(item.start_time);
          return `<li>
            <span class="dash-avatar">${initial(item.patient_name)}</span>
            <span class="dash-list-main">
              <strong>${escapeHtml(item.patient_name || "Patient")}</strong>
              <span>${escapeHtml(item.doctor_name ? `Dr. ${item.doctor_name}` : "Doctor unavailable")}${item.specialty_name ? ` · ${escapeHtml(item.specialty_name)}` : ""}</span>
            </span>
            <span class="dash-list-meta">
              <time>${escapeHtml(date)}${time ? ` · ${escapeHtml(time)}` : ""}</time>
              <span class="dash-activity-status tone-${activityStatusTone(item.status)}">${escapeHtml(titleCase(item.status))}</span>
            </span>
          </li>`;
        }).join("")}</ul>`
      : renderEmpty("No upcoming appointments", "New booked or confirmed appointments will appear here.");

  return panel({
    title: "Upcoming Appointments",
    subtitle: "Next booked visits across CARE",
    extra: activityViewAll("appointments", "doctors"),
    body,
    className: "dash-activity-panel",
  });
}

function renderRecentPharmacyOrders(data) {
  const orders = data.recent_activity?.orders || [];
  const restricted = (data.meta?.restricted || []).includes("pharmacy");
  const money = formatINR;
  const body = restricted
    ? renderEmpty("Pharmacy data is restricted", "Your role does not have access to pharmacy orders.")
    : orders.length
      ? `<ul class="dash-list dash-activity-list">${orders.slice(0, 5).map((item) => `<li>
          <span class="dash-avatar">${initial(item.patient_name)}</span>
          <span class="dash-list-main">
            <strong>${escapeHtml(item.patient_name || "Patient")}</strong>
            <span>Order #${escapeHtml(item.order_number || item.id)} · ${formatCount(item.item_count)} ${Number(item.item_count) === 1 ? "item" : "items"}</span>
          </span>
          <span class="dash-list-meta">
            <strong class="dash-activity-amount">${escapeHtml(money(item.total))}</strong>
            <span class="dash-activity-status tone-${activityStatusTone(item.status)}">${escapeHtml(titleCase(item.status))}</span>
          </span>
        </li>`).join("")}</ul>`
      : renderEmpty("No pharmacy orders yet", "New patient orders will appear here.");

  return panel({
    title: "Recent Pharmacy Orders",
    subtitle: "Latest patient orders",
    extra: activityViewAll("orders", "pharmacy"),
    body,
    className: "dash-activity-panel",
  });
}

function renderActivityDialog() {
  return `<dialog class="dash-activity-dialog" id="dash-activity-dialog" aria-labelledby="dash-activity-dialog-title">
    <header class="dash-activity-dialog-head">
      <div><span class="dash-activity-dialog-eyebrow">Dashboard activity</span><h2 id="dash-activity-dialog-title"></h2><p id="dash-activity-dialog-subtitle"></p></div>
      <button type="button" class="dash-activity-dialog-close" data-activity-close aria-label="Close activity dialog">×</button>
    </header>
    <div class="dash-activity-dialog-content" id="dash-activity-dialog-content" aria-live="polite"></div>
  </dialog>`;
}

async function fetchAllActivityPages(resource) {
  const pageSize = 100;
  const results = [];
  let page = 1;
  let total = Infinity;

  while (results.length < total) {
    const response = await adminApi(`/care/${resource}/?page=${page}&page_size=${pageSize}`);
    const pageRows = Array.isArray(response.results) ? response.results : [];
    total = Number(response.total) || 0;
    results.push(...pageRows);
    if (!pageRows.length) break;
    page += 1;
  }

  return results;
}

function renderAppointmentActivity(rows) {
  return rows.length
    ? `<ul class="dash-activity-dialog-list">${rows.map((item) => `<li>
        <span class="dash-avatar">${initial(item.patient_name)}</span>
        <span class="dash-list-main">
          <strong>${escapeHtml(item.patient_name || "Patient")}</strong>
          <span>${escapeHtml(item.doctor_name ? `Dr. ${item.doctor_name}` : "Doctor unavailable")}${item.specialty_name ? ` · ${escapeHtml(item.specialty_name)}` : ""}</span>
        </span>
        <span class="dash-list-meta">
          <time>${escapeHtml(activityDate(item.date))}${item.start_time ? ` · ${escapeHtml(activityTime(item.start_time))}` : ""}</time>
          <span class="dash-activity-status tone-${activityStatusTone(item.status)}">${escapeHtml(titleCase(item.status))}</span>
        </span>
      </li>`).join("")}</ul>`
    : '<p class="dash-activity-dialog-empty">No appointments found.</p>';
}

function renderOrderActivity(rows) {
  const money = formatINR;

  return rows.length
    ? `<ul class="dash-activity-dialog-list">${rows.map((item) => `<li>
        <span class="dash-avatar">${initial(item.patient_name)}</span>
        <span class="dash-list-main">
          <strong>${escapeHtml(item.patient_name || "Patient")} · ${escapeHtml(item.order_number || `#${item.id}`)}</strong>
          <span>${formatCount(item.items?.length)} ${item.items?.length === 1 ? "item" : "items"} · ${escapeHtml(activityDate(item.created_at?.slice(0, 10)))}</span>
        </span>
        <span class="dash-list-meta">
          <strong class="dash-activity-amount">${escapeHtml(money(item.total))}</strong>
          <span class="dash-activity-status tone-${activityStatusTone(item.status)}">${escapeHtml(titleCase(item.status))}</span>
        </span>
      </li>`).join("")}</ul>`
    : '<p class="dash-activity-dialog-empty">No pharmacy orders found.</p>';
}

/* ---- Module coverage ------------------------------------ */

const METRIC_LABELS = {
  total_users: "Registered Users",
  users_by_role: "Users by Role",
  new_patients: "New Patients",
  total_doctors: "Doctor Profiles",
  doctor_verifications: "Doctor Verifications",
  doctors_by_specialty: "Doctor Specialties",
  audit_log_entries: "Audit Log Entries",
  total_hospitals: "Total Hospitals",
  total_clinics: "Total Clinics",
  total_diagnostic_centres: "Total Diagnostic Centres",
  total_pharmacies: "Total Pharmacies",
  provider_approvals: "Provider Approvals",
  appointments_by_specialty: "Appointments by Specialty",
  recent_appointments: "Recent Appointments",
  today_appointments: "Today's Appointments",
  pending_medicine_orders: "Pending Medicine Orders",
  order_trend: "Order Trend",
  recent_orders: "Recent Orders",
  prescription_reviews: "Prescription Reviews",
  low_stock_products: "Low-Stock Products",
  lab_test_bookings: "Lab-Test Bookings",
  sample_collections: "Sample Collections",
  unassigned_sample_bookings: "Unassigned Sample Bookings",
  active_phlebotomists: "Active Phlebotomists",
  revenue: "Revenue",
  revenue_trend: "Revenue Trend",
  revenue_by_module: "Revenue by Module",
  refund_requests: "Refund Requests",
  open_support_tickets: "Open Support Tickets",
  internship_applications: "Internship Applications",
  document_verifications: "Document Verifications",
  active_coupons: "Active Coupons",
  active_offers: "Active Offers",
};

// Which dashboard metrics each admin module feeds. A module is "live" when
// none of its metrics appear in the API's meta.unavailable list.
const MODULE_GROUPS = [
  {
    name: "Users",
    module: "users",
    metrics: ["total_users", "users_by_role", "new_patients"],
  },
  {
    name: "Doctors",
    module: "doctors",
    metrics: ["total_doctors", "doctor_verifications", "doctors_by_specialty"],
  },
  {
    name: "Audit Logs",
    module: "audit_logs",
    metrics: ["audit_log_entries"],
  },
  {
    name: "Healthcare Providers",
    module: "providers",
    metrics: [
      "total_hospitals",
      "total_clinics",
      "total_diagnostic_centres",
      "total_pharmacies",
      "provider_approvals",
    ],
  },
  {
    name: "Coupons & Offers",
    module: "coupons_offers_marketing",
    metrics: ["active_coupons", "active_offers"],
  },
  {
    name: "Appointments",
    module: "doctors",
    metrics: [
      "today_appointments",
      "appointments_by_specialty",
      "recent_appointments",
    ],
  },
  {
    name: "Pharmacy & Orders",
    module: "pharmacy",
    metrics: [
      "pending_medicine_orders",
      "order_trend",
      "recent_orders",
      "prescription_reviews",
      "low_stock_products",
    ],
  },
  {
    name: "Lab Tests",
    module: "lab_tests",
    metrics: [
      "lab_test_bookings",
      "sample_collections",
      "unassigned_sample_bookings",
      "active_phlebotomists",
    ],
  },
  {
    name: "Payments & Revenue",
    module: "orders_payments",
    metrics: [
      "revenue",
      "revenue_trend",
      "revenue_by_module",
      "refund_requests",
    ],
  },
  { name: "Support", module: "support", metrics: ["open_support_tickets"] },
  { name: "Internships", module: "internships", metrics: ["internship_applications"] },
  { name: "Documents", module: "providers", metrics: ["document_verifications"] },
];

function moduleMetricValue(key, data) {
  const values = {
    total_users: data.platform_overview?.total_users,
    users_by_role: data.distributions?.users_by_role,
    new_patients: data.live_stats?.new_patients,
    total_doctors: data.platform_overview?.care_total_doctors
      ?? data.platform_overview?.total_doctors,
    doctor_verifications: data.needs_attention?.doctor_verifications,
    doctors_by_specialty: data.distributions?.doctors_by_specialty,
    audit_log_entries: data.recent_activity?.admin_activity,
    total_hospitals: data.platform_overview?.total_hospitals,
    total_clinics: data.platform_overview?.total_clinics,
    total_diagnostic_centres: data.platform_overview?.total_diagnostic_centres,
    total_pharmacies: data.platform_overview?.total_pharmacies,
    provider_approvals: data.needs_attention?.provider_approvals,
    active_coupons: data.coupons_offers?.active_coupons,
    active_offers: data.coupons_offers?.active_offers,
    today_appointments: data.live_stats?.today_appointments,
    appointments_by_specialty: data.care?.appointments_by_specialty,
    recent_appointments: data.care?.recent_appointments,
    pending_medicine_orders: data.live_stats?.pending_medicine_orders,
    order_trend: data.charts?.order_trend,
    recent_orders: data.recent_activity?.orders,
    prescription_reviews: data.needs_attention?.prescription_reviews,
    low_stock_products: data.needs_attention?.low_stock_products,
    lab_test_bookings: data.live_stats?.lab_test_bookings,
    sample_collections: data.live_stats?.sample_collections,
    unassigned_sample_bookings: data.needs_attention?.unassigned_sample_bookings,
    active_phlebotomists: data.live_stats?.active_phlebotomists,
    revenue: data.live_stats?.revenue,
    revenue_trend: data.charts?.revenue_trend,
    revenue_by_module: data.charts?.revenue_by_module,
    refund_requests: data.needs_attention?.refund_requests,
    open_support_tickets: data.needs_attention?.open_support_tickets,
    internship_applications: data.needs_attention?.internship_applications,
    document_verifications: data.needs_attention?.document_verifications,
  };
  return values[key];
}

function metricSummary(key, value) {
  const label = METRIC_LABELS[key] || key;
  if (Array.isArray(value)) {
    if (key === "order_trend") {
      const total = value.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
      return `${formatCount(total)} orders in selected period`;
    }
    if (key === "recent_orders") {
      return value.length
        ? `${formatCount(value.length)} most recent orders`
        : "No orders yet";
    }
    if (key === "users_by_role") {
      return value.map((item) => `${formatCount(item.count)} ${item.role}${item.count === 1 ? "" : "s"}`).join(" · ") || "No user roles yet";
    }
    if (key === "appointments_by_specialty") {
      const total = value.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
      return `${formatCount(total)} appointments across ${formatCount(value.length)} specialties`;
    }
    if (key === "doctors_by_specialty") {
      return `${formatCount(value.length)} specialties with doctors`;
    }
    return `${formatCount(value.length)} ${label.toLowerCase()}`;
  }
  if (key === "revenue") {
    return `${label}: ₹${formatCount(value)}`;
  }
  return `${formatCount(value)} ${label.toLowerCase()}`;
}

function renderCoveragePanel(data) {
  const unavailable = new Set(
    (data.meta?.unavailable || []).map((item) => item.metric),
  );
  const restrictedModules = new Set(data.meta?.restricted || []);

  const tiles = MODULE_GROUPS.map((group) => {
    const restricted = restrictedModules.has(group.module);
    const connected = group.metrics.filter((key) =>
      !unavailable.has(key) && moduleMetricValue(key, data) !== null
      && moduleMetricValue(key, data) !== undefined,
    );
    const waiting = group.metrics.filter((key) =>
      unavailable.has(key) || moduleMetricValue(key, data) === null
      || moduleMetricValue(key, data) === undefined,
    );
    return {
      name: group.name,
      metrics: group.metrics,
      connected,
      waiting,
      restricted,
    };
  });

  const liveCount = tiles.filter((tile) =>
    !tile.restricted && tile.connected.length === tile.metrics.length,
  ).length;
  const partialCount = tiles.filter((tile) =>
    !tile.restricted && tile.connected.length > 0
    && tile.connected.length < tile.metrics.length,
  ).length;

  return panel({
    title: "Module coverage",
    subtitle: `${liveCount} fully live · ${partialCount} partially connected · ${tiles.length - liveCount - partialCount} awaiting integration or access`,
    className: "is-wide",
    body: `
      <ul class="dash-modules">
        ${tiles
          .map((tile) => {
            const fullyLive = !tile.restricted
              && tile.connected.length === tile.metrics.length;
            const partiallyLive = !tile.restricted && tile.connected.length > 0;
            const status = fullyLive ? "is-live" : partiallyLive ? "is-partial" : "is-waiting";
            const detail = tile.connected
              .map((key) => metricSummary(key, moduleMetricValue(key, data)))
              .join(" · ");
            const waiting = tile.waiting.map((key) => METRIC_LABELS[key] || key);
            return `
              <li class="${status}" title="${escapeHtml(waiting.length ? `Waiting for: ${waiting.join(", ")}` : detail)}">
                <span class="dash-status ${fullyLive ? "is-ok" : partiallyLive ? "is-warn" : "is-idle"}"></span>
                <span class="dash-module-main">
                  <strong>${escapeHtml(tile.name)}</strong>
                  <span>${
                    tile.restricted
                      ? "No access with your role"
                      : `${tile.connected.length}/${tile.metrics.length} metrics live${detail ? ` · ${escapeHtml(detail)}` : ""}${waiting.length ? ` · ${waiting.length} awaiting integration` : ""}`
                  }</span>
                </span>
              </li>`;
          })
          .join("")}
      </ul>`,
  });
}

/* =========================================================
   PAGE
========================================================= */

function renderContent(data) {
  const period = data.period || state.period;

  return `
    <div class="dash-fade">
      <section class="dash-kpis" aria-label="Key statistics">${renderKpis(data, period)}</section>

      ${renderAttentionPanel(data)}

      ${renderRevenueByModulePanel(data, period)}

      <div class="dash-grid dash-grid-main">
        ${renderTrendPanel(data, period)}
        ${renderRolePanel(data)}
      </div>

      <div class="dash-grid dash-grid-even dash-recent-panels">
        ${renderRecentUsers(data)}
        ${renderRecentAdminActivity(data)}
      </div>

      <div class="dash-grid dash-grid-even dash-module-activity-panels">
        ${renderUpcomingAppointments(data)}
        ${renderRecentPharmacyOrders(data)}
      </div>

      <div class="dash-grid dash-grid-even dash-specialty-care">
        ${renderSpecialtyPanel(data)}
        ${renderCareOperations(data)}
      </div>

      ${renderCoveragePanel(data)}
      ${renderActivityDialog()}
    </div>
  `;
}

function renderSkeleton() {
  const card = '<div class="dash-skeleton dash-skeleton-kpi"></div>';
  const panelBlock = (extra = "") =>
    `<div class="dash-skeleton dash-skeleton-panel ${extra}"></div>`;

  return `
    <div class="dash-loading" aria-busy="true" aria-label="Loading dashboard">
      <div class="dash-kpis">${card.repeat(4)}</div>
      <div class="dash-grid dash-grid-main">${panelBlock()}${panelBlock()}</div>
      <div class="dash-grid dash-grid-even">${panelBlock()}${panelBlock()}</div>
    </div>
  `;
}

function renderError(error) {
  const denied = error.status === 403;

  return `
    <section class="thp-admin-error-state">
      <div class="thp-admin-error-icon">!</div>
      <h2>${denied ? "Access denied" : "Unable to load dashboard data"}</h2>
      <p>${escapeHtml(error.message)}</p>
      ${denied ? "" : '<button class="thp-admin-retry-button" id="dash-retry" type="button">Try again</button>'}
    </section>
  `;
}

function toolbar() {
  return `
    <div class="dash-toolbar">
      <div class="dash-segment" role="group" aria-label="Date range">
        ${PERIODS.map(
          (item) => `
            <button type="button" data-period="${item.value}"
                    aria-pressed="${item.value === state.period}">${item.label}</button>`,
        ).join("")}
      </div>
      <button type="button" class="dash-refresh" id="dash-refresh" aria-label="Refresh dashboard" title="Refresh">
        ${icon("refresh", 16)}
      </button>
    </div>
  `;
}

function mountCharts(root, data) {
  const container = root.querySelector("#dash-trend-chart");
  if (!container) return;

  const points = (data.charts?.user_registration_trend || []).map((point) => ({
    label: point.label,
    tooltipLabel: point.date,
    value: point.count,
  }));

  mountLineChart(container, points, {
    ariaLabel: "New user registrations over time",
    unit: "new users",
  });
}

async function load(app) {
  const root = document.querySelector("#dash-root");
  if (!root) return;

  const requestId = ++state.requestId;
  disposeCharts();

  if (root.dataset.loaded) {
    root.classList.add("is-refreshing");
  } else {
    root.innerHTML = renderSkeleton();
  }

  try {
    const data = await fetchDashboard(state.period);
    if (requestId !== state.requestId) return;

    root.innerHTML = renderContent(data);
    root.querySelector("#dash-activity-dialog")?.addEventListener("close", (event) => {
      delete event.currentTarget.dataset.activityKind;
      state.activityRequestId = (state.activityRequestId || 0) + 1;
    });
    root.dataset.loaded = "1";
    root.classList.remove("is-refreshing");
    mountCharts(root, data);

    const subtitle = document.querySelector("#thp-admin-subtitle");
    if (subtitle) {
      subtitle.textContent = `Platform overview · ${periodInfo(state.period).long} · updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch (error) {
    if (requestId !== state.requestId) return;

    if (error.status === 401) {
      logoutAdmin();
      window.location.hash = "#/admin/login";
      return;
    }

    root.classList.remove("is-refreshing");
    delete root.dataset.loaded;
    root.innerHTML = renderError(error);
    root
      .querySelector("#dash-retry")
      ?.addEventListener("click", () => load(app));
  }
}

function bindToolbar(app) {
  document.querySelectorAll(".dash-segment [data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      const period = button.dataset.period;
      if (period === state.period) return;

      state.period = period;
      document
        .querySelectorAll(".dash-segment [data-period]")
        .forEach((item) =>
          item.setAttribute(
            "aria-pressed",
            String(item.dataset.period === period),
          ),
        );

      load(app);
    });
  });

  document
    .querySelector("#dash-refresh")
    ?.addEventListener("click", () => load(app));
}

async function openDashboardActivity(kind) {
  const dialog = document.querySelector("#dash-activity-dialog");
  const title = document.querySelector("#dash-activity-dialog-title");
  const subtitle = document.querySelector("#dash-activity-dialog-subtitle");
  const content = document.querySelector("#dash-activity-dialog-content");
  if (!dialog || !title || !subtitle || !content) return;

  const requestId = (state.activityRequestId || 0) + 1;
  state.activityRequestId = requestId;
  dialog.dataset.activityKind = kind;
  title.textContent = kind === "appointments" ? "All Appointments" : "All Pharmacy Orders";
  subtitle.textContent = "Loading the latest activity…";
  content.innerHTML = '<p class="dash-activity-dialog-empty" role="status">Loading activity…</p>';
  if (!dialog.open) dialog.showModal();

  try {
    const rows = kind === "appointments"
      ? await fetchAllActivityPages("appointments")
      : kind === "orders"
        ? await adminApi("/pharmacy/orders/")
        : null;
    if (requestId !== state.activityRequestId || dialog.dataset.activityKind !== kind) return;
    if (!Array.isArray(rows)) throw new Error("This activity list is unavailable.");

    subtitle.textContent = `${formatCount(rows.length)} ${kind === "appointments" ? "appointments" : "orders"} · Scroll to see the full list`;
    content.innerHTML = kind === "appointments"
      ? renderAppointmentActivity(rows)
      : renderOrderActivity(rows);
  } catch (error) {
    if (requestId !== state.activityRequestId || dialog.dataset.activityKind !== kind) return;
    subtitle.textContent = "We couldn’t load the latest activity.";
    content.innerHTML = `<div class="dash-activity-dialog-error" role="alert"><p>${escapeHtml(error.message || "Unable to load this activity list.")}</p><button type="button" class="dash-activity-dialog-retry" data-activity-retry>Try again</button></div>`;
  }
}

export async function renderAdminDashboard(app) {
  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
  if (!isAdminAuthenticated()) {
    window.location.hash = "#/admin/login";
    return;
  }

  // Re-read role + permissions so sidebar/cards follow the current role.
  try {
    await refreshAdminSession();
  } catch {
    window.location.hash = "#/admin/login";
    return;
  }

  renderAdminLayout(app, "dashboard", '<div id="dash-root"></div>', {
    subtitle: "Platform overview and operational flags",
    actions: toolbar(),
  });

  bindToolbar(app);

  // Dashboard content is injected after the layout binds its own handlers,
  // so module links inside it are handled here (delegated).
  document.querySelector("#dash-root")?.addEventListener("click", (event) => {
    const activityButton = event.target.closest("[data-dashboard-activity]");
    if (activityButton) {
      openDashboardActivity(activityButton.dataset.dashboardActivity);
      return;
    }
    const activityDialog = document.querySelector("#dash-activity-dialog");
    if (event.target.closest("[data-activity-close]") || event.target === activityDialog) {
      activityDialog?.close();
      return;
    }
    if (event.target.closest("[data-activity-retry]")) {
      if (activityDialog?.dataset.activityKind) {
        openDashboardActivity(activityDialog.dataset.activityKind);
      }
      return;
    }
    const target = event.target.closest("[data-admin-page]");
    if (target) openModule(target.dataset.adminPage, target.dataset.adminSection);
  });

  await load(app);
  state.refreshTimer = window.setInterval(() => {
    if (!window.location.hash.startsWith("#/admin/dashboard")) {
      window.clearInterval(state.refreshTimer);
      state.refreshTimer = null;
      return;
    }
    if (!document.hidden) load(app);
  }, 30000);
}
