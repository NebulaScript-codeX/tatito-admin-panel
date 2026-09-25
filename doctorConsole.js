import { icon, showToast } from './ui.js'
import { getAuthUser } from './auth.js'
import { findDoctor } from './doctorCache.js'

// ---------------------------------------------------------------------------
// DOCTOR DASHBOARD — full practice console (sidebar shell with Dashboard,
// Appointments, Patients, Video/Audio calls, Chat, Orders, Payments, Listings,
// Offers, Analytics, Availability, Profile management and Settings pages).
// Scoped entirely under `.dsh-*` classes so it can never collide with the
// public site's markup or CSS, and styled to match the reference console.
// ---------------------------------------------------------------------------

function esc(v) {
  return String(v ?? '').replace(/"/g, '&quot;')
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLine() {
  const d = new Date()
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const day = d.toLocaleDateString('en-IN', { weekday: 'short' })
  return `${date} (${day})`
}

function initialsOf(name) {
  return String(name || '?')
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'Dr'
}

function detailParts(doc) {
  const raw = String(doc.detail || doc.qualification || '')
  const parts = raw.split('·').map((s) => s.trim()).filter(Boolean)
  return {
    qual: doc.qualification || parts[0] || 'MBBS, MD',
    exp: doc.experience || parts[1] || '14 years experience',
  }
}

function navGroup(label, items) {
  return `
    <div class="dsh-nav-label">${label}</div>
    ${items
      .map(
        ([id, ico, text, badge]) => `
      <button class="dsh-nav-item ${id === 'dashboard' ? 'active' : ''}" data-dsh="${id}">
        <span class="dsh-ico">${ico}</span>${text}${badge ? `<span class="dsh-badge">${badge}</span>` : ''}
      </button>`,
      )
      .join('')}
  `
}

function sidebarMarkup(user, doc) {
  return `
  <aside class="dsh-sidebar">
    <div class="dsh-brand"><span class="dsh-brand-mark">T</span>Health+ <span class="dsh-brand-sub">Doctor</span></div>
    ${navGroup('Main', [
      ['dashboard', '▦', 'Dashboard'],
      ['appointments', '🗓', 'Appointments', '6'],
      ['patients', '🧑‍🤝‍🧑', 'Patients'],
      ['video', '🎥', 'Video calls'],
      ['audio', '📞', 'Audio calls'],
      ['chat', '💬', 'Chat', '3'],
    ])}
    ${navGroup('Business', [
      ['orders', '🧾', 'Orders'],
      ['payments', '💳', 'Payments & payouts'],
      ['listings', '📋', 'My listings'],
      ['offers', '🏷️', 'Offers & promo codes'],
      ['analytics', '📊', 'Analytics'],
    ])}
    ${navGroup('Account', [
      ['availability', '🕘', 'Availability & slots'],
      ['profile', '👤', 'Profile management'],
      ['settings', '⚙️', 'Settings'],
    ])}
    <div class="dsh-sidefoot">
      <span class="dsh-avatar">${initialsOf(user.name || doc.name)}</span>
      <span>
        <span class="dsh-sidename">${esc(user.name || doc.name)}</span>
        <span class="dsh-siderole">${esc(doc.specialty || user.specialty || 'Doctor')}</span>
      </span>
    </div>
  </aside>`
}

function tabbarMarkup() {
  const items = [
    ['dashboard', '▦', 'Dashboard'],
    ['appointments', '🗓', 'Appointments'],
    ['patients', '🧑‍🤝‍🧑', 'Patients'],
    ['video', '🎥', 'Video'],
    ['audio', '📞', 'Audio'],
    ['chat', '💬', 'Chat'],
    ['orders', '🧾', 'Orders'],
    ['payments', '💳', 'Payments'],
    ['listings', '📋', 'Listings'],
    ['offers', '🏷️', 'Offers'],
    ['analytics', '📊', 'Analytics'],
    ['availability', '🕘', 'Slots'],
    ['profile', '👤', 'Profile'],
    ['settings', '⚙️', 'Settings'],
  ]
  return `
  <nav class="dsh-tabbar" aria-label="Doctor console pages">
    ${items
      .map(
        ([id, ico, text]) => `
      <button class="dsh-nav-item ${id === 'dashboard' ? 'active' : ''}" data-dsh="${id}"><span class="dsh-ico">${ico}</span>${text}</button>`,
      )
      .join('')}
  </nav>`
}

function dashboardPage(user, doc) {
  return `
    <section class="dsh-page active" data-dsh="dashboard">
      <div class="dsh-topbar"><div><h1>${greeting()}, ${esc(String(user.name || doc.name).replace(/^Dr\.?\s+/i, 'Dr. '))} 👋</h1><div class="dsh-muted">Here's what's happening with your practice today, ${todayLine()}</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="New appointment opens in Tatito Bookings.">+ New appointment</a></div>
      <div class="dsh-stat-row">
        <div class="dsh-stat-card"><div class="dsh-stat-l">Today's appointments</div><div class="dsh-stat-n">9</div><div class="dsh-stat-d">+2 vs yesterday</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">Earnings this month</div><div class="dsh-stat-n">₹1,84,200</div><div class="dsh-stat-d">+12% growth</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">Total patients</div><div class="dsh-stat-n">1,340</div><div class="dsh-stat-d">+18 this week</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">Pending payouts</div><div class="dsh-stat-n">₹22,400</div><div class="dsh-stat-d dsh-down">Processing</div></div>
      </div>
      <div class="dsh-grid2">
        <div class="dsh-card"><div class="dsh-card-head"><h3>Today's schedule</h3><a data-go="appointments">View all</a></div>
          <div class="dsh-sched-row"><div class="dsh-sched-time">9:30 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Lakshmi Devi — Follow-up</div><div class="dsh-sched-t2">General consult</div></div><div class="dsh-mode-pill">Video</div><div class="dsh-join-btn" data-toast="Starting video call…">Join</div></div>
          <div class="dsh-sched-row"><div class="dsh-sched-time">10:15 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Prasad Rao — New patient</div><div class="dsh-sched-t2">Fever, body pain</div></div><div class="dsh-mode-pill">Audio</div><div class="dsh-join-btn" data-toast="Starting audio call…">Join</div></div>
          <div class="dsh-sched-row"><div class="dsh-sched-time">11:00 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Anjali Sharma — Review</div><div class="dsh-sched-t2">Chat consult</div></div><div class="dsh-mode-pill dsh-chat-pill">Chat</div><div class="dsh-join-btn" data-go="chat">Open</div></div>
        </div>
        <div class="dsh-card"><div class="dsh-card-head"><h3>Live video call</h3><a data-go="video">Full screen</a></div>
          <div class="dsh-call-tile"><span class="dsh-avatar">LD</span><span class="dsh-call-name">Lakshmi Devi</span><span class="dsh-call-sub">03:41 · good connection</span></div>
          <div class="dsh-call-controls"><span class="dsh-cbtn">🎤</span><span class="dsh-cbtn">📷</span><span class="dsh-cbtn">💬</span><span class="dsh-cbtn dsh-cbtn-end">✕</span></div>
        </div>
      </div>
      <div class="dsh-grid2">
        <div class="dsh-card"><div class="dsh-card-head"><h3>Recent orders</h3><a data-go="orders">View all</a></div>
          <div class="dsh-scrollx"><table class="dsh-table"><tr><th>Patient</th><th>Item</th><th>Amount</th><th>Status</th></tr>
          <tr><td>Lakshmi Devi</td><td>Video consult</td><td>₹299</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
          <tr><td>Anjali Sharma</td><td>Pharmacy order</td><td>₹640</td><td><span class="dsh-tag dsh-tag-pending">Pending</span></td></tr></table></div>
        </div>
        <div class="dsh-card"><div class="dsh-card-head"><h3>Offers</h3><a data-go="offers">Manage</a></div>
          <div class="dsh-promo-row"><div><div class="dsh-promo-code">HEALTH100</div><div class="dsh-promo-sub">₹100 off · first video consult</div></div><div class="dsh-toggle on"></div></div>
          <div class="dsh-promo-row"><div><div class="dsh-promo-code">FAMCARE20</div><div class="dsh-promo-sub">20% off · family bookings</div></div><div class="dsh-toggle on"></div></div>
        </div>
      </div>
    </section>`
}

function appointmentsPage() {
  return `
    <section class="dsh-page" data-dsh="appointments">
      <div class="dsh-topbar"><div><h1>Appointments</h1><div class="dsh-muted">All your upcoming, completed and cancelled bookings</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="New appointment opens in Tatito Bookings.">+ New appointment</a></div>
      <div class="dsh-tabs"><button class="on">Upcoming (6)</button><button>Completed</button><button>Cancelled</button><button>Reschedule requests</button></div>
      <div class="dsh-card">
        <div class="dsh-sched-row"><div class="dsh-sched-time">Today<br>9:30 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Lakshmi Devi</div><div class="dsh-sched-t2">Follow-up · General consult</div></div><div class="dsh-mode-pill">Video</div><div class="dsh-join-btn" data-toast="Starting video call…">Join</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">Today<br>10:15 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Prasad Rao</div><div class="dsh-sched-t2">New patient · Fever</div></div><div class="dsh-mode-pill">Audio</div><div class="dsh-join-btn" data-toast="Starting audio call…">Join</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">Today<br>2:30 PM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Kiran Kumar</div><div class="dsh-sched-t2">Clinic visit · Room 2</div></div><div class="dsh-mode-pill dsh-mode-clinic">Clinic</div><div class="dsh-join-btn dsh-join-later">Later</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">Tomorrow<br>6:30 PM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Swathi Reddy</div><div class="dsh-sched-t2">Skin consult</div></div><div class="dsh-mode-pill">Video</div><div class="dsh-join-btn dsh-join-later">Later</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">28 Sep<br>11:00 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Ravi Teja</div><div class="dsh-sched-t2">Ortho review</div></div><div class="dsh-mode-pill dsh-chat-pill">Chat</div><div class="dsh-join-btn dsh-join-later" data-go="chat">Open</div></div>
      </div>
    </section>`
}

function patientsPage() {
  return `
    <section class="dsh-page" data-dsh="patients">
      <div class="dsh-topbar"><div><h1>Patients</h1><div class="dsh-muted">1,340 patients across all consult types</div></div>
        <a class="dsh-btn dsh-btn-ghost" data-toast="Patient list export queued.">Export list</a></div>
      <div class="dsh-card"><div class="dsh-scrollx"><table class="dsh-table">
        <tr><th>Patient</th><th>Age</th><th>Last visit</th><th>Condition</th><th></th></tr>
        <tr><td>Lakshmi Devi</td><td>42</td><td>23 Sep 2026</td><td>Hypertension follow-up</td><td><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Loading patient record…">View</a></td></tr>
        <tr><td>Prasad Rao</td><td>35</td><td>23 Sep 2026</td><td>Viral fever</td><td><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Loading patient record…">View</a></td></tr>
        <tr><td>Anjali Sharma</td><td>29</td><td>21 Sep 2026</td><td>Skin allergy</td><td><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Loading patient record…">View</a></td></tr>
        <tr><td>Kiran Kumar</td><td>51</td><td>19 Sep 2026</td><td>Knee pain</td><td><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Loading patient record…">View</a></td></tr>
        <tr><td>Ravi Teja</td><td>38</td><td>15 Sep 2026</td><td>Back pain, follow-up</td><td><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Loading patient record…">View</a></td></tr>
      </table></div></div>
    </section>`
}

function videoPage() {
  return `
    <section class="dsh-page" data-dsh="video">
      <div class="dsh-topbar"><div><h1>Video calls</h1><div class="dsh-muted">Scheduled and instant video consults</div></div></div>
      <div class="dsh-grid2">
        <div class="dsh-card"><div class="dsh-card-head"><h3>Upcoming video calls</h3></div>
          <div class="dsh-sched-row"><div class="dsh-sched-time">9:30 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Lakshmi Devi</div><div class="dsh-sched-t2">Follow-up</div></div><div class="dsh-join-btn" data-toast="Starting video call…">Join</div></div>
          <div class="dsh-sched-row"><div class="dsh-sched-time">6:30 PM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Swathi Reddy</div><div class="dsh-sched-t2">Skin consult</div></div><div class="dsh-join-btn dsh-join-later">Later</div></div>
        </div>
        <div class="dsh-card"><div class="dsh-card-head"><h3>Live now</h3></div>
          <div class="dsh-call-tile"><span class="dsh-avatar">LD</span><span class="dsh-call-name">Lakshmi Devi</span><span class="dsh-call-sub">03:41 · HD quality</span></div>
          <div class="dsh-call-controls"><span class="dsh-cbtn">🎤</span><span class="dsh-cbtn">📷</span><span class="dsh-cbtn">🖥️</span><span class="dsh-cbtn dsh-cbtn-end">✕</span></div>
        </div>
      </div>
    </section>`
}

function audioPage() {
  return `
    <section class="dsh-page" data-dsh="audio">
      <div class="dsh-topbar"><div><h1>Audio calls</h1><div class="dsh-muted">Voice-only consults, lighter on data</div></div></div>
      <div class="dsh-card">
        <div class="dsh-sched-row"><div class="dsh-sched-time">10:15 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Prasad Rao</div><div class="dsh-sched-t2">New patient · Fever</div></div><div class="dsh-join-btn" data-toast="Starting audio call…">Join</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">4:00 PM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Meena Kumari</div><div class="dsh-sched-t2">Diabetes review</div></div><div class="dsh-join-btn" data-toast="Starting audio call…">Join</div></div>
        <div class="dsh-sched-row"><div class="dsh-sched-time">Tomorrow<br>9:00 AM</div><div class="dsh-sched-info"><div class="dsh-sched-t1">Naveen Reddy</div><div class="dsh-sched-t2">General checkup</div></div><div class="dsh-join-btn dsh-join-later">Later</div></div>
      </div>
    </section>`
}

function chatPage() {
  return `
    <section class="dsh-page" data-dsh="chat">
      <div class="dsh-topbar"><div><h1>Chat</h1><div class="dsh-muted">Message your patients directly</div></div></div>
      <div class="dsh-chat-shell">
        <div class="dsh-chat-list">
          <div class="dsh-chat-item on"><span class="dsh-avatar" style="width:34px;height:34px;font-size:0.78rem;">AS</span><div><div class="dsh-chat-name">Anjali Sharma</div><div class="dsh-chat-msg">Doctor, can I take it before food?</div></div></div>
          <div class="dsh-chat-item"><span class="dsh-avatar" style="width:34px;height:34px;font-size:0.78rem;">RT</span><div><div class="dsh-chat-name">Ravi Teja</div><div class="dsh-chat-msg">Reports uploaded, please check.</div></div></div>
          <div class="dsh-chat-item"><span class="dsh-avatar" style="width:34px;height:34px;font-size:0.78rem;">PN</span><div><div class="dsh-chat-name">Priya N.</div><div class="dsh-chat-msg">Thank you doctor 🙏</div></div></div>
        </div>
        <div class="dsh-chat-thread">
          <div class="dsh-thread-head">Anjali Sharma</div>
          <div class="dsh-thread-body">
            <div class="dsh-bubble dsh-bubble-them">Good morning doctor, I started the tablets you prescribed.</div>
            <div class="dsh-bubble dsh-bubble-me">Good, continue twice daily after food for 5 days.</div>
            <div class="dsh-bubble dsh-bubble-them">Doctor, can I take it before food?</div>
          </div>
          <div class="dsh-thread-input"><input type="text" placeholder="Type a message..."><a class="dsh-btn dsh-btn-primary" data-toast="Message sent.">Send</a></div>
        </div>
      </div>
    </section>`
}

function ordersPage() {
  return `
    <section class="dsh-page" data-dsh="orders">
      <div class="dsh-topbar"><div><h1>Orders</h1><div class="dsh-muted">Consults, lab tests and pharmacy orders</div></div></div>
      <div class="dsh-tabs"><button class="on">All</button><button>Consults</button><button>Lab tests</button><button>Pharmacy</button></div>
      <div class="dsh-card"><div class="dsh-scrollx"><table class="dsh-table">
        <tr><th>Order</th><th>Patient</th><th>Amount</th><th>Status</th></tr>
        <tr><td>Video consult</td><td>Lakshmi Devi</td><td>₹299</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
        <tr><td>Lab test — CBC</td><td>Prasad Rao</td><td>₹450</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
        <tr><td>Pharmacy order</td><td>Anjali Sharma</td><td>₹640</td><td><span class="dsh-tag dsh-tag-pending">Pending</span></td></tr>
        <tr><td>Clinic visit</td><td>Kiran Kumar</td><td>₹399</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
        <tr><td>Chat consult</td><td>Ravi Teja</td><td>₹199</td><td><span class="dsh-tag dsh-tag-done">Completed</span></td></tr>
      </table></div></div>
    </section>`
}

function paymentsPage() {
  return `
    <section class="dsh-page" data-dsh="payments">
      <div class="dsh-topbar"><div><h1>Payments & payouts</h1><div class="dsh-muted">Track your earnings and bank transfers</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="Withdrawal requested for review.">Withdraw funds</a></div>
      <div class="dsh-stat-row">
        <div class="dsh-stat-card"><div class="dsh-stat-l">Available balance</div><div class="dsh-stat-n">₹22,400</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">This month</div><div class="dsh-stat-n">₹1,84,200</div><div class="dsh-stat-d">+12%</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">Last payout</div><div class="dsh-stat-n">₹38,000</div><div class="dsh-stat-d">18 Sep</div></div>
        <div class="dsh-stat-card"><div class="dsh-stat-l">Platform fee</div><div class="dsh-stat-n">8%</div></div>
      </div>
      <div class="dsh-card"><div class="dsh-card-head"><h3>Payout history</h3></div><div class="dsh-scrollx"><table class="dsh-table">
        <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr>
        <tr><td>18 Sep 2026</td><td>₹38,000</td><td>Bank transfer</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
        <tr><td>04 Sep 2026</td><td>₹41,500</td><td>Bank transfer</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
        <tr><td>21 Aug 2026</td><td>₹35,900</td><td>Bank transfer</td><td><span class="dsh-tag dsh-tag-paid">Paid</span></td></tr>
      </table></div></div>
    </section>`
}

function listingsPage(doc) {
  const videoFee = doc.fee && Number(doc.fee) > 0 ? `₹${Number(doc.fee).toLocaleString('en-IN')}` : '₹299'
  return `
    <section class="dsh-page" data-dsh="listings">
      <div class="dsh-topbar"><div><h1>My listings</h1><div class="dsh-muted">Consult types you offer and their pricing</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="Listing wizard opens in Tatito Bookings.">+ Add listing</a></div>
      <div class="dsh-grid3">
        <div class="dsh-card dsh-listing-card"><h3 class="dsh-listing-title">Video consult</h3><div class="dsh-price">${videoFee}<span>/session</span></div><div class="dsh-muted dsh-listing-sub">15 min · General consult</div><a class="dsh-btn dsh-btn-ghost" data-go="profile">Edit</a></div>
        <div class="dsh-card dsh-listing-card"><h3 class="dsh-listing-title">Audio consult</h3><div class="dsh-price">₹249<span>/session</span></div><div class="dsh-muted dsh-listing-sub">15 min · Voice only</div><a class="dsh-btn dsh-btn-ghost" data-go="profile">Edit</a></div>
        <div class="dsh-card dsh-listing-card"><h3 class="dsh-listing-title">Clinic visit</h3><div class="dsh-price">₹399<span>/visit</span></div><div class="dsh-muted dsh-listing-sub">In-person · ${esc(doc.location || 'Your clinic')}</div><a class="dsh-btn dsh-btn-ghost" data-go="profile">Edit</a></div>
      </div>
    </section>`
}

function offersPage() {
  return `
    <section class="dsh-page" data-dsh="offers">
      <div class="dsh-topbar"><div><h1>Offers & promo codes</h1><div class="dsh-muted">Create and manage discounts for patients</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="Promo code creator opened.">+ Create code</a></div>
      <div class="dsh-grid2">
        <div class="dsh-card">
          <div class="dsh-promo-row"><div><div class="dsh-promo-code">HEALTH100</div><div class="dsh-promo-sub">Flat ₹100 off · first video consult</div></div><div class="dsh-toggle on"></div></div>
          <div class="dsh-promo-row"><div><div class="dsh-promo-code">FAMCARE20</div><div class="dsh-promo-sub">20% off · family profile bookings</div></div><div class="dsh-toggle on"></div></div>
          <div class="dsh-promo-row"><div><div class="dsh-promo-code">WEEKEND50</div><div class="dsh-promo-sub">₹50 off · Sat–Sun appointments</div></div><div class="dsh-toggle"></div></div>
        </div>
        <div class="dsh-card">
          <div class="dsh-form-field"><label>Code name</label><input type="text" placeholder="e.g. WELCOME50"></div>
          <div class="dsh-form-field"><label>Discount</label><input type="text" placeholder="e.g. 50 or 10%"></div>
          <a class="dsh-btn dsh-btn-primary" style="width:100%;justify-content:center;" data-toast="Promo code saved.">Save code</a>
        </div>
      </div>
    </section>`
}

function analyticsPage() {
  return `
    <section class="dsh-page" data-dsh="analytics">
      <div class="dsh-topbar"><div><h1>Analytics</h1><div class="dsh-muted">Practice performance over the last 6 months</div></div></div>
      <div class="dsh-card">
        <div class="dsh-card-head"><h3>Monthly earnings</h3></div>
        <div class="dsh-bar-chart">
          <div class="dsh-bar" style="height:55%;"><span>Apr</span></div>
          <div class="dsh-bar" style="height:68%;"><span>May</span></div>
          <div class="dsh-bar" style="height:48%;"><span>Jun</span></div>
          <div class="dsh-bar" style="height:74%;"><span>Jul</span></div>
          <div class="dsh-bar" style="height:82%;"><span>Aug</span></div>
          <div class="dsh-bar" style="height:100%;"><span>Sep</span></div>
        </div>
      </div>
    </section>`
}

function availabilityPage() {
  return `
    <section class="dsh-page" data-dsh="availability">
      <div class="dsh-topbar"><div><h1>Availability & slots</h1><div class="dsh-muted">Set the times patients can book you</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="Weekly availability saved.">Save changes</a></div>
      <div class="dsh-card">
        <div class="dsh-slot-grid">
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Mon</div><div class="dsh-slot">9–11 AM</div><div class="dsh-slot">4–6 PM</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Tue</div><div class="dsh-slot">9–11 AM</div><div class="dsh-slot">4–6 PM</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Wed</div><div class="dsh-slot">9–11 AM</div><div class="dsh-slot dsh-slot-off">Off</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Thu</div><div class="dsh-slot">9–11 AM</div><div class="dsh-slot">4–6 PM</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Fri</div><div class="dsh-slot">9–11 AM</div><div class="dsh-slot">4–6 PM</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Sat</div><div class="dsh-slot">10 AM–1 PM</div><div class="dsh-slot dsh-slot-off">Off</div></div>
          <div class="dsh-slot-day"><div class="dsh-slot-day-name">Sun</div><div class="dsh-slot dsh-slot-off">Off</div><div class="dsh-slot dsh-slot-off">Off</div></div>
        </div>
      </div>
    </section>`
}

function profilePage(doc, user) {
  const d = detailParts(doc)
  const specialtyOptions = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Pediatrician',
    'Orthopedic Surgeon', 'Gynecologist', 'ENT Specialist', 'Neurologist',
    'Dentist', 'Psychiatrist', 'Ophthalmologist', 'Dietitian',
  ]
  const chosen = specializationOf(doc.specialty, specialtyOptions)
  return `
    <section class="dsh-page" data-dsh="profile">
      <div class="dsh-topbar"><div><h1>Profile management</h1><div class="dsh-muted">This is what patients see on your listing</div></div>
        <a class="dsh-btn dsh-btn-primary" data-toast="Profile saved (you can also use Tatito's Profile manager).">Save profile</a></div>
      <div class="dsh-card dsh-profile-card">
        <div class="dsh-form-row">
          <div class="dsh-form-field"><label>Full name</label><input type="text" value="${esc(doc.name || user.name || '')}"></div>
          <div class="dsh-form-field"><label>Speciality</label><select>
            ${specialtyOptions.map((o) => `<option ${o === chosen ? 'selected' : ''}>${esc(o)}</option>`).join('')}
          </select></div>
        </div>
        <div class="dsh-form-row">
          <div class="dsh-form-field"><label>Experience (years)</label><input type="text" value="${esc(d.exp)}"></div>
          <div class="dsh-form-field"><label>Clinic name</label><input type="text" value="${esc(doc.location || 'Kadapa Clinic')}"></div>
        </div>
        <div class="dsh-form-field"><label>About</label><textarea rows="3">Experienced general physician focused on preventive care and long-term patient relationships.</textarea></div>
      </div>
    </section>`
}

function specializationOf(sp, options) {
  if (!sp) return options[0]
  const lower = sp.toLowerCase()
  const hit = options.find((o) => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower))
  return hit || options[0]
}

