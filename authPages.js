import { icon } from './ui.js'
import { setSession, clearPendingAction } from './auth.js'
import { login, register } from './api.js'
import { doctorSpecialties, doctorCities } from './data.js'
import { portalOptions, portalRegistrationFields } from './portals.js'
import { getDoctorApplicationPdfUrl, downloadDoctorApplicationPdf } from './doctorPdfGenerator.js'
import { openNmcVerificationModal } from './nmcVerificationModal.js'
import { generateNmcCertificatePdf } from './nmcCertificatePdf.js'
import { medicalUniversitiesAndColleges } from './medicalCollegesData.js'
import { indianStatesAndDistricts, getCitiesForDistrict } from './indianDistrictsData.js'
import {
  practiceTypes,
  experienceOptions,
  positionRoleOptions,
  primarySpecializations,
  subSpecializations,
  getSubSpecializationsForPrimary,
  workTypes,
  medicalQualificationsList,
  languagesList
} from './practiceCareerData.js'
import { countryPhoneCodes, getCountryByCode, getCountryDigits } from './countryPhoneCodes.js'

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function validatePasswordRules(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must contain at least one special symbol (e.g. !@#$%^&*).'
  }
  return ''
}

const indianStates = Object.keys(indianStatesAndDistricts).sort()

function diagnosticStage1Markup(values = {}) {
  const photoLabel = (values.profilePhoto && values.profilePhoto.name) ? values.profilePhoto.name : 'Click to upload profile photo'
  const logoLabel = (values.logo && values.logo.name) ? values.logo.name : 'Click to upload centre logo'
  const licenseLabel = (values.licenseCertificate && values.licenseCertificate.name) ? values.licenseCertificate.name : 'Click to upload license certificate'
  const selectedCode = values.phoneCountryCode || '+91'
  const country = getCountryByCode(selectedCode)
  const digits = country.digits

  return `
    <div class="doctor-stage-fields diagnostic-stage-fields">
      <div>
        <label for="diagnostic-name">CONTACT PERSON / LAB IN-CHARGE *</label>
        <input class="auth-text-input" id="diagnostic-name" name="name" type="text" autocomplete="name" value="${escapeHtml(values.name || '')}" placeholder="Full name of authorized person" required>
      </div>
      <div>
        <label for="diagnostic-organisation">DIAGNOSTIC CENTRE NAME *</label>
        <input class="auth-text-input" id="diagnostic-organisation" name="organisation" type="text" value="${escapeHtml(values.organisation || '')}" placeholder="Registered centre name" required>
      </div>
      <div>
        <label for="diagnostic-email">OFFICIAL EMAIL *</label>
        <input class="auth-text-input" id="diagnostic-email" name="email" type="email" autocomplete="email" value="${escapeHtml(values.email || '')}" placeholder="admin@diagnostics.com" required>
      </div>
      <div class="doctor-phone-field-wrapper">
        <label for="diagnostic-phone">MOBILE NUMBER *</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="diagnostic-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${selectedCode === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="diagnostic-phone" name="phone" type="tel" inputmode="numeric" value="${escapeHtml(values.phone || values.mobile || '')}" placeholder="${digits}-digit mobile number" maxlength="${digits}" pattern="[0-9]{${digits}}" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="diagnostic-phone-hint">Enter ${digits} digits for ${country.name}</small>
      </div>
      <div>
        <label for="diagnostic-password">PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="diagnostic-password" name="password" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.password || '')}" placeholder="Min 8 characters" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="diagnostic-password" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        <small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>
      </div>
      <div>
        <label for="diagnostic-confirmPassword">CONFIRM PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="diagnostic-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.confirmPassword || '')}" placeholder="Re-enter password" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="diagnostic-confirmPassword" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
      </div>

      <div>
        <label for="diagnostic-accreditation">ACCREDITATION / REGISTRATION NO. *</label>
        <input class="auth-text-input" id="diagnostic-accreditation" name="accreditation" type="text" value="${escapeHtml(values.accreditation || '')}" placeholder="NABL / ISO / State Clinical Establishment ID" required>
      </div>
      <div class="doctor-upload-field">
        <label for="diagnostic-photo">PROFILE PHOTO *</label>
        <label class="doctor-upload-control" for="diagnostic-photo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${photoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="diagnostic-photo" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" ${values.profilePhoto ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field">
        <label for="diagnostic-logo">CENTRE LOGO *</label>
        <label class="doctor-upload-control" for="diagnostic-logo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${logoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="diagnostic-logo" name="logo" type="file" accept=".jpg,.jpeg,.png" ${values.logo ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field">
        <label for="diagnostic-license">LICENSE CERTIFICATE *</label>
        <label class="doctor-upload-control" for="diagnostic-license">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${licenseLabel}</span>
          <small>JPG, PNG, PDF · Max 10MB</small>
        </label>
        <input id="diagnostic-license" name="licenseCertificate" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.licenseCertificate ? '' : 'required'}>
      </div>
    </div>
  `
}

