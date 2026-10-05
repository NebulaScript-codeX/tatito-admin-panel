import {
  actOnHealthPlanSubscription,
  addHealthPlanFamilyMember,
  createHealthPlanSubscription,
  deleteHealthPlan,
  getHealthPlanBenefitUsage,
  getHealthPlanCalculator,
  getHealthPlanFamilyMembers,
  getHealthPlanPatients,
  getHealthPlanRefunds,
  getHealthPlanSubscriptions,
  getHealthPlanSubscriptionHistory,
  getHealthPlans,
  reviewHealthPlanRefund,
  removeHealthPlanFamilyMember,
  saveHealthPlan,
  saveHealthPlanCalculator,
  updateHealthPlanFamilyMember,
} from "./adminApi.js";
import { hasPermission, isAdminAuthenticated, refreshAdminSession } from "./adminAuth.js";
import { escapeHtml } from "./adminChart.js";
import { renderAdminLayout } from "./adminLayout.js";
import "./adminOrdersPayments.css";
import "./adminHealthPlans.css";
import { formatINR } from "../currency.js";
import { calculatePlanSavings } from "../healthPlanCalculator.js";

const tabs = [
  ["plans", "Plans"],
  ["subscriptions", "Subscriptions"],
  ["usage", "Benefit usage"],
  ["calculator", "Savings calculator"],
  ["refunds", "Refunds"],
];
const state = {
  app: null,
  tab: "plans",
  plans: [],
  subscriptions: [],
  usage: [],
  patients: [],
  calculator: null,
  refunds: [],
  stats: {
    planCount: 0,
    activePlans: 0,
    subscriptionCount: 0,
    activeSubscriptions: 0,
    usageCount: 0,
    pendingRefunds: 0,
  },
  editing: null,
  viewingPlan: null,
  viewingSubscription: null,
  subscriptionHistory: [],
  subscriptionHistoryLoading: false,
  subscriptionViewTab: "details",
  subscriptionFilters: { search: "", status: "", plan: "" },
  managingFamily: null,
  editingFamilyMember: null,
  familyError: "",
  error: "",
  loading: true,
};
const can = (action) => hasPermission("health_plans", action);
const esc = (value) => escapeHtml(String(value ?? ""));
const money = formatINR;
const list = (value) => Array.isArray(value?.results) ? value.results : [];

function toast(message) {
  if (typeof window.thpShowToast === "function") window.thpShowToast(message);
}

async function load() {
  state.loading = true;
  state.error = "";
  render();
  try {
    const results = await Promise.all([
      getHealthPlans(),
      getHealthPlanSubscriptions(),
      getHealthPlanBenefitUsage(),
      getHealthPlanPatients(),
      getHealthPlanCalculator(),
      getHealthPlanRefunds(),
    ]);
    [state.plans, state.subscriptions, state.usage, state.patients] = results.slice(0, 4).map(list);
    state.calculator = results[4];
    state.refunds = list(results[5]);
    state.stats = {
      planCount: Number(results[0]?.count) || state.plans.length,
      activePlans: Number.isFinite(Number(results[0]?.active_count))
        ? Number(results[0].active_count)
        : state.plans.filter((plan) => plan.is_active).length,
      subscriptionCount: Number(results[1]?.count) || state.subscriptions.length,
      activeSubscriptions: Number.isFinite(Number(results[1]?.active_count))
        ? Number(results[1].active_count)
        : state.subscriptions.filter((sub) => (
          sub.status === "active"
          && sub.payment_status === "paid"
          && sub.starts_at
          && new Date(sub.starts_at) <= new Date()
          && sub.ends_at
          && new Date(sub.ends_at) > new Date()
        )).length,
      usageCount: Number(results[2]?.count) || state.usage.length,
      pendingRefunds: Number.isFinite(Number(results[5]?.pending_count))
        ? Number(results[5].pending_count)
        : state.refunds.filter((refund) => refund.status === "pending").length,
    };
    if (state.managingFamily) {
      const subscription = state.subscriptions.find(
        (sub) => String(sub.id) === String(state.managingFamily.id),
      );
      if (subscription) {
        try {
          const family = await getHealthPlanFamilyMembers(subscription.id);
          const familyLimit = Number(family.limit);
          state.managingFamily = {
            ...subscription,
            family_members: list(family),
            family_limit: Number.isInteger(familyLimit)
              ? familyLimit
              : Math.max((Number(subscription.maximum_family_members) || 1) - 1, 0),
          };
          state.familyError = "";
        } catch (error) {
          state.managingFamily = { ...subscription, family_members: [] };
          state.familyError = error?.message || "Unable to load family members.";
        }
      } else {
        state.managingFamily = null;
        state.familyError = "";
      }
    }
  } catch (error) {
    state.error = error?.message || "Unable to load Health Plans.";
  } finally {
    state.loading = false;
    render();
  }
}

