import { icon } from './ui.js'
import { setSession, clearPendingAction } from './auth.js'
import { login, register } from './api.js'
import { doctorSpecialties, doctorCities } from './data.js'
import { portalOptions, portalRegistrationFields } from './portals.js'
import { getDoctorApplicationPdfUrl, downloadDoctorApplicationPdf } from './doctorPdfGenerator.js'
import { medicalUniversitiesAndColleges } from './medicalCollegesData.js'
import { indianStatesAndDistricts } from './indianDistrictsData.js'
import {
  practiceTypes,
  experienceOptions,
  primarySpecializations,
  subSpecializations,
  medicalServicesList,
  workTypes,
  medicalQualificationsList,
  languagesList
} from './practiceCareerData.js'

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function registrationFieldsMarkup(type) {
  return portalRegistrationFields[type].map(([name, label, inputType, placeholder]) => `<div><label for="popup-${name}">${label}</label><input class="auth-text-input" id="popup-${name}" name="${name}" type="${inputType}" autocomplete="${inputType === 'email' ? 'email' : 'off'}" placeholder="${placeholder}" ${name === 'password' ? 'minlength="8"' : ''} required></div>`).join('')
}

function portalLabel(type) {
  return portalOptions.find(option => option.value === type)?.label || 'Portal'
}

const indianStates = Object.keys(indianStatesAndDistricts).sort()

const doctorStages = ['PERSONAL', 'VERIFICATION', 'EDUCATION', 'PRACTICE & CAREER', 'LOCATION', 'REVIEW']
const doctorStageKeys = ['personal', 'verification', 'education', 'practice', 'location', 'review']

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
          <span class="doctor-pdf-icon-badge">${icon('file')}</span>
          <div>
            <h3>Doctor Application PDF Preview</h3>
            <p>${doctorName} · Formal Onboarding Application</p>
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