function diagnosticStage2Markup(values = {}) {
  const selectedState = values.state || ''
  const availableDistricts = selectedState ? (indianStatesAndDistricts[selectedState] || []) : []
  const selectedDistrict = values.district || ''
  const availableCities = selectedDistrict ? getCitiesForDistrict(selectedDistrict) : []
  const selectedCity = values.city || ''

  const currentServices = Array.isArray(values.services) 
    ? values.services 
    : (typeof values.services === 'string' ? values.services.split(',').map(s => s.trim()).filter(Boolean) : [])

  const servicesList = [
    'Pathology (Blood & Urine)',
    'Radiology (X-Ray, Ultrasound)',
    'Advanced Imaging (CT, MRI)',
    'ECG & Cardiology Diagnostics',
    'Molecular Diagnostics & Genomics',
    'Preventive Health Checkups',
    'Biochemistry & Immunoassay',
    'Microbiology & Serology',
    'Histopathology & Cytopathology',
    'Nuclear Medicine / PET Scan'
  ]

  const isDaySelected = (d) => {
    if (!values.workingDays) return false
    if (Array.isArray(values.workingDays)) return values.workingDays.includes(d)
    return String(values.workingDays).includes(d)
  }

  return `
    <div class="doctor-stage-fields diagnostic-stage-fields">
      <div class="portal-section-header">Diagnostic Services & Operations</div>
      <div>
        <label for="select-diagnosticServices">DIAGNOSTIC SERVICES OFFERED *</label>
        <div class="doctor-multi-select-wrap">
          <select class="auth-text-input doctor-chip-select" id="select-diagnosticServices" data-field="diagnosticServices">
            <option value="">Select diagnostic service...</option>
            ${servicesList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
            <option value="Other">Other (Specify custom service)</option>
          </select>
        </div>
        <div class="doctor-chips-container" id="chips-diagnosticServices" style="${currentServices.length ? 'display: flex;' : 'display: none;'}">
          ${currentServices.map(s => `
            <span class="doctor-chip">
              <span>${escapeHtml(s)}</span>
              <button type="button" class="doctor-chip-remove" data-field="diagnosticServices" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
            </span>
          `).join('')}
        </div>
        <div class="doctor-chip-other-input-wrap" id="other-wrap-diagnosticServices" style="display: none;">
          <input type="text" class="auth-text-input" id="other-input-diagnosticServices" placeholder="Specify diagnostic service and click Add" maxlength="60">
          <button type="button" class="button button-primary doctor-chip-other-btn" data-field="diagnosticServices">Add</button>
        </div>
        <input type="hidden" id="hidden-diagnosticServices" name="services" value="${escapeHtml(currentServices.join(', '))}">
      </div>

      <div>
        <label for="diagnostic-homeCollection">HOME SAMPLE COLLECTION *</label>
        <select class="auth-text-input" id="diagnostic-homeCollection" name="homeCollection" required>
          <option value="" ${!values.homeCollection ? 'selected' : ''}>Select option</option>
          <option value="Yes" ${values.homeCollection === 'Yes' ? 'selected' : ''}>Yes — Home collection available</option>
          <option value="No" ${values.homeCollection === 'No' ? 'selected' : ''}>No — Centre walk-ins only</option>
        </select>
      </div>

      <div class="portal-field-full">
        <div class="doctor-option-group">
          <label class="doctor-field-title">WORKING DAYS *</label>
          <div class="doctor-pills-grid">
            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
              <label class="doctor-pill-checkbox ${isDaySelected(day) ? 'is-checked' : ''}">
                <input type="checkbox" name="workingDays" value="${day}" ${isDaySelected(day) ? 'checked' : ''}>
                <span class="pill-checkbox-indicator"></span>
                <span>${day}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <label for="diagnostic-workingHoursFrom">OPERATING HOURS – FROM *</label>
        <input class="auth-text-input" id="diagnostic-workingHoursFrom" name="workingHoursFrom" type="time" value="${values.workingHoursFrom || '08:00'}" required>
      </div>
      <div>
        <label for="diagnostic-workingHoursTo">OPERATING HOURS – TO *</label>
        <input class="auth-text-input" id="diagnostic-workingHoursTo" name="workingHoursTo" type="time" value="${values.workingHoursTo || '20:00'}" required>
      </div>

      <div class="portal-section-header">Location Details</div>
      <div class="portal-field-full">
        <label for="diagnostic-address">STREET ADDRESS / LANDMARK *</label>
        <input class="auth-text-input" id="diagnostic-address" name="address" type="text" value="${escapeHtml(values.address || '')}" placeholder="Door / Plot no., Street, Landmark" required>
      </div>
      <div>
        <label for="diagnostic-state">STATE *</label>
        <select class="auth-text-input" id="diagnostic-state" name="state" required>
          <option value="">Select State</option>
          ${indianStates.map(st => `<option value="${st}" ${selectedState === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="diagnostic-district">DISTRICT *</label>
        <select class="auth-text-input" id="diagnostic-district" name="district" required ${availableDistricts.length ? '' : 'disabled'}>
          <option value="">Select District</option>
          ${availableDistricts.map(d => `<option value="${d}" ${selectedDistrict === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="diagnostic-city">CITY / TOWN *</label>
        <select class="auth-text-input" id="diagnostic-city" name="city" required ${availableCities.length ? '' : 'disabled'}>
          <option value="">Select City / Town</option>
          ${availableCities.map(c => `<option value="${c}" ${selectedCity === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="diagnostic-pincode">PINCODE *</label>
        <input class="auth-text-input" id="diagnostic-pincode" name="pincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(values.pincode || '')}" placeholder="6-digit Pincode" required>
      </div>
    </div>
  `
}

function diagnosticRegistrationMarkup(values = {}) {
  return diagnosticStage1Markup(values)
}

function portalVerificationStageMarkup(email, code = '') {
  return `
    <div class="doctor-stage-fields portal-verification-fields" style="grid-template-columns: 1fr;">
      <div class="portal-field-full" style="text-align: center; max-width: 440px; margin: 0 auto; width: 100%;">
        <label for="popup-verification-code" style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; display: block;">VERIFICATION CODE *</label>
        <input class="auth-text-input auth-code-input" id="popup-verification-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(code || '')}" required style="text-align: center; letter-spacing: 0.35em; font-size: 1.5rem; font-weight: 800; height: 52px; width: 100%;">
      </div>
    </div>
  `
}

function setDiagnosticStage(registerPopup, form, stage, values, ctx) {
  form.dataset.portal = 'diagnostic'
  form.dataset.stage = String(stage)
  form._diagnosticValues = { ...form._diagnosticValues, ...values }

  const stepper = registerPopup.querySelector('.auth-register-stepper')
  if (stepper) {
    stepper.style.display = 'flex'
    stepper.innerHTML = `
      <span class="${stage === 1 ? 'is-active' : 'is-complete'}">${stage > 1 ? icon('check') : '1'} <small>Details</small></span>
      <i></i>
      <span class="${stage === 2 ? 'is-active' : (stage > 2 ? 'is-complete' : '')}">${stage > 2 ? icon('check') : '2'} <small>Verify</small></span>
      <i></i>
      <span class="${stage === 3 ? 'is-active' : ''}">3 <small>Services & Location</small></span>
    `
  }

  const headingEl = registerPopup.querySelector('.auth-form-heading h2')
  const subEl = registerPopup.querySelector('.auth-form-heading p')
  const kickerEl = registerPopup.querySelector('.auth-form-kicker')
  if (kickerEl) kickerEl.textContent = 'Diagnostics registration'

  const regFields = registerPopup.querySelector('.auth-register-fields')
  const actionsBar = form.querySelector('.auth-stage-actions')
  const backBtn = actionsBar?.querySelector('.auth-stage-back')
  const submitBtn = actionsBar?.querySelector('.auth-submit')
  if (actionsBar) actionsBar.style.display = 'flex'

  if (stage === 1) {
    if (headingEl) headingEl.textContent = 'Diagnostics registration details'
    if (subEl) subEl.textContent = 'Add the details needed to verify your diagnostic centre.'
    if (submitBtn) submitBtn.innerHTML = `Continue to next stage ${icon('arrow')}`
    regFields.innerHTML = diagnosticStage1Markup(form._diagnosticValues || {})
    setupPortalFieldEvents(form, 'diagnostic', ctx)
    if (backBtn) {
      backBtn.setAttribute('data-portal-back', '')
      backBtn.innerHTML = `${icon('chevron')} Portals`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openAuthModal('register', ctx)
      }
    }
  } else if (stage === 2) {
    if (headingEl) headingEl.textContent = 'Verify your account'
    if (subEl) subEl.textContent = 'Enter the 6-digit code sent to your official email address.'
    if (submitBtn) submitBtn.innerHTML = `Verify & Continue ${icon('arrow')}`
    regFields.innerHTML = portalVerificationStageMarkup(form._diagnosticValues?.email, form._diagnosticValues?.code)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const codeInput = form.querySelector('#popup-verification-code')
        if (codeInput) form._diagnosticValues.code = codeInput.value
        setDiagnosticStage(registerPopup, form, 1, form._diagnosticValues, ctx)
      }
    }
  } else if (stage === 3) {
    if (headingEl) headingEl.textContent = 'Services & Location'
    if (subEl) subEl.textContent = 'Specify diagnostic services, operating schedule, and centre location.'
    if (submitBtn) submitBtn.innerHTML = `Complete registration ${icon('check')}`
    regFields.innerHTML = diagnosticStage2Markup(form._diagnosticValues || {})
    setupPortalFieldEvents(form, 'diagnostic', ctx)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const currentData = Object.fromEntries(new FormData(form))
        const selectedDays = Array.from(form.querySelectorAll('input[name="workingDays"]:checked')).map(cb => cb.value)
        const hiddenServicesVal = form.querySelector('#hidden-diagnosticServices')?.value || ''
        const selectedServices = hiddenServicesVal.split(',').map(s => s.trim()).filter(Boolean)
        form._diagnosticValues = { 
          ...form._diagnosticValues, 
          ...currentData, 
          services: selectedServices,
          workingDays: selectedDays
        }
        setDiagnosticStage(registerPopup, form, 2, form._diagnosticValues, ctx)
      }
    }
  }

  registerPopup.scrollTop = 0
}

function clinicStage1Markup(values = {}) {
  const photoLabel = (values.profilePhoto && values.profilePhoto.name) ? values.profilePhoto.name : 'Click to upload admin profile photo'
  const logoLabel = (values.logo && values.logo.name) ? values.logo.name : 'Click to upload clinic logo'
  const selectedCode = values.phoneCountryCode || '+91'
  const country = getCountryByCode(selectedCode)
  const digits = country.digits

  return `
    <div class="doctor-stage-fields clinic-stage-fields">
      <div>
        <label for="clinic-name">CONTACT PERSON / CLINIC ADMIN *</label>
        <input class="auth-text-input" id="clinic-name" name="name" type="text" autocomplete="name" value="${escapeHtml(values.name || '')}" placeholder="Full name of doctor or administrator" required>
      </div>
      <div>
        <label for="clinic-organisation">REGISTERED CLINIC NAME *</label>
        <input class="auth-text-input" id="clinic-organisation" name="organisation" type="text" value="${escapeHtml(values.organisation || '')}" placeholder="Official registered clinic name" required>
      </div>
      <div>
        <label for="clinic-email">OFFICIAL EMAIL *</label>
        <input class="auth-text-input" id="clinic-email" name="email" type="email" autocomplete="email" value="${escapeHtml(values.email || '')}" placeholder="admin@clinic.com" required>
      </div>
      <div class="doctor-phone-field-wrapper">
        <label for="clinic-phone">MOBILE NUMBER *</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="clinic-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${selectedCode === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="clinic-phone" name="phone" type="tel" inputmode="numeric" value="${escapeHtml(values.phone || values.mobile || '')}" placeholder="${digits}-digit mobile number" maxlength="${digits}" pattern="[0-9]{${digits}}" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="clinic-phone-hint">Enter ${digits} digits for ${country.name}</small>
      </div>
      <div>
        <label for="clinic-password">PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="clinic-password" name="password" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.password || '')}" placeholder="Min 8 characters" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="clinic-password" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        <small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>
      </div>
      <div>
        <label for="clinic-confirmPassword">CONFIRM PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="clinic-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.confirmPassword || '')}" placeholder="Re-enter password" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="clinic-confirmPassword" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
      </div>

      <div class="doctor-upload-field">
        <label for="clinic-photo">ADMIN PROFILE PHOTO *</label>
        <label class="doctor-upload-control" for="clinic-photo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${photoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="clinic-photo" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" ${values.profilePhoto ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field">
        <label for="clinic-logo">CLINIC LOGO *</label>
        <label class="doctor-upload-control" for="clinic-logo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${logoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="clinic-logo" name="logo" type="file" accept=".jpg,.jpeg,.png" ${values.logo ? '' : 'required'}>
      </div>
    </div>
  `
}

function clinicStage2Markup(values = {}) {
  const selectedState = values.state || ''
  const availableDistricts = selectedState ? (indianStatesAndDistricts[selectedState] || []) : []
  const selectedDistrict = values.district || ''
  const availableCities = selectedDistrict ? getCitiesForDistrict(selectedDistrict) : []
  const selectedCity = values.city || ''

  const currentSpecialties = Array.isArray(values.specialties) 
    ? values.specialties 
    : (typeof values.specialties === 'string' ? values.specialties.split(',').map(s => s.trim()).filter(Boolean) : [])

  const specialtiesList = [
    'General Medicine',
    'Pediatrics',
    'Gynecology & Obstetrics',
    'Dermatology',
    'Orthopedics',
    'Cardiology',
    'ENT',
    'Dental Care',
    'Ophthalmology',
    'Physiotherapy',
    'Psychiatry',
    'Neurology',
    'Pulmonology',
    'Gastroenterology',
    'Ayurveda',
    'Homeopathy'
  ]

  const isDaySelected = (d) => {
    if (!values.workingDays) return false
    if (Array.isArray(values.workingDays)) return values.workingDays.includes(d)
    return String(values.workingDays).includes(d)
  }

  const licenseLabel = (values.licenseCertificate && values.licenseCertificate.name) ? values.licenseCertificate.name : 'Click to upload registration certificate'

  return `
    <div class="doctor-stage-fields clinic-stage-fields">
      <div>
        <label for="clinic-clinicType">CLINIC TYPE *</label>
        <select class="auth-text-input" id="clinic-clinicType" name="clinicType" required>
          <option value="" ${!values.clinicType ? 'selected' : ''}>Select Clinic Type</option>
          <option value="Single Specialty" ${values.clinicType === 'Single Specialty' ? 'selected' : ''}>Single Specialty Clinic</option>
          <option value="Multi-Specialty" ${values.clinicType === 'Multi-Specialty' ? 'selected' : ''}>Multi-Specialty Polyclinic</option>
          <option value="Dental Clinic" ${values.clinicType === 'Dental Clinic' ? 'selected' : ''}>Dental Clinic</option>
          <option value="Eye Clinic" ${values.clinicType === 'Eye Clinic' ? 'selected' : ''}>Eye / Ophthalmology Clinic</option>
          <option value="Physiotherapy" ${values.clinicType === 'Physiotherapy' ? 'selected' : ''}>Physiotherapy & Rehab Centre</option>
          <option value="AYUSH" ${values.clinicType === 'AYUSH' ? 'selected' : ''}>AYUSH / Integrative Medicine</option>
        </select>
      </div>
      <div>
        <label for="clinic-consultationModes">CONSULTATION MODES *</label>
        <select class="auth-text-input" id="clinic-consultationModes" name="consultationModes" required>
          <option value="" ${!values.consultationModes ? 'selected' : ''}>Select Consultation Mode</option>
          <option value="Both In-Clinic & Video" ${values.consultationModes === 'Both In-Clinic & Video' ? 'selected' : ''}>Both In-Clinic (Offline) & Online Video</option>
          <option value="In-Clinic Only" ${values.consultationModes === 'In-Clinic Only' ? 'selected' : ''}>In-Clinic (Offline Consultations Only)</option>
          <option value="Video Consult Only" ${values.consultationModes === 'Video Consult Only' ? 'selected' : ''}>Video Consultations Only (Telehealth)</option>
        </select>
      </div>

      <div class="portal-field-full">
        <label for="select-clinicSpecialties">PRIMARY SPECIALTIES OFFERED *</label>
        <div class="doctor-multi-select-wrap">
          <select class="auth-text-input doctor-chip-select" id="select-clinicSpecialties" data-field="clinicSpecialties">
            <option value="">Select specialty...</option>
            ${specialtiesList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
            <option value="Other">Other (Specify custom specialty)</option>
          </select>
        </div>
        <div class="doctor-chips-container" id="chips-clinicSpecialties" style="${currentSpecialties.length ? 'display: flex;' : 'display: none;'}">
          ${currentSpecialties.map(s => `
            <span class="doctor-chip">
              <span>${escapeHtml(s)}</span>
              <button type="button" class="doctor-chip-remove" data-field="clinicSpecialties" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
            </span>
          `).join('')}
        </div>
        <div class="doctor-chip-other-input-wrap" id="other-wrap-clinicSpecialties" style="display: none;">
          <input type="text" class="auth-text-input" id="other-input-clinicSpecialties" placeholder="Specify specialty and click Add" maxlength="60">
          <button type="button" class="button button-primary doctor-chip-other-btn" data-field="clinicSpecialties">Add</button>
        </div>
        <input type="hidden" id="hidden-clinicSpecialties" name="specialties" value="${escapeHtml(currentSpecialties.join(', '))}">
      </div>

      <div>
        <label for="clinic-ceaNumber">CLINIC REGISTRATION / CEA NO. *</label>
        <input class="auth-text-input" id="clinic-ceaNumber" name="ceaNumber" type="text" value="${escapeHtml(values.ceaNumber || '')}" placeholder="State CEA / Municipal Health License No." required>
      </div>
      <div class="doctor-upload-field">
        <label for="clinic-license">REGISTRATION CERTIFICATE *</label>
        <label class="doctor-upload-control" for="clinic-license">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${licenseLabel}</span>
          <small>JPG, PNG, PDF · Max 10MB</small>
        </label>
        <input id="clinic-license" name="licenseCertificate" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.licenseCertificate ? '' : 'required'}>
      </div>

      <div class="portal-field-full">
        <div class="doctor-option-group">
          <label class="doctor-field-title">WORKING DAYS *</label>
          <div class="doctor-pills-grid">
            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
              <label class="doctor-pill-checkbox ${isDaySelected(day) ? 'is-checked' : ''}">
                <input type="checkbox" name="workingDays" value="${day}" ${isDaySelected(day) ? 'checked' : ''}>
                <span class="pill-checkbox-indicator"></span>
                <span>${day}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <label for="clinic-workingHoursFrom">OPD WORKING HOURS – FROM *</label>
        <input class="auth-text-input" id="clinic-workingHoursFrom" name="workingHoursFrom" type="time" value="${values.workingHoursFrom || '09:00'}" placeholder="09:00" required>
      </div>
      <div>
        <label for="clinic-workingHoursTo">OPD WORKING HOURS – TO *</label>
        <input class="auth-text-input" id="clinic-workingHoursTo" name="workingHoursTo" type="time" value="${values.workingHoursTo || '18:00'}" placeholder="18:00" required>
      </div>

      <div class="portal-section-header">Location Details</div>
      <div class="portal-field-full">
        <label for="clinic-address">CLINIC ADDRESS / BUILDING / LANDMARK *</label>
        <input class="auth-text-input" id="clinic-address" name="address" type="text" value="${escapeHtml(values.address || '')}" placeholder="Building name, Floor, Street, Landmark" required>
      </div>
      <div>
        <label for="clinic-state">STATE *</label>
        <select class="auth-text-input" id="clinic-state" name="state" required>
          <option value="">Select State</option>
          ${indianStates.map(st => `<option value="${st}" ${selectedState === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="clinic-district">DISTRICT *</label>
        <select class="auth-text-input" id="clinic-district" name="district" required ${availableDistricts.length ? '' : 'disabled'}>
          <option value="">Select District</option>
          ${availableDistricts.map(d => `<option value="${d}" ${selectedDistrict === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="clinic-city">CITY / TOWN *</label>
        <select class="auth-text-input" id="clinic-city" name="city" required ${availableCities.length ? '' : 'disabled'}>
          <option value="">Select City / Town</option>
          ${availableCities.map(c => `<option value="${c}" ${selectedCity === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="clinic-pincode">PINCODE *</label>
        <input class="auth-text-input" id="clinic-pincode" name="pincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(values.pincode || '')}" placeholder="6-digit Pincode" required>
      </div>
    </div>
  `
}

function clinicRegistrationMarkup(values = {}) {
  return clinicStage1Markup(values)
}

function setClinicStage(registerPopup, form, stage, values, ctx) {
  form.dataset.portal = 'clinic'
  form.dataset.stage = String(stage)
  form._clinicValues = { ...form._clinicValues, ...values }

  const stepper = registerPopup.querySelector('.auth-register-stepper')
  if (stepper) {
    stepper.style.display = 'flex'
    stepper.innerHTML = `
      <span class="${stage === 1 ? 'is-active' : 'is-complete'}">${stage > 1 ? icon('check') : '1'} <small>Details</small></span>
      <i></i>
      <span class="${stage === 2 ? 'is-active' : (stage > 2 ? 'is-complete' : '')}">${stage > 2 ? icon('check') : '2'} <small>Verify</small></span>
      <i></i>
      <span class="${stage === 3 ? 'is-active' : ''}">3 <small>Consultation & Location</small></span>
    `
  }

  const headingEl = registerPopup.querySelector('.auth-form-heading h2')
  const subEl = registerPopup.querySelector('.auth-form-heading p')
  const kickerEl = registerPopup.querySelector('.auth-form-kicker')
  if (kickerEl) kickerEl.textContent = 'Clinic registration'

  const regFields = registerPopup.querySelector('.auth-register-fields')
  const actionsBar = form.querySelector('.auth-stage-actions')
  const backBtn = actionsBar?.querySelector('.auth-stage-back')
  const submitBtn = actionsBar?.querySelector('.auth-submit')
  if (actionsBar) actionsBar.style.display = 'flex'

  if (stage === 1) {
    if (headingEl) headingEl.textContent = 'Clinic registration details'
    if (subEl) subEl.textContent = 'Add the details needed to verify your clinic and appointments.'
    if (submitBtn) submitBtn.innerHTML = `Continue to next stage ${icon('arrow')}`
    regFields.innerHTML = clinicStage1Markup(form._clinicValues || {})
    setupPortalFieldEvents(form, 'clinic', ctx)
    if (backBtn) {
      backBtn.setAttribute('data-portal-back', '')
      backBtn.innerHTML = `${icon('chevron')} Portals`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openAuthModal('register', ctx)
      }
    }
  } else if (stage === 2) {
    if (headingEl) headingEl.textContent = 'Verify your account'
    if (subEl) subEl.textContent = 'Enter the 6-digit code sent to your official email address.'
    if (submitBtn) submitBtn.innerHTML = `Verify & Continue ${icon('arrow')}`
    regFields.innerHTML = portalVerificationStageMarkup(form._clinicValues?.email, form._clinicValues?.code)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const codeInput = form.querySelector('#popup-verification-code')
        if (codeInput) form._clinicValues.code = codeInput.value
        setClinicStage(registerPopup, form, 1, form._clinicValues, ctx)
      }
    }
  } else if (stage === 3) {
    if (headingEl) headingEl.textContent = 'Consultation & Location'
    if (subEl) subEl.textContent = 'Specify clinic profile, specialties, consultation modes, and clinic location.'
    if (submitBtn) submitBtn.innerHTML = `Complete registration ${icon('check')}`
    regFields.innerHTML = clinicStage2Markup(form._clinicValues || {})
    setupPortalFieldEvents(form, 'clinic', ctx)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const currentData = Object.fromEntries(new FormData(form))
        const hiddenSpecsVal = form.querySelector('#hidden-clinicSpecialties')?.value || ''
        const selectedSpecialties = hiddenSpecsVal.split(',').map(s => s.trim()).filter(Boolean)
        const selectedDays = Array.from(form.querySelectorAll('.clinic-stage-fields input[name="workingDays"]:checked')).map(cb => cb.value)
        const licenseInput = form.querySelector('#clinic-license')
        const licenseFile = licenseInput?.files?.[0]
        form._clinicValues = { 
          ...form._clinicValues, 
          ...currentData,
          specialties: selectedSpecialties,
          workingDays: selectedDays,
          licenseCertificate: licenseFile || form._clinicValues?.licenseCertificate
        }
        setClinicStage(registerPopup, form, 2, form._clinicValues, ctx)
      }
    }
  }

  registerPopup.scrollTop = 0
}

function hospitalStage1Markup(values = {}) {
  const photoLabel = (values.profilePhoto && values.profilePhoto.name) ? values.profilePhoto.name : 'Click to upload superintendent photo'
  const logoLabel = (values.logo && values.logo.name) ? values.logo.name : 'Click to upload hospital logo'
  const licenseLabel = (values.licenseCertificate && values.licenseCertificate.name) ? values.licenseCertificate.name : 'Click to upload registration certificate'
  const selectedCode = values.phoneCountryCode || '+91'
  const country = getCountryByCode(selectedCode)
  const digits = country.digits

  return `
    <div class="doctor-stage-fields hospital-stage-fields">
      <div>
        <label for="hospital-name">MEDICAL SUPERINTENDENT / SIGNATORY *</label>
        <input class="auth-text-input" id="hospital-name" name="name" type="text" autocomplete="name" value="${escapeHtml(values.name || '')}" placeholder="Full name of Medical Superintendent or Director" required>
      </div>
      <div>
        <label for="hospital-organisation">HOSPITAL REGISTERED NAME *</label>
        <input class="auth-text-input" id="hospital-organisation" name="organisation" type="text" value="${escapeHtml(values.organisation || '')}" placeholder="Legal hospital entity name" required>
      </div>
      <div>
        <label for="hospital-email">OFFICIAL HOSPITAL EMAIL *</label>
        <input class="auth-text-input" id="hospital-email" name="email" type="email" autocomplete="email" value="${escapeHtml(values.email || '')}" placeholder="admin@hospital.com" required>
      </div>
      <div class="doctor-phone-field-wrapper">
        <label for="hospital-phone">EMERGENCY HELPLINE / MOBILE *</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="hospital-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${selectedCode === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="hospital-phone" name="phone" type="tel" inputmode="numeric" value="${escapeHtml(values.phone || values.mobile || '')}" placeholder="${digits}-digit helpline number" maxlength="${digits}" pattern="[0-9]{${digits}}" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="hospital-phone-hint">Enter ${digits} digits for ${country.name}</small>
      </div>
      <div>
        <label for="hospital-password">PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="hospital-password" name="password" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.password || '')}" placeholder="Min 8 characters" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="hospital-password" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        <small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>
      </div>
      <div>
        <label for="hospital-confirmPassword">CONFIRM PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="hospital-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.confirmPassword || '')}" placeholder="Re-enter password" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="hospital-confirmPassword" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
      </div>

      <div>
        <label for="hospital-ceaNumber">CLINICAL ESTABLISHMENT ACT (CEA) NO. *</label>
        <input class="auth-text-input" id="hospital-ceaNumber" name="ceaNumber" type="text" value="${escapeHtml(values.ceaNumber || '')}" placeholder="State Govt. Health Dept. Registration ID" required>
      </div>
      <div>
        <label for="hospital-nabh">NABH / JCI ACCREDITATION NO. (OPTIONAL)</label>
        <input class="auth-text-input" id="hospital-nabh" name="nabhAccreditation" type="text" value="${escapeHtml(values.nabhAccreditation || '')}" placeholder="NABH / Pre-NABH / Entry-Level / ISO">
      </div>

      <div class="doctor-upload-field">
        <label for="hospital-photo">SUPERINTENDENT PROFILE PHOTO *</label>
        <label class="doctor-upload-control" for="hospital-photo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${photoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="hospital-photo" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" ${values.profilePhoto ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field">
        <label for="hospital-logo">HOSPITAL LOGO *</label>
        <label class="doctor-upload-control" for="hospital-logo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${logoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="hospital-logo" name="logo" type="file" accept=".jpg,.jpeg,.png" ${values.logo ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field portal-field-full">
        <label for="hospital-license">REGISTRATION CERTIFICATE *</label>
        <label class="doctor-upload-control" for="hospital-license">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${licenseLabel}</span>
          <small>JPG, PNG, PDF · Max 10MB</small>
        </label>
        <input id="hospital-license" name="licenseCertificate" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.licenseCertificate ? '' : 'required'}>
      </div>
    </div>
  `
}

function hospitalStage2Markup(values = {}) {
  const selectedState = values.state || ''
  const availableDistricts = selectedState ? (indianStatesAndDistricts[selectedState] || []) : []
  const selectedDistrict = values.district || ''
  const availableCities = selectedDistrict ? getCitiesForDistrict(selectedDistrict) : []
  const selectedCity = values.city || ''

  return `
    <div class="doctor-stage-fields hospital-stage-fields">
      <div class="portal-section-header">Hospital Classification & Capacity</div>
      <div class="portal-field-full">
        <label for="hospital-category">HOSPITAL CATEGORY *</label>
        <select class="auth-text-input" id="hospital-category" name="hospitalCategory" required>
          <option value="" ${!values.hospitalCategory ? 'selected' : ''}>Select Hospital Category</option>
          <option value="Multi-Specialty Hospital" ${values.hospitalCategory === 'Multi-Specialty Hospital' ? 'selected' : ''}>Multi-Specialty Hospital</option>
          <option value="Super-Specialty Hospital" ${values.hospitalCategory === 'Super-Specialty Hospital' ? 'selected' : ''}>Super-Specialty Hospital</option>
          <option value="General Hospital" ${values.hospitalCategory === 'General Hospital' ? 'selected' : ''}>General Hospital</option>
          <option value="Tertiary Care & Trauma" ${values.hospitalCategory === 'Tertiary Care & Trauma' ? 'selected' : ''}>Tertiary Care & Trauma Center</option>
          <option value="Maternity & Nursing Home" ${values.hospitalCategory === 'Maternity & Nursing Home' ? 'selected' : ''}>Maternity & Nursing Home</option>
        </select>
      </div>
      <div>
        <label for="hospital-bedCapacity">TOTAL INPATIENT BEDS *</label>
        <input class="auth-text-input" id="hospital-bedCapacity" name="bedCapacity" type="number" min="1" value="${escapeHtml(values.bedCapacity || '')}" placeholder="Total registered beds" required>
      </div>
      <div>
        <label for="hospital-icuBeds">ICU / CRITICAL CARE BEDS *</label>
        <input class="auth-text-input" id="hospital-icuBeds" name="icuBeds" type="number" min="0" value="${escapeHtml(values.icuBeds || '')}" placeholder="Dedicated ICU/CCU/NICU beds" required>
      </div>
      <div>
        <label for="hospital-emergencyCare">24/7 EMERGENCY & TRAUMA CARE *</label>
        <select class="auth-text-input" id="hospital-emergencyCare" name="emergencyCare" required>
          <option value="" ${!values.emergencyCare ? 'selected' : ''}>Select option</option>
          <option value="Yes" ${values.emergencyCare === 'Yes' ? 'selected' : ''}>Yes — 24/7 Casualty & Ambulance Active</option>
          <option value="No" ${values.emergencyCare === 'No' ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div>
        <label for="hospital-bloodBank">IN-HOUSE BLOOD BANK *</label>
        <select class="auth-text-input" id="hospital-bloodBank" name="bloodBank" required>
          <option value="" ${!values.bloodBank ? 'selected' : ''}>Select option</option>
          <option value="Yes" ${values.bloodBank === 'Yes' ? 'selected' : ''}>Yes — Licensed In-house Blood Bank</option>
          <option value="No" ${values.bloodBank === 'No' ? 'selected' : ''}>No</option>
        </select>
      </div>

      <div class="portal-section-header">Location</div>
      <div class="portal-field-full">
        <label for="hospital-address">HOSPITAL ADDRESS *</label>
        <input class="auth-text-input" id="hospital-address" name="address" type="text" value="${escapeHtml(values.address || '')}" placeholder="Building / Plot No., Sector / Road, Landmark" required>
      </div>
      <div>
        <label for="hospital-state">STATE *</label>
        <select class="auth-text-input" id="hospital-state" name="state" required>
          <option value="">Select State</option>
          ${indianStates.map(st => `<option value="${st}" ${selectedState === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="hospital-district">DISTRICT *</label>
        <select class="auth-text-input" id="hospital-district" name="district" required ${availableDistricts.length ? '' : 'disabled'}>
          <option value="">Select District</option>
          ${availableDistricts.map(d => `<option value="${d}" ${selectedDistrict === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="hospital-city">CITY / TOWN *</label>
        <select class="auth-text-input" id="hospital-city" name="city" required ${availableCities.length ? '' : 'disabled'}>
          <option value="">Select City / Town</option>
          ${availableCities.map(c => `<option value="${c}" ${selectedCity === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="hospital-pincode">PINCODE *</label>
        <input class="auth-text-input" id="hospital-pincode" name="pincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(values.pincode || '')}" placeholder="6-digit Pincode" required>
      </div>
    </div>
  `
}

function hospitalRegistrationMarkup(values = {}) {
  return hospitalStage1Markup(values)
}

function setHospitalStage(registerPopup, form, stage, values, ctx) {
  form.dataset.portal = 'hospital'
  form.dataset.stage = String(stage)
  form._hospitalValues = { ...form._hospitalValues, ...values }

  const stepper = registerPopup.querySelector('.auth-register-stepper')
  if (stepper) {
    stepper.style.display = 'flex'
    stepper.innerHTML = `
      <span class="${stage === 1 ? 'is-active' : 'is-complete'}">${stage > 1 ? icon('check') : '1'} <small>Details</small></span>
      <i></i>
      <span class="${stage === 2 ? 'is-active' : (stage > 2 ? 'is-complete' : '')}">${stage > 2 ? icon('check') : '2'} <small>Verify</small></span>
      <i></i>
      <span class="${stage === 3 ? 'is-active' : ''}">3 <small>Classification & Location</small></span>
    `
  }

  const headingEl = registerPopup.querySelector('.auth-form-heading h2')
  const subEl = registerPopup.querySelector('.auth-form-heading p')
  const kickerEl = registerPopup.querySelector('.auth-form-kicker')
  if (kickerEl) kickerEl.textContent = 'Hospital registration'

  const regFields = registerPopup.querySelector('.auth-register-fields')
  const actionsBar = form.querySelector('.auth-stage-actions')
  const backBtn = actionsBar?.querySelector('.auth-stage-back')
  const submitBtn = actionsBar?.querySelector('.auth-submit')
  if (actionsBar) actionsBar.style.display = 'flex'

  if (stage === 1) {
    if (headingEl) headingEl.textContent = 'Hospital registration details'
    if (subEl) subEl.textContent = 'Add the details needed to verify your hospital and admissions.'
    if (submitBtn) submitBtn.innerHTML = `Continue to next stage ${icon('arrow')}`
    regFields.innerHTML = hospitalStage1Markup(form._hospitalValues || {})
    setupPortalFieldEvents(form, 'hospital', ctx)
    if (backBtn) {
      backBtn.setAttribute('data-portal-back', '')
      backBtn.innerHTML = `${icon('chevron')} Portals`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openAuthModal('register', ctx)
      }
    }
  } else if (stage === 2) {
    if (headingEl) headingEl.textContent = 'Verify your account'
    if (subEl) subEl.textContent = 'Enter the 6-digit code sent to your official email address.'
    if (submitBtn) submitBtn.innerHTML = `Verify & Continue ${icon('arrow')}`
    regFields.innerHTML = portalVerificationStageMarkup(form._hospitalValues?.email, form._hospitalValues?.code)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const codeInput = form.querySelector('#popup-verification-code')
        if (codeInput) form._hospitalValues.code = codeInput.value
        setHospitalStage(registerPopup, form, 1, form._hospitalValues, ctx)
      }
    }
  } else if (stage === 3) {
    if (headingEl) headingEl.textContent = 'Hospital Classification & Location'
    if (subEl) subEl.textContent = 'Specify hospital classification, bed capacity, emergency facilities, and hospital location.'
    if (submitBtn) submitBtn.innerHTML = `Complete registration ${icon('check')}`
    regFields.innerHTML = hospitalStage2Markup(form._hospitalValues || {})
    setupPortalFieldEvents(form, 'hospital', ctx)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const currentData = Object.fromEntries(new FormData(form))
        form._hospitalValues = { ...form._hospitalValues, ...currentData }
        setHospitalStage(registerPopup, form, 2, form._hospitalValues, ctx)
      }
    }
  }

  registerPopup.scrollTop = 0
}

function pharmacyStage1Markup(values = {}) {
  const photoLabel = (values.profilePhoto && values.profilePhoto.name) ? values.profilePhoto.name : 'Click to upload pharmacist photo'
  const logoLabel = (values.logo && values.logo.name) ? values.logo.name : 'Click to upload pharmacy logo'
  const selectedCode = values.phoneCountryCode || '+91'
  const country = getCountryByCode(selectedCode)
  const digits = country.digits

  return `
    <div class="doctor-stage-fields pharmacy-stage-fields">
      <div>
        <label for="pharmacy-name">CONTACT PERSON / REGISTERED PHARMACIST *</label>
        <input class="auth-text-input" id="pharmacy-name" name="name" type="text" autocomplete="name" value="${escapeHtml(values.name || '')}" placeholder="Full name of pharmacist or in-charge" required>
      </div>
      <div>
        <label for="pharmacy-organisation">REGISTERED PHARMACY NAME *</label>
        <input class="auth-text-input" id="pharmacy-organisation" name="organisation" type="text" value="${escapeHtml(values.organisation || '')}" placeholder="Official registered medical store name" required>
      </div>
      <div>
        <label for="pharmacy-email">OFFICIAL EMAIL *</label>
        <input class="auth-text-input" id="pharmacy-email" name="email" type="email" autocomplete="email" value="${escapeHtml(values.email || '')}" placeholder="admin@pharmacy.com" required>
      </div>
      <div class="doctor-phone-field-wrapper">
        <label for="pharmacy-phone">MOBILE NUMBER *</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="pharmacy-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${selectedCode === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="pharmacy-phone" name="phone" type="tel" inputmode="numeric" value="${escapeHtml(values.phone || values.mobile || '')}" placeholder="${digits}-digit mobile number" maxlength="${digits}" pattern="[0-9]{${digits}}" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="pharmacy-phone-hint">Enter ${digits} digits for ${country.name}</small>
      </div>
      <div>
        <label for="pharmacy-password">PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="pharmacy-password" name="password" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.password || '')}" placeholder="Min 8 characters" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="pharmacy-password" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        <small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>
      </div>
      <div>
        <label for="pharmacy-confirmPassword">CONFIRM PASSWORD *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="pharmacy-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" value="${escapeHtml(values.confirmPassword || '')}" placeholder="Re-enter password" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="pharmacy-confirmPassword" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
      </div>

      <div class="doctor-upload-field">
        <label for="pharmacy-photo">PHARMACIST PROFILE PHOTO *</label>
        <label class="doctor-upload-control" for="pharmacy-photo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${photoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="pharmacy-photo" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" ${values.profilePhoto ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field">
        <label for="pharmacy-logo">PHARMACY STOREFRONT / LOGO *</label>
        <label class="doctor-upload-control" for="pharmacy-logo">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${logoLabel}</span>
          <small>JPG or PNG · Max 10MB</small>
        </label>
        <input id="pharmacy-logo" name="logo" type="file" accept=".jpg,.jpeg,.png" ${values.logo ? '' : 'required'}>
      </div>
    </div>
  `
}

function pharmacyStage2Markup(values = {}) {
  const selectedState = values.state || ''
  const availableDistricts = selectedState ? (indianStatesAndDistricts[selectedState] || []) : []
  const selectedDistrict = values.district || ''
  const availableCities = selectedDistrict ? getCitiesForDistrict(selectedDistrict) : []
  const selectedCity = values.city || ''

  const currentServices = Array.isArray(values.services) 
    ? values.services 
    : (typeof values.services === 'string' ? values.services.split(',').map(s => s.trim()).filter(Boolean) : [])

  const servicesList = [
    'Prescription Medicines (Allopathy)',
    'OTC Health & Wellness',
    'Cold-Chain / Insulin Storage',
    'Surgical Supplies & Healthcare Devices',
    'Ayush / Herbal / Homeopathy',
    'Chronic Disease Refill Subscriptions',
    '24/7 Emergency Medicine Counter',
    'Baby & Maternal Care Products',
    'Diagnostic Test Kits & Monitors'
  ]

  const isDaySelected = (d) => {
    if (!values.workingDays) return false
    if (Array.isArray(values.workingDays)) return values.workingDays.includes(d)
    return String(values.workingDays).includes(d)
  }

  const licenseLabel = (values.licenseCertificate && values.licenseCertificate.name) ? values.licenseCertificate.name : 'Click to upload drug license certificate'

  return `
    <div class="doctor-stage-fields pharmacy-stage-fields">
      <div>
        <label for="pharmacy-pharmacyType">PHARMACY TYPE *</label>
        <select class="auth-text-input" id="pharmacy-pharmacyType" name="pharmacyType" required>
          <option value="" ${!values.pharmacyType ? 'selected' : ''}>Select Pharmacy Type</option>
          <option value="Retail Chemist & Druggist" ${values.pharmacyType === 'Retail Chemist & Druggist' ? 'selected' : ''}>Retail Chemist & Druggist</option>
          <option value="24/7 Medical Store" ${values.pharmacyType === '24/7 Medical Store' ? 'selected' : ''}>24/7 Medical Store</option>
          <option value="Hospital / Clinic Attached Pharmacy" ${values.pharmacyType === 'Hospital / Clinic Attached Pharmacy' ? 'selected' : ''}>Hospital / Clinic Attached Pharmacy</option>
          <option value="Wholesale & Distribution Pharmacy" ${values.pharmacyType === 'Wholesale & Distribution Pharmacy' ? 'selected' : ''}>Wholesale & Distribution Pharmacy</option>
          <option value="AYUSH / Herbal Pharmacy" ${values.pharmacyType === 'AYUSH / Herbal Pharmacy' ? 'selected' : ''}>AYUSH / Herbal Pharmacy</option>
        </select>
      </div>
      <div>
        <label for="pharmacy-councilRegNumber">PHARMACIST COUNCIL REG. NO. *</label>
        <input class="auth-text-input" id="pharmacy-councilRegNumber" name="councilRegNumber" type="text" value="${escapeHtml(values.councilRegNumber || '')}" placeholder="State Pharmacy Council Reg No." required>
      </div>

      <div>
        <label for="pharmacy-drugLicenseNumber">DRUG LICENSE NO. (FORM 20 / 21) *</label>
        <input class="auth-text-input" id="pharmacy-drugLicenseNumber" name="drugLicenseNumber" type="text" value="${escapeHtml(values.drugLicenseNumber || '')}" placeholder="e.g. DL-20-XXXX / DL-21-XXXX" required>
      </div>
      <div class="doctor-upload-field">
        <label for="pharmacy-license">DRUG LICENSE CERTIFICATE *</label>
        <label class="doctor-upload-control" for="pharmacy-license">
          ${icon('plus')}
          <span class="upload-btn-label doctor-upload-label-text">${licenseLabel}</span>
          <small>JPG, PNG, PDF · Max 10MB</small>
        </label>
        <input id="pharmacy-license" name="licenseCertificate" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.licenseCertificate ? '' : 'required'}>
      </div>

      <div class="portal-field-full">
        <label for="select-pharmacyServices">PHARMACY SERVICES OFFERED *</label>
        <div class="doctor-multi-select-wrap">
          <select class="auth-text-input doctor-chip-select" id="select-pharmacyServices" data-field="pharmacyServices">
            <option value="">Select pharmacy service...</option>
            ${servicesList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
            <option value="Other">Other (Specify custom service)</option>
          </select>
        </div>
        <div class="doctor-chips-container" id="chips-pharmacyServices" style="${currentServices.length ? 'display: flex;' : 'display: none;'}">
          ${currentServices.map(s => `
            <span class="doctor-chip">
              <span>${escapeHtml(s)}</span>
              <button type="button" class="doctor-chip-remove" data-field="pharmacyServices" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
            </span>
          `).join('')}
        </div>
        <div class="doctor-chip-other-input-wrap" id="other-wrap-pharmacyServices" style="display: none;">
          <input type="text" class="auth-text-input" id="other-input-pharmacyServices" placeholder="Specify service and click Add" maxlength="60">
          <button type="button" class="button button-primary doctor-chip-other-btn" data-field="pharmacyServices">Add</button>
        </div>
        <input type="hidden" id="hidden-pharmacyServices" name="services" value="${escapeHtml(currentServices.join(', '))}">
      </div>

      <div class="portal-field-full">
        <label for="pharmacy-homeDelivery">HOME DELIVERY AVAILABLE *</label>
        <select class="auth-text-input" id="pharmacy-homeDelivery" name="homeDelivery" required>
          <option value="" ${!values.homeDelivery ? 'selected' : ''}>Select option</option>
          <option value="Yes" ${values.homeDelivery === 'Yes' ? 'selected' : ''}>Yes — Medicine home delivery available</option>
          <option value="No" ${values.homeDelivery === 'No' ? 'selected' : ''}>No — Store walk-ins only</option>
        </select>
      </div>

      <div class="portal-field-full">
        <div class="doctor-option-group">
          <label class="doctor-field-title">WORKING DAYS *</label>
          <div class="doctor-pills-grid">
            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
              <label class="doctor-pill-checkbox ${isDaySelected(day) ? 'is-checked' : ''}">
                <input type="checkbox" name="workingDays" value="${day}" ${isDaySelected(day) ? 'checked' : ''}>
                <span class="pill-checkbox-indicator"></span>
                <span>${day}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <label for="pharmacy-workingHoursFrom">OPERATING HOURS – FROM *</label>
        <input class="auth-text-input" id="pharmacy-workingHoursFrom" name="workingHoursFrom" type="time" value="${values.workingHoursFrom || '08:00'}" placeholder="08:00" required>
      </div>
      <div>
        <label for="pharmacy-workingHoursTo">OPERATING HOURS – TO *</label>
        <input class="auth-text-input" id="pharmacy-workingHoursTo" name="workingHoursTo" type="time" value="${values.workingHoursTo || '22:00'}" placeholder="22:00" required>
      </div>

      <div class="portal-section-header">Location Details</div>
      <div class="portal-field-full">
        <label for="pharmacy-address">PHARMACY ADDRESS / BUILDING / LANDMARK *</label>
        <input class="auth-text-input" id="pharmacy-address" name="address" type="text" value="${escapeHtml(values.address || '')}" placeholder="Shop no., Building, Street, Landmark" required>
      </div>
      <div>
        <label for="pharmacy-state">STATE *</label>
        <select class="auth-text-input" id="pharmacy-state" name="state" required>
          <option value="">Select State</option>
          ${indianStates.map(st => `<option value="${st}" ${selectedState === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="pharmacy-district">DISTRICT *</label>
        <select class="auth-text-input" id="pharmacy-district" name="district" required ${availableDistricts.length ? '' : 'disabled'}>
          <option value="">Select District</option>
          ${availableDistricts.map(d => `<option value="${d}" ${selectedDistrict === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="pharmacy-city">CITY / TOWN *</label>
        <select class="auth-text-input" id="pharmacy-city" name="city" required ${availableCities.length ? '' : 'disabled'}>
          <option value="">Select City / Town</option>
          ${availableCities.map(c => `<option value="${c}" ${selectedCity === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="pharmacy-pincode">PINCODE *</label>
        <input class="auth-text-input" id="pharmacy-pincode" name="pincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(values.pincode || '')}" placeholder="6-digit Pincode" required>
      </div>
    </div>
  `
}

function pharmacyRegistrationMarkup(values = {}) {
  return pharmacyStage1Markup(values)
}

function setPharmacyStage(registerPopup, form, stage, values, ctx) {
  form.dataset.portal = 'pharmacy'
  form.dataset.stage = String(stage)
  form._pharmacyValues = { ...form._pharmacyValues, ...values }

  const stepper = registerPopup.querySelector('.auth-register-stepper')
  if (stepper) {
    stepper.style.display = 'flex'
    stepper.innerHTML = `
      <span class="${stage === 1 ? 'is-active' : 'is-complete'}">${stage > 1 ? icon('check') : '1'} <small>Details</small></span>
      <i></i>
      <span class="${stage === 2 ? 'is-active' : (stage > 2 ? 'is-complete' : '')}">${stage > 2 ? icon('check') : '2'} <small>Verify</small></span>
      <i></i>
      <span class="${stage === 3 ? 'is-active' : ''}">3 <small>Operations & Location</small></span>
    `
  }

  const headingEl = registerPopup.querySelector('.auth-form-heading h2')
  const subEl = registerPopup.querySelector('.auth-form-heading p')
  const kickerEl = registerPopup.querySelector('.auth-form-kicker')
  if (kickerEl) kickerEl.textContent = 'Pharmacy registration'

  const regFields = registerPopup.querySelector('.auth-register-fields')
  const actionsBar = form.querySelector('.auth-stage-actions')
  const backBtn = actionsBar?.querySelector('.auth-stage-back')
  const submitBtn = actionsBar?.querySelector('.auth-submit')
  if (actionsBar) actionsBar.style.display = 'flex'

  if (stage === 1) {
    if (headingEl) headingEl.textContent = 'Pharmacy registration details'
    if (subEl) subEl.textContent = 'Add the details needed to verify your pharmacy account and orders.'
    if (submitBtn) submitBtn.innerHTML = `Continue to next stage ${icon('arrow')}`
    regFields.innerHTML = pharmacyStage1Markup(form._pharmacyValues || {})
    setupPortalFieldEvents(form, 'pharmacy', ctx)
    if (backBtn) {
      backBtn.setAttribute('data-portal-back', '')
      backBtn.innerHTML = `${icon('chevron')} Portals`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openAuthModal('register', ctx)
      }
    }
  } else if (stage === 2) {
    if (headingEl) headingEl.textContent = 'Verify your account'
    if (subEl) subEl.textContent = 'Enter the 6-digit code sent to your official email address.'
    if (submitBtn) submitBtn.innerHTML = `Verify & Continue ${icon('arrow')}`
    regFields.innerHTML = portalVerificationStageMarkup(form._pharmacyValues?.email, form._pharmacyValues?.code)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const codeInput = form.querySelector('#popup-verification-code')
        if (codeInput) form._pharmacyValues.code = codeInput.value
        setPharmacyStage(registerPopup, form, 1, form._pharmacyValues, ctx)
      }
    }
  } else if (stage === 3) {
    if (headingEl) headingEl.textContent = 'Operations & Location'
    if (subEl) subEl.textContent = 'Specify pharmacy type, drug licenses, services, timings, and store location.'
    if (submitBtn) submitBtn.innerHTML = `Complete registration ${icon('check')}`
    regFields.innerHTML = pharmacyStage2Markup(form._pharmacyValues || {})
    setupPortalFieldEvents(form, 'pharmacy', ctx)
    if (backBtn) {
      backBtn.removeAttribute('data-portal-back')
      backBtn.innerHTML = `${icon('chevron')} Back`
      backBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const currentData = Object.fromEntries(new FormData(form))
        const hiddenServicesVal = form.querySelector('#hidden-pharmacyServices')?.value || ''
        const selectedServices = hiddenServicesVal.split(',').map(s => s.trim()).filter(Boolean)
        const selectedDays = Array.from(form.querySelectorAll('.pharmacy-stage-fields input[name="workingDays"]:checked')).map(cb => cb.value)
        const licenseInput = form.querySelector('#pharmacy-license')
        const licenseFile = licenseInput?.files?.[0]
        form._pharmacyValues = { 
          ...form._pharmacyValues, 
          ...currentData,
          services: selectedServices,
          workingDays: selectedDays,
          licenseCertificate: licenseFile || form._pharmacyValues?.licenseCertificate
        }
        setPharmacyStage(registerPopup, form, 2, form._pharmacyValues, ctx)
      }
    }
  }

  registerPopup.scrollTop = 0
}

function setupPortalFieldEvents(form, portalType, ctx) {
  form.querySelectorAll(`.${portalType}-stage-fields input[type="file"]`).forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      const labelSpan = input.closest('.doctor-upload-field')?.querySelector('.upload-btn-label')
      if (file && labelSpan) {
        if (file.size > 10 * 1024 * 1024) {
          if (ctx?.showToast) {
            ctx.showToast(`"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a file smaller than 10MB.`)
          }
          input.value = ''
          labelSpan.textContent = 'Click to upload'
          return
        }
        labelSpan.textContent = file.name
        labelSpan.title = file.name
      }
    })
  })

  const phoneCodeSelect = form.querySelector(`#${portalType}-phone-country-code`)
  const phoneInput = form.querySelector(`#${portalType}-phone`)
  const phoneHint = form.querySelector(`#${portalType}-phone-hint`)
  if (phoneCodeSelect && phoneInput) {
    const updatePhoneConstraints = () => {
      const opt = phoneCodeSelect.options[phoneCodeSelect.selectedIndex]
      const digits = parseInt(opt?.getAttribute('data-digits') || '10', 10)
      const name = opt?.getAttribute('data-name') || 'selected country'
      phoneInput.maxLength = digits
      phoneInput.placeholder = `${digits}-digit mobile number`
      phoneInput.pattern = `[0-9]{${digits}}`
      if (phoneHint) phoneHint.textContent = `Enter ${digits} digits for ${name}`
      if (phoneInput.value.length > digits) phoneInput.value = phoneInput.value.slice(0, digits)
    }
    phoneCodeSelect.addEventListener('change', () => {
      updatePhoneConstraints()
      phoneInput.focus()
    })
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '')
      const opt = phoneCodeSelect.options[phoneCodeSelect.selectedIndex]
      const digits = parseInt(opt?.getAttribute('data-digits') || '10', 10)
      if (phoneInput.value.length > digits) phoneInput.value = phoneInput.value.slice(0, digits)
    })
    updatePhoneConstraints()
  }

  const stateSelect = form.querySelector(`#${portalType}-state`)
  const districtSelect = form.querySelector(`#${portalType}-district`)
  const citySelect = form.querySelector(`#${portalType}-city`)

  if (stateSelect && districtSelect && citySelect) {
    stateSelect.addEventListener('change', () => {
      const st = stateSelect.value
      const districts = st ? (indianStatesAndDistricts[st] || []) : []
      if (districts.length > 0) {
        districtSelect.innerHTML = `<option value="">Select District</option>` + districts.map(d => `<option value="${d}">${d}</option>`).join('')
        districtSelect.disabled = false
      } else {
        districtSelect.innerHTML = `<option value="">Select District</option>`
        districtSelect.disabled = true
      }
      citySelect.innerHTML = `<option value="">Select City / Town</option>`
      citySelect.disabled = true
    })

    districtSelect.addEventListener('change', () => {
      const dist = districtSelect.value
      const cities = dist ? getCitiesForDistrict(dist) : []
      if (cities.length > 0) {
        citySelect.innerHTML = `<option value="">Select City / Town</option>` + cities.map(c => `<option value="${c}">${c}</option>`).join('')
        citySelect.disabled = false
      } else {
        citySelect.innerHTML = `<option value="">Select City / Town</option>`
        citySelect.disabled = true
      }
    })
  }

  const setupChipSelect = (fieldName) => {
    const select = form.querySelector(`#select-${fieldName}`)
    const container = form.querySelector(`#chips-${fieldName}`)
    const hiddenInput = form.querySelector(`#hidden-${fieldName}`)
    const otherWrap = form.querySelector(`#other-wrap-${fieldName}`)
    const otherInput = form.querySelector(`#other-input-${fieldName}`)
    const otherBtn = form.querySelector(`button[data-field="${fieldName}"].doctor-chip-other-btn`)

    if (!select && !container && !hiddenInput) return

    const getSelected = () => {
      if (!hiddenInput || !hiddenInput.value) return []
      return hiddenInput.value.split(',').map(s => s.trim()).filter(Boolean)
    }

    const setSelected = (items) => {
      const unique = Array.from(new Set(items.map(s => s.trim()).filter(Boolean)))
      if (hiddenInput) {
        hiddenInput.value = unique.join(', ')
      }
      if (container) {
        container.style.display = unique.length ? 'flex' : 'none'
        container.innerHTML = unique.map(item => `
          <span class="doctor-chip">
            <span>${escapeHtml(item)}</span>
            <button type="button" class="doctor-chip-remove" data-field="${fieldName}" data-val="${escapeHtml(item)}" aria-label="Remove ${escapeHtml(item)}">&times;</button>
          </span>
        `).join('')
      }
    }

    if (select) {
      select.addEventListener('change', () => {
        const val = select.value.trim()
        if (!val) return
        if (val === 'Other') {
          if (otherWrap) {
            otherWrap.style.display = 'flex'
            otherInput?.focus()
          }
          select.value = ''
          return
        }
        const current = getSelected()
        if (!current.includes(val)) {
          setSelected([...current, val])
        }
        select.value = ''
      })
    }

    const addOther = () => {
      if (!otherInput) return
      const val = otherInput.value.trim()
      if (val) {
        const current = getSelected()
        if (!current.includes(val)) {
          setSelected([...current, val])
        }
        otherInput.value = ''
      }
      if (otherWrap) otherWrap.style.display = 'none'
    }

    if (otherBtn) {
      otherBtn.addEventListener('click', (e) => {
        e.preventDefault()
        addOther()
      })
    }

    if (otherInput) {
      otherInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          addOther()
        } else if (e.key === 'Escape') {
          if (otherWrap) otherWrap.style.display = 'none'
        }
      })
    }

    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.doctor-chip-remove')
        if (btn) {
          e.preventDefault()
          const val = btn.dataset.val
          const current = getSelected()
          setSelected(current.filter(item => item !== val))
        }
      })
    }
  }

  if (portalType === 'diagnostic') {
    setupChipSelect('diagnosticServices')
    form.querySelectorAll('.diagnostic-stage-fields input[name="workingDays"]').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
      })
    })
  }

  if (portalType === 'clinic') {
    setupChipSelect('clinicSpecialties')
    form.querySelectorAll('.clinic-stage-fields input[name="workingDays"]').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
      })
    })
  }

  if (portalType === 'pharmacy') {
    setupChipSelect('pharmacyServices')
    form.querySelectorAll('.pharmacy-stage-fields input[name="workingDays"]').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
      })
    })
  }
}

