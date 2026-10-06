import {
  getAdminSession,
  hasPermission,
  logoutAdmin,
  logoutAdminRemote,
  updateAdminSessionProfile,
} from "./adminAuth.js";

import { escapeHtml } from "./adminChart.js";

import {
  adminApi,
  getAdminDashboardOverview,
  getAdminNotificationReadStates,
  markAdminNotificationsRead,
  refreshHealthRecordCounts,
  updateAdminAccount,
} from "./adminApi.js";

// Modules that have a real page behind them. Dashboard widgets use this to
// avoid linking to pages that have not been implemented yet.
const BUILT_MODULES = new Set([
  "dashboard",
  "users",
  "staff",
  "providers",
  "doctors",
  "promotions",
  "health_records",
  "pharmacy",
  "lab_tests",
  "orders_payments",
  "health_plans",
  "coupons_offers_marketing",
  "support",
  "content",
  "internships",
  "ai_assistant",
  "reports",
  "uploaded_files",
]);

export function isModuleAvailable(key) {
  return BUILT_MODULES.has(key);
}

export function openModule(key, section) {
  const routes = {
    dashboard: "dashboard",
    users: "users",
    staff: "staff",
    promotions: "promotions",
    providers: "providers",
    doctors: "doctors",
    health_records: "health-records",
    pharmacy: "pharmacy",
    lab_tests: "lab-tests",
    orders_payments: "orders-payments",
    health_plans: "health-plans",
    coupons_offers_marketing: "coupons-offers-marketing",
    content: "content",
    internships: "internships",
    support: "support",
    ai_assistant: "ai-assistant",
    reports: "reports",
    uploaded_files: "uploaded-files",
    settings: "settings",
    audit_logs: "audit-logs",
  };
  const route = routes[key];
  if (!route) return;
  if (key === "users" && typeof window.thpNavigate === "function") {
    window.thpNavigate(`admin/${route}`);
    return;
  }
  const query = section ? `?tab=${encodeURIComponent(section)}` : "";
  window.location.hash = `#/admin/${route}${query}`;
}

const sidebarGroups = [
  {
    title: "MAIN",
    items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "PEOPLE",
    items: [
      { key: "users", label: "Users", icon: "users" },
      { key: "staff", label: "Staff, Roles & Admin", icon: "staff" },
    ],
  },
  {
    title: "NETWORK",
    items: [
      { key: "providers", label: "Healthcare Providers", icon: "hospital" },
    ],
  },
  {
    title: "CARE",
    items: [
      { key: "doctors", label: "Doctors & Appointments", icon: "doctor" },
      { key: "health_records", label: "Health Records", icon: "records" },
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { key: "pharmacy", label: "Pharmacy", icon: "pharmacy" },
      { key: "lab_tests", label: "Lab Tests", icon: "lab" },
      { key: "orders_payments", label: "Orders & Payments", icon: "orders" },
      { key: "health_plans", label: "Health Plans", icon: "plans" },
      {
        key: "coupons_offers_marketing",
        label: "Coupons, Offers & Marketing",
        icon: "coupons",
      },
    ],
  },
  {
    title: "GROWTH",
    items: [
      { key: "content", label: "Content", icon: "content" },
      { key: "internships", label: "Internships", icon: "internships" },
    ],
  },
  {
    title: "MANAGE",
    items: [{ key: "promotions", label: "Promotions", icon: "promotions" }],
  },
  {
    title: "SUPPORT",
    items: [
      { key: "support", label: "Support & Communication", icon: "support" },
      { key: "ai_assistant", label: "AI Assistant", icon: "ai" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "reports" },
      {
        key: "uploaded_files",
        label: "Uploaded Files & Documents",
        icon: "files",
      },
      { key: "settings", label: "Settings & Security", icon: "settings" },
      { key: "audit_logs", label: "Audit Logs", icon: "audit" },
    ],
  },
];

