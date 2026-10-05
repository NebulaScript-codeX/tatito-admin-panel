import {
  adjustCommerceWallet,
  cancelCommercePlanOrder,
  createCommerceTransaction,
  getCommerceInvoices,
  getCommerceOrderDetail,
  getCommerceOrders,
  getCommercePlans,
  getCommerceRefunds,
  getCommerceTransactions,
  getCommerceWalletHistory,
  getCommerceWallets,
  reviewCommerceRefund,
  setCommerceTransactionStatus,
} from "./adminApi.js";
import {
  hasPermission,
  isAdminAuthenticated,
  refreshAdminSession,
} from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";
import { renderAdminLayout } from "./adminLayout.js";
import "./adminOrdersPayments.css";
import { formatINR } from "../currency.js";

const tabs = [
  ["orders", "All Orders"],
  ["transactions", "Transactions & Revenue"],
  ["refunds", "Refunds"],
  ["invoices", "Invoices"],
  ["wallets", "Patient Wallets"],
];
const state = {
  app: null,
  events: null,
  tab: "orders",
  loading: true,
  error: "",
  orders: [],
  transactions: [],
  refunds: [],
  invoices: [],
  wallets: [],
  plans: [],
  counts: {},
  summary: {},
  filters: { type: "", payment_status: "", date_from: "", date_to: "" },
  modal: null,
  detail: null,
  walletHistory: null,
};

const can = (action) => hasPermission("orders_payments", action);
const list = (response) =>
  Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : [];
const label = (value) =>
  String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = formatINR;
const dateText = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
};

function escape(value) {
  return escapeHtml(String(value ?? ""));
}

function toast(message) {
  if (typeof window.thpShowToast === "function") window.thpShowToast(message);
}

