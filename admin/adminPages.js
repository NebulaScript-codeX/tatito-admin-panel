import './admin.css'
import { adminLogin, isAdminAuthenticated } from './adminAuth.js'
import { renderAdminLayout } from './adminLayout.js'


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