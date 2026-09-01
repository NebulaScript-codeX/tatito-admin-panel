import { icons, icon, avatar, showToast, premiumFooter, mobileBottomNav, accountDrawerHTML, openAccountDrawer, closeAccountDrawer } from './ui.js'
import { products, labTests, doctors, articles, categories, doctorSpecialties, doctorCities, doctorHealthChecks, vitalOrgans, labPackages } from './data.js'

export function sharedHeader(ctx, activeNav) {
  const { navigate, getCartCount } = ctx
  const navItems = [
    { label: 'Doctors', page: 'doctors' },
    { label: 'Pharmacy', page: 'pharmacy' },
    { label: 'Lab Tests', page: 'labtests' },
    { label: 'Health Plans', page: 'plans' },
    { label: 'Health Records', page: 'records' },
    { label: 'Internships', page: 'internships' },
    { label: 'Track Your Orders', page: 'trackyourorders' }
  ]
  return `
    <div class="announcement"><span class="announcement-dot"></span> Care that moves with you <span class="announcement-divider"></span><span>24/7 virtual care is now available</span></div>
    <div class="sticky-header-group">
      <header class="site-header"><div class="site-header-inner">
        <a class="brand" data-nav="home"><span class="brand-mark">${icon('heart')}</span><span><strong>Tatito</strong><em>Health+</em></span></a>
        <div class="header-search-bar">${icon('search')}<input id="global-search" placeholder="Search doctors, medicines, lab tests..." /><button data-nav="pharmacy">Search</button></div>
        <div class="header-actions">
          <button class="location-button">${icon('pin')} <span>Brooklyn, NY</span> ${icon('chevron')}</button>
          <button class="icon-button" aria-label="Notifications">${icon('bell')}<span class="notification-dot"></span></button>
          <button class="cart-button" data-nav="cart">${icon('bag')}<span>Cart</span><span class="cart-count">${getCartCount()}</span></button>
          <button class="profile-button">${avatar('JD', 'teal')}<span>Jordan</span>${icon('chevron')}</button>
          <button class="mobile-menu" id="page-mobile-menu" aria-label="Open menu">${icon('menu')}</button>
        </div>
      </div></header>
      <nav class="sub-nav"><div class="sub-nav-inner">${navItems.map(n => `<a data-nav="${n.page}" class="${activeNav === n.page ? 'nav-active' : ''}">${n.label}</a>`).join('')}</div></nav>
    </div>
    ${accountDrawerHTML()}
  `
}

function sharedFooter(ctx) {
  return premiumFooter()
}

function sharedMobileNav(ctx, active) {
  return mobileBottomNav(active)
}

function bindNav(appRoot, ctx) {
  const { navigate, showToast } = ctx
  appRoot.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault()
      closeAccountDrawer(appRoot)
      navigate(el.dataset.nav)
    })
  })

  const profileBtn = appRoot.querySelector('.profile-button')
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openAccountDrawer(appRoot)
    })
  }

  const closeBtn = appRoot.querySelector('#close-account-drawer')
  const overlay = appRoot.querySelector('#account-drawer-overlay')
  if (closeBtn) closeBtn.addEventListener('click', () => closeAccountDrawer(appRoot))
  if (overlay) overlay.addEventListener('click', () => closeAccountDrawer(appRoot))

  const logoutBtn = appRoot.querySelector('#drawer-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      closeAccountDrawer(appRoot)
      showToast('Logged out successfully.')
      navigate('home')
    })
  }

  const mm = appRoot.querySelector('#page-mobile-menu')
  if (mm) mm.addEventListener('click', () => appRoot.querySelector('.sub-nav-inner').classList.toggle('mobile-open'))
}

