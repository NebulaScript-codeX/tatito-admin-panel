import { icons, icon, avatar, showToast, premiumFooter, mobileBottomNav, accountDrawerHTML, openAccountDrawer, closeAccountDrawer } from './ui.js'
import { products, labTests, doctors, articles, categories, doctorSpecialties, doctorCities, doctorHealthChecks, vitalOrgans, labPackages, internshipPrograms } from './data.js'
import { isAuthenticated, getAuthUser, getAuthToken, requireAuth, logoutUser } from './auth.js'
import { openAuthModal } from './authPages.js'
import { formatINR } from './currency.js'
import { calculateBestPlanSavings } from './healthPlanCalculator.js'
import { languages, getLanguage, setLanguage, t } from './translations.js'
import {
  createDoctorAppointment,
  getDoctorAvailability,
  getMyDoctorAppointments,
  getMyDoctorPayments,
  getMyHealthPlanSubscriptions,
  addMyHealthPlanFamilyMember,
  updateMyHealthPlanFamilyMember,
  removeMyHealthPlanFamilyMember,
  getPublicHealthPlans,
  HEALTH_PLANS_API_URL,
} from './api.js'


export function sharedHeader(ctx, activeNav) {
  const { navigate, getCartCount } = ctx

  const navItems = [
    { label: t('doctors'), page: 'doctors', icon: 'doctorCare' },
    { label: t('pharmacy'), page: 'pharmacy' },
    { label: t('labTests'), page: 'labtests' },
    { label: t('healthPlans'), page: 'plans' },
    { label: t('internships'), page: 'internships' }
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

          <a class="brand" data-nav="home" aria-label="Tatito Health+ home">
            <img src="/tatito-logo.png" alt="Tatito Health+" class="brand-logo">
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

            <div class="language-selector">
              <button
                class="language-button"
                id="language-button"
                type="button"
                aria-label="Select language"
              >
                🌐
                <span>
                  ${languages.find(lang => lang.code === currentLanguage)?.nativeName || 'English'}
                </span>
                ${icon('chevron')}
              </button>

              <div class="language-menu" id="language-menu">
                ${languages.map(lang => `
                  <button
                    type="button"
                    class="language-option ${lang.code === currentLanguage ? 'active' : ''}"
                    data-language="${lang.code}"
                  >
                    <span>${lang.nativeName}</span>
                    <small>${lang.name}</small>
                  </button>
                `).join('')}
              </div>
            </div>

            <button class="location-button">
              ${icon('pin')}
              <span id="site-location-text">Detecting location...</span>
              ${icon('chevron')}
            </button>

            <button class="icon-button" aria-label="${t('notifications')}">
              ${icon('bell')}
              <span class="notification-dot"></span>
            </button>

            <button class="cart-button" data-nav="cart">
              ${icon('bag')}
              <span>${t('cart')}</span>
              <span class="cart-count">${getCartCount()}</span>
            </button>

            ${isAuth ? `
              <button class="profile-button">
                ${avatar(user ? user.initials : 'JD', 'teal')}
                <span>${user ? user.name.split(' ')[0] : 'User'}</span>
                ${icon('chevron')}
              </button>
            ` : `
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
            `}

            <button
              class="mobile-menu"
              id="page-mobile-menu"
              aria-label="Open menu"
            >
              ${icon('menu')}
            </button>

          </div>
        </div>
      </header>

      <nav class="sub-nav">
        <div class="sub-nav-inner">
          ${navItems.map(n => `
            <a
              data-nav="${n.page}"
              class="${activeNav === n.page ? 'nav-active' : ''}"
            >
              ${n.icon ? icon(n.icon) : ""}${n.label}
            </a>
          `).join('')}

          <button class="floating-consult-fab" id="fab-instant-consult">
            <span class="fab-icon">${icon("phone")}</span>
            <span>Instant Consult 24/7</span>
          </button>
        </div>
      </nav>
    </div>

    ${accountDrawerHTML()}
  `;
}

function sharedFooter(ctx) {
  return premiumFooter();
}

function sharedMobileNav(ctx, active) {
  return mobileBottomNav(active);
}

export function bindNav(appRoot, ctx) {
  const { navigate, showToast } = ctx;
  appRoot.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeAccountDrawer(appRoot);
      navigate(el.dataset.nav);
    });
  });

  appRoot.querySelectorAll('.auth-modal-trigger').forEach(el => {
    el.addEventListener('click', () => openAuthModal(el.dataset.authMode, ctx))
  })

    // Language selector
  const languageButton = appRoot.querySelector('#language-button')
  const languageMenu = appRoot.querySelector('#language-menu')

  if (languageButton && languageMenu) {
    languageButton.addEventListener('click', (e) => {
      e.stopPropagation()
      languageMenu.classList.toggle('is-open')
    })

    appRoot.querySelectorAll('[data-language]').forEach(el => {
      el.addEventListener('click', () => {
        setLanguage(el.dataset.language)
        languageMenu.classList.remove('is-open')
      })
    })

    document.addEventListener('click', () => {
      languageMenu.classList.remove('is-open')
    })
  }

  const profileBtn = appRoot.querySelector(".profile-button");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAuthenticated()) {
        openAccountDrawer(appRoot);
      } else {
        requireAuth(() => openAccountDrawer(appRoot), "OPEN_PROFILE");
      }
    });
  }

  const closeBtn = appRoot.querySelector("#close-account-drawer");
  const overlay = appRoot.querySelector("#account-drawer-overlay");
  if (closeBtn)
    closeBtn.addEventListener("click", () => closeAccountDrawer(appRoot));
  if (overlay)
    overlay.addEventListener("click", () => closeAccountDrawer(appRoot));

  const logoutBtn = appRoot.querySelector("#drawer-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logoutUser();
      closeAccountDrawer(appRoot);
      showToast("Signed out of Tatito Health+.");
      navigate("home");
    });
  }

  const mm = appRoot.querySelector('#page-mobile-menu')
  const fabBtn = appRoot.querySelector("#fab-instant-consult");

  if (fabBtn)
    fabBtn.addEventListener("click", () =>
      showToast("Connecting to 24/7 Instant Doctor..."),
    );
  if (mm) mm.addEventListener('click', () => appRoot.querySelector('.sub-nav-inner').classList.toggle('mobile-open'))
  detectSiteLocation(appRoot)
}

// === Product Detail Page ===
export function renderProductDetail(appRoot, ctx) {
  const { navigate, currentParams, addToCart, showToast } = ctx;
  const p = products.find((p) => p.id === currentParams.id);
  if (!p) {
    navigate("pharmacy");
    return;
  }
  const discount = Math.round((1 - p.price / p.mrp) * 100);
  const savings = (p.mrp - p.price).toFixed(2);
  const related = products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "pharmacy")}
      <main id="top" class="product-detail-main">
        
        <!-- BREADCRUMB & HERO WRAPPER -->
        <section class="section-wrap">
          <!-- MAIN DUAL-COLUMN PRODUCT CARD -->
          <div class="product-detail-card">
            
            <!-- LEFT COLUMN: PRODUCT MEDIA & TRUST BADGES -->
            <div class="pd-left-column">
              <div class="pd-image-box avatar-${p.color}">
                <span class="pd-avatar-symbol">${p.initials}</span>
                ${discount > 0 ? `<span class="pd-discount-badge">-${discount}% OFF</span>` : ""}
                ${p.rx ? `<span class="pd-rx-badge">${icon("file")} Rx Required</span>` : ""}
              </div>

              <!-- TRUST HIGHLIGHTS GRID -->
              <div class="pd-trust-grid">
                <div class="pdt-item">
                  <span class="pdt-icon">${icon("verified")}</span>
                  <div><strong>100% Genuine</strong><span>WHO-GMP Certified</span></div>
                </div>
                <div class="pdt-item">
                  <span class="pdt-icon">${icon("shield")}</span>
                  <div><strong>FDA Approved</strong><span>Safety Verified</span></div>
                </div>
                <div class="pdt-item">
                  <span class="pdt-icon">${icon("clock")}</span>
                  <div><strong>24-hr Express</strong><span>Temperature Controlled</span></div>
                </div>
                <div class="pdt-item">
                  <span class="pdt-icon">${icon("check")}</span>
                  <div><strong>Free Returns</strong><span>14-Day Easy Policy</span></div>
                </div>
              </div>

            </div>

            <!-- RIGHT COLUMN: PRODUCT INFO & PRICING ACTIONS -->
            <div class="pd-right-column">
              
              <div class="pd-header-meta">
                <span class="pd-mfr-tag">${p.manufacturer}</span>
                <span class="pd-stock-chip ${p.stock === "In Stock" ? "stock-ok" : "stock-low"}">
                  ${icon("check")} ${p.stock}
                </span>
              </div>

              <h1 class="pd-product-title">${p.name}</h1>
              
              <div class="pd-rating-row">
                <span class="pd-rating-pill">★ ${p.rating}</span>
                <span class="pd-reviews-count">(${p.reviews} verified patient reviews)</span>
                <span class="pd-divider">·</span>
                <span class="pd-satisfaction">${icon("heart")} 99.2% Satisfaction Rate</span>
              </div>

              <div class="pd-pack-pill">${icon("pills")} ${p.pack}</div>

              <!-- PRICING CARD -->
              <div class="pd-pricing-card">
                <div class="pd-price-row">
                  <strong class="pd-main-price">${formatINR(p.price)}</strong>
                  ${discount > 0 ? `<s class="pd-mrp-price">${formatINR(p.mrp)}</s>` : ""}
                  ${discount > 0 ? `<span class="pd-save-tag">${icon("spark")} Save ${formatINR(Number(savings))} (${discount}% OFF)</span>` : ""}
                </div>
                <span class="pd-tax-note">Inclusive of all taxes & local pharmacy delivery fees</span>
              </div>

              ${
                p.rx
                  ? `
                <div class="pd-rx-alert-box">
                  <div class="pra-icon">${icon("file")}</div>
                  <div>
                    <strong>Prescription Required for Dispatch</strong>
                    <p>Upload your doctor's note during checkout or right now via our Rx uploader.</p>
                  </div>
                  <button class="button button-small button-light" data-nav="prescription">Upload Rx</button>
                </div>
              `
                  : ""
              }

              <!-- QUANTITY & CTA ROW -->
              <div class="pd-cta-row">
                <div class="pd-qty-control">
                  <button id="detail-qty-dec" aria-label="Decrease quantity">−</button>
                  <span id="detail-qty">1</span>
                  <button id="detail-qty-inc" aria-label="Increase quantity">+</button>
                </div>

                <button class="button button-primary button-xl pd-add-btn" id="detail-add-cart">
                  ${icon("bag")} Add to Cart
                </button>

                <button class="button button-outline button-xl pd-buy-btn" id="detail-buy-now">
                  Buy Now ${icon("arrow")}
                </button>

                <button class="icon-button pd-wishlist-btn" id="detail-wishlist" aria-label="Add to Wishlist">
                  ${icon("heart")}
                </button>
              </div>

              <!-- TAGS & KEY HIGHLIGHTS -->
              <div class="pd-tags-row">
                <span class="pd-tags-label">Primary Benefits:</span>
                ${p.tags.map((t) => `<span class="product-tag">${t}</span>`).join("")}
              </div>

              <!-- DELIVERY TRUST BADGES -->
              <div class="pd-delivery-features">
                <div class="pdf-item">${icon("check")} <span><strong>Free express delivery</strong> on orders over ₹499</span></div>
                <div class="pdf-item">${icon("check")} <span><strong>Same-day doorstep delivery</strong> in Brooklyn & NYC</span></div>
                <div class="pdf-item">${icon("check")} <span><strong>256-bit encrypted</strong> private healthcare packaging</span></div>
              </div>

            </div>

          </div>
        </section>

        <!-- PRODUCT SPECIFICATIONS & CLINICAL DETAILS SECTION -->
        <section class="section-wrap pd-details-tabs-section">
          <div class="pd-spec-card">
            <div class="section-heading">
              <div>
                <span class="section-kicker">${icon("file")} CLINICAL INFORMATION</span>
                <h2>Product Details & <em class="editorial">Usage Guidelines</em></h2>
              </div>
            </div>

            <div class="faq-accordion-list">
              <details class="faq-item" open>
                <summary class="faq-question">
                  <strong>About ${p.name} & Clinical Indications</strong>
                  <span class="faq-chevron">${icon("chevron")}</span>
                </summary>
                <div class="faq-answer">
                  <p>${p.desc}</p>
                  <p style="margin-top: 8px;">Sourced directly from WHO-GMP certified laboratories with verified batch numbers and strict cold-chain quality assurance.</p>
                </div>
              </details>

              <details class="faq-item">
                <summary class="faq-question">
                  <strong>Recommended Dosage & Administration</strong>
                  <span class="faq-chevron">${icon("chevron")}</span>
                </summary>
                <div class="faq-answer">
                  <p>Take as directed by your physician or pharmacist. Swallow capsule whole with water after meals. Do not exceed the recommended daily or weekly intake.</p>
                </div>
              </details>

              <details class="faq-item">
                <summary class="faq-question">
                  <strong>Safety Warnings & Storage Instructions</strong>
                  <span class="faq-chevron">${icon("chevron")}</span>
                </summary>
                <div class="faq-answer">
                  <p>Keep out of reach of children. Store in a cool, dry place below 25°C away from direct heat and sunlight. Consult your physician if pregnant, lactating, or taking other prescription medications.</p>
                </div>
              </details>
            </div>
          </div>
        </section>

        <!-- RELATED PRODUCTS SECTION -->
        ${
          related.length > 0
            ? `
          <section class="section-wrap related-products-section">
            <div class="section-heading">
              <div>
                <span class="section-kicker">${icon("spark")} SIMILAR MEDICINES & SUPPLEMENTS</span>
                <h2>Related <em class="editorial">Healthcare</em> Products</h2>
              </div>
            </div>
            <div class="product-grid">${related.map((rp) => relatedCard(rp)).join("")}</div>
          </section>
        `
            : ""
        }

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "pharmacy")}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindNav(appRoot, ctx);

  let qty = 1;
  const qtyDisplay = appRoot.querySelector("#detail-qty");
  const incBtn = appRoot.querySelector("#detail-qty-inc");
  const decBtn = appRoot.querySelector("#detail-qty-dec");
  const addCartBtn = appRoot.querySelector("#detail-add-cart");
  const buyNowBtn = appRoot.querySelector("#detail-buy-now");
  const wishlistBtn = appRoot.querySelector("#detail-wishlist");

  if (incBtn && qtyDisplay)
    incBtn.addEventListener("click", () => {
      qty++;
      qtyDisplay.textContent = qty;
    });
  if (decBtn && qtyDisplay)
    decBtn.addEventListener("click", () => {
      if (qty > 1) {
        qty--;
        qtyDisplay.textContent = qty;
      }
    });
  if (addCartBtn)
    addCartBtn.addEventListener("click", () => {
      addToCart(p.id, p, qty);
    });
  if (buyNowBtn)
    buyNowBtn.addEventListener("click", () => {
      addToCart(p.id, p, qty);
      navigate("cart");
    });
  if (wishlistBtn)
    wishlistBtn.addEventListener("click", () => {
      showToast(`Saved ${p.name} to your wishlist.`);
    });
  appRoot.querySelectorAll("[data-product]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (!e.target.closest("[data-add]"))
        navigate("product", { id: el.dataset.product });
    });
  });

  appRoot.querySelectorAll("[data-add]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const prod = products.find((p) => p.id === el.dataset.add);
      if (prod) addToCart(prod.id, prod);
    });
  });
}

function relatedCard(p) {
  const discount = Math.round((1 - p.price / p.mrp) * 100);
  return `<article class="product-card" data-product="${p.id}"><div class="product-image"><span class="product-avatar avatar-${p.color}">${p.initials}</span>${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ""}</div><div class="product-info"><span class="product-manufacturer">${p.manufacturer}</span><h4 class="product-name">${p.name}</h4><span class="product-pack">${p.pack}</span><div class="product-rating">★ ${p.rating} <span>(${p.reviews})</span></div><div class="product-price-row"><div class="product-price"><strong>${formatINR(p.price)}</strong>${discount > 0 ? `<s>${formatINR(p.mrp)}</s>` : ""}</div><button class="add-to-cart-btn" data-add="${p.id}">${icon("plus")} Add</button></div></div></article>`;
}

// === Doctors Page ===
export function renderDoctors(appRoot, ctx) {
  const { navigate, currentParams } = ctx;
  let selectedSpecialty = currentParams.specialty || "all";
  let selectedCity = currentParams.city || "all";
  let selectedType = "all";
  let selectedDate = "today";
  let searchQuery = currentParams.search || "";
  let sortBy = "recommended";

  function getFilteredDoctors() {
    let list = cachedDoctors();
    if (selectedSpecialty !== "all") {
      list = list.filter(
        (d) =>
          d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
          selectedSpecialty.toLowerCase().includes(d.specialty.toLowerCase()),
      );
    }
    if (selectedCity !== "all") {
      list = list.filter(
        (d) =>
          d.city.toLowerCase() === selectedCity.toLowerCase() ||
          d.location.toLowerCase().includes(selectedCity.toLowerCase()),
      );
    }
    if (selectedType !== "all") {
      list = list.filter((d) =>
        selectedType === "online"
          ? d.type.includes("Online")
          : d.type.includes("In-Person"),
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q),
      );
    }
    if (sortBy === "fee-low") list = [...list].sort((a, b) => sortFee(a) - sortFee(b));
    else if (sortBy === "rating")
      list = [...list].sort(
        (a, b) => parseFloat(b.rating) - parseFloat(a.rating),
      );
    else if (sortBy === "experience")
      list = [...list].sort((a, b) => parseInt(b.detail) - parseInt(a.detail));
    return list;
  }

  function renderDoctorHeroSlides() {
    return cachedDoctors()
      .map(
        (d) => `
      <div class="doctor-hero-slide" data-doctor-id="${d.id}">
        <div class="promo-banner-content">
          <span class="promo-badge">${icon("spark")} Get 5% Off | Use Code CC50</span>
          <h1>Talk to a Doctor for <em class="editorial">Instant</em> advice</h1>
          <p>Connect with top-rated specialists within 15 minutes. 24/7 video consultation, private & secure care.</p>
          <div class="promo-cta-row">
            <button class="button button-primary" data-dhc-consult="${d.id}">${icon("video")} Consult Now</button>
            <span class="promo-trust">${icon("verified")} 4,000+ Verified Doctors</span>
            <span class="promo-trust">${icon("clock")} 24/7 Priority Care</span>
          </div>
        </div>
        <div class="promo-banner-graphic doctor-hero-graphic">
          <div class="graphic-badge">${icon("shield")} 24/7 Care Ready</div>
          ${avatar(d.initials, d.color, "graphic-doctor-avatar doctor-hero-avatar")}
          <div class="doctor-hero-info">
            <span class="doctor-hero-name">${d.name}</span>
            <span class="doctor-hero-specialty">${d.specialty} Specialist</span>
            <span class="doctor-hero-detail">${d.detail}</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  function renderSpecialtiesGrid() {
    return doctorSpecialties
      .map(
        (s) => `
      <div class="specialty-card ${selectedSpecialty === s.name ? "active" : ""}" data-spec-name="${s.name}">
        <div class="specialty-card-icon avatar-${s.color}">${icon(s.icon)}</div>
        <div class="specialty-card-info">
          <h4>${s.name}</h4>
          <span>${s.desc}</span>
        </div>
      </div>
    `,
      )
      .join("");
  }

  const EDU_LONG_DESCRIPTIONS = {
    Dermatology:
      "A specialized branch of medicine that focuses on hair, nails, and skin-related disorders. Dermatology also encompasses conditions that affect the thin lining of your mouth, eyelids, and nose.",
    "Obstetrics and Gynaecology":
      "Two major medical specialties that focus on women’s reproductive health. Obstetrics involves care during pregnancy, childbirth and after delivery, while gynaecology specializes in issues related to women’s reproductive health.",
    Paediatrics:
      "Focuses on the health and medical care of children, infants, and young adults from birth up to age 18.",
    "Psychiatry & Mental Health":
      "Specializes in the detection, treatment, and prevention of emotional, behavioral, and mental health disorders.",
  };

  // Layer 05 knowledge base carousel: keeps the 4 original guides untouched, then pulls in the
  // remaining specialties so all 24 appear in groups of 4 (6 slides), reusing the spec-slider primitives.
  function renderEduCarousel() {
    const head = [
      ["Dermatology", EDU_LONG_DESCRIPTIONS.Dermatology],
      ["Obstetrics and Gynaecology", EDU_LONG_DESCRIPTIONS["Obstetrics and Gynaecology"]],
      ["Paediatrics", EDU_LONG_DESCRIPTIONS.Paediatrics],
      ["Psychiatry & Mental Health", EDU_LONG_DESCRIPTIONS["Psychiatry & Mental Health"]],
    ];
    const used = new Set(["dermatology", "obstetrics", "paediatrics", "psychiatry"]);
    const rest = doctorSpecialties
      .filter((s) => !used.has(s.id))
      .map((s) => [s.name, s.desc]);
    const cards = [...head, ...rest].map(
      ([name, desc]) => `<div class="edu-item"><h4>${name}</h4><p>${desc}</p></div>`,
    );
    const slides = [];
    for (let i = 0; i < cards.length; i += 4) {
      slides.push(
        `<div class="edu-slider-slide" data-edu-slide="${Math.floor(i / 4)}"><div class="edu-slider-slide-grid">${cards.slice(i, i + 4).join("")}</div></div>`,
      );
    }
    return { slides: slides.join(""), total: Math.ceil(cards.length / 4) };
  }

  function renderDoctorCards() {
    const list = getFilteredDoctors();
    if (list.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("search")}</div>
          <h3>No verified doctors found for the selected filters.</h3>
          <p>Try resetting filters or choosing another specialty, city, or location.</p>
          <button class="button button-outline" id="reset-doc-filters">Reset all filters</button>
        </div>
      `;
    }
    return list.map((d) => doctorCard(d)).join("");
  }

  const eduCarousel = renderEduCarousel();

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "doctors")}
      <main id="top" class="doctor-page-main">
        
        <!-- Layer 01: Hero — Talk to a Doctor (Doctor Carousel) -->
        <section class="section-wrap doctor-hero-section">
          <div class="breadcrumb"><a data-nav="home">${t('home')}</a> ${icon('chevron')} <span>${t('findDoctors')}</span></div>
          
          <div class="doctor-promo-banner">
            <div class="promo-banner-content">
              <span class="promo-badge">${icon('spark')} Get 5% Off | Use Code CC50</span>
              <h1>${t('talkToDoctor')} <em class="editorial">${t('instant')}</em> ${t('advice')}</h1>
              <p>${t('doctorHeroDescription')}</p>
              
              <div class="promo-cta-row">
                <button class="button button-primary" id="instant-consult-btn">${icon('video')} ${t('consultNow')}</button>
                <span class="promo-trust">${icon('verified')} 4,000+ Verified Doctors</span>
                <span class="promo-trust">${icon('clock')} 24/7 Priority Care</span>
              </div>
            </div>
            <button class="spec-slider-arrow spec-slider-arrow-next doctor-hero-arrow doctor-hero-arrow-next" id="dhc-next" type="button" aria-label="Next doctor">${icon("chevron")}</button>
          </div>
          <div class="doctor-hero-controls">
            <div class="spec-slider-dots doctor-hero-dots" id="dhc-dots"></div>
            <span class="spec-slider-counter" id="dhc-counter">1 / ${doctors.length}</span>
          </div>
        </section>

        <!-- Layer 02: Browse by Specialties Discovery Grid (24 Specialties) -->
        <section class="section-wrap specialties-wrap">
          <div class="section-heading">
            <div>
              <span class="section-kicker">01 / ${t('specialties')}</span>
              <h2>${t('browseBy')} <em class="editorial">${t('medical')}</em> ${t('specialties')}</h2>
              <p class="section-subtext">${t('specialtiesDescription')}</p>
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
              <span class="ai-badge">${icon("spark")} 01 / INTELLIGENCE — Tatito AI</span>
              <h2>Ask anything about your <em class="editorial">health.</em></h2>
              <p>Get instant, trusted guidance powered by AI and verified medical protocols.</p>
              <div class="ai-input-row">
                ${icon("search")}
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
                ${icon("shield")} <span>AI guidance for informational support — consult a qualified medical professional for diagnosis or treatment.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Layer 03: Verified Doctor Directory & Filters -->
        <section class="section-wrap doctor-list-wrap">
          <div class="doctor-list-container">
            <div class="doctor-toolbar-heading">
              <span class="section-kicker">03 / VERIFIED DOCTORS</span>
            </div>
            <div class="doctor-toolbar">
              <div class="doctor-toolbar-meta">
                <span id="doctor-count-text">Showing ${getFilteredDoctors().length} verified doctor${getFilteredDoctors().length !== 1 ? "s" : ""}</span>
              </div>

              <div class="doctor-sidebar">
                <div class="sidebar-section filter-dropdown-group" id="specialty-filter-group">
                  <h4 class="filter-dropdown-trigger" id="specialty-filter-trigger" role="button" tabindex="0"><span class="filter-trigger-label">${selectedSpecialty === "all" ? "Specialty Filter" : selectedSpecialty}</span>${icon("chevron")}</h4>
                  <div class="filter-list specialty-filter-list filter-dropdown-panel" id="specialty-filter-panel">
                    <button class="filter-pill ${selectedSpecialty === "all" ? "active" : ""}" data-specialty="all">All Specialties</button>
                    ${doctorSpecialties.map((s) => `<button class="filter-pill ${selectedSpecialty === s.name ? "active" : ""}" data-specialty="${s.name}">${s.name}</button>`).join("")}
                  </div>
                </div>
                <div class="sidebar-section filter-dropdown-group" id="type-filter-group">
                  <h4 class="filter-dropdown-trigger" id="type-filter-trigger" role="button" tabindex="0"><span class="filter-trigger-label">${selectedType === "all" ? "Consultation Type" : selectedType === "online" ? "Online Video" : "In-Person"}</span>${icon("chevron")}</h4>
                  <div class="filter-list filter-dropdown-panel" id="type-filter-panel">
                    <button class="filter-pill ${selectedType === "all" ? "active" : ""}" data-type="all">All Types</button>
                    <button class="filter-pill ${selectedType === "online" ? "active" : ""}" data-type="online">${icon("video")} Online Video</button>
                    <button class="filter-pill ${selectedType === "inperson" ? "active" : ""}" data-type="inperson">${icon("building")} In-Person</button>
                  </div>
                </div>
                <div class="sidebar-section filter-dropdown-group" id="city-filter-group">
                  <h4 class="filter-dropdown-trigger" id="city-filter-trigger" role="button" tabindex="0"><span class="filter-trigger-label">${selectedCity === "all" ? "Filter by City" : selectedCity}</span>${icon("chevron")}</h4>
                  <div class="city-filter-list filter-dropdown-panel" id="city-filter-panel">
                    <button class="city-filter-chip ${selectedCity === "all" ? "active" : ""}" data-city="all">All Cities</button>
                    ${doctorCities.map((c) => `<button class="city-filter-chip ${selectedCity === c ? "active" : ""}" data-city="${c}">${c}</button>`).join("")}
                  </div>
                </div>
              </div>

              <div class="doctor-sort-row filter-dropdown-group" id="sort-filter-group">
                <h4 class="filter-dropdown-trigger" id="sort-filter-trigger" role="button" tabindex="0"><span class="filter-trigger-label">${sortBy === "recommended" ? "Sort: Recommended" : sortBy === "rating" ? "Rating: High to Low" : "Fee: Low to High"}</span>${icon("chevron")}</h4>
                <div class="filter-list sort-filter-list filter-dropdown-panel" id="sort-filter-panel">
                  <button class="filter-pill ${sortBy === "recommended" ? "active" : ""}" data-sort="recommended">Sort: Recommended</button>
                  <button class="filter-pill ${sortBy === "rating" ? "active" : ""}" data-sort="rating">Rating: High to Low</button>
                  <button class="filter-pill ${sortBy === "fee-low" ? "active" : ""}" data-sort="fee-low">Fee: Low to High</button>
                </div>
              </div>

              <div class="vd-apply-bar">
                <div class="filter-dropdown-group vd-date-group" id="date-filter-group">
                  <h4 class="filter-dropdown-trigger" id="date-filter-trigger" role="button" tabindex="0"><span class="filter-trigger-label">${selectedDate === "today" ? "Today" : selectedDate === "tomorrow" ? "Tomorrow" : "Within 3 Days"}</span>${icon("chevron")}</h4>
                  <div class="filter-list date-filter-list filter-dropdown-panel" id="date-filter-panel">
                    <button class="filter-pill ${selectedDate === "today" ? "active" : ""}" data-datekey="today">Today (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})</button>
                    <button class="filter-pill ${selectedDate === "tomorrow" ? "active" : ""}" data-datekey="tomorrow">Tomorrow</button>
                    <button class="filter-pill ${selectedDate === "next3" ? "active" : ""}" data-datekey="next3">Within 3 Days</button>
                  </div>
                </div>
                <div class="vd-location-field">
                  <input class="vd-location-input" id="vd-location-input" type="text" inputmode="text" placeholder="Preferred Location / Pincode" value="${selectedCity !== "all" ? selectedCity : ""}" aria-label="Preferred Location / Pincode" />
                </div>
                <button type="button" class="button button-primary vd-submit-btn" id="vd-submit-btn">${icon("search")} Submit</button>
              </div>
            </div>

            <div class="doctor-content">
              <div class="doctor-grid list-doctor-grid" id="doctor-grid">
                ${renderDoctorCards()}
              </div>
            </div>
          </div>
        </section>

        <!-- Layer 04: Editorial Health Blogs -->
        <section class="section-wrap doctor-articles-section">
          <div class="section-heading">
            <div>
<span class="section-kicker">04 / MEDICAL INSIGHTS</span>
              <h2>Health Blogs <em class="editorial">for You</em></h2>
            </div>
            <button class="text-button" data-nav="article" data-args='{"id":"a1"}'>View all articles ${icon("arrow")}</button>
          </div>
          <div class="article-grid">
            ${articles
              .map(
                (a) => `
              <article class="article-card" data-article="${a.id}">
                <div class="article-icon avatar-${a.color}">${a.initials}</div>
                <div class="article-info">
                  <span class="article-category">${a.category}</span>
                  <h4>${a.title}</h4>
                  <span class="article-meta">${a.author} · ${a.date}</span>
                  <span class="article-link">Know More ${icon('arrow')}</span>
                </div>
              </article>
            `,
              )
              .join("")}
          </div>
        </section>

        <!-- Layer 05: Specialty Education Guide -->
        <section class="section-wrap edu-guide-section">
          <div class="edu-guide-card">
            <span class="section-kicker">05 / KNOWLEDGE BASE</span>
            <h2>Specialities — Expertise You Can <em class="editorial">Trust</em></h2>
            <p class="edu-intro">
              A medical specialty is a specific area of medical practice that mainly focuses on a defined set of diseases, patients, philosophy, or skills. Tatito Health+ offers advanced consultation services across 24+ medical specialties.
            </p>
            
            <div class="edu-slider" id="edu-slider">
              <button class="spec-slider-arrow spec-slider-arrow-prev" id="edu-prev" type="button" aria-label="Previous specialties">${icon("chevron", "spec-chevron-left")}</button>
              <div class="edu-slider-viewport" id="edu-viewport">
                <div class="edu-slider-track" id="edu-track">
                  ${eduCarousel.slides}
                </div>
              </div>
              <button class="spec-slider-arrow spec-slider-arrow-next" id="edu-next" type="button" aria-label="Next specialties">${icon("chevron")}</button>
            </div>
            <div class="edu-slider-controls">
              <div class="spec-slider-dots" id="edu-dots"></div>
              <span class="spec-slider-counter" id="edu-counter">1 / ${eduCarousel.total}</span>
            </div>

            <!-- Layer 09: Why Choose Health Plus -->
            <div class="edu-why-card">
              <h3>Why Choose Online Consultation with <em class="editorial">Tatito Health+?</em></h3>
              <div class="why-bullets-grid">
                <div class="why-bullet">${icon("user")} <span>Highly-qualified doctors available 24x7 for you</span></div>
                <div class="why-bullet">${icon("spark")} <span>Get online consultations within 15 minutes</span></div>
                <div class="why-bullet">${icon("shield")} <span>Affordable rates & personalized care plans</span></div>
                <div class="why-bullet">${icon("check")} <span>Instant follow-ups via chat for 7 days</span></div>
              </div>
            </div>
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "doctors")}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  const doctorState = {
    selectedSpecialty: {
      get: () => selectedSpecialty,
      set: (v) => (selectedSpecialty = v),
    },
    selectedCity: { get: () => selectedCity, set: (v) => (selectedCity = v) },
    selectedType: { get: () => selectedType, set: (v) => (selectedType = v) },
    selectedDate: { get: () => selectedDate, set: (v) => (selectedDate = v) },
    searchQuery: { get: () => searchQuery, set: (v) => (searchQuery = v) },
    sortBy: { get: () => sortBy, set: (v) => (sortBy = v) },
    update: () => {
      const grid = appRoot.querySelector("#doctor-grid");
      const count = appRoot.querySelector("#doctor-count-text");
      const list = getFilteredDoctors();
      if (grid) grid.innerHTML = renderDoctorCards();
      if (count)
        count.textContent = `Showing ${list.length} verified doctor${list.length !== 1 ? "s" : ""}`;
      bindNav(appRoot, ctx);
    },
  };
  bindDoctorEvents(appRoot, ctx, doctorState);

  ensureLive()
    .then(() => {
      // Live list may now carry fees/offers visible to the signed-in user.
      doctorState.update();
    })
    .catch(() => {});
}

function escAttr(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Deterministic, offline-safe, professional doctor placeholder. It is a
// neutral stethoscope silhouette (no real identifiable person) whose colors
// follow the doctor's avatar palette, and it never changes between renders.
const DOCTOR_PLACEHOLDER_PALETTES = {
  teal: ["#dcefe7", "#0d8066"],
  coral: ["#fbeae4", "#c2593f"],
  navy: ["#e0eaf6", "#2f5d8a"],
  gold: ["#faeed2", "#b07d2a"],
  default: ["#dcefe7", "#0d8066"],
};

function doctorPlaceholderSrc(d) {
  const palette = DOCTOR_PLACEHOLDER_PALETTES[d.color] || DOCTOR_PLACEHOLDER_PALETTES.default;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-hidden="true">` +
    `<rect width="200" height="200" rx="100" fill="${palette[0]}"/>` +
    `<g fill="${palette[1]}">` +
    `<circle cx="100" cy="76" r="33"/>` +
    `<path d="M40 200c0-40 27-60 60-60s60 20 60 60z"/>` +
    `</g>` +
    `<path d="M133 56h22v14a16 16 0 0 1-16 16h-6a16 16 0 0 1-16-16V56" fill="none" stroke="${palette[1]}" stroke-width="10" stroke-linecap="round"/>` +
    `<circle cx="117" cy="56" r="8" fill="${palette[1]}"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function doctorPic(d) {
  if (d.photo) {
    return `<img class="doctor-card-photo" src="${escAttr(d.photo)}" alt="${escAttr(d.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${avatar(d.initials, d.color, "doctor-avatar doctor-photo-fallback")}`;
  }
  return avatar(d.initials, d.color, "doctor-avatar");
}

function doctorOfferRow(d) {
  const offer = String(d.offerText || "").trim();
  if (!offer) return "";
  return `<div class="doctor-offer-row">${icon("spark")} <span>${offer}</span></div>`;
}

function doctorFeeRow(d) {
  const fee = feeText(d);
  if (fee) {
    return `<span class="consultation-fee">${fee}</span>`;
  }
  return `<span class="consultation-fee consultation-fee-masked" title="Log in to view the consultation fee">₹•••</span>`;
}

function doctorCard(d) {
  return `
    <article class="doctor-card" data-doctor="${d.id}">
      <div class="doctor-card-top">
        ${doctorPic(d)}
      </div>
      <div class="doctor-card-content">
        <div class="doc-header-row">
          <h3>${d.name}</h3>
          <span class="doc-verified-badge">${icon("verified")} Verified</span>
        </div>
        <span class="doctor-spec-chip">${d.specialty}</span>
        <p>${d.detail}</p>
        <span class="doctor-location">${icon("building")} ${d.location}</span>
        ${doctorOfferRow(d)}
        <div class="doctor-bottom">
          <div class="doctor-fee-cell">
            <span class="consultation-fee-label">Consulting Fee</span>
            ${doctorFeeRow(d)}
            <small>no hidden charges</small>
          </div>
          <div class="next-slot">
            <small>${icon("clock")} Next Slot</small>
            <strong>${d.next}</strong>
          </div>
        </div>
        <button class="button button-small button-primary full-button" data-doctor-book="${d.id}">Book Appointment ${icon("arrow")}</button>
      </div>
    </article>
  `;
}

function bindEduSlider(appRoot) {
  const track = appRoot.querySelector("#edu-track");
  const viewport = appRoot.querySelector("#edu-viewport");
  const prev = appRoot.querySelector("#edu-prev");
  const next = appRoot.querySelector("#edu-next");
  const counter = appRoot.querySelector("#edu-counter");
  const dots = appRoot.querySelector("#edu-dots");
  if (!track || !viewport || !prev || !next) return;
  const slides = track.querySelectorAll(".edu-slider-slide");
  const total = slides.length;
  if (total === 0) return;
  let index = 0;
  const renderDots = () => {
    if (!dots) return;
    dots.innerHTML = Array.from({ length: total }, (_, i) =>
      `<button class="spec-slider-dot ${i === index ? "active" : ""}" data-edu-dot="${i}" type="button" aria-label="Go to specialty group ${i + 1}"></button>`).join("");
  };
  const go = (i) => {
    index = ((i % total) + total) % total;
    track.style.transform = `translateX(-${index * 100}%)`;
    if (counter) counter.textContent = `${index + 1} / ${total}`;
    renderDots();
  };
  prev.addEventListener("click", () => go(index - 1));
  next.addEventListener("click", () => go(index + 1));
  if (dots) {
    dots.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-edu-dot]");
      if (dot) go(Number(dot.dataset.eduDot));
    });
  }
  go(0);
}

