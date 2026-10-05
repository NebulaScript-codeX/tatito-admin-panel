import {
  icons,
  icon,
  avatar,
  showToast,
  premiumFooter,
  mobileBottomNav,
  accountDrawerHTML,
  openAccountDrawer,
  closeAccountDrawer
} from './ui.js'

import {
  categories,
  products,
  labTests,
  articles,
  doctors
} from './data.js'

import {
  isAuthenticated,
  getAuthUser,
  requireAuth,
  logoutUser
} from './auth.js'

import { openAuthModal } from './authPages.js'
import { formatINR } from './currency.js'

import {
  languages,
  getLanguage,
  setLanguage,
  t
} from './translations.js'


/* =========================================================
   HEADER
========================================================= */

function header(navigate, getCartCount) {
  const navItems = [
    { key: 'doctors', page: 'doctors', icon: 'doctorCare' },
    { key: 'pharmacy', page: 'pharmacy' },
    { key: 'labTests', page: 'labtests' },
    { key: 'healthPlans', page: 'plans' },
    { key: 'internships', page: 'internships' }
  ]

  const isAuth = isAuthenticated()
  const user = getAuthUser()
  const currentLanguage = getLanguage()

  return `
    <div class="announcement">
      <span class="announcement-dot"></span>

      <div class="announcement-slider">
        <div class="announcement-track">
          <span>${t('announcementOne')}</span>
          <span>${t('announcementTwo')}</span>
        </div>
      </div>
    </div>

    <div class="sticky-header-group">

      <header class="site-header">
        <div class="site-header-inner">

          <a
            class="brand"
            data-nav="home"
            aria-label="Tatito Health+ home"
          >
            <img
              src="/tatito-logo.png"
              alt="Tatito Health+"
              class="brand-logo"
            >
          </a>

          <div class="header-search-bar">
            ${icon('search')}
            <input
              id="global-search"
              placeholder="${t('searchPlaceholder')}"
            />
            <button data-search-btn>${t('search')}</button>
          </div>

          <div class="header-actions">

            <!-- LANGUAGE SELECTOR -->
            <div class="language-selector">

              <button
                class="language-button"
                id="language-button"
                type="button"
                aria-haspopup="true"
                aria-expanded="false"
              >
                🌐
                <span>
                  ${
                    languages.find(
                      lang => lang.code === currentLanguage
                    )?.nativeName || 'English'
                  }
                </span>
                ${icon('chevron')}
              </button>

              <div
                class="language-menu"
                id="language-menu"
              >
                ${languages.map(lang => `
                  <button
                    type="button"
                    class="language-option ${
                      lang.code === currentLanguage ? 'active' : ''
                    }"
                    data-language="${lang.code}"
                  >
                    <span>${lang.nativeName}</span>
                    <small>${lang.name}</small>
                  </button>
                `).join('')}
              </div>

            </div>

            <!-- LOCATION -->
            <button class="location-button">
              ${icon('pin')}
              <span id="home-location-text">Detecting location...</span>
              ${icon('chevron')}
            </button>

            <!-- NOTIFICATIONS -->
            <button
              class="icon-button"
              aria-label="${t('notifications')}"
            >
              ${icon('bell')}
              <span class="notification-dot"></span>
            </button>

            <!-- CART -->
            <button
              class="cart-button"
              data-nav="cart"
            >
              ${icon('bag')}
              <span>${t('cart')}</span>
              <span class="cart-count">${getCartCount()}</span>
            </button>

            ${
              isAuth
                ? `
                  <button class="profile-button">
                    ${avatar(
                      user ? user.initials : 'JD',
                      'teal'
                    )}
                    <span>
                      ${
                        user
                          ? user.name.split(' ')[0]
                          : 'User'
                      }
                    </span>
                    ${icon('chevron')}
                  </button>
                `
                : `
                  <button
                    class="auth-nav-button auth-login-button auth-modal-trigger"
                    data-auth-mode="login"
                  >
                    ${icon('user')}
                    <span>${t('login')}</span>
                  </button>

                  <button
                    class="auth-nav-button auth-register-button auth-modal-trigger"
                    data-auth-mode="register"
                  >
                    <span>${t('register')}</span>
                  </button>
                `
            }

            <button
              class="mobile-menu"
              id="home-mobile-menu"
              aria-label="Open menu"
            >
              ${icon('menu')}
            </button>

          </div>
        </div>
      </header>

      <!-- NAVIGATION -->
      <nav class="sub-nav">
        <div class="sub-nav-inner">
          ${navItems.map(item => `
            <a data-nav="${item.page}">
              ${t(item.key)}
            </a>
          `).join('')}
          <button class="floating-consult-fab" id="fab-instant-consult">
          <span class="fab-icon">${icon('phone')}</span>
          <span>Instant Consult 24/7</span>
          </button>
        </div>
      </nav>

    </div>

    ${accountDrawerHTML()}
  `;
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function productCard(p, ctx) {
  const discount = Math.round(
    (1 - p.price / p.mrp) * 100
  )

  const wishlist = new Set(
    JSON.parse(
      localStorage.getItem('thp_wishlist') || '[]'
    )
  )

  const isWishlisted = wishlist.has(p.id)

  const cartItem =
    ctx && ctx.cartState
      ? ctx.cartState.find(i => i.id === p.id)
      : null

  return `
    <article
      class="product-card"
      data-product="${p.id}"
    >

      <div class="product-image">

        <span class="product-avatar avatar-${p.color}">
          ${p.initials}
        </span>

        ${
          discount > 0
            ? `
              <span class="product-discount">
                -${discount}% ${t('off')}
              </span>
            `
            : ''
        }

        ${
          p.rx
            ? `
              <span class="product-rx">
                ${t('rxRequired')}
              </span>
            `
            : ''
        }

        ${
          p.stock === 'Low Stock'
            ? `
              <span class="product-low-stock">
                ${t('lowStock')}
              </span>
            `
            : ''
        }

        <button
          class="wishlist-btn ${
            isWishlisted ? 'active' : ''
          }"
          data-wishlist="${p.id}"
          aria-label="${t('saveWishlist')}"
        >
          ${icon('heart')}
        </button>

      </div>

      <div class="product-info">

        <div class="product-manufacturer-row">
          <span class="product-manufacturer">
            ${p.manufacturer}
          </span>

          <button
            class="quickview-trigger-link"
            data-quick-nav="${p.id}"
          >
            ${t('quickView')}
          </button>
        </div>

        <h4 class="product-name">
          ${p.name}
        </h4>

        <span class="product-pack">
          ${p.pack}
        </span>

        <div class="product-rating">
          ★ ${p.rating}
          <span>
            (${p.reviews} ${t('reviews')})
          </span>
        </div>

        <div class="product-price-row">

          <div class="product-price">
            <strong>
              ${formatINR(p.price)}
            </strong>

            ${
              discount > 0
                ? `
                  <s>
                    ${formatINR(p.mrp)}
                  </s>
                `
                : ''
            }
          </div>

          ${
            cartItem
              ? `
                <div class="card-qty-controller">

                  <button
                    data-qty-dec="${p.id}"
                    aria-label="${t('decreaseQuantity')}"
                  >
                    −
                  </button>

                  <span>${cartItem.qty}</span>

                  <button
                    data-qty-inc="${p.id}"
                    aria-label="${t('increaseQuantity')}"
                  >
                    +
                  </button>

                </div>
              `
              : `
                <button
                  class="add-to-cart-btn"
                  data-add="${p.id}"
                >
                  ${icon('plus')}
                  ${t('add')}
                </button>
              `
          }

        </div>
      </div>

    </article>
  `;
}


