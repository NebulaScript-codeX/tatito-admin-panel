import {
  getAdminSession,
  hasPermission,
  logoutAdminRemote,
} from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";

// Modules that have a real page behind them. Dashboard widgets use this to
// avoid linking to pages that have not been implemented yet.
const BUILT_MODULES = new Set([
  "dashboard",
  "users",
  "staff",
  "coupons_offers_marketing",
]);

export function isModuleAvailable(key) {
  return BUILT_MODULES.has(key);
}

export function openModule(key) {
  const routes = {
    dashboard: "dashboard",
    users: "users",
    staff: "staff",
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
  if (route) window.location.hash = `#/admin/${route}`;
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
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
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
              placeholder="Search patients, doctors, orders..."
              aria-label="Search patients, doctors, orders (coming soon)"
              disabled
            />
          </div>

          <div class="thp-admin-topbar-actions">
            <span class="thp-admin-notification" role="img" aria-label="Notifications" title="Notifications">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
              <span class="thp-admin-notification-dot" aria-hidden="true"></span>
            </span>

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
                </span>
                <svg class="thp-admin-profile-chevron" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
              </button>
              <div class="thp-admin-profile-dropdown" id="thp-admin-profile-menu" aria-hidden="true">
                <button type="button" class="thp-admin-logout-button" id="thp-admin-logout" title="Sign out">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>

        </header>

        <main class="thp-admin-content ${activePage === "users" ? "thp-admin-content-users" : ""} ${activePage === "staff" ? "thp-admin-content-staff" : ""}">

          <div class="thp-admin-page-heading ${activePage === "users" ? "thp-admin-users-page-heading" : ""} ${activePage === "staff" ? "thp-admin-staff-page-heading" : ""}">
            <div class="thp-admin-page-title">
              <p class="thp-admin-eyebrow">TATITO HEALTH+</p>
              <h1>${activePage === "users" ? '<span class="thp-admin-users-title-strong">Manage</span> <em>Users</em>' : activePage === "staff" ? '<span class="thp-admin-staff-title-strong">Staff &amp;</span> <em>Roles</em>' : pageTitles[activePage] || "Admin Panel"}</h1>
              ${subtitle ? `<p class="thp-admin-subtitle" id="thp-admin-subtitle">${escapeHtml(subtitle)}</p>` : ""}
            </div>

            <div class="thp-admin-page-actions">${actions}</div>
          </div>

          ${content}

        </main>

      </section>

    </div>
    <div class="toast" id="toast" role="status" aria-live="polite">
      <span class="toast-check" aria-hidden="true">&#10003;</span>
      <span id="toast-text">Updated</span>
    </div>
  `;

  setupAdminLayoutEvents(app);
}

function setupAdminLayoutEvents(app) {
  app._adminLayoutEvents?.abort();
  const eventController = new AbortController();
  app._adminLayoutEvents = eventController;

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

  logoutButton?.addEventListener("click", async () => {
    setProfileMenuOpen(false);
    await logoutAdminRemote();
    window.location.hash = "#/admin/login";
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