function apiMessage(error, fallback) {
  const data = error?.data;
  if (data && typeof data === "object") {
    const messages = Object.entries(data).flatMap(([field, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => field === "detail" || field === "non_field_errors"
          ? item
          : `${label(field)}: ${item}`),
    );
    if (messages.length) return messages.join(" ");
  }
  return error?.message || fallback;
}

function badge(value) {
  const stateName = String(value || "").toLowerCase();
  const tone = ["paid", "successful", "approved", "completed", "active", "credit"].includes(stateName)
    ? "is-good"
    : ["pending", "refund_pending"].includes(stateName)
      ? "is-warning"
      : ["failed", "rejected", "refunded", "cancelled", "debit"].includes(stateName)
        ? "is-danger"
        : "is-neutral";
  return `<span class="thp-commerce-badge ${tone}">${escape(label(value))}</span>`;
}

function button(text, action, id = "", secondary = true) {
  return `<button type="button" class="${secondary ? "thp-admin-secondary-button" : "thp-admin-primary-button"}" data-commerce-action="${escape(action)}" data-id="${escape(id)}">${escape(text)}</button>`;
}

function summaryCards() {
  return `
    <section class="thp-commerce-summary" aria-label="Revenue summary">
      <article class="is-collected"><span>Total Collected</span><strong>${money(state.summary.total_collected)}</strong></article>
      <article class="is-pending"><span>Pending</span><strong>${money(state.summary.pending)}</strong></article>
      <article class="is-refunded"><span>Refunded</span><strong>${money(state.summary.refunded)}</strong></article>
      <article><span>Orders</span><strong>${state.counts.orders ?? 0}</strong></article>
    </section>`;
}

const commerceIcons = {
  details: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="m15 5 4 4"/><path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z"/>',
  print: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
  approve: '<path d="m5 12 4 4L19 6"/>',
  reject: '<path d="m6 6 12 12M18 6 6 18"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  credit: '<path d="M12 5v14M5 12h14"/>',
  debit: '<path d="M5 12h14"/>',
};

function iconAction(action, id, icon, title, { type = "", tone = "" } = {}) {
  return `<button type="button" class="thp-commerce-icon-button${tone ? ` is-${tone}` : ""}" data-commerce-action="${escape(action)}" data-id="${escape(id)}"${type ? ` data-type="${escape(type)}"` : ""} aria-label="${escape(title)}" title="${escape(title)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${commerceIcons[icon]}</svg></button>`;
}

function filterMarkup(includePaymentStatus = true) {
  return `<div class="thp-commerce-filters">
    <label>Order type
      <select data-commerce-filter="type">
        <option value="">All types</option>
        ${["pharmacy", "lab", "scan", "appointment", "plan"].map((type) => `<option value="${type}" ${state.filters.type === type ? "selected" : ""}>${escape(label(type))}</option>`).join("")}
      </select>
    </label>
    ${includePaymentStatus ? `<label>Payment status
      <select data-commerce-filter="payment_status">
        <option value="">All statuses</option>
        ${["pending", "paid", "failed", "refund_pending", "refunded"].map((value) => `<option value="${value}" ${state.filters.payment_status === value ? "selected" : ""}>${escape(label(value))}</option>`).join("")}
      </select>
    </label>` : ""}
    <label>From<input type="date" data-commerce-filter="date_from" value="${escape(state.filters.date_from)}" /></label>
    <label>To<input type="date" data-commerce-filter="date_to" value="${escape(state.filters.date_to)}" /></label>
    <button type="button" class="thp-admin-secondary-button" data-commerce-action="clear-filters">Clear</button>
  </div>`;
}

function ordersTable() {
  const rows = state.orders.map((row) => `<tr>
    <td><strong>${escape(row.order_number)}</strong></td>
    <td>${badge(row.type)}</td>
    <td>${escape(row.patient_name)}</td>
    <td>${escape(row.description)}</td>
    <td>${money(row.amount)}</td>
    <td>${badge(row.payment_status)}</td>
    <td>${escape(label(row.status))}</td>
    <td>${dateText(row.date, true)}</td>
    <td class="thp-commerce-row-actions">
      ${iconAction("view-order", row.id, "details", `View ${label(row.type)} order details`, { type: row.type })}
      ${row.type === "plan" && ["active", "pending"].includes(row.status)
        ? button("Cancel", "cancel-plan", row.id)
        : row.invoice_available
          ? iconAction("invoice", row.id, "print", "Open / print invoice", { type: row.type })
          : ""}
    </td>
  </tr>`).join("");
  return `<section class="thp-admin-panel thp-commerce-panel">
    <header class="thp-admin-panel-heading"><div><h2>All Orders</h2><p>Existing orders from Pharmacy, Lab, Appointments, Scans and Plans.</p></div></header>
    ${filterMarkup()}
    <div class="thp-admin-table-wrapper"><table class="thp-admin-table thp-commerce-table thp-commerce-orders-table">
      <thead><tr><th>Order ID</th><th>Type</th><th>Patient</th><th>Order details</th><th>Amount</th><th>Payment</th><th>Order status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="9"><div class="thp-commerce-empty">No matching orders found.</div></td></tr>`}</tbody>
    </table></div>
  </section>`;
}

function transactionsTable() {
  const byModule = Object.entries(state.summary.revenue_by_module || {}).map(
    ([module, amount]) => `<div><span>${escape(label(module))}</span><strong>${money(amount)}</strong></div>`,
  ).join("");
  const rows = state.transactions.map((row) => `<tr>
    <td><strong>${escape(row.reference)}</strong></td>
    <td>${escape(row.order_number || (row.order_id ? `#${row.order_id}` : "—"))}</td>
    <td>${escape(row.patient_name || "—")}</td>
    <td>${escape(label(row.method))}</td>
    <td>${money(row.amount)}</td>
    <td>${badge(row.kind === "refund" ? "refunded" : row.status)}</td>
    <td>${dateText(row.date, true)}</td>
    <td class="thp-commerce-row-actions">
      ${iconAction("view-transaction", row.id, "details", "View transaction details")}
      ${row.kind === "payment" && row.status !== "successful" && can("edit")
        ? iconAction("edit-transaction", row.id, "edit", "Edit transaction status")
        : ""}
    </td>
  </tr>`).join("");
  return `<section class="thp-admin-panel thp-commerce-panel">
    <header class="thp-admin-panel-heading"><div><h2>Transactions & Revenue</h2><p>Payments and refunds linked to source records where available.</p></div></header>
    ${filterMarkup(false)}
    <div class="thp-commerce-revenue-breakdown">${byModule || "<span>No collected revenue in this period.</span>"}</div>
    ${table(["Transaction ID", "Order ID", "Patient", "Method", "Amount", "Status", "Date", "Action"], rows, "thp-commerce-transactions-table")}
  </section>`;
}

function table(headers, rows, tableClass = "") {
  return `<div class="thp-admin-table-wrapper"><table class="thp-admin-table thp-commerce-table ${tableClass}">
    <thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${headers.length}"><div class="thp-commerce-empty">No matching records found.</div></td></tr>`}</tbody>
  </table></div>`;
}

function refundsTable() {
  const rows = state.refunds.map((row) => `<tr>
    <td>${escape(row.order_number || row.id)}</td><td>${escape(label(row.order_type))}</td>
    <td>${escape(row.patient_name)}</td><td>${money(row.amount)}</td><td>${escape(row.reason || "—")}</td>
    <td>${badge(row.status)}</td><td>${dateText(row.date, true)}</td>
    <td class="thp-commerce-row-actions">
      ${iconAction("view-refund", `${row.source}|${row.id}`, "details", "View refund details")}
      ${row.status === "pending" && can("edit")
        ? `${iconAction("approve-refund", `${row.source}|${row.id}`, "approve", "Approve refund", { tone: "approve" })} ${iconAction("reject-refund", `${row.source}|${row.id}`, "reject", "Reject refund", { tone: "reject" })}`
        : ""}
    </td>
  </tr>`).join("");
  return `<section class="thp-admin-panel thp-commerce-panel">
    <header class="thp-admin-panel-heading"><div><h2>Refunds Queue</h2><p>Requests are backed by appointment, pharmacy or commerce payment records.</p></div></header>
    ${table(["Order", "Module", "Patient", "Amount", "Request reason", "Status", "Requested", "Action"], rows, "thp-commerce-refunds-table")}
  </section>`;
}

function invoicesTable() {
  const rows = state.invoices.map((row) => `<tr>
    <td>${escape(row.invoice_number)}</td><td>${escape(row.order_number)}</td>
    <td>${escape(label(row.type))}</td><td>${escape(row.patient_name)}</td>
    <td>${money(row.amount)}</td><td>${dateText(row.date, true)}</td>
    <td class="thp-commerce-row-actions">${iconAction("invoice", row.id, "print", "Open / print invoice", { type: row.type })}</td>
  </tr>`).join("");
  return `<section class="thp-admin-panel thp-commerce-panel">
    <header class="thp-admin-panel-heading"><div><h2>Invoices</h2><p>Generated from paid orders using their persisted order and payment data.</p></div></header>
    ${table(["Invoice", "Order", "Type", "Patient", "Amount", "Paid date", "Action"], rows, "thp-commerce-invoices-table")}
  </section>`;
}

function walletsTable() {
  const rows = state.wallets.map((row) => `<tr>
    <td>${escape(row.name)}</td><td>${escape(row.phone || "—")}</td><td>${escape(row.email)}</td>
    <td>${money(row.balance)}</td><td class="thp-commerce-row-actions">
      ${iconAction("wallet-history", row.id, "history", "View wallet history")}
      ${can("edit")
        ? ` ${iconAction("wallet-credit", row.id, "credit", "Credit wallet", { tone: "approve" })} ${iconAction("wallet-debit", row.id, "debit", "Debit wallet", { tone: "reject" })}`
        : ""}
    </td>
  </tr>`).join("");
  return `<section class="thp-admin-panel thp-commerce-panel">
    <header class="thp-admin-panel-heading"><div><h2>Patient Wallets</h2><p>Balances use the existing patient account wallet. Every adjustment is ledgered.</p></div></header>
    ${table(["Patient", "Phone", "Email", "Balance", "Actions"], rows, "thp-commerce-wallets-table")}
  </section>`;
}

function modalMarkup() {
  if (state.detail) {
    const detail = state.detail;
    const lines = (detail.items || []).map((item) => `<tr><td>${escape(item.name)}</td><td>${escape(item.quantity)}</td><td>${money(item.amount)}</td></tr>`).join("");
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">ORDER DETAILS</p><h2 id="commerce-modal-title">${escape(detail.order_number)}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <dl class="thp-commerce-detail-grid"><div><dt>Patient</dt><dd>${escape(detail.patient_name)}</dd></div><div><dt>Type</dt><dd>${escape(label(detail.type))}</dd></div><div><dt>Payment</dt><dd>${escape(label(detail.payment_status))}</dd></div><div><dt>Order status</dt><dd>${escape(label(detail.status))}</dd></div><div><dt>Payment method</dt><dd>${escape(label(detail.payment_method))}</dd></div><div><dt>Date</dt><dd>${dateText(detail.date, true)}</dd></div></dl>
        ${table(["Description", "Quantity", "Amount"], lines, "thp-commerce-modal-table")}
        <footer class="thp-admin-modal-footer"><strong>Total ${money(detail.amount)}</strong><button class="thp-admin-secondary-button" type="button" data-commerce-action="close-modal">Close</button></footer>
      </section></div>`;
  }
  if (!state.modal) return "";
  if (state.modal.type === "transaction-view") {
    const row = state.transactions.find((item) => String(item.id) === String(state.modal.id));
    if (!row) return "";
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">TRANSACTION</p><h2 id="commerce-modal-title">${escape(row.reference)}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <dl class="thp-commerce-detail-grid"><div><dt>Order</dt><dd>${escape(row.order_number || row.order_id || "—")}</dd></div><div><dt>Patient</dt><dd>${escape(row.patient_name || "—")}</dd></div><div><dt>Type</dt><dd>${escape(label(row.order_type))}</dd></div><div><dt>Transaction kind</dt><dd>${escape(label(row.kind))}</dd></div><div><dt>Payment method</dt><dd>${escape(label(row.method))}</dd></div><div><dt>Status</dt><dd>${badge(row.status)}</dd></div><div><dt>Amount</dt><dd>${money(row.amount)}</dd></div><div><dt>Date</dt><dd>${dateText(row.date, true)}</dd></div><div><dt>Note</dt><dd>${escape(row.note || "—")}</dd></div></dl>
        <footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-commerce-action="close-modal">Close</button></footer>
      </section></div>`;
  }
  if (state.modal.type === "refund-view") {
    const [source, refundId] = state.modal.id.split("|");
    const row = state.refunds.find((item) => item.source === source && String(item.id) === refundId);
    if (!row) return "";
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">REFUND REQUEST</p><h2 id="commerce-modal-title">${escape(row.order_number || row.id)}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <dl class="thp-commerce-detail-grid"><div><dt>Patient</dt><dd>${escape(row.patient_name || "—")}</dd></div><div><dt>Order type</dt><dd>${escape(label(row.order_type))}</dd></div><div><dt>Amount</dt><dd>${money(row.amount)}</dd></div><div><dt>Status</dt><dd>${badge(row.status)}</dd></div><div><dt>Destination</dt><dd>${escape(label(row.destination || "—"))}</dd></div><div><dt>Requested</dt><dd>${dateText(row.date, true)}</dd></div><div><dt>Request reason</dt><dd>${escape(row.reason || "—")}</dd></div><div><dt>Rejection reason</dt><dd>${escape(row.rejection_reason || "—")}</dd></div></dl>
        <footer class="thp-admin-modal-footer"><button class="thp-admin-secondary-button" type="button" data-commerce-action="close-modal">Close</button></footer>
      </section></div>`;
  }
  if (state.modal.type === "transaction-status") {
    const row = state.transactions.find((item) => String(item.id) === String(state.modal.id));
    if (!row) return "";
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal thp-commerce-form-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">EDIT TRANSACTION</p><h2 id="commerce-modal-title">${escape(row.reference)}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <form data-commerce-form="transaction-status" data-id="${escape(state.modal.sourceId)}" data-source="${escape(state.modal.source)}"><dl class="thp-commerce-detail-grid"><div><dt>Order</dt><dd>${escape(row.order_number || row.order_id || "—")}</dd></div><div><dt>Patient</dt><dd>${escape(row.patient_name || "—")}</dd></div><div><dt>Amount</dt><dd>${money(row.amount)}</dd></div><div><dt>Method</dt><dd>${escape(label(row.method))}</dd></div></dl>
          <label class="thp-admin-form-group"><span>Payment status</span><select name="status" required>
            ${row.status === "pending" ? `<option value="" disabled selected>Current: Pending — select an update</option>` : ""}
            <option value="successful" ${row.status === "successful" ? "selected" : ""}>Successful / Paid</option>
            <option value="failed" ${row.status === "failed" ? "selected" : ""}>Failed</option>
          </select></label>
          <p class="thp-commerce-form-error" data-commerce-error role="alert" hidden></p>
          <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-commerce-action="close-modal">Cancel</button><button type="submit" class="thp-admin-primary-button">Save status</button></footer>
        </form>
      </section></div>`;
  }
  if (state.modal.type === "transaction") {
    const planOptions = state.plans.map((plan) => `<option value="${escape(plan.code)}">${escape(plan.name)}</option>`).join("");
    const patientOptions = state.wallets.filter((row) => row.patient_id).map((row) => `<option value="${escape(row.patient_id)}">${escape(row.name)} · ${escape(row.email)}</option>`).join("");
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">COMMERCE</p><h2 id="commerce-modal-title">Create manual transaction</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <form data-commerce-form="transaction"><div class="thp-admin-form-grid">
          <label class="thp-admin-form-group"><span>Order module</span><select name="order_type"><option value="manual">Manual / no order</option><option value="pharmacy">Pharmacy</option><option value="appointment">Appointment</option><option value="lab">Lab</option><option value="scan">Scan</option><option value="plan">Plan order</option></select></label>
          <label class="thp-admin-form-group"><span>Existing order ID (optional)</span><input name="order_id" placeholder="Required for an existing order" /></label>
          <label class="thp-admin-form-group"><span>Patient account</span><select name="patient_id"><option value="">Choose patient (or enter a name)</option>${patientOptions}</select></label>
          <label class="thp-admin-form-group"><span>Patient name for manual entry</span><input name="patient_name" maxlength="200" /></label>
          <label class="thp-admin-form-group"><span>Amount</span><input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label class="thp-admin-form-group"><span>Payment method</span><select name="method" required><option value="card">Card</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option></select></label>
          <label class="thp-admin-form-group"><span>Plan (when creating a Plan order)</span><select name="plan_code"><option value="">Choose plan</option>${planOptions}</select></label>
          <label class="thp-admin-form-group"><span>Plan billing period</span><select name="billing_period"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
          <label class="thp-admin-form-group"><span>Note</span><input name="note" maxlength="500" /></label>
        </div><p class="thp-commerce-form-error" data-commerce-error role="alert" hidden></p>
          <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-commerce-action="close-modal">Cancel</button><button type="submit" class="thp-admin-primary-button">Create pending transaction</button></footer>
        </form>
      </section></div>`;
  }
  if (state.modal.type === "refund") {
    const approve = state.modal.action === "approve";
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">REFUND REVIEW</p><h2 id="commerce-modal-title">${approve ? "Approve refund" : "Reject refund"}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <form data-commerce-form="refund"><div class="thp-admin-form-grid">
          ${approve ? `<label class="thp-admin-form-group"><span>Refund destination</span><select name="destination" required><option value="original_method">Original payment method</option><option value="wallet">Patient wallet</option></select></label>` : `<label class="thp-admin-form-group"><span>Rejection reason</span><textarea name="reason" required minlength="2"></textarea></label>`}
        </div><p class="thp-commerce-form-error" data-commerce-error role="alert" hidden></p>
          <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-commerce-action="close-modal">Cancel</button><button type="submit" class="thp-admin-primary-button">${approve ? "Approve refund" : "Reject refund"}</button></footer>
        </form>
      </section></div>`;
  }
  if (state.modal.type === "wallet") {
    const row = state.wallets.find((item) => String(item.id) === String(state.modal.id));
    return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
      <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
        <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">EDIT PATIENT WALLET</p><h2 id="commerce-modal-title">${escape(row?.name || "")}</h2><p>Current balance ${money(row?.balance)}</p></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
        <form data-commerce-form="wallet"><div class="thp-admin-form-grid">
          <label class="thp-admin-form-group"><span>Adjustment</span><select name="direction" required><option value="credit" ${state.modal.direction === "credit" ? "selected" : ""}>Credit</option><option value="debit" ${state.modal.direction === "debit" ? "selected" : ""}>Debit</option></select></label>
          <label class="thp-admin-form-group"><span>Amount</span><input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label class="thp-admin-form-group"><span>Reason</span><textarea name="reason" required minlength="2"></textarea></label>
        </div><p class="thp-commerce-form-error" data-commerce-error role="alert" hidden></p>
          <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-commerce-action="close-modal">Cancel</button><button type="submit" class="thp-admin-primary-button">Save adjustment</button></footer>
        </form>
      </section></div>`;
  }
  const history = state.walletHistory;
  const rows = (history?.results || []).map((entry) => `<tr><td>${dateText(entry.date, true)}</td><td>${badge(entry.direction)}</td><td>${money(entry.amount)}</td><td>${money(entry.balance_after)}</td><td>${escape(entry.reason)}</td></tr>`).join("");
  return `<div class="thp-admin-modal" role="presentation"><div class="thp-admin-modal-backdrop" data-commerce-action="close-modal"></div>
    <section class="thp-admin-modal-card thp-commerce-modal" role="dialog" aria-modal="true" aria-labelledby="commerce-modal-title">
      <header class="thp-admin-modal-header"><div><p class="thp-admin-eyebrow">WALLET HISTORY</p><h2 id="commerce-modal-title">Balance ${money(history?.balance)}</h2></div><button class="thp-admin-modal-close" type="button" data-commerce-action="close-modal" aria-label="Close">×</button></header>
      ${table(["Date", "Type", "Amount", "Balance after", "Reason"], rows, "thp-commerce-modal-table")}
      <footer class="thp-admin-modal-footer"><button type="button" class="thp-admin-secondary-button" data-commerce-action="close-modal">Close</button></footer>
    </section></div>`;
}