function settingsPage() {
  return `
    <section class="dsh-page" data-dsh="settings">
      <div class="dsh-topbar"><div><h1>Settings</h1><div class="dsh-muted">Notifications, language and payment preferences</div></div></div>
      <div class="dsh-card dsh-profile-card">
        <div class="dsh-setting-row"><div><div class="dsh-setting-t1">Appointment reminders</div><div class="dsh-setting-t2">Get notified 30 min before each consult</div></div><div class="dsh-toggle on"></div></div>
        <div class="dsh-setting-row"><div><div class="dsh-setting-t1">Chat notifications</div><div class="dsh-setting-t2">Push alerts for new patient messages</div></div><div class="dsh-toggle on"></div></div>
        <div class="dsh-setting-row"><div><div class="dsh-setting-t1">Auto-accept bookings</div><div class="dsh-setting-t2">Skip manual approval for new appointments</div></div><div class="dsh-toggle"></div></div>
        <div class="dsh-setting-row"><div><div class="dsh-setting-t1">Payout account</div><div class="dsh-setting-t2">HDFC Bank ····4821</div></div><a class="dsh-btn dsh-btn-ghost dsh-btn-sm" data-toast="Payout account change flow opened.">Change</a></div>
      </div>
    </section>`
}

function consoleMarkup(user, doc) {
  return `
  <main class="dsh-console">
    ${sidebarMarkup(user, doc)}
    <div class="dsh-main">
      ${tabbarMarkup()}
      <div class="dsh-body">
        ${dashboardPage(user, doc)}
        ${appointmentsPage()}
        ${patientsPage()}
        ${videoPage()}
        ${audioPage()}
        ${chatPage()}
        ${ordersPage()}
        ${paymentsPage()}
        ${listingsPage(doc)}
        ${offersPage()}
        ${analyticsPage()}
        ${availabilityPage()}
        ${profilePage(doc, user)}
        ${settingsPage()}
      </div>
    </div>
  </main>`
}