function bindDoctorEvents(appRoot, ctx, state) {
  const { navigate, showToast } = ctx;
  bindNav(appRoot, ctx);

  // Doctor Hero slider: one doctor per slide, prev/next arrows, dots + counter, 10 s auto-advance (continuous loop)
  if (doctorHeroCarouselTimer) { clearInterval(doctorHeroCarouselTimer); doctorHeroCarouselTimer = null }
  const dhcTrack = appRoot.querySelector('#dhc-track')
  const dhcViewport = appRoot.querySelector('#dhc-viewport')
  const dhcPrev = appRoot.querySelector('#dhc-prev')
  const dhcNext = appRoot.querySelector('#dhc-next')
  const dhcCounter = appRoot.querySelector('#dhc-counter')
  const dhcDots = appRoot.querySelector('#dhc-dots')
  if (dhcTrack && dhcViewport && dhcPrev && dhcNext) {
    const heroSlides = dhcTrack.querySelectorAll('.doctor-hero-slide')
    const dhcTotal = heroSlides.length
    let dhcIndex = 0
    const renderDhcDots = () => {
      if (!dhcDots) return
      dhcDots.innerHTML = Array.from({ length: dhcTotal }, (_, i) =>
        `<button class="spec-slider-dot ${i === dhcIndex ? 'active' : ''}" data-dhc-dot="${i}" type="button" aria-label="Go to doctor ${i + 1}"></button>`).join('')
    }
    const goToDoctor = (i) => {
      dhcIndex = ((i % dhcTotal) + dhcTotal) % dhcTotal
      dhcTrack.style.transform = `translateX(-${dhcIndex * 100}%)`
      if (dhcCounter) dhcCounter.textContent = `${dhcIndex + 1} / ${dhcTotal}`
      renderDhcDots()
    }
    const startDhcAutoAdvance = () => {
      if (doctorHeroCarouselTimer) clearInterval(doctorHeroCarouselTimer)
      doctorHeroCarouselTimer = setInterval(() => {
        if (!dhcTrack.isConnected) { clearInterval(doctorHeroCarouselTimer); doctorHeroCarouselTimer = null; return }
        goToDoctor(dhcIndex + 1)
      }, 10000)
    }
    dhcPrev.addEventListener('click', () => { goToDoctor(dhcIndex - 1); startDhcAutoAdvance() })
    dhcNext.addEventListener('click', () => { goToDoctor(dhcIndex + 1); startDhcAutoAdvance() })
    if (dhcDots) dhcDots.addEventListener('click', e => {
      const dot = e.target.closest('[data-dhc-dot]')
      if (dot) { goToDoctor(Number(dot.dataset.dhcDot)); startDhcAutoAdvance() }
    })
    renderDhcDots()
    startDhcAutoAdvance()
  }

  bindEduSlider(appRoot);

  // Doctor Hero: Consult Now navigates to the currently visible doctor's detail page
  appRoot.addEventListener('click', (e) => {
    const consult = e.target.closest('[data-dhc-consult]')
    if (consult) { e.preventDefault(); navigate('doctor', { id: consult.dataset.dhcConsult }) }
  })

  // Specialty card selection
  appRoot.querySelectorAll("[data-spec-name]").forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.dataset.specName;
      state.selectedSpecialty.set(
        state.selectedSpecialty.get() === name ? "all" : name,
      );
      appRoot
        .querySelectorAll("[data-spec-name]")
        .forEach((c) => c.classList.remove("active"));
      if (state.selectedSpecialty.get() === name) card.classList.add("active");
      syncFilterControls();
      state.update();
      const listings = appRoot.querySelector(".doctor-list-wrap");
      if (listings)
        listings.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Verified Doctors: Date filter pills
  appRoot.querySelectorAll("[data-datekey]").forEach((pill) => {
    pill.addEventListener("click", () => {
      state.selectedDate.set(pill.dataset.datekey);
      syncFilterControls();
      const group = pill.closest(".filter-dropdown-group");
      if (group) group.classList.remove("open", "drop-up");
    });
  });

  // Verified Doctors: apply Specialty + Date + Location/Pincode via Submit
  const vdSubmit = appRoot.querySelector("#vd-submit-btn");
  if (vdSubmit) {
    vdSubmit.addEventListener("click", () => {
      const loc = (appRoot.querySelector("#vd-location-input")?.value || "").trim();
      if (loc) state.selectedCity.set(loc);
      state.selectedDate.get(); // ensure the chosen date filter state is applied
      syncFilterControls();
      state.update();
      showToast("Filters applied! Showing matching doctors.");
    });
  }

  // Verified Doctors: reset all filters from the empty state
  appRoot.addEventListener("click", (e) => {
    const resetBtn = e.target.closest("#reset-doc-filters");
    if (!resetBtn) return;
    state.selectedSpecialty.set("all");
    state.selectedCity.set("all");
    state.selectedType.set("all");
    state.selectedDate.set("today");
    const locInput = appRoot.querySelector("#vd-location-input");
    if (locInput) locInput.value = "";
    syncFilterControls();
    state.update();
    showToast("Filters reset.");
  });

  const syncFilterControls = () => {
    const labels = {
      "specialty-filter-trigger":
        state.selectedSpecialty.get() === "all"
          ? "Specialty Filter"
          : state.selectedSpecialty.get(),
      "type-filter-trigger":
        state.selectedType.get() === "all"
          ? "Consultation Type"
          : state.selectedType.get() === "online"
            ? "Online Video"
            : "In-Person",
      "city-filter-trigger":
        state.selectedCity.get() === "all"
          ? "Filter by City"
          : state.selectedCity.get(),
      "sort-filter-trigger":
        state.sortBy.get() === "recommended"
          ? "Sort: Recommended"
          : state.sortBy.get() === "rating"
            ? "Rating: High to Low"
            : "Fee: Low to High",
      "date-filter-trigger":
        state.selectedDate.get() === "today"
          ? "Today"
          : state.selectedDate.get() === "tomorrow"
            ? "Tomorrow"
            : "Within 3 Days",
    };
    Object.entries(labels).forEach(([id, label]) => {
      const target = appRoot.querySelector(`#${id} .filter-trigger-label`);
      if (target) target.textContent = label;
    });
    appRoot
      .querySelectorAll("[data-specialty]")
      .forEach((pill) =>
        pill.classList.toggle(
          "active",
          pill.dataset.specialty === state.selectedSpecialty.get(),
        ),
      );
    appRoot
      .querySelectorAll("[data-type]")
      .forEach((pill) =>
        pill.classList.toggle(
          "active",
          pill.dataset.type === state.selectedType.get(),
        ),
      );
    appRoot
      .querySelectorAll("[data-city]")
      .forEach((pill) =>
        pill.classList.toggle(
          "active",
          pill.dataset.city === state.selectedCity.get(),
        ),
      );
    appRoot
      .querySelectorAll("[data-sort]")
      .forEach((pill) =>
        pill.classList.toggle(
          "active",
          pill.dataset.sort === state.sortBy.get(),
        ),
      );
    appRoot
      .querySelectorAll("[data-datekey]")
      .forEach((pill) =>
        pill.classList.toggle(
          "active",
          pill.dataset.datekey === state.selectedDate.get(),
        ),
      );
  };

  // Specialty filter dropdown (toolbar)
  appRoot.querySelectorAll("[data-specialty]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const value = pill.dataset.specialty;
      state.selectedSpecialty.set(value);
      appRoot
        .querySelectorAll("[data-spec-name]")
        .forEach((c) =>
          c.classList.toggle("active", c.dataset.specName === value),
        );
      syncFilterControls();
      state.update();
      const group = pill.closest(".filter-dropdown-group");
      if (group) group.classList.remove("open");
    });
  });

  // Sort filter dropdown (toolbar)
  appRoot.querySelectorAll("[data-sort]").forEach((pill) => {
    pill.addEventListener("click", () => {
      state.sortBy.set(pill.dataset.sort);
      syncFilterControls();
      state.update();
      const group = pill.closest(".filter-dropdown-group");
      if (group) group.classList.remove("open", "drop-up");
    });
  });

  // City sidebar chips
  appRoot.querySelectorAll("[data-city]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const city = chip.dataset.city;
      state.selectedCity.set(city);
      appRoot
        .querySelectorAll("[data-city]")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const locInput = appRoot.querySelector("#vd-location-input");
      if (locInput) locInput.value = city !== "all" ? city : "";
      state.update();
      syncFilterControls();
      const group = chip.closest(".filter-dropdown-group");
      if (group) group.classList.remove("open");
    });
  });
  // Consultation type filter pills
  appRoot.querySelectorAll("[data-type]").forEach((pill) => {
    pill.addEventListener("click", () => {
      state.selectedType.set(pill.dataset.type);
      appRoot
        .querySelectorAll("[data-type]")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.update();
      syncFilterControls();
      const group = pill.closest(".filter-dropdown-group");
      if (group) group.classList.remove("open");
    });
  });

  // Consultation Type / Filter by City — dropdown-style popover panels
  appRoot.querySelectorAll(".filter-dropdown-trigger").forEach((trigger) => {
    const positionGroup = () => {
      const group = trigger.closest(".filter-dropdown-group");
      const panel = group && group.querySelector(".filter-dropdown-panel");
      if (!group || !panel) return;
      group.classList.remove("drop-up");
      const triggerRect = trigger.getBoundingClientRect();
      const panelHeight = panel.scrollHeight;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      if (spaceBelow < panelHeight + 16 && spaceAbove > spaceBelow)
        group.classList.add("drop-up");
    };
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const group = trigger.closest(".filter-dropdown-group");
      const wasOpen = group.classList.contains("open");
      appRoot
        .querySelectorAll(".filter-dropdown-group.open")
        .forEach((g) => g.classList.remove("open", "drop-up"));
      if (!wasOpen) {
        group.classList.add("open");
        requestAnimationFrame(positionGroup);
      }
    });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger.click();
      }
    });
    trigger.addEventListener("blur", () => {
      if (trigger.closest(".filter-dropdown-group.open")) positionGroup();
    });
  });
  window.addEventListener("resize", () => {
    appRoot
      .querySelectorAll(".filter-dropdown-group.open .filter-dropdown-trigger")
      .forEach((trigger) => {
        const group = trigger.closest(".filter-dropdown-group");
        const panel = group && group.querySelector(".filter-dropdown-panel");
        if (!group || !panel) return;
        group.classList.remove("drop-up");
        const rect = trigger.getBoundingClientRect();
        if (
          window.innerHeight - rect.bottom < panel.scrollHeight + 16 &&
          rect.top > window.innerHeight - rect.bottom
        )
          group.classList.add("drop-up");
      });
  });
  appRoot.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown-group")) {
      appRoot
        .querySelectorAll(".filter-dropdown-group.open")
        .forEach((g) => g.classList.remove("open"));
    }
  });

  // AI Prompt button & tags
  const aiBtn = appRoot.querySelector("#ai-health-btn");
  const aiInput = appRoot.querySelector("#ai-health-input");
  if (aiBtn && aiInput) {
    aiBtn.addEventListener("click", () => {
      const q = aiInput.value.trim();
      if (q) showToast(`Tatito AI: Analyzing symptoms for "${q}"...`);
    });
  }
  appRoot.querySelectorAll("[data-ai-prompt]").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (aiInput) aiInput.value = chip.dataset.aiPrompt;
      showToast(
        `Tatito AI: Preparing guidance for ${chip.dataset.aiPrompt}...`,
      );
    });
  });

  // Doctor card navigation
  appRoot.addEventListener("click", (e) => {
    const feeLink = e.target.closest("[data-auth-fee]");
    if (feeLink) {
      e.stopPropagation();
      openAuthModal("login", ctx);
      return;
    }
    const docCard = e.target.closest("[data-doctor]");
    const docBook = e.target.closest("[data-doctor-book]");
    if (docBook) {
      e.stopPropagation();
      navigate("doctor", { id: docBook.dataset.doctorBook });
    } else if (docCard) {
      navigate("doctor", { id: docCard.dataset.doctor });
    }
  });
}