function planForm() {
  if (!state.editing) return "";
  const plan = state.editing;
  const input = (name, label, value = "", type = "text", extra = "") => `
    <label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
  const benefits = plan.benefits || {};
  return `<form class="thp-hp-form" data-hp-form="plan">
    <input type="hidden" name="id" value="${esc(plan.id || "")}">
    <div class="thp-hp-form-heading"><div><span class="thp-admin-eyebrow">PLAN CATALOG</span><h2>${plan.id ? "Edit plan" : "Create plan"}</h2></div><button type="button" class="thp-admin-secondary-button" data-hp-action="close-form">Close</button></div>
    <div class="thp-hp-form-grid">
      ${input("name", "Plan name", plan.name)}
      ${input("code", "Website plan code", plan.code || "", "text", 'pattern="[a-z0-9-]+"')}
      ${input("tagline", "Tagline", plan.tagline)}
      ${input("badge", "Badge", plan.badge)}
      ${input("monthly_price", "Monthly price", plan.monthly_price, "number", 'min="0.01" step="0.01"')}
      ${input("annual_monthly_price", "Annual monthly price", plan.annual_monthly_price, "number", 'min="0.01" step="0.01"')}
      ${input("maximum_family_members", "Maximum family members (including subscriber)", plan.maximum_family_members ?? 1, "number", 'min="1" step="1"')}
      ${input("free_consultations_per_month", "Free consultations / month (blank = unlimited)", benefits.free_consultations_per_month ?? "", "number", 'min="0" step="1"')}
      ${input("pharmacy_discount_percent", "Pharmacy discount %", benefits.pharmacy_discount_percent ?? 0, "number", 'min="0" max="100" step="0.01"')}
      ${input("lab_discount_percent", "Lab discount %", benefits.lab_discount_percent ?? 0, "number", 'min="0" max="100" step="0.01"')}
      ${input("free_home_sample_count", "Free home samples / year", benefits.free_home_sample_count ?? 0, "number", 'min="0" step="1"')}
      ${input("annual_checkup_count", "Annual checkups", benefits.annual_checkup_count ?? 0, "number", 'min="0" step="1"')}
      ${input("ambulance_discount_percent", "Ambulance discount %", benefits.ambulance_discount_percent ?? 0, "number", 'min="0" max="100" step="0.01"')}
      ${input("color", "Card color", plan.color)}
      <label>Custom benefits (one per line)<textarea name="custom_benefits" rows="3">${esc((benefits.custom_benefits || []).join("\n"))}</textarea></label>
      <label>Exclusions (one per line)<textarea name="exclusions" rows="3">${esc((plan.exclusions || []).join("\n"))}</textarea></label>
      <label>Additional legacy features (one per line)<textarea name="features" rows="3">${esc((plan.legacy_features || []).join("\n"))}</textarea></label>
      <label class="thp-hp-check"><input type="checkbox" name="care_manager" ${benefits.care_manager ? "checked" : ""}> Care manager</label>
      <label class="thp-hp-check"><input type="checkbox" name="is_popular" ${plan.is_popular ? "checked" : ""}> Most popular</label>
      <label class="thp-hp-check"><input type="checkbox" name="is_active" ${plan.is_active !== false ? "checked" : ""}> Active on website</label>
    </div>
    <button class="thp-admin-primary-button" type="submit">Save plan</button>
  </form>`;
}

function planTable() {
  const rows = state.plans.map((plan) => `<tr>
    <td><strong>${esc(plan.name)}</strong><small>${esc(plan.code)} · ${esc(plan.tagline)}</small></td>
    <td>${money(plan.monthly_price)} / mo<br><small>${money(plan.annual_price)} / yr (${esc(plan.annual_saving_percent)}% saved)</small></td>
    <td>${Number(plan.subscribers) || 0}</td>
    <td><span class="thp-commerce-badge ${plan.is_active ? "is-good" : "is-neutral"}">${plan.is_active ? "Active" : "Inactive"}</span></td>
    <td class="thp-hp-actions">
      <button class="thp-admin-secondary-button" data-hp-action="view-plan" data-id="${esc(plan.id)}">View</button>
      ${can("edit") ? `<button class="thp-admin-secondary-button" data-hp-action="edit-plan" data-id="${esc(plan.id)}">Edit</button>
      <button class="thp-admin-secondary-button" data-hp-action="toggle-plan" data-id="${esc(plan.id)}">${plan.is_active ? "Deactivate" : "Activate"}</button>` : ""}
      ${can("delete") ? `<button class="thp-admin-secondary-button is-danger" data-hp-action="delete-plan" data-id="${esc(plan.id)}">Delete</button>` : ""}
    </td>
  </tr>`).join("");
  return `<section class="thp-admin-panel"><div class="thp-hp-section-head"><div><h2>Website plan catalog</h2><p>Changes are published to the shared Health Plans API.</p></div>${can("create") ? `<button class="thp-admin-primary-button" data-hp-action="new-plan">+ Add plan</button>` : ""}</div>
    ${table(["Plan", "Pricing", "Active subscribers", "Status", "Actions"], rows, "No plans are configured.")}</section>`;
}

function table(headers, rows, empty = "No records found.") {
  return `<div class="thp-hp-table-wrap"><table class="thp-commerce-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="thp-hp-empty">${empty}</td></tr>`}</tbody></table></div>`;
}

