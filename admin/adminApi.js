import {
  getAdminToken,
  logoutAdmin,
  refreshAdminAccessToken,
} from './adminAuth.js'

const API_BASE_URL = "http://127.0.0.1:8000/api";
const ADMIN_API_BASE_URL = `${API_BASE_URL}/admin`;

let cachedHealthRecordCounts = null;
let healthRecordCountsRequest = null;

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

  const url = `${apiRoot ? API_BASE_URL : ADMIN_API_BASE_URL}${path}`
  let response = await fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });
  if (response.status === 401 && await refreshAdminAccessToken()) {
    response = await fetch(url, {
      method,
      headers: {
        ...headers,
        Authorization: 'Bearer ' + getAdminToken(),
      },
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
  }
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

function careQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

export function getCareCollection(resource, params = {}) {
  return adminApi(`/care/${resource}/${careQuery(params)}`);
}

export function createCareRecord(resource, data) {
  return adminApi(`/care/${resource}/`, { method: "POST", body: data });
}

export function getCareRecord(resource, id) {
  return adminApi(`/care/${resource}/${encodeURIComponent(id)}/`);
}

export function updateCareRecord(resource, id, data) {
  return adminApi(`/care/${resource}/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteCareRecord(resource, id) {
  return adminApi(`/care/${resource}/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}

export function runCareAction(resource, id, action, data = {}) {
  return adminApi(
    `/care/${resource}/${encodeURIComponent(id)}/action/${action}/`,
    { method: "POST", body: data },
  );
}

function healthRecordsQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

export function getHealthRecordPatients(search = "") {
  return adminApi(
    `/health-records/patients/${healthRecordsQuery({ search })}`,
  );
}

export function getHealthRecordCounts(patientId = "") {
  if (patientId) {
    return adminApi(
      `/health-records/counts/${healthRecordsQuery({ patient_id: patientId })}`,
    ).then((response) => response.counts);
  }
  if (cachedHealthRecordCounts) {
    return Promise.resolve(cachedHealthRecordCounts);
  }
  if (!healthRecordCountsRequest) {
    healthRecordCountsRequest = adminApi("/health-records/counts/")
      .then((response) => {
        cachedHealthRecordCounts = response.counts;
        window.dispatchEvent(new CustomEvent(
          "thp-health-record-counts-updated",
          { detail: cachedHealthRecordCounts },
        ));
        return cachedHealthRecordCounts;
      })
      .finally(() => {
        healthRecordCountsRequest = null;
      });
  }
  return healthRecordCountsRequest;
}

export function getCachedHealthRecordCounts() {
  return cachedHealthRecordCounts;
}

export function refreshHealthRecordCounts() {
  cachedHealthRecordCounts = null;
  return getHealthRecordCounts();
}

export function getHealthRecordPatient(id) {
  return adminApi(`/health-records/patients/${encodeURIComponent(id)}/`);
}

export function getHealthRecordCollection(resource, patientId) {
  return adminApi(
    `/health-records/${resource}/${healthRecordsQuery({ patient_id: patientId })}`,
  );
}

export function getHealthRecordAccessLog(patientId) {
  return adminApi(
    `/health-records/patients/${encodeURIComponent(patientId)}/access-log/`,
  );
}

export function createHealthRecord(resource, data) {
  return adminApi(`/health-records/${resource}/`, {
    method: "POST",
    body: data,
  });
}

export function updateHealthRecord(resource, id, data) {
  return adminApi(
    `/health-records/${resource}/${encodeURIComponent(id)}/`,
    { method: "PATCH", body: data },
  );
}

export function deleteHealthRecord(resource, id) {
  return adminApi(
    `/health-records/${resource}/${encodeURIComponent(id)}/`,
    { method: "DELETE" },
  );
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

// ============================================================
// MODULE 12 — CONTENT APIs
// MODULE 12 ΓÇö CONTENT APIs
// ============================================================

function contentQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}


// --------------------
// Blog Categories
// --------------------

export function getContentBlogCategories(params = {}) {
  return adminApi(
    `/content/blog-categories/${contentQueryString(params)}`
  );
}

export function createContentBlogCategory(data) {
  return adminApi("/content/blog-categories/", {
    method: "POST",
    body: data,
  });
}

export function updateContentBlogCategory(id, data) {
  return adminApi(`/content/blog-categories/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentBlogCategory(id) {
  return adminApi(`/content/blog-categories/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Blog Tags
// --------------------

export function getContentBlogTags(params = {}) {
  return adminApi(
    `/content/blog-tags/${contentQueryString(params)}`
  );
}

export function createContentBlogTag(data) {
  return adminApi("/content/blog-tags/", {
    method: "POST",
    body: data,
  });
}

export function updateContentBlogTag(id, data) {
  return adminApi(`/content/blog-tags/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentBlogTag(id) {
  return adminApi(`/content/blog-tags/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Blogs
// --------------------

export function getContentBlogs(params = {}) {
  return adminApi(
    `/content/blogs/${contentQueryString(params)}`
  );
}

export function createContentBlog(data) {
  return adminApi("/content/blogs/", {
    method: "POST",
    body: data,
  });
}

export function updateContentBlog(id, data) {
  return adminApi(`/content/blogs/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentBlog(id) {
  return adminApi(`/content/blogs/${id}/`, {
    method: "DELETE",
  });
}

export function publishContentBlog(id) {
  return adminApi(`/content/blogs/${id}/publish/`, {
    method: "POST",
  });
}

export function unpublishContentBlog(id) {
  return adminApi(`/content/blogs/${id}/unpublish/`, {
    method: "POST",
  });
}


// --------------------
// Homepage Banners
// --------------------

export function getContentHomepageBanners(params = {}) {
  return adminApi(
    `/content/homepage-banners/${contentQueryString(params)}`
  );
}

export function createContentHomepageBanner(data) {
  return adminApi("/content/homepage-banners/", {
    method: "POST",
    body: data,
  });
}

export function updateContentHomepageBanner(id, data) {
  return adminApi(`/content/homepage-banners/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentHomepageBanner(id) {
  return adminApi(`/content/homepage-banners/${id}/`, {
    method: "DELETE",
  });
}

export function toggleContentHomepageBannerStatus(id) {
  return adminApi(`/content/homepage-banners/${id}/toggle-status/`, {
    method: "POST",
  });
}

export function moveContentHomepageBannerUp(id) {
  return adminApi(`/content/homepage-banners/${id}/move-up/`, {
    method: "POST",
  });
}

export function moveContentHomepageBannerDown(id) {
  return adminApi(`/content/homepage-banners/${id}/move-down/`, {
    method: "POST",
  });
}


// --------------------
// Announcements
// --------------------

export function getContentAnnouncements(params = {}) {
  return adminApi(
    `/content/announcements/${contentQueryString(params)}`
  );
}

export function createContentAnnouncement(data) {
  return adminApi("/content/announcements/", {
    method: "POST",
    body: data,
  });
}

export function updateContentAnnouncement(id, data) {
  return adminApi(`/content/announcements/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentAnnouncement(id) {
  return adminApi(`/content/announcements/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Featured Services
// --------------------

export function getContentFeaturedServices(params = {}) {
  return adminApi(
    `/content/featured-services/${contentQueryString(params)}`
  );
}

export function createContentFeaturedService(data) {
  return adminApi("/content/featured-services/", {
    method: "POST",
    body: data,
  });
}

export function updateContentFeaturedService(id, data) {
  return adminApi(`/content/featured-services/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentFeaturedService(id) {
  return adminApi(`/content/featured-services/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// FAQs
// --------------------

export function getContentFaqs(params = {}) {
  return adminApi(
    `/content/faqs/${contentQueryString(params)}`
  );
}

export function createContentFaq(data) {
  return adminApi("/content/faqs/", {
    method: "POST",
    body: data,
  });
}

export function updateContentFaq(id, data) {
  return adminApi(`/content/faqs/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentFaq(id) {
  return adminApi(`/content/faqs/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Testimonials
// --------------------

export function getContentTestimonials(params = {}) {
  return adminApi(
    `/content/testimonials/${contentQueryString(params)}`
  );
}

export function createContentTestimonial(data) {
  return adminApi("/content/testimonials/", {
    method: "POST",
    body: data,
  });
}

export function updateContentTestimonial(id, data) {
  return adminApi(`/content/testimonials/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentTestimonial(id) {
  return adminApi(`/content/testimonials/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Trust Stats
// --------------------

export function getContentTrustStats(params = {}) {
  return adminApi(
    `/content/trust-stats/${contentQueryString(params)}`
  );
}

export function createContentTrustStat(data) {
  return adminApi("/content/trust-stats/", {
    method: "POST",
    body: data,
  });
}

export function updateContentTrustStat(id, data) {
  return adminApi(`/content/trust-stats/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentTrustStat(id) {
  return adminApi(`/content/trust-stats/${id}/`, {
    method: "DELETE",
  });
}


// --------------------
// Website Pages
// --------------------

export function getContentWebsitePages(params = {}) {
  return adminApi(
    `/content/website-pages/${contentQueryString(params)}`
  );
}

export function createContentWebsitePage(data) {
  return adminApi("/content/website-pages/", {
    method: "POST",
    body: data,
  });
}

export function updateContentWebsitePage(id, data) {
  return adminApi(`/content/website-pages/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentWebsitePage(id) {
  return adminApi(`/content/website-pages/${id}/`, {
    method: "DELETE",
  });
}

export function toggleContentWebsitePagePublished(id) {
  return adminApi(`/content/website-pages/${id}/toggle-published/`, {
    method: "POST",
  });
}


// --------------------
// Cities
// --------------------

export function getContentCities(params = {}) {
  return adminApi(
    `/content/cities/${contentQueryString(params)}`
  );
}

export function createContentCity(data) {
  return adminApi("/content/cities/", {
    method: "POST",
    body: data,
  });
}

export function updateContentCity(id, data) {
  return adminApi(`/content/cities/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContentCity(id) {
  return adminApi(`/content/cities/${id}/`, {
    method: "DELETE",
  });
}

// ============================================================
// MODULE 13 — INTERNSHIPS APIs
// ============================================================

function internshipsQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

// --------------------
// Internship Tracks
// --------------------

export function getInternshipTracks(params = {}) {
  return adminApi(
    `/internships/tracks/${internshipsQueryString(params)}`
  );
}

export function createInternshipTrack(data) {
  return adminApi("/internships/tracks/", {
    method: "POST",
    body: data,
  });
}

export function updateInternshipTrack(id, data) {
  return adminApi(`/internships/tracks/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteInternshipTrack(id) {
  return adminApi(`/internships/tracks/${id}/`, {
    method: "DELETE",
  });
}

export function toggleInternshipTrackPublish(id) {
  return adminApi(`/internships/tracks/${id}/toggle-publish/`, {
    method: "POST",
  });
}

export function toggleInternshipTrackStatus(id) {
  return adminApi(`/internships/tracks/${id}/toggle-status/`, {
    method: "POST",
  });
}

// --------------------
// Internship Applications
// --------------------

export function getInternshipApplications(params = {}) {
  return adminApi(
    `/internships/applications/${internshipsQueryString(params)}`
  );
}

export function createInternshipApplication(data) {
  return adminApi("/internships/applications/", {
    method: "POST",
    body: data,
  });
}

export function updateInternshipApplication(id, data) {
  return adminApi(`/internships/applications/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteInternshipApplication(id) {
  return adminApi(`/internships/applications/${id}/`, {
    method: "DELETE",
  });
}

export function selectInternshipApplication(id) {
  return adminApi(`/internships/applications/${id}/select/`, {
    method: "POST",
  });
}

export function revertInternshipSelection(id) {
  return adminApi(`/internships/applications/${id}/revert-selection/`, {
    method: "POST",
  });
}

export function sendInternshipOffer(id) {
  return adminApi(`/internships/applications/${id}/send-offer/`, {
    method: "POST",
  });
}

// --------------------
// Internship Partners
// --------------------

export function getInternshipPartners(params = {}) {
  return adminApi(
    `/internships/partners/${internshipsQueryString(params)}`
  );
}

export function createInternshipPartner(data) {
  return adminApi("/internships/partners/", {
    method: "POST",
    body: data,
  });
}

export function updateInternshipPartner(id, data) {
  return adminApi(`/internships/partners/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteInternshipPartner(id) {
  return adminApi(`/internships/partners/${id}/`, {
    method: "DELETE",
  });
}

// --------------------
// Internship Alumni
// --------------------

export function getInternshipAlumni(params = {}) {
  return adminApi(
    `/internships/alumni/${internshipsQueryString(params)}`
  );
}

export function createInternshipAlumni(data) {
  return adminApi("/internships/alumni/", {
    method: "POST",
    body: data,
  });
}

export function updateInternshipAlumni(id, data) {
  return adminApi(`/internships/alumni/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteInternshipAlumni(id) {
  return adminApi(`/internships/alumni/${id}/`, {
    method: "DELETE",
  });
}

// ============================================================
// MODULE 14 — SUPPORT & COMMUNICATION APIs
// ============================================================

function supportQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}


// --------------------
// Support Tickets
// --------------------

export function getSupportTickets(params = {}) {
  return adminApi(
    `/support/tickets/${supportQueryString(params)}`
  );
}

export function getSupportTicket(id) {
  return adminApi(`/support/tickets/${id}/`);
}

export function createSupportTicket(data) {
  return adminApi("/support/tickets/", {
    method: "POST",
    body: data,
  });
}

export function updateSupportTicket(id, data) {
  return adminApi(`/support/tickets/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteSupportTicket(id) {
  return adminApi(`/support/tickets/${id}/`, {
    method: "DELETE",
  });
}

export function assignSupportTicket(id, assignee) {
  return adminApi(`/support/tickets/${id}/assign/`, {
    method: "POST",
    body: { assignee },
  });
}

export function replySupportTicket(id, message) {
  return adminApi(`/support/tickets/${id}/reply/`, {
    method: "POST",
    body: { message },
  });
}

export function addSupportTicketInternalNote(id, message) {
  return adminApi(`/support/tickets/${id}/internal-note/`, {
    method: "POST",
    body: { message },
  });
}

export function closeSupportTicket(id) {
  return adminApi(`/support/tickets/${id}/close/`, {
    method: "POST",
  });
}

export function getAIAssistantSettings(assistantType = "") {
  const query = assistantType
    ? `?assistant_type=${encodeURIComponent(assistantType)}`
    : "";

  return adminApi(`/ai-assistant/settings/${query}`);
}

// AI Assistant

export function updateAIAssistantSettings(id, data) {
  return adminApi(`/ai-assistant/settings/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function getAISuggestedChips(params = {}) {
  return adminApi(
    `/ai-assistant/chips/${supportQueryString(params)}`
  );
}

export function createAISuggestedChip(data) {
  return adminApi("/ai-assistant/chips/", {
    method: "POST",
    body: data,
  });
}

export function updateAISuggestedChip(id, data) {
  return adminApi(`/ai-assistant/chips/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAISuggestedChip(id) {
  return adminApi(`/ai-assistant/chips/${id}/`, {
    method: "DELETE",
  });
}

export function getAIQueryLogs(params = {}) {
  return adminApi(
    `/ai-assistant/query-logs/${supportQueryString(params)}`
  );
}

export function sendAIQueryToDoctor(id) {
  return adminApi(
    `/ai-assistant/query-logs/${id}/send-to-doctor/`,
    {
      method: "POST",
    }
  );
}

export function getAISafetyRules(params = {}) {
  return adminApi(
    `/ai-assistant/safety-rules/${supportQueryString(params)}`
  );
}

export function createAISafetyRule(data) {
  return adminApi("/ai-assistant/safety-rules/", {
    method: "POST",
    body: data,
  });
}

export function updateAISafetyRule(id, data) {
  return adminApi(`/ai-assistant/safety-rules/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAISafetyRule(id) {
  return adminApi(`/ai-assistant/safety-rules/${id}/`, {
    method: "DELETE",
  });
}

export function testAIAssistantQuery(query) {
  return adminApi("/ai-assistant/safety-rules/test/", {
    method: "POST",
    body: { query },
  });
}

// --------------------
// Contact Queries
// --------------------

export function getContactQueries(params = {}) {
  return adminApi(
    `/support/contact-queries/${supportQueryString(params)}`
  );
}

export function createContactQuery(data) {
  return adminApi("/support/contact-queries/", {
    method: "POST",
    body: data,
  });
}

export function updateContactQuery(id, data) {
  return adminApi(`/support/contact-queries/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteContactQuery(id) {
  return adminApi(`/support/contact-queries/${id}/`, {
    method: "DELETE",
  });
}

export function markContactQueryRead(id) {
  return adminApi(`/support/contact-queries/${id}/mark-read/`, {
    method: "POST",
  });
}

export function replyContactQuery(id) {
  return adminApi(`/support/contact-queries/${id}/reply/`, {
    method: "POST",
  });
}


// --------------------
// Emergency Requests
// --------------------

export function getEmergencyRequests(params = {}) {
  return adminApi(
    `/support/emergency-requests/${supportQueryString(params)}`
  );
}

export function createEmergencyRequest(data) {
  return adminApi("/support/emergency-requests/", {
    method: "POST",
    body: data,
  });
}

export function updateEmergencyRequest(id, data) {
  return adminApi(`/support/emergency-requests/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteEmergencyRequest(id) {
  return adminApi(`/support/emergency-requests/${id}/`, {
    method: "DELETE",
  });
}

export function assignEmergencyRequest(id, assignedStaff) {
  return adminApi(`/support/emergency-requests/${id}/assign/`, {
    method: "POST",
    body: { assigned_staff: assignedStaff },
  });
}

export function markEmergencyRequestHandled(id) {
  return adminApi(`/support/emergency-requests/${id}/mark-handled/`, {
    method: "POST",
  });
}


// --------------------
// Notification Templates
// --------------------

export function getNotificationTemplates(params = {}) {
  return adminApi(
    `/support/notification-templates/${supportQueryString(params)}`
  );
}

export function createNotificationTemplate(data) {
  return adminApi("/support/notification-templates/", {
    method: "POST",
    body: data,
  });
}

export function updateNotificationTemplate(id, data) {
  return adminApi(`/support/notification-templates/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteNotificationTemplate(id) {
  return adminApi(`/support/notification-templates/${id}/`, {
    method: "DELETE",
  });
}

export function sendNotificationTemplateTest(id, data = {}) {
  return adminApi(`/support/notification-templates/${id}/send-test/`, {
    method: "POST",
    body: data,
  });
}


// --------------------
// Notifications
// --------------------

export function getAdminNotifications(params = {}) {
  return adminApi(
    `/support/notifications/${supportQueryString(params)}`
  );
}

export function createAdminNotification(data) {
  return adminApi("/support/notifications/", {
    method: "POST",
    body: data,
  });
}

export function updateAdminNotification(id, data) {
  return adminApi(`/support/notifications/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAdminNotification(id) {
  return adminApi(`/support/notifications/${id}/`, {
    method: "DELETE",
  });
}


export async function getAdminReports(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return adminApi(`/reports/${suffix}`);
}

export async function getAuditLogs(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return adminApi(`/audit-logs/${suffix}`);
}

export async function getAdminUploadedDocuments(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  return adminApi(
    `/uploaded-files/documents/${
      queryString ? `?${queryString}` : ""
    }`
  );
}

export async function reviewAdminUploadedDocument(
  documentId,
  status,
  rejectionReason = ""
) {
  return adminApi(
    `/uploaded-files/documents/${documentId}/review/`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        rejection_reason: rejectionReason,
      }),
    }
  );
}

export async function getAdminMediaFiles(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  return adminApi(
    `/uploaded-files/media/${
      queryString ? `?${queryString}` : ""
    }`
  );
}

export async function uploadAdminMediaFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return adminApi("/uploaded-files/media/", {
    method: "POST",
    body: formData,
  });
}

export async function renameAdminMediaFile(mediaId, originalName) {
  return adminApi(`/uploaded-files/media/${mediaId}/`, {
    method: "PATCH",
    body: {
      original_name: originalName,
    },
  });
}

export async function deleteAdminMediaFile(mediaId) {
  return adminApi(`/uploaded-files/media/${mediaId}/`, {
    method: "DELETE",
  });
}

// Module 18 — Settings & Security

export function getAdminSettings() {
  return adminApi("/settings/");
}

export function updateAdminSettings(data) {
  return adminApi("/settings/", {
    method: "PATCH",
    body: data,
  });
}

export function updateSystemNotificationSetting(id, data) {
  return adminApi(`/settings/notifications/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function updateAddonSetting(id, data) {
  return adminApi(`/settings/addons/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function exportSettingsBackup() {
  return adminApi("/settings/backup/export/");
}

export function importSettingsBackup(data) {
  return adminApi("/settings/backup/import/", {
    method: "POST",
    body: data,
  });
}