import { icon } from './ui.js'

const portalDetails = {
  user: ['User portal', 'Book appointments, manage prescriptions, and track health.'],
  doctor: ['Doctor portal', 'Manage consultations, prescriptions, and follow-ups.'],
  hospital: ['Hospital portal', 'Coordinate care teams, admissions, and patient handoffs.'],
  clinic: ['Clinic portal', 'Keep appointments, staff, and patient records moving.'],
  diagnostic: ['Diagnostic portal', 'Track test bookings, samples, and reports.'],
  pharmacy: ['Pharmacy portal', 'Process prescriptions and fulfil medicine orders.']
}

export const portalOptions = [
  { value: 'user', label: 'User', icon: 'user', detail: 'Care & consultations' },
  { value: 'doctor', label: 'Doctor', icon: 'stethoscope', detail: 'Consultations & patients' },
  { value: 'hospital', label: 'Hospital', icon: 'building', detail: 'Care teams & admissions' },
  { value: 'clinic', label: 'Clinic', icon: 'home', detail: 'Appointments & staff' },
  { value: 'diagnostic', label: 'Diagnostics', icon: 'flask', detail: 'Tests & reports' },
  { value: 'pharmacy', label: 'Pharmacy', icon: 'pills', detail: 'Prescriptions & orders' }
]

export const portalRegistrationFields = {
  hospital: [
    ['name', 'Medical Superintendent / Signatory', 'text', 'Full name'],
    ['organisation', 'Hospital Registered Name', 'text', 'Registered hospital name'],
    ['email', 'Official Hospital Email', 'email', 'admin@hospital.com'],
    ['phone', 'Emergency Helpline / Mobile', 'tel', '10-digit phone number'],
    ['password', 'Create password', 'password', 'At least 8 characters'],
    ['confirmPassword', 'Confirm password', 'password', 'Re-enter password'],
    ['hospitalCategory', 'Hospital Category', 'select', 'Select Category'],
    ['bedCapacity', 'Total Bed Capacity', 'number', 'Total beds'],
    ['ceaNumber', 'CEA Registration No.', 'text', 'State CEA / Health Dept. ID'],
    ['address', 'Campus Address', 'text', 'Campus address'],
    ['profilePhoto', 'Superintendent Profile Photo', 'file-image', 'Click to upload photo'],
    ['logo', 'Hospital Logo', 'file-image', 'Click to upload logo'],
    ['licenseCertificate', 'Registration Certificate', 'file', 'Click to upload certificate']
  ],
  doctor: [
    ['name', 'Doctor name', 'text', 'Full name'],
    ['specialty', 'Specialty', 'text', 'e.g. Cardiology'],
    ['license', 'Medical license number', 'text', 'Enter license number'],
    ['email', 'Professional email', 'email', 'doctor@practice.com'],
    ['password', 'Create password', 'password', 'At least 8 characters']
  ],
  clinic: [
    ['name', 'Clinic Admin / Contact Person', 'text', 'Full name'],
    ['organisation', 'Registered Clinic Name', 'text', 'Registered clinic name'],
    ['email', 'Official Email', 'email', 'admin@clinic.com'],
    ['phone', 'Mobile Number', 'tel', '10-digit mobile number'],
    ['password', 'Create password', 'password', 'At least 8 characters'],
    ['confirmPassword', 'Confirm password', 'password', 'Re-enter password'],
    ['clinicType', 'Clinic Type', 'select', 'Select Type'],
    ['ceaNumber', 'Clinic CEA / License No.', 'text', 'Enter license number'],
    ['address', 'Clinic Address', 'text', 'Street address'],
    ['profilePhoto', 'Admin Profile Photo', 'file-image', 'Click to upload photo'],
    ['logo', 'Clinic Logo', 'file-image', 'Click to upload logo'],
    ['licenseCertificate', 'Registration Certificate', 'file', 'Click to upload certificate']
  ],
  diagnostic: [
    ['name', 'Contact person', 'text', 'Full name'],
    ['organisation', 'Diagnostic centre name', 'text', 'Registered centre name'],
    ['email', 'Official email', 'email', 'admin@diagnostics.com'],
    ['phone', 'Mobile number', 'tel', '10-digit mobile number'],
    ['password', 'Create password', 'password', 'At least 8 characters'],
    ['confirmPassword', 'Confirm password', 'password', 'Re-enter password'],
    ['accreditation', 'Accreditation number', 'text', 'Enter accreditation ID'],
    ['address', 'Street Address', 'text', 'Street address'],
    ['profilePhoto', 'Profile photo', 'file-image', 'Click to upload profile photo'],
    ['logo', 'Centre logo', 'file-image', 'Click to upload centre logo'],
    ['licenseCertificate', 'License certificate', 'file', 'Click to upload license certificate']
  ],
  pharmacy: [
    ['name', 'Contact Person / Registered Pharmacist', 'text', 'Full name of pharmacist or in-charge'],
    ['organisation', 'Registered Pharmacy Name', 'text', 'Official registered medical store name'],
    ['email', 'Official Email', 'email', 'admin@pharmacy.com'],
    ['phone', 'Mobile Number', 'tel', '10-digit mobile number'],
    ['password', 'Create password', 'password', 'At least 8 characters'],
    ['confirmPassword', 'Confirm password', 'password', 'Re-enter password'],
    ['pharmacyType', 'Pharmacy Type', 'select', 'Select Type'],
    ['drugLicenseNumber', 'Drug License No. (Form 20/21)', 'text', 'State Drug Control License No.'],
    ['councilRegNumber', 'Pharmacist Council Reg. No.', 'text', 'State Pharmacy Council Reg No.'],
    ['address', 'Pharmacy Address', 'text', 'Street address'],
    ['profilePhoto', 'Pharmacist Profile Photo', 'file-image', 'Click to upload photo'],
    ['logo', 'Pharmacy Storefront / Logo', 'file-image', 'Click to upload logo'],
    ['licenseCertificate', 'Drug License Certificate', 'file', 'Click to upload certificate']
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
