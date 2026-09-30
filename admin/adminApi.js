import { getAdminToken, logoutAdmin } from './adminAuth.js'

const ADMIN_API_BASE_URL = 'http://127.0.0.1:8000/api/admin'

export async function adminApi(
  path,
  {
    method = 'GET',
    body,
  } = {},
) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('Admin session is missing. Please log in again.')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(
    `${ADMIN_API_BASE_URL}${path}`,
    {
      method,
      headers,
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined,
    },
  )

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    if (response.status === 401) {
      logoutAdmin()
      window.location.hash = '#/admin/login'
      throw new Error('Your admin session has expired. Please log in again.')
    }

    const message =
      data?.error ||
      data?.detail ||
      data?.message ||
      `Admin API request failed (${response.status})`

    const error = new Error(message)
    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

export function getCoupons(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()

  return adminApi(
    `/marketing/coupons/${queryString ? `?${queryString}` : ''}`,
  )
}


export function updateCoupon(id, data) {
  return adminApi(`/marketing/coupons/${id}/`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteCoupon(id) {
  return adminApi(`/marketing/coupons/${id}/`, {
    method: 'DELETE',
  })
}

export function toggleCouponStatus(id) {
  return adminApi(
    `/marketing/coupons/${id}/toggle-status/`,
    {
      method: 'POST',
    },
  )
}

export function getCouponUsage(id) {
  return adminApi(
    `/marketing/coupons/${id}/usage/`,
  )
}

export async function createCoupon(data) {
  const token = getAdminToken()

  const response = await fetch(
    `${API_BASE_URL}/admin/marketing/coupons/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    const message =
      result?.detail ||
      result?.error ||
      Object.values(result || {})
        .flat()
        .join(' ') ||
      'Unable to create coupon.'

    throw new Error(message)
  }

  return result
}