function render() {
  if (!state.app || !window.location.hash.includes("/admin/orders-payments")) return;
  const tabButtons = tabs.map(([id, text]) => `<button type="button" role="tab" aria-selected="${state.tab === id}" class="thp-hr-tab ${state.tab === id ? "is-active" : ""}" data-commerce-tab="${id}">${escape(text)} <span class="thp-commerce-tab-count">${state.counts[id] ?? 0}</span></button>`).join("");
  const content = state.error
    ? `<section class="thp-admin-panel"><p class="thp-commerce-error" role="alert">${escape(state.error)}</p><button type="button" class="thp-admin-secondary-button" data-commerce-action="retry">Retry</button></section>`
    : state.loading
      ? `<section class="thp-admin-panel thp-commerce-loading" role="status">Loading orders and payment records…</section>`
      : state.tab === "orders"
        ? ordersTable()
        : state.tab === "transactions"
          ? transactionsTable()
          : state.tab === "refunds"
            ? refundsTable()
            : state.tab === "invoices"
              ? invoicesTable()
              : walletsTable();
  const currentRows = {
    orders: state.orders,
    transactions: state.transactions,
    refunds: state.refunds,
    invoices: state.invoices,
    wallets: state.wallets,
  }[state.tab] || [];
  const pageActions = `${can("create") ? `<button class="thp-admin-primary-button" type="button" data-commerce-action="new-transaction">+ Create transaction</button>` : ""}
    <button class="thp-admin-secondary-button" type="button" data-commerce-action="export" ${currentRows.length ? "" : "disabled"}>Export CSV</button>`;
  renderAdminLayout(state.app, "orders_payments", `
    <div class="thp-commerce-page">
      ${summaryCards()}
      <nav class="thp-hr-tabs thp-commerce-tabs" role="tablist" aria-label="Commerce sections">${tabButtons}</nav>
      <div class="thp-commerce-actions"><span>${state.loading ? "Refreshing…" : `Updated ${dateText(new Date().toISOString(), true)}`}</span><button type="button" class="thp-admin-secondary-button" data-commerce-action="refresh">Refresh data</button></div>
      ${content}
      ${modalMarkup()}
    </div>`, {
      subtitle: "Orders, payments, refunds, invoices and patient wallets from the live commerce records.",
      actions: pageActions,
    });
}

