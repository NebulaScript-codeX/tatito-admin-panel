import "./adminDashboard.css";
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
} from "./adminChart.js";

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
  });
}

/* ---- Needs attention ------------------------------------ */

const ATTENTION_ITEMS = [
  {
    key: "doctor_verifications",
    label: "Doctor Verifications",
    page: "doctors",
  },
  { key: "provider_approvals", label: "Provider Approvals", page: "providers" },
  {
    key: "document_verifications",
    label: "Document Verifications",
    page: "uploaded_files",
  },
  {
    key: "prescription_reviews",
    label: "Prescription Reviews",
    page: "pharmacy",
  },
  { key: "refund_requests", label: "Refund Requests", page: "orders_payments" },
  { key: "pending_reviews", label: "Doctor Reviews", page: "doctors" },
  { key: "unassigned_instant_consults", label: "Unassigned Instant Consults", page: "doctors" },
  { key: "patients_waiting_over_15_minutes", label: "CARE Patients Waiting 15+ Minutes", page: "doctors" },
  { key: "pending_payouts", label: "Pending Doctor Payouts", page: "doctors" },
  {
    key: "internship_applications",
    label: "Internship Applications",
    page: "internships",
  },
  { key: "low_stock_products", label: "Low-Stock Products", page: "pharmacy" },
  {
    key: "unassigned_sample_bookings",
    label: "Unassigned Sample Bookings",
    page: "lab_tests",
  },
  {
    key: "open_support_tickets",
    label: "Open Support Tickets",
    page: "support",
  },
];