function bindConsole(root, ctx) {
  const pages = root.querySelectorAll('.dsh-page')
  const show = (pageId) => {
    pages.forEach((p) => p.classList.toggle('active', p.dataset.dsh === pageId))
    root.querySelectorAll('.dsh-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.dsh === pageId))
    if (typeof ctx?.scrollTo === 'function') ctx.scrollTo(0, 0)
    else window.scrollTo(0, 0)
  }
  root.querySelectorAll('.dsh-nav-item').forEach((btn) =>
    btn.addEventListener('click', () => show(btn.dataset.dsh)),
  )
  root.querySelectorAll('[data-go]').forEach((el) => {
    el.style.cursor = 'pointer'
    el.addEventListener('click', () => show(el.dataset.go))
  })
  root.querySelectorAll('.dsh-toggle').forEach((t) =>
    t.addEventListener('click', () => t.classList.toggle('on')),
  )
  root.querySelectorAll('.dsh-tabs').forEach((group) => {
    group.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((x) => x.classList.remove('on'))
        b.classList.add('on')
      }),
    )
  })
  const chatItems = root.querySelectorAll('.dsh-chat-item')
  chatItems.forEach((item) =>
    item.addEventListener('click', () => {
      chatItems.forEach((x) => x.classList.remove('on'))
      item.classList.add('on')
      const name = item.querySelector('.dsh-chat-name')?.textContent
      const head = root.querySelector('.dsh-thread-head')
      if (name && head) head.textContent = name
    }),
  )
  root.querySelectorAll('[data-toast]').forEach((el) =>
    el.addEventListener('click', () => showToast(el.dataset.toast || 'Saved.')),
  )
}

export function renderDoctorConsole(appRoot, ctx) {
  const user = getAuthUser() || {}
  const doctorId = user.doctorId
  const doc = (doctorId && findDoctor(doctorId)) || {}
  appRoot.innerHTML = `
    <div class="app-shell">
      ${consoleMarkup(user, doc)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon('check')}</span><span id="toast-text">Saved</span></div>`
  const main = appRoot.querySelector('.dsh-console')
  if (main) bindConsole(main, ctx)
}