const sidebarIconPaths = {
  dashboard:
    '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  staff:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v8m-4-4h8"/>',
  hospital:
    '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M11 21v-3h2v3"/>',
  doctor:
    '<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/><path d="M4 3h4m6 0h4"/>',
  records:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8m-8 4h5"/><path d="M12 1v4m-2-2h4"/>',
  pharmacy:
    '<path d="m10.5 3.5 10 10a4.95 4.95 0 0 1-7 7l-10-10a4.95 4.95 0 0 1 7-7Z"/><path d="m8 6 10 10M13 8l3-3m-8 8-3 3"/>',
  lab: '<path d="M9 3h6m-5 0v7L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3l-6-9V3M7 16h10"/>',
  orders:
    '<path d="M3 3h2l2.2 12.2a2 2 0 0 0 2 1.8h8.6a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
  plans:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  coupons:
    '<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v3h18v-3a2 2 0 0 1 0-4 2 2 0 0 0 0-4V5H3Z"/><path d="M13 8 9 16m.5-7h.01m3 6h.01"/>',
  content:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h10m-10 4h6"/>',
  internships:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2"/>',
  promotions:
    '<path d="m3 11 18-5v12l-18-5v-2Z"/><path d="M11.6 14.8 13 21l-4-1-1.7-5.4M5 10v4"/>',
  support:
    '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  ai: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z"/>',
  reports: '<path d="M3 3v18h18M8 15l4-4 3 3 6-7"/><path d="M17 7h4v4"/>',
  files:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-12 5 2 2 4-4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"/>',
  audit:
    '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5h-3"/><path d="M16 3v5h5M7 12h10m-10 4h10M7 8h3"/>',
};

