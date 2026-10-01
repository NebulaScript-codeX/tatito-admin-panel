import { getAdminToken, logoutAdmin } from "./adminAuth.js";

const ADMIN_API_BASE_URL = "http://127.0.0.1:8000/api/admin";

export async function adminApi(path, { method = "GET", body } = {}) {
  const token = getAdminToken();

  if (!token) {
    throw new Error("Admin session is missing. Please log in again.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401) {
      logoutAdmin();
      window.location.hash = "#/admin/login";
      throw new Error("Your admin session has expired. Please log in again.");
    }

    const message =
      data?.error ||
      data?.detail ||
      data?.message ||
      `Admin API request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
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

export function getCoupons(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  return adminApi(`/marketing/coupons/${queryString ? `?${queryString}` : ""}`);
}

export function updateCoupon(id, data) {
  return adminApi(`/marketing/coupons/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteCoupon(id) {
  return adminApi(`/marketing/coupons/${id}/`, {
    method: "DELETE",
  });
}

export function toggleCouponStatus(id) {
  return adminApi(`/marketing/coupons/${id}/toggle-status/`, {
    method: "POST",
  });
}

export function getCouponUsage(id) {
  return adminApi(`/marketing/coupons/${id}/usage/`);
}

export async function createCoupon(data) {
  const token = getAdminToken();

  const response = await fetch(`${API_BASE_URL}/admin/marketing/coupons/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    const message =
      result?.detail ||
      result?.error ||
      Object.values(result || {})
        .flat()
        .join(" ") ||
      "Unable to create coupon.";

    throw new Error(message);
  }

  return result;
}
