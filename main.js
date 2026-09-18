import './style.css'
import { navigate, registerPages, renderPage, getCurrentContext } from './router.js'
import { renderHome } from './home.js'
import { renderPharmacy } from './pharmacyPage.js'
import { renderProductDetail, renderDoctors, renderDoctorDetail, renderLabTests, renderTestDetail, renderCart, renderCheckout, renderOrderSuccess, renderEmergency, renderRecords, renderPlans, renderDashboard, renderPrescription, renderArticle, renderInternships } from './pages.js'
import { renderHospitalPortal, renderDoctorPortal, renderClinicPortal, renderDiagnosticPortal, renderPharmacyPortal } from './portals.js'
import { openAuthModal } from './authPages.js'
import { initChatbot } from './chatbot.js'

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
  internships: renderInternships,
  dashboard: renderDashboard,
  prescription: renderPrescription,
  article: renderArticle,
  'hospital-portal': renderHospitalPortal,
  'doctor-portal': renderDoctorPortal,
  'clinic-portal': renderClinicPortal,
  'diagnostic-portal': renderDiagnosticPortal,
  'pharmacy-portal': renderPharmacyPortal
})

window.addEventListener('thp-auth-required', () => openAuthModal('login', getCurrentContext()))

renderPage()
initChatbot()

