import { icons, icon, avatar, showToast, premiumFooter, mobileBottomNav } from './ui.js'
import { categories, products } from './data.js'
import { sharedHeader, bindNav } from './pages.js'
import { formatINR } from './currency.js'

export function renderPharmacy(appRoot, ctx) {
  const { navigate, currentParams, getCartCount, addToCart, requireAuth, showToast } = ctx
  let currentCategory = currentParams.category || 'all'
  let searchQuery = currentParams.search || ''
  let selectedBrand = 'all'
  let sortBy = 'popular'
  let wishlist = new Set(JSON.parse(localStorage.getItem('thp_wishlist') || '[]'))

  const topBrands = [
    { id: 'all', name: 'All Brands' },
    { id: 'Tatito Pharma', name: 'Tatito Pharma' },
    { id: 'Tatito Wellness', name: 'Tatito Wellness' },
    { id: 'Tatito Devices', name: 'Tatito Devices' },
    { id: 'Tatito Care', name: 'Tatito Care' },
    { id: 'Tatito Essentials', name: 'Tatito Essentials' },
    { id: 'Pfizer Health', name: 'Pfizer Health' },
    { id: 'GSK Consumer', name: 'GSK Consumer' },
    { id: 'Cipla Medical', name: 'Cipla Medical' },
  ]

  const faqs = [
    { q: 'How does 30-minute medicine delivery work?', a: 'Once your order is confirmed, our nearest partner pharmacy packs your medicines in temperature-controlled packaging. A dedicated courier delivers it directly to your doorstep with live GPS tracking.' },
    { q: 'Do I need a prescription for all medicines?', a: 'Medicines marked with "Rx Required" badge require a valid prescription. You can upload a photo of your doctor note during checkout, and our licensed pharmacist will verify it before dispatching.' },
    { q: 'Are all products authentic and genuine?', a: 'Yes, 100%. We source directly from WHO-GMP certified manufacturers and authorized distributors. All medicines carry verified batch numbers and expiry dates.' },
  ]

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'pharmacy')}
      <main id="top" class="pharmacy-main">
        
        <!-- HERO BANNER -->
        <section class="section-wrap pharmacy-hero-section">
          <div class="pharmacy-hero-bar">
            <div class="pharmacy-hero-content">
              <span class="eyebrow-tag">${icon('pills')} 100% GENUINE MEDICINES & WELLNESS</span>
              <h1>Certified Pharmacy,<br><em class="editorial">delivered to your door in 30 mins.</em></h1>
              <p>Authentic prescription medicines, daily wellness supplements, and medical devices managed by licensed pharmacists with 256-bit privacy encryption.</p>
              <div class="pharmacy-hero-actions">
                <div class="hero-rx-dropzone" id="hero-rx-upload-trigger">
                  <span class="hrd-icon">${icon('file')}</span>
                  <div class="hrd-text">
                    <strong>Have a Doctor's Prescription?</strong>
                    <span>Upload your Rx & our pharmacists will prepare your order</span>
                  </div>
                  <button class="button button-small button-light">${icon('plus')} Upload Rx</button>
                </div>
                <div class="hero-trust-badges">
                  <span class="htb-item">${icon('verified')} WHO-GMP Certified</span>
                  <span class="htb-item">${icon('shield')} Cold-Chain Safe</span>
                  <span class="htb-item">${icon('clock')} 30-Min Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PROMOTIONAL HIGHLIGHTS BAR -->
        <section class="section-wrap">
          <div class="pharmacy-banner-row">
            <div class="pharmacy-banner banner-gold">
              <div class="pb-icon">${icon('spark')}</div>
              <div><strong>Up to 40% Off Daily Vitamins</strong><span>Support immune & bone health</span></div>
            </div>
            <div class="pharmacy-banner banner-navy">
              <div class="pb-icon">${icon('shield')}</div>
              <div><strong>Diabetes Care Essentials</strong><span>Glucose monitors, strips & low-GI care</span></div>
            </div>
            <div class="pharmacy-banner banner-teal">
              <div class="pb-icon">${icon('pills')}</div>
              <div><strong>Free Express Delivery Over ₹499</strong><span>On all valid medicine orders</span></div>
            </div>
          </div>
        </section>

        <!-- BRAND SHOWCASE STRIP -->
        <section class="section-wrap">
          <div class="pharmacy-brands-strip">
            <span class="brands-label">${icon('verified')} TRUSTED PHARMA BRANDS:</span>
            <div class="brands-pills-row" id="brands-pills-row">
              ${topBrands.map(b => `<button class="brand-pill ${selectedBrand === b.id ? 'active' : ''}" data-brand="${b.id}">${b.name}</button>`).join('')}
            </div>
          </div>
        </section>

        <!-- MAIN CONTENT AREA WITH SIDEBAR -->
        <section class="section-wrap">
          <div class="pharmacy-body">
            
            <aside class="pharmacy-sidebar">
              <div class="sidebar-section">
                <h4>Categories</h4>
                <div class="category-list" id="category-list"></div>
              </div>

              <div class="sidebar-section">
                <h4>Prescription Upload</h4>
                <div class="rx-upload-card" id="sidebar-rx-upload">
                  <div class="rx-upload-icon">${icon('file')}</div>
                  <strong>Upload Prescription</strong>
                  <p>Snap a photo of your Rx and our licensed pharmacists will select your medicines.</p>
                  <button class="button button-small button-outline full-button" id="sidebar-rx-btn">${icon('plus')} Upload Now</button>
                </div>
              </div>

              <div class="sidebar-section">
                <h4>Tatito Guarantee</h4>
                <div class="trust-item">${icon('check')} <span>100% Authentic Medicines</span></div>
                <div class="trust-item">${icon('check')} <span>Licensed Pharmacists On-Duty</span></div>
                <div class="trust-item">${icon('check')} <span>Cold-Chain Temperature Safe</span></div>
                <div class="trust-item">${icon('check')} <span>256-Bit Encrypted Privacy</span></div>
              </div>
            </aside>

            <div class="pharmacy-content">
              <div class="pharmacy-toolbar">
                <div class="pharmacy-search-bar">
                  ${icon('search')}
                  <input id="pharm-search" placeholder="Search medicines, vitamins, medical devices..." value="${searchQuery}" />
                </div>
                <select id="pharm-sort" class="pharm-select">
                  <option value="popular">Sort: Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Rating</option>
                  <option value="discount">Discount</option>
                </select>
              </div>

              <div class="pharmacy-results-bar">
                <span id="result-count"></span>
                <div class="active-filters" id="active-filters"></div>
              </div>

              <div class="product-grid" id="product-grid"></div>

              <!-- 4-STEP EXPRESS MEDICINE DELIVERY INFOGRAPHIC -->
              <div class="pharmacy-steps-section">
                <div class="section-heading">
                  <div>
                    <span class="section-kicker">${icon('spark')} EXPRESS DISPATCH</span>
                    <h2>How 30-Minute Medicine Delivery <em class="editorial">Works</em></h2>
                  </div>
                </div>
                <div class="pharmacy-steps-grid">
                  <div class="p-step-card">
                    <span class="p-step-num">01</span>
                    <div class="p-step-icon">${icon('search')}</div>
                    <h4>Search & Select</h4>
                    <p>Choose authentic medicines or upload your doctor's Rx prescription.</p>
                  </div>
                  <div class="p-step-card">
                    <span class="p-step-num">02</span>
                    <div class="p-step-icon">${icon('verified')}</div>
                    <h4>Pharmacist Check</h4>
                    <p>Licensed pharmacists inspect dosage, batch number & expiry dates.</p>
                  </div>
                  <div class="p-step-card">
                    <span class="p-step-num">03</span>
                    <div class="p-step-icon">${icon('shield')}</div>
                    <h4>Cold-Chain Pack</h4>
                    <p>Packed in temperature-monitored sealed protective pouches.</p>
                  </div>
                  <div class="p-step-card">
                    <span class="p-step-num">04</span>
                    <div class="p-step-icon">${icon('clock')}</div>
                    <h4>30-Min Doorstep Delivery</h4>
                    <p>Live GPS courier tracks delivery directly to your door.</p>
                  </div>
                </div>
              </div>

              <!-- PATIENT REVIEWS & TESTIMONIALS -->
              <div class="pharmacy-reviews-section">
                <div class="section-heading">
                  <div>
                    <span class="section-kicker">${icon('heart')} VERIFIED PATIENT FEEDBACK</span>
                    <h2>What Our Patients Say <em class="editorial">About Tatito Pharmacy</em></h2>
                  </div>
                </div>
                <div class="pharmacy-reviews-grid">
                  <div class="pharm-review-card">
                    <div class="pr-stars">★★★★★</div>
                    <p>"Uploaded my father's diabetes prescription and got all medicines delivered in 22 minutes! Super fast and genuine batch numbers."</p>
                    <div class="pr-author">
                      <strong>Marcus Vance</strong>
                      <span>Brooklyn, NY · Verified Buyer</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PHARMACY FAQ ACCORDION -->
              <div class="pharmacy-faq-section">
                <div class="section-heading">
                  <div>
                    <span class="section-kicker">${icon('spark')} FREQUENTLY ASKED QUESTIONS</span>
                    <h2>Pharmacy & Medicine <em class="editorial">Help Center</em></h2>
                  </div>
                </div>
                <div class="faq-accordion-list">
                  ${faqs.map((faq, idx) => `
                    <details class="faq-item" ${idx === 0 ? 'open' : ''}>
                      <summary class="faq-question">
                        <strong>${faq.q}</strong>
                        <span class="faq-chevron">${icon('chevron')}</span>
                      </summary>
                      <div class="faq-answer">
                        <p>${faq.a}</p>
                      </div>
                    </details>
                  `).join('')}
                </div>
              </div>

            </div>

          </div>
        </section>
      </main>
      ${premiumFooter()}
      ${mobileBottomNav('pharmacy')}
    </div>

    <!-- FLOATING MINI CART BAR -->
    <div class="floating-cart-bar ${ctx.getCartCount() > 0 ? 'visible' : ''}" id="pharmacy-floating-cart">
      <div class="fcb-left">
        <span class="fcb-icon">${icon('bag')}</span>
        <div>
          <strong id="fcb-count-text">${ctx.getCartCount()} item${ctx.getCartCount() === 1 ? '' : 's'} added</strong>
          <span id="fcb-total-text">Total: ${formatINR(ctx.getCartTotal())}</span>
        </div>
      </div>
      <button class="button button-small button-light" data-nav="cart">View Cart & Checkout ${icon('arrow')}</button>
    </div>

    <!-- QUICK VIEW MODAL CONTAINER -->
    <div class="modal-overlay" id="quickview-modal" hidden>
      <div class="modal-content quickview-modal-content">
        <button class="modal-close" id="close-quickview" aria-label="Close modal">×</button>
        <div id="quickview-body"></div>
      </div>
    </div>

    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `

  function getFilteredProducts() {
    let list = products
    if (currentCategory !== 'all') list = list.filter(p => p.category === currentCategory)
    if (selectedBrand !== 'all') list = list.filter(p => p.manufacturer === selectedBrand)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) || p.manufacturer.toLowerCase().includes(q))
    }
    switch (sortBy) {
      case 'price-low': list = [...list].sort((a, b) => a.price - b.price); break
      case 'price-high': list = [...list].sort((a, b) => b.price - a.price); break
      case 'rating': list = [...list].sort((a, b) => b.rating - a.rating); break
      case 'discount': list = [...list].sort((a, b) => Math.round((1 - b.price / b.mrp) * 100) - Math.round((1 - a.price / a.mrp) * 100)); break
    }
    return list
  }

  function renderCategoryList() {
    const all = [{ id: 'all', label: 'All products', icon: 'bag' }, ...categories]
    return all.map(c => {
      const count = c.id === 'all' ? products.length : products.filter(p => p.category === c.id).length
      return `
        <button class="category-pill ${currentCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
          ${icon(c.icon)}
          <span>${c.label}</span>
          <span class="cat-count-badge">${count}</span>
        </button>
      `
    }).join('')
  }

  function updateFloatingCart() {
    const bar = appRoot.querySelector('#pharmacy-floating-cart')
    const countEl = appRoot.querySelector('#fcb-count-text')
    const totalEl = appRoot.querySelector('#fcb-total-text')
    const count = ctx.getCartCount()
    const total = ctx.getCartTotal()

    if (bar) {
      if (count > 0) bar.classList.add('visible')
      else bar.classList.remove('visible')
    }
    if (countEl) countEl.textContent = `${count} item${count === 1 ? '' : 's'} added`
    if (totalEl) totalEl.textContent = `Total: ${formatINR(total)}`
  }

  function renderProducts() {
    const list = getFilteredProducts()
    const grid = appRoot.querySelector('#product-grid')
    const count = appRoot.querySelector('#result-count')
    const filters = appRoot.querySelector('#active-filters')
    if (!grid) return
    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('search')}</div>
          <h3>No products found</h3>
          <p>Try a different search query, brand filter, or category.</p>
          <button class="button button-outline" id="clear-search">Clear Search Filters</button>
        </div>
      `
      count.textContent = ''
      filters.innerHTML = ''
      return
    }
    count.textContent = `${list.length} product${list.length !== 1 ? 's' : ''} available`
    let filterHtml = ''
    if (currentCategory !== 'all') {
      const c = categories.find(c => c.id === currentCategory)
      filterHtml += `<span class="filter-chip">${c ? c.label : ''} <button data-clear-cat="true">×</button></span>`
    }
    if (selectedBrand !== 'all') {
      filterHtml += `<span class="filter-chip">Brand: ${selectedBrand} <button data-clear-brand="true">×</button></span>`
    }
    if (searchQuery) filterHtml += `<span class="filter-chip">"${searchQuery}" <button data-clear-search="true">×</button></span>`
    filters.innerHTML = filterHtml
    grid.innerHTML = list.map(p => productCard(p)).join('')
    updateFloatingCart()
  }

  function productCard(p) {
    const discount = Math.round((1 - p.price / p.mrp) * 100)
    const isWishlisted = wishlist.has(p.id)
    const cartItem = ctx.cartState.find(i => i.id === p.id)

    return `
      <article class="product-card" data-product="${p.id}">
        <div class="product-image">
          <span class="product-avatar avatar-${p.color}">${p.initials}</span>
          ${discount > 0 ? `<span class="product-discount">-${discount}% OFF</span>` : ''}
          ${p.rx ? '<span class="product-rx">Rx Required</span>' : ''}
          ${p.stock === 'Low Stock' ? '<span class="product-low-stock">Low Stock</span>' : ''}
          <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-wishlist="${p.id}" aria-label="Save to Wishlist">
            ${icon('heart')}
          </button>
        </div>
        <div class="product-info">
          <div class="product-manufacturer-row">
            <span class="product-manufacturer">${p.manufacturer}</span>
            <button class="quickview-trigger-link" data-quickview="${p.id}">Quick View</button>
          </div>
          <h4 class="product-name">${p.name}</h4>
          <span class="product-pack">${p.pack}</span>
          <div class="product-rating">★ ${p.rating} <span>(${p.reviews} reviews)</span></div>
          <div class="product-price-row">
            <div class="product-price">
              <strong>${formatINR(p.price)}</strong>
              ${discount > 0 ? `<s>${formatINR(p.mrp)}</s>` : ''}
            </div>
            ${cartItem ? `
              <div class="card-qty-controller">
                <button data-qty-dec="${p.id}" aria-label="Decrease quantity">−</button>
                <span>${cartItem.qty}</span>
                <button data-qty-inc="${p.id}" aria-label="Increase quantity">+</button>
              </div>
            ` : `
              <button class="add-to-cart-btn" data-add="${p.id}">${icon('plus')} Add</button>
            `}
          </div>
        </div>
      </article>
    `
  }

  function update() {
    const list = appRoot.querySelector('#category-list')
    if (list) list.innerHTML = renderCategoryList()
    renderProducts()
    updateFloatingCart()
  }

  ctx.onCartChange(() => update())

  update()
  bindPharmacyEvents(appRoot, ctx, {
    currentCategory: { get: () => currentCategory, set: v => currentCategory = v },
    searchQuery: { get: () => searchQuery, set: v => searchQuery = v },
    selectedBrand: { get: () => selectedBrand, set: v => selectedBrand = v },
    sortBy: { get: () => sortBy, set: v => sortBy = v },
    wishlist,
    update
  })
}