function doctorStageMarkup(stage, values = {}) {
  const fields = {
    personal: [['firstName', 'FIRST NAME*', 'text', values.firstName || '', 'Enter first name'], ['lastName', 'LAST NAME*', 'text', values.lastName || '', 'Enter last name'], ['gender', 'GENDER*', 'select', values.gender || '', 'Select gender'], ['dateOfBirth', 'DATE OF BIRTH*', 'date', values.dateOfBirth || '', ''], ['phone', 'MOBILE NUMBER*', 'tel', values.phone || '', '10-digit mobile number'], ['email', 'EMAIL*', 'email', values.email || '', 'doctor@practice.com'], ['password', 'PASSWORD*', 'password', '', 'Create password'], ['confirmPassword', 'CONFIRM PASSWORD*', 'password', '', 'Confirm password'], ['idType', 'ID PROOF TYPE*', 'select', values.idType || '', 'Select document'], ['idProof', 'UPLOAD ID PROOF*', 'file', '', 'Click to upload'], ['profilePhoto', 'PROFILE PHOTO*', 'file-image', '', 'Click to upload your profile photo'], ['referralCode', 'Have a Referral Code?', 'text', values.referralCode || '', 'Enter referral code']],
    verification: [['code', 'Verification code', 'text', '', 'Enter 6-digit code']],
    practice: [['license', 'Medical license number', 'text', values.license || '', 'Enter license number'], ['specialty', 'Primary specialty', 'text', values.specialty || '', 'e.g. Cardiology'], ['experience', 'Years of experience', 'number', values.experience || '', 'Years']]
  }

  if (stage === 'education') {
    const degrees = ['MBBS', 'Diploma', 'MD', 'MS', 'DM', 'MCH', 'Other UG', 'Other PG']
    const universities = [...Object.keys(medicalUniversitiesAndColleges).sort(), 'Other']
    const currentYear = new Date().getFullYear()
    const years = []
    for (let y = currentYear; y >= 1970; y--) years.push(y)

    const selectedUniv = values.university || ''
    const availableColleges = (selectedUniv && selectedUniv !== 'Other') ? (medicalUniversitiesAndColleges[selectedUniv] || []) : []

    const degreeCertLabel = (values.degreeCert && values.degreeCert.name) ? values.degreeCert.name : 'Upload File'
    const enrollCertLabel = (values.enrollmentCert && values.enrollmentCert.name) ? values.enrollmentCert.name : 'Upload File'

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-stage-title-wrap">
        <span class="doctor-stage-title-icon">${icon('graduationCap')}</span>
        <h3 class="doctor-stage-heading">Educational Qualifications</h3>
      </div>
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
        <div>
          <label for="doctor-enrollmentNo">HALL TICKET OR ENROLLMENT NUMBER *</label>
          <input class="auth-text-input" id="doctor-enrollmentNo" name="enrollmentNo" type="text" value="${values.enrollmentNo || ''}" placeholder="Hall ticket or enrollment number" required>
        </div>
        <div class="doctor-upload-field">
          <label for="doctor-degreeCert">
            <span>DEGREE CERTIFICATE *</span>
            <small class="doctor-field-desc">Upload a scanned copy of your degree certificate</small>
          </label>
          <label class="doctor-upload-control" for="doctor-degreeCert">
            ${icon('upload')}
            <span class="upload-btn-label">${degreeCertLabel}</span>
          </label>
          <input id="doctor-degreeCert" name="degreeCert" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.degreeCert ? '' : 'required'}>
        </div>
        <div class="doctor-upload-field" style="grid-column: span 2;">
          <label for="doctor-enrollmentCert">
            <span>HALL TICKET / ENROLLMENT CERTIFICATE *</span>
            <small class="doctor-field-desc">Upload a scanned copy of your hall ticket or enrollment certificate</small>
          </label>
          <label class="doctor-upload-control" for="doctor-enrollmentCert">
            ${icon('upload')}
            <span class="upload-btn-label">${enrollCertLabel}</span>
          </label>
          <input id="doctor-enrollmentCert" name="enrollmentCert" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.enrollmentCert ? '' : 'required'}>
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

  if (stage === 'practice') {
    const getArray = (v) => {
      if (!v) return []
      if (Array.isArray(v)) return v
      return String(v).split(',').map(s => s.trim()).filter(Boolean)
    }

    const selectedPrimSpecs = getArray(values.primarySpecialization || values.specialty)
    const selectedSubSpecs = getArray(values.subSpecialization)
    const selectedServices = getArray(values.medicalServices)
    const selectedQuals = getArray(values.medicalQualifications)
    const selectedLangs = getArray(values.languagesKnown)

    const licenseCertLabel = (values.licenseCert && values.licenseCert.name)
      ? values.licenseCert.name
      : (typeof values.licenseCert === 'string' && values.licenseCert ? values.licenseCert : 'Upload File')

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-location-step-container">
        <!-- Section 1: Professional Practice -->
        <div class="doctor-stage-title-wrap">
          <span class="doctor-stage-title-icon">${icon('stethoscope')}</span>
          <h3 class="doctor-stage-heading">Professional Practice</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-stage-fields">
            <div>
              <label for="doctor-medicalRegNo">MEDICAL REGISTRATION NO. *</label>
              <input
                class="auth-text-input"
                id="doctor-medicalRegNo"
                name="medicalRegNo"
                type="text"
                placeholder="Enter medical registration number"
                value="${escapeHtml(values.medicalRegNo || values.license || '')}"
                required
              >
            </div>
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

            <!-- PRIMARY SPECIALIZATION -->
            <div class="doctor-multi-select-field" style="grid-column: span 2;">
              <label for="select-primarySpecialization">PRIMARY SPECIALIZATION *</label>
              <div class="doctor-chips-container" id="chips-primarySpecialization">
                ${selectedPrimSpecs.map(s => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(s)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="primarySpecialization" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-primarySpecialization" data-field="primarySpecialization">
                  <option value="">Add specialization</option>
                  ${primarySpecializations.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-primarySpecialization" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-primarySpecialization" placeholder="Enter other specialization...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="primarySpecialization">Add</button>
              </div>
              <input type="hidden" name="primarySpecialization" id="hidden-primarySpecialization" value="${escapeHtml(selectedPrimSpecs.join(', '))}">
            </div>

            <!-- SUB-SPECIALIZATION -->
            <div class="doctor-multi-select-field" style="grid-column: span 2;">
              <label for="select-subSpecialization">SUB-SPECIALIZATION</label>
              <div class="doctor-chips-container" id="chips-subSpecialization">
                ${selectedSubSpecs.map(s => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(s)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="subSpecialization" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-subSpecialization" data-field="subSpecialization">
                  <option value="">Add sub-specialization</option>
                  ${subSpecializations.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-subSpecialization" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-subSpecialization" placeholder="Enter other sub-specialization...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="subSpecialization">Add</button>
              </div>
              <input type="hidden" name="subSpecialization" id="hidden-subSpecialization" value="${escapeHtml(selectedSubSpecs.join(', '))}">
            </div>

            <div>
              <label for="doctor-associationMembership">MEDICAL ASSOCIATION MEMBERSHIP</label>
              <input
                class="auth-text-input"
                id="doctor-associationMembership"
                name="associationMembership"
                type="text"
                placeholder="Medical association name"
                value="${escapeHtml(values.associationMembership || '')}"
              >
            </div>

            <div class="doctor-upload-field">
              <label for="doctor-licenseCert">
                <span>MEDICAL LICENSE / REGISTRATION CERTIFICATE *</span>
                <small class="doctor-field-desc">JPG OR PNG — MAX 5MB</small>
              </label>
              <label class="doctor-upload-control" for="doctor-licenseCert">
                ${icon('upload')}
                <span class="upload-btn-label">${escapeHtml(licenseCertLabel)}</span>
              </label>
              <input id="doctor-licenseCert" name="licenseCert" type="file" accept=".jpg,.jpeg,.png,.pdf" ${values.licenseCert ? '' : 'required'}>
            </div>

            <!-- MEDICAL DOCUMENTATION / SERVICES (OPTIONAL) -->
            <div class="doctor-multi-select-field" style="grid-column: span 2;">
              <label for="select-medicalServices">MEDICAL DOCUMENTATION / SERVICES (OPTIONAL)</label>
              <div class="doctor-chips-container" id="chips-medicalServices">
                ${selectedServices.map(s => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(s)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="medicalServices" data-val="${escapeHtml(s)}" aria-label="Remove ${escapeHtml(s)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-medicalServices" data-field="medicalServices">
                  <option value="">Add service</option>
                  ${medicalServicesList.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-medicalServices" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-medicalServices" placeholder="Enter other medical service...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="medicalServices">Add</button>
              </div>
              <input type="hidden" name="medicalServices" id="hidden-medicalServices" value="${escapeHtml(selectedServices.join(', '))}">
            </div>
          </div>
        </div>

        <!-- Section 2: Career Information -->
        <div class="doctor-stage-title-wrap" style="margin-top: 18px;">
          <span class="doctor-stage-title-icon">${icon('building')}</span>
          <h3 class="doctor-stage-heading">Career Information</h3>
        </div>
        <div class="doctor-location-card">
          <div class="doctor-stage-fields">
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
            <div>
              <label for="doctor-positionRole">POSITION / ROLE</label>
              <input
                class="auth-text-input"
                id="doctor-positionRole"
                name="positionRole"
                type="text"
                placeholder="Your position / designation"
                value="${escapeHtml(values.positionRole || '')}"
              >
            </div>
            <div style="grid-column: span 2;">
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

            <!-- MEDICAL QUALIFICATIONS * -->
            <div class="doctor-multi-select-field" style="grid-column: span 2;">
              <label for="select-medicalQualifications">MEDICAL QUALIFICATIONS *</label>
              <div class="doctor-chips-container" id="chips-medicalQualifications">
                ${selectedQuals.map(q => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(q)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="medicalQualifications" data-val="${escapeHtml(q)}" aria-label="Remove ${escapeHtml(q)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-medicalQualifications" data-field="medicalQualifications">
                  <option value="">Add qualification</option>
                  ${medicalQualificationsList.map(q => `<option value="${q}">${q}</option>`).join('')}
                </select>
              </div>
              <div class="doctor-chip-other-input-wrap" id="other-wrap-medicalQualifications" style="display: none;">
                <input class="auth-text-input" type="text" id="other-input-medicalQualifications" placeholder="Enter other qualification...">
                <button type="button" class="button button-primary doctor-chip-other-btn" data-field="medicalQualifications">Add</button>
              </div>
              <input type="hidden" name="medicalQualifications" id="hidden-medicalQualifications" value="${escapeHtml(selectedQuals.join(', '))}">
            </div>

            <!-- LANGUAGES KNOWN * -->
            <div class="doctor-multi-select-field" style="grid-column: span 2;">
              <label for="select-languagesKnown">LANGUAGES KNOWN *</label>
              <div class="doctor-chips-container" id="chips-languagesKnown">
                ${selectedLangs.map(l => `
                  <span class="doctor-chip">
                    <span>${escapeHtml(l)}</span>
                    <button type="button" class="doctor-chip-remove" data-field="languagesKnown" data-val="${escapeHtml(l)}" aria-label="Remove ${escapeHtml(l)}">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div class="doctor-multi-select-control">
                <select class="auth-text-input doctor-chip-select" id="select-languagesKnown" data-field="languagesKnown">
                  <option value="">Add language</option>
                  ${languagesList.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
              </div>
              <input type="hidden" name="languagesKnown" id="hidden-languagesKnown" value="${escapeHtml(selectedLangs.join(', '))}">
            </div>

            <!-- Other languages -->
            <div style="grid-column: span 2;">
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

    const selectedCurrentState = values.currentState || ''
    const availableCurrentDistricts = selectedCurrentState ? (indianStatesAndDistricts[selectedCurrentState] || []) : []

    const selectedPermState = values.permState || ''
    const availablePermDistricts = selectedPermState ? (indianStatesAndDistricts[selectedPermState] || []) : []

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
              <label for="doctor-currentCity">CITY *</label>
              <input class="auth-text-input" id="doctor-currentCity" name="currentCity" type="text" placeholder="Enter city" value="${values.currentCity || values.city || ''}" required>
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
              <label for="doctor-permCity">CITY *</label>
              <input class="auth-text-input" id="doctor-permCity" name="permCity" type="text" placeholder="Enter city" value="${values.permCity || ''}" required>
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

          <div class="doctor-option-group" style="margin-top: 18px;">
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

          <div class="doctor-stage-fields" style="margin-top: 18px;">
            <div>
              <label for="doctor-workingHoursFrom">WORKING HOURS – FROM *</label>
              <input class="auth-text-input" id="doctor-workingHoursFrom" name="workingHoursFrom" type="time" value="${values.workingHoursFrom || '09:00'}" required>
            </div>
            <div>
              <label for="doctor-workingHoursTo">WORKING HOURS – TO *</label>
              <input class="auth-text-input" id="doctor-workingHoursTo" name="workingHoursTo" type="time" value="${values.workingHoursTo || '18:00'}" required>
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
    const officeAddr = [values.currentAddress || values.address, values.currentCity || values.city, values.currentState, values.currentPincode].filter(Boolean).join(', ')
    const permAddr = [values.permAddress, values.permCity, values.permState, values.permPincode].filter(Boolean).join(', ')
    const workingHours = (values.workingHoursFrom && values.workingHoursTo) ? `${values.workingHoursFrom} - ${values.workingHoursTo}` : 'Not provided'
    const licenseCertName = (values.licenseCert && values.licenseCert.name) ? values.licenseCert.name : (typeof values.licenseCert === 'string' && values.licenseCert ? values.licenseCert : 'Not uploaded')
    const allLangs = [values.languagesKnown, values.otherLanguages].filter(Boolean).join(', ') || 'Not provided'

    return `<input type="hidden" name="portal" value="doctor">
      <div class="doctor-review-sections">
        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Personal Details</h4>
          <div class="doctor-review-list">
            <div><span>Doctor</span><strong>Dr. ${values.firstName || ''} ${values.lastName || ''}</strong></div>
            <div><span>Gender</span><strong>${values.gender || 'Not provided'}</strong></div>
            <div><span>Date of Birth</span><strong>${values.dateOfBirth || 'Not provided'}</strong></div>
            <div><span>Mobile</span><strong>${values.phone || 'Not provided'}</strong></div>
            <div><span>Email</span><strong>${values.email || 'Not provided'}</strong></div>
            <div><span>ID Proof</span><strong>${values.idType || 'Not provided'}</strong></div>
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Educational Details</h4>
          <div class="doctor-review-list">
            <div><span>Degree</span><strong>${values.displayDegree || (values.degreeOther ? `${values.degree} (${values.degreeOther})` : values.degree) || 'Not provided'}</strong></div>
            <div><span>University</span><strong>${values.displayUniversity || (values.universityOther ? `${values.university} (${values.universityOther})` : values.university) || 'Not provided'}</strong></div>
            <div><span>College</span><strong>${values.displayCollege || (values.collegeOther ? `${values.college} (${values.collegeOther})` : values.college) || 'Not provided'}</strong></div>
            <div><span>Graduation Year</span><strong>${values.graduationYear || 'Not provided'}</strong></div>
            <div><span>Enrollment No</span><strong>${values.enrollmentNo || 'Not provided'}</strong></div>
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Professional Practice</h4>
          <div class="doctor-review-list">
            <div><span>Registration No</span><strong>${values.medicalRegNo || values.license || 'Not provided'}</strong></div>
            <div><span>State Council</span><strong>${values.stateMedicalCouncil || 'Not provided'}</strong></div>
            <div><span>Practice Type</span><strong>${values.displayPracticeType || (values.practiceTypeOther ? `Other (${values.practiceTypeOther})` : values.practiceType) || 'Not provided'}</strong></div>
            <div><span>Experience</span><strong>${values.experience || 'Not provided'}</strong></div>
            <div><span>Primary Specialization</span><strong>${values.primarySpecialization || values.specialty || 'Not provided'}</strong></div>
            <div><span>Sub-Specialization</span><strong>${values.subSpecialization || 'Not provided'}</strong></div>
            <div><span>Association</span><strong>${values.associationMembership || 'Not provided'}</strong></div>
            <div><span>License Certificate</span><strong>${licenseCertName}</strong></div>
            <div style="grid-column: span 2;"><span>Documentation / Services</span><strong>${values.medicalServices || 'Not provided'}</strong></div>
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Career Information</h4>
          <div class="doctor-review-list">
            <div><span>Current Hospital/Clinic</span><strong>${values.currentHospital || 'Not provided'}</strong></div>
            <div><span>Position / Role</span><strong>${values.positionRole || 'Not provided'}</strong></div>
            <div><span>Type of Work</span><strong>${values.displayWorkType || (values.workTypeOther ? `Other (${values.workTypeOther})` : values.workType) || 'Not provided'}</strong></div>
            <div><span>Qualifications</span><strong>${values.medicalQualifications || 'Not provided'}</strong></div>
            <div style="grid-column: span 2;"><span>Languages Known</span><strong>${allLangs}</strong></div>
            <div style="grid-column: span 2;"><span>Professional Bio</span><strong>${values.bio || 'Not provided'}</strong></div>
          </div>
        </div>

        <div class="doctor-review-group">
          <h4 class="doctor-review-group-title">Location & Availability</h4>
          <div class="doctor-review-list">
            <div><span>Office / Current Address</span><strong>${officeAddr || 'Not provided'}</strong></div>
            <div><span>Permanent Address</span><strong>${permAddr || 'Not provided'}</strong></div>
            <div><span>Consultation Mode</span><strong>${values.consultationMode || 'Not provided'}</strong></div>
            <div><span>Available Days</span><strong>${values.availableDays || 'Not provided'}</strong></div>
            <div style="grid-column: span 2;"><span>Working Hours</span><strong>${workingHours}</strong></div>
          </div>
        </div>
      </div>
      <div class="doctor-review-pdf-card">
        <div class="doctor-review-pdf-details">
          <span class="doctor-review-pdf-pill">${icon('file')} Application Document</span>
          <h4>Doctor Onboarding Summary (PDF)</h4>
          <p>Inspect the complete medical credentials and declaration statement prepared from your entries.</p>
        </div>
        <button class="button doctor-btn-view-pdf" type="button" id="btn-doctor-view-pdf">
          ${icon('file')} View Application PDF
        </button>
      </div>
      <div class="auth-stage-actions">
        <button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Back</button>
        <button class="button button-primary auth-submit" type="submit">Submit for verification ${icon('check')}</button>
      </div>`
  }
  const stageFields = fields[stage] || []
  return `<input type="hidden" name="portal" value="doctor"><div class="doctor-stage-fields">${stageFields.map(([name, label, type, value, placeholder]) => doctorFieldMarkup(name, label, type, value, placeholder)).join('')}</div><div class="auth-stage-actions">${stage !== 'personal' ? `<button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Back</button>` : `<button class="auth-stage-back" type="button" data-doctor-back>${icon('chevron')} Portals</button>`}<button class="button button-primary auth-submit" type="submit">${stage === 'review' ? 'Submit for verification' : 'Continue to next stage'} ${icon('arrow')}</button></div>`
}

function doctorFieldMarkup(name, label, type, value, placeholder) {
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
  return `<div><label for="doctor-${name}">${label}</label><input class="auth-text-input" id="doctor-${name}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${pattern} ${autocomplete} required></div>`
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
      <div>
        <label for="user-mobile">Mobile *</label>
        <input class="auth-text-input" id="user-mobile" name="mobile" type="tel" inputmode="numeric" maxlength="10" value="${values.mobile || ''}" placeholder="10-digit mobile number" required>
      </div>
      <div>
        <label for="user-email">Email *</label>
        <input class="auth-text-input" id="user-email" name="email" type="email" autocomplete="off" value="${values.email || ''}" placeholder="name@example.com" required>
      </div>
      <div>
        <label for="user-password">Password *</label>
        <input class="auth-text-input" id="user-password" name="password" type="password" autocomplete="new-password" minlength="6" placeholder="Min 6 characters" required>
      </div>
      <div>
        <label for="user-confirmPassword">Confirm Password *</label>
        <input class="auth-text-input" id="user-confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Re-enter password" required>
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
        <input id="user-idProof" name="idProof" type="file" accept=".jpg,.jpeg,.png,.pdf" required>
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
        <input id="user-profilePhoto" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png" required>
      </div>
    </div>
    <div class="doctor-stage-footer-bar">
      <div class="doctor-signin-hint">
        Already have an account? <button type="button" class="doctor-signin-link" data-user-signin>Sign In</button>
      </div>
      <div class="auth-stage-actions">
        <button class="auth-stage-back" type="button" data-user-back>${icon('chevron')} Portals</button>
        <button class="button button-primary auth-submit" type="submit">Submit ${icon('arrow')}</button>
      </div>
    </div>
  `
}

function setDoctorStage(registerPopup, form, stage, values, ctx) {
  const stageIndex = doctorStageIndex(stage)
  registerPopup.querySelector('.auth-register-stepper').innerHTML = doctorStepperMarkup(stageIndex)
  registerPopup.querySelector('.auth-form-heading h2').textContent = `${doctorStages[stageIndex]} details`
  registerPopup.querySelector('.auth-form-heading p').textContent = stage === 'review' ? 'Review your information before submitting for verification.' : 'Complete this step to continue your doctor portal registration.'
  form.dataset.stage = stage
  form.innerHTML = doctorStageMarkup(stage, values)
  form.querySelector('[data-doctor-back]').addEventListener('click', () => {
    if (stage === 'personal') {
      openAuthModal('register', ctx)
      return
    }
    setDoctorStage(registerPopup, form, doctorStageKeys[doctorStageIndex(stage) - 1], values, ctx)
  })

  // Dynamic University Search & College Dropdown on University Selection
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
            const exact = universities.find(u => u.toLowerCase() === univSearch.value.trim().toLowerCase())
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
  }

  // Practice Stage Multi-Select Chips & Custom Other Interactions
  if (stage === 'practice') {
    const multiFields = [
      'primarySpecialization',
      'subSpecialization',
      'medicalServices',
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
    })

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

    ;[form.querySelector('#doctor-practiceType-other'), form.querySelector('#doctor-workType-other')].forEach(inp => {
      inp?.addEventListener('input', () => {
        inp.setCustomValidity('')
      })
    })
  }

  // Location Stage Dynamic Address Sync & Option Pills
  if (stage === 'location') {
    const sameCheckbox = form.querySelector('#doctor-sameAsCurrent')
    const currentAddr = form.querySelector('#doctor-currentAddress')
    const currentState = form.querySelector('#doctor-currentState')
    const currentDist = form.querySelector('#doctor-currentDistrict')
    const currentCity = form.querySelector('#doctor-currentCity')
    const currentPin = form.querySelector('#doctor-currentPincode')

    const permAddr = form.querySelector('#doctor-permAddress')
    const permState = form.querySelector('#doctor-permState')
    const permDist = form.querySelector('#doctor-permDistrict')
    const permCity = form.querySelector('#doctor-permCity')
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

    if (currentState && currentDist) {
      currentState.addEventListener('change', () => {
        updateDistrictDropdown(currentState, currentDist)
        if (sameCheckbox && sameCheckbox.checked) {
          syncPermanentAddress()
        }
      })
    }

    if (currentDist) {
      currentDist.addEventListener('change', () => {
        if (sameCheckbox && sameCheckbox.checked) {
          syncPermanentAddress()
        }
      })
    }

    if (permState && permDist) {
      permState.addEventListener('change', () => {
        updateDistrictDropdown(permState, permDist)
      })
    }

    const syncPermanentAddress = () => {
      if (sameCheckbox && sameCheckbox.checked) {
        permAddr.value = currentAddr.value
        permState.value = currentState.value
        updateDistrictDropdown(permState, permDist, currentDist.value)
        permDist.value = currentDist.value
        permCity.value = currentCity.value
        permPin.value = currentPin.value

        permAddr.readOnly = true
        permCity.readOnly = true
        permPin.readOnly = true
        permState.style.pointerEvents = 'none'
        permState.tabIndex = -1
        permDist.style.pointerEvents = 'none'
        permDist.tabIndex = -1

        permAddr.classList.add('is-synced')
        permState.classList.add('is-synced')
        permDist.classList.add('is-synced')
        permCity.classList.add('is-synced')
        permPin.classList.add('is-synced')
      } else {
        permAddr.readOnly = false
        permCity.readOnly = false
        permPin.readOnly = false
        permState.style.pointerEvents = 'auto'
        permState.tabIndex = 0
        permDist.style.pointerEvents = 'auto'
        permDist.tabIndex = 0
        if (permState.value) {
          permDist.disabled = false
        } else {
          permDist.disabled = true
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
      ;[currentAddr, currentState, currentDist, currentCity, currentPin].forEach(el => {
        if (el) {
          el.addEventListener('input', () => {
            if (sameCheckbox.checked) syncPermanentAddress()
          })
        }
      })
      if (sameCheckbox.checked) syncPermanentAddress()
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
      })
    })

    // Available days pills interaction
    const dayInputs = form.querySelectorAll('input[name="availableDays"]')
    dayInputs.forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.doctor-pill-checkbox')?.classList.toggle('is-checked', input.checked)
      })
    })
  }

  // File inputs live label update
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

  const signInBtn = form.querySelector('[data-doctor-signin]')
  if (signInBtn) {
    signInBtn.addEventListener('click', (e) => {
      e.preventDefault()
      openAuthModal('portal-login', ctx)
    })
  }

  const viewPdfBtn = form.querySelector('#btn-doctor-view-pdf')
  if (viewPdfBtn) {
    viewPdfBtn.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      openPdfPreviewModal(values)
    })
  }
}

function doctorStageIndex(stage) {
  return doctorStageKeys.indexOf(stage)
}

function renderRegistrationVerification(backdrop, ctx, values, close) {
  const portal = portalLabel(values.portal)
  const popup = backdrop.querySelector('.auth-popup')
  popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-register-stepper"><span class="is-complete">1 <small>Details</small></span><i></i><span class="is-active">2 <small>Verify</small></span></div><div class="auth-form-heading"><span class="auth-form-kicker">${portal} registration</span><h2>Verify your account</h2><p>Enter the 6-digit code sent to your official email address.</p></div><form class="auth-form" id="popup-verification-form"><label for="popup-verification-code">Verification code</label><input class="auth-text-input auth-code-input" id="popup-verification-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required><p class="auth-form-hint">For this demo, enter any 6-digit verification code.</p><button class="button button-primary auth-submit" type="submit">Complete registration ${icon('check')}</button></form><button class="auth-popup-back auth-edit-registration" type="button">${icon('chevron')} Edit registration details</button>`
  popup.querySelector('.auth-popup-close').addEventListener('click', close)
  popup.querySelector('.auth-edit-registration').addEventListener('click', () => openAuthModal('register', ctx))
  popup.querySelector('#popup-verification-form').addEventListener('submit', event => {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get('code').trim()
    if (!/^\d{6}$/.test(code)) {
      event.currentTarget.querySelector('input').setCustomValidity('Enter a 6-digit verification code')
      event.currentTarget.querySelector('input').reportValidity()
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

export function openAuthModal(mode = 'login', ctx) {
  const existing = document.querySelector('.auth-popup-backdrop')
  if (existing) existing.remove()
  const modalCtx = { ...(ctx || {}), isModal: true }
  const isPortalLogin = mode === 'portal-login'
  const isRegister = mode === 'register'
  const isLogin = !isRegister

  const content = isRegister
    ? `<div class="auth-form-heading"><div class="auth-register-stepper"><span class="is-active">1 <small>Choose portal</small></span><i></i><span>2 <small>Verify details</small></span></div><span class="auth-form-kicker">Partner access</span><h2>Register your portal</h2><p>Choose your portal first, then tell us about yourself.</p></div><form class="auth-form" id="popup-register-form" data-stage="details" autocomplete="off"><label>Choose portal type</label><div class="portal-category-grid">${portalOptions.map(option => `<label class="portal-category-card" data-portal="${option.value}"><input type="radio" name="portal" value="${option.value}" required><span class="portal-category-icon">${icon(option.icon)}</span><span><strong>${option.label}</strong><small>${option.detail}</small></span></label>`).join('')}</div><div class="auth-register-fields">${registrationFieldsMarkup('hospital')}</div><button class="button button-primary auth-submit" type="submit">Continue to verification ${icon('arrow')}</button></form><div class="auth-switch">Already have a portal account? <button type="button" data-popup-mode="portal-login">Log in</button></div>`
    : isPortalLogin
      ? `<button class="auth-popup-back" type="button" data-popup-mode="login">${icon('chevron')} Patient login</button><div class="auth-form-heading"><span class="auth-form-kicker">Partner access</span><h2>Log in to your portal</h2><p>Use your work email to access your workspace.</p></div><form class="auth-form" id="popup-portal-login-form"><label for="popup-portal-email">Work email</label><input class="auth-text-input" id="popup-portal-email" name="email" type="email" autocomplete="email" placeholder="name@organisation.com" required><label for="popup-portal-password">Password</label><input class="auth-text-input" id="popup-portal-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button class="button button-primary auth-submit" type="submit">Log in to portal ${icon('arrow')}</button></form>`
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
    card.querySelector('input').checked = true
    const form = backdrop.querySelector('#popup-register-form')
    if (card.dataset.portal === 'user') {
      form.dataset.portal = 'user'
      registerPopup.querySelector('.auth-register-stepper').style.display = 'none'
      registerPopup.querySelector('form > label').style.display = 'none'
      registerPopup.querySelector('.auth-form-heading h2').textContent = 'User Registration'
      registerPopup.querySelector('.auth-form-heading p').textContent = 'Find the best healthcare assistance for your needs.'
      form.innerHTML = userRegistrationMarkup({})

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
    backdrop.querySelector('.auth-register-fields').innerHTML = registrationFieldsMarkup(card.dataset.portal)
    registerPopup.querySelector('.auth-form-heading h2').textContent = `${portalLabel(card.dataset.portal)} registration details`
    registerPopup.querySelector('.auth-form-heading p').textContent = 'Add the details needed to verify your portal account.'
    registerPopup.querySelector('.auth-register-stepper span:first-child').classList.replace('is-active', 'is-complete')
    registerPopup.querySelector('.auth-register-stepper span:last-child').classList.add('is-active')
  }))
  } else if (!isPortalLogin) {
    bindLoginRoleToggle(backdrop)
  }

  const form = backdrop.querySelector('form')
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
      if (values.password !== values.confirmPassword) {
        form.querySelector('input[name="confirmPassword"]').setCustomValidity('Passwords do not match')
        form.querySelector('input[name="confirmPassword"]').reportValidity()
        return
      }
      if (!/^\d{10}$/.test(values.mobile.trim())) {
        form.querySelector('input[name="mobile"]').setCustomValidity('Enter a valid 10-digit mobile number')
        form.querySelector('input[name="mobile"]').reportValidity()
        return
      }
      const oversizedFile = ['idProof', 'profilePhoto'].map(name => values[name]).find(file => file?.size > 5 * 1024 * 1024)
      if (oversizedFile) {
        form.querySelector('input[type="file"]').setCustomValidity('Each file must be smaller than 5MB')
        form.querySelector('input[type="file"]').reportValidity()
        return
      }
      setBusy(form, true)
      clearFormError(form)
      try {
        const reg = await register({
          name: `${values.firstName} ${values.lastName}`.trim(),
          email: values.email.trim(),
          mobile: values.mobile.trim(),
          password: values.password,
          role: 'patient',
        })
        setSession(reg.token, reg.user)
        const popup = backdrop.querySelector('.auth-popup')
        popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>Welcome, ${values.firstName}!</h2><p>Your user account is ready. You can now book appointments, access prescriptions, and manage your health records.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
        popup.querySelector('.auth-popup-close').addEventListener('click', close)
        popup.querySelector('[data-close-registration]').addEventListener('click', () => {
          close()
          if (modalCtx.navigate) modalCtx.navigate('home')
        })
        modalCtx.showToast?.('Registration complete. Welcome to Tatito Health+!')
      } catch (err) {
        modalCtx.showToast?.(err.message || 'Unable to create account.')
      } finally {
        setBusy(form, false)
      }
    } else if (!isPortalLogin && form.dataset.portal === 'doctor') {
      ['idProof', 'profilePhoto', 'degreeCert', 'enrollmentCert', 'licenseCert'].forEach(fn => {
        if (values[fn] && values[fn] instanceof File && !values[fn].name && form._doctorValues?.[fn]) {
          values[fn] = form._doctorValues[fn]
        }
      })
      form._doctorValues = { ...form._doctorValues, ...values }
      const stage = form.dataset.stage
      if (stage === 'personal' && values.password !== values.confirmPassword) {
        form.querySelector('input[name="confirmPassword"]').setCustomValidity('Passwords do not match')
        form.querySelector('input[name="confirmPassword"]').reportValidity()
        return
      }
      if (stage === 'personal') {
        const oversizedFile = ['idProof', 'profilePhoto'].map(name => values[name]).find(file => file?.size > 5 * 1024 * 1024)
        if (oversizedFile) {
          form.querySelector('input[type="file"]').setCustomValidity('Each file must be smaller than 5MB')
          form.querySelector('input[type="file"]').reportValidity()
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
      }
      if (stage === 'practice') {
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

        const licenseCertFile = values.licenseCert || form._doctorValues?.licenseCert
        if (!licenseCertFile || (licenseCertFile instanceof File && !licenseCertFile.name)) {
          modalCtx.showToast('Please upload your medical license or registration certificate.')
          return
        }
        if (licenseCertFile instanceof File && licenseCertFile.size > 5 * 1024 * 1024) {
          modalCtx.showToast('License certificate file must be smaller than 5MB.')
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
        const days = formData.getAll('availableDays')
        if (days.length === 0) {
          modalCtx.showToast('Please select at least one available day.')
          return
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
        values.consultationMode = modes.join(', ')
        values.availableDays = days.join(', ')
        values.sameAsCurrent = sameAsCurrent
        if (sameAsCurrent) {
          values.permAddress = values.currentAddress
          values.permState = values.currentState
          values.permDistrict = values.currentDistrict
          values.permCity = values.currentCity
          values.permPincode = values.currentPincode
        }
        values.city = values.currentCity || values.city || ''
        values.address = values.currentAddress || values.address || ''
      }
      form._doctorValues = { ...form._doctorValues, ...values }
      const nextStage = doctorStageKeys[doctorStageIndex(stage) + 1]
      if (nextStage) {
        setDoctorStage(backdrop.querySelector('.auth-popup-register'), form, nextStage, form._doctorValues, modalCtx)
        return
      }
      setBusy(form, true)
      clearFormError(form)
      try {
        const dv = form._doctorValues || {}
        const reg = await register({
          name: `${dv.firstName || ''} ${dv.lastName || ''}`.trim(),
          email: (dv.email || '').trim(),
          mobile: String(dv.phone || dv.mobile || '').trim(),
          password: dv.password || '',
          role: 'doctor',
          specialty: dv.specialty || (dv.primarySpecialization || '').split(',')[0]?.trim() || '',
          city: dv.city || dv.currentCity || '',
        })
        setSession(reg.token, reg.user)
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
