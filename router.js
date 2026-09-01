import { cart } from './data.js'

export const cartState = cart
export let currentPage = 'home'
export let currentParams = {}

const app = document.querySelector('#app')
const listeners = { cartChange: [] }

export function onCartChange(fn) { listeners.cartChange.push(fn) }
export function notifyCartChange() { listeners.cartChange.forEach(fn => fn()) }

export function addToCart(productId, productData, qty = 1) {
  const existing = cartState.find(i => i.id === productId)
  if (existing) existing.qty = qty
  else cartState.push({ id: productId, name: productData.name, price: productData.price, mrp: productData.mrp, pack: productData.pack, rx: productData.rx, qty, initials: productData.initials, color: productData.color })
  notifyCartChange()
  const { showToast } = getCtx()
  if (showToast) showToast(`${productData.name} added to cart`)
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

export function navigate(page, params = {}) {
  currentPage = page
  currentParams = params
  window.scrollTo(0, 0)
  renderPage()
}

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
    showToast: (msg) => {
      const toast = document.querySelector('#toast')
      const text = document.querySelector('#toast-text')
      if (!toast) return
      text.textContent = msg
      toast.classList.add('is-visible')
      window.setTimeout(() => toast.classList.remove('is-visible'), 2800)
    }
  }
  currentCtx = ctx
  render(app, ctx)
}