// === Doctor Detail Page ===
const DOCTOR_PROFILE_LABELS = {
  profile: "DOCTOR PROFILE",
  about: "ABOUT & CLINICAL SPECIALIZATIONS",
  reviews: "PATIENT REVIEWS",
};
function reviewInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || "P")[0] + (parts[parts.length - 1] || "P")[0]).toUpperCase();
}
function reviewStarsHTML(rating, extra = "") {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += icon("star", `review-star${i > rating ? " review-star-off" : ""}`);
  }
  return `<span class="review-stars ${extra}">${out}</span>`;
}
function reviewDateLabel(r) {
  const t = r.createdAt ? new Date(r.createdAt) : new Date();
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeReview(r) {
  return {
    name: r.patientName || r.name || "Anonymous Patient",
    rating: Number(r.rating || 0),
    date: r.patientName ? reviewDateLabel(r) : r.date || "",
    text: r.comment || r.text || "",
  };
}

function doctorReviewCard(r, colors, i) {
  return `
    <div class="doctor-review-card">
      <div class="drv-head">
        ${avatar(reviewInitials(r.name), colors[i % 4], "review-avatar")}
        <div class="drv-meta">
          <strong>${r.name}</strong>
          ${reviewStarsHTML(r.rating)}
          <small>${r.date}</small>
        </div>
      </div>
      <p>${r.text}</p>
    </div>`
}

function writeReviewHTML(ctx) {
  const user = getAuthUser();
  if (!isAuthenticated()) {
    return `
      <div class="write-review-gate">
        <div>${icon("lock")} Log in to share your experience with this doctor.</div>
        <button type="button" class="button button-primary" data-arv-login>Login to write a review ${icon("arrow")}</button>
      </div>`;
  }
  if (!user || user.role === "doctor") {
    return `<div class="write-review-gate"><div>${icon("shield")} Only registered patients can submit reviews.</div></div>`;
  }
  return `
    <form class="review-form" id="review-form" novalidate>
      <div class="review-form-heading">
        <div>
          <strong>Write a review</strong>
          <small>Your honest feedback helps other patients.</small>
        </div>
      </div>
      <div class="review-star-picker" id="arv-stars">
        ${[1, 2, 3, 4, 5].map((s) => `<button type="button" class="review-star-btn" data-arv-star="${s}" aria-label="${s} star">${icon("star")}</button>`).join("")}
      </div>
      <textarea class="auth-text-input review-textarea" name="comment" rows="3" maxlength="1200" placeholder="How was your consultation? (min 3 characters)" required></textarea>
      <button type="submit" class="button button-primary review-submit">Submit review ${icon("check")}</button>
    </form>`;
}

function reviewsSectionMarkup(d, summary, ctx) {
  const colors = ["teal", "blue", "purple", "pink"];
  const reviews = (summary.reviews || []).map(normalizeReview).slice(0, 4);
  const overall = summary.overall != null ? Number(summary.overall).toFixed(1) : "0.0";
  const count = summary.count != null ? summary.count : 0;
  const note = summary.isDemo
    ? `Based on ${count} sample reviews`
    : `Based on ${count} verified patient reviews`;
  return `
    <div class="doctor-review-overall">
      <strong>${overall} <em>/ 5</em></strong>
      ${reviewStarsHTML(Math.round(overall))}
      <span class="doctor-review-overall-note">${note}</span>
    </div>
    <div class="doctor-reviews-list">
      ${reviews.map((r, i) => doctorReviewCard(r, colors, i)).join("")}
    </div>
    <div class="write-review-wrap">${writeReviewHTML(ctx)}</div>
  `;
}

function staticReviewsSummary(d) {
  const reviews = (doctorReviews[d.id] || []).slice(0, 4);
  const overall = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  return {
    reviews,
    overall,
    count: reviews.length,
    isDemo: true,
  };
}

function bindWriteReview(section, doctorId, ctx, onSaved) {
  const loginBtn = section.querySelector("[data-arv-login]");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => openAuthModal("login", ctx));
  }
  const starRow = section.querySelector("#arv-stars");
  let chosen = 0;
  if (starRow) {
    const paint = () =>
      starRow.querySelectorAll("[data-arv-star]").forEach((s) =>
        s.classList.toggle("selected", Number(s.dataset.arvStar) <= chosen),
      );
    starRow.querySelectorAll("[data-arv-star]").forEach((s) =>
      s.addEventListener("click", () => {
        chosen = Number(s.dataset.arvStar);
        paint();
      }),
    );
  }
  const form = section.querySelector("#review-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) {
      openAuthModal("login", ctx);
      return;
    }
    const user = getAuthUser();
    if (!user || user.role === "doctor") {
      ctx.showToast("Only patients can submit reviews.");
      return;
    }
    if (!chosen) {
      ctx.showToast("Please choose a star rating.");
      return;
    }
    const text = form.querySelector("textarea").value.trim();
    if (text.length < 3) {
      ctx.showToast("Review text must be at least 3 characters.");
      return;
    }
    const btn = form.querySelector(".button[type='submit']");
    btn.disabled = true;
    try {
      const res = await createReview(doctorId, { rating: chosen, comment: text }, getAuthToken());
      ctx.showToast("Thank you — your review was submitted for moderation.");
      if (onSaved && res && res.summary) onSaved(res.summary);
    } catch (err) {
      btn.disabled = false;
      ctx.showToast(err.message || "Could not submit review.");
    }
  });
}

async function initDoctorReviews(appRoot, d, ctx) {
  const section = appRoot.querySelector("#doctor-reviews-section");
  if (!section) return;
  let live = null;
  try {
    live = await getReviews(d.id);
  } catch {
    live = null;
  }
  if (!section.isConnected) return;
  const summary = live && Array.isArray(live.reviews) ? live : staticReviewsSummary(d);
  section.querySelector(".doctor-reviews-body").innerHTML = reviewsSectionMarkup(d, summary, ctx);
  bindWriteReview(section, d.id, ctx, (updated) => {
    const body = section.querySelector(".doctor-reviews-body");
    if (body) body.innerHTML = reviewsSectionMarkup(d, updated, ctx);
    bindWriteReview(section, d.id, ctx);
  });
}

function renderDoctorReviews(d) {
  return `
    <section class="doctor-reviews-section" id="doctor-reviews-section">
      <span class="section-kicker doctor-profile-kicker">${DOCTOR_PROFILE_LABELS.reviews}</span>
      <div class="doctor-reviews-body"></div>
    </section>
  `;
}

export function renderDoctorDetail(appRoot, ctx) {
  const { navigate, currentParams } = ctx;
  const d = cachedFindDoctor(currentParams.id);
  if (!d) {
    navigate("doctors");
    return;
  }
  const booking = createDoctorBooking(d, ctx);

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "doctors")}
      <main id="top" class="section-wrap detail-page doctor-detail-wrap">
        
        <div class="doctor-detail-layout">
          <div class="doctor-detail-left">
            <div class="doctor-detail-card hero-gradient">
              <span class="section-kicker doctor-profile-kicker doctor-card-kicker">${icon("user")} ${DOCTOR_PROFILE_LABELS.profile}</span>
              <div class="doctor-card-grid">
                <div class="doctor-card-info">
                  <h1>${d.name}</h1>
                  <span class="doctor-specialty-large">${d.specialty} Specialist</span>
                  <p class="doc-detail-bio">${d.detail}</p>
                  <div class="doctor-location-large">${icon("building")} ${d.location}</div>
                </div>
                <div class="doctor-card-media">
                  <div class="doc-detail-avatar-wrap">
                    ${d.photo
                      ? `<img class="doctor-profile-photo" src="${escAttr(d.photo)}" alt="${escAttr(d.name)}" loading="lazy" onerror="this.onerror=null;this.hidden=true;this.nextElementSibling.hidden=false"><span class="doctor-photo-fallback" hidden>${icon("doctorCare")}</span>`
                      : `<img class="doctor-profile-photo" src="${doctorPlaceholderSrc(d)}" alt="${escAttr(d.name)}">`}
                    <span class="doc-verified-badge-xl">${icon("verified")} Verified Specialist</span>
                  </div>
                </div>
              </div>
            </div>

            <section class="doctor-about-section">
              <span class="section-kicker doctor-profile-kicker">${DOCTOR_PROFILE_LABELS.about}</span>
              <h2>About <em class="editorial">${d.name}</em></h2>
              <p>${d.name} is a highly experienced ${d.specialty.toLowerCase()} specialist with over a decade of clinical expertise. Known for a human-centered, evidence-based approach, ${d.name} provides comprehensive diagnostic evaluations, personalized treatment plans, and continuous care.</p>
              
              <h3>Clinical Specializations & Services</h3>
              <div class="spec-tags">
                <span>${icon("check")} General Consultation</span>
                <span>${icon("check")} Chronic Condition Management</span>
                <span>${icon("check")} Preventive Health Screening</span>
                <span>${icon("check")} Lifestyle & Nutrition Counseling</span>
                <span>${icon("check")} Telehealth Consultation</span>
              </div>
            </section>
          </div>
          <div class="doctor-detail-right">
            ${booking.renderCard()}
          </div>
        </div>

        ${renderDoctorReviews(d)}
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "doctors")}
    </div>
    ${booking.renderModals()}
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);
  booking.bind(appRoot);
  booking.loadSlots();
  initDoctorReviews(appRoot, d, ctx);
  ensureLive()
    .then(() => booking.refreshFees(appRoot))
    .catch(() => {});
}

// === Direct Appointment Booking Module (Doctor Detail) ===
const BOOKING_RAIL_DAYS = 3;
const BOOKING_CAL_MAX_MONTHS = 3;
const BOOKING_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BOOKING_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BOOKING_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bookingPad(n) { return String(n).padStart(2, "0"); }
function bookingKey(date) { return `${date.getFullYear()}-${bookingPad(date.getMonth() + 1)}-${bookingPad(date.getDate())}`; }
function bookingFromKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d, 12, 0, 0, 0); }
function bookingAddDays(date, n) { const x = new Date(date); x.setDate(x.getDate() + n); return x; }
function bookingTodayKey() { return bookingKey(new Date()); }
function bookingMonthD(date) { return `${BOOKING_SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`; }
function bookingLongDate(key) {
  if (key === bookingTodayKey()) return `Today, ${bookingMonthD(bookingFromKey(key))}`;
  if (key === bookingKey(bookingAddDays(bookingFromKey(bookingTodayKey()), 1))) return `Tomorrow, ${bookingMonthD(bookingFromKey(key))}`;
  return `${BOOKING_WEEKDAYS[bookingFromKey(key).getDay()]}, ${bookingMonthD(bookingFromKey(key))}`;
}
function bookingDayLabel(key) {
  if (key === bookingTodayKey()) return "Today";
  if (key === bookingKey(bookingAddDays(bookingFromKey(bookingTodayKey()), 1))) return "Tomorrow";
  if (key === bookingKey(bookingAddDays(bookingFromKey(bookingTodayKey()), 2))) return "Next Day";
  return BOOKING_WEEKDAYS[bookingFromKey(key).getDay()];
}

function createDoctorBooking(d, ctx) {
  const { showToast } = ctx;

  let type = "Online Video";
  let dateKey = bookingTodayKey();
  let timeSlot = null;
  let availableSlots = [];
  let slotsLoading = false;
  let appointmentResult = null;
  let bookingRoot = null;
  let calMonth = new Date(bookingFromKey(dateKey).getFullYear(), bookingFromKey(dateKey).getMonth(), 1);
  let calChoice = dateKey;

  function displayTime(value) {
    const [hourText, minute] = String(value || "").split(":");
    const hour = Number(hourText);
    if (!Number.isFinite(hour) || minute === undefined) return "—";
    return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
  }

  async function loadSlots() {
    slotsLoading = true;
    availableSlots = [];
    timeSlot = null;
    if (bookingRoot) refresh(bookingRoot);
    try {
      const response = await getDoctorAvailability(d.id, dateKey);
      availableSlots = Array.isArray(response?.results) ? response.results : [];
    } catch (error) {
      showToast(error.message || "Unable to load appointment availability.");
    } finally {
      slotsLoading = false;
      if (bookingRoot) refresh(bookingRoot);
    }
  }

  function railDates() {
    const today = bookingFromKey(bookingTodayKey());
    if (dateKey !== bookingTodayKey() && bookingFromKey(dateKey) > bookingAddDays(today, BOOKING_RAIL_DAYS - 1)) {
      return Array.from({ length: BOOKING_RAIL_DAYS }, (_, i) => bookingAddDays(bookingFromKey(dateKey), i));
    }
    return Array.from({ length: BOOKING_RAIL_DAYS }, (_, i) => bookingAddDays(today, i));
  }

  function railHTML() {
    return railDates()
      .map((day) => {
        const key = bookingKey(day);
        const sel = key === dateKey ? " selected" : "";
        return `<button type="button" class="date-pill${sel}" data-date-key="${key}"><strong>${bookingDayLabel(key)}</strong></button>`;
      })
      .join("");
  }

  function timeGridHTML() {
    if (slotsLoading) return '<p class="booking-hint" role="status">Loading available times…</p>';
    if (!availableSlots.length) return '<p class="booking-hint" role="status">No appointment times are available for this date.</p>';
    return availableSlots.map((slot) => {
      const selected = slot.id === timeSlot ? " selected" : "";
      return `<button type="button" class="time-slot${selected}" data-time-key="${escAttr(slot.id)}">${displayTime(slot.start_time)}</button>`;
    }).join("");
  }

  function renderCard() {
    return `
      <div class="booking-section">
        <h2>Book an <em class="editorial">Appointment</em></h2>

        <div class="booking-type">
          <button type="button" class="booking-type-btn ${type === "Online Video" ? "selected" : ""}" data-booking-type="Online Video">${icon("video")} Online Video</button>
          <button type="button" class="booking-type-btn ${type === "In Person Clinic" ? "selected" : ""}" data-booking-type="In Person Clinic">${icon("building")} In Person Clinic</button>
        </div>

<div class="booking-label">Date</div>
        <div class="date-rail" id="booking-date-rail">
          ${railHTML()}
          <button type="button" class="date-more" data-open-calendar>${icon("calendar")}<span>More</span></button>
        </div>

        <div class="booking-label">Choose Time</div>
        <div class="time-slots-grid" id="booking-time-grid">${timeGridHTML()}</div>

        <div class="booking-summary">
          <div><span>Consultation Fee</span><strong data-fee-view>${feeText(d) ?? "₹•••"}</strong></div>
          <div><span>Follow-up Chat (7 Days)</span><strong class="text-success">FREE</strong></div>
          <div class="summary-total"><span>Total Fee</span><strong data-fee-view>${feeText(d) ?? "—"}</strong></div>
        </div>

        <button type="button" class="button button-primary full-button" id="book-appointment-confirm"${timeSlot ? "" : " disabled"}>Confirm Appointment ${icon("arrow")}</button>
      </div>
    `;
  }

  function renderCalendar() {
    const today = bookingFromKey(bookingTodayKey());
    const maxDate = bookingAddDays(today, BOOKING_CAL_MAX_MONTHS * 31);
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="cal-cell cal-empty"></span>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(first.getFullYear(), first.getMonth(), day, 12, 0, 0, 0);
      const key = bookingKey(date);
      const past = date < today;
      const futureCap = date > maxDate;
      const sel = key === dateKey ? " selected" : "";
      const chosen = key === calChoice && key !== dateKey ? " chosen" : "";
      const todayCls = key === bookingTodayKey() ? " today" : "";
      const dis = past || futureCap ? " cal-disabled" : "";
      cells += `<button type="button" class="cal-cell${sel}${chosen}${todayCls}${dis}" data-calendar-cell="${key}"${dis ? " disabled" : ""}><span>${day}</span></button>`;
    }
    const curIdx = today.getFullYear() * 12 + today.getMonth();
    const calIdx = calMonth.getFullYear() * 12 + calMonth.getMonth();
    const prevDis = calIdx <= curIdx;
    const nextDis = calIdx >= curIdx + BOOKING_CAL_MAX_MONTHS;
    return `
      <div class="calendar-head">
        <button type="button" class="cal-nav" data-calendar-prev aria-label="Previous month"${prevDis ? " disabled" : ""}>${icon("chevron")}</button>
        <strong>${BOOKING_MONTHS[calMonth.getMonth()]} ${calMonth.getFullYear()}</strong>
        <button type="button" class="cal-nav cal-nav-next" data-calendar-next aria-label="Next month"${nextDis ? " disabled" : ""}>${icon("chevron")}</button>
      </div>
      <div class="calendar-weekdays">
        ${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => `<span>${w}</span>`).join("")}
      </div>
      <div class="calendar-grid" id="calendar-grid">${cells}</div>
      <div class="calendar-actions">
        <button type="button" class="button button-quiet" data-calendar-cancel>Cancel</button>
        <button type="button" class="button button-primary" id="calendar-commit">${calChoice === dateKey ? "Select Date" : `Select ${bookingMonthD(bookingFromKey(calChoice))}`}</button>
      </div>
    `;
  }

  function renderModals() {
    return `
      <div class="modal-overlay booking-modal-overlay" id="booking-calendar-modal" hidden>
        <div class="modal-content calendar-modal-content">
          <button class="modal-close" id="close-calendar-modal" aria-label="Close calendar">×</button>
          <div class="calendar-modal-head">
            <span class="section-kicker">${icon("calendar")} CHOOSE AVAILABLE DATE</span>
            <h3>Select <em class="editorial">Appointment Date</em></h3>
            <p>Pick any upcoming date — past dates cannot be selected.</p>
          </div>
          <div id="calendar-root">${renderCalendar()}</div>
        </div>
      </div>

      <div class="modal-overlay booking-modal-overlay" id="booking-confirm-modal" hidden>
        <div class="modal-content booking-confirm-content">
          <button class="modal-close" id="close-booking-confirm" aria-label="Close confirmation">×</button>
          <div class="booking-confirm-check">${icon("check")}</div>
          <h2>Appointment <em class="editorial">Confirmed</em></h2>
          <p class="booking-confirm-sub">Your appointment has been scheduled.</p>
          <div class="booking-confirm-summary">
            <div><span class="bcs-icon">${icon("user")}</span><span class="bcs-label">Doctor</span><strong>${d.name}</strong></div>
            <div><span class="bcs-icon">${icon("video")}</span><span class="bcs-label">Type</span><strong id="confirm-type">${type}</strong></div>
            <div><span class="bcs-icon">${icon("calendar")}</span><span class="bcs-label">Date</span><strong id="confirm-date">${bookingLongDate(dateKey)}</strong></div>
            <div><span class="bcs-icon">${icon("clock")}</span><span class="bcs-label">Time</span><strong id="confirm-time">${displayTime(availableSlots.find((slot) => slot.id === timeSlot)?.start_time)}</strong></div>
            <div class="confirm-total"><span>Total Fee</span><strong data-fee-view>${feeText(d) ?? "—"}</strong></div>
          </div>
          <div class="booking-confirm-note">${icon("shield")} <span id="booking-payment-note">Your appointment request will be saved securely.</span></div>
          <div class="booking-confirm-actions">
            <button type="button" class="button button-primary full-button" id="booking-done-btn">Done ${icon("check")}</button>
            <button type="button" class="button button-quiet full-button" data-nav="dashboard">Go to My Appointments</button>
          </div>
        </div>
      </div>
    `;
  }

  function refresh(appRoot) {
    const rail = appRoot.querySelector("#booking-date-rail");
    if (rail) rail.innerHTML = `${railHTML()}<button type="button" class="date-more" data-open-calendar>${icon("calendar")}<span>More</span></button>`;
    const grid = appRoot.querySelector("#booking-time-grid");
    if (grid) grid.innerHTML = timeGridHTML();
    const confirmBtn = appRoot.querySelector("#book-appointment-confirm");
    if (confirmBtn) confirmBtn.disabled = !timeSlot || slotsLoading || Boolean(appointmentResult);
  }

  function refreshFees(appRoot) {
    const fresh = d ? cachedFindDoctor(d.id) || d : d;
    const fee = feeText(fresh);
    if (!fee) return;
    appRoot.querySelectorAll("[data-fee-view]").forEach((el) => {
      el.textContent = fee;
    });
  }

  function bind(appRoot) {
    bookingRoot = appRoot;
    const calendarModal = appRoot.querySelector("#booking-calendar-modal");
    const confirmModal = appRoot.querySelector("#booking-confirm-modal");
    const calendarRoot = appRoot.querySelector("#calendar-root");

    appRoot.addEventListener("click", async (e) => {
      const typeBtn = e.target.closest("[data-booking-type]");
      if (typeBtn) {
        type = typeBtn.dataset.bookingType;
        appRoot.querySelectorAll(".booking-type-btn").forEach((b) => b.classList.toggle("selected", b.dataset.bookingType === type));
        return;
      }

      const dateBtn = e.target.closest("[data-date-key]");
      if (dateBtn) {
        dateKey = dateBtn.dataset.dateKey;
        refresh(appRoot);
        loadSlots();
        return;
      }

      const timeBtn = e.target.closest("[data-time-key]");
      if (timeBtn && !timeBtn.disabled) {
        timeSlot = timeBtn.dataset.timeKey;
        appRoot.querySelectorAll(".time-slot").forEach((b) => b.classList.toggle("selected", b.dataset.timeKey === timeSlot));
        const confirmBtn = appRoot.querySelector("#book-appointment-confirm");
        if (confirmBtn && !appointmentResult) confirmBtn.disabled = false;
        return;
      }

      if (e.target.closest("#calendar-commit")) {
        if (calChoice) {
          dateKey = calChoice;
          refresh(appRoot);
          loadSlots();
        }
        calendarModal.hidden = true;
        return;
      }
      if (e.target.closest("[data-calendar-cancel]") || e.target.closest("#close-calendar-modal")) {
        calendarModal.hidden = true;
        return;
      }
      if (calendarModal && !calendarModal.hidden && e.target === calendarModal) {
        calendarModal.hidden = true;
        return;
      }

      if (e.target.closest("[data-open-calendar]")) {
        calMonth = new Date(bookingFromKey(dateKey).getFullYear(), bookingFromKey(dateKey).getMonth(), 1);
        calChoice = dateKey;
        if (calendarRoot) calendarRoot.innerHTML = renderCalendar();
        calendarModal.hidden = false;
        return;
      }
      if (e.target.closest("[data-calendar-prev]")) {
        calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
        if (calendarRoot) calendarRoot.innerHTML = renderCalendar();
        return;
      }
      if (e.target.closest("[data-calendar-next]")) {
        calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
        if (calendarRoot) calendarRoot.innerHTML = renderCalendar();
        return;
      }
      const cell = e.target.closest("[data-calendar-cell]");
      if (cell && !cell.disabled) {
        calChoice = cell.dataset.calendarCell;
        if (calendarRoot) calendarRoot.innerHTML = renderCalendar();
        return;
      }

      const confirmBtn = e.target.closest("#book-appointment-confirm");
      if (confirmBtn && timeSlot && !appointmentResult) {
        if (!isAuthenticated()) {
          openAuthModal("login", ctx);
          return;
        }
        confirmBtn.disabled = true;
        try {
          const result = await createDoctorAppointment(
            d.id,
            {
              slot_id: timeSlot,
              consultation_type: type === "Online Video" ? "Video" : "In-person",
            },
            getAuthToken(),
          );
          appointmentResult = result;
          confirmModal.querySelector("h2").innerHTML = 'Appointment <em class="editorial">Booked</em>';
          confirmModal.querySelector(".booking-confirm-sub").textContent =
            "Your appointment has been saved and is awaiting confirmation.";
          confirmModal.querySelector("#booking-payment-note").textContent =
            `Payment of ₹${Number(result.payment?.amount || 0).toLocaleString("en-IN")} is pending. Online payment is not configured yet.`;
          const doneButton = confirmModal.querySelector("#booking-done-btn");
          if (doneButton) doneButton.textContent = "Done";
          availableSlots = availableSlots.filter((slot) => slot.id !== timeSlot);
          refresh(appRoot);
        } catch (error) {
          showToast(error.message || "Unable to book this appointment.");
          confirmBtn.disabled = false;
          return;
        }
        confirmModal.querySelector("#confirm-type").textContent = type;
        confirmModal.querySelector("#confirm-date").textContent = bookingLongDate(dateKey);
        confirmModal.querySelector("#confirm-time").textContent =
          displayTime(appointmentResult.appointment.start_time);
        confirmModal.hidden = false;
        return;
      }
      const doneBtn = e.target.closest("#booking-done-btn");
      if (doneBtn) {
        confirmModal.hidden = true;
        showToast("Appointment booked. Payment is pending.");
        return;
      }
      if (e.target.closest("#close-booking-confirm")) {
        confirmModal.hidden = true;
        return;
      }
      if (confirmModal && !confirmModal.hidden && e.target === confirmModal) {
        confirmModal.hidden = true;
        return;
      }
    });
  }

  return { renderCard, renderModals, bind, refreshFees, loadSlots };
}