function setupDiagnosticFieldEvents(form, ctx) {
  setupPortalFieldEvents(form, 'diagnostic', ctx)
}

function registrationFieldsMarkup(type) {
  if (type === 'diagnostic') {
    return diagnosticRegistrationMarkup()
  }
  if (type === 'clinic') {
    return clinicRegistrationMarkup()
  }
  if (type === 'hospital') {
    return hospitalRegistrationMarkup()
  }
  if (type === 'pharmacy') {
    return pharmacyRegistrationMarkup()
  }
  return portalRegistrationFields[type].map(([name, label, inputType, placeholder]) => {
    if (inputType === 'password') {
      return `<div><label for="popup-${name}">${label}</label><div class="auth-password-wrapper"><input class="auth-text-input auth-password-input" id="popup-${name}" name="${name}" type="${inputType}" autocomplete="off" placeholder="${placeholder}" minlength="8" required><button type="button" class="auth-password-toggle" data-toggle-target="popup-${name}" aria-label="Show password" title="Show password" tabindex="-1">${icon('eye')}</button></div><small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small></div>`
    }
    return `<div><label for="popup-${name}">${label}</label><input class="auth-text-input" id="popup-${name}" name="${name}" type="${inputType}" autocomplete="${inputType === 'email' ? 'email' : 'off'}" placeholder="${placeholder}" required></div>`
  }).join('')
}

function portalLabel(type) {
  return portalOptions.find(option => option.value === type)?.label || 'Portal'
}

const doctorStages = ['PERSONAL', 'VERIFICATION', 'EDUCATION & PRACTICE', 'LOCATION', 'REVIEW']
const doctorStageKeys = ['personal', 'verification', 'education', 'location', 'review']

function doctorStepperMarkup(activeStage) {
  return doctorStages.map((stage, index) => `<span class="${index < activeStage ? 'is-complete' : index === activeStage ? 'is-active' : ''}">${index < activeStage ? icon('check') : index + 1}<small>${stage}</small></span>${index < doctorStages.length - 1 ? '<i></i>' : ''}`).join('')
}

export function openPdfPreviewModal(values = {}) {
  const existing = document.querySelector('.doctor-pdf-modal-backdrop')
  if (existing) existing.remove()

  const pdfUrl = getDoctorApplicationPdfUrl(values)
  const doctorName = `Dr. ${values.firstName || ''} ${values.lastName || ''}`.trim() || 'Doctor'

  const backdrop = document.createElement('div')
  backdrop.className = 'doctor-pdf-modal-backdrop'
  backdrop.innerHTML = `
    <div class="doctor-pdf-modal-container" role="dialog" aria-modal="true" aria-label="Application PDF Preview">
      <header class="doctor-pdf-modal-header">
        <div class="doctor-pdf-modal-title">
          <img src="/tatito-health-logo.png" alt="Tatito Health Logo" class="doctor-pdf-modal-logo" style="width: 38px; height: 38px; object-fit: contain; border-radius: 6px; background: white; padding: 2px; border: 1px solid rgba(11, 110, 93, 0.2);" />
          <div>
            <h3>Doctor Application PDF Preview</h3>
            <p>${doctorName} · Official Empanelment Application</p>
          </div>
        </div>
        <div class="doctor-pdf-modal-actions">
          <button type="button" class="button button-primary doctor-pdf-download-btn" id="modal-download-pdf">
            ${icon('file')} Download PDF
          </button>
          <button type="button" class="doctor-pdf-modal-close" aria-label="Close PDF Preview">
            ${icon('cross')}
          </button>
        </div>
      </header>
      <div class="doctor-pdf-modal-body">
        <iframe src="${pdfUrl}#toolbar=1&navpanes=0" class="doctor-pdf-iframe" title="Application PDF Preview"></iframe>
      </div>
      <footer class="doctor-pdf-modal-footer">
        <span>Verify all particulars before final submission.</span>
        <button type="button" class="button button-outline doctor-pdf-back-btn" id="modal-close-pdf">
          Close & Return to Review
        </button>
      </footer>
    </div>
  `

  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()
  backdrop.querySelector('.doctor-pdf-modal-close').addEventListener('click', close)
  backdrop.querySelector('#modal-close-pdf').addEventListener('click', close)
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })
  backdrop.querySelector('#modal-download-pdf').addEventListener('click', () => {
    downloadDoctorApplicationPdf(values)
  })
}

export function openCertificatePreviewModal(file, title = 'Enrollment Certificate Preview') {
  if (!file) return

  const existing = document.querySelector('.doctor-cert-modal-backdrop')
  if (existing) existing.remove()

  const fileName = file.name || 'Certificate.pdf'
  const isPdf = fileName.toLowerCase().endsWith('.pdf') || (file.type && file.type === 'application/pdf')
  
  let objectUrl = ''
  let shouldRevoke = false
  if (typeof file === 'string') {
    objectUrl = file
  } else if (file instanceof Blob) {
    objectUrl = URL.createObjectURL(file)
    shouldRevoke = true
  } else {
    return
  }

  const backdrop = document.createElement('div')
  backdrop.className = 'doctor-pdf-modal-backdrop doctor-cert-modal-backdrop'
  backdrop.innerHTML = `
    <div class="doctor-pdf-modal-container" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="doctor-pdf-modal-header">
        <div class="doctor-pdf-modal-title">
          <div class="doctor-pdf-icon-badge">
            ${isPdf ? icon('file') : icon('eye')}
          </div>
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 450px;">${escapeHtml(fileName)}</p>
          </div>
        </div>
        <div class="doctor-pdf-modal-actions">
          <a href="${objectUrl}" target="_blank" rel="noopener noreferrer" class="button button-outline doctor-cert-newtab-btn" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; padding: 7px 12px; border-radius: 6px; text-decoration: none;">
            ${icon('external')} Open in New Tab
          </a>
          <a href="${objectUrl}" download="${escapeHtml(fileName)}" class="button button-primary doctor-pdf-download-btn" style="text-decoration: none;">
            ${icon('file')} Download
          </a>
          <button type="button" class="doctor-pdf-modal-close" aria-label="Close Certificate Preview">
            ${icon('cross')}
          </button>
        </div>
      </header>
      <div class="doctor-pdf-modal-body" style="background: #2b2e30; display: flex; align-items: center; justify-content: center; overflow: auto; padding: ${isPdf ? '0' : '16px'};">
        ${isPdf
          ? `<iframe src="${objectUrl}#toolbar=1&navpanes=0" class="doctor-pdf-iframe" title="${escapeHtml(fileName)}"></iframe>`
          : `<img src="${objectUrl}" alt="${escapeHtml(fileName)}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);" />`
        }
      </div>
      <footer class="doctor-pdf-modal-footer">
        <span>Verified Practitioner Document · ${escapeHtml(fileName)}</span>
        <button type="button" class="button button-outline doctor-pdf-back-btn" id="modal-close-cert">
          Close Preview
        </button>
      </footer>
    </div>
  `

  document.body.appendChild(backdrop)

  let cleanedUp = false
  const close = () => {
    if (cleanedUp) return
    cleanedUp = true
    backdrop.remove()
    document.removeEventListener('keydown', escHandler)
    if (shouldRevoke) {
      setTimeout(() => {
        try { URL.revokeObjectURL(objectUrl) } catch (_) {}
      }, 3000)
    }
  }

  const escHandler = (e) => {
    if (e.key === 'Escape') close()
  }
  document.addEventListener('keydown', escHandler)

  backdrop.querySelector('.doctor-pdf-modal-close').addEventListener('click', close)
  backdrop.querySelector('#modal-close-cert').addEventListener('click', close)
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })
}

