import { doctors, doctorSpecialties, products, labTests, labPackages } from './data.js'
import { icon, avatar, showToast } from './ui.js'
import { navigate, addToCart } from './router.js'

const STORAGE_KEY = 'tatito_ai_chat_history'
const POS_STORAGE_KEY = 'tatito_chatbot_pos'

let state = {
  isOpen: false,
  isMinimized: false,
  unreadCount: 0,
  isTyping: false,
  messages: []
}

// Initial default welcome messages if session is empty
const defaultWelcomeMessages = [
  {
    id: 'msg-welcome-1',
    sender: 'ai',
    text: "Hello! 👋 I'm **Aria**, your AI Healthcare Assistant. How can I help you today?",
    timestamp: formatTime(new Date()),
    quickReplies: [
      { label: '👨‍⚕️ Find a Doctor', action: 'find_doctor' },
      { label: '🩺 Specializations', action: 'specializations' },
      { label: '🧪 Book a Lab Test', action: 'lab_tests' },
      { label: '💊 Pharmacy Services', action: 'pharmacy' },
      { label: '🏥 Health Services', action: 'services' }
    ]
  }
]

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function loadHistory() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.messages = parsed
        return
      }
    }
  } catch (e) {
    console.warn('Failed to load chat history', e)
  }
  state.messages = [...defaultWelcomeMessages]
}

function saveHistory() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages))
  } catch (e) {
    console.warn('Failed to save chat history', e)
  }
}

/* -------------------------------------------------------------------------- */
/* Draggable Helper Functions & Position Persistence                          */
/* -------------------------------------------------------------------------- */

function clampPosition(x, y, btnW = 64, btnH = 64) {
  const margin = 12
  const maxX = Math.max(margin, window.innerWidth - btnW - margin)
  const maxY = Math.max(margin, window.innerHeight - btnH - margin)
  const clampedX = Math.max(margin, Math.min(x, maxX))
  const clampedY = Math.max(margin, Math.min(y, maxY))
  return { x: clampedX, y: clampedY }
}

function applyPosition(btn, x, y) {
  btn.style.left = `${x}px`
  btn.style.top = `${y}px`
  btn.style.right = 'auto'
  btn.style.bottom = 'auto'
  btn.style.position = 'fixed'
}

function savePosition(x, y) {
  try {
    localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ x, y }))
  } catch (e) {
    console.warn('Failed to save chatbot position', e)
  }
}

function loadPosition(btn) {
  try {
    const saved = localStorage.getItem(POS_STORAGE_KEY)
    if (saved) {
      const { x, y } = JSON.parse(saved)
      const rect = btn.getBoundingClientRect()
      const btnW = rect.width || 64
      const btnH = rect.height || 64
      const clamped = clampPosition(x, y, btnW, btnH)
      applyPosition(btn, clamped.x, clamped.y)
      updateChatWindowPosition(clamped.x, clamped.y)
      return clamped
    }
  } catch (e) {
    console.warn('Failed to load chatbot position', e)
  }
  return null
}

function updateChatWindowPosition(trigX, trigY) {
  const winEl = document.querySelector('#chat-window-el')
  if (!winEl) return

  // On small mobile screens (< 576px), CSS handles full-width bottom sheet
  if (window.innerWidth <= 576) {
    winEl.style.left = ''
    winEl.style.top = ''
    winEl.style.right = ''
    winEl.style.bottom = ''
    return
  }

  const winW = 420
  const winH = 640
  const margin = 12

  let winLeft = trigX + 64 - winW
  if (winLeft < margin) winLeft = trigX
  if (winLeft + winW > window.innerWidth - margin) {
    winLeft = window.innerWidth - winW - margin
  }
  winLeft = Math.max(margin, winLeft)

  let winTop = trigY - winH - 12
  if (winTop < margin) {
    winTop = trigY + 64 + 12
  }
  if (winTop + winH > window.innerHeight - margin) {
    winTop = window.innerHeight - winH - margin
  }
  winTop = Math.max(margin, winTop)

  winEl.style.left = `${winLeft}px`
  winEl.style.top = `${winTop}px`
  winEl.style.right = 'auto'
  winEl.style.bottom = 'auto'
}

/* -------------------------------------------------------------------------- */
/* Initialization                                                             */
/* -------------------------------------------------------------------------- */