/* =========================================================
   LAB TEST CARD
========================================================= */

function labTestCard(test, ctx) {
  const discount = Math.round(
    (1 - test.price / test.mrp) * 100
  )

  return `
    <article
      class="test-card"
      data-test="${test.id}"
    >

      <div class="test-card-icon avatar-${test.color}">
        ${test.initials}
      </div>

      <h4>
        ${test.name}
      </h4>

      <span class="test-meta">
        ${test.tests} ${t('testsIncluded')}
      </span>

      <span class="test-report">
        ${icon('check')}
        ${test.reportTime} ${t('report')}
      </span>

      <div class="test-price">

        <strong>
          ₹${test.price}
        </strong>

        <s>
          ₹${test.mrp}
        </s>

        <span class="test-discount">
          ${discount}% ${t('off')}
        </span>

      </div>

      <button
        class="button button-small button-primary full-button"
        data-book-test="${test.id}"
      >
        ${t('bookTest')}
        ${icon('arrow')}
      </button>

    </article>
  `
}


/* =========================================================
   ARTICLE CARD
========================================================= */

function articleCard(a) {
  return `
    <article
      class="article-card"
      data-article="${a.id}"
    >

      <div class="article-icon avatar-${a.color}">
        ${a.initials}
      </div>

      <div class="article-info">

        <span class="article-category">
          ${a.category}
        </span>

        <h4>
          ${a.title}
        </h4>

        <span class="article-meta">
          ${a.author} · ${a.date}
        </span>

      </div>

    </article>
  `
}


/* =========================================================
   DOCTOR CARD
========================================================= */