// === Lab Tests Page ===
export function renderLabTests(appRoot, ctx) {
  const { navigate, addToCart, showToast } = ctx;
  let selectedCondition = "all";
  let selectedOrgan = "all";
  let searchQuery = "";

  const popularSearches = [
    "Full Body Checkup",
    "HbA1c Diabetes",
    "Thyroid Profile (T3 T4 TSH)",
    "Vitamin D & B12",
    "Lipid Profile",
    "Liver Function Test (LFT)",
    "Complete Blood Count (CBC)",
  ];

  const labPartners = [
    { name: "Apollo Diagnostics", badge: "NABL Accredited" },
    { name: "Thyrocare Labs", badge: "CAP Certified" },
    { name: "Metropolis Healthcare", badge: "ISO 15189" },
    { name: "Dr. Lal PathLabs", badge: "NABL Certified" },
    { name: "Suburban Diagnostics", badge: "100% Quality Assurance" },
  ];

  function getFilteredPackages() {
    let list = labPackages;
    if (selectedCondition !== "all") {
      const q = selectedCondition.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.testsIncluded.toLowerCase().includes(q),
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.testsIncluded.toLowerCase().includes(q),
      );
    }
    return list;
  }

  function getFilteredSingleTests() {
    let list = labTests;
    if (selectedCondition !== "all") {
      const q = selectedCondition.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
      );
    }
    return list;
  }

  function renderHealthChecksGrid() {
    return doctorHealthChecks
      .map(
        (c) => `
      <button class="health-check-chip ${selectedCondition === c.name ? "active" : ""}" data-condition="${c.name}">
        <span class="chip-icon avatar-${c.color}">${icon(c.icon)}</span>
        <span class="chip-label">${c.name}</span>
        <span class="chip-tag">${c.tag}</span>
      </button>
    `,
      )
      .join("");
  }

  function renderOrganGrid() {
    return vitalOrgans
      .map(
        (o) => `
      <button class="organ-chip ${selectedOrgan === o.name ? "active" : ""}" data-organ="${o.name}">
        <span class="organ-icon avatar-${o.color}">${icon(o.icon)}</span>
        <span class="organ-label">${o.name}</span>
      </button>
    `,
      )
      .join("");
  }

  function renderPackagesList() {
    const pkgs = getFilteredPackages();
    if (pkgs.length === 0)
      return `<div class="empty-state"><p>No health packages found for selected filters.</p></div>`;
    return pkgs
      .map(
        (pkg) => `
      <article class="lab-package-card" data-package="${pkg.id}">
        <div class="pkg-header">
          <span class="pkg-badge">${pkg.badge}</span>
          <span class="pkg-report-time">${icon("check")} ${pkg.reportTime} Delivery</span>
        </div>
        <div class="pkg-body">
          <div class="pkg-icon avatar-${pkg.color}">${pkg.initials}</div>
          <div class="pkg-details">
            <h3>${pkg.name}</h3>
            <span class="pkg-test-count">${pkg.tests} Biomarkers Included</span>
            <p class="pkg-included">${pkg.testsIncluded}</p>
            <details class="biomarker-details">
              <summary class="biomarker-toggle">View ${pkg.tests} Included Biomarkers ${icon("chevron")}</summary>
              <div class="biomarker-list-content">
                <span>Fasting Blood Glucose</span>
                <span>HbA1c Average Blood Sugar</span>
                <span>Lipid Profile (HDL, LDL, Triglycerides)</span>
                <span>Liver Function Test (ALT, AST, Bilirubin)</span>
                <span>Kidney Function Test (Urea, Creatinine)</span>
                <span>Thyroid Stimulating Hormone (TSH)</span>
                <span>Complete Blood Count (CBC & ESR)</span>
              </div>
            </details>
          </div>
        </div>
        <div class="pkg-footer">
          <div class="pkg-price-wrap">
            <strong>₹${pkg.price}</strong>
            <s>₹${pkg.mrp}</s>
            <span class="pkg-discount">${pkg.discount}% OFF</span>
          </div>
          <div class="pkg-actions-row">
            <button class="button button-small button-outline" data-sample-modal="${pkg.name}">Book Sample</button>
            <button class="button button-small button-primary" data-book-package="${pkg.id}">${icon("plus")} Add</button>
          </div>
        </div>
      </article>
    `,
      )
      .join("");
  }

  function renderSingleTestsList() {
    const tests = getFilteredSingleTests();
    if (tests.length === 0)
      return `<div class="empty-state"><p>No diagnostic tests found.</p></div>`;
    return tests
      .map(
        (t) => `
      <article class="lab-single-test-card" data-test="${t.id}">
        <div class="single-test-head">
          <div class="single-test-icon avatar-${t.color}">${t.initials}</div>
          <div>
            <h4>${t.name}</h4>
            <span class="single-test-count">${t.tests} Test Included · Fasting Blood Sample</span>
          </div>
        </div>
        <span class="guarantee-chip">${icon("check")} ${t.badge || "10-Hour Report Guarantee"}</span>
        <div class="single-test-bottom">
          <div class="single-test-price">
            <strong>₹${t.price}</strong>
            <s>₹${t.mrp}</s>
            <span class="single-test-discount">60% OFF</span>
          </div>
          <button class="button button-small button-primary" data-book-test="${t.id}">${icon("plus")} Add</button>
        </div>
      </article>
    `,
      )
      .join("");
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "labtests")}
      <main id="top" class="lab-page-main">

        <!-- Top Diagnostic Search & Header Banner -->
        <section class="section-wrap lab-hero-section">
          <div class="lab-hero-card">
            <div class="lab-hero-content">
              <span class="lab-kicker">${icon("spark")} 01 / DIAGNOSTIC EXCELLENCE — NABL, CAP & ISO 15189 Certified Labs</span>
              <h1>Blood Test at Home | <em class="editorial">Guaranteed 10-Hour Reports</em></h1>
              <p>Safe, hygienic sample collection at your doorstep in 30 mins by certified phlebotomists. 256-bit encrypted digital lab reports.</p>
              
              <div class="lab-search-bar">
                ${icon("search")}
                <input id="lab-search-input" placeholder="Search for CBC, HbA1c, Thyroid, Lipid Profile, Full Body Package..." value="${searchQuery}" />
                <button class="button button-primary" id="lab-search-btn">Search Tests</button>
              </div>

              <div class="popular-search-pills">
                <span class="psp-label">Popular Searches:</span>
                ${popularSearches.map((ps) => `<button class="ps-pill" data-search-pill="${ps}">${ps}</button>`).join("")}
              </div>
            </div>

            <!-- Trust Stats Row -->
            <div class="lab-trust-stats-grid">
              <div class="stat-item">
                <strong>10 Million+</strong>
                <span>Annual Tests Delivered</span>
              </div>
              <div class="stat-item">
                <strong>100% Free</strong>
                <span>Home Sample Collection</span>
              </div>
              <div class="stat-item">
                <strong>140+</strong>
                <span>NABL Laboratories</span>
              </div>
              <div class="stat-item">
                <strong>2,000+</strong>
                <span>Collection Centers</span>
              </div>
            </div>
          </div>
        </section>

        <!-- DIAGNOSTIC PARTNER LABS TICKER -->
        <section class="section-wrap lab-partners-section">
          <div class="lab-partners-strip">
            <span class="lps-label">${icon("verified")} ACCREDITED DIAGNOSTIC PARTNERS:</span>
            <div class="lps-grid">
              ${labPartners
                .map(
                  (lp) => `
                <div class="lab-partner-badge">
                  <strong>${lp.name}</strong>
                  <span class="lpb-tag">${lp.badge}</span>
                </div>
              `,
                )
                .join("")}
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
            <button class="text-button" id="reset-lab-filter">View All ${icon("arrow")}</button>
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
                <div class="action-icon">${icon("file")}</div>
                <div>
                  <h3>Upload Prescription and Order</h3>
                  <p>Upload your doctor's note and we will select the exact lab tests for you.</p>
                </div>
              </div>
              <button class="button button-primary button-small">${icon("plus")} Upload Rx</button>
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
                <div class="step-icon-wrap">${icon("compass")}</div>
                <h4>Book Appointment</h4>
                <p>Select a Test or Package and choose your convenient date and time slot.</p>
              </div>
              <div class="step-card">
                <span class="step-badge">STEP 2</span>
                <div class="step-icon-wrap">${icon("user")}</div>
                <h4>Home Sample Collection</h4>
                <p>A certified, trained phlebotomist visits your doorstep at your selected slot.</p>
              </div>
              <div class="step-card">
                <span class="step-badge">STEP 3</span>
                <div class="step-icon-wrap">${icon("check")}</div>
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
                <div class="pillar-number">${icon("shield")}</div>
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
              <button class="button button-light" id="scans-book-btn">${icon("phone")} Book Radiology Scan</button>
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
      ${sharedMobileNav(ctx, "labtests")}
    </div>

    <!-- SAMPLE COLLECTION MODAL CONTAINER -->
    <div class="modal-overlay" id="sample-booking-modal" hidden>
      <div class="modal-content sample-modal-content">
        <button class="modal-close" id="close-sample-modal" aria-label="Close modal">×</button>
        <div class="booking-section modal-booking">
          <span class="section-kicker">${icon("spark")} HOME SAMPLE COLLECTION</span>
          <h2 id="sample-modal-title">Schedule Lab Test</h2>
          
          <div class="booking-label">01. Patient Name & Address</div>
          <input type="text" class="modal-input" placeholder="Patient Full Name" value="Jordan Davis" />
          <input type="text" class="modal-input" placeholder="Home Delivery Address" value="124 Maple Street, Brooklyn, NY" />
          
          <div class="booking-label">02. Select Collection Date</div>
          <div class="date-pills">
            <button class="date-pill selected"><strong>Today</strong><small>30 mins</small></button>
            <button class="date-pill"><strong>Tomorrow</strong><small>Morning</small></button>
            <button class="date-pill"><strong>Fri</strong><small>Evening</small></button>
          </div>
          
          <div class="booking-label">03. Fasting Requirement Note</div>
          <div class="fasting-note-banner">${icon("flask")} <span>10-12 hours overnight fasting recommended for accurate lipid & blood sugar readings.</span></div>
          
          <button class="button button-primary full-button" id="confirm-sample-booking">Confirm Doorstep Collection ${icon("arrow")}</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindLabEvents(appRoot, ctx, {
    selectedCondition: {
      get: () => selectedCondition,
      set: (v) => (selectedCondition = v),
    },
    selectedOrgan: {
      get: () => selectedOrgan,
      set: (v) => (selectedOrgan = v),
    },
    searchQuery: { get: () => searchQuery, set: (v) => (searchQuery = v) },
    update: () => {
      const pkgGrid = appRoot.querySelector("#packages-grid");
      const singleGrid = appRoot.querySelector("#single-tests-grid");
      if (pkgGrid) pkgGrid.innerHTML = renderPackagesList();
      if (singleGrid) singleGrid.innerHTML = renderSingleTestsList();
      bindNav(appRoot, ctx);
    },
  });
}

function bindLabEvents(appRoot, ctx, state) {
  const { navigate, addToCart, showToast } = ctx;
  bindNav(appRoot, ctx);

  const sampleModal = appRoot.querySelector("#sample-booking-modal");
  const closeSampleModal = appRoot.querySelector("#close-sample-modal");
  const confirmSampleBtn = appRoot.querySelector("#confirm-sample-booking");
  const sampleTitle = appRoot.querySelector("#sample-modal-title");

  if (closeSampleModal && sampleModal) {
    closeSampleModal.addEventListener(
      "click",
      () => (sampleModal.hidden = true),
    );
    sampleModal.addEventListener("click", (e) => {
      if (e.target === sampleModal) sampleModal.hidden = true;
    });
  }

  if (confirmSampleBtn && sampleModal) {
    confirmSampleBtn.addEventListener("click", () => {
      sampleModal.hidden = true;
      showToast("Sample collection scheduled! Phlebotomist assigned.");
      navigate("dashboard");
    });
  }

  // Search pills click
  appRoot.querySelectorAll("[data-search-pill]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const q = pill.dataset.searchPill;
      state.searchQuery.set(q);
      const input = appRoot.querySelector("#lab-search-input");
      if (input) input.value = q;
      state.update();
    });
  });

  // Health check chips click
  appRoot.querySelectorAll("[data-condition]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cond = chip.dataset.condition;
      state.selectedCondition.set(
        state.selectedCondition.get() === cond ? "all" : cond,
      );
      appRoot
        .querySelectorAll("[data-condition]")
        .forEach((c) => c.classList.remove("active"));
      if (state.selectedCondition.get() === cond) chip.classList.add("active");
      state.update();
    });
  });

  // Organ chips click
  appRoot.querySelectorAll("[data-organ]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const organ = chip.dataset.organ;
      state.selectedCondition.set(organ);
      showToast(`Filtering lab tests for ${organ}`);
      state.update();
    });
  });

  // Reset filter button
  const resetBtn = appRoot.querySelector("#reset-lab-filter");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.selectedCondition.set("all");
      appRoot
        .querySelectorAll("[data-condition]")
        .forEach((c) => c.classList.remove("active"));
      state.update();
    });
  }

  // Search input & button
  const searchInput = appRoot.querySelector("#lab-search-input");
  const searchBtn = appRoot.querySelector("#lab-search-btn");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      state.searchQuery.set(searchInput.value.trim());
      state.update();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.searchQuery.set(searchInput.value.trim());
        state.update();
      }
    });
  }

  // Upload prescription click
  const uploadCard = appRoot.querySelector("#upload-rx-lab-card");
  if (uploadCard) {
    uploadCard.addEventListener("click", () => navigate("prescription"));
  }

  // Add package / add test buttons / sample modal triggers
  appRoot.addEventListener("click", (e) => {
    const modalBtn = e.target.closest("[data-sample-modal]");
    const pkgBtn = e.target.closest("[data-book-package]");
    const testBtn = e.target.closest("[data-book-test]");
    const testCard = e.target.closest("[data-test]");
    const pkgCard = e.target.closest("[data-package]");

    if (modalBtn && sampleModal) {
      e.stopPropagation();
      if (sampleTitle)
        sampleTitle.textContent = `Schedule: ${modalBtn.dataset.sampleModal}`;
      sampleModal.hidden = false;
    } else if (pkgBtn) {
      e.stopPropagation();
      const pkg = labPackages.find((p) => p.id === pkgBtn.dataset.bookPackage);
      if (pkg) {
        addToCart(pkg.id, {
          name: pkg.name,
          price: pkg.price,
          mrp: pkg.mrp,
          pack: `${pkg.tests} Tests Bundle`,
          rx: false,
          initials: pkg.initials,
          color: pkg.color,
        });
      }
    } else if (testBtn) {
      e.stopPropagation();
      const test = labTests.find((t) => t.id === testBtn.dataset.bookTest);
      if (test) {
        addToCart(test.id, {
          name: test.name,
          price: test.price,
          mrp: test.mrp,
          pack: `${test.tests} Test Included`,
          rx: false,
          initials: test.initials,
          color: test.color,
        });
      }
    } else if (testCard && !testBtn && !modalBtn) {
      navigate("test", { id: testCard.dataset.test });
    }
  });

  // Scans button
  const scansBtn = appRoot.querySelector("#scans-book-btn");
  if (scansBtn)
    scansBtn.addEventListener("click", () =>
      showToast("Radiology & CT Scan slot request sent!"),
    );
}

// === Test Detail Page ===
export function renderTestDetail(appRoot, ctx) {
  const { navigate, currentParams, addToCart } = ctx;
  const t = labTests.find((t) => t.id === currentParams.id);
  if (!t) {
    navigate("labtests");
    return;
  }
  const discount = Math.round((1 - t.price / t.mrp) * 100);
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "labtests")}
      <main id="top" class="section-wrap detail-page labtest-detail-wrap">
        
        <div class="test-detail-layout">
          <div class="test-detail-left">
            <div class="test-detail-hero-card">
              <div class="test-detail-icon-large avatar-${t.color}">${t.initials}</div>
              <div class="test-detail-header-info">
                <span class="eyebrow-tag">${icon("spark")} ACCREDITED DIAGNOSTIC PANEL</span>
                <h1>${t.name}</h1>
                <div class="test-detail-meta-row">
                  <span class="test-meta-badge">${icon("flask")} ${t.tests} Biomarkers Tested</span>
                  <span class="test-meta-badge">${icon("clock")} Digital Report in ${t.reportTime}</span>
                  <span class="test-meta-badge">${icon("pin")} Free Home Sample Collection</span>
                </div>
                
                <div class="test-detail-price-row">
                  <strong>₹${t.price}</strong>
                  <s>₹${t.mrp}</s>
                  <span class="save-badge">${icon("spark")} Save ₹${t.mrp - t.price} (${discount}% OFF)</span>
                </div>
              </div>
            </div>

            <section class="test-detail-desc-box">
              <h3>About this diagnostic test</h3>
              <p>${t.desc}</p>
              
              <h3>Included Diagnostic Parameters</h3>
              <div class="test-includes-grid">
                <div class="test-include-item">${icon("check")} <span><strong>Home Sample Collection</strong> — Certified phlebotomist visit</span></div>
                <div class="test-include-item">${icon("check")} <span><strong>Digital Encrypted Report</strong> — Delivered within ${t.reportTime}</span></div>
                <div class="test-include-item">${icon("check")} <span><strong>Free Doctor Consultation</strong> — Post-report consultation included</span></div>
                <div class="test-include-item">${icon("check")} <span><strong>NABL & CAP Accredited</strong> — High-precision diagnostic labs</span></div>
              </div>
            </section>
          </div>
          
          <div class="test-detail-right">
            <div class="booking-section">
              <span class="section-kicker">${icon("flask")} APPOINTMENT SCHEDULE</span>
              <h2>Book <em class="editorial">Lab Test</em></h2>
              
              <div class="booking-label">01. Select Date</div>
              <div class="date-pills">
                <button class="date-pill selected"><strong>Today</strong><small>Jun 18</small></button>
                <button class="date-pill"><strong>Tomorrow</strong><small>Jun 19</small></button>
                <button class="date-pill"><strong>Fri</strong><small>Jun 20</small></button>
              </div>
              
              <div class="booking-label">02. Sample Collection Mode</div>
              <div class="booking-type">
                <button class="booking-type-btn selected">${icon("pin")} Home Collection (FREE)</button>
                <button class="booking-type-btn">${icon("building")} Lab Visit</button>
              </div>
              
              <div class="booking-summary">
                <div><span>Test Price</span><strong>₹${t.price}</strong></div>
                <div><span>Home Collection Fee</span><strong class="text-success">FREE</strong></div>
                <div class="summary-total"><span>Total Amount</span><strong>₹${t.price}</strong></div>
              </div>
              
              <button class="button button-primary full-button" id="book-test-confirm">Schedule Sample Collection ${icon("arrow")}</button>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "labtests")}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);
  appRoot.querySelector("#book-test-confirm").addEventListener("click", () => {
    showToast("Lab test booked! Sample collection scheduled.");
    navigate("dashboard");
  });
  appRoot.querySelectorAll(".booking-type-btn").forEach((b) => {
    b.addEventListener("click", () => {
      appRoot
        .querySelectorAll(".booking-type-btn")
        .forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
  });
  appRoot.querySelectorAll(".date-pill").forEach((b) => {
    b.addEventListener("click", () => {
      appRoot
        .querySelectorAll(".date-pill")
        .forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
  });
}

// === Cart Page ===
export function renderCart(appRoot, ctx) {
  const {
    navigate,
    cartState,
    changeQty,
    removeFromCart,
    getCartTotal,
    addToCart,
  } = ctx;
  const subtotal = getCartTotal();
  const savings = cartState.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  const deliveryFee = subtotal >= 250 || cartState.length === 0 ? 0 : 39.0;
  const total = subtotal + deliveryFee;
  const hasRx = cartState.some((i) => i.rx);
  const totalItemsCount = cartState.reduce((s, i) => s + i.qty, 0);

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap cart-page-apollo">
        
        ${
          cartState.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-icon">${icon("bag")}</div>
            <h3>Your cart is empty</h3>
            <p>Add medicines, wellness products, or lab tests to get started.</p>
            <button class="button button-primary" data-nav="pharmacy">Browse Pharmacy ${icon("arrow")}</button>
          </div>
        `
            : `
        <div class="cart-layout-apollo">
          
          <!-- LEFT COLUMN -->
          <div class="cart-left-apollo">
            
            <div class="cart-top-bar">
              <h2>MY CART</h2>
            </div>

            <!-- Add Address Alert Banner -->
            <div class="address-alert-banner">
              <div class="aab-left">
                <span class="aab-icon">${icon("pin")}</span>
                <span>Add address to unlock extra discounts and best offers.</span>
              </div>
              <button class="aab-btn" id="btn-add-address-cart">ADD ADDRESS</button>
            </div>

            <!-- Cart Item Count Header -->
            <div class="cart-items-header-row">
              <h3>${totalItemsCount} ITEM${totalItemsCount === 1 ? "" : "S"} IN YOUR CART</h3>
              <button class="add-items-link" data-nav="pharmacy">ADD ITEMS</button>
            </div>

            ${hasRx ? `<div class="cart-rx-warning">${icon("file")} <span>This order includes prescription items. You will need to upload a valid prescription during checkout.</span></div>` : ""}

            <!-- Shipment Box -->
            <div class="shipment-box">
              <div class="shipment-head">
                <div class="sh-left">
                  ${icon("pin")}
                  <strong>Within 3 days delivery</strong>
                </div>
                <span class="shipment-badge">Shipment 1/1</span>
              </div>

              <div class="shipment-items-list">
                ${cartState
                  .map(
                    (item) => `
                  <div class="apollo-cart-item">
                    <div class="aci-img-wrap">
                      <span class="cart-item-avatar avatar-${item.color}">${item.initials}</span>
                    </div>
                    <div class="aci-details">
                      <div class="aci-top-row">
                        <h4>${item.name}</h4>
                        <button class="aci-delete-btn" data-remove="${item.id}" aria-label="Delete item">
                          ${icon("more")}
                        </button>
                      </div>
                      <span class="aci-pack">${item.pack}</span>
                      ${item.rx ? '<span class="cart-rx-note">Rx Prescription Required</span>' : ""}
                      
                      <div class="aci-bottom-row">
                        <div class="aci-price-row">
                          <span class="mrp-strike">MRP ₹${item.mrp.toFixed(2)}</span>
                          <span class="disc-percent">${Math.round((1 - item.price / item.mrp) * 100)}% off</span>
                          <strong class="final-price">₹${item.price.toFixed(2)}</strong>
                        </div>

                        <div class="qty-select-wrapper">
                          <select class="apollo-qty-select" data-qty-select="${item.id}">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => `<option value="${q}" ${q === item.qty ? "selected" : ""}>Qty ${q}</option>`).join("")}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <!-- LAST MINUTE BUYS Carousel Grid -->
            <div class="last-minute-buys-section">
              <div class="lmb-head">
                <h3>LAST MINUTE BUYS</h3>
              </div>
              <div class="lmb-grid">
                ${products
                  .slice(0, 5)
                  .map(
                    (prod) => `
                  <div class="lmb-card" data-product="${prod.id}">
                    <div class="lmb-img">
                      <span class="product-avatar avatar-${prod.color}">${prod.initials}</span>
                    </div>
                    <span class="lmb-title">${prod.name}</span>
                    <div class="lmb-price-row">
                      <s>₹${prod.mrp}</s>
                      <strong>₹${prod.price}</strong>
                    </div>
                    <button class="lmb-add-btn" data-add="${prod.id}">ADD</button>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN -->
          <div class="cart-right-apollo">
            
            <!-- OFFERS & DISCOUNTS Card -->
            <div class="apollo-side-card">
              <div class="asc-header">
                <h3>OFFERS & DISCOUNTS</h3>
              </div>
              <div class="coupon-row-btn" id="btn-apply-coupon">
                <div class="crb-left">
                  <span class="coupon-icon">${icon("spark")}</span>
                  <div>
                    <strong>Apply Coupon</strong>
                    <small class="text-danger">Login to apply coupons</small>
                  </div>
                </div>
                <span class="crb-arrow">${icon("chevron")}</span>
              </div>
            </div>

            <!-- Cart Breakdown Card -->
            <div class="apollo-side-card">
              <div class="asc-header">
                <h3>Cart Breakdown</h3>
              </div>
              <div class="bill-breakdown-row">
                <div class="bbr-left">
                  ${icon("file")}
                  <div>
                    <strong>Total Bill</strong>
                    <small>Incl. charges</small>
                  </div>
                </div>
                <div class="bbr-right">
                  <s>₹${(subtotal + savings).toFixed(2)}</s>
                  <strong>₹${subtotal.toFixed(2)}</strong>
                  <span class="bbr-arrow">${icon("chevron")}</span>
                </div>
              </div>

              ${
                savings > 0
                  ? `
                <div class="savings-banner-green">
                  ${icon("check")}
                  <span>You will save <strong>₹${savings.toFixed(2)}</strong> on this order.</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Available Payment Offers Card -->
            <div class="apollo-side-card">
              <div class="asc-header">
                <h3>Available Payment Offers</h3>
                <small>Offer auto-applies at checkout</small>
              </div>
              <div class="payment-offer-card">
                <span class="special-badge">Special Launch Offer</span>
                <div class="poc-inner">
                  <div class="poc-left">
                    <span class="card-icon-badge">${icon("file")}</span>
                    <div>
                      <strong>Apollo SBI SELECT Credit Card</strong>
                      <span class="cashback-text">Upto ₹19 Cashback</span>
                      <small>Offer Unlocked!</small>
                    </div>
                  </div>
                  <span class="poc-arrow">${icon("chevron")}</span>
                </div>
              </div>
            </div>

            <!-- Amount To Pay & Proceed Sticky Bottom Bar -->
            <div class="cart-proceed-bar">
              <div class="cpb-left">
                <span>Amount to pay ∧</span>
                <strong>₹${total.toFixed(2)}</strong>
              </div>
              <button class="button button-primary apollo-proceed-btn" id="checkout-btn">
                Proceed
              </button>
            </div>

          </div>

        </div>`
        }
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);

  // Quantity dropdown handler
  appRoot.querySelectorAll("[data-qty-select]").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const id = sel.dataset.qtySelect;
      const newQty = parseInt(sel.value, 10);
      const currentItem = cartState.find((i) => i.id === id);
      if (currentItem) {
        changeQty(id, newQty - currentItem.qty);
      }
    });
  });

  // Remove handler
  appRoot
    .querySelectorAll("[data-remove]")
    .forEach((b) =>
      b.addEventListener("click", () => removeFromCart(b.dataset.remove)),
    );

  // Add Last Minute Buy product handler
  appRoot.querySelectorAll("[data-add]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const prod = products.find((p) => p.id === b.dataset.add);
      if (prod) addToCart(prod.id, prod);
    });
  });

  // Address button & coupon button toast
  const addAddrBtn = appRoot.querySelector("#btn-add-address-cart");
  if (addAddrBtn)
    addAddrBtn.addEventListener("click", () =>
      ctx.showToast("Please enter your delivery address."),
    );
  const applyCouponBtn = appRoot.querySelector("#btn-apply-coupon");
  if (applyCouponBtn)
    applyCouponBtn.addEventListener("click", () =>
      ctx.showToast("Log in to view available promo codes."),
    );

  const checkoutBtn = appRoot.querySelector("#checkout-btn");
  if (checkoutBtn)
    checkoutBtn.addEventListener("click", () => navigate("checkout"));
}