function doctorStageMarkup(stage, values = {}) {
  const fields = {
    personal: [['firstName', 'FIRST NAME*', 'text', values.firstName || '', 'Enter first name'], ['lastName', 'LAST NAME*', 'text', values.lastName || '', 'Enter last name'], ['gender', 'GENDER*', 'select', values.gender || '', 'Select gender'], ['dateOfBirth', 'DATE OF BIRTH*', 'date', values.dateOfBirth || '', ''], ['phone', 'MOBILE NUMBER*', 'tel', values.phone || '', '10-digit mobile number'], ['email', 'EMAIL*', 'email', values.email || '', 'doctor@practice.com'], ['password', 'PASSWORD*', 'password', values.password || '', 'Min 8 characters'], ['confirmPassword', 'CONFIRM PASSWORD*', 'password', values.confirmPassword || '', 'Re-enter password'], ['idType', 'ID PROOF TYPE*', 'select', values.idType || '', 'Select document'], ['idProof', 'UPLOAD ID PROOF*', 'file', '', 'Click to upload'], ['profilePhoto', 'PROFILE PHOTO*', 'file-image', '', 'Click to upload your profile photo'], ['referralCode', 'HAVE A REFERRAL CODE? (OPTIONAL)', 'text', values.referralCode || '', 'Enter referral code (optional)']],
    verification: [['code', 'Verification code', 'text', '', 'Enter 6-digit code']]
  }

  if (stage === 'education') {
    const degrees = ['MBBS', 'Diploma', 'MD', 'MS', 'DM', 'MCH', 'Other UG', 'Other PG']
    const universities = [...Object.keys(medicalUniversitiesAndColleges).sort(), 'Other']
    const currentYear = new Date().getFullYear()
    const years = []
    for (let y = currentYear; y >= 1970; y--) years.push(y)

    const selectedUniv = values.university || ''
    const availableColleges = (selectedUniv && selectedUniv !== 'Other') ? (medicalUniversitiesAndColleges[selectedUniv] || []) : []

    const degreeCertLabel = (values.degreeCert && values.degreeCert.name) ? values.degreeCert.name : 'Upload File (Optional)'
    const enrollCertLabel = (values.enrollmentCert && values.enrollmentCert.name)
      ? (values.enrollmentCert.name.startsWith('NMC_IMR_Certificate_') ? `✓ ${values.enrollmentCert.name}` : values.enrollmentCert.name)
      : 'Upload File'

    const getArray = (v) => {
      if (!v) return []
      if (Array.isArray(v)) return v
      return String(v).split(',').map(s => s.trim()).filter(Boolean)
    }

    const selectedPrimSpecs = getArray(values.primarySpecialization || values.specialty)
    const selectedSubSpecs = getArray(values.subSpecialization)
    const selectedQuals = getArray(values.medicalQualifications)
    const selectedLangs = getArray(values.languagesKnown)

    const availableSubSpecs = getSubSpecializationsForPrimary(selectedPrimSpecs)

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-location-step-container">
        <!-- Card 1: Educational Qualifications -->
        <div class="doctor-stage-title-wrap">
          <span class="doctor-stage-title-icon">${icon('graduationCap')}</span>
          <h3 class="doctor-stage-heading">Educational Qualifications</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-stage-fields">
            <div>
              <label for="doctor-degree">GRADUATE DEGREE *</label>
              <select class="auth-text-input" id="doctor-degree" name="degree" required>
                <option value="">Select option</option>
                ${degrees.map(d => `<option value="${d}" ${values.degree === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
              <div id="doctor-degree-other-wrap" style="${(values.degree === 'Other UG' || values.degree === 'Other PG') ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-degree-other"
                  name="degreeOther"
                  type="text"
                  placeholder="Specify degree name *"
                  value="${escapeHtml(values.degreeOther || '')}"
                  ${(values.degree === 'Other UG' || values.degree === 'Other PG') ? 'required' : ''}
                >
              </div>
            </div>
            <div class="doctor-combobox-wrapper">
              <label for="doctor-university-search">UNIVERSITY *</label>
              <div class="doctor-combobox-control">
                <input
                  type="text"
                  class="auth-text-input doctor-combobox-input"
                  id="doctor-university-search"
                  placeholder="Type to search university..."
                  value="${escapeHtml(values.university || '')}"
                  autocomplete="off"
                  required
                >
                <input type="hidden" id="doctor-university" name="university" value="${escapeHtml(values.university || '')}" required>
                <button type="button" class="doctor-combobox-arrow" tabindex="-1" aria-label="Toggle university list">
                  ${icon('chevron')}
                </button>
              </div>
              <div class="doctor-combobox-dropdown" id="doctor-university-dropdown" style="display: none;">
                <div class="doctor-combobox-list" id="doctor-university-list"></div>
              </div>
              <div id="doctor-university-other-wrap" style="${values.university === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-university-other"
                  name="universityOther"
                  type="text"
                  placeholder="Specify university name *"
                  value="${escapeHtml(values.universityOther || '')}"
                  ${values.university === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-college">COLLEGE *</label>
              <select class="auth-text-input" id="doctor-college" name="college" required ${!selectedUniv ? 'disabled' : ''}>
                <option value="">Select option</option>
                ${availableColleges.map(c => `<option value="${c}" ${values.college === c ? 'selected' : ''}>${c}</option>`).join('')}
                ${selectedUniv ? `<option value="Other" ${values.college === 'Other' ? 'selected' : ''}>Other</option>` : ''}
              </select>
              <div id="doctor-college-other-wrap" style="${values.college === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-college-other"
                  name="collegeOther"
                  type="text"
                  placeholder="Specify college name *"
                  value="${escapeHtml(values.collegeOther || '')}"
                  ${values.college === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-graduationYear">GRADUATION YEAR *</label>
              <select class="auth-text-input" id="doctor-graduationYear" name="graduationYear" required>
                <option value="">Select option</option>
                ${years.map(y => `<option value="${y}" ${String(values.graduationYear) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
            <div style="grid-column: span 2;">
              <label for="doctor-enrollmentNo" class="doctor-nowrap-label">REGISTRATION NO. OR HALL TICKET OR ENROLLMENT NO. *</label>
              <div class="doctor-input-with-check-action">
                <input class="auth-text-input" id="doctor-enrollmentNo" name="enrollmentNo" type="text" value="${escapeHtml(values.enrollmentNo || '')}" placeholder="Registration no. or hall ticket or enrollment no." required>
                <button type="button" class="button doctor-check-reg-btn ${values.isRegistrationVerified ? 'is-verified' : 'button-primary'}" id="btn-check-enrollment">
                  ${values.isRegistrationVerified ? `${icon('check')} Checked` : `${icon('search')} Check`}
                </button>
              </div>
            </div>
            <div class="doctor-upload-field" style="grid-column: span 2;">
              <label for="doctor-enrollmentCert">
                <span class="doctor-nowrap-label">REGISTRATION NO. OR HALL TICKET OR ENROLLMENT CERTIFICATE *</span>
                <small class="doctor-field-desc">Upload registration no., hall ticket or enrollment certificate</small>
              </label>
              <div class="doctor-upload-control-group">
                <label class="doctor-upload-control" for="doctor-enrollmentCert">
                  ${icon('upload')}
                  <span class="upload-btn-label">${escapeHtml(enrollCertLabel)}</span>
                </label>
                <button type="button" class="button button-outline doctor-preview-cert-action-btn" id="btn-preview-enrollmentCert" style="${values.enrollmentCert ? 'display: inline-flex;' : 'display: none;'}">
                  ${icon('eye')} Preview Certificate
                </button>
              </div>
              <input id="doctor-enrollmentCert" name="enrollmentCert" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.enrollmentCert ? '' : 'required'}>
            </div>
            <div class="doctor-upload-field" style="grid-column: span 2;">
              <label for="doctor-degreeCert">
                <span>DEGREE CERTIFICATE</span>
                <small class="doctor-field-desc">Upload degree certificate (Optional)</small>
              </label>
              <label class="doctor-upload-control" for="doctor-degreeCert">
                ${icon('upload')}
                <span class="upload-btn-label">${escapeHtml(degreeCertLabel)}</span>
              </label>
              <input id="doctor-degreeCert" name="degreeCert" type="file" accept=".jpg,.jpeg,.png,.pdf">
            </div>
          </div>
        </div>

        <!-- Card 2: Professional Practice -->
        <div class="doctor-stage-title-wrap" style="margin-top: 18px;">
          <span class="doctor-stage-title-icon">${icon('stethoscope')}</span>
          <h3 class="doctor-stage-heading">Professional Practice</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-stage-fields">
            <div>
              <label for="doctor-stateMedicalCouncil">STATE MEDICAL COUNCIL</label>
              <input
                class="auth-text-input"
                id="doctor-stateMedicalCouncil"
                name="stateMedicalCouncil"
                type="text"
                placeholder="Enter state medical council (optional)"
                value="${escapeHtml(values.stateMedicalCouncil || '')}"
              >
            </div>
            <div>
              <label for="doctor-practiceType">PRACTICE TYPE *</label>
              <select class="auth-text-input" id="doctor-practiceType" name="practiceType" required>
                <option value="">Select practice type</option>
                ${practiceTypes.map(t => `<option value="${t}" ${values.practiceType === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
              <div id="doctor-practiceType-other-wrap" style="${values.practiceType === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-practiceType-other"
                  name="practiceTypeOther"
                  type="text"
                  placeholder="Specify practice type *"
                  value="${escapeHtml(values.practiceTypeOther || '')}"
                  ${values.practiceType === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-experience">YEARS OF EXPERIENCE *</label>
              <select class="auth-text-input" id="doctor-experience" name="experience" required>
                <option value="">Select experience</option>
                ${experienceOptions.map(exp => `<option value="${exp}" ${values.experience === exp ? 'selected' : ''}>${exp}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="doctor-associationMembership">MEDICAL ASSOCIATION MEMBERSHIP</label>
              <input
                class="auth-text-input"
                id="doctor-associationMembership"
                name="associationMembership"
                type="text"
                placeholder="Medical association name (optional)"
                value="${escapeHtml(values.associationMembership || '')}"
              >
            </div>

            <!-- PRIMARY SPECIALIZATION (Side-by-side) -->
            <div class="doctor-multi-select-field">
              <label for="select-primarySpecialization">PRIMARY SPECIALIZATION *</label>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-primarySpecialization" data-field="primarySpecialization">
                  <option value="">Add specialization</option>
                  ${primarySpecializations.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chips-container" id="chips-primarySpecialization" style="${selectedPrimSpecs.length ? 'display: flex;' : 'display: none;'}">
                ${selectedPrimSpecs.map(s => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(s)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="primarySpecialization" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-primarySpecialization" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-primarySpecialization" placeholder="Enter other specialization...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="primarySpecialization">Add</button>
              </div>
              <input type="hidden" name="primarySpecialization" id="hidden-primarySpecialization" value="${escapeHtml(selectedPrimSpecs.join(', '))}">
            </div>

            <!-- SUB-SPECIALIZATION (Side-by-side) -->
            <div class="doctor-multi-select-field">
              <label for="select-subSpecialization">SUB-SPECIALIZATION</label>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-subSpecialization" data-field="subSpecialization" ${selectedPrimSpecs.length ? '' : 'disabled'}>
                  <option value="">${selectedPrimSpecs.length ? 'Add sub-specialization' : 'Select primary specialization first'}</option>
                  ${availableSubSpecs.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chips-container" id="chips-subSpecialization" style="${selectedSubSpecs.length ? 'display: flex;' : 'display: none;'}">
                ${selectedSubSpecs.map(s => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(s)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="subSpecialization" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-subSpecialization" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-subSpecialization" placeholder="Enter other sub-specialization...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="subSpecialization">Add</button>
              </div>
              <input type="hidden" name="subSpecialization" id="hidden-subSpecialization" value="${escapeHtml(selectedSubSpecs.join(', '))}">
            </div>
          </div>
        </div>

        <!-- Card 3: Career Information -->
        <div class="doctor-stage-title-wrap" style="margin-top: 18px;">
          <span class="doctor-stage-title-icon">${icon('building')}</span>
          <h3 class="doctor-stage-heading">Career Information</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-stage-fields">
            <div>
              <label for="doctor-workType">TYPE OF WORK *</label>
              <select class="auth-text-input" id="doctor-workType" name="workType" required>
                <option value="">Select work type</option>
                ${workTypes.map(w => `<option value="${w}" ${values.workType === w ? 'selected' : ''}>${w}</option>`).join('')}
              </select>
              <div id="doctor-workType-other-wrap" style="${values.workType === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-workType-other"
                  name="workTypeOther"
                  type="text"
                  placeholder="Specify work type *"
                  value="${escapeHtml(values.workTypeOther || '')}"
                  ${values.workType === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-positionRole">POSITION / ROLE *</label>
              <select class="auth-text-input" id="doctor-positionRole" name="positionRole" required>
                <option value="">Select position / role</option>
                ${positionRoleOptions.map(pos => `<option value="${pos}" ${values.positionRole === pos ? 'selected' : ''}>${pos}</option>`).join('')}
              </select>
              <div id="doctor-positionRole-other-wrap" style="${values.positionRole === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-positionRole-other"
                  name="positionRoleOther"
                  type="text"
                  placeholder="Specify position / role *"
                  value="${escapeHtml(values.positionRoleOther || '')}"
                  ${values.positionRole === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-currentHospital">CURRENT HOSPITAL / CLINIC</label>
              <input
                class="auth-text-input"
                id="doctor-currentHospital"
                name="currentHospital"
                type="text"
                placeholder="Name of your current hospital or clinic"
                value="${escapeHtml(values.currentHospital || '')}"
              >
            </div>

            <!-- MEDICAL QUALIFICATIONS * -->
            <div class="doctor-multi-select-field">
              <label for="select-medicalQualifications">MEDICAL QUALIFICATIONS *</label>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-medicalQualifications" data-field="medicalQualifications">
                  <option value="">Add qualification</option>
                  ${medicalQualificationsList.map(q => `<option value="${q}">${q}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chips-container" id="chips-medicalQualifications" style="${selectedQuals.length ? 'display: flex;' : 'display: none;'}">
                ${selectedQuals.map(q => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(q)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="medicalQualifications" data-val="${escapeHtml(q)}" aria-label="Remove ${escapeHtml(q)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-medicalQualifications" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-medicalQualifications" placeholder="Enter other qualification...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="medicalQualifications">Add</button>
              </div>
              <input type="hidden" name="medicalQualifications" id="hidden-medicalQualifications" value="${escapeHtml(selectedQuals.join(', '))}">
            </div>

            <!-- LANGUAGES KNOWN * -->
            <div class="doctor-multi-select-field">
              <label for="select-languagesKnown">LANGUAGES KNOWN *</label>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-languagesKnown" data-field="languagesKnown">
                  <option value="">Add language</option>
                  ${languagesList.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chips-container" id="chips-languagesKnown" style="${selectedLangs.length ? 'display: flex;' : 'display: none;'}">
                ${selectedLangs.map(l => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(l)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="languagesKnown" data-val="${escapeHtml(l)}" aria-label="Remove ${escapeHtml(l)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <input type="hidden" name="languagesKnown" id="hidden-languagesKnown" value="${escapeHtml(selectedLangs.join(', '))}">
            </div>

            <!-- Other languages -->
            <div>
              <label for="doctor-otherLanguages">OTHER LANGUAGES</label>
              <input
                class="auth-text-input"
                id="doctor-otherLanguages"
                name="otherLanguages"
                type="text"
                placeholder="e.g. French, German, Spanish"
                value="${escapeHtml(values.otherLanguages || '')}"
              >
            </div>

            <!-- PROFESSIONAL BIO * -->
            <div style="grid-column: span 2;">
              <label for="doctor-bio">PROFESSIONAL BIO *</label>
              <textarea
                class="auth-text-input doctor-address-textarea"
                id="doctor-bio"
                name="bio"
                rows="4"
                placeholder="Briefly describe your professional journey, medical expertise, clinical experience, and areas of specialization..."
                required
              >${escapeHtml(values.bio || '')}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="doctor-stage-footer-bar">
        <div class="doctor-signin-hint">
          Already have an account? <button type="button" class="doctor-signin-link" data-doctor-signin>Sign In</button>
        </div>
        <div class="auth-stage-actions">
          <button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Previous</button>
          <button class="button button-primary auth-submit" type="submit">Continue ${icon('arrow')}</button>
        </div>
      </div>`
  }

  if (stage === 'location') {
    const isModeSelected = (m) => {
      if (!values.consultationMode) return false
      if (Array.isArray(values.consultationMode)) return values.consultationMode.includes(m)
      return String(values.consultationMode).includes(m)
    }
    const isDaySelected = (d) => {
      if (!values.availableDays) return false
      if (Array.isArray(values.availableDays)) return values.availableDays.includes(d)
      return String(values.availableDays).includes(d)
    }
    const isOnlineDaySelected = (d) => {
      const src = values.onlineAvailableDays || values.availableDays
      if (!src) return false
      if (Array.isArray(src)) return src.includes(d)
      return String(src).includes(d)
    }
    const isOfflineDaySelected = (d) => {
      const src = values.offlineAvailableDays || values.availableDays
      if (!src) return false
      if (Array.isArray(src)) return src.includes(d)
      return String(src).includes(d)
    }

    const selectedCurrentState = values.currentState || ''
    const availableCurrentDistricts = selectedCurrentState ? (indianStatesAndDistricts[selectedCurrentState] || []) : []
    const selectedCurrentDistrict = values.currentDistrict || ''
    const availableCurrentCities = selectedCurrentDistrict ? getCitiesForDistrict(selectedCurrentDistrict) : []

    const selectedPermState = values.permState || ''
    const availablePermDistricts = selectedPermState ? (indianStatesAndDistricts[selectedPermState] || []) : []
    const selectedPermDistrict = values.permDistrict || ''
    const availablePermCities = selectedPermDistrict ? getCitiesForDistrict(selectedPermDistrict) : []

    const isBothMode = isModeSelected('Both')

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-location-step-container">
        <!-- Section 1: Office Location -->
        <div class="doctor-stage-title-wrap">
          <span class="doctor-stage-title-icon">${icon('pin')}</span>
          <h3 class="doctor-stage-heading">Office Location</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-section-subtitle">CURRENT ADDRESS</div>
          <div class="doctor-stage-fields">
            <div style="grid-column: span 2;">
              <label for="doctor-currentAddress">ADDRESS *</label>
              <textarea class="auth-text-input doctor-address-textarea" id="doctor-currentAddress" name="currentAddress" rows="3" placeholder="Enter current address" required>${values.currentAddress || values.address || ''}</textarea>
            </div>
            <div>
              <label for="doctor-currentState">STATE *</label>
              <select class="auth-text-input" id="doctor-currentState" name="currentState" required>
                <option value="">Select state</option>
                ${indianStates.map(st => `<option value="${st}" ${(values.currentState === st) ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="doctor-currentDistrict">DISTRICT *</label>
              <select class="auth-text-input" id="doctor-currentDistrict" name="currentDistrict" required ${!selectedCurrentState ? 'disabled' : ''}>
                <option value="">Select district</option>
                ${availableCurrentDistricts.map(d => `<option value="${d}" ${(values.currentDistrict === d) ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="doctor-currentCity">CITY / TOWN *</label>
              <select class="auth-text-input" id="doctor-currentCity" name="currentCity" required ${!selectedCurrentDistrict ? 'disabled' : ''}>
                <option value="">Select city or town</option>
                ${availableCurrentCities.map(c => `<option value="${c}" ${(values.currentCity === c) ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
              <div id="doctor-currentCity-other-wrap" style="${values.currentCity === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-currentCity-other"
                  name="currentCityOther"
                  type="text"
                  placeholder="Specify city or town name *"
                  value="${escapeHtml(values.currentCityOther || '')}"
                  ${values.currentCity === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-currentPincode">PINCODE *</label>
              <input class="auth-text-input" id="doctor-currentPincode" name="currentPincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6-digit pincode" value="${values.currentPincode || ''}" required>
            </div>
          </div>
        </div>

        <!-- Section 2: Permanent Address -->
        <div class="doctor-same-address-wrap">
          <label class="doctor-custom-checkbox">
            <input type="checkbox" id="doctor-sameAsCurrent" name="sameAsCurrent" ${values.sameAsCurrent ? 'checked' : ''}>
            <span class="checkbox-box"></span>
            <span class="checkbox-text">Permanent address is the same as current address</span>
          </label>
        </div>

        <div class="doctor-location-card">
          <div class="doctor-section-subtitle">PERMANENT ADDRESS</div>
          <div class="doctor-stage-fields">
            <div style="grid-column: span 2;">
              <label for="doctor-permAddress">ADDRESS *</label>
              <textarea class="auth-text-input doctor-address-textarea" id="doctor-permAddress" name="permAddress" rows="3" placeholder="Enter permanent address" required>${values.permAddress || ''}</textarea>
            </div>
            <div>
              <label for="doctor-permState">STATE *</label>
              <select class="auth-text-input" id="doctor-permState" name="permState" required>
                <option value="">Select state</option>
                ${indianStates.map(st => `<option value="${st}" ${(values.permState === st) ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="doctor-permDistrict">DISTRICT *</label>
              <select class="auth-text-input" id="doctor-permDistrict" name="permDistrict" required ${!selectedPermState ? 'disabled' : ''}>
                <option value="">Select district</option>
                ${availablePermDistricts.map(d => `<option value="${d}" ${(values.permDistrict === d) ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="doctor-permCity">CITY / TOWN *</label>
              <select class="auth-text-input" id="doctor-permCity" name="permCity" required ${!selectedPermDistrict ? 'disabled' : ''}>
                <option value="">Select city or town</option>
                ${availablePermCities.map(c => `<option value="${c}" ${(values.permCity === c) ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
              <div id="doctor-permCity-other-wrap" style="${values.permCity === 'Other' ? 'display: block;' : 'display: none;'} margin-top: 7px;">
                <input
                  class="auth-text-input"
                  id="doctor-permCity-other"
                  name="permCityOther"
                  type="text"
                  placeholder="Specify city or town name *"
                  value="${escapeHtml(values.permCityOther || '')}"
                  ${values.permCity === 'Other' ? 'required' : ''}
                >
              </div>
            </div>
            <div>
              <label for="doctor-permPincode">PINCODE *</label>
              <input class="auth-text-input" id="doctor-permPincode" name="permPincode" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6-digit pincode" value="${values.permPincode || ''}" required>
            </div>
          </div>
        </div>

        <!-- Section 3: Availability & Consultation -->
        <div class="doctor-stage-title-wrap" style="margin-top: 24px;">
          <span class="doctor-stage-title-icon">${icon('clock')}</span>
          <h3 class="doctor-stage-heading">Availability & Consultation</h3>
        </div>

        <div class="doctor-location-card">
          <div class="doctor-option-group">
            <label class="doctor-field-title">CONSULTATION MODE *</label>
            <div class="doctor-pills-row">
              ${['Online', 'Offline', 'Both'].map(mode => `
                <label class="doctor-pill-checkbox ${isModeSelected(mode) ? 'is-checked' : ''}">
                  <input type="checkbox" name="consultationMode" value="${mode}" ${isModeSelected(mode) ? 'checked' : ''}>
                  <span class="pill-checkbox-indicator"></span>
                  <span>${mode}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Single Available Days (when mode is not Both) -->
          <div class="doctor-option-group" id="doctor-single-days-group" style="${isBothMode ? 'display: none;' : 'display: block;'} margin-top: 18px;">
            <label class="doctor-field-title">AVAILABLE DAYS *</label>
            <div class="doctor-pills-grid">
              ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                <label class="doctor-pill-checkbox ${isDaySelected(day) ? 'is-checked' : ''}">
                  <input type="checkbox" name="availableDays" value="${day}" ${isDaySelected(day) ? 'checked' : ''}>
                  <span class="pill-checkbox-indicator"></span>
                  <span>${day}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Dual Available Days (when mode is Both) -->
          <div id="doctor-dual-days-group" style="${isBothMode ? 'display: block;' : 'display: none;'} margin-top: 18px;">
            <div class="doctor-option-group">
              <label class="doctor-field-title">ONLINE AVAILABLE DAYS *</label>
              <div class="doctor-pills-grid">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                  <label class="doctor-pill-checkbox ${isOnlineDaySelected(day) ? 'is-checked' : ''}">
                    <input type="checkbox" name="onlineAvailableDays" value="${day}" ${isOnlineDaySelected(day) ? 'checked' : ''}>
                    <span class="pill-checkbox-indicator"></span>
                    <span>${day}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="doctor-option-group" style="margin-top: 14px;">
              <label class="doctor-field-title">OFFLINE AVAILABLE DAYS *</label>
              <div class="doctor-pills-grid">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                  <label class="doctor-pill-checkbox ${isOfflineDaySelected(day) ? 'is-checked' : ''}">
                    <input type="checkbox" name="offlineAvailableDays" value="${day}" ${isOfflineDaySelected(day) ? 'checked' : ''}>
                    <span class="pill-checkbox-indicator"></span>
                    <span>${day}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Standard Working Hours (when mode is not Both) -->
          <div id="doctor-single-hours-group" style="${isBothMode ? 'display: none;' : 'display: grid;'}" class="doctor-stage-fields" style="margin-top: 18px;">
            <div>
              <label for="doctor-workingHoursFrom">WORKING HOURS – FROM *</label>
              <input class="auth-text-input" id="doctor-workingHoursFrom" name="workingHoursFrom" type="time" value="${values.workingHoursFrom || '09:00'}" ${!isBothMode ? 'required' : ''}>
            </div>
            <div>
              <label for="doctor-workingHoursTo">WORKING HOURS – TO *</label>
              <input class="auth-text-input" id="doctor-workingHoursTo" name="workingHoursTo" type="time" value="${values.workingHoursTo || '18:00'}" ${!isBothMode ? 'required' : ''}>
            </div>
          </div>

          <!-- Dual Working Hours (when mode is Both) -->
          <div id="doctor-dual-hours-group" style="${isBothMode ? 'display: block;' : 'display: none;'} margin-top: 18px;">
            <div class="doctor-section-subtitle" style="margin-bottom: 8px;">ONLINE WORKING HOURS</div>
            <div class="doctor-stage-fields">
              <div>
                <label for="doctor-onlineWorkingHoursFrom">ONLINE WORKING HOURS – FROM *</label>
                <input class="auth-text-input" id="doctor-onlineWorkingHoursFrom" name="onlineWorkingHoursFrom" type="time" value="${values.onlineWorkingHoursFrom || '09:00'}" ${isBothMode ? 'required' : ''}>
              </div>
              <div>
                <label for="doctor-onlineWorkingHoursTo">ONLINE WORKING HOURS – TO *</label>
                <input class="auth-text-input" id="doctor-onlineWorkingHoursTo" name="onlineWorkingHoursTo" type="time" value="${values.onlineWorkingHoursTo || '13:00'}" ${isBothMode ? 'required' : ''}>
              </div>
            </div>
            <div class="doctor-section-subtitle" style="margin-top: 14px; margin-bottom: 8px;">OFFLINE / IN-CLINIC WORKING HOURS</div>
            <div class="doctor-stage-fields">
              <div>
                <label for="doctor-offlineWorkingHoursFrom">OFFLINE WORKING HOURS – FROM *</label>
                <input class="auth-text-input" id="doctor-offlineWorkingHoursFrom" name="offlineWorkingHoursFrom" type="time" value="${values.offlineWorkingHoursFrom || '14:00'}" ${isBothMode ? 'required' : ''}>
              </div>
              <div>
                <label for="doctor-offlineWorkingHoursTo">OFFLINE WORKING HOURS – TO *</label>
                <input class="auth-text-input" id="doctor-offlineWorkingHoursTo" name="offlineWorkingHoursTo" type="time" value="${values.offlineWorkingHoursTo || '18:00'}" ${isBothMode ? 'required' : ''}>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="doctor-stage-footer-bar">
        <div class="doctor-signin-hint">
          Already have an account? <button type="button" class="doctor-signin-link" data-doctor-signin>Sign In</button>
        </div>
        <div class="auth-stage-actions">
          <button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Previous</button>
          <button class="button button-primary auth-submit" type="submit">Continue ${icon('arrow')}</button>
        </div>
      </div>`
  }

  if (stage === 'review') {
    const curCityVal = (values.currentCity === 'Other' && values.currentCityOther) ? `Other (${values.currentCityOther})` : (values.currentCity || values.city)
    const permCityVal = (values.permCity === 'Other' && values.permCityOther) ? `Other (${values.permCityOther})` : values.permCity
    const officeAddr = [values.currentAddress || values.address, curCityVal, values.currentState, values.currentPincode].filter(Boolean).join(', ')
    const permAddr = [values.permAddress, permCityVal, values.permState, values.permPincode].filter(Boolean).join(', ')
    const allLangs = [values.languagesKnown, values.otherLanguages].filter(Boolean).join(', ') || 'Not provided'
    const isBoth = values.consultationMode && String(values.consultationMode).includes('Both')
    const now = new Date()
    const todayDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-review-sections">
        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Personal Details</h4>
          <div class="doctor-review-list">
            <div><span>Doctor</span><strong>Dr. ${values.firstName || ''} ${values.lastName || ''}</strong></div>
            <div><span>Gender</span><strong>${values.gender || 'Not provided'}</strong></div>
            <div><span>Date of Birth</span><strong>${values.dateOfBirth || 'Not provided'}</strong></div>
            <div><span>Mobile</span><strong>${values.phone ? `${values.phoneCountryCode || '+91'} ${values.phone}` : 'Not provided'}</strong></div>
            <div><span>Email</span><strong>${values.email || 'Not provided'}</strong></div>
            <div><span>ID Proof</span><strong>${values.idType || 'Not provided'}</strong></div>
            ${values.referralCode ? `<div><span>Referral Code</span><strong>${values.referralCode}</strong></div>` : ''}
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Education and Practice Details</h4>
          <div class="doctor-review-list">
            <div><span>Degree</span><strong>${values.displayDegree || (values.degreeOther ? `${values.degree} (${values.degreeOther})` : values.degree) || 'Not provided'}</strong></div>
            <div><span>University</span><strong>${values.displayUniversity || (values.universityOther ? `${values.university} (${values.universityOther})` : values.university) || 'Not provided'}</strong></div>
            <div><span>College</span><strong>${values.displayCollege || (values.collegeOther ? `${values.college} (${values.collegeOther})` : values.college) || 'Not provided'}</strong></div>
            <div><span>Graduation Year</span><strong>${values.graduationYear || 'Not provided'}</strong></div>
            <div><span>Reg No. / Hall Ticket No. / Enrollment No.</span><strong>${values.enrollmentNo || 'Not provided'}</strong></div>
            ${(values.enrollmentCert && values.enrollmentCert.name) ? `
            <div style="grid-column: span 2;">
              <span>Enrollment Certificate</span>
              <div class="doctor-review-cert-row">
                <strong style="word-break: break-all;">${values.enrollmentCert.name}</strong>
                <button type="button" class="button button-outline doctor-review-cert-preview-btn" id="btn-review-preview-enrollmentCert">
                  ${icon('eye')} Preview Certificate
                </button>
              </div>
            </div>` : ''}
            ${(values.degreeCert && values.degreeCert.name) ? `<div><span>Degree Certificate</span><strong>${values.degreeCert.name}</strong></div>` : ''}
            ${values.stateMedicalCouncil ? `<div><span>State Council</span><strong>${values.stateMedicalCouncil}</strong></div>` : ''}
            <div><span>Practice Type</span><strong>${values.displayPracticeType || (values.practiceTypeOther ? `Other (${values.practiceTypeOther})` : values.practiceType) || 'Not provided'}</strong></div>
            <div><span>Experience</span><strong>${values.experience || 'Not provided'}</strong></div>
            <div><span>Primary Specialization</span><strong>${values.primarySpecialization || values.specialty || 'Not provided'}</strong></div>
            <div><span>Sub-Specialization</span><strong>${values.subSpecialization || 'Not provided'}</strong></div>
            ${values.associationMembership ? `<div><span>Association Membership</span><strong>${values.associationMembership}</strong></div>` : ''}
            <div><span>Type of Work</span><strong>${values.displayWorkType || (values.workTypeOther ? `Other (${values.workTypeOther})` : values.workType) || 'Not provided'}</strong></div>
            <div><span>Position / Role</span><strong>${values.displayPositionRole || (values.positionRoleOther ? `Other (${values.positionRoleOther})` : values.positionRole) || 'Not provided'}</strong></div>
            ${values.currentHospital ? `<div><span>Current Hospital/Clinic</span><strong>${values.currentHospital}</strong></div>` : ''}
            <div><span>Qualifications</span><strong>${values.medicalQualifications || 'Not provided'}</strong></div>
            <div style="grid-column: span 2;"><span>Languages Known</span><strong>${allLangs}</strong></div>
            ${values.bio ? `<div style="grid-column: span 2;"><span>Professional Bio</span><strong>${values.bio}</strong></div>` : ''}
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Location & Availability</h4>
          <div class="doctor-review-list">
            <div><span>Office / Current Address</span><strong>${officeAddr || 'Not provided'}</strong></div>
            <div><span>Permanent Address</span><strong>${permAddr || 'Not provided'}</strong></div>
            <div><span>Consultation Mode</span><strong>${values.consultationMode || 'Not provided'}</strong></div>
            ${isBoth ? `
              <div><span>Online Available Days</span><strong>${values.onlineAvailableDays || values.availableDays || 'Not provided'}</strong></div>
              <div><span>Offline Available Days</span><strong>${values.offlineAvailableDays || values.availableDays || 'Not provided'}</strong></div>
              <div><span>Online Working Hours</span><strong>${values.onlineWorkingHoursFrom || '09:00'} - ${values.onlineWorkingHoursTo || '13:00'}</strong></div>
              <div><span>Offline Working Hours</span><strong>${values.offlineWorkingHoursFrom || '14:00'} - ${values.offlineWorkingHoursTo || '18:00'}</strong></div>
            ` : `
              <div><span>Available Days</span><strong>${values.availableDays || 'Not provided'}</strong></div>
              <div style="grid-column: span 2;"><span>Working Hours</span><strong>${(values.workingHoursFrom && values.workingHoursTo) ? `${values.workingHoursFrom} - ${values.workingHoursTo}` : 'Not provided'}</strong></div>
            `}
          </div>
        </div>
      </div>
      <div class="doctor-signature-card">
        <div class="doctor-signature-header">
          <span class="doctor-signature-icon">${icon('edit')}</span>
          <span class="doctor-signature-title">DIGITAL SIGNATURE</span>
        </div>
        <div class="doctor-signature-box">
          <div class="doctor-signature-canvas-wrapper" id="doctor-signature-canvas-wrapper">
            <canvas id="doctor-signature-canvas" class="doctor-signature-canvas"></canvas>
            <div class="doctor-signature-hint" id="doctor-signature-hint">${values.digitalSignature ? '' : 'Draw your signature here with mouse or touch'}</div>
          </div>
          <div class="doctor-signature-actions-row">
            <button type="button" class="doctor-signature-clear-btn" id="doctor-signature-clear">
              ${icon('cross')} Clear
            </button>
          </div>
          <div class="doctor-signature-date-row">
            <input type="text" class="auth-text-input doctor-signature-date-input" id="doctor-signature-date" value="${values.signatureDate || todayDateStr}" readonly aria-label="Signature Date" />
          </div>
        </div>
      </div>

      <div class="doctor-terms-card" id="doctor-terms-card">
        <div class="doctor-terms-header">
          <div class="doctor-terms-title-group">
            <span class="doctor-terms-icon">${icon('file')}</span>
            <span class="doctor-terms-title">Terms & Conditions</span>
          </div>
          <span class="doctor-terms-hint" id="doctor-terms-scroll-hint">Scroll down to unlock the checkboxes</span>
        </div>
        <div class="doctor-terms-scroll-box" id="doctor-terms-scroll-box">
          <h5 class="doctor-terms-agreement-title">Registration Agreement</h5>
          <p class="doctor-terms-intro">By submitting this registration form, you enter into a binding practitioner empanelment agreement with Tatito Health+:</p>
          
          <div class="doctor-terms-clause">
            <h6>1. Information Accuracy</h6>
            <p>You certify that all medical qualifications, registration numbers, certificates, and personal particulars provided are true, accurate, and complete. Any false or misleading statement may result in immediate revocation of empanelment, account termination, and appropriate statutory reporting.</p>
          </div>

          <div class="doctor-terms-clause">
            <h6>2. Medical Council Compliance</h6>
            <p>You agree to abide by all rules, regulations, ethical guidelines, and standards set forth by the National Medical Commission (NMC), the Indian Medical Council (Professional Conduct, Etiquette and Ethics), and your respective State Medical Council.</p>
          </div>

          <div class="doctor-terms-clause">
            <h6>3. Professional Conduct</h6>
            <ul>
              <li>Patient confidentiality, privacy, and doctor-patient privilege</li>
              <li>Adherence to Telemedicine Practice Guidelines and clinical standards</li>
              <li>Conflict of interest avoidance and ethical patient care</li>
              <li>Timely communication and transparent consultation fee adherence</li>
            </ul>
          </div>

          <div class="doctor-terms-clause">
            <h6>4. Platform Rules</h6>
            <ul>
              <li>Use the platform exclusively for legitimate clinical consultation and healthcare services</li>
              <li>Not engage in unlawful prescriptions, unapproved advertisements, or fraudulent activities</li>
              <li>Respect platform consultation fees, commission, and cancellation policies</li>
              <li>Maintain accurate real-time consultation availability status</li>
            </ul>
          </div>

          <div class="doctor-terms-clause">
            <h6>5. Privacy & Data Verification</h6>
            <p>You accept our Privacy Policy and authorize Tatito Health+ to authenticate all submitted documents, degrees, and medical registrations through the National Medical Commission (NMC) and competent regulatory authorities.</p>
          </div>

          <div class="doctor-terms-clause">
            <h6>6. Governing Law</h6>
            <p>This agreement shall be governed by and construed in accordance with the laws of India and applicable healthcare regulations.</p>
          </div>
        </div>

        <div class="doctor-terms-checkbox-list" id="doctor-terms-checkbox-list">
          <label class="doctor-terms-check-item">
            <input type="checkbox" class="doctor-term-checkbox" id="term-info-true" name="terms_info_accuracy" ${values.terms_info_accuracy ? 'checked' : ''} disabled />
            <span>I certify that all information is true.</span>
          </label>
          <label class="doctor-terms-check-item">
            <input type="checkbox" class="doctor-term-checkbox" id="term-bci-rules" name="terms_bci_compliance" ${values.terms_bci_compliance ? 'checked' : ''} disabled />
            <span>I agree to National Medical Commission (NMC) Regulations & Code of Ethics.</span>
          </label>
          <label class="doctor-terms-check-item">
            <input type="checkbox" class="doctor-term-checkbox" id="term-privacy-policy" name="terms_privacy" ${values.terms_privacy ? 'checked' : ''} disabled />
            <span>I accept the Privacy Policy.</span>
          </label>
          <label class="doctor-terms-check-item">
            <input type="checkbox" class="doctor-term-checkbox" id="term-platform-rules" name="terms_platform_rules" ${values.terms_platform_rules ? 'checked' : ''} disabled />
            <span>I agree to platform rules and fee structure.</span>
          </label>
        </div>
      </div>

      <div class="doctor-review-pdf-card" id="doctor-review-pdf-card">
        <div class="doctor-review-pdf-details">
          <h4>Download a copy of your application</h4>
          <p>Save or print a snapshot of every detail you entered. Useful for your own records before submission.</p>
          <span class="doctor-pdf-gate-status" id="doctor-pdf-gate-status">Sign and accept all terms above to unlock PDF preview</span>
        </div>
        <button class="button doctor-btn-view-pdf is-locked" type="button" id="btn-doctor-view-pdf" title="Sign and accept all terms to unlock">
          ${icon('file')} View Application PDF
        </button>
      </div>
      <div class="auth-stage-actions">
        <button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Back</button>
        <button class="button button-primary auth-submit" type="submit">Submit for verification ${icon('check')}</button>
      </div>`
  }
  const stageFields = fields[stage] || []
  return `<input type="hidden" name="portal" value="doctor"><div class="doctor-stage-fields">${stageFields.map(([name, label, type, value, placeholder]) => doctorFieldMarkup(name, label, type, value, placeholder, values)).join('')}</div><div class="auth-stage-actions">${stage !== 'personal' ? `<button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Back</button>` : `<button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Portals</button>`}<button class="button button-primary auth-submit" type="submit">${stage === 'review' ? 'Submit for verification' : 'Continue to next stage'} ${icon('arrow')}</button></div>`
}

function doctorFieldMarkup(name, label, type, value, placeholder, allValues = {}) {
  if (name === 'phone') {
    const selectedCode = (allValues && allValues.phoneCountryCode) || '+91'
    const country = getCountryByCode(selectedCode)
    const digits = country.digits
    const currentVal = value || ''
    return `
      <div class="doctor-phone-field-wrapper">
        <label for="doctor-phone">${label}</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="doctor-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${selectedCode === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="doctor-phone" name="phone" type="tel" inputmode="numeric" value="${currentVal}" placeholder="${digits}-digit mobile number" maxlength="${digits}" pattern="[0-9]{${digits}}" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="doctor-phone-hint">Enter ${digits} digits for ${country.name}</small>
      </div>`
  }
  if (type === 'select') {
    const options = name === 'gender' ? ['Male', 'Female', 'Other'] : ['Aadhar card', 'Pan card', 'Driving Licence', 'Passport']
    return `<div><label for="doctor-${name}">${label}</label><select class="auth-text-input" id="doctor-${name}" name="${name}" required><option value="">${placeholder}</option>${options.map(option => `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>`
  }
  if (type === 'file' || type === 'file-image') {
    const accept = type === 'file-image' ? '.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.pdf'
    const hint = type === 'file-image' ? 'JPG or PNG - Max 5MB' : 'JPG, PNG, PDF - Max 5MB'
    return `<div class="doctor-upload-field"><label for="doctor-${name}">${label}</label><label class="doctor-upload-control" for="doctor-${name}">${icon('plus')}<span class="upload-btn-label doctor-upload-label-text">${placeholder}</span><small>${hint}</small></label><input id="doctor-${name}" name="${name}" type="file" accept="${accept}" required></div>`
  }
  const pattern = name === 'code' ? 'inputmode="numeric" maxlength="6" pattern="[0-9]{6}"' : ''
  const autocomplete = (name === 'password' || name === 'confirmPassword')
    ? 'autocomplete="new-password"'
    : (name === 'email' ? 'autocomplete="off"' : '')
  const minlength = (name === 'password' || name === 'confirmPassword') ? 'minlength="8"' : ''
  const isOptional = name === 'referralCode'
  const hintMarkup = name === 'password'
    ? '<small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>'
    : ''
  if (type === 'password') {
    return `
      <div>
        <label for="doctor-${name}">${label}</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="doctor-${name}" name="${name}" type="password" value="${value}" placeholder="${placeholder}" ${autocomplete} ${minlength} required>
          <button type="button" class="auth-password-toggle" data-toggle-target="doctor-${name}" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        ${hintMarkup}
      </div>`
  }
  return `<div><label for="doctor-${name}">${label}</label><input class="auth-text-input" id="doctor-${name}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${pattern} ${autocomplete} ${minlength} ${isOptional ? '' : 'required'}>${hintMarkup}</div>`
}

function userRegistrationMarkup(values = {}) {
  const idProofLabel = (values.idProof && values.idProof.name) ? values.idProof.name : 'Choose file'
  const photoLabel = (values.profilePhoto && values.profilePhoto.name) ? values.profilePhoto.name : 'Choose file'

  return `
    <input type="hidden" name="portal" value="user">
    <div class="doctor-stage-fields">
      <div>
        <label for="user-firstName">First Name *</label>
        <input class="auth-text-input" id="user-firstName" name="firstName" type="text" value="${values.firstName || ''}" placeholder="Enter first name" required>
      </div>
      <div>
        <label for="user-lastName">Last Name *</label>
        <input class="auth-text-input" id="user-lastName" name="lastName" type="text" value="${values.lastName || ''}" placeholder="Enter last name" required>
      </div>
      <div>
        <label for="user-gender">Gender *</label>
        <select class="auth-text-input" id="user-gender" name="gender" required>
          <option value="">Select Gender</option>
          <option value="Male" ${values.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${values.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option value="Other" ${values.gender === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div>
        <label for="user-dateOfBirth">Date of Birth *</label>
        <input class="auth-text-input" id="user-dateOfBirth" name="dateOfBirth" type="date" value="${values.dateOfBirth || ''}" required>
      </div>
      <div class="doctor-phone-field-wrapper">
        <label for="user-mobile">Mobile *</label>
        <div class="doctor-phone-input-group">
          <select class="auth-text-input doctor-phone-code-select" id="user-phone-country-code" name="phoneCountryCode" aria-label="Country Dialing Code">
            ${countryPhoneCodes.map(c => `
              <option value="${c.code}" data-digits="${c.digits}" data-name="${c.name}" ${(values.phoneCountryCode || '+91') === c.code ? 'selected' : ''}>
                ${c.flag} ${c.code} (${c.name})
              </option>
            `).join('')}
          </select>
          <input class="auth-text-input doctor-phone-number-input" id="user-mobile" name="mobile" type="tel" inputmode="numeric" maxlength="${getCountryDigits(values.phoneCountryCode || '+91')}" value="${values.mobile || ''}" placeholder="${getCountryDigits(values.phoneCountryCode || '+91')}-digit mobile number" required>
        </div>
        <small class="doctor-field-desc doctor-phone-hint" id="user-phone-hint">Enter ${getCountryDigits(values.phoneCountryCode || '+91')} digits for ${getCountryByCode(values.phoneCountryCode || '+91').name}</small>
      </div>
      <div>
        <label for="user-email">Email *</label>
        <input class="auth-text-input" id="user-email" name="email" type="email" autocomplete="off" value="${values.email || ''}" placeholder="name@example.com" required>
      </div>
      <div>
        <label for="user-password">Password *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="user-password" name="password" type="password" autocomplete="new-password" minlength="8" value="${values.password || ''}" placeholder="Min 8 characters" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="user-password" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
        <small class="doctor-field-desc">Must be at least 8 characters with a letter, number & special symbol</small>
      </div>
      <div>
        <label for="user-confirmPassword">Confirm Password *</label>
        <div class="auth-password-wrapper">
          <input class="auth-text-input auth-password-input" id="user-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" value="${values.confirmPassword || ''}" placeholder="Re-enter password" required>
          <button type="button" class="auth-password-toggle" data-toggle-target="user-confirmPassword" aria-label="Show password" title="Show password" tabindex="-1">
            ${icon('eye')}
          </button>
        </div>
      </div>
      <div>
        <label for="user-idType">Document Type *</label>
        <select class="auth-text-input" id="user-idType" name="idType" required>
          <option value="">Select Document</option>
          <option value="Aadhar card" ${values.idType === 'Aadhar card' ? 'selected' : ''}>Aadhar card</option>
          <option value="Pan card" ${values.idType === 'Pan card' ? 'selected' : ''}>Pan card</option>
          <option value="Driving Licence" ${values.idType === 'Driving Licence' ? 'selected' : ''}>Driving Licence</option>
          <option value="Passport" ${values.idType === 'Passport' ? 'selected' : ''}>Passport</option>
          <option value="Voter ID" ${values.idType === 'Voter ID' ? 'selected' : ''}>Voter ID</option>
        </select>
      </div>
      <div class="doctor-upload-field">
        <label for="user-idProof">
          <span>Upload ID Proof *</span>
          <small class="doctor-field-desc">JPG, PNG | Max 5MB</small>
        </label>
        <label class="doctor-upload-control" for="user-idProof">
          ${icon('upload')}
          <span class="upload-btn-label">${idProofLabel}</span>
          <small>Click to upload document</small>
        </label>
        <input id="user-idProof" name="idProof" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.idProof ? '' : 'required'}>
      </div>
      <div class="doctor-upload-field" style="grid-column: span 2;">
        <label for="user-profilePhoto">
          <span>Upload Profile Photo *</span>
          <small class="doctor-field-desc">JPG, PNG | Max 5MB</small>
        </label>
        <label class="doctor-upload-control" for="user-profilePhoto">
          ${icon('upload')}
          <span class="upload-btn-label">${photoLabel}</span>
          <small>Click to upload photo</small>
        </label>
        <input id="user-profilePhoto" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" ${values.profilePhoto ? '' : 'required'}>
      </div>
    </div>
    <div class="doctor-stage-footer-bar">
      <div class="doctor-signin-hint">
        Already have an account? <button type="button" class="doctor-signin-link" data-user-signin>Sign In</button>
      </div>
      <div class="auth-stage-actions">
        <button class="auth-stage-back" type="button" data-user-back>${icon('chevron')} Portals</button>
        <button class="button button-primary auth-submit" type="submit">Continue to next stage ${icon('arrow')}</button>
      </div>
    </div>
  `
}

function setDoctorStage(registerPopup, form, stage, values, ctx) {
  const stageIndex = doctorStageIndex(stage)
  registerPopup.querySelector('.auth-register-stepper').innerHTML = doctorStepperMarkup(stageIndex)
  registerPopup.querySelector('.auth-form-heading h2').textContent = (stage === 'education') ? 'Education and Practice' : `${doctorStages[stageIndex]} details`
  registerPopup.querySelector('.auth-form-heading p').textContent = stage === 'review'
    ? 'Review your information before submitting for verification.'
    : (stage === 'education' ? 'Provide your educational qualifications, practice details, and career background.' : 'Complete this step to continue your doctor portal registration.')
  form.dataset.stage = stage
  form.innerHTML = doctorStageMarkup(stage, values)

  // Scroll to the top of the modal so the user always sees the beginning of the next page
  const scrollToTop = () => {
    if (registerPopup) {
      registerPopup.scrollTop = 0
      try {
        registerPopup.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      } catch (e) {
        registerPopup.scrollTop = 0
      }
    }
    const popup = form.closest('.auth-popup') || registerPopup
    if (popup && popup !== registerPopup) {
      popup.scrollTop = 0
      try {
        popup.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      } catch (e) {
        popup.scrollTop = 0
      }
    }
    const backdrop = form.closest('.auth-popup-backdrop')
    if (backdrop) {
      backdrop.scrollTop = 0
    }
    form.scrollTop = 0
    const stepper = registerPopup.querySelector('.auth-register-stepper') || registerPopup.querySelector('.auth-form-heading')
    if (stepper) {
      stepper.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }

  scrollToTop()
  requestAnimationFrame(scrollToTop)
  setTimeout(scrollToTop, 20)
  setTimeout(scrollToTop, 100)

  form.querySelector('[data-doctor-back]').addEventListener('click', () => {
    if (stage === 'personal') {
      openAuthModal('register', ctx)
      return
    }
    setDoctorStage(registerPopup, form, doctorStageKeys[doctorStageIndex(stage) - 1], values, ctx)
  })

  // Phone country code & dynamic digit length constraint synchronization
  const phoneCodeSelect = form.querySelector('#doctor-phone-country-code')
  const phoneInput = form.querySelector('#doctor-phone')
  const phoneHint = form.querySelector('#doctor-phone-hint')

  if (phoneCodeSelect && phoneInput) {
    const updatePhoneConstraint = () => {
      const selectedOption = phoneCodeSelect.options[phoneCodeSelect.selectedIndex]
      const digits = parseInt(selectedOption?.getAttribute('data-digits') || '10', 10)
      const countryName = selectedOption?.getAttribute('data-name') || 'selected country'

      phoneInput.maxLength = digits
      phoneInput.placeholder = `${digits}-digit mobile number`
      phoneInput.pattern = `[0-9]{${digits}}`
      if (phoneHint) {
        phoneHint.textContent = `Enter ${digits} digits for ${countryName}`
      }

      if (phoneInput.value.length > digits) {
        phoneInput.value = phoneInput.value.slice(0, digits)
      }

      values.phoneCountryCode = phoneCodeSelect.value
      if (form._doctorValues) {
        form._doctorValues.phoneCountryCode = phoneCodeSelect.value
      }

      if (phoneInput.value.length > 0 && phoneInput.value.length !== digits) {
        phoneInput.setCustomValidity(`Please enter exactly ${digits} digits for ${countryName}`)
      } else {
        phoneInput.setCustomValidity('')
      }
    }

    phoneCodeSelect.addEventListener('change', () => {
      updatePhoneConstraint()
      phoneInput.focus()
    })

    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '')
      const selectedOption = phoneCodeSelect.options[phoneCodeSelect.selectedIndex]
      const digits = parseInt(selectedOption?.getAttribute('data-digits') || '10', 10)
      const countryName = selectedOption?.getAttribute('data-name') || 'selected country'

      if (phoneInput.value.length > digits) {
        phoneInput.value = phoneInput.value.slice(0, digits)
      }

      values.phone = phoneInput.value
      values.phoneCountryCode = phoneCodeSelect.value
      if (form._doctorValues) {
        form._doctorValues.phone = phoneInput.value
        form._doctorValues.phoneCountryCode = phoneCodeSelect.value
      }

      if (phoneInput.value.length > 0 && phoneInput.value.length !== digits) {
        phoneInput.setCustomValidity(`Please enter exactly ${digits} digits for ${countryName}`)
      } else {
        phoneInput.setCustomValidity('')
      }
    })

    updatePhoneConstraint()
  }

  // Dynamic University Search, College Dropdown & Practice Interactions in Merged Education Stage
  if (stage === 'education') {
    const univSearch = form.querySelector('#doctor-university-search')
    const univHidden = form.querySelector('#doctor-university')
    const univDropdown = form.querySelector('#doctor-university-dropdown')
    const univList = form.querySelector('#doctor-university-list')
    const univArrow = form.querySelector('.doctor-combobox-arrow')
    const collegeSelect = form.querySelector('#doctor-college')

    const universities = [...Object.keys(medicalUniversitiesAndColleges).sort(), 'Other']
    let activeHighlightIndex = -1

    const renderUnivOptions = (query = '') => {
      const q = query.trim().toLowerCase()
      const filtered = q
        ? universities.filter(u => u.toLowerCase().includes(q))
        : universities

      activeHighlightIndex = -1

      if (filtered.length === 0) {
        univList.innerHTML = `<div class="doctor-combobox-empty">No matching universities found</div>`
        return
      }

      univList.innerHTML = filtered.map((u, idx) => {
        const isSelected = u === univHidden.value
        let displayHtml = u
        if (q) {
          const matchIndex = u.toLowerCase().indexOf(q)
          if (matchIndex !== -1) {
            const before = u.slice(0, matchIndex)
            const match = u.slice(matchIndex, matchIndex + q.length)
            const after = u.slice(matchIndex + q.length)
            displayHtml = `${before}<mark class="doctor-combobox-match">${match}</mark>${after}`
          }
        }
        return `<div class="doctor-combobox-item ${isSelected ? 'is-selected' : ''}" data-index="${idx}" data-value="${u.replace(/"/g, '&quot;')}">${displayHtml}</div>`
      }).join('')
    }

    const openDropdown = () => {
      renderUnivOptions(univSearch.value)
      univDropdown.style.display = 'block'
      univArrow?.classList.add('is-open')
    }

    const closeDropdown = () => {
      univDropdown.style.display = 'none'
      univArrow?.classList.remove('is-open')
      activeHighlightIndex = -1
    }

    const selectUniversity = (val) => {
      univSearch.value = val
      univHidden.value = val
      univSearch.setCustomValidity('')
      closeDropdown()

      const univOtherWrap = form.querySelector('#doctor-university-other-wrap')
      const univOtherInput = form.querySelector('#doctor-university-other')
      if (val === 'Other') {
        if (univOtherWrap) {
          univOtherWrap.style.display = 'block'
          if (univOtherInput) univOtherInput.required = true
        }
        univOtherInput?.focus()
        collegeSelect.innerHTML = `<option value="">Select option</option><option value="Other">Other</option>`
        collegeSelect.disabled = false
      } else {
        if (univOtherWrap) {
          univOtherWrap.style.display = 'none'
          if (univOtherInput) {
            univOtherInput.required = false
            univOtherInput.value = ''
          }
        }
        const cols = medicalUniversitiesAndColleges[val] || []
        collegeSelect.innerHTML = `<option value="">Select option</option>` + cols.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="Other">Other</option>`
        collegeSelect.disabled = false
      }
      collegeSelect.dispatchEvent(new Event('change'))
    }

    if (univSearch) {
      univSearch.addEventListener('focus', () => {
        openDropdown()
      })

      univSearch.addEventListener('input', () => {
        openDropdown()
        const query = univSearch.value.trim()
        if (!query) {
          univHidden.value = ''
          collegeSelect.innerHTML = `<option value="">Select option</option>`
          collegeSelect.disabled = true
          const univOtherWrap = form.querySelector('#doctor-university-other-wrap')
          const univOtherInput = form.querySelector('#doctor-university-other')
          if (univOtherWrap) {
            univOtherWrap.style.display = 'none'
            if (univOtherInput) {
              univOtherInput.required = false
              univOtherInput.value = ''
            }
          }
        } else {
          const exact = universities.find(u => u.toLowerCase() === query.toLowerCase())
          if (exact) {
            selectUniversity(exact)
          } else {
            univHidden.value = ''
          }
        }
      })

      univSearch.addEventListener('keydown', (e) => {
        const items = univList.querySelectorAll('.doctor-combobox-item')
        if (!items.length) return

        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (univDropdown.style.display === 'none') {
            openDropdown()
            return
          }
          activeHighlightIndex = (activeHighlightIndex + 1) % items.length
          items.forEach((item, idx) => item.classList.toggle('is-focused', idx === activeHighlightIndex))
          items[activeHighlightIndex]?.scrollIntoView({ block: 'nearest' })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (univDropdown.style.display === 'none') {
            openDropdown()
            return
          }
          activeHighlightIndex = (activeHighlightIndex - 1 + items.length) % items.length
          items.forEach((item, idx) => item.classList.toggle('is-focused', idx === activeHighlightIndex))
          items[activeHighlightIndex]?.scrollIntoView({ block: 'nearest' })
        } else if (e.key === 'Enter') {
          if (univDropdown.style.display !== 'none' && activeHighlightIndex >= 0 && items[activeHighlightIndex]) {
            e.preventDefault()
            selectUniversity(items[activeHighlightIndex].dataset.value)
          }
        } else if (e.key === 'Escape') {
          closeDropdown()
        }
      })

      univSearch.addEventListener('blur', () => {
        setTimeout(() => {
          closeDropdown()
          if (univSearch.value.trim() && !univHidden.value) {
            const exact = universities.find(u => u.toLowerCase() === query.toLowerCase())
            if (exact) {
              selectUniversity(exact)
            } else {
              univSearch.value = ''
              univHidden.value = ''
              collegeSelect.innerHTML = `<option value="">Select option</option>`
              collegeSelect.disabled = true
              const univOtherWrap = form.querySelector('#doctor-university-other-wrap')
              const univOtherInput = form.querySelector('#doctor-university-other')
              if (univOtherWrap) {
                univOtherWrap.style.display = 'none'
                if (univOtherInput) {
                  univOtherInput.required = false
                  univOtherInput.value = ''
                }
              }
            }
          }
        }, 180)
      })
    }

    if (univArrow) {
      univArrow.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (univDropdown.style.display === 'none') {
          univSearch.focus()
          openDropdown()
        } else {
          closeDropdown()
        }
      })
    }

    if (univList) {
      univList.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.doctor-combobox-item')
        if (item && item.dataset.value) {
          e.preventDefault()
          selectUniversity(item.dataset.value)
        }
      })
    }

    const degreeSelect = form.querySelector('#doctor-degree')
    degreeSelect?.addEventListener('change', () => {
      const dWrap = form.querySelector('#doctor-degree-other-wrap')
      const dInput = form.querySelector('#doctor-degree-other')
      if (degreeSelect.value === 'Other UG' || degreeSelect.value === 'Other PG') {
        if (dWrap) dWrap.style.display = 'block'
        if (dInput) dInput.required = true
        dInput?.focus()
      } else {
        if (dWrap) dWrap.style.display = 'none'
        if (dInput) {
          dInput.required = false
          dInput.value = ''
        }
      }
    })

    collegeSelect?.addEventListener('change', () => {
      const cWrap = form.querySelector('#doctor-college-other-wrap')
      const cInput = form.querySelector('#doctor-college-other')
      if (collegeSelect.value === 'Other') {
        if (cWrap) cWrap.style.display = 'block'
        if (cInput) cInput.required = true
        cInput?.focus()
      } else {
        if (cWrap) cWrap.style.display = 'none'
        if (cInput) {
          cInput.required = false
          cInput.value = ''
        }
      }
    })

    ;[form.querySelector('#doctor-degree-other'), form.querySelector('#doctor-university-other'), form.querySelector('#doctor-college-other')].forEach(inp => {
      inp?.addEventListener('input', () => {
        inp.setCustomValidity('')
      })
    })

    // Cascading Sub-Specialization helper
    const updateSubSpecializationOptions = () => {
      const primInput = form.querySelector('#hidden-primarySpecialization')
      const selectedPrimaries = primInput && primInput.value ? primInput.value.split(',').map(s => s.trim()).filter(Boolean) : []
      const availableSubs = getSubSpecializationsForPrimary(selectedPrimaries)
      const subSelect = form.querySelector('#select-subSpecialization')
      const subHidden = form.querySelector('#hidden-subSpecialization')
      const subContainer = form.querySelector('#chips-subSpecialization')
      const subOtherWrap = form.querySelector('#other-wrap-subSpecialization')

      if (subSelect) {
        if (!selectedPrimaries.length) {
          subSelect.disabled = true
          subSelect.innerHTML = `<option value="">Select primary specialization first</option>`
          if (subOtherWrap) subOtherWrap.style.display = 'none'
          if (subHidden) subHidden.value = ''
          if (subContainer) subContainer.innerHTML = ''
        } else {
          subSelect.disabled = false
          const currentVal = subSelect.value
          subSelect.innerHTML = `<option value="">Add sub-specialization</option>` + availableSubs.map(s => `<option value="${s}">${s}</option>`).join('')
          if (availableSubs.includes(currentVal)) {
            subSelect.value = currentVal
          }
          if (subHidden && subContainer) {
            const currentSelected = subHidden.value ? subHidden.value.split(',').map(s => s.trim()).filter(Boolean) : []
            const validSelected = currentSelected.filter(item => availableSubs.includes(item) || availableSubs.includes('Other'))
            if (validSelected.length !== currentSelected.length) {
              subHidden.value = validSelected.join(', ')
              subContainer.innerHTML = validSelected.map(item => `
                <span class="doctor-chip">
                  <span>${escapeHtml(item)}</span>
                  <button type="button" class="doctor-chip-remove" data-field="subSpecialization" data-val="${escapeHtml(item)}" aria-label="Remove ${escapeHtml(item)}">&times;</button>
                </span>
              `).join('')
            }
          }
        }
      }
    }

    // Practice & Career Multi-Select Chips & Custom Other Interactions
    const multiFields = [
      'primarySpecialization',
      'subSpecialization',
      'medicalQualifications',
      'languagesKnown'
    ]

    multiFields.forEach(fieldName => {
      const select = form.querySelector(`#select-${fieldName}`)
      const container = form.querySelector(`#chips-${fieldName}`)
      const hiddenInput = form.querySelector(`#hidden-${fieldName}`)
      const otherWrap = form.querySelector(`#other-wrap-${fieldName}`)
      const otherInput = form.querySelector(`#other-input-${fieldName}`)
      const otherBtn = form.querySelector(`button[data-field="${fieldName}"].doctor-chip-other-btn`)

      const getSelected = () => {
        if (!hiddenInput || !hiddenInput.value) return []
        return hiddenInput.value.split(',').map(s => s.trim()).filter(Boolean)
      }

      const setSelected = (items) => {
        const unique = Array.from(new Set(items.map(s => s.trim()).filter(Boolean)))
        if (hiddenInput) {
          hiddenInput.value = unique.join(', ')
          select?.setCustomValidity('')
        }
        if (container) {
          container.style.display = unique.length ? 'flex' : 'none'
          container.innerHTML = unique.map(item => `
            <span class="doctor-chip">
              <span>${escapeHtml(item)}</span>
              <button type="button" class="doctor-chip-remove" data-field="${fieldName}" data-val="${escapeHtml(item)}" aria-label="Remove ${escapeHtml(item)}">&times;</button>
            </span>
          `).join('')
        }
        if (fieldName === 'primarySpecialization') {
          updateSubSpecializationOptions()
        }
      }

      if (select) {
        select.addEventListener('change', () => {
          const val = select.value.trim()
          if (!val) return
          if (val === 'Other') {
            if (otherWrap) {
              otherWrap.style.display = 'flex'
              otherInput?.focus()
            }
            select.value = ''
            return
          }
          const current = getSelected()
          if (!current.includes(val)) {
            setSelected([...current, val])
          }
          select.value = ''
        })
      }

      const addOther = () => {
        if (!otherInput) return
        const val = otherInput.value.trim()
        if (val) {
          const current = getSelected()
          if (!current.includes(val)) {
            setSelected([...current, val])
          }
          otherInput.value = ''
        }
        if (otherWrap) otherWrap.style.display = 'none'
      }

      if (otherBtn) {
        otherBtn.addEventListener('click', (e) => {
          e.preventDefault()
          addOther()
        })
      }

      if (otherInput) {
        otherInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addOther()
          } else if (e.key === 'Escape') {
            if (otherWrap) otherWrap.style.display = 'none'
          }
        })
      }

      if (container) {
        container.addEventListener('click', (e) => {
          const btn = e.target.closest('.doctor-chip-remove')
          if (btn) {
            e.preventDefault()
            const val = btn.dataset.val
            const current = getSelected()
            setSelected(current.filter(item => item !== val))
          }
        })
      }
    })

    // Initialize sub-specialization options based on currently selected primaries
    updateSubSpecializationOptions()

    const ptSelect = form.querySelector('#doctor-practiceType')
    ptSelect?.addEventListener('change', () => {
      const ptWrap = form.querySelector('#doctor-practiceType-other-wrap')
      const ptInput = form.querySelector('#doctor-practiceType-other')
      if (ptSelect.value === 'Other') {
        if (ptWrap) ptWrap.style.display = 'block'
        if (ptInput) ptInput.required = true
        ptInput?.focus()
      } else {
        if (ptWrap) ptWrap.style.display = 'none'
        if (ptInput) {
          ptInput.required = false
          ptInput.value = ''
          ptInput.setCustomValidity('')
        }
      }
    })

    const wtSelect = form.querySelector('#doctor-workType')
    wtSelect?.addEventListener('change', () => {
      const wtWrap = form.querySelector('#doctor-workType-other-wrap')
      const wtInput = form.querySelector('#doctor-workType-other')
      if (wtSelect.value === 'Other') {
        if (wtWrap) wtWrap.style.display = 'block'
        if (wtInput) wtInput.required = true
        wtInput?.focus()
      } else {
        if (wtWrap) wtWrap.style.display = 'none'
        if (wtInput) {
          wtInput.required = false
          wtInput.value = ''
          wtInput.setCustomValidity('')
        }
      }
    })

    const posSelect = form.querySelector('#doctor-positionRole')
    posSelect?.addEventListener('change', () => {
      const posWrap = form.querySelector('#doctor-positionRole-other-wrap')
      const posInput = form.querySelector('#doctor-positionRole-other')
      if (posSelect.value === 'Other') {
        if (posWrap) posWrap.style.display = 'block'
        if (posInput) posInput.required = true
        posInput?.focus()
      } else {
        if (posWrap) posWrap.style.display = 'none'
        if (posInput) {
          posInput.required = false
          posInput.value = ''
          posInput.setCustomValidity('')
        }
      }
    })

    ;[form.querySelector('#doctor-practiceType-other'), form.querySelector('#doctor-workType-other'), form.querySelector('#doctor-positionRole-other')].forEach(inp => {
      inp?.addEventListener('input', () => {
        inp.setCustomValidity('')
      })
    })

    // NMC IMR Live Verification Check button
    const checkBtn = form.querySelector('#btn-check-enrollment')
    const enrollInput = form.querySelector('#doctor-enrollmentNo')

    const updateCheckBtnToVerified = () => {
      values.isRegistrationVerified = true
      if (form._doctorValues) form._doctorValues.isRegistrationVerified = true
      if (checkBtn) {
        checkBtn.disabled = false
        checkBtn.classList.remove('is-loading', 'button-primary', 'shake-highlight')
        checkBtn.classList.add('is-verified', 'pulse-success')
        checkBtn.innerHTML = `${icon('check')} Checked`
      }
    }

    const resetCheckBtn = () => {
      values.isRegistrationVerified = false
      if (form._doctorValues) form._doctorValues.isRegistrationVerified = false
      if (checkBtn) {
        checkBtn.disabled = false
        checkBtn.classList.remove('is-loading', 'is-verified', 'pulse-success')
        checkBtn.classList.add('button-primary')
        checkBtn.innerHTML = `${icon('search')} Check`
      }
    }

    if (enrollInput) {
      enrollInput.addEventListener('input', () => {
        if (values.isRegistrationVerified) {
          resetCheckBtn()
        }
      })
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const regNo = enrollInput?.value?.trim()
        if (!regNo) {
          ctx.showToast('Please enter registration no. or hall ticket or enrollment no. to check.')
          enrollInput?.focus()
          return
        }

        checkBtn.disabled = true
        checkBtn.classList.add('is-loading')
        checkBtn.classList.remove('shake-highlight')
        checkBtn.innerHTML = `<span class="nmc-btn-spinner"></span> Checking...`

        openNmcVerificationModal(
          regNo,
          (selectedDoctor) => {
            // Callback: Doctor Selected / Submitted
            updateCheckBtnToVerified()

            if (selectedDoctor.registration_no && selectedDoctor.registration_no !== '—') {
              if (enrollInput) enrollInput.value = selectedDoctor.registration_no
              values.enrollmentNo = selectedDoctor.registration_no
            }

            if (selectedDoctor.name && selectedDoctor.name !== '—') {
              values.importedDoctorName = selectedDoctor.name
            }

            // Note: Degree, University, College, Graduation Year, and State Medical Council are not auto-filled; the user enters them manually.

            // Generate official NMC IMR Verification Record PDF and attach to enrollment certificate field
            try {
              const certFile = generateNmcCertificatePdf(selectedDoctor)
              values.enrollmentCert = certFile
              if (form._doctorValues) {
                form._doctorValues.enrollmentCert = certFile
              }
              const enrollCertInput = form.querySelector('#doctor-enrollmentCert')
              if (enrollCertInput) {
                enrollCertInput.required = false
                try {
                  const dt = new DataTransfer()
                  dt.items.add(certFile)
                  enrollCertInput.files = dt.files
                } catch (_) {}
                const labelSpan = enrollCertInput.closest('.doctor-upload-field')?.querySelector('.upload-btn-label')
                if (labelSpan) {
                  labelSpan.textContent = `✓ ${certFile.name}`
                  labelSpan.title = certFile.name
                }
                const previewCertBtn = form.querySelector('#btn-preview-enrollmentCert')
                if (previewCertBtn) {
                  previewCertBtn.style.display = 'inline-flex'
                }
              }
            } catch (pdfErr) {
              console.warn('Failed to auto-generate NMC verification certificate:', pdfErr)
            }

            if (form._doctorValues) {
              form._doctorValues = { ...form._doctorValues, ...values }
            }

            ctx.showToast(`Doctor verified & NMC Certificate attached: ${selectedDoctor.name}`)
          },
          () => {
            // Callback: Continue Manually Submitted (no data from NMC)
            updateCheckBtnToVerified()
            // Clear any previously auto-attached certificate so user can upload their own
            if (values.enrollmentCert && values.enrollmentCert.name?.startsWith('NMC_IMR_Certificate_')) {
              values.enrollmentCert = null
              if (form._doctorValues) form._doctorValues.enrollmentCert = null
              const enrollCertInput = form.querySelector('#doctor-enrollmentCert')
              if (enrollCertInput) {
                enrollCertInput.value = ''
                enrollCertInput.required = true
                const labelSpan = enrollCertInput.closest('.doctor-upload-field')?.querySelector('.upload-btn-label')
                if (labelSpan) {
                  labelSpan.textContent = 'Upload File'
                }
                const previewCertBtn = form.querySelector('#btn-preview-enrollmentCert')
                if (previewCertBtn) {
                  previewCertBtn.style.display = 'none'
                }
              }
            }
            if (form._doctorValues) {
              form._doctorValues = { ...form._doctorValues, ...values }
            }
            ctx.showToast('Continuing with manual entry. Please upload your certificate.')
            const enrollCertInput = form.querySelector('#doctor-enrollmentCert')
            enrollCertInput?.focus()
          },
          () => {
            // Callback: Close / Dismissed without submit (Cross symbol / Backdrop click / Escape)
            checkBtn.disabled = false
            checkBtn.classList.remove('is-loading')
            if (values.isRegistrationVerified) {
              checkBtn.classList.add('is-verified')
              checkBtn.classList.remove('button-primary')
              checkBtn.innerHTML = `${icon('check')} Checked`
            } else {
              checkBtn.classList.remove('is-verified')
              checkBtn.classList.add('button-primary')
              checkBtn.innerHTML = `${icon('search')} Check`
            }
          }
        )
      })
    }

    const previewCertBtn = form.querySelector('#btn-preview-enrollmentCert')
    if (previewCertBtn) {
      previewCertBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const certFile = values.enrollmentCert || form._doctorValues?.enrollmentCert
        if (certFile) {
          openCertificatePreviewModal(certFile, 'Enrollment Certificate Preview')
        } else {
          ctx.showToast('No certificate has been uploaded or generated yet.')
        }
      })
    }
  }

  // Location Stage Dynamic Address Sync, City Dropdown with Other & Option Pills
  if (stage === 'location') {
    const sameCheckbox = form.querySelector('#doctor-sameAsCurrent')
    const currentAddr = form.querySelector('#doctor-currentAddress')
    const currentState = form.querySelector('#doctor-currentState')
    const currentDist = form.querySelector('#doctor-currentDistrict')
    const currentCity = form.querySelector('#doctor-currentCity')
    const currentCityOtherWrap = form.querySelector('#doctor-currentCity-other-wrap')
    const currentCityOther = form.querySelector('#doctor-currentCity-other')
    const currentPin = form.querySelector('#doctor-currentPincode')

    const permAddr = form.querySelector('#doctor-permAddress')
    const permState = form.querySelector('#doctor-permState')
    const permDist = form.querySelector('#doctor-permDistrict')
    const permCity = form.querySelector('#doctor-permCity')
    const permCityOtherWrap = form.querySelector('#doctor-permCity-other-wrap')
    const permCityOther = form.querySelector('#doctor-permCity-other')
    const permPin = form.querySelector('#doctor-permPincode')

    const updateDistrictDropdown = (stateSelect, districtSelect, selectedDistrict = '') => {
      const st = stateSelect ? stateSelect.value : ''
      const districts = indianStatesAndDistricts[st] || []
      if (districts.length > 0) {
        districtSelect.innerHTML = `<option value="">Select district</option>` + districts.map(d => `<option value="${d}" ${d === selectedDistrict ? 'selected' : ''}>${d}</option>`).join('')
        districtSelect.disabled = false
      } else {
        districtSelect.innerHTML = `<option value="">Select district</option>`
        districtSelect.disabled = true
      }
    }

    const updateCityDropdown = (districtSelect, citySelect, selectedCity = '') => {
      const dist = districtSelect ? districtSelect.value : ''
      const cities = dist ? getCitiesForDistrict(dist) : []
      if (cities.length > 0) {
        citySelect.innerHTML = `<option value="">Select city or town</option>` + cities.map(c => `<option value="${c}" ${c === selectedCity ? 'selected' : ''}>${c}</option>`).join('')
        citySelect.disabled = false
      } else {
        citySelect.innerHTML = `<option value="">Select city or town</option>`
        citySelect.disabled = true
      }
    }

    if (currentState && currentDist) {
      currentState.addEventListener('change', () => {
        updateDistrictDropdown(currentState, currentDist)
        updateCityDropdown(currentDist, currentCity)
        if (currentCityOtherWrap) currentCityOtherWrap.style.display = 'none'
        if (currentCityOther) {
          currentCityOther.required = false
          currentCityOther.value = ''
        }
        if (sameCheckbox && sameCheckbox.checked) {
          syncPermanentAddress()
        }
      })
    }

    if (currentDist && currentCity) {
      currentDist.addEventListener('change', () => {
        updateCityDropdown(currentDist, currentCity)
        if (currentCityOtherWrap) currentCityOtherWrap.style.display = 'none'
        if (currentCityOther) {
          currentCityOther.required = false
          currentCityOther.value = ''
        }
        if (sameCheckbox && sameCheckbox.checked) {
          syncPermanentAddress()
        }
      })
    }

    if (currentCity) {
      currentCity.addEventListener('change', () => {
        if (currentCity.value === 'Other') {
          if (currentCityOtherWrap) currentCityOtherWrap.style.display = 'block'
          if (currentCityOther) {
            currentCityOther.required = true
            currentCityOther.focus()
          }
        } else {
          if (currentCityOtherWrap) currentCityOtherWrap.style.display = 'none'
          if (currentCityOther) {
            currentCityOther.required = false
            currentCityOther.value = ''
            currentCityOther.setCustomValidity('')
          }
        }
        if (sameCheckbox && sameCheckbox.checked) {
          syncPermanentAddress()
        }
      })
    }

    if (permState && permDist) {
      permState.addEventListener('change', () => {
        updateDistrictDropdown(permState, permDist)
        updateCityDropdown(permDist, permCity)
        if (permCityOtherWrap) permCityOtherWrap.style.display = 'none'
        if (permCityOther) {
          permCityOther.required = false
          permCityOther.value = ''
        }
      })
    }

    if (permDist && permCity) {
      permDist.addEventListener('change', () => {
        updateCityDropdown(permDist, permCity)
        if (permCityOtherWrap) permCityOtherWrap.style.display = 'none'
        if (permCityOther) {
          permCityOther.required = false
          permCityOther.value = ''
        }
      })
    }

    if (permCity) {
      permCity.addEventListener('change', () => {
        if (permCity.value === 'Other') {
          if (permCityOtherWrap) permCityOtherWrap.style.display = 'block'
          if (permCityOther) {
            permCityOther.required = true
            permCityOther.focus()
          }
        } else {
          if (permCityOtherWrap) permCityOtherWrap.style.display = 'none'
          if (permCityOther) {
            permCityOther.required = false
            permCityOther.value = ''
            permCityOther.setCustomValidity('')
          }
        }
      })
    }

    const syncPermanentAddress = () => {
      if (sameCheckbox && sameCheckbox.checked) {
        permAddr.value = currentAddr.value
        permState.value = currentState.value
        updateDistrictDropdown(permState, permDist, currentDist.value)
        permDist.value = currentDist.value
        updateCityDropdown(permDist, permCity, currentCity.value)
        permCity.value = currentCity.value
        if (currentCity.value === 'Other') {
          if (permCityOtherWrap) permCityOtherWrap.style.display = 'block'
          if (permCityOther) {
            permCityOther.value = currentCityOther ? currentCityOther.value : ''
            permCityOther.readOnly = true
          }
        } else {
          if (permCityOtherWrap) permCityOtherWrap.style.display = 'none'
          if (permCityOther) permCityOther.value = ''
        }
        permPin.value = currentPin.value

        permAddr.readOnly = true
        permPin.readOnly = true
        permState.style.pointerEvents = 'none'
        permState.tabIndex = -1
        permDist.style.pointerEvents = 'none'
        permDist.tabIndex = -1
        permCity.style.pointerEvents = 'none'
        permCity.tabIndex = -1

        permAddr.classList.add('is-synced')
        permState.classList.add('is-synced')
        permDist.classList.add('is-synced')
        permCity.classList.add('is-synced')
        permPin.classList.add('is-synced')
      } else {
        permAddr.readOnly = false
        permPin.readOnly = false
        permState.style.pointerEvents = 'auto'
        permState.tabIndex = 0
        permDist.style.pointerEvents = 'auto'
        permDist.tabIndex = 0
        permCity.style.pointerEvents = 'auto'
        permCity.tabIndex = 0
        if (permCityOther) permCityOther.readOnly = false
        if (permState.value) {
          permDist.disabled = false
          if (permDist.value) {
            permCity.disabled = false
          }
        } else {
          permDist.disabled = true
          permCity.disabled = true
        }

        permAddr.classList.remove('is-synced')
        permState.classList.remove('is-synced')
        permDist.classList.remove('is-synced')
        permCity.classList.remove('is-synced')
        permPin.classList.remove('is-synced')
      }
    }

    if (sameCheckbox) {
      sameCheckbox.addEventListener('change', syncPermanentAddress)
      ;[currentAddr, currentState, currentDist, currentCity, currentCityOther, currentPin].forEach(el => {
        if (el) {
          el.addEventListener('input', () => {
            if (sameCheckbox.checked) syncPermanentAddress()
          })
        }
      })
      if (sameCheckbox.checked) syncPermanentAddress()
    }

    // Dual vs Single Working Hours & Days Toggle Helper
    const updateHoursVisibility = () => {
      const isBoth = Array.from(form.querySelectorAll('input[name="consultationMode"]:checked')).some(cb => cb.value === 'Both')
      const singleDays = form.querySelector('#doctor-single-days-group')
      const dualDays = form.querySelector('#doctor-dual-days-group')
      const singleHours = form.querySelector('#doctor-single-hours-group')
      const dualHours = form.querySelector('#doctor-dual-hours-group')
      const wf = form.querySelector('#doctor-workingHoursFrom')
      const wt = form.querySelector('#doctor-workingHoursTo')
      const owf = form.querySelector('#doctor-onlineWorkingHoursFrom')
      const owt = form.querySelector('#doctor-onlineWorkingHoursTo')
      const ofwf = form.querySelector('#doctor-offlineWorkingHoursFrom')
      const ofwt = form.querySelector('#doctor-offlineWorkingHoursTo')

      if (isBoth) {
        if (singleDays) singleDays.style.display = 'none'
        if (dualDays) dualDays.style.display = 'block'
        if (singleHours) singleHours.style.display = 'none'
        if (dualHours) dualHours.style.display = 'block'
        if (wf) wf.required = false
        if (wt) wt.required = false
        if (owf) owf.required = true
        if (owt) owt.required = true
        if (ofwf) ofwf.required = true
        if (ofwt) ofwt.required = true
      } else {
        if (singleDays) singleDays.style.display = 'block'
        if (dualDays) dualDays.style.display = 'none'
        if (singleHours) singleHours.style.display = 'grid'
        if (dualHours) dualHours.style.display = 'none'
        if (wf) wf.required = true
        if (wt) wt.required = true
        if (owf) owf.required = false
        if (owt) owt.required = false
        if (ofwf) ofwf.required = false
        if (ofwt) ofwt.required = false
      }
    }

    // Consultation mode pills interaction
    const modeInputs = form.querySelectorAll('input[name="consultationMode"]')
    modeInputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.value === 'Both' && input.checked) {
          modeInputs.forEach(m => {
            if (m.value !== 'Both') {
              m.checked = false
              m.closest('.doctor-pill-checkbox')?.classList.remove('is-checked')
            }
          })
        } else if (input.checked && input.value !== 'Both') {
          const bothInput = form.querySelector('input[name="consultationMode"][value="Both"]')
          if (bothInput) {
            bothInput.checked = false
            bothInput.closest('.doctor-pill-checkbox')?.classList.remove('is-checked')
          }
        }
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
        updateHoursVisibility()
      })
    })

    // Available days pills interaction (handles single, online, and offline available days)
    const dayInputs = form.querySelectorAll('input[name="availableDays"], input[name="onlineAvailableDays"], input[name="offlineAvailableDays"]')
    dayInputs.forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
      })
    })

    updateHoursVisibility()
  }

  // File inputs live label update
  form.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      const labelSpan = input.closest('.doctor-upload-field')?.querySelector('.upload-btn-label')
      if (file && labelSpan) {
        labelSpan.textContent = file.name
        labelSpan.title = file.name
        if (input.name) {
          values[input.name] = file
          if (form._doctorValues) form._doctorValues[input.name] = file
        }
        if (input.name === 'enrollmentCert') {
          const previewCertBtn = form.querySelector('#btn-preview-enrollmentCert')
          if (previewCertBtn) previewCertBtn.style.display = 'inline-flex'
        }
      }
    })
  })

  const reviewPreviewCertBtn = form.querySelector('#btn-review-preview-enrollmentCert')
  if (reviewPreviewCertBtn) {
    reviewPreviewCertBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const certFile = values.enrollmentCert || form._doctorValues?.enrollmentCert
      if (certFile) {
        openCertificatePreviewModal(certFile, 'Enrollment Certificate Preview')
      } else {
        ctx.showToast('No certificate has been uploaded or generated yet.')
      }
    })
  }

  const signInBtn = form.querySelector('[data-doctor-signin]')
  if (signInBtn) {
    signInBtn.addEventListener('click', (e) => {
      e.preventDefault()
      openAuthModal('portal-login', ctx)
    })
  }

  const viewPdfBtn = form.querySelector('#btn-doctor-view-pdf')
  const sigCanvas = form.querySelector('#doctor-signature-canvas')
  const scrollBox = form.querySelector('#doctor-terms-scroll-box')
  const scrollHint = form.querySelector('#doctor-terms-scroll-hint')
  const checkList = form.querySelector('#doctor-terms-checkbox-list')
  const termCheckboxes = form.querySelectorAll('.doctor-term-checkbox')
  const pdfGateStatus = form.querySelector('#doctor-pdf-gate-status')

  let hasDrawn = false

  // Helper to re-evaluate whether View PDF button should be unlocked
  const evaluatePdfUnlockState = () => {
    const hasSig = Boolean(values.digitalSignature || form._doctorValues?.digitalSignature || hasDrawn)
    const currentTerms = form.querySelectorAll('.doctor-term-checkbox')
    const allChecked = currentTerms.length === 4 && Array.from(currentTerms).every(cb => cb.checked)
    const canView = hasSig && allChecked

    if (viewPdfBtn) {
      if (canView) {
        viewPdfBtn.classList.remove('is-locked')
        viewPdfBtn.removeAttribute('disabled')
        if (pdfGateStatus) {
          pdfGateStatus.textContent = '✓ Application PDF unlocked & ready to view'
          pdfGateStatus.classList.add('is-unlocked')
        }
      } else {
        viewPdfBtn.classList.add('is-locked')
        if (pdfGateStatus) {
          pdfGateStatus.classList.remove('is-unlocked')
          if (!hasSig && !allChecked) {
            pdfGateStatus.textContent = 'Sign above and accept all 4 terms to unlock PDF preview'
          } else if (!hasSig) {
            pdfGateStatus.textContent = 'Draw your signature above to unlock PDF preview'
          } else {
            pdfGateStatus.textContent = 'Accept all 4 terms above to unlock PDF preview'
          }
        }
      }
    }
    return { hasSig, allChecked, canView }
  }

  // Terms and conditions scroll-to-unlock mechanism
  const unlockCheckboxes = () => {
    termCheckboxes.forEach(cb => { cb.disabled = false })
    if (scrollHint) {
      scrollHint.textContent = '✓ Checkboxes unlocked'
      scrollHint.classList.add('is-unlocked')
    }
  }

  if (scrollBox) {
    scrollBox.addEventListener('scroll', () => {
      if (scrollBox.scrollTop > 15 && (scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 30)) {
        unlockCheckboxes()
      }
    })
  }

  if (checkList) {
    checkList.addEventListener('click', (e) => {
      const item = e.target.closest('.doctor-terms-check-item')
      if (item) {
        const input = item.querySelector('input')
        if (input && input.disabled) {
          ctx.showToast('Please scroll down to the bottom of the agreement to unlock checkboxes.')
          if (scrollBox) {
            scrollBox.scrollTo({ top: scrollBox.scrollHeight, behavior: 'smooth' })
          }
        }
      }
    })
  }

  termCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      values[cb.name] = cb.checked
      if (form._doctorValues) form._doctorValues[cb.name] = cb.checked
      evaluatePdfUnlockState()
    })
  })

  // View PDF Button Click Guard
  if (viewPdfBtn) {
    viewPdfBtn.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()

      const { hasSig, allChecked } = evaluatePdfUnlockState()

      if (!hasSig) {
        ctx.showToast('Please draw your digital signature first before viewing PDF.')
        const sigWrapper = form.querySelector('#doctor-signature-canvas-wrapper')
        sigWrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        sigWrapper?.classList.remove('shake-highlight')
        void sigWrapper?.offsetWidth
        sigWrapper?.classList.add('shake-highlight')
        return
      }

      if (!allChecked) {
        ctx.showToast('Please accept all 4 terms and conditions before viewing PDF.')
        const termsCard = form.querySelector('#doctor-terms-card')
        termsCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        termsCard?.classList.remove('shake-highlight')
        void termsCard?.offsetWidth
        termsCard?.classList.add('shake-highlight')
        return
      }

      openPdfPreviewModal({ ...form._doctorValues, ...values })
    })
  }

  // Digital Signature Canvas in Review Stage
  if (sigCanvas) {
    const hint = form.querySelector('#doctor-signature-hint')
    const clearBtn = form.querySelector('#doctor-signature-clear')
    const dateInput = form.querySelector('#doctor-signature-date')
    const ctx2d = sigCanvas.getContext('2d')
    let isDrawing = false

    const resizeCanvas = () => {
      const rect = sigCanvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      if (rect.width === 0) return

      const prevData = hasDrawn ? sigCanvas.toDataURL('image/png') : null
      sigCanvas.width = rect.width * dpr
      sigCanvas.height = 135 * dpr
      ctx2d.scale(dpr, dpr)
      ctx2d.lineWidth = 2.4
      ctx2d.lineCap = 'round'
      ctx2d.lineJoin = 'round'
      ctx2d.strokeStyle = '#0f172a'

      if (prevData) {
        const img = new Image()
        img.onload = () => {
          ctx2d.drawImage(img, 0, 0, rect.width, 135)
          evaluatePdfUnlockState()
        }
        img.src = prevData
      } else if (values.digitalSignature || form._doctorValues?.digitalSignature) {
        const existingSig = values.digitalSignature || form._doctorValues?.digitalSignature
        const img = new Image()
        img.onload = () => {
          ctx2d.drawImage(img, 0, 0, rect.width, 135)
          hasDrawn = true
          if (hint) hint.style.display = 'none'
          evaluatePdfUnlockState()
        }
        img.src = existingSig
      }
    }

    setTimeout(resizeCanvas, 60)

    const getPos = (e) => {
      const rect = sigCanvas.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const startDrawing = (e) => {
      isDrawing = true
      hasDrawn = true
      if (hint) hint.style.display = 'none'
      const pos = getPos(e)
      ctx2d.beginPath()
      ctx2d.moveTo(pos.x, pos.y)
    }

    const draw = (e) => {
      if (!isDrawing) return
      if (e.cancelable) e.preventDefault()
      const pos = getPos(e)
      ctx2d.lineTo(pos.x, pos.y)
      ctx2d.stroke()
    }

    const stopDrawing = () => {
      if (!isDrawing) return
      isDrawing = false
      const dataUrl = sigCanvas.toDataURL('image/png')
      values.digitalSignature = dataUrl
      const todayDateStr = dateInput?.value || `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
      values.signatureDate = todayDateStr
      if (form._doctorValues) {
        form._doctorValues.digitalSignature = values.digitalSignature
        form._doctorValues.signatureDate = values.signatureDate
      }
      evaluatePdfUnlockState()
    }

    sigCanvas.addEventListener('mousedown', startDrawing)
    sigCanvas.addEventListener('mousemove', draw)
    sigCanvas.addEventListener('mouseup', stopDrawing)
    sigCanvas.addEventListener('mouseleave', stopDrawing)

    sigCanvas.addEventListener('touchstart', (e) => {
      if (e.cancelable) e.preventDefault()
      startDrawing(e)
    }, { passive: false })
    sigCanvas.addEventListener('touchmove', (e) => {
      draw(e)
    }, { passive: false })
    sigCanvas.addEventListener('touchend', stopDrawing)
    sigCanvas.addEventListener('touchcancel', stopDrawing)

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault()
        ctx2d.clearRect(0, 0, sigCanvas.width, sigCanvas.height)
        hasDrawn = false
        values.digitalSignature = null
        if (form._doctorValues) {
          form._doctorValues.digitalSignature = null
        }
        if (hint) hint.style.display = 'flex'
        evaluatePdfUnlockState()
      })
    }

    evaluatePdfUnlockState()
  }
}

function doctorStageIndex(stage) {
  return doctorStageKeys.indexOf(stage)
}

function renderRegistrationVerification(backdrop, ctx, values, close) {
  const portal = portalLabel(values.portal)
  const isMultiStage = values.portal === 'diagnostic' || values.portal === 'hospital' || values.portal === 'clinic' || values.portal === 'pharmacy'
  const secondStageLabel = values.portal === 'diagnostic' 
    ? 'Services & Location' 
    : (values.portal === 'clinic' ? 'Consultation & Location' : (values.portal === 'pharmacy' ? 'Operations & Location' : 'Classification & Location'))
  const stepperHtml = isMultiStage
    ? `<div class="auth-register-stepper"><span class="is-complete">${icon('check')} <small>Details</small></span><i></i><span class="is-complete">${icon('check')} <small>${secondStageLabel}</small></span><i></i><span class="is-active">3 <small>Verify</small></span></div>`
    : `<div class="auth-register-stepper"><span class="is-complete">1 <small>Details</small></span><i></i><span class="is-active">2 <small>Verify</small></span></div>`
  const popup = backdrop.querySelector('.auth-popup')
  popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button>${stepperHtml}<div class="auth-form-heading"><span class="auth-form-kicker">${portal} registration</span><h2>Verify your account</h2><p>Enter the 6-digit code sent to your official email address.</p></div><form class="auth-form" id="popup-verification-form"><label for="popup-verification-code">Verification code</label><input class="auth-text-input auth-code-input" id="popup-verification-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required><button class="button button-primary auth-submit" type="submit">Complete registration ${icon('check')}</button></form><button class="auth-popup-back auth-edit-registration" type="button">${icon('chevron')} Edit registration details</button>`
  popup.querySelector('.auth-popup-close').addEventListener('click', close)
  popup.querySelector('.auth-edit-registration').addEventListener('click', () => openAuthModal('register', ctx, values.portal, values))
  popup.querySelector('#popup-verification-form').addEventListener('submit', event => {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get('code').trim()
    if (!/^\d{6}$/.test(code)) {
      event.currentTarget.querySelector('input').setCustomValidity('Enter a 6-digit verification code')
      event.currentTarget.querySelector('input').reportValidity()
      return
    }
    registerPortal(values)

    if (values.portal === 'user') {
      const fullName = values.name || `${values.firstName || ''} ${values.lastName || ''}`.trim() || 'User'
      const firstName = values.firstName || fullName.split(' ')[0] || 'User'
      try {
        register({
          name: fullName,
          email: (values.email || '').trim(),
          mobile: (values.mobile || values.phone || '').trim(),
          password: values.password,
          role: 'patient',
        }).then(reg => {
          if (reg?.token && reg?.user) setSession(reg.token, reg.user)
        }).catch(() => {})
      } catch (_) {}

      localStorage.setItem('tatito-health-user', JSON.stringify({
        name: fullName,
        initials: `${(firstName[0] || 'U')}${(values.lastName?.[0] || '')}`.toUpperCase(),
        email: values.email,
        mobile: values.mobile || values.phone,
        type: 'patient'
      }))
      window.dispatchEvent(new CustomEvent('thp-auth-changed'))
      popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>Welcome, ${firstName}!</h2><p>Your user account is ready. You can now book appointments, access prescriptions, and manage your health records.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
      popup.querySelector('.auth-popup-close').addEventListener('click', close)
      popup.querySelector('[data-close-registration]').addEventListener('click', () => {
        close()
        ctx.navigate('home')
      })
      ctx.showToast('Registration complete. Welcome to Tatito Health+!')
      return
    }

    localStorage.setItem('tatito-health-user', JSON.stringify({
      name: values.name || 'Portal Admin',
      initials: (values.name || 'Portal Admin').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'PA',
      email: values.email || '',
      portal: values.portal,
      type: 'portal'
    }))
    window.dispatchEvent(new CustomEvent('thp-auth-changed'))
    popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>${portal} portal is ready</h2><p>Your details have been verified. You can now use your portal workspace.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
    popup.querySelector('.auth-popup-close').addEventListener('click', close)
    popup.querySelector('[data-close-registration]').addEventListener('click', close)
    ctx.showToast(`${portal} registration verified.`)
  })
}

function showPortalRegistrationSuccess(backdrop, portal, values, close, ctx) {
  const label = portalLabel(portal)
  const orgOrName = values.organisation || values.name || label
  registerPortal({ ...values, portal, name: orgOrName })
  const popup = backdrop.querySelector('.auth-popup')
  popup.innerHTML = `
    <button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button>
    <div class="auth-registration-success">
      <span class="auth-success-icon">${icon('check')}</span>
      <span class="auth-form-kicker">Registration complete</span>
      <h2>${label} portal is ready</h2>
      <p>Your details have been verified and submitted. You can now use your portal workspace.</p>
      <button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button>
    </div>
  `
  popup.querySelector('.auth-popup-close').addEventListener('click', close)
  popup.querySelector('[data-close-registration]').addEventListener('click', () => {
    close()
    ctx.navigate('home')
  })
  ctx.showToast(`${label} registration completed successfully!`)
}

function setBusy(form, busy) {
  const btn = form.querySelector('.auth-submit')
  if (btn) btn.disabled = busy
}

function showFormError(form, message) {
  const box = form.querySelector('.auth-form-error')
  if (!box) return
  box.textContent = message
  box.hidden = false
}

function clearFormError(form) {
  const box = form.querySelector('.auth-form-error')
  if (box) {
    box.textContent = ''
    box.hidden = true
  }
}

function bindRoleToggle(root) {
  const btns = root.querySelectorAll('[data-auth-role]')
  const extra = root.querySelector('#doctor-reg-extra')
  const roleInput = root.querySelector('input[name="role"]')
  const heading = root.querySelector('[data-reg-heading]')
  const sub = root.querySelector('[data-reg-sub]')
  const submit = root.querySelector('[data-reg-submit]')
  const setRoleLabels = (isDoctor) => {
    const accountLabel = isDoctor ? 'Create Doctor Account' : 'Create Patient Account'
    if (heading) heading.textContent = accountLabel
    if (sub) {
      sub.textContent = isDoctor
        ? 'Register as a doctor to create and manage your own public profile.'
        : 'Register as a patient to book appointments and manage your care.'
    }
    if (submit) submit.innerHTML = `${accountLabel} ${icon('arrow')}`
  }
  btns.forEach((btn) =>
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.toggle('is-active', b === btn))
      if (roleInput) roleInput.value = btn.dataset.authRole
      if (extra) extra.hidden = btn.dataset.authRole !== 'doctor'
      setRoleLabels(btn.dataset.authRole === 'doctor')
    }),
  )
}

