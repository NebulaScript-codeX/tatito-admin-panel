import './admin.css'
import {
  adminLogin,
  getAdminSession,
  hasPermission,
  isAdminAuthenticated,
  refreshAdminSession,
} from './adminAuth.js'

import { renderAdminLayout } from './adminLayout.js'
import { doctors, getUsers } from '../data.js'
import {
  getCoupons,
  toggleCouponStatus,
  deleteCoupon,
  updateCoupon,
  createCoupon,
  createPromotion,
  createHealthcareProvider,
  deleteHealthcareProvider,
  deleteHealthcareProviderDocument,
  downloadHealthcareProviderDocument,
  getHealthcareProviders,
  getHealthcareProvider,
  deletePromotion,
  getPromotions,
  reviewHealthcareProviderDocument,
  runHealthcareProviderAction,
  updateHealthcareProvider,
  uploadHealthcareProviderDocument,
  updatePromotion,
  getFeaturedPromotions,
  createFeaturedPromotion,
  updateFeaturedPromotion,
  deleteFeaturedPromotion,
  toggleFeaturedPromotionStatus,
  moveFeaturedPromotionUp,
  moveFeaturedPromotionDown,

  getPromotionalContent,
  createPromotionalContent,
  updatePromotionalContent,
  deletePromotionalContent,
  togglePromotionalContentStatus,
  movePromotionalContentUp,
  movePromotionalContentDown,

    getAdminUsers,
  getAdminDoctors,
  updateAdminDoctor,
  deleteAdminDoctor,
  setAdminDoctorStatus,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  setAdminUserStatus,
  creditAdminWallet,
  debitAdminWallet,
  saveAdminRelationship,
  updateAdminRelationship,
  deleteAdminRelationship,
  getAdminStaff,
  createAdminStaff,
  updateAdminStaff,
  setAdminStaffActive,
  resetAdminStaffPassword,
  getAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  updateAdminRolePermissions,
  getAdminModules,
} from './adminApi.js'

import * as contentApi from "./adminApi.js";

// The dashboard lives in adminDashboard.js; re-exported so main.js keeps
// importing both admin pages from one place.
export { renderAdminDashboard } from './adminDashboard.js'

/* =========================================================
   ADMIN LOGIN
========================================================= */

export function renderAdminLogin(app) {
  app.innerHTML = `
    <main class="admin-login-page">

      <section class="admin-login-card">

        <div class="admin-login-brand">

          <img class="admin-login-logo" src="/tatito-logo.png" alt="Tatito Health+ logo" />

          <div>
            <h1>Tatito Health+</h1>
            <p>ADMIN PORTAL</p>
          </div>

        </div>


        <div class="admin-login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access the admin portal.</p>
        </div>


        <form id="admin-login-form">

          <div class="admin-form-group">

            <label for="admin-username">
              Username
            </label>

            <input
              id="admin-username"
              name="username"
              type="text"
              placeholder="Enter your username"
              autocomplete="username"
              required
            />

          </div>


          <div class="admin-form-group">

            <label for="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            />

          </div>


          <p
            id="admin-login-error"
            class="admin-login-error"
            hidden
          ></p>


          <button
            id="admin-login-button"
            type="submit"
            class="admin-login-button"
          >
            Sign In
          </button>

        </form>


        <div class="admin-login-footer">
          <span>Secure Admin Access</span>
        </div>

      </section>

    </main>
  `

  const form = document.querySelector('#admin-login-form')
  const button = document.querySelector('#admin-login-button')
  const errorElement = document.querySelector('#admin-login-error')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const username = document
      .querySelector('#admin-username')
      .value
      .trim()

    const password =
      document.querySelector('#admin-password').value

    errorElement.hidden = true
    errorElement.textContent = ''

    button.disabled = true
    button.textContent = 'Signing in...'

    try {
      const session = await adminLogin(username, password);
      const accessibleRoute = [
        ["dashboard", "dashboard"],
        ["users", "users"],
        ["staff", "staff"],
        ["providers", "providers"],
        ["coupons_offers_marketing", "coupons-offers-marketing"],
      ].find(([module]) => session.admin?.permissions?.[module]?.view);
      window.location.hash = accessibleRoute
        ? `#/admin/${accessibleRoute[1]}`
        : "#/admin/access-denied";
    } catch (error) {
      errorElement.textContent =
        error.message || 'Unable to sign in.'

      errorElement.hidden = false
    } finally {
      button.disabled = false
      button.textContent = 'Sign In'
    }
  })
}

export function renderAdminAccessDenied(app) {
  if (!isAdminAuthenticated()) {
    window.location.hash = "#/admin/login";
    return;
  }

  renderAdminLayout(
    app,
    "access-denied",
    `<section class="thp-admin-empty-state">
      <div class="thp-admin-empty-icon">!</div>
      <strong>Access restricted</strong>
      <span>Your role does not have permission to view this module.</span>
    </section>`,
  );
}

export function renderAdminModulePlaceholder(app, moduleKey) {
  if (moduleKey === "content") {
    return renderAdminContent(app);
  }

  renderAdminLayout(
    app,
    moduleKey,
    `
      <section class="thp-admin-empty-state" role="status">
        <strong>Coming soon</strong>
        <span>This admin module does not have a page yet.</span>
      </section>
    `,
  );
}

export async function renderAdminContent(app) {
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

  if (!window.location.hash.startsWith("#/admin/content")) {
    return;
  }

  if (!hasPermission("content", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  let blogs = [];
  let categories = [];
  let tags = [];
  let banners = [];
  let announcements = [];
  let featuredServices = [];
  let faqs = [];
  let testimonials = [];
  let trustStats = [];
  let websitePages = [];
  let cities = [];
  let loading = true;
  let errorMessage = "";
  let search = "";
  let status = "";
  let category = "";
  let page = 1;
  const pageSize = 10;

  const escapeHtml = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const showToast = (message, type = "success") => {
    const existing = document.querySelector(".thp-content-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = `thp-content-toast thp-content-toast-${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: "99999",
      padding: "12px 18px",
      borderRadius: "10px",
      background: type === "error" ? "#b42318" : "#067647",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
    });

    document.body.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3000);
  };

  const loadData = async () => {
    loading = true;
    errorMessage = "";

    try {
      const [
        blogResponse,
        categoryResponse,
        tagResponse,
        homepageBannerResponse,
        announcementResponse,
        featuredServiceResponse,
        faqResponse,
        testimonialResponse,
        trustStatResponse,
        websitePageResponse,
        cityResponse,
      ] = await Promise.all([
        contentApi.getContentBlogs({ search, status, category }),
        contentApi.getContentBlogCategories({ is_active: true }),
        contentApi.getContentBlogTags({ is_active: true }),
        contentApi.getContentHomepageBanners(),
        contentApi.getContentAnnouncements(),
        contentApi.getContentFeaturedServices(),
        contentApi.getContentFaqs(),
        contentApi.getContentTestimonials(),
        contentApi.getContentTrustStats(),
        contentApi.getContentWebsitePages(),
        contentApi.getContentCities(),
      ]);

      blogs = Array.isArray(blogResponse)
        ? blogResponse
        : blogResponse?.results || [];

      categories = Array.isArray(categoryResponse)
        ? categoryResponse
        : categoryResponse?.results || [];

      tags = Array.isArray(tagResponse)
        ? tagResponse
        : tagResponse?.results || [];

      banners = Array.isArray(homepageBannerResponse)
        ? homepageBannerResponse
        : homepageBannerResponse?.results || [];

      announcements = Array.isArray(announcementResponse)
        ? announcementResponse
        : announcementResponse?.results || [];

      featuredServices = Array.isArray(featuredServiceResponse)
        ? featuredServiceResponse
        : featuredServiceResponse?.results || [];

      faqs = Array.isArray(faqResponse)
        ? faqResponse
        : faqResponse?.results || [];

      testimonials = Array.isArray(testimonialResponse)
        ? testimonialResponse
        : testimonialResponse?.results || [];

      trustStats = Array.isArray(trustStatResponse)
        ? trustStatResponse
        : trustStatResponse?.results || [];

      websitePages = Array.isArray(websitePageResponse)
        ? websitePageResponse
        : websitePageResponse?.results || [];

      cities = Array.isArray(cityResponse)
        ? cityResponse
        : cityResponse?.results || [];

      blogs = Array.isArray(blogResponse)
        ? blogResponse
        : blogResponse?.results || [];

      categories = Array.isArray(categoryResponse)
        ? categoryResponse
        : categoryResponse?.results || [];
    } catch (error) {
      console.error("Module 12 blog loading failed:", error);
      errorMessage = "Unable to load blogs. Please check the backend connection.";
    } finally {
      loading = false;
      render();
    }
  };

  const render = () => {
    const totalPages = Math.max(1, Math.ceil(blogs.length / pageSize));

    if (page > totalPages) {
      page = totalPages;
    }

    const start = (page - 1) * pageSize;
    const visibleBlogs = blogs.slice(start, start + pageSize);

    const categoryOptions = categories
      .map(
        (item) =>
          `<option value="${escapeHtml(item.id)}" ${
            String(category) === String(item.id) ? "selected" : ""
          }>
            ${escapeHtml(item.name)}
          </option>`,
      )
      .join("");

    let content = "";

    if (loading) {
      content = `
        <div class="thp-admin-empty-state">
          <strong>Loading blogs...</strong>
          <span>Please wait while the content data is loaded.</span>
        </div>
      `;
    } else if (errorMessage) {
      content = `
        <div class="thp-admin-empty-state">
          <strong>Unable to load blogs</strong>
          <span>${escapeHtml(errorMessage)}</span>
          <button type="button" class="thp-admin-button thp-admin-button-primary" id="content-retry">
            Retry
          </button>
        </div>
      `;
    } else if (!visibleBlogs.length) {
      content = `
        <div class="thp-admin-empty-state">
          <strong>No blogs found</strong>
          <span>
            ${
              search || status || category
                ? "Try changing your filters."
                : "Create your first blog to get started."
            }
          </span>
          ${
            hasPermission("content", "create")
              ? `
                <button
                  type="button"
                  class="thp-admin-button thp-admin-button-primary"
                  id="content-add-blog-empty"
                >
                  Add Blog
                </button>
              `
              : ""
          }
        </div>
      `;
    } else {
      content = `
        <div class="thp-admin-table-wrap">
          <table class="thp-admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Author</th>
                <th>Status</th>
                <th>Publish Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              ${visibleBlogs
                .map(
                  (blog) => `
                    <tr>
                      <td>
                        <div style="font-weight:600;">
                          ${escapeHtml(blog.title)}
                        </div>
                        <div style="font-size:12px;opacity:.65;">
                          /${escapeHtml(blog.slug || "")}
                        </div>
                      </td>

                      <td>
                        ${escapeHtml(blog.category_name || "—")}
                      </td>

                      <td>
                        ${escapeHtml(blog.author_name || "—")}
                      </td>

                      <td>
                        <span class="thp-admin-status-badge ${
                          blog.status === "published"
                            ? "thp-admin-status-success"
                            : "thp-admin-status-warning"
                        }">
                          ${escapeHtml(blog.status || "draft")}
                        </span>
                      </td>

                      <td>
                        ${
                          blog.publish_date
                            ? new Date(blog.publish_date).toLocaleDateString()
                            : "—"
                        }
                      </td>

                      <td>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                          ${
                            hasPermission("content", "edit")
                              ? `
                                <button
                                  type="button"
                                  class="thp-admin-button"
                                  data-blog-edit="${blog.id}"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  class="thp-admin-button"
                                  data-blog-toggle="${blog.id}"
                                >
                                  ${
                                    blog.status === "published"
                                      ? "Unpublish"
                                      : "Publish"
                                  }
                                </button>
                              `
                              : ""
                          }

                          ${
                            hasPermission("content", "delete")
                              ? `
                                <button
                                  type="button"
                                  class="thp-admin-button"
                                  data-blog-delete="${blog.id}"
                                >
                                  Delete
                                </button>
                              `
                              : ""
                          }
                        </div>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
          <span style="font-size:13px;opacity:.7;">
            Showing ${start + 1}–${Math.min(
              start + visibleBlogs.length,
              blogs.length,
            )} of ${blogs.length}
          </span>

          <div style="display:flex;gap:8px;">
            <button
              type="button"
              class="thp-admin-button"
              id="content-prev"
              ${page <= 1 ? "disabled" : ""}
            >
              Previous
            </button>

            <span style="padding:8px 12px;font-size:13px;">
              Page ${page} of ${totalPages}
            </span>

            <button
              type="button"
              class="thp-admin-button"
              id="content-next"
              ${page >= totalPages ? "disabled" : ""}
            >
              Next
            </button>
          </div>
        </div>
      `;
    }

    renderAdminLayout(
      app,
      "content",
      `
        <section class="thp-admin-page">
          <div class="thp-admin-page-header">
            <div>
              <h1>Content</h1>
              <p>
                Manage website blogs, banners, announcements, FAQs,
                testimonials and other public content.
              </p>
            </div>

            ${
              hasPermission("content", "create")
                ? `
                  <button
                    type="button"
                    class="thp-admin-button thp-admin-button-primary"
                    id="content-add-blog"
                  >
                    + Add Blog
                  </button>
                `
                : ""
            }
          </div>

          <section class="thp-admin-card">
            <div class="thp-admin-toolbar">
              <div class="thp-admin-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="m20 20-4-4"></path>
                </svg>

                <input
                  id="content-search"
                  type="search"
                  placeholder="Search blogs..."
                  value="${escapeHtml(search)}"
                />
              </div>

              <select id="content-status-filter">
                <option value="">All statuses</option>
                <option value="draft" ${
                  status === "draft" ? "selected" : ""
                }>Draft</option>
                <option value="published" ${
                  status === "published" ? "selected" : ""
                }>Published</option>
              </select>

              <select id="content-category-filter">
                <option value="">All categories</option>
                ${categoryOptions}
              </select>
            </div>

            <div style="margin-top:20px;">
              <h2 style="margin:0 0 4px;">Blogs</h2>
              <p style="margin:0;opacity:.7;font-size:13px;">
                Create and manage public Health Blogs content.
              </p>
            </div>

            <div style="margin-top:20px;">
              ${content}
            </div>

            <div class="thp-content-taxonomy-grid">

              <section class="thp-admin-card">
                <div class="thp-admin-page-header">
                  <div>
                    <h2>Blog Categories</h2>
                    <p>Manage categories used by Health Blogs.</p>
                  </div>

                  ${
                    hasPermission("content", "create")
                      ? `
                        <button
                          type="button"
                          class="thp-admin-button thp-admin-button-primary"
                          id="content-add-category"
                        >
                          + Add Category
                        </button>
                      `
                      : ""
                  }
                </div>

                ${
                  categories.length
                    ? `
                      <div class="thp-admin-table-wrap">
                        <table class="thp-admin-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            ${categories
                              .map(
                                (item) => `
                                  <tr>
                                    <td>${escapeHtml(item.name)}</td>

                                    <td>
                                      <span class="thp-admin-status-badge ${
                                        item.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }">
                                        ${item.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </td>

                                    <td>
                                      ${
                                        hasPermission("content", "edit")
                                          ? `
                                            <button
                                              type="button"
                                              class="thp-admin-button"
                                              data-category-edit="${item.id}"
                                            >
                                              Edit
                                            </button>
                                          `
                                          : ""
                                      }

                                      ${
                                        hasPermission("content", "delete")
                                          ? `
                                            <button
                                              type="button"
                                              class="thp-admin-button"
                                              data-category-delete="${item.id}"
                                            >
                                              Delete
                                            </button>
                                          `
                                          : ""
                                      }
                                    </td>
                                  </tr>
                                `,
                              )
                              .join("")}
                          </tbody>
                        </table>
                      </div>
                    `
                    : `
                      <div class="thp-admin-empty-state">
                        <strong>No categories yet</strong>
                        <span>Create a category for your Health Blogs.</span>
                      </div>
                    `
                }
              </section>

              <section class="thp-admin-card">
                <div class="thp-admin-page-header">
                  <div>
                    <h2>Blog Tags</h2>
                    <p>Manage tags used by Health Blogs.</p>
                  </div>

                  ${
                    hasPermission("content", "create")
                      ? `
                        <button
                          type="button"
                          class="thp-admin-button thp-admin-button-primary"
                          id="content-add-tag"
                        >
                          + Add Tag
                        </button>
                      `
                      : ""
                  }
                </div>

                ${
                  tags.length
                    ? `
                      <div class="thp-admin-table-wrap">
                        <table class="thp-admin-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            ${tags
                              .map(
                                (item) => `
                                  <tr>
                                    <td>${escapeHtml(item.name)}</td>

                                    <td>
                                      <span class="thp-admin-status-badge ${
                                        item.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }">
                                        ${item.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </td>

                                    <td>
                                      ${
                                        hasPermission("content", "edit")
                                          ? `
                                            <button
                                              type="button"
                                              class="thp-admin-button"
                                              data-tag-edit="${item.id}"
                                            >
                                              Edit
                                            </button>
                                          `
                                          : ""
                                      }

                                      ${
                                        hasPermission("content", "delete")
                                          ? `
                                            <button
                                              type="button"
                                              class="thp-admin-button"
                                              data-tag-delete="${item.id}"
                                            >
                                              Delete
                                            </button>
                                          `
                                          : ""
                                      }
                                    </td>
                                  </tr>
                                `,
                              )
                              .join("")}
                          </tbody>
                        </table>
                      </div>
                    `
                    : `
                      <div class="thp-admin-empty-state">
                        <strong>No tags yet</strong>
                        <span>Create tags to organize your Health Blogs.</span>
                      </div>
                    `
                }
              </section>

            </div>

            <section class="thp-admin-card thp-content-section-card">
              <div class="thp-admin-page-header">
                <div>
                  <h2>Homepage Banners</h2>
                  <p>Manage promotional banners displayed on the public homepage.</p>
                </div>

                ${
                  hasPermission("content", "create")
                    ? `
                      <button
                        type="button"
                        class="thp-admin-button thp-admin-button-primary"
                        id="content-add-banner"
                      >
                        + Add Banner
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                banners.length
                  ? `
                    <div class="thp-admin-table-wrap">
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${banners
                            .map(
                              (banner) => `
                                <tr>
                                  <td>
                                    <strong>${escapeHtml(banner.title || "—")}</strong>
                                    ${
                                      banner.description
                                        ? `<div class="thp-content-muted">${escapeHtml(
                                            banner.description,
                                          )}</div>`
                                        : ""
                                    }
                                  </td>

                                  <td>${escapeHtml(banner.display_order ?? 0)}</td>

                                  <td>
                                    <span class="thp-admin-status-badge ${
                                      banner.is_active
                                        ? "thp-admin-status-success"
                                        : "thp-admin-status-warning"
                                    }">
                                      ${banner.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>

                                  <td>
                                    ${
                                      hasPermission("content", "edit")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-banner-edit="${banner.id}"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-banner-toggle="${banner.id}"
                                          >
                                            ${banner.is_active ? "Deactivate" : "Activate"}
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-banner-up="${banner.id}"
                                          >
                                            ↑
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-banner-down="${banner.id}"
                                          >
                                            ↓
                                          </button>
                                        `
                                        : ""
                                    }

                                    ${
                                      hasPermission("content", "delete")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-banner-delete="${banner.id}"
                                          >
                                            Delete
                                          </button>
                                        `
                                        : ""
                                    }
                                  </td>
                                </tr>
                              `,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>
                  `
                  : `
                    <div class="thp-admin-empty-state">
                      <strong>No homepage banners yet</strong>
                      <span>Create your first homepage banner.</span>
                    </div>
                  `
              }
            </section>

            <section class="thp-admin-card thp-content-section-card">

              <div class="thp-admin-page-header">
                <div>
                  <h2>Announcements</h2>
                  <p>Manage announcements displayed across the public website.</p>
                </div>

                ${
                  hasPermission("content", "create")
                    ? `
                      <button
                        type="button"
                        class="thp-admin-button thp-admin-button-primary"
                        id="content-add-announcement"
                      >
                        + Add Announcement
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                announcements.length
                  ? `
                    <div class="thp-admin-table-wrap">
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${announcements
                            .map(
                              (item) => `
                                <tr>

                                  <td>
                                    <strong>
                                      ${escapeHtml(item.title || "—")}
                                    </strong>

                                    ${
                                      item.message
                                        ? `
                                          <div class="thp-content-muted">
                                            ${escapeHtml(item.message)}
                                          </div>
                                        `
                                        : ""
                                    }
                                  </td>

                                  <td>
                                    ${escapeHtml(item.display_order ?? 0)}
                                  </td>

                                  <td>
                                    <span
                                      class="thp-admin-status-badge ${
                                        item.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }"
                                    >
                                      ${item.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>

                                  <td>

                                    ${
                                      hasPermission("content", "edit")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-announcement-edit="${item.id}"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-announcement-toggle="${item.id}"
                                          >
                                            ${
                                              item.is_active
                                                ? "Deactivate"
                                                : "Activate"
                                            }
                                          </button>
                                        `
                                        : ""
                                    }

                                    ${
                                      hasPermission("content", "delete")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-announcement-delete="${item.id}"
                                          >
                                            Delete
                                          </button>
                                        `
                                        : ""
                                    }

                                  </td>

                                </tr>
                              `,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>
                  `
                  : `
                    <div class="thp-admin-empty-state">
                      <strong>No announcements yet</strong>
                      <span>
                        Create your first website announcement.
                      </span>
                    </div>
                  `
              }

            </section>

            <section class="thp-admin-card thp-content-section-card">

              <div class="thp-admin-page-header">
                <div>
                  <h2>Featured Services</h2>
                  <p>Manage featured services displayed on the public website.</p>
                </div>

                ${
                  hasPermission("content", "create")
                    ? `
                      <button
                        type="button"
                        class="thp-admin-button thp-admin-button-primary"
                        id="content-add-featured-service"
                      >
                        + Add Service
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                featuredServices.length
                  ? `
                    <div class="thp-admin-table-wrap">
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${featuredServices
                            .map(
                              (item) => `
                                <tr>

                                  <td>
                                    <strong>
                                      ${escapeHtml(item.title || "—")}
                                    </strong>

                                    ${
                                      item.description
                                        ? `
                                          <div class="thp-content-muted">
                                            ${escapeHtml(item.description)}
                                          </div>
                                        `
                                        : ""
                                    }
                                  </td>

                                  <td>
                                    ${escapeHtml(item.display_order ?? 0)}
                                  </td>

                                  <td>
                                    <span
                                      class="thp-admin-status-badge ${
                                        item.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }"
                                    >
                                      ${item.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>

                                  <td>

                                    ${
                                      hasPermission("content", "edit")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-featured-service-edit="${item.id}"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-featured-service-toggle="${item.id}"
                                          >
                                            ${
                                              item.is_active
                                                ? "Deactivate"
                                                : "Activate"
                                            }
                                          </button>
                                        `
                                        : ""
                                    }

                                    ${
                                      hasPermission("content", "delete")
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-featured-service-delete="${item.id}"
                                          >
                                            Delete
                                          </button>
                                        `
                                        : ""
                                    }

                                  </td>

                                </tr>
                              `,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>
                  `
                  : `
                    <div class="thp-admin-empty-state">
                      <strong>No featured services yet</strong>
                      <span>Create your first featured service.</span>
                    </div>
                  `
              }

            </section>

            <section class="thp-admin-card thp-content-section-card">

              <div class="thp-admin-page-header">
                <div>
                  <h2>FAQs</h2>
                  <p>Manage frequently asked questions shown on the public website.</p>
                </div>

                ${
                  hasPermission("content", "create")
                    ? `
                      <button
                        type="button"
                        class="thp-admin-button thp-admin-button-primary"
                        id="content-add-faq"
                      >
                        + Add FAQ
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                faqs.length
                  ? `
                    <div class="thp-admin-table-wrap">
                      <table class="thp-admin-table">

                        <thead>
                          <tr>
                            <th>Question</th>
                            <th>Category</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${faqs
                            .map(
                              (faq) => `
                                <tr>

                                  <td>
                                    <strong>
                                      ${escapeHtml(
                                        faq.question || "—",
                                      )}
                                    </strong>

                                    ${
                                      faq.answer
                                        ? `
                                          <div class="thp-content-muted">
                                            ${escapeHtml(
                                              faq.answer,
                                            ).slice(0, 100)}
                                            ${
                                              faq.answer.length > 100
                                                ? "..."
                                                : ""
                                            }
                                          </div>
                                        `
                                        : ""
                                    }
                                  </td>

                                  <td>
                                    ${escapeHtml(
                                      String(
                                        faq.category || "general",
                                      ).replace(
                                        /^./,
                                        (char) =>
                                          char.toUpperCase(),
                                      ),
                                    )}
                                  </td>

                                  <td>
                                    ${escapeHtml(
                                      faq.display_order ?? 0,
                                    )}
                                  </td>

                                  <td>
                                    <span
                                      class="thp-admin-status-badge ${
                                        faq.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }"
                                    >
                                      ${
                                        faq.is_active
                                          ? "Active"
                                          : "Inactive"
                                      }
                                    </span>
                                  </td>

                                  <td>

                                    ${
                                      hasPermission(
                                        "content",
                                        "edit",
                                      )
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-faq-edit="${faq.id}"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-faq-toggle="${faq.id}"
                                          >
                                            ${
                                              faq.is_active
                                                ? "Deactivate"
                                                : "Activate"
                                            }
                                          </button>
                                        `
                                        : ""
                                    }

                                    ${
                                      hasPermission(
                                        "content",
                                        "delete",
                                      )
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-faq-delete="${faq.id}"
                                          >
                                            Delete
                                          </button>
                                        `
                                        : ""
                                    }

                                  </td>

                                </tr>
                              `,
                            )
                            .join("")}
                        </tbody>

                      </table>
                    </div>
                  `
                  : `
                    <div class="thp-admin-empty-state">
                      <strong>No FAQs yet</strong>
                      <span>
                        Create your first frequently asked question.
                      </span>
                    </div>
                  `
              }

            </section>

            <section class="thp-admin-card thp-content-section-card">

              <div class="thp-admin-page-header">
                <div>
                  <h2>Testimonials</h2>
                  <p>Manage customer testimonials displayed on the public website.</p>
                </div>

                ${
                  hasPermission("content", "create")
                    ? `
                      <button
                        type="button"
                        class="thp-admin-button thp-admin-button-primary"
                        id="content-add-testimonial"
                      >
                        + Add Testimonial
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                testimonials.length
                  ? `
                    <div class="thp-admin-table-wrap">
                      <table class="thp-admin-table">

                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Rating</th>
                            <th>Section</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${testimonials
                            .map(
                              (item) => `
                                <tr>

                                  <td>
                                    <strong>
                                      ${escapeHtml(item.name || "—")}
                                    </strong>

                                    ${
                                      item.text
                                        ? `
                                          <div class="thp-content-muted">
                                            ${escapeHtml(
                                              item.text,
                                            ).slice(0, 100)}
                                            ${
                                              item.text.length > 100
                                                ? "..."
                                                : ""
                                            }
                                          </div>
                                        `
                                        : ""
                                    }
                                  </td>

                                  <td>
                                    ${escapeHtml(
                                      item.rating ?? 0,
                                    )}/5
                                  </td>

                                  <td>
                                    ${escapeHtml(
                                      item.section || "—",
                                    )}
                                  </td>

                                  <td>
                                    <span
                                      class="thp-admin-status-badge ${
                                        item.is_active
                                          ? "thp-admin-status-success"
                                          : "thp-admin-status-warning"
                                      }"
                                    >
                                      ${
                                        item.is_active
                                          ? "Active"
                                          : "Inactive"
                                      }
                                    </span>
                                  </td>

                                  <td>

                                    ${
                                      hasPermission(
                                        "content",
                                        "edit",
                                      )
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-testimonial-edit="${item.id}"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-testimonial-toggle="${item.id}"
                                          >
                                            ${
                                              item.is_active
                                                ? "Deactivate"
                                                : "Activate"
                                            }
                                          </button>
                                        `
                                        : ""
                                    }

                                    ${
                                      hasPermission(
                                        "content",
                                        "delete",
                                      )
                                        ? `
                                          <button
                                            type="button"
                                            class="thp-admin-button"
                                            data-testimonial-delete="${item.id}"
                                          >
                                            Delete
                                          </button>
                                        `
                                        : ""
                                    }

                                  </td>

                                </tr>
                              `,
                            )
                            .join("")}
                        </tbody>

                      </table>
                    </div>
                  `
                  : `
                    <div class="thp-admin-empty-state">
                      <strong>No testimonials yet</strong>
                      <span>
                        Create your first testimonial.
                      </span>
                    </div>
                  `
              }

            </section>

            <section class="thp-admin-card thp-content-section-card">
              <div class="thp-admin-card-header">
                <div>
                  <h3>Trust Stats</h3>
                  <p>Manage the trust numbers displayed on the public website.</p>
                </div>

                <button
                  type="button"
                  class="thp-admin-button thp-admin-button-primary"
                  id="content-add-trust-stat"
                >
                  + Add Trust Stat
                </button>
              </div>

              <div class="thp-admin-table-wrap">
                ${
                  trustStats.length
                    ? `
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>Value</th>
                            <th>Label</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${trustStats
                            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                            .map(
                              (stat) => `
                                <tr>
                                  <td>${escapeHtml(stat.value || "-")}</td>
                                  <td>${escapeHtml(stat.label || "-")}</td>
                                  <td>${stat.display_order ?? 0}</td>

                                  <td>
                                    <span class="thp-admin-status ${
                                      stat.is_active
                                        ? "thp-admin-status-success"
                                        : "thp-admin-status-muted"
                                    }">
                                      ${stat.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-trust-stat-edit="${stat.id}"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-trust-stat-toggle="${stat.id}"
                                    >
                                      ${stat.is_active ? "Deactivate" : "Activate"}
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-danger"
                                      data-trust-stat-delete="${stat.id}"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    `
                    : `
                      <div class="thp-admin-empty-state">
                        No trust stats found.
                      </div>
                    `
                }
              </div>
            </section>

            <section class="thp-admin-card thp-content-section-card">
              <div class="thp-admin-card-header">
                <div>
                  <h3>Website Pages</h3>
                  <p>Manage configurable public website pages.</p>
                </div>

                <button
                  type="button"
                  class="thp-admin-button thp-admin-button-primary"
                  id="content-add-website-page"
                >
                  + Add Page
                </button>
              </div>

              <div class="thp-admin-table-wrap">
                ${
                  websitePages.length
                    ? `
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Slug</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${websitePages
                            .map(
                              (page) => `
                                <tr>
                                  <td>${escapeHtml(page.title || "-")}</td>

                                  <td>
                                    ${escapeHtml(page.page_type || "-")}
                                  </td>

                                  <td>
                                    ${escapeHtml(page.slug || "-")}
                                  </td>

                                  <td>
                                    <span class="thp-admin-status ${
                                      page.is_published
                                        ? "thp-admin-status-success"
                                        : "thp-admin-status-muted"
                                    }">
                                      ${page.is_published ? "Published" : "Unpublished"}
                                    </span>
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-website-page-edit="${page.id}"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-website-page-toggle="${page.id}"
                                    >
                                      ${page.is_published ? "Unpublish" : "Publish"}
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-danger"
                                      data-website-page-delete="${page.id}"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    `
                    : `
                      <div class="thp-admin-empty-state">
                        No website pages found.
                      </div>
                    `
                }
              </div>
            </section>

            <section class="thp-admin-card thp-content-section-card">
              <div class="thp-admin-card-header">
                <div>
                  <h3>Cities</h3>
                  <p>Manage cities displayed across the public website.</p>
                </div>

                <button
                  type="button"
                  class="thp-admin-button thp-admin-button-primary"
                  id="content-add-city"
                >
                  + Add City
                </button>
              </div>

              <div class="thp-admin-table-wrap">
                ${
                  cities.length
                    ? `
                      <table class="thp-admin-table">
                        <thead>
                          <tr>
                            <th>City</th>
                            <th>State</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          ${cities
                            .sort(
                              (a, b) =>
                                (a.display_order || 0) - (b.display_order || 0)
                            )
                            .map(
                              (city) => `
                                <tr>
                                  <td>${escapeHtml(city.name || "-")}</td>
                                  <td>${escapeHtml(city.state || "-")}</td>
                                  <td>${city.display_order ?? 0}</td>

                                  <td>
                                    <span class="thp-admin-status ${
                                      city.is_active
                                        ? "thp-admin-status-success"
                                        : "thp-admin-status-muted"
                                    }">
                                      ${city.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-city-edit="${city.id}"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-secondary"
                                      data-city-toggle="${city.id}"
                                    >
                                      ${city.is_active ? "Deactivate" : "Activate"}
                                    </button>

                                    <button
                                      type="button"
                                      class="thp-admin-button thp-admin-button-danger"
                                      data-city-delete="${city.id}"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    `
                    : `
                      <div class="thp-admin-empty-state">
                        No cities found.
                      </div>
                    `
                }
              </div>
            </section>

            
          </section>
        </section>
      `,
    );

    window.openTaxonomyForm = async (type, item = null) => {
      const editing = Boolean(item);
      const isCategory = type === "category";

      const overlay = document.createElement("div");
      overlay.className = "thp-admin-modal-overlay";

      overlay.innerHTML = `
        <div class="thp-admin-modal" role="dialog" aria-modal="true">
          <div class="thp-admin-modal-header">
            <div>
              <h2>${editing ? "Edit" : "Add"} ${
              isCategory ? "Category" : "Tag"
            }</h2>
              <p>Manage your blog ${isCategory ? "category" : "tag"}.</p>
            </div>

            <button type="button" class="thp-admin-button" id="taxonomy-close">
              ×
            </button>
          </div>

          <form id="taxonomy-form">
            <div class="thp-admin-form-grid">
              <label style="grid-column:1/-1;">
                <span>Name *</span>
                <input
                  name="name"
                  required
                  value="${escapeHtml(item?.name || "")}"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea name="description" rows="4">${
                  escapeHtml(item?.description || "")
                }</textarea>
              </label>

              <label>
                <span>Status</span>
                <select name="is_active">
                  <option value="true" ${
                    item?.is_active !== false ? "selected" : ""
                  }>
                    Active
                  </option>
                  <option value="false" ${
                    item?.is_active === false ? "selected" : ""
                  }>
                    Inactive
                  </option>
                </select>
              </label>
            </div>

            <div class="thp-admin-modal-actions">
              <button type="button" class="thp-admin-button" id="taxonomy-cancel">
                Cancel
              </button>

              <button
                type="submit"
                class="thp-admin-button thp-admin-button-primary"
              >
                ${editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      const close = () => overlay.remove();

      overlay.querySelector("#taxonomy-close").addEventListener("click", close);
      overlay.querySelector("#taxonomy-cancel").addEventListener("click", close);

      overlay.querySelector("#taxonomy-form").addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const payload = {
          name: formData.get("name"),
          is_active: formData.get("is_active") === "true",
        };

        if (isCategory) {
          payload.description = formData.get("description") || "";
        }

        try {
          if (isCategory) {
            if (editing) {
              await contentApi.updateContentBlogCategory(item.id, payload);
            } else {
              await contentApi.createContentBlogCategory(payload);
            }
          } else {
            if (editing) {
              await contentApi.updateContentBlogTag(item.id, payload);
            } else {
              await contentApi.createContentBlogTag(payload);
            }
          }

          close();
          showToast(
            `${isCategory ? "Category" : "Tag"} ${
              editing ? "updated" : "created"
            } successfully.`,
          );

          await loadData();
        } catch (error) {
          console.error("Taxonomy save failed:", error);

          showToast(
            error?.message ||
              `Unable to save the ${isCategory ? "category" : "tag"}.`,
            "error",
          );
        }
      });
    };

    bindEvents();
  };

  const openBlogForm = (blog = null) => {
    const editing = Boolean(blog);

    const overlay = document.createElement("div");
    overlay.className = "thp-admin-modal-overlay";

    overlay.innerHTML = `
      <div class="thp-admin-modal" role="dialog" aria-modal="true">
        <div class="thp-admin-modal-header">
          <div>
            <h2>${editing ? "Edit Blog" : "Add Blog"}</h2>
            <p>
              ${
                editing
                  ? "Update the selected blog."
                  : "Create a new website blog."
              }
            </p>
          </div>

          <button type="button" class="thp-admin-button" id="content-form-close">
            ×
          </button>
        </div>

        <form id="content-blog-form">
          <div class="thp-admin-form-grid">

            <label>
              <span>Title *</span>
              <input
                name="title"
                required
                value="${escapeHtml(blog?.title || "")}"
              />
            </label>

            <label>
              <span>Category</span>
              <select name="category">
                <option value="">No category</option>
                ${categories
                  .map(
                    (item) =>
                      `<option value="${item.id}" ${
                        String(blog?.category || "") === String(item.id)
                          ? "selected"
                          : ""
                      }>
                        ${escapeHtml(item.name)}
                      </option>`,
                  )
                  .join("")}
              </select>
            </label>

            <label style="grid-column:1/-1;">
              <span>Cover Image URL</span>
              <input
                name="cover_image"
                type="url"
                value="${escapeHtml(blog?.cover_image || "")}"
                placeholder="https://..."
              />
            </label>

            <label style="grid-column:1/-1;">
              <span>Content *</span>
              <textarea
                name="content"
                rows="10"
                required
              >${escapeHtml(blog?.content || "")}</textarea>
            </label>

            <label>
              <span>SEO Title</span>
              <input
                name="seo_title"
                value="${escapeHtml(blog?.seo_title || "")}"
              />
            </label>

            <label>
              <span>SEO Description</span>
              <textarea
                name="seo_description"
                rows="3"
              >${escapeHtml(blog?.seo_description || "")}</textarea>
            </label>

            <label>
              <span>Status</span>
              <select name="status">
                <option value="draft" ${
                  (blog?.status || "draft") === "draft"
                    ? "selected"
                    : ""
                }>Draft</option>
                <option value="published" ${
                  blog?.status === "published" ? "selected" : ""
                }>Published</option>
              </select>
            </label>

          </div>

          <div class="thp-admin-modal-actions">
            <button type="button" class="thp-admin-button" id="content-form-cancel">
              Cancel
            </button>

            <button
              type="submit"
              class="thp-admin-button thp-admin-button-primary"
            >
              ${editing ? "Save Changes" : "Create Blog"}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector("#content-form-close").addEventListener("click", close);
    overlay.querySelector("#content-form-cancel").addEventListener("click", close);

    overlay.querySelector("#content-blog-form").addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);

      const payload = {
        title: formData.get("title"),
        category: formData.get("category") || null,
        cover_image: formData.get("cover_image") || "",
        content: formData.get("content"),
        seo_title: formData.get("seo_title") || "",
        seo_description: formData.get("seo_description") || "",
        status: formData.get("status") || "draft",
      };

      try {
        if (editing) {
          await contentApi.updateContentBlog(blog.id, payload);
          showToast("Blog updated successfully.");
        } else {
          await contentApi.createContentBlog(payload);
          showToast("Blog created successfully.");
        }

        close();
        await loadData();
      } catch (error) {
        console.error("Blog save failed:", error);
        showToast(
          error?.message || "Unable to save the blog.",
          "error",
        );
      }
    });
  };

  const openBannerForm = (banner = null) => {
    const editing = Boolean(banner);

    const overlay = document.createElement("div");
    overlay.className = "thp-admin-modal-overlay";

    overlay.innerHTML = `
      <div class="thp-admin-modal" role="dialog" aria-modal="true">
        <div class="thp-admin-modal-header">
          <div>
            <h2>${editing ? "Edit Banner" : "Add Homepage Banner"}</h2>
            <p>
              ${
                editing
                  ? "Update the selected homepage banner."
                  : "Create a homepage promotional banner."
              }
            </p>
          </div>

          <button
            type="button"
            class="thp-admin-button"
            id="banner-form-close"
          >
            ×
          </button>
        </div>

        <form id="banner-form">
          <div class="thp-admin-form-grid">

            <label>
              <span>Title *</span>
              <input
                name="title"
                required
                value="${escapeHtml(banner?.title || "")}"
              />
            </label>

            <label>
              <span>Display Order</span>
              <input
                name="display_order"
                type="number"
                min="0"
                value="${escapeHtml(banner?.display_order ?? 0)}"
              />
            </label>

            <label style="grid-column:1/-1;">
              <span>Description</span>
              <textarea
                name="description"
                rows="4"
              >${escapeHtml(banner?.description || "")}</textarea>
            </label>

            <label style="grid-column:1/-1;">
              <span>Image URL *</span>
              <input
                name="image_url"
                type="url"
                required
                placeholder="https://..."
                value="${escapeHtml(banner?.image_url || "")}"
              />
            </label>

            <label style="grid-column:1/-1;">
              <span>Link URL</span>
              <input
                name="link_url"
                type="url"
                placeholder="https://..."
                value="${escapeHtml(banner?.link_url || "")}"
              />
            </label>

            <label>
              <span>Status</span>
              <select name="is_active">
                <option value="true" ${
                  banner?.is_active !== false ? "selected" : ""
                }>
                  Active
                </option>

                <option value="false" ${
                  banner?.is_active === false ? "selected" : ""
                }>
                  Inactive
                </option>
              </select>
            </label>

          </div>

          <div class="thp-admin-modal-actions">
            <button
              type="button"
              class="thp-admin-button"
              id="banner-form-cancel"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="thp-admin-button thp-admin-button-primary"
            >
              ${editing ? "Save Changes" : "Create Banner"}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay
      .querySelector("#banner-form-close")
      .addEventListener("click", close);

    overlay
      .querySelector("#banner-form-cancel")
      .addEventListener("click", close);

    overlay
      .querySelector("#banner-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const payload = {
          title: String(formData.get("title") || "").trim(),
          description: String(formData.get("description") || "").trim(),
          image_url: String(formData.get("image_url") || "").trim(),
          link_url: String(formData.get("link_url") || "").trim(),
          display_order: Number(formData.get("display_order") || 0),
          is_active: formData.get("is_active") === "true",
        };

        try {
          if (editing) {
            await contentApi.updateContentHomepageBanner(
              banner.id,
              payload,
            );

            showToast("Homepage banner updated.");
          } else {
            await contentApi.createContentHomepageBanner(payload);

            showToast("Homepage banner created.");
          }

          close();
          await loadData();
        } catch (error) {
          console.error("Homepage banner save failed:", error);

          showToast(
            error?.message || "Unable to save homepage banner.",
            "error",
          );
        }
      });
  };

  const openAnnouncementForm = (announcement = null) => {
  const editing = Boolean(announcement);

  const overlay = document.createElement("div");
  overlay.className = "thp-admin-modal-overlay";

  overlay.innerHTML = `
    <div
      class="thp-admin-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="thp-admin-modal-header">

        <div>
          <h2>
            ${
              editing
                ? "Edit Announcement"
                : "Add Announcement"
            }
          </h2>

          <p>
            ${
              editing
                ? "Update the selected announcement."
                : "Create a new website announcement."
            }
          </p>
        </div>

        <button
          type="button"
          class="thp-admin-button"
          id="announcement-form-close"
        >
          ×
        </button>

      </div>

      <form id="announcement-form">

        <div class="thp-admin-form-grid">

          <label>
            <span>Title *</span>

            <input
              name="title"
              required
              value="${escapeHtml(
                announcement?.title || "",
              )}"
            />
          </label>

          <label>
            <span>Display Order</span>

            <input
              name="display_order"
              type="number"
              min="0"
              value="${escapeHtml(
                announcement?.display_order ?? 0,
              )}"
            />
          </label>

          <label style="grid-column:1/-1;">
            <span>Message *</span>

            <textarea
              name="message"
              rows="5"
              required
            >${escapeHtml(
              announcement?.message || "",
            )}</textarea>
          </label>

          <label style="grid-column:1/-1;">
            <span>Link URL</span>

            <input
              name="link_url"
              type="url"
              placeholder="https://..."
              value="${escapeHtml(
                announcement?.link_url || "",
              )}"
            />
          </label>

          <label>
            <span>Status</span>

            <select name="is_active">

              <option
                value="true"
                ${
                  announcement?.is_active !== false
                    ? "selected"
                    : ""
                }
              >
                Active
              </option>

              <option
                value="false"
                ${
                  announcement?.is_active === false
                    ? "selected"
                    : ""
                }
              >
                Inactive
              </option>

            </select>
          </label>

        </div>

        <div class="thp-admin-modal-actions">

          <button
            type="button"
            class="thp-admin-button"
            id="announcement-form-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${
              editing
                ? "Save Changes"
                : "Create Announcement"
            }
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay
    .querySelector("#announcement-form-close")
    .addEventListener("click", close);

  overlay
    .querySelector("#announcement-form-cancel")
    .addEventListener("click", close);

  overlay
    .querySelector("#announcement-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(
        event.currentTarget,
      );

      const payload = {
        title: String(
          formData.get("title") || "",
        ).trim(),

        message: String(
          formData.get("message") || "",
        ).trim(),

        link_url: String(
          formData.get("link_url") || "",
        ).trim(),

        display_order: Number(
          formData.get("display_order") || 0,
        ),

        is_active:
          formData.get("is_active") === "true",
      };

      try {
        if (editing) {
          await contentApi.updateContentAnnouncement(
            announcement.id,
            payload,
          );

          showToast(
            "Announcement updated.",
          );
        } else {
          await contentApi.createContentAnnouncement(
            payload,
          );

          showToast(
            "Announcement created.",
          );
        }

        close();

        await loadData();

      } catch (error) {

        console.error(
          "Announcement save failed:",
          error,
        );

        showToast(
          error?.message ||
            "Unable to save announcement.",
          "error",
        );
      }
    });
};