// === Checkout Page ===
export function renderCheckout(appRoot, ctx) {
  const { navigate, cartState, getCartTotal } = ctx;
  if (cartState.length === 0) {
    navigate("cart");
    return;
  }
  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 499 ? 0 : 49;
  const total = subtotal + deliveryFee;
  const hasRx = cartState.some((i) => i.rx);
  const orderId = "THP" + Date.now().toString().slice(-6);

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap checkout-page checkout-page-wrap">
        <h1>Secure <em class="editorial">Checkout</em></h1>
        
        <div class="checkout-layout">
          <div class="checkout-left">
            ${
              hasRx
                ? `
              <div class="checkout-section rx-section">
                <h3>${icon("file")} Prescription Verification Required</h3>
                <div class="rx-dropzone-inline" id="checkout-rx-dropzone">
                  <div class="rx-dropzone-icon">${icon("file")}</div>
                  <div>
                    <strong>Upload Doctor's Prescription</strong>
                    <span>Click to select file · JPG, PNG or PDF (Max 10MB)</span>
                  </div>
                  <input type="file" id="checkout-rx-file" accept="image/*,.pdf" hidden />
                </div>
              </div>
            `
                : ""
            }

            <div class="checkout-section">
              <h3>1. Delivery Address</h3>
              <div class="checkout-form">
                <label>Full Name</label>
                <input type="text" value="Jordan Davis" />
                <label>Phone Number</label>
                <input type="tel" value="+1 (984) 804-0746" />
                <label>Address Line 1</label>
                <input type="text" value="124 Maple Street, Apt 4B" />
                <label>Address Line 2 (Optional)</label>
                <input type="text" placeholder="Landmark, delivery instructions..." />
                <div class="form-row">
                  <div><label>City</label><input type="text" value="Brooklyn" /></div>
                  <div><label>ZIP Code</label><input type="text" value="11201" /></div>
                </div>
              </div>
            </div>

            <div class="checkout-section">
              <h3>2. Delivery Options</h3>
              <div class="delivery-options">
                <button class="delivery-option selected">
                  <div><strong>Standard Delivery</strong><span>2-3 business days · Encrypted packaging</span></div>
                  <span class="delivery-price">${deliveryFee === 0 ? "FREE" : formatINR(49)}</span>
                </button>
                <button class="delivery-option">
                  <div><strong>Express Express Delivery</strong><span>Same day · Order before 2 PM</span></div>
                  <span class="delivery-price">${formatINR(99)}</span>
                </button>
                <button class="delivery-option">
                  <div><strong>Store Pickup</strong><span>Ready in 1 hour at Brooklyn Pharmacy</span></div>
                  <span class="delivery-price">FREE</span>
                </button>
              </div>
            </div>

            <div class="checkout-section">
              <h3>3. Payment Method</h3>
              <div class="payment-options">
                <button class="payment-option selected">
                  <div>${icon("file")} <strong>Credit / Debit Card</strong></div>
                  ${icon("check")}
                </button>
                <button class="payment-option">
                  <div>${icon("shield")} <strong>Digital Wallet (Apple Pay / Google Pay)</strong></div>
                </button>
                <button class="payment-option">
                  <div>${icon("bag")} <strong>Pay on Delivery</strong></div>
                </button>
              </div>
            </div>
          </div>

          <div class="checkout-right">
            <div class="cart-summary-card checkout-summary">
              <h3>Order Summary</h3>
              ${cartState
                .map(
                  (item) => `
                <div class="checkout-review-item">
                  <span class="cart-item-avatar avatar-${item.color}">${item.initials}</span>
                  <div>
                    <strong>${item.name}</strong>
                    <span>${item.qty} × ${formatINR(item.price)}</span>
                  </div>
                  <strong>${formatINR(item.price * item.qty)}</strong>
                </div>
              `,
                )
                .join("")}
              
              <div class="summary-row"><span>Subtotal</span><strong>${formatINR(subtotal)}</strong></div>
              <div class="summary-row"><span>Delivery</span><strong>${deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)}</strong></div>
              <div class="summary-row summary-total"><span>Total Amount</span><strong>${formatINR(total)}</strong></div>
              
              <button class="button button-primary full-button" id="place-order">Place Order ${icon("arrow")}</button>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);
  appRoot.querySelectorAll(".delivery-option").forEach((b) =>
    b.addEventListener("click", () => {
      appRoot
        .querySelectorAll(".delivery-option")
        .forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    }),
  );
  appRoot.querySelectorAll(".payment-option").forEach((b) =>
    b.addEventListener("click", () => {
      appRoot
        .querySelectorAll(".payment-option")
        .forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    }),
  );
  const dropzone = appRoot.querySelector("#checkout-rx-dropzone");
  const fileInput = appRoot.querySelector("#checkout-rx-file");
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0)
        showToast("Prescription uploaded successfully.");
    });
  }
  appRoot.querySelector("#place-order").addEventListener("click", () => {
    cartState.length = 0;
    ctx.notifyCartChange();
    navigate("order-success", { id: orderId, total });
  });
}

// === Order Success Page ===
export function renderOrderSuccess(appRoot, ctx) {
  const { navigate, currentParams } = ctx;
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap order-success-page order-success-wrap">
        <div class="order-success-content">
          <div class="success-check-large">${icon("check")}</div>
          <h1>Order Confirmed!</h1>
          <p>Order <strong>#${currentParams.id || "THP928104"}</strong> · Total <strong>${formatINR(currentParams.total || 3540)}</strong></p>
          
          <div class="order-tracking-page">
            <div class="track-step completed"><span class="track-dot">${icon("check")}</span><div><strong>Order Confirmed</strong><small>Just now</small></div></div>
            <div class="track-step active"><span class="track-dot">${icon("bag")}</span><div><strong>Preparing Your Order</strong><small>Estimated 30 mins</small></div></div>
            <div class="track-step"><span class="track-dot">${icon("pin")}</span><div><strong>Out for Delivery</strong><small>Estimated Today</small></div></div>
            <div class="track-step"><span class="track-dot">${icon("home")}</span><div><strong>Delivered</strong><small>Estimated 5:30 PM</small></div></div>
          </div>
          
          <div class="order-success-actions">
            <button class="button button-primary" data-nav="dashboard">View My Orders ${icon("arrow")}</button>
            <button class="button button-outline" data-nav="pharmacy">Continue Shopping</button>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);
}

// === Emergency Page ===
export function renderEmergency(appRoot, ctx) {
  const { navigate } = ctx;
  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap emergency-page">
        <div class="emergency-content">
          <div class="emergency-icon-large">${icon("phone")}</div>
          <h1>Emergency Care</h1>
          <p>If this is a life-threatening emergency, call your local emergency number immediately.</p>
          <div class="emergency-actions-page">
            <button class="emergency-action-large emergency-call"><div class="ea-icon">${icon("phone")}</div><div><strong>Call emergency services</strong><span>For life-threatening emergencies</span></div></button>
            <button class="emergency-action-large emergency-consult"><div class="ea-icon">${icon("video")}</div><div><strong>Talk to a care guide</strong><span>Available 24/7</span></div></button>
            <button class="emergency-action-large emergency-ambulance"><div class="ea-icon">${icon("pin")}</div><div><strong>Request ambulance</strong><span>Track real-time location</span></div></button>
          </div>
          <div class="emergency-hospitals">
            <h3>Nearby Emergency Hospitals</h3>
            <div class="emergency-hospital-card"><div class="hospital-symbol">${icon("building")}</div><div><strong>Northshore Medical Center</strong><span>0.8 mi · Open 24/7</span><small>Emergency department available</small></div><button class="button button-small button-outline">Directions</button></div>
            <div class="emergency-hospital-card"><div class="hospital-symbol hospital-symbol-blue">${icon("building")}</div><div><strong>St. Clement Health</strong><span>1.4 mi · Open 24/7</span><small>Trauma center · ICU available</small></div><button class="button button-small button-outline">Directions</button></div>
          </div>
        </div>
      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;
  bindNav(appRoot, ctx);
}

