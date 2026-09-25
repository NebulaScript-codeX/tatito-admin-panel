import { cart } from './data.js'
import { requireAuth, isAuthenticated, getAuthUser } from './auth.js'

export const cartState = cart
export let currentPage = 'home'
export let currentParams = {}

const app = document.querySelector('#app')
const listeners = { cartChange: [] }

const protectedPages = ['cart', 'checkout', 'records', 'dashboard', 'doctor-profile', 'hospital-portal', 'doctor-portal', 'clinic-portal', 'diagnostic-portal', 'pharmacy-portal']

// Routes restricted to a specific account role. Guards run for both direct
// hash loads and programmatic navigations so a patient can never sneak into
// the doctor dashboard (and an anonymous visitor must hit the login flow).
const rolePages = {
  'doctor-dashboard': 'doctor',
}

function guardPage(page) {
  const required = rolePages[page]
  if (!required) return page
  if (!isAuthenticated()) {
    requireAuth(() => {}, `OPEN_${String(page).toUpperCase()}`)
    return 'home'
  }
  const user = getAuthUser()
  if (!user || user.role !== required) return 'home'
  return page
}

function routeToUrl(page, params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) value.forEach(item => qs.append(key, String(item)))
    else qs.append(key, String(value))
  })
  const query = qs.toString()
  return `#/${page}${query ? `?${query}` : ''}`
}

function urlToRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '').replace(/^\/+/, '')
  const qIndex = hash.indexOf('?')
  const page = (qIndex >= 0 ? hash.slice(0, qIndex) : hash) || 'home'
  const query = qIndex >= 0 ? hash.slice(qIndex + 1) : ''
  const params = Object.fromEntries(new URLSearchParams(query))
  return { page, params }
}

function renderFromLocation() {
  const { page, params } = urlToRoute()
  const target = guardPage(page)
  if (target !== page) {
    currentPage = 'home'
    currentParams = {}
  } else if (protectedPages.includes(page) && !isAuthenticated()) {
    currentPage = 'home'
    currentParams = {}
  } else {
    currentPage = page
    currentParams = params
  }
  window.scrollTo(0, 0)
  renderPage()
}

export function onCartChange(fn) { listeners.cartChange.push(fn) }
export function notifyCartChange() { listeners.cartChange.forEach(fn => fn()) }

export function addToCart(productId, productData, qty = 1) {
  const doAdd = () => {
    const existing = cartState.find(i => i.id === productId)
    if (existing) existing.qty = qty
    else cartState.push({ id: productId, name: productData.name, price: productData.price, mrp: productData.mrp, pack: productData.pack, rx: productData.rx, qty, initials: productData.initials, color: productData.color })
    notifyCartChange()
    const { showToast } = getCtx()
    if (showToast) showToast(`${productData.name} added to cart`)
  }

  requireAuth(doAdd, 'ADD_TO_CART', { productId, productData, qty })
}

export function changeQty(productId, delta) {
  const item = cartState.find(i => i.id === productId)
  if (!item) return
  item.qty += delta
  if (item.qty <= 0) { const idx = cartState.findIndex(i => i.id === productId); if (idx >= 0) cartState.splice(idx, 1) }
  notifyCartChange()
}

export function removeFromCart(productId) {
  const idx = cartState.findIndex(i => i.id === productId)
  if (idx >= 0) { cartState.splice(idx, 1); notifyCartChange() }
}

export function getCartCount() { return cartState.reduce((s, i) => s + i.qty, 0) }
export function getCartTotal() { return cartState.reduce((s, i) => s + i.price * i.qty, 0) }

let currentCtx = null
function getCtx() { return currentCtx || {} }
export function getCurrentContext() { return currentCtx || {} }

export function navigate(page, params = {}) {
  const go = () => {
    const target = routeToUrl(page, params)
    const currentHash = (window.location.hash || '').replace(/^#/, '')
    if (currentHash === target.replace(/^#/, '')) {
      window.history.replaceState({ page, params }, '', target)
    } else {
      window.history.pushState({ page, params }, '', target)
    }
    currentPage = page
    currentParams = params
    window.scrollTo(0, 0)
    renderPage()
  }

  const target = guardPage(page)
  if (target !== page) {
    navigate(target, target === 'home' ? {} : params)
    return
  }

  if (protectedPages.includes(page) && !isAuthenticated()) {
    requireAuth(go, `OPEN_${page.toUpperCase()}`)
    return
  }

  go()
}
window.thpNavigate = navigate

export let pageRenders = {}

export function registerPages(renders) {
  pageRenders = renders
}

export function renderPage() {
  const render = pageRenders[currentPage] || pageRenders.home
  const ctx = {
    navigate,
    currentPage,
    currentParams,
    cartState,
    addToCart,
    changeQty,
    removeFromCart,
    getCartCount,
    getCartTotal,
    onCartChange,
    notifyCartChange,
    requireAuth,
    isAuthenticated,
    getAuthUser,
    showToast: (msg) => {
      const toast = document.querySelector('#toast')
      const text = document.querySelector('#toast-text')
      if (!toast) return
      text.textContent = msg
      toast.classList.add('is-visible')
      window.setTimeout(() => toast.classList.remove('is-visible'), 2800)
    }
  }
  window.thpShowToast = ctx.showToast
  currentCtx = ctx
  render(app, ctx)
  syncFixedHeader()
  if (window.thpInitChatbot) window.thpInitChatbot()
}

// The site header is position:fixed, so it is removed from document flow.
// Every page that renders it wraps its content in <main id="top">, which
// reserves space via --thp-header-h. Measuring the REAL rendered height of
// the header (announcement + site header + sub-nav) after every change keeps
// that clearance exact on every page and breakpoint. The same variable also
// drives scroll-into-view offsets (main/scroll-margin-top) and the sticky
// booking card's top offset.
function syncFixedHeader() {
  const root = document.documentElement
  const header = app.querySelector('.sticky-header-group')
  if (!header) {
    // No fixed site header on this page (auth pages, portals, doctor
    // workspace) — nothing to reserve; content flows from the top.
    root.style.setProperty('--thp-header-h', '0px')
    return
  }
  const height = Math.ceil(header.getBoundingClientRect().height)
  root.style.setProperty('--thp-header-h', `${height}px`)
}

// Register the sync hooks exactly once. The header's height can change after
// initial load when fonts finish loading, when login/logout swaps the auth
// buttons, when the header re-wraps on resize, or when a route re-renders
// (renderPage calls syncFixedHeader directly on every render).
function bootHeaderSync() {
  window.addEventListener('resize', syncFixedHeader)
  window.addEventListener('orientationchange', syncFixedHeader)
  window.addEventListener('thp-auth-changed', syncFixedHeader)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncFixedHeader).catch(() => {})
  }
  // Settle pass after the first paint in case webfonts/sub-nav reflow.
  window.setTimeout(syncFixedHeader, 350)
}

window.addEventListener('popstate', renderFromLocation)

export function bootRouter() {
  bootHeaderSync()
  renderFromLocation()
}

