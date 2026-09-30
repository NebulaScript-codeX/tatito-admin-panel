import { getAdminSession, logoutAdminRemote } from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";

// Modules that have a real page behind them. Dashboard widgets use this to
// avoid linking to pages that have not been implemented yet.
const BUILT_MODULES = new Set(["dashboard"]);

export function isModuleAvailable(key) {
  return BUILT_MODULES.has(key);
}

export function openModule(key) {
  if (!isModuleAvailable(key)) return;

  window.location.hash =
    key === "dashboard" ? "#/admin/dashboard" : `#/admin/${key}`;
}

const sidebarGroups = [
  {
    title: "MAIN",
    items: [{ key: "dashboard", label: "Dashboard", icon: "▦" }],
  },
  {
    title: "PEOPLE",
    items: [
      { key: "users", label: "Users", icon: "♙" },
      { key: "staff", label: "Staff, Roles & Admin", icon: "♧" },
    ],
  },
  {
    title: "NETWORK",
    items: [{ key: "providers", label: "Healthcare Providers", icon: "⌂" }],
  },
  {
    title: "CARE",
    items: [
      { key: "doctors", label: "Doctors & Appointments", icon: "♙" },
      { key: "health_records", label: "Health Records", icon: "▤" },
    ],
  },
  {
    title: "COMMERCE",
    items: [
      { key: "pharmacy", label: "Pharmacy", icon: "✚" },
      { key: "lab_tests", label: "Lab Tests", icon: "⊙" },
      { key: "orders_payments", label: "Orders & Payments", icon: "▣" },
      { key: "health_plans", label: "Health Plans", icon: "♡" },
      {
        key: "coupons_offers_marketing",
        label: "Coupons, Offers & Marketing",
        icon: "%",
      },
    ],
  },
  {
    title: "GROWTH",
    items: [
      { key: "content", label: "Content", icon: "▧" },
      { key: "internships", label: "Internships", icon: "▱" },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { key: "support", label: "Support & Communication", icon: "◌" },
      { key: "ai_assistant", label: "AI Assistant", icon: "✦" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "◒" },
      { key: "uploaded_files", label: "Uploaded Files & Documents", icon: "▱" },
      { key: "settings", label: "Settings & Security", icon: "⚙" },
      { key: "audit_logs", label: "Audit Logs", icon: "◷" },
    ],
  },
];

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

  app.innerHTML = `
    <div class="thp-admin-shell">

      <aside class="thp-admin-sidebar" id="thp-admin-sidebar">

        <div class="thp-admin-brand">
          <div class="thp-admin-brand-mark">T+</div>

          <div class="thp-admin-brand-copy">
            <strong>Tatito Health+</strong>
            <span>ADMIN PORTAL</span>
          </div>
        </div>

        <nav class="thp-admin-navigation">
          ${sidebarGroups
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
                  type="button"
                >
                  <span class="thp-admin-nav-icon">${item.icon}</span>
                  <span>${item.label}</span>
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

      <section class="thp-admin-main">

        <header class="thp-admin-topbar">

          <button
            type="button"
            class="thp-admin-menu-button"
            id="thp-admin-menu-button"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div class="thp-admin-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search — coming soon"
              aria-label="Global search (coming soon)"
              disabled
            />
          </div>

          <div class="thp-admin-topbar-actions">

            <div class="thp-admin-profile">
              <div class="thp-admin-avatar">
                ${escapeHtml((admin.username || "A").charAt(0).toUpperCase())}
              </div>

              <div class="thp-admin-profile-info">
                <strong>${username}</strong>
                <span>${role}</span>
              </div>

              <button
                type="button"
                class="thp-admin-profile-menu"
                id="thp-admin-logout"
                title="Sign out"
                aria-label="Sign out"
              >
                ↪
              </button>
            </div>

          </div>

        </header>

        <main class="thp-admin-content">

          <div class="thp-admin-page-heading">
            <div class="thp-admin-page-title">
              <p class="thp-admin-eyebrow">TATITO HEALTH+</p>
              <h1>${pageTitles[activePage] || "Admin Panel"}</h1>
              ${subtitle ? `<p class="thp-admin-subtitle" id="thp-admin-subtitle">${escapeHtml(subtitle)}</p>` : ""}
            </div>

            <div class="thp-admin-page-actions">${actions}</div>
          </div>

          ${content}

        </main>

      </section>

    </div>
  `;

  setupAdminLayoutEvents(app);
}

function setupAdminLayoutEvents(app) {
  app.querySelectorAll("[data-admin-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.adminPage;

      if (page === "dashboard") {
        window.location.hash = "#/admin/dashboard";
        return;
      }

      if (page === "coupons_offers_marketing") {
        window.location.hash = "#/admin/coupons-offers-marketing";
        return;
      }

      if (typeof openModule === "function") {
        openModule(page);
        return;
      }

      console.log(`Admin module selected: ${page}`);
    });
  });

  const logoutButton = app.querySelector("#thp-admin-logout");

  logoutButton?.addEventListener("click", async () => {
    await logoutAdminRemote();
    window.location.hash = "#/admin/login";
  });

  const menuButton = app.querySelector("#thp-admin-menu-button");
  const sidebar = app.querySelector("#thp-admin-sidebar");

  menuButton?.addEventListener("click", () => {
    sidebar?.classList.toggle("is-open");
  });
}