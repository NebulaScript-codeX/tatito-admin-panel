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
    `${ADMIN_API_BASE_URL}/marketing/coupons/`,
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

export function getFeaturedPromotions(params = {}) {
  const query = new URLSearchParams(params)
  const queryString = query.toString()

  return adminApi(
    `/marketing/featured-promotions/${queryString ? `?${queryString}` : ''}`
  )
}

export function createFeaturedPromotion(data) {
  return adminApi(
    '/marketing/featured-promotions/',
    {
      method: 'POST',
      body: data,
    }
  )
}

export function updateFeaturedPromotion(id, data) {
  return adminApi(
    `/marketing/featured-promotions/${id}/`,
    {
      method: 'PATCH',
      body: data,
    }
  )
}

export function deleteFeaturedPromotion(id) {
  return adminApi(
    `/marketing/featured-promotions/${id}/`,
    {
      method: 'DELETE',
    }
  )
}

export function toggleFeaturedPromotionStatus(id) {
  return adminApi(
    `/marketing/featured-promotions/${id}/toggle-status/`,
    {
      method: 'POST',
    }
  )
}

export function moveFeaturedPromotionUp(id) {
  return adminApi(
    `/marketing/featured-promotions/${id}/move-up/`,
    {
      method: 'POST',
    }
  )
}

export function moveFeaturedPromotionDown(id) {
  return adminApi(
    `/marketing/featured-promotions/${id}/move-down/`,
    {
      method: 'POST',
    }
  )
}

export function getPromotionalContent(params = {}) {
  const query = new URLSearchParams(params)
  const queryString = query.toString()

  return adminApi(
    `/marketing/promotional-content/${queryString ? `?${queryString}` : ''}`
  )
}

export function createPromotionalContent(data) {
  return adminApi(
    '/marketing/promotional-content/',
    {
      method: 'POST',
      body: data,
    }
  )
}

export function updatePromotionalContent(id, data) {
  return adminApi(
    `/marketing/promotional-content/${id}/`,
    {
      method: 'PATCH',
      body: data,
    }
  )
}

export function deletePromotionalContent(id) {
  return adminApi(
    `/marketing/promotional-content/${id}/`,
    {
      method: 'DELETE',
    }
  )
}

export function togglePromotionalContentStatus(id) {
  return adminApi(
    `/marketing/promotional-content/${id}/toggle-status/`,
    {
      method: 'POST',
    }
  )
}

export function movePromotionalContentUp(id) {
  return adminApi(
    `/marketing/promotional-content/${id}/move-up/`,
    {
      method: 'POST',
    }
  )
}

export function movePromotionalContentDown(id) {
  return adminApi(
    `/marketing/promotional-content/${id}/move-down/`,
    {
      method: 'POST',
    }
  )
}