function bindLoginRoleToggle(root) {
  const btns = root.querySelectorAll('[data-login-role]')
  const kicker = root.querySelector('[data-login-kicker]')
  const heading = root.querySelector('[data-login-heading]')
  const sub = root.querySelector('[data-login-sub]')
  if (!btns.length) return
  btns.forEach((btn) =>
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.toggle('is-active', b === btn))
      const isDoctor = btn.dataset.loginRole === 'doctor'
      if (kicker) kicker.textContent = isDoctor ? 'Doctor access' : 'Patient access'
      if (heading) heading.textContent = isDoctor ? 'Doctor Login' : 'Patient Login'
      if (sub) {
        sub.textContent = isDoctor
          ? 'Use your registered doctor email and password to open your dashboard.'
          : 'Use your registered email and password to continue securely.'
      }
    }),
  )
}

function loginFormMarkup({ idPrefix, heading = 'Patient Login' }) {
  return `
    <div class="auth-form-heading">
      <span class="auth-form-kicker" data-login-kicker>Patient access</span>
      <h2 data-login-heading>${heading}</h2>
      <p data-login-sub>Use your registered email and password to continue securely.</p>
    </div>
    <div class="auth-role-toggle">
      <button type="button" class="auth-role-btn is-active" data-login-role="patient" data-test="login-role-patient">Patient Login</button>
      <button type="button" class="auth-role-btn" data-login-role="doctor" data-test="login-role-doctor">Doctor Login</button>
    </div>
    <form class="auth-form" id="${idPrefix}-login-form">
      <label for="${idPrefix}-email">Email address</label>
      <input class="auth-text-input" id="${idPrefix}-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
      <label for="${idPrefix}-password">Password</label>
      <input class="auth-text-input" id="${idPrefix}-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
      <p class="auth-form-error" hidden></p>
      <button class="button button-primary auth-submit" type="submit">Log in ${icon('arrow')}</button>
    </form>
  `
}

