const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:5000/api'
const HEALTH_PLANS_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_HEALTH_PLANS_API_URL) ||
  'http://127.0.0.1:8000/api/health-plans/'
export const HEALTH_PLANS_API_URL = HEALTH_PLANS_API_BASE.endsWith('/')
  ? HEALTH_PLANS_API_BASE
  : `${HEALTH_PLANS_API_BASE}/`

let cachedToken = null

export function setApiToken(token) {
  cachedToken = token || null
}

export function getApiToken() {
  return cachedToken
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  const tkn = token || cachedToken
  if (tkn) headers.Authorization = `Bearer ${tkn}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(
      (data && (data.error || data.detail)) || `Backend request failed (${res.status})`,
    )
    err.status = res.status
    throw err
  }
  return data
}

const auth = (path, payload) =>
  api(path, { method: 'POST', body: payload })

export const login = (email, password) => auth('/auth/login', { email, password })
export const register = (payload) => auth('/auth/register', payload)
export const me = (token) => api('/auth/me', { token })
export const getDoctors = (token) => api('/doctors', { token })
export const getDoctor = (id, token) => api(`/doctors/${id}`, { token })
export const updateDoctor = (id, data, token) =>
  api(`/doctors/${id}`, { method: 'PATCH', body: data, token })
export const deleteDoctor = (id, token) =>
  api(`/doctors/${id}`, { method: 'DELETE', token })
export const getReviews = (id) => api(`/doctors/${id}/reviews`)
export const getDoctorAvailability = (id, date) =>
  api(`/doctors/${encodeURIComponent(id)}/availability?date=${encodeURIComponent(date)}`)
export const createDoctorAppointment = (id, payload, token) =>
  api(`/doctors/${encodeURIComponent(id)}/appointments`, {
    method: 'POST',
    body: payload,
    token,
  })
export const getMyDoctorAppointments = (token) =>
  api('/doctors/appointments/me', { token })
export const getMyDoctorPayments = (token) =>
  api('/doctors/payments/me', { token })
export const getMyHealthPlanSubscriptions = (token) =>
  api(`${HEALTH_PLANS_API_URL}my-subscriptions/`, { token })
export const addMyHealthPlanFamilyMember = (subscriptionId, payload, token) =>
  api(`${HEALTH_PLANS_API_URL}my-subscriptions/${encodeURIComponent(subscriptionId)}/family/`, {
    method: 'POST',
    body: payload,
    token,
  })
export const updateMyHealthPlanFamilyMember = (subscriptionId, memberId, payload, token) =>
  api(`${HEALTH_PLANS_API_URL}my-subscriptions/${encodeURIComponent(subscriptionId)}/family/${encodeURIComponent(memberId)}/`, {
    method: 'PATCH',
    body: payload,
    token,
  })
export const removeMyHealthPlanFamilyMember = (subscriptionId, memberId, token) =>
  api(`${HEALTH_PLANS_API_URL}my-subscriptions/${encodeURIComponent(subscriptionId)}/family/${encodeURIComponent(memberId)}/`, {
    method: 'DELETE',
    token,
  })
export const getPublicHealthPlans = (token) =>
  api(HEALTH_PLANS_API_URL, { token })
export const createReview = (id, payload, token) =>
  api(`/doctors/${id}/reviews`, { method: 'POST', body: payload, token })