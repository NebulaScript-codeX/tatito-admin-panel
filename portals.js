import { icon } from './ui.js'

const portalDetails = {
  user: ['User portal', 'Book appointments, manage prescriptions, and track health.'],
  hospital: ['Hospital portal', 'Coordinate care teams, admissions, and patient handoffs.'],
  doctor: ['Doctor portal', 'Manage consultations, prescriptions, and follow-ups.'],
  clinic: ['Clinic portal', 'Keep appointments, staff, and patient records moving.'],
  diagnostic: ['Diagnostic portal', 'Track test bookings, samples, and reports.'],
  pharmacy: ['Pharmacy portal', 'Process prescriptions and fulfil medicine orders.']
}

export const portalOptions = [
  { value: 'user', label: 'User', icon: 'user', detail: 'Care & consultations' },
  { value: 'hospital', label: 'Hospital', icon: 'building', detail: 'Care teams & admissions' },
  { value: 'doctor', label: 'Doctor', icon: 'stethoscope', detail: 'Consultations & patients' },
  { value: 'clinic', label: 'Clinic', icon: 'home', detail: 'Appointments & staff' },
  { value: 'diagnostic', label: 'Diagnostics', icon: 'flask', detail: 'Tests & reports' },
  { value: 'pharmacy', label: 'Pharmacy', icon: 'pills', detail: 'Prescriptions & orders' }
]

export const portalRegistrationFields = {
  hospital: [
    ['name', 'Contact person', 'text', 'Full name'],
    ['organisation', 'Hospital name', 'text', 'Registered hospital name'],
    ['registrationId', 'Hospital registration ID', 'text', 'Enter registration ID'],
    ['email', 'Official email', 'email', 'admin@hospital.com'],
    ['password', 'Create password', 'password', 'At least 8 characters']
  ],
  doctor: [
    ['name', 'Doctor name', 'text', 'Full name'],
    ['specialty', 'Specialty', 'text', 'e.g. Cardiology'],
    ['license', 'Medical license number', 'text', 'Enter license number'],
    ['email', 'Professional email', 'email', 'doctor@practice.com'],
    ['password', 'Create password', 'password', 'At least 8 characters']
  ],
  clinic: [
    ['name', 'Contact person', 'text', 'Full name'],
    ['organisation', 'Clinic name', 'text', 'Registered clinic name'],
    ['city', 'Clinic city', 'text', 'Enter city'],
    ['email', 'Official email', 'email', 'admin@clinic.com'],
    ['password', 'Create password', 'password', 'At least 8 characters']
  ],
  diagnostic: [
    ['name', 'Contact person', 'text', 'Full name'],
    ['organisation', 'Diagnostic centre name', 'text', 'Registered centre name'],
    ['email', 'Official email', 'email', 'admin@diagnostics.com'],
    ['phone', 'Mobile number', 'tel', '10-digit mobile number'],
    ['password', 'Create password', 'password', 'At least 8 characters'],
    ['confirmPassword', 'Confirm password', 'password', 'Re-enter password'],
    ['accreditation', 'Accreditation number', 'text', 'Enter accreditation ID'],
    ['profilePhoto', 'Profile photo', 'file-image', 'Click to upload profile photo'],
    ['logo', 'Centre logo', 'file-image', 'Click to upload centre logo'],
    ['licenseCertificate', 'License certificate', 'file', 'Click to upload license certificate']
  ],
  pharmacy: [
    ['name', 'Pharmacist name', 'text', 'Full name'],
    ['organisation', 'Pharmacy name', 'text', 'Registered pharmacy name'],
    ['license', 'Pharmacy license number', 'text', 'Enter license number'],
    ['email', 'Official email', 'email', 'admin@pharmacy.com'],
    ['password', 'Create password', 'password', 'At least 8 characters']
  ]
}

function renderPortal(appRoot, ctx, type) {
  const [title, description] = portalDetails[type]
  appRoot.innerHTML = `<div class="app-shell"><main class="portal-page section-wrap"><a class="brand portal-brand" data-nav="home"><span class="brand-mark">${icon('heart')}</span><span><strong>Tatito</strong><em>Health+</em></span></a><section class="portal-workspace"><span class="section-kicker">${icon('building')} Partner workspace</span><h1>${title}</h1><p>${description}</p><div class="portal-empty-state">${icon('shield')}<strong>Your workspace is ready</strong><span>Portal tools will appear here after your account is verified.</span><button class="button button-primary" data-nav="home">Back to Tatito</button></div></section></main></div>`
  appRoot.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => ctx.navigate(el.dataset.nav)))
}

export const renderHospitalPortal = (root, ctx) => renderPortal(root, ctx, 'hospital')
export const renderDoctorPortal = (root, ctx) => renderPortal(root, ctx, 'doctor')
export const renderClinicPortal = (root, ctx) => renderPortal(root, ctx, 'clinic')
export const renderDiagnosticPortal = (root, ctx) => renderPortal(root, ctx, 'diagnostic')
export const renderPharmacyPortal = (root, ctx) => renderPortal(root, ctx, 'pharmacy')