// === Product Detail Page ===
export function renderProductDetail(appRoot, ctx) {
  const { navigate, currentParams, addToCart } = ctx
  const p = products.find(p => p.id === currentParams.id)
  if (!p) { navigate('pharmacy'); return }
  const discount = Math.round((1 - p.price / p.mrp) * 100)
  const related = products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4)

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'pharmacy')}
      <main id="top" class="section-wrap detail-page">
        <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <a data-nav="pharmacy">Pharmacy</a> ${icon('chevron')} <span>${p.name}</span></div>
        <div class="product-detail-layout">
          <div class="product-detail-left">
            <div class="product-detail-image-large">
              <span class="product-avatar-xl avatar-${p.color}">${p.initials}</span>
              ${discount > 0 ? `<span class="product-discount-large">-${discount}% OFF</span>` : ''}
              ${p.rx ? '<span class="product-rx-large">Rx</span>' : ''}
            </div>
          </div>
          <div class="product-detail-right">
            <span class="product-manufacturer-large">${p.manufacturer}</span>
            <h1>${p.name}</h1>
            <div class="product-detail-rating">★ ${p.rating} <span>(${p.reviews} reviews)</span></div>
            <span class="product-pack-large">${p.pack}</span>
            <div class="product-detail-price-large">
              <strong>$${p.price.toFixed(2)}</strong>
              ${discount > 0 ? `<s>$${p.mrp.toFixed(2)}</s><span class="save-badge">Save $${(p.mrp - p.price).toFixed(2)}</span>` : ''}
            </div>
            <div class="stock-row"><span class="stock-indicator ${p.stock === 'In Stock' ? 'stock-ok' : 'stock-low'}">${icon('check')} ${p.stock}</span></div>
            ${p.rx ? `<div class="rx-banner-detail">${icon('file')} <span>Prescription required — upload yours during checkout</span></div>` : ''}
            <div class="product-detail-cta">
              <div class="qty-selector"><button id="detail-qty-dec" aria-label="Decrease">−</button><span id="detail-qty">1</span><button id="detail-qty-inc" aria-label="Increase">+</button></div>
              <button class="button button-primary" id="detail-add-cart">${icon('bag')} Add to cart</button>
              <button class="button button-outline" id="detail-buy-now">Buy now ${icon('arrow')}</button>
            </div>
            <div class="product-detail-desc">
              <h3>About this product</h3>
              <p>${p.desc}</p>
              <div class="product-tags-large">${p.tags.map(t => `<span class="product-tag">${t}</span>`).join('')}</div>
            </div>
            <div class="delivery-info">
              <div class="delivery-info-item">${icon('check')} <span><strong>Free delivery</strong> on orders over $25</span></div>
              <div class="delivery-info-item">${icon('check')} <span><strong>2-hour delivery</strong> in select cities</span></div>
              <div class="delivery-info-item">${icon('check')} <span><strong>100% authentic</strong> products guaranteed</span></div>
            </div>
          </div>
        </div>
        ${related.length > 0 ? `<section class="related-products"><h2>Related products</h2><div class="product-grid">${related.map(rp => relatedCard(rp)).join('')}</div></section>` : ''}
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, 'pharmacy')}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `

  bindNav(appRoot, ctx)
  let qty = 1
  const qtyDisplay = appRoot.querySelector('#detail-qty')
  appRoot.querySelector('#detail-qty-inc').addEventListener('click', () => { qty++; qtyDisplay.textContent = qty })
  appRoot.querySelector('#detail-qty-dec').addEventListener('click', () => { if (qty > 1) { qty--; qtyDisplay.textContent = qty } })
  appRoot.querySelector('#detail-add-cart').addEventListener('click', () => { addToCart(p.id, p, qty); })
  appRoot.querySelector('#detail-buy-now').addEventListener('click', () => { addToCart(p.id, p, qty); navigate('cart') })
  appRoot.querySelectorAll('[data-product]').forEach(el => { el.addEventListener('click', e => { if (!e.target.closest('[data-add]')) navigate('product', { id: el.dataset.product }) }) })
  appRoot.querySelectorAll('[data-add]').forEach(el => { el.addEventListener('click', e => { e.stopPropagation(); const prod = products.find(p => p.id === el.dataset.add); if (prod) addToCart(prod.id, prod) }) })
}

function relatedCard(p) {
  const discount = Math.round((1 - p.price / p.mrp) * 100)
  return `<article class="product-card" data-product="${p.id}"><div class="product-image"><span class="product-avatar avatar-${p.color}">${p.initials}</span>${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ''}</div><div class="product-info"><span class="product-manufacturer">${p.manufacturer}</span><h4 class="product-name">${p.name}</h4><span class="product-pack">${p.pack}</span><div class="product-rating">★ ${p.rating} <span>(${p.reviews})</span></div><div class="product-price-row"><div class="product-price"><strong>$${p.price.toFixed(2)}</strong>${discount > 0 ? `<s>$${p.mrp.toFixed(2)}</s>` : ''}</div><button class="add-to-cart-btn" data-add="${p.id}">${icon('plus')} Add</button></div></div></article>`
}

// === Doctors Page ===
export function renderDoctors(appRoot, ctx) {
  const { navigate, currentParams } = ctx
  let selectedSpecialty = currentParams.specialty || 'all'
  let selectedCity = currentParams.city || 'all'
  let selectedType = 'all'
  let searchQuery = currentParams.search || ''
  let sortBy = 'recommended'

  function getFilteredDoctors() {
    let list = doctors
    if (selectedSpecialty !== 'all') {
      list = list.filter(d => d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) || selectedSpecialty.toLowerCase().includes(d.specialty.toLowerCase()))
    }
    if (selectedCity !== 'all') {
      list = list.filter(d => d.city.toLowerCase() === selectedCity.toLowerCase() || d.location.toLowerCase().includes(selectedCity.toLowerCase()))
    }
    if (selectedType !== 'all') {
      list = list.filter(d => selectedType === 'online' ? d.type.includes('Online') : d.type.includes('In-Person'))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.location.toLowerCase().includes(q))
    }
    if (sortBy === 'fee-low') list = [...list].sort((a, b) => a.fee - b.fee)
    else if (sortBy === 'rating') list = [...list].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    else if (sortBy === 'experience') list = [...list].sort((a, b) => parseInt(b.detail) - parseInt(a.detail))
    return list
  }

  function renderSpecialtiesGrid() {
    return doctorSpecialties.map(s => `
      <div class="specialty-card ${selectedSpecialty === s.name ? 'active' : ''}" data-spec-name="${s.name}">
        <div class="specialty-card-icon avatar-${s.color}">${icon(s.icon)}</div>
        <div class="specialty-card-info">
          <h4>${s.name}</h4>
          <span>${s.desc}</span>
        </div>
      </div>
    `).join('')
  }

  function renderDoctorCards() {
    const list = getFilteredDoctors()
    if (list.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon('search')}</div>
          <h3>No doctors found matching your criteria</h3>
          <p>Try resetting filters or searching for another specialty or city.</p>
          <button class="button button-outline" id="reset-doc-filters">Reset all filters</button>
        </div>
      `
    }
    return list.map(d => doctorCard(d)).join('')
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'doctors')}
      <main id="top" class="doctor-page-main">
        
        <!-- Layer 01: Hero — Find Your Doctor -->
        <section class="section-wrap doctor-hero-section">
          <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>Find Doctors</span></div>
          
          <div class="doctor-promo-banner">
            <div class="promo-banner-content">
              <span class="promo-badge">${icon('spark')} Get 5% Off | Use Code CC50</span>
              <h1>Talk to a Doctor for <em class="editorial">Instant</em> advice</h1>
              <p>Connect with top-rated specialists within 15 minutes. 24/7 video consultation, private & secure care.</p>
              
              <div class="promo-cta-row">
                <button class="button button-primary" id="instant-consult-btn">${icon('video')} Consult Now</button>
                <span class="promo-trust">${icon('verified')} 4,000+ Verified Doctors</span>
                <span class="promo-trust">${icon('clock')} 24/7 Priority Care</span>
              </div>
            </div>
            <div class="promo-banner-graphic">
              <div class="graphic-badge">${icon('shield')} 24/7 Care Ready</div>
              <div class="graphic-doctor-avatar avatar-teal">${icon('user')}</div>
            </div>
          </div>
        </section>

        <!-- Layer 02: Browse by Specialties Discovery Grid (24 Specialties) -->
        <section class="section-wrap specialties-wrap">
          <div class="section-heading">
            <div>
              <span class="section-kicker">01 / SPECIALTIES</span>
              <h2>Browse by <em class="editorial">Medical</em> Specialties</h2>
              <p class="section-subtext">Choose from 24+ medical specialties for targeted health care</p>
            </div>
          </div>
          <div class="specialties-grid" id="specialties-grid">
            ${renderSpecialtiesGrid()}
          </div>
        </section>

        <!-- Layer 03: 3-Step Quick Appointment Finder -->
        <section class="section-wrap finder-widget-wrap">
          <div class="finder-widget-card">
            <div class="finder-widget-head">
              <span class="section-kicker">02 / THREE-STEP BOOKING</span>
              <h3>${icon('compass')} Find a Doctor in 3 <em class="editorial">easy</em> steps</h3>
              <span>Quick appointment booking with top medical experts</span>
            </div>
            <div class="finder-widget-form">
              <div class="finder-field">
                <label>01. Select Speciality*</label>
                <select id="finder-spec-select" class="finder-select">
                  <option value="all">Enter or Select Speciality</option>
                  ${doctorSpecialties.map(s => `<option value="${s.name}" ${selectedSpecialty === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="finder-field">
                <label>02. Select Date*</label>
                <select id="finder-date-select" class="finder-select">
                  <option value="today">Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="next3">Within 3 Days</option>
                </select>
              </div>
              <div class="finder-field">
                <label>03. Preferred Location/Pincode*</label>
                <div class="finder-input-wrap">
                  <input id="finder-location-input" placeholder="Search location or city..." value="${selectedCity !== 'all' ? selectedCity : ''}" />
                  <button class="location-pin-btn" id="detect-loc-btn" title="Detect location">${icon('pin')}</button>
                </div>
              </div>
              <div class="finder-field finder-btn-field">
                <button class="button button-primary finder-submit-btn" id="finder-submit-btn">${icon('search')} Submit</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Layer 04: Tatito AI Health Intelligence Interface -->
        <section class="section-wrap ai-banner-wrap">
          <div class="ai-banner-card">
            <div class="ai-banner-content">
              <span class="ai-badge">${icon('spark')} 03 / INTELLIGENCE — Tatito AI</span>
              <h2>Ask anything about your <em class="editorial">health.</em></h2>
              <p>Get instant, trusted guidance powered by AI and verified medical protocols.</p>
              <div class="ai-input-row">
                ${icon('search')}
                <input id="ai-health-input" placeholder="Ask a symptom or health query e.g. Fever relief..." />
                <button class="button button-primary" id="ai-health-btn">Ask AI</button>
              </div>
              <div class="ai-tags">
                <button class="ai-tag-chip" data-ai-prompt="Fever & Cold relief">Fever & Cold</button>
                <button class="ai-tag-chip" data-ai-prompt="Skin rash causes">Skin Allergies</button>
                <button class="ai-tag-chip" data-ai-prompt="Lower back pain exercises">Back Pain</button>
                <button class="ai-tag-chip" data-ai-prompt="How to manage high BP">High Blood Pressure</button>
              </div>
              <div class="ai-safety-pill">
                ${icon('shield')} <span>AI guidance for informational support — consult a qualified medical professional for diagnosis or treatment.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Layer 05: Verified Doctor Directory & Filters -->
        <section class="section-wrap doctor-list-wrap">
          <div class="doctor-list-container">
            <aside class="doctor-sidebar">
              <div class="sidebar-section">
                <h4>Specialty Filter</h4>
                <select id="sidebar-spec-select" class="pharm-select">
                  <option value="all">All Specialties</option>
                  ${doctorSpecialties.map(s => `<option value="${s.name}" ${selectedSpecialty === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="sidebar-section">
                <h4>Consultation Type</h4>
                <div class="filter-list">
                  <button class="filter-pill ${selectedType === 'all' ? 'active' : ''}" data-type="all">All Types</button>
                  <button class="filter-pill ${selectedType === 'online' ? 'active' : ''}" data-type="online">${icon('video')} Online Video</button>
                  <button class="filter-pill ${selectedType === 'inperson' ? 'active' : ''}" data-type="inperson">${icon('building')} In-Person</button>
                </div>
              </div>
              <div class="sidebar-section">
                <h4>Filter by City</h4>
                <div class="city-filter-list">
                  <button class="city-filter-chip ${selectedCity === 'all' ? 'active' : ''}" data-city="all">All Cities</button>
                  ${doctorCities.map(c => `<button class="city-filter-chip ${selectedCity === c ? 'active' : ''}" data-city="${c}">${c}</button>`).join('')}
                </div>
              </div>
            </aside>

            <div class="doctor-content">
              <div class="doctor-toolbar">
                <span id="doctor-count-text">Showing verified doctors</span>
                <select id="doctor-sort-select" class="pharm-select">
                  <option value="recommended">Sort: Recommended</option>
                  <option value="rating">Rating: High to Low</option>
                  <option value="fee-low">Fee: Low to High</option>
                </select>
              </div>
              
              <div class="doctor-grid list-doctor-grid" id="doctor-grid">
                ${renderDoctorCards()}
              </div>
            </div>
          </div>
        </section>

        <!-- Layer 06: Editorial Health Articles -->
        <section class="section-wrap doctor-articles-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">05 / MEDICAL INSIGHTS</span>
              <h2>Health Articles <em class="editorial">for You</em></h2>
            </div>
            <button class="text-button" data-nav="article" data-args='{"id":"a1"}'>View all articles ${icon('arrow')}</button>
          </div>
          <div class="article-grid">
            ${articles.map(a => `
              <article class="article-card" data-article="${a.id}">
                <div class="article-icon avatar-${a.color}">${a.initials}</div>
                <div class="article-info">
                  <span class="article-category">${a.category}</span>
                  <h4>${a.title}</h4>
                  <span class="article-meta">${a.author} · ${a.date}</span>
                </div>
              </article>
            `).join('')}
          </div>
        </section>

        <!-- Layer 07: Find Doctors By City Grid -->
        <section class="section-wrap city-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">06 / LOCATION DISCOVERY</span>
              <h2>Find Doctors By <em class="editorial">City</em></h2>
              <p class="section-subtext">Consult top doctors in your city for online & clinic consultations</p>
            </div>
          </div>
          <div class="city-accordion-grid">
            ${doctorCities.map(city => `
              <button class="city-accordion-card ${selectedCity === city ? 'active' : ''}" data-city-card="${city}">
                <div class="city-card-left">
                  <span class="city-pin-icon">${icon('pin')}</span>
                  <strong>${city}</strong>
                </div>
                <span class="city-card-arrow">${icon('chevron')}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- Layer 08: Specialty Education Guide -->
        <section class="section-wrap edu-guide-section">
          <div class="edu-guide-card">
            <span class="section-kicker">07 / KNOWLEDGE BASE</span>
            <h2>Specialities — Expertise You Can <em class="editorial">Trust</em></h2>
            <p class="edu-intro">
              A medical specialty is a specific area of medical practice that mainly focuses on a defined set of diseases, patients, philosophy, or skills. Tatito Health+ offers advanced consultation services across 24+ medical specialties.
            </p>
            
            <div class="edu-grid">
              <div class="edu-item">
                <h4>Dermatology</h4>
                <p>A specialized branch of medicine that focuses on hair, nails, and skin-related disorders. Dermatology also encompasses conditions that affect the thin lining of your mouth, eyelids, and nose.</p>
              </div>
              <div class="edu-item">
                <h4>Obstetrics and Gynaecology</h4>
                <p>Two major medical specialties that focus on women’s reproductive health. Obstetrics involves care during pregnancy, childbirth and after delivery, while gynaecology specializes in issues related to women’s reproductive health.</p>
              </div>
              <div class="edu-item">
                <h4>Paediatrics</h4>
                <p>Focuses on the health and medical care of children, infants, and young adults from birth up to age 18.</p>
              </div>
              <div class="edu-item">
                <h4>Psychiatry & Mental Health</h4>
                <p>Specializes in the detection, treatment, and prevention of emotional, behavioral, and mental health disorders.</p>
              </div>
            </div>

            <!-- Layer 09: Why Choose Health Plus -->
            <div class="edu-why-card">
              <h3>Why Choose Online Consultation with <em class="editorial">Tatito Health+?</em></h3>
              <div class="why-bullets-grid">
                <div class="why-bullet">${icon('user')} <span>Highly-qualified doctors available 24x7 for you</span></div>
                <div class="why-bullet">${icon('spark')} <span>Get online consultations within 15 minutes</span></div>
                <div class="why-bullet">${icon('shield')} <span>Affordable rates & personalized care plans</span></div>
                <div class="why-bullet">${icon('check')} <span>Instant follow-ups via chat for 7 days</span></div>
              </div>
            </div>
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, 'doctors')}

      <!-- Floating Instant Consult FAB -->
      <button class="floating-consult-fab" id="fab-instant-consult">
        <span class="fab-icon">${icon('phone')}</span>
        <span>Instant Consult 24/7</span>
      </button>
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `

  bindDoctorEvents(appRoot, ctx, {
    selectedSpecialty: { get: () => selectedSpecialty, set: v => selectedSpecialty = v },
    selectedCity: { get: () => selectedCity, set: v => selectedCity = v },
    selectedType: { get: () => selectedType, set: v => selectedType = v },
    searchQuery: { get: () => searchQuery, set: v => searchQuery = v },
    sortBy: { get: () => sortBy, set: v => sortBy = v },
    update: () => {
      const grid = appRoot.querySelector('#doctor-grid')
      const count = appRoot.querySelector('#doctor-count-text')
      const list = getFilteredDoctors()
      if (grid) grid.innerHTML = renderDoctorCards()
      if (count) count.textContent = `Showing ${list.length} verified doctor${list.length !== 1 ? 's' : ''}`
      bindNav(appRoot, ctx)
    }
  })
}

function doctorCard(d) {
  return `
    <article class="doctor-card" data-doctor="${d.id}">
      <div class="doctor-card-top">
        ${avatar(d.initials, d.color, 'doctor-avatar')}
        <span class="rating">★ ${d.rating}</span>
      </div>
      <div class="doctor-card-content">
        <div class="doc-header-row">
          <h3>${d.name}</h3>
          <span class="doc-verified-badge">${icon('verified')} Verified</span>
        </div>
        <span class="doctor-spec-chip">${d.specialty}</span>
        <p>${d.detail}</p>
        <span class="doctor-location">${icon('building')} ${d.location}</span>
        <div class="doctor-bottom">
          <div>
            <span class="consultation-fee">$${d.fee}</span>
            <small>per visit</small>
          </div>
          <div class="next-slot">
            <small>${icon('clock')} Next Slot</small>
            <strong>${d.next}</strong>
          </div>
        </div>
        <button class="button button-small button-primary full-button" data-doctor-book="${d.id}">Book Appointment ${icon('arrow')}</button>
      </div>
    </article>
  `
}

function bindDoctorEvents(appRoot, ctx, state) {
  const { navigate, showToast } = ctx
  bindNav(appRoot, ctx)

  // Specialty card selection
  appRoot.querySelectorAll('[data-spec-name]').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.specName
      state.selectedSpecialty.set(state.selectedSpecialty.get() === name ? 'all' : name)
      appRoot.querySelectorAll('[data-spec-name]').forEach(c => c.classList.remove('active'))
      if (state.selectedSpecialty.get() === name) card.classList.add('active')
      const finderSelect = appRoot.querySelector('#finder-spec-select')
      const sidebarSelect = appRoot.querySelector('#sidebar-spec-select')
      if (finderSelect) finderSelect.value = state.selectedSpecialty.get()
      if (sidebarSelect) sidebarSelect.value = state.selectedSpecialty.get()
      state.update()
    })
  })

  // Finder Widget 3 Steps form submit
  const finderSubmit = appRoot.querySelector('#finder-submit-btn')
  if (finderSubmit) {
    finderSubmit.addEventListener('click', () => {
      const spec = appRoot.querySelector('#finder-spec-select').value
      const loc = appRoot.querySelector('#finder-location-input').value.trim()
      state.selectedSpecialty.set(spec)
      if (loc) state.selectedCity.set(loc)
      state.update()
      showToast('Filters applied! Showing matching doctors.')
    })
  }

  // City selector cards
  appRoot.querySelectorAll('[data-city-card]').forEach(card => {
    card.addEventListener('click', () => {
      const city = card.dataset.cityCard
      state.selectedCity.set(state.selectedCity.get() === city ? 'all' : city)
      appRoot.querySelectorAll('[data-city-card]').forEach(c => c.classList.remove('active'))
      if (state.selectedCity.get() === city) card.classList.add('active')
      const locInput = appRoot.querySelector('#finder-location-input')
      if (locInput) locInput.value = state.selectedCity.get() !== 'all' ? state.selectedCity.get() : ''
      state.update()
    })
  })

  // City sidebar chips
  appRoot.querySelectorAll('[data-city]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedCity.set(chip.dataset.city)
      appRoot.querySelectorAll('[data-city]').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      state.update()
    })
  })

  // Consultation type filter pills
  appRoot.querySelectorAll('[data-type]').forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedType.set(pill.dataset.type)
      appRoot.querySelectorAll('[data-type]').forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      state.update()
    })
  })

  // AI Prompt button & tags
  const aiBtn = appRoot.querySelector('#ai-health-btn')
  const aiInput = appRoot.querySelector('#ai-health-input')
  if (aiBtn && aiInput) {
    aiBtn.addEventListener('click', () => {
      const q = aiInput.value.trim()
      if (q) showToast(`Tatito AI: Analyzing symptoms for "${q}"...`)
    })
  }
  appRoot.querySelectorAll('[data-ai-prompt]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (aiInput) aiInput.value = chip.dataset.aiPrompt
      showToast(`Tatito AI: Preparing guidance for ${chip.dataset.aiPrompt}...`)
    })
  })

  // Location detect button
  const locBtn = appRoot.querySelector('#detect-loc-btn')
  if (locBtn) {
    locBtn.addEventListener('click', () => {
      const locInput = appRoot.querySelector('#finder-location-input')
      if (locInput) locInput.value = 'Bengaluru'
      state.selectedCity.set('Bengaluru')
      state.update()
      showToast('Location set to Bengaluru')
    })
  }

  // Doctor card navigation
  appRoot.addEventListener('click', e => {
    const docCard = e.target.closest('[data-doctor]')
    const docBook = e.target.closest('[data-doctor-book]')
    if (docBook) {
      e.stopPropagation()
      navigate('doctor', { id: docBook.dataset.doctorBook })
    } else if (docCard) {
      navigate('doctor', { id: docCard.dataset.doctor })
    }
  })

  // FAB Instant Consult button
  const fabBtn = appRoot.querySelector('#fab-instant-consult')
  const instantBtn = appRoot.querySelector('#instant-consult-btn')
  if (fabBtn) fabBtn.addEventListener('click', () => showToast('Connecting to 24/7 Instant Doctor...'))
  if (instantBtn) instantBtn.addEventListener('click', () => showToast('Connecting to 24/7 Instant Doctor...'))
}