export function renderPlans(appRoot, ctx) {
  const { navigate, showToast, requireAuth } = ctx;
  let isAnnual = true;
  let selectedCategory = "family"; // family, individual, senior, executive
  const plansApiUrl = HEALTH_PLANS_API_URL;
  let plansData = [];
  const planText = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  let calculatorSettings = null;

  const memberPerks = [
    {
      icon: "spark",
      title: "Plan-specific benefits",
      desc: "Review consultation, checkup and home-sample allowances on each plan.",
    },
    {
      icon: "shield",
      title: "Eligible service discounts",
      desc: "See pharmacy and lab discounts included with each available plan.",
    },
    {
      icon: "phone",
      title: "Family membership",
      desc: "Add family members up to the limit configured for your subscription.",
    },
    {
      icon: "shield",
      title: "Clear billing",
      desc: "Compare current monthly and annual prices before choosing a plan.",
    },
  ];

  const planFaqs = [
    {
      q: "Can I switch or upgrade my plan later?",
      a: "Plan changes depend on the options available for your subscription. Contact support if the change you need is not available in your account.",
    },
    {
      q: "Can I add family members?",
      a: "Family members can be managed for an active subscription, up to the maximum configured for its plan.",
    },
    {
      q: "Is there a money-back guarantee?",
      a: "Eligible subscriptions can request a refund within 30 days. Requests are reviewed by the support team.",
    },
    {
      q: "Which benefits are included?",
      a: "Benefits and limits vary by plan. Check the current plan details above before subscribing.",
    },
  ];

  function renderPlansGrid() {
    if (!plansData.length) {
      return `<p class="plan-catalog-state" role="status">Loading available plans…</p>`;
    }
    return plansData
      .map((p) => {
        const price = isAnnual ? p.annualPrice : p.monthlyPrice;
        const yearlyTotal = isAnnual ? p.annualPrice * 12 : p.monthlyPrice * 12;
        return `
        <div class="deluxe-plan-card ${p.featured ? "plan-featured" : ""}">
          ${p.featured ? `<div class="plan-popular-ribbon">${icon("spark")} ${planText(p.badge)}</div>` : `<span class="plan-type-tag">${planText(p.badge)}</span>`}
          <h3>${planText(p.name)}</h3>
          <p class="plan-tagline">${planText(p.tagline)}</p>
          
          <div class="plan-pricing-box">
            <div class="price-val-wrap">
              <span class="currency-symbol">₹</span>
              <strong class="price-num">${planText(price)}</strong>
              <span class="price-period">/ mo</span>
            </div>
            <span class="billing-note">${isAnnual ? `Billed annually (${formatINR(yearlyTotal)}/yr)` : "Billed monthly"}</span>
          </div>

          <button class="button ${p.featured ? "button-primary" : "button-outline"} full-button btn-subscribe-plan" data-plan-id="${planText(p.id)}" data-plan-name="${planText(p.name)}">
            Subscribe Now ${icon("arrow")}
          </button>

          <div class="plan-features-divider"><span>WHAT'S INCLUDED</span></div>

          <ul class="plan-feature-list">
            ${p.features.map((f) => `<li><span class="check-icon-wrap">${icon("check")}</span> <span>${planText(f)}</span></li>`).join("")}
            ${p.notIncluded.map((nf) => `<li class="not-included"><span class="cross-icon-wrap">×</span> <span>${planText(nf)}</span></li>`).join("")}
          </ul>
        </div>
      `;
      })
      .join("");
  }

  function renderComparisonMatrix() {
    if (!plansData.length) {
      return `<p class="plan-catalog-state">Plan benefits will appear here when plans are available.</p>`;
    }
    const rows = [
      ["Free consultations / month", (plan) => plan.benefits.free_consultations_per_month == null ? "Unlimited" : `${plan.benefits.free_consultations_per_month}`],
      ["Family members covered", (plan) => `${plan.maximumFamilyMembers}`],
      ["Pharmacy discount", (plan) => `${Number(plan.benefits.pharmacy_discount_percent) || 0}%`],
      ["Lab discount", (plan) => `${Number(plan.benefits.lab_discount_percent) || 0}%`],
      ["Free home samples / year", (plan) => `${Number(plan.benefits.free_home_sample_count) || 0}`],
      ["Annual checkups", (plan) => `${Number(plan.benefits.annual_checkup_count) || 0}`],
      ["Care manager", (plan) => plan.benefits.care_manager ? "Included" : "Not included"],
      ["Ambulance discount", (plan) => `${Number(plan.benefits.ambulance_discount_percent) || 0}%`],
    ];
    return `<table class="comparison-matrix-table">
      <thead><tr><th>Coverage feature</th>${plansData.map((plan) => `<th class="${plan.featured ? "th-featured" : ""}">${planText(plan.name)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(([feature, display]) => `<tr><td><strong>${planText(feature)}</strong></td>${plansData.map((plan) => `<td class="${plan.featured ? "td-featured" : ""}">${planText(display(plan))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "plans")}
      <main id="top" class="plans-page-main">
        
        <!-- HERO BANNER -->
        <section class="section-wrap plans-hero-section">
          <div class="plans-hero-card">
            <div class="plans-hero-content">
              <span class="eyebrow-tag">${icon("spark")} TATITO HEALTH PLUS MEMBERSHIP</span>
              <h1>Complete Medical Protection for<br><em class="editorial">You & Your Family.</em></h1>
              <p>Compare live plan pricing, allowances and eligible service discounts, all managed from your membership.</p>

              <!-- BILLING TOGGLE SWITCH -->
              <div class="billing-toggle-container">
                <span class="toggle-label ${!isAnnual ? "active" : ""}">Monthly Billing</span>
                <button class="toggle-switch ${isAnnual ? "switch-annual" : ""}" id="billing-toggle-btn" aria-label="Toggle Annual Billing">
                  <span class="toggle-slider"></span>
                </button>
                <span class="toggle-label ${isAnnual ? "active" : ""}">
                  Annual Billing 
                  <span class="save-badge-glow" id="annual-saving-badge">${icon("spark")} Annual pricing</span>
                </span>
              </div>

              <div class="plans-hero-trust-row">
                <span class="pht-item">${icon("verified")} Current plan details</span>
                <span class="pht-item">${icon("shield")} 30-Day Refund Requests</span>
                <span class="pht-item">${icon("clock")} Configurable family limits</span>
              </div>
            </div>

            <div class="plans-hero-graphic">
              <div class="graphic-vip-card">
                <div class="gvc-icon">${icon("spark")}</div>
                <span class="gvc-title">HEALTH PLAN</span>
                <span class="gvc-tag">BENEFITS THAT FIT</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 DELUXE TIERS GRID -->
        <section class="section-wrap plans-grid-section">
          <div class="plans-grid-deluxe" id="plans-grid-deluxe">
            ${renderPlansGrid()}
          </div>
        </section>

        <section class="section-wrap my-health-plans-section" id="my-health-plans-section" hidden>
          <div class="my-health-plans-heading">
            <div>
              <span class="section-kicker">${icon("shield")} MEMBER ACCOUNT</span>
              <h2>My Health Plans</h2>
              <p>View your subscription, benefit usage and covered family members.</p>
            </div>
            <button class="button button-outline" id="refresh-my-health-plans" type="button">${icon("refresh")} Refresh</button>
          </div>
          <div id="my-health-plans-content" aria-live="polite">
            <p class="plan-catalog-state" role="status">Loading your memberships…</p>
          </div>
        </section>

        <!-- INTERACTIVE ANNUAL SAVINGS CALCULATOR -->
        <section class="section-wrap savings-calculator-section">
          <div class="savings-calc-card">
            <div class="calc-header">
              <span class="section-kicker">${icon("spark")} INTERACTIVE CALCULATOR</span>
              <h2>How much will you <em class="editorial">Save with Tatito?</em></h2>
              <p>Estimate your family's yearly medical savings with a Tatito Health+ membership.</p>
            </div>

            <div class="calc-body-grid">
              <div class="calc-controls">
                <div class="calc-slider-group">
                  <div class="cs-label-row">
                    <label>Doctor Consultations / Month</label>
                    <span class="cs-value" id="calc-doc-val">—</span>
                  </div>
                  <input type="range" id="slider-doc-visits" min="0" max="0" value="0" disabled />
                </div>

                <div class="calc-slider-group">
                  <div class="cs-label-row">
                    <label>Monthly Pharmacy & Supplement Bills (₹)</label>
                    <span class="cs-value" id="calc-pharm-val">—</span>
                  </div>
                  <input type="range" id="slider-pharm-spend" min="0" max="0" value="0" disabled />
                </div>

                <div class="calc-slider-group">
                  <div class="cs-label-row">
                    <label>Annual Family Lab Checkups (₹)</label>
                    <span class="cs-value" id="calc-lab-val">—</span>
                  </div>
                  <input type="range" id="slider-lab-spend" min="0" max="0" value="0" disabled />
                </div>
              </div>

              <div class="calc-result-box">
                <span class="cr-label">YOUR ESTIMATED ANNUAL SAVINGS</span>
                <strong class="cr-savings-num" id="calc-savings-total">—</strong>
                <span class="cr-sub">Estimated net savings with <strong id="calc-selected-plan">Loading plan data…</strong></span>
                <div class="calc-savings-breakdown">
                  <span>Estimated benefit value <strong id="calc-gross-savings">—</strong></span>
                  <span>Annual plan cost <strong id="calc-plan-cost">—</strong></span>
                </div>
                <button class="button button-primary full-button btn-calc-subscribe" disabled>${icon("spark")} Claim Savings & Subscribe</button>
              </div>
            </div>
          </div>
        </section>

        <!-- MEMBER VIP PERKS GRID -->
        <section class="section-wrap member-perks-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("shield")} VIP BENEFITS</span>
              <h2>Explore <em class="editorial">Tatito Health+</em> benefits</h2>
            </div>
          </div>
          <div class="perks-grid">
            ${memberPerks
              .map(
                (p) => `
              <div class="perk-card">
                <div class="perk-icon avatar-teal">${icon(p.icon)}</div>
                <h4>${p.title}</h4>
                <p>${p.desc}</p>
              </div>
            `,
              )
              .join("")}
          </div>
        </section>

        <!-- PLAN COMPARISON MATRIX TABLE -->
        <section class="section-wrap comparison-matrix-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("file")} SIDE-BY-SIDE COMPARISON</span>
              <h2>Full Plan <em class="editorial">Feature Matrix</em></h2>
            </div>
          </div>
          <div class="matrix-table-wrapper">
            <div id="plan-comparison-dynamic">
              <p class="plan-catalog-state">Loading plan benefits…</p>
            </div>
          </div>
        </section>

        <!-- PLAN FAQS ACCORDION -->
        <section class="section-wrap plans-faq-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("spark")} GOT QUESTIONS?</span>
              <h2>Subscription <em class="editorial">Help Center</em></h2>
            </div>
          </div>
          <div class="faq-accordion-list">
            ${planFaqs
              .map(
                (faq, idx) => `
              <details class="faq-item" ${idx === 0 ? "open" : ""}>
                <summary class="faq-question">
                  <strong>${faq.q}</strong>
                  <span class="faq-chevron">${icon("chevron")}</span>
                </summary>
                <div class="faq-answer">
                  <p>${faq.a}</p>
                </div>
              </details>
            `,
              )
              .join("")}
          </div>
        </section>

        <!-- MONEY-BACK GUARANTEE SEAL & HELPLINE BANNER -->
        <section class="section-wrap guarantee-banner-section">
          <div class="guarantee-banner-card">
            <div class="gb-left">
              <span class="gb-seal-icon">${icon("shield")}</span>
              <div>
                <h3>30-Day Money-Back Guarantee</h3>
                <p>Try any Tatito Health+ plan risk-free. If you're not fully satisfied within 30 days, we'll refund your membership.</p>
              </div>
            </div>
            <button class="button button-light" id="btn-subscription-helpline">${icon("phone")} Speak to Membership Advisor</button>
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "plans")}
    </div>

    <!-- SUBSCRIPTION CONFIRMATION MODAL -->
    <div class="modal-overlay" id="subscribe-plan-modal" hidden>
      <div class="modal-content subscribe-modal-content">
        <button class="modal-close" id="close-sub-modal" aria-label="Close modal">×</button>
        <div class="booking-section modal-booking">
          <span class="section-kicker">${icon("spark")} MEMEBRSHIP CHECKOUT</span>
          <h2 id="sub-modal-plan-title">Subscribe to Tatito Plan</h2>
          <p id="sub-modal-plan-desc">Unlock instant discounts and 24/7 doctor access.</p>
          
          <div class="booking-label">01. Select Payment Cycle</div>
          <div class="booking-type">
            <button class="booking-type-btn ${isAnnual ? "selected" : ""}" id="sub-cycle-annual">Annual (Save 25%)</button>
            <button class="booking-type-btn ${!isAnnual ? "selected" : ""}" id="sub-cycle-monthly">Monthly</button>
          </div>

          <div class="booking-label">02. Primary Member Details</div>
          <p>Your signed-in patient account will be used for this plan order.</p>

          <label class="booking-label" for="sub-modal-payment-method">03. Payment Method</label>
          <select class="modal-input" id="sub-modal-payment-method">
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
          </select>
          
          <div class="booking-summary">
            <div><span>Membership Plan</span><strong id="sub-modal-plan-name">Tatito Family Care</strong></div>
            <div><span>Billing Term</span><strong id="sub-modal-term">Annual (₹264/yr)</strong></div>
            <div class="summary-total"><span>Amount Payable Today</span><strong id="sub-modal-amount">₹264.00</strong></div>
          </div>
          
          <button class="button button-primary full-button" id="confirm-subscribe-btn">Complete Subscription ${icon("arrow")}</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindNav(appRoot, ctx);

  const toggleBtn = appRoot.querySelector("#billing-toggle-btn");
  const plansGrid = appRoot.querySelector("#plans-grid-deluxe");
  const myPlansSection = appRoot.querySelector("#my-health-plans-section");
  const myPlansContent = appRoot.querySelector("#my-health-plans-content");
  let myPlanSubscriptions = [];
  let editingPlanFamilyMember = null;

  function renderMyPlanSubscriptions() {
    if (!myPlanSubscriptions.length) {
      return `<div class="my-health-plans-empty"><span>${icon("shield")}</span><strong>No memberships yet</strong><p>Subscribe to a Health Plan above and your membership details will appear here.</p></div>`;
    }
    return `<div class="my-health-plan-list">${myPlanSubscriptions.map((subscription) => {
      const members = Array.isArray(subscription.family_members) ? subscription.family_members : [];
      const familyLimit = Math.max(0, Number(subscription.maximum_family_members || 1) - 1);
      const editing = editingPlanFamilyMember?.subscriptionId === subscription.id ? editingPlanFamilyMember.member : null;
      const active = subscription.status === "active" && subscription.payment_status === "paid";
      const usage = Array.isArray(subscription.usage) ? subscription.usage : [];
      return `
        <article class="my-health-plan-card">
          <header class="my-health-plan-card-head">
            <div><span class="section-kicker">${planText(subscription.order_number || "MEMBERSHIP")}</span><h3>${planText(subscription.plan_name)}</h3><p>${planText(subscription.billing_period)} billing · ${formatINR(Number(subscription.amount || 0))}</p></div>
            <span class="my-health-plan-status is-${planText(subscription.status)}">${planText(subscription.status)}</span>
          </header>
          <div class="my-health-plan-meta"><span>Payment: <strong>${planText(subscription.payment_status)}</strong></span><span>Renews/ends: <strong>${subscription.ends_at ? planText(new Date(subscription.ends_at).toLocaleDateString()) : "Not started"}</strong></span>${subscription.payment?.reference ? `<span>Payment ref: <strong>${planText(subscription.payment.reference)}</strong></span>` : ""}</div>
          ${usage.length ? `<h4>Benefit usage</h4><div class="my-health-plan-usage">${usage.map((item) => {
            const limit = item.limit == null ? null : Number(item.limit);
            const used = Number(item.used || 0);
            const usageText = limit == null
              ? `${used} used · ${item.status === "unlimited" ? "unlimited" : `${item.allowed || "uncapped"}; no quantity limit`}`
              : `${used} / ${limit} used · ${Math.max(0, limit - used)} remaining`;
            return `<div><span>${planText(item.label)}</span><strong>${planText(usageText)}</strong></div>`;
          }).join("")}</div>` : ""}
          <div class="my-health-plan-family-head"><div><h4>Covered family members</h4><small>${members.length} of ${familyLimit} available</small></div></div>
          ${members.length ? `<ul class="my-health-plan-family">${members.map((member) => `<li><span><strong>${planText(member.name)}</strong><small>${planText(member.relationship || "Family member")}${member.email ? ` · ${planText(member.email)}` : ""}</small></span>${active ? `<span class="my-health-plan-member-actions"><button type="button" class="text-button" data-edit-plan-member="${planText(member.id)}" data-subscription-id="${planText(subscription.id)}">Edit</button><button type="button" class="text-button is-danger" data-remove-plan-member="${planText(member.id)}" data-subscription-id="${planText(subscription.id)}">Remove</button></span>` : ""}</li>`).join("")}</ul>` : `<p class="my-health-plan-no-family">No family members have been added.</p>`}
          ${active && familyLimit > 0 ? `<form class="my-health-plan-family-form" data-subscription-id="${planText(subscription.id)}"><strong>${editing ? "Edit family member" : members.length < familyLimit ? "Add family member" : "Family-member limit reached"}</strong>${members.length < familyLimit || editing ? `<input type="hidden" name="member_id" value="${planText(editing?.id || "")}"><label>Name<input name="name" maxlength="160" required value="${planText(editing?.name || "")}"></label><label>Relationship<input name="relationship" maxlength="60" value="${planText(editing?.relationship || "")}"></label><label>Email<input name="email" type="email" maxlength="254" value="${planText(editing?.email || "")}"></label><div class="my-health-plan-form-actions"><button class="button button-primary" type="submit">${editing ? "Save member" : "Add member"}</button>${editing ? `<button class="button button-outline" type="button" data-cancel-edit-member>Cancel</button>` : ""}</div>` : ""}</form>` : ""}
        </article>`;
    }).join("")}</div>`;
  }

  async function refreshMyPlanSubscriptions() {
    if (!myPlansSection || !myPlansContent) return;
    if (!isAuthenticated() || !getAuthToken()) {
      myPlansSection.hidden = true;
      return;
    }
    myPlansSection.hidden = false;
    myPlansContent.innerHTML = `<p class="plan-catalog-state" role="status">Loading your memberships…</p>`;
    try {
      const data = await getMyHealthPlanSubscriptions(getAuthToken());
      myPlanSubscriptions = Array.isArray(data?.results) ? data.results : [];
      editingPlanFamilyMember = null;
      myPlansContent.innerHTML = renderMyPlanSubscriptions();
    } catch (error) {
      myPlansContent.innerHTML = `<div class="my-health-plans-error" role="alert"><span>${planText(error?.message || "Unable to load your memberships.")}</span><button class="button button-outline" id="retry-my-health-plans" type="button">Try again</button></div>`;
    }
  }

  function updatePricingDisplay() {
    if (plansGrid) plansGrid.innerHTML = renderPlansGrid();
    bindSubscribeEvents();
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isAnnual = !isAnnual;
      toggleBtn.classList.toggle("switch-annual", isAnnual);
      updatePricingDisplay();
    });
  }

  // Interactive Calculator Logic
  const sliderDoc = appRoot.querySelector("#slider-doc-visits");
  const sliderPharm = appRoot.querySelector("#slider-pharm-spend");
  const sliderLab = appRoot.querySelector("#slider-lab-spend");
  const docVal = appRoot.querySelector("#calc-doc-val");
  const pharmVal = appRoot.querySelector("#calc-pharm-val");
  const labVal = appRoot.querySelector("#calc-lab-val");
  const totalSavingsEl = appRoot.querySelector("#calc-savings-total");
  const grossSavingsEl = appRoot.querySelector("#calc-gross-savings");
  const planCostEl = appRoot.querySelector("#calc-plan-cost");
  const selectedPlanEl = appRoot.querySelector("#calc-selected-plan");
  let estimatedBestPlan = null;

  function recalculateSavings() {
    if (!sliderDoc || !sliderPharm || !sliderLab || !totalSavingsEl) return;
    const visits = parseInt(sliderDoc.value, 10);
    const pharm = parseInt(sliderPharm.value, 10);
    const lab = parseInt(sliderLab.value, 10);

    if (docVal) docVal.textContent = `${visits} visit${visits > 1 ? "s" : ""}`;
    if (pharmVal) pharmVal.textContent = `${formatINR(pharm)} / mo`;
    if (labVal) labVal.textContent = `${formatINR(lab)} / yr`;

    const best = calculateBestPlanSavings(
      plansData,
      { doctorVisits: visits, pharmacySpend: pharm, labSpend: lab },
      calculatorSettings?.consultation_value,
    );
    estimatedBestPlan = best.plan;
    totalSavingsEl.textContent = formatINR(best.estimate.netSavings);
    if (grossSavingsEl) grossSavingsEl.textContent = formatINR(Math.round(best.estimate.grossSavings));
    if (planCostEl) planCostEl.textContent = formatINR(best.estimate.annualPlanCost);
    if (selectedPlanEl) {
      selectedPlanEl.textContent = best.plan?.name || "No active plan available";
    }
  }

  if (sliderDoc) sliderDoc.addEventListener("input", recalculateSavings);
  if (sliderPharm) sliderPharm.addEventListener("input", recalculateSavings);
  if (sliderLab) sliderLab.addEventListener("input", recalculateSavings);

  const calcSubscribeBtn = appRoot.querySelector(".btn-calc-subscribe");
  if (calcSubscribeBtn) {
    calcSubscribeBtn.addEventListener("click", () =>
      openSubModal(estimatedBestPlan?.id || plansData.find((plan) => plan.featured)?.id || plansData[0]?.id),
    );
  }

  // Modal logic
  const subModal = appRoot.querySelector("#subscribe-plan-modal");
  const closeSubModal = appRoot.querySelector("#close-sub-modal");
  const subPlanName = appRoot.querySelector("#sub-modal-plan-name");
  const subPlanTitle = appRoot.querySelector("#sub-modal-plan-title");
  const subModalTerm = appRoot.querySelector("#sub-modal-term");
  const subModalAmount = appRoot.querySelector("#sub-modal-amount");
  const confirmSubBtn = appRoot.querySelector("#confirm-subscribe-btn");
  const cycleAnnual = appRoot.querySelector("#sub-cycle-annual");
  const cycleMonthly = appRoot.querySelector("#sub-cycle-monthly");
  const paymentMethodInput = appRoot.querySelector("#sub-modal-payment-method");

  function updateSubscriptionCycle(annual) {
    isAnnual = annual;
    toggleBtn?.classList.toggle("switch-annual", annual);
    cycleAnnual?.classList.toggle("selected", annual);
    cycleMonthly?.classList.toggle("selected", !annual);
    updatePricingDisplay();
    const selectedPlan = plansData.find((plan) => plan.id === subModal?.dataset.planId);
    if (!selectedPlan) return;
    const monthlyPrice = annual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
    const total = annual ? monthlyPrice * 12 : monthlyPrice;
    if (subModalTerm) {
      subModalTerm.textContent = annual
        ? `Annual Billing (${formatINR(monthlyPrice)}/mo)`
        : `Monthly Billing (${formatINR(monthlyPrice)}/mo)`;
    }
    if (subModalAmount) subModalAmount.textContent = formatINR(total);
  }

  function openSubModal(planId) {
    requireAuth(() => {
      const p = plansData.find((plan) => plan.id === planId);
      if (!p || !subModal) {
        showToast("Plan catalog is unavailable. Please refresh and try again.");
        return;
      }
      const price = isAnnual ? p.annualPrice : p.monthlyPrice;
      const total = isAnnual ? p.annualPrice * 12 : p.monthlyPrice;
      subModal.dataset.planId = p.id;

      if (subPlanTitle) subPlanTitle.textContent = `Subscribe to ${p.name}`;
      if (subPlanName) subPlanName.textContent = p.name;
      if (subModalTerm)
        subModalTerm.textContent = isAnnual
          ? `Annual Billing (${formatINR(p.annualPrice)}/mo)`
          : `Monthly Billing (${formatINR(p.monthlyPrice)}/mo)`;
      if (subModalAmount) subModalAmount.textContent = formatINR(total);

      subModal.hidden = false;
    }, "SUBSCRIBE_PLAN");
  }

  if (closeSubModal && subModal) {
    closeSubModal.addEventListener("click", () => (subModal.hidden = true));
    subModal.addEventListener("click", (e) => {
      if (e.target === subModal) subModal.hidden = true;
    });
  }

  cycleAnnual?.addEventListener("click", (event) => {
    event.preventDefault();
    updateSubscriptionCycle(true);
  });
  cycleMonthly?.addEventListener("click", (event) => {
    event.preventDefault();
    updateSubscriptionCycle(false);
  });

  if (confirmSubBtn && subModal) {
    confirmSubBtn.addEventListener("click", async () => {
      const plan = plansData.find((item) => item.id === subModal.dataset.planId);
      const token = getAuthToken();
      if (!plan || !token) {
        showToast("Sign in with an online patient account before subscribing.");
        return;
      }
      confirmSubBtn.disabled = true;
      try {
        const response = await fetch(`${plansApiUrl}subscribe/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_code: plan.id,
            billing_period: isAnnual ? "annual" : "monthly",
            method: paymentMethodInput?.value || "card",
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || `Plan order failed (${response.status}).`);
        }
        subModal.hidden = true;
        showToast(`Plan order ${data.order_number} created. Payment is pending confirmation.`);
        void refreshMyPlanSubscriptions();
        navigate("dashboard");
      } catch (error) {
        showToast(error?.message || "Unable to place the plan order.");
      } finally {
        confirmSubBtn.disabled = false;
      }
    });
  }

  function bindSubscribeEvents() {
    appRoot.querySelectorAll(".btn-subscribe-plan").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openSubModal(btn.dataset.planId);
      });
    });
  }

  appRoot.querySelector("#refresh-my-health-plans")?.addEventListener("click", () => {
    void refreshMyPlanSubscriptions();
  });
  myPlansContent?.addEventListener("click", async (event) => {
    const retry = event.target.closest("#retry-my-health-plans");
    if (retry) {
      void refreshMyPlanSubscriptions();
      return;
    }
    const edit = event.target.closest("[data-edit-plan-member]");
    if (edit) {
      const subscription = myPlanSubscriptions.find(
        (item) => String(item.id) === edit.dataset.subscriptionId,
      );
      const member = subscription?.family_members?.find(
        (item) => String(item.id) === edit.dataset.editPlanMember,
      );
      if (subscription && member) {
        editingPlanFamilyMember = { subscriptionId: subscription.id, member };
        myPlansContent.innerHTML = renderMyPlanSubscriptions();
      }
      return;
    }
    if (event.target.closest("[data-cancel-edit-member]")) {
      editingPlanFamilyMember = null;
      myPlansContent.innerHTML = renderMyPlanSubscriptions();
      return;
    }
    const remove = event.target.closest("[data-remove-plan-member]");
    if (!remove || !window.confirm("Remove this covered family member?")) return;
    try {
      await removeMyHealthPlanFamilyMember(
        remove.dataset.subscriptionId,
        remove.dataset.removePlanMember,
        getAuthToken(),
      );
      showToast("Family member removed.");
      await refreshMyPlanSubscriptions();
    } catch (error) {
      showToast(error?.message || "Unable to remove this family member.");
    }
  });
  myPlansContent?.addEventListener("submit", async (event) => {
    const form = event.target.closest("form.my-health-plan-family-form");
    if (!form) return;
    event.preventDefault();
    const values = new FormData(form);
    const memberId = String(values.get("member_id") || "");
    const payload = {
      name: String(values.get("name") || "").trim(),
      relationship: String(values.get("relationship") || "").trim(),
      email: String(values.get("email") || "").trim(),
    };
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      if (memberId) {
        await updateMyHealthPlanFamilyMember(
          form.dataset.subscriptionId,
          memberId,
          payload,
          getAuthToken(),
        );
        showToast("Family member updated.");
      } else {
        await addMyHealthPlanFamilyMember(
          form.dataset.subscriptionId,
          payload,
          getAuthToken(),
        );
        showToast("Family member added.");
      }
      await refreshMyPlanSubscriptions();
    } catch (error) {
      showToast(error?.message || "Unable to save this family member.");
      if (submitButton) submitButton.disabled = false;
    }
  });

  bindSubscribeEvents();
  void refreshMyPlanSubscriptions();

  void (async () => {
    try {
      const data = await getPublicHealthPlans();
      plansData = (Array.isArray(data?.results) ? data.results : []).map((plan) => ({
        id: plan.code,
        name: plan.name,
        badge: plan.badge || "",
        featured: Boolean(plan.is_popular),
        tagline: plan.tagline || "",
        monthlyPrice: Number(plan.monthly_price),
        annualPrice: Number(plan.annual_monthly_price),
        color: plan.color || "",
        features: Array.isArray(plan.features) ? plan.features : [],
        notIncluded: Array.isArray(plan.exclusions) ? plan.exclusions : [],
        maximumFamilyMembers: Number(plan.maximum_family_members) || 1,
        benefits: plan.benefits || {},
      }));
      calculatorSettings = data?.calculator || null;
      if (calcSubscribeBtn) calcSubscribeBtn.disabled = !plansData.length;
      if (!plansData.length) {
        plansGrid.innerHTML = `<p class="plan-catalog-state" role="alert">No health plans are currently available.</p>`;
      } else {
        plansGrid.innerHTML = renderPlansGrid();
        bindSubscribeEvents();
      }
      const popularPlan = plansData.find((plan) => plan.featured) || plansData[0];
      const savingBadge = appRoot.querySelector("#annual-saving-badge");
      if (savingBadge && popularPlan) {
        const percent = popularPlan.annualPrice && popularPlan.monthlyPrice > 0
          ? Math.max(0, Math.round((popularPlan.monthlyPrice - popularPlan.annualPrice) * 100 / popularPlan.monthlyPrice))
          : 0;
        savingBadge.innerHTML = `${icon("spark")} SAVE ${percent}%`;
      }
      const comparison = appRoot.querySelector("#plan-comparison-dynamic");
      if (comparison) comparison.innerHTML = renderComparisonMatrix();
      if (calculatorSettings) {
        const sliderConfig = [
          [sliderDoc, "doctor_visits_min", "doctor_visits_max", "doctor_visits_default"],
          [sliderPharm, "pharmacy_spend_min", "pharmacy_spend_max", "pharmacy_spend_default", "pharmacy_spend_step"],
          [sliderLab, "lab_spend_min", "lab_spend_max", "lab_spend_default", "lab_spend_step"],
        ];
        sliderConfig.forEach(([slider, min, max, initial, step]) => {
          if (!slider) return;
          slider.min = calculatorSettings[min];
          slider.max = calculatorSettings[max];
          slider.value = calculatorSettings[initial];
          if (step) slider.step = calculatorSettings[step];
          slider.disabled = false;
        });
      }
      recalculateSavings();
    } catch (error) {
      plansGrid.innerHTML = `<p class="plan-catalog-state" role="alert">${planText(error?.message || "Unable to load health plans.")}</p>`;
    }
  })();

  const helplineBtn = appRoot.querySelector("#btn-subscription-helpline");
  if (helplineBtn)
    helplineBtn.addEventListener("click", () =>
      showToast("Connecting to Tatito Membership Advisor..."),
    );
}

export function renderDashboard(appRoot, ctx) {
  const { navigate, showToast } = ctx;
  let activeTab = "overview"; // overview, appointments, orders, records, addresses, payments
  let patientAppointments = [];
  let appointmentsLoading = false;
  let appointmentsError = "";
  let patientPayments = [];
  let paymentsLoading = false;
  let paymentsError = "";

  function renderTabContent() {
    const text = (value) => String(value || "—").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
    if (activeTab === "appointments") {
      const appointmentsContent = appointmentsLoading
        ? '<div class="empty-state" role="status"><p>Loading your appointments…</p></div>'
        : appointmentsError
          ? `<div class="empty-state" role="alert"><p>${text(appointmentsError)}</p><button type="button" class="button button-outline" id="appointments-retry">Try again</button></div>`
          : patientAppointments.length
            ? patientAppointments.map((appointment) => {
              const date = new Date(`${appointment.date}T12:00:00`);
              const dateLabel = Number.isNaN(date.valueOf())
                ? text(appointment.date)
                : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              const time = String(appointment.start_time || "").split(":");
              const hour = Number(time[0]);
              const timeLabel = Number.isFinite(hour) && time[1]
                ? `${hour % 12 || 12}:${time[1]} ${hour < 12 ? "AM" : "PM"}`
                : "—";
              return `<article class="dash-appointment-card"><div class="dash-apt-left"><div class="dash-apt-date-badge"><strong>${text(dateLabel.split(" ")[0])}</strong><span>${text(dateLabel.split(" ").slice(1).join(" "))}</span><small>${text(timeLabel)}</small></div><div class="dash-apt-doc-info"><div class="dash-doc-avatar">${text((appointment.doctor_name || "D").slice(0, 1))}</div><div><span class="dash-apt-spec">${text(appointment.specialty)}</span><h4>${text(appointment.doctor_name)}</h4><span class="dash-apt-loc">${text(appointment.consultation_type || "Consultation")}</span></div></div></div><div class="dash-apt-actions"><span class="status-badge status-${text(appointment.status)}">${text(appointment.status)} · payment ${text(appointment.payment_status)}</span></div></article>`;
            }).join("")
            : '<div class="empty-state"><h3>No appointments yet</h3><p>Booked appointments will appear here.</p><button class="button button-primary" data-nav="doctors">Find a Doctor</button></div>';
      return `
        <div class="dash-section-box">
          <div class="dash-box-head">
            <h3>${icon("calendar")} Scheduled Consultations</h3>
            <button class="button button-small button-primary" data-nav="doctors">Book New Doctor ${icon("arrow")}</button>
          </div>
          <div class="dash-appointments-list">
            ${appointmentsContent}
          </div>
        </div>
      `;
    }

    if (activeTab === "payments") {
      const content = paymentsLoading
        ? '<div class="empty-state" role="status"><p>Loading your payments…</p></div>'
        : paymentsError
          ? `<div class="empty-state" role="alert"><p>${text(paymentsError)}</p><button type="button" class="button button-outline" id="payments-retry">Try again</button></div>`
          : patientPayments.length
            ? `<div class="table-responsive"><table class="data-table"><thead><tr><th>Type</th><th>Appointment</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${patientPayments.map((payment) => `<tr><td>${text(payment.kind)}</td><td>${text(payment.appointment_id)}</td><td>₹${Number(payment.amount || 0).toLocaleString("en-IN")}</td><td>${text(payment.status)}</td><td>${text(payment.created_at)}</td></tr>`).join("")}</tbody></table></div><p class="booking-hint">Payments are recorded here. Online payment processing is not configured.</p>`
            : '<div class="empty-state"><h3>No payments yet</h3><p>Consultation payment records will appear here after booking.</p></div>';
      return `<div class="dash-section-box"><div class="dash-box-head"><h3>${icon("file")} Consultation Payments</h3></div>${content}</div>`;
    }

    if (activeTab === "orders") {
      return `
        <div class="dash-section-box">
          <div class="dash-box-head">
            <h3>${icon("bag")} Medicine Orders & Tracking</h3>
            <button class="button button-small button-outline" data-nav="pharmacy">Browse Pharmacy ${icon("arrow")}</button>
          </div>
          <div class="dash-order-card">
            <div class="dash-order-head">
              <div>
                <strong>Order #THP-928104</strong>
                <span>Placed on Jun 17, 2026 · 2 items · Total ₹3,540.00</span>
              </div>
              <span class="status-badge status-confirmed">${icon("pin")} Out for Delivery</span>
            </div>

            <!-- 4-Step Live Tracking Timeline -->
            <div class="dash-timeline">
              <div class="timeline-step completed">
                <span class="timeline-dot">${icon("check")}</span>
                <strong>Order Placed</strong>
                <small>Jun 17, 9:30 AM</small>
              </div>
              <div class="timeline-step completed">
                <span class="timeline-dot">${icon("check")}</span>
                <strong>Prescription Verified</strong>
                <small>Jun 17, 10:15 AM</small>
              </div>
              <div class="timeline-step active">
                <span class="timeline-dot">${icon("bag")}</span>
                <strong>Out for Delivery</strong>
                <small>Today, 2:00 PM</small>
              </div>
              <div class="timeline-step">
                <span class="timeline-dot">${icon("home")}</span>
                <strong>Delivered</strong>
                <small>Est. Today, 5:30 PM</small>
              </div>
            </div>

            <div class="dash-order-items">
              <div class="dash-order-item-row">
                <span class="cart-item-avatar avatar-teal">AM</span>
                <div>
                  <strong>Amoxicillin 500mg (21 Capsules)</strong>
                  <span>Rx Medicine · 1 Pack</span>
                </div>
                <strong>₹1,540.00</strong>
              </div>
              <div class="dash-order-item-row">
                <span class="cart-item-avatar avatar-blue">VC</span>
                <div>
                  <strong>Vitamin C 1000mg Immunity Boost</strong>
                  <span>Wellness Supplement · 1 Bottle</span>
                </div>
                <strong>₹2,000.00</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === "records") {
      return `
        <div class="dash-section-box">
          <div class="dash-box-head">
            <h3>${icon("shield")} Encrypted Health Records & Lab Reports</h3>
            <button class="button button-small button-outline" id="btn-upload-record">${icon("plus")} Upload Record</button>
          </div>
          <div class="records-file-list">
            <div class="record-file-row">
              <div class="rf-left">
                <div class="rf-icon avatar-teal">${icon("flask")}</div>
                <div>
                  <strong>Comprehensive Complete Blood Count (CBC)</strong>
                  <span>St. Jude Diagnostic Labs · Verified PDF · Jun 12, 2026</span>
                </div>
              </div>
              <div class="rf-actions">
                <button class="button button-small button-outline btn-dl-report">${icon("file")} Download PDF</button>
                <button class="button button-small button-quiet btn-share-report">${icon("arrow")} Share</button>
              </div>
            </div>

            <div class="record-file-row">
              <div class="rf-left">
                <div class="rf-icon avatar-blue">${icon("heart")}</div>
                <div>
                  <strong>Lipid Profile & Cholesterol Panel</strong>
                  <span>Metropolis Diagnostics · Verified PDF · May 28, 2026</span>
                </div>
              </div>
              <div class="rf-actions">
                <button class="button button-small button-outline btn-dl-report">${icon("file")} Download PDF</button>
                <button class="button button-small button-quiet btn-share-report">${icon("arrow")} Share</button>
              </div>
            </div>

            <div class="record-file-row">
              <div class="rf-left">
                <div class="rf-icon avatar-gold">${icon("ecg")}</div>
                <div>
                  <strong>12-Lead Electrocardiogram (ECG) Report</strong>
                  <span>Northshore Medical Center · Verified PDF · May 10, 2026</span>
                </div>
              </div>
              <div class="rf-actions">
                <button class="button button-small button-outline btn-dl-report">${icon("file")} Download PDF</button>
                <button class="button button-small button-quiet btn-share-report">${icon("arrow")} Share</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === "addresses") {
      return `
        <div class="dash-section-box">
          <div class="dash-box-head">
            <h3>${icon("pin")} Saved Delivery Address Book</h3>
            <button class="button button-small button-primary" id="btn-add-address">${icon("plus")} Add New Address</button>
          </div>
          <div class="address-cards-grid">
            <div class="address-card default">
              <span class="address-badge">Default Address</span>
              <h4>Jordan Davis (Home)</h4>
              <p>124 Maple Street, Apt 4B<br>Brooklyn, NY 11201<br>Phone: +1 984-804-0746</p>
              <div class="address-card-actions">
                <button class="button button-small button-outline btn-edit-addr">Edit</button>
                <button class="button button-small button-quiet text-danger btn-del-addr">Remove</button>
              </div>
            </div>

            <div class="address-card">
              <span class="address-badge secondary">Office</span>
              <h4>Jordan Davis (Work)</h4>
              <p>500 Fifth Avenue, Suite 1200<br>New York, NY 10110<br>Phone: +1 984-804-0746</p>
              <div class="address-card-actions">
                <button class="button button-small button-outline btn-edit-addr">Edit</button>
                <button class="button button-small button-quiet text-danger btn-del-addr">Remove</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === "payments") {
      return `
        <div class="dash-section-box">
          <div class="dash-box-head">
            <h3>${icon("file")} Payment Methods & Invoices</h3>
            <button class="button button-small button-primary" id="btn-add-payment">${icon("plus")} Add Payment Method</button>
          </div>
          <div class="payment-cards-grid">
            <div class="payment-method-card active">
              <div class="pm-top">
                <span class="pm-type">VISA</span>
                <span class="status-badge status-confirmed">Default</span>
              </div>
              <strong class="pm-number">•••• •••• •••• 4242</strong>
              <div class="pm-bottom">
                <span>Expires 12/28</span>
                <span>Jordan Davis</span>
              </div>
            </div>

            <div class="payment-method-card">
              <div class="pm-top">
                <span class="pm-type">Apple Pay</span>
              </div>
              <strong class="pm-number">jordan.davis@appleid.com</strong>
              <div class="pm-bottom">
                <span>Connected</span>
                <span>Touch ID / Face ID</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Default: Overview tab
    return `
      <div class="dash-overview-grid">
        <!-- 1. Next Appointment Card -->
        <div class="dashboard-card dash-featured-card">
          <div class="dashboard-card-head">
            <div>
              <span class="mini-label">${icon("calendar")} NEXT CONSULTATION</span>
              <h3>Primary Care Consult</h3>
            </div>
            <span class="status-badge status-confirmed">${icon("check")} Confirmed</span>
          </div>
          <div class="appointment-content">
            <div class="date-block">
              <strong>18</strong>
              <span>JUN<br>2026</span>
            </div>
            <div class="appointment-info">
              ${avatar("MC", "coral", "dash-doc-avatar")}
              <div>
                <strong>Dr. Maya Chen</strong>
                <span class="dash-doc-spec-pill">${icon("stethoscope")} Internal Medicine</span>
                <small class="apt-time">${icon("clock")} Today at 10:30 AM · In person</small>
              </div>
            </div>
          </div>
          <div class="dash-card-bottom">
            <button class="button button-small button-primary" id="btn-get-directions">${icon("pin")} Get Directions</button>
            <button class="button button-small button-outline" id="btn-reschedule-1">Reschedule</button>
          </div>
        </div>

        <!-- 2. Health Score Card -->
        <div class="dashboard-card dash-score-card">
          <div class="dashboard-card-head">
            <div>
              <span class="mini-label">${icon("spark")} HEALTH SCORE</span>
              <h3>88 <small>/ 100</small></h3>
            </div>
            <span class="status-badge status-confirmed">${icon("spark")} Optimal</span>
          </div>
          <div class="wellness-bars">
            <span><i style="height:72%"></i><small>May</small></span>
            <span><i style="height:65%"></i><small>Jun 1</small></span>
            <span><i style="height:82%"></i><small>Jun 8</small></span>
            <span class="bar-active"><i style="height:96%"></i><small>Today</small></span>
          </div>
          <div class="dash-score-foot">
            <span class="dash-score-badge">${icon("check")} Top 5% Tier</span>
            <p class="dash-score-sub">Vitals and active lifestyle metrics are <strong>14% higher</strong> than last month.</p>
          </div>
        </div>

        <!-- 3. Active Medicine Order Card -->
        <div class="dashboard-card dash-order-overview-card">
          <div class="dashboard-card-head">
            <div>
              <span class="mini-label">${icon("bag")} ACTIVE MEDICINE ORDER</span>
              <h3>Order #THP-928104</h3>
            </div>
            <span class="status-badge status-confirmed">${icon("pin")} Out for Delivery</span>
          </div>
          <div class="dash-mini-order">
            <div class="dash-mini-order-row">
              <span class="cart-item-avatar avatar-teal">AM</span>
              <div>
                <strong>Amoxicillin 500mg</strong>
                <span>Rx Medicine · 1 Pack · Expected by 5:30 PM Today</span>
              </div>
            </div>
            <div class="dash-mini-progress">
              <div class="dash-mini-bar" style="width: 75%;"></div>
            </div>
            <button class="button button-small button-primary full-button" id="btn-track-order">${icon("pin")} Track Live Order ${icon("arrow")}</button>
          </div>
        </div>
      </div>

      <!-- Recent Health Activity & Prescriptions Feed -->
      <div class="dash-activity-section">
        <div class="dash-section-title">
          <h3>${icon("activity")} Recent Health Activity & Medical Updates</h3>
          <span class="activity-count">3 New Updates</span>
        </div>
        <div class="activity-feed-grid">
          <div class="activity-feed-card">
            <div class="af-icon avatar-teal">${icon("flask")}</div>
            <div class="af-info">
              <strong>Lab Report Published: Complete Blood Count</strong>
              <span>St. Jude Diagnostic Center · Verified PDF ready to view</span>
              <small>2 hours ago</small>
            </div>
            <button class="button button-small button-outline btn-dl-report">${icon("file")} View Report</button>
          </div>

          <div class="activity-feed-card">
            <div class="af-icon avatar-blue">${icon("pills")}</div>
            <div class="af-info">
              <strong>Prescription Refill Dispatched</strong>
              <span>Order #THP-928104 on the way via Express Delivery</span>
              <small>4 hours ago</small>
            </div>
            <button class="button button-small button-outline" id="btn-track-order-2">${icon("pin")} Track</button>
          </div>

          <div class="activity-feed-card">
            <div class="af-icon avatar-gold">${icon("bell")}</div>
            <div class="af-info">
              <strong>Vaccination Due Reminder</strong>
              <span>Annual Influenza Booster scheduled for July 2026</span>
              <small>Yesterday</small>
            </div>
            <button class="button button-small button-quiet" data-nav="doctors">Book Slot</button>
          </div>
        </div>
      </div>
    `;
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx)}
      <main id="top" class="section-wrap dashboard-main-wrap">
        
        <!-- Hero Command Banner -->
        <div class="dash-hero-banner">
          <div class="dash-hero-left">
            <div class="dash-user-badge-row">
              <span class="dash-vip-tag">${icon("spark")} TATITO PREMIUM MEMBER</span>
              <span class="dash-id-tag">Patient ID: THP-884920</span>
            </div>
            <h1>Welcome back, <em class="editorial">Jordan Davis</em> 👋</h1>
            <p>Your complete health snapshot is active. You have 1 upcoming consultation today.</p>
            
            <div class="dash-patient-pills">
              <span class="patient-pill">${icon("user")} Age: 32</span>
              <span class="patient-pill">${icon("heart")} Blood: O+</span>
              <span class="patient-pill">${icon("shield")} Emergency: +1 (555) 019-2831</span>
            </div>
          </div>
          <div class="dash-hero-actions">
            <button class="button button-primary" data-nav="doctors">${icon("video")} Consult Doctor</button>
            <button class="button button-outline" data-nav="pharmacy">${icon("bag")} Order Medicine</button>
            <button class="button button-quiet" data-nav="prescription">${icon("file")} Upload Rx</button>
          </div>
        </div>

        <!-- 4 Vital Metric Cards -->
        <div class="vitals-grid">
          <div class="vital-card">
            <div class="vital-top">
              <span class="vital-icon avatar-teal">${icon("pulse")}</span>
              <span class="vital-status status-good">Normal</span>
            </div>
            <div class="vital-val">
              <strong>72</strong>
              <small>BPM</small>
            </div>
            <span class="vital-label">Resting Heart Rate</span>
          </div>

          <div class="vital-card">
            <div class="vital-top">
              <span class="vital-icon avatar-blue">${icon("ecg")}</span>
              <span class="vital-status status-good">Optimal</span>
            </div>
            <div class="vital-val">
              <strong>120/80</strong>
              <small>mmHg</small>
            </div>
            <span class="vital-label">Blood Pressure</span>
          </div>

          <div class="vital-card">
            <div class="vital-top">
              <span class="vital-icon avatar-gold">${icon("spark")}</span>
              <span class="vital-status status-good">+14%</span>
            </div>
            <div class="vital-val">
              <strong>88</strong>
              <small>/100</small>
            </div>
            <span class="vital-label">Health Score</span>
          </div>

          <div class="vital-card">
            <div class="vital-top">
              <span class="vital-icon avatar-peach">${icon("shield")}</span>
              <span class="vital-status status-good">Active</span>
            </div>
            <div class="vital-val">
              <strong>3</strong>
              <small>Free Consults</small>
            </div>
            <span class="vital-label">Tatito Care Plan</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="dash-tabs-bar">
          <button class="dash-tab-btn ${activeTab === "overview" ? "active" : ""}" data-tab="overview">${icon("compass")} Overview</button>
          <button class="dash-tab-btn ${activeTab === "appointments" ? "active" : ""}" data-tab="appointments">${icon("calendar")} Appointments</button>
          <button class="dash-tab-btn ${activeTab === "orders" ? "active" : ""}" data-tab="orders">${icon("bag")} My Orders</button>
          <button class="dash-tab-btn ${activeTab === "records" ? "active" : ""}" data-tab="records">${icon("shield")} Health Records</button>
          <button class="dash-tab-btn ${activeTab === "addresses" ? "active" : ""}" data-tab="addresses">${icon("pin")} Address Book</button>
          <button class="dash-tab-btn ${activeTab === "payments" ? "active" : ""}" data-tab="payments">${icon("file")} Payments</button>
        </div>

        <!-- Tab Content Container -->
        <div class="dash-tab-content" id="dash-tab-container">
          ${renderTabContent()}
        </div>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx)}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindNav(appRoot, ctx);

  // Bind Dashboard Tab Switches & Action Buttons
  appRoot.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      appRoot
        .querySelectorAll("[data-tab]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const container = appRoot.querySelector("#dash-tab-container");
      if (container) {
        container.innerHTML = renderTabContent();
        bindNav(appRoot, ctx);
        bindTabActions();
        if (activeTab === "appointments") loadPatientAppointments();
        if (activeTab === "payments") loadPatientPayments();
      }
    });
  });

  function bindTabActions() {
    const retryAppointments = appRoot.querySelector("#appointments-retry");
    if (retryAppointments) retryAppointments.addEventListener("click", loadPatientAppointments);
    const retryPayments = appRoot.querySelector("#payments-retry");
    if (retryPayments) retryPayments.addEventListener("click", loadPatientPayments);
    const btnGetDirections = appRoot.querySelector("#btn-get-directions");
    if (btnGetDirections)
      btnGetDirections.addEventListener("click", () =>
        showToast("Opening directions to St. Jude Health Center..."),
      );

    const btnJoinCall = appRoot.querySelector("#btn-join-call");
    if (btnJoinCall)
      btnJoinCall.addEventListener("click", () =>
        showToast("Connecting to secure video consultation..."),
      );

    const switchOrdersTab = () => {
      activeTab = "orders";
      appRoot
        .querySelectorAll("[data-tab]")
        .forEach((b) => b.classList.remove("active"));
      const ordTab = appRoot.querySelector('[data-tab="orders"]');
      if (ordTab) ordTab.classList.add("active");
      const container = appRoot.querySelector("#dash-tab-container");
      if (container) {
        container.innerHTML = renderTabContent();
        bindNav(appRoot, ctx);
        bindTabActions();

        async function loadPatientAppointments() {
          const token = getAuthToken();
          if (!token) {
            appointmentsError = "Sign in to view your appointments.";
            appointmentsLoading = false;
            const container = appRoot.querySelector("#dash-tab-container");
            if (container) container.innerHTML = renderTabContent();
            return;
          }
          appointmentsLoading = true;
          appointmentsError = "";
          const container = appRoot.querySelector("#dash-tab-container");
          if (container) container.innerHTML = renderTabContent();
          try {
            const result = await getMyDoctorAppointments(token);
            patientAppointments = Array.isArray(result?.results) ? result.results : [];
          } catch (error) {
            appointmentsError = error.message || "Unable to load your appointments.";
          } finally {
            appointmentsLoading = false;
            const currentContainer = appRoot.querySelector("#dash-tab-container");
            if (currentContainer && activeTab === "appointments") {
              currentContainer.innerHTML = renderTabContent();
              bindNav(appRoot, ctx);
              bindTabActions();
            }

            async function loadPatientPayments() {
              const token = getAuthToken();
              if (!token) {
                paymentsError = "Sign in to view your payment history.";
                paymentsLoading = false;
                const container = appRoot.querySelector("#dash-tab-container");
                if (container) container.innerHTML = renderTabContent();
                return;
              }
              paymentsLoading = true;
              paymentsError = "";
              const container = appRoot.querySelector("#dash-tab-container");
              if (container) container.innerHTML = renderTabContent();
              try {
                const result = await getMyDoctorPayments(token);
                patientPayments = Array.isArray(result?.results) ? result.results : [];
              } catch (error) {
                paymentsError = error.message || "Unable to load your payment history.";
              } finally {
                paymentsLoading = false;
                const currentContainer = appRoot.querySelector("#dash-tab-container");
                if (currentContainer && activeTab === "payments") {
                  currentContainer.innerHTML = renderTabContent();
                  bindNav(appRoot, ctx);
                  bindTabActions();
                }
              }
            }
          }
        }
      }
    };

    const btnTrackOrder = appRoot.querySelector("#btn-track-order");
    if (btnTrackOrder) btnTrackOrder.addEventListener("click", switchOrdersTab);
    const btnTrackOrder2 = appRoot.querySelector("#btn-track-order-2");
    if (btnTrackOrder2)
      btnTrackOrder2.addEventListener("click", switchOrdersTab);

    appRoot
      .querySelectorAll(".btn-dl-report")
      .forEach((b) =>
        b.addEventListener("click", () =>
          showToast("Downloading encrypted PDF report..."),
        ),
      );
    appRoot
      .querySelectorAll(".btn-share-report")
      .forEach((b) =>
        b.addEventListener("click", () =>
          showToast("Report share link copied to clipboard."),
        ),
      );

    const addAddrBtn = appRoot.querySelector("#btn-add-address");
    if (addAddrBtn)
      addAddrBtn.addEventListener("click", () =>
        showToast("Enter new delivery address details."),
      );

    const addPayBtn = appRoot.querySelector("#btn-add-payment");
    if (addPayBtn)
      addPayBtn.addEventListener("click", () =>
        showToast("Redirecting to secure payment card gateway..."),
      );
  }

  bindTabActions();
}

export function renderPrescription(appRoot, ctx) {
  const { navigate, showToast } = ctx;
  const isAuth = isAuthenticated();
  const user = getAuthUser();

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "pharmacy")}
      <main id="top" class="prescription-page-main">
        
        <!-- HERO BANNER SECTION -->
        <section class="section-wrap rx-hero-section">
          <div class="rx-hero-card">
            <div class="rx-hero-content">
              <span class="rx-hero-badge">${icon("shield")} 256-BIT ENCRYPTED & HIPAA COMPLIANT</span>
              <h1>Upload Doctor's <em class="editorial">Prescription.</em></h1>
              <p>Skip the pharmacy queue. Upload your valid doctor note and our registered clinical pharmacists will inspect batch numbers, check drug interactions, and dispatch your medicines in 30 minutes.</p>
              
              <div class="rx-hero-stats">
                <div class="rhs-item">${icon("verified")} <span>100% Authentic WHO-GMP Medicines</span></div>
                <div class="rhs-item">${icon("clock")} <span>Under 5-Min Verification</span></div>
                <div class="rhs-item">${icon("phone")} <span>Free Pharmacist Consultation</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- MAIN DUAL-COLUMN UPLOAD WORKFLOW GRID -->
        <section class="section-wrap rx-main-grid-section">
          <div class="rx-upload-grid">
            
            <!-- LEFT COLUMN: DROPZONE & FILE UPLOAD CARD -->
            <div class="rx-uploader-card">
              <div class="rx-card-header">
                <h3>${icon("file")} Upload Prescription Document</h3>
                <span>Accepts clear photos, scanned images or PDF files</span>
              </div>

              <div class="rx-dropzone-deluxe" id="rx-dropzone-page">
                <input type="file" id="rx-file-page" accept="image/*,.pdf" hidden />
                <div class="rdd-icon-wrap">${icon("file")}</div>
                <div class="rdd-text">
                  <strong>Click or Drag your prescription file here</strong>
                  <p>Supports JPG, PNG, WEBP or PDF formats (Up to 10MB per file)</p>
                </div>
                <button class="button button-primary" id="btn-browse-file">${icon("plus")} Choose File</button>
              </div>

              <!-- FILE PREVIEW CONTAINER -->
              <div class="rx-file-preview-card" id="rx-file-preview" style="display: none;">
                <div class="rfp-left">
                  <div class="rfp-icon">${icon("file")}</div>
                  <div class="rfp-info">
                    <strong id="rfp-filename">prescription_dr_smith.pdf</strong>
                    <span id="rfp-filesize">2.4 MB · Uploaded Ready</span>
                  </div>
                </div>
                <button class="button button-small button-outline rfp-remove-btn" id="btn-remove-rx" title="Remove File">${icon("x")}</button>
              </div>

              <!-- ALTERNATIVE QUICK OPTIONS -->
              <div class="rx-alt-options">
                <button class="alt-opt-btn" id="btn-camera-snap">${icon("camera")} Take Photo with Camera</button>
                <button class="alt-opt-btn" id="btn-saved-rx">${icon("bookmark")} Select from Saved Rx</button>
              </div>

              <!-- PATIENT & ORDER PREFERENCES FORM -->
              <div class="rx-preferences-form">
                <h4 class="form-section-title">${icon("user")} Patient & Delivery Info</h4>
                
                <div class="form-row-2col">
                  <div class="input-group">
                    <label>Patient Full Name*</label>
                    <input type="text" id="rx-patient-name" value="${user ? user.name : "Jane Doe"}" placeholder="Full name on prescription" />
                  </div>
                  <div class="input-group">
                    <label>Contact Phone Number*</label>
                    <input type="tel" id="rx-patient-phone" value="+1 (555) 234-5678" placeholder="Mobile for verification call" />
                  </div>
                </div>

                <div class="input-group">
                  <label>Delivery Address / Pincode*</label>
                  <input type="text" id="rx-delivery-address" value="742 Evergreen Terrace, Brooklyn, NY 11201" placeholder="Enter delivery address" />
                </div>

                <div class="input-group">
                  <label>Doctor Notes / Specific Medicine Instructions (Optional)</label>
                  <textarea id="rx-notes" rows="3" placeholder="e.g. Please send 30 days supply of Metformin 500mg as prescribed..."></textarea>
                </div>

                <!-- PREFERENCE CHECKBOXES -->
                <div class="rx-checkbox-group">
                  <label class="rx-checkbox-label">
                    <input type="checkbox" id="chk-call-first" checked />
                    <span>Call me before dispatching to confirm substitutes & pricing</span>
                  </label>
                  <label class="rx-checkbox-label">
                    <input type="checkbox" id="chk-auto-refill" />
                    <span>Enable automatic monthly auto-refill for chronic care medicines</span>
                  </label>
                  <label class="rx-checkbox-label">
                    <input type="checkbox" id="chk-pill-box" />
                    <span>Include complimentary weekly pill organizer box</span>
                  </label>
                </div>

                <button class="button button-primary full-button button-xl rx-submit-btn" id="rx-submit-order-btn">
                  ${icon("check")} Submit Prescription for Verification
                </button>
              </div>

            </div>

            <!-- RIGHT COLUMN: 3-STEP INFOGRAPHIC & GUIDELINES CARD -->
            <div class="rx-sidebar-column">
              
              <!-- 3-STEP PROCESS CARD -->
              <div class="rx-steps-card">
                <h3>${icon("compass")} 3-Step Express Order Process</h3>
                <div class="rx-steps-list">
                  <div class="rsl-step">
                    <div class="rsl-badge">01</div>
                    <div class="rsl-content">
                      <strong>Upload Doctor Prescription</strong>
                      <p>Snap a photo or upload clear image of doctor note with patient name & date.</p>
                    </div>
                  </div>

                  <div class="rsl-step">
                    <div class="rsl-badge">02</div>
                    <div class="rsl-content">
                      <strong>Pharmacist Verification Call</strong>
                      <p>Licensed clinical pharmacist verifies dosage, batch numbers & sends total invoice link.</p>
                    </div>
                  </div>

                  <div class="rsl-step">
                    <div class="rsl-badge">03</div>
                    <div class="rsl-content">
                      <strong>30-Min Doorstep Dispatch</strong>
                      <p>Cold-chain temperature sealed pouch delivered by courier with live GPS tracking.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- GUIDELINES CHECKLIST CARD -->
              <div class="rx-guidelines-card">
                <h4>${icon("shield")} Valid Prescription Checklist</h4>
                <p>To ensure quick approval, make sure your uploaded document clearly shows:</p>
                <ul class="checklist-items">
                  <li>${icon("check")} Doctor's name, degree & medical license registration number</li>
                  <li>${icon("check")} Patient's name, age, and date of consultation</li>
                  <li>${icon("check")} Legible medicine names, dosage & course duration</li>
                  <li>${icon("check")} Doctor's physical signature & clinic stamp</li>
                </ul>
              </div>

              <!-- PHARMACIST HELP CALLOUT CARD -->
              <div class="rx-help-card">
                <div class="rhc-icon">${icon("phone")}</div>
                <div>
                  <strong>Need help or don't have a doctor's note?</strong>
                  <p>Consult a certified doctor online in 15 minutes to get a digital prescription.</p>
                  <button class="button button-small button-outline full-button" data-nav="doctors" style="margin-top: 10px;">
                    ${icon("video")} Consult Doctor Now
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>

        <!-- FREQUENTLY ASKED QUESTIONS SECTION -->
        <section class="section-wrap rx-faq-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("spark")} HELP & FAQ</span>
              <h2>Prescription Upload <em class="editorial">Questions</em></h2>
            </div>
          </div>

          <div class="faq-accordion-list">
            <details class="faq-item" open>
              <summary class="faq-question">
                <strong>Can I upload a handwritten doctor's prescription note?</strong>
                <span class="faq-chevron">${icon("chevron")}</span>
              </summary>
              <div class="faq-answer">
                <p>Yes! As long as the doctor's handwriting, medicine names, dosage, patient name, and doctor signature are legible in the photo, our licensed pharmacists can process it.</p>
              </div>
            </details>

            <details class="faq-item">
              <summary class="faq-question">
                <strong>How long does prescription verification take?</strong>
                <span class="faq-chevron">${icon("chevron")}</span>
              </summary>
              <div class="faq-answer">
                <p>Prescription verification usually takes under 5 minutes. Our team of registered clinical pharmacists operates 24/7. Once verified, you'll receive an SMS/WhatsApp notification with the medicine breakdown and order total.</p>
              </div>
            </details>

            <details class="faq-item">
              <summary class="faq-question">
                <strong>What if a prescribed medicine is out of stock?</strong>
                <span class="faq-chevron">${icon("chevron")}</span>
              </summary>
              <div class="faq-answer">
                <p>If an exact brand is unavailable, our pharmacist will call you with doctor-approved bio-equivalent generic substitutes from WHO-GMP certified manufacturers (e.g. Pfizer, GSK, Cipla) at equal or lower prices.</p>
              </div>
            </details>
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "pharmacy")}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindNav(appRoot, ctx);

  // Interactive File Upload Logic
  const dropzone = appRoot.querySelector("#rx-dropzone-page");
  const fileInput = appRoot.querySelector("#rx-file-page");
  const browseBtn = appRoot.querySelector("#btn-browse-file");
  const previewCard = appRoot.querySelector("#rx-file-preview");
  const filenameEl = appRoot.querySelector("#rfp-filename");
  const filesizeEl = appRoot.querySelector("#rfp-filesize");
  const removeBtn = appRoot.querySelector("#btn-remove-rx");
  const submitBtn = appRoot.querySelector("#rx-submit-order-btn");

  if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-active");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("drag-active");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-active");
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (previewCard && filenameEl && filesizeEl) {
      filenameEl.textContent = file.name;
      filesizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB · Uploaded & Verified Ready`;
      previewCard.style.display = "flex";
      showToast("Prescription attached. Fill out preferences & submit.");
    }
  }

  if (removeBtn && fileInput && previewCard) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.value = "";
      previewCard.style.display = "none";
      showToast("Prescription attachment removed.");
    });
  }

  const cameraBtn = appRoot.querySelector("#btn-camera-snap");
  if (cameraBtn) {
    cameraBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }

  const savedRxBtn = appRoot.querySelector("#btn-saved-rx");
  if (savedRxBtn) {
    savedRxBtn.addEventListener("click", () => {
      showToast("Loaded active prescription from your Tatito Health vault.");
      if (previewCard && filenameEl && filesizeEl) {
        filenameEl.textContent = "dr_johnson_cardio_rx_2026.pdf";
        filesizeEl.textContent = "1.8 MB · Vault Prescription";
        previewCard.style.display = "flex";
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const pName = appRoot.querySelector("#rx-patient-name")?.value;
      if (!pName) {
        showToast("Please enter patient name.");
        return;
      }
      showToast(
        "Prescription submitted! Our pharmacist will call you in 5 minutes.",
      );
      setTimeout(() => {
        navigate("pharmacy");
      }, 1500);
    });
  }
}