function exportCurrentTable() {
  const exports = {
    orders: {
      filename: "orders",
      columns: ["Order ID", "Type", "Patient", "Details", "Amount", "Payment status", "Order status", "Date"],
      rows: state.orders.map((row) => [row.order_number, row.type, row.patient_name, row.description, row.amount, row.payment_status, row.status, row.date]),
    },
    transactions: {
      filename: "transactions",
      columns: ["Transaction ID", "Order ID", "Order type", "Patient", "Kind", "Method", "Amount", "Status", "Date", "Note"],
      rows: state.transactions.map((row) => [row.reference, row.order_number || row.order_id, row.order_type, row.patient_name, row.kind, row.method, row.amount, row.status, row.date, row.note]),
    },
    refunds: {
      filename: "refunds",
      columns: ["Order", "Type", "Patient", "Amount", "Reason", "Status", "Destination", "Date"],
      rows: state.refunds.map((row) => [row.order_number || row.id, row.order_type, row.patient_name, row.amount, row.reason, row.status, row.destination, row.date]),
    },
    invoices: {
      filename: "invoices",
      columns: ["Invoice", "Order", "Type", "Patient", "Amount", "Date"],
      rows: state.invoices.map((row) => [row.invoice_number, row.order_number, row.type, row.patient_name, row.amount, row.date]),
    },
    wallets: {
      filename: "wallets",
      columns: ["Patient", "Phone", "Email", "Balance"],
      rows: state.wallets.map((row) => [row.name, row.phone, row.email, row.balance]),
    },
  };
  const data = exports[state.tab];
  if (!data?.rows.length) return;
  const csvValue = (value) => {
    const safe = String(value ?? "");
    return `"${( /^[=+\-@\t\r]/.test(safe) ? `'${safe}` : safe).replaceAll('"', '""')}"`;
  };
  const csv = [data.columns, ...data.rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tatito-commerce-${data.filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadData() {
  const requestId = (state.requestId || 0) + 1;
  state.requestId = requestId;
  state.loading = true;
  state.error = "";
  render();
  try {
    const filters = {
      type: state.filters.type,
      payment_status: state.filters.payment_status,
      date_from: state.filters.date_from,
      date_to: state.filters.date_to,
    };
    const transactionFilters = {
      type: state.filters.type,
      date_from: state.filters.date_from,
      date_to: state.filters.date_to,
    };
    const ordersFiltered = Object.values(filters).some(Boolean);
    const transactionsFiltered = Object.values(transactionFilters).some(Boolean);
    const [orders, transactions, refunds, invoices, wallets, plans, allOrders, allTransactions] = await Promise.all([
      getCommerceOrders(filters),
      getCommerceTransactions(transactionFilters),
      getCommerceRefunds(),
      getCommerceInvoices(),
      getCommerceWallets(),
      getCommercePlans(),
      ordersFiltered ? getCommerceOrders() : Promise.resolve(null),
      transactionsFiltered ? getCommerceTransactions() : Promise.resolve(null),
    ]);
    if (requestId !== state.requestId) return;
    state.orders = list(orders);
    state.transactions = list(transactions);
    state.refunds = list(refunds);
    state.invoices = list(invoices);
    state.wallets = list(wallets);
    state.plans = list(plans);
    state.counts = {
      orders: list(allOrders || orders).length,
      transactions: list(allTransactions || transactions).length,
      refunds: state.refunds.length,
      invoices: state.invoices.length,
      wallets: state.wallets.length,
    };
    state.summary = transactions?.summary || {};
    state.loading = false;
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.loading = false;
    state.error = apiMessage(error, "Unable to load commerce data.");
  }
  render();
}

function invoiceMarkup(order, details) {
  const lines = details.items || [];
  const adjustments = details.subtotal !== undefined
    ? `<tr><td colspan="2">Subtotal</td><td>${money(details.subtotal)}</td></tr><tr><td colspan="2">Tax</td><td>${money(details.tax)}</td></tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(order.invoice_number)}</title>
    <style>body{font:15px Arial,sans-serif;color:#15251e;margin:40px}header{display:flex;justify-content:space-between;border-bottom:2px solid #16886b;padding-bottom:18px}h1{color:#16886b}table{width:100%;border-collapse:collapse;margin:28px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #dce5e1}.total{text-align:right;font-size:20px;font-weight:700}@media print{button{display:none}}</style>
    </head><body><header><div><h1>Tatito Health+</h1><p>Tax invoice</p></div><div><strong>${escape(order.invoice_number)}</strong><br>${dateText(order.date)}</div></header>
    <p><strong>Bill to:</strong> ${escape(order.patient_name)}</p><p><strong>Order:</strong> ${escape(order.order_number)} · ${escape(label(order.type))}</p>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${lines.map((item) => `<tr><td>${escape(item.name)}</td><td>${escape(item.quantity)}</td><td>${money(item.amount)}</td></tr>`).join("")}${adjustments}</tbody></table>
    <p class="total">Total paid: ${money(order.amount)}</p><p>Payment status: Paid · Method: ${escape(label(order.payment_method))}</p><button onclick="window.print()">Print invoice</button></body></html>`;
}

async function openInvoice(order) {
  const popup = window.open("", "_blank");
  if (!popup) {
    toast("Allow pop-ups to open the invoice.");
    return;
  }
  try {
    const details = await getCommerceOrderDetail(order.type, order.id);
    popup.document.open();
    popup.document.write(invoiceMarkup(order, details));
    popup.document.close();
  } catch (error) {
    popup.close();
    toast(apiMessage(error, "Unable to open invoice."));
  }
}

async function handleClick(event) {
  const tab = event.target.closest("[data-commerce-tab]");
  if (tab) {
    state.tab = tab.dataset.commerceTab;
    state.error = "";
    render();
    return;
  }
  const buttonNode = event.target.closest("[data-commerce-action]");
  if (!buttonNode) return;
  const { commerceAction: action, id } = buttonNode.dataset;
  if (action === "close-modal") {
    state.modal = null;
    state.detail = null;
    state.walletHistory = null;
    render();
  } else if (action === "refresh" || action === "retry") {
    await loadData();
  } else if (action === "clear-filters") {
    state.filters = { type: "", payment_status: "", date_from: "", date_to: "" };
    await loadData();
  } else if (action === "new-transaction") {
    state.modal = { type: "transaction" };
    render();
  } else if (action === "export") {
    exportCurrentTable();
  } else if (action === "view-transaction") {
    state.modal = { type: "transaction-view", id };
    render();
  } else if (action === "edit-transaction") {
    const row = state.transactions.find((item) => String(item.id) === String(id));
    if (!row) return;
    state.modal = {
      type: "transaction-status",
      id,
      source: row.source || "commerce",
      sourceId: row.source === "pharmacy" ? row.order_id : row.id,
    };
    render();
  } else if (action === "view-refund") {
    state.modal = { type: "refund-view", id };
    render();
  } else if (action === "view-order") {
    state.loading = true;
    render();
    try {
      state.detail = await getCommerceOrderDetail(buttonNode.dataset.type, id);
    } catch (error) {
      state.error = apiMessage(error, "Unable to load order details.");
    } finally {
      state.loading = false;
      render();
    }
  } else if (action === "approve-refund" || action === "reject-refund") {
    const [source, refundId] = id.split("|");
    state.modal = {
      type: "refund",
      source,
      id: refundId,
      action: action === "approve-refund" ? "approve" : "reject",
    };
    render();
  } else if (action === "wallet-edit") {
    state.modal = { type: "wallet", id, direction: "credit" };
    render();
  } else if (action === "wallet-credit" || action === "wallet-debit") {
    state.modal = {
      type: "wallet",
      id,
      direction: action === "wallet-credit" ? "credit" : "debit",
    };
    render();
  } else if (action === "wallet-history") {
    try {
      state.walletHistory = await getCommerceWalletHistory(id);
      state.modal = { type: "history" };
      render();
    } catch (error) {
      toast(apiMessage(error, "Unable to load wallet history."));
    }
  } else if (action === "invoice") {
    const order = state.invoices.find((item) => item.id === id && item.type === buttonNode.dataset.type)
      || state.orders.find((item) => item.id === id && item.type === buttonNode.dataset.type);
    if (order) await openInvoice(order);
  } else if (action === "cancel-plan") {
    if (!window.confirm("Cancel this plan order? A paid order will enter the refund queue.")) return;
    try {
      await cancelCommercePlanOrder(id);
      toast("Plan order cancelled.");
      await loadData();
    } catch (error) {
      toast(apiMessage(error, "Unable to cancel plan order."));
    }
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("[data-commerce-form]");
  if (!form) return;
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  const errorNode = form.querySelector("[data-commerce-error]");
  submit.disabled = true;
  errorNode.hidden = true;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    if (form.dataset.commerceForm === "transaction") {
      values.amount = Number(values.amount);
      values.patient_id = values.patient_id || null;
      await createCommerceTransaction(values);
      toast("Pending transaction created.");
    } else if (form.dataset.commerceForm === "refund") {
      await reviewCommerceRefund(
        state.modal.source,
        state.modal.id,
        state.modal.action,
        values,
      );
      toast(state.modal.action === "approve" ? "Refund approved and recorded." : "Refund rejected.");
    } else if (form.dataset.commerceForm === "wallet") {
      values.amount = Number(values.amount);
      await adjustCommerceWallet(state.modal.id, values.direction, values);
      toast(`Wallet ${values.direction} completed.`);
    } else if (form.dataset.commerceForm === "transaction-status") {
      await setCommerceTransactionStatus(form.dataset.id, values.status, form.dataset.source);
      toast("Transaction status updated.");
    }
    state.modal = null;
    await loadData();
  } catch (error) {
    errorNode.textContent = apiMessage(error, "Unable to save changes.");
    errorNode.hidden = false;
    submit.disabled = false;
  }
}

function bindEvents(app) {
  state.events?.abort();
  state.events = new AbortController();
  const options = { signal: state.events.signal };
  app.addEventListener("click", (event) => void handleClick(event), options);
  app.addEventListener("submit", (event) => void handleSubmit(event), options);
  app.addEventListener("change", (event) => {
    const input = event.target.closest("[data-commerce-filter]");
    if (!input) return;
    state.filters[input.dataset.commerceFilter] = input.value;
    void loadData();
  }, options);
}

export async function renderAdminOrdersPayments(app) {
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
  if (!window.location.hash.startsWith("#/admin/orders-payments")) return;
  if (!can("view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }
  state.app = app;
  state.tab = new URLSearchParams(window.location.hash.split("?")[1] || "").get("tab") || "orders";
  if (!tabs.some(([id]) => id === state.tab)) state.tab = "orders";
  state.filters = { type: "", payment_status: "", date_from: "", date_to: "" };
  state.modal = null;
  state.detail = null;
  state.walletHistory = null;
  state.loading = true;
  state.error = "";
  bindEvents(app);
  render();
  await loadData();
}
