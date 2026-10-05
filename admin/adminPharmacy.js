import {
  getAdminFile,
  pharmacyRequest,
} from "./adminApi.js";
import {
  hasPermission,
  isAdminAuthenticated,
  refreshAdminSession,
} from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";
import { renderAdminLayout } from "./adminLayout.js";
import { formatINR } from "../currency.js";

const tabs = [
  ["products", "Products"],
  ["orders", "Orders"],
  ["prescriptions", "Prescriptions"],
  ["batches", "Batches & Inventory"],
  ["delivery", "Delivery Dispatch"],
  ["categories", "Categories"],
  ["brands", "Brands"],
];

const apiCollections = {
  products: "products/",
  orders: "orders/",
  prescriptions: "prescriptions/",
  batches: "batches/",
  categories: "categories/",
  brands: "brands/",
};

const state = {
  app: null,
  activeTab: "products",
  summary: null,
  meta: { patients: [], pharmacies: [], partners: [], coupons: [], products: [] },
  records: {},
  loading: false,
  search: "",
  filters: { category: "", brand: "", status: "", stock_status: "" },
  error: "",
  modal: null,
  searchTimer: null,
  events: null,
};

const money = formatINR;

function displayDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function statusLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(value) {
  if (["active", "approved", "in_stock", "normal", "verified", "packed", "dispatched", "delivered", "resolved", "paid", "assigned"].includes(value)) {
    return "is-good";
  }
  if (["pending", "low_stock", "near_expiry", "placed", "out_for_delivery", "refund_pending"].includes(value)) {
    return "is-warning";
  }
  if (["inactive", "rejected", "out_of_stock", "expired", "cancelled", "failed"].includes(value)) {
    return "is-danger";
  }
  return "is-neutral";
}

function badge(value) {
  return `<span class="thp-pharmacy-badge ${statusClass(value)}">${escapeHtml(statusLabel(value))}</span>`;
}

function actionButton(action, label, id, secondary = false, disabled = false) {
  return `<button type="button" class="${secondary ? "thp-admin-secondary-button" : "thp-admin-primary-button"} thp-pharmacy-button" data-pharmacy-action="${action}" data-id="${escapeHtml(id)}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
}

function iconActionButton(action, label, id, iconPath, disabled = false) {
  const danger = action.startsWith("delete-");
  return `<button type="button" class="thp-pharmacy-icon-button${danger ? " is-danger" : ""}" data-pharmacy-action="${action}" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${disabled ? "disabled" : ""}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPath}</svg>
  </button>`;
}

const viewIcon = '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>';
const editIcon = '<path d="m15 5 4 4"/><path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z"/>';
const deleteIcon = '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5m4-5v5"/>';

function emptyState(message) {
  return `<div class="thp-pharmacy-empty" role="status">${escapeHtml(message)}</div>`;
}

function table(headers, rows, minimumWidth = 760, className = "") {
  return `
    <div class="thp-admin-table-wrapper thp-pharmacy-table-wrap ${className}">
      <table class="thp-admin-table thp-pharmacy-table" style="--pharmacy-table-min:${minimumWidth}px">
        <thead><tr>${headers.map((item) => `<th scope="col">${item}</th>`).join("")}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${headers.length}">${emptyState("No matching records found.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) params.set(key, value);
  });
  return params.size ? `?${params.toString()}` : "";
}

function searchFilterToolbar(placeholder, filters = "") {
  return `
    <div class="thp-pharmacy-toolbar">
      <label class="thp-pharmacy-search">
        <span class="thp-admin-sr-only">Search ${escapeHtml(state.activeTab)}</span>
        <input type="search" data-pharmacy-search value="${escapeHtml(state.search)}" placeholder="${escapeHtml(placeholder)}" />
      </label>
      ${filters}
    </div>
  `;
}

function sectionActions(actions) {
  return actions ? `<div class="thp-pharmacy-heading-actions">${actions}</div>` : "";
}

function categoryOptions(selected = "") {
  return (state.meta.categories || [])
    .map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");
}

function brandOptions(selected = "") {
  return (state.meta.brands || [])
    .map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");
}

function patientOptions(selected = "") {
  return (state.meta.patients || [])
    .map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");
}