export function initChatbot() {
  const mount = () => {
    if (document.querySelector('#ai-chatbot-root')) return

    loadHistory()

    const root = document.createElement('div')
    root.id = 'ai-chatbot-root'
    root.className = 'ai-chatbot-root'
    document.body.appendChild(root)

    renderChatbotUI(root)
    bindEvents(root)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
}
window.thpInitChatbot = initChatbot


function renderChatbotUI(container) {
  container.innerHTML = `
    <!-- Floating Chat Trigger Button -->
    <button class="floating-chat-trigger ${state.unreadCount > 0 ? 'has-unread' : ''}" id="chat-trigger-btn" aria-label="Open AI Healthcare Chatbot" title="Chat with Health+ AI Assistant">
      <span class="chat-trigger-pulse"></span>
      <span class="chat-trigger-icon">${icon('spark')}</span>
      <span class="chat-trigger-badge" id="chat-unread-count" style="${state.unreadCount > 0 ? 'display:flex' : 'display:none'}">${state.unreadCount}</span>
    </button>

    <!-- Chat Popup Window -->
    <section class="chat-window ${state.isOpen ? 'is-open' : ''} ${state.isMinimized ? 'is-minimized' : ''}" id="chat-window-el" aria-label="AI Healthcare Assistant Window">
      
      <!-- Header -->
      <header class="chat-header">
        <div class="chat-header-main">
          <div class="chat-avatar-badge">
            <span class="chat-avatar-icon">${icon('spark')}</span>
            <span class="chat-status-dot" title="Online"></span>
          </div>
          <div class="chat-header-title">
            <div class="chat-name-row">
              <h3>Aria — Health+ AI</h3>
              <span class="chat-verified-chip">${icon('shield')} Official AI</span>
            </div>
            <p class="chat-status-text">Online • Instant Healthcare Assistant</p>
          </div>
        </div>
        <div class="chat-header-controls">
          <button class="chat-ctrl-btn" id="chat-min-btn" title="Minimize / Restore" aria-label="Minimize Chat">${state.isMinimized ? '▲' : '─'}</button>
          <button class="chat-ctrl-btn" id="chat-reset-btn" title="Reset Conversation" aria-label="Reset Chat">${icon('clock')}</button>
          <button class="chat-ctrl-btn" id="chat-close-btn" title="Close Chat" aria-label="Close Chat">${icon('cross')}</button>
        </div>
      </header>

      <!-- Medical Safety Advisory Banner -->
      <div class="chat-disclaimer-banner">
        <span>${icon('shield')} <strong>Medical Note:</strong> AI provides informational guidance. For urgent medical emergencies, call 911 or local emergency services immediately.</span>
      </div>

      <!-- Quick Action Categories Bar -->
      <nav class="chat-quick-bar">
        <button class="chat-quick-chip" data-quick="find_doctor">${icon('doctorCare')} Find Doctor</button>
        <button class="chat-quick-chip" data-quick="specializations">${icon('spark')} Specializations</button>
        <button class="chat-quick-chip" data-quick="lab_tests">${icon('flask')} Lab Tests</button>
        <button class="chat-quick-chip" data-quick="pharmacy">${icon('pills')} Pharmacy</button>
        <button class="chat-quick-chip" data-quick="emergency">${icon('phone')} Emergency</button>
      </nav>

      <!-- Message History Container -->
      <div class="chat-body" id="chat-body-el">
        <div class="chat-messages-inner" id="chat-messages-inner">
          ${renderMessagesHTML(state.messages)}
        </div>
        <div class="chat-typing-indicator ${state.isTyping ? 'is-active' : ''}" id="chat-typing-el">
          <span class="chat-typing-avatar">${icon('spark')}</span>
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="typing-text">Aria is thinking...</span>
        </div>
      </div>

      <!-- Footer & Text Input -->
      <footer class="chat-footer">
        <form class="chat-input-form" id="chat-input-form">
          <input 
            type="text" 
            class="chat-input-field" 
            id="chat-input-field" 
            placeholder="Ask about symptoms, doctors, lab tests, medicines..." 
            autocomplete="off"
            aria-label="Message to AI Healthcare Assistant"
          />
          <button type="submit" class="chat-send-btn" id="chat-send-btn" aria-label="Send message">
            ${icon('arrow')}
          </button>
        </form>
        <div class="chat-footer-hint">
          <span>Powered by Tatito Health+ Medical Intelligence Engine</span>
        </div>
      </footer>
    </section>
  `
}

function renderMessagesHTML(messages) {
  return messages.map(msg => renderSingleMessageHTML(msg)).join('')
}

function renderSingleMessageHTML(msg) {
  const isAI = msg.sender === 'ai'
  return `
    <div class="chat-msg-row ${isAI ? 'is-ai' : 'is-user'}" data-msg-id="${msg.id}">
      ${isAI ? `<div class="chat-msg-avatar">${icon('spark')}</div>` : ''}
      <div class="chat-msg-content">
        <div class="chat-bubble ${msg.isEmergency ? 'is-emergency-bubble' : ''}">
          <div class="chat-msg-text">${parseMarkdownText(msg.text)}</div>
          
          ${msg.cards && msg.cards.length ? `
            <div class="chat-cards-container">
              ${msg.cards.map(c => renderCardHTML(c)).join('')}
            </div>
          ` : ''}
        </div>

        ${msg.quickReplies && msg.quickReplies.length ? `
          <div class="chat-quick-replies">
            ${msg.quickReplies.map(qr => `
              <button class="chat-reply-btn" data-action="${qr.action}" data-payload="${qr.payload || ''}">
                ${qr.label}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <span class="chat-msg-time">${msg.timestamp || ''}</span>
      </div>
    </div>
  `
}

function parseMarkdownText(text) {
  if (!text) return ''
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
  return html
}

function renderCardHTML(card) {
  if (card.type === 'doctor') {
    const doc = card.data
    return `
      <div class="chat-card chat-doctor-card">
        <div class="chat-card-header">
          <span class="avatar avatar-${doc.color} avatar-md">${doc.initials}</span>
          <div class="chat-card-meta">
            <h4>${doc.name}</h4>
            <span class="chat-card-spec">${doc.specialty}</span>
            <span class="chat-card-exp">${doc.detail}</span>
          </div>
        </div>
        <div class="chat-card-body">
          <div class="chat-card-row">
            <span>📍 ${doc.city} (${doc.type})</span>
            <strong class="doc-rating">★ ${doc.rating} <em>(${doc.reviews})</em></strong>
          </div>
          <div class="chat-card-row">
            <span>Consultation Fee:</span>
            <strong class="doc-fee">$${doc.fee}</strong>
          </div>
          <div class="chat-card-row highlight">
            <span>Next Available:</span>
            <span class="doc-next">⚡ ${doc.next}</span>
          </div>
        </div>
        <div class="chat-card-footer">
          <button class="chat-card-btn primary" onclick="window.thpNavigate && window.thpNavigate('doctor', { id: '${doc.id}' })">
            ${icon('calendar')} Book Appointment
          </button>
        </div>
      </div>
    `
  }

  if (card.type === 'product') {
    const prod = card.data
    return `
      <div class="chat-card chat-product-card">
        <div class="chat-card-header">
          <span class="avatar avatar-${prod.color} avatar-md">${prod.initials}</span>
          <div class="chat-card-meta">
            <h4>${prod.name}</h4>
            <span class="chat-card-sub">${prod.pack} • ${prod.manufacturer}</span>
          </div>
          ${prod.rx ? '<span class="rx-tag">Rx</span>' : ''}
        </div>
        <div class="chat-card-body">
          <p class="chat-prod-desc">${prod.desc}</p>
          <div class="chat-card-row">
            <div class="chat-price-block">
              <strong>$${prod.price.toFixed(2)}</strong>
              <s>$${prod.mrp.toFixed(2)}</s>
            </div>
            <span class="chat-stock-tag ${prod.stock === 'Low Stock' ? 'low' : ''}">${prod.stock}</span>
          </div>
        </div>
        <div class="chat-card-footer">
          <button class="chat-card-btn primary" onclick="window.thpAddCart && window.thpAddCart('${prod.id}')">
            ${icon('plus')} Add to Cart
          </button>
          <button class="chat-card-btn secondary" onclick="window.thpNavigate && window.thpNavigate('product', { id: '${prod.id}' })">
            View Details
          </button>
        </div>
      </div>
    `
  }

  if (card.type === 'labtest') {
    const test = card.data
    return `
      <div class="chat-card chat-test-card">
        <div class="chat-card-header">
          <span class="avatar avatar-${test.color || 'teal'} avatar-md">${test.initials || 'LAB'}</span>
          <div class="chat-card-meta">
            <h4>${test.name}</h4>
            <span class="chat-card-sub">⏱️ ${test.reportTime} turnaround</span>
          </div>
        </div>
        <div class="chat-card-body">
          <p class="chat-prod-desc">${test.desc || test.testsIncluded || ''}</p>
          <div class="chat-card-row">
            <div class="chat-price-block">
              <strong>$${test.price}</strong>
              <s>$${test.mrp}</s>
            </div>
            <span class="badge-chip">${test.badge || 'Diagnostic'}</span>
          </div>
        </div>
        <div class="chat-card-footer">
          <button class="chat-card-btn primary" onclick="window.thpNavigate && window.thpNavigate('labtests')">
            ${icon('flask')} Book Lab Test
          </button>
        </div>
      </div>
    `
  }

  if (card.type === 'specialty') {
    const spec = card.data
    return `
      <div class="chat-card chat-spec-card">
        <div class="chat-card-header">
          <span class="avatar avatar-${spec.color || 'teal'} avatar-sm">${icon(spec.icon || 'spark')}</span>
          <div class="chat-card-meta">
            <h4>${spec.name}</h4>
            <p>${spec.desc}</p>
          </div>
        </div>
        <div class="chat-card-footer">
          <button class="chat-card-btn secondary" onclick="window.thpNavigate && window.thpNavigate('doctors', { specialty: '${spec.name}' })">
            ${icon('doctorCare')} View ${spec.name} Doctors
          </button>
        </div>
      </div>
    `
  }

  if (card.type === 'emergency') {
    return `
      <div class="chat-card chat-emergency-card">
        <div class="emergency-card-header">
          ${icon('emergency')}
          <h4>Immediate Emergency Support</h4>
        </div>
        <p>If you are experiencing severe pain, difficulty breathing, or immediate health danger, call emergency services directly.</p>
        <div class="emergency-numbers">
          <a href="tel:911" class="emerg-num-btn">📞 Call Emergency (911)</a>
          <a href="tel:18005552273" class="emerg-num-btn secondary">📱 24/7 Helpline: 1-800-TATITO</a>
        </div>
        <button class="chat-card-btn danger" onclick="window.thpNavigate && window.thpNavigate('emergency')">
          Go to Emergency Services Page
        </button>
      </div>
    `
  }

  return ''
}

function bindEvents(root) {
  // Global helper for add to cart from chatbot cards
  window.thpAddCart = (prodId) => {
    const prod = products.find(p => p.id === prodId)
    if (prod) {
      if (window.thpShowToast) window.thpShowToast(`${prod.name} added to cart!`)
      else showToast(`${prod.name} added to cart!`)
    }
  }

  const triggerBtn = root.querySelector('#chat-trigger-btn')
  const windowEl = root.querySelector('#chat-window-el')
  const closeBtn = root.querySelector('#chat-close-btn')
  const minBtn = root.querySelector('#chat-min-btn')
  const resetBtn = root.querySelector('#chat-reset-btn')
  const form = root.querySelector('#chat-input-form')
  const input = root.querySelector('#chat-input-field')
  const messagesInner = root.querySelector('#chat-messages-inner')

  /* -------------------------------------------------------------------------- */
  /* Draggable Pointer Event Handler                                            */
  /* -------------------------------------------------------------------------- */

  let isPointerDown = false
  let isDragging = false
  let preventClick = false
  let startX = 0, startY = 0
  let initialLeft = 0, initialTop = 0
  let currentPos = { x: 0, y: 0 }

  // Load saved position if available
  const savedPos = loadPosition(triggerBtn)
  if (savedPos) {
    currentPos = savedPos
  } else {
    requestAnimationFrame(() => {
      const rect = triggerBtn.getBoundingClientRect()
      currentPos = { x: rect.left, y: rect.top }
    })
  }

  // Pointer Down
  triggerBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return

    isPointerDown = true
    isDragging = false
    startX = e.clientX
    startY = e.clientY

    const rect = triggerBtn.getBoundingClientRect()
    initialLeft = rect.left
    initialTop = rect.top

    try {
      triggerBtn.setPointerCapture(e.pointerId)
    } catch (err) {}
  })

  // Pointer Move
  triggerBtn.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const dist = Math.hypot(dx, dy)

    if (dist > 6) {
      if (!isDragging) {
        isDragging = true
        triggerBtn.classList.add('is-dragging')
        document.body.style.userSelect = 'none'
      }

      const rect = triggerBtn.getBoundingClientRect()
      const newX = initialLeft + dx
      const newY = initialTop + dy
      const clamped = clampPosition(newX, newY, rect.width || 64, rect.height || 64)

      currentPos = clamped
      applyPosition(triggerBtn, clamped.x, clamped.y)
      updateChatWindowPosition(clamped.x, clamped.y)
    }
  })

  // Pointer Up & Cancel
  const handlePointerUp = (e) => {
    if (!isPointerDown) return
    isPointerDown = false

    try {
      if (triggerBtn.hasPointerCapture(e.pointerId)) {
        triggerBtn.releasePointerCapture(e.pointerId)
      }
    } catch (err) {}

    triggerBtn.classList.remove('is-dragging')
    document.body.style.userSelect = ''

    if (isDragging) {
      preventClick = true
      savePosition(currentPos.x, currentPos.y)
      setTimeout(() => {
        preventClick = false
        isDragging = false
      }, 120)
    }
  }

  triggerBtn.addEventListener('pointerup', handlePointerUp)
  triggerBtn.addEventListener('pointercancel', handlePointerUp)

  // Window Resize Listener
  window.addEventListener('resize', () => {
    const rect = triggerBtn.getBoundingClientRect()
    if (rect.width > 0 && rect.left > 0) {
      const clamped = clampPosition(rect.left, rect.top, rect.width, rect.height)
      currentPos = clamped
      applyPosition(triggerBtn, clamped.x, clamped.y)
      updateChatWindowPosition(clamped.x, clamped.y)
      savePosition(clamped.x, clamped.y)
    }
  })

  // Toggle chat window open/close with click guard
  triggerBtn.addEventListener('click', (e) => {
    if (preventClick) {
      e.preventDefault()
      e.stopPropagation()
      preventClick = false
      return
    }

    state.isOpen = !state.isOpen
    if (state.isOpen) {
      state.unreadCount = 0
      state.isMinimized = false
    }
    updateUIState(root)
    if (state.isOpen) {
      const rect = triggerBtn.getBoundingClientRect()
      updateChatWindowPosition(rect.left, rect.top)
      setTimeout(() => input.focus(), 150)
      scrollToBottom()
    }
  })

  // Close button
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    state.isOpen = false
    updateUIState(root)
  })

  // Minimize button
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    state.isMinimized = !state.isMinimized
    updateUIState(root)
  })

  // Reset conversation button
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (confirm('Reset conversation history?')) {
      state.messages = [...defaultWelcomeMessages]
      saveHistory()
      messagesInner.innerHTML = renderMessagesHTML(state.messages)
      scrollToBottom()
    }
  })

  // Quick Action Bar Pills
  root.querySelectorAll('.chat-quick-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-quick')
      handleQuickAction(action, root)
    })
  });

  // Delegate quick reply buttons inside chat body
  messagesInner.addEventListener('click', (e) => {
    const btn = e.target.closest('.chat-reply-btn')
    if (btn) {
      const action = btn.getAttribute('data-action')
      const payload = btn.getAttribute('data-payload')
      handleQuickAction(action, root, payload)
    }
  })

  // Submit User Message
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''

    processUserMessage(text, root)
  })
}

