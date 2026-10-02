import { getAdminToken, logoutAdmin } from './adminAuth.js'

const API_BASE_URL = "http://127.0.0.1:8000/api";
const ADMIN_API_BASE_URL = `${API_BASE_URL}/admin`;

export async function adminApi(
  path,
  {
    method = 'GET',
    body,
    apiRoot = false,
  } = {},
) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('Admin session is missing. Please log in again.')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiRoot ? API_BASE_URL : ADMIN_API_BASE_URL}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });
  const text = await response.text()

  let data = null

  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === "object") {
      data = parsed;
    }
  } catch {
    // Non-JSON responses (including Django debug pages) are not API errors.
  }

  if (!response.ok) {
    if (response.status === 401) {
      logoutAdmin()
      window.location.hash = '#/admin/login'
      throw new Error('Your admin session has expired. Please log in again.')
    }

    const isServerError = response.status >= 500;
    const message = isServerError
      ? "The admin service is temporarily unavailable. Please try again."
      : [data?.error, data?.detail, data?.message].find(
          (value) => typeof value === "string" && value.trim(),
        ) || `Admin API request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    if (!isServerError) {
      error.data = data;
    }

    throw error
  }

  return data
}

export function updateAdminAccount(data) {
  return adminApi("/me/", { method: "PATCH", body: data });
}

export function getAdminDashboardOverview() {
  return adminApi("/dashboard/overview/?period=7", { apiRoot: true });
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
  return adminApi(`/marketing/promotional-content/${id}/move-up/`, {
    method: "POST",
  });
}

export function movePromotionalContentDown(id) {
  return adminApi(`/marketing/promotional-content/${id}/move-down/`, {
    method: "POST",
  });
}

export async function getAdminUsers() {
  const pageSize = 100;
  const firstPage = await adminApi(`/users/?page=1&page_size=${pageSize}`);
  const firstResults = Array.isArray(firstPage?.results)
    ? firstPage.results
    : Array.isArray(firstPage)
      ? firstPage
      : [];
  const total = Math.max(Number(firstPage?.total) || 0, firstResults.length);
  const pageCount = Math.ceil(total / pageSize);
  const users = [...firstResults];

  for (let page = 2; page <= pageCount; page += 1) {
    const result = await adminApi(`/users/?page=${page}&page_size=${pageSize}`);
    if (Array.isArray(result?.results)) users.push(...result.results);
  }

  return users;
}

export async function getAdminDoctors() {
  const response = await adminApi("/doctors/");
  return response.results || [];
}

export function updateAdminDoctor(id, data) {
  return adminApi(`/doctors/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAdminDoctor(id) {
  return adminApi(`/doctors/${encodeURIComponent(id)}/`, { method: "DELETE" });
}

export function setAdminDoctorStatus(id, action, reason = "") {
  return adminApi(`/doctors/${encodeURIComponent(id)}/status/${action}/`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function createAdminUser(data) {
  return adminApi("/users/", { method: "POST", body: data });
}

export function updateAdminUser(id, data) {
  return adminApi(`/users/${id}/`, { method: "PATCH", body: data });
}

export function deleteAdminUser(id) {
  return adminApi(`/users/${id}/`, { method: "DELETE" });
}

export function setAdminUserStatus(id, action, reason = "") {
  return adminApi(`/users/${id}/status/${action}/`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function creditAdminWallet(id, amount, reason) {
  return adminApi(`/users/${id}/wallet/credit/`, {
    method: "POST",
    body: { amount, reason },
  });
}

export function debitAdminWallet(id, amount, reason) {
  return adminApi(`/users/${id}/wallet/debit/`, {
    method: "POST",
    body: { amount, reason },
  });
}

export function saveAdminRelationship(id, kind, data) {
  return adminApi(`/users/${id}/${kind}/`, { method: "POST", body: data });
}

export function updateAdminRelationship(id, kind, itemId, data) {
  return adminApi(`/users/${id}/${kind}/${itemId}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAdminRelationship(id, kind, itemId) {
  return adminApi(`/users/${id}/${kind}/${itemId}/`, { method: "DELETE" });
}

function queryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export function getAdminStaff(params = {}) {
  return adminApi(`/staff/${queryString(params)}`);
}

export function createAdminStaff(data) {
  return adminApi("/staff/", { method: "POST", body: data });
}

export function updateAdminStaff(id, data) {
  return adminApi(`/staff/${id}/`, { method: "PATCH", body: data });
}

export function setAdminStaffActive(id, active) {
  return adminApi(`/staff/${id}/${active ? "activate" : "deactivate"}/`, {
    method: "POST",
  });
}

export function resetAdminStaffPassword(id, newPassword) {
  return adminApi(`/staff/${id}/reset-password/`, {
    method: "POST",
    body: { new_password: newPassword },
  });
}

export function getAdminRoles() {
  return adminApi("/roles/");
}

export function createAdminRole(data) {
  return adminApi("/roles/", { method: "POST", body: data });
}

export function updateAdminRole(id, data) {
  return adminApi(`/roles/${id}/`, { method: "PATCH", body: data });
}

export function deleteAdminRole(id) {
  return adminApi(`/roles/${id}/`, { method: "DELETE" });
}

export function updateAdminRolePermissions(id, permissions) {
  return adminApi(`/roles/${id}/permissions/`, {
    method: "PUT",
    body: { permissions },
  });
}

export function getAdminModules() {
  return adminApi("/modules/");
}

export async function getHealthcareProviders(params = {}) {
  const response = await adminApi(`/providers/${queryString(params)}`);
  return Array.isArray(response?.results) ? response.results : response;
}

export function getHealthcareProvider(id) {
  return adminApi(`/providers/${encodeURIComponent(id)}/`);
}

export function createHealthcareProvider(data) {
  return adminApi("/providers/", { method: "POST", body: data });
}

export function updateHealthcareProvider(id, data) {
  return adminApi(`/providers/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteHealthcareProvider(id) {
  return adminApi(`/providers/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}

export function runHealthcareProviderAction(id, action, body = {}) {
  return adminApi(`/providers/${encodeURIComponent(id)}/${action}/`, {
    method: "POST",
    body,
  });
}

export function uploadHealthcareProviderDocument(providerId, data) {
  return adminApi(
    `/providers/${encodeURIComponent(providerId)}/documents/`,
    { method: "POST", body: data },
  );
}

export function reviewHealthcareProviderDocument(providerId, documentId, data) {
  return adminApi(
    `/providers/${encodeURIComponent(providerId)}/documents/${encodeURIComponent(documentId)}/`,
    { method: "PATCH", body: data },
  );
}

export function deleteHealthcareProviderDocument(providerId, documentId) {
  return adminApi(
    `/providers/${encodeURIComponent(providerId)}/documents/${encodeURIComponent(documentId)}/`,
    { method: "DELETE" },
  );
}

export async function downloadHealthcareProviderDocument(documentId) {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session is missing. Please log in again.");
  const response = await fetch(
    `${ADMIN_API_BASE_URL}/providers/documents/${encodeURIComponent(documentId)}/file/`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    if (response.status === 401) {
      logoutAdmin();
      window.location.hash = "#/admin/login";
      throw new Error("Your admin session has expired. Please log in again.");
    }
    throw new Error(`Unable to download document (${response.status}).`);
  }
  return response.blob();
}

export async function getPromotions(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();

  const result = await adminApi(
    `/marketing/promotions/${queryString ? `?${queryString}` : ""}`,
  );

  return Array.isArray(result) ? result : result?.results || [];
}

export function createPromotion(data) {
  return adminApi("/marketing/promotions/", { method: "POST", body: data });
}

export function updatePromotion(id, data) {
  return adminApi(`/marketing/promotions/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deletePromotion(id) {
  return adminApi(`/marketing/promotions/${id}/`, { method: "DELETE" });
}