import { icon } from './ui.js'
import { loginWithMobile, registerPortal } from './auth.js'
import { portalOptions, portalRegistrationFields } from './portals.js'

function registrationFieldsMarkup(type) {
  return portalRegistrationFields[type].map(([name, label, inputType, placeholder]) => `<div><label for="popup-${name}">${label}</label><input class="auth-text-input" id="popup-${name}" name="${name}" type="${inputType}" autocomplete="${inputType === 'email' ? 'email' : 'off'}" placeholder="${placeholder}" ${name === 'password' ? 'minlength="8"' : ''} required></div>`).join('')
}

function portalLabel(type) {
  return portalOptions.find(option => option.value === type)?.label || 'Portal'
}

const doctorStages = ['PERSONAL', 'VERIFICATION', 'EDUCATION', 'PRACTICE & CAREER', 'LOCATION', 'REVIEW']
const doctorStageKeys = ['personal', 'verification', 'education', 'practice', 'location', 'review']

function doctorStepperMarkup(activeStage) {
  return doctorStages.map((stage, index) => `<span class="${index < activeStage ? 'is-complete' : index === activeStage ? 'is-active' : ''}">${index + 1}<small>${stage}</small></span>${index < doctorStages.length - 1 ? '<i></i>' : ''}`).join('')
}

function doctorStageMarkup(stage, values = {}) {
  const fields = {
    personal: [['firstName', 'FIRST NAME*', 'text', values.firstName || '', 'Enter first name'], ['lastName', 'LAST NAME*', 'text', values.lastName || '', 'Enter last name'], ['gender', 'GENDER*', 'select', values.gender || '', 'Select gender'], ['dateOfBirth', 'DATE OF BIRTH*', 'date', values.dateOfBirth || '', ''], ['phone', 'MOBILE NUMBER*', 'tel', values.phone || '', '10-digit mobile number'], ['email', 'EMAIL*', 'email', values.email || '', 'doctor@practice.com'], ['password', 'PASSWORD*', 'password', '', 'Create password'], ['confirmPassword', 'CONFIRM PASSWORD*', 'password', '', 'Confirm password'], ['idType', 'ID PROOF TYPE*', 'select', values.idType || '', 'Select document'], ['idProof', 'UPLOAD ID PROOF*', 'file', '', 'Click to upload'], ['profilePhoto', 'PROFILE PHOTO*', 'file-image', '', 'Click to upload your profile photo'], ['referralCode', 'Have a Referral Code?', 'text', values.referralCode || '', 'Enter referral code']],
    verification: [['code', 'Verification code', 'text', '', 'Enter 6-digit code']],
    education: [['degree', 'Medical degree', 'text', values.degree || '', 'e.g. MBBS, MD'], ['university', 'University / institution', 'text', values.university || '', 'Enter institution'], ['graduationYear', 'Graduation year', 'number', values.graduationYear || '', 'YYYY']],
    practice: [['license', 'Medical license number', 'text', values.license || '', 'Enter license number'], ['specialty', 'Primary specialty', 'text', values.specialty || '', 'e.g. Cardiology'], ['experience', 'Years of experience', 'number', values.experience || '', 'Years']],
    location: [['city', 'Practice city', 'text', values.city || '', 'Enter city'], ['address', 'Practice address', 'text', values.address || '', 'Street and area']]
  }
  if (stage === 'review') {
    return `<input type="hidden" name="portal" value="doctor"><div class="doctor-review-list"><div><span>Doctor</span><strong>${values.firstName || ''} ${values.lastName || ''}</strong></div><div><span>Specialty</span><strong>${values.specialty || 'Not provided'}</strong></div><div><span>Medical license</span><strong>${values.license || 'Not provided'}</strong></div><div><span>Practice location</span><strong>${values.city || 'Not provided'}</strong></div><div><span>Professional email</span><strong>${values.email || 'Not provided'}</strong></div></div><button class="button button-primary auth-submit" type="submit">Submit for verification ${icon('check')}</button>`
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
    return `<div class="doctor-upload-field"><label for="doctor-${name}">${label}</label><label class="doctor-upload-control" for="doctor-${name}">${icon('plus')}<span>${placeholder}</span><small>${hint}</small></label><input id="doctor-${name}" name="${name}" type="file" accept="${accept}" required></div>`
  }
  const pattern = name === 'code' ? 'inputmode="numeric" maxlength="6" pattern="[0-9]{6}"' : ''
  return `<div><label for="doctor-${name}">${label}</label><input class="auth-text-input" id="doctor-${name}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${pattern} required></div>`
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
    registerPortal(values)
    popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>${portal} portal is ready</h2><p>Your details have been verified. You can now use your portal workspace.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
    popup.querySelector('.auth-popup-close').addEventListener('click', close)
    popup.querySelector('[data-close-registration]').addEventListener('click', close)
    ctx.showToast(`${portal} registration verified.`)
  })
}