function updateUIState(root) {
  const windowEl = root.querySelector('#chat-window-el')
  const triggerBtn = root.querySelector('#chat-trigger-btn')
  const badgeEl = root.querySelector('#chat-unread-count')
  const minBtn = root.querySelector('#chat-min-btn')

  if (state.isOpen) {
    windowEl.classList.add('is-open')
    triggerBtn.classList.add('is-active')
  } else {
    windowEl.classList.remove('is-open')
    triggerBtn.classList.remove('is-active')
  }

  if (state.isMinimized) {
    windowEl.classList.add('is-minimized')
    minBtn.textContent = '▲'
  } else {
    windowEl.classList.remove('is-minimized')
    minBtn.textContent = '─'
  }

  if (state.unreadCount > 0) {
    badgeEl.textContent = state.unreadCount
    badgeEl.style.display = 'flex'
    triggerBtn.classList.add('has-unread')
  } else {
    badgeEl.style.display = 'none'
    triggerBtn.classList.remove('has-unread')
  }
}

function scrollToBottom() {
  const body = document.querySelector('#chat-body-el')
  if (body) {
    setTimeout(() => {
      body.scrollTop = body.scrollHeight
    }, 50)
  }
}

function handleQuickAction(action, root, payload = '') {
  let labelText = ''
  if (action === 'find_doctor') labelText = 'Find a Doctor'
  else if (action === 'specializations') labelText = 'View Specializations'
  else if (action === 'lab_tests') labelText = 'Book a Lab Test'
  else if (action === 'pharmacy') labelText = 'Pharmacy Services'
  else if (action === 'emergency') labelText = 'Emergency Support'
  else if (action === 'services') labelText = 'Healthcare Services'
  else if (action === 'spec_detail') labelText = `Find doctors in ${payload}`
  else labelText = action.replace('_', ' ')

  processUserMessage(labelText, root, action, payload)
}