function bindPharmacyEvents(appRoot, ctx, state) {
  const { navigate, addToCart, changeQty, requireAuth, showToast } = ctx
  bindNav(appRoot, ctx)
  const searchInput = appRoot.querySelector('#pharm-search')
  const sortSelect = appRoot.querySelector('#pharm-sort')
  const qvModal = appRoot.querySelector('#quickview-modal')
  const qvBody = appRoot.querySelector('#quickview-body')
  const closeQv = appRoot.querySelector('#close-quickview')

  appRoot.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault()
      navigate(el.dataset.nav)
    })
  })

  // Hero & Sidebar Rx upload buttons
  const heroRxBtn = appRoot.querySelector('#hero-rx-upload-trigger')
  const sidebarRxBtn = appRoot.querySelector('#sidebar-rx-btn')
  if (heroRxBtn) heroRxBtn.addEventListener('click', () => requireAuth(() => navigate('prescription'), 'UPLOAD_PRESCRIPTION'))
  if (sidebarRxBtn) sidebarRxBtn.addEventListener('click', () => requireAuth(() => navigate('prescription'), 'UPLOAD_PRESCRIPTION'))

  function handleSearch(value) {
    state.searchQuery.set(value)
    if (searchInput) searchInput.value = value
    state.update()
  }

  if (searchInput) searchInput.addEventListener('input', e => handleSearch(e.target.value))
  if (sortSelect) sortSelect.addEventListener('change', e => { state.sortBy.set(e.target.value); state.update() })

  // Brand buttons click
  appRoot.querySelectorAll('[data-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedBrand.set(btn.dataset.brand)
      appRoot.querySelectorAll('[data-brand]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      state.update()
    })
  })

  // Quick view helper
  function openQuickView(productId) {
    const p = products.find(prod => prod.id === productId)
    if (!p || !qvModal || !qvBody) return
    const discount = Math.round((1 - p.price / p.mrp) * 100)

    qvBody.innerHTML = `
      <div class="quickview-layout">
        <div class="qv-left">
          <div class="qv-image-box avatar-${p.color}">
            <span>${p.initials}</span>
            ${discount > 0 ? `<span class="product-discount">-${discount}% OFF</span>` : ''}
          </div>
          <div class="qv-badges">
            <span>${icon('verified')} Authentic Guaranteed</span>
            <span>${icon('shield')} Pharmacist Inspected</span>
          </div>
        </div>
        <div class="qv-right">
          <span class="qv-brand">${p.manufacturer}</span>
          <h2>${p.name}</h2>
          <span class="qv-pack">${p.pack}</span>
          <div class="qv-rating">★ ${p.rating} · (${p.reviews} verified reviews)</div>
          
          <div class="qv-price-row">
            <strong>${formatINR(p.price)}</strong>
            ${discount > 0 ? `<s>${formatINR(p.mrp)}</s><span class="save-chip">Save ${formatINR(p.mrp - p.price)}</span>` : ''}
          </div>

          <p class="qv-desc">${p.desc}</p>
          ${p.rx ? `<div class="qv-rx-alert">${icon('file')} Prescription required during checkout</div>` : ''}
          
          <div class="qv-tags">${p.tags.map(t => `<span class="qv-tag-chip">${t}</span>`).join('')}</div>

          <div class="qv-actions">
            <button class="button button-primary full-button" id="qv-add-cart">${icon('bag')} Add to Cart — ${formatINR(p.price)}</button>
          </div>
        </div>
      </div>
    `
    qvModal.hidden = false

    const addCartBtn = qvBody.querySelector('#qv-add-cart')
    if (addCartBtn) {
      addCartBtn.addEventListener('click', () => {
        addToCart(p.id, p)
        qvModal.hidden = true
      })
    }
  }

  if (closeQv && qvModal) {
    closeQv.addEventListener('click', () => qvModal.hidden = true)
    qvModal.addEventListener('click', e => { if (e.target === qvModal) qvModal.hidden = true })
  }

  appRoot.addEventListener('click', event => {
    const catTarget = event.target.closest('[data-cat]')
    if (catTarget) { state.currentCategory.set(catTarget.dataset.cat); state.update() }
    
    const qvLink = event.target.closest('[data-quickview]')
    if (qvLink) {
      event.stopPropagation()
      openQuickView(qvLink.dataset.quickview)
      return
    }

    const wishBtn = event.target.closest('[data-wishlist]')
    if (wishBtn) {
      event.stopPropagation()
      const pid = wishBtn.dataset.wishlist
      if (state.wishlist.has(pid)) {
        state.wishlist.delete(pid)
        showToast('Removed from Wishlist')
      } else {
        state.wishlist.add(pid)
        showToast('Saved to Wishlist!')
      }
      localStorage.setItem('thp_wishlist', JSON.stringify([...state.wishlist]))
      state.update()
      return
    }

    const incBtn = event.target.closest('[data-qty-inc]')
    if (incBtn) {
      event.stopPropagation()
      changeQty(incBtn.dataset.qtyInc, 1)
      return
    }

    const decBtn = event.target.closest('[data-qty-dec]')
    if (decBtn) {
      event.stopPropagation()
      changeQty(decBtn.dataset.qtyDec, -1)
      return
    }

    const addBtn = event.target.closest('[data-add]')
    if (addBtn) {
      event.stopPropagation()
      const p = products.find(p => p.id === addBtn.dataset.add)
      if (p) addToCart(p.id, p)
      return
    }

    const productCard = event.target.closest('[data-product]')
    if (productCard && !event.target.closest('[data-add]') && !event.target.closest('[data-qty-inc]') && !event.target.closest('[data-qty-dec]') && !event.target.closest('[data-quickview]') && !event.target.closest('[data-wishlist]')) {
      navigate('product', { id: productCard.dataset.product })
    }

    if (event.target.closest('[data-clear-cat]')) { state.currentCategory.set('all'); state.update() }
    if (event.target.closest('[data-clear-brand]')) { state.selectedBrand.set('all'); state.update() }
    if (event.target.closest('[data-clear-search]')) { handleSearch('') }
    if (event.target.closest('#clear-search')) { state.currentCategory.set('all'); state.selectedBrand.set('all'); handleSearch(''); state.update() }
  })
}
