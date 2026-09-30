import './admin.css'
import { adminLogin } from './adminAuth.js'

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
