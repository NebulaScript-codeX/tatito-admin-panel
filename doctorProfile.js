import { icon, avatar } from './ui.js'
import { getAuthUser, getAuthToken, logoutUser } from './auth.js'
import { getDoctor, updateDoctor, deleteDoctor } from './api.js'
import { doctorSpecialties, doctorCities } from './data.js'
import { invalidate } from './doctorCache.js'

const SPECIALTY_NAMES = [...new Set(doctorSpecialties.map((s) => s.name))]
const TYPE_OPTIONS = ['Online Video', 'In Person Clinic', 'Online & In-Person']

function detailLine(q, e) {
  const parts = []
  if (q && q.trim()) parts.push(q.trim())
  if (e && e.trim()) parts.push(e.trim())
  return parts.join(' · ')
}

function esc(v) {
  return String(v ?? '').replace(/"/g, '&quot;')
}

function field(name, label, value, opts = {}) {
  const { type = 'text', hint = '', required = false, min } = opts
  const req = required ? ' required' : ''
  const minAttr = min !== undefined ? ` min="${min}"` : ''
  return `
    <div class="dp-field">
      <label for="dp-${name}">${label}</label>
      <input class="auth-text-input" id="dp-${name}" name="${name}" type="${type}" value="${esc(value)}"${req}${minAttr}>
      ${hint ? `<small>${hint}</small>` : ''}
    </div>
  `
}

function selectField(name, label, value, options) {
  const chosen = options.includes(value) ? value : options[0]
  return `
    <div class="dp-field">
      <label for="dp-${name}">${label}</label>
      <select class="auth-text-input" id="dp-${name}" name="${name}">
        ${options.map((o) => `<option value="${esc(o)}" ${o === chosen ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </div>
  `
}

function noAccessShell(user) {
  return `<div class="app-shell"><main class="auth-page"><div class="auth-page-top"><a class="brand" data-nav="home"><span class="brand-mark">${icon('heart')}</span><span><strong>Tatito</strong><em>Health+</em></span></a></div><section class="auth-form-card"><div class="auth-form-heading"><span class="auth-form-kicker">Doctor workspace</span><h2>Doctors only</h2><p>${user && user.role === 'doctor' ? 'Your account is not yet linked to a doctor profile. Contact support to get linked.' : 'Log in with a doctor account to manage your profile.'}</p></div><button class="button button-primary auth-submit" data-nav="home">Back to Tatito ${icon('arrow')}</button></section></main></div>`
}

function fallbackProfile(id, user) {
  return {
    id,
    name: user?.name || 'Dr. Doctor',
    specialty: 'General Physician',
    city: 'Bengaluru',
    location: '',
    detail: 'MD · years experience',
    qualification: 'MD',
    experience: '',
    fee: 500,
    next: '',
    type: 'Online & In-Person',
    photo: '',
    offerText: '',
    initials: user?.initials || 'DR',
    color: 'teal',
    verified: true,
  }
}

export function renderDoctorProfile(appRoot, ctx, mode = 'profile') {
  const { navigate, showToast } = ctx
  const user = getAuthUser()

  if (!user || user.role !== 'doctor' || !user.doctorId) {
    appRoot.innerHTML = noAccessShell(user)
    bindNav(appRoot, ctx)
    return
  }

  const doctorId = user.doctorId
  const token = getAuthToken()
  appRoot.innerHTML = `<div class="app-shell"><main class="portal-page section-wrap doctor-profile-page"><div class="doctor-profile-shell" id="doctor-profile-shell"><div class="dp-loading">${icon('shield')} Loading your profile…</div></div></main></div><div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>`

  const shell = appRoot.querySelector('#doctor-profile-shell')

  function paint(doc, offline) {
    shell.innerHTML = profileMarkup(user, doc, offline)
    bindNav(shell, ctx)
    bindForm(shell, doc, offline)
  }

  getDoctor(doctorId, token)
    .then((doc) => paint(doc, false))
    .catch(() => paint(fallbackProfile(doctorId, user), true))

  function profileMarkup(u, doc, offline) {
    const message = offline
      ? '<p class="dp-offline-note">Backend offline — showing cached fields. Save will be local only.</p>'
      : doc.verified === false
        ? '<p><small class="dp-pending">This profile is pending verification with Tatito Health+.</small></p>'
        : '<p>Changes save live to your public listing.</p>'
    return `
      <div class="dp-head">
        ${doc.photo ? `<img class="dp-photo" src="${esc(doc.photo)}" alt="${esc(doc.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="dp-photo-fallback" hidden>${avatar(doc.initials || u.initials, doc.color || 'teal', 'dp-avatar')}</span>` : avatar(doc.initials || u.initials, doc.color || 'teal', 'dp-avatar')}
        <div>
          <span class="section-kicker">${icon('shield')} ${mode === 'dashboard' ? 'DOCTOR DASHBOARD' : 'DOCTOR WORKSPACE'}</span>
          <h1>${mode === 'dashboard' ? 'Doctor <em class="editorial">Dashboard</em>' : 'Manage your <em class="editorial">Doctor Profile</em>'}</h1>
          ${mode === 'dashboard' ? `<p class="dp-signed-in">Signed in as <strong>${esc(u.name)}</strong> — managing your public listing <strong>${esc(doc.name)}</strong> (${esc(doc.specialty)}).</p>` : ''}
          ${message}
        </div>
      </div>
      <form id="doctor-profile-form" class="dp-form" novalidate>
        <div class="dp-form-grid">
          ${field('name', 'Full name', doc.name, { required: true })}
          ${selectField('specialty', 'Specialty', doc.specialty, SPECIALTY_NAMES)}
          ${selectField('city', 'City', doc.city, doctorCities)}
          ${field('qualification', 'Qualification', doc.qualification || (String(doc.detail || '').split('·')[0] || '').trim(), { hint: 'e.g. MBBS, MD' })}
          ${field('experience', 'Experience', doc.experience || (String(doc.detail || '').split('·')[1] || '').trim(), { hint: 'e.g. 12 years experience' })}
          ${field('location', 'Practice location', doc.location)}
          ${field('fee', 'Consulting Fee (₹)', doc.fee, { type: 'number', min: 0 })}
          ${field('offerText', 'Offer line (shown above Book Appointment)', doc.offerText || '', { hint: 'Leave empty to hide the offer row.' })}
          ${selectField('type', 'Consultation type', doc.type, TYPE_OPTIONS)}
          ${field('next', 'Next available slot', doc.next, { hint: 'e.g. Today, 4:30 PM' })}
          ${field('photo', 'Profile photo URL', doc.photo || '')}
        </div>
        <div class="dp-actions">
          <button type="submit" class="button button-primary">Save changes ${icon('check')}</button>
          <button type="button" class="button button-outline dp-view-public" data-view-public="${esc(doc.id)}">View public profile ${icon('arrow')}</button>
          <button type="button" class="button button-quiet dp-delete" id="doctor-profile-delete">Delete profile</button>
        </div>
      </form>
    `
  }

  function bindForm(root, doc, offline) {
    const form = root.querySelector('#doctor-profile-form')
    // The page may have been re-rendered while the profile fetch was in flight
    // (e.g. the auth-changed event re-renders the current route). Only bind
    // handlers when OUR freshly painted shell is still attached to the DOM;
    // otherwise this paint is stale and there is nothing to bind to.
    if (!form || !form.isConnected) return
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const values = Object.fromEntries(new FormData(form))
      const payload = {
        name: (values.name || '').trim(),
        specialty: (values.specialty || '').trim(),
        city: (values.city || '').trim(),
        qualification: (values.qualification || '').trim(),
        experience: (values.experience || '').trim(),
        detail: detailLine(values.qualification, values.experience),
        location: (values.location || '').trim(),
        next: (values.next || '').trim(),
        type: (values.type || TYPE_OPTIONS[0]).trim(),
        photo: (values.photo || '').trim(),
        offerText: (values.offerText || '').trim(),
        fee: Number(values.fee || 0),
      }
      if (!payload.name || payload.name.length < 2) {
        showToast('Doctor name is required.')
        return
      }
      const btn = form.querySelector('.button[type="submit"]')
      btn.disabled = true
      const finish = (ok, msg) => {
        btn.disabled = false
        if (ok) {
          invalidate()
          navigate(mode === 'dashboard' ? 'doctor-dashboard' : 'doctor-profile')
          showToast(msg)
        } else {
          showToast(msg)
        }
      }
      if (offline) {
        finish(true, 'Profile saved locally (demo offline mode).')
        return
      }
      updateDoctor(doctorId, payload, token)
        .then(() => finish(true, 'Doctor profile updated.'))
        .catch((err) => finish(false, err.message || 'Update failed.'))
    })

    const delBtn = root.querySelector('#doctor-profile-delete')
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (!window.confirm('Delete this doctor profile? This cannot be undone.')) return
        delBtn.disabled = true
        const done = (msg) => {
          invalidate()
          logoutUser()
          showToast(msg)
          navigate('home')
        }
        if (offline) {
          done('Profile removed (offline demo).')
          return
        }
        deleteDoctor(doctorId, token)
          .then(() => done('Doctor profile deleted.'))
          .catch((err) => {
            delBtn.disabled = false
            showToast(err.message || 'Delete failed.')
          })
      })
    }
  }

  function bindNav(root, c) {
    if (!root) return
    root.querySelectorAll('[data-nav]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault()
        c.navigate(el.dataset.nav)
      }),
    )
    const view = root.querySelector('[data-view-public]')
    if (view) {
      view.addEventListener('click', () => c.navigate('doctor', { id: view.dataset.viewPublic }))
    }
  }
}

export function renderDoctorDashboard(appRoot, ctx) {
  renderDoctorProfile(appRoot, ctx, 'dashboard')
}