function subscriptionPanel() {
  const planOptions = state.plans.filter((plan) => plan.is_active).map((plan) => `<option value="${esc(plan.id)}">${esc(plan.name)}</option>`).join("");
  const filterPlanOptions = state.plans.map((plan) => `<option value="${esc(plan.id)}" ${String(state.subscriptionFilters.plan) === String(plan.id) ? "selected" : ""}>${esc(plan.name)}</option>`).join("");
  const subscriptionStatuses = [...new Set(state.subscriptions.map((sub) => sub.status))].sort();
  const patientOptions = state.patients.map((patient) => `<option value="${esc(patient.id)}">${esc(patient.name)} · ${esc(patient.id)}</option>`).join("");
  const form = can("create") ? `<form class="thp-hp-inline-form" data-hp-form="subscription">
    <strong>Create subscription + pending payment</strong>
    <select name="patient_id" required><option value="">Select patient</option>${patientOptions}</select>
    <select name="plan_id" required><option value="">Select plan</option>${planOptions}</select>
    <select name="billing_period"><option value="monthly">Monthly</option><option value="annual">Annual</option></select>
    <select name="payment_method"><option value="other">Other</option><option value="card">Card</option><option value="upi">UPI</option><option value="cash">Cash</option></select>
    <button class="thp-admin-primary-button" type="submit">Create</button>
  </form>` : "";
  const rows = state.subscriptions.map((sub) => `<tr data-subscription-search="${esc(`${sub.order_number} ${sub.patient_name} ${sub.patient_id} ${sub.plan_name}`.toLowerCase())}" data-subscription-status="${esc(sub.status)}" data-subscription-plan="${esc(sub.plan_id)}">
    <td><strong>${esc(sub.order_number)} · ${esc(sub.patient_name)}</strong><small>Subscription ID ${esc(sub.subscription_id ?? sub.id)} · Patient ID ${esc(sub.patient_id)}</small><small>${esc(sub.plan_name)} (${esc(sub.billing_period)}) · Created ${esc(new Date(sub.created_at).toLocaleString())}</small></td>
    <td>${money(sub.amount)} <small>INR (₹) · ${esc(sub.billing_period)}</small><small>Payment ${esc(sub.payment?.status || sub.payment_status)} · ${esc(sub.payment?.method || sub.payment_method || "—")}</small></td>
    <td>${esc(sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : "—")} – ${esc(sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : "—")}<small>${sub.renewal_of_id ? `Renewal of subscription ${esc(sub.renewal_of_id)}` : (sub.renewed_by_ids || []).length ? `Renewed by ${esc(sub.renewed_by_ids.join(", "))}` : "No linked renewal"}</small></td>
    <td>${esc(sub.status)} / ${esc(sub.payment_status)}<small>Payment order ${esc(sub.payment?.order_id || sub.id)}</small></td>
    <td>${Number(sub.family_member_count ?? (sub.family_members || []).length)} covered members<small>${(sub.family_members || []).map((member) => esc(member.name)).join(", ") || "None added"}</small></td>
    <td class="thp-hp-actions">
      <button class="thp-admin-secondary-button" data-hp-action="view-subscription" data-id="${esc(sub.id)}">Details</button>
      ${can("edit") && sub.status === "active" ? `<button class="thp-admin-secondary-button" data-hp-action="cancel-subscription" data-id="${esc(sub.id)}">Cancel</button>` : ""}
      ${can("edit") && !sub.is_archived && !sub.is_blocked && !sub.is_deactivated && ["expired", "cancelled"].includes(sub.status) ? `<button class="thp-admin-secondary-button" data-hp-action="renew-subscription" data-id="${esc(sub.id)}">Renew</button>` : ""}
      ${can("edit") && !sub.is_archived && !sub.is_blocked && !sub.is_deactivated && sub.status === "active" ? `<select class="thp-hp-row-select" aria-label="Replacement health plan">${planOptions}</select>
      <button class="thp-admin-secondary-button" data-hp-action="upgrade-subscription" data-id="${esc(sub.id)}">Upgrade</button>
      <button class="thp-admin-secondary-button" data-hp-action="downgrade-subscription" data-id="${esc(sub.id)}">Downgrade</button>` : ""}
      ${can("view") ? `<button class="thp-admin-secondary-button" data-hp-action="manage-family" data-id="${esc(sub.id)}">Family members (${Number(sub.family_member_count ?? (sub.family_members || []).length)})</button>` : ""}
      ${can("edit") ? `${sub.is_deactivated ? `<button class="thp-admin-secondary-button" data-hp-action="activate-subscription" data-id="${esc(sub.id)}">Activate</button>` : `<button class="thp-admin-secondary-button" data-hp-action="deactivate-subscription" data-id="${esc(sub.id)}">Deactivate</button>`}
      ${sub.is_blocked ? `<button class="thp-admin-secondary-button" data-hp-action="unblock-subscription" data-id="${esc(sub.id)}">Unblock</button>` : `<button class="thp-admin-secondary-button" data-hp-action="block-subscription" data-id="${esc(sub.id)}">Block</button>`}
      ${sub.is_archived ? `<button class="thp-admin-secondary-button" data-hp-action="restore-subscription" data-id="${esc(sub.id)}">Restore</button>` : `<button class="thp-admin-secondary-button is-danger" data-hp-action="archive-subscription" data-id="${esc(sub.id)}">Delete</button>`}` : ""}
    </td>
  </tr>`).join("");
  return `${form}<section class="thp-admin-panel"><div class="thp-hp-section-head"><div><h2>Patient subscriptions</h2><p>Orders and payment details are read from the shared Commerce ledger. Prices are INR.</p></div></div><div class="thp-hp-subscription-filters"><label>Search<input type="search" data-subscription-filter="search" value="${esc(state.subscriptionFilters.search)}" placeholder="Patient, plan or order"></label><label>Status<select data-subscription-filter="status"><option value="">All statuses</option>${subscriptionStatuses.map((status) => `<option value="${esc(status)}" ${state.subscriptionFilters.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select></label><label>Plan<select data-subscription-filter="plan"><option value="">All plans</option>${filterPlanOptions}</select></label><button class="thp-admin-secondary-button" data-hp-action="clear-subscription-filters">Clear filters</button></div>${table(["Subscription / patient", "Amount / payment", "Coverage term / renewal", "Status / order", "Family members", "Actions"], rows, "No subscriptions found.")}</section>`;
}

function usagePanel() {
  const rows = state.usage.map((item) => `<tr><td><strong>${esc(item.patient_name)}</strong><small>Subscription ${esc(item.subscription_id)} · ${esc(item.order_number)}</small></td><td>${esc(item.plan_name)}</td><td>${esc(item.benefit)}<small>${esc(item.benefit_code)} · Period ${esc(item.period_start)}</small></td><td>${esc(item.allowed ?? (item.limit == null ? "Unmetered" : item.limit))}</td><td>${esc(item.used ?? item.quantity)}</td><td>${item.remaining == null ? (item.status === "unlimited" ? "Unlimited" : "—") : esc(item.remaining)}</td><td><span class="thp-commerce-badge ${item.status === "exhausted" ? "is-refunded" : "is-good"}">${esc(item.status)}</span></td><td>${esc(item.detail || `${item.source_type} · ${item.source_id}`)}<small>${Number(item.event_count || 1)} event(s)</small></td><td>${esc(item.usage_date ? new Date(item.usage_date).toLocaleString() : "")}</td></tr>`).join("");
  return `<section class="thp-admin-panel"><div class="thp-hp-section-head"><div><h2>Benefit usage</h2><p>Allowed values come from each plan; used totals and usage dates come from subscription-linked events.</p></div></div>${table(["Patient / subscription", "Plan", "Benefit / period", "Allowed", "Used", "Remaining", "Status", "Latest source", "Usage date"], rows, "No benefit usage recorded.")}</section>`;
}

function calculatorPanel() {
  const config = state.calculator;
  if (!config) return `<section class="thp-admin-panel">Calculator configuration unavailable.</section>`;
  const fields = [
    ["doctor_visits_min", "Doctor visits minimum"], ["doctor_visits_max", "Doctor visits maximum"], ["doctor_visits_default", "Doctor visits default"],
    ["pharmacy_spend_min", "Pharmacy spend minimum"], ["pharmacy_spend_max", "Pharmacy spend maximum"], ["pharmacy_spend_step", "Pharmacy slider step"], ["pharmacy_spend_default", "Pharmacy spend default"],
    ["lab_spend_min", "Lab spend minimum"], ["lab_spend_max", "Lab spend maximum"], ["lab_spend_step", "Lab slider step"], ["lab_spend_default", "Lab spend default"], ["consultation_value", "Consultation value"],
  ];
  const plans = state.plans.filter((plan) => plan.is_active);
  const preferredPlan = plans.find((plan) => plan.is_popular) || plans[0];
  const planOptions = plans.map((plan) => `<option value="${esc(plan.id)}" ${plan.id === preferredPlan?.id ? "selected" : ""}>${esc(plan.name)}</option>`).join("");
  return `<section class="thp-admin-panel"><form class="thp-hp-form" data-hp-form="calculator"><div class="thp-hp-section-head"><div><h2>Savings calculator configuration</h2><p>These shared ranges, defaults and consultation value are served to the public Health Plans page.</p></div><button class="thp-admin-primary-button" type="submit" ${can("edit") ? "" : "disabled"}>Save calculator settings</button></div><div class="thp-hp-form-grid">${fields.map(([name, label]) => `<label>${label}${name === "consultation_value" ? " (INR / consultation)" : ""}<input type="number" name="${name}" value="${esc(config[name])}" min="${name === "consultation_value" ? "0.01" : "0"}" step="${name === "consultation_value" ? "0.01" : "1"}" required ${can("edit") ? "" : "disabled"}></label>`).join("")}</div></form></section>
  <section class="thp-admin-panel thp-hp-estimator"><div class="thp-hp-section-head"><div><h2>Website-matched savings estimate</h2><p>Uses the public calculator formula and active plan pricing/benefits.</p></div></div>${plans.length ? `<div class="thp-hp-estimator-controls"><label>Plan<select id="hp-estimate-plan" data-hp-calc-input>${planOptions}</select></label><label>Doctor consultations / month <output id="hp-estimate-visits-value">${esc(config.doctor_visits_default)}</output><input id="hp-estimate-visits" data-hp-calc-input type="range" min="${esc(config.doctor_visits_min)}" max="${esc(config.doctor_visits_max)}" step="1" value="${esc(config.doctor_visits_default)}"></label><label>Monthly pharmacy spend <output id="hp-estimate-pharmacy-value">${money(config.pharmacy_spend_default)}</output><input id="hp-estimate-pharmacy" data-hp-calc-input type="range" min="${esc(config.pharmacy_spend_min)}" max="${esc(config.pharmacy_spend_max)}" step="${esc(config.pharmacy_spend_step)}" value="${esc(config.pharmacy_spend_default)}"></label><label>Annual lab spend <output id="hp-estimate-lab-value">${money(config.lab_spend_default)}</output><input id="hp-estimate-lab" data-hp-calc-input type="range" min="${esc(config.lab_spend_min)}" max="${esc(config.lab_spend_max)}" step="${esc(config.lab_spend_step)}" value="${esc(config.lab_spend_default)}"></label></div><dl class="thp-hp-estimator-results"><div><dt>Eligible free consultations / year</dt><dd id="hp-estimate-eligible-visits">—</dd></div><div><dt>Consultation savings</dt><dd id="hp-estimate-consultation-savings">${money(0)}</dd></div><div><dt>Pharmacy savings</dt><dd id="hp-estimate-pharmacy-savings">${money(0)}</dd></div><div><dt>Lab savings</dt><dd id="hp-estimate-lab-savings">${money(0)}</dd></div><div><dt>Estimated benefit value</dt><dd id="hp-estimate-gross">${money(0)}</dd></div><div><dt>Annual plan cost</dt><dd id="hp-estimate-plan-cost">${money(0)}</dd></div><div class="is-net"><dt>Estimated net savings</dt><dd id="hp-estimate-net">${money(0)}</dd></div></dl><p class="thp-hp-estimator-note">Formula: eligible free consultations × 12 × configured consultation value, plus annualized pharmacy discount and annual lab discount, minus annual plan cost (minimum ₹0).</p>` : `<p class="thp-hp-empty">No active plans are available for an estimate.</p>`}</section>`;
}

function updateCalculatorEstimate() {
  const root = state.app;
  const config = state.calculator;
  if (!root || !config) return;
  const planId = root.querySelector("#hp-estimate-plan")?.value;
  const plan = state.plans.find((item) => String(item.id) === String(planId));
  if (!plan) return;
  const visits = Number(root.querySelector("#hp-estimate-visits")?.value || 0);
  const pharmacySpend = Number(root.querySelector("#hp-estimate-pharmacy")?.value || 0);
  const labSpend = Number(root.querySelector("#hp-estimate-lab")?.value || 0);
  const estimate = calculatePlanSavings(
    {
      annualPrice: Number(plan.annual_monthly_price),
      benefits: plan.benefits,
    },
    { doctorVisits: visits, pharmacySpend, labSpend },
    config.consultation_value,
  );
  const output = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };
  output("#hp-estimate-visits-value", String(visits));
  output("#hp-estimate-pharmacy-value", money(pharmacySpend));
  output("#hp-estimate-lab-value", money(labSpend));
  output("#hp-estimate-eligible-visits", String(estimate.eligibleVisits * 12));
  output("#hp-estimate-consultation-savings", money(estimate.consultationSavings));
  output("#hp-estimate-pharmacy-savings", money(estimate.pharmacySavings));
  output("#hp-estimate-lab-savings", money(estimate.labSavings));
  output("#hp-estimate-gross", money(Math.round(estimate.grossSavings)));
  output("#hp-estimate-plan-cost", money(estimate.annualPlanCost));
  output("#hp-estimate-net", money(estimate.netSavings));
}

function refundPanel() {
  const rows = state.refunds.map((refund) => `<tr><td><strong>Refund ${esc(refund.id)}</strong><small>Payment transaction ${esc(refund.payment_transaction_id)} · ${esc(refund.payment_reference)}</small></td><td>${esc(refund.patient_name)}</td><td>${esc(refund.order_number)} · ${esc(refund.plan_name)}<small>Subscription ${esc(refund.subscription_id)} · Order ${esc(refund.payment_order_id)}</small></td><td>${money(refund.amount)}<small>INR (₹)</small></td><td>${esc(refund.reason || "—")}</td><td>${esc(refund.status)}<small>${refund.destination ? `Destination: ${esc(refund.destination)}` : ""}</small></td><td>${esc(refund.payment_method)} · payment ${esc(refund.payment_status)}<small>${(refund.refund_transactions || []).map((entry) => `${esc(entry.reference)} (${esc(entry.status)} · ${esc(entry.method)})`).join(", ") || "No refund transaction recorded"}</small></td><td>${esc(new Date(refund.requested_at || refund.date).toLocaleString())}<small>${refund.reviewed_at ? `Processed ${esc(new Date(refund.reviewed_at).toLocaleString())} by ${esc(refund.reviewed_by || "admin")}` : "Not processed"}</small></td><td>${refund.status === "pending" && can("edit") ? `<button class="thp-admin-primary-button" data-hp-action="approve-refund" data-id="${esc(refund.id)}">Approve to wallet</button><button class="thp-admin-secondary-button" data-hp-action="reject-refund" data-id="${esc(refund.id)}">Reject</button>` : esc(refund.rejection_reason || "—")}</td></tr>`).join("");
  return `<section class="thp-admin-panel"><div class="thp-hp-section-head"><div><h2>30-day refund requests</h2><p>Refund request and payment transaction data are read from the shared Commerce ledger.</p></div></div>${table(["Refund / payment IDs", "Patient", "Order / subscription", "Refund amount", "Reason", "Status / destination", "Payment / refund transactions", "Requested / processed", "Actions"], rows, "No plan refund requests.")}</section>`;
}

function planDetails() {
  const plan = state.viewingPlan;
  if (!plan) return "";
  const benefits = plan.benefits || {};
  const lines = [
    ["Free consultations / month", benefits.free_consultations_per_month == null ? "Unlimited" : benefits.free_consultations_per_month],
    ["Pharmacy discount", `${benefits.pharmacy_discount_percent || 0}%`],
    ["Lab discount", `${benefits.lab_discount_percent || 0}%`],
    ["Free home samples / year", benefits.free_home_sample_count || 0],
    ["Annual checkups", benefits.annual_checkup_count || 0],
    ["Ambulance discount", `${benefits.ambulance_discount_percent || 0}%`],
    ["Care manager", benefits.care_manager ? "Included" : "Not included"],
    ["Maximum family members", plan.maximum_family_members],
  ];
  return `<div class="thp-hp-dialog-backdrop"><section class="thp-hp-dialog" role="dialog" aria-modal="true" aria-labelledby="hp-plan-detail-title"><div class="thp-hp-section-head"><div><span class="thp-admin-eyebrow">WEBSITE CATALOG</span><h2 id="hp-plan-detail-title">${esc(plan.name)}</h2></div><button class="thp-admin-secondary-button" data-hp-action="close-plan-view">Close</button></div><p>${esc(plan.tagline)}</p><p><strong>${money(plan.monthly_price)} / month</strong> · ${money(plan.annual_price)} / year · ${esc(plan.annual_saving_percent)}% annual saving</p><dl class="thp-hp-detail-list">${lines.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl><h3>Included details</h3><ul>${(plan.features || []).map((line) => `<li>${esc(line)}</li>`).join("")}</ul>${(plan.exclusions || []).length ? `<h3>Exclusions</h3><ul>${plan.exclusions.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}</section></div>`;
}

function subscriptionDetails() {
  const sub = state.viewingSubscription;
  if (!sub) return "";
  const historyRows = state.subscriptionHistory.map((entry) => {
    const snapshot = entry.snapshot || {};
    const details = snapshot.after || snapshot.requested || snapshot.before || snapshot.subscription || snapshot;
    const previous = snapshot.before;
    const currentPlan = details.plan_name || details.plan_id || "—";
    const plan = previous && (previous.plan_name || previous.plan_id) !== currentPlan
      ? `${previous.plan_name || previous.plan_id} → ${currentPlan}`
      : currentPlan;
    const stateText = (value, paymentStatus) => [
      value?.status,
      paymentStatus || value?.payment_status,
      value?.is_deactivated ? "deactivated" : "",
      value?.is_blocked ? "blocked" : "",
      value?.is_archived ? "archived" : "",
    ].filter(Boolean).join(" / ") || "—";
    const finalStatus = stateText(details, snapshot.payment_status);
    const priorStatus = previous ? stateText(previous) : "";
    const status = previous && priorStatus !== finalStatus
      ? `${priorStatus} → ${finalStatus}`
      : finalStatus;
    const coverage = snapshot.after || snapshot.before || snapshot.subscription || details;
    const coveredPeriod = coverage.starts_at || coverage.ends_at
      ? `${coverage.starts_at ? new Date(coverage.starts_at).toLocaleDateString() : "—"} – ${coverage.ends_at ? new Date(coverage.ends_at).toLocaleDateString() : "—"}`
      : "—";
    const amount = details.amount ?? previous?.amount;
    const transactionId = snapshot.transaction_id || details.transaction_id || snapshot.transaction_reference || details.transaction_reference || "—";
    const orderId = snapshot.order_id || details.order_id || details.order_number || "—";
    return `<tr><td>${esc(entry.event_type)}</td><td>${esc(plan)}</td><td>${amount == null ? "—" : money(amount)}<small>INR (₹)</small></td><td>${esc(details.billing_period || previous?.billing_period || "—")}</td><td>${esc(status)}</td><td>${esc(snapshot.payment_method || details.payment_method || details.method || "—")}</td><td>${esc(transactionId)}<small>Order ${esc(orderId)}</small></td><td>${esc(coveredPeriod)}<small>${esc(new Date(entry.created_at).toLocaleString())}</small></td></tr>`;
  }).join("");
  const transactions = sub.transactions || [];
  const details = `<dl class="thp-hp-detail-list"><div><dt>Patient / plan IDs</dt><dd>${esc(sub.patient_id)} · Plan ${esc(sub.plan_id)}</dd></div><div><dt>Amount / currency</dt><dd>${money(sub.amount)} · INR (₹)</dd></div><div><dt>Billing period</dt><dd>${esc(sub.billing_period)}</dd></div><div><dt>Subscription / payment status</dt><dd>${esc(sub.status)} · ${esc(sub.payment_status)}</dd></div><div><dt>Payment method</dt><dd>${esc(sub.payment?.method || sub.payment_method || "—")}</dd></div><div><dt>Latest transaction</dt><dd>${sub.payment ? `#${esc(sub.payment.transaction_id || sub.payment.id)} · ${esc(sub.payment.reference)} · order ${esc(sub.payment.order_id)}` : "No payment transaction"}</dd></div><div><dt>Transaction date</dt><dd>${sub.payment?.created_at ? esc(new Date(sub.payment.created_at).toLocaleString()) : "—"}</dd></div><div><dt>Start / end dates</dt><dd>${esc(sub.starts_at ? new Date(sub.starts_at).toLocaleString() : "Not started")} – ${esc(sub.ends_at ? new Date(sub.ends_at).toLocaleString() : "—")}</dd></div><div><dt>Family members</dt><dd>${Number(sub.family_member_count ?? (sub.family_members || []).length)} of ${Math.max(0, Number(sub.maximum_family_members || 1) - 1)} additional covered members</dd></div><div><dt>Created / updated</dt><dd>${esc(new Date(sub.created_at).toLocaleString())} · ${esc(new Date(sub.updated_at || sub.created_at).toLocaleString())}</dd></div><div><dt>Refund</dt><dd>${sub.refund ? `${esc(sub.refund.status)} · ${money(sub.refund.amount)} · ${esc(sub.refund.reason || "—")} · ${esc(sub.refund.destination || "destination not recorded")} · ${sub.refund.reviewed_at ? esc(new Date(sub.refund.reviewed_at).toLocaleString()) : "not reviewed"}` : "No refund request"}</dd></div></dl><h3>Payment / transaction ledger</h3>${transactions.length ? `<ul class="thp-hp-transaction-list">${transactions.map((entry) => `<li><span><strong>${esc(entry.kind)} · #${esc(entry.transaction_id)}</strong><small>${esc(entry.reference)} · Order ${esc(entry.order_id)} · ${esc(entry.status)} · ${esc(entry.method)} · ${esc(new Date(entry.created_at).toLocaleString())}</small></span><strong>${money(entry.amount)}</strong></li>`).join("")}</ul>` : "<p>No ledger transactions are linked to this subscription.</p>"}<h3>Benefit usage</h3><ul>${(sub.usage || []).map((item) => `<li>${esc(item.label)}: ${esc(item.used)} / ${esc(item.allowed ?? (item.limit == null ? "Unlimited" : item.limit))} used${item.remaining == null ? "" : ` · ${esc(item.remaining)} remaining`}</li>`).join("")}</ul>`;
  const history = state.subscriptionHistoryLoading
    ? `<p class="thp-commerce-loading">Loading subscription history…</p>`
    : table(["Event", "Plan", "Amount", "Period", "Subscription / payment status", "Payment method", "Transaction / order ID", "Coverage / date"], historyRows, "No subscription history recorded.");
  return `<div class="thp-hp-dialog-backdrop"><section class="thp-hp-dialog thp-hp-history-dialog" role="dialog" aria-modal="true" aria-labelledby="hp-subscription-detail-title"><div class="thp-hp-section-head"><div><span class="thp-admin-eyebrow">SUBSCRIPTION ${esc(sub.subscription_id ?? sub.id)} · ${esc(sub.order_number)}</span><h2 id="hp-subscription-detail-title">${esc(sub.patient_name)} · ${esc(sub.plan_name)}</h2></div><button class="thp-admin-secondary-button" data-hp-action="close-subscription-view">Close</button></div><nav class="thp-hr-tabs" role="tablist" aria-label="Subscription details"><button type="button" role="tab" aria-selected="${state.subscriptionViewTab === "details"}" class="thp-hr-tab ${state.subscriptionViewTab === "details" ? "is-active" : ""}" data-subscription-view-tab="details">Details</button><button type="button" role="tab" aria-selected="${state.subscriptionViewTab === "history"}" class="thp-hr-tab ${state.subscriptionViewTab === "history" ? "is-active" : ""}" data-subscription-view-tab="history">History</button></nav>${state.subscriptionViewTab === "history" ? history : details}</section></div>`;
}

function familyDialog() {
  const sub = state.managingFamily;
  if (!sub) return "";
  const members = sub.family_members || [];
  const limit = Number.isFinite(sub.family_limit)
    ? sub.family_limit
    : Math.max((Number(sub.maximum_family_members) || 1) - 1, 0);
  const edit = state.editingFamilyMember;
  const addBlocked = !edit && members.length >= limit;
  const fields = (field, label, value = "") => `<label>${label}<input name="${field}" value="${esc(value)}" ${field === "name" ? 'required maxlength="160"' : field === "relationship" ? 'maxlength="60"' : 'type="email" maxlength="254"'} ${addBlocked ? "disabled" : ""}></label>`;
  return `
    <div class="thp-hp-dialog-backdrop">
      <section class="thp-hp-dialog thp-hp-family-dialog" role="dialog" aria-modal="true" aria-labelledby="hp-family-title">
        <header class="thp-hp-family-header">
          <div>
            <span class="thp-admin-eyebrow">${esc(sub.order_number)} · Subscription ${esc(sub.id)}</span>
            <h2 id="hp-family-title">${esc(sub.patient_name)} · Family members</h2>
            <p>Patient ${esc(sub.patient_id)} · ${members.length} of ${limit} additional covered members</p>
          </div>
          <button class="thp-admin-secondary-button thp-hp-family-close" data-hp-action="close-family">Close</button>
        </header>
        ${state.familyError
          ? `<p class="thp-commerce-error" role="alert">${esc(state.familyError)}</p>`
          : `
            ${members.length
              ? `<ul class="thp-hp-family-list">${members.map((member) => `
                  <li>
                    <div class="thp-hp-family-member-grid">
                      <div><span>Name</span><strong>${esc(member.name)}</strong></div>
                      <div><span>Relationship</span><strong>${esc(member.relationship || "—")}</strong></div>
                      <div><span>Email</span><strong>${esc(member.email || "—")}</strong></div>
                      <span class="thp-hp-family-status ${member.platform_user_id ? "is-linked" : ""}">${member.platform_user_id ? "Linked account" : "Not linked"}</span>
                    </div>
                    ${can("edit") ? `<div class="thp-hp-family-actions">
                      <button class="thp-admin-secondary-button" data-hp-action="edit-family-member" data-member-id="${esc(member.id)}">Edit</button>
                      <button class="thp-admin-secondary-button is-danger" data-hp-action="remove-family" data-id="${esc(sub.id)}" data-member-id="${esc(member.id)}">Remove</button>
                    </div>` : ""}
                  </li>`).join("")}</ul>`
              : `<p class="thp-hp-family-empty">No family members are linked to this subscription.</p>`}
            ${can("edit")
              ? `<form class="thp-hp-form thp-hp-family-form" data-hp-form="family-member">
                  <input type="hidden" name="id" value="${esc(edit?.id || "")}">
                  ${fields("name", "Name", edit?.name)}
                  ${fields("relationship", "Relationship", edit?.relationship)}
                  ${fields("email", "Email", edit?.email)}
                  <div class="thp-hp-family-form-actions">
                      <button type="submit" class="thp-admin-primary-button" ${addBlocked ? "disabled" : ""}>${edit ? "Save member" : "Add member"}</button>
                    ${edit ? `<button type="button" class="thp-admin-secondary-button" data-hp-action="cancel-family-edit">Cancel</button>` : ""}
                  </div>
                </form>`
                : ""}
            ${can("edit") && addBlocked
                ? `<p class="thp-hp-family-limit-note">${limit === 0
                  ? "This plan covers only the subscriber. These fields are disabled because no additional family members are allowed."
                  : `The family-member limit of ${limit} has been reached. Remove a member or increase the plan limit to add another.`}</p>`
                : ""}
          `}
      </section>
    </div>`;
}

function render() {
  if (!state.app || !window.location.hash.includes("/admin/health-plans")) return;
  const tabCounts = {
    plans: state.stats.planCount,
    subscriptions: `${state.stats.activeSubscriptions}/${state.stats.subscriptionCount}`,
    usage: state.stats.usageCount,
    refunds: state.stats.pendingRefunds,
  };
  const tabsMarkup = tabs.map(([key, text]) => `<button type="button" role="tab" aria-selected="${state.tab === key}" class="thp-hr-tab ${state.tab === key ? "is-active" : ""}" data-hp-tab="${key}">${text}${tabCounts[key] === undefined ? "" : `<span class="thp-hp-tab-count">${tabCounts[key]}</span>`}</button>`).join("");
  const content = state.error
    ? `<section class="thp-admin-panel"><p class="thp-commerce-error" role="alert">${esc(state.error)}</p><button class="thp-admin-secondary-button" data-hp-action="refresh">Retry</button></section>`
    : state.loading
      ? `<section class="thp-admin-panel thp-commerce-loading">Loading Health Plans data…</section>`
      : state.tab === "plans"
        ? `${planForm()}${planTable()}`
        : state.tab === "subscriptions"
          ? subscriptionPanel()
          : state.tab === "usage"
            ? usagePanel()
            : state.tab === "calculator"
              ? calculatorPanel()
              : refundPanel();
  renderAdminLayout(state.app, "health_plans", `
    <div class="thp-commerce-page thp-health-plans-page">
      <section class="thp-commerce-summary" aria-label="Health Plans summary">
        <article class="is-collected"><span>Website plans</span><strong>${state.stats.planCount}</strong><small>${state.stats.activePlans} active</small></article>
        <article class="is-pending"><span>Active subscribers</span><strong>${state.stats.activeSubscriptions}</strong></article>
        <article class="is-refunded"><span>Pending refunds</span><strong>${state.stats.pendingRefunds}</strong></article>
      </section>
      <nav class="thp-hr-tabs thp-commerce-tabs" role="tablist" aria-label="Health Plans sections">${tabsMarkup}</nav>
      <div class="thp-commerce-actions"><button class="thp-admin-secondary-button" data-hp-action="refresh">Refresh data</button></div>
      ${content}${planDetails()}${subscriptionDetails()}${familyDialog()}
    </div>`, {
      subtitle: "Manage the shared website plan catalog, subscriptions, benefit usage, calculator and refunds.",
      actions: state.tab === "plans" && can("create") ? `<button class="thp-admin-primary-button" data-hp-action="new-plan">+ Add plan</button>` : "",
    });
  updateCalculatorEstimate();
    applySubscriptionFilters();
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function planPayload(form) {
  const values = formObject(form);
  const payload = {
    code: values.code.trim().toLowerCase(),
    name: values.name.trim(),
    tagline: values.tagline.trim(),
    badge: values.badge.trim(),
    color: values.color.trim(),
    monthly_price: values.monthly_price,
    annual_monthly_price: values.annual_monthly_price,
    maximum_family_members: Number(values.maximum_family_members),
    free_consultations_per_month: values.free_consultations_per_month === "" ? null : Number(values.free_consultations_per_month),
    pharmacy_discount_percent: values.pharmacy_discount_percent,
    lab_discount_percent: values.lab_discount_percent,
    free_home_sample_count: Number(values.free_home_sample_count),
    annual_checkup_count: Number(values.annual_checkup_count),
    ambulance_discount_percent: values.ambulance_discount_percent,
    care_manager: form.elements.care_manager.checked,
    is_popular: form.elements.is_popular.checked,
    is_active: form.elements.is_active.checked,
    custom_benefits: values.custom_benefits.split("\n").map((line) => line.trim()).filter(Boolean),
    exclusions: values.exclusions.split("\n").map((line) => line.trim()).filter(Boolean),
    features: values.features.split("\n").map((line) => line.trim()).filter(Boolean),
  };
  return payload;
}

function applySubscriptionFilters() {
  const root = state.app;
  if (!root) return;
  const query = state.subscriptionFilters.search.trim().toLowerCase();
  root.querySelectorAll("[data-subscription-search]").forEach((row) => {
    const matches = (!query || row.dataset.subscriptionSearch.includes(query))
      && (!state.subscriptionFilters.status || row.dataset.subscriptionStatus === state.subscriptionFilters.status)
      && (!state.subscriptionFilters.plan || row.dataset.subscriptionPlan === state.subscriptionFilters.plan);
    row.hidden = !matches;
  });
}

async function clickAction(action, id, planId = "", memberId = "") {
  try {
    if (action === "refresh") return await load();
    if (action === "new-plan") {
      if (!can("create")) return;
      state.editing = {};
      render();
      return;
    }
    if (action === "close-form") {
      state.editing = null;
      render();
      return;
    }
    if (action === "view-plan") {
      state.viewingPlan = state.plans.find((plan) => String(plan.id) === String(id)) || null;
      render();
      return;
    }
    if (action === "close-plan-view") {
      state.viewingPlan = null;
      render();
      return;
    }
    if (action === "view-subscription") {
      state.viewingSubscription = state.subscriptions.find((sub) => String(sub.id) === String(id)) || null;
      state.subscriptionViewTab = "details";
      state.subscriptionHistory = [];
      state.subscriptionHistoryLoading = false;
      render();
      return;
    }
    if (action === "history-subscription") {
      state.viewingSubscription = state.subscriptions.find((sub) => String(sub.id) === String(id)) || null;
      state.subscriptionViewTab = "history";
      if (!state.viewingSubscription) return;
      state.subscriptionHistory = [];
      state.subscriptionHistoryLoading = true;
      render();
      const result = await getHealthPlanSubscriptionHistory(id);
      state.subscriptionHistory = list(result);
      state.subscriptionHistoryLoading = false;
      render();
      return;
    }
    if (action === "close-subscription-view") {
      state.viewingSubscription = null;
      state.subscriptionHistory = [];
      state.subscriptionHistoryLoading = false;
      render();
      return;
    }
    if (action === "clear-subscription-filters") {
      state.subscriptionFilters = { search: "", status: "", plan: "" };
      render();
      return;
    }
    if (action === "close-family") {
      state.managingFamily = null;
      state.editingFamilyMember = null;
      state.familyError = "";
      render();
      return;
    }
    if (action === "cancel-family-edit") {
      state.editingFamilyMember = null;
      render();
      return;
    }
    if (action === "edit-family-member") {
      state.editingFamilyMember = (state.managingFamily?.family_members || []).find(
        (member) => String(member.id) === String(memberId),
      ) || null;
      render();
      return;
    }
    if (action === "edit-plan") {
      if (!can("edit")) return;
      state.editing = state.plans.find((plan) => String(plan.id) === String(id));
      render();
      return;
    }
    if (action === "toggle-plan") {
      const plan = state.plans.find((row) => String(row.id) === String(id));
      if (!plan) return;
      await saveHealthPlan({ is_active: !plan.is_active }, plan.id);
      toast(`Plan ${plan.is_active ? "deactivated" : "activated"} on the website.`);
    } else if (action === "delete-plan") {
      if (!window.confirm("Delete this plan? Plans with active subscribers cannot be deleted.")) return;
      await deleteHealthPlan(id);
      toast("Plan deleted.");
    } else if (action === "cancel-subscription") {
      if (!window.confirm("Cancel this subscription?")) return;
      await actOnHealthPlanSubscription(id, { action: "cancel" });
      toast("Subscription cancelled.");
    } else if (action === "renew-subscription") {
      await actOnHealthPlanSubscription(id, { action: "renew" });
      toast("Renewal payment created for the existing subscription.");
    } else if (action === "upgrade-subscription" || action === "downgrade-subscription") {
      if (!planId) {
        toast("Choose a replacement plan first.");
        return;
      }
      await actOnHealthPlanSubscription(id, {
        action: action === "upgrade-subscription" ? "upgrade" : "downgrade",
        plan_id: planId,
      });
      toast("Plan change created. Payment is pending confirmation.");
    } else if (action === "deactivate-subscription" || action === "activate-subscription"
      || action === "block-subscription" || action === "unblock-subscription"
      || action === "archive-subscription" || action === "restore-subscription") {
      const actionByButton = {
        "deactivate-subscription": "deactivate",
        "activate-subscription": "activate",
        "block-subscription": "block",
        "unblock-subscription": "unblock",
        "archive-subscription": "archive",
        "restore-subscription": "restore",
      };
      const lifecycleAction = actionByButton[action];
      const confirmation = {
        deactivate: "Deactivate this subscription? It will no longer provide benefits.",
        activate: "Activate this subscription?",
        block: "Block this subscription? The patient cannot use or renew it.",
        unblock: "Unblock this subscription?",
        archive: "Delete this subscription from the active list? It will be archived and its history retained.",
        restore: "Restore this archived subscription to the active list?",
      }[lifecycleAction];
      if (!window.confirm(confirmation)) return;
      await actOnHealthPlanSubscription(id, { action: lifecycleAction });
      const completedVerb = {
        deactivate: "deactivated",
        activate: "activated",
        block: "blocked",
        unblock: "unblocked",
        archive: "archived",
        restore: "restored",
      }[lifecycleAction];
      toast(`Subscription ${completedVerb}.`);
    } else if (action === "manage-family") {
      const subscription = state.subscriptions.find((sub) => String(sub.id) === String(id));
      if (!subscription) return;
      const result = await getHealthPlanFamilyMembers(id);
      const familyLimit = Number(result.limit);
      state.managingFamily = {
        ...subscription,
        family_members: list(result),
        family_limit: Number.isInteger(familyLimit)
          ? familyLimit
          : Math.max((Number(subscription.maximum_family_members) || 1) - 1, 0),
      };
      state.editingFamilyMember = null;
      state.familyError = "";
      render();
      return;
    } else if (action === "remove-family") {
      if (!window.confirm("Remove this family member from the subscription?")) return;
      await removeHealthPlanFamilyMember(id, memberId);
      toast("Family member removed.");
      state.editingFamilyMember = null;
    } else if (action === "approve-refund") {
      if (!window.confirm("Approve this refund and credit the patient wallet?")) return;
      await reviewHealthPlanRefund(id, "approve");
      toast("Refund approved and wallet credited.");
    } else if (action === "reject-refund") {
      const reason = window.prompt("Reason for rejecting the refund:");
      if (!reason?.trim()) return;
      await reviewHealthPlanRefund(id, "reject", reason.trim());
      toast("Refund rejected.");
    }
    await load();
  } catch (error) {
    if (action === "history-subscription") {
      state.subscriptionHistoryLoading = false;
      render();
    }
    toast(error?.message || "Health Plans action failed.");
  }
}

async function submit(event) {
  const form = event.target.closest("form[data-hp-form]");
  if (!form) return;
  event.preventDefault();
  try {
    if (form.dataset.hpForm === "plan") {
      const id = form.elements.id.value;
      await saveHealthPlan(planPayload(form), id || null);
      state.editing = null;
      toast(id ? "Plan updated on the website." : "Plan created on the website.");
    } else if (form.dataset.hpForm === "subscription") {
      await createHealthPlanSubscription(formObject(form));
      toast("Subscription created with pending payment.");
    } else if (form.dataset.hpForm === "family-member") {
      if (!state.managingFamily) return;
      const values = formObject(form);
      const memberId = values.id;
      const payload = {
        name: values.name.trim(),
        relationship: values.relationship.trim(),
        email: values.email.trim(),
      };
      if (memberId) {
        await updateHealthPlanFamilyMember(state.managingFamily.id, memberId, payload);
        toast("Family member updated.");
      } else {
        await addHealthPlanFamilyMember(state.managingFamily.id, payload);
        toast("Family member added.");
      }
      state.editingFamilyMember = null;
    } else if (form.dataset.hpForm === "calculator") {
      const values = formObject(form);
      Object.keys(values).forEach((key) => {
        values[key] = key === "consultation_value" ? values[key] : Number(values[key]);
      });
      await saveHealthPlanCalculator(values);
      toast("Savings calculator settings updated.");
    }
    await load();
  } catch (error) {
    toast(error?.message || "Unable to save Health Plans changes.");
  }
}

export async function renderAdminHealthPlans(app) {
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
  if (!hasPermission("health_plans", "view")) {
    window.location.hash = "#/admin/access-denied";
    return;
  }
  state.app = app;
  state.tab = new URLSearchParams(window.location.hash.split("?")[1] || "").get("tab") || state.tab;
  state.tab = tabs.some(([tab]) => tab === state.tab) ? state.tab : "plans";
  if (!state.events) {
    state.events = {
      click: (event) => {
        if (event.target.classList?.contains("thp-hp-dialog-backdrop")) {
          if (state.viewingPlan) state.viewingPlan = null;
          else if (state.viewingSubscription) state.viewingSubscription = null;
          else {
            state.managingFamily = null;
            state.editingFamilyMember = null;
          }
          render();
          return;
        }
        const tab = event.target.closest("[data-hp-tab]");
        if (tab) {
          state.tab = tab.dataset.hpTab;
          render();
          return;
        }
        const subscriptionTab = event.target.closest("[data-subscription-view-tab]");
        if (subscriptionTab) {
          const nextTab = subscriptionTab.dataset.subscriptionViewTab;
          if (nextTab === "history" && state.viewingSubscription) {
            void clickAction("history-subscription", state.viewingSubscription.id);
          } else {
            state.subscriptionViewTab = nextTab;
            render();
          }
          return;
        }
        const button = event.target.closest("[data-hp-action]");
        if (button) {
          const selectedPlan = button.closest("tr")?.querySelector(".thp-hp-row-select")?.value || "";
          void clickAction(button.dataset.hpAction, button.dataset.id, selectedPlan, button.dataset.memberId || "");
        }
      },
      input: (event) => {
        if (event.target.closest("[data-hp-calc-input]")) updateCalculatorEstimate();
        if (event.target.matches("[data-subscription-filter='search']")) {
          state.subscriptionFilters.search = event.target.value;
          applySubscriptionFilters();
        }
      },
      change: (event) => {
        if (event.target.closest("[data-hp-calc-input]")) updateCalculatorEstimate();
        const filter = event.target.closest("[data-subscription-filter]");
        if (filter && filter.dataset.subscriptionFilter !== "search") {
          state.subscriptionFilters[filter.dataset.subscriptionFilter] = filter.value;
          applySubscriptionFilters();
        }
      },
      submit,
    };
    app.addEventListener("click", state.events.click);
    app.addEventListener("input", state.events.input);
    app.addEventListener("change", state.events.change);
    app.addEventListener("submit", state.events.submit);
  }
  await load();
}
