import "./style.css";
import {
  renderAdminLogin,
  renderAdminDashboard,
  renderAdminStaff,
  renderAdminAccessDenied,
  renderAdminUsers,
  renderAdminProviders,
  renderAdminPromotions,
  renderAdminCouponsOffersMarketing,
  renderAdminModulePlaceholder,
} from "./admin/adminPages.js";
import { renderAdminHealthPlans } from "./admin/adminHealthPlans.js";
import { renderAdminDoctors } from "./admin/adminDoctors.js";
import { renderAdminHealthRecords } from "./admin/healthRecordsPage.js";
import { renderAdminPharmacy } from "./admin/adminPharmacy.js";
import { renderAdminLabTests } from "./admin/adminLabTests.js";
import { renderAdminOrdersPayments } from "./admin/adminOrdersPayments.js";
import {
  navigate,
  registerPages,
  bootRouter,
  getCurrentContext,
  renderPage,
} from "./router.js";
import { ensureLive, findDoctor, feeText } from "./doctorCache.js";
import { renderHome } from "./home.js";
import { renderPharmacy } from "./pharmacyPage.js";
import {
  renderProductDetail,
  renderDoctors,
  renderDoctorDetail,
  renderLabTests,
  renderTestDetail,
  renderCart,
  renderCheckout,
  renderOrderSuccess,
  renderEmergency,
  renderPlans,
  renderDashboard,
  renderPrescription,
  renderArticle,
  renderInternships,
} from "./pages.js";
import {
  renderHospitalPortal,
  renderDoctorPortal,
  renderClinicPortal,
  renderDiagnosticPortal,
  renderPharmacyPortal,
} from "./portals.js";
import { openAuthModal } from "./authPages.js";
import { renderDoctorProfile } from "./doctorProfile.js";
import { renderDoctorConsole } from "./doctorConsole.js";
import { initChatbot } from "./chatbot.js";

const adminPlaceholderRoutes = Object.fromEntries(
  [
    "content",
    "internships",
    "support",
    "ai_assistant",
    "reports",
    "uploaded_files",
    "settings",
    "audit_logs",
  ].map((moduleKey) => [
    `admin/${moduleKey.replace(/_/g, "-")}`,
    (app) => renderAdminModulePlaceholder(app, moduleKey),
  ]),
);
registerPages({
  home: renderHome,
  pharmacy: renderPharmacy,
  product: renderProductDetail,
  doctors: renderDoctors,
  doctor: renderDoctorDetail,
  labtests: renderLabTests,
  test: renderTestDetail,
  cart: renderCart,
  checkout: renderCheckout,
  "order-success": renderOrderSuccess,
  emergency: renderEmergency,
  plans: renderPlans,
  internships: renderInternships,
  dashboard: renderDashboard,
  prescription: renderPrescription,
  article: renderArticle,
  "doctor-profile": renderDoctorProfile,
  "doctor-dashboard": renderDoctorConsole,
  "hospital-portal": renderHospitalPortal,
  "doctor-portal": renderDoctorPortal,
  "clinic-portal": renderClinicPortal,
  "diagnostic-portal": renderDiagnosticPortal,
  "pharmacy-portal": renderPharmacyPortal,

  // Admin routes
  "admin/login": renderAdminLogin,
  "admin/dashboard": renderAdminDashboard,
  "admin/staff": renderAdminStaff,
  "admin/access-denied": renderAdminAccessDenied,
  "admin/users": renderAdminUsers,
  "admin/providers": renderAdminProviders,
  "admin/doctors": renderAdminDoctors,
  "admin/health-records": renderAdminHealthRecords,
  "admin/pharmacy": renderAdminPharmacy,
  "admin/lab-tests": renderAdminLabTests,
  "admin/orders-payments": renderAdminOrdersPayments,
  "admin/health-plans": renderAdminHealthPlans,
  "admin/promotions": renderAdminPromotions,
  "admin/coupons-offers-marketing": renderAdminCouponsOffersMarketing,
  ...adminPlaceholderRoutes,
});

window.addEventListener("thp-auth-required", () =>
  openAuthModal("login", getCurrentContext()),
);
window.addEventListener("thp-auth-changed", async () => {
  try {
    await ensureLive();
  } catch {
    // render with whatever list we have (cache or static fallback)
  }
  // If a pending auth action already opened the booking confirmation dialog
  // (e.g. logging in from the gated "confirm appointment" flow), refresh the
  // visible fee in place instead of rebuilding the page under the modal.
  const bookingModal = document.querySelector("#booking-confirm-modal");
  const confirmOpen = bookingModal && !bookingModal.hidden;
  if (confirmOpen) {
    const match = location.hash.match(/^#\/doctor\?(?:.*&)?id=([^&]+)/);
    if (match) {
      const d = findDoctor(decodeURIComponent(match[1]));
      const fee = d && feeText(d);
      if (fee) {
        document
          .querySelectorAll("[data-fee-view]")
          .forEach((el) => (el.textContent = fee));
      }
    }
    return;
  }
  renderPage();
});

window.addEventListener("thp-language-change", () => {
  renderPage();
});

bootRouter();
initChatbot();