// === Doctor Detail Page ===
export function renderDoctorDetail(appRoot, ctx) {
  const { navigate, currentParams } = ctx
  const d = doctors.find(d => d.id === currentParams.id)
  if (!d) { navigate('doctors'); return }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const slots = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM']

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'doctors')}
      <main id="top" class="section-wrap detail-page">
        <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <a data-nav="doctors">Doctors</a> ${icon('chevron')} <span>${d.name}</span></div>
        <div class="doctor-detail-layout">
          <div class="doctor-detail-left">
            <div class="doctor-detail-card">
              ${avatar(d.initials, d.color, 'doctor-avatar-xl')}
              <h1>${d.name}</h1>
              <span class="doctor-specialty-large">${d.specialty}</span>
              <p>${d.detail}</p>
              <div class="doctor-stats-row"><div><strong>★ ${d.rating}</strong><span>${d.reviews} reviews</span></div><div><strong>12+</strong><span>years exp</span></div><div><strong>$${d.fee}</strong><span>per visit</span></div></div>
              <div class="doctor-location-large">${icon('building')} ${d.location}</div>
            </div>
          </div>
          <div class="doctor-detail-right">
            <div class="booking-section">
              <h2>Book an appointment</h2>
              <div class="booking-type"><button class="booking-type-btn selected">${icon('video')} Online</button><button class="booking-type-btn">${icon('building')} In person</button></div>
              <div class="booking-label">Select date</div>
              <div class="date-pills">${days.map((day, i) => `<button class="date-pill ${i === 2 ? 'selected' : ''}"><strong>${day}</strong><small>Jun ${18 + i}</small></button>`).join('')}</div>
              <div class="booking-label">Select time slot</div>
              <div class="time-slots-grid">${slots.map((s, i) => `<button class="time-slot ${i === 3 ? 'selected' : ''}">${s}</button>`).join('')}</div>
              <div class="booking-summary"><div><span>Consultation fee</span><strong>$${d.fee}</strong></div></div>
              <button class="button button-primary full-button" id="book-appointment-confirm">Book appointment ${icon('arrow')}</button>
            </div>
          </div>
        </div>
        <section class="doctor-about-section">
          <h2>About</h2>
          <p>${d.name} is a highly experienced ${d.specialty.toLowerCase()} specialist with over a decade of clinical expertise. Known for a patient-first approach, ${d.name} combines evidence-based medicine with compassionate care.</p>
          <h3>Specializations</h3>
          <div class="spec-tags"><span>General consultation</span><span>Chronic condition management</span><span>Preventive health</span><span>Lifestyle counseling</span></div>
        </section>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, 'doctors')}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
  appRoot.querySelector('#book-appointment-confirm').addEventListener('click', () => { showToast('Appointment booked successfully!'); navigate('dashboard') })
  appRoot.querySelectorAll('.booking-type-btn').forEach(b => { b.addEventListener('click', () => { appRoot.querySelectorAll('.booking-type-btn').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }) })
  appRoot.querySelectorAll('.date-pill').forEach(b => { b.addEventListener('click', () => { appRoot.querySelectorAll('.date-pill').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }) })
  appRoot.querySelectorAll('.time-slot').forEach(b => { b.addEventListener('click', () => { appRoot.querySelectorAll('.time-slot').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }) })
}