function registerFormMarkup({ idPrefix }) {
  const specs = doctorSpecialties
    .map((s) => `<option value="${s.name}">${s.name}</option>`)
    .join('')
  const cities = doctorCities.map((c) => `<option value="${c}">${c}</option>`).join('')
  return `
    <div class="auth-form-heading">
      <span class="auth-form-kicker">Register</span>
      <h2 data-reg-heading data-test="reg-heading">Create Patient Account</h2>
      <p data-reg-sub data-test="reg-sub">Register as a patient to book appointments and manage your care.</p>
    </div>
    <div class="auth-role-toggle">
      <button type="button" class="auth-role-btn is-active" data-auth-role="patient" data-test="reg-role-patient">Patient</button>
      <button type="button" class="auth-role-btn" data-auth-role="doctor" data-test="reg-role-doctor">Doctor</button>
    </div>
    <form class="auth-form" id="${idPrefix}-register-form">
      <input type="hidden" name="role" value="patient">
      <label for="${idPrefix}-reg-name">Full name</label>
      <input class="auth-text-input" id="${idPrefix}-reg-name" name="name" type="text" autocomplete="name" placeholder="Enter your full name" required>
      <label for="${idPrefix}-reg-email">Email address</label>
      <input class="auth-text-input" id="${idPrefix}-reg-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
      <label for="${idPrefix}-reg-mobile">Mobile number <small>(optional)</small></label>
      <input class="auth-text-input" id="${idPrefix}-reg-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile number" maxlength="10">
      <label for="${idPrefix}-reg-password">Password</label>
      <input class="auth-text-input" id="${idPrefix}-reg-password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8" required>
      <div class="auth-auth-doctor-extra" id="doctor-reg-extra" hidden>
        <label for="${idPrefix}-reg-specialty">Primary specialty</label>
        <select class="auth-text-input" id="${idPrefix}-reg-specialty" name="specialty">
          <option value="">Select specialty</option>${specs}
        </select>
        <label for="${idPrefix}-reg-city">Practice city</label>
        <select class="auth-text-input" id="${idPrefix}-reg-city" name="city">
          <option value="">Select city</option>${cities}
        </select>
        <label for="${idPrefix}-reg-docid">Link an existing Tatito profile <small>(optional)</small></label>
        <input class="auth-text-input" id="${idPrefix}-reg-docid" name="doctorId" type="text" placeholder="e.g. d1, d2, d3">
        <p class="auth-form-hint">Leave blank to create a brand-new doctor profile.</p>
      </div>
      <p class="auth-form-error" hidden></p>
      <button class="button button-primary auth-submit" type="submit" data-reg-submit data-test="reg-submit">Create Patient Account ${icon('arrow')}</button>
    </form>
  `
}

async function submitLogin(form, ctx, close) {
  const values = Object.fromEntries(new FormData(form))
  setBusy(form, true)
  clearFormError(form)
  try {
    const { token, user } = await login(values.email.trim(), values.password)
    const { resumed } = setSession(token, user)
    close()
    ctx.showToast(`Welcome back, ${user.name.split(' ')[0]}.`)
    // Route by the ACTUAL authenticated role, never by the toggle a user
    // picked. A patient who picked "Doctor Login" still lands on the patient
    // experience; a real doctor always goes to the doctor dashboard.
    if (!resumed && user.role === 'doctor' && ctx.navigate) {
      ctx.navigate('doctor-dashboard')
    } else if (!resumed && !ctx.isModal && ctx.navigate) {
      ctx.navigate('home')
    }
  } catch (err) {
    if (err.name === 'TypeError' || String(err.message).includes('Failed to fetch') || String(err.message).includes('NetworkError')) {
      const email = values.email.trim()
      const isDoctorRole = form.querySelector('[data-login-role="doctor"]')?.classList.contains('is-active')
      const name = email.split('@')[0] || 'User'
      const user = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        role: isDoctorRole ? 'doctor' : 'patient'
      }
      setSession('offline-token-' + Date.now(), user)
      close()
      ctx.showToast(`Welcome back, ${user.name}.`)
      if (user.role === 'doctor' && ctx.navigate) ctx.navigate('doctor-dashboard')
      else if (!ctx.isModal && ctx.navigate) ctx.navigate('home')
      return
    }
    showFormError(form, err.message || 'Unable to log in.')
  } finally {
    setBusy(form, false)
  }
}