function authShell(content, active, ctx) {
  return `<main class="auth-page"><div class="auth-page-top"><a class="brand" data-nav="home"><span class="brand-mark">${icon('heart')}</span><span><strong>Tatito</strong><em>Health+</em></span></a><span class="auth-page-status">${icon('shield')} Private & secure</span></div><section class="auth-form-card">${content}<div class="auth-switch">${active === 'login' ? 'New to Tatito?' : 'Already have a portal account?'} <button data-nav="${active === 'login' ? 'register' : 'login'}">${active === 'login' ? 'Register a portal account' : 'Log in'}</button></div></section><p class="auth-page-footer">By continuing, you agree to Tatito Health+ terms and privacy policy.</p></main>`
}

function bindAuthNav(root, ctx) {
  root.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', event => {
    event.preventDefault()
    ctx.navigate(el.dataset.nav)
  }))
}

export function openAuthModal(mode = 'login', ctx) {
  const existing = document.querySelector('.auth-popup-backdrop')
  if (existing) existing.remove()
  const isLogin = mode === 'login' || mode === 'portal-login'
  const isPortalLogin = mode === 'portal-login'
  const content = isLogin
    ? `<div class="auth-popup-grid"><aside class="auth-popup-visual"><span class="auth-popup-brand">${icon('heart')} Tatito Health+</span><div class="auth-heartbeat"><svg viewBox="0 0 500 120" aria-hidden="true"><path class="auth-heartbeat-track" d="M0 60h110l18-1 15-45 20 90 20-44 18 0h52l18-1 15-45 20 90 20-44 18 0h110"/><path class="auth-heartbeat-line" d="M0 60h110l18-1 15-45 20 90 20-44 18 0h52l18-1 15-45 20 90 20-44 18 0h110"/></svg></div><div class="auth-visual-copy"><span>Care, connected</span><h3>Keep your health<br>moving forward.</h3><p>Secure access to the care that follows you.</p></div><span class="auth-visual-security">${icon('shield')} Protected healthcare access</span></aside><div class="auth-popup-form"><button class="auth-popup-back" type="button" data-popup-mode="${isPortalLogin ? 'login' : 'portal-login'}">${isPortalLogin ? `${icon('chevron')} Patient login` : 'Portal login'}</button><div class="auth-form-heading"><span class="auth-form-kicker">${isPortalLogin ? 'Partner access' : 'Patient access'}</span><h2>${isPortalLogin ? 'Log in to your portal' : 'Log in to your care'}</h2><p>${isPortalLogin ? 'Use your work email to access your workspace.' : 'Use your mobile number to continue securely.'}</p></div>${isPortalLogin ? `<form class="auth-form" id="popup-portal-login-form"><label for="popup-portal-email">Work email</label><input class="auth-text-input" id="popup-portal-email" name="email" type="email" autocomplete="email" placeholder="name@organisation.com" required><label for="popup-portal-password">Password</label><input class="auth-text-input" id="popup-portal-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button class="button button-primary auth-submit" type="submit">Log in to portal ${icon('arrow')}</button></form>` : `<form class="auth-form" id="popup-login-form"><label for="popup-mobile">Mobile number</label><div class="auth-mobile-field"><span>+91</span><input id="popup-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile number" maxlength="10" required></div><p class="auth-form-hint">We will send a one-time verification code to this number.</p><button class="button button-primary auth-submit" type="submit">Continue with mobile ${icon('arrow')}</button></form>`}<div class="auth-divider"><span>${isPortalLogin ? 'New partner?' : 'For care partners'}</span></div><button class="auth-portal-link" type="button" data-popup-mode="${isPortalLogin ? 'register' : 'portal-login'}">${isPortalLogin ? 'Register a portal account' : 'Login to portal'} ${icon('arrow')}</button></div></div>`
    : `<div class="auth-form-heading"><div class="auth-register-stepper"><span class="is-active">1 <small>Choose portal</small></span><i></i><span>2 <small>Verify details</small></span></div><span class="auth-form-kicker">Partner access</span><h2>Register your portal</h2><p>Choose your portal first, then tell us about yourself.</p></div><form class="auth-form" id="popup-register-form" data-stage="details"><label>Choose portal type</label><div class="portal-category-grid">${portalOptions.map(option => `<label class="portal-category-card" data-portal="${option.value}"><input type="radio" name="portal" value="${option.value}" required><span class="portal-category-icon">${icon(option.icon)}</span><span><strong>${option.label}</strong><small>${option.detail}</small></span></label>`).join('')}</div><div class="auth-register-fields">${registrationFieldsMarkup('hospital')}</div><button class="button button-primary auth-submit" type="submit">Continue to verification ${icon('arrow')}</button></form><div class="auth-switch">Already have a portal account? <button type="button" data-popup-mode="portal-login">Log in</button></div>`

  const backdrop = document.createElement('div')
  backdrop.className = 'auth-popup-backdrop'
  backdrop.innerHTML = `<section class="auth-popup ${isLogin ? 'auth-popup-login' : 'auth-popup-register'}" role="dialog" aria-modal="true" aria-label="${isLogin ? 'Login' : 'Portal registration'}"><button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button>${content}</section>`
  document.body.appendChild(backdrop)
  const close = () => backdrop.remove()
  backdrop.querySelector('.auth-popup-close').addEventListener('click', close)
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
  backdrop.querySelectorAll('[data-popup-mode]').forEach(button => button.addEventListener('click', () => openAuthModal(button.dataset.popupMode, ctx)))
  backdrop.querySelectorAll('.portal-category-card').forEach(card => card.addEventListener('click', () => {
    const registerPopup = backdrop.querySelector('.auth-popup-register')
    registerPopup.classList.add('register-details-open')
    card.querySelector('input').checked = true
    const form = backdrop.querySelector('#popup-register-form')
    if (card.dataset.portal === 'doctor') {
      form.dataset.portal = 'doctor'
      form._doctorValues = { portal: 'doctor' }
      registerPopup.querySelector('.auth-register-stepper').innerHTML = doctorStepperMarkup(0)
      registerPopup.querySelector('form > label').style.display = 'none'
      setDoctorStage(registerPopup, form, 'personal', form._doctorValues, ctx)
      return
    }
    backdrop.querySelector('.auth-register-fields').innerHTML = registrationFieldsMarkup(card.dataset.portal)
    registerPopup.querySelector('.auth-form-heading h2').textContent = `${portalLabel(card.dataset.portal)} registration details`
    registerPopup.querySelector('.auth-form-heading p').textContent = 'Add the details needed to verify your portal account.'
    registerPopup.querySelector('.auth-register-stepper span:first-child').classList.replace('is-active', 'is-complete')
    registerPopup.querySelector('.auth-register-stepper span:last-child').classList.add('is-active')
  }))

  const form = backdrop.querySelector('form')
  form.addEventListener('submit', event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form))
    if (mode === 'login') {
      if (!/^\d{10}$/.test(values.mobile.trim())) { form.querySelector('input').setCustomValidity('Enter a valid 10-digit mobile number'); form.querySelector('input').reportValidity(); return }
      const { resumed } = loginWithMobile(values.mobile.trim())
      close()
      ctx.showToast('You are now logged in.')
      if (!resumed) ctx.navigate('home')
    } else if (!isPortalLogin && form.dataset.portal === 'doctor') {
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
      const nextStage = doctorStageKeys[doctorStageIndex(stage) + 1]
      if (nextStage) {
        setDoctorStage(backdrop.querySelector('.auth-popup-register'), form, nextStage, form._doctorValues, ctx)
        return
      }
      registerPortal({ ...form._doctorValues, name: `${form._doctorValues.firstName} ${form._doctorValues.lastName}` })
      const popup = backdrop.querySelector('.auth-popup')
      popup.innerHTML = `<button class="auth-popup-close" type="button" aria-label="Close">${icon('cross')}</button><div class="auth-registration-success"><span class="auth-success-icon">${icon('check')}</span><span class="auth-form-kicker">Registration complete</span><h2>Doctor portal is ready</h2><p>Your profile has been submitted and verified. You can now use your doctor workspace.</p><button class="button button-primary auth-submit" type="button" data-close-registration>Continue to Tatito ${icon('arrow')}</button></div>`
      popup.querySelector('.auth-popup-close').addEventListener('click', close)
      popup.querySelector('[data-close-registration]').addEventListener('click', close)
      ctx.showToast('Doctor registration verified.')
    } else if (!isPortalLogin) {
      renderRegistrationVerification(backdrop, ctx, values, close)
    } else {
      localStorage.setItem('tatito-health-user', JSON.stringify({ name: 'Portal Admin', initials: 'PA', email: values.email, type: 'portal' }))
      close()
      ctx.showToast('Portal login successful.')
      ctx.navigate('home')
    }
  })
}