// === Lab Tests Page ===
export function renderLabTests(appRoot, ctx) {
  const { navigate, addToCart, showToast } = ctx
  let selectedCondition = 'all'
  let selectedOrgan = 'all'
  let searchQuery = ''

  function getFilteredPackages() {
    let list = labPackages
    if (selectedCondition !== 'all') {
      const q = selectedCondition.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.testsIncluded.toLowerCase().includes(q))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.testsIncluded.toLowerCase().includes(q))
    }
    return list
  }

  function getFilteredSingleTests() {
    let list = labTests
    if (selectedCondition !== 'all') {
      const q = selectedCondition.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
    }
    return list
  }

  function renderHealthChecksGrid() {
    return doctorHealthChecks.map(c => `
      <button class="health-check-chip ${selectedCondition === c.name ? 'active' : ''}" data-condition="${c.name}">
        <span class="chip-icon avatar-${c.color}">${icon(c.icon)}</span>
        <span class="chip-label">${c.name}</span>
        <span class="chip-tag">${c.tag}</span>
      </button>
    `).join('')
  }

  function renderOrganGrid() {
    return vitalOrgans.map(o => `
      <button class="organ-chip ${selectedOrgan === o.name ? 'active' : ''}" data-organ="${o.name}">
        <span class="organ-icon avatar-${o.color}">${icon(o.icon)}</span>
        <span class="organ-label">${o.name}</span>
      </button>
    `).join('')
  }

  function renderPackagesList() {
    const pkgs = getFilteredPackages()
    if (pkgs.length === 0) return `<div class="empty-state"><p>No health packages found for selected filters.</p></div>`
    return pkgs.map(pkg => `
      <article class="lab-package-card" data-package="${pkg.id}">
        <div class="pkg-header">
          <span class="pkg-badge">${pkg.badge}</span>
          <span class="pkg-report-time">${icon('check')} ${pkg.reportTime}</span>
        </div>
        <div class="pkg-body">
          <div class="pkg-icon avatar-${pkg.color}">${pkg.initials}</div>
          <div class="pkg-details">
            <h3>${pkg.name}</h3>
            <span class="pkg-test-count">${pkg.tests} Tests Included</span>
            <p class="pkg-included">${pkg.testsIncluded}</p>
          </div>
        </div>
        <div class="pkg-footer">
          <div class="pkg-price-wrap">
            <strong>₹${pkg.price}</strong>
            <s>₹${pkg.mrp}</s>
            <span class="pkg-discount">${pkg.discount}% OFF</span>
          </div>
          <button class="button button-small button-primary" data-book-package="${pkg.id}">${icon('plus')} Add</button>
        </div>
      </article>
    `).join('')
  }

  function renderSingleTestsList() {
    const tests = getFilteredSingleTests()
    if (tests.length === 0) return `<div class="empty-state"><p>No tests found.</p></div>`
    return tests.map(t => `
      <article class="lab-single-test-card" data-test="${t.id}">
        <div class="single-test-head">
          <div class="single-test-icon avatar-${t.color}">${t.initials}</div>
          <div>
            <h4>${t.name}</h4>
            <span class="single-test-count">${t.tests} Test Included</span>
          </div>
        </div>
        <span class="guarantee-chip">${icon('check')} ${t.badge || '10-Hour Report Guarantee'}</span>
        <div class="single-test-bottom">
          <div class="single-test-price">
            <strong>₹${t.price}</strong>
            <s>₹${t.mrp}</s>
            <span class="single-test-discount">60% off</span>
          </div>
          <button class="button button-small button-primary" data-book-test="${t.id}">${icon('plus')} Add</button>
        </div>
      </article>
    `).join('')
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'labtests')}
      <main id="top" class="lab-page-main">

        <!-- Top Diagnostic Search & Header Banner -->
        <section class="section-wrap lab-hero-section">
          <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>Lab Tests</span></div>

          <div class="lab-hero-card">
            <div class="lab-hero-content">
              <span class="lab-kicker">${icon('spark')} 01 / DIAGNOSTICS — Verified Phlebotomists & NABL Accredited Labs</span>
              <h1>Blood Test at Home | <em class="editorial">Fast</em> Diagnostic Reports</h1>
              <p>Safe sample collection from home within 30 minutes. Digital reports delivered in 10-24 hours.</p>
              <div class="lab-search-bar">
                ${icon('search')}
                <input id="lab-search-input" placeholder="Search for CBC, HbA1c, Thyroid, Lipid Profile, Full Body Package..." />
                <button class="button button-primary" id="lab-search-btn">Search</button>
              </div>
            </div>

            <!-- Trust Stats Row -->
            <div class="lab-trust-stats-grid">
              <div class="stat-item">
                <strong>10 Million+</strong>
                <span>Annual Tests Delivered</span>
              </div>
              <div class="stat-item">
                <strong>40 Years</strong>
                <span>Healthcare Legacy</span>
              </div>
              <div class="stat-item">
                <strong>140+</strong>
                <span>NABL Laboratories</span>
              </div>
              <div class="stat-item">
                <strong>2,000+</strong>
                <span>Collection Centres</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Doctor Created Health Checks (11 Condition Badges) -->
        <section class="section-wrap doctor-checks-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">02 / CONDITION CHECKS</span>
              <h2><em class="editorial">Doctor Created</em> Health Checks (29)</h2>
              <p class="section-subtext">Curated packages designed by senior pathologists and medical experts</p>
            </div>
            <button class="text-button" id="reset-lab-filter">View All ${icon('arrow')}</button>
          </div>
          <div class="health-checks-grid" id="health-checks-grid">
            ${renderHealthChecksGrid()}
          </div>
        </section>

        <!-- Quick Action Banners (Upload Rx & View Reports) -->
        <section class="section-wrap quick-lab-actions-section">
          <div class="quick-lab-actions-grid">
            <div class="action-card action-card-upload" id="upload-rx-lab-card">
              <div class="action-card-left">
                <div class="action-icon">${icon('file')}</div>
                <div>
                  <h3>Upload Prescription and Order</h3>
                  <p>Upload your doctor's note and we will select the exact lab tests for you.</p>
                </div>
              </div>
              <button class="button button-primary button-small">${icon('plus')} Upload Rx</button>
            </div>

            <div class="action-card action-card-reports" id="view-reports-card">
              <div class="action-card-left">
                <div class="action-icon">${icon('shield')}</div>
                <div>
                  <h3>View Reports in My Orders</h3>
                  <p>Access your past blood test results, smart graphs and health records.</p>
                </div>
              </div>
              <button class="button button-outline button-small" data-nav="records">View Reports ${icon('arrow')}</button>
            </div>
          </div>
        </section>

        <!-- Top Booked Tests (Single Tests Grid) -->
        <section class="section-wrap top-tests-section">
          <div class="section-heading">
            <div>
              <h2>Top Booked Tests (44)</h2>
              <p class="section-subtext">Individual blood tests with 10-hour report guarantee</p>
            </div>
          </div>
          <div class="top-single-tests-grid" id="single-tests-grid">
            ${renderSingleTestsList()}
          </div>
        </section>

        <!-- Popular Health Checkup Packages (Health Bundles) -->
        <section class="section-wrap popular-packages-section">
          <div class="section-heading">
            <div>
              <h2>Popular Health Checkup Packages (45)</h2>
              <p class="section-subtext">Comprehensive full body & disease prevention test bundles</p>
            </div>
          </div>
          <div class="packages-grid" id="packages-grid">
            ${renderPackagesList()}
          </div>
        </section>

        <!-- Vital Organs Grid (8 Organ Badges) -->
        <section class="section-wrap vital-organs-section">
          <div class="section-heading">
            <div>
              <h2>Vital Organs Check (8)</h2>
              <p class="section-subtext">Targeted pathology screening by body organ system</p>
            </div>
          </div>
          <div class="vital-organs-grid">
            ${renderOrganGrid()}
          </div>
        </section>

        <!-- How to book a Lab test in 3 simple steps Infographic -->
        <section class="section-wrap lab-steps-section">
          <div class="lab-steps-card">
            <h2>How to book a Lab test in 3 simple steps</h2>
            <div class="steps-grid">
              <div class="step-card">
                <span class="step-badge">STEP 1</span>
                <div class="step-icon-wrap">${icon('compass')}</div>
                <h4>Book Appointment</h4>
                <p>Select a Test or Package and choose your convenient date and time slot.</p>
              </div>
              <div class="step-card">
                <span class="step-badge">STEP 2</span>
                <div class="step-icon-wrap">${icon('user')}</div>
                <h4>Home Sample Collection</h4>
                <p>A certified, trained phlebotomist visits your doorstep at your selected slot.</p>
              </div>
              <div class="step-card">
                <span class="step-badge">STEP 3</span>
                <div class="step-icon-wrap">${icon('check')}</div>
                <h4>Fast & Accurate Results</h4>
                <p>Get digital test reports in 10-24 hrs. View, download or consult a doctor anytime.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Book Lab Test With Us — 4 Trust Pillars -->
        <section class="section-wrap trust-pillars-section">
          <div class="trust-pillars-card">
            <h3>Book Lab Test with Us — Tatito Assurance</h3>
            <div class="pillars-grid">
              <div class="pillar-item">
                <div class="pillar-number">98%</div>
                <strong>On-time Report Delivery</strong>
                <span>Guaranteed fast delivery</span>
              </div>
              <div class="pillar-item">
                <div class="pillar-number">97%</div>
                <strong>Timely Sample Collections</strong>
                <span>Strict doorstep appointment SLA</span>
              </div>
              <div class="pillar-item">
                <div class="pillar-number">99%</div>
                <strong>Positive Customer Reviews</strong>
                <span>Over 1M+ satisfied patients</span>
              </div>
              <div class="pillar-item">
                <div class="pillar-number">${icon('shield')}</div>
                <strong>Accredited Excellence</strong>
                <span>NABL, CAP & ISO certified labs</span>
              </div>
            </div>
          </div>
        </section>

        <!-- X-RAYS & SCANS City Promo Banner -->
        <section class="section-wrap scans-banner-section">
          <div class="scans-banner-card">
            <div class="scans-content">
              <span class="scans-tag">DIAGNOSTIC IMAGING</span>
              <h2>X-RAYS & SCANS: NOW IN YOUR CITY!</h2>
              <p>Make online booking for X-Ray | CT Scan | Ultrasound and get prioritized slots and quicker reports.</p>
              <button class="button button-light" id="scans-book-btn">${icon('phone')} Book Radiology Scan</button>
            </div>
          </div>
        </section>

        <!-- Educational Diagnostic Guide & FAQs -->
        <section class="section-wrap lab-edu-section">
          <div class="lab-edu-card">
            <h2>Tatito Diagnostics Near You That You Can Trust</h2>
            <p>Lab tests are one of the most critical factors in determining one's health. Being the backbone of healthcare, Tatito Health+ brings a plethora of lab tests at home for you to choose from including a blood test at home with free doctor report consultation.</p>
            
            <div class="lab-faq-grid">
              <div class="faq-item">
                <h4>Why Choose Tatito Health+ for a Lab Test at Home?</h4>
                <p>With online facilities, lab test bookings have become easier than ever. Get sample collection from home in 30 minutes, 10-hour digital report guarantee, and transparent pricing with up to 60% discounts.</p>
              </div>
              <div class="faq-item">
                <h4>Fast Sample Collection & Report Delivery</h4>
                <p>With 700+ collection centers and 100+ accredited laboratories, we ensure omnichannel healthcare delivery across 80+ cities nationwide.</p>
              </div>
              <div class="faq-item">
                <h4>Professionally Trained Phlebotomists</h4>
                <p>Qualified phlebotomists come to your doorstep to collect samples in a safe, hygienic, and painless manner following rigid internal quality controls.</p>
              </div>
            </div>
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, 'labtests')}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `

  bindLabEvents(appRoot, ctx, {
    selectedCondition: { get: () => selectedCondition, set: v => selectedCondition = v },
    selectedOrgan: { get: () => selectedOrgan, set: v => selectedOrgan = v },
    searchQuery: { get: () => searchQuery, set: v => searchQuery = v },
    update: () => {
      const pkgGrid = appRoot.querySelector('#packages-grid')
      const singleGrid = appRoot.querySelector('#single-tests-grid')
      if (pkgGrid) pkgGrid.innerHTML = renderPackagesList()
      if (singleGrid) singleGrid.innerHTML = renderSingleTestsList()
      bindNav(appRoot, ctx)
    }
  })
}

function bindLabEvents(appRoot, ctx, state) {
  const { navigate, addToCart, showToast } = ctx
  bindNav(appRoot, ctx)

  // Health check chips click
  appRoot.querySelectorAll('[data-condition]').forEach(chip => {
    chip.addEventListener('click', () => {
      const cond = chip.dataset.condition
      state.selectedCondition.set(state.selectedCondition.get() === cond ? 'all' : cond)
      appRoot.querySelectorAll('[data-condition]').forEach(c => c.classList.remove('active'))
      if (state.selectedCondition.get() === cond) chip.classList.add('active')
      state.update()
    })
  })

  // Organ chips click
  appRoot.querySelectorAll('[data-organ]').forEach(chip => {
    chip.addEventListener('click', () => {
      const organ = chip.dataset.organ
      state.selectedCondition.set(organ)
      showToast(`Filtering lab tests for ${organ}`)
      state.update()
    })
  })

  // Reset filter button
  const resetBtn = appRoot.querySelector('#reset-lab-filter')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.selectedCondition.set('all')
      appRoot.querySelectorAll('[data-condition]').forEach(c => c.classList.remove('active'))
      state.update()
    })
  }

  // Search input & button
  const searchInput = appRoot.querySelector('#lab-search-input')
  const searchBtn = appRoot.querySelector('#lab-search-btn')
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      state.searchQuery.set(searchInput.value.trim())
      state.update()
    })
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        state.searchQuery.set(searchInput.value.trim())
        state.update()
      }
    })
  }

  // Upload prescription click
  const uploadCard = appRoot.querySelector('#upload-rx-lab-card')
  if (uploadCard) {
    uploadCard.addEventListener('click', () => navigate('prescription'))
  }

  // Add package / add test buttons
  appRoot.addEventListener('click', e => {
    const pkgBtn = e.target.closest('[data-book-package]')
    const testBtn = e.target.closest('[data-book-test]')
    const testCard = e.target.closest('[data-test]')
    const pkgCard = e.target.closest('[data-package]')

    if (pkgBtn) {
      e.stopPropagation()
      const pkg = labPackages.find(p => p.id === pkgBtn.dataset.bookPackage)
      if (pkg) {
        addToCart(pkg.id, { name: pkg.name, price: pkg.price, mrp: pkg.mrp, pack: `${pkg.tests} Tests Bundle`, rx: false, initials: pkg.initials, color: pkg.color })
      }
    } else if (testBtn) {
      e.stopPropagation()
      const test = labTests.find(t => t.id === testBtn.dataset.bookTest)
      if (test) {
        addToCart(test.id, { name: test.name, price: test.price, mrp: test.mrp, pack: `${test.tests} Test Included`, rx: false, initials: test.initials, color: test.color })
      }
    } else if (testCard && !testBtn) {
      navigate('test', { id: testCard.dataset.test })
    }
  })

  // Scans button
  const scansBtn = appRoot.querySelector('#scans-book-btn')
  if (scansBtn) scansBtn.addEventListener('click', () => showToast('Radiology & CT Scan slot request sent!'))
}


// === Test Detail Page ===
export function renderTestDetail(appRoot, ctx) {
  const { navigate, currentParams, addToCart } = ctx
  const t = labTests.find(t => t.id === currentParams.id)
  if (!t) { navigate('labtests'); return }
  const discount = Math.round((1 - t.price / t.mrp) * 100)
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'labtests')}
      <main id="top" class="section-wrap detail-page">
        <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <a data-nav="labtests">Lab Tests</a> ${icon('chevron')} <span>${t.name}</span></div>
        <div class="test-detail-layout">
          <div class="test-detail-left">
            <div class="test-detail-icon-large avatar-${t.color}">${t.initials}</div>
            <h1>${t.name}</h1>
            <span class="test-detail-meta">${t.tests} tests included · ${t.reportTime} report</span>
            <div class="test-detail-price"><strong>₹${t.price}</strong><s>₹${t.mrp}</s><span class="save-badge">Save ₹${t.mrp - t.price} (${discount}% off)</span></div>
            <h3>About this test</h3>
            <p>${t.desc}</p>
            <h3>What's included</h3>
            <div class="test-includes"><div class="test-include-item">${icon('check')} Home sample collection</div><div class="test-include-item">${icon('check')} Digital report in ${t.reportTime}</div><div class="test-include-item">${icon('check')} Free consultation with report</div></div>
          </div>
          <div class="test-detail-right">
            <div class="booking-section">
              <h2>Book this test</h2>
              <div class="booking-label">Select date</div>
              <div class="date-pills"><button class="date-pill selected"><strong>Today</strong><small>Jun 18</small></button><button class="date-pill"><strong>Tomorrow</strong><small>Jun 19</small></button><button class="date-pill"><strong>Fri</strong><small>Jun 20</small></button></div>
              <div class="booking-label">Sample collection</div>
              <div class="booking-type"><button class="booking-type-btn selected">${icon('pin')} Home collection</button><button class="booking-type-btn">${icon('building')} Lab visit</button></div>
              <div class="booking-summary"><div><span>Test price</span><strong>₹${t.price}</strong></div><div><span>Collection</span><strong>FREE</strong></div><div class="summary-total"><span>Total</span><strong>₹${t.price}</strong></div></div>
              <button class="button button-primary full-button" id="book-test-confirm">Book test ${icon('arrow')}</button>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, 'labtests')}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
  appRoot.querySelector('#book-test-confirm').addEventListener('click', () => { showToast('Lab test booked! Sample collection scheduled.'); navigate('dashboard') })
  appRoot.querySelectorAll('.booking-type-btn').forEach(b => { b.addEventListener('click', () => { appRoot.querySelectorAll('.booking-type-btn').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }) })
  appRoot.querySelectorAll('.date-pill').forEach(b => { b.addEventListener('click', () => { appRoot.querySelectorAll('.date-pill').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }) })
}

// === Cart Page ===
export function renderCart(appRoot, ctx) {
  const { navigate, cartState, changeQty, removeFromCart, getCartTotal } = ctx
  const subtotal = getCartTotal()
  const savings = cartState.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0)
  const deliveryFee = subtotal >= 25 ? 0 : 3.99
  const total = subtotal + deliveryFee
  const hasRx = cartState.some(i => i.rx)

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap cart-page">
        <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>Cart</span></div>
        <h1>Your Cart</h1>
        ${cartState.length === 0 ? `<div class="empty-state"><div class="empty-icon">${icon('bag')}</div><h3>Your cart is empty</h3><p>Add medicines or wellness products to get started.</p><button class="button button-primary" data-nav="pharmacy">Browse pharmacy ${icon('arrow')}</button></div>` : `
        <div class="cart-layout">
          <div class="cart-items-column">
            ${hasRx ? `<div class="cart-rx-warning">${icon('file')} <span>This order includes prescription items. You'll need to upload a valid prescription before checkout.</span></div>` : ''}
            ${cartState.map(item => `<div class="cart-item-row"><span class="cart-item-avatar avatar-${item.color}">${item.initials}</span><div class="cart-item-info"><strong>${item.name}</strong><span>${item.pack}</span>${item.rx ? '<span class="cart-rx-note">Prescription required</span>' : ''}<div class="cart-item-price">$${item.price.toFixed(2)}</div></div><div class="qty-controls"><button data-qty-dec="${item.id}" aria-label="Decrease">−</button><span>${item.qty}</span><button data-qty-inc="${item.id}" aria-label="Increase">+</button></div><strong class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</strong><button class="cart-item-remove" data-remove="${item.id}" aria-label="Remove">${icon('more')}</button></div>`).join('')}
          </div>
          <div class="cart-summary-column">
            <div class="cart-summary-card">
              <h3>Order Summary</h3>
              <div class="summary-row"><span>Subtotal (${cartState.length} items)</span><strong>$${subtotal.toFixed(2)}</strong></div>
              ${savings > 0 ? `<div class="summary-row summary-savings"><span>You save</span><strong>−$${savings.toFixed(2)}</strong></div>` : ''}
              <div class="summary-row"><span>Delivery</span><strong>${deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)}</strong></div>
              ${deliveryFee > 0 ? `<div class="free-delivery-progress"><div class="progress-bar" style="width: ${Math.min((subtotal / 25) * 100, 100)}%"></div><span>Add $${(25 - subtotal).toFixed(2)} more for free delivery</span></div>` : ''}
              <div class="summary-row summary-total"><span>Total</span><strong>$${total.toFixed(2)}</strong></div>
              <button class="button button-primary full-button" id="checkout-btn">Proceed to checkout ${icon('arrow')}</button>
              <button class="button button-quiet full-button" data-nav="pharmacy">Continue shopping</button>
            </div>
          </div>
        </div>`}
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
  appRoot.querySelectorAll('[data-qty-inc]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyInc, 1)))
  appRoot.querySelectorAll('[data-qty-dec]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyDec, -1)))
  appRoot.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.remove)))
  const checkoutBtn = appRoot.querySelector('#checkout-btn')
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => navigate('checkout'))
}

// === Checkout Page ===
export function renderCheckout(appRoot, ctx) {
  const { navigate, cartState, getCartTotal } = ctx
  if (cartState.length === 0) { navigate('cart'); return }
  const subtotal = getCartTotal()
  const deliveryFee = subtotal >= 25 ? 0 : 3.99
  const total = subtotal + deliveryFee
  const hasRx = cartState.some(i => i.rx)
  const orderId = 'THP' + Date.now().toString().slice(-6)

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap checkout-page">
        <div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <a data-nav="cart">Cart</a> ${icon('chevron')} <span>Checkout</span></div>
        <h1>Checkout</h1>
        <div class="checkout-layout">
          <div class="checkout-left">
            ${hasRx ? `<div class="checkout-section"><h3>${icon('file')} Prescription Verification</h3><div class="rx-dropzone-inline" id="checkout-rx-dropzone"><div class="rx-dropzone-icon">${icon('file')}</div><strong>Upload prescription</strong><span>Click to select file · JPG, PNG or PDF</span><input type="file" id="checkout-rx-file" accept="image/*,.pdf" hidden /></div></div>` : ''}
            <div class="checkout-section"><h3>1. Delivery Address</h3><div class="checkout-form"><label>Full name</label><input type="text" value="Jordan Davis" /><label>Phone number</label><input type="tel" value="(555) 123-4567" /><label>Address line 1</label><input type="text" value="124 Maple Street, Apt 4B" /><label>Address line 2 (optional)</label><input type="text" placeholder="Landmark, instructions..." /><div class="form-row"><div><label>City</label><input type="text" value="Brooklyn" /></div><div><label>ZIP code</label><input type="text" value="11201" /></div></div></div></div>
            <div class="checkout-section"><h3>2. Delivery Options</h3><div class="delivery-options"><button class="delivery-option selected"><div><strong>Standard delivery</strong><span>2-3 business days</span></div><span class="delivery-price">${deliveryFee === 0 ? 'FREE' : '$3.99'}</span></button><button class="delivery-option"><div><strong>Express delivery</strong><span>Same day · Order before 2 PM</span></div><span class="delivery-price">$7.99</span></button><button class="delivery-option"><div><strong>Store pickup</strong><span>Ready in 1 hour</span></div><span class="delivery-price">FREE</span></button></div></div>
            <div class="checkout-section"><h3>3. Payment Method</h3><div class="payment-options"><button class="payment-option selected"><div>${icon('file')} <strong>Credit / Debit card</strong></div>${icon('check')}</button><button class="payment-option"><div>${icon('shield')} <strong>Digital wallet</strong></div></button><button class="payment-option"><div>${icon('bag')} <strong>Pay on delivery</strong></div></button></div></div>
          </div>
          <div class="checkout-right">
            <div class="cart-summary-card checkout-summary">
              <h3>Order Summary</h3>
              ${cartState.map(item => `<div class="checkout-review-item"><span class="cart-item-avatar avatar-${item.color}">${item.initials}</span><div><strong>${item.name}</strong><span>${item.qty} × $${item.price.toFixed(2)}</span></div><strong>$${(item.price * item.qty).toFixed(2)}</strong></div>`).join('')}
              <div class="summary-row"><span>Subtotal</span><strong>$${subtotal.toFixed(2)}</strong></div>
              <div class="summary-row"><span>Delivery</span><strong>${deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)}</strong></div>
              <div class="summary-row summary-total"><span>Total</span><strong>$${total.toFixed(2)}</strong></div>
              <button class="button button-primary full-button" id="place-order">Place order ${icon('arrow')}</button>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
  appRoot.querySelectorAll('.delivery-option').forEach(b => b.addEventListener('click', () => { appRoot.querySelectorAll('.delivery-option').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }))
  appRoot.querySelectorAll('.payment-option').forEach(b => b.addEventListener('click', () => { appRoot.querySelectorAll('.payment-option').forEach(x => x.classList.remove('selected')); b.classList.add('selected') }))
  const dropzone = appRoot.querySelector('#checkout-rx-dropzone')
  const fileInput = appRoot.querySelector('#checkout-rx-file')
  if (dropzone && fileInput) { dropzone.addEventListener('click', () => fileInput.click()); fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) showToast('Prescription uploaded.') }) }
  appRoot.querySelector('#place-order').addEventListener('click', () => { cartState.length = 0; ctx.notifyCartChange(); navigate('order-success', { id: orderId, total }) })
}

// === Order Success Page ===
export function renderOrderSuccess(appRoot, ctx) {
  const { navigate, currentParams } = ctx
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap order-success-page">
        <div class="order-success-content">
          <div class="success-check-large">${icon('check')}</div>
          <h1>Order Confirmed!</h1>
          <p>Order <strong>#${currentParams.id || 'THP000'}</strong> · Total <strong>$${(currentParams.total || 0).toFixed(2)}</strong></p>
          <div class="order-tracking-page">
            <div class="track-step active"><span class="track-dot">${icon('check')}</span><div><strong>Order confirmed</strong><small>Just now</small></div></div>
            <div class="track-step"><span class="track-dot">${icon('bag')}</span><div><strong>Preparing your order</strong><small>Estimated 30 mins</small></div></div>
            <div class="track-step"><span class="track-dot">${icon('pin')}</span><div><strong>Out for delivery</strong><small>Estimated tomorrow</small></div></div>
            <div class="track-step"><span class="track-dot">${icon('home')}</span><div><strong>Delivered</strong><small>Estimated 2-3 days</small></div></div>
          </div>
          <div class="order-success-actions">
            <button class="button button-primary" data-nav="dashboard">View my orders ${icon('arrow')}</button>
            <button class="button button-outline" data-nav="pharmacy">Continue shopping</button>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
}

// === Emergency Page ===
export function renderEmergency(appRoot, ctx) {
  const { navigate } = ctx
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap emergency-page">
        <div class="emergency-content">
          <div class="emergency-icon-large">${icon('phone')}</div>
          <h1>Emergency Care</h1>
          <p>If this is a life-threatening emergency, call your local emergency number immediately.</p>
          <div class="emergency-actions-page">
            <button class="emergency-action-large emergency-call"><div class="ea-icon">${icon('phone')}</div><div><strong>Call emergency services</strong><span>For life-threatening emergencies</span></div></button>
            <button class="emergency-action-large emergency-consult"><div class="ea-icon">${icon('video')}</div><div><strong>Talk to a care guide</strong><span>Available 24/7</span></div></button>
            <button class="emergency-action-large emergency-ambulance"><div class="ea-icon">${icon('pin')}</div><div><strong>Request ambulance</strong><span>Track real-time location</span></div></button>
          </div>
          <div class="emergency-hospitals">
            <h3>Nearby Emergency Hospitals</h3>
            <div class="emergency-hospital-card"><div class="hospital-symbol">${icon('building')}</div><div><strong>Northshore Medical Center</strong><span>0.8 mi · Open 24/7</span><small>Emergency department available</small></div><button class="button button-small button-outline">Directions</button></div>
            <div class="emergency-hospital-card"><div class="hospital-symbol hospital-symbol-blue">${icon('building')}</div><div><strong>St. Clement Health</strong><span>1.4 mi · Open 24/7</span><small>Trauma center · ICU available</small></div><button class="button button-small button-outline">Directions</button></div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `
  bindNav(appRoot, ctx)
}

