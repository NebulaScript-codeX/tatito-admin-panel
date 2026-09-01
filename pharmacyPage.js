import { icons, icon, avatar, showToast, premiumFooter, mobileBottomNav } from './ui.js'
import { categories, products } from './data.js'
import { sharedHeader } from './pages.js'

export function renderPharmacy(appRoot, ctx) {
  const { navigate, currentParams, getCartCount, addToCart, requireAuth } = ctx
  let currentCategory = currentParams.category || 'all'
  let searchQuery = currentParams.search || ''
  let sortBy = 'popular'

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, 'pharmacy')}
      <main id="top" class="pharmacy-main">
        
        <!-- HERO BANNER -->
        <div class="pharmacy-hero-bar">
          <div class="pharmacy-hero-content">
            <span class="eyebrow-tag">${icon('pills')} 100% GENUINE MEDICINES & WELLNESS</span>
            <h1>Certified Pharmacy,<br><em class="editorial">delivered to your door in 30 mins.</em></h1>
            <p>Authentic prescription medicines, daily wellness supplements, and medical devices managed by licensed pharmacists.</p>
            <div class="pharmacy-hero-actions">
              <div class="hero-rx-dropzone" id="hero-rx-upload-trigger">
                <span class="hrd-icon">${icon('file')}</span>
                <div class="hrd-text">
                  <strong>Have a Doctor's Prescription?</strong>
                  <span>Upload your Rx & we'll prepare your medicines</span>
                </div>
                <button class="button button-small button-light">${icon('plus')} Upload Rx</button>
              </div>
            </div>
          </div>
        </div>

        <!-- PROMOTIONAL HIGHLIGHTS BAR -->
        <div class="pharmacy-banner-row">
          <div class="pharmacy-banner banner-gold">
            <div class="pb-icon">${icon('spark')}</div>
            <div><strong>Up to 40% Off Daily Vitamins</strong><span>Support immune & bone health</span></div>
          </div>
          <div class="pharmacy-banner banner-navy">
            <div class="pb-icon">${icon('shield')}</div>
            <div><strong>Diabetes Care Essentials</strong><span>Continuous glucose monitors & strips</span></div>
          </div>
          <div class="pharmacy-banner banner-teal">
            <div class="pb-icon">${icon('pills')}</div>
            <div><strong>Free Express Delivery Over $25</strong><span>On all valid medicine orders</span></div>
          </div>
        </div>

        <!-- MAIN CONTENT AREA WITH SIDEBAR -->
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
                <button class="button button-small button-outline full-button" data-nav="prescription">${icon('plus')} Upload Now</button>
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
          </div>

        </div>
      </main>
      ${premiumFooter()}
      ${mobileBottomNav('pharmacy')}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>
  `

  function getFilteredProducts() {
    let list = products
    if (currentCategory !== 'all') list = list.filter(p => p.category === currentCategory)
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
    return all.map(c => `
      <button class="category-pill ${currentCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
        ${icon(c.icon)}
        <span>${c.label}</span>
      </button>
    `).join('')
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
          <p>Try a different search query or category filter.</p>
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
    if (searchQuery) filterHtml += `<span class="filter-chip">"${searchQuery}" <button data-clear-search="true">×</button></span>`
    filters.innerHTML = filterHtml
    grid.innerHTML = list.map(p => productCard(p)).join('')
  }

  function productCard(p) {
    const discount = Math.round((1 - p.price / p.mrp) * 100)
    return `
      <article class="product-card" data-product="${p.id}">
        <div class="product-image">
          <span class="product-avatar avatar-${p.color}">${p.initials}</span>
          ${discount > 0 ? `<span class="product-discount">-${discount}% OFF</span>` : ''}
          ${p.rx ? '<span class="product-rx">Rx Required</span>' : ''}
          ${p.stock === 'Low Stock' ? '<span class="product-low-stock">Low Stock</span>' : ''}
        </div>
        <div class="product-info">
          <span class="product-manufacturer">${p.manufacturer}</span>
          <h4 class="product-name">${p.name}</h4>
          <span class="product-pack">${p.pack}</span>
          <div class="product-rating">★ ${p.rating} <span>(${p.reviews} reviews)</span></div>
          <div class="product-price-row">
            <div class="product-price">
              <strong>$${p.price.toFixed(2)}</strong>
              ${discount > 0 ? `<s>$${p.mrp.toFixed(2)}</s>` : ''}
            </div>
            <button class="add-to-cart-btn" data-add="${p.id}">${icon('plus')} Add</button>
          </div>
        </div>
      </article>
    `
  }

  function update() {
    const list = appRoot.querySelector('#category-list')
    if (list) list.innerHTML = renderCategoryList()
    renderProducts()
  }

  update()
  bindPharmacyEvents(appRoot, ctx, {
    currentCategory: { get: () => currentCategory, set: v => currentCategory = v },
    searchQuery: { get: () => searchQuery, set: v => searchQuery = v },
    sortBy: { get: () => sortBy, set: v => sortBy = v },
    update
  })
}

function bindPharmacyEvents(appRoot, ctx, state) {
  const { navigate, addToCart, requireAuth } = ctx
  const searchInput = appRoot.querySelector('#pharm-search')
  const sortSelect = appRoot.querySelector('#pharm-sort')

  appRoot.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault()
      navigate(el.dataset.nav)
    })
  })

  // Hero RX Dropzone trigger
  const heroRxBtn = appRoot.querySelector('#hero-rx-upload-trigger')
  if (heroRxBtn) {
    heroRxBtn.addEventListener('click', () => {
      requireAuth(() => navigate('prescription'), 'UPLOAD_PRESCRIPTION')
    })
  }

  function handleSearch(value) {
    state.searchQuery.set(value)
    if (searchInput) searchInput.value = value
    state.update()
  }

  if (searchInput) searchInput.addEventListener('input', e => handleSearch(e.target.value))
  if (sortSelect) sortSelect.addEventListener('change', e => { state.sortBy.set(e.target.value); state.update() })

  appRoot.addEventListener('click', event => {
    const catTarget = event.target.closest('[data-cat]')
    if (catTarget) { state.currentCategory.set(catTarget.dataset.cat); state.update() }
    
    const addBtn = event.target.closest('[data-add]')
    if (addBtn) {
      event.stopPropagation()
      const p = products.find(p => p.id === addBtn.dataset.add)
      if (p) addToCart(p.id, p)
    }

    const productCard = event.target.closest('[data-product]')
    if (productCard && !event.target.closest('[data-add]')) {
      navigate('product', { id: productCard.dataset.product })
    }

    if (event.target.closest('[data-clear-cat]')) { state.currentCategory.set('all'); state.update() }
    if (event.target.closest('[data-clear-search]')) { handleSearch('') }
    if (event.target.closest('#clear-search')) { state.currentCategory.set('all'); handleSearch(''); state.update() }
  })
}