const openFeaturedServiceForm = (service = null) => {
  const editing = Boolean(service);

  const overlay = document.createElement("div");
  overlay.className = "thp-admin-modal-overlay";

  overlay.innerHTML = `
    <div
      class="thp-admin-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="thp-admin-modal-header">

        <div>
          <h2>
            ${
              editing
                ? "Edit Featured Service"
                : "Add Featured Service"
            }
          </h2>

          <p>
            ${
              editing
                ? "Update the selected featured service."
                : "Create a new featured service."
            }
          </p>
        </div>

        <button
          type="button"
          class="thp-admin-button"
          id="featured-service-form-close"
        >
          ×
        </button>

      </div>

      <form id="featured-service-form">

        <div class="thp-admin-form-grid">

          <label>
            <span>Title *</span>

            <input
              name="title"
              required
              value="${escapeHtml(service?.title || "")}"
            />
          </label>

          <label>
            <span>Display Order</span>

            <input
              name="display_order"
              type="number"
              min="0"
              value="${escapeHtml(
                service?.display_order ?? 0,
              )}"
            />
          </label>

          <label style="grid-column:1/-1;">
            <span>Description</span>

            <textarea
              name="description"
              rows="4"
            >${escapeHtml(
              service?.description || "",
            )}</textarea>
          </label>

          <label style="grid-column:1/-1;">
            <span>Icon URL</span>

            <input
              name="icon_url"
              type="url"
              placeholder="https://..."
              value="${escapeHtml(
                service?.icon_url || "",
              )}"
            />
          </label>

          <label style="grid-column:1/-1;">
            <span>Link URL</span>

            <input
              name="link_url"
              type="url"
              placeholder="https://..."
              value="${escapeHtml(
                service?.link_url || "",
              )}"
            />
          </label>

          <label>
            <span>Status</span>

            <select name="is_active">

              <option
                value="true"
                ${
                  service?.is_active !== false
                    ? "selected"
                    : ""
                }
              >
                Active
              </option>

              <option
                value="false"
                ${
                  service?.is_active === false
                    ? "selected"
                    : ""
                }
              >
                Inactive
              </option>

            </select>
          </label>

        </div>

        <div class="thp-admin-modal-actions">

          <button
            type="button"
            class="thp-admin-button"
            id="featured-service-form-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${
              editing
                ? "Save Changes"
                : "Create Service"
            }
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay
    .querySelector("#featured-service-form-close")
    .addEventListener("click", close);

  overlay
    .querySelector("#featured-service-form-cancel")
    .addEventListener("click", close);

  overlay
    .querySelector("#featured-service-form")
    .addEventListener("submit", async (event) => {

      event.preventDefault();

      const formData = new FormData(
        event.currentTarget,
      );

      const payload = {
        title: String(
          formData.get("title") || "",
        ).trim(),

        description: String(
          formData.get("description") || "",
        ).trim(),

        icon_url: String(
          formData.get("icon_url") || "",
        ).trim(),

        link_url: String(
          formData.get("link_url") || "",
        ).trim(),

        display_order: Number(
          formData.get("display_order") || 0,
        ),

        is_active:
          formData.get("is_active") === "true",
      };

      try {

        if (editing) {

          await contentApi.updateContentFeaturedService(
            service.id,
            payload,
          );

          showToast(
            "Featured service updated.",
          );

        } else {

          await contentApi.createContentFeaturedService(
            payload,
          );

          showToast(
            "Featured service created.",
          );
        }

        close();

        await loadData();

      } catch (error) {

        console.error(
          "Featured service save failed:",
          error,
        );

        showToast(
          error?.message ||
            "Unable to save featured service.",
          "error",
        );
      }
    });
};

const openFaqForm = (faq = null) => {
  const editing = Boolean(faq);

  const overlay = document.createElement("div");
  overlay.className = "thp-admin-modal-overlay";

  overlay.innerHTML = `
    <div
      class="thp-admin-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="thp-admin-modal-header">

        <div>
          <h2>
            ${
              editing
                ? "Edit FAQ"
                : "Add FAQ"
            }
          </h2>

          <p>
            ${
              editing
                ? "Update the selected FAQ."
                : "Create a new frequently asked question."
            }
          </p>
        </div>

        <button
          type="button"
          class="thp-admin-button"
          id="faq-form-close"
        >
          ×
        </button>

      </div>

      <form id="faq-form">

        <div class="thp-admin-form-grid">

          <label style="grid-column:1/-1;">
            <span>Question *</span>

            <input
              name="question"
              required
              value="${escapeHtml(
                faq?.question || "",
              )}"
            />
          </label>

          <label style="grid-column:1/-1;">
            <span>Answer *</span>

            <textarea
              name="answer"
              rows="7"
              required
            >${escapeHtml(
              faq?.answer || "",
            )}</textarea>
          </label>

          <label>
            <span>Category *</span>

            <select name="category" required>

              <option
                value="pharmacy"
                ${
                  faq?.category === "pharmacy"
                    ? "selected"
                    : ""
                }
              >
                Pharmacy
              </option>

              <option
                value="plans"
                ${
                  faq?.category === "plans"
                    ? "selected"
                    : ""
                }
              >
                Plans
              </option>

              <option
                value="fellowship"
                ${
                  faq?.category ===
                  "fellowship"
                    ? "selected"
                    : ""
                }
              >
                Fellowship
              </option>

              <option
                value="general"
                ${
                  !faq?.category ||
                  faq?.category === "general"
                    ? "selected"
                    : ""
                }
              >
                General
              </option>

            </select>
          </label>

          <label>
            <span>Display Order</span>

            <input
              name="display_order"
              type="number"
              min="0"
              value="${escapeHtml(
                faq?.display_order ?? 0,
              )}"
            />
          </label>

          <label>
            <span>Status</span>

            <select name="is_active">

              <option
                value="true"
                ${
                  faq?.is_active !== false
                    ? "selected"
                    : ""
                }
              >
                Active
              </option>

              <option
                value="false"
                ${
                  faq?.is_active === false
                    ? "selected"
                    : ""
                }
              >
                Inactive
              </option>

            </select>
          </label>

        </div>

        <div class="thp-admin-modal-actions">

          <button
            type="button"
            class="thp-admin-button"
            id="faq-form-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${
              editing
                ? "Save Changes"
                : "Create FAQ"
            }
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay
    .querySelector("#faq-form-close")
    .addEventListener("click", close);

  overlay
    .querySelector("#faq-form-cancel")
    .addEventListener("click", close);

  overlay
    .querySelector("#faq-form")
    .addEventListener("submit", async (event) => {

      event.preventDefault();

      const formData = new FormData(
        event.currentTarget,
      );

      const payload = {
        question: String(
          formData.get("question") || "",
        ).trim(),

        answer: String(
          formData.get("answer") || "",
        ).trim(),

        category:
          formData.get("category") ||
          "general",

        display_order: Number(
          formData.get("display_order") || 0,
        ),

        is_active:
          formData.get("is_active") === "true",
      };

      try {

        if (editing) {

          await contentApi.updateContentFaq(
            faq.id,
            payload,
          );

          showToast("FAQ updated.");

        } else {

          await contentApi.createContentFaq(
            payload,
          );

          showToast("FAQ created.");
        }

        close();

        await loadData();

      } catch (error) {

        console.error(
          "FAQ save failed:",
          error,
        );

        showToast(
          error?.message ||
            "Unable to save FAQ.",
          "error",
        );
      }
    });
};

const openTestimonialForm = (testimonial = null) => {
  const editing = Boolean(testimonial);

  const overlay = document.createElement("div");
  overlay.className = "thp-admin-modal-overlay";

  overlay.innerHTML = `
    <div
      class="thp-admin-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="thp-admin-modal-header">

        <div>
          <h2>
            ${
              editing
                ? "Edit Testimonial"
                : "Add Testimonial"
            }
          </h2>

          <p>
            ${
              editing
                ? "Update the selected testimonial."
                : "Create a new customer testimonial."
            }
          </p>
        </div>

        <button
          type="button"
          class="thp-admin-button"
          id="testimonial-form-close"
        >
          ×
        </button>

      </div>

      <form id="testimonial-form">

        <div class="thp-admin-form-grid">

          <label>
            <span>Name *</span>

            <input
              name="name"
              required
              value="${escapeHtml(
                testimonial?.name || "",
              )}"
            />
          </label>

          <label>
            <span>Rating *</span>

            <select name="rating" required>

              ${[1, 2, 3, 4, 5]
                .map(
                  (rating) => `
                    <option
                      value="${rating}"
                      ${
                        Number(
                          testimonial?.rating,
                        ) === rating
                          ? "selected"
                          : ""
                      }
                    >
                      ${rating}/5
                    </option>
                  `,
                )
                .join("")}

            </select>
          </label>

          <label style="grid-column:1/-1;">
            <span>Testimonial *</span>

            <textarea
              name="text"
              rows="6"
              required
            >${escapeHtml(
              testimonial?.text || "",
            )}</textarea>
          </label>

          <label>
            <span>Section</span>

            <input
              name="section"
              value="${escapeHtml(
                testimonial?.section || "",
              )}"
              placeholder="Homepage"
            />
          </label>

          <label>
            <span>Display Order</span>

            <input
              name="display_order"
              type="number"
              min="0"
              value="${escapeHtml(
                testimonial?.display_order ?? 0,
              )}"
            />
          </label>

          <label>
            <span>Status</span>

            <select name="is_active">

              <option
                value="true"
                ${
                  testimonial?.is_active !== false
                    ? "selected"
                    : ""
                }
              >
                Active
              </option>

              <option
                value="false"
                ${
                  testimonial?.is_active === false
                    ? "selected"
                    : ""
                }
              >
                Inactive
              </option>

            </select>
          </label>

        </div>

        <div class="thp-admin-modal-actions">

          <button
            type="button"
            class="thp-admin-button"
            id="testimonial-form-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${
              editing
                ? "Save Changes"
                : "Create Testimonial"
            }
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay
    .querySelector("#testimonial-form-close")
    .addEventListener("click", close);

  overlay
    .querySelector("#testimonial-form-cancel")
    .addEventListener("click", close);

  overlay
    .querySelector("#testimonial-form")
    .addEventListener("submit", async (event) => {

      event.preventDefault();

      const formData = new FormData(
        event.currentTarget,
      );

      const payload = {
        name: String(
          formData.get("name") || "",
        ).trim(),

        text: String(
          formData.get("text") || "",
        ).trim(),

        rating: Number(
          formData.get("rating") || 5,
        ),

        section: String(
          formData.get("section") || "",
        ).trim(),

        display_order: Number(
          formData.get("display_order") || 0,
        ),

        is_active:
          formData.get("is_active") === "true",
      };

      try {

        if (editing) {

          await contentApi.updateContentTestimonial(
            testimonial.id,
            payload,
          );

          showToast("Testimonial updated.");

        } else {

          await contentApi.createContentTestimonial(
            payload,
          );

          showToast("Testimonial created.");
        }

        close();

        await loadData();

      } catch (error) {

        console.error(
          "Testimonial save failed:",
          error,
        );

        showToast(
          error?.message ||
            "Unable to save testimonial.",
          "error",
        );
      }
    });
};

window.openTrustStatForm = async (stat = null) => {
  const isEdit = Boolean(stat);

  const modal = document.createElement("div");
  modal.className = "thp-admin-modal-overlay";

  modal.innerHTML = `
    <div class="thp-admin-modal">
      <div class="thp-admin-modal-header">
        <h3>${isEdit ? "Edit Trust Stat" : "Add Trust Stat"}</h3>

        <button
          type="button"
          class="thp-admin-modal-close"
          data-close-modal
        >
          ×
        </button>
      </div>

      <form id="trust-stat-form" class="thp-admin-form">
        <div class="thp-admin-form-group">
          <label>Value *</label>
          <input
            type="text"
            name="value"
            value="${escapeHtml(stat?.value || "")}"
            placeholder="98%"
            required
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Label *</label>
          <input
            type="text"
            name="label"
            value="${escapeHtml(stat?.label || "")}"
            placeholder="Customer Satisfaction"
            required
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Display Order</label>
          <input
            type="number"
            name="display_order"
            value="${stat?.display_order ?? 0}"
            min="0"
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Status</label>

          <select name="is_active">
            <option value="true" ${
              stat?.is_active !== false ? "selected" : ""
            }>
              Active
            </option>

            <option value="false" ${
              stat?.is_active === false ? "selected" : ""
            }>
              Inactive
            </option>
          </select>
        </div>

        <div class="thp-admin-modal-actions">
          <button
            type="button"
            class="thp-admin-button thp-admin-button-secondary"
            data-close-modal
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${isEdit ? "Update Trust Stat" : "Create Trust Stat"}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();

  modal.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal.querySelector("#trust-stat-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      value: String(formData.get("value") || "").trim(),
      label: String(formData.get("label") || "").trim(),
      display_order: Number(formData.get("display_order") || 0),
      is_active: formData.get("is_active") === "true",
    };

    if (!payload.value || !payload.label) {
      showToast("Value and label are required.", "error");
      return;
    }

    try {
      if (isEdit) {
        await contentApi.updateContentTrustStat(stat.id, payload);
        showToast("Trust stat updated successfully.", "success");
      } else {
        await contentApi.createContentTrustStat(payload);
        showToast("Trust stat created successfully.", "success");
      }

      closeModal();
      await loadData();
      render();
    } catch (error) {
      console.error(error);
      showToast(
        error?.message || "Failed to save trust stat.",
        "error"
      );
    }
  });
};