function processUserMessage(userText, root, directAction = null, payload = null) {
  // 1. Add User Message
  const userMsg = {
    id: 'user-' + Date.now(),
    sender: 'user',
    text: userText,
    timestamp: formatTime(new Date())
  }

  state.messages.push(userMsg)
  saveHistory()

  const messagesInner = root.querySelector('#chat-messages-inner')
  messagesInner.insertAdjacentHTML('beforeend', renderSingleMessageHTML(userMsg))
  scrollToBottom()

  // 2. Show Typing Indicator
  state.isTyping = true
  const typingEl = root.querySelector('#chat-typing-el')
  if (typingEl) typingEl.classList.add('is-active')
  scrollToBottom()

  // 3. Generate AI Response asynchronously
  setTimeout(() => {
    const aiResponse = generateAIResponse(userText, directAction, payload)
    
    state.isTyping = false
    if (typingEl) typingEl.classList.remove('is-active')

    state.messages.push(aiResponse)
    saveHistory()

    messagesInner.insertAdjacentHTML('beforeend', renderSingleMessageHTML(aiResponse))
    scrollToBottom()

    if (!state.isOpen) {
      state.unreadCount += 1
      updateUIState(root)
    }
  }, 650)
}

/**
 * Intelligent Healthcare NLP Intent Engine
 */
