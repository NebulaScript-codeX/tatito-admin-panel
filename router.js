import { cart } from './data.js'
import { requireAuth, isAuthenticated, getAuthUser } from './auth.js'

export const cartState = cart
export let currentPage = 'home'
export let currentParams = {}

const app = document.querySelector('#app')
const listeners = { cartChange: [] }

const protectedPages = ['cart', 'checkout', 'dashboard', 'hospital-portal', 'doctor-portal', 'clinic-portal', 'diagnostic-portal', 'pharmacy-portal']

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
  if (protectedPages.includes(page) && !isAuthenticated()) {
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
  if (window.thpInitChatbot) window.thpInitChatbot()
}

window.addEventListener('popstate', renderFromLocation)

export function bootRouter() {
  renderFromLocation()
}