function doctorCard(d) {
  return `
    <article
      class="doctor-card"
      data-doctor="${d.id}"
    >

      <div class="doctor-card-top">

        ${avatar(
          d.initials,
          d.color,
          'doctor-avatar'
        )}

        <span class="rating">
          ★ ${d.rating}
        </span>

      </div>

      <div class="doctor-card-content">

        <h3>
          ${d.name}
        </h3>

        <span>
          ${d.specialty}
        </span>

        <p>
          ${d.detail}
        </p>

        <span class="doctor-location">
          ${icon('building')}
          ${d.location}
        </span>

        <div class="doctor-bottom">

          <div>
            <span class="consultation-fee">
              ${formatINR(d.fee)}
            </span>

            <small>
              ${t('perVisit')}
            </small>
          </div>

          <div class="next-slot">

            <small>
              ${t('next')}
            </small>

            <strong>
              ${d.next}
            </strong>

          </div>

        </div>

        <button
          class="button button-small button-outline full-button"
          data-doctor="${d.id}"
        >
          ${t('bookAppointment')}
          ${icon('arrow')}
        </button>

      </div>

    </article>
  `
}


/* =========================================================
   HOME PAGE
========================================================= */

export function renderHome(appRoot, ctx) {
  const {
    navigate,
    getCartCount,
    addToCart
  } = ctx

  const trendingProducts =
    products.slice(0, 12)

  const topTests =
    labTests.slice(0, 6)

  appRoot.innerHTML = `

    <div class="app-shell">

      ${header(
        navigate,
        getCartCount
      )}

      <main id="top">


        <!-- =================================================
             HERO
        ================================================== -->

        <section class="hero-banner-section">

          <div class="hero-banner section-wrap">

            <div class="hero-banner-grid">

              <div class="hero-banner-left">

                <div class="hero-status-pills">

                  <span class="hero-kicker">
                    ${icon('spark')}
                    ${t('homeKicker')}
                  </span>

                  <span class="hero-live-pill">
                    <span class="hero-live-dot"></span>
                    ${t('virtualCare')}
                  </span>

                </div>

                <h1>
                  ${t('heroTitle')}<br>
                  <span>
                    ${t('heroTitleSecond')}
                  </span>
                </h1>

                <p>
                  ${t('heroDescription')}
                </p>

                <div class="hero-banner-search">

                  ${icon('search')}

                  <input
                    id="home-search"
                    placeholder="${t('homeSearchPlaceholder')}"
                  />

                  <button
                    class="button button-primary"
                    data-search-btn
                  >
                    ${t('search')}
                  </button>

                </div>

                <div class="hero-search-tags">

                  <span class="hst-label">
                    ${t('popularSearches')}
                  </span>

                  <button
                    class="hst-tag"
                    data-tag-search="Amoxilin"
                  >
                    Amoxilin
                  </button>

                  <button
                    class="hst-tag"
                    data-tag-search="Vitamin D3"
                  >
                    Vitamin D3
                  </button>

                  <button
                    class="hst-tag"
                    data-tag-search="HbA1c"
                  >
                    HbA1c
                  </button>

                  <button
                    class="hst-tag"
                    data-tag-search="Thermometer"
                  >
                    Thermometer
                  </button>

                </div>

                <div class="hero-quick-links">

                  <button data-nav="doctors">
                    ${icon('video')}
                    ${t('findDoctor')}
                  </button>

                  <button data-nav="pharmacy">
                    ${icon('bag')}
                    ${t('orderMedicines')}
                  </button>

                  <button data-nav="labtests">
                    ${icon('flask')}
                    ${t('bookDiagnostics')}
                  </button>

                  <button data-nav="emergency">
                    ${icon('phone')}
                    ${t('emergency')}
                  </button>

                </div>

              </div>


              <div class="hero-banner-right">

                <div class="hero-visual-card">

                  <div class="hero-visual-head">

                    <span class="hero-badge-pill">
                      ${icon('verified')}
                      ${t('whoCertified')}
                    </span>

                    <span class="hero-express-badge">
                      ${icon('clock')}
                      ${t('dispatch')}
                    </span>

                  </div>

                  <div class="hero-visual-body">

                    <div class="hero-stat-box">

                      <span class="hero-stat-icon">
                        ${icon('stethoscope')}
                      </span>

                      <div>
                        <strong>1,200+</strong>
                        <span>
                          ${t('verifiedSpecialists')}
                        </span>
                      </div>

                    </div>


                    <div class="hero-stat-box">

                      <span class="hero-stat-icon">
                        ${icon('pills')}
                      </span>

                      <div>
                        <strong>
                          30-Min Express
                        </strong>

                        <span>
                          ${t('authenticMedicines')}
                        </span>
                      </div>

                    </div>


                    <div class="hero-stat-box">

                      <span class="hero-stat-icon">
                        ${icon('flask')}
                      </span>

                      <div>
                        <strong>
                          10-Hour Guarantee
                        </strong>

                        <span>
                          ${t('labReports')}
                        </span>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        <!-- =================================================
             QUICK ACTIONS
        ================================================== -->

        <section
          class="section-wrap quick-actions-section"
        >

          <div class="quick-actions">

            <button
              class="quick-action-tile"
              data-nav="doctors"
            >
              <span class="qa-icon qa-mint">
                ${icon('video')}
              </span>

              <div>
                <strong>
                  ${t('consultDoctor')}
                </strong>

                <span>
                  ${t('onlineInPerson')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="pharmacy"
            >
              <span class="qa-icon qa-peach">
                ${icon('bag')}
              </span>

              <div>
                <strong>
                  ${t('buyMedicines')}
                </strong>

                <span>
                  ${t('expressDelivery')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="labtests"
            >
              <span class="qa-icon qa-blue">
                ${icon('flask')}
              </span>

              <div>
                <strong>
                  ${t('bookLabTests')}
                </strong>

                <span>
                  ${t('homeCollection')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="prescription"
            >
              <span class="qa-icon qa-lavender">
                ${icon('file')}
              </span>

              <div>
                <strong>
                  ${t('uploadRx')}
                </strong>

                <span>
                  ${t('snapOrder')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="labtests"
            >
              <span class="qa-icon qa-mint">
                ${icon('ecg')}
              </span>

              <div>
                <strong>
                  ${t('xrayImaging')}
                </strong>

                <span>
                  ${t('ctMriRadiology')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="plans"
            >
              <span class="qa-icon qa-peach">
                ${icon('spark')}
              </span>

              <div>
                <strong>
                  ${t('healthPlansShort')}
                </strong>

                <span>
                  ${t('familySubscriptions')}
                </span>
              </div>
            </button>


            <button
              class="quick-action-tile"
              data-nav="emergency"
            >
              <span class="qa-icon qa-lavender">
                ${icon('phone')}
              </span>

              <div>
                <strong>
                  ${t('emergency')}
                </strong>

                <span>
                  ${t('urgentCare')}
                </span>
              </div>
            </button>

          </div>

        </section>


        <!-- =================================================
             PRESCRIPTION ASSISTANT
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="home-rx-banner">

            <div class="rx-banner-info">

              <span class="eyebrow-tag">
                ${icon('file')}
                ${t('prescriptionAssistant')}
              </span>

              <h2>
                ${t('doctorsPrescription')}
              </h2>

              <p>
                ${t('prescriptionDescription')}
              </p>

              <div class="rx-steps-mini">

                <div class="rsm-step">
                  <span class="rsm-num">1</span>
                  <span>
                    ${t('snapOrDragRx')}
                  </span>
                </div>

                <div class="rsm-step">
                  <span class="rsm-num">2</span>
                  <span>
                    ${t('pharmacistVerification')}
                  </span>
                </div>

                <div class="rsm-step">
                  <span class="rsm-num">3</span>
                  <span>
                    ${t('doorstepDelivery')}
                  </span>
                </div>

              </div>

              <div class="rx-trust-badges">

                <span>
                  ${icon('check')}
                  ${t('licensedPharmacists')}
                </span>

                <span>
                  ${icon('shield')}
                  ${t('hundredAuthentic')}
                </span>

                <span>
                  ${icon('clock')}
                  ${t('thirtyMinDelivery')}
                </span>

              </div>

            </div>


            <div
              class="rx-dropzone-tile"
              id="rx-home-upload"
            >

              <div class="rx-dropzone-icon">
                ${icon('file')}
              </div>

              <strong>
                ${t('snapOrDragDropRx')}
              </strong>

              <span>
                ${t('fileTypes')}
              </span>

              <button
                class="button button-primary button-small"
              >
                ${icon('plus')}
                ${t('uploadPrescription')}
              </button>

            </div>

          </div>

        </section>


        <!-- =================================================
             OFFERS
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('exclusiveOffers')}
              </span>

              <h2>
                ${t('featuredPromotions')}
              </h2>

            </div>

            <button
              class="text-button"
              data-nav="plans"
            >
              ${t('exploreAllOffers')}
              ${icon('arrow')}
            </button>

          </div>


          <div class="offers-carousel-section">

            <div class="offers-scroll-strip">


              <div
                class="offer-card banner-gold"
                data-nav="pharmacy"
              >

                <span class="offer-badge">
                  ${t('upTo40Off')}
                </span>

                <h3>
                  ${t('vitaminsSupplements')}
                </h3>

                <p>
                  ${t('vitaminsDescription')}
                </p>

                <span class="offer-link">
                  ${t('shopNow')}
                  ${icon('arrow')}
                </span>

              </div>


              <div
                class="offer-card banner-navy"
                data-nav="labtests"
              >

                <span class="offer-badge">
                  ${t('sixtyOffPackage')}
                </span>

                <h3>
                  ${t('fullBodyCheckup')}
                </h3>

                <p>
                  ${t('checkupDescription')}
                </p>

                <span class="offer-link">
                  ${t('bookPackage')}
                  ${icon('arrow')}
                </span>

              </div>


              <div
                class="offer-card banner-teal"
                data-nav="pharmacy"
              >

                <span class="offer-badge">
                  ${t('freeDelivery')}
                </span>

                <h3>
                  ${t('expressMedicineDelivery')}
                </h3>

                <p>
                  ${t('deliveryDescription')}
                </p>

                <span class="offer-link">
                  ${t('orderMedicine')}
                  ${icon('arrow')}
                </span>

              </div>

            </div>

          </div>

        </section>


        <!-- =================================================
             DIAGNOSTICS
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('diagnosticsImaging')}
              </span>

              <h2>
                ${t('topBookedTests')}
              </h2>

            </div>

            <button
              class="text-button"
              data-nav="labtests"
            >
              ${t('viewAllDiagnostics')}
              ${icon('arrow')}
            </button>

          </div>


          <div class="diagnostics-chips-row">

            <button
              class="diag-chip active"
              data-nav="labtests"
            >
              ${icon('flask')}
              ${t('fullBody')}
            </button>

            <button
              class="diag-chip"
              data-nav="labtests"
            >
              ${icon('pulse')}
              ${t('heartCheck')}
            </button>

            <button
              class="diag-chip"
              data-nav="labtests"
            >
              ${icon('pills')}
              ${t('diabetesCare')}
            </button>

            <button
              class="diag-chip"
              data-nav="labtests"
            >
              ${icon('shield')}
              ${t('thyroidAssessment')}
            </button>

            <button
              class="diag-chip"
              data-nav="labtests"
            >
              ${icon('ecg')}
              ${t('xrayScans')}
            </button>

          </div>


          <div class="test-grid">

            ${topTests
              .map(test => labTestCard(test, ctx))
              .join('')}

          </div>

        </section>


        <!-- =================================================
             PHARMACY CATEGORY
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('pharmacyEcosystem')}
              </span>

              <h2>
                ${t('exploreByCategory')}
              </h2>

            </div>

            <button
              class="text-button"
              data-nav="pharmacy"
            >
              ${t('viewPharmacy')}
              ${icon('arrow')}
            </button>

          </div>


          <div class="category-circles">

            ${categories
              .map(c => `
                <button
                  class="category-circle"
                  data-cat-nav="${c.id}"
                >

                  <span
                    class="cat-circle-icon cat-${c.color}"
                  >
                    ${icon(c.icon)}
                  </span>

                  <span>
                    ${c.label}
                  </span>

                </button>
              `)
              .join('')}

          </div>

        </section>


        <!-- =================================================
             TRENDING PRODUCTS
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('medicinesWellness')}
              </span>

              <h2>
                ${t('trendingEssentials')}
              </h2>

            </div>

            <button
              class="text-button"
              data-nav="pharmacy"
            >
              ${t('browseMedicines')}
              ${icon('arrow')}
            </button>

          </div>


          <div
            class="product-grid home-product-grid"
            id="home-trending-grid"
          >

            ${trendingProducts
              .map(p => productCard(p, ctx))
              .join('')}

          </div>

        </section>


        <!-- =================================================
             DOCTORS
        ================================================== -->

        <section
          class="section-wrap home-section"
          id="specialists"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('doctorConsultation')}
              </span>

              <h2>
                ${t('consultTopDoctors')}
              </h2>

            </div>

            <button
              class="text-button"
              data-nav="doctors"
            >
              ${t('findAllDoctors')}
              ${icon('arrow')}
            </button>

          </div>


          <div class="doctor-grid home-doctor-grid">

            ${doctors
              .slice(0, 4)
              .map(d => doctorCard(d))
              .join('')}

          </div>

        </section>


        <!-- =================================================
             HEALTH SNAPSHOT
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="health-snapshot-bar">

            <div class="snapshot-header">

              <div>

                <span class="eyebrow-tag">
                  ${icon('user')}
                  ${t('personalHealthSnapshot')}
                </span>

                <h2>
                  ${t('welcomeBack')}
                  <em class="editorial">
                    Jordan
                  </em>
                </h2>

              </div>

              <button
                class="button button-small button-outline"
                data-nav="dashboard"
              >
                ${t('openDashboard')}
                ${icon('arrow')}
              </button>

            </div>


            <div class="snapshot-grid">


              <div class="snapshot-item">

                <span class="snapshot-icon">
                  ${icon('heart')}
                </span>

                <div>

                  <strong>
                    ${t('healthScore')}
                  </strong>

                  <span>
                    ${t('optimalVitals')}
                  </span>

                </div>

              </div>


              <div class="snapshot-item">

                <span class="snapshot-icon">
                  ${icon('flask')}
                </span>

                <div>

                  <strong>
                    ${t('labReportsCount')}
                  </strong>

                  <span>
                    ${t('annualPanel')}
                  </span>

                </div>

              </div>


              <div class="snapshot-item">

                <span class="snapshot-icon">
                  ${icon('file')}
                </span>

                <div>

                  <strong>
                    ${t('prescriptionsCount')}
                  </strong>

                  <span>
                    ${t('digitalArchive')}
                  </span>

                </div>

              </div>


            </div>

          </div>

        </section>


        <!-- =================================================
             ARTICLES
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="section-heading">

            <div>

              <span class="section-kicker">
                ${t('medicalInsights')}
              </span>

              <h2>
                ${t('healthArticles')}
                <em class="editorial">
                  ${t('forYou')}
                </em>
              </h2>

            </div>

            <button
              class="text-button"
            >
              ${t('readAllArticles')}
              ${icon('arrow')}
            </button>

          </div>


          <div class="article-grid">

            ${articles
              .map(a => articleCard(a))
              .join('')}

          </div>

        </section>


        <!-- =================================================
             EMERGENCY
        ================================================== -->

        <section
          class="section-wrap home-section"
        >

          <div class="emergency-banner">

            <div class="emergency-banner-content">

              <span class="emergency-badge">
                24/7
              </span>

              <div>

                <h3>
                  ${t('emergencyHotline')}
                </h3>

                <p>
                  ${t('emergencyDescription')}
                </p>

              </div>

            </div>


            <button
              class="button button-light"
              data-nav="emergency"
            >
              ${icon('phone')}
              ${t('callEmergency')}
            </button>

          </div>

        </section>


      </main>


      ${premiumFooter()}

      ${mobileBottomNav('home')}

    </div>


    <div
      class="toast"
      id="toast"
    >
      <span class="toast-check">
        ${icon('check')}
      </span>

      <span id="toast-text">
        ${t('saved')}
      </span>
    </div>

  `
  bindHomeEvents(appRoot, ctx)
  detectUserLocation(appRoot)
}