function renderSidebarIcon(name) {
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${sidebarIconPaths[name] || ""}</svg>`;
}

function getSidebarCollapsed() {
  try {
    return localStorage.getItem("thp-admin-sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

const pageTitles = {
  dashboard: "Dashboard",
  users: "Users",
  staff: "Staff, Roles & Admin Accounts",
  providers: "Healthcare Providers",
  doctors: "Doctors & Appointments",
  health_records: "Health Records",
  pharmacy: "Pharmacy",
  lab_tests: "Lab Tests",
  orders_payments: "Orders & Payments",
  health_plans: "Health Plans",
  coupons_offers_marketing: "Coupons, Offers & Marketing",
  content: "Content",
  internships: "Internships",
  promotions: "Manage Promotions",
  support: "Support & Communication",
  ai_assistant: "AI Assistant",
  reports: "Reports & Analytics",
  uploaded_files: "Uploaded Files & Documents",
  settings: "Settings & Security",
  audit_logs: "Audit Logs",
  "access-denied": "Access Restricted",
};

export function renderAdminLayout(
  app,
  activePage = "dashboard",
  content = "",
  { subtitle = "", actions = "" } = {},
) {
  const session = getAdminSession();
  const admin = session?.admin || {};
  const username = escapeHtml(admin.username || "Admin");
  const role = escapeHtml(admin.role || "Administrator");
  const sidebarCollapsed = getSidebarCollapsed();
  const isMobileViewport = window.matchMedia("(max-width: 800px)").matches;
  const sidebarToggleLabel = isMobileViewport
    ? "Open navigation"
    : sidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar";

  app.innerHTML = `
    <div class="thp-admin-shell ${sidebarCollapsed ? "is-collapsed" : ""}">

      <aside class="thp-admin-sidebar" id="thp-admin-sidebar">

        <div class="thp-admin-brand">
          <img class="thp-admin-brand-mark" src="/tatito-logo.png" alt="Tatito Health+ logo" />

          <div class="thp-admin-brand-copy">
            <strong>Tatito Health+</strong>
            <span>ADMIN PORTAL</span>
          </div>

          <button
            type="button"
            class="thp-admin-sidebar-toggle"
            id="thp-admin-sidebar-toggle"
            aria-label="${sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
            title="${sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
            aria-controls="thp-admin-sidebar"
            aria-expanded="${!sidebarCollapsed}"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>
          </button>
        </div>

        <nav class="thp-admin-navigation">
          ${sidebarGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) =>
                hasPermission(item.key, "view"),
              ),
            }))
            .filter((group) => group.items.length)
            .map(
              (group) => `
            <div class="thp-admin-nav-group">
              <div class="thp-admin-nav-label">${group.title}</div>

              ${group.items
                .map(
                  (item) => `
                <button
                  class="thp-admin-nav-item ${activePage === item.key ? "is-active" : ""}"
                  data-admin-page="${item.key}"
                  title="${item.label}"
                  aria-label="${item.label}"
                  ${activePage === item.key ? 'aria-current="page"' : ""}
                  type="button"
                >
                  <span class="thp-admin-nav-icon">${renderSidebarIcon(item.icon)}</span>
                  <span class="thp-admin-nav-text">${item.label}</span>
                </button>
              `,
                )
                .join("")}
            </div>
          `,
            )
            .join("")}
        </nav>

        <div class="thp-admin-sidebar-footer">
          <div class="thp-admin-secure-badge">
            <span class="thp-admin-status-dot"></span>
            <span>Secure Admin Access</span>
          </div>
        </div>

      </aside>

      <section class="thp-admin-main ${activePage === "users" ? "thp-admin-main-users" : ""} ${activePage === "staff" ? "thp-admin-main-staff" : ""}">

        <header class="thp-admin-topbar">

          <button
            type="button"
            class="thp-admin-menu-button"
            id="thp-admin-menu-button"
            aria-label="${sidebarToggleLabel}"
            title="${sidebarToggleLabel}"
            aria-controls="thp-admin-sidebar"
            aria-expanded="${isMobileViewport ? "false" : !sidebarCollapsed}"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m4-12h5m-5 4h5"/></svg>
          </button>

          <div class="thp-admin-search">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input
              type="search"
              id="thp-admin-global-search"
              placeholder="Search admin data and modules..."
              aria-label="Search admin data and modules"
              autocomplete="off"
              aria-controls="thp-admin-search-results"
              aria-expanded="false"
            />
            <div class="thp-admin-search-results" id="thp-admin-search-results" role="listbox" hidden></div>
          </div>

          <div class="thp-admin-topbar-actions">
            <div class="thp-admin-notifications" id="thp-admin-notifications">
              <button type="button" class="thp-admin-notification" id="thp-admin-notification-toggle" aria-label="Notifications" title="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="thp-admin-notification-panel">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                <span class="thp-admin-notification-dot" id="thp-admin-notification-count" aria-label="Unread notifications" hidden></span>
              </button>
              <section class="thp-admin-notification-panel" id="thp-admin-notification-panel" aria-label="Admin notifications" hidden>
                <header>
                  <div class="thp-admin-notification-heading"><strong>Notifications</strong><span id="thp-admin-notification-unread-count"></span></div>
                  <div class="thp-admin-notification-actions">
                    <button type="button" class="thp-admin-notification-mark-read" id="thp-admin-notification-mark-read">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
                      Mark all read
                    </button>
                    <button type="button" class="thp-admin-notification-refresh" id="thp-admin-notification-refresh" aria-label="Refresh notifications" title="Refresh notifications">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg>
                    </button>
                  </div>
                </header>
                <div class="thp-admin-notification-content" id="thp-admin-notification-content"><p>Open to load the latest admin activity.</p></div>
              </section>
            </div>

            <div class="thp-admin-profile" id="thp-admin-profile">
              <button
                type="button"
                class="thp-admin-profile-trigger"
                id="thp-admin-profile-trigger"
                aria-label="Admin profile menu"
                aria-controls="thp-admin-profile-menu"
                aria-expanded="false"
              >
                <span class="thp-admin-avatar">${escapeHtml((admin.username || "A").charAt(0).toUpperCase())}</span>
                <span class="thp-admin-profile-info">
                  <strong>${username}</strong>
                  <span>${role}</span>
                  <span class="thp-admin-profile-email">${escapeHtml(admin.email || "")}</span>
                </span>
                <svg class="thp-admin-profile-chevron" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
              </button>
              <div class="thp-admin-profile-dropdown" id="thp-admin-profile-menu" aria-hidden="true">
                <button type="button" class="thp-admin-logout-button" id="thp-admin-manage-account" title="Manage account">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
                  <span>Manage Account</span>
                </button>
                <button type="button" class="thp-admin-logout-button" id="thp-admin-logout" title="Sign out">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>

        </header>

        <main class="thp-admin-content ${activePage === "users" ? "thp-admin-content-users" : ""} ${activePage === "staff" ? "thp-admin-content-staff" : ""}">

          ${
            activePage === "content" ||
            activePage === "coupons_offers_marketing" || activePage === "promotions"
              ? ""
              : `
                <div class="thp-admin-page-heading ${activePage === "users" ? "thp-admin-users-page-heading" : ""} ${activePage === "staff" ? "thp-admin-staff-page-heading" : ""}">
                  <div class="thp-admin-page-title">
                    <p class="thp-admin-eyebrow">TATITO HEALTH+</p>
                    <h1>${activePage === "users" ? '<span class="thp-admin-users-title-strong">Manage</span> <em>Users</em>' : activePage === "staff" ? '<span class="thp-admin-staff-title-strong">Staff &amp;</span> <em>Roles</em>' : pageTitles[activePage] || "Admin Panel"}</h1>
                    ${subtitle ? `<p class="thp-admin-subtitle" id="thp-admin-subtitle">${escapeHtml(subtitle)}</p>` : ""}
                  </div>

                  <div class="thp-admin-page-actions">${actions}</div>
                </div>
              `
          }

          ${content}

        </main>

      </section>

    </div>
    <div class="toast" id="toast" role="status" aria-live="polite">
      <span class="toast-check" aria-hidden="true">&#10003;</span>
      <span id="toast-text">Updated</span>
    </div>
    <div class="thp-admin-account-modal" id="thp-admin-account-modal" hidden>
      <div class="thp-admin-modal-backdrop" data-account-close></div>
      <section class="thp-admin-account-card" role="dialog" aria-modal="true" aria-labelledby="thp-admin-account-title">
        <header class="thp-admin-account-heading">
          <div><p class="thp-admin-eyebrow">ACCOUNT SETTINGS</p><h2 id="thp-admin-account-title">Manage Account</h2></div>
          <button type="button" class="thp-admin-modal-close" data-account-close aria-label="Close">×</button>
        </header>
        <form id="thp-admin-account-form">
          <div class="thp-admin-account-fields">
            <label class="thp-admin-form-group"><span>Username</span><input name="username" autocomplete="username" required /></label>
            <label class="thp-admin-form-group"><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
          </div>
          <p class="thp-admin-account-section-title">Change password <span>(leave blank to keep current password)</span></p>
          <div class="thp-admin-account-fields">
            <label class="thp-admin-form-group"><span>Current password</span><input name="current_password" type="password" autocomplete="current-password" /></label>
            <label class="thp-admin-form-group"><span>New password</span><input name="new_password" type="password" autocomplete="new-password" minlength="8" /></label>
            <label class="thp-admin-form-group"><span>Confirm new password</span><input name="confirm_password" type="password" autocomplete="new-password" minlength="8" /></label>
          </div>
          <p class="thp-admin-account-error" id="thp-admin-account-error" role="alert" hidden></p>
          <footer class="thp-admin-account-actions">
            <button type="button" class="thp-admin-secondary-button" data-account-close>Cancel</button>
            <button type="submit" class="thp-admin-primary-button" id="thp-admin-account-save">Save Changes</button>
          </footer>
        </form>
      </section>
    </div>
  `;

  setupAdminLayoutEvents(app);
}

function setupAdminLayoutEvents(app) {
  app._adminLayoutEvents?.abort();
  const eventController = new AbortController();
  app._adminLayoutEvents = eventController;

  if (hasPermission("health_records", "view")) {
    refreshHealthRecordCounts().catch((error) => {
      console.error("Unable to preload Health Records navigation counts.", error);
    });
  }

  const navigation = app.querySelector(".thp-admin-navigation");
  navigation?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-page]");
    if (!button) return;
    openModule(button.dataset.adminPage);
    if (window.matchMedia("(max-width: 800px)").matches) {
      app.querySelector("#thp-admin-sidebar")?.classList.remove("is-open");
    }
  });

  const logoutButton = app.querySelector("#thp-admin-logout");
  const manageAccountButton = app.querySelector("#thp-admin-manage-account");
  const profile = app.querySelector("#thp-admin-profile");
  const profileTrigger = app.querySelector("#thp-admin-profile-trigger");
  const profileMenu = app.querySelector("#thp-admin-profile-menu");
  const setProfileMenuOpen = (open) => {
    profile?.classList.toggle("is-open", open);
    profileTrigger?.setAttribute("aria-expanded", String(open));
    profileMenu?.setAttribute("aria-hidden", String(!open));
  };

  profileTrigger?.addEventListener("click", () => {
    setProfileMenuOpen(!profile?.classList.contains("is-open"));
  });

  app.addEventListener(
    "click",
    (event) => {
      if (profile && !profile.contains(event.target)) setProfileMenuOpen(false);
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !profile?.classList.contains("is-open"))
        return;
      setProfileMenuOpen(false);
      profileTrigger?.focus();
    },
    { signal: eventController.signal },
  );

  logoutButton?.addEventListener("click", () => {
    setProfileMenuOpen(false);
    logoutAdmin();
    void logoutAdminRemote();
    window.location.hash = "#/admin/login";
  });

  const accountModal = app.querySelector("#thp-admin-account-modal");
  const accountForm = app.querySelector("#thp-admin-account-form");
  const accountError = app.querySelector("#thp-admin-account-error");
  const accountSave = app.querySelector("#thp-admin-account-save");
  const showToast = (message, isError = false) => {
    const toast = app.querySelector("#toast");
    const text = app.querySelector("#toast-text");
    if (!toast || !text) return;
    text.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    window.clearTimeout(app._adminToastTimer);
    app._adminToastTimer = window.setTimeout(
      () => toast.classList.remove("is-visible", "is-error"),
      3200,
    );
  };
  const closeAccountModal = () => {
    accountModal.hidden = true;
    accountError.hidden = true;
    accountForm.reset();
  };

  manageAccountButton?.addEventListener("click", () => {
    const currentAdmin = getAdminSession()?.admin || {};
    accountForm.elements.username.value = currentAdmin.username || "";
    accountForm.elements.email.value = currentAdmin.email || "";
    accountError.hidden = true;
    accountModal.hidden = false;
    setProfileMenuOpen(false);
    accountForm.elements.username.focus();
  });
  accountModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-account-close]")) closeAccountModal();
  });
  accountModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !accountSave.disabled) closeAccountModal();
  });
  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(accountForm);
    const currentPassword = String(formData.get("current_password") || "");
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");
    const passwordFieldsUsed = Boolean(currentPassword || newPassword || confirmPassword);
    const payload = {
      username: String(formData.get("username") || "").trim(),
      email: String(formData.get("email") || "").trim(),
    };

    accountError.hidden = true;
    if (passwordFieldsUsed && (!currentPassword || !newPassword || !confirmPassword)) {
      accountError.textContent = "Enter the current password, new password, and confirmation to change your password.";
      accountError.hidden = false;
      return;
    }
    if (passwordFieldsUsed && newPassword !== confirmPassword) {
      accountError.textContent = "The new password and confirmation do not match.";
      accountError.hidden = false;
      return;
    }
    if (passwordFieldsUsed) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
      payload.confirm_password = confirmPassword;
    }

    accountSave.disabled = true;
    try {
      const response = await updateAdminAccount(payload);
      updateAdminSessionProfile(response.admin);
      const username = app.querySelector(".thp-admin-profile-info strong");
      const email = app.querySelector(".thp-admin-profile-email");
      const avatar = app.querySelector(".thp-admin-avatar");
      if (username) username.textContent = response.admin.username;
      if (email) email.textContent = response.admin.email;
      if (avatar) avatar.textContent = response.admin.username.charAt(0).toUpperCase();
      closeAccountModal();
      showToast(response.message || "Account updated successfully.");
    } catch (error) {
      const errors = error.data?.errors;
      const details = errors
        ? Object.values(errors).flat().join(" ")
        : error.message;
      accountError.textContent = details || "Unable to update the account.";
      accountError.hidden = false;
      showToast(details || error.message || "Unable to update the account.", true);
    } finally {
      accountSave.disabled = false;
    }
  });

  const searchInput = app.querySelector("#thp-admin-global-search");
  const searchResults = app.querySelector("#thp-admin-search-results");
  let searchRequestId = 0;
  let searchTimer;
  const closeSearch = () => {
    searchResults.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
  };
  const renderSearchResults = (query, results, failed) => {
    const moduleResults = sidebarGroups
      .flatMap((group) => group.items)
      .filter((item) => hasPermission(item.key, "view") && item.label.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({ module: item.key, label: item.label, detail: "Admin module" }));
    const combined = [...moduleResults, ...results];
    searchResults.innerHTML = combined.length
      ? `${combined.map((item) => `<button type="button" role="option" class="thp-admin-search-result" data-search-module="${escapeHtml(item.module)}"><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span><span aria-hidden="true">›</span></button>`).join("")}${failed ? '<p class="thp-admin-search-note">Some search results could not be loaded.</p>' : ""}`
      : `<p class="thp-admin-search-note">${failed ? "Search is temporarily unavailable." : "No matching admin data or modules found."}</p>`;
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  };
  const searchAdminData = async (rawQuery) => {
    const query = rawQuery.trim();
    const requestId = ++searchRequestId;
    if (query.length < 2) {
      closeSearch();
      return;
    }
    searchResults.innerHTML = '<p class="thp-admin-search-note">Searching admin data…</p>';
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");

    const encoded = encodeURIComponent(query);
    const sources = [
      hasPermission("users", "view") && { module: "users", endpoint: `/users/?search=${encoded}&page_size=5`, label: (row) => row.name || row.email || row.mobile, detail: (row) => `${row.role || "User"} · ${row.email || row.mobile || ""}` },
      hasPermission("staff", "view") && { module: "staff", endpoint: `/staff/?search=${encoded}`, label: (row) => row.name || row.username || row.email, detail: (row) => `Staff · ${row.email || ""}` },
      hasPermission("providers", "view") && { module: "providers", endpoint: `/providers/?search=${encoded}`, label: (row) => row.name || row.email || row.registration_number, detail: (row) => `Healthcare provider · ${row.provider_type || row.city || ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/doctors/?search=${encoded}&page_size=5`, label: (row) => row.name, detail: (row) => `Doctor · ${row.specialty || ""}${row.city ? ` · ${row.city}` : ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/appointments/?search=${encoded}&page_size=5`, label: (row) => row.patient_name || row.patientName, detail: (row) => `Appointment · ${row.doctor_name || ""}${row.date ? ` · ${row.date}` : ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/patients/?search=${encoded}`, label: (row) => row.name, detail: (row) => `CARE patient · ${row.external_id || ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/specialties/?search=${encoded}&page_size=5`, label: (row) => row.name, detail: () => "CARE specialty" },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/instant-consults/?search=${encoded}&page_size=5`, label: (row) => row.patient_name || row.patientName, detail: (row) => `Instant consult · ${row.doctor_name || row.status || ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/reviews/?search=${encoded}&page_size=5`, label: (row) => row.patientName || row.patient_name || row.doctor_name, detail: (row) => `CARE review · ${row.doctor_name || row.moderationStatus || ""}` },
      hasPermission("doctors", "view") && { module: "doctors", endpoint: `/care/payouts/?search=${encoded}`, label: (row) => row.doctor_name, detail: (row) => `CARE payout · ${row.status || ""}` },
      hasPermission("coupons_offers_marketing", "view") && { module: "coupons_offers_marketing", endpoint: `/marketing/coupons/?search=${encoded}`, label: (row) => row.code, detail: () => "Coupon" },
      hasPermission("promotions", "view") && { module: "promotions", endpoint: `/marketing/promotions/?search=${encoded}`, label: (row) => row.title, detail: () => "Promotion" },
    ].filter(Boolean);
    const settled = await Promise.allSettled(sources.map((source) => adminApi(source.endpoint)));
    if (requestId !== searchRequestId) return;
    const results = [];
    let failed = false;
    settled.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        failed = true;
        return;
      }
      const rows = Array.isArray(result.value?.results)
        ? result.value.results
        : Array.isArray(result.value)
          ? result.value
          : [];
      rows.slice(0, 5).forEach((row) => {
        const label = sources[index].label(row);
        if (typeof label === "string" && label.trim()) {
          results.push({
            module: sources[index].module,
            label: label.trim(),
            detail: sources[index].detail(row),
          });
        }
      });
    });
    renderSearchResults(query, results, failed);
  };
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => searchAdminData(searchInput.value), 150);
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
    if (event.key === "Enter") {
      const firstResult = searchResults.querySelector("[data-search-module]");
      if (firstResult) {
        openModule(firstResult.dataset.searchModule);
        closeSearch();
      }
    }
  });
  searchResults?.addEventListener("click", (event) => {
    const result = event.target.closest("[data-search-module]");
    if (!result) return;
    openModule(result.dataset.searchModule);
    closeSearch();
  });
  app.addEventListener("click", (event) => {
    if (!event.target.closest(".thp-admin-search")) closeSearch();
  });

  const notificationToggle = app.querySelector("#thp-admin-notification-toggle");
  const notificationPanel = app.querySelector("#thp-admin-notification-panel");
  const notificationContent = app.querySelector("#thp-admin-notification-content");
  const notificationCount = app.querySelector("#thp-admin-notification-count");
  const notificationUnreadCount = app.querySelector("#thp-admin-notification-unread-count");
  const notificationMarkRead = app.querySelector("#thp-admin-notification-mark-read");
  const notificationRefresh = app.querySelector("#thp-admin-notification-refresh");
  let notificationIds = [];
  const notificationReadStates = new Map();
  const updateNotificationReadUi = () => {
    const unreadIds = notificationIds.filter(
      (id) => notificationReadStates.get(id) !== true,
    );
    const unreadCount = unreadIds.length;
    notificationCount.hidden = unreadCount === 0;
    notificationCount.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    notificationUnreadCount.textContent = unreadCount
      ? `${unreadCount} unread`
      : "All caught up";
    notificationMarkRead.disabled = unreadCount === 0;
    notificationContent
      .querySelectorAll("[data-notification-id]")
      .forEach((item) => {
        item.classList.toggle(
          "is-unread",
          notificationReadStates.get(item.dataset.notificationId) !== true,
        );
      });
  };
  const applyNotificationReadStates = (readStates) => {
    if (!Array.isArray(readStates)) {
      throw new Error("Unable to update notification read status.");
    }
    readStates.forEach(({ key, is_read: isRead }) => {
      if (typeof key === "string" && typeof isRead === "boolean") {
        notificationReadStates.set(key, isRead);
      }
    });
    updateNotificationReadUi();
  };
  let notificationRequestId = 0;
  const loadNotifications = async () => {
    const requestId = ++notificationRequestId;
    notificationRefresh?.classList.add("is-loading");
    notificationRefresh?.setAttribute("aria-busy", "true");
    notificationMarkRead.disabled = true;
    notificationContent.innerHTML = '<p class="thp-admin-notification-state">Loading notifications…</p>';
    try {
      let entries = [];
      let attention = [];
      if (hasPermission("dashboard", "view")) {
        const data = await getAdminDashboardOverview();
        entries = data.recent_activity?.admin_activity || [];
        const counts = data.needs_attention || {};
        attention = [
          ["doctor_verifications", "Doctor verifications", "users"],
          ["provider_approvals", "Provider approvals", "providers"],
          ["document_verifications", "Provider documents to verify", "providers"],
        ].filter(([key]) => Number(counts[key]) > 0)
          .map(([key, label, module]) => ({ label, detail: `${counts[key]} require attention`, module }));
      } else if (hasPermission("audit_logs", "view")) {
        const data = await adminApi("/audit-logs/?page_size=5");
        entries = data.results || [];
      } else {
        notificationContent.innerHTML = '<p class="thp-admin-notification-state">Notifications are unavailable for your account.</p>';
        notificationCount.hidden = true;
        notificationCount.textContent = "";
        notificationUnreadCount.textContent = "";
        return;
      }
      if (requestId !== notificationRequestId) return;
      const notices = [
        ...attention.map((item) => ({
          id: `attention:${item.module}:${item.label}`,
          title: item.label,
          detail: item.detail,
          module: item.module,
          createdAt: "",
          attention: true,
        })),
        ...entries.slice(0, 5).map((item) => ({
          id: `activity:${item.id}`,
          title: item.description || item.action || "Admin activity",
          detail: `${item.actor || "Admin"} · ${item.module || "system"}`,
          module: "",
          createdAt: item.created_at ? new Date(item.created_at).toLocaleString() : "",
          attention: false,
        })),
      ];
      const readStateResponse = await getAdminNotificationReadStates(
        notices.map((notice) => notice.id),
      );
      if (requestId !== notificationRequestId) return;
      notificationReadStates.clear();
      readStateResponse.read_states.forEach(({ key, is_read: isRead }) => {
        if (typeof key === "string" && typeof isRead === "boolean") {
          notificationReadStates.set(key, isRead);
        }
      });
      notificationIds = notices.map((notice) => notice.id);
      updateNotificationReadUi();
      notificationContent.innerHTML = notices.length
        ? notices.map((notice) => {
          const unread = notificationReadStates.get(notice.id) !== true;
          const tag = notice.module ? "button" : "div";
          const attrs = notice.module
            ? ` type="button" data-notification-module="${escapeHtml(notice.module)}"`
            : "";
          return `<${tag} class="thp-admin-notification-item${unread ? " is-unread" : ""}${notice.attention ? " is-attention" : ""}" data-notification-id="${escapeHtml(notice.id)}"${attrs}>
            <span class="thp-admin-notification-indicator" aria-hidden="true"></span>
            <span class="thp-admin-notification-copy"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.detail)}</span></span>
            <span class="thp-admin-notification-time">${escapeHtml(notice.createdAt || (notice.attention ? "Needs attention" : ""))}</span>
          </${tag}>`;
        }).join("")
        : '<p class="thp-admin-notification-state">You’re all caught up.</p>';
      updateNotificationReadUi();
    } catch (error) {
      if (requestId !== notificationRequestId) return;
      notificationCount.hidden = true;
      notificationCount.textContent = "";
      notificationUnreadCount.textContent = "";
      notificationContent.innerHTML = `<p class="thp-admin-notification-state">${escapeHtml(error.message || "Unable to load admin notifications.")}</p>`;
    } finally {
      if (requestId === notificationRequestId) {
        notificationRefresh?.classList.remove("is-loading");
        notificationRefresh?.removeAttribute("aria-busy");
      }
    }
  };
  const setNotificationsOpen = (open) => {
    notificationPanel.hidden = !open;
    notificationToggle.setAttribute("aria-expanded", String(open));
    if (open) loadNotifications();
  };
  notificationToggle?.addEventListener("click", () => {
    setNotificationsOpen(notificationPanel.hidden);
  });
  notificationRefresh?.addEventListener("click", loadNotifications);
  notificationMarkRead?.addEventListener("click", async () => {
    const unreadIds = notificationIds.filter(
      (id) => notificationReadStates.get(id) !== true,
    );
    if (!unreadIds.length) return;

    notificationMarkRead.disabled = true;
    try {
      const response = await markAdminNotificationsRead(unreadIds);
      applyNotificationReadStates(response.read_states);
    } catch (error) {
      showToast(
        error?.message || "Unable to mark notifications as read.",
        true,
      );
      notificationMarkRead.disabled = false;
    }
  });
  notificationContent?.addEventListener("click", async (event) => {
    const notification = event.target.closest("[data-notification-id]");
    if (notification?.classList.contains("is-unread")) {
      try {
        const response = await markAdminNotificationsRead([
          notification.dataset.notificationId,
        ]);
        applyNotificationReadStates(response.read_states);
      } catch (error) {
        showToast(
          error?.message || "Unable to mark notification as read.",
          true,
        );
        return;
      }
    }
    const item = event.target.closest("[data-notification-module]");
    if (!item) return;
    setNotificationsOpen(false);
    openModule(item.dataset.notificationModule);
  });
  app.addEventListener("click", (event) => {
    if (!event.target.closest("#thp-admin-notifications")) setNotificationsOpen(false);
  });

  const sidebarToggleButton = app.querySelector("#thp-admin-sidebar-toggle");
  const menuButton = app.querySelector("#thp-admin-menu-button");
  const sidebar = app.querySelector("#thp-admin-sidebar");
  const shell = app.querySelector(".thp-admin-shell");
  let wasMobile = window.matchMedia("(max-width: 800px)").matches;

  const syncSidebarToggle = () => {
    const mobile = window.matchMedia("(max-width: 800px)").matches;
    if (mobile !== wasMobile) {
      sidebar?.classList.remove("is-open");
      wasMobile = mobile;
    }
    const isCollapsed = Boolean(shell?.classList.contains("is-collapsed"));
    const sidebarLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
    const isOpen = Boolean(sidebar?.classList.contains("is-open"));
    const mobileLabel = isOpen ? "Close navigation" : "Open navigation";

    sidebarToggleButton?.setAttribute("aria-expanded", String(!isCollapsed));
    sidebarToggleButton?.setAttribute("aria-label", sidebarLabel);
    if (sidebarToggleButton) sidebarToggleButton.title = sidebarLabel;

    menuButton?.setAttribute("aria-expanded", String(mobile && isOpen));
    menuButton?.setAttribute(
      "aria-label",
      mobile ? mobileLabel : "Open navigation",
    );
    if (menuButton) menuButton.title = mobile ? mobileLabel : "Open navigation";
  };

  sidebarToggleButton?.addEventListener("click", () => {
    const isCollapsed = shell?.classList.toggle("is-collapsed") || false;
    syncSidebarToggle();
    try {
      localStorage.setItem("thp-admin-sidebar-collapsed", String(isCollapsed));
    } catch {
      // The sidebar still works for this page when storage is unavailable.
    }
  });

  menuButton?.addEventListener("click", () => {
    if (!window.matchMedia("(max-width: 800px)").matches) return;
    sidebar?.classList.toggle("is-open");
    syncSidebarToggle();
  });

  window.addEventListener("resize", syncSidebarToggle, {
    signal: eventController.signal,
  });
}