export function renderLogin(appRoot, ctx) {
  appRoot.innerHTML = authShell(`<div class="auth-form-heading"><span class="auth-form-kicker">Patient access</span><h2>Log in to your care</h2><p>Use your mobile number to continue securely.</p></div><form class="auth-form" id="patient-login-form"><label for="patient-mobile">Mobile number</label><div class="auth-mobile-field"><span>+91</span><input id="patient-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile number" maxlength="10" required></div><p class="auth-form-hint">We will send a one-time verification code to this number.</p><button class="button button-primary auth-submit" type="submit">Continue with mobile ${icon('arrow')}</button></form><div class="auth-divider"><span>For care partners</span></div><button class="auth-portal-link" data-nav="register">Register or access a portal account ${icon('arrow')}</button>`, 'login', ctx)
  bindAuthNav(appRoot, ctx)
  appRoot.querySelector('#patient-login-form').addEventListener('submit', event => {
    event.preventDefault()
    const mobile = new FormData(event.currentTarget).get('mobile').trim()
    if (!/^\d{10}$/.test(mobile)) {
      appRoot.querySelector('#patient-mobile').setCustomValidity('Enter a valid 10-digit mobile number')
      appRoot.querySelector('#patient-mobile').reportValidity()
      return
    }
    const { resumed } = loginWithMobile(mobile)
    ctx.showToast('You are now logged in.')
    if (!resumed) ctx.navigate('home')
  })
}