function renderAttentionPanel(data) {
  const values = data.needs_attention || {};
  const connected = ATTENTION_ITEMS.filter((item) => !isNil(values[item.key]));
  const open = connected.reduce(
    (sum, item) => sum + (Number(values[item.key]) || 0),
    0,
  );

  const rows = ATTENTION_ITEMS.map((item) => {
    const raw = values[item.key];
    const isConnected = !isNil(raw);
    const count = Number(raw) || 0;
    const linked =
      isConnected &&
      isModuleAvailable(item.page) &&
      hasPermission(item.page, "view");
    const tag = linked ? "button" : "div";
    const attrs = linked
      ? `type="button" data-admin-page="${escapeHtml(item.page)}"`
      : "";

    const dot = !isConnected ? "is-idle" : count > 0 ? "is-warn" : "is-ok";
    const value = isConnected
      ? `<strong class="dash-count ${count > 0 ? "is-warn" : ""}">${formatCount(count)}</strong>`
      : '<span class="dash-not-connected">Not connected</span>';

    return `
      <li>
        <${tag} class="dash-attention-row ${linked ? "is-link" : ""} ${isConnected ? "" : "is-muted"}" ${attrs}>
          <span class="dash-status ${dot}"></span>
          <span class="dash-attention-label">${escapeHtml(item.label)}</span>
          ${value}
        </${tag}>
      </li>`;
  }).join("");

  const waiting = ATTENTION_ITEMS.length - connected.length;

  return panel({
    title: "Needs attention",
    subtitle:
      open > 0
        ? `${formatCount(open)} ${open === 1 ? "item" : "items"} awaiting action${waiting ? ` · ${waiting} checks not connected yet` : ""}`
        : waiting
          ? `Nothing waiting · ${waiting} checks not connected yet`
          : "Nothing is waiting on you",
    body: `<ul class="dash-attention">${rows}</ul>`,
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

/* ---- Module coverage ------------------------------------ */

const METRIC_LABELS = {
  total_hospitals: "Total Hospitals",
  total_clinics: "Total Clinics",
  total_diagnostic_centres: "Total Diagnostic Centres",
  total_pharmacies: "Total Pharmacies",
  provider_approvals: "Provider Approvals",
  today_appointments: "Today's Appointments",
  appointments_by_specialty: "Appointments by Specialty",
  recent_appointments: "Recent Appointments",
  pending_medicine_orders: "Pending Medicine Orders",
  order_trend: "Order Trend",
  recent_orders: "Recent Orders",
  prescription_reviews: "Prescription Reviews",
  low_stock_products: "Low-Stock Products",
  lab_test_bookings: "Lab-Test Bookings",
  sample_collections: "Sample Collections",
  unassigned_sample_bookings: "Unassigned Sample Bookings",
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
    name: "Healthcare Providers",
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
    metrics: ["active_coupons", "active_offers"],
  },
  {
    name: "Appointments",
    metrics: [
      "today_appointments",
      "appointments_by_specialty",
      "recent_appointments",
    ],
  },
  {
    name: "Pharmacy & Orders",
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
    metrics: [
      "lab_test_bookings",
      "sample_collections",
      "unassigned_sample_bookings",
    ],
  },
  {
    name: "Payments & Revenue",
    metrics: [
      "revenue",
      "revenue_trend",
      "revenue_by_module",
      "refund_requests",
    ],
  },
  { name: "Support", metrics: ["open_support_tickets"] },
  { name: "Internships", metrics: ["internship_applications"] },
  { name: "Documents", metrics: ["document_verifications"] },
];

function renderCoveragePanel(data) {
  const unavailable = new Set(
    (data.meta?.unavailable || []).map((item) => item.metric),
  );
  const restrictedAudit = (data.meta?.restricted || []).includes(
    "recent_activity.admin_activity",
  );
  const restrictedModules = new Set(data.meta?.restricted || []);

  const liveTiles = [
    { name: "Users", live: true },
    { name: "Doctors", live: true },
    { name: "Audit Logs", live: !restrictedAudit },
  ].map((tile) => ({ ...tile, waiting: [] }));

  const groupTiles = MODULE_GROUPS.map((group) => {
    const waiting = group.metrics.filter((key) => unavailable.has(key));
    const moduleKey =
      group.name === "Healthcare Providers"
        ? "providers"
        : group.name === "Coupons & Offers"
          ? "coupons_offers_marketing"
          : "";
    const restricted = moduleKey && restrictedModules.has(moduleKey);
    return {
      name: group.name,
      live: waiting.length === 0 && !restricted,
      waiting,
      restricted,
    };
  });

  const tiles = [...liveTiles, ...groupTiles];
  const liveCount = tiles.filter((tile) => tile.live).length;

  return panel({
    title: "Module coverage",
    subtitle: `${liveCount} of ${tiles.length} modules are reporting live data`,
    className: "is-wide",
    body: `
      <ul class="dash-modules">
        ${tiles
          .map((tile) => {
            const names = tile.waiting.map((key) => METRIC_LABELS[key] || key);
            let detail = "";
            if (tile.name === "Healthcare Providers" && tile.live) {
              const overview = data.platform_overview || {};
              detail = [
                `${formatCount(overview.total_hospitals || 0)} hospitals`,
                `${formatCount(overview.total_clinics || 0)} clinics`,
                `${formatCount(overview.total_diagnostic_centres || 0)} diagnostic centres`,
                `${formatCount(overview.total_pharmacies || 0)} pharmacies`,
                `${formatCount(data.needs_attention?.provider_approvals || 0)} pending review`,
              ].join(" · ");
            } else if (tile.name === "Coupons & Offers" && tile.live) {
              const offers = data.coupons_offers || {};
              detail = `${formatCount(offers.active_coupons || 0)} active coupons · ${formatCount(offers.active_offers || 0)} active offers`;
            }
            return `
              <li class="${tile.live ? "is-live" : "is-waiting"}" ${names.length ? `title="${escapeHtml(names.join(", "))}"` : ""}>
                <span class="dash-status ${tile.live ? "is-ok" : "is-idle"}"></span>
                <span class="dash-module-main">
                  <strong>${escapeHtml(tile.name)}</strong>
                  <span>${
                    tile.live
                      ? detail || "Live data"
                      : tile.waiting.length
                        ? `${tile.waiting.length} ${tile.waiting.length === 1 ? "metric" : "metrics"} waiting for a data source`
                        : "No access with your role"
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

      <div class="dash-grid dash-grid-main">
        ${renderTrendPanel(data, period)}
        ${renderRolePanel(data)}
      </div>

      <div class="dash-grid dash-grid-even">
        ${renderSpecialtyPanel(data)}
        ${renderAttentionPanel(data)}
      </div>

      <div class="dash-grid dash-grid-care">
        ${renderCareOperations(data)}
      </div>

      <div class="dash-grid dash-grid-even">
        ${renderRecentUsers(data)}
        ${renderRecentAdminActivity(data)}
      </div>

      ${renderCoveragePanel(data)}
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
    const target = event.target.closest("[data-admin-page]");
    if (target) openModule(target.dataset.adminPage);
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