function productOptions(selected = "") {
  return (state.meta.products || [])
    .map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escapeHtml(item.name)} · ${money(item.selling_price)}${item.rx_required ? " · Rx" : ""}</option>`)
    .join("");
}

function filtersForProducts() {
  return `
    <select aria-label="Filter by category" data-pharmacy-filter="category">
      <option value="">All categories</option>${categoryOptions(state.filters.category)}
    </select>
    <select aria-label="Filter by brand" data-pharmacy-filter="brand">
      <option value="">All brands</option>${brandOptions(state.filters.brand)}
    </select>
    <select aria-label="Filter by stock status" data-pharmacy-filter="stock_status">
      <option value="">All stock</option>
      ${["in_stock", "low_stock", "out_of_stock"].map((value) => `<option value="${value}" ${state.filters.stock_status === value ? "selected" : ""}>${statusLabel(value)}</option>`).join("")}
    </select>
  `;
}

function renderProducts() {
  const rows = (state.records.products || []).map((product) => `
    <tr>
      <td><div class="thp-pharmacy-product-cell">
        ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="" loading="lazy" />` : '<span class="thp-pharmacy-product-placeholder" aria-hidden="true">Rx</span>'}
        <div><strong>${escapeHtml(product.name)}</strong><small>${product.rx_required ? "Prescription required" : "Non-prescription"}</small></div>
      </div></td>
      <td>${escapeHtml(product.brand_name)}<small>${escapeHtml(product.category_name)}</small></td>
      <td>${escapeHtml(product.pack_size)}</td>
      <td><strong>${money(product.selling_price)}</strong><small><s>${money(product.mrp)}</s> · ${escapeHtml(product.discount_percent)}% off</small></td>
      <td>${escapeHtml(product.stock)} units ${badge(product.stock_status)}</td>
      <td>${badge(product.is_active ? "active" : "inactive")}</td>
      <td class="thp-pharmacy-row-actions">
        <div class="thp-pharmacy-icon-actions">
          ${iconActionButton("view-product", "View", product.id, viewIcon)}
          ${hasPermission("pharmacy", "edit") ? iconActionButton("edit-product", "Edit", product.id, editIcon) : ""}
          ${hasPermission("pharmacy", "delete") ? iconActionButton("delete-product", "Delete", product.id, deleteIcon) : ""}
        </div>
        ${hasPermission("pharmacy", "edit") ? actionButton("toggle-product", product.is_active ? "Deactivate" : "Activate", product.id, true) : ""}
      </td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading">
        <div><h2>Medication &amp; Health Catalog</h2><p>Products, pricing, partner pharmacy and live batch stock.</p></div>
        ${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-product", "Add Product", "") : ""}${actionButton("export", "Export CSV", "products", true, !(state.records.products || []).length)}`)}
      </header>
      ${searchFilterToolbar("Search products by name, brand or category...", filtersForProducts())}
      ${state.loading ? emptyState("Loading products…") : table(["Product", "Brand / Category", "Pack size", "Price", "Available stock", "Status", "Actions"], rows, 1050, "thp-pharmacy-products-scroll")}
    </section>
  `;
}

function renderOrders() {
  const rows = (state.records.orders || []).map((order) => {
    const nextAction = {
      placed: ["verify-order", "Verify"],
      verified: ["pack-order", "Pack"],
    }[order.status];
    const itemSummary = (order.items || [])
      .map((item) => `${item.quantity} × ${escapeHtml(item.product_name)}`)
      .join("<br>");
    return `
      <tr>
        <td><strong>${escapeHtml(order.order_number)}</strong><small>${displayDate(order.created_at, true)}</small></td>
        <td>${escapeHtml(order.patient_name)}<small>${escapeHtml(order.address)}</small></td>
        <td>${itemSummary || "—"}</td>
        <td><strong>${money(order.total)}</strong><small>${escapeHtml(statusLabel(order.payment_status))} · ${escapeHtml(statusLabel(order.payment_method))}</small></td>
        <td>${badge(order.status)}${order.invoice_number ? `<small>Invoice ${escapeHtml(order.invoice_number)}</small>` : ""}</td>
        <td class="thp-pharmacy-row-actions">
          ${iconActionButton("view-order", "View details", order.id, viewIcon)}
          ${nextAction && hasPermission("pharmacy", "edit") ? actionButton(nextAction[0], nextAction[1], order.id) : ""}
          ${order.status === "packed" ? actionButton("open-delivery", "Delivery", order.id, true) : ""}
          ${!["cancelled", "delivered"].includes(order.status) && hasPermission("pharmacy", "edit") ? actionButton("cancel-order", "Cancel", order.id, true) : ""}
        </td>
      </tr>
    `;
  }).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading">
        <div><h2>Pharmacy Orders</h2><p>Order verification, invoice generation, fulfillment and cancellation.</p></div>
        ${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-order", "Create Order", "") : ""}${actionButton("export", "Export CSV", "orders", true, !(state.records.orders || []).length)}`)}
      </header>
      ${searchFilterToolbar("Search orders by number, patient or address...", `
        <select aria-label="Filter by order status" data-pharmacy-filter="status">
          <option value="">All statuses</option>
          ${["placed", "verified", "packed", "dispatched", "delivered", "cancelled"].map((value) => `<option value="${value}" ${state.filters.status === value ? "selected" : ""}>${statusLabel(value)}</option>`).join("")}
        </select>
      `)}
      ${state.loading ? emptyState("Loading orders…") : table(["Order", "Patient / address", "Products", "Total / payment", "Status / invoice", "Actions"], rows, 1120)}
      <p class="thp-pharmacy-help">Payment status is recorded, but no payment gateway is configured; new orders remain pending until settlement is confirmed.</p>
    </section>
  `;
}

function renderPrescriptions() {
  const rows = (state.records.prescriptions || []).map((rx) => `
    <tr>
      <td><strong>${escapeHtml(rx.prescription_number || `Prescription ${rx.id}`)}</strong><small>${escapeHtml(rx.patient_name)} · ${displayDate(rx.issued_on || rx.created_at)}</small></td>
      <td>${escapeHtml(rx.doctor_name || "—")}<small>${escapeHtml(rx.diagnosis || "")}</small></td>
      <td>${badge(rx.status)}</td>
      <td>${escapeHtml(rx.internal_notes || "—")}</td>
      <td class="thp-pharmacy-row-actions">
        ${rx.file_url ? actionButton("preview-prescription", "Preview", rx.id, true) : rx.pdf_url ? `<a class="thp-admin-secondary-button thp-pharmacy-button" href="${escapeHtml(rx.pdf_url)}" target="_blank" rel="noopener noreferrer">Open URL</a>` : "No file"}
        ${hasPermission("pharmacy", "edit") ? actionButton("edit-prescription-notes", "Internal note", rx.id, true) : ""}
        ${rx.status === "pending" && hasPermission("pharmacy", "edit") ? actionButton("approve-prescription", "Approve", rx.id) : ""}
        ${rx.status === "pending" && hasPermission("pharmacy", "edit") ? actionButton("reject-prescription", "Reject", rx.id, true) : ""}
      </td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading">
        <div><h2>Prescription Review</h2><p>Uploaded patient prescriptions and review history.</p></div>
        ${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-prescription", "Add Prescription", "") : ""}${actionButton("export", "Export CSV", "prescriptions", true, !(state.records.prescriptions || []).length)}`)}
      </header>
      ${searchFilterToolbar("Search by patient, prescription or doctor...", `
        <select aria-label="Filter by prescription status" data-pharmacy-filter="status">
          <option value="">All statuses</option>
          ${["pending", "approved", "rejected"].map((value) => `<option value="${value}" ${state.filters.status === value ? "selected" : ""}>${statusLabel(value)}</option>`).join("")}
        </select>
      `)}
      ${state.loading ? emptyState("Loading prescriptions…") : table(["Prescription / patient", "Prescriber / diagnosis", "Status", "Internal notes", "Actions"], rows, 1000)}
    </section>
  `;
}

function renderBatches() {
  const rows = (state.records.batches || []).map((batch) => `
    <tr>
      <td><strong>${escapeHtml(batch.product_name)}</strong></td>
      <td>${escapeHtml(batch.batch_number)}</td>
      <td>${displayDate(batch.expiry_date)}</td>
      <td>${badge(batch.expiry_status)}</td>
      <td>${escapeHtml(batch.quantity)} units</td>
      <td>${hasPermission("pharmacy", "edit") ? actionButton("adjust-batch", "Adjust stock", batch.id, true) : "—"}</td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading">
        <div><h2>Batch &amp; Inventory</h2><p>Stock by expiry batch; orders consume the earliest unexpired stock.</p></div>
        ${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-batch", "Add Batch", "") : ""}${actionButton("export", "Export CSV", "batches", true, !(state.records.batches || []).length)}`)}
      </header>
      ${searchFilterToolbar("Search by product or batch number...")}
      ${state.loading ? emptyState("Loading inventory…") : table(["Product", "Batch number", "Expiry", "Batch status", "Quantity", "Actions"], rows, 820)}
    </section>
  `;
}

function renderDelivery() {
  const orders = (state.records.delivery || []).filter((order) =>
    ["packed", "dispatched", "delivered"].includes(order.status),
  );
  const rows = orders.map((order) => {
    const delivery = order.delivery;
    const statusControl = delivery?.status === "assigned"
      ? actionButton("delivery-status", "Out for delivery", order.id)
      : delivery?.status === "out_for_delivery"
        ? actionButton("delivery-status", "Mark delivered", order.id)
        : "";
    return `
      <tr>
        <td><strong>${escapeHtml(order.order_number)}</strong><small>${escapeHtml(order.patient_name)}</small></td>
        <td>${escapeHtml(order.address)}</td>
        <td>${delivery ? escapeHtml(delivery.partner_name || "Unassigned") : "Unassigned"}<small>${delivery ? displayDate(delivery.eta, true) : "No ETA set"}</small></td>
        <td>${badge(delivery?.status || order.status)}</td>
        <td class="thp-pharmacy-delivery-actions">
          ${hasPermission("pharmacy", "edit") && order.status === "packed" && delivery?.status !== "out_for_delivery" && delivery?.status !== "delivered" ? `
            <form class="thp-pharmacy-delivery-form" data-pharmacy-delivery="${escapeHtml(order.id)}">
              <select name="partner_id" aria-label="Delivery partner" required>
                <option value="">Assign partner</option>
                ${(state.meta.partners || []).map((partner) => `<option value="${escapeHtml(partner.id)}" ${String(delivery?.partner) === String(partner.id) ? "selected" : ""}>${escapeHtml(partner.name)}</option>`).join("")}
              </select>
              <input name="eta" type="datetime-local" aria-label="Delivery ETA" value="${dateInputValue(delivery?.eta)}" />
              <button class="thp-admin-secondary-button thp-pharmacy-button" type="submit">Save</button>
            </form>
          ` : ""}
          ${statusControl}
        </td>
      </tr>
    `;
  }).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel thp-pharmacy-delivery-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading">
        <div><h2>Delivery Dispatch</h2><p>Assign partners and persist ETA, out-for-delivery and delivery updates.</p></div>
        ${sectionActions(actionButton("export", "Export CSV", "delivery", true, !(state.records.delivery || []).length))}
      </header>
      ${state.loading ? emptyState("Loading dispatches…") : table(["Order / patient", "Delivery address", "Partner / ETA", "Dispatch status", "Actions"], rows, 1100)}
      ${state.meta.partners.length ? "" : `<p class="thp-pharmacy-help">No active delivery partners are in SQL yet. Add a partner account before assigning deliveries.</p>`}
    </section>
  `;
}

function renderCategories() {
  const rows = (state.records.categories || []).map((item) => `
    <tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.description || "—")}</td><td>${escapeHtml(item.product_count ?? 0)}</td>
      <td class="thp-pharmacy-row-actions">
      <div class="thp-pharmacy-icon-actions">
        ${hasPermission("pharmacy", "edit") ? iconActionButton("edit-category", "Edit", item.id, editIcon) : ""}
        ${hasPermission("pharmacy", "delete") ? iconActionButton("delete-category", "Delete", item.id, deleteIcon, item.product_count > 0) : ""}
      </div>
    </td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading"><div><h2>Product Categories</h2><p>Categories referenced by the SQL product catalog.</p></div>${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-category", "Add Category", "") : ""}${actionButton("export", "Export CSV", "categories", true, !(state.records.categories || []).length)}`)}</header>
      ${searchFilterToolbar("Search categories...")}
      ${state.loading ? emptyState("Loading categories…") : table(["Category", "Description", "Products", "Actions"], rows, 720)}
    </section>
  `;
}

function renderBrands() {
  const rows = (state.records.brands || []).map((item) => `
    <tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.country || "—")}</td><td>${escapeHtml(item.product_count ?? 0)}</td>
      <td class="thp-pharmacy-row-actions">
        <div class="thp-pharmacy-icon-actions">
          ${hasPermission("pharmacy", "edit") ? iconActionButton("edit-brand", "Edit", item.id, editIcon) : ""}
          ${hasPermission("pharmacy", "delete") ? iconActionButton("delete-brand", "Delete", item.id, deleteIcon, item.product_count > 0) : ""}
        </div>
      </td>
    </tr>
  `).join("");
  return `
    <section class="thp-admin-panel thp-pharmacy-panel">
      <header class="thp-admin-panel-heading thp-pharmacy-heading"><div><h2>Product Brands</h2><p>Brands referenced by the SQL product catalog.</p></div>${sectionActions(`${hasPermission("pharmacy", "create") ? actionButton("add-brand", "Add Brand", "") : ""}${actionButton("export", "Export CSV", "brands", true, !(state.records.brands || []).length)}`)}</header>
      ${searchFilterToolbar("Search brands...")}
      ${state.loading ? emptyState("Loading brands…") : table(["Brand", "Country", "Products", "Actions"], rows, 680)}
    </section>
  `;
}

function renderContent() {
  if (state.error) {
    return `<section class="thp-admin-panel thp-pharmacy-panel"><p class="thp-pharmacy-feedback is-error" role="alert">${escapeHtml(state.error)}</p><button type="button" class="thp-admin-secondary-button thp-pharmacy-button" data-pharmacy-action="retry">Retry</button></section>`;
  }
  if (state.loading && !state.records[state.activeTab]) {
    return `<section class="thp-admin-panel thp-pharmacy-panel">${emptyState("Loading pharmacy data…")}</section>`;
  }
  switch (state.activeTab) {
    case "products": return renderProducts();
    case "orders": return renderOrders();
    case "prescriptions": return renderPrescriptions();
    case "batches": return renderBatches();
    case "delivery": return renderDelivery();
    case "categories": return renderCategories();
    case "brands": return renderBrands();
    default: return emptyState("Choose a Pharmacy section.");
  }
}

function renderModal() {
  if (!state.modal) return "";
  const { type, record = {} } = state.modal;
  if (type === "preview") {
    const blobUrl = state.modal.url;
    const zoom = state.modal.zoom || 1;
    const isImage = state.modal.contentType?.startsWith("image/");
    return `
      <div class="thp-admin-modal-overlay" data-pharmacy-modal-close>
        <section class="thp-admin-modal thp-pharmacy-preview-modal" role="dialog" aria-modal="true" aria-label="Prescription preview" data-pharmacy-dialog>
          <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">PRESCRIPTION</p><h2>Document preview</h2></div><button class="thp-admin-modal-close" type="button" data-pharmacy-modal-close aria-label="Close">×</button></header>
          ${isImage ? `<div class="thp-pharmacy-zoom-tools"><button type="button" class="thp-admin-secondary-button thp-pharmacy-button" data-pharmacy-action="zoom-out">−</button><span>${Math.round(zoom * 100)}%</span><button type="button" class="thp-admin-secondary-button thp-pharmacy-button" data-pharmacy-action="zoom-in">+</button></div><div class="thp-pharmacy-preview-scroll"><img src="${blobUrl}" alt="Prescription" style="transform:scale(${zoom})" /></div>` : `<iframe title="Prescription PDF preview" src="${blobUrl}"></iframe>`}
        </section>
      </div>
    `;
  }

  let title = "";
  let fields = "";
  let multipart = "";
  const readonly = ["view-product", "view-order"].includes(type);
  if (type === "view-order") {
    title = `Order ${record.order_number || ""}`;
    fields = `
      <div class="thp-pharmacy-order-summary">
        <p><span>Patient</span><strong>${escapeHtml(record.patient_name)}</strong></p>
        <p><span>Status</span><strong>${escapeHtml(statusLabel(record.status))}</strong></p>
        <p><span>Payment</span><strong>${escapeHtml(statusLabel(record.payment_status))} · ${escapeHtml(statusLabel(record.payment_method))}</strong></p>
        <p><span>Subtotal</span><strong>${money(record.subtotal)}</strong></p>
        <p><span>Product discount</span><strong>−${money(record.product_discount)}</strong></p>
        <p><span>Coupon (${escapeHtml(record.coupon_code || "none")})</span><strong>−${money(record.coupon_discount)}</strong></p>
        <p><span>Delivery fee</span><strong>${money(record.delivery_fee)}</strong></p>
        <p><span>Tax</span><strong>${money(record.tax)}</strong></p>
        <p><span>Final total</span><strong>${money(record.total)}</strong></p>
        <p><span>Invoice</span><strong>${escapeHtml(record.invoice_number || "Not generated")}</strong></p>
        <p class="thp-pharmacy-full"><span>Delivery address</span><strong>${escapeHtml(record.address)}</strong></p>
        <p class="thp-pharmacy-full"><span>Items</span><strong>${(record.items || []).map((item) => `${item.quantity} × ${escapeHtml(item.product_name)} — ${money(item.line_total)}`).join("<br>") || "—"}</strong></p>
      </div>
    `;
  } else if (["add-product", "edit-product", "view-product"].includes(type)) {
    title = type === "add-product" ? "Add product" : type === "edit-product" ? "Edit product" : "Product details";
    fields = `
      <label class="thp-admin-form-group"><span>Name</span><input name="name" maxlength="240" value="${escapeHtml(record.name || "")}" required ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group"><span>Brand</span><select name="brand" required ${readonly ? "disabled" : ""}><option value="">Choose brand</option>${brandOptions(record.brand)}</select></label>
      <label class="thp-admin-form-group"><span>Category</span><select name="category" required ${readonly ? "disabled" : ""}><option value="">Choose category</option>${categoryOptions(record.category)}</select></label>
      <label class="thp-admin-form-group"><span>Partner pharmacy</span><select name="partner_pharmacy" ${readonly ? "disabled" : ""}><option value="">No partner assigned</option>${(state.meta.pharmacies || []).map((item) => `<option value="${escapeHtml(item.id)}" ${String(record.partner_pharmacy || "") === String(item.id) ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
      <label class="thp-admin-form-group"><span>Pack size</span><input name="pack_size" maxlength="120" value="${escapeHtml(record.pack_size || "")}" required ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group"><span>MRP</span><input name="mrp" type="number" min="0.01" step="0.01" value="${escapeHtml(record.mrp || "")}" required ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group"><span>Discount (%)</span><input name="discount_percent" type="number" min="0" max="100" step="0.01" value="${escapeHtml(record.discount_percent || 0)}" ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group"><span>Image URL</span><input name="image_url" type="url" maxlength="1000" value="${escapeHtml(record.image_url || "")}" ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group"><span>Low-stock threshold</span><input name="low_stock_threshold" type="number" min="0" step="1" value="${escapeHtml(record.low_stock_threshold ?? 10)}" required ${readonly ? "readonly" : ""}></label>
      <label class="thp-admin-form-group thp-pharmacy-check"><input name="rx_required" type="checkbox" ${record.rx_required ? "checked" : ""} ${readonly ? "disabled" : ""}><span>Prescription required</span></label>
      ${type !== "add-product" ? `<label class="thp-admin-form-group thp-pharmacy-check"><input name="is_active" type="checkbox" ${record.is_active !== false ? "checked" : ""} ${readonly ? "disabled" : ""}><span>Active in catalog</span></label>` : ""}
      <label class="thp-admin-form-group thp-pharmacy-full"><span>Description</span><textarea name="description" maxlength="5000" rows="3" ${readonly ? "readonly" : ""}>${escapeHtml(record.description || "")}</textarea></label>
      ${readonly ? `<p class="thp-pharmacy-help">Available stock: ${escapeHtml(record.stock ?? 0)} · ${escapeHtml(statusLabel(record.stock_status || "out_of_stock"))} · Selling price: ${money(record.selling_price)}</p>` : ""}
    `;
  } else if (["add-category", "edit-category"].includes(type)) {
    title = type === "add-category" ? "Add category" : "Edit category";
    fields = `<label class="thp-admin-form-group thp-pharmacy-full"><span>Name</span><input name="name" maxlength="120" value="${escapeHtml(record.name || "")}" required></label><label class="thp-admin-form-group thp-pharmacy-full"><span>Description</span><textarea name="description" rows="3">${escapeHtml(record.description || "")}</textarea></label>`;
  } else if (["add-brand", "edit-brand"].includes(type)) {
    title = type === "add-brand" ? "Add brand" : "Edit brand";
    fields = `<label class="thp-admin-form-group"><span>Name</span><input name="name" maxlength="120" value="${escapeHtml(record.name || "")}" required></label><label class="thp-admin-form-group"><span>Country</span><input name="country" maxlength="100" value="${escapeHtml(record.country || "")}"></label>`;
  } else if (type === "add-batch") {
    title = "Add inventory batch";
    fields = `<label class="thp-admin-form-group thp-pharmacy-full"><span>Product</span><select name="product" required>${productOptions()}</select></label><label class="thp-admin-form-group"><span>Batch number</span><input name="batch_number" maxlength="100" required></label><label class="thp-admin-form-group"><span>Expiry date</span><input name="expiry_date" type="date" required></label><label class="thp-admin-form-group"><span>Quantity</span><input name="quantity" type="number" min="1" step="1" required></label>`;
  } else if (type === "adjust-batch") {
    title = `Adjust ${record.batch_number || "batch"} stock`;
    fields = `<p class="thp-pharmacy-help thp-pharmacy-full">${escapeHtml(record.product_name)} · Current quantity ${escapeHtml(record.quantity)} units.</p><label class="thp-admin-form-group"><span>Adjustment (+/- units)</span><input name="delta" type="number" step="1" required></label><label class="thp-admin-form-group thp-pharmacy-full"><span>Reason</span><textarea name="reason" maxlength="500" required rows="3"></textarea></label>`;
  } else if (type === "add-order") {
    title = "Create pharmacy order";
    const rxOptions = (state.records.prescriptions || [])
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.patient_name)} · ${escapeHtml(item.prescription_number || `Prescription ${item.id}`)} · ${escapeHtml(statusLabel(item.status))}</option>`)
      .join("");
    fields = `
      <label class="thp-admin-form-group"><span>Patient</span><select name="patient_id" required><option value="">Choose patient</option>${patientOptions()}</select></label>
      <label class="thp-admin-form-group"><span>Payment method</span><select name="payment_method" required>${[["cash_on_delivery","Cash on delivery"],["card","Card"],["wallet","Wallet"],["bank_transfer","Bank transfer"]].map(([key,label]) => `<option value="${key}">${label}</option>`).join("")}</select></label>
      <label class="thp-admin-form-group thp-pharmacy-full"><span>Delivery address</span><textarea name="address" maxlength="2000" rows="2" required></textarea></label>
      <div class="thp-pharmacy-full"><div class="thp-pharmacy-form-subhead"><strong>Products</strong><button type="button" class="thp-admin-secondary-button thp-pharmacy-button" data-pharmacy-action="add-order-line">Add product</button></div>
        <div class="thp-pharmacy-order-lines"><div class="thp-pharmacy-order-line" data-order-line><select name="product_id" aria-label="Product" required><option value="">Choose product</option>${productOptions()}</select><input name="quantity" type="number" min="1" value="1" required aria-label="Quantity"></div></div>
      </div>
      <label class="thp-admin-form-group"><span>Coupon</span><select name="coupon_code"><option value="">No coupon</option>${(state.meta.coupons || []).map((item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.code)}</option>`).join("")}</select></label>
      <label class="thp-admin-form-group"><span>Delivery fee</span><input name="delivery_fee" type="number" min="0" step="0.01" value="0.00"></label>
      <label class="thp-admin-form-group thp-pharmacy-full"><span>Approved prescription(s) for Rx products</span><select name="prescription_ids" multiple size="3">${rxOptions}</select></label>
    `;
  } else if (type === "add-prescription") {
    title = "Add prescription for review";
    fields = `<label class="thp-admin-form-group"><span>Patient</span><select name="patient" required><option value="">Choose patient</option>${patientOptions()}</select></label><label class="thp-admin-form-group"><span>Prescription number</span><input name="prescription_number" maxlength="100"></label><label class="thp-admin-form-group"><span>Doctor name</span><input name="doctor_name" maxlength="200"></label><label class="thp-admin-form-group"><span>Issue date</span><input name="issued_on" type="date"></label><label class="thp-admin-form-group thp-pharmacy-full"><span>Document URL (optional if uploading a file)</span><input name="pdf_url" type="url" maxlength="1000"></label><label class="thp-admin-form-group thp-pharmacy-full"><span>Upload PDF/JPG/PNG (max 10 MB)</span><input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label>`;
    multipart = "enctype=\"multipart/form-data\"";
  } else if (type === "reject-prescription") {
    title = "Reject prescription";
    fields = `<label class="thp-admin-form-group thp-pharmacy-full"><span>Reason (required)</span><textarea name="reason" maxlength="2000" rows="4" required></textarea></label>`;
  } else if (type === "edit-prescription-notes") {
    title = "Internal prescription notes";
    fields = `<label class="thp-admin-form-group thp-pharmacy-full"><span>Visible to pharmacy staff only</span><textarea name="internal_notes" maxlength="5000" rows="5">${escapeHtml(record.internal_notes || "")}</textarea></label>`;
  }

  return `
    <div class="thp-admin-modal-overlay" data-pharmacy-modal-close>
      <section class="thp-admin-modal" role="dialog" aria-modal="true" aria-labelledby="thp-pharmacy-modal-title" data-pharmacy-dialog>
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">PHARMACY</p><h2 id="thp-pharmacy-modal-title">${escapeHtml(title)}</h2></div><button type="button" class="thp-admin-modal-close" data-pharmacy-modal-close aria-label="Close">×</button></header>
        <form data-pharmacy-form="${escapeHtml(type)}" data-record-id="${escapeHtml(record.id || "")}" ${multipart}>
          <div class="thp-admin-form-grid thp-pharmacy-form-grid">${fields}</div>
          <p class="thp-pharmacy-feedback is-error" data-pharmacy-modal-error role="alert" hidden></p>
          <footer class="thp-admin-modal-footer">
            <button type="button" class="thp-admin-secondary-button" data-pharmacy-modal-close>Close</button>
            ${readonly ? "" : `<button type="submit" class="thp-admin-primary-button">${type.startsWith("add-") ? "Save" : "Save changes"}</button>`}
          </footer>
        </form>
      </section>
    </div>
  `;
}