window.openWebsitePageForm = (page = null) => {
  const isEdit = Boolean(page);

  const modal = document.createElement("div");
  modal.className = "thp-admin-modal-overlay";

  modal.innerHTML = `
    <div class="thp-admin-modal">
      <div class="thp-admin-modal-header">
        <h3>${isEdit ? "Edit Website Page" : "Add Website Page"}</h3>

        <button
          type="button"
          class="thp-admin-modal-close"
          data-close-modal
        >
          ×
        </button>
      </div>

      <form id="website-page-form" class="thp-admin-form">

        <div class="thp-admin-form-group">
          <label>Title *</label>

          <input
            type="text"
            name="title"
            value="${escapeHtml(page?.title || "")}"
            placeholder="Terms & Conditions"
            required
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Page Type *</label>

          <select name="page_type" required>
            <option value="terms" ${
              page?.page_type === "terms" ? "selected" : ""
            }>
              Terms
            </option>

            <option value="privacy" ${
              page?.page_type === "privacy" ? "selected" : ""
            }>
              Privacy
            </option>

            <option value="about" ${
              page?.page_type === "about" ? "selected" : ""
            }>
              About
            </option>

            <option value="other" ${
              page?.page_type === "other" || !page ? "selected" : ""
            }>
              Other
            </option>
          </select>
        </div>

        <div class="thp-admin-form-group">
          <label>Content *</label>

          <textarea
            name="content"
            rows="10"
            placeholder="Enter page content..."
            required
          >${escapeHtml(page?.content || "")}</textarea>
        </div>

        <div class="thp-admin-form-group">
          <label>Status</label>

          <select name="is_published">
            <option value="true" ${
              page?.is_published !== false ? "selected" : ""
            }>
              Published
            </option>

            <option value="false" ${
              page?.is_published === false ? "selected" : ""
            }>
              Unpublished
            </option>
          </select>
        </div>

        <div class="thp-admin-modal-actions">
          <button
            type="button"
            class="thp-admin-button thp-admin-button-secondary"
            data-close-modal
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${isEdit ? "Update Page" : "Create Page"}
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();

  modal.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal
    .querySelector("#website-page-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);

      const payload = {
        title: String(formData.get("title") || "").trim(),
        page_type: String(formData.get("page_type") || "other"),
        content: String(formData.get("content") || "").trim(),
        is_published: formData.get("is_published") === "true",
      };

      if (!payload.title || !payload.content) {
        showToast("Title and content are required.", "error");
        return;
      }

      try {
        if (isEdit) {
          await contentApi.updateContentWebsitePage(page.id, payload);
          showToast("Website page updated successfully.", "success");
        } else {
          await contentApi.createContentWebsitePage(payload);
          showToast("Website page created successfully.", "success");
        }

        closeModal();
        await loadData();
        render();
      } catch (error) {
        console.error(error);

        showToast(
          error?.message || "Failed to save website page.",
          "error"
        );
      }
    });
};

window.openCityForm = (city = null) => {
  const isEdit = Boolean(city);

  const modal = document.createElement("div");
  modal.className = "thp-admin-modal-overlay";

  modal.innerHTML = `
    <div class="thp-admin-modal">
      <div class="thp-admin-modal-header">
        <h3>${isEdit ? "Edit City" : "Add City"}</h3>

        <button
          type="button"
          class="thp-admin-modal-close"
          data-close-modal
        >
          ×
        </button>
      </div>

      <form id="city-form" class="thp-admin-form">

        <div class="thp-admin-form-group">
          <label>City Name *</label>

          <input
            type="text"
            name="name"
            value="${escapeHtml(city?.name || "")}"
            placeholder="Bengaluru"
            required
          />
        </div>

        <div class="thp-admin-form-group">
          <label>State</label>

          <input
            type="text"
            name="state"
            value="${escapeHtml(city?.state || "")}"
            placeholder="Karnataka"
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Display Order</label>

          <input
            type="number"
            name="display_order"
            value="${city?.display_order ?? 0}"
            min="0"
          />
        </div>

        <div class="thp-admin-form-group">
          <label>Status</label>

          <select name="is_active">
            <option value="true" ${
              city?.is_active !== false ? "selected" : ""
            }>
              Active
            </option>

            <option value="false" ${
              city?.is_active === false ? "selected" : ""
            }>
              Inactive
            </option>
          </select>
        </div>

        <div class="thp-admin-modal-actions">
          <button
            type="button"
            class="thp-admin-button thp-admin-button-secondary"
            data-close-modal
          >
            Cancel
          </button>

          <button
            type="submit"
            class="thp-admin-button thp-admin-button-primary"
          >
            ${isEdit ? "Update City" : "Create City"}
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();

  modal.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal.querySelector("#city-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      display_order: Number(formData.get("display_order") || 0),
      is_active: formData.get("is_active") === "true",
    };

    if (!payload.name) {
      showToast("City name is required.", "error");
      return;
    }

    try {
      if (isEdit) {
        await contentApi.updateContentCity(city.id, payload);
        showToast("City updated successfully.", "success");
      } else {
        await contentApi.createContentCity(payload);
        showToast("City created successfully.", "success");
      }

      closeModal();
      await loadData();
      render();
    } catch (error) {
      console.error(error);

      showToast(
        error?.message || "Failed to save city.",
        "error"
      );
    }
  });
};


  const bindEvents = () => {
    document
      .querySelector("#content-add-blog")
      ?.addEventListener("click", () => openBlogForm());

    document
      .querySelector("#content-add-blog-empty")
      ?.addEventListener("click", () => openBlogForm());

    document
      .querySelector("#content-retry")
      ?.addEventListener("click", loadData);

    document
      .querySelector("#content-search")
      ?.addEventListener("input", (event) => {
        search = event.target.value;
        page = 1;

        window.clearTimeout(window.__contentSearchTimer);

        window.__contentSearchTimer = window.setTimeout(() => {
          loadData();
        }, 350);
      });

    document
      .querySelector("#content-status-filter")
      ?.addEventListener("change", (event) => {
        status = event.target.value;
        page = 1;
        loadData();
      });

    document
      .querySelector("#content-category-filter")
      ?.addEventListener("change", (event) => {
        category = event.target.value;
        page = 1;
        loadData();
      });

    document
      .querySelector("#content-prev")
      ?.addEventListener("click", () => {
        if (page > 1) {
          page -= 1;
          render();
        }
      });

    document
      .querySelector("#content-next")
      ?.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(blogs.length / pageSize));

        if (page < totalPages) {
          page += 1;
          render();
        }
      });

    document.querySelectorAll("[data-blog-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const blog = blogs.find(
          (item) => String(item.id) === String(button.dataset.blogEdit),
        );

        if (blog) {
          openBlogForm(blog);
        }
      });
    });

    document.querySelectorAll("[data-blog-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        const blog = blogs.find(
          (item) => String(item.id) === String(button.dataset.blogToggle),
        );

        if (!blog) return;

        try {
          if (blog.status === "published") {
            await contentApi.unpublishContentBlog(blog.id);
            showToast("Blog unpublished.");
          } else {
            await contentApi.publishContentBlog(blog.id);
            showToast("Blog published.");
          }

          await loadData();
        } catch (error) {
          console.error("Blog status change failed:", error);
          showToast(
            error?.message || "Unable to change blog status.",
            "error",
          );
        }
      });
    });

    document.querySelectorAll("[data-blog-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const blog = blogs.find(
          (item) => String(item.id) === String(button.dataset.blogDelete),
        );

        if (!blog) return;

        if (
          !window.confirm(
            `Delete "${blog.title}"? This action cannot be undone.`,
          )
        ) {
          return;
        }

        try {
          await contentApi.deleteContentBlog(blog.id);
          showToast("Blog deleted.");
          await loadData();
        } catch (error) {
          console.error("Blog delete failed:", error);
          showToast(
            error?.message || "Unable to delete the blog.",
            "error",
          );
        }
      });
    });

            document
      .querySelector("#content-add-category")
      ?.addEventListener("click", () => {
        window.openTaxonomyForm("category");
      });

    document
      .querySelector("#content-add-tag")
      ?.addEventListener("click", () => {
        window.openTaxonomyForm("tag");
      });

    document.querySelectorAll("[data-category-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = categories.find(
          (categoryItem) =>
            String(categoryItem.id) === String(button.dataset.categoryEdit),
        );

        if (item) {
          window.openTaxonomyForm("category", item);
        }
      });
    });

    document.querySelectorAll("[data-tag-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = tags.find(
          (tagItem) =>
            String(tagItem.id) === String(button.dataset.tagEdit),
        );

        if (item) {
          window.openTaxonomyForm("tag", item);
        }
      });
    });

    document.querySelectorAll("[data-category-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = categories.find(
          (categoryItem) =>
            String(categoryItem.id) === String(button.dataset.categoryDelete),
        );

        if (!item) return;

        if (!window.confirm(`Delete category "${item.name}"?`)) {
          return;
        }

        try {
          await contentApi.deleteContentBlogCategory(item.id);
          showToast("Category deleted.");
          await loadData();
        } catch (error) {
          console.error("Category delete failed:", error);
          showToast(
            error?.message || "Unable to delete category.",
            "error",
          );
        }
      });
    });

    document.querySelectorAll("[data-tag-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = tags.find(
          (tagItem) =>
            String(tagItem.id) === String(button.dataset.tagDelete),
        );

        if (!item) return;

        if (!window.confirm(`Delete tag "${item.name}"?`)) {
          return;
        }

        try {
          await contentApi.deleteContentBlogTag(item.id);
          showToast("Tag deleted.");
          await loadData();
        } catch (error) {
          console.error("Tag delete failed:", error);
          showToast(
            error?.message || "Unable to delete tag.",
            "error",
          );
        }
      });
    });

    document
      .querySelector("#content-add-banner")
      ?.addEventListener("click", () => {
        openBannerForm();
      });

    document.querySelectorAll("[data-banner-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const banner = banners.find(
          (item) => String(item.id) === String(button.dataset.bannerEdit),
        );

        if (banner) {
          openBannerForm(banner);
        }
      });
    });

    document.querySelectorAll("[data-banner-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await contentApi.toggleContentHomepageBannerStatus(
            button.dataset.bannerToggle,
          );

          showToast("Banner status updated.");
          await loadData();
        } catch (error) {
          console.error("Banner status update failed:", error);

          showToast(
            error?.message || "Unable to update banner status.",
            "error",
          );
        }
      });
    });

    document.querySelectorAll("[data-banner-up]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await contentApi.moveContentHomepageBannerUp(
            button.dataset.bannerUp,
          );

          showToast("Banner moved up.");
          await loadData();
        } catch (error) {
          showToast(
            error?.message || "Unable to move banner.",
            "error",
          );
        }
      });
    });

    document.querySelectorAll("[data-banner-down]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await contentApi.moveContentHomepageBannerDown(
            button.dataset.bannerDown,
          );

          showToast("Banner moved down.");
          await loadData();
        } catch (error) {
          showToast(
            error?.message || "Unable to move banner.",
            "error",
          );
        }
      });
    });

    document.querySelectorAll("[data-banner-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const banner = banners.find(
          (item) =>
            String(item.id) === String(button.dataset.bannerDelete),
        );

        if (!banner) return;

        if (
          !window.confirm(
            `Delete "${banner.title}"? This action cannot be undone.`,
          )
        ) {
          return;
        }

        try {
          await contentApi.deleteContentHomepageBanner(banner.id);

          showToast("Homepage banner deleted.");
          await loadData();
        } catch (error) {
          console.error("Banner delete failed:", error);

          showToast(
            error?.message || "Unable to delete homepage banner.",
            "error",
          );
        }
      });
    });

    document
      .querySelector("#content-add-announcement")
      ?.addEventListener("click", () => {
        openAnnouncementForm();
      });

    document
      .querySelectorAll("[data-announcement-edit]")
      .forEach((button) => {

        button.addEventListener("click", () => {

          const announcement =
            announcements.find(
              (item) =>
                String(item.id) ===
                String(
                  button.dataset.announcementEdit,
                ),
            );

          if (announcement) {
            openAnnouncementForm(
              announcement,
            );
          }
        });
      });

    document
      .querySelectorAll("[data-announcement-toggle]")
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            const announcement =
              announcements.find(
                (item) =>
                  String(item.id) ===
                  String(
                    button.dataset.announcementToggle,
                  ),
              );

            if (!announcement) return;

            try {

              await contentApi.updateContentAnnouncement(
                announcement.id,
                {
                  is_active:
                    !announcement.is_active,
                },
              );

              showToast(
                announcement.is_active
                  ? "Announcement deactivated."
                  : "Announcement activated.",
              );

              await loadData();

            } catch (error) {

              console.error(
                "Announcement status update failed:",
                error,
              );

              showToast(
                error?.message ||
                  "Unable to update announcement status.",
                "error",
              );
            }
          },
        );
      });

    document
      .querySelectorAll("[data-announcement-delete]")
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            const announcement =
              announcements.find(
                (item) =>
                  String(item.id) ===
                  String(
                    button.dataset.announcementDelete,
                  ),
              );

            if (!announcement) return;

            if (
              !window.confirm(
                `Delete "${announcement.title}"? This action cannot be undone.`,
              )
            ) {
              return;
            }

            try {

              await contentApi.deleteContentAnnouncement(
                announcement.id,
              );

              showToast(
                "Announcement deleted.",
              );

              await loadData();

            } catch (error) {

              console.error(
                "Announcement delete failed:",
                error,
              );

              showToast(
                error?.message ||
                  "Unable to delete announcement.",
                "error",
              );
            }
          },
        );
      });

      document
        .querySelector("#content-add-featured-service")
        ?.addEventListener("click", () => {
          openFeaturedServiceForm();
        });

      document
        .querySelectorAll("[data-featured-service-edit]")
        .forEach((button) => {

          button.addEventListener("click", () => {

            const service =
              featuredServices.find(
                (item) =>
                  String(item.id) ===
                  String(
                    button.dataset.featuredServiceEdit,
                  ),
              );

            if (service) {
              openFeaturedServiceForm(service);
            }
          });
        });

      document
        .querySelectorAll("[data-featured-service-toggle]")
        .forEach((button) => {

          button.addEventListener(
            "click",
            async () => {

              const service =
                featuredServices.find(
                  (item) =>
                    String(item.id) ===
                    String(
                      button.dataset.featuredServiceToggle,
                    ),
                );

              if (!service) return;

              try {

                await contentApi.updateContentFeaturedService(
                  service.id,
                  {
                    is_active: !service.is_active,
                  },
                );

                showToast(
                  service.is_active
                    ? "Featured service deactivated."
                    : "Featured service activated.",
                );

                await loadData();

              } catch (error) {

                showToast(
                  error?.message ||
                    "Unable to update service status.",
                  "error",
                );
              }
            },
          );
        });

      document
        .querySelectorAll("[data-featured-service-delete]")
        .forEach((button) => {

          button.addEventListener(
            "click",
            async () => {

              const service =
                featuredServices.find(
                  (item) =>
                    String(item.id) ===
                    String(
                      button.dataset.featuredServiceDelete,
                    ),
                );

              if (!service) return;

              if (
                !window.confirm(
                  `Delete "${service.title}"? This action cannot be undone.`,
                )
              ) {
                return;
              }

              try {

                await contentApi.deleteContentFeaturedService(
                  service.id,
                );

                showToast(
                  "Featured service deleted.",
                );

                await loadData();

              } catch (error) {

                showToast(
                  error?.message ||
                    "Unable to delete featured service.",
                  "error",
                );
              }
            },
          );
        });

        document
          .querySelector("#content-add-faq")
          ?.addEventListener("click", () => {
            openFaqForm();
          });

        document
          .querySelectorAll("[data-faq-edit]")
          .forEach((button) => {

            button.addEventListener("click", () => {

              const faq = faqs.find(
                (item) =>
                  String(item.id) ===
                  String(button.dataset.faqEdit),
              );

              if (faq) {
                openFaqForm(faq);
              }
            });
          });

        document
          .querySelectorAll("[data-faq-toggle]")
          .forEach((button) => {

            button.addEventListener(
              "click",
              async () => {

                const faq = faqs.find(
                  (item) =>
                    String(item.id) ===
                    String(button.dataset.faqToggle),
                );

                if (!faq) return;

                try {

                  await contentApi.updateContentFaq(
                    faq.id,
                    {
                      is_active: !faq.is_active,
                    },
                  );

                  showToast(
                    faq.is_active
                      ? "FAQ deactivated."
                      : "FAQ activated.",
                  );

                  await loadData();

                } catch (error) {

                  showToast(
                    error?.message ||
                      "Unable to update FAQ status.",
                    "error",
                  );
                }
              },
            );
          });

        document
          .querySelectorAll("[data-faq-delete]")
          .forEach((button) => {

            button.addEventListener(
              "click",
              async () => {

                const faq = faqs.find(
                  (item) =>
                    String(item.id) ===
                    String(button.dataset.faqDelete),
                );

                if (!faq) return;

                if (
                  !window.confirm(
                    `Delete this FAQ? This action cannot be undone.`,
                  )
                ) {
                  return;
                }

                try {

                  await contentApi.deleteContentFaq(
                    faq.id,
                  );

                  showToast("FAQ deleted.");

                  await loadData();

                } catch (error) {

                  showToast(
                    error?.message ||
                      "Unable to delete FAQ.",
                    "error",
                  );
                }
              },
            );
          });

          document
            .querySelector("#content-add-testimonial")
            ?.addEventListener("click", () => {
              openTestimonialForm();
            });

          document
            .querySelectorAll("[data-testimonial-edit]")
            .forEach((button) => {

              button.addEventListener("click", () => {

                const testimonial =
                  testimonials.find(
                    (item) =>
                      String(item.id) ===
                      String(
                        button.dataset.testimonialEdit,
                      ),
                  );

                if (testimonial) {
                  openTestimonialForm(testimonial);
                }
              });
            });

          document
            .querySelectorAll("[data-testimonial-toggle]")
            .forEach((button) => {

              button.addEventListener(
                "click",
                async () => {

                  const testimonial =
                    testimonials.find(
                      (item) =>
                        String(item.id) ===
                        String(
                          button.dataset.testimonialToggle,
                        ),
                    );

                  if (!testimonial) return;

                  try {

                    await contentApi.updateContentTestimonial(
                      testimonial.id,
                      {
                        is_active:
                          !testimonial.is_active,
                      },
                    );

                    showToast(
                      testimonial.is_active
                        ? "Testimonial deactivated."
                        : "Testimonial activated.",
                    );

                    await loadData();

                  } catch (error) {

                    showToast(
                      error?.message ||
                        "Unable to update testimonial status.",
                      "error",
                    );
                  }
                },
              );
            });

          document
            .querySelectorAll("[data-testimonial-delete]")
            .forEach((button) => {

              button.addEventListener(
                "click",
                async () => {

                  const testimonial =
                    testimonials.find(
                      (item) =>
                        String(item.id) ===
                        String(
                          button.dataset.testimonialDelete,
                        ),
                    );

                  if (!testimonial) return;

                  if (
                    !window.confirm(
                      `Delete testimonial from "${testimonial.name}"? This action cannot be undone.`,
                    )
                  ) {
                    return;
                  }

                  try {

                    await contentApi.deleteContentTestimonial(
                      testimonial.id,
                    );

                    showToast(
                      "Testimonial deleted.",
                    );

                    await loadData();

                  } catch (error) {

                    showToast(
                      error?.message ||
                        "Unable to delete testimonial.",
                      "error",
                    );
                  }
                },
              );
            });

            document
              .querySelector("#content-add-trust-stat")
              ?.addEventListener("click", () => {
                window.openTrustStatForm();
              });

            document.querySelectorAll("[data-trust-stat-edit]").forEach((button) => {
              button.addEventListener("click", () => {
                const stat = trustStats.find(
                  (item) => String(item.id) === String(button.dataset.trustStatEdit)
                );

                if (stat) {
                  window.openTrustStatForm(stat);
                }
              });
            });

            document.querySelectorAll("[data-trust-stat-toggle]").forEach((button) => {
              button.addEventListener("click", async () => {
                const stat = trustStats.find(
                  (item) => String(item.id) === String(button.dataset.trustStatToggle)
                );

                if (!stat) return;

                try {
                  await contentApi.updateContentTrustStat(stat.id, {
                    is_active: !stat.is_active,
                  });

                  showToast(
                    `Trust stat ${stat.is_active ? "deactivated" : "activated"}.`,
                    "success"
                  );

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);
                  showToast(
                    error?.message || "Failed to update trust stat status.",
                    "error"
                  );
                }
              });
            });

            document.querySelectorAll("[data-trust-stat-delete]").forEach((button) => {
              button.addEventListener("click", async () => {
                const stat = trustStats.find(
                  (item) => String(item.id) === String(button.dataset.trustStatDelete)
                );

                if (!stat) return;

                if (
                  !window.confirm(
                    `Delete trust stat "${stat.value} ${stat.label}"?`
                  )
                ) {
                  return;
                }

                try {
                  await contentApi.deleteContentTrustStat(stat.id);

                  showToast("Trust stat deleted successfully.", "success");

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);
                  showToast(
                    error?.message || "Failed to delete trust stat.",
                    "error"
                  );
                }
              });
            });

            document
              .querySelector("#content-add-website-page")
              ?.addEventListener("click", () => {
                window.openWebsitePageForm();
              });

            document.querySelectorAll("[data-website-page-edit]").forEach((button) => {
              button.addEventListener("click", () => {
                const page = websitePages.find(
                  (item) =>
                    String(item.id) === String(button.dataset.websitePageEdit)
                );

                if (page) {
                  window.openWebsitePageForm(page);
                }
              });
            });

            document.querySelectorAll("[data-website-page-toggle]").forEach((button) => {
              button.addEventListener("click", async () => {
                const page = websitePages.find(
                  (item) =>
                    String(item.id) === String(button.dataset.websitePageToggle)
                );

                if (!page) return;

                try {
                  await contentApi.toggleContentWebsitePagePublished(page.id);

                  showToast(
                    page.is_published
                      ? "Website page unpublished."
                      : "Website page published.",
                    "success"
                  );

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);

                  showToast(
                    error?.message || "Failed to update page status.",
                    "error"
                  );
                }
              });
            });

            document.querySelectorAll("[data-website-page-delete]").forEach((button) => {
              button.addEventListener("click", async () => {
                const page = websitePages.find(
                  (item) =>
                    String(item.id) === String(button.dataset.websitePageDelete)
                );

                if (!page) return;

                if (
                  !window.confirm(
                    `Delete website page "${page.title}"?`
                  )
                ) {
                  return;
                }

                try {
                  await contentApi.deleteContentWebsitePage(page.id);

                  showToast("Website page deleted successfully.", "success");

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);

                  showToast(
                    error?.message || "Failed to delete website page.",
                    "error"
                  );
                }
              });
            });

            document
              .querySelector("#content-add-city")
              ?.addEventListener("click", () => {
                window.openCityForm();
              });

            document.querySelectorAll("[data-city-edit]").forEach((button) => {
              button.addEventListener("click", () => {
                const city = cities.find(
                  (item) => String(item.id) === String(button.dataset.cityEdit)
                );

                if (city) {
                  window.openCityForm(city);
                }
              });
            });

            document.querySelectorAll("[data-city-toggle]").forEach((button) => {
              button.addEventListener("click", async () => {
                const city = cities.find(
                  (item) => String(item.id) === String(button.dataset.cityToggle)
                );

                if (!city) return;

                try {
                  await contentApi.updateContentCity(city.id, {
                    is_active: !city.is_active,
                  });

                  showToast(
                    city.is_active
                      ? "City deactivated."
                      : "City activated.",
                    "success"
                  );

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);

                  showToast(
                    error?.message || "Failed to update city status.",
                    "error"
                  );
                }
              });
            });

            document.querySelectorAll("[data-city-delete]").forEach((button) => {
              button.addEventListener("click", async () => {
                const city = cities.find(
                  (item) => String(item.id) === String(button.dataset.cityDelete)
                );

                if (!city) return;

                if (
                  !window.confirm(
                    `Delete city "${city.name}"?`
                  )
                ) {
                  return;
                }

                try {
                  await contentApi.deleteContentCity(city.id);

                  showToast("City deleted successfully.", "success");

                  await loadData();
                  render();
                } catch (error) {
                  console.error(error);

                  showToast(
                    error?.message || "Failed to delete city.",
                    "error"
                  );
                }
              });
            });


  };

  render();
  await loadData();
}