/* =========================================================
   HOME EVENTS
========================================================= */

function bindHomeEvents(appRoot, ctx) {

  const {
    navigate,
    addToCart,
    changeQty,
    showToast
  } = ctx


  /* =======================================================
     LANGUAGE SELECTOR
  ======================================================= */

  const languageButton =
    appRoot.querySelector('#language-button')

  const languageMenu =
    appRoot.querySelector('#language-menu')


  if (languageButton && languageMenu) {

    languageButton.addEventListener(
      'click',
      e => {

        e.stopPropagation()

        const isOpen =
          languageMenu.classList.toggle(
            'is-open'
          )

        languageButton.setAttribute(
          'aria-expanded',
          String(isOpen)
        )
      }
    )


    appRoot
      .querySelectorAll('[data-language]')
      .forEach(option => {

        option.addEventListener(
          'click',
          e => {

            e.preventDefault()
            e.stopPropagation()

            const languageCode =
              option.dataset.language

            if (!languageCode) return

            /*
             * setLanguage() updates localStorage
             * and dispatches the language event.
             */
            setLanguage(languageCode)

            /*
             * Close the dropdown immediately.
             */
            languageMenu.classList.remove(
              'is-open'
            )

            languageButton.setAttribute(
              'aria-expanded',
              'false'
            )

            /*
             * The application-level listener in
             * main.js handles the complete page
             * re-render.
             */
          }
        )

      })


    document.addEventListener(
      'click',
      () => {

        languageMenu.classList.remove(
          'is-open'
        )

        languageButton.setAttribute(
          'aria-expanded',
          'false'
        )

      },
      { once: true }
    )
  }


  /* =======================================================
     REFRESH PRODUCT GRID
  ======================================================= */

  function refreshHomeGrid() {

    const grid =
      appRoot.querySelector(
        '#home-trending-grid'
      )

    if (grid) {

      const trendingProducts =
        products.slice(0, 12)

      grid.innerHTML =
        trendingProducts
          .map(p => productCard(p, ctx))
          .join('')
    }
  }


  if (ctx.onCartChange) {

    ctx.onCartChange(
      () => refreshHomeGrid()
    )

  }


  /* =======================================================
     NAVIGATION
  ======================================================= */

  appRoot
    .querySelectorAll('[data-nav]')
    .forEach(el => {

      el.addEventListener(
        'click',
        e => {

          e.preventDefault()

          closeAccountDrawer(appRoot)

          navigate(
            el.dataset.nav
          )

        }
      )

    })


  /* =======================================================
     AUTH
  ======================================================= */

  appRoot
    .querySelectorAll('.auth-modal-trigger')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          openAuthModal(
            el.dataset.authMode,
            ctx
          )

        }
      )

    })


  /* =======================================================
     PROFILE
  ======================================================= */

  const profileBtn =
    appRoot.querySelector(
      '.profile-button'
    )

  if (profileBtn) {

    profileBtn.addEventListener(
      'click',
      e => {

        e.preventDefault()
        e.stopPropagation()

        if (isAuthenticated()) {

          openAccountDrawer(appRoot)

        } else {

          requireAuth(
            () =>
              openAccountDrawer(
                appRoot
              ),
            'OPEN_PROFILE'
          )

        }

      }
    )

  }


  /* =======================================================
     ACCOUNT DRAWER
  ======================================================= */

  const closeBtn =
    appRoot.querySelector(
      '#close-account-drawer'
    )

  const overlay =
    appRoot.querySelector(
      '#account-drawer-overlay'
    )


  if (closeBtn) {

    closeBtn.addEventListener(
      'click',
      () =>
        closeAccountDrawer(
          appRoot
        )
    )

  }


  if (overlay) {

    overlay.addEventListener(
      'click',
      () =>
        closeAccountDrawer(
          appRoot
        )
    )

  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logoutBtn =
    appRoot.querySelector(
      '#drawer-logout-btn'
    )

  if (logoutBtn) {

    logoutBtn.addEventListener(
      'click',
      () => {

        logoutUser()

        closeAccountDrawer(
          appRoot
        )

        showToast(
          t('signedOut')
        )

        navigate('home')

      }
    )

  }


  /* =======================================================
     CATEGORY NAVIGATION
  ======================================================= */

  appRoot
    .querySelectorAll('[data-cat-nav]')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          navigate(
            'pharmacy',
            {
              category:
                el.dataset.catNav
            }
          )

        }
      )

    })


  /* =======================================================
     POPULAR SEARCH TAGS
  ======================================================= */

  appRoot
    .querySelectorAll('[data-tag-search]')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          navigate(
            'pharmacy',
            {
              search:
                el.dataset.tagSearch
            }
          )

        }
      )

    })


  /* =======================================================
     WISHLIST / CART / PRODUCT ACTIONS
  ======================================================= */

  appRoot.addEventListener(
    'click',
    e => {

      /* -----------------------------------------------
         WISHLIST
      ------------------------------------------------ */

      const wishBtn =
        e.target.closest(
          '[data-wishlist]'
        )

      if (wishBtn) {

        e.stopPropagation()

        const pid =
          wishBtn.dataset.wishlist

        const wishlist =
          new Set(
            JSON.parse(
              localStorage.getItem(
                'thp_wishlist'
              ) || '[]'
            )
          )


        if (wishlist.has(pid)) {

          wishlist.delete(pid)

          showToast(
            t('removedWishlist')
          )

        } else {

          wishlist.add(pid)

          showToast(
            t('savedWishlist')
          )

        }


        localStorage.setItem(
          'thp_wishlist',
          JSON.stringify(
            [...wishlist]
          )
        )

        refreshHomeGrid()

        return
      }


      /* -----------------------------------------------
         INCREASE QUANTITY
      ------------------------------------------------ */

      const incBtn =
        e.target.closest(
          '[data-qty-inc]'
        )

      if (incBtn) {

        e.stopPropagation()

        changeQty(
          incBtn.dataset.qtyInc,
          1
        )

        return
      }


      /* -----------------------------------------------
         DECREASE QUANTITY
      ------------------------------------------------ */

      const decBtn =
        e.target.closest(
          '[data-qty-dec]'
        )

      if (decBtn) {

        e.stopPropagation()

        changeQty(
          decBtn.dataset.qtyDec,
          -1
        )

        return
      }


      /* -----------------------------------------------
         ADD TO CART
      ------------------------------------------------ */

      const addBtn =
        e.target.closest(
          '[data-add]'
        )

      if (addBtn) {

        e.stopPropagation()

        const p =
          products.find(
            p =>
              p.id ===
              addBtn.dataset.add
          )

        if (p) {

          addToCart(
            p.id,
            p
          )

        }

        return
      }


      /* -----------------------------------------------
         QUICK VIEW
      ------------------------------------------------ */

      const quickNav =
        e.target.closest(
          '[data-quick-nav]'
        )

      if (quickNav) {

        e.stopPropagation()

        navigate(
          'product',
          {
            id:
              quickNav.dataset.quickNav
          }
        )

        return
      }


      /* -----------------------------------------------
         PRODUCT CARD
      ------------------------------------------------ */

      const productCardEl =
        e.target.closest(
          '[data-product]'
        )

      if (
        productCardEl &&
        !e.target.closest(
          '[data-add]'
        ) &&
        !e.target.closest(
          '[data-qty-inc]'
        ) &&
        !e.target.closest(
          '[data-qty-dec]'
        ) &&
        !e.target.closest(
          '[data-wishlist]'
        ) &&
        !e.target.closest(
          '[data-quick-nav]'
        )
      ) {

        navigate(
          'product',
          {
            id:
              productCardEl.dataset.product
          }
        )

      }

    }
  )


  /* =======================================================
     LAB TESTS
  ======================================================= */

  appRoot
    .querySelectorAll('[data-test]')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          navigate(
            'test',
            {
              id:
                el.dataset.test
            }
          )

        }
      )

    })


  appRoot
    .querySelectorAll('[data-book-test]')
    .forEach(el => {

      el.addEventListener(
        'click',
        e => {

          e.stopPropagation()

          navigate(
            'test',
            {
              id:
                el.dataset.bookTest
            }
          )

        }
      )

    })


  /* =======================================================
     DOCTORS
  ======================================================= */

  appRoot
    .querySelectorAll('[data-doctor]')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          navigate(
            'doctor',
            {
              id:
                el.dataset.doctor
            }
          )

        }
      )

    })


  /* =======================================================
     ARTICLES
  ======================================================= */

  appRoot
    .querySelectorAll('[data-article]')
    .forEach(el => {

      el.addEventListener(
        'click',
        () => {

          navigate(
            'article',
            {
              id:
                el.dataset.article
            }
          )

        }
      )

    })


  /* =======================================================
     HOME SEARCH
  ======================================================= */

  const searchBtn =
    appRoot.querySelector(
      '[data-search-btn]'
    )

  const searchInput =
    appRoot.querySelector(
      '#home-search'
    )


  if (searchBtn) {

    searchBtn.addEventListener(
      'click',
      () => {

        const value =
          searchInput
            ? searchInput.value.trim()
            : ''

        if (value) {

          navigate(
            'pharmacy',
            {
              search: value
            }
          )

        }

      }
    )

  }


  if (searchInput) {

    searchInput.addEventListener(
      'keydown',
      e => {

        if (e.key === 'Enter') {

          const value =
            searchInput.value.trim()

          if (value) {

            navigate(
              'pharmacy',
              {
                search: value
              }
            )

          }

        }

      }
    )

  }


  /* =======================================================
     PRESCRIPTION UPLOAD
  ======================================================= */

  const rxUploadTile =
    appRoot.querySelector(
      '#rx-home-upload'
    )

  if (rxUploadTile) {

    rxUploadTile.addEventListener(
      'click',
      () =>
        navigate(
          'prescription'
        )
    )

  }


  /* =======================================================
     MOBILE MENU
  ======================================================= */

  const mobileMenu =
    appRoot.querySelector(
      '#home-mobile-menu'
    )

  if (mobileMenu) {

    mobileMenu.addEventListener(
      'click',
      () => {

        const subNav =
          appRoot.querySelector(
            '.sub-nav-inner'
          )

        if (subNav) {

          subNav.classList.toggle(
            'mobile-open'
          )

        }

      }
    )

  }

  // Instant Consult 24/7 button — lives in the sub-nav bar
  const fabBtn = appRoot.querySelector("#fab-instant-consult");

  if (fabBtn) {
    fabBtn.addEventListener("click", () =>
      showToast("Connecting to 24/7 Instant Doctor...")
    );
  }

}
/* =======================================================
   IP LOCATION
======================================================= */

async function detectUserLocation(appRoot) {
  const locationElement =
    appRoot.querySelector('#home-location-text')

  if (!locationElement) return

  try {
    const savedLocation =
      localStorage.getItem('thp_location')

    if (savedLocation) {
      locationElement.textContent = savedLocation
    }

    const response =
      await fetch('https://ipapi.co/json/')

    if (!response.ok) {
      throw new Error('Location request failed')
    }

    const data = await response.json()

    if (data.city) {
      const location =
        data.region
          ? `${data.city}, ${data.region}`
          : data.city

      locationElement.textContent = location

      localStorage.setItem(
        'thp_location',
        location
      )
    }
  } catch (error) {
    console.warn(
      'Unable to detect user location:',
      error
    )

    locationElement.textContent =
      'Location unavailable'
  }
}