function render() {
  if (!state.app) return;
  const tabNav = tabs.map(([id, label]) => `
    <button type="button" role="tab" aria-selected="${state.activeTab === id}" class="thp-hr-tab ${state.activeTab === id ? "is-active" : ""}" data-pharmacy-tab="${id}">
      ${escapeHtml(label)}<span class="thp-hr-tab-count">${state.summary?.[id] ?? "…"}</span>
    </button>
  `).join("");
  renderAdminLayout(
    state.app,
    "pharmacy",
    `
      <div class="thp-pharmacy-page">
        <nav class="thp-hr-tabs thp-pharmacy-tabs" aria-label="Pharmacy sections" role="tablist">${tabNav}</nav>
        ${state.error ? `<p class="thp-pharmacy-feedback is-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
        ${renderContent()}
        ${renderModal()}
      </div>
    `,
    {
      subtitle: "SQL-backed product catalog, fulfillment, prescriptions and inventory.",
    },
  );
  if (state.modal?.type !== "preview") {
    state.app.querySelector("#thp-pharmacy-modal-title")?.focus();
  }
}

function showToast(message) {
  if (typeof window.thpShowToast === "function") window.thpShowToast(message);
}

function setError(message) {
  state.error = message || "";
  render();
}

async function loadSummary() {
  const counts = await pharmacyRequest("summary/");
  state.summary = counts;
}

async function loadMeta() {
  state.meta = await pharmacyRequest("meta/");
}

async function loadTab({ keepSearchFocus = false } = {}) {
  const searchInput = state.app?.querySelector("[data-pharmacy-search]");
  const searchValue = searchInput?.value ?? state.search;
  const selectionStart = searchInput?.selectionStart;
  const selectionEnd = searchInput?.selectionEnd;
  const tab = state.activeTab;
  state.loading = true;
  state.error = "";
  render();
  try {
    let response;
    if (tab === "products") {
      response = await pharmacyRequest(`${apiCollections[tab]}${queryString({
        search: searchValue,
        category: state.filters.category,
        brand: state.filters.brand,
        stock_status: state.filters.stock_status,
      })}`);
    } else if (tab === "orders" || tab === "prescriptions") {
      response = await pharmacyRequest(`${apiCollections[tab]}${queryString({
        search: searchValue,
        status: state.filters.status,
      })}`);
    } else if (tab === "categories" || tab === "brands") {
      response = await pharmacyRequest(`${apiCollections[tab]}${queryString({ search: searchValue })}`);
    } else if (tab === "batches") {
      response = await pharmacyRequest(`${apiCollections.batches}${queryString({ search: searchValue })}`);
    } else if (tab === "delivery") {
      response = await pharmacyRequest("orders/");
    } else {
      response = [];
    }
    if (state.activeTab !== tab) return;
    state.records[tab] = response;
    state.loading = false;
    render();
    if (keepSearchFocus) {
      const input = state.app.querySelector("[data-pharmacy-search]");
      if (input) {
        input.focus();
        input.setSelectionRange(selectionStart ?? input.value.length, selectionEnd ?? input.value.length);
      }
    }
  } catch (error) {
    state.loading = false;
    state.error = error?.message || `Unable to load ${tab}.`;
    render();
  }
}

async function refreshTab() {
  state.loading = true;
  render();
  try {
    const [summary, meta] = await Promise.all([
      pharmacyRequest("summary/"),
      pharmacyRequest("meta/"),
    ]);
    state.summary = summary;
    state.meta = meta;
    await loadTab();
  } catch (error) {
    state.loading = false;
    state.error = error?.message || "Unable to refresh pharmacy data.";
    render();
  }
}

function openModal(type, record = {}) {
  state.modal = { type, record };
  render();
  state.app.querySelector("[data-pharmacy-form] input, [data-pharmacy-form] select, [data-pharmacy-form] textarea")?.focus();
}

function closeModal() {
  if (state.modal?.url) URL.revokeObjectURL(state.modal.url);
  state.modal = null;
  render();
}

function selectedRecord(tab, id) {
  return (state.records[tab] || []).find((item) => String(item.id) === String(id));
}

function downloadCsv(tab, records) {
  if (!records?.length) return;
  const columns = {
    products: ["name", "brand_name", "category_name", "pack_size", "mrp", "discount_percent", "selling_price", "stock", "stock_status", "is_active"],
    orders: ["order_number", "patient_name", "status", "payment_method", "payment_status", "subtotal", "product_discount", "coupon_discount", "delivery_fee", "tax", "total"],
    prescriptions: ["prescription_number", "patient_name", "doctor_name", "status", "internal_notes", "rejection_reason"],
    batches: ["product_name", "batch_number", "expiry_date", "expiry_status", "quantity"],
    delivery: ["order_number", "patient_name", "address", "delivery_partner", "eta", "dispatch_status"],
    categories: ["name", "description", "product_count"],
    brands: ["name", "country", "product_count"],
  }[tab];
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const exportRecords = tab === "delivery"
    ? records
      .filter((order) => ["packed", "dispatched", "delivered"].includes(order.status))
      .map((order) => ({
        ...order,
        delivery_partner: order.delivery?.partner_name || "Unassigned",
        eta: order.delivery?.eta || "",
        dispatch_status: order.delivery?.status || order.status,
      }))
    : records;
  const csv = [columns, ...exportRecords.map((record) => columns.map((key) => record[key]))]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tatito-pharmacy-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formObject(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

async function submitModal(form) {
  const type = form.dataset.pharmacyForm;
  const id = form.dataset.recordId;
  const data = formObject(form);
  const formData = new FormData(form);
  const json = { ...data };
  if (["add-product", "edit-product"].includes(type)) {
    for (const field of ["rx_required", "is_active"]) {
      const checkbox = form.elements.namedItem(field);
      if (checkbox) json[field] = checkbox.checked;
    }
    json.discount_percent = Number(json.discount_percent || 0);
    json.mrp = Number(json.mrp);
    json.low_stock_threshold = Number(json.low_stock_threshold);
    json.category = Number(json.category);
    json.brand = Number(json.brand);
    json.partner_pharmacy = json.partner_pharmacy ? Number(json.partner_pharmacy) : null;
  }
  if (type === "add-batch") {
    json.product = Number(json.product);
    json.quantity = Number(json.quantity);
  }
  if (type === "adjust-batch") {
    json.delta = Number(json.delta);
  }
  let request;
  const method = type.startsWith("add-") ? "POST" : type === "edit-prescription-notes" ? "PATCH" : "PATCH";
  if (type === "add-product") request = pharmacyRequest("products/", { method, body: json });
  else if (type === "edit-product") request = pharmacyRequest(`products/${encodeURIComponent(id)}/`, { method, body: json });
  else if (type === "add-category") request = pharmacyRequest("categories/", { method, body: json });
  else if (type === "edit-category") request = pharmacyRequest(`categories/${encodeURIComponent(id)}/`, { method, body: json });
  else if (type === "add-brand") request = pharmacyRequest("brands/", { method, body: json });
  else if (type === "edit-brand") request = pharmacyRequest(`brands/${encodeURIComponent(id)}/`, { method, body: json });
  else if (type === "add-batch") request = pharmacyRequest("batches/", { method, body: json });
  else if (type === "adjust-batch") request = pharmacyRequest(`batches/${encodeURIComponent(id)}/adjust/`, { method: "POST", body: json });
  else if (type === "add-order") {
    const items = [...form.querySelectorAll("[data-order-line]")].map((line) => ({
      product_id: Number(line.querySelector('[name="product_id"]').value),
      quantity: Number(line.querySelector('[name="quantity"]').value),
    }));
    const prescriptionIds = [...form.elements.namedItem("prescription_ids").selectedOptions]
      .map((option) => Number(option.value));
    request = pharmacyRequest("orders/", {
      method: "POST",
      body: {
        patient_id: data.patient_id,
        address: data.address,
        items,
        coupon_code: data.coupon_code,
        payment_method: data.payment_method,
        delivery_fee: data.delivery_fee || "0.00",
        prescription_ids: prescriptionIds,
      },
    });
  } else if (type === "add-prescription") {
    formData.set("patient", data.patient);
    request = pharmacyRequest("prescriptions/", { method: "POST", body: formData });
  } else if (type === "reject-prescription") {
    request = pharmacyRequest(`prescriptions/${encodeURIComponent(id)}/reject/`, { method: "POST", body: { reason: data.reason } });
  } else if (type === "edit-prescription-notes") {
    request = pharmacyRequest(`prescriptions/${encodeURIComponent(id)}/`, { method: "PATCH", body: { internal_notes: data.internal_notes } });
  } else {
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const errorBox = form.querySelector("[data-pharmacy-modal-error]");
  try {
    await request;
    state.modal = null;
    state.search = "";
    state.filters = { category: "", brand: "", status: "", stock_status: "" };
    await refreshTab();
    showToast("Pharmacy record saved.");
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error?.message || "Unable to save this record.";
      errorBox.hidden = false;
    } else {
      state.error = error?.message || "Unable to save this record.";
      render();
    }
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleClick(event) {
  const tab = event.target.closest("[data-pharmacy-tab]");
  if (tab) {
    state.activeTab = tab.dataset.pharmacyTab;
    state.search = "";
    state.filters = { category: "", brand: "", status: "", stock_status: "" };
    state.error = "";
    await loadTab();
    return;
  }
  if (
    event.target.matches("[data-pharmacy-modal-close]") ||
    event.target.closest("button[data-pharmacy-modal-close]")
  ) {
    closeModal();
    return;
  }
  const button = event.target.closest("[data-pharmacy-action]");
  if (!button) return;
  const { pharmacyAction: action, id } = button.dataset;
  if (action === "retry") {
    state.error = "";
    await refreshTab();
    return;
  }
  if (action === "export") {
    downloadCsv(id, state.records[id]);
    return;
  }
  if (action === "add-product") return openModal(action);
  if (action === "edit-product" || action === "view-product") {
    return openModal(action, selectedRecord("products", id));
  }
  if (action === "view-order") {
    return openModal(action, selectedRecord("orders", id));
  }
  if (action === "add-category" || action === "add-brand" || action === "add-batch" || action === "add-prescription") {
    if (action === "add-prescription" && !state.records.prescriptions) {
      try {
        state.records.prescriptions = await pharmacyRequest("prescriptions/");
      } catch (error) {
        return setError(error?.message || "Unable to load prescriptions.");
      }
    }
    return openModal(action);
  }
  if (action === "edit-category" || action === "edit-brand") {
    return openModal(action, selectedRecord(action.endsWith("category") ? "categories" : "brands", id));
  }
  if (action === "adjust-batch") return openModal(action, selectedRecord("batches", id));
  if (action === "add-order") {
    try {
      if (!state.records.prescriptions) state.records.prescriptions = await pharmacyRequest("prescriptions/");
      return openModal(action);
    } catch (error) {
      return setError(error?.message || "Unable to load prescriptions for this order.");
    }
  }
  if (action === "delete-category" || action === "delete-brand" || action === "delete-product") {
    const collection = action.includes("category") ? "categories" : action.includes("brand") ? "brands" : "products";
    const record = selectedRecord(collection, id);
    if (record && !window.confirm(`Delete "${record.name}"? This cannot be undone.`)) return;
    try {
      await pharmacyRequest(`${collection}/${encodeURIComponent(id)}/`, { method: "DELETE" });
      await refreshTab();
      showToast("Pharmacy record deleted.");
    } catch (error) {
      setError(error?.message || "Unable to delete this record.");
    }
    return;
  }
  if (action === "toggle-product") {
    const product = selectedRecord("products", id);
    try {
      await pharmacyRequest(`products/${encodeURIComponent(id)}/`, {
        method: "PATCH",
        body: { is_active: !product.is_active },
      });
      await refreshTab();
      showToast(product.is_active ? "Product deactivated." : "Product activated.");
    } catch (error) {
      setError(error?.message || "Unable to change product status.");
    }
    return;
  }
  if (action === "approve-prescription") {
    if (!window.confirm("Approve this prescription?")) return;
    try {
      await pharmacyRequest(`prescriptions/${encodeURIComponent(id)}/approve/`, { method: "POST", body: {} });
      await refreshTab();
      showToast("Prescription approved.");
    } catch (error) {
      setError(error?.message || "Unable to approve prescription.");
    }
    return;
  }
  if (action === "reject-prescription" || action === "edit-prescription-notes") {
    return openModal(action, selectedRecord("prescriptions", id));
  }
  if (action === "preview-prescription") {
    const prescription = selectedRecord("prescriptions", id);
    try {
      button.disabled = true;
      const blob = await getAdminFile(
        `/pharmacy/prescriptions/${encodeURIComponent(id)}/file/`,
      );
      state.modal = {
        type: "preview",
        url: URL.createObjectURL(blob),
        contentType: blob.type,
        zoom: 1,
      };
      render();
    } catch (error) {
      setError(error?.message || "Unable to load the prescription file.");
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (action === "add-order-line") {
    const host = state.app.querySelector(".thp-pharmacy-order-lines");
    if (host) {
      const row = document.createElement("div");
      row.className = "thp-pharmacy-order-line";
      row.dataset.orderLine = "";
      row.innerHTML = `<select name="product_id" aria-label="Product" required><option value="">Choose product</option>${productOptions()}</select><input name="quantity" type="number" min="1" value="1" required aria-label="Quantity"><button type="button" class="thp-admin-secondary-button thp-pharmacy-button" data-pharmacy-action="remove-order-line" aria-label="Remove product">Remove</button>`;
      host.append(row);
    }
    return;
  }
  if (action === "remove-order-line") {
    const rows = state.app.querySelectorAll("[data-order-line]");
    if (rows.length > 1) button.closest("[data-order-line]")?.remove();
    return;
  }
  if (action === "verify-order" || action === "pack-order" || action === "cancel-order") {
    const target = action === "verify-order" ? "verified" : action === "pack-order" ? "packed" : "cancelled";
    const prompt = target === "cancelled" ? "Cancel this order?" : `${target === "verified" ? "Verify" : "Pack"} this order?`;
    if (!window.confirm(prompt)) return;
    try {
      await pharmacyRequest(`orders/${encodeURIComponent(id)}/advance/`, { method: "POST", body: { status: target } });
      await refreshTab();
      showToast(`Order ${target}.`);
    } catch (error) {
      setError(error?.message || "Unable to update order.");
    }
    return;
  }
  if (action === "open-delivery") {
    state.activeTab = "delivery";
    state.search = "";
    await loadTab();
    return;
  }
  if (action === "delivery-status") {
    const order = (state.records.delivery || []).find((item) => String(item.id) === String(id));
    const target = order?.delivery?.status === "assigned" ? "out_for_delivery" : "delivered";
    try {
      await pharmacyRequest(`orders/${encodeURIComponent(id)}/delivery/`, {
        method: "PATCH",
        body: { status: target },
      });
      await refreshTab();
      showToast(`Delivery marked ${statusLabel(target).toLowerCase()}.`);
    } catch (error) {
      setError(error?.message || "Unable to update delivery status.");
    }
    return;
  }
  if (action === "zoom-in" || action === "zoom-out") {
    if (!state.modal || state.modal.type !== "preview") return;
    state.modal.zoom = Math.max(0.5, Math.min(3, state.modal.zoom + (action === "zoom-in" ? 0.25 : -0.25)));
    render();
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("[data-pharmacy-form]");
  const deliveryForm = event.target.closest("[data-pharmacy-delivery]");
  if (form) {
    event.preventDefault();
    await submitModal(form);
    return;
  }
  if (deliveryForm) {
    event.preventDefault();
    const values = formObject(deliveryForm);
    const id = deliveryForm.dataset.pharmacyDelivery;
    const submit = deliveryForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await pharmacyRequest(`orders/${encodeURIComponent(id)}/delivery/`, {
        method: "PATCH",
        body: {
          partner_id: values.partner_id,
          eta: values.eta ? new Date(values.eta).toISOString() : null,
        },
      });
      await refreshTab();
      showToast("Delivery partner and ETA saved.");
    } catch (error) {
      setError(error?.message || "Unable to save delivery assignment.");
    }
  }
}

function bindEvents(app) {
  state.events?.abort();
  state.events = new AbortController();
  const options = { signal: state.events.signal };
  app.addEventListener("click", (event) => void handleClick(event), options);
  app.addEventListener("submit", (event) => void handleSubmit(event), options);
  app.addEventListener("input", (event) => {
    if (!event.target.matches("[data-pharmacy-search]")) return;
    state.search = event.target.value;
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => void loadTab({ keepSearchFocus: true }), 250);
  }, options);
  app.addEventListener("change", (event) => {
    const filter = event.target.closest("[data-pharmacy-filter]");
    if (!filter) return;
    state.filters[filter.dataset.pharmacyFilter] = filter.value;
    void loadTab();
  }, options);
  app.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modal) closeModal();
  }, options);
}

export async function renderAdminPharmacy(app) {
  if (!isAdminAuthenticated()) {
    window.location.hash = "#/admin/login";
    return;
  }
  try {
    await refreshAdminSession();
  } catch {
    window.location.hash = "#/admin/login";
    return;
  }
  if (!window.location.hash.startsWith("#/admin/pharmacy")) return;
  if (!hasPermission("pharmacy", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }
  state.app = app;
  state.activeTab = new URLSearchParams(window.location.hash.split("?")[1] || "").get("tab") === "prescriptions"
    ? "prescriptions"
    : "products";
  state.summary = null;
  state.records = {};
  state.meta = { patients: [], pharmacies: [], partners: [], coupons: [], products: [], categories: [], brands: [] };
  state.error = "";
  state.loading = true;
  state.search = "";
  state.filters = { category: "", brand: "", status: "", stock_status: "" };
  state.modal = null;
  render();
  bindEvents(app);
  try {
    const [summary, meta] = await Promise.all([
      pharmacyRequest("summary/"),
      pharmacyRequest("meta/"),
    ]);
    state.summary = summary;
    state.meta = meta;
    await loadTab();
  } catch (error) {
    state.loading = false;
    state.error = error?.message || "Unable to load Pharmacy.";
    render();
  }
}