// === Simple placeholder pages ===
export function renderRecords(appRoot, ctx) {
  const { navigate } = ctx
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx, 'records')}<main id="top" class="section-wrap"><div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>Health Records</span></div><h1>Health Records</h1><p class="page-desc">Your encrypted, organized health history — all in one place.</p><div class="records-grid"><div class="record-type-card"><div class="record-type-icon activity-mint">${icon('flask')}</div><strong>Lab Reports</strong><span>3 reports</span></div><div class="record-type-card"><div class="record-type-icon activity-blue">${icon('file')}</div><strong>Prescriptions</strong><span>5 records</span></div><div class="record-type-card"><div class="record-type-icon activity-peach">${icon('heart')}</div><strong>Vaccinations</strong><span>2 records</span></div><div class="record-type-card"><div class="record-type-icon activity-mint">${icon('shield')}</div><strong>Allergies</strong><span>1 record</span></div></div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  bindNav(appRoot, ctx)
}

export function renderPlans(appRoot, ctx) {
  const { navigate } = ctx
  const plans = [
    { name: 'Tatito Basic', price: 9.99, period: 'month', color: 'teal', features: ['2 doctor consultations/mo', '10% off lab tests', 'Digital health records', 'Email support'] },
    { name: 'Tatito Family', price: 24.99, period: 'month', color: 'coral', features: ['Up to 4 family members', '5 consultations each/mo', '20% off lab tests', 'Priority support', 'Free medicine delivery'] },
    { name: 'Tatito Premium', price: 49.99, period: 'month', color: 'gold', features: ['Unlimited consultations', '30% off all services', 'Full body checkup included', '24/7 priority care', 'Personal care manager', 'Free ambulance service'] },
  ]
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx, 'plans')}<main id="top" class="section-wrap"><div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>Health Plans</span></div><h1>Health Plans</h1><p class="page-desc">Choose the plan that fits your family's healthcare needs.</p><div class="plans-grid">${plans.map((p, i) => `<div class="plan-card ${i === 1 ? 'plan-featured' : ''}">${i === 1 ? '<span class="plan-popular">Most Popular</span>' : ''}<h3>${p.name}</h3><div class="plan-price"><strong>$${p.price}</strong><span>/${p.period}</span></div><ul>${p.features.map(f => `<li>${icon('check')} ${f}</li>`).join('')}</ul><button class="button ${i === 1 ? 'button-primary' : 'button-outline'} full-button">Subscribe ${icon('arrow')}</button></div>`).join('')}</div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  bindNav(appRoot, ctx)
}