export function renderRegister(appRoot, ctx) {
  appRoot.innerHTML = authShell(`<div class="auth-form-heading"><span class="auth-form-kicker">Partner access</span><h2>Register your portal</h2><p>For hospitals, doctors, clinics, diagnostics, and pharmacies.</p></div><form class="auth-form" id="portal-register-form"><label for="portal-name">Full name</label><input class="auth-text-input" id="portal-name" name="name" type="text" autocomplete="name" placeholder="Enter your full name" required><label for="portal-type">Portal type</label><select class="auth-text-input" id="portal-type" name="portal" required><option value="">Select your organisation type</option><option value="hospital">Hospital</option><option value="doctor">Doctor</option><option value="clinic">Clinic</option><option value="diagnostic">Diagnostic centre</option><option value="pharmacy">Pharmacy</option></select><label for="portal-email">Work email</label><input class="auth-text-input" id="portal-email" name="email" type="email" autocomplete="email" placeholder="name@organisation.com" required><label for="portal-password">Create password</label><input class="auth-text-input" id="portal-password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8" required><button class="button button-primary auth-submit" type="submit">Create portal account ${icon('arrow')}</button></form>`, 'register', ctx)
  bindAuthNav(appRoot, ctx)
  appRoot.querySelector('#portal-register-form').addEventListener('submit', event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const { resumed } = registerPortal(values)
    ctx.showToast('Portal account created.')
    if (!resumed) ctx.navigate(`${values.portal}-portal`)
  })
}