async function submitRegister(form, ctx, close) {
  const values = Object.fromEntries(new FormData(form))
  const payload = {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password,
    role: values.role === 'doctor' ? 'doctor' : 'patient',
  }
  if (payload.role === 'patient') {
    if (values.mobile) payload.mobile = values.mobile.trim()
  } else {
    if (values.specialty) payload.specialty = values.specialty
    if (values.city) payload.city = values.city
    if (values.doctorId && values.doctorId.trim()) payload.doctorId = values.doctorId.trim()
  }
  setBusy(form, true)
  clearFormError(form)
  try {
    const { token, user } = await register(payload)
    const { resumed } = setSession(token, user)
    close()
    ctx.showToast(`Account created. Welcome, ${user.name.split(' ')[0]}!`)
    if (!resumed && user.role === 'doctor' && ctx.navigate) {
      ctx.navigate('doctor-dashboard')
    } else if (!resumed && !ctx.isModal && ctx.navigate) {
      ctx.navigate('home')
    }
  } catch (err) {
    showFormError(form, err.message || 'Unable to create account.')
  } finally {
    setBusy(form, false)
  }
}

function authShell(content, active, ctx) {
  return `<main class="auth-page"><div class="auth-page-top"><a class="brand" data-nav="home"><span class="brand-mark">${icon('heart')}</span><span><strong>Tatito</strong><em>Health+</em></span></a><span class="auth-page-status">${icon('shield')} Private & secure</span></div><section class="auth-form-card">${content}<div class="auth-switch">${active === 'login' ? 'New to Tatito?' : 'Already have an account?'} <button data-nav="${active === 'login' ? 'register' : 'login'}">${active === 'login' ? 'Register now' : 'Log in'}</button></div></section><p class="auth-page-footer">By continuing, you agree to Tatito Health+ terms and privacy policy.</p></main>`
}

function bindAuthNav(root, ctx) {
  root.querySelectorAll('[data-nav]').forEach((el) =>
    el.addEventListener('click', (event) => {
      event.preventDefault()
      ctx.navigate(el.dataset.nav)
    }),
  )
}

