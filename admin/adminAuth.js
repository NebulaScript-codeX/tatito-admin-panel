const ADMIN_SESSION_KEY = 'tatito-admin-session'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

export function getAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to read admin session:', error)
    return null
  }
}

function saveAdminSession(session) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export function updateAdminSessionProfile(admin) {
  const session = getAdminSession()
  if (!session || !admin) return
  saveAdminSession({ ...session, admin })
}

export function isAdminAuthenticated() {
  const session = getAdminSession()

  return Boolean(session?.access && session?.admin)
}

export function getAdminToken() {
  const session = getAdminSession()

  return session?.access || null
}

export async function refreshAdminAccessToken() {
  const session = getAdminSession()
  if (!session?.refresh) return false

  const response = await fetch(`${API_BASE_URL}/admin/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: session.refresh }),
  })
  if (response.status === 400 || response.status === 401) return false
  if (!response.ok) {
    throw new Error(`Admin token refresh failed (${response.status}).`)
  }

  const data = await response.json()
  if (typeof data?.access !== 'string' || !data.access) {
    throw new Error('The admin token refresh response did not include an access token.')
  }

  const latestSession = getAdminSession()
  if (latestSession?.refresh !== session.refresh) return false
  saveAdminSession({ ...latestSession, access: data.access })
  return true
}

/* ---------------------------------------------------------
   PERMISSIONS
   The server is the authority (every API enforces RBAC).
   These helpers only decide what the UI shows.
--------------------------------------------------------- */

export function getAdminPermissions() {
  return getAdminSession()?.admin?.permissions || null
}

export function hasPermission(module, action = 'view') {
  const permissions = getAdminPermissions()

  return Boolean(permissions?.[module]?.[action])
}

export async function adminLogin(username, password) {
  const response = await fetch(`${API_BASE_URL}/admin/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Admin login failed.')
  }

  saveAdminSession(data)

  return data
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

// Tells the server to blacklist the refresh token and write the audit entry,
// then clears the local session. Never blocks logout if the server is down.
export async function logoutAdminRemote() {
  const session = getAdminSession()

  try {
    if (session?.access) {
      await fetch(`${API_BASE_URL}/admin/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access}`,
        },
        body: JSON.stringify({ refresh: session.refresh }),
      })
    }
  } catch (error) {
    console.error('Admin logout request failed:', error)
  } finally {
    logoutAdmin()
  }
}

export async function getAdminProfile() {
  let token = getAdminToken()

  if (!token) {
    return null
  }

  let response = await fetch(`${API_BASE_URL}/admin/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401 && await refreshAdminAccessToken()) {
    token = getAdminToken()
    response = await fetch(`${API_BASE_URL}/admin/me/`, {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    })
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logoutAdmin()
    }

    throw new Error('Admin session is no longer valid.')
  }

  return response.json()
}

// Re-reads role + permissions from the server so UI visibility follows
// role changes made after login.
export async function refreshAdminSession() {
  const profile = await getAdminProfile()
  const session = getAdminSession()

  if (profile?.admin && session) {
    saveAdminSession({ ...session, admin: profile.admin })
  }

  return profile
}