export function renderArticle(appRoot, ctx) {
const { navigate, currentParams } = ctx;
  const a = articles.find((a) => a.id === currentParams.id);
  if (!a) {
    navigate("home");
    return;
  }
  appRoot.innerHTML = `<div class="app-shell">${sharedHeader(ctx)}<main id="top" class="section-wrap"><div class="article-page"><span class="article-category-large">${a.category}</span><h1>${a.title}</h1><span class="article-meta-large">${a.author} · ${a.date}</span><div class="article-body"><p>Regular health check-ups are vital for a healthy life because they help in detecting diseases at the earliest, allowing for timely treatment. At Tatito Health+, we believe preventive care is the foundation of long-term wellness.</p><h3>Why early detection matters</h3><p>Many health conditions develop silently over time. Regular screenings and lab tests can catch warning signs before symptoms appear, giving you and your care team the best chance to address issues early.</p><h3>What you can do</h3><p>Schedule annual check-ups, maintain a balanced diet, stay physically active, and don't ignore persistent symptoms. Your health is your most valuable asset — invest in it wisely.</p></div></div></main>${sharedFooter(ctx)}${sharedMobileNav(ctx)}</div><div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>`;
  bindNav(appRoot, ctx);
}

export function renderInternships(appRoot, ctx) {
  const { navigate, showToast } = ctx;
  const isAuth = isAuthenticated();
  const user = getAuthUser();

  let activeCategory = "all";
  let activeDuration = "all";
  let searchQuery = "";

  const academicPartners = [
    { name: "Johns Hopkins Medicine", badge: "Clinical Research Partner" },
    { name: "Stanford Health AI Hub", badge: "AI & Data Science Co-Lab" },
    { name: "Mayo Clinic Labs", badge: "Pathology Quality Network" },
    { name: "Harvard Teaching Hospitals", badge: "Fellowship Accreditation" },
    { name: "Apollo Hospitals", badge: "Global Clinical Rotations" },
  ];

  const faqs = [
    {
      q: "Who is eligible to apply for Tatito Health+ Internships?",
      a: "Final-year medical students (MBBS/MD/PharmD), clinical residents, health informatics postgraduates, and software/data science engineers passionate about digital health tech.",
    },
    {
      q: "Are all internship positions paid with a monthly stipend?",
      a: "Yes, 100%. Every intern and fellow receives a competitive monthly stipend ranging from ₹21,000 to ₹28,000/month along with CME/NABL accredited certifications.",
    },
    {
      q: "Can international medical candidates apply for remote AI tracks?",
      a: "Absolutely! Our AI Clinical Diagnostics, Telemedicine Operations, and Health Product tracks support 100% remote digital participation from anywhere worldwide.",
    },
    {
      q: "What certificates and credentials are awarded upon completion?",
      a: "Fellows receive a CME-accredited Diploma, NABL/WHO-GMP verified clinical rotation certificate, and official attending physician letters of recommendation for residency applications.",
    },
  ];

  function getFilteredPrograms() {
    let list = internshipPrograms;
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeDuration !== "all") {
      list = list.filter((p) => p.duration === activeDuration);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    return list;
  }

  function renderProgramsList() {
    const list = getFilteredPrograms();
    if (list.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("search")}</div>
          <h3>No internship tracks found matching your filters</h3>
          <p>Try resetting category filters or searching for another clinical specialty.</p>
          <button class="button button-outline" id="btn-reset-int-filters">Reset All Filters</button>
        </div>
      `;
    }

    return list
      .map(
        (p) => `
      <article class="intern-program-card" data-program-id="${p.id}">
        <div class="ipc-head">
          <span class="ipc-badge pcd-badge-${p.color}">${p.badge}</span>
          <span class="ipc-spots">${icon("user")} ${p.spotsLeft} Open Positions Left</span>
        </div>

        <div class="ipc-body">
          <div class="ipc-partner-badge">${icon("building")} ${p.partner}</div>
          <h3 class="ipc-title">${p.title}</h3>
          <p class="ipc-desc">${p.desc}</p>
          
          <div class="ipc-meta-grid">
            <div class="ipc-meta-item">
              <span class="imm-label">Duration & Commitment</span>
              <strong class="imm-val">${icon("clock")} ${p.duration} · ${p.commitment}</strong>
            </div>
            <div class="ipc-meta-item">
              <span class="imm-label">Monthly Stipend</span>
              <strong class="imm-val text-success">${icon("spark")} ${p.stipend}</strong>
            </div>
          </div>

          <div class="ipc-skills-list">
            ${p.skills.map((s) => `<span class="skill-chip">${s}</span>`).join("")}
          </div>
        </div>

        <div class="ipc-footer">
          <button class="button button-small button-outline btn-view-syllabus" data-program-id="${p.id}">
            ${icon("file")} View Syllabus
          </button>
          <button class="button button-small button-primary btn-apply-track" data-program-id="${p.id}">
            ${icon("check")} Apply for Track
          </button>
        </div>
      </article>
    `,
      )
      .join("");
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      ${sharedHeader(ctx, "internships")}
      <main id="top" class="internships-page-main">
        
        <!-- HERO BANNER SECTION -->
        <section class="section-wrap intern-hero-section">
          <div class="intern-hero-card">
            <div class="intern-hero-content">
              <span class="eyebrow-tag">${icon("spark")} 01 / GLOBAL ACADEMIC & CLINICAL ECOSYSTEM</span>
              <h1>Shape the Future of <br><em class="editorial">Healthcare Tech.</em></h1>
              <p>Join Tatito Health+ Clinical & Technology Internships. Work alongside world-class physicians, AI medical researchers, and clinical operations leaders to build next-generation patient care infrastructure.</p>

              <div class="intern-hero-ctas">
                <button class="button button-primary button-xl" id="hero-btn-apply">${icon("spark")} Apply for Fellowship 2026</button>
                <button class="button button-light button-xl" id="hero-btn-syllabus">${icon("file")} Download Program Guide</button>
              </div>

              <!-- TRUST STATS ROW -->
              <div class="intern-trust-stats-grid">
                <div class="stat-item">
                  <strong>12,500+</strong>
                  <span>Medical Graduates Mentored</span>
                </div>
                <div class="stat-item">
                  <strong>98.4%</strong>
                  <span>Career Placement Rate</span>
                </div>
                <div class="stat-item">
                  <strong>40+</strong>
                  <span>Global Hospital Partners</span>
                </div>
                <div class="stat-item">
                  <strong>100%</strong>
                  <span>Stipend & CME Certified</span>
                </div>
              </div>
            </div>

            <div class="intern-hero-graphic">
              <div class="graphic-fellowship-seal">
                <div class="gfs-icon">${icon("shield")}</div>
                <span class="gfs-title">CLINICAL EXCELLENCE</span>
                <span class="gfs-tag">2026 ACADEMIC FELLOWSHIP</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ACADEMIC PARTNERS STRIP -->
        <section class="section-wrap">
          <div class="academic-partners-strip">
            <span class="aps-label">${icon("verified")} ACCREDITED CLINICAL & ACADEMIC PARTNERS:</span>
            <div class="aps-grid">
              ${academicPartners
                .map(
                  (ap) => `
                <div class="partner-badge-card">
                  <strong>${ap.name}</strong>
                  <span>${ap.badge}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </section>

        <!-- CATEGORIES & FILTERS BAR -->
        <section class="section-wrap intern-filter-section">
          <div class="intern-filter-card">
            <div class="ifc-left">
              <div class="intern-search-input">
                ${icon("search")}
                <input id="intern-search" placeholder="Search tracks by skill, e.g., PyTorch, DICOM, Pharmacology..." value="${searchQuery}" />
              </div>
              
              <div class="intern-category-pills">
                <button class="cat-pill ${activeCategory === "all" ? "active" : ""}" data-cat="all">All Fellowship Tracks</button>
                <button class="cat-pill ${activeCategory === "Clinical Medicine" ? "active" : ""}" data-cat="Clinical Medicine">Clinical Rotations</button>
                <button class="cat-pill ${activeCategory === "Health AI & Data Science" ? "active" : ""}" data-cat="Health AI & Data Science">Health AI & Data</button>
                <button class="cat-pill ${activeCategory === "Telemedicine & Digital Health" ? "active" : ""}" data-cat="Telemedicine & Digital Health">Telehealth & Pharma</button>
                <button class="cat-pill ${activeCategory === "Pathology & Diagnostics" ? "active" : ""}" data-cat="Pathology & Diagnostics">Pathology Labs</button>
              </div>
            </div>

            <div class="ifc-right">
              <select id="intern-duration-select" class="pharm-select">
                <option value="all">All Durations</option>
                <option value="3 Months">3 Months Tracks</option>
                <option value="4 Months">4 Months Tracks</option>
                <option value="6 Months">6 Months Fellowships</option>
              </select>
            </div>
          </div>
        </section>

        <!-- PROGRAM DIRECTORY GRID -->
        <section class="section-wrap intern-directory-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("spark")} 02 / OPEN FELLOWSHIP TRACKS</span>
              <h2>Explore Clinical & Tech <em class="editorial">Programs</em></h2>
              <p class="section-subtext">Hands-on mentorship with leading attending physicians, AI engineers & diagnostic lab directors.</p>
            </div>
          </div>

          <div class="intern-programs-grid" id="intern-programs-grid">
            ${renderProgramsList()}
          </div>
        </section>

        <!-- 3-STEP SELECTION JOURNEY INFOGRAPHIC -->
        <section class="section-wrap intern-steps-section">
          <div class="intern-steps-card">
            <div class="section-heading">
              <div>
                <span class="section-kicker">${icon("compass")} 03 / SELECTION WORKFLOW</span>
                <h2>How the Fellowship Application <em class="editorial">Works</em></h2>
              </div>
            </div>

            <div class="steps-grid">
              <div class="step-card">
                <span class="step-badge">STEP 01</span>
                <div class="step-icon-wrap">${icon("file")}</div>
                <h4>Online Application & Profile</h4>
                <p>Submit your academic transcripts, CV/Resume, and statement of clinical intent.</p>
              </div>

              <div class="step-card">
                <span class="step-badge">STEP 02</span>
                <div class="step-icon-wrap">${icon("check")}</div>
                <h4>Clinical Case Review</h4>
                <p>Participate in a 30-minute interactive clinical scenario review with attending faculty.</p>
              </div>

              <div class="step-card">
                <span class="step-badge">STEP 03</span>
                <div class="step-icon-wrap">${icon("spark")}</div>
                <h4>Project Placement & Stipend</h4>
                <p>Onboard with a dedicated clinical mentor, receive your hardware kit & monthly stipend.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- FELLOW TESTIMONIALS GRID -->
        <section class="section-wrap intern-testimonials-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("heart")} ALUMNI TESTIMONIALS</span>
              <h2>What Our Clinical Fellows <em class="editorial">Say</em></h2>
            </div>
          </div>

          <div class="intern-reviews-grid">
            <div class="pharm-review-card">
              <div class="pr-stars">★★★★★</div>
              <p>"My 6-month clinical AI rotation at Tatito Health+ gave me hands-on experience building diagnostic prediction models now deployed across 4,000+ physician portals. Truly transformative!"</p>
              <div class="pr-author">
                <strong>Dr. Elena Rostova, MD</strong>
                <span>Stanford Health AI Fellow · Class of '25</span>
              </div>
            </div>

            <div class="pharm-review-card">
              <div class="pr-stars">★★★★★</div>
              <p>"Shadowing attending cardiologists during virtual urgent care calls gave me incredible differential diagnosis confidence before entering my residency."</p>
              <div class="pr-author">
                <strong>Marcus Vance, MBBS</strong>
                <span>Clinical Rotation Fellow · Brooklyn Academic Network</span>
              </div>
            </div>
          </div>
        </section>

        <!-- FREQUENTLY ASKED QUESTIONS ACCORDION -->
        <section class="section-wrap intern-faq-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">${icon("spark")} HELP & FREQUENTLY ASKED QUESTIONS</span>
              <h2>Fellowship <em class="editorial">Help Center</em></h2>
            </div>
          </div>

          <div class="faq-accordion-list">
            ${faqs
              .map(
                (faq, idx) => `
              <details class="faq-item" ${idx === 0 ? "open" : ""}>
                <summary class="faq-question">
                  <strong>${faq.q}</strong>
                  <span class="faq-chevron">${icon("chevron")}</span>
                </summary>
                <div class="faq-answer">
                  <p>${faq.a}</p>
                </div>
              </details>
            `,
              )
              .join("")}
          </div>
        </section>

      </main>
      ${sharedFooter(ctx)}
      ${sharedMobileNav(ctx, "internships")}
    </div>

    <!-- APPLICATION MODAL POPUP -->
    <div class="modal-overlay" id="intern-app-modal" style="display: none;">
      <div class="modal-card intern-modal-content">
        <button class="modal-close-btn" id="btn-close-int-modal" title="Close Modal">${icon("x")}</button>
        
        <div class="intern-modal-header">
          <div class="imh-top-bar">
            <span class="eyebrow-tag">${icon("spark")} 2026 FELLOWSHIP APPLICATION</span>
            <span class="imh-security-tag">${icon("shield")} 256-BIT SSL ENCRYPTED</span>
          </div>
          <h3 id="modal-track-title">Apply for Clinical & Tech Fellowship</h3>
          <p>Submit your details to apply for direct mentorship, clinical rotations & monthly stipend placement.</p>
        </div>

        <form class="modal-form intern-modal-form" id="form-intern-apply">
          
          <div class="form-section-head">
            <span class="fsh-step">STEP 01</span>
            <strong>Applicant Personal & Academic Profile</strong>
          </div>

          <div class="input-group">
            <label>Full Name*</label>
            <div class="input-with-icon">
              <span class="field-icon">${icon("user")}</span>
              <input type="text" id="ia-name" required value="${user ? user.name : ""}" placeholder="Enter your full name as on medical license" />
            </div>
          </div>

          <div class="form-row-2col">
            <div class="input-group">
              <label>Email Address*</label>
              <div class="input-with-icon">
                <span class="field-icon">${icon("file")}</span>
                <input type="email" id="ia-email" required value="${user ? user.email : ""}" placeholder="name@university.edu" />
              </div>
            </div>
            <div class="input-group">
              <label>Phone Number*</label>
              <div class="input-with-icon">
                <span class="field-icon">${icon("phone")}</span>
                <input type="tel" id="ia-phone" required placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>

          <div class="form-row-2col">
            <div class="input-group">
              <label>University / Teaching Hospital*</label>
              <div class="input-with-icon">
                <span class="field-icon">${icon("building")}</span>
                <input type="text" id="ia-school" required placeholder="e.g. Johns Hopkins / NYU Medical" />
              </div>
            </div>
            <div class="input-group">
              <label>Year of Study / Graduation Status*</label>
              <select id="ia-year" class="pharm-select select-styled">
                <option value="Final Year Student">Final Year Student (2026)</option>
                <option value="Clinical Resident">Clinical Resident / MD Fellow</option>
                <option value="Postgraduate / Master">Postgraduate / MSc Bioengineering</option>
                <option value="Recent Graduate">Recent Graduate (2025/2026)</option>
              </select>
            </div>
          </div>

          <div class="form-section-head" style="margin-top: 10px;">
            <span class="fsh-step">STEP 02</span>
            <strong>Clinical Intent & Resume Document</strong>
          </div>

          <div class="input-group">
            <label>Statement of Clinical Intent (Career goals & focus area)</label>
            <textarea id="ia-statement" rows="3" placeholder="Describe your interest in healthcare technology, AI diagnostic models, or clinical rotations..."></textarea>
          </div>

          <div class="input-group">
            <label>Upload CV / Medical Resume (PDF, DOC or DOCX)</label>
            <div class="cv-dropzone-box" id="ia-cv-dropzone">
              <input type="file" id="ia-cv-file" accept=".pdf,.doc,.docx" hidden />
              <div class="cdb-icon">${icon("file")}</div>
              <div class="cdb-text">
                <strong id="cdb-title">Click or Drag your Resume / CV file here</strong>
                <span id="cdb-sub">Supports PDF, DOC or DOCX (Max 10MB)</span>
              </div>
              <button type="button" class="button button-small button-outline" id="btn-browse-cv">${icon("plus")} Choose File</button>
            </div>
          </div>

          <div class="modal-form-footer">
            <span class="mff-security">${icon("shield")} 100% confidential transmission to Academic Review Committee</span>
            <button type="submit" class="button button-primary full-button button-xl">
              ${icon("check")} Submit Official Fellowship Application
            </button>
          </div>

        </form>
      </div>
    </div>
  `;

  bindNav(appRoot, ctx);

  // Event Listeners for Filters & Modals
  const gridContainer = appRoot.querySelector("#intern-programs-grid");
  const searchInput = appRoot.querySelector("#intern-search");
  const durationSelect = appRoot.querySelector("#intern-duration-select");
  const modal = appRoot.querySelector("#intern-app-modal");
  const closeModalBtn = appRoot.querySelector("#btn-close-int-modal");
  const modalTrackTitle = appRoot.querySelector("#modal-track-title");
  const applyForm = appRoot.querySelector("#form-intern-apply");

  function updateGrid() {
    if (gridContainer) {
      gridContainer.innerHTML = renderProgramsList();
      bindProgramEvents();
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      updateGrid();
    });
  }

  if (durationSelect) {
    durationSelect.addEventListener("change", (e) => {
      activeDuration = e.target.value;
      updateGrid();
    });
  }

  appRoot.querySelectorAll(".cat-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      appRoot
        .querySelectorAll(".cat-pill")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.cat;
      updateGrid();
    });
  });

  function openModal(trackTitle = "Fellowship Program 2026") {
    if (modal) {
      if (modalTrackTitle)
        modalTrackTitle.textContent = `Apply for ${trackTitle}`;
      modal.style.display = "flex";
    }
  }

  function closeModal() {
    if (modal) modal.style.display = "none";
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  const heroApplyBtn = appRoot.querySelector("#hero-btn-apply");
  if (heroApplyBtn)
    heroApplyBtn.addEventListener("click", () =>
      openModal("Clinical & Tech Fellowship"),
    );

  const heroSyllabusBtn = appRoot.querySelector("#hero-btn-syllabus");
  if (heroSyllabusBtn) {
    heroSyllabusBtn.addEventListener("click", () => {
      showToast("Downloading 2026 Clinical Fellowship Curriculum PDF...");
    });
  }

  function bindProgramEvents() {
    appRoot.querySelectorAll(".btn-apply-track").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prog = internshipPrograms.find(
          (p) => p.id === btn.dataset.programId,
        );
        openModal(prog ? prog.title : "Fellowship Program");
      });
    });

    appRoot.querySelectorAll(".btn-view-syllabus").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prog = internshipPrograms.find(
          (p) => p.id === btn.dataset.programId,
        );
        showToast(
          `Opened syllabus for ${prog ? prog.title : "Selected Track"}.`,
        );
      });
    });

    const resetBtn = appRoot.querySelector("#btn-reset-int-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        activeCategory = "all";
        activeDuration = "all";
        searchQuery = "";
        if (searchInput) searchInput.value = "";
        if (durationSelect) durationSelect.value = "all";
        appRoot
          .querySelectorAll(".cat-pill")
          .forEach((b) => b.classList.remove("active"));
        const allCatBtn = appRoot.querySelector('.cat-pill[data-cat="all"]');
        if (allCatBtn) allCatBtn.classList.add("active");
        updateGrid();
      });
    }
  }

  bindProgramEvents();

  // Interactive CV File Dropzone Logic
  const cvDropzone = appRoot.querySelector("#ia-cv-dropzone");
  const cvFileInput = appRoot.querySelector("#ia-cv-file");
  const browseCvBtn = appRoot.querySelector("#btn-browse-cv");
  const cdbTitle = appRoot.querySelector("#cdb-title");
  const cdbSub = appRoot.querySelector("#cdb-sub");

  if (browseCvBtn && cvFileInput) {
    browseCvBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cvFileInput.click();
    });
  }

  if (cvDropzone && cvFileInput) {
    cvDropzone.addEventListener("click", () => cvFileInput.click());

    cvDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      cvDropzone.classList.add("drag-active");
    });

    cvDropzone.addEventListener("dragleave", () => {
      cvDropzone.classList.remove("drag-active");
    });

    cvDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      cvDropzone.classList.remove("drag-active");
      if (e.dataTransfer.files.length > 0) {
        handleCvFileSelect(e.dataTransfer.files[0]);
      }
    });

    cvFileInput.addEventListener("change", () => {
      if (cvFileInput.files.length > 0) {
        handleCvFileSelect(cvFileInput.files[0]);
      }
    });
  }

  function handleCvFileSelect(file) {
    if (cdbTitle && cdbSub) {
      cdbTitle.textContent = `Attached: ${file.name}`;
      cdbSub.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for submission`;
      if (cvDropzone) cvDropzone.style.borderColor = "var(--success)";
      showToast(`Attached CV file: ${file.name}`);
    }
  }

  if (applyForm) {
    applyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = appRoot.querySelector("#ia-name")?.value;
      showToast(
        `Thank you ${name}! Your application has been submitted for review.`,
      );
      closeModal();
    });
  }
}

async function detectSiteLocation(appRoot) {
  const locationElement = appRoot.querySelector('#site-location-text')

  if (!locationElement) return

  try {
    const savedLocation = localStorage.getItem('thp_location')

    if (savedLocation) {
      locationElement.textContent = savedLocation
    }

    const response = await fetch('https://ipapi.co/json/')

    if (!response.ok) {
      throw new Error('Location request failed')
    }

    const data = await response.json()

    if (data.city) {
      const location = data.region
        ? `${data.city}, ${data.region}`
        : data.city

      locationElement.textContent = location

      localStorage.setItem('thp_location', location)
    }
  } catch (error) {
    console.warn('Unable to detect user location:', error)

    locationElement.textContent = 'Location unavailable'
  }
}