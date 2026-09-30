import './admin.css'
import { adminLogin, isAdminAuthenticated } from './adminAuth.js'
import { renderAdminLayout } from './adminLayout.js'
import { getCoupons,  toggleCouponStatus, deleteCoupon, updateCoupon, createCoupon, } from './adminApi.js'


export function renderAdminLogin(app) {
  app.innerHTML = `
    <main class="admin-login-page">
      <section class="admin-login-card">

        <div class="admin-login-brand">
          <div class="admin-login-logo">T+</div>

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
            <label for="admin-username">Username</label>

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
            <label for="admin-password">Password</label>

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

    const password = document.querySelector('#admin-password').value

    errorElement.hidden = true
    errorElement.textContent = ''

    button.disabled = true
    button.textContent = 'Signing in...'

    try {
      await adminLogin(username, password)

      window.location.hash = '#/admin/dashboard'
    } catch (error) {
      errorElement.textContent = error.message
      errorElement.hidden = false
    } finally {
      button.disabled = false
      button.textContent = 'Sign In'
    }
  })
}


export function renderAdminDashboard(app) {
  if (!isAdminAuthenticated()) {
    window.location.hash = '#/admin/login'
    return
  }

  const dashboardContent = `
    <section class="thp-admin-dashboard">

      <div class="thp-admin-welcome">
        <div>
          <h2>Platform Overview</h2>
          <p>Monitor Tatito Health+ operations from one place.</p>
        </div>

        <span class="thp-admin-live-badge">
          <span></span>
          Live Dashboard
        </span>
      </div>

      <section class="thp-admin-stat-grid">

        <article class="thp-admin-stat-card">
          <div class="thp-admin-stat-icon">♙</div>
          <div>
            <span>Total Users</span>
            <strong>—</strong>
            <small>Awaiting platform data</small>
          </div>
        </article>

        <article class="thp-admin-stat-card">
          <div class="thp-admin-stat-icon">♧</div>
          <div>
            <span>Doctors</span>
            <strong>—</strong>
            <small>Awaiting platform data</small>
          </div>
        </article>

        <article class="thp-admin-stat-card">
          <div class="thp-admin-stat-icon">⌂</div>
          <div>
            <span>Healthcare Providers</span>
            <strong>—</strong>
            <small>Awaiting platform data</small>
          </div>
        </article>

        <article class="thp-admin-stat-card">
          <div class="thp-admin-stat-icon">▣</div>
          <div>
            <span>Orders</span>
            <strong>—</strong>
            <small>Awaiting platform data</small>
          </div>
        </article>

      </section>

      <section class="thp-admin-dashboard-grid">

        <article class="thp-admin-panel thp-admin-attention-panel">
          <div class="thp-admin-panel-heading">
            <div>
              <h3>Needs Immediate Attention</h3>
              <p>Items requiring administrative action.</p>
            </div>
          </div>

          <div class="thp-admin-attention-list">

            <div class="thp-admin-attention-item">
              <span class="thp-admin-attention-icon">♙</span>
              <div>
                <strong>Doctor Verifications</strong>
                <span>Pending verification requests</span>
              </div>
              <b>—</b>
            </div>

            <div class="thp-admin-attention-item">
              <span class="thp-admin-attention-icon">⌂</span>
              <div>
                <strong>Provider Approvals</strong>
                <span>Hospitals, clinics and pharmacies</span>
              </div>
              <b>—</b>
            </div>

            <div class="thp-admin-attention-item">
              <span class="thp-admin-attention-icon">▣</span>
              <div>
                <strong>Refund Requests</strong>
                <span>Payments requiring review</span>
              </div>
              <b>—</b>
            </div>

            <div class="thp-admin-attention-item">
              <span class="thp-admin-attention-icon">◌</span>
              <div>
                <strong>Open Support Tickets</strong>
                <span>Customer issues awaiting action</span>
              </div>
              <b>—</b>
            </div>

          </div>
        </article>

        <article class="thp-admin-panel">
          <div class="thp-admin-panel-heading">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest platform activity.</p>
            </div>
          </div>

          <div class="thp-admin-empty-state">
            <div class="thp-admin-empty-icon">◷</div>
            <strong>No activity yet</strong>
            <span>Recent registrations, appointments and orders will appear here.</span>
          </div>
        </article>

      </section>

      <section class="thp-admin-chart-grid">

        <article class="thp-admin-panel thp-admin-chart-panel">
          <div class="thp-admin-panel-heading">
            <div>
              <h3>Revenue Trend</h3>
              <p>Revenue will appear once commerce data is connected.</p>
            </div>
          </div>

          <div class="thp-admin-chart-placeholder">
            <span>Revenue analytics</span>
          </div>
        </article>

        <article class="thp-admin-panel thp-admin-chart-panel">
          <div class="thp-admin-panel-heading">
            <div>
              <h3>Appointments by Specialty</h3>
              <p>Appointment distribution will appear here.</p>
            </div>
          </div>

          <div class="thp-admin-chart-placeholder">
            <span>Appointment analytics</span>
          </div>
        </article>

      </section>

    </section>
  `

  renderAdminLayout(app, 'dashboard', dashboardContent)
}

export function renderAdminCouponsOffersMarketing(app) {
  if (!isAdminAuthenticated()) {
    window.location.hash = '#/admin/login'
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

        <button
          type="button"
          class="thp-admin-primary-button"
          id="create-coupon-button"
        >
          + Create Coupon
        </button>
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


      
    </section>

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

    
  `

  renderAdminLayout(
    app,
    'coupons_offers_marketing',
    content
  )

  setupCouponModalEvents()
  loadCoupons()
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

          <tbody>
            ${coupons.map(coupon => `
              <tr>

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

                    <button
                      type="button"
                      class="thp-admin-row-button"
                      data-coupon-action="edit"
                      data-coupon-id="${coupon.id}"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      class="thp-admin-row-button"
                      data-coupon-action="toggle"
                      data-coupon-id="${coupon.id}"
                    >
                      ${
                        coupon.is_active
                          ? 'Deactivate'
                          : 'Activate'
                      }
                    </button>

                    <button
                      type="button"
                      class="thp-admin-row-button is-danger"
                      data-coupon-action="delete"
                      data-coupon-id="${coupon.id}"
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
    `

    setupCouponTableEvents(coupons)

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

            await loadCoupons()

          } catch (error) {
            console.error(
              'Failed to delete coupon:',
            error
          )

          window.alert(
            error.message ||
            'Unable to delete coupon.'
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

          await loadCoupons()

        } catch (error) {

          console.error(
            'Failed to toggle coupon status:',
            error
          )

          window.alert(
            error.message ||
            'Unable to update coupon status.'
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