export function renderDashboard(appRoot, ctx) {
  const { navigate } = ctx
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx)}<main id="top" class="section-wrap"><div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>My Dashboard</span></div><h1>Welcome back, Jordan</h1><p class="page-desc">Here's your health at a glance.</p><div class="dashboard-grid"><div class="dashboard-card"><div class="dashboard-card-head"><div><span class="mini-label">Upcoming appointment</span><h3>Primary care visit</h3></div><span class="status-badge status-confirmed">Confirmed</span></div><div class="appointment-content"><div class="date-block"><strong>18</strong><span>JUN<br>2025</span></div><div class="appointment-info">${avatar('MC', 'coral')}<div><strong>Dr. Maya Chen</strong><span>Internal Medicine · In person</span></div></div></div></div><div class="dashboard-card"><div class="dashboard-card-head"><div><span class="mini-label">Health score</span><h3>86 / 100</h3></div></div><div class="wellness-bars"><span><i style="height:72%"></i><small>May</small></span><span><i style="height:58%"></i><small>Jun 1</small></span><span><i style="height:86%"></i><small>Jun 8</small></span><span class="bar-active"><i style="height:96%"></i><small>Today</small></span></div></div><div class="dashboard-card"><div class="dashboard-card-head"><div><span class="mini-label">Recent activity</span><h3>Health activity</h3></div></div><div class="activity-list"><div class="activity-item"><span class="activity-icon activity-blue">${icon('file')}</span><div><strong>Blood pressure check</strong><span>2 days ago</span></div></div><div class="activity-item"><span class="activity-icon activity-peach">${icon('bag')}</span><div><strong>Wellness essentials order</strong><span>Out for delivery</span></div></div><div class="activity-item"><span class="activity-icon activity-mint">${icon('flask')}</span><div><strong>Annual health panel</strong><span>Report ready</span></div></div></div></div></div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  bindNav(appRoot, ctx)
}