function generateAIResponse(input, directAction = null, payload = null) {
  const query = input.toLowerCase().trim()
  const timestamp = formatTime(new Date())

  // Direct action overrides
  if (directAction === 'find_doctor') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "We have over 10 top-rated specialist doctors available for online video and in-person consultations. Which specialty or doctor are you looking for?",
      timestamp,
      cards: doctors.slice(0, 3).map(d => ({ type: 'doctor', data: d })),
      quickReplies: [
        { label: '🩺 View Specializations', action: 'specializations' },
        { label: '📍 Search by Location', action: 'doctor_location' },
        { label: '⚡ Next Available Today', action: 'doctor_today' }
      ]
    }
  }

  if (directAction === 'specializations') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Tatito Health+ covers **24 clinical specializations**. Here are some of our key medical departments:",
      timestamp,
      cards: doctorSpecialties.slice(0, 4).map(s => ({ type: 'specialty', data: s })),
      quickReplies: [
        { label: '❤️ Cardiology', action: 'spec_detail', payload: 'Cardiology' },
        { label: '✨ Dermatology', action: 'spec_detail', payload: 'Dermatology' },
        { label: '🦴 Orthopaedics', action: 'spec_detail', payload: 'Orthopaedics' },
        { label: '🧠 Neurology', action: 'spec_detail', payload: 'Neurology' },
        { label: '👶 Paediatrics', action: 'spec_detail', payload: 'Paediatrics' }
      ]
    }
  }

  if (directAction === 'lab_tests') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Tatito Diagnostics offers **60+ lab tests** with free home sample collection and **10-hour report delivery guarantee**. Here are our top recommended tests & health packages:",
      timestamp,
      cards: [
        { type: 'labtest', data: labTests[0] }, // CBC
        { type: 'labtest', data: labTests[1] }, // HbA1c
        { type: 'labtest', data: labPackages[0] } // Prime Health Plan
      ],
      quickReplies: [
        { label: '🩸 Full Body Checkups', action: 'full_body' },
        { label: '🩺 Diabetes Panel', action: 'diabetes_tests' },
        { label: '⚡ View All Lab Tests', action: 'nav_labtests' }
      ]
    }
  }

  if (directAction === 'pharmacy') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Order genuine medicines, vitamins, and medical devices directly online with express home delivery. Here are popular items:",
      timestamp,
      cards: [
        { type: 'product', data: products[0] }, // Acetamol
        { type: 'product', data: products[3] }, // Vitamin D3
        { type: 'product', data: products[8] }  // BP Monitor
      ],
      quickReplies: [
        { label: '💊 OTC Pain Relief', action: 'otc_pain' },
        { label: '✨ Vitamins & Immunity', action: 'vitamins' },
        { label: '🩸 Medical Devices', action: 'devices' },
        { label: '🛒 Go to Pharmacy', action: 'nav_pharmacy' }
      ]
    }
  }

  if (directAction === 'emergency') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      isEmergency: true,
      text: "🚨 **EMERGENCY ASSISTANCE**: If you or someone nearby is experiencing a life-threatening medical situation (chest pain, stroke symptoms, loss of consciousness, severe trauma), please contact emergency services immediately!",
      timestamp,
      cards: [{ type: 'emergency' }],
      quickReplies: [
        { label: '📞 Call 911', action: 'emerg_call' },
        { label: '🏥 View Emergency Page', action: 'nav_emergency' }
      ]
    }
  }

  if (directAction === 'services') {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Explore all healthcare services available on Tatito Health+:",
      timestamp,
      quickReplies: [
        { label: '👨‍⚕️ Book Doctors', action: 'nav_doctors' },
        { label: '💊 Pharmacy & Rx', action: 'nav_pharmacy' },
        { label: '🧪 Lab & Diagnostics', action: 'nav_labtests' },
        { label: '💎 Health Memberships', action: 'nav_plans' },
        { label: '📁 Encrypted Health Records', action: 'nav_records' },
        { label: '🎓 Clinical Internships', action: 'nav_internships' }
      ]
    }
  }

  // Navigation Quick Actions
  if (directAction === 'nav_doctors') {
    navigate('doctors')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Taking you to the **Doctors Directory**...", timestamp }
  }
  if (directAction === 'nav_pharmacy') {
    navigate('pharmacy')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Navigating to the **Pharmacy & Medicines Store**...", timestamp }
  }
  if (directAction === 'nav_labtests') {
    navigate('labtests')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Opening **Lab Tests & Diagnostics** page...", timestamp }
  }
  if (directAction === 'nav_plans') {
    navigate('plans')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Opening **Health Plus Plans & Subscriptions**...", timestamp }
  }
  if (directAction === 'nav_records') {
    navigate('records')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Opening your **Encrypted Health Records**...", timestamp }
  }
  if (directAction === 'nav_internships') {
    navigate('internships')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Opening **Medical Internships & Fellowships** page...", timestamp }
  }
  if (directAction === 'nav_emergency') {
    navigate('emergency')
    return { id: 'ai-' + Date.now(), sender: 'ai', text: "Opening **24/7 Emergency Care** page...", timestamp }
  }

  // Specialty Search via Payload
  if (directAction === 'spec_detail' && payload) {
    const matchedDocs = doctors.filter(d => d.specialty.toLowerCase() === payload.toLowerCase())
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: `Here are available specialists in **${payload}**:`,
      timestamp,
      cards: matchedDocs.map(d => ({ type: 'doctor', data: d })),
      quickReplies: [
        { label: `View All ${payload} Doctors`, action: 'nav_doctors' },
        { label: '🩺 Other Specializations', action: 'specializations' }
      ]
    }
  }

  // -------------------------------------------------------------
  // Intent Analysis using NLP keywords
  // -------------------------------------------------------------

  // 1. Emergency Detection
  const emergencyKeywords = ['chest pain', 'heart attack', 'cannot breathe', "can't breathe", 'shortness of breath', 'stroke', 'unconscious', 'severe bleeding', 'poison', 'suicide', 'head injury', 'emergency', 'dying']
  if (emergencyKeywords.some(k => query.includes(k))) {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      isEmergency: true,
      text: "🚨 **URGENT MEDICAL WARNING**: Your query indicates symptoms that may require urgent medical evaluation. Please contact emergency services immediately or visit the nearest emergency room!",
      timestamp,
      cards: [{ type: 'emergency' }],
      quickReplies: [
        { label: '🏥 Open Emergency Care Page', action: 'nav_emergency' },
        { label: '👨‍⚕️ Consult General Physician', action: 'find_doctor' }
      ]
    }
  }

  // 2. Dermatology / Skin / Hair / Acne
  if (query.match(/skin|dermatolog|acne|rash|pimple|hair|scalp|eczema|psoriasis|dermatitis/)) {
    const dermDocs = doctors.filter(d => d.specialty === 'Dermatology')
    const skincareProd = products.find(p => p.id === 'p16')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "For skin-related concerns, consulting a **Dermatologist** is recommended. Would you like me to help you find available dermatologists?\n\n*Safety Advice: Avoid picking at skin lesions or applying unverified home remedies.*",
      timestamp,
      cards: [
        ...dermDocs.map(d => ({ type: 'doctor', data: d })),
        ...(skincareProd ? [{ type: 'product', data: skincareProd }] : [])
      ],
      quickReplies: [
        { label: '✨ Find Dermatologist', action: 'spec_detail', payload: 'Dermatology' },
        { label: '🩺 View Dermatology', action: 'specializations' },
        { label: '👈 Go Back', action: 'services' }
      ]
    }
  }

  // 3. Heart / BP / Cardiac / Chest
  if (query.match(/heart|cardio|blood pressure|bp|hypertension|palpitation|pulse/)) {
    const cardioDocs = doctors.filter(d => d.specialty === 'Cardiology')
    const bpMonitor = products.find(p => p.id === 'p9')
    const lipidTest = labTests.find(t => t.id === 't4')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Heart health is vital. A **Cardiologist** evaluates blood pressure, cholesterol, and cardiac rhythm to prevent and manage heart disease.\n\n*Note: If you experience sharp chest pain or pain radiating to your left arm or jaw, seek emergency medical care immediately.*",
      timestamp,
      cards: [
        ...cardioDocs.map(d => ({ type: 'doctor', data: d })),
        ...(bpMonitor ? [{ type: 'product', data: bpMonitor }] : []),
        ...(lipidTest ? [{ type: 'labtest', data: lipidTest }] : [])
      ],
      quickReplies: [
        { label: '❤️ Book Cardiologist', action: 'spec_detail', payload: 'Cardiology' },
        { label: '🧪 Book Lipid Profile Test', action: 'lab_tests' }
      ]
    }
  }

  // 4. Bone / Joint / Orthopaedic / Back pain / Knee pain
  if (query.match(/bone|joint|ortho|fracture|back pain|knee|spine|arthritis/)) {
    const orthoDocs = doctors.filter(d => d.specialty === 'Orthopaedics')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "For persistent joint pain, knee discomfort, back pain, or bone stiffness, consulting an **Orthopaedic Specialist** is recommended. They specialize in musculoskeletal health and rehabilitation.\n\n*Tip: Rest, gentle stretching, and cold compresses can help manage minor muscle strains.*",
      timestamp,
      cards: orthoDocs.map(d => ({ type: 'doctor', data: d })),
      quickReplies: [
        { label: '🦴 Consult Orthopaedic', action: 'spec_detail', payload: 'Orthopaedics' },
        { label: '🧪 Book Vitamin D Check', action: 'lab_tests' }
      ]
    }
  }

  // 5. Children / Kids / Baby / Paediatrics
  if (query.match(/child|kid|baby|pediatric|paediatric|infant|toddler|growth/)) {
    const pediaDocs = doctors.filter(d => d.specialty === 'Paediatrics')
    const babyVit = products.find(p => p.id === 'p21')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Child health and development require specialized care from a **Paediatrician**. They monitor growth milestones, vaccinations, and pediatric illnesses.",
      timestamp,
      cards: [
        ...pediaDocs.map(d => ({ type: 'doctor', data: d })),
        ...(babyVit ? [{ type: 'product', data: babyVit }] : [])
      ],
      quickReplies: [
        { label: '👶 Consult Paediatrician', action: 'spec_detail', payload: 'Paediatrics' }
      ]
    }
  }

  // 6. Diabetes / Blood Sugar / HbA1c
  if (query.match(/diabet|sugar|glucose|hba1c|insulin/)) {
    const hba1c = labTests.find(t => t.id === 't2')
    const glucometer = products.find(p => p.id === 'p11')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Managing diabetes effectively requires regular monitoring of blood glucose levels and guidance from an **Endocrinologist** or **Diabetologist**.\n\n*Key Test: An HbA1c test measures average blood sugar over the past 3 months.*",
      timestamp,
      cards: [
        ...(hba1c ? [{ type: 'labtest', data: hba1c }] : []),
        ...(glucometer ? [{ type: 'product', data: glucometer }] : [])
      ],
      quickReplies: [
        { label: '🧪 Book HbA1c Test', action: 'lab_tests' },
        { label: '👨‍⚕️ Consult Endocrinologist', action: 'find_doctor' }
      ]
    }
  }

  // 7. Fever / Pain / Cold / Headache / Symptom General
  if (query.match(/fever|headache|pain|cough|cold|flu|stomach|acid|vomit|fatigue|tired/)) {
    const gpDocs = doctors.filter(d => d.specialty === 'General Physician')
    const feverTest = labPackages.find(p => p.id === 'pkg2') || labTests[0]
    const acetamol = products.find(p => p.id === 'p1')
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Common symptoms such as fever, fatigue, cough, or stomach distress can stem from various causes. A **General Physician** is the ideal first point of contact for a thorough clinical evaluation.\n\n**General Recommendations:**\n• Ensure adequate fluid intake and rest.\n• Monitor temperature regularly.\n• Seek immediate care if high fever lasts beyond 48 hours or is accompanied by breathlessness.",
      timestamp,
      cards: [
        ...gpDocs.map(d => ({ type: 'doctor', data: d })),
        ...(acetamol ? [{ type: 'product', data: acetamol }] : []),
        ...(feverTest ? [{ type: 'labtest', data: feverTest }] : [])
      ],
      quickReplies: [
        { label: '👨‍⚕️ Book General Physician', action: 'find_doctor' },
        { label: '🧪 Book CBC / Fever Test', action: 'lab_tests' },
        { label: '💊 Browse Pain Relief', action: 'pharmacy' }
      ]
    }
  }

  // 8. General Doctor Inquiry
  if (query.match(/doctor|dr\.|physician|appointment|consult|specialist/)) {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "You can easily book online video consultations or in-person visits with certified doctors across top healthcare institutes.",
      timestamp,
      cards: doctors.slice(0, 3).map(d => ({ type: 'doctor', data: d })),
      quickReplies: [
        { label: '⚡ View All Doctors', action: 'nav_doctors' },
        { label: '🩺 View Specializations', action: 'specializations' }
      ]
    }
  }

  // 9. General Lab Test Inquiry
  if (query.match(/lab|test|checkup|report|blood|thyroid|cbc|diagnostic/)) {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Tatito Diagnostics provides certified diagnostic testing with free home sample collection and digital reports delivered within 10-24 hours.",
      timestamp,
      cards: labTests.slice(0, 3).map(t => ({ type: 'labtest', data: t })),
      quickReplies: [
        { label: '🧪 View All Lab Tests', action: 'nav_labtests' },
        { label: '📊 Full Body Packages', action: 'lab_tests' }
      ]
    }
  }

  // 10. General Pharmacy Inquiry
  if (query.match(/medicine|pharmacy|pill|drug|vitamin|supplement|buy|device|sanitizer/)) {
    return {
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: "Find genuine prescription medicines, vitamins, wellness products, and home care devices at Tatito Pharmacy.",
      timestamp,
      cards: products.slice(0, 3).map(p => ({ type: 'product', data: p })),
      quickReplies: [
        { label: '🛒 Browse Pharmacy Store', action: 'nav_pharmacy' }
      ]
    }
  }

  // Fallback Greeting / Default Response
  return {
    id: 'ai-' + Date.now(),
    sender: 'ai',
    text: "I'm here to assist you with any health or medical inquiry! I can help you find doctors, explore medical specializations, book lab tests, or order pharmacy items.\n\nHow can I help you today?",
    timestamp,
    quickReplies: [
      { label: '👨‍⚕️ Find a Doctor', action: 'find_doctor' },
      { label: '🩺 Medical Specializations', action: 'specializations' },
      { label: '🧪 Book Lab Test', action: 'lab_tests' },
      { label: '💊 Pharmacy & Medicines', action: 'pharmacy' },
      { label: '🚨 Emergency Hotline', action: 'emergency' }
    ]
  }
}
