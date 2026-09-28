import { icon } from './ui.js'

/**
 * Opens the NMC Indian Medical Register verification modal.
 * 
 * @param {string} regNo - Registration number entered by the doctor.
 * @param {Function} onSelectDoctor - Callback when a doctor is selected/submitted.
 * @param {Function} onManualContinue - Callback when user chooses to continue manually.
 */
export async function openNmcVerificationModal(regNo, onSelectDoctor, onManualContinue, onClose) {
  const existing = document.querySelector('.nmc-modal-backdrop')
  if (existing) existing.remove()

  let isSubmitted = false
  const markSubmitted = () => { isSubmitted = true }

  const backdrop = document.createElement('div')
  backdrop.className = 'nmc-modal-backdrop'
  backdrop.innerHTML = `
    <div class="nmc-modal-container" role="dialog" aria-modal="true" aria-label="View IMR Details">
      <header class="nmc-modal-header">
        <div class="nmc-modal-title">
          <h3>View IMR Details</h3>
        </div>
        <button type="button" class="nmc-modal-close" id="nmc-close-btn" aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>
      <div class="nmc-modal-body" id="nmc-modal-body">
        <div class="nmc-loading-state">
          <div class="nmc-spinner"></div>
          <p>Connecting to Indian Medical Register (NMC)...</p>
          <small>Querying registration number: <strong>${escapeHtml(regNo)}</strong></small>
        </div>
      </div>
      <footer class="nmc-modal-footer" id="nmc-modal-footer" style="display: none;"></footer>
    </div>
  `

  document.body.appendChild(backdrop)

  const closeModal = () => {
    backdrop.remove()
    document.removeEventListener('keydown', onKeyDown)
    if (!isSubmitted && typeof onClose === 'function') {
      onClose()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeModal()
  }
  document.addEventListener('keydown', onKeyDown)

  backdrop.querySelector('#nmc-close-btn').addEventListener('click', closeModal)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal()
  })

  const bodyEl = backdrop.querySelector('#nmc-modal-body')
  const footerEl = backdrop.querySelector('#nmc-modal-footer')

  try {
    // Call Django backend endpoint
    const response = await fetch('http://127.0.0.1:8000/api/v1/imr/verify/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ registration_no: regNo, page: 1, per_page: 25 })
    })

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`)
    }

    const data = await response.json()
    renderModalContent(regNo, data, bodyEl, footerEl, onSelectDoctor, onManualContinue, closeModal, markSubmitted)
  } catch (err) {
    console.warn('NMC live request failed, using client fallback:', err)
    // Fallback if backend server not reachable or network issue
    renderNoMatchState(bodyEl, footerEl, onManualContinue, closeModal, markSubmitted)
  }
}

function renderModalContent(regNo, data, bodyEl, footerEl, onSelectDoctor, onManualContinue, closeModal, markSubmitted) {
  const status = data.status || 'no_match'

  if (status === 'single_match' && data.doctor) {
    // Case A: Exactly 1 doctor found -> directly show detail window with Submit button
    renderSingleDoctorDetail(data.doctor, bodyEl, footerEl, onSelectDoctor, closeModal, null, markSubmitted)
  } else if (status === 'multiple_matches' && data.doctors && data.doctors.length > 0) {
    // Case B: Multiple doctors found -> show table list with pagination matching official NMC portal
    const pagination = data.pagination || {
      total: data.count || data.doctors.length,
      count: data.doctors.length,
      per_page: 25,
      current_page: 1,
      total_pages: Math.ceil((data.count || data.doctors.length) / 25)
    }
    renderMultipleDoctorsList(regNo, data.doctors, bodyEl, footerEl, onSelectDoctor, closeModal, pagination, markSubmitted)
  } else {
    // Case C: 0 doctors found -> prompt continue manually with Submit button
    renderNoMatchState(bodyEl, footerEl, onManualContinue, closeModal, markSubmitted)
  }
}

/**
 * Case A / Detail View: Displays the full "View IMR Details" popup matching Images 3 & 4.
 */
function renderSingleDoctorDetail(doctor, bodyEl, footerEl, onSelectDoctor, closeModal, onBackToList = null, markSubmitted = null) {
  footerEl.style.display = 'flex'
  footerEl.innerHTML = `<button type="button" class="button button-primary nmc-btn-submit-action" id="nmc-footer-submit">Submit</button>`

  bodyEl.innerHTML = `
    ${onBackToList ? `<button type="button" class="nmc-back-link" id="nmc-back-to-list">&larr; Back to Results List</button>` : ''}
    <div class="nmc-detail-grid">
      <div class="nmc-cell-label">Name</div>
      <div class="nmc-cell-value"><strong>${escapeHtml(doctor.name || '—')}</strong></div>

      <div class="nmc-cell-label">Father/Husband Name</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.father_name || '—')}</div>

      <div class="nmc-cell-label">Date of Birth</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.dob || '—')}</div>
      <div class="nmc-cell-label">Year of Info</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.year_of_info || '—')}</div>

      <div class="nmc-cell-label">Registration No</div>
      <div class="nmc-cell-value"><strong>${escapeHtml(doctor.registration_no || '—')}</strong></div>
      <div class="nmc-cell-label">Date of Reg.</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.date_of_reg || '—')}</div>

      <div class="nmc-cell-label">UPRN No</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.uprn_no || 'N/A')}</div>
      <div class="nmc-cell-label">State Medical Council</div>
      <div class="nmc-cell-value"><strong>${escapeHtml(doctor.state_medical_council || '—')}</strong></div>

      <div class="nmc-cell-label">Qualification</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.qualification || 'MBBS')}</div>
      <div class="nmc-cell-label">Qualification Year</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.qualification_year || '—')}</div>

      <div class="nmc-cell-label">University Name</div>
      <div class="nmc-cell-value" style="grid-column: span 3;">${escapeHtml(doctor.university_name || '—')}</div>

      <div class="nmc-section-header">Additional Qualification :- 1</div>
      <div class="nmc-cell-label">Qualification</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_1?.qualification || '—')}</div>
      <div class="nmc-cell-label">Qualification Year</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_1?.qualification_year || '—')}</div>
      <div class="nmc-cell-label">University Name</div>
      <div class="nmc-cell-value" style="grid-column: span 3;">${escapeHtml(doctor.additional_qualification_1?.university_name || '—')}</div>

      <div class="nmc-section-header">Additional Qualification :- 2</div>
      <div class="nmc-cell-label">Qualification</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_2?.qualification || '—')}</div>
      <div class="nmc-cell-label">Qualification Year</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_2?.qualification_year || '—')}</div>
      <div class="nmc-cell-label">University Name</div>
      <div class="nmc-cell-value" style="grid-column: span 3;">${escapeHtml(doctor.additional_qualification_2?.university_name || '—')}</div>

      <div class="nmc-section-header">Additional Qualification :- 3</div>
      <div class="nmc-cell-label">Qualification</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_3?.qualification || '—')}</div>
      <div class="nmc-cell-label">Qualification Year</div>
      <div class="nmc-cell-value">${escapeHtml(doctor.additional_qualification_3?.qualification_year || '—')}</div>
      <div class="nmc-cell-label">University Name</div>
      <div class="nmc-cell-value" style="grid-column: span 3;">${escapeHtml(doctor.additional_qualification_3?.university_name || '—')}</div>

      <div class="nmc-section-header">Permanent Address</div>
      <div class="nmc-cell-label">Permanent Address</div>
      <div class="nmc-cell-value" style="grid-column: span 3;">${escapeHtml(doctor.permanent_address || '—')}</div>
    </div>
  `

  scrollModalToTop(bodyEl)

  if (onBackToList) {
    bodyEl.querySelector('#nmc-back-to-list')?.addEventListener('click', onBackToList)
  }

  // Handle Submit button
  const submitBtn = footerEl.querySelector('#nmc-footer-submit')
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (typeof markSubmitted === 'function') markSubmitted()
      closeModal()
      if (onSelectDoctor) onSelectDoctor(doctor)
    })
  }
}

/**
 * Generates page numbers list matching official NMC pagination style:
 * [1, 2, 3, 4, '...', totalPages]
 */
function generatePaginationList(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages]
  }

  if (currentPage === 4) {
    return [1, 2, 3, 4, 5, '...', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
}

/**
 * Case B: Multiple Doctors Table List with Pagination (matching Image 2 & user screenshot)
 * No submit button is shown in list view; appears once a doctor's view is opened.
 */
function renderMultipleDoctorsList(regNo, doctors, bodyEl, footerEl, onSelectDoctor, closeModal, pagination, markSubmitted = null) {
  footerEl.style.display = 'none'
  footerEl.innerHTML = ''

  const total = Number(pagination?.total || doctors.length)
  const currentPage = Number(pagination?.current_page || 1)
  const perPage = Number(pagination?.per_page || 25)
  const totalPages = Number(pagination?.total_pages || Math.max(1, Math.ceil(total / perPage)))

  const from = Math.min(((currentPage - 1) * perPage) + 1, total)
  const to = Math.min(currentPage * perPage, total)

  const pagesList = generatePaginationList(currentPage, totalPages)

  bodyEl.innerHTML = `
    <div class="nmc-table-wrapper" id="nmc-table-wrapper">
      <table class="nmc-results-table">
        <thead>
          <tr>
            <th>Sl No</th>
            <th>Year of Info</th>
            <th>Registration No</th>
            <th>State Medical Council</th>
            <th>Name</th>
            <th>Father Name</th>
            <th style="text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${doctors.map((doc, idx) => `
            <tr>
              <td>${doc.sl_no || from + idx}</td>
              <td>${escapeHtml(doc.year_of_info || '—')}</td>
              <td><strong>${escapeHtml(doc.registration_no || '—')}</strong></td>
              <td>${escapeHtml(doc.state_medical_council || '—')}</td>
              <td><strong>${escapeHtml(doc.name || '—')}</strong></td>
              <td>${escapeHtml(doc.father_name || '—')}</td>
              <td style="text-align: center;">
                <button type="button" class="nmc-btn-view-row" data-row-idx="${idx}">
                  View
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="nmc-pagination-footer">
      <div class="nmc-pagination-info-group">
        <div class="nmc-showing-entries">
          Showing ${from} to ${to} of ${total.toLocaleString()} entries
        </div>
        <div class="nmc-total-records-pill">
          Total Records : ${total.toLocaleString()}
        </div>
      </div>
      <div class="nmc-pagination-nav" role="navigation" aria-label="IMR Doctor Pagination">
        <button type="button" class="nmc-page-btn nmc-page-prev" ${currentPage <= 1 ? 'disabled' : ''} data-target-page="${currentPage - 1}">
          Previous
        </button>
        ${pagesList.map(p => {
          if (p === '...') {
            return `<span class="nmc-page-ellipsis">...</span>`
          }
          const isActive = Number(p) === Number(currentPage)
          return `<button type="button" class="nmc-page-btn nmc-page-num ${isActive ? 'is-active' : ''}" data-target-page="${p}" ${isActive ? 'aria-current="page"' : ''}>${p}</button>`
        }).join('')}
        <button type="button" class="nmc-page-btn nmc-page-next" ${currentPage >= totalPages ? 'disabled' : ''} data-target-page="${currentPage + 1}">
          Next
        </button>
      </div>
    </div>
  `

  scrollModalToTop(bodyEl)

  // Attach click to View buttons
  bodyEl.querySelectorAll('.nmc-btn-view-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.rowIdx, 10)
      const selected = doctors[idx]
      renderSingleDoctorDetail(selected, bodyEl, footerEl, onSelectDoctor, closeModal, () => {
        renderMultipleDoctorsList(regNo, doctors, bodyEl, footerEl, onSelectDoctor, closeModal, pagination, markSubmitted)
      }, markSubmitted)
    })
  })

  // Attach click to Pagination buttons
  bodyEl.querySelectorAll('.nmc-page-btn[data-target-page]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.classList.contains('is-active')) return
      const targetPage = parseInt(btn.dataset.targetPage, 10)
      if (!targetPage || targetPage === currentPage || targetPage < 1 || targetPage > totalPages) return

      const tableWrapper = bodyEl.querySelector('#nmc-table-wrapper')
      if (tableWrapper) tableWrapper.classList.add('is-table-loading')

      // Disable buttons while fetching
      bodyEl.querySelectorAll('.nmc-page-btn').forEach(b => { b.disabled = true })

      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/imr/verify/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registration_no: regNo, page: targetPage, per_page: 25 })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const pageData = await res.json()
        if (pageData.doctors && pageData.doctors.length > 0) {
          const newPagination = {
            ...(pageData.pagination || {}),
            total: pageData.pagination?.total || pageData.count || total,
            count: pageData.doctors.length,
            per_page: perPage,
            current_page: targetPage,
            total_pages: pageData.pagination?.total_pages || totalPages
          }
          renderMultipleDoctorsList(regNo, pageData.doctors, bodyEl, footerEl, onSelectDoctor, closeModal, newPagination, markSubmitted)
        }
      } catch (err) {
        console.warn('Pagination request error:', err)
      } finally {
        if (tableWrapper) tableWrapper.classList.remove('is-table-loading')
      }
    })
  })
}

/**
 * Case C: No Match Found State
 */
function renderNoMatchState(bodyEl, footerEl, onManualContinue, closeModal, markSubmitted = null) {
  footerEl.style.display = 'flex'
  footerEl.innerHTML = `<button type="button" class="button button-primary nmc-btn-submit-action" id="nmc-footer-submit">Submit</button>`

  bodyEl.innerHTML = `
    <div class="nmc-no-match-card">
      <div class="nmc-no-match-icon">${icon('shield') || 'ℹ'}</div>
      <h4>No practitioner record found with this registration number.</h4>
      <p class="nmc-no-match-prompt">Would you like to continue manually?</p>
    </div>
  `

  scrollModalToTop(bodyEl)

  const submitBtn = footerEl.querySelector('#nmc-footer-submit')
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (typeof markSubmitted === 'function') markSubmitted()
      closeModal()
      if (onManualContinue) onManualContinue()
    })
  }
}

function scrollModalToTop(el) {
  if (!el) return
  el.scrollTop = 0
  if (typeof el.scrollTo === 'function') {
    try {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch (_) {
      el.scrollTop = 0
    }
  }
  requestAnimationFrame(() => {
    if (el) el.scrollTop = 0
  })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