export function openAuthModal(mode = 'login', ctx, defaultPortal = null, initialValues = {}) {
  const existing = document.querySelector('.auth-popup-backdrop')
  if (existing) existing.remove()
  const modalCtx = { ...(ctx || {}), isModal: true }
  const isPortalLogin = mode === 'portal-login'
  const isRegister = mode === 'register'
  const isLogin = !isRegister

  const content = isRegister
    ? `<div class="auth-form-heading"><div class="auth-register-stepper"><span class="is-active">1 <small>Choose portal</small></span><i></i><span>2 <small>Verify details</small></span></div><span class="auth-form-kicker">Partner access</span><h2>Register your portal</h2><p>Choose your portal first, then tell us about yourself.</p></div><form class="auth-form" id="popup-register-form" data-stage="details" autocomplete="off"><label>Choose portal type</label><div class="portal-category-grid">${portalOptions.map(option => `<label class="portal-category-card" data-portal="${option.value}"><input type="radio" name="portal" value="${option.value}" required><span class="portal-category-icon">${icon(option.icon)}</span><span><strong>${option.label}</strong><small>${option.detail}</small></span></label>`).join('')}</div><div class="auth-register-fields">${registrationFieldsMarkup('hospital')}</div><div class="auth-stage-actions"><button class="auth-stage-back" type="button" data-portal-back>${icon('chevron')} Portals</button><button class="button button-primary auth-submit" type="submit">Continue to next stage ${icon('arrow')}</button></div></form><div class="auth-switch">Already have a portal account? <button type="button" data-popup-mode="portal-login">Log in</button></div>`
    : isPortalLogin
      ? `<button class="auth-popup-back" type="button" data-popup-mode="login">${icon('chevron')} Patient login</button><div class="auth-form-heading"><span class="auth-form-kicker">Partner access</span><h2>Log in to your portal</h2><p>Use your work email to access your workspace.</p></div><form class="auth-form" id="popup-portal-login-form"><label for="popup-portal-email">Work email</label><input class="auth-text-input" id="popup-portal-email" name="email" type="email" autocomplete="email" placeholder="name@organisation.com" required><label for="popup-portal-password">Password</label><div class="auth-password-wrapper"><input class="auth-text-input auth-password-input" id="popup-portal-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" class="auth-password-toggle" data-toggle-target="popup-portal-password" aria-label="Show password" title="Show password" tabindex="-1">${icon('eye')}</button></div><button class="button button-primary auth-submit" type="submit">Log in to portal ${icon('arrow')}</button></form>`
      : `<div class="auth-popup-grid"><aside class="auth-popup-visual"><span class="auth-popup-brand">${icon('heart')} Tatito Health+</span><div class="auth-heartbeat"><svg viewBox="0 0 500 120" aria-hidden="true"><path class="auth-heartbeat-track" d="M0 60h110l18-1 15-45 20 90 20-44 18 0h52l18-1 15-45 20 90 20-44 18 0h110"/><path class="auth-heartbeat-line" d="M0 60h110l18-1 15-45 20 90 20-44 18 0h52l18-1 15-45 20 90 20-44 18 0h110"/></svg></div><div class="auth-visual-copy"><span>Care, connected</span><h3>Keep your health<br>moving forward.</h3><p>Secure access to the care that follows you.</p></div><span class="auth-visual-security">${icon('shield')} Protected healthcare access</span></aside><div class="auth-popup-form">${loginFormMarkup({ idPrefix: 'popup' })}<div class="auth-popup-links"><button type="button" data-popup-mode="register">${icon('user')} New patient? Register here</button><button type="button" data-popup-mode="portal-login">Portal / partner login</button></div></div></div>`

  const backdrop = document.createElement('div')
  backdrop.className = 'auth-popup-backdrop'
  backdrop.innerHTML = `<section class="auth-popup ${isLogin ? 'auth-popup-login' : 'auth-popup-register'}" role="dialog" aria-modal="true" aria-label="${isRegister ? 'Registration' : 'Login'}"><button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button>${content}</section>`
  document.body.appendChild(backdrop)
  const close = () => {
    clearPendingAction()
    backdrop.remove()
  }

  backdrop.querySelector('.auth-popup-close').addEventListener('click', close)
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close()
    const backBtn = event.target.closest('[data-portal-back]')
    if (backBtn && !event.defaultPrevented) {
      event.preventDefault()
      openAuthModal('register', ctx)
    }
  })
  backdrop.querySelectorAll('[data-popup-mode]').forEach((button) =>
    button.addEventListener('click', () =>
      openAuthModal(button.dataset.popupMode, modalCtx),
    ),
  )

  if (isRegister) {
  backdrop.querySelectorAll('.portal-category-card').forEach(card => card.addEventListener('click', () => {
    const registerPopup = backdrop.querySelector('.auth-popup-register')
    registerPopup.classList.add('register-details-open')
    registerPopup.scrollTop = 0
    card.querySelector('input').checked = true
    const form = backdrop.querySelector('#popup-register-form')
    if (card.dataset.portal === 'user') {
      form.dataset.portal = 'user'
      registerPopup.querySelector('.auth-register-stepper').style.display = 'flex'
      registerPopup.querySelector('.auth-register-stepper').innerHTML = '<span class="is-active">1 <small>Details</small></span><i></i><span>2 <small>Verify</small></span>'
      registerPopup.querySelector('form > label').style.display = 'none'
      registerPopup.querySelector('.auth-form-heading h2').textContent = 'User Registration'
      registerPopup.querySelector('.auth-form-heading p').textContent = 'Find the best healthcare assistance for your needs.'
      form.innerHTML = userRegistrationMarkup(form._userValues || initialValues || {})

      form.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', () => {
          const file = input.files?.[0]
          const labelSpan = input.closest('.doctor-upload-field')?.querySelector('.upload-btn-label')
          if (file && labelSpan) {
            labelSpan.textContent = file.name
            labelSpan.title = file.name
          }
        })
      })

      const userPhoneCode = form.querySelector('#user-phone-country-code')
      const userMobile = form.querySelector('#user-mobile')
      const userPhoneHint = form.querySelector('#user-phone-hint')
      if (userPhoneCode && userMobile) {
        const updateUserPhoneConstraint = () => {
          const opt = userPhoneCode.options[userPhoneCode.selectedIndex]
          const digits = parseInt(opt?.getAttribute('data-digits') || '10', 10)
          const name = opt?.getAttribute('data-name') || 'selected country'
          userMobile.maxLength = digits
          userMobile.placeholder = `${digits}-digit mobile number`
          userMobile.pattern = `[0-9]{${digits}}`
          if (userPhoneHint) userPhoneHint.textContent = `Enter ${digits} digits for ${name}`
          if (userMobile.value.length > digits) userMobile.value = userMobile.value.slice(0, digits)
        }
        userPhoneCode.addEventListener('change', () => {
          updateUserPhoneConstraint()
          userMobile.focus()
        })
        userMobile.addEventListener('input', () => {
          userMobile.value = userMobile.value.replace(/\D/g, '')
          const opt = userPhoneCode.options[userPhoneCode.selectedIndex]
          const digits = parseInt(opt?.getAttribute('data-digits') || '10', 10)
          if (userMobile.value.length > digits) userMobile.value = userMobile.value.slice(0, digits)
        })
        updateUserPhoneConstraint()
      }

      form.querySelector('[data-user-back]')?.addEventListener('click', () => {
        openAuthModal('register', modalCtx)
      })

      form.querySelector('[data-user-signin]')?.addEventListener('click', (e) => {
        e.preventDefault()
        openAuthModal('login', modalCtx)
      })
      return
    }
    registerPopup.querySelector('.auth-register-stepper').style.display = 'flex'
    if (card.dataset.portal === 'doctor') {
      form.dataset.portal = 'doctor'
      form._doctorValues = { portal: 'doctor' }
      registerPopup.querySelector('.auth-register-stepper').innerHTML = doctorStepperMarkup(0)
      registerPopup.querySelector('form > label').style.display = 'none'
      setDoctorStage(registerPopup, form, 'personal', form._doctorValues, modalCtx)
      return
    }
    if (card.dataset.portal === 'diagnostic') {
      setDiagnosticStage(registerPopup, form, 1, form._diagnosticValues || {}, ctx)
      return
    }
    if (card.dataset.portal === 'clinic') {
      setClinicStage(registerPopup, form, 1, form._clinicValues || {}, ctx)
      return
    }
    if (card.dataset.portal === 'hospital') {
      setHospitalStage(registerPopup, form, 1, form._hospitalValues || {}, ctx)
      return
    }
    if (card.dataset.portal === 'pharmacy') {
      setPharmacyStage(registerPopup, form, 1, form._pharmacyValues || {}, ctx)
      return
    }
    backdrop.querySelector('.auth-register-fields').innerHTML = registrationFieldsMarkup(card.dataset.portal)
    registerPopup.querySelector('.auth-form-heading h2').textContent = `${portalLabel(card.dataset.portal)} registration details`
    registerPopup.querySelector('.auth-form-heading p').textContent = 'Add the details needed to verify your portal account.'
    registerPopup.querySelector('.auth-register-stepper span:first-child').classList.replace('is-active', 'is-complete')
    registerPopup.querySelector('.auth-register-stepper span:last-child').classList.add('is-active')
  }))
  } else if (!isPortalLogin) {
    bindLoginRoleToggle(backdrop)
  }

  if (!isLogin && defaultPortal) {
    const targetCard = backdrop.querySelector(`.portal-category-card[data-portal="${defaultPortal}"]`)
    if (targetCard) {
      const form = backdrop.querySelector('#popup-register-form')
      if (defaultPortal === 'diagnostic' && initialValues && Object.keys(initialValues).length > 0 && form) {
        form._diagnosticValues = initialValues
      }
      if (defaultPortal === 'clinic' && initialValues && Object.keys(initialValues).length > 0 && form) {
        form._clinicValues = initialValues
      }
      if (defaultPortal === 'hospital' && initialValues && Object.keys(initialValues).length > 0 && form) {
        form._hospitalValues = initialValues
      }
      if (defaultPortal === 'pharmacy' && initialValues && Object.keys(initialValues).length > 0 && form) {
        form._pharmacyValues = initialValues
      }
      if (defaultPortal === 'user' && initialValues && Object.keys(initialValues).length > 0 && form) {
        form._userValues = initialValues
      }
      targetCard.click()
    }
  }

  const form = backdrop.querySelector('form')

  // Live input listener to dynamically clear customValidity and check password rules & matching
  form.addEventListener('input', event => {
    const target = event.target
    if (target.name === 'password' || target.name === 'confirmPassword') {
      const passInput = form.querySelector('input[name="password"]')
      const confirmInput = form.querySelector('input[name="confirmPassword"]')
      if (!passInput) return

      // Always clear previous custom validity first so valid inputs never stay blocked
      passInput.setCustomValidity('')
      if (confirmInput) confirmInput.setCustomValidity('')

      // Validate rules on password
      if (passInput.value) {
        const passErr = validatePasswordRules(passInput.value)
        if (passErr) {
          passInput.setCustomValidity(passErr)
        }
      }

      // Validate matching on confirmPassword
      if (confirmInput && confirmInput.value) {
        if (confirmInput.value !== passInput.value) {
          confirmInput.setCustomValidity('Passwords do not match')
        }
      }
    }
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form))
    if (mode === 'login') {
      submitLogin(form, modalCtx, close)
    } else if (isPortalLogin) {
      localStorage.setItem(
        'tatito-health-user',
        JSON.stringify({
          name: 'Portal Admin',
          initials: 'PA',
          email: values.email,
          type: 'portal',
        }),
      )
      window.dispatchEvent(new CustomEvent('thp-auth-changed'))
      close()
      modalCtx.showToast?.('Portal login successful.')
      if (modalCtx.navigate) modalCtx.navigate('home')
    } else if (!isPortalLogin && form.dataset.portal === 'user') {
      const passInput = form.querySelector('input[name="password"]')
      const confirmInput = form.querySelector('input[name="confirmPassword"]')
      if (passInput) passInput.setCustomValidity('')
      if (confirmInput) confirmInput.setCustomValidity('')

      const passErr = validatePasswordRules(values.password || '')
      if (passErr && passInput) {
        passInput.setCustomValidity(passErr)
        passInput.reportValidity()
        return
      }
      if (values.password !== values.confirmPassword && confirmInput) {
        confirmInput.setCustomValidity('Passwords do not match')
        confirmInput.reportValidity()
        return
      }
      const userPhoneCode = values.phoneCountryCode || '+91'
      const userExpectedDigits = getCountryDigits(userPhoneCode)
      const userCountry = getCountryByCode(userPhoneCode)
      const userRawPhone = (values.mobile || '').replace(/\D/g, '')
      if (userRawPhone.length !== userExpectedDigits) {
        form.querySelector('input[name="mobile"]').setCustomValidity(`Enter a valid ${userExpectedDigits}-digit mobile number for ${userCountry.name}`)
        form.querySelector('input[name="mobile"]').reportValidity()
        return
      }
      form.querySelectorAll('input[type="file"]').forEach(inp => inp.setCustomValidity(''))

      const idProofInput = form.querySelector('#user-idProof')
      const photoInput = form.querySelector('#user-profilePhoto')
      const idProofFile = idProofInput?.files?.[0] || form._userValues?.idProof
      const photoFile = photoInput?.files?.[0] || form._userValues?.profilePhoto

      if (!idProofFile) {
        ctx.showToast('Please upload your ID Proof.')
        return
      }
      if (!photoFile) {
        ctx.showToast('Please upload your Profile Photo.')
        return
      }
      const maxFileSize = 10 * 1024 * 1024
      const oversizedFile = [idProofFile, photoFile].find(file => file instanceof File && file.size > maxFileSize)
      if (oversizedFile) {
        ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please choose a file smaller than 10MB.`)
        return
      }

      form._userValues = {
        ...values,
        portal: 'user',
        name: `${values.firstName || ''} ${values.lastName || ''}`.trim(),
        idProof: idProofFile,
        profilePhoto: photoFile
      }

      renderRegistrationVerification(backdrop, ctx, {
        ...values,
        portal: 'user',
        name: `${values.firstName || ''} ${values.lastName || ''}`.trim(),
        idProof: idProofFile,
        profilePhoto: photoFile
      }, close)
    } else if (!isPortalLogin && form.dataset.portal === 'doctor') {
      ['idProof', 'profilePhoto', 'degreeCert', 'enrollmentCert'].forEach(fn => {
        if (values[fn] && values[fn] instanceof File && !values[fn].name) {
          if (form._doctorValues?.[fn] && form._doctorValues[fn] instanceof File && form._doctorValues[fn].name) {
            values[fn] = form._doctorValues[fn]
          } else {
            delete values[fn]
            if (form._doctorValues) delete form._doctorValues[fn]
          }
        }
      })
      form._doctorValues = { ...form._doctorValues, ...values }
      const stage = form.dataset.stage
      if (stage === 'personal') {
        const phoneCode = values.phoneCountryCode || form._doctorValues?.phoneCountryCode || '+91'
        const expectedDigits = getCountryDigits(phoneCode)
        const countryObj = getCountryByCode(phoneCode)
        const rawPhone = String(values.phone || form._doctorValues?.phone || '').replace(/\D/g, '')

        if (rawPhone.length !== expectedDigits) {
          const pInput = form.querySelector('#doctor-phone')
          if (pInput) {
            pInput.setCustomValidity(`Please enter exactly ${expectedDigits} digits for ${countryObj.name}`)
            pInput.reportValidity()
            pInput.focus()
            pInput.classList.remove('shake-highlight')
            void pInput.offsetWidth
            pInput.classList.add('shake-highlight')
          }
          ctx.showToast(`Please enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name} (${phoneCode}).`)
          return
        }

        const passInput = form.querySelector('input[name="password"]')
        const confirmInput = form.querySelector('input[name="confirmPassword"]')
        if (passInput) passInput.setCustomValidity('')
        if (confirmInput) confirmInput.setCustomValidity('')

        const passErr = validatePasswordRules(values.password || '')
        if (passErr && passInput) {
          passInput.setCustomValidity(passErr)
          passInput.reportValidity()
          return
        }
        if (values.password !== values.confirmPassword && confirmInput) {
          confirmInput.setCustomValidity('Passwords do not match')
          confirmInput.reportValidity()
          return
        }
      }
      if (stage === 'personal') {
        form.querySelectorAll('input[type="file"]').forEach(inp => inp.setCustomValidity(''))
        const maxFileSize = 10 * 1024 * 1024
        const oversizedFile = ['idProof', 'profilePhoto'].map(name => values[name]).find(file => file instanceof File && file.size > maxFileSize)
        if (oversizedFile) {
          ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please choose a file smaller than 10MB.`)
          return
        }
      }
      if (stage === 'verification' && !/^\d{6}$/.test(values.code || '')) {
        form.querySelector('input[name="code"]').setCustomValidity('Enter a 6-digit verification code')
        form.querySelector('input[name="code"]').reportValidity()
        return
      }
      if (stage === 'education') {
        if (values.degree === 'Other UG' || values.degree === 'Other PG') {
          const dOtherInput = form.querySelector('#doctor-degree-other')
          const dVal = values.degreeOther?.trim()
          if (!dVal) {
            dOtherInput?.setCustomValidity('Please specify your degree name')
            dOtherInput?.reportValidity()
            dOtherInput?.focus()
            modalCtx.showToast('Please enter your degree details.')
            return
          }
          dOtherInput?.setCustomValidity('')
          values.displayDegree = `${values.degree} (${dVal})`
        } else {
          values.displayDegree = values.degree
        }

        if (!values.university) {
          form.querySelector('#doctor-university-search')?.setCustomValidity('Please select a university from the list')
          form.querySelector('#doctor-university-search')?.reportValidity()
          return
        }
        if (values.university === 'Other') {
          const uOtherInput = form.querySelector('#doctor-university-other')
          const uVal = values.universityOther?.trim()
          if (!uVal) {
            uOtherInput?.setCustomValidity('Please specify your university name')
            uOtherInput?.reportValidity()
            uOtherInput?.focus()
            modalCtx.showToast('Please enter your university details.')
            return
          }
          uOtherInput?.setCustomValidity('')
          values.displayUniversity = `Other (${uVal})`
        } else {
          values.displayUniversity = values.university
        }

        if (values.college === 'Other') {
          const cOtherInput = form.querySelector('#doctor-college-other')
          const cVal = values.collegeOther?.trim()
          if (!cVal) {
            cOtherInput?.setCustomValidity('Please specify your college name')
            cOtherInput?.reportValidity()
            cOtherInput?.focus()
            modalCtx.showToast('Please enter your college details.')
            return
          }
          cOtherInput?.setCustomValidity('')
          values.displayCollege = `Other (${cVal})`
        } else {
          values.displayCollege = values.college
        }

        // Degree certificate is optional; validate size only if provided
        if (values.degreeCert && values.degreeCert instanceof File && !values.degreeCert.name) {
          delete values.degreeCert
          if (form._doctorValues) delete form._doctorValues.degreeCert
        }
        const degreeCertFile = values.degreeCert || form._doctorValues?.degreeCert
        if (degreeCertFile instanceof File && degreeCertFile.name && degreeCertFile.size > 10 * 1024 * 1024) {
          ctx.showToast('Degree certificate file must be smaller than 10MB.')
          return
        }

        // Hall ticket / enrollment certificate is required
        const enrollCertFile = values.enrollmentCert || form._doctorValues?.enrollmentCert
        if (!enrollCertFile || (enrollCertFile instanceof File && !enrollCertFile.name)) {
          ctx.showToast('Please upload your registration no., hall ticket or enrollment certificate.')
          return
        }
        if (enrollCertFile instanceof File && enrollCertFile.size > 10 * 1024 * 1024) {
          ctx.showToast('Registration no. / hall ticket / enrollment certificate file must be smaller than 10MB.')
          return
        }

        if (values.practiceType === 'Other') {
          const ptOtherInput = form.querySelector('#doctor-practiceType-other')
          const ptVal = values.practiceTypeOther?.trim()
          if (!ptVal) {
            ptOtherInput?.setCustomValidity('Please specify your practice type')
            ptOtherInput?.reportValidity()
            ptOtherInput?.focus()
            modalCtx.showToast('Please enter your practice type details.')
            return
          }
          ptOtherInput?.setCustomValidity('')
          values.displayPracticeType = `Other (${ptVal})`
          values.practiceType = `Other (${ptVal})`
        } else {
          values.displayPracticeType = values.practiceType
        }

        if (values.workType === 'Other') {
          const wtOtherInput = form.querySelector('#doctor-workType-other')
          const wtVal = values.workTypeOther?.trim()
          if (!wtVal) {
            wtOtherInput?.setCustomValidity('Please specify your work type')
            wtOtherInput?.reportValidity()
            wtOtherInput?.focus()
            modalCtx.showToast('Please enter your work type details.')
            return
          }
          wtOtherInput?.setCustomValidity('')
          values.displayWorkType = `Other (${wtVal})`
          values.workType = `Other (${wtVal})`
        } else {
          values.displayWorkType = values.workType
        }

        if (!values.positionRole) {
          const posSel = form.querySelector('#doctor-positionRole')
          posSel?.setCustomValidity('Please select your position/role')
          posSel?.reportValidity()
          posSel?.focus()
          ctx.showToast('Please select your position/role.')
          return
        }

        if (values.positionRole === 'Other') {
          const posOtherInput = form.querySelector('#doctor-positionRole-other')
          const posVal = values.positionRoleOther?.trim()
          if (!posVal) {
            posOtherInput?.setCustomValidity('Please specify your position/role')
            posOtherInput?.reportValidity()
            posOtherInput?.focus()
            ctx.showToast('Please enter your position/role details.')
            return
          }
          posOtherInput?.setCustomValidity('')
          values.displayPositionRole = `Other (${posVal})`
          values.positionRole = `Other (${posVal})`
        } else {
          values.displayPositionRole = values.positionRole
        }

        const prim = form.querySelector('#hidden-primarySpecialization')?.value.trim()
        if (!prim) {
          const sel = form.querySelector('#select-primarySpecialization')
          sel?.setCustomValidity('Please select at least one primary specialization')
          sel?.reportValidity()
          modalCtx.showToast('Please select at least one primary specialization.')
          return
        }
        const quals = form.querySelector('#hidden-medicalQualifications')?.value.trim()
        if (!quals) {
          const sel = form.querySelector('#select-medicalQualifications')
          sel?.setCustomValidity('Please select at least one qualification')
          sel?.reportValidity()
          modalCtx.showToast('Please select at least one medical qualification.')
          return
        }
        const langs = form.querySelector('#hidden-languagesKnown')?.value.trim()
        if (!langs) {
          const sel = form.querySelector('#select-languagesKnown')
          sel?.setCustomValidity('Please select at least one language')
          sel?.reportValidity()
          modalCtx.showToast('Please select at least one language.')
          return
        }

        values.license = values.medicalRegNo || values.license || ''
        values.specialty = prim
      }
      if (stage === 'location') {
        const formData = new FormData(form)
        const modes = formData.getAll('consultationMode')
        if (modes.length === 0) {
          modalCtx.showToast('Please select at least one consultation mode.')
          return
        }
        const isBoth = modes.includes('Both')
        let days = []
        let onlineDays = []
        let offlineDays = []

        if (isBoth) {
          onlineDays = formData.getAll('onlineAvailableDays')
          offlineDays = formData.getAll('offlineAvailableDays')
          if (onlineDays.length === 0) {
            ctx.showToast('Please select at least one online available day.')
            return
          }
          if (offlineDays.length === 0) {
            ctx.showToast('Please select at least one offline available day.')
            return
          }
          values.onlineAvailableDays = onlineDays.join(', ')
          values.offlineAvailableDays = offlineDays.join(', ')
          values.availableDays = `Online: ${onlineDays.join(', ')} | Offline: ${offlineDays.join(', ')}`
        } else {
          days = formData.getAll('availableDays')
          if (days.length === 0) {
            ctx.showToast('Please select at least one available day.')
            return
          }
          values.availableDays = days.join(', ')
          values.onlineAvailableDays = ''
          values.offlineAvailableDays = ''
        }
        if (!values.currentState) {
          form.querySelector('#doctor-currentState')?.setCustomValidity('Please select a state')
          form.querySelector('#doctor-currentState')?.reportValidity()
          return
        }
        if (!values.currentDistrict) {
          form.querySelector('#doctor-currentDistrict')?.setCustomValidity('Please select a district')
          form.querySelector('#doctor-currentDistrict')?.reportValidity()
          return
        }
        if (!values.currentCity) {
          form.querySelector('#doctor-currentCity')?.setCustomValidity('Please select a city or town')
          form.querySelector('#doctor-currentCity')?.reportValidity()
          return
        }
        if (values.currentCity === 'Other') {
          const cOtherInput = form.querySelector('#doctor-currentCity-other')
          const cVal = values.currentCityOther?.trim()
          if (!cVal) {
            cOtherInput?.setCustomValidity('Please specify your city or town name')
            cOtherInput?.reportValidity()
            cOtherInput?.focus()
            ctx.showToast('Please enter your city or town name.')
            return
          }
          cOtherInput?.setCustomValidity('')
          values.displayCurrentCity = `Other (${cVal})`
        } else {
          values.displayCurrentCity = values.currentCity
        }

        const sameAsCurrent = Boolean(form.querySelector('#doctor-sameAsCurrent')?.checked)
        if (!sameAsCurrent && !values.permState) {
          form.querySelector('#doctor-permState')?.setCustomValidity('Please select a state')
          form.querySelector('#doctor-permState')?.reportValidity()
          return
        }
        if (!sameAsCurrent && !values.permDistrict) {
          form.querySelector('#doctor-permDistrict')?.setCustomValidity('Please select a district')
          form.querySelector('#doctor-permDistrict')?.reportValidity()
          return
        }
        if (!sameAsCurrent && !values.permCity) {
          form.querySelector('#doctor-permCity')?.setCustomValidity('Please select a city or town')
          form.querySelector('#doctor-permCity')?.reportValidity()
          return
        }
        if (!sameAsCurrent && values.permCity === 'Other') {
          const cOtherInput = form.querySelector('#doctor-permCity-other')
          const cVal = values.permCityOther?.trim()
          if (!cVal) {
            cOtherInput?.setCustomValidity('Please specify your permanent city or town name')
            cOtherInput?.reportValidity()
            cOtherInput?.focus()
            ctx.showToast('Please enter your permanent city or town name.')
            return
          }
          cOtherInput?.setCustomValidity('')
          values.displayPermCity = `Other (${cVal})`
        } else if (!sameAsCurrent) {
          values.displayPermCity = values.permCity
        }

        if (!/^\d{6}$/.test(values.currentPincode || '')) {
          form.querySelector('input[name="currentPincode"]')?.setCustomValidity('Enter a valid 6-digit pincode')
          form.querySelector('input[name="currentPincode"]')?.reportValidity()
          return
        }
        if (!sameAsCurrent && !/^\d{6}$/.test(values.permPincode || '')) {
          form.querySelector('input[name="permPincode"]')?.setCustomValidity('Enter a valid 6-digit pincode')
          form.querySelector('input[name="permPincode"]')?.reportValidity()
          return
        }

        if (modes.includes('Both')) {
          if (!values.onlineWorkingHoursFrom || !values.onlineWorkingHoursTo) {
            ctx.showToast('Please specify online working hours.')
            return
          }
          if (!values.offlineWorkingHoursFrom || !values.offlineWorkingHoursTo) {
            ctx.showToast('Please specify offline working hours.')
            return
          }
        } else {
          if (!values.workingHoursFrom || !values.workingHoursTo) {
            ctx.showToast('Please specify working hours.')
            return
          }
        }

        values.consultationMode = modes.join(', ')
        values.sameAsCurrent = sameAsCurrent
        if (sameAsCurrent) {
          values.permAddress = values.currentAddress
          values.permState = values.currentState
          values.permDistrict = values.currentDistrict
          values.permCity = values.currentCity
          values.permCityOther = values.currentCityOther
          values.displayPermCity = values.displayCurrentCity
          values.permPincode = values.currentPincode
        }
        values.city = (values.currentCity === 'Other' && values.currentCityOther) ? values.currentCityOther : (values.currentCity || values.city || '')
        values.address = values.currentAddress || values.address || ''
      }
      form._doctorValues = { ...form._doctorValues, ...values }
      if (stage === 'education') {
        const isVerified = Boolean(values.isRegistrationVerified || form._doctorValues?.isRegistrationVerified)
        if (!isVerified) {
          ctx.showToast('Please verify your registration number by clicking "Check" before proceeding.')
          const checkBtn = form.querySelector('#btn-check-enrollment')
          checkBtn?.focus()
          checkBtn?.classList.remove('shake-highlight')
          void checkBtn?.offsetWidth
          checkBtn?.classList.add('shake-highlight')
          return
        }
      }
      if (stage === 'review') {
        const hasSig = Boolean(values.digitalSignature || form._doctorValues?.digitalSignature)
        if (!hasSig) {
          ctx.showToast('Please draw your digital signature before submitting.')
          const sigWrapper = form.querySelector('#doctor-signature-canvas-wrapper')
          sigWrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          sigWrapper?.classList.remove('shake-highlight')
          void sigWrapper?.offsetWidth
          sigWrapper?.classList.add('shake-highlight')
          return
        }
        const termCheckboxes = form.querySelectorAll('.doctor-term-checkbox')
        const allChecked = termCheckboxes.length === 4 && Array.from(termCheckboxes).every(cb => cb.checked)
        if (!allChecked) {
          ctx.showToast('Please accept all 4 terms and conditions before submitting.')
          const termsCard = form.querySelector('#doctor-terms-card')
          termsCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          termsCard?.classList.remove('shake-highlight')
          void termsCard?.offsetWidth
          termsCard?.classList.add('shake-highlight')
          return
        }
      }
      const nextStage = doctorStageKeys[doctorStageIndex(stage) + 1]
      if (nextStage) {
        setDoctorStage(backdrop.querySelector('.auth-popup-register'), form, nextStage, form._doctorValues, modalCtx)
        return
      }
      setBusy(form, true)
      clearFormError(form)
      try {
        const dv = form._doctorValues || {}
        try {
          const reg = await register({
            name: `${dv.firstName || ''} ${dv.lastName || ''}`.trim(),
            email: (dv.email || '').trim(),
            mobile: String(dv.phone || dv.mobile || '').trim(),
            password: dv.password || '',
            role: 'doctor',
            specialty: dv.specialty || (dv.primarySpecialization || '').split(',')[0]?.trim() || '',
            city: dv.city || dv.currentCity || '',
          })
          if (reg?.token && reg?.user) setSession(reg.token, reg.user)
        } catch (_) {}
        registerPortal({ ...dv, name: `${dv.firstName || ''} ${dv.lastName || ''}`.trim() })
        const popup = backdrop.querySelector('.auth-popup')
        popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>Doctor portal is ready</h2><p>Your profile has been submitted and verified. You can now use your doctor workspace.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
        popup.querySelector('.auth-popup-close').addEventListener('click', close)
        popup.querySelector('[data-close-registration]').addEventListener('click', () => {
          close()
          if (modalCtx.navigate) modalCtx.navigate('doctor-dashboard')
        })
        modalCtx.showToast?.('Doctor registration verified.')
      } catch (err) {
        modalCtx.showToast?.(err.message || 'Unable to create account.')
      } finally {
        setBusy(form, false)
      }
    } else if (!isPortalLogin && form.dataset.portal === 'diagnostic') {
      const currentStage = parseInt(form.dataset.stage || '1', 10)
      if (currentStage === 1) {
        const passInput = form.querySelector('#diagnostic-password')
        const confirmInput = form.querySelector('#diagnostic-confirmPassword')
        if (passInput) passInput.setCustomValidity('')
        if (confirmInput) confirmInput.setCustomValidity('')

        const passErr = validatePasswordRules(values.password || '')
        if (passErr && passInput) {
          passInput.setCustomValidity(passErr)
          passInput.reportValidity()
          return
        }
        if (values.password !== values.confirmPassword && confirmInput) {
          confirmInput.setCustomValidity('Passwords do not match')
          confirmInput.reportValidity()
          return
        }

        const phoneCode = values.phoneCountryCode || '+91'
        const expectedDigits = getCountryDigits(phoneCode)
        const countryObj = getCountryByCode(phoneCode)
        const rawPhone = String(values.phone || values.mobile || '').replace(/\D/g, '')

        if (rawPhone.length !== expectedDigits) {
          const pInput = form.querySelector('#diagnostic-phone')
          if (pInput) {
            pInput.setCustomValidity(`Enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name}`)
            pInput.reportValidity()
          } else {
            ctx.showToast(`Please enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name} (${phoneCode}).`)
          }
          return
        }

        const logoInput = form.querySelector('#diagnostic-logo')
        const licenseInput = form.querySelector('#diagnostic-license')
        const photoInput = form.querySelector('#diagnostic-photo')
        const logoFile = logoInput?.files?.[0]
        const licenseFile = licenseInput?.files?.[0]
        const photoFile = photoInput?.files?.[0]

        if (!photoFile && !form._diagnosticValues?.profilePhoto) {
          ctx.showToast('Please upload your Profile Photo.')
          return
        }
        if (!logoFile && !form._diagnosticValues?.logo) {
          ctx.showToast('Please upload the Diagnostic Centre Logo.')
          return
        }
        if (!licenseFile && !form._diagnosticValues?.licenseCertificate) {
          ctx.showToast('Please upload the License Certificate.')
          return
        }

        const oversizedFile = [logoFile, licenseFile, photoFile].find(file => file instanceof File && file.size > 10 * 1024 * 1024)
        if (oversizedFile) {
          ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }

        form._diagnosticValues = {
          ...form._diagnosticValues,
          ...values,
          profilePhoto: photoFile || form._diagnosticValues?.profilePhoto,
          logo: logoFile || form._diagnosticValues?.logo,
          licenseCertificate: licenseFile || form._diagnosticValues?.licenseCertificate
        }

        setDiagnosticStage(backdrop.querySelector('.auth-popup-register'), form, 2, form._diagnosticValues, ctx)
        return
      } else if (currentStage === 2) {
        const codeInput = form.querySelector('#popup-verification-code')
        const code = (codeInput?.value || values.code || '').trim()
        if (!/^\d{6}$/.test(code)) {
          if (codeInput) {
            codeInput.setCustomValidity('Please enter a valid 6-digit verification code.')
            codeInput.reportValidity()
            codeInput.focus()
          } else {
            ctx.showToast('Please enter a valid 6-digit verification code.')
          }
          return
        }
        form._diagnosticValues = {
          ...form._diagnosticValues,
          code,
          isVerified: true
        }
        ctx.showToast('Email verified successfully.')
        setDiagnosticStage(backdrop.querySelector('.auth-popup-register'), form, 3, form._diagnosticValues, ctx)
        return
      } else if (currentStage === 3) {
        const hiddenServicesVal = form.querySelector('#hidden-diagnosticServices')?.value || ''
        const selectedServices = hiddenServicesVal.split(',').map(s => s.trim()).filter(Boolean)
        if (selectedServices.length === 0) {
          ctx.showToast('Please select at least one diagnostic service.')
          const sSelect = form.querySelector('#select-diagnosticServices')
          if (sSelect) sSelect.focus()
          return
        }
        values.services = selectedServices

        if (!values.homeCollection) {
          ctx.showToast('Please select Home Sample Collection availability.')
          const hcSelect = form.querySelector('#diagnostic-homeCollection')
          if (hcSelect) {
            hcSelect.focus()
            hcSelect.reportValidity()
          }
          return
        }

        const selectedDays = Array.from(form.querySelectorAll('input[name="workingDays"]:checked')).map(cb => cb.value)
        if (selectedDays.length === 0) {
          ctx.showToast('Please select at least one working day.')
          return
        }
        values.workingDays = selectedDays

        if (!values.workingHoursFrom || !values.workingHoursTo) {
          ctx.showToast('Please enter operating hours (From and To).')
          return
        }
        values.operatingHours = `${values.workingHoursFrom} - ${values.workingHoursTo}`

        if (!values.address) {
          ctx.showToast('Please enter the Diagnostic Centre Address.')
          return
        }
        if (!values.state) {
          ctx.showToast('Please select a State.')
          return
        }
        if (!values.district) {
          ctx.showToast('Please select a District.')
          return
        }
        if (!values.city) {
          ctx.showToast('Please select a City / Town.')
          return
        }
        if (!values.pincode || !/^\d{6}$/.test(String(values.pincode).trim())) {
          ctx.showToast('Please enter a valid 6-digit Pincode.')
          return
        }

        form._diagnosticValues = {
          ...form._diagnosticValues,
          ...values
        }

        showPortalRegistrationSuccess(backdrop, 'diagnostic', form._diagnosticValues, close, ctx)
        return
      }
    } else if (!isPortalLogin && form.dataset.portal === 'hospital') {
      const currentStage = parseInt(form.dataset.stage || '1', 10)
      if (currentStage === 1) {
        const passInput = form.querySelector('#hospital-password')
        const confirmInput = form.querySelector('#hospital-confirmPassword')
        if (passInput) passInput.setCustomValidity('')
        if (confirmInput) confirmInput.setCustomValidity('')

        const passErr = validatePasswordRules(values.password || '')
        if (passErr && passInput) {
          passInput.setCustomValidity(passErr)
          passInput.reportValidity()
          return
        }
        if (values.password !== values.confirmPassword && confirmInput) {
          confirmInput.setCustomValidity('Passwords do not match')
          confirmInput.reportValidity()
          return
        }

        const phoneCode = values.phoneCountryCode || '+91'
        const expectedDigits = getCountryDigits(phoneCode)
        const countryObj = getCountryByCode(phoneCode)
        const rawPhone = String(values.phone || values.mobile || '').replace(/\D/g, '')

        if (rawPhone.length !== expectedDigits) {
          const pInput = form.querySelector('#hospital-phone')
          if (pInput) {
            pInput.setCustomValidity(`Enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name}`)
            pInput.reportValidity()
          } else {
            ctx.showToast(`Please enter a valid ${expectedDigits}-digit helpline number for ${countryObj.name} (${phoneCode}).`)
          }
          return
        }

        if (!values.ceaNumber) {
          ctx.showToast('Please enter the Clinical Establishment Act (CEA) No.')
          return
        }

        const logoInput = form.querySelector('#hospital-logo')
        const licenseInput = form.querySelector('#hospital-license')
        const photoInput = form.querySelector('#hospital-photo')
        const logoFile = logoInput?.files?.[0]
        const licenseFile = licenseInput?.files?.[0]
        const photoFile = photoInput?.files?.[0]

        if (!photoFile && !form._hospitalValues?.profilePhoto) {
          ctx.showToast('Please upload the Superintendent Profile Photo.')
          return
        }
        if (!logoFile && !form._hospitalValues?.logo) {
          ctx.showToast('Please upload the Hospital Logo.')
          return
        }
        if (!licenseFile && !form._hospitalValues?.licenseCertificate) {
          ctx.showToast('Please upload the Registration Certificate.')
          return
        }

        const oversizedFile = [logoFile, licenseFile, photoFile].find(file => file instanceof File && file.size > 10 * 1024 * 1024)
        if (oversizedFile) {
          ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }

        form._hospitalValues = {
          ...form._hospitalValues,
          ...values,
          profilePhoto: photoFile || form._hospitalValues?.profilePhoto,
          logo: logoFile || form._hospitalValues?.logo,
          licenseCertificate: licenseFile || form._hospitalValues?.licenseCertificate
        }

        setHospitalStage(backdrop.querySelector('.auth-popup-register'), form, 2, form._hospitalValues, ctx)
        return
      } else if (currentStage === 2) {
        const codeInput = form.querySelector('#popup-verification-code')
        const code = (codeInput?.value || values.code || '').trim()
        if (!/^\d{6}$/.test(code)) {
          if (codeInput) {
            codeInput.setCustomValidity('Please enter a valid 6-digit verification code.')
            codeInput.reportValidity()
            codeInput.focus()
          } else {
            ctx.showToast('Please enter a valid 6-digit verification code.')
          }
          return
        }
        form._hospitalValues = {
          ...form._hospitalValues,
          code,
          isVerified: true
        }
        ctx.showToast('Email verified successfully.')
        setHospitalStage(backdrop.querySelector('.auth-popup-register'), form, 3, form._hospitalValues, ctx)
        return
      } else if (currentStage === 3) {
        if (!values.hospitalCategory) {
          ctx.showToast('Please select a Hospital Category.')
          const catSelect = form.querySelector('#hospital-category')
          if (catSelect) {
            catSelect.focus()
            catSelect.reportValidity()
          }
          return
        }
        if (!values.bedCapacity || parseInt(values.bedCapacity, 10) < 1) {
          ctx.showToast('Please enter total registered inpatient beds.')
          return
        }
        if (values.icuBeds === undefined || values.icuBeds === '' || parseInt(values.icuBeds, 10) < 0) {
          ctx.showToast('Please enter dedicated ICU/Critical care beds.')
          return
        }
        if (!values.emergencyCare) {
          ctx.showToast('Please select 24/7 Emergency & Trauma Care availability.')
          const ecSelect = form.querySelector('#hospital-emergencyCare')
          if (ecSelect) {
            ecSelect.focus()
            ecSelect.reportValidity()
          }
          return
        }
        if (!values.bloodBank) {
          ctx.showToast('Please select In-House Blood Bank availability.')
          const bbSelect = form.querySelector('#hospital-bloodBank')
          if (bbSelect) {
            bbSelect.focus()
            bbSelect.reportValidity()
          }
          return
        }

        if (!values.address) {
          ctx.showToast('Please enter the Hospital Address.')
          return
        }
        if (!values.state) {
          ctx.showToast('Please select a State.')
          return
        }
        if (!values.district) {
          ctx.showToast('Please select a District.')
          return
        }
        if (!values.city) {
          ctx.showToast('Please select a City / Town.')
          return
        }
        if (!values.pincode || !/^\d{6}$/.test(String(values.pincode).trim())) {
          ctx.showToast('Please enter a valid 6-digit Pincode.')
          return
        }

        form._hospitalValues = {
          ...form._hospitalValues,
          ...values
        }

        showPortalRegistrationSuccess(backdrop, 'hospital', form._hospitalValues, close, ctx)
        return
      }
    } else if (!isPortalLogin && form.dataset.portal === 'clinic') {
      const currentStage = parseInt(form.dataset.stage || '1', 10)
      if (currentStage === 1) {
        const passInput = form.querySelector('#clinic-password')
        const confirmInput = form.querySelector('#clinic-confirmPassword')
        if (passInput) passInput.setCustomValidity('')
        if (confirmInput) confirmInput.setCustomValidity('')

        const passErr = validatePasswordRules(values.password || '')
        if (passErr && passInput) {
          passInput.setCustomValidity(passErr)
          passInput.reportValidity()
          return
        }
        if (values.password !== values.confirmPassword && confirmInput) {
          confirmInput.setCustomValidity('Passwords do not match')
          confirmInput.reportValidity()
          return
        }

        const phoneCode = values.phoneCountryCode || '+91'
        const expectedDigits = getCountryDigits(phoneCode)
        const countryObj = getCountryByCode(phoneCode)
        const rawPhone = String(values.phone || values.mobile || '').replace(/\D/g, '')

        if (rawPhone.length !== expectedDigits) {
          const pInput = form.querySelector('#clinic-phone')
          if (pInput) {
            pInput.setCustomValidity(`Enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name}`)
            pInput.reportValidity()
          } else {
            ctx.showToast(`Please enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name} (${phoneCode}).`)
          }
          return
        }

        const logoInput = form.querySelector('#clinic-logo')
        const photoInput = form.querySelector('#clinic-photo')
        const logoFile = logoInput?.files?.[0]
        const photoFile = photoInput?.files?.[0]

        if (!photoFile && !form._clinicValues?.profilePhoto) {
          ctx.showToast('Please upload an Admin Profile Photo.')
          return
        }
        if (!logoFile && !form._clinicValues?.logo) {
          ctx.showToast('Please upload the Clinic Logo.')
          return
        }

        const oversizedFile = [logoFile, photoFile].find(file => file instanceof File && file.size > 10 * 1024 * 1024)
        if (oversizedFile) {
          ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }

        form._clinicValues = {
          ...form._clinicValues,
          ...values,
          profilePhoto: photoFile || form._clinicValues?.profilePhoto,
          logo: logoFile || form._clinicValues?.logo
        }

        setClinicStage(backdrop.querySelector('.auth-popup-register'), form, 2, form._clinicValues, ctx)
        return
      } else if (currentStage === 2) {
        const codeInput = form.querySelector('#popup-verification-code')
        const code = (codeInput?.value || values.code || '').trim()
        if (!/^\d{6}$/.test(code)) {
          if (codeInput) {
            codeInput.setCustomValidity('Please enter a valid 6-digit verification code.')
            codeInput.reportValidity()
            codeInput.focus()
          } else {
            ctx.showToast('Please enter a valid 6-digit verification code.')
          }
          return
        }
        form._clinicValues = {
          ...form._clinicValues,
          code,
          isVerified: true
        }
        ctx.showToast('Email verified successfully.')
        setClinicStage(backdrop.querySelector('.auth-popup-register'), form, 3, form._clinicValues, ctx)
        return
      } else if (currentStage === 3) {
        if (!values.clinicType) {
          ctx.showToast('Please select a Clinic Type.')
          const ctSelect = form.querySelector('#clinic-clinicType')
          if (ctSelect) { ctSelect.focus(); ctSelect.reportValidity() }
          return
        }
        if (!values.consultationModes) {
          ctx.showToast('Please select a Consultation Mode.')
          const cmSelect = form.querySelector('#clinic-consultationModes')
          if (cmSelect) { cmSelect.focus(); cmSelect.reportValidity() }
          return
        }

        const hiddenSpecsVal = form.querySelector('#hidden-clinicSpecialties')?.value || ''
        const selectedSpecialties = hiddenSpecsVal.split(',').map(s => s.trim()).filter(Boolean)
        if (selectedSpecialties.length === 0) {
          ctx.showToast('Please select at least one primary specialty.')
          const sSelect = form.querySelector('#select-clinicSpecialties')
          if (sSelect) sSelect.focus()
          return
        }
        values.specialties = selectedSpecialties

        if (!values.ceaNumber) {
          ctx.showToast('Please enter the Clinic Registration / CEA No.')
          const ceaInput = form.querySelector('#clinic-ceaNumber')
          if (ceaInput) { ceaInput.focus(); ceaInput.reportValidity() }
          return
        }

        const licenseInput = form.querySelector('#clinic-license')
        const licenseFile = licenseInput?.files?.[0]
        if (!licenseFile && !form._clinicValues?.licenseCertificate) {
          ctx.showToast('Please upload the Registration Certificate.')
          return
        }
        if (licenseFile && licenseFile.size > 10 * 1024 * 1024) {
          ctx.showToast(`"${licenseFile.name}" is too large (${(licenseFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }

        const selectedDays = Array.from(form.querySelectorAll('.clinic-stage-fields input[name="workingDays"]:checked')).map(cb => cb.value)
        if (selectedDays.length === 0) {
          ctx.showToast('Please select at least one working day.')
          return
        }
        values.workingDays = selectedDays

        if (!values.workingHoursFrom || !values.workingHoursTo) {
          ctx.showToast('Please enter OPD working hours (From and To).')
          return
        }
        values.timings = `${values.workingDays.join(', ')}: ${values.workingHoursFrom} - ${values.workingHoursTo}`

        if (!values.address) {
          ctx.showToast('Please enter the Clinic Address.')
          return
        }
        if (!values.state) {
          ctx.showToast('Please select a State.')
          return
        }
        if (!values.district) {
          ctx.showToast('Please select a District.')
          return
        }
        if (!values.city) {
          ctx.showToast('Please select a City / Town.')
          return
        }
        if (!values.pincode || !/^\d{6}$/.test(String(values.pincode).trim())) {
          ctx.showToast('Please enter a valid 6-digit Pincode.')
          return
        }

        form._clinicValues = {
          ...form._clinicValues,
          ...values,
          licenseCertificate: licenseFile || form._clinicValues?.licenseCertificate
        }

        showPortalRegistrationSuccess(backdrop, 'clinic', form._clinicValues, close, ctx)
        return
      }
    } else if (!isPortalLogin && form.dataset.portal === 'pharmacy') {
      const currentStage = parseInt(form.dataset.stage || '1', 10)
      if (currentStage === 1) {
        const passInput = form.querySelector('#pharmacy-password')
        const confirmInput = form.querySelector('#pharmacy-confirmPassword')
        if (passInput) passInput.setCustomValidity('')
        if (confirmInput) confirmInput.setCustomValidity('')

        const passErr = validatePasswordRules(values.password || '')
        if (passErr && passInput) {
          passInput.setCustomValidity(passErr)
          passInput.reportValidity()
          return
        }
        if (values.password !== values.confirmPassword && confirmInput) {
          confirmInput.setCustomValidity('Passwords do not match')
          confirmInput.reportValidity()
          return
        }

        const phoneCode = values.phoneCountryCode || '+91'
        const expectedDigits = getCountryDigits(phoneCode)
        const countryObj = getCountryByCode(phoneCode)
        const rawPhone = String(values.phone || values.mobile || '').replace(/\D/g, '')

        if (rawPhone.length !== expectedDigits) {
          const pInput = form.querySelector('#pharmacy-phone')
          if (pInput) {
            pInput.setCustomValidity(`Enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name}`)
            pInput.reportValidity()
          } else {
            ctx.showToast(`Please enter a valid ${expectedDigits}-digit mobile number for ${countryObj.name} (${phoneCode}).`)
          }
          return
        }

        const logoInput = form.querySelector('#pharmacy-logo')
        const photoInput = form.querySelector('#pharmacy-photo')
        const logoFile = logoInput?.files?.[0]
        const photoFile = photoInput?.files?.[0]

        if (!photoFile && !form._pharmacyValues?.profilePhoto) {
          ctx.showToast('Please upload a Pharmacist Profile Photo.')
          return
        }
        if (!logoFile && !form._pharmacyValues?.logo) {
          ctx.showToast('Please upload the Pharmacy Storefront / Logo.')
          return
        }

        const oversizedFile = [logoFile, photoFile].find(file => file instanceof File && file.size > 10 * 1024 * 1024)
        if (oversizedFile) {
          ctx.showToast(`"${oversizedFile.name}" is too large (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }

        form._pharmacyValues = {
          ...form._pharmacyValues,
          ...values,
          profilePhoto: photoFile || form._pharmacyValues?.profilePhoto,
          logo: logoFile || form._pharmacyValues?.logo
        }

        setPharmacyStage(backdrop.querySelector('.auth-popup-register'), form, 2, form._pharmacyValues, ctx)
        return
      } else if (currentStage === 2) {
        const codeInput = form.querySelector('#popup-verification-code')
        const code = (codeInput?.value || values.code || '').trim()
        if (!/^\d{6}$/.test(code)) {
          if (codeInput) {
            codeInput.setCustomValidity('Please enter a valid 6-digit verification code.')
            codeInput.reportValidity()
            codeInput.focus()
          } else {
            ctx.showToast('Please enter a valid 6-digit verification code.')
          }
          return
        }
        form._pharmacyValues = {
          ...form._pharmacyValues,
          code,
          isVerified: true
        }
        ctx.showToast('Email verified successfully.')
        setPharmacyStage(backdrop.querySelector('.auth-popup-register'), form, 3, form._pharmacyValues, ctx)
        return
      } else if (currentStage === 3) {
        if (!values.pharmacyType) {
          ctx.showToast('Please select a Pharmacy Type.')
          const ptSelect = form.querySelector('#pharmacy-pharmacyType')
          if (ptSelect) { ptSelect.focus(); ptSelect.reportValidity() }
          return
        }
        if (!values.councilRegNumber) {
          ctx.showToast('Please enter Pharmacist Council Registration Number.')
          const crInput = form.querySelector('#pharmacy-councilRegNumber')
          if (crInput) { crInput.focus(); crInput.reportValidity() }
          return
        }
        if (!values.drugLicenseNumber) {
          ctx.showToast('Please enter Drug License Number (Form 20 / 21).')
          const dlInput = form.querySelector('#pharmacy-drugLicenseNumber')
          if (dlInput) { dlInput.focus(); dlInput.reportValidity() }
          return
        }

        const licenseInput = form.querySelector('#pharmacy-license')
        const licenseFile = licenseInput?.files?.[0]
        if (!licenseFile && !form._pharmacyValues?.licenseCertificate) {
          ctx.showToast('Please upload the Drug License Certificate.')
          return
        }
        if (licenseFile && licenseFile.size > 10 * 1024 * 1024) {
          ctx.showToast(`"${licenseFile.name}" is too large (${(licenseFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 10MB.`)
          return
        }
        if (licenseFile) {
          values.licenseCertificate = licenseFile
        }

        const hiddenServicesVal = form.querySelector('#hidden-pharmacyServices')?.value || ''
        const selectedServices = hiddenServicesVal.split(',').map(s => s.trim()).filter(Boolean)
        if (selectedServices.length === 0) {
          ctx.showToast('Please select at least one pharmacy service.')
          const sSelect = form.querySelector('#select-pharmacyServices')
          if (sSelect) sSelect.focus()
          return
        }
        values.services = selectedServices

        if (!values.homeDelivery) {
          ctx.showToast('Please select Home Delivery availability.')
          const hdSelect = form.querySelector('#pharmacy-homeDelivery')
          if (hdSelect) { hdSelect.focus(); hdSelect.reportValidity() }
          return
        }

        const selectedDays = Array.from(form.querySelectorAll('.pharmacy-stage-fields input[name="workingDays"]:checked')).map(cb => cb.value)
        if (selectedDays.length === 0) {
          ctx.showToast('Please select at least one working day.')
          return
        }
        values.workingDays = selectedDays

        if (!values.workingHoursFrom || !values.workingHoursTo) {
          ctx.showToast('Please enter operating hours (From and To).')
          return
        }
        values.operatingHours = `${values.workingHoursFrom} - ${values.workingHoursTo}`

        if (!values.address) {
          ctx.showToast('Please enter the Pharmacy Address.')
          return
        }
        if (!values.state) {
          ctx.showToast('Please select a State.')
          return
        }
        if (!values.district) {
          ctx.showToast('Please select a District.')
          return
        }
        if (!values.city) {
          ctx.showToast('Please select a City / Town.')
          return
        }
        if (!values.pincode || !/^\d{6}$/.test(String(values.pincode).trim())) {
          ctx.showToast('Please enter a valid 6-digit Pincode.')
          return
        }

        form._pharmacyValues = {
          ...form._pharmacyValues,
          ...values,
          licenseCertificate: licenseFile || form._pharmacyValues?.licenseCertificate
        }

        showPortalRegistrationSuccess(backdrop, 'pharmacy', form._pharmacyValues, close, ctx)
        return
      }
    } else if (!isPortalLogin) {
      renderRegistrationVerification(backdrop, modalCtx, values, close)
    } else {
      renderRegistrationVerification(backdrop, modalCtx, values, close)
    }
  })
}

export function renderLogin(appRoot, ctx) {
  appRoot.innerHTML = authShell(
    `${loginFormMarkup({ idPrefix: 'patient', heading: true })}<div class="auth-divider"><span>For care partners</span></div><button class="auth-portal-link" data-nav="register">Register or access a portal account ${icon('arrow')}</button>`,
    'login',
    ctx,
  )
  bindAuthNav(appRoot, ctx)
  bindLoginRoleToggle(appRoot)
  appRoot
    .querySelector('#patient-login-form')
    .addEventListener('submit', (event) => {
      event.preventDefault()
      submitLogin(event.currentTarget, ctx, () => {})
    })
}

export function renderRegister(appRoot, ctx) {
  appRoot.innerHTML = authShell(
    registerFormMarkup({ idPrefix: 'portal' }),
    'register',
    ctx,
  )
  bindAuthNav(appRoot, ctx)
  bindRoleToggle(appRoot)
  const form = appRoot.querySelector('#portal-register-form')
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    submitRegister(event.currentTarget, ctx, () => {})
  })
}

if (typeof document !== 'undefined') {
  document.addEventListener('change', (event) => {
    if (event.target && event.target.type === 'file') {
      event.target.setCustomValidity('')
    }
  })

  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('.auth-password-toggle')
    if (!toggleBtn) return
    event.preventDefault()
    const targetId = toggleBtn.getAttribute('data-toggle-target')
    const input = targetId ? document.getElementById(targetId) : toggleBtn.closest('.auth-password-wrapper')?.querySelector('input')
    if (!input) return
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    toggleBtn.innerHTML = isPassword ? icon('eyeOff') : icon('eye')
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password')
    toggleBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password')
  })
}
