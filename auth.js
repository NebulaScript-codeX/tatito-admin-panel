const AUTH_KEY = 'tatito-health-user'
let pendingAction = null

function initialsOf(name) {
  return (
    String(name || 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'US'
  )
}

function readEntry() {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// The stored session is { token, user }. Legacy entries (created before the
// backend existed) hold the user object directly without a token; they are
// still treated as a signed-in identity for backwards compatibility.
export function isAuthenticated() {
  const entry = readEntry()
  if (!entry) return false
  if (entry.token) return true
  return Boolean(entry.name || entry.email || entry.mobile)
}

export function getAuthToken() {
  const entry = readEntry()
  return (entry && entry.token) || null
}

export function getAuthUser() {
  const entry = readEntry()
  if (!entry) return null
  if (entry.token && entry.user) {
    const user = entry.user
    return { ...user, initials: user.initials || initialsOf(user.name) }
  }
  if (entry.name || entry.email || entry.mobile) {
    return { ...entry, type: entry.type || 'patient' }
  }
  return null
}

export function setSession(token, user) {
  const initials = user.initials || initialsOf(user.name)
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ token, user: { ...user, initials } }),
  )
  const resumed = completePendingAction()
  window.dispatchEvent(new CustomEvent('thp-auth-changed'))
  return { resumed }
}

export function clearPendingAction() {
  pendingAction = null
}

export function onAuthChange(fn) {
  window.addEventListener('thp-auth-changed', fn)
  return () => window.removeEventListener('thp-auth-changed', fn)
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY)
  window.dispatchEvent(new CustomEvent('thp-auth-changed'))
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
  window.dispatchEvent(
    new CustomEvent('thp-auth-required', { detail: { reason, params } }),
  )
}

// Legacy helpers kept for compatibility with any residual callers. The real
// flows now go through api.js + setSession().
export function loginWithMobile() {
  return { user: null, resumed: false }
}

export function registerPortal() {
  return { user: null, resumed: false }
}