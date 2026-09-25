import { getDoctors as apiDoctors } from './api.js'
import { doctors as staticDoctors } from './data.js'
import { isAuthenticated, getAuthToken } from './auth.js'

let live = null
let liveForToken = null

const staticById = new Map(staticDoctors.map((d) => [d.id, d]))

export function getDoctors() {
  return live || staticDoctors
}

export function isLive() {
  return Boolean(live)
}

export function findDoctor(id) {
  const list = getDoctors()
  return (
    list.find((d) => String(d.id) === String(id)) ||
    staticDoctors.find((d) => String(d.id) === String(id)) ||
    null
  )
}

// Fetch the doctor list from the backend. The list is fetched with whatever
// token is currently set, so fee visibility follows the logged-in state.
// Falls back to the previous list (or static data) if the API is unreachable.
export async function ensureLive() {
  const token = getAuthToken()
  if (live && token === liveForToken) return getDoctors()
  try {
    const list = await apiDoctors(token)
    live = list
    liveForToken = token
  } catch {
    // keep current list (live or static fallback)
  }
  return getDoctors()
}

export function invalidate() {
  live = null
  liveForToken = null
}

export function feeNumber(d) {
  const n = typeof d.fee === 'number' ? d.fee : Number(d.fee || 0)
  return Number.isFinite(n) ? n : 0
}

// Fee used for internal sorting. The live public list omits fee, so fall back
// to the static value purely for ordering — it is never rendered.
export function sortFee(d) {
  const n = feeNumber(d)
  if (n > 0) return n
  const s = staticById.get(String(d.id))
  return s ? feeNumber(s) : 0
}

// Text shown beside "Consulting Fee". Returns null when the user is logged out
// so the card renders "Login to view" instead of a price.
export function feeText(d) {
  if (!isAuthenticated()) return null
  const n = feeNumber(d)
  if (n > 0) return `₹${n}`
  if (n === 0 && d.fee === 0) return 'Free'
  return null
}