export async function renderAdminStaff(app) {
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
  if (!window.location.hash.startsWith("#/admin/staff")) return;
  if (!hasPermission("staff", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  const state = {
    view: "staff",
    staff: [],
    roles: [],
    modules: [],
    search: "",
    roleFilter: "",
    sortKey: "name",
    sortDirection: 1,
    page: 1,
    pageSize: 10,
    selectedRoleId: null,
    loading: true,
    error: "",
    modal: null,
  };
  renderAdminLayout(
    app,
    "staff",
    '<section id="admin-staff-workspace" class="thp-admin-staff-workspace"></section>',
    {
      subtitle:
        "Enterprise Role-Based Access Control (RBAC), permission matrix, and administrative staff management.",
    },
  );
  const render = () => {
    const workspace = app.querySelector("#admin-staff-workspace");
    if (workspace) workspace.innerHTML = renderStaffWorkspace(state);
  };

  app._adminStaffEvents?.abort();
  const eventController = new AbortController();
  app._adminStaffEvents = eventController;

  app.addEventListener(
    "click",
    (event) => {
      const tab = event.target.closest("[data-staff-view]");
      if (tab) {
        state.view = tab.dataset.staffView;
        state.page = 1;
        render();
        return;
      }
      if (event.target.closest("[data-staff-retry]")) {
        loadStaffData();
        return;
      }
      if (event.target.closest("[data-modal-close]")) {
        state.modal = null;
        render();
        return;
      }
      const sortButton = event.target.closest("[data-staff-sort]");
      if (sortButton) {
        const key = sortButton.dataset.staffSort;
        state.sortDirection = state.sortKey === key ? -state.sortDirection : 1;
        state.sortKey = key;
        renderStaffListing(state);
        return;
      }
      if (event.target.closest("[data-staff-export]")) {
        exportStaffCsv(state);
        return;
      }
      const pageButton = event.target.closest("[data-staff-page]");
      if (pageButton) {
        state.page = Number(pageButton.dataset.staffPage);
        renderStaffListing(state);
        return;
      }
      const confirmButton = event.target.closest("[data-staff-confirm]");
      if (confirmButton) {
        runStaffConfirmation(confirmButton.dataset.staffConfirm);
        return;
      }
      const staffAction = event.target.closest("[data-staff-action]");
      if (staffAction) {
        const id = Number(staffAction.dataset.staffId);
        const person = state.staff.find((item) => Number(item.id) === id);
        const action = staffAction.dataset.staffAction;
        if (action === "create")
          state.modal = { type: "staff", mode: "create" };
        if (action === "edit" && person)
          state.modal = { type: "staff", mode: "edit", person };
        if (action === "toggle" && person) {
          state.modal = {
            type: "confirm",
            action: person.is_active ? "deactivate" : "activate",
            person,
          };
        }
        if (action === "password" && person)
          state.modal = { type: "password", person };
        render();
        return;
      }
      const roleAction = event.target.closest("[data-role-action]");
      if (roleAction) {
        const role = state.roles.find(
          (item) => Number(item.id) === Number(roleAction.dataset.roleId),
        );
        if (roleAction.dataset.roleAction === "create")
          state.modal = { type: "role", mode: "create" };
        if (roleAction.dataset.roleAction === "rename" && role)
          state.modal = { type: "role", mode: "edit", role };
        if (roleAction.dataset.roleAction === "delete" && role) {
          if (role.staff_count) {
            showAdminToast(
              `Cannot delete ${role.name}: ${role.staff_count} staff account${role.staff_count === 1 ? " is" : "s are"} assigned.`,
            );
            return;
          }
          state.modal = { type: "confirm", action: "delete-role", role };
        }
        render();
        return;
      }
    },
    { signal: eventController.signal },
  );
  app.addEventListener(
    "input",
    (event) => {
      if (event.target.id !== "admin-staff-search") return;
      state.search = event.target.value;
      state.page = 1;
      renderStaffListing(state);
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "change",
    (event) => {
      if (event.target.id === "admin-staff-role-filter") {
        state.roleFilter = event.target.value;
        state.page = 1;
        renderStaffListing(state);
        return;
      }
      if (event.target.id === "admin-selected-role") {
        state.selectedRoleId = Number(event.target.value);
        render();
        return;
      }
      const checkbox = event.target.closest("[data-permission-module]");
      if (!checkbox) return;
      savePermissionChange(checkbox);
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest("[data-staff-form]");
      if (!form) return;
      event.preventDefault();
      if (state.modal?.type === "staff") saveStaffForm(form);
      if (state.modal?.type === "role") saveRoleForm(form);
      if (state.modal?.type === "password") savePasswordForm(form);
    },
    { signal: eventController.signal },
  );

  render();
  await loadStaffData();

  async function loadStaffData() {
    if (!app.querySelector("#admin-staff-workspace")) return;
    state.loading = true;
    state.error = "";
    render();
    try {
      const [staffData, roleData, moduleData] = await Promise.all([
        getAdminStaff(),
        getAdminRoles(),
        getAdminModules(),
      ]);
      state.staff = staffData.results || [];
      state.roles = roleData.results || [];
      state.modules = moduleData.modules || [];
      state.selectedRoleId ||= state.roles[0]?.id || null;
      if (!state.selectedRoleId && state.roles.length)
        state.selectedRoleId = state.roles[0].id;
    } catch (error) {
      state.error = error.message || "Unable to load staff and role data.";
    } finally {
      state.loading = false;
      render();
    }
  }

  async function saveStaffForm(form) {
    const values = Object.fromEntries(new FormData(form));
    const modal = state.modal;
    const payload = {
      email: String(values.email || "").trim(),
      first_name: String(values.first_name || "").trim(),
      last_name: String(values.last_name || "").trim(),
      role_id: Number(values.role_id),
    };
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (modal.mode === "create") {
        payload.username = String(values.username || "").trim();
        payload.password = String(values.password || "");
        await createAdminStaff(payload);
        showAdminToast("Staff account created.");
      } else {
        if (Number(modal.person.id) !== Number(getAdminSession()?.admin?.id)) {
          payload.role_id = Number(values.role_id);
        } else {
          delete payload.role_id;
        }
        await updateAdminStaff(modal.person.id, payload);
        showAdminToast("Staff account updated.");
      }
      state.modal = null;
      await loadStaffData();
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
      submit.disabled = false;
    }
  }

  async function saveRoleForm(form) {
    const values = Object.fromEntries(new FormData(form));
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (state.modal.mode === "create") {
        const result = await createAdminRole({
          name: String(values.name || "").trim(),
          description: String(values.description || "").trim(),
        });
        state.modal = null;
        state.selectedRoleId = result.role.id;
        const blankPermissions = Object.fromEntries(
          state.modules.map((module) => [
            module.key,
            { view: false, create: false, edit: false, delete: false },
          ]),
        );
        try {
          await updateAdminRolePermissions(result.role.id, blankPermissions);
          showAdminToast("Custom role created.");
        } catch (error) {
          showAdminToast(
            `Role created with no permissions; matrix initialization failed: ${apiErrorMessage(error)}`,
          );
        }
      } else {
        await updateAdminRole(state.modal.role.id, {
          name: String(values.name || "").trim(),
          description: String(values.description || "").trim(),
        });
        showAdminToast("Role renamed.");
      }
      state.modal = null;
      await loadStaffData();
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
      submit.disabled = false;
    }
  }

  async function savePasswordForm(form) {
    const values = Object.fromEntries(new FormData(form));
    if (values.new_password !== values.confirm_password) {
      showAdminToast("The passwords do not match.");
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await resetAdminStaffPassword(state.modal.person.id, values.new_password);
      state.modal = null;
      render();
      showAdminToast(
        "Password reset. The staff member must sign in with the new password.",
      );
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
      submit.disabled = false;
    }
  }

  async function runStaffConfirmation(action) {
    const modal = state.modal;
    if (!modal || modal.action !== action) return;
    try {
      if (action === "delete-role") {
        await deleteAdminRole(modal.role.id);
        state.selectedRoleId = null;
        showAdminToast("Custom role deleted.");
      } else {
        const active = action === "activate";
        await setAdminStaffActive(modal.person.id, active);
        showAdminToast(
          active ? "Staff account activated." : "Staff account deactivated.",
        );
      }
      state.modal = null;
      await loadStaffData();
    } catch (error) {
      state.modal = null;
      render();
      showAdminToast(apiErrorMessage(error));
    }
  }

  async function savePermissionChange(checkbox) {
    const role = state.roles.find(
      (item) => Number(item.id) === Number(state.selectedRoleId),
    );
    if (!role) return;
    if (role.name === "Super Admin") {
      checkbox.checked = true;
      showAdminToast("Super Admin permissions are locked.");
      return;
    }
    const previous = Boolean(
      role.permissions?.[checkbox.dataset.permissionModule]?.[
        checkbox.dataset.permissionAction
      ],
    );
    const permissions = structuredClone(role.permissions || {});
    permissions[checkbox.dataset.permissionModule] ||= {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
    permissions[checkbox.dataset.permissionModule][
      checkbox.dataset.permissionAction
    ] = checkbox.checked;
    checkbox.disabled = true;
    try {
      const response = await updateAdminRolePermissions(role.id, permissions);
      const index = state.roles.findIndex(
        (item) => Number(item.id) === Number(role.id),
      );
      state.roles[index] = response.role;
      showAdminToast("Permission updated.");
      render();
    } catch (error) {
      checkbox.checked = previous;
      checkbox.disabled = false;
      showAdminToast(apiErrorMessage(error));
    }
  }
}

const STAFF_ROLE_ORDER = [
  "Super Admin",
  "Doctor",
  "Pharmacist",
  "Lab Technician",
  "Support Agent",
  "Content Manager",
  "Internship HR",
];

function staffRoleName(person) {
  return typeof person.role === "string"
    ? person.role
    : person.role?.name || "";
}

function isStaffActuallyActive(person) {
  if (person.is_active !== true) return false;
  const status = person.status ?? person.account_status;
  return status == null || String(status).trim().toLowerCase() === "active";
}

function staffStatusValue(person) {
  return person.status ?? person.account_status ?? person.is_active;
}

function groupStaffByRole(staff) {
  const groups = new Map();
  staff.forEach((person) => {
    const roleName = staffRoleName(person) || "Unassigned";
    if (!groups.has(roleName)) groups.set(roleName, []);
    groups.get(roleName).push(person);
  });

  const roleNames = [...groups.keys()];
  roleNames.sort((left, right) => {
    const leftIndex = STAFF_ROLE_ORDER.indexOf(left);
    const rightIndex = STAFF_ROLE_ORDER.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });

  return roleNames.map((roleName) => [roleName, groups.get(roleName)]);
}

function renderStaffWorkspace(state) {
  const activeCount = state.staff.filter(isStaffActuallyActive).length;
  return `
    <nav class="thp-admin-staff-tabs" aria-label="Staff and roles">
      <span class="thp-admin-staff-tab-indicator" aria-hidden="true" style="--tab-index:${state.view === "staff" ? 0 : 1}"></span>
      <button type="button" role="tab" aria-selected="${state.view === "staff"}" class="${state.view === "staff" ? "is-active" : ""}" data-staff-view="staff"><span>Active Staff</span><span class="thp-admin-staff-tab-count">${activeCount}</span></button>
      <button type="button" role="tab" aria-selected="${state.view === "roles"}" class="${state.view === "roles" ? "is-active" : ""}" data-staff-view="roles"><span>Permission Matrix</span><span class="thp-admin-staff-tab-count">${state.roles.length}</span></button>
    </nav>
    ${state.error ? `<div class="thp-admin-users-alert" role="alert">${escapeHtml(state.error)} <button type="button" data-staff-retry>Retry</button></div>` : ""}
    ${state.loading ? `<div class="thp-admin-panel"><div class="thp-admin-loading-state">Loading staff and roles...</div></div>` : state.view === "staff" ? renderStaffPanel(state) : renderRolesPanel(state)}
    ${renderStaffModal(state)}
  `;
}

function renderStaffPanel(state) {
  const roleOptions = state.roles;
  return `
    <section class="thp-admin-staff-directory-card">
      <header class="thp-admin-panel-heading thp-admin-staff-panel-heading">
        <div><h3>Administrative Staff</h3><p>Users with system dashboard access</p></div>
        ${hasPermission("staff", "create") ? `<button type="button" class="thp-admin-users-add" data-staff-action="create">${userIcon("plus")}<span>Invite Staff</span></button>` : ""}
      </header>
      <div class="thp-admin-users-toolbar thp-admin-staff-toolbar">
        <label class="thp-admin-users-searchbox">${userIcon("search")}<input id="admin-staff-search" type="search" value="${escapeHtml(state.search)}" placeholder="Search staff by name or email..." aria-label="Search staff by name or email" /></label>
        <div class="thp-admin-users-toolbar-actions">
          <label class="thp-admin-users-filterbox"><span class="thp-admin-sr-only">Filter by role</span><select id="admin-staff-role-filter" aria-label="Filter staff by role"><option value="">All Role</option>${roleOptions.map((role) => `<option value="${escapeHtml(role.name)}" ${state.roleFilter === role.name ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select>${userIcon("chevronDown")}</label>
          <button type="button" class="thp-admin-users-export" data-staff-export ${getFilteredStaff(state).length ? "" : "disabled"}>${userIcon("download")}<span>Export CSV</span></button>
        </div>
      </div>
      <div id="admin-staff-table-region">${renderStaffTable(state)}</div>
    </section>
  `;
}

function renderStaffTable(state) {
  const filtered = getFilteredStaff(state);
  const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  if (!filtered.length)
    return `<div class="thp-admin-empty-state"><div class="thp-admin-empty-icon">♙</div><strong>${state.staff.some(isStaffActuallyActive) ? "No matching active staff" : "No active staff accounts"}</strong><span>${state.staff.some(isStaffActuallyActive) ? "Try another search or role." : "Active accounts will appear here."}</span></div><footer class="thp-admin-staff-pagination"><span>Showing 0 to 0 of 0 records</span></footer>`;
  const start = (state.page - 1) * state.pageSize;
  const staff = filtered.slice(start, start + state.pageSize);
  const groupedStaff = groupStaffByRole(staff);
  const sortHeader = (label, key) =>
    `<th aria-sort="${state.sortKey === key ? (state.sortDirection === 1 ? "ascending" : "descending") : "none"}"><button class="thp-admin-users-sort ${state.sortKey === key ? "is-sorted" : ""}" type="button" data-staff-sort="${key}"><span>${label}</span>${userIcon(state.sortKey === key && state.sortDirection < 0 ? "sortDown" : "sortUp")}</button></th>`;
  const groupedRows = groupedStaff
    .map(
      ([roleName, members]) => `
        <tr class="thp-admin-staff-role-group"><th colspan="6" scope="rowgroup">${escapeHtml(roleName)}</th></tr>
        ${members
          .map(
            (person) => `
              <tr>
                <td><strong>${escapeHtml(person.name || person.username || "—")}</strong></td>
                <td>${escapeHtml(person.email || "—")}</td>
                <td><span class="thp-admin-user-role">${escapeHtml(staffRoleName(person) || "—")}</span></td>
                <td>${escapeHtml(formatAdminTimestamp(person.last_login))}</td>
                <td>${renderStatus(staffStatusValue(person))}</td>
                <td><div class="thp-admin-users-row-actions">
                  ${canManageStaffAccount(person) ? `<button class="thp-admin-users-icon-button" type="button" data-staff-action="password" data-staff-id="${person.id}" aria-label="Reset password for ${escapeHtml(person.username)}" title="Reset password">${userIcon("key")}</button><button class="thp-admin-users-icon-button is-edit" type="button" data-staff-action="edit" data-staff-id="${person.id}" aria-label="Edit ${escapeHtml(person.username)}" title="Edit">${userIcon("edit")}</button><button class="thp-admin-users-icon-button is-suspend" type="button" data-staff-action="toggle" data-staff-active="true" data-staff-id="${person.id}" aria-label="Deactivate ${escapeHtml(person.username)}" title="Deactivate" ${Number(person.id) === Number(getAdminSession()?.admin?.id) ? "disabled" : ""}>${userIcon("pause")}</button>` : ""}
                </div></td>
              </tr>`,
          )
          .join("")}`,
    )
    .join("");
  return `<div class="thp-admin-table-wrapper thp-admin-staff-table-wrapper"><table class="thp-admin-table thp-admin-staff-table"><thead><tr>${sortHeader("STAFF MEMBER", "name")}<th>EMAIL ADDRESS</th>${sortHeader("ASSIGNED ROLE", "role")}<th>LAST LOGIN</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${groupedRows}</tbody></table></div><footer class="thp-admin-staff-pagination"><span>Showing ${start + 1} to ${Math.min(start + staff.length, filtered.length)} of ${filtered.length} records</span><div><button type="button" data-staff-page="${Math.max(1, state.page - 1)}" aria-label="Previous page" ${state.page <= 1 ? "disabled" : ""}>${userIcon("chevronLeft")}</button><span>Page ${state.page} of ${pageCount}</span><button type="button" data-staff-page="${Math.min(pageCount, state.page + 1)}" aria-label="Next page" ${state.page >= pageCount ? "disabled" : ""}>${userIcon("chevronRight")}</button></div></footer>`;
}

function getFilteredStaff(state) {
  const search = state.search.trim().toLowerCase();
  return state.staff
    .filter(
      (person) =>
        isStaffActuallyActive(person) &&
        (!search ||
          [person.name, person.email].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search))),
    )
    .filter(
      (person) => !state.roleFilter || staffRoleName(person) === state.roleFilter,
    )
    .sort((left, right) => {
      const first =
        state.sortKey === "role" ? staffRoleName(left) : left.name || "";
      const second =
        state.sortKey === "role" ? staffRoleName(right) : right.name || "";
      return (
        String(first).localeCompare(String(second), undefined, {
          sensitivity: "base",
        }) * state.sortDirection
      );
    });
}

function renderStaffListing(state) {
  const region = document.querySelector("#admin-staff-table-region");
  if (region) region.innerHTML = renderStaffTable(state);
  const exportButton = document.querySelector("[data-staff-export]");
  if (exportButton)
    exportButton.disabled = getFilteredStaff(state).length === 0;
}

function exportStaffCsv(state) {
  const columns = [
    "Staff member",
    "Email address",
    "Assigned role",
    "Last login",
    "Status",
  ];
  const rows = getFilteredStaff(state).map((person) => [
    person.name || person.username,
    person.email,
    staffRoleName(person),
    person.last_login,
    staffStatusValue(person) === true
      ? "Active"
      : staffStatusValue(person) === false
        ? "Inactive"
        : staffStatusValue(person),
  ]);
  const csv = [columns, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `tatito-staff-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function canManageStaffAccount(person) {
  const actorIsSuperAdmin = getAdminSession()?.admin?.role === "Super Admin";
  return (
    hasPermission("staff", "edit") &&
    (actorIsSuperAdmin || person.role?.name !== "Super Admin")
  );
}

function renderRolesPanel(state) {
  const selectedRole = state.roles.find(
    (role) => Number(role.id) === Number(state.selectedRoleId),
  );
  if (!selectedRole) {
    return `<section class="thp-admin-staff-matrix-card"><div class="thp-admin-empty-state"><strong>No roles found</strong><span>Roles will appear here when loaded from the admin system.</span></div></section>`;
  }
  return `<section class="thp-admin-staff-matrix-card">${renderPermissionMatrix(state, selectedRole)}</section>`;
}

function renderPermissionMatrix(state, role) {
  const immutable = role.name === "Super Admin";
  const ownRole = role.name === getAdminSession()?.admin?.role;
  const locked = immutable || ownRole;
  return `<header class="thp-admin-staff-matrix-heading">
    <div><h3>Live RBAC Permission Matrix</h3><p>Changes apply immediately across all navigation items, routes, and action buttons.</p></div>
    <div class="thp-admin-staff-matrix-controls">
      <label class="thp-admin-staff-role-select"><span class="thp-admin-sr-only">Select role</span><select id="admin-selected-role" aria-label="Select role">${state.roles.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(role.id) ? "selected" : ""}>Role: ${escapeHtml(item.name)}</option>`).join("")}</select>${userIcon("chevronDown")}</label>
      ${hasPermission("staff", "create") ? `<button type="button" class="thp-admin-users-add" data-role-action="create">${userIcon("plus")}<span>Add Role</span></button>` : ""}
      <div class="thp-admin-role-actions">
        ${hasPermission("staff", "edit") && !role.is_system_role ? `<button type="button" class="thp-admin-secondary-button" data-role-action="rename" data-role-id="${role.id}">Rename</button>` : ""}
        ${hasPermission("staff", "delete") && !role.is_system_role ? `<button type="button" class="thp-admin-row-button is-danger" data-role-action="delete" data-role-id="${role.id}" ${role.staff_count ? `title="Reassign ${role.staff_count} staff account${role.staff_count === 1 ? "" : "s"} before deleting"` : ""}>Delete</button>` : ""}
      </div>
    </div>
  </header>
  <div class="thp-admin-staff-role-meta"><span>${role.is_system_role ? "System role" : "Custom role"}</span><span>${role.staff_count} assigned staff</span>${immutable ? `<span class="is-locked">${userIcon("lock")}Permissions locked</span>` : ownRole ? `<span class="is-locked">${userIcon("lock")}Your role cannot be edited here</span>` : ""}</div>
  <div class="thp-admin-permission-matrix-wrap"><table class="thp-admin-permission-matrix"><thead><tr><th>MODULE NAME</th><th>VIEW</th><th>CREATE</th><th>EDIT</th><th>DELETE</th></tr></thead><tbody>${state.modules.map((module) => `<tr><th scope="row">${escapeHtml(module.label)}</th>${["view", "create", "edit", "delete"].map((action) => `<td><input type="checkbox" data-permission-module="${escapeHtml(module.key)}" data-permission-action="${action}" ${role.permissions?.[module.key]?.[action] ? "checked" : ""} ${locked || !hasPermission("staff", "edit") ? "disabled" : ""} aria-label="${escapeHtml(module.label)} ${action}" /></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderStaffModal(state) {
  const modal = state.modal;
  if (!modal) return "";
  const roleOptions = state.roles
    .filter(
      (role) =>
        role.name !== "Super Admin" ||
        getAdminSession()?.admin?.role === "Super Admin",
    )
    .map(
      (role) =>
        `<option value="${role.id}" ${Number(role.id) === Number(modal.person?.role?.id) ? "selected" : ""}>${escapeHtml(role.name)}</option>`,
    )
    .join("");

  if (modal.type === "confirm") {
    const deletingRole = modal.action === "delete-role";
    const title = deletingRole
      ? "Delete custom role?"
      : modal.action === "deactivate"
        ? "Deactivate staff account?"
        : "Activate staff account?";
    const description = deletingRole
      ? `Delete the custom role “${modal.role.name}”? This cannot be undone.`
      : `${modal.action === "deactivate" ? "Deactivate" : "Activate"} ${modal.person.name || modal.person.username}?`;
    return `<div class="thp-admin-modal" data-staff-modal><div class="thp-admin-modal-backdrop" data-modal-close></div><section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-confirm-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">CONFIRM ACTION</p><h2 id="staff-confirm-title">${title}</h2></div><button class="thp-admin-modal-close" type="button" data-modal-close aria-label="Close">×</button></header><div class="thp-admin-staff-modal-body"><p>${escapeHtml(description)}</p>${deletingRole ? `<p class="thp-admin-form-note">The server will reject deletion if any staff account is still assigned to this role.</p>` : ""}<footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-modal-close>Cancel</button><button type="button" class="thp-admin-primary-button ${modal.action === "deactivate" || deletingRole ? "is-danger" : ""}" data-staff-confirm="${modal.action}">${deletingRole ? "Delete Role" : modal.action === "deactivate" ? "Deactivate" : "Activate"}</button></footer></div></section></div>`;
  }

  if (modal.type === "staff") {
    const edit = modal.mode === "edit";
    const person = modal.person || {};
    const firstName = person.first_name || person.name?.split(" ")[0] || "";
    const lastName =
      person.last_name || person.name?.split(" ").slice(1).join(" ") || "";
    const ownAccount =
      edit && Number(person.id) === Number(getAdminSession()?.admin?.id);
    return `<div class="thp-admin-modal" data-staff-modal><div class="thp-admin-modal-backdrop" data-modal-close></div><section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-form-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">STAFF MANAGEMENT</p><h2 id="staff-form-title">${edit ? "Edit Staff Account" : "Create Staff Account"}</h2></div><button class="thp-admin-modal-close" type="button" data-modal-close aria-label="Close">×</button></header><form data-staff-form class="thp-admin-staff-form">
      <div class="thp-admin-form-grid">
        <div class="thp-admin-form-group"><label for="staff-first-name">First name <b>*</b></label><input id="staff-first-name" name="first_name" type="text" maxlength="150" value="${escapeHtml(firstName)}" required /></div>
        <div class="thp-admin-form-group"><label for="staff-last-name">Last name</label><input id="staff-last-name" name="last_name" type="text" maxlength="150" value="${escapeHtml(lastName)}" /></div>
        <div class="thp-admin-form-group"><label for="staff-username">Username <b>*</b></label><input id="staff-username" name="username" type="text" value="${escapeHtml(person.username || "")}" ${edit ? "readonly" : "required"} autocomplete="username" /></div>
        <div class="thp-admin-form-group"><label for="staff-email">Email <b>*</b></label><input id="staff-email" name="email" type="email" value="${escapeHtml(person.email || "")}" autocomplete="email" required /></div>
        ${edit ? "" : `<div class="thp-admin-form-group"><label for="staff-password">Initial password <b>*</b></label><input id="staff-password" name="password" type="password" minlength="8" autocomplete="new-password" required /><small>Must meet the server's password rules.</small></div>`}
        <div class="thp-admin-form-group"><label for="staff-role">Role <b>*</b></label><select id="staff-role" name="role_id" required ${ownAccount ? "disabled" : ""}>${roleOptions}</select>${ownAccount ? `<small>You cannot change your own role.</small>` : ""}</div>
      </div>
      <p class="thp-admin-form-note">Phone numbers are not part of the existing admin account model. New accounts are active by default.</p>
      <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-modal-close>Cancel</button><button type="submit" class="thp-admin-primary-button">${edit ? "Save Changes" : "Create Account"}</button></footer>
    </form></section></div>`;
  }

  if (modal.type === "password") {
    return `<div class="thp-admin-modal" data-staff-modal><div class="thp-admin-modal-backdrop" data-modal-close></div><section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-password-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">ACCOUNT SECURITY</p><h2 id="staff-password-title">Reset Password</h2></div><button class="thp-admin-modal-close" type="button" data-modal-close aria-label="Close">×</button></header><form data-staff-form class="thp-admin-staff-form"><p class="thp-admin-form-note">Set a new password for ${escapeHtml(modal.person.name || modal.person.username)}. The existing password is never displayed.</p><div class="thp-admin-form-group"><label for="staff-new-password">New password <b>*</b></label><input id="staff-new-password" name="new_password" type="password" minlength="8" autocomplete="new-password" required /></div><div class="thp-admin-form-group"><label for="staff-confirm-password">Confirm new password <b>*</b></label><input id="staff-confirm-password" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required /></div><footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-modal-close>Cancel</button><button type="submit" class="thp-admin-primary-button">Reset Password</button></footer></form></section></div>`;
  }

  const role = modal.role || {};
  return `<div class="thp-admin-modal" data-staff-modal><div class="thp-admin-modal-backdrop" data-modal-close></div><section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="role-form-title"><header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">ROLE MANAGEMENT</p><h2 id="role-form-title">${modal.mode === "edit" ? "Rename Custom Role" : "Create Custom Role"}</h2></div><button class="thp-admin-modal-close" type="button" data-modal-close aria-label="Close">×</button></header><form data-staff-form class="thp-admin-staff-form"><div class="thp-admin-form-grid"><div class="thp-admin-form-group"><label for="role-name">Role name <b>*</b></label><input id="role-name" name="name" type="text" maxlength="100" value="${escapeHtml(role.name || "")}" required /></div><div class="thp-admin-form-group"><label for="role-description">Description</label><input id="role-description" name="description" type="text" value="${escapeHtml(role.description || "")}" /></div></div><p class="thp-admin-form-note">${modal.mode === "create" ? "New roles start with no permissions. Configure the permission matrix after creation." : "System roles cannot be renamed."}</p><footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-modal-close>Cancel</button><button type="submit" class="thp-admin-primary-button">${modal.mode === "edit" ? "Save Role" : "Create Role"}</button></footer></form></section></div>`;
}

function formatAdminDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatAdminTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export async function renderAdminUsers(app) {
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
  if (!window.location.hash.startsWith("#/admin/users")) return;
  if (!hasPermission("users", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  const staticAccounts = getUsers().map(normalizeUserRecord);
  const state = {
    activeTab: "patients",
    search: "",
    filter: "",
    sortKey: "name",
    sortDirection: 1,
    apiUsers: [],
    apiDoctors: null,
    apiProviders: [],
    loading: true,
    error: "",
    feedback: "",
    visibleRows: [],
    modal: null,
  };

  renderAdminLayout(
    app,
    "users",
    '<section id="admin-users-workspace" class="thp-admin-users-workspace"></section>',
    {
      subtitle:
        "Comprehensive administration for patients, verified clinical doctors, and healthcare partners.",
    },
  );
  app._adminUsersEvents?.abort();
  const eventController = new AbortController();
  app._adminUsersEvents = eventController;
  const renderToken = Symbol("admin-users-render");
  app._adminUsersRenderToken = renderToken;

  const submitUserModal = async (form) => {
    if (!state.modal) return;
    if (state.modal.type === "user-form" && state.modal.mode === "view") {
      state.modal = null;
      render();
      return;
    }
    const values = Object.fromEntries(new FormData(form).entries());
    const modal = state.modal;
    const row = modal.row || {};
    const button = form.querySelector('[type="submit"]');
    let doctorActionSuccessMessage = "";
    if (button) button.disabled = true;
    try {
      if (modal.type === "user-form") {
        const role = String(values.role || "patient").toLowerCase();
        const payload = {
          name: String(values.name || "").trim(),
          email: String(values.email || "").trim(),
          mobile: String(values.mobile || "").trim(),
          role,
          status: String(values.status || "active"),
        };
        if (modal.tab === "patients") {
          payload.city = String(values.city || "").trim();
          payload.gender = String(values.gender || "");
          payload.dateOfBirth = String(values.dateOfBirth || "");
          payload.bloodGroup = String(values.bloodGroup || "");
        }
        if (modal.tab === "doctors") {
          payload.specialty = String(values.specialty || "").trim();
          payload.city = String(values.city || "").trim();
          payload.location = String(values.location || "").trim();
          payload.bio = String(values.bio || "").trim();
          payload.fee = values.fee === "" ? 0 : Number(values.fee);
        }
        if (modal.tab === "partners") {
          payload.partnerRole = String(values.partnerRole || "").trim();
          payload.city = String(values.city || "").trim();
          payload.availability = String(values.availability || "available");
        }
        if (values.password) payload.password = String(values.password);
        if (modal.mode === "create") {
          await createAdminUser(payload);
          showAdminToast("Account created successfully.");
        } else if (modal.tab === "doctors" && !row.accountId) {
          await updateAdminDoctor(
            String(row.doctorId || row.id || row._id || ""),
            {
              name: payload.name,
              specialty: payload.specialty,
              city: payload.city,
              location: payload.location,
              bio: payload.bio,
              fee: payload.fee,
            },
          );
          showAdminToast("Doctor profile updated successfully.");
        } else {
          await updateAdminUser(
            String(row.accountId || row.id || row._id || ""),
            payload,
          );
          showAdminToast("Account updated successfully.");
        }
      }

      if (modal.type === "wallet") {
        const userId = String(values.userId || row.id || row._id || "");
        const amount = Number(values.amount);
        const reason = String(values.reason || "").trim();
        if (modal.action === "wallet-credit") {
          await creditAdminWallet(userId, amount, reason);
          showAdminToast("Wallet credit applied.");
        } else {
          await debitAdminWallet(userId, amount, reason);
          showAdminToast("Wallet debit applied.");
        }
      }

      if (modal.type === "confirm") {
        const userId = String(values.userId || row.id || row._id || "");
        const reason = String(values.reason || "").trim();
        const action = modal.action;

        if (action === "delete") {
          if (modal.tab === "doctors") {
            const doctorId = String(row.doctorId || row.id || row._id || "");
            const response = await deleteAdminDoctor(doctorId);
            if (response?.success === false)
              throw new Error(response.message || "Doctor deletion failed.");
            doctorActionSuccessMessage = "Doctor deleted successfully.";
          } else {
            await deleteAdminUser(userId);
            showAdminToast("User deleted successfully.");
          }
        } else if (action === "toggle-availability") {
          await updateAdminUser(userId, {
            availability:
              row.availability === "available" ? "unavailable" : "available",
          });
          showAdminToast("Partner availability updated.");
        } else if (modal.tab === "doctors") {
          const doctorId = String(row.doctorId || row.id || row._id || "");
          const response = await setAdminDoctorStatus(doctorId, action, reason);
          if (response?.success === false)
            throw new Error(response.message || "Doctor status update failed.");
          doctorActionSuccessMessage = `${titleCase(action)} completed successfully.`;
        } else {
          await setAdminUserStatus(userId, action, reason);
          showAdminToast(`${titleCase(action)} completed successfully.`);
        }
      }

      state.modal = null;
      state.feedback = "";
      renderFeedback(app, "");
      const listRefreshed = await loadUsers();
      render();
      if (doctorActionSuccessMessage) {
        showAdminToast(
          listRefreshed
            ? doctorActionSuccessMessage
            : `${doctorActionSuccessMessage} The backend list refresh failed; retry to confirm the displayed state.`,
        );
      }
    } catch (error) {
      const message =
        apiErrorMessage(error) || "The request could not be completed.";
      state.feedback = message;
      renderFeedback(app, message);
      showAdminToast(message);
    } finally {
      if (button) button.disabled = false;
    }
  };

  const render = () => {
    if (app._adminUsersRenderToken !== renderToken) return;
    const workspace = app.querySelector("#admin-users-workspace");
    if (!workspace) return;
    workspace.innerHTML = renderUsersWorkspace(state, staticAccounts);
    renderUsersTableRegion(state, staticAccounts);
  };

  const updateTable = () => renderUsersTableRegion(state, staticAccounts);

  app.addEventListener(
    "click",
    (event) => {
      const tabButton = event.target.closest("[data-user-tab]");
      if (tabButton) {
        state.activeTab = tabButton.dataset.userTab;
        state.search = "";
        state.filter = "";
        state.sortKey = "name";
        state.sortDirection = 1;
        state.feedback = "";
        state.modal = null;
        render();
        return;
      }

      if (event.target.closest("[data-user-retry]")) {
        loadUsers();
        return;
      }

      const sortButton = event.target.closest("[data-user-sort]");
      if (sortButton) {
        const key = sortButton.dataset.userSort;
        state.sortDirection = state.sortKey === key ? -state.sortDirection : 1;
        state.sortKey = key;
        updateTable();
        return;
      }

      if (event.target.closest("[data-user-export]")) {
        exportUsersCsv(state);
        return;
      }

      const closeButton = event.target.closest("[data-user-close]");
      if (closeButton) {
        app.querySelector("#admin-user-details")?.close();
        state.modal = null;
        render();
        return;
      }

      const closeModal = event.target.closest("[data-user-modal-close]");
      if (closeModal) {
        state.modal = null;
        render();
        return;
      }

      const actionButton = event.target.closest("[data-user-action]");
      if (!actionButton) return;
      const action = actionButton.dataset.userAction;
      const row = state.visibleRows.find(
        (item) => userRowKey(item) === actionButton.dataset.userKey,
      );

      if (action === "view") {
        if (row) {
          if (row.healthcareProviderId) {
            window.location.hash =
              `#/admin/providers?providerId=${encodeURIComponent(row.healthcareProviderId)}&providerAction=view`;
            return;
          }
          state.modal = {
            type: "user-form",
            mode: "view",
            tab: state.activeTab,
            row,
          };
          render();
        }
        return;
      }

      if (action === "add") {
        state.modal = {
          type: "user-form",
          mode: "create",
          tab: state.activeTab,
        };
        render();
        return;
      }

      if (action === "edit" && row) {
        if (row.healthcareProviderId) {
          window.location.hash =
            `#/admin/providers?providerId=${encodeURIComponent(row.healthcareProviderId)}&providerAction=edit`;
          return;
        }
        state.modal = {
          type: "user-form",
          mode: "edit",
          tab: state.activeTab,
          row,
        };
        render();
        return;
      }

      if (
        (action === "delete" ||
          [
            "block",
            "unblock",
            "deactivate",
            "reactivate",
            "approve",
            "reject",
            "suspend",
            "reinstate",
            "wallet-credit",
            "wallet-debit",
            "toggle-availability",
          ].includes(action)) &&
        row
      ) {
        state.modal = {
          type:
            action === "wallet-credit" || action === "wallet-debit"
              ? "wallet"
              : "confirm",
          action,
          row,
          tab: state.activeTab,
        };
        render();
        return;
      }

      state.feedback = "This action is not available for the selected record.";
      renderFeedback(app, state.feedback);
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "input",
    (event) => {
      if (event.target.id !== "admin-users-search") return;
      state.search = event.target.value;
      updateTable();
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "change",
    (event) => {
      if (event.target.id === "admin-users-filter") {
        state.filter = event.target.value;
      } else if (event.target.id === "admin-users-mobile-sort") {
        state.sortKey = event.target.value;
        state.sortDirection = 1;
      } else {
        return;
      }
      updateTable();
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest("[data-user-modal-form]");
      if (!form || !state.modal) return;
      event.preventDefault();
      submitUserModal(form);
    },
    { signal: eventController.signal },
  );

  render();
  loadUsers();

  async function loadUsers() {
    state.loading = true;
    state.error = "";
    let refreshed = false;
    render();
    try {
      const [apiUsers, apiDoctors, apiProviders] = await Promise.all([
        getAdminUsers(),
        getAdminDoctors(),
        hasPermission("providers", "view")
          ? getHealthcareProviders()
          : Promise.resolve([]),
      ]);
      if (app._adminUsersRenderToken !== renderToken) return;
      state.apiUsers = apiUsers;
      state.apiDoctors = apiDoctors;
      state.apiProviders = apiProviders;
      refreshed = true;
    } catch (error) {
      if (app._adminUsersRenderToken !== renderToken) return;
      state.error = error.message || "Unable to load the live user list.";
    } finally {
      if (app._adminUsersRenderToken !== renderToken) return;
      state.loading = false;
      render();
    }
    return refreshed;
  }
}

const USER_TAB_CONTENT = {
  patients: {
    label: "Patients",
    title: "Patient Directory",
    subtitle:
      "Registered patient accounts, wallet credits, and emergency profiles",
    search: "Search patients by name, email, phone...",
    add: "Add Patient",
  },
  doctors: {
    label: "Doctors",
    title: "Clinical Specialist Directory",
    subtitle: "Verification pipeline, board documents, and consult fees",
    search: "Search doctors by name, specialty, hospital...",
    add: "Add Doctor",
  },
  partners: {
    label: "Partners",
    title: "Healthcare Partners & Logistics",
    subtitle:
      "Pharmacists, Lab Technicians, Phlebotomists, and SwiftMed Riders",
    search: "Search partners...",
    add: "Add Partner",
  },
};

const PARTNER_ROLE_FILTERS = [
  "Pharmacist",
  "Lab Technician",
  "Phlebotomist",
  "Delivery",
];

function renderUserModal(state) {
  if (!state.modal) return "";

  const { modal } = state;
  const row = modal.row || {};
  const tab = modal.tab || state.activeTab;
  const tabName = USER_TAB_CONTENT[tab]?.label || "Account";
  if (modal.type === "user-form") {
    const isView = modal.mode === "view";
    const isDoctor = tab === "doctors";
    const isPartner = tab === "partners";
    const isEdit = modal.mode === "edit";
    const profileOnlyDoctor = isDoctor && isEdit && !row.accountId;
    const title = isView
      ? `${tabName.replace(/s$/, "")} Details`
      : isEdit
        ? `Edit ${tabName}`
        : `Add ${tabName}`;
    const defaultRole = isDoctor ? "doctor" : isPartner ? "partner" : "patient";
    const initialRole = String(row.role || defaultRole).toLowerCase();
    const selectedStatus = String(
      row.status ||
        (isDoctor ? row.verification_status || "pending" : "active"),
    ).toLowerCase();
    const selectedGender = String(row.gender || "").toLowerCase();
    const selectedBloodGroup = String(
      row.blood_group || row.bloodGroup || "",
    ).toUpperCase();
    const selectedAvailability = String(row.availability || "available");
    const readOnlyAttrs = isView ? "readonly disabled" : "";
    const selectAttrs = isView ? "disabled" : "";
    const submitLabel = isView
      ? "Close"
      : isEdit
        ? "Save Changes"
        : "Create Account";
    const submitButton = isView
      ? `<button type="button" class="thp-admin-primary-button" data-user-modal-close>Close</button>`
      : `<button type="submit" class="thp-admin-primary-button">${submitLabel}</button>`;

    return `
      <div class="thp-admin-modal" data-user-modal>
        <div class="thp-admin-modal-backdrop" data-user-modal-close></div>
        <section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
          <header class="thp-admin-modal-header">
            <div>
              <p class="thp-admin-eyebrow">${tab.toUpperCase()}</p>
              <h2 id="user-form-title">${escapeHtml(title)}</h2>
            </div>
            <button class="thp-admin-modal-close" type="button" data-user-modal-close aria-label="Close">×</button>
          </header>
          <form class="thp-admin-staff-form" data-user-modal-form>
            <input type="hidden" name="tab" value="${escapeHtml(tab)}" />
            <input type="hidden" name="mode" value="${escapeHtml(modal.mode)}" />
            <div class="thp-admin-form-grid">
              <div class="thp-admin-form-group">
                <label for="user-name">Name <b>*</b></label>
                <input id="user-name" name="name" type="text" value="${escapeHtml(row.name || "")}" ${readOnlyAttrs} ${!isView ? "required" : ""} />
              </div>
              ${
                !profileOnlyDoctor
                  ? `
                <div class="thp-admin-form-group">
                  <label for="user-email">Email <b>*</b></label>
                  <input id="user-email" name="email" type="email" value="${escapeHtml(row.email || "")}" ${readOnlyAttrs} ${!isView ? "required" : ""} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-mobile">Phone</label>
                  <input id="user-mobile" name="mobile" type="tel" value="${escapeHtml(row.mobile || row.phone || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-role">Role</label>
                  <select id="user-role" name="role" ${selectAttrs}>
                    <option value="patient" ${initialRole === "patient" ? "selected" : ""}>Patient</option>
                    <option value="doctor" ${initialRole === "doctor" ? "selected" : ""}>Doctor</option>
                    <option value="partner" ${initialRole === "partner" ? "selected" : ""}>Partner</option>
                  </select>
                </div>
              `
                  : ""
              }
              ${
                isDoctor
                  ? `
                <div class="thp-admin-form-group">
                  <label for="user-specialty">Specialty</label>
                  <input id="user-specialty" name="specialty" type="text" value="${escapeHtml(row.specialty || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-doctor-fee">Consult fee</label>
                  <input id="user-doctor-fee" name="fee" type="number" min="0" max="1000000" step="1" value="${escapeHtml(row.fee ?? "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-doctor-city">City</label>
                  <input id="user-doctor-city" name="city" type="text" value="${escapeHtml(row.city || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-doctor-location">Hospital affiliation</label>
                  <input id="user-doctor-location" name="location" type="text" value="${escapeHtml(row.location || row.hospital || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-doctor-bio">Bio</label>
                  <textarea id="user-doctor-bio" name="bio" rows="4" ${isView ? "readonly" : ""}>${escapeHtml(row.bio || row.detail || "")}</textarea>
                </div>
              `
                  : ""
              }
              ${
                isPartner
                  ? `
                <div class="thp-admin-form-group">
                  <label for="user-partner-role">Partner role</label>
                  <input id="user-partner-role" name="partnerRole" type="text" value="${escapeHtml(row.partner_role || row.partnerRole || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-partner-city">City</label>
                  <input id="user-partner-city" name="city" type="text" value="${escapeHtml(row.city || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-partner-availability">Availability</label>
                  <select id="user-partner-availability" name="availability" ${selectAttrs}>
                    <option value="available" ${selectedAvailability === "available" ? "selected" : ""}>Available</option>
                    <option value="unavailable" ${selectedAvailability === "unavailable" ? "selected" : ""}>Unavailable</option>
                  </select>
                </div>
              `
                  : ""
              }
              ${
                tab === "patients"
                  ? `
                <div class="thp-admin-form-group">
                  <label for="user-date-of-birth">Date of birth</label>
                  <input id="user-date-of-birth" name="dateOfBirth" type="date" value="${escapeHtml(row.date_of_birth || row.dateOfBirth || row.dob || "")}" ${readOnlyAttrs} />
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-blood-group">Blood group</label>
                  <select id="user-blood-group" name="bloodGroup" ${selectAttrs}>
                    <option value="">Select blood group</option>
                    ${["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => `<option value="${group}" ${selectedBloodGroup === group ? "selected" : ""}>${group}</option>`).join("")}
                  </select>
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-gender">Gender</label>
                  <select id="user-gender" name="gender" ${selectAttrs}>
                    <option value="">Select gender</option>
                    ${["Female", "Male", "Other"].map((gender) => `<option value="${gender}" ${selectedGender === gender.toLowerCase() ? "selected" : ""}>${gender}</option>`).join("")}
                  </select>
                </div>
                <div class="thp-admin-form-group">
                  <label for="user-patient-city">City</label>
                  <input id="user-patient-city" name="city" type="text" value="${escapeHtml(row.city || "")}" ${readOnlyAttrs} />
                </div>
              `
                  : ""
              }
              ${
                !profileOnlyDoctor
                  ? `<div class="thp-admin-form-group">
                <label for="user-status">Status</label>
                <select id="user-status" name="status" ${selectAttrs}>
                  <option value="active" ${selectedStatus === "active" ? "selected" : ""}>Active</option>
                  <option value="blocked" ${selectedStatus === "blocked" ? "selected" : ""}>Blocked</option>
                  <option value="deactivated" ${selectedStatus === "deactivated" ? "selected" : ""}>Deactivated</option>
                  <option value="pending" ${selectedStatus === "pending" ? "selected" : ""}>Pending</option>
                  <option value="verified" ${selectedStatus === "verified" ? "selected" : ""}>Verified</option>
                  <option value="rejected" ${selectedStatus === "rejected" ? "selected" : ""}>Rejected</option>
                  <option value="suspended" ${selectedStatus === "suspended" ? "selected" : ""}>Suspended</option>
                </select>
              </div>`
                  : ""
              }
              ${
                !isEdit
                  ? `
                <div class="thp-admin-form-group">
                  <label for="user-password">Password</label>
                  <input id="user-password" name="password" type="password" placeholder="${isView ? "" : "Leave blank to default"}" ${isView ? "readonly disabled" : ""} />
                </div>
              `
                  : ""
              }
            </div>
            <footer class="thp-admin-modal-footer">
              ${isView ? "" : `<button type="button" class="thp-admin-secondary-button" data-user-modal-close>Cancel</button>`}
              ${submitButton}
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  if (modal.type === "wallet") {
    const directionLabel =
      modal.action === "wallet-credit" ? "credit" : "debit";
    return `
      <div class="thp-admin-modal" data-user-modal>
        <div class="thp-admin-modal-backdrop" data-user-modal-close></div>
        <section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <header class="thp-admin-modal-header">
            <div>
              <p class="thp-admin-eyebrow">USER MANAGEMENT</p>
              <h2 id="wallet-title">Wallet ${directionLabel}</h2>
            </div>
            <button class="thp-admin-modal-close" type="button" data-user-modal-close aria-label="Close">×</button>
          </header>
          <form class="thp-admin-staff-form" data-user-modal-form>
            <input type="hidden" name="action" value="${escapeHtml(modal.action)}" />
            <input type="hidden" name="userId" value="${escapeHtml(String(row.id || row._id || ""))}" />
            <div class="thp-admin-form-grid">
              <div class="thp-admin-form-group">
                <label for="wallet-amount">Amount <b>*</b></label>
                <input id="wallet-amount" name="amount" type="number" min="1" step="0.01" required />
              </div>
              <div class="thp-admin-form-group">
                <label for="wallet-reason">Reason <b>*</b></label>
                <textarea id="wallet-reason" name="reason" rows="4" placeholder="Describe why this wallet entry is being ${directionLabel}." required></textarea>
              </div>
            </div>
            <footer class="thp-admin-modal-footer">
              <button type="button" class="thp-admin-secondary-button" data-user-modal-close>Cancel</button>
              <button type="submit" class="thp-admin-primary-button">Confirm ${directionLabel}</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  const actionLabels = {
    delete: "Delete account",
    block: "Block account",
    unblock: "Unblock account",
    deactivate: "Deactivate account",
    reactivate: "Reactivate account",
    approve: "Approve doctor",
    reject: "Reject doctor",
    suspend: "Suspend doctor",
    reinstate: "Reinstate doctor",
    "toggle-availability": "Toggle partner availability",
  };
  const label = actionLabels[modal.action] || "Confirm action";
  const needsReason = [
    "block",
    "deactivate",
    "reject",
    "suspend",
    "delete",
  ].includes(modal.action);

  return `
    <div class="thp-admin-modal" data-user-modal>
      <div class="thp-admin-modal-backdrop" data-user-modal-close></div>
      <section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="user-confirm-title">
        <header class="thp-admin-modal-header">
          <div>
            <p class="thp-admin-eyebrow">CONFIRM ACTION</p>
            <h2 id="user-confirm-title">${label}</h2>
          </div>
          <button class="thp-admin-modal-close" type="button" data-user-modal-close aria-label="Close">×</button>
        </header>
        <form class="thp-admin-staff-form" data-user-modal-form>
          <input type="hidden" name="action" value="${escapeHtml(modal.action)}" />
          <input type="hidden" name="userId" value="${escapeHtml(String(row.id || row._id || ""))}" />
          <p class="thp-admin-form-note">This action will update the live account record for <strong>${escapeHtml(row.name || "this user")}</strong>.</p>
          ${needsReason ? `<div class="thp-admin-form-group"><label for="confirm-reason">Reason <b>*</b></label><textarea id="confirm-reason" name="reason" rows="4" required></textarea></div>` : ""}
          <footer class="thp-admin-modal-footer">
            <button type="button" class="thp-admin-secondary-button" data-user-modal-close>Cancel</button>
            <button type="submit" class="thp-admin-primary-button">Confirm</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

function renderUsersWorkspace(state, staticAccounts) {
  const counts = getUserTabRows(state, staticAccounts);
  const activeTab = USER_TAB_CONTENT[state.activeTab];
  const exportCount =
    state.loading && state.activeTab === "patients"
      ? 0
      : counts[state.activeTab].filter((row) => matchesUserFilters(row, state))
          .length;
  const statusValues = [
    ...new Set(
      counts[state.activeTab]
        .map((row) => userStatus(row, state.activeTab))
        .filter((value) => value !== "" && value != null),
    ),
  ];
  const filterOptions =
    state.activeTab === "partners" ? PARTNER_ROLE_FILTERS : statusValues;
  const filterLabel =
    state.activeTab === "partners" ? "All Role" : "All Status";
  const sortOptions =
    state.activeTab === "patients"
      ? [["name", "Name"], ["wallet", "Wallet"]]
      : state.activeTab === "doctors"
        ? [["name", "Name"], ["fee", "Consult fee"], ["rating", "Rating"]]
        : [["name", "Name"], ["role", "Partner role"]];

  return `
    <div class="thp-admin-users-tabs" role="tablist" aria-label="User categories">
      <span class="thp-admin-users-tab-indicator" aria-hidden="true" style="--tab-index:${["patients", "doctors", "partners"].indexOf(state.activeTab)}"></span>
      ${Object.entries(USER_TAB_CONTENT)
        .map(
          ([key, tab]) => `
        <button class="thp-admin-users-tab ${key === state.activeTab ? "is-active" : ""}" type="button" role="tab" aria-selected="${key === state.activeTab}" data-user-tab="${key}">
          <span>${tab.label}</span>
          <span class="thp-admin-users-tab-count">${counts[key].length}</span>
        </button>
      `,
        )
        .join("")}
    </div>
    ${
      state.error
        ? `
      <div class="thp-admin-users-alert" role="alert">
        <span><strong>Live account data could not be refreshed.</strong> ${escapeHtml(state.error)} Static project records remain available below.</span>
        <button type="button" class="thp-admin-users-retry" data-user-retry>${userIcon("refresh")}<span>Retry</span></button>
      </div>
    `
        : ""
    }
    <div id="admin-users-feedback" class="thp-admin-users-feedback" role="status" aria-live="polite" hidden></div>
    <section class="thp-admin-users-card" role="tabpanel" aria-label="${activeTab.label}">
      <header class="thp-admin-users-card-heading">
        <div>
          <h2>${activeTab.title}</h2>
          <p>${activeTab.subtitle}</p>
        </div>
        ${hasPermission("users", "create") ? `<button type="button" class="thp-admin-users-add" data-user-action="add">${userIcon("plus")}<span>${activeTab.add}</span></button>` : ""}
      </header>
      <div class="thp-admin-users-toolbar">
        <label class="thp-admin-users-searchbox">
          ${userIcon("search")}
          <input id="admin-users-search" type="search" value="${escapeHtml(state.search)}" placeholder="${activeTab.search}" aria-label="${activeTab.search}" />
        </label>
        <div class="thp-admin-users-toolbar-actions">
          <label class="thp-admin-users-filterbox">
            <span class="thp-admin-sr-only">${filterLabel}</span>
            <select id="admin-users-filter" aria-label="${filterLabel}" ${state.activeTab !== "partners" && !statusValues.length ? "disabled" : ""}>
              <option value="">${filterLabel}</option>
              ${filterOptions.map((option) => `<option value="${escapeHtml(option)}" ${state.filter === String(option) ? "selected" : ""}>${escapeHtml(statusOptionLabel(option))}</option>`).join("")}
            </select>
            ${userIcon("chevronDown")}
          </label>
          <label class="thp-admin-users-mobile-sortbox">
            <span class="thp-admin-sr-only">Sort by</span>
            <select id="admin-users-mobile-sort" aria-label="Sort by">
              ${sortOptions.map(([key, label]) => `<option value="${key}" ${state.sortKey === key ? "selected" : ""}>Sort: ${label}</option>`).join("")}
            </select>
            ${userIcon("chevronDown")}
          </label>
          <button type="button" class="thp-admin-users-export" data-user-export ${exportCount ? "" : "disabled"}>${userIcon("download")}<span>Export CSV</span></button>
        </div>
      </div>
      <div id="admin-users-table-region" class="thp-admin-users-table-region"></div>
    </section>
    <dialog id="admin-user-details" class="thp-admin-user-dialog">
      <div class="thp-admin-user-dialog-head"><h2>User details</h2><button type="button" data-user-close aria-label="Close details">${userIcon("close")}</button></div>
      <div id="admin-user-details-body"></div>
    </dialog>
    ${renderUserModal(state)}
  `;
}

function getUserTabRows(state, staticAccounts) {
  const accounts = mergeUserAccounts(staticAccounts, state.apiUsers);
  const patients = accounts.filter(
    (user) => user.role.toLowerCase() === "patient",
  );
  const doctorAccounts = accounts.filter(
    (user) => user.role.toLowerCase() === "doctor",
  );
  const doctorProfiles = state.apiDoctors ?? doctors;
  const matchedDoctorAccounts = new Set();
  const doctorRows = doctorProfiles.map((doctor) => {
    const account = doctorAccounts.find((user) =>
      user.doctorId
        ? user.doctorId === doctor.id
        : user.name && user.name.toLowerCase() === doctor.name.toLowerCase(),
    );
    if (account) matchedDoctorAccounts.add(userRowKey(account));
    return {
      ...doctor,
      id: account?.id || doctor.id,
      accountId: account?.id || "",
      doctorId: doctor.doctorId || doctor.id,
      name: account?.name || doctor.name,
      email: account?.email || "",
      mobile: account?.mobile || "",
      specialty: doctor.specialty || account?.specialty || "",
      city: doctor.city || account?.city || "",
      location: doctor.location || account?.location || doctor.hospital || "",
      hospital: doctor.hospital || doctor.location || account?.location || "",
      bio: doctor.bio || doctor.detail || account?.bio || "",
      fee: doctor.fee ?? account?.fee,
      credentialStatus:
        doctor.credentialStatus ||
        doctor.verification_status ||
        account?.verification_status ||
        account?.status ||
        doctor.credentialStatus ||
        "",
    };
  });
  doctorAccounts.forEach((account) => {
    if (matchedDoctorAccounts.has(userRowKey(account))) return;
    if (account.doctorId) return;
    doctorRows.push({
      ...account,
      accountId: account.id,
      specialty: account.specialty || "",
      city: account.city || "",
      location: account.location || account.hospital || "",
      fee: account.fee,
      rating: account.rating,
      initials: initialsFor(account.name),
      doctorId: account.doctorId || account.id,
      credentialStatus:
        account.credential_status ||
        account.verification_status ||
        account.status ||
        "",
    });
  });

  const partners = accounts.filter(
    (user) => user.role.toLowerCase() === "partner",
  );
  (state.apiProviders || []).forEach((provider) => {
    const providerPartner = normalizeProviderPartner(provider);
    const duplicateIndex = partners.findIndex((partner) =>
      samePartnerRecord(partner, providerPartner),
    );
    if (duplicateIndex < 0) {
      partners.push(providerPartner);
    } else {
      partners[duplicateIndex] = {
        ...partners[duplicateIndex],
        ...providerPartner,
      };
    }
  });
  return { patients, doctors: doctorRows, partners };
}

function normalizeProviderPartner(provider) {
  const providerType =
    PROVIDER_TYPES.find(([value]) => value === provider.provider_type)?.[1] ||
    provider.provider_type ||
    "Healthcare Provider";
  return {
    id: `provider-${provider.id}`,
    healthcareProviderId: String(provider.id),
    isHealthcareProvider: true,
    name: String(provider.name || ""),
    email: String(provider.email || ""),
    mobile: String(provider.phone || ""),
    phone: String(provider.phone || ""),
    role: "partner",
    partner_role: providerType,
    partnerRole: providerType,
    city: String(provider.city || ""),
    status: String(provider.status || ""),
    availability:
      provider.status === "active"
        ? "available"
        : provider.status === "pending"
          ? "pending"
          : "unavailable",
    address: String(provider.address || ""),
    provider_type: provider.provider_type,
  };
}

function samePartnerRecord(partner, provider) {
  const partnerEmail = String(partner.email || "").trim().toLowerCase();
  const providerEmail = String(provider.email || "").trim().toLowerCase();
  if (partnerEmail && providerEmail) return partnerEmail === providerEmail;
  const partnerPhone = String(partner.mobile || partner.phone || "").replace(/\D/g, "");
  const providerPhone = String(provider.mobile || "").replace(/\D/g, "");
  return Boolean(partnerPhone && providerPhone && partnerPhone === providerPhone);
}

function mergeUserAccounts(staticAccounts, apiUsers) {
  const records = new Map();
  [...staticAccounts, ...apiUsers.map(normalizeUserRecord)].forEach((user) => {
    const key = String(
      user.email || user.id || `${user.role}:${user.name}`,
    ).toLowerCase();
    const previous = records.get(key) || {};
    records.set(key, {
      ...previous,
      ...user,
      mobile: user.mobile || previous.mobile || "",
    });
  });
  return [...records.values()];
}

function normalizeUserRecord(user) {
  return {
    ...user,
    id: user.id || user._id || "",
    name: String(user.name || ""),
    email: String(user.email || ""),
    role: String(user.role || ""),
    mobile: String(user.mobile || user.phone || ""),
    doctorId: user.doctor_id || user.doctorId || "",
  };
}

function renderUsersTableRegion(state, staticAccounts) {
  const region = document.querySelector("#admin-users-table-region");
  if (!region) return;
  if (state.loading && state.activeTab === "patients") {
    region.innerHTML = renderUserSkeleton();
    return;
  }

  const rows = getUserTabRows(state, staticAccounts)[state.activeTab];
  const filtered = rows.filter((row) => matchesUserFilters(row, state));
  const sorted = sortUserRows(
    filtered,
    state.sortKey,
    state.sortDirection,
    state.activeTab,
  );
  state.visibleRows = sorted;
  region.innerHTML = sorted.length
    ? renderUsersTable(sorted, state.activeTab, state)
    : renderUsersEmpty(
        state.activeTab,
        rows.length ? "No matching records" : "No records available",
        rows.length
          ? "Change your search or filter and try again."
          : "There are no records for this category in the available project data.",
      );
  const images = region.querySelectorAll("[data-doctor-avatar]");
  images.forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
    });
  });
}

function matchesUserFilters(row, state) {
  const query = state.search.trim().toLowerCase();
  const fields =
    state.activeTab === "patients"
      ? [row.name, row.email, row.mobile, row.phone]
      : state.activeTab === "doctors"
        ? [row.name, row.specialty, row.city, row.location, row.email]
        : [row.name, partnerRole(row), row.city];
  const filterValue =
    state.activeTab === "partners"
      ? partnerRole(row)
      : userStatus(row, state.activeTab);
  return (
    (!query ||
      fields.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      )) &&
    (!state.filter || String(filterValue) === state.filter)
  );
}

function sortUserRows(rows, sortKey, direction, tab) {
  return [...rows].sort((left, right) => {
    const a = sortValue(left, sortKey, tab);
    const b = sortValue(right, sortKey, tab);
    if (a === "" && b !== "") return 1;
    if (b === "" && a !== "") return -1;
    if (typeof a === "number" && typeof b === "number")
      return (a - b) * direction;
    return (
      String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction
    );
  });
}

function sortValue(row, key, tab) {
  if (tab === "patients") {
    if (key === "wallet") return patientWallet(row) ?? "";
    return key === "name" ? row.name || "" : (row[key] ?? "");
  }
  if (tab === "doctors") {
    if (key === "name") return row.name || "";
    if (key === "fee")
      return Number.isFinite(Number(row.fee)) ? Number(row.fee) : "";
    if (key === "rating")
      return Number.isFinite(Number(row.rating)) ? Number(row.rating) : "";
  }
  if (tab === "partners")
    return key === "role" ? partnerRole(row) : row[key] || "";
  return "";
}

function renderUsersTable(rows, tab, state) {
  const sortHeader = (label, key) => `
    <th aria-sort="${state.sortKey === key ? (state.sortDirection === 1 ? "ascending" : "descending") : "none"}">
      <button type="button" class="thp-admin-users-sort ${state.sortKey === key ? "is-sorted" : ""}" data-user-sort="${key}">
        <span>${label}</span>${userIcon(state.sortKey === key && state.sortDirection === -1 ? "sortDown" : "sortUp")}
      </button>
    </th>
  `;
  let headings = "";
  let renderRow;
  let renderMobileFields;

  if (tab === "patients") {
    headings = `${sortHeader("PATIENT NAME", "name")}<th>CONTACT</th><th>GENDER / BLOOD</th>${sortHeader("WALLET", "wallet")}<th>STATUS</th><th>ACTIONS</th>`;
    renderRow = (row) => `
      <td><strong>${escapeHtml(row.name || "—")}</strong><small>${escapeHtml(row.email || "—")}</small></td>
      <td>${escapeHtml(row.mobile || row.phone || "—")}</td>
      <td>${escapeHtml(patientGenderBlood(row))}</td>
      <td><strong>${escapeHtml(formatWallet(patientWallet(row)))}</strong></td>
      <td>${renderStatus(userStatus(row, tab))}</td>
      <td>${renderUserActions(tab, row)}</td>
    `;
    renderMobileFields = (row) => `
      <div><dt>Contact</dt><dd>${escapeHtml(row.mobile || row.phone || "—")}</dd></div>
      <div><dt>Gender / blood</dt><dd>${escapeHtml(patientGenderBlood(row))}</dd></div>
      <div><dt>Wallet</dt><dd>${escapeHtml(formatWallet(patientWallet(row)))}</dd></div>
      <div><dt>Status</dt><dd>${renderStatus(userStatus(row, tab))}</dd></div>
    `;
  } else if (tab === "doctors") {
    headings = `${sortHeader("DOCTOR", "name")}<th>HOSPITAL / CLINIC</th>${sortHeader("CONSULT FEE", "fee")}${sortHeader("RATING", "rating")}<th>CREDENTIAL STATUS</th><th>ACTIONS</th>`;
    renderRow = (row) => `
      <td><div class="thp-admin-doctor-identity"><span class="thp-admin-doctor-avatar"><span>${escapeHtml(row.initials || initialsFor(row.name))}</span>${row.photo ? `<img src="${escapeHtml(row.photo)}" alt="" data-doctor-avatar>` : ""}</span><span class="thp-admin-doctor-copy"><strong>${escapeHtml(row.name || "—")}</strong><small>${escapeHtml([row.specialty, row.city].filter(Boolean).join(" · ") || "—")}</small></span></div></td>
      <td>${escapeHtml(row.location || row.hospital || row.clinic || "—")}</td>
      <td><strong>${escapeHtml(row.fee == null || row.fee === "" ? "—" : formatRupees(row.fee))}</strong></td>
      <td>${row.rating == null || row.rating === "" ? "—" : `<span class="thp-admin-doctor-rating">${userIcon("star")}${escapeHtml(row.rating)}</span>`}</td>
      <td>${renderStatus(userStatus(row, tab), true)}</td>
      <td>${renderUserActions(tab, row)}</td>
    `;
    renderMobileFields = (row) => `
      <div><dt>Specialty / city</dt><dd>${escapeHtml([row.specialty, row.city].filter(Boolean).join(" · ") || "—")}</dd></div>
      <div><dt>Hospital / clinic</dt><dd>${escapeHtml(row.location || row.hospital || row.clinic || "—")}</dd></div>
      <div><dt>Consult fee</dt><dd>${escapeHtml(row.fee == null || row.fee === "" ? "—" : formatRupees(row.fee))}</dd></div>
      <div><dt>Rating</dt><dd>${row.rating == null || row.rating === "" ? "—" : `<span class="thp-admin-doctor-rating">${userIcon("star")}${escapeHtml(row.rating)}</span>`}</dd></div>
      <div><dt>Credential status</dt><dd>${renderStatus(userStatus(row, tab), true)}</dd></div>
    `;
  } else {
    headings = `${sortHeader("PARTNER NAME", "name")}${sortHeader("PARTNER ROLE", "role")}<th>CITY</th><th>AVAILABILITY</th><th>STATUS</th><th>ACTIONS</th>`;
    renderRow = (row) => `
      <td><strong>${escapeHtml(row.name || "—")}</strong></td>
      <td><span class="thp-admin-partner-role">${escapeHtml(partnerRole(row) || "—")}</span></td>
      <td>${escapeHtml(row.city || "—")}</td>
      <td>${renderStatus(row.availability || "")}</td>
      <td>${renderStatus(row.status || "")}</td>
      <td>${renderUserActions(tab, row)}</td>
    `;
    renderMobileFields = (row) => `
      <div><dt>Partner role</dt><dd>${escapeHtml(partnerRole(row) || "—")}</dd></div>
      <div><dt>City</dt><dd>${escapeHtml(row.city || "—")}</dd></div>
      <div><dt>Availability</dt><dd>${renderStatus(row.availability || "")}</dd></div>
      <div><dt>Status</dt><dd>${renderStatus(row.status || "")}</dd></div>
    `;
  }

  return `
    <div class="thp-admin-table-wrapper thp-admin-users-table-wrap">
      <table class="thp-admin-table thp-admin-users-table">
        <thead><tr>${headings}</tr></thead>
        <tbody>${rows.map((row, index) => `<tr style="animation-delay:${Math.min(index * 32, 320)}ms" data-user-row-key="${escapeHtml(userRowKey(row))}">${renderRow(row)}</tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="thp-admin-users-mobile-list">
      ${rows.map((row, index) => `
        <article class="thp-admin-users-mobile-card" style="animation-delay:${Math.min(index * 32, 320)}ms">
          <header>
            <div><strong>${escapeHtml(row.name || "—")}</strong>${tab === "patients" ? `<small>${escapeHtml(row.email || "—")}</small>` : tab === "doctors" ? `<small>${escapeHtml([row.specialty, row.city].filter(Boolean).join(" · ") || "—")}</small>` : ""}</div>
            ${tab === "doctors" ? renderOptionalStatus(userStatus(row, tab), true) : tab === "patients" ? renderOptionalStatus(userStatus(row, tab)) : ""}
          </header>
          <dl>${renderMobileFields(row)}</dl>
          <footer>${renderUserActions(tab, row)}</footer>
        </article>
      `).join("")}
    </div>
    <div class="thp-admin-users-result-count">${rows.length} ${rows.length === 1 ? "record" : "records"}</div>
  `;
}

function renderUserActions(tab, row) {
  const key = escapeHtml(userRowKey(row));
  const actionList =
    tab === "patients"
      ? [
          ["view", "View patient", "eye"],
          ["edit", "Edit patient", "edit"],
          ["wallet-credit", "Add wallet credit", "plus"],
          ["wallet-debit", "Debit wallet", "minus"],
          [
            row.status === "blocked" ? "unblock" : "block",
            row.status === "blocked" ? "Unblock patient" : "Block patient",
            "lock",
          ],
          [
            row.status === "deactivated" ? "reactivate" : "deactivate",
            row.status === "deactivated"
              ? "Reactivate patient"
              : "Deactivate patient",
            "pause",
          ],
          ["delete", "Delete patient", "trash"],
        ]
      : tab === "doctors"
        ? [
            ["view", "View doctor", "eye"],
            ["edit", "Edit doctor", "edit"],
            ["approve", "Approve doctor", "plus"],
            ["reject", "Reject doctor", "close"],
            ["suspend", "Suspend doctor", "pause"],
            ["reinstate", "Reinstate doctor", "refresh"],
            ["delete", "Delete doctor", "trash"],
          ]
        : row.healthcareProviderId
          ? [
              ["view", "View healthcare provider", "eye"],
              ["edit", "Manage in Healthcare Providers", "edit"],
            ]
          : [
            ["view", "View partner", "eye"],
            ["edit", "Edit partner", "edit"],
            [
              "toggle-availability",
              row.availability === "available"
                ? "Mark unavailable"
                : "Mark available",
              row.availability === "available" ? "pause" : "refresh",
            ],
            ["delete", "Delete partner", "trash"],
          ];

  const available = actionList.filter(([action]) => {
    if (action === "view") return true;
    if (row.healthcareProviderId)
      return hasPermission("providers", "edit");
    if (action === "delete") return hasPermission("users", "delete");
    return hasPermission("users", "edit");
  });

  return `<div class="thp-admin-users-row-actions">${available.map(([action, label, icon]) => `<button type="button" class="thp-admin-users-icon-button is-${action}" data-user-action="${action}" data-user-key="${key}" aria-label="${label}" title="${label}">${userIcon(icon)}</button>`).join("")}</div>`;
}

function renderStatus(value, credential = false) {
  if (value === "" || value == null) return "—";
  const label =
    typeof value === "boolean"
      ? value
        ? "Active"
        : "Inactive"
      : titleCase(String(value));
  const normalized =
    typeof value === "boolean"
      ? value
        ? "active"
        : "inactive"
      : String(value).toLowerCase();
  const tone = /active|verified|available|approved/.test(normalized)
    ? "is-success"
    : /pending|review/.test(normalized)
      ? "is-warning"
      : /suspend|inactive|unavailable|reject/.test(normalized)
        ? "is-muted"
        : "is-neutral";
  return `<span class="thp-admin-users-status ${tone} ${credential ? "is-credential" : ""}"><i></i>${escapeHtml(label)}</span>`;
}

function renderOptionalStatus(value, credential = false) {
  return value === "" || value == null ? "" : renderStatus(value, credential);
}

function renderUserSkeleton() {
  return `<div class="thp-admin-users-skeleton" aria-label="Loading patient records">${Array.from({ length: 5 }, (_, index) => `<div class="thp-admin-users-skeleton-row" style="--row-index:${index}"><i></i><i></i><i></i><i></i><i></i></div>`).join("")}</div>`;
}

function renderUsersEmpty(tab, title, message) {
  const label = USER_TAB_CONTENT[tab].label.toLowerCase();
  return `<div class="thp-admin-users-empty"><span class="thp-admin-users-empty-icon">${userIcon(tab === "doctors" ? "doctor" : "user")}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><span class="thp-admin-users-empty-context">${escapeHtml(label)}</span></div>`;
}

function userStatus(row, tab) {
  if (tab === "doctors")
    return (
      row.credentialStatus ||
      row.credential_status ||
      row.verification_status ||
      ""
    );
  if (row.status != null) return row.status;
  if (typeof row.is_active === "boolean") return row.is_active;
  return "";
}

function patientWallet(row) {
  return row.wallet_balance ?? row.walletBalance ?? row.wallet ?? null;
}

function patientGenderBlood(row) {
  const gender = row.gender || "";
  const blood = row.blood_group || row.bloodGroup || row.blood_type || "";
  if (!gender && !blood) return "—";
  return `${gender}${blood ? `${gender ? " " : ""}(${blood})` : ""}`;
}

function formatWallet(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)))
    return "—";
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRupees(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      })
    : "—";
}

function partnerRole(row) {
  const role = String(
    row.partner_role || row.partnerRole || row.type || row.role || "",
  ).toLowerCase();
  if (role.includes("pharmac")) return "Pharmacist";
  if (role.includes("lab")) return "Lab Technician";
  if (role.includes("phlebotom")) return "Phlebotomist";
  if (
    role.includes("deliver") ||
    role.includes("rider") ||
    role.includes("swiftmed")
  )
    return "Delivery";
  return row.partner_role || row.partnerRole || row.type || row.role || "";
}

function initialsFor(name) {
  return (
    String(name || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function userRowKey(row) {
  return String(row.id || row.doctorId || row.email || row.name || "record");
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusOptionLabel(value) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return titleCase(value);
}

function exportUsersCsv(state) {
  const tab = state.activeTab;
  const columns =
    tab === "patients"
      ? [
          ["Patient name", (row) => row.name],
          ["Email", (row) => row.email],
          ["Contact", (row) => row.mobile || row.phone],
          ["Gender / blood", patientGenderBlood],
          ["Wallet", patientWallet],
          ["Status", (row) => userStatus(row, tab)],
        ]
      : tab === "doctors"
        ? [
            ["Doctor", (row) => row.name],
            ["Specialty", (row) => row.specialty],
            ["City", (row) => row.city],
            ["Hospital / clinic", (row) => row.location],
            ["Consult fee", (row) => row.fee],
            ["Rating", (row) => row.rating],
            ["Credential status", (row) => userStatus(row, tab)],
          ]
        : [
            ["Partner", (row) => row.name],
            ["Partner role", partnerRole],
            ["City", (row) => row.city],
            ["Availability", (row) => row.availability],
            ["Status", (row) => row.status],
          ];
  const csv = [
    columns.map(([label]) => csvCell(label)).join(","),
    ...state.visibleRows.map((row) =>
      columns.map(([, value]) => csvCell(value(row))).join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `tatito-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function openUserDetails(app, row) {
  const dialog = app.querySelector("#admin-user-details");
  const body = app.querySelector("#admin-user-details-body");
  const visibleEntries = Object.entries(row).filter(
    ([, value]) =>
      ["string", "number", "boolean"].includes(typeof value) && value !== "",
  );
  body.innerHTML = `<dl>${visibleEntries.map(([key, value]) => `<div><dt>${escapeHtml(titleCase(key))}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  dialog?.showModal();
}

function renderFeedback(app, message) {
  const feedback = app.querySelector("#admin-users-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
}

function userIcon(name) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    sortUp: '<path d="m7 14 5-5 5 5"/>',
    sortDown: '<path d="m7 10 5 5 5-5"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 8v8m4-8v8"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7 2 2-2 2 1.5 1.5-2 2-1.5-1.5-4 4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    minus: '<path d="M5 12h14"/>',
    doctor:
      '<path d="M6 3v6a4 4 0 0 0 8 0V3M6 5h2m6 0h2M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    hospital:
      '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M11 21v-3h2v3"/>',
    promotions:
      '<path d="m3 11 18-5v12l-18-5v-2Z"/><path d="M11.6 14.8 13 21l-4-1-1.7-5.4M5 10v4"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}


function apiErrorMessage(error) {
  const fields = Object.values(error?.data?.errors || error?.data || {})
    .flat()
    .filter((value) => typeof value === "string")
    .join(" ");
  return fields || error?.message || "The request could not be completed.";
}

const PROVIDER_TYPES = [
  ["hospital", "Hospital"],
  ["clinic", "Clinic"],
  ["diagnostic_centre", "Diagnostic Centre"],
  ["pharmacy", "Pharmacy"],
];

const PROVIDER_TYPE_FIELDS = {
  hospital: [
    ["bed_capacity", "Bed capacity", "number"],
    ["emergency_services", "Emergency services", "text"],
  ],
  clinic: [["staff_information", "Staff information", "textarea"]],
  diagnostic_centre: [["tests_offered", "Tests offered", "textarea"]],
  pharmacy: [
    ["pharmacy_license", "Pharmacy licence", "text"],
    ["operating_hours", "Operating hours", "text"],
  ],
};

function normalizeHealthcareProvider(provider) {
  return {
    ...provider,
    id: String(provider.id),
    providerType: provider.provider_type,
    registrationNumber: provider.registration_number || "",
    registrationDate: provider.registration_date || "",
    typeDetails: provider.type_details || {},
    rejectionReason: provider.rejection_reason || "",
    createdAt: provider.created_at,
    updatedAt: provider.updated_at,
    documents: provider.documents || [],
  };
}

function providerTypeLabel(value) {
  return PROVIDER_TYPES.find(([key]) => key === value)?.[1] || value;
}

function providerDocumentStatus(provider) {
  const documents = provider.documents || [];
  if (!documents.length) return "none";
  if (documents.some((document) => document.status === "rejected")) return "rejected";
  if (documents.every((document) => document.status === "verified")) return "verified";
  return "pending";
}

function normalizeProviderPhone(value) {
  const phone = String(value || "").trim();
  if (!phone) return "";
  if (phone.length > 20 || !/^\+?[0-9\s()-]+$/.test(phone)) return null;

  let digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function providerValidationError(payload) {
  if (!payload.name) return "Provider name is required.";
  if (!PROVIDER_TYPES.some(([type]) => type === payload.provider_type)) {
    return "Choose a supported provider type.";
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "Enter a valid email address.";
  }
  return "";
}

function renderProviderActions(provider) {
  const providerId = escapeHtml(provider.id == null ? "" : String(provider.id));
  const providerName = escapeHtml(provider.name || "provider");
  return `
    <div class="thp-admin-users-row-actions thp-admin-provider-row-actions">
      <button type="button" class="thp-admin-users-icon-button" data-provider-action="view" data-provider-id="${providerId}" aria-label="View ${providerName}" title="View">${userIcon("eye")}</button>
      ${hasPermission("providers", "edit") ? `<button type="button" class="thp-admin-users-icon-button is-edit" data-provider-action="edit" data-provider-id="${providerId}" aria-label="Edit ${providerName}" title="Edit">${userIcon("edit")}</button>` : ""}
      ${hasPermission("providers", "edit") && provider.status === "pending" ? `<button type="button" class="thp-admin-users-icon-button" data-provider-action="approve" data-provider-id="${providerId}" aria-label="Approve ${providerName}" title="Approve">${userIcon("star")}</button><button type="button" class="thp-admin-users-icon-button is-suspend" data-provider-action="reject" data-provider-id="${providerId}" aria-label="Reject ${providerName}" title="Reject">${userIcon("close")}</button>` : ""}
      ${hasPermission("providers", "edit") && ["active", "inactive"].includes(provider.status) ? `<button type="button" class="thp-admin-users-icon-button ${provider.status === "active" ? "is-suspend" : ""}" data-provider-action="${provider.status === "active" ? "deactivate" : "activate"}" data-provider-id="${providerId}" aria-label="${provider.status === "active" ? "Deactivate" : "Activate"} ${providerName}" title="${provider.status === "active" ? "Deactivate" : "Activate"}">${userIcon(provider.status === "active" ? "pause" : "refresh")}</button>` : ""}
      ${hasPermission("providers", "delete") ? `<button type="button" class="thp-admin-users-icon-button is-delete" data-provider-action="delete" data-provider-id="${providerId}" aria-label="Delete ${providerName}" title="Delete">${userIcon("trash")}</button>` : ""}
    </div>
  `;
}

function renderProviderStatus(value) {
  if (value === "" || value == null) return "—";
  const status = String(value).toLowerCase();
  const tone = ["active", "verified", "approved"].includes(status)
    ? "is-success"
    : status === "pending"
      ? "is-warning"
      : status === "rejected"
        ? "is-danger"
        : "is-neutral";
  return `<span class="thp-admin-provider-status ${tone}"><i></i>${escapeHtml(titleCase(status))}</span>`;
}

function renderProvidersWorkspace(state) {
  const filteredProviders = state.providers.filter((provider) => {
    const search = state.search.trim().toLowerCase();
    const matchesSearch =
      !search ||
      [provider.name, provider.phone, provider.email, provider.registration_number].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    const matchesType = !state.providerType || provider.provider_type === state.providerType;
    const matchesStatus = !state.status || provider.status === state.status;
    const matchesVerification =
      !state.verificationStatus ||
      providerDocumentStatus(provider) === state.verificationStatus;
    return matchesSearch && matchesType && matchesStatus && matchesVerification;
  });

  const filtersActive = Boolean(
    state.search.trim() ||
      state.providerType ||
      state.status ||
      state.verificationStatus,
  );
  const providerRows = filteredProviders
    .map((provider) => {
      const providerName = escapeHtml(provider.name || "—");
      const providerType = escapeHtml(providerTypeLabel(provider.provider_type) || "—");
      const contact = escapeHtml(provider.phone || "—");
      const email = escapeHtml(provider.email || "—");
      return `
        <tr>
          <td><strong>${providerName}</strong></td>
          <td>${providerType}</td>
          <td><span>${contact}</span><small>${email}</small></td>
          <td>${renderProviderStatus(provider.status)}</td>
          <td>${renderProviderStatus(providerDocumentStatus(provider))}</td>
          <td>${renderProviderActions(provider)}</td>
        </tr>
      `;
    })
    .join("");
  const providerCards = filteredProviders
    .map((provider) => {
      const providerName = escapeHtml(provider.name || "—");
      const providerType = escapeHtml(providerTypeLabel(provider.provider_type) || "—");
      const contact = escapeHtml(provider.phone || "—");
      const email = escapeHtml(provider.email || "—");
      return `
        <article class="thp-admin-provider-card">
          <header>
            <div>
              <h3>${providerName}</h3>
              <p>${providerType}</p>
            </div>
            ${renderProviderActions(provider)}
          </header>
          <div class="thp-admin-provider-card-details">
            <div><span>Contact</span><strong>${contact}</strong><small>${email}</small></div>
            <div><span>Status</span>${renderProviderStatus(provider.status)}</div>
            <div><span>Documents</span>${renderProviderStatus(providerDocumentStatus(provider))}</div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="thp-admin-module-page thp-admin-providers-page">
      <section class="thp-admin-panel">
        <header class="thp-admin-panel-heading thp-admin-provider-directory-heading">
          <div>
            <h3>Provider Directory</h3>
            <p>${filteredProviders.length} provider${filteredProviders.length === 1 ? "" : "s"}</p>
          </div>
        </header>
        <div class="thp-admin-providers-toolbar">
          <div class="thp-admin-providers-filters">
            <label class="thp-admin-users-searchbox">
              ${userIcon("search")}
              <input id="admin-providers-search" type="search" value="${escapeHtml(state.search)}" placeholder="Search provider name, contact or registration" aria-label="Search providers" />
            </label>
            <label class="thp-admin-providers-filterbox">
              <span class="thp-admin-sr-only">Filter by provider type</span>
              <select id="admin-provider-type-filter" aria-label="Filter by provider type">
                <option value="">All provider types</option>
                ${PROVIDER_TYPES.map(([value, label]) => `<option value="${value}" ${state.providerType === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
              ${userIcon("chevronDown")}
            </label>
            <label class="thp-admin-providers-filterbox">
              <span class="thp-admin-sr-only">Filter by provider status</span>
              <select id="admin-provider-status-filter" aria-label="Filter by provider status">
                <option value="">All statuses</option>
                ${["pending", "active", "rejected", "inactive"].map((status) => `<option value="${status}" ${state.status === status ? "selected" : ""}>${titleCase(status)}</option>`).join("")}
              </select>
              ${userIcon("chevronDown")}
            </label>
            <label class="thp-admin-providers-filterbox">
              <span class="thp-admin-sr-only">Filter by document status</span>
              <select id="admin-provider-verification-filter" aria-label="Filter by document status">
                <option value="">All document statuses</option>
                <option value="pending" ${state.verificationStatus === "pending" ? "selected" : ""}>Pending</option>
                <option value="verified" ${state.verificationStatus === "verified" ? "selected" : ""}>Verified</option>
                <option value="rejected" ${state.verificationStatus === "rejected" ? "selected" : ""}>Rejected</option>
                <option value="none" ${state.verificationStatus === "none" ? "selected" : ""}>No documents</option>
              </select>
              ${userIcon("chevronDown")}
            </label>
            <button type="button" class="thp-admin-provider-clear-filters" data-provider-action="clear-filters" ${filtersActive ? "" : "disabled"}>Clear filters</button>
          </div>
        </div>
        <div class="thp-admin-provider-results">
          ${state.loading ? `
            <div class="thp-admin-provider-skeleton" role="status" aria-label="Loading healthcare providers">
              ${Array.from({ length: 5 }, () => '<div class="thp-admin-provider-skeleton-row"><i></i><i></i><i></i><i></i><i></i><i></i></div>').join("")}
            </div>
          ` : state.error ? `
            <div class="thp-admin-provider-error" role="alert">
              <span>${escapeHtml(state.error)}</span>
              <button type="button" class="thp-admin-secondary-button" data-provider-action="retry">Retry</button>
            </div>
          ` : filteredProviders.length ? `
          <div class="thp-admin-table-wrapper thp-admin-provider-table-wrapper">
            <table class="thp-admin-table thp-admin-provider-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Document status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${providerRows}</tbody>
            </table>
          </div>
          <div class="thp-admin-provider-cards">${providerCards}</div>
        ` : `
          <div class="thp-admin-empty-state thp-admin-provider-empty">
            <div class="thp-admin-empty-icon">${userIcon("hospital")}</div>
            <strong>${filtersActive ? "No providers match your filters" : "No healthcare providers found"}</strong>
            <span>${filtersActive ? "Try adjusting your search or filter criteria." : "External hospitals, clinics, diagnostic centres and pharmacies will appear here when registered."}</span>
            ${filtersActive ? '<button type="button" class="thp-admin-provider-empty-clear" data-provider-action="clear-filters">Clear filters</button>' : ""}
          </div>
        `}
        </div>
      </section>

      <div id="admin-provider-modal-root"></div>
    </section>
  `;
}

function renderProviderModal(state) {
  const modal = state.modal;
  const root = document.querySelector("#admin-provider-modal-root");
  if (!root) return;

  if (!modal) {
    root.innerHTML = "";
    return;
  }

  if (modal.type === "confirmation") {
    const provider = modal.provider || {};
    const isReject = modal.action === "reject";
    const isDocumentReject = modal.action === "reject-document";
    const title = isReject
      ? "Reject provider registration?"
      : isDocumentReject
        ? "Reject document?"
        : modal.action === "delete"
          ? "Delete provider?"
          : modal.action === "deactivate"
            ? "Deactivate provider?"
            : "Activate provider?";
    root.innerHTML = `
      <div class="thp-admin-modal" data-provider-modal>
        <div class="thp-admin-modal-backdrop" data-provider-modal-close></div>
        <section class="thp-admin-modal-card thp-admin-provider-modal-card" role="dialog" aria-modal="true" aria-labelledby="provider-confirm-title">
          <header class="thp-admin-modal-header">
            <div>
              <p class="thp-admin-eyebrow">PROVIDER REVIEW</p>
              <h2 id="provider-confirm-title">${title}</h2>
            </div>
            <button type="button" class="thp-admin-modal-close" data-provider-modal-close aria-label="Close">×</button>
          </header>
          <form class="thp-admin-staff-form" data-provider-confirm-form>
            <input type="hidden" name="providerId" value="${escapeHtml(String(provider.id || ""))}" />
            ${isDocumentReject ? `<input type="hidden" name="documentId" value="${escapeHtml(String(modal.document?.id || ""))}" />` : ""}
            <p class="thp-admin-form-note">${isReject ? `Reject registration for <strong>${escapeHtml(provider.name)}</strong>.` : isDocumentReject ? `Reject <strong>${escapeHtml(modal.document?.original_name || "this document")}</strong>.` : modal.action === "delete" ? `Permanently delete <strong>${escapeHtml(provider.name)}</strong> and its uploaded documents?` : `${title.replace("?", "")} for <strong>${escapeHtml(provider.name)}</strong>?`}</p>
            ${isReject || isDocumentReject ? `<div class="thp-admin-form-group"><label for="provider-rejection-reason">Reason <b>*</b></label><textarea id="provider-rejection-reason" name="reason" rows="4" required maxlength="2000"></textarea></div>` : ""}
            <footer class="thp-admin-modal-footer">
              <button type="button" class="thp-admin-secondary-button" data-provider-modal-close>Cancel</button>
              <button type="submit" class="thp-admin-primary-button ${isReject || isDocumentReject || modal.action === "delete" || modal.action === "deactivate" ? "is-danger" : ""}">${isReject || isDocumentReject ? "Submit rejection" : title.replace("?", "")}</button>
            </footer>
          </form>
        </section>
      </div>
    `;
    return;
  }

  const provider = modal.provider || {};
  const draft = modal.draft || {};
  const isView = modal.mode === "view";
  const isCreate = modal.mode === "create";
  const readonly = isView ? "readonly disabled" : "";
  const selectDisabled = isView ? "disabled" : "";
  const providerType = draft.provider_type || provider.provider_type || "";
  const heading = isView ? "Provider details" : isCreate ? "Add healthcare provider" : "Edit healthcare provider";
  const submitText = isCreate ? "Create provider" : "Save changes";
  const typeFields = PROVIDER_TYPE_FIELDS[providerType] || [];
  const typeDetails = provider.type_details || {};
  const documentRows = (provider.documents || []).length
    ? provider.documents.map((document) => `
      <article class="thp-admin-provider-document">
        <div>
          <strong>${escapeHtml(document.original_name)}</strong>
          <small>${escapeHtml(titleCase(document.kind))} · ${escapeHtml(formatAdminTimestamp(document.uploaded_at))}</small>
          ${document.rejection_reason ? `<small class="thp-admin-provider-rejection">${escapeHtml(document.rejection_reason)}</small>` : ""}
        </div>
        <div class="thp-admin-provider-document-actions">
          ${renderStatus(document.status)}
          <button type="button" class="thp-admin-secondary-button" data-provider-document-download="${escapeHtml(String(document.id))}">View</button>
          ${hasPermission("providers", "edit") && document.status !== "verified" ? `<button type="button" class="thp-admin-secondary-button" data-provider-document-verify="${escapeHtml(String(document.id))}">Verify</button>` : ""}
          ${hasPermission("providers", "edit") && document.status !== "rejected" ? `<button type="button" class="thp-admin-secondary-button" data-provider-document-reject="${escapeHtml(String(document.id))}">Reject</button>` : ""}
          ${hasPermission("providers", "delete") ? `<button type="button" class="thp-admin-users-icon-button is-delete" data-provider-document-delete="${escapeHtml(String(document.id))}" aria-label="Delete document ${escapeHtml(document.original_name)}">${userIcon("trash")}</button>` : ""}
        </div>
      </article>
    `).join("")
    : `<div class="thp-admin-provider-documents-empty">No documents uploaded yet.</div>`;
  const detailsFields = typeFields.map(([key, label]) => `
    <div class="thp-admin-form-group ${key === "staff_information" || key === "tests_offered" ? "full-width" : ""}">
      <label for="provider-detail-${key}">${label}</label>
      ${key === "staff_information" || key === "tests_offered"
        ? `<textarea id="provider-detail-${key}" name="type_detail_${key}" rows="3" ${readonly}>${escapeHtml(draft[`type_detail_${key}`] ?? typeDetails[key] ?? "")}</textarea>`
        : `<input id="provider-detail-${key}" name="type_detail_${key}" type="${key === "bed_capacity" ? "number" : "text"}" value="${escapeHtml(draft[`type_detail_${key}`] ?? typeDetails[key] ?? "")}" ${readonly} />`}
    </div>
  `).join("");

  root.innerHTML = `
    <div class="thp-admin-modal" data-provider-modal>
      <div class="thp-admin-modal-backdrop" data-provider-modal-close></div>
      <section class="thp-admin-modal-card thp-admin-staff-modal-card thp-admin-provider-modal-card" role="dialog" aria-modal="true" aria-labelledby="provider-form-title">
        <header class="thp-admin-modal-header">
          <div>
            <p class="thp-admin-eyebrow">HEALTHCARE PROVIDERS</p>
            <h2 id="provider-form-title">${heading}</h2>
          </div>
          <button type="button" class="thp-admin-modal-close" data-provider-modal-close aria-label="Close">×</button>
        </header>

        ${isView ? `<div class="thp-admin-provider-status-line"><span>${escapeHtml(providerTypeLabel(providerType))}</span>${renderStatus(provider.status)}<span>Documents: ${provider.documents?.length || 0}</span></div>` : ""}
        <form id="provider-save-form" class="thp-admin-staff-form" data-provider-form>
          <input type="hidden" name="providerId" value="${escapeHtml(String(provider.id || ""))}" />
          <input type="hidden" name="mode" value="${escapeHtml(modal.mode || "create")}" />

          ${modal.error ? `<div class="thp-admin-form-error" role="alert">${escapeHtml(modal.error)}</div>` : ""}

          <div class="thp-admin-form-grid">
            <div class="thp-admin-form-group">
              <label for="provider-name">Provider name <b>*</b></label>
              <input id="provider-name" name="name" type="text" value="${escapeHtml(draft.name ?? provider.name ?? "")}" ${readonly} ${isCreate ? "required" : ""} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-type">Provider type <b>*</b></label>
              <select id="provider-type" name="provider_type" ${selectDisabled} ${isCreate ? "required" : ""}>
                <option value="">Select type</option>
                ${PROVIDER_TYPES.map(([value, label]) => `<option value="${value}" ${providerType === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-phone">Phone</label>
              <input id="provider-phone" name="phone" type="tel" value="${escapeHtml(draft.phone ?? provider.phone ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-email">Email</label>
              <input id="provider-email" name="email" type="email" value="${escapeHtml(draft.email ?? provider.email ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-registration-number">Registration number</label>
              <input id="provider-registration-number" name="registration_number" type="text" value="${escapeHtml(draft.registration_number ?? provider.registration_number ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-registration-date">Registration date</label>
              <input id="provider-registration-date" name="registration_date" type="date" value="${escapeHtml(draft.registration_date ?? provider.registration_date ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group full-width">
              <label for="provider-address">Address</label>
              <input id="provider-address" name="address" type="text" value="${escapeHtml(draft.address ?? provider.address ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-city">City</label>
              <input id="provider-city" name="city" type="text" value="${escapeHtml(draft.city ?? provider.city ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-state">State</label>
              <input id="provider-state" name="state" type="text" value="${escapeHtml(draft.state ?? provider.state ?? "")}" ${readonly} />
            </div>
            <div class="thp-admin-form-group">
              <label for="provider-pincode">Pincode</label>
              <input id="provider-pincode" name="pincode" type="text" value="${escapeHtml(draft.pincode ?? provider.pincode ?? "")}" ${readonly} />
            </div>
            ${detailsFields}
          </div>
        </form>
            ${isView && provider.status === "rejected" ? `<p class="thp-admin-provider-rejection"><strong>Registration rejection reason:</strong> ${escapeHtml(provider.rejection_reason || "No reason provided")}</p>` : ""}
          ${isView ? `<div class="thp-admin-provider-related"><h3>${providerType === "hospital" ? "Associated doctors" : providerType === "diagnostic_centre" ? "Tests offered" : providerType === "pharmacy" ? "Medicines and orders" : "Clinic staff"}</h3><p>No related data available.</p></div>` : ""}
          ${provider.id ? `
            <section class="thp-admin-provider-documents">
              <div class="thp-admin-provider-section-heading"><div><h3>Registration documents</h3><p>Review uploaded certificates, licences and supporting documents.</p></div></div>
              ${documentRows}
              ${hasPermission("providers", "edit") ? `<form class="thp-admin-provider-upload" data-provider-document-form><label for="provider-document-kind">Document type</label><select id="provider-document-kind" name="kind"><option value="registration_certificate">Registration certificate</option><option value="licence">Licence</option><option value="other">Other</option></select><label for="provider-document-file">Choose a document</label><input id="provider-document-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required /><button type="submit" class="thp-admin-secondary-button">Upload document</button></form>` : ""}
            </section>` : `<p class="thp-admin-form-note">Save the provider before uploading registration documents.</p>`}
          <footer class="thp-admin-modal-footer">
            ${isView && hasPermission("providers", "edit") ? `<button type="button" class="thp-admin-secondary-button" data-provider-action="edit" data-provider-id="${escapeHtml(String(provider.id))}">Edit</button>` : `<button type="button" class="thp-admin-secondary-button" data-provider-modal-close>Cancel</button>`}
            ${isView ? `<button type="button" class="thp-admin-primary-button" data-provider-modal-close>Close</button>` : `<button type="submit" form="provider-save-form" class="thp-admin-primary-button">${submitText}</button>`}
          </footer>
      </section>
    </div>
  `;
}

export async function renderAdminProviders(app) {
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

  if (!window.location.hash.startsWith("#/admin/providers")) return;
  if (!hasPermission("providers", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  const state = {
    providers: [],
    search: "",
    providerType: "",
    verificationStatus: "",
    status: "",
    modal: null,
    loading: true,
    error: "",
  };

  renderAdminLayout(
    app,
    "providers",
    '<section id="admin-providers-workspace" class="thp-admin-providers-workspace"></section>',
    {
      subtitle: "Manage external hospitals, clinics, diagnostic centres, and pharmacies.",
      actions: hasPermission("providers", "create")
        ? `<button type="button" class="thp-admin-primary-button thp-admin-provider-add-button" data-provider-action="add">${userIcon("plus")}<span>Add Provider</span></button>`
        : "",
    },
  );

  const render = () => {
    const workspace = app.querySelector("#admin-providers-workspace");
    if (!workspace) return;
    workspace.innerHTML = renderProvidersWorkspace(state);
    renderProviderModal(state);
  };

  app._adminProvidersEvents?.abort();
  const eventController = new AbortController();
  app._adminProvidersEvents = eventController;

  app.addEventListener(
    "click",
    async (event) => {
      if (event.target.closest("[data-provider-modal-close]")) {
        state.modal = null;
        render();
        return;
      }

      const actionButton = event.target.closest("[data-provider-action]");
      const documentButton = event.target.closest("[data-provider-document-download], [data-provider-document-verify], [data-provider-document-reject], [data-provider-document-delete]");
      if (!actionButton && documentButton) {
        const documentId = documentButton.dataset.providerDocumentDownload
          || documentButton.dataset.providerDocumentVerify
          || documentButton.dataset.providerDocumentReject
          || documentButton.dataset.providerDocumentDelete;
        const provider = state.modal?.provider;
        const providerDocument = provider?.documents?.find((item) => String(item.id) === String(documentId));
        if (!provider || !providerDocument) return;
        if (documentButton.hasAttribute("data-provider-document-download")) {
          try {
            const blob = await downloadHealthcareProviderDocument(providerDocument.id);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = providerDocument.original_name;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) {
            showAdminToast(apiErrorMessage(error));
          }
        } else if (documentButton.hasAttribute("data-provider-document-verify")) {
          await reviewDocument(provider, providerDocument, { status: "verified" });
        } else {
          state.modal = {
            type: "confirmation",
            action: documentButton.hasAttribute("data-provider-document-reject") ? "reject-document" : "delete-document",
            provider,
            document: providerDocument,
          };
          render();
        }
        return;
      }
      if (!actionButton) return;

      const action = actionButton.dataset.providerAction;
      const providerId = actionButton.dataset.providerId;
      const provider = state.providers.find((item) => String(item.id) === String(providerId));

      if (action === "retry") {
        await loadProviders();
        return;
      }
      if (action === "add") {
        state.modal = { type: "provider-form", mode: "create", provider: {} };
        render();
        return;
      }

      if (action === "clear-filters") {
        state.search = "";
        state.providerType = "";
        state.verificationStatus = "";
        state.status = "";
        render();
        return;
      }

      if (!provider) return;

      if (action === "view") {
        try {
          const viewedProvider = normalizeHealthcareProvider(
            await getHealthcareProvider(provider.id),
          );
          state.modal = {
            type: "provider-form",
            mode: "view",
            provider: viewedProvider,
          };
          render();
        } catch (error) {
          showAdminToast(apiErrorMessage(error));
        }
        return;
      }

      if (action === "edit") {
        state.modal = { type: "provider-form", mode: "edit", provider };
        render();
        return;
      }

      if (["delete", "reject", "activate", "deactivate"].includes(action)) {
        state.modal = { type: "confirmation", action, provider };
        render();
        return;
      }

      if (action === "approve") {
        await updateProviderWorkflow(provider, "approve");
      }
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "input",
    (event) => {
      if (event.target.id === "admin-providers-search") {
        const searchInput = event.target;
        const selectionStart = searchInput.selectionStart;
        const selectionEnd = searchInput.selectionEnd;
        state.search = searchInput.value;
        render();
        const updatedSearchInput = app.querySelector("#admin-providers-search");
        updatedSearchInput?.focus();
        if (selectionStart !== null && selectionEnd !== null) {
          updatedSearchInput?.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "change",
    (event) => {
      if (event.target.id === "admin-provider-type-filter") {
        state.providerType = event.target.value;
        render();
        return;
      }
      if (event.target.id === "provider-type" && state.modal?.type === "provider-form") {
        const form = event.target.closest("[data-provider-form]");
        state.modal.draft = Object.fromEntries(new FormData(form));
        render();
        return;
      }
      if (event.target.id === "admin-provider-verification-filter") {
        state.verificationStatus = event.target.value;
        render();
        return;
      }
      if (event.target.id === "admin-provider-status-filter") {
        state.status = event.target.value;
        render();
        return;
      }
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "submit",
    async (event) => {
      const form = event.target.closest("[data-provider-form]");
      const confirmForm = event.target.closest("[data-provider-confirm-form]");
      const documentForm = event.target.closest("[data-provider-document-form]");
      if (!form && !confirmForm && !documentForm) return;
      event.preventDefault();

      if (form) {
        const values = Object.fromEntries(new FormData(form));
        state.modal.draft = values;
        const providerType = String(values.provider_type || "").trim();
        const typeDetails = {};
        (PROVIDER_TYPE_FIELDS[providerType] || []).forEach(([key]) => {
          const value = String(values[`type_detail_${key}`] || "").trim();
          if (value) typeDetails[key] = key === "bed_capacity" ? Number(value) : value;
        });
        const payload = {
          name: String(values.name || "").trim(),
          provider_type: providerType,
          phone: String(values.phone || "").trim(),
          email: String(values.email || "").trim(),
          address: String(values.address || "").trim(),
          city: String(values.city || "").trim(),
          state: String(values.state || "").trim(),
          pincode: String(values.pincode || "").trim(),
          registration_number: String(values.registration_number || "").trim(),
          registration_date: String(values.registration_date || "") || null,
          type_details: typeDetails,
        };
        const normalizedPhone = normalizeProviderPhone(payload.phone);
        if (payload.phone && !normalizedPhone) {
          state.modal.error = "Enter a valid Indian mobile number.";
          render();
          return;
        }
        payload.phone = normalizedPhone;
        const validationMessage = providerValidationError(payload);
        if (validationMessage) {
          state.modal.error = validationMessage;
          render();
          return;
        }
        const submit = document.querySelector('[form="provider-save-form"]');
        submit.disabled = true;
        try {
          const mode = state.modal.mode;
          const result = mode === "create"
            ? await createHealthcareProvider(payload)
            : await updateHealthcareProvider(state.modal.provider.id, payload);
          const savedProvider = normalizeHealthcareProvider(result);
          state.providers = mode === "create"
            ? [savedProvider, ...state.providers]
            : state.providers.map((item) => item.id === savedProvider.id ? savedProvider : item);
          showAdminToast(mode === "create" ? "Provider registered as pending review." : "Provider details updated.");
          state.modal = null;
          render();
          await loadProviders();
        } catch (error) {
          state.modal.error = apiErrorMessage(error);
          render();
        }
        return;
      }

      if (confirmForm) {
        await submitProviderConfirmation(confirmForm);
        return;
      }

      const uploadData = new FormData(documentForm);
      const uploadProviderId = state.modal?.provider?.id;
      const uploadButton = documentForm.querySelector('[type="submit"]');
      uploadButton.disabled = true;
      try {
        await uploadHealthcareProviderDocument(uploadProviderId, uploadData);
        await loadProviders();
        const provider = state.providers.find((item) => item.id === String(uploadProviderId));
        state.modal = { type: "provider-form", mode: "edit", provider };
        showAdminToast("Provider document uploaded for review.");
        render();
      } catch (error) {
        showAdminToast(apiErrorMessage(error));
        uploadButton.disabled = false;
      }
    },
    { signal: eventController.signal },
  );

  render();
  await loadProviders();
  const routeQuery = window.location.hash.split("?")[1] || "";
  const routeParams = new URLSearchParams(routeQuery);
  const requestedProviderId = routeParams.get("providerId");
  const requestedProviderAction = routeParams.get("providerAction");
  if (requestedProviderId && ["view", "edit"].includes(requestedProviderAction)) {
    const provider = state.providers.find(
      (item) => item.id === requestedProviderId,
    );
    if (
      provider &&
      (requestedProviderAction === "view" || hasPermission("providers", "edit"))
    ) {
      if (requestedProviderAction === "view") {
        try {
          state.modal = {
            type: "provider-form",
            mode: "view",
            provider: normalizeHealthcareProvider(
              await getHealthcareProvider(provider.id),
            ),
          };
        } catch (error) {
          showAdminToast(apiErrorMessage(error));
        }
      } else {
        state.modal = { type: "provider-form", mode: "edit", provider };
      }
      render();
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}#/admin/providers`,
    );
  }

  async function loadProviders() {
    state.loading = true;
    state.error = "";
    render();
    try {
      const providers = await getHealthcareProviders();
      state.providers = providers.map(normalizeHealthcareProvider);
    } catch (error) {
      state.error = apiErrorMessage(error);
      showAdminToast(state.error);
    } finally {
      state.loading = false;
      render();
    }
  }

  async function updateProviderWorkflow(provider, action, body = {}) {
    try {
      const result = await runHealthcareProviderAction(provider.id, action, body);
      const updated = normalizeHealthcareProvider(result);
      state.providers = state.providers.map((item) => item.id === updated.id ? updated : item);
      state.modal = null;
      showAdminToast(action === "approve" ? "Provider approved and activated." : `Provider ${action}d.`);
      render();
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
    }
  }

  async function reviewDocument(provider, document, body) {
    try {
      await reviewHealthcareProviderDocument(provider.id, document.id, body);
      await loadProviders();
      const updated = state.providers.find((item) => item.id === provider.id);
      state.modal = { type: "provider-form", mode: "edit", provider: updated };
      showAdminToast(body.status === "verified" ? "Document verified." : "Document rejected.");
      render();
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
    }
  }

  async function submitProviderConfirmation(form) {
    const values = Object.fromEntries(new FormData(form));
    const modal = state.modal;
    const provider = modal.provider;
    try {
      if (modal.action === "delete") {
        await deleteHealthcareProvider(provider.id);
        state.providers = state.providers.filter((item) => item.id !== provider.id);
        state.modal = null;
        showAdminToast("Provider deleted.");
      } else if (modal.action === "reject") {
        await updateProviderWorkflow(provider, "reject", { reason: String(values.reason || "").trim() });
        return;
      } else if (modal.action === "reject-document") {
        await reviewHealthcareProviderDocument(provider.id, values.documentId, {
          status: "rejected",
          rejection_reason: String(values.reason || "").trim(),
        });
        const updated = (await getHealthcareProviders()).map(normalizeHealthcareProvider);
        state.providers = updated;
        state.modal = { type: "provider-form", mode: "edit", provider: updated.find((item) => item.id === provider.id) };
        showAdminToast("Document rejected.");
      } else if (modal.action === "delete-document") {
        await deleteHealthcareProviderDocument(provider.id, modal.document.id);
        await loadProviders();
        const updated = state.providers.find((item) => item.id === provider.id);
        state.modal = { type: "provider-form", mode: "edit", provider: updated };
        showAdminToast("Document deleted.");
      } else {
        await updateProviderWorkflow(provider, modal.action);
        return;
      }
    } catch (error) {
      showAdminToast(apiErrorMessage(error));
    }
    render();
  }
}

export async function renderAdminPromotions(app) {
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
  if (!window.location.hash.startsWith("#/admin/promotions")) return;
  if (!hasPermission("promotions", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }

  const state = {
    promotions: [],
    loading: true,
    error: "",
    search: "",
    status: "",
    modal: null,
  };

  const content = `
    <section class="thp-admin-module-page thp-admin-promotions-page">
      <div class="thp-admin-promotions-intro">
        <div>
          <h2>Manage Promotions</h2>
          <p>Create and manage campaign banners, calls to action, and promotion schedules.</p>
        </div>
        ${hasPermission("promotions", "create") ? `<button type="button" class="thp-admin-primary-button" data-promotion-add>Create Promotion</button>` : ""}
      </div>
      <section class="thp-admin-panel">
        <header class="thp-admin-panel-heading thp-admin-promotions-toolbar">
          <div>
            <h3>Promotions</h3>
            <p id="promotions-count">Loading promotions...</p>
          </div>
          <div class="thp-admin-promotions-filters">
            <label class="thp-admin-users-searchbox">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <input id="promotions-search" type="search" placeholder="Search promotions..." aria-label="Search promotions" />
            </label>
            <label class="thp-admin-promotions-status-filter">
              <span class="thp-admin-sr-only">Filter promotions by status</span>
              <select id="promotions-status-filter" aria-label="Filter promotions by status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </header>
        <div id="promotions-feedback" class="thp-admin-promotions-feedback" role="alert" hidden></div>
        <div id="promotions-list" class="thp-admin-promotions-list"></div>
      </section>
      <div id="promotions-modal-root"></div>
    </section>
  `;

  renderAdminLayout(app, "promotions", content, {
    subtitle: "Promotion banners and campaign scheduling",
  });

  app._adminPromotionsEvents?.abort();
  const eventController = new AbortController();
  app._adminPromotionsEvents = eventController;

  const renderRows = () => {
    const region = app.querySelector("#promotions-list");
    const count = app.querySelector("#promotions-count");
    const feedback = app.querySelector("#promotions-feedback");
    if (!region || !count || !feedback) return;

    feedback.hidden = !state.error;
    feedback.textContent = state.error;
    if (state.loading) {
      count.textContent = "Loading promotions...";
      region.innerHTML =
        '<div class="thp-admin-loading-state">Loading promotions...</div>';
      return;
    }

    const query = state.search.trim().toLowerCase();
    const rows = state.promotions.filter((promotion) => {
      const matchesSearch =
        !query ||
        [promotion.title, promotion.description, promotion.cta_text].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
        );
      const matchesStatus =
        !state.status ||
        (state.status === "active"
          ? promotion.is_active
          : !promotion.is_active);
      return matchesSearch && matchesStatus;
    });

    count.textContent = `${rows.length} ${rows.length === 1 ? "promotion" : "promotions"}`;
    if (!rows.length) {
      region.innerHTML = `
        <div class="thp-admin-empty-state">
          <div class="thp-admin-empty-icon">${userIcon("promotions")}</div>
          <strong>${state.promotions.length ? "No matching promotions" : "No promotions yet"}</strong>
          <span>${state.promotions.length ? "Change your search or status filter." : "Create a promotion to get started."}</span>
        </div>
      `;
      return;
    }

    region.innerHTML = `
      <div class="thp-admin-table-wrapper">
        <table class="thp-admin-table thp-admin-promotions-table">
          <thead><tr><th>Promotion</th><th>Call to action</th><th>Schedule</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>${rows
            .map(
              (promotion) => `
            <tr>
              <td>
                <div class="thp-admin-promotion-identity">
                  ${promotion.image_url ? `<img src="${escapeHtml(promotion.image_url)}" alt="" class="thp-admin-promotion-thumbnail" loading="lazy" />` : `<span class="thp-admin-promotion-thumbnail is-empty">${renderSidebarIcon("promotions")}</span>`}
                  <span><strong>${escapeHtml(promotion.title)}</strong><small>${escapeHtml(promotion.description || "No description")}</small></span>
                </div>
              </td>
              <td>${escapeHtml(promotion.cta_text || "—")}<small>${escapeHtml(promotion.cta_link || "")}</small></td>
              <td><span>${formatAdminTimestamp(promotion.start_date)}</span><small>to ${formatAdminTimestamp(promotion.end_date)}</small></td>
              <td>${renderStatus(Boolean(promotion.is_active))}</td>
              <td>${escapeHtml(formatAdminTimestamp(promotion.updated_at || promotion.created_at))}</td>
              <td><div class="thp-admin-users-row-actions">
                <button type="button" class="thp-admin-users-icon-button" data-promotion-action="view" data-promotion-id="${promotion.id}" aria-label="View ${escapeHtml(promotion.title)}" title="View">${userIcon("eye")}</button>
                ${hasPermission("promotions", "edit") ? `<button type="button" class="thp-admin-users-icon-button is-edit" data-promotion-action="edit" data-promotion-id="${promotion.id}" aria-label="Edit ${escapeHtml(promotion.title)}" title="Edit">${userIcon("edit")}</button><button type="button" class="thp-admin-users-icon-button" data-promotion-action="toggle" data-promotion-id="${promotion.id}" aria-label="${promotion.is_active ? "Deactivate" : "Activate"} ${escapeHtml(promotion.title)}" title="${promotion.is_active ? "Deactivate" : "Activate"}">${userIcon(promotion.is_active ? "pause" : "refresh")}</button>` : ""}
                ${hasPermission("promotions", "delete") ? `<button type="button" class="thp-admin-users-icon-button is-delete" data-promotion-action="delete" data-promotion-id="${promotion.id}" aria-label="Delete ${escapeHtml(promotion.title)}" title="Delete">${userIcon("trash")}</button>` : ""}
              </div></td>
            </tr>
          `,
            )
            .join("")}</tbody>
        </table>
      </div>
    `;
  };

  const renderModal = () => {
    const root = app.querySelector("#promotions-modal-root");
    if (!root) return;
    const modal = state.modal;
    if (!modal) {
      root.innerHTML = "";
      return;
    }

    if (modal.mode === "delete") {
      root.innerHTML = `
        <div class="thp-admin-modal" data-promotion-modal>
          <div class="thp-admin-modal-backdrop" data-promotion-close></div>
          <section class="thp-admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="promotion-delete-title">
            <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">PROMOTION MANAGEMENT</p><h2 id="promotion-delete-title">Delete promotion?</h2></div><button type="button" class="thp-admin-modal-close" data-promotion-close aria-label="Close">×</button></header>
            <div class="thp-admin-staff-modal-body"><p>Delete <strong>${escapeHtml(modal.promotion.title)}</strong>? This cannot be undone.</p><footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-promotion-close>Cancel</button><button type="button" class="thp-admin-primary-button is-danger" data-promotion-delete-confirm>Delete Promotion</button></footer></div>
          </section>
        </div>
      `;
      return;
    }

    const promotion = modal.promotion || {};
    const viewOnly = modal.mode === "view";
    const title = viewOnly
      ? "Promotion Details"
      : modal.mode === "edit"
        ? "Edit Promotion"
        : "Create Promotion";
    const disabled = viewOnly ? "disabled" : "";
    root.innerHTML = `
      <div class="thp-admin-modal" data-promotion-modal>
        <div class="thp-admin-modal-backdrop" data-promotion-close></div>
        <section class="thp-admin-modal-card thp-admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="promotion-form-title">
          <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">GROWTH / PROMOTIONS</p><h2 id="promotion-form-title">${title}</h2></div><button type="button" class="thp-admin-modal-close" data-promotion-close aria-label="Close">×</button></header>
          <form class="thp-admin-staff-form" data-promotion-form>
            <div class="thp-admin-form-grid">
              <div class="thp-admin-form-group"><label for="promotion-title">Title <b>*</b></label><input id="promotion-title" name="title" type="text" maxlength="200" value="${escapeHtml(promotion.title || "")}" ${disabled} ${viewOnly ? "" : "required"} /></div>
              <div class="thp-admin-form-group"><label for="promotion-image">Banner image URL</label><input id="promotion-image" name="image_url" type="url" value="${escapeHtml(promotion.image_url || "")}" ${disabled} /></div>
              <div class="thp-admin-form-group full-width"><label for="promotion-description">Description</label><textarea id="promotion-description" name="description" rows="3" ${viewOnly ? "readonly" : ""}>${escapeHtml(promotion.description || "")}</textarea></div>
              <div class="thp-admin-form-group"><label for="promotion-cta-text">CTA text</label><input id="promotion-cta-text" name="cta_text" type="text" maxlength="80" value="${escapeHtml(promotion.cta_text || "")}" ${disabled} /></div>
              <div class="thp-admin-form-group"><label for="promotion-cta-link">CTA link</label><input id="promotion-cta-link" name="cta_link" type="text" maxlength="500" value="${escapeHtml(promotion.cta_link || "")}" ${disabled} /></div>
              <div class="thp-admin-form-group"><label for="promotion-start">Start date <b>*</b></label><input id="promotion-start" name="start_date" type="datetime-local" value="${escapeHtml(promotionDateTimeLocal(promotion.start_date))}" ${disabled} ${viewOnly ? "" : "required"} /></div>
              <div class="thp-admin-form-group"><label for="promotion-end">End date <b>*</b></label><input id="promotion-end" name="end_date" type="datetime-local" value="${escapeHtml(promotionDateTimeLocal(promotion.end_date))}" ${disabled} ${viewOnly ? "" : "required"} /></div>
              <label class="thp-admin-checkbox"><input name="is_active" type="checkbox" ${promotion.is_active !== false ? "checked" : ""} ${disabled} /><span>Promotion is active</span></label>
            </div>
            <footer class="thp-admin-modal-footer">${viewOnly ? `<button type="button" class="thp-admin-primary-button" data-promotion-close>Close</button>` : `<button type="button" class="thp-admin-secondary-button" data-promotion-close>Cancel</button><button type="submit" class="thp-admin-primary-button">${modal.mode === "edit" ? "Save Changes" : "Create Promotion"}</button>`}</footer>
          </form>
        </section>
      </div>
    `;
  };

  const loadPromotions = async () => {
    state.loading = true;
    state.error = "";
    renderRows();
    try {
      state.promotions = await getPromotions();
      return true;
    } catch (error) {
      state.error = apiErrorMessage(error) || "Unable to load promotions.";
      return false;
    } finally {
      state.loading = false;
      renderRows();
    }
  };

  const closeModal = () => {
    state.modal = null;
    renderModal();
  };

  const mutateAndRefresh = async (mutation, successMessage) => {
    try {
      const result = await mutation();
      if (result?.success === false)
        throw new Error(result.message || "Promotion update failed.");
      state.modal = null;
      renderModal();
      const refreshed = await loadPromotions();
      window.thpShowToast?.(
        refreshed
          ? successMessage
          : `${successMessage} The list could not be refreshed; reload to verify.`,
      );
      return true;
    } catch (error) {
      window.thpShowToast?.(
        apiErrorMessage(error) || "Promotion update failed.",
      );
      return false;
    }
  };

  app.addEventListener(
    "click",
    async (event) => {
      if (event.target.closest("[data-promotion-close]")) {
        closeModal();
        return;
      }
      if (event.target.closest("[data-promotion-add]")) {
        state.modal = { mode: "create", promotion: { is_active: true } };
        renderModal();
        return;
      }
      if (event.target.closest("[data-promotion-delete-confirm]")) {
        const promotion = state.modal?.promotion;
        if (!promotion) return;
        await mutateAndRefresh(
          () => deletePromotion(promotion.id),
          "Promotion deleted.",
        );
        return;
      }

      const actionButton = event.target.closest("[data-promotion-action]");
      if (!actionButton) return;
      const promotion = state.promotions.find(
        (item) => Number(item.id) === Number(actionButton.dataset.promotionId),
      );
      if (!promotion) return;
      const action = actionButton.dataset.promotionAction;
      if (action === "view" || action === "edit" || action === "delete") {
        state.modal = { mode: action, promotion };
        renderModal();
      } else if (action === "toggle") {
        actionButton.disabled = true;
        const updated = await mutateAndRefresh(
          () =>
            updatePromotion(promotion.id, { is_active: !promotion.is_active }),
          promotion.is_active
            ? "Promotion deactivated."
            : "Promotion activated.",
        );
        if (!updated) actionButton.disabled = false;
      }
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "input",
    (event) => {
      if (event.target.id !== "promotions-search") return;
      state.search = event.target.value;
      renderRows();
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "change",
    (event) => {
      if (event.target.id !== "promotions-status-filter") return;
      state.status = event.target.value;
      renderRows();
    },
    { signal: eventController.signal },
  );

  app.addEventListener(
    "submit",
    async (event) => {
      const form = event.target.closest("[data-promotion-form]");
      if (!form || !state.modal || state.modal.mode === "view") return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      const payload = {
        title: String(values.title || "").trim(),
        description: String(values.description || "").trim(),
        image_url: String(values.image_url || "").trim(),
        cta_text: String(values.cta_text || "").trim(),
        cta_link: String(values.cta_link || "").trim(),
        start_date: new Date(values.start_date).toISOString(),
        end_date: new Date(values.end_date).toISOString(),
        is_active: form.elements.is_active.checked,
      };
      const creating = state.modal.mode === "create";
      const saved = await mutateAndRefresh(
        () =>
          creating
            ? createPromotion(payload)
            : updatePromotion(state.modal.promotion.id, payload),
        creating ? "Promotion created." : "Promotion updated.",
      );
      if (!saved && submit) submit.disabled = false;
    },
    { signal: eventController.signal },
  );

  renderRows();
  renderModal();
  await loadPromotions();
}

function promotionDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}



export function renderAdminCouponsOffersMarketing(app) {
  if (
    !isAdminAuthenticated() ||
    !hasPermission('coupons_offers_marketing', 'view')
  ) {
    window.location.hash = '#/admin/dashboard'
    return
  }

  const content = `
    <section class="thp-admin-module-page">

      <div class="thp-admin-module-intro">
        <div>
          <h2>Coupons, Offers & Marketing</h2>
          <p>
            Manage discount coupons, promotional offers and marketing campaigns.
          </p>
        </div>

        ${hasPermission('coupons_offers_marketing', 'create') ? `
          <button
            type="button"
            class="thp-admin-primary-button"
            id="create-coupon-button"
          >
            + Create Coupon
          </button>
        ` : ''}
      </div>

      <div class="thp-admin-panel">

        <div class="thp-admin-panel-heading">
          <div>
            <h3>Coupons</h3>
            <p>Manage discount codes and usage limits.</p>
          </div>
        </div>

        <div id="coupons-content">
          <div class="thp-admin-loading-state">
            Loading coupons...
          </div>
        </div>

      </div>


      <div class="thp-admin-panel">
        <div class="thp-admin-panel-heading">
          <div>
            <h3>Featured Promotions</h3>
            <p>Manage promotional cards shown on the Home page.</p>
          </div>
          ${hasPermission('coupons_offers_marketing', 'create') ? `
            <button
              type="button"
              class="thp-admin-primary-button"
              id="create-promotion-button"
            >
              + Add Promotion
            </button>
          ` : ''}
        </div>

        <div id="featured-promotions-content">
          <div class="thp-admin-loading-state">
            Loading promotions...
          </div>
        </div>
      </div>

      <div class="thp-admin-panel">
        <div class="thp-admin-panel-heading">
          <div>
            <h3>Promotional Banners & Offer Strips</h3>
            <p>Manage Home and Pharmacy promotional content and ordering.</p>
          </div>
          ${hasPermission('coupons_offers_marketing', 'create') ? `
            <button
              type="button"
              class="thp-admin-primary-button"
              id="create-promotional-content-button"
            >
              + Add Promotional Content
            </button>
          ` : ''}
        </div>

        <div id="promotional-content-list">
          <div class="thp-admin-loading-state">
            Loading promotional content...
          </div>
        </div>
      </div>


    </section>


    <div
      class="thp-admin-modal"
      id="promotion-modal"
      hidden
    >
      <div
        class="thp-admin-modal-backdrop"
        data-close-promotion-modal
      ></div>

      <div
        class="thp-admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-modal-title"
      >
        <div class="thp-admin-modal-header">
          <div>
            <p class="thp-admin-eyebrow">FEATURED PROMOTION</p>
            <h2 id="promotion-modal-title">Add Promotion</h2>
          </div>

          <button
            type="button"
            class="thp-admin-modal-close"
            id="close-promotion-modal"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="promotion-form">

          <input
            type="hidden"
            id="promotion-id"
          />

          <div class="thp-admin-form-grid">

            <div class="thp-admin-form-group">
              <label for="promotion-badge">Badge Text</label>
              <input
                id="promotion-badge"
                type="text"
                maxlength="100"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotion-title">Title</label>
              <input
                id="promotion-title"
                type="text"
                maxlength="200"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotion-link">Link</label>
              <input
                id="promotion-link"
                type="text"
                maxlength="500"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotion-colour">Colour</label>
              <input
                id="promotion-colour"
                type="text"
                maxlength="50"
                placeholder="#0F766E"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotion-order">Display Order</label>
              <input
                id="promotion-order"
                type="number"
                min="1"
                step="1"
                value="1"
              />
            </div>

            <div
              class="thp-admin-form-group"
              style="grid-column:1/-1"
            >
              <label for="promotion-description">
                Description
              </label>

              <textarea
                id="promotion-description"
                rows="3"
              ></textarea>
            </div>

          </div>

          <label class="thp-admin-checkbox">
            <input
              id="promotion-active"
              type="checkbox"
              checked
            />
            <span>Promotion is active</span>
          </label>

          <p
            id="promotion-form-error"
            class="thp-admin-form-error"
            hidden
          ></p>

          <div class="thp-admin-modal-footer">

            <button
              type="button"
              class="thp-admin-secondary-button"
              id="cancel-promotion-modal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="thp-admin-primary-button"
              id="save-promotion-button"
            >
              Save Promotion
            </button>

          </div>

        </form>
      </div>
    </div>

    <div
      class="thp-admin-modal"
      id="promotional-content-modal"
      hidden
    >
      <div
        class="thp-admin-modal-backdrop"
        data-close-promotional-content-modal
      ></div>

      <div
        class="thp-admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotional-content-modal-title"
      >
        <div class="thp-admin-modal-header">
          <div>
            <p class="thp-admin-eyebrow">
              PROMOTIONAL CONTENT
            </p>

            <h2 id="promotional-content-modal-title">
              Add Promotional Content
            </h2>
          </div>

          <button
            type="button"
            class="thp-admin-modal-close"
            id="close-promotional-content-modal"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="promotional-content-form">

          <input
            type="hidden"
            id="promotional-content-id"
          />

          <div class="thp-admin-form-grid">

            <div class="thp-admin-form-group">
              <label for="promotional-content-title">
                Title
              </label>

              <input
                id="promotional-content-title"
                type="text"
                maxlength="200"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotional-content-type">
                Content Type
              </label>

              <select id="promotional-content-type">
                <option value="banner">Banner</option>
                <option value="offer_strip">Offer Strip</option>
              </select>
            </div>

            <div class="thp-admin-form-group">
              <label for="promotional-content-placement">
                Placement
              </label>

              <select id="promotional-content-placement">
                <option value="home">Home</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            <div class="thp-admin-form-group">
              <label for="promotional-content-image">
                Image URL
              </label>

              <input
                id="promotional-content-image"
                type="text"
                maxlength="500"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotional-content-link">
                Link
              </label>

              <input
                id="promotional-content-link"
                type="text"
                maxlength="500"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="promotional-content-order">
                Display Order
              </label>

              <input
                id="promotional-content-order"
                type="number"
                min="1"
                step="1"
                value="1"
              />
            </div>

            <div
              class="thp-admin-form-group"
              style="grid-column:1/-1"
            >
              <label for="promotional-content-description">
                Description
              </label>

              <textarea
                id="promotional-content-description"
                rows="3"
              ></textarea>
            </div>

          </div>

          <label class="thp-admin-checkbox">
            <input
              id="promotional-content-active"
              type="checkbox"
              checked
            />

            <span>Content is active</span>
          </label>

          <p
            id="promotional-content-form-error"
            class="thp-admin-form-error"
            hidden
          ></p>

          <div class="thp-admin-modal-footer">

            <button
              type="button"
              class="thp-admin-secondary-button"
              id="cancel-promotional-content-modal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="thp-admin-primary-button"
              id="save-promotional-content-button"
            >
              Save Content
            </button>

          </div>

        </form>
      </div>
    </div>


    <div
      class="thp-admin-modal"
      id="coupon-modal"
      hidden
    >
      <div
        class="thp-admin-modal-backdrop"
        data-close-coupon-modal
      ></div>

      <div
        class="thp-admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-modal-title"
      >

        <div class="thp-admin-modal-header">
          <div>
            <p class="thp-admin-eyebrow">COUPON MANAGEMENT</p>
            <h2 id="coupon-modal-title">Edit Coupon</h2>
          </div>

          <button
            type="button"
            class="thp-admin-modal-close"
            id="close-coupon-modal"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="coupon-form">

          <input
            type="hidden"
            id="coupon-id"
          />

          <div class="thp-admin-form-grid">

            <div class="thp-admin-form-group">
              <label for="coupon-code">Coupon Code</label>
              <input
                id="coupon-code"
                type="text"
                maxlength="50"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-applies-to">Applies To</label>
              <select id="coupon-applies-to" required>
                <option value="all">All Services</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="lab">Lab</option>
                <option value="doctor">Doctor</option>
                <option value="plans">Health Plans</option>
              </select>
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-discount-type">Discount Type</label>
              <select id="coupon-discount-type" required>
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-discount-value">
                Discount Value
              </label>
              <input
                id="coupon-discount-value"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-maximum-discount">
                Maximum Discount
              </label>
              <input
                id="coupon-maximum-discount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-minimum-order">
                Minimum Order Amount
              </label>
              <input
                id="coupon-minimum-order"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-start-date">
                Start Date
              </label>
              <input
                id="coupon-start-date"
                type="datetime-local"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-expiry-date">
                Expiry Date
              </label>
              <input
                id="coupon-expiry-date"
                type="datetime-local"
                required
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-usage-limit">
                Usage Limit
              </label>
              <input
                id="coupon-usage-limit"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
              />
            </div>

            <div class="thp-admin-form-group">
              <label for="coupon-per-user-limit">
                Per-User Limit
              </label>
              <input
                id="coupon-per-user-limit"
                type="number"
                min="1"
                step="1"
                required
                />
            </div>

          </div>

          <label class="thp-admin-checkbox">
            <input
              id="coupon-active"
              type="checkbox"
            />
            <span>Coupon is active</span>
          </label>

          <p
            id="coupon-form-error"
            class="thp-admin-form-error"
            hidden
          ></p>

          <div class="thp-admin-modal-footer">

            <button
              type="button"
              class="thp-admin-secondary-button"
              id="cancel-coupon-modal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="thp-admin-primary-button"
              id="save-coupon-button"
            >
              Save Changes
            </button>

          </div>

        </form>

      </div>
    </div>
    <div id="admin-toast" class="thp-admin-toast" role="status" aria-live="polite">
      <span id="admin-toast-message"></span>
    </div>
  `

  renderAdminLayout(
    app,
    'coupons_offers_marketing',
    content
  )

  setupCouponModalEvents()
  setupPromotionEvents()
  setupPromotionalContentEvents()

  loadCoupons()
  loadFeaturedPromotions()
  loadPromotionalContent()
}

  function showAdminToast(message, type = 'success') {
    const toast = document.querySelector('#admin-toast')
    const messageElement = document.querySelector('#admin-toast-message')

    if (!toast || !messageElement) {
      return
    }

    messageElement.textContent = message

    toast.classList.remove('is-visible', 'is-error')

    if (type === 'error') {
      toast.classList.add('is-error')
    }

    toast.classList.add('is-visible')

    window.clearTimeout(showAdminToast.timeout)

    showAdminToast.timeout = window.setTimeout(() => {
      toast.classList.remove('is-visible')
    }, 3000)
  }

async function loadCoupons() {
  const container = document.querySelector('#coupons-content')

  if (!container) {
    return
  }

  try {
    container.innerHTML = `
      <div class="thp-admin-loading-state">
        Loading coupons...
      </div>
    `

    const coupons = await getCoupons()

    console.log('Coupons loaded from Django:', coupons)

    if (!coupons.length) {
      container.innerHTML = `
        <div class="thp-admin-empty-state">
          <div class="thp-admin-empty-icon">%</div>
          <strong>No coupons found</strong>
          <span>Create your first coupon to get started.</span>
        </div>
      `
      return
    }

    container.innerHTML = `
      <div class="thp-admin-table-toolbar">

        <div class="thp-admin-search-box">
          <input
            type="search"
            id="coupon-search"
            placeholder="Search coupon code..."
          />
        </div>

        <div class="thp-admin-filter-box">
          <select id="coupon-status-filter">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="thp-admin-filter-box">
          <select id="coupon-sort">
            <option value="code-asc">Code A → Z</option>
            <option value="code-desc">Code Z → A</option>
            <option value="discount-high">Discount High → Low</option>
            <option value="discount-low">Discount Low → High</option>
            <option value="usage-high">Usage High → Low</option>
            <option value="usage-low">Usage Low → High</option>
          </select>
        </div>

        <button
          type="button"
          class="thp-admin-row-button"
          id="export-coupons-csv"
        >
          Export CSV
        </button>

      </div>

      <div class="thp-admin-table-wrapper">

        <table class="thp-admin-table">

          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Applies To</th>
              <th>Validity</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="coupon-table-body">
            ${coupons.map(coupon => `
              <tr
                data-coupon-code="${escapeHtml(coupon.code).toLowerCase()}"
                data-coupon-status="${
                  coupon.is_currently_active ? 'active' : 'inactive'
                }"
              >

                <td>
                  <div class="thp-admin-coupon-code">
                    ${escapeHtml(coupon.code)}
                  </div>

                  <small>
                    Min. order ₹${formatMoney(coupon.minimum_order_amount)}
                  </small>
                </td>

                <td>
                  <strong>
                    ${formatDiscount(coupon)}
                  </strong>

                  ${
                    coupon.maximum_discount
                      ? `
                        <small>
                          Max ₹${formatMoney(coupon.maximum_discount)}
                        </small>
                      `
                      : ''
                  }
                </td>

                <td>
                  ${formatAppliesTo(coupon.applies_to)}
                </td>

                <td>
                  <div>
                    ${formatDate(coupon.start_date)}
                  </div>

                  <small>
                    to ${formatDate(coupon.expiry_date)}
                  </small>
                </td>

                <td>
                  <strong>
                    ${coupon.usage_count}
                  </strong>

                  ${
                    coupon.usage_limit
                      ? ` / ${coupon.usage_limit}`
                      : ' / Unlimited'
                  }
                </td>

                <td>
                  <span
                    class="thp-admin-status-badge ${
                      coupon.is_currently_active
                        ? 'is-active'
                        : 'is-inactive'
                    }"
                  >
                    ${
                      coupon.is_currently_active
                        ? 'Active'
                        : 'Inactive'
                    }
                  </span>
                </td>

                <td>
                  <div class="thp-admin-row-actions">

                  ${hasPermission('coupons_offers_marketing', 'edit') ? `
                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="up"
                      data-id="${item.id}"
                    >
                      ↑
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="down"
                      data-id="${item.id}"
                    >
                      ↓
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="edit"
                      data-id="${item.id}"
                    >
                      Edit
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="toggle"
                      data-id="${item.id}"
                    >
                      ${item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  ` : ''}

                  ${hasPermission('coupons_offers_marketing', 'delete') ? `
                    <button
                      class="thp-admin-row-button is-danger"
                      data-promotion-action="delete"
                      data-id="${item.id}"
                    >
                      Delete
                    </button>
                  ` : ''}

                </div>
                </td>

              </tr>
            `).join('')}
          </tbody>

        </table>

      </div>
      <div
        class="thp-admin-pagination"
        id="coupon-pagination"
      ></div>
    `

    setupCouponTableEvents(coupons)

      const searchInput =
        document.querySelector('#coupon-search')

      const statusFilter =
        document.querySelector('#coupon-status-filter')

      const sortSelect =
        document.querySelector('#coupon-sort')

      const pagination =
        document.querySelector('#coupon-pagination')

      let currentPage = 1

      const rowsPerPage = 5

      function updateCouponTable() {
        const search =
          searchInput.value.trim().toLowerCase()

        const status =
          statusFilter.value

        const sort =
          sortSelect.value

        const rows =
          Array.from(
            document.querySelectorAll(
              '#coupon-table-body tr'
            )
          )

        let visibleRows = rows.filter(row => {

          const code =
            row.dataset.couponCode

          const rowStatus =
            row.dataset.couponStatus

          const matchesSearch =
            !search || code.includes(search)

          const matchesStatus =
            status === 'all' ||
            rowStatus === status

          return matchesSearch && matchesStatus
        })

        visibleRows.sort((a, b) => {

          const couponA =
            coupons.find(
              item =>
                String(item.id) ===
                a.querySelector(
                  '[data-coupon-id]'
                )?.dataset.couponId
            )

          const couponB =
            coupons.find(
              item =>
                String(item.id) ===
                b.querySelector(
                  '[data-coupon-id]'
                )?.dataset.couponId
            )

          if (!couponA || !couponB) {
            return 0
          }

          switch (sort) {

            case 'code-asc':
              return couponA.code.localeCompare(
                couponB.code
              )

            case 'code-desc':
              return couponB.code.localeCompare(
                couponA.code
              )

            case 'discount-high':
              return Number(couponB.discount_value) -
                Number(couponA.discount_value)

            case 'discount-low':
              return Number(couponA.discount_value) -
                Number(couponB.discount_value)

            case 'usage-high':
              return Number(couponB.usage_count) -
                Number(couponA.usage_count)

            case 'usage-low':
              return Number(couponA.usage_count) -
                Number(couponB.usage_count)

            default:
              return 0
          }
        })

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              visibleRows.length /
              rowsPerPage
            )
          )

        if (currentPage > totalPages) {
          currentPage = totalPages
        }

        const start =
          (currentPage - 1) *
          rowsPerPage

        const end =
          start + rowsPerPage

        const pageRows =
          visibleRows.slice(start, end)

        visibleRows.forEach(row => {
          document
            .querySelector('#coupon-table-body')
            .appendChild(row)
        })

        rows.forEach(row => {
          row.hidden = true
        })

        pageRows.forEach(row => {
          row.hidden = false
        })

        pagination.innerHTML = `
          <span>
            Showing ${
              visibleRows.length
                ? start + 1
                : 0
            }–${
              Math.min(
                end,
                visibleRows.length
              )
            } of ${visibleRows.length}
          </span>

          <div class="thp-admin-pagination-buttons">

            <button
              type="button"
              class="thp-admin-row-button"
              id="coupon-prev-page"
              ${currentPage === 1 ? 'disabled' : ''}
            >
              Previous
            </button>

            <span>
              Page ${currentPage} of ${totalPages}
            </span>

            <button
              type="button"
              class="thp-admin-row-button"
              id="coupon-next-page"
              ${
                currentPage === totalPages
                  ? 'disabled'
                  : ''
              }
            >
              Next
            </button>

          </div>
        `

        document
          .querySelector('#coupon-prev-page')
          ?.addEventListener('click', () => {
            if (currentPage > 1) {
              currentPage--
              updateCouponTable()
            }
        })

        document
          .querySelector('#coupon-next-page')
          ?.addEventListener('click', () => {
            if (currentPage < totalPages) {
              currentPage++
              updateCouponTable()
            }
        })
      }

      searchInput?.addEventListener('input', () => {
        currentPage = 1
        updateCouponTable()
      })

      statusFilter?.addEventListener('change', () => {
        currentPage = 1
        updateCouponTable()
      })

      sortSelect?.addEventListener('change', () => {
        currentPage = 1
        updateCouponTable()
      })

      document
        .querySelector('#export-coupons-csv')
        ?.addEventListener('click', () => {

          const search =
            searchInput.value
              .trim()
              .toLowerCase()

          const status =
            statusFilter.value

          const filteredCoupons =
            coupons.filter(coupon => {

              const code =
                String(coupon.code || '')
                  .toLowerCase()

              const rowStatus =
                coupon.is_currently_active
                  ? 'active'
                  : 'inactive'

              const matchesSearch =
                !search ||
                code.includes(search)

              const matchesStatus =
                status === 'all' ||
                rowStatus === status

              return (
                matchesSearch &&
                matchesStatus
              )
            })

          const rows =
            filteredCoupons.map(coupon => [
              coupon.code,
              formatDiscount(coupon),
              formatAppliesTo(coupon.applies_to),
              formatDate(coupon.start_date),
              formatDate(coupon.expiry_date),
              `${coupon.usage_count}${
                coupon.usage_limit
                  ? ` / ${coupon.usage_limit}`
                  : ' / Unlimited'
              }`,
              coupon.is_currently_active
                ? 'Active'
                : 'Inactive'
            ])

          downloadCsv(
            'tatito-coupons.csv',
            [
              'Code',
              'Discount',
              'Applies To',
              'Start Date',
              'Expiry Date',
              'Usage',
              'Status'
            ],
            rows
          )
        })

      updateCouponTable()
  } catch (error) {

    console.error('Failed to load coupons:', error)

    container.innerHTML = `
      <div class="thp-admin-empty-state">

        <div class="thp-admin-empty-icon">!</div>

        <strong>
          Unable to load coupons
        </strong>

        <span>
          ${escapeHtml(error.message)}
        </span>

      </div>
    `
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function downloadCsv(filename, headers, rows) {

  const escapeCsv = value => {
    const text = String(value ?? '')

    return `"${text.replace(/"/g, '""')}"`
  }

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row =>
      row.map(escapeCsv).join(',')
    )
  ].join('\n')

  const blob = new Blob(
    [csv],
    { type: 'text/csv;charset=utf-8;' }
  )

  const url =
    URL.createObjectURL(blob)

  const link =
    document.createElement('a')

  link.href = url
  link.download = filename

  document.body.appendChild(link)

  link.click()

  link.remove()

  URL.revokeObjectURL(url)
}

function formatMoney(value) {
  const number = Number(value || 0)

  return number.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDiscount(coupon) {
  const value = formatMoney(coupon.discount_value)

  return coupon.discount_type === 'percentage'
    ? `${value}%`
    : `₹${value}`
}

function formatAppliesTo(value) {
  const labels = {
    pharmacy: 'Pharmacy',
    lab: 'Lab',
    doctor: 'Doctor',
    plans: 'Health Plans',
    all: 'All Services',
  }

  return labels[value] || value
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


async function setupCouponTableEvents(coupons) {
  document
    .querySelectorAll('[data-coupon-action]')
    .forEach(button => {

      button.addEventListener('click', async () => {

        const action = button.dataset.couponAction
        const couponId = Number(button.dataset.couponId)

        const coupon = coupons.find(
          item => item.id === couponId
        )

        if (!coupon) {
          return
        }

        if (action === 'delete') {
          const confirmed = window.confirm(
            `Delete coupon "${coupon.code}"? This action cannot be undone.`
          )

          if (!confirmed) {
            return
          }

          button.disabled = true
          button.textContent = 'Deleting...'

          try {
            await deleteCoupon(couponId)

            showAdminToast('Coupon deleted successfully.')

            await loadCoupons()

          } catch (error) {
            console.error(
              'Failed to delete coupon:',
            error
          )

          showAdminToast(
            error.message || 'Unable to delete coupon.',
            'error'
          )

          button.disabled = false
          button.textContent = 'Delete'
        }

        return
      }

      if (action === 'edit') {
        openEditCouponModal(coupon)
        return
      }

      if (action !== 'toggle') {
        console.log(
          'Coupon action not implemented yet:',
          action,
          coupon
        )
        return
      }
        const confirmed = window.confirm(
          coupon.is_active
            ? `Deactivate coupon "${coupon.code}"?`
            : `Activate coupon "${coupon.code}"?`
        )

        if (!confirmed) {
          return
        }

        button.disabled = true
        button.textContent = 'Updating...'

        try {
          await toggleCouponStatus(couponId)

          showAdminToast(
            coupon.is_active
              ? 'Coupon deactivated successfully.'
              : 'Coupon activated successfully.'
          )

          await loadCoupons()

        } catch (error) {

          console.error(
            'Failed to toggle coupon status:',
            error
          )

          showAdminToast(
            error.message || 'Unable to update coupon status.',
            'error'
          )
          button.disabled = false
          button.textContent =
            coupon.is_active
              ? 'Deactivate'
              : 'Activate'
        }
      })
    })
}

let couponModalMode = 'edit'

function setupCouponModalEvents() {
  const modal = document.querySelector('#coupon-modal')
  const form = document.querySelector('#coupon-form')
  const closeButton = document.querySelector('#close-coupon-modal')
  const cancelButton = document.querySelector('#cancel-coupon-modal')
  const backdrop = document.querySelector('[data-close-coupon-modal]')
  const createButton =
    document.querySelector('#create-coupon-button')

  if (!modal || !form) {
    return
  }

  closeButton?.addEventListener('click', closeCouponModal)
  cancelButton?.addEventListener('click', closeCouponModal)
  backdrop?.addEventListener('click', closeCouponModal)

  createButton?.addEventListener('click', openCreateCouponModal)

  form.addEventListener('submit', handleCouponFormSubmit)
}

function openCreateCouponModal() {
  const modal = document.querySelector('#coupon-modal')

  if (!modal) {
    return
  }

  couponModalMode = 'create'

  document.querySelector('#coupon-modal-title').textContent =
    'Create Coupon'

  document.querySelector('#coupon-id').value = ''

  document.querySelector('#coupon-code').value = ''

  document.querySelector('#coupon-applies-to').value =
    'all'

  document.querySelector('#coupon-discount-type').value =
    'percentage'

  document.querySelector('#coupon-discount-value').value = ''

  document.querySelector('#coupon-maximum-discount').value = ''

  document.querySelector('#coupon-minimum-order').value =
    '0'

  document.querySelector('#coupon-start-date').value = ''

  document.querySelector('#coupon-expiry-date').value = ''

  document.querySelector('#coupon-usage-limit').value = ''

  document.querySelector('#coupon-per-user-limit').value =
    '1'

  document.querySelector('#coupon-active').checked = true

  const errorElement =
    document.querySelector('#coupon-form-error')

  errorElement.hidden = true
  errorElement.textContent = ''

  const saveButton =
    document.querySelector('#save-coupon-button')

  saveButton.textContent = 'Create Coupon'

  modal.hidden = false

  document.querySelector('#coupon-code')?.focus()
}

function openEditCouponModal(coupon) {
  couponModalMode = 'edit'
  const modal = document.querySelector('#coupon-modal')

  if (!modal) {
    return
  }

  document.querySelector('#coupon-modal-title').textContent =
    `Edit ${coupon.code}`

  document.querySelector('#coupon-id').value =
    coupon.id

  document.querySelector('#coupon-code').value =
    coupon.code || ''

  document.querySelector('#coupon-applies-to').value =
    coupon.applies_to || 'all'

  document.querySelector('#coupon-discount-type').value =
    coupon.discount_type || 'percentage'

  document.querySelector('#coupon-discount-value').value =
    coupon.discount_value || ''

  document.querySelector('#coupon-maximum-discount').value =
    coupon.maximum_discount ?? ''

  document.querySelector('#coupon-minimum-order').value =
    coupon.minimum_order_amount ?? 0

  document.querySelector('#coupon-start-date').value =
    toDateTimeLocal(coupon.start_date)

  document.querySelector('#coupon-expiry-date').value =
    toDateTimeLocal(coupon.expiry_date)

  document.querySelector('#coupon-usage-limit').value =
    coupon.usage_limit ?? ''

  document.querySelector('#coupon-per-user-limit').value =
    coupon.per_user_limit ?? 1

  document.querySelector('#coupon-active').checked =
    Boolean(coupon.is_active)

  const errorElement =
    document.querySelector('#coupon-form-error')

  errorElement.hidden = true
  errorElement.textContent = ''

  document.querySelector('#save-coupon-button').textContent =
  'Save Changes'

  modal.hidden = false
}


function closeCouponModal() {
  const modal = document.querySelector('#coupon-modal')

  if (modal) {
    modal.hidden = true
  }
}

function toDateTimeLocal(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = number =>
    String(number).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') +
    'T' +
    [
      pad(date.getHours()),
      pad(date.getMinutes()),
    ].join(':')
}

async function handleCouponFormSubmit(event) {
  event.preventDefault()

  const errorElement =
    document.querySelector('#coupon-form-error')

  const saveButton =
    document.querySelector('#save-coupon-button')

  errorElement.hidden = true
  errorElement.textContent = ''

  const couponId =
    Number(document.querySelector('#coupon-id').value)

  const code =
    document.querySelector('#coupon-code').value.trim()

  const discountType =
    document.querySelector('#coupon-discount-type').value

  const discountValue =
    Number(document.querySelector('#coupon-discount-value').value)

  const maximumDiscountValue =
    document.querySelector('#coupon-maximum-discount').value

  const minimumOrderAmount =
    Number(document.querySelector('#coupon-minimum-order').value)

  const usageLimitValue =
    document.querySelector('#coupon-usage-limit').value

  const perUserLimit =
    Number(document.querySelector('#coupon-per-user-limit').value)

  const startDate =
    document.querySelector('#coupon-start-date').value

  const expiryDate =
    document.querySelector('#coupon-expiry-date').value

  const appliesTo =
    document.querySelector('#coupon-applies-to').value

  const isActive =
    document.querySelector('#coupon-active').checked

  if (!code) {
    errorElement.textContent =
      'Coupon code is required.'
    errorElement.hidden = false
    return
  }

  if (!startDate || !expiryDate) {
    errorElement.textContent =
      'Start and expiry dates are required.'
    errorElement.hidden = false
    return
  }

  if (new Date(expiryDate) <= new Date(startDate)) {
    errorElement.textContent =
      'Expiry date must be after the start date.'
    errorElement.hidden = false
    return
  }

  const payload = {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    maximum_discount:
      maximumDiscountValue === ''
        ? null
        : Number(maximumDiscountValue),
    minimum_order_amount: minimumOrderAmount,
    applies_to: appliesTo,
    start_date: new Date(startDate).toISOString(),
    expiry_date: new Date(expiryDate).toISOString(),
    usage_limit:
      usageLimitValue === ''
        ? null
        : Number(usageLimitValue),
    per_user_limit: perUserLimit,
    is_active: isActive,
  }

  saveButton.disabled = true
  saveButton.textContent = 'Saving...'

  try {
        if (couponModalMode === 'create') {
          await createCoupon(payload)
        } else {
          await updateCoupon(couponId, payload)
        }

        closeCouponModal()

    await loadCoupons()

  } catch (error) {

    console.error(
      'Failed to update coupon:',
      error
    )

    errorElement.textContent =
      error.message ||
      'Unable to update coupon.'

    errorElement.hidden = false

  } finally {

    saveButton.disabled = false
    saveButton.textContent =
      couponModalMode === 'create'
        ? 'Create Coupon'
        : 'Save Changes'
  }
}

let promotionModalMode = 'create'
let promotionalContentModalMode = 'create'

async function loadFeaturedPromotions() {
  const container = document.querySelector('#featured-promotions-content')
  if (!container) return

  try {
    const promotions = await getFeaturedPromotions()

    if (!promotions.length) {
      container.innerHTML = `
        <div class="thp-admin-empty-state">
          <strong>No featured promotions found</strong>
          <span>Add the first promotion for the Home page.</span>
        </div>
      `
      return
    }

      container.innerHTML = `
        <div class="thp-admin-table-toolbar">

          <div class="thp-admin-search-box">
            <input
              type="search"
              id="promotion-search"
              placeholder="Search promotion..."
            />
          </div>

          <div class="thp-admin-filter-box">
            <select id="promotion-status-filter">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="thp-admin-filter-box">
            <select id="promotion-sort">
              <option value="order-asc">Order Low → High</option>
              <option value="order-desc">Order High → Low</option>
              <option value="title-asc">Title A → Z</option>
              <option value="title-desc">Title Z → A</option>
            </select>
          </div>

          <button
            type="button"
            class="thp-admin-secondary-button"
            id="export-promotions-csv"
          >
            Export CSV
          </button>

        </div>

        <div class="thp-admin-table-wrapper">
        <table class="thp-admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Badge</th>
              <th>Title</th>
              <th>Colour</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${promotions.map(item => `
              <tr
                data-promotion-id="${item.id}"
                data-promotion-title="${escapeHtml(item.title).toLowerCase()}"
                data-promotion-badge="${escapeHtml(item.badge_text).toLowerCase()}"
                data-promotion-status="${
                  item.is_active ? 'active' : 'inactive'
                }"
              >
                <td>${item.display_order}</td>

                <td>
                  ${escapeHtml(item.badge_text)}
                </td>

                <td>
                  <strong>${escapeHtml(item.title)}</strong>
                  <br>
                  <small>${escapeHtml(item.description || '')}</small>
                </td>

                <td>
                  ${escapeHtml(item.colour || '—')}
                </td>

                <td>
                  <span class="thp-admin-status-badge ${
                    item.is_active ? 'is-active' : 'is-inactive'
                  }">
                    ${item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td>
                  <div class="thp-admin-row-actions">

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="up"
                      data-id="${item.id}"
                    >
                      ↑
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="down"
                      data-id="${item.id}"
                    >
                      ↓
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="edit"
                      data-id="${item.id}"
                    >
                      Edit
                    </button>

                    <button
                      class="thp-admin-row-button"
                      data-promotion-action="toggle"
                      data-id="${item.id}"
                    >
                      ${item.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      class="thp-admin-row-button is-danger"
                      data-promotion-action="delete"
                      data-id="${item.id}"
                    >
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
          </table>
          </div>

          <div
            class="thp-admin-pagination"
            id="promotion-pagination"
          ></div>
    `

    container
      .querySelectorAll('[data-promotion-action]')
      .forEach(button => {

        button.addEventListener('click', async () => {

          const id = Number(button.dataset.id)

          const item = promotions.find(
            row => row.id === id
          )

          if (!item) return

          try {

            const action =
              button.dataset.promotionAction

            if (action === 'edit') {
              return openPromotionModal(item)
            }

            if (action === 'delete') {

              if (!confirm(
                `Delete promotion "${item.title}"?`
              )) {
                return
              }

              await deleteFeaturedPromotion(id)

            } else if (action === 'toggle') {

              await toggleFeaturedPromotionStatus(id)

            } else if (action === 'up') {

              await moveFeaturedPromotionUp(id)

            } else if (action === 'down') {

              await moveFeaturedPromotionDown(id)
            }

            showAdminToast(
              action === 'delete'
                ? 'Promotion deleted successfully.'
                : action === 'toggle'
                  ? 'Promotion status updated successfully.'
                  : action === 'up'
                    ? 'Promotion moved up successfully.'
                    : action === 'down'
                      ? 'Promotion moved down successfully.'
                      : 'Promotion updated successfully.'
            )

            await loadFeaturedPromotions()

          } catch (error) {

            showAdminToast(
              error.message || 'Unable to update promotion.',
              'error'
            )
          }
        })
      })

    const searchInput =
      document.querySelector('#promotion-search')

    const statusFilter =
      document.querySelector('#promotion-status-filter')

    const sortSelect =
      document.querySelector('#promotion-sort')

    const pagination =
      document.querySelector('#promotion-pagination')

    let currentPage = 1

    const rowsPerPage = 5

    function updatePromotionTable() {
      const search =
        searchInput.value.trim().toLowerCase()

      const status =
        statusFilter.value

      const sort =
        sortSelect.value

      const rows = Array.from(
        container.querySelectorAll(
          '[data-promotion-id]'
        )
      )

      let visibleRows = rows.filter(row => {

        const title =
          row.dataset.promotionTitle

        const badge =
          row.dataset.promotionBadge

        const rowStatus =
          row.dataset.promotionStatus

        const matchesSearch =
          !search ||
          title.includes(search) ||
          badge.includes(search)

        const matchesStatus =
          status === 'all' ||
          rowStatus === status

        return matchesSearch && matchesStatus
      })

      visibleRows.sort((a, b) => {

        const promotionA = promotions.find(
          item =>
            String(item.id) ===
            a.dataset.promotionId
        )

        const promotionB = promotions.find(
          item =>
            String(item.id) ===
            b.dataset.promotionId
        )

        if (!promotionA || !promotionB) {
          return 0
        }

        switch (sort) {

          case 'order-asc':
            return (
              Number(promotionA.display_order) -
              Number(promotionB.display_order)
            )

          case 'order-desc':
            return (
              Number(promotionB.display_order) -
              Number(promotionA.display_order)
            )

          case 'title-asc':
            return promotionA.title.localeCompare(
              promotionB.title
            )

          case 'title-desc':
            return promotionB.title.localeCompare(
              promotionA.title
            )

          default:
            return 0
        }
      })

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            visibleRows.length /
            rowsPerPage
          )
        )

      if (currentPage > totalPages) {
        currentPage = totalPages
      }

      const start =
        (currentPage - 1) *
        rowsPerPage

      const end =
        start + rowsPerPage

      const pageRows =
        visibleRows.slice(start, end)

      visibleRows.forEach(row => {
        container.querySelector('tbody').appendChild(row)
      })

      rows.forEach(row => {
        row.hidden = true
      })

      pageRows.forEach(row => {
        row.hidden = false
      })

      pagination.innerHTML = `
        <span>
          Showing ${
            visibleRows.length
              ? start + 1
              : 0
          }–${
            Math.min(
              end,
              visibleRows.length
            )
          } of ${visibleRows.length}
        </span>

        <div class="thp-admin-pagination-buttons">

          <button
            type="button"
            class="thp-admin-row-button"
            id="promotion-prev-page"
            ${currentPage === 1 ? 'disabled' : ''}
          >
            Previous
          </button>

          <span>
            Page ${currentPage} of ${totalPages}
          </span>

          <button
            type="button"
            class="thp-admin-row-button"
            id="promotion-next-page"
            ${
              currentPage === totalPages
                ? 'disabled'
                : ''
            }
          >
            Next
          </button>

        </div>
      `

      document
        .querySelector('#promotion-prev-page')
        ?.addEventListener('click', () => {

          if (currentPage > 1) {
            currentPage--
            updatePromotionTable()
          }

        })

      document
        .querySelector('#promotion-next-page')
        ?.addEventListener('click', () => {

          if (currentPage < totalPages) {
            currentPage++
            updatePromotionTable()
          }

        })
    }

    searchInput?.addEventListener('input', () => {
      currentPage = 1
      updatePromotionTable()
    })

    statusFilter?.addEventListener('change', () => {
      currentPage = 1
      updatePromotionTable()
    })

    sortSelect?.addEventListener('change', () => {
      currentPage = 1
      updatePromotionTable()
    })

    document
      .querySelector('#export-promotions-csv')
      ?.addEventListener('click', () => {

        const search =
          searchInput.value
            .trim()
            .toLowerCase()

        const status =
          statusFilter.value

        const filteredPromotions =
          promotions.filter(promotion => {

            const title =
              String(promotion.title || '')
                .toLowerCase()

            const badge =
              String(promotion.badge_text || '')
                .toLowerCase()

            const rowStatus =
              promotion.is_active
                ? 'active'
                : 'inactive'

            const matchesSearch =
              !search ||
              title.includes(search) ||
              badge.includes(search)

            const matchesStatus =
              status === 'all' ||
              rowStatus === status

            return (
              matchesSearch &&
              matchesStatus
            )
          })

        const rows =
          filteredPromotions.map(promotion => [
            promotion.display_order,
            promotion.badge_text,
            promotion.title,
            promotion.description,
            promotion.colour,
            promotion.is_active
              ? 'Active'
              : 'Inactive'
          ])

        downloadCsv(
          'tatito-featured-promotions.csv',
          [
            'Order',
            'Badge',
            'Title',
            'Description',
            'Colour',
            'Status'
          ],
          rows
        )
      })

    updatePromotionTable()

  } catch (error) {

    container.innerHTML = `
      <div class="thp-admin-empty-state">
        <strong>Unable to load promotions</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `
  }
}

function setupPromotionEvents() {

  const modal =
    document.querySelector('#promotion-modal')

  const form =
    document.querySelector('#promotion-form')

  if (!modal || !form) return

  document
    .querySelector('#create-promotion-button')
    ?.addEventListener(
      'click',
      () => openPromotionModal()
    )

  document
    .querySelector('#close-promotion-modal')
    ?.addEventListener(
      'click',
      closePromotionModal
    )

  document
    .querySelector('#cancel-promotion-modal')
    ?.addEventListener(
      'click',
      closePromotionModal
    )

  document
    .querySelector('[data-close-promotion-modal]')
    ?.addEventListener(
      'click',
      closePromotionModal
    )

  form.addEventListener(
    'submit',
    savePromotion
  )
}

function openPromotionModal(item = null) {

  promotionModalMode =
    item ? 'edit' : 'create'

  document.querySelector(
    '#promotion-modal-title'
  ).textContent =
    item
      ? `Edit ${item.title}`
      : 'Add Promotion'

  document.querySelector(
    '#promotion-id'
  ).value =
    item?.id || ''

  document.querySelector(
    '#promotion-badge'
  ).value =
    item?.badge_text || ''

  document.querySelector(
    '#promotion-title'
  ).value =
    item?.title || ''

  document.querySelector(
    '#promotion-description'
  ).value =
    item?.description || ''

  document.querySelector(
    '#promotion-link'
  ).value =
    item?.link || ''

  document.querySelector(
    '#promotion-colour'
  ).value =
    item?.colour || ''

  document.querySelector(
    '#promotion-order'
  ).value =
    item?.display_order || 1

  document.querySelector(
    '#promotion-active'
  ).checked =
    item?.is_active ?? true

  document.querySelector(
    '#promotion-form-error'
  ).hidden = true

  document.querySelector(
    '#promotion-modal'
  ).hidden = false
}

function closePromotionModal() {

  document.querySelector(
    '#promotion-modal'
  ).hidden = true
}

async function savePromotion(event) {

  event.preventDefault()

  const button =
    document.querySelector(
      '#save-promotion-button'
    )

  const error =
    document.querySelector(
      '#promotion-form-error'
    )

  const data = {

    badge_text:
      document.querySelector(
        '#promotion-badge'
      ).value.trim(),

    title:
      document.querySelector(
        '#promotion-title'
      ).value.trim(),

    description:
      document.querySelector(
        '#promotion-description'
      ).value.trim(),

    link:
      document.querySelector(
        '#promotion-link'
      ).value.trim(),

    colour:
      document.querySelector(
        '#promotion-colour'
      ).value.trim(),

    display_order:
      Number(
        document.querySelector(
          '#promotion-order'
        ).value || 1
      ),

    is_active:
      document.querySelector(
        '#promotion-active'
      ).checked,
  }

  button.disabled = true

  try {

    const id =
      document.querySelector(
        '#promotion-id'
      ).value

    if (
      promotionModalMode === 'edit' &&
      id
    ) {

      await updateFeaturedPromotion(
        id,
        data
      )

      showAdminToast('Promotion updated successfully.')

    } else {

      await createFeaturedPromotion(
        data
      )

      showAdminToast('Promotion created successfully.')
    }

    closePromotionModal()

    await loadFeaturedPromotions()

  } catch (e) {

    error.textContent =
      e.message ||
      'Unable to save promotion.'

    error.hidden = false

  } finally {

    button.disabled = false
  }
}


async function loadPromotionalContent() {

  const container =
    document.querySelector(
      '#promotional-content-list'
    )

  if (!container) return

  try {

    const items =
      await getPromotionalContent()

    if (!items.length) {

      container.innerHTML = `
        <div class="thp-admin-empty-state">
          <strong>
            No promotional banners or offer strips found
          </strong>

          <span>
            Add Home or Pharmacy promotional content.
          </span>
        </div>
      `

      return
    }

    container.innerHTML = `
          <div class="thp-admin-table-toolbar">

            <div class="thp-admin-search-box">
              <input
                type="search"
                id="promotional-content-search"
                placeholder="Search promotional content..."
              />
            </div>

            <div class="thp-admin-filter-box">
              <select id="promotional-content-type-filter">
                <option value="all">All Types</option>
                <option value="banner">Banner</option>
                <option value="offer_strip">Offer Strip</option>
              </select>
            </div>

            <div class="thp-admin-filter-box">
              <select id="promotional-content-placement-filter">
                <option value="all">All Placements</option>
                <option value="home">Home</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            <div class="thp-admin-filter-box">
              <select id="promotional-content-status-filter">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                type="button"
                class="thp-admin-secondary-button"
                id="export-promotional-content-csv"
              >
                Export CSV
              </button>
            </div>

            <div class="thp-admin-filter-box">
              <select id="promotional-content-sort">
                <option value="order-asc">Order Low → High</option>
                <option value="order-desc">Order High → Low</option>
                <option value="title-asc">Title A → Z</option>
                <option value="title-desc">Title Z → A</option>
              </select>
            </div>


          </div>

          <div class="thp-admin-table-wrapper">
            <table class="thp-admin-table">

          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Type</th>
              <th>Placement</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            ${items.map(item => `
                          <tr
                            data-pc-id="${item.id}"
                            data-pc-title="${escapeHtml(item.title).toLowerCase()}"
                            data-pc-type="${item.content_type}"
                            data-pc-placement="${item.placement}"
                            data-pc-status="${
                              item.is_active
                                ? 'active'
                                : 'inactive'
                            }"
                          >

                <td>
                  ${item.display_order}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(item.title)}
                  </strong>

                  <br>

                  <small>
                    ${escapeHtml(
                      item.description || ''
                    )}
                  </small>
                </td>

                <td>
                  ${
                    item.content_type === 'banner'
                      ? 'Banner'
                      : 'Offer Strip'
                  }
                </td>

                <td>
                  ${
                    item.placement === 'home'
                      ? 'Home'
                      : 'Pharmacy'
                  }
                </td>

                <td>
                  <span class="thp-admin-status-badge ${
                    item.is_active
                      ? 'is-active'
                      : 'is-inactive'
                  }">
                    ${
                      item.is_active
                        ? 'Active'
                        : 'Inactive'
                    }
                  </span>
                </td>

                <td>
                  <div class="thp-admin-row-actions">

                    ${hasPermission('coupons_offers_marketing', 'edit') ? `
                      <button
                        class="thp-admin-row-button"
                        data-pc-action="up"
                        data-id="${item.id}"
                      >
                        ↑
                      </button>

                      <button
                        class="thp-admin-row-button"
                        data-pc-action="down"
                        data-id="${item.id}"
                      >
                        ↓
                      </button>

                      <button
                        class="thp-admin-row-button"
                        data-pc-action="edit"
                        data-id="${item.id}"
                      >
                        Edit
                      </button>

                      <button
                        class="thp-admin-row-button"
                        data-pc-action="toggle"
                        data-id="${item.id}"
                      >
                        ${
                          item.is_active
                            ? 'Deactivate'
                            : 'Activate'
                        }
                      </button>
                    ` : ''}

                    ${hasPermission('coupons_offers_marketing', 'delete') ? `
                      <button
                        class="thp-admin-row-button is-danger"
                        data-pc-action="delete"
                        data-id="${item.id}"
                      >
                        Delete
                      </button>
                    ` : ''}

                  </div>
                </td>

              </tr>
            `).join('')}

          </tbody>
        </table>
      </div>
    `

    container
      .querySelectorAll('[data-pc-action]')
      .forEach(button => {

        button.addEventListener(
          'click',
          async () => {

            const id =
              Number(button.dataset.id)

            const item =
              items.find(
                row => row.id === id
              )

            if (!item) return

            try {

              const action =
                button.dataset.pcAction

              if (action === 'edit') {

                return openPromotionalContentModal(
                  item
                )
              }

              if (action === 'delete') {

                if (!confirm(
                  `Delete "${item.title}"?`
                )) {
                  return
                }

                await deletePromotionalContent(
                  id
                )

              } else if (
                action === 'toggle'
              ) {

                await togglePromotionalContentStatus(
                  id
                )

              } else if (
                action === 'up'
              ) {

                await movePromotionalContentUp(
                  id
                )

              } else if (
                action === 'down'
              ) {

                await movePromotionalContentDown(
                  id
                )
              }

              await loadPromotionalContent()

            } catch (error) {

              showAdminToast(
                error.message || 'Unable to update promotional content.',
                'error'
              )
            }
          }
        )
      })

    const searchInput =
      document.querySelector(
        '#promotional-content-search'
      )

    const typeFilter =
      document.querySelector(
        '#promotional-content-type-filter'
      )

    const placementFilter =
      document.querySelector(
        '#promotional-content-placement-filter'
      )

    const statusFilter =
      document.querySelector(
        '#promotional-content-status-filter'
      )

    const sortSelect =
      document.querySelector(
        '#promotional-content-sort'
      )

    let currentPage = 1

    const rowsPerPage = 5

    const tableBody =
      container.querySelector('tbody')

    const pagination =
      document.createElement('div')

    pagination.id =
      'promotional-content-pagination'

    pagination.className =
      'thp-admin-pagination'

    container.appendChild(pagination)

    function updatePromotionalContentTable() {

      const search =
        searchInput.value
          .trim()
          .toLowerCase()

      const selectedType =
        typeFilter.value

      const selectedPlacement =
        placementFilter.value

      const selectedStatus =
        statusFilter.value

      const selectedSort =
        sortSelect.value

      const rows = Array.from(
        tableBody.querySelectorAll(
          'tr[data-pc-id]'
        )
      )

      let filteredRows =
        rows.filter(row => {

          const title =
            row.dataset.pcTitle || ''

          const type =
            row.dataset.pcType || ''

          const placement =
            row.dataset.pcPlacement || ''

          const status =
            row.dataset.pcStatus || ''

          const matchesSearch =
            !search ||
            title.includes(search)

          const matchesType =
            selectedType === 'all' ||
            type === selectedType

          const matchesPlacement =
            selectedPlacement === 'all' ||
            placement === selectedPlacement

          const matchesStatus =
            selectedStatus === 'all' ||
            status === selectedStatus

          return (
            matchesSearch &&
            matchesType &&
            matchesPlacement &&
            matchesStatus
          )
        })

      filteredRows.sort((a, b) => {

        const itemA =
          items.find(
            item =>
              String(item.id) ===
              a.dataset.pcId
          )

        const itemB =
          items.find(
            item =>
              String(item.id) ===
              b.dataset.pcId
          )

        if (!itemA || !itemB) {
          return 0
        }

        switch (selectedSort) {

          case 'order-asc':
            return (
              Number(itemA.display_order) -
              Number(itemB.display_order)
            )

          case 'order-desc':
            return (
              Number(itemB.display_order) -
              Number(itemA.display_order)
            )

          case 'title-asc':
            return itemA.title.localeCompare(
              itemB.title
            )

          case 'title-desc':
            return itemB.title.localeCompare(
              itemA.title
            )

          default:
            return 0
        }
      })

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            filteredRows.length /
            rowsPerPage
          )
        )

      if (currentPage > totalPages) {
        currentPage = totalPages
      }

      const start =
        (currentPage - 1) *
        rowsPerPage

      const end =
        start + rowsPerPage

      const pageRows =
        filteredRows.slice(
          start,
          end
        )

      filteredRows.forEach(row => {
        tableBody.appendChild(row)
      })

      rows.forEach(row => {
        row.hidden = true
      })

      pageRows.forEach(row => {
        row.hidden = false
      })

      pagination.innerHTML = `
        <span>
          Showing ${
            filteredRows.length
              ? start + 1
              : 0
          }–${
            Math.min(
              end,
              filteredRows.length
            )
          } of ${filteredRows.length}
        </span>

        <div class="thp-admin-pagination-buttons">

          <button
            type="button"
            class="thp-admin-row-button"
            id="promotional-content-prev-page"
            ${
              currentPage === 1
                ? 'disabled'
                : ''
            }
          >
            Previous
          </button>

          <span>
            Page ${currentPage}
            of ${totalPages}
          </span>

          <button
            type="button"
            class="thp-admin-row-button"
            id="promotional-content-next-page"
            ${
              currentPage === totalPages
                ? 'disabled'
                : ''
            }
          >
            Next
          </button>

        </div>
      `

      document
        .querySelector(
          '#promotional-content-prev-page'
        )
        ?.addEventListener(
          'click',
          () => {

            if (currentPage > 1) {
              currentPage--
              updatePromotionalContentTable()
            }

          }
        )

      document
        .querySelector(
          '#promotional-content-next-page'
        )
        ?.addEventListener(
          'click',
          () => {

            if (currentPage < totalPages) {
              currentPage++
              updatePromotionalContentTable()
            }

          }
        )
    }

    searchInput?.addEventListener(
      'input',
      () => {

        currentPage = 1
        updatePromotionalContentTable()

      }
    )

    typeFilter?.addEventListener(
      'change',
      () => {

        currentPage = 1
        updatePromotionalContentTable()

      }
    )

    placementFilter?.addEventListener(
      'change',
      () => {

        currentPage = 1
        updatePromotionalContentTable()

      }
    )

    statusFilter?.addEventListener(
      'change',
      () => {

        currentPage = 1
        updatePromotionalContentTable()

      }
    )

    sortSelect?.addEventListener(
      'change',
      () => {
        currentPage = 1
        updatePromotionalContentTable()
      }
    )

    document
      .querySelector('#export-promotional-content-csv')
      ?.addEventListener('click', () => {

        const search =
          searchInput.value
            .trim()
            .toLowerCase()

        const selectedType =
          typeFilter.value

        const selectedPlacement =
          placementFilter.value

        const selectedStatus =
          statusFilter.value

        const filteredItems =
          items.filter(item => {

            const title =
              String(item.title || '')
                .toLowerCase()

            const status =
              item.is_active
                ? 'active'
                : 'inactive'

            const matchesSearch =
              !search ||
              title.includes(search)

            const matchesType =
              selectedType === 'all' ||
              item.content_type === selectedType

            const matchesPlacement =
              selectedPlacement === 'all' ||
              item.placement === selectedPlacement

            const matchesStatus =
              selectedStatus === 'all' ||
              status === selectedStatus

            return (
              matchesSearch &&
              matchesType &&
              matchesPlacement &&
              matchesStatus
            )
          })

        const rows =
          filteredItems.map(item => [
            item.display_order,
            item.title,
            item.content_type === 'banner'
              ? 'Banner'
              : 'Offer Strip',
            item.placement === 'home'
              ? 'Home'
              : 'Pharmacy',
            item.is_active
              ? 'Active'
              : 'Inactive'
          ])

        downloadCsv(
          'tatito-promotional-content.csv',
          [
            'Order',
            'Title',
            'Type',
            'Placement',
            'Status'
          ],
          rows
        )
      })

    updatePromotionalContentTable()

  } catch (error) {

    container.innerHTML = `
      <div class="thp-admin-empty-state">
        <strong>
          Unable to load promotional content
        </strong>

        <span>
          ${escapeHtml(error.message)}
        </span>
      </div>
    `
  }
}

function setupPromotionalContentEvents() {

  const form =
    document.querySelector(
      '#promotional-content-form'
    )

  if (!form) return

  document
    .querySelector(
      '#create-promotional-content-button'
    )
    ?.addEventListener(
      'click',
      () => openPromotionalContentModal()
    )

  document
    .querySelector(
      '#close-promotional-content-modal'
    )
    ?.addEventListener(
      'click',
      closePromotionalContentModal
    )

  document
    .querySelector(
      '#cancel-promotional-content-modal'
    )
    ?.addEventListener(
      'click',
      closePromotionalContentModal
    )

  document
    .querySelector(
      '[data-close-promotional-content-modal]'
    )
    ?.addEventListener(
      'click',
      closePromotionalContentModal
    )

  form.addEventListener(
    'submit',
    savePromotionalContent
  )
}

function openPromotionalContentModal(item = null) {

  promotionalContentModalMode =
    item ? 'edit' : 'create'

  document.querySelector(
    '#promotional-content-modal-title'
  ).textContent =
    item
      ? `Edit ${item.title}`
      : 'Add Promotional Content'

  document.querySelector(
    '#promotional-content-id'
  ).value =
    item?.id || ''

  document.querySelector(
    '#promotional-content-title'
  ).value =
    item?.title || ''

  document.querySelector(
    '#promotional-content-description'
  ).value =
    item?.description || ''

  document.querySelector(
    '#promotional-content-image'
  ).value =
    item?.image_url || ''

  document.querySelector(
    '#promotional-content-link'
  ).value =
    item?.link || ''

  document.querySelector(
    '#promotional-content-type'
  ).value =
    item?.content_type || 'banner'

  document.querySelector(
    '#promotional-content-placement'
  ).value =
    item?.placement || 'home'

  document.querySelector(
    '#promotional-content-order'
  ).value =
    item?.display_order || 1

  document.querySelector(
    '#promotional-content-active'
  ).checked =
    item?.is_active ?? true

  document.querySelector(
    '#promotional-content-form-error'
  ).hidden = true

  document.querySelector(
    '#promotional-content-modal'
  ).hidden = false
}

function closePromotionalContentModal() {

  document.querySelector(
    '#promotional-content-modal'
  ).hidden = true
}

async function savePromotionalContent(event) {

  event.preventDefault()

  const button =
    document.querySelector(
      '#save-promotional-content-button'
    )

  const error =
    document.querySelector(
      '#promotional-content-form-error'
    )

  const data = {

    title:
      document.querySelector(
        '#promotional-content-title'
      ).value.trim(),

    description:
      document.querySelector(
        '#promotional-content-description'
      ).value.trim(),

    image_url:
      document.querySelector(
        '#promotional-content-image'
      ).value.trim(),

    link:
      document.querySelector(
        '#promotional-content-link'
      ).value.trim(),

    content_type:
      document.querySelector(
        '#promotional-content-type'
      ).value,

    placement:
      document.querySelector(
        '#promotional-content-placement'
      ).value,

    display_order:
      Number(
        document.querySelector(
          '#promotional-content-order'
        ).value || 1
      ),

    is_active:
      document.querySelector(
        '#promotional-content-active'
      ).checked,
  }

  button.disabled = true

  try {

    const id =
      document.querySelector(
        '#promotional-content-id'
      ).value

    if (
      promotionalContentModalMode === 'edit' &&
      id
    ) {

      await updatePromotionalContent(
        id,
        data
      )

      showAdminToast('Promotional content updated successfully.')

    } else {

      await createPromotionalContent(
        data
      )

      showAdminToast('Promotional content created successfully.')
    }

    closePromotionalContentModal()

    await loadPromotionalContent()

  } catch (e) {

    error.textContent =
      e.message ||
      'Unable to save promotional content.'

    error.hidden = false

  } finally {

    button.disabled = false
  }
}