export function renderPrescription(appRoot, ctx) {
  const { navigate } = ctx
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx)}<main id="top" class="section-wrap"><div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <a data-nav="pharmacy">Pharmacy</a> ${icon('chevron')} <span>Upload Prescription</span></div><div class="rx-upload-page"><div class="rx-dropzone-large" id="rx-dropzone-page"><div class="rx-dropzone-icon-large">${icon('file')}</div><strong>Click or drag a file here</strong><span>JPG, PNG or PDF · Max 10MB</span><input type="file" id="rx-file-page" accept="image/*,.pdf" hidden /></div><div class="rx-steps-page"><div class="rx-step">${icon('file')} <strong>1.</strong> <span>Upload your prescription</span></div><div class="rx-step">${icon('check')} <strong>2.</strong> <span>Our pharmacist verifies it</span></div><div class="rx-step">${icon('bag')} <strong>3.</strong> <span>We prepare and deliver your order</span></div></div></div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  bindNav(appRoot, ctx)
  const dz = appRoot.querySelector('#rx-dropzone-page')
  const fi = appRoot.querySelector('#rx-file-page')
  if (dz && fi) { dz.addEventListener('click', () => fi.click()); fi.addEventListener('change', () => { if (fi.files.length > 0) { showToast('Prescription uploaded. We will verify it shortly.'); navigate('pharmacy') } }) }
}

export function renderArticle(appRoot, ctx) {
  const { navigate, currentParams } = ctx
  const a = articles.find(a => a.id === currentParams.id)
  if (!a) { navigate('home'); return }
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx)}<main id="top" class="section-wrap"><div class="breadcrumb"><a data-nav="home">Home</a> ${icon('chevron')} <span>${a.title}</span></div><div class="article-page"><span class="article-category-large">${a.category}</span><h1>${a.title}</h1><span class="article-meta-large">${a.author} · ${a.date}</span><div class="article-body"><p>Regular health check-ups are vital for a healthy life because they help in detecting diseases at the earliest, allowing for timely treatment. At Tatito Health+, we believe preventive care is the foundation of long-term wellness.</p><h3>Why early detection matters</h3><p>Many health conditions develop silently over time. Regular screenings and lab tests can catch warning signs before symptoms appear, giving you and your care team the best chance to address issues early.</p><h3>What you can do</h3><p>Schedule annual check-ups, maintain a balanced diet, stay physically active, and don't ignore persistent symptoms. Your health is your most valuable asset — invest in it wisely.</p></div></div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  bindNav(appRoot, ctx)
}
