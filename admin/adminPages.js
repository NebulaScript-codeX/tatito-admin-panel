import './admin.css'
import {  adminLogin,  hasPermission,  isAdminAuthenticated, } from './adminAuth.js'
import { renderAdminLayout } from './adminLayout.js'
import {
  getCoupons,
  toggleCouponStatus,
  deleteCoupon,
  updateCoupon,
  createCoupon,

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
  movePromotionalContentDown
} from './adminApi.js'

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

          <div class="admin-login-logo">
            T+
          </div>

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
      await adminLogin(username, password)
      window.location.hash = '#/admin/dashboard'
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