const AUTH_KEY = 'tatito-health-user'
let pendingAction = null

export function isAuthenticated() {
  return Boolean(localStorage.getItem(AUTH_KEY))
}

export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
  } catch {
    return null
  }
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY)
}

export function loginWithMobile(mobile) {
  const digits = mobile.replace(/\D/g, '')
  const user = { name: 'Patient', initials: 'PA', mobile: `+91 ${digits.slice(-10)}`, type: 'patient' }
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return { user, resumed: completePendingAction() }
}

export function registerPortal({ name, email, portal }) {
  const user = { name, initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), email, portal, type: 'portal' }
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return { user, resumed: completePendingAction() }
}

function completePendingAction() {
  const action = pendingAction
  pendingAction = null
  if (action) action()
  return Boolean(action)
}

export function requireAuth(action, reason = 'AUTH_REQUIRED', params = {}) {
  if (isAuthenticated()) {
    action()
    return
  }
  pendingAction = action
  window.dispatchEvent(new CustomEvent('thp-auth-required', { detail: { reason, params } }))
}
