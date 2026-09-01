import './style.css'
import { navigate, registerPages, renderPage } from './router.js'
import { renderHome } from './home.js'
import { renderPharmacy } from './pharmacyPage.js'
import { renderProductDetail, renderDoctors, renderDoctorDetail, renderLabTests, renderTestDetail, renderCart, renderCheckout, renderOrderSuccess, renderEmergency, renderRecords, renderPlans, renderDashboard, renderPrescription, renderArticle } from './pages.js'
import { renderHospitalPortal, renderDoctorPortal, renderClinicPortal, renderDiagnosticPortal, renderPharmacyPortal } from './portals.js'

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
  'order-success': renderOrderSuccess,
  emergency: renderEmergency,
  records: renderRecords,
  plans: renderPlans,
  dashboard: renderDashboard,
  prescription: renderPrescription,
  article: renderArticle,
  'hospital-portal': renderHospitalPortal,
  'doctor-portal': renderDoctorPortal,
  'clinic-portal': renderClinicPortal,
  'diagnostic-portal': renderDiagnosticPortal,
  'pharmacy-portal': renderPharmacyPortal
})

renderPage()
