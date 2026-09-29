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

export function isAdminAuthenticated() {
  const session = getAdminSession()

  return Boolean(session?.access && session?.admin)
}

export function getAdminToken() {
  const session = getAdminSession()

  return session?.access || null
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

  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify(data)
  )

  return data
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

export async function getAdminProfile() {
  const token = getAdminToken()

  if (!token) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/admin/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      logoutAdmin()
    }

    throw new Error('Admin session is no longer valid.')
  }

  return response.json()
}