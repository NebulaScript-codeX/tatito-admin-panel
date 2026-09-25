import {
  icons,
  icon,
  avatar,
  showToast,
  premiumFooter,
  mobileBottomNav,
  accountDrawerHTML,
  openAccountDrawer,
  closeAccountDrawer,
} from "./ui.js";
import { categories, products, labTests, articles, doctors } from "./data.js";
import {
  getDoctors as cachedDoctors,
  feeText,
  ensureLive,
} from "./doctorCache.js";
import {
  isAuthenticated,
  getAuthUser,
  requireAuth,
  logoutUser,
} from "./auth.js";
import { openAuthModal } from "./authPages.js";

function header(navigate, getCartCount) {
  const navItems = [
    { label: "Home", page: "home", icon: "home" },
    { label: "Doctors", page: "doctors", icon: "doctorCare" },
    { label: "Pharmacy", page: "pharmacy", icon: "bag" },
    { label: "Lab Tests", page: "labtests", icon: "flask" },
    { label: "Health Plans", page: "plans", icon: "shield" },
    { label: "Health Records", page: "records", icon: "file" },
    { label: "Internships", page: "internships", icon: "calendar" },
    { label: "Track Your Orders", page: "trackyourorders", icon: "clock" },
  ];
  const isAuth = isAuthenticated();
  const user = getAuthUser();

  return `
    <div class="sticky-header-group">
      <div class="announcement"><span class="announcement-dot"></span> Care that moves with you <span class="announcement-divider"></span><span>24/7 virtual care & emergency support ready</span></div>
      <header class="site-header"><div class="site-header-inner">
        <a class="brand" data-nav="home" aria-label="Tatito Health+ home">
          <span class="brand-mark">${icon("heart")}</span>
          <span><strong>Tatito</strong><em>Health+</em></span>
        </a>
        <div class="header-search-bar">${icon("search")}<input id="global-search" placeholder="Search doctors, medicines, lab tests, imaging..." /><button data-search-btn>Search</button></div>
        <div class="header-actions">
          <button class="location-button">${icon("pin")} <span>Brooklyn, NY</span> ${icon("chevron")}</button>
          <button class="icon-button" aria-label="Notifications">${icon("bell")}<span class="notification-dot"></span></button>
          <button class="cart-button" data-nav="cart">${icon("bag")}<span>Cart</span><span class="cart-count">${getCartCount()}</span></button>
          ${
            isAuth
              ? `
            <button class="profile-button">${avatar(user ? user.initials : "JD", "teal")}<span>${user ? user.name.split(" ")[0] : "User"}</span>${icon("chevron")}</button>
          `
              : `
            <button class="auth-nav-button auth-login-button auth-modal-trigger" data-auth-mode="login">${icon("user")}<span>Login</span></button>
            <button class="auth-nav-button auth-register-button auth-modal-trigger" data-auth-mode="register"><span>Register</span></button>
          `
          }
          <button class="mobile-menu" id="home-mobile-menu" aria-label="Open menu">${icon("menu")}</button>
        </div>
      </div></header>
<nav class="sub-nav"><div class="sub-nav-inner">${navItems.map((n) => `<a data-nav="${n.page}">${n.icon ? icon(n.icon) : ""}${n.label}</a>`).join("")}
        <button class="floating-consult-fab" id="fab-instant-consult">
          <span class="fab-icon">${icon("phone")}</span>
          <span>Instant Consult 24/7</span>
        </button>
      </div></nav>
    </div>
    ${accountDrawerHTML(getAuthUser())}
  `;
}

function productCard(p, ctx) {
  const discount = Math.round((1 - p.price / p.mrp) * 100);
  const wishlist = new Set(
    JSON.parse(localStorage.getItem("thp_wishlist") || "[]"),
  );
  const isWishlisted = wishlist.has(p.id);
  const cartItem =
    ctx && ctx.cartState ? ctx.cartState.find((i) => i.id === p.id) : null;

  return `
    <article class="product-card" data-product="${p.id}">
      <div class="product-image">
        <span class="product-avatar avatar-${p.color}">${p.initials}</span>
        ${discount > 0 ? `<span class="product-discount">-${discount}% OFF</span>` : ""}
        ${p.rx ? '<span class="product-rx">Rx Required</span>' : ""}
        ${p.stock === "Low Stock" ? '<span class="product-low-stock">Low Stock</span>' : ""}
        <button class="wishlist-btn ${isWishlisted ? "active" : ""}" data-wishlist="${p.id}" aria-label="Save to Wishlist">
          ${icon("heart")}
        </button>
      </div>
      <div class="product-info">
        <div class="product-manufacturer-row">
          <span class="product-manufacturer">${p.manufacturer}</span>
          <button class="quickview-trigger-link" data-quick-nav="${p.id}">Quick View</button>
        </div>
        <h4 class="product-name">${p.name}</h4>
        <span class="product-pack">${p.pack}</span>
        <div class="product-rating">★ ${p.rating} <span>(${p.reviews} reviews)</span></div>
        <div class="product-price-row">
          <div class="product-price">
            <strong>$${p.price.toFixed(2)}</strong>
            ${discount > 0 ? `<s>$${p.mrp.toFixed(2)}</s>` : ""}
          </div>
          ${
            cartItem
              ? `
            <div class="card-qty-controller">
              <button data-qty-dec="${p.id}" aria-label="Decrease quantity">−</button>
              <span>${cartItem.qty}</span>
              <button data-qty-inc="${p.id}" aria-label="Increase quantity">+</button>
            </div>
          `
              : `
            <button class="add-to-cart-btn" data-add="${p.id}">${icon("plus")} Add</button>
          `
          }
        </div>
      </div>
    </article>
  `;
}

function labTestCard(t, ctx) {
  const discount = Math.round((1 - t.price / t.mrp) * 100);
  return `<article class="test-card" data-test="${t.id}"><div class="test-card-icon avatar-${t.color}">${t.initials}</div><h4>${t.name}</h4><span class="test-meta">${t.tests} tests included</span><span class="test-report">${icon("check")} ${t.reportTime} report</span><div class="test-price"><strong>₹${t.price}</strong><s>₹${t.mrp}</s><span class="test-discount">${discount}% off</span></div><button class="button button-small button-primary full-button" data-book-test="${t.id}">Book test ${icon("arrow")}</button></article>`;
}

function articleCard(a) {
  return `<article class="article-card" data-article="${a.id}"><div class="article-icon avatar-${a.color}">${a.initials}</div><div class="article-info"><span class="article-category">${a.category}</span><h4>${a.title}</h4><span class="article-meta">${a.author} · ${a.date}</span></div></article>`;
}

function doctorCard(d) {
  const fee = feeText(d);
  const feeCell = fee
    ? `<span class="consultation-fee">${fee}</span>`
    : `<span class="consultation-fee consultation-fee-masked" title="Log in to view the consultation fee">₹•••</span>`;
  const offer = String(d.offerText || "").trim();
  const offerRow = offer
    ? `<div class="doctor-offer-row">${icon("spark")} <span>${offer}</span></div>`
    : "";
  const photo = d.photo
    ? `<img class="doctor-card-photo" src="${d.photo}" alt="${d.name}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${avatar(d.initials, d.color, "doctor-avatar doctor-photo-fallback")}`
    : avatar(d.initials, d.color, "doctor-avatar");
  return `<article class="doctor-card" data-doctor="${d.id}"><div class="doctor-card-top">${photo}</div><div class="doctor-card-content"><div class="doc-header-row"><h3>${d.name}</h3><span class="doc-verified-badge">${icon("verified")} Verified</span></div><span class="doctor-spec-chip">${d.specialty}</span><p>${d.detail}</p><span class="doctor-location">${icon("building")} ${d.location}</span>${offerRow}<div class="doctor-bottom"><div class="doctor-fee-cell"><span class="consultation-fee-label">Consulting Fee</span>${feeCell}<small>no hidden charges</small></div><div class="next-slot"><small>${icon("clock")} Next Slot</small><strong>${d.next}</strong></div></div><button class="button button-small button-outline full-button" data-doctor="${d.id}">Book appointment ${icon("arrow")}</button></div></article>`;
}

function bindDoctorCards(appRoot, ctx) {
  appRoot.querySelectorAll("[data-doctor]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-auth-fee]") || e.target.closest(".fee-login-link")) {
        e.stopPropagation();
        return;
      }
      navigate("doctor", { id: el.dataset.doctor });
    });
  });
}

export function renderHome(appRoot, ctx) {
  const { navigate, getCartCount, addToCart } = ctx;
  const trendingProducts = products.slice(0, 12);
  const topTests = labTests.slice(0, 6);

  appRoot.innerHTML = `
    <div class="app-shell">
      ${header(navigate, getCartCount)}
      <main id="top">
        <!-- Cinematic Hero Banner Section -->
        <section class="hero-banner-section">
          <div class="hero-banner section-wrap">
            <div class="hero-banner-grid">
              <div class="hero-banner-left">
                <div class="hero-status-pills">
                  <span class="hero-kicker">${icon("spark")} 01 / DIGITAL HEALTH ECOSYSTEM</span>
                  <span class="hero-live-pill"><span class="hero-live-dot"></span> 24/7 Virtual Care Active</span>
                </div>
                <h1>Complete healthcare,<br><span>one <em class="editorial">platform.</em></span></h1>
                <p>Consult top doctors, order authentic medicines, book lab tests & imaging, and manage your health records — all in one connected super-app.</p>
                
                <div class="hero-banner-search">
                  ${icon("search")}
                  <input id="home-search" placeholder="Search doctors, medicines, lab tests, imaging, conditions..." />
                  <button class="button button-primary" data-search-btn>Search</button>
                </div>

                <div class="hero-search-tags">
                  <span class="hst-label">Popular Searches:</span>
                  <button class="hst-tag" data-tag-search="Amoxilin">Amoxilin</button>
                  <button class="hst-tag" data-tag-search="Vitamin D3">Vitamin D3</button>
                  <button class="hst-tag" data-tag-search="HbA1c">HbA1c</button>
                  <button class="hst-tag" data-tag-search="Thermometer">Thermometer</button>
                </div>
                
                <div class="hero-quick-links">
                  <button data-nav="doctors">${icon("video")} Find Doctor</button>
                  <button data-nav="pharmacy">${icon("bag")} Order Medicines</button>
                  <button data-nav="labtests">${icon("flask")} Book Diagnostics</button>
                  <button data-nav="emergency">${icon("phone")} 24/7 Emergency</button>
                </div>
              </div>
              
              <div class="hero-banner-right">
                <div class="hero-visual-card">
                  <div class="hero-visual-head">
                    <span class="hero-badge-pill">${icon("verified")} WHO-GMP Certified</span>
                    <span class="hero-express-badge">${icon("clock")} 30-Min Dispatch</span>
                  </div>
                  <div class="hero-visual-body">
                    <div class="hero-stat-box">
                      <span class="hero-stat-icon">${icon("stethoscope")}</span>
                      <div><strong>1,200+</strong><span>Verified Specialists</span></div>
                    </div>
                    <div class="hero-stat-box">
                      <span class="hero-stat-icon">${icon("pills")}</span>
                      <div><strong>30-Min Express</strong><span>Authentic Medicines</span></div>
                    </div>
                    <div class="hero-stat-box">
                      <span class="hero-stat-icon">${icon("flask")}</span>
                      <div><strong>10-Hour Guarantee</strong><span>Lab Test Reports</span></div>
                    </div>
                  </div>
                  <div class="hero-visual-foot">
                    <button class="button button-small button-outline full-button" data-nav="records">${icon("shield")} View Encrypted Health Records</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Control Center / Quick Health Actions Grid -->
        <section class="section-wrap quick-actions-section">
          <div class="quick-actions">
            <button class="quick-action-tile" data-nav="doctors"><span class="qa-icon qa-mint">${icon("video")}</span><div><strong>Consult Doctor</strong><span>Online & in-person</span></div></button>
            <button class="quick-action-tile" data-nav="pharmacy"><span class="qa-icon qa-peach">${icon("bag")}</span><div><strong>Buy Medicines</strong><span>30-min express delivery</span></div></button>
            <button class="quick-action-tile" data-nav="labtests"><span class="qa-icon qa-blue">${icon("flask")}</span><div><strong>Book Lab Tests</strong><span>Sample home collection</span></div></button>
            <button class="quick-action-tile" data-nav="prescription"><span class="qa-icon qa-lavender">${icon("file")}</span><div><strong>Upload Rx</strong><span>Snap & order medicines</span></div></button>
            <button class="quick-action-tile" data-nav="labtests"><span class="qa-icon qa-mint">${icon("ecg")}</span><div><strong>X-Ray & Imaging</strong><span>CT Scan, MRI & Radiology</span></div></button>
            <button class="quick-action-tile" data-nav="records"><span class="qa-icon qa-blue">${icon("shield")}</span><div><strong>Health Records</strong><span>Encrypted history & reports</span></div></button>
            <button class="quick-action-tile" data-nav="plans"><span class="qa-icon qa-peach">${icon("spark")}</span><div><strong>Health Plans</strong><span>Family care subscriptions</span></div></button>
            <button class="quick-action-tile" data-nav="emergency"><span class="qa-icon qa-lavender">${icon("phone")}</span><div><strong>24/7 Emergency</strong><span>Urgent care hotline</span></div></button>
          </div>
        </section>

        <!-- Prescription Upload Feature Showcase -->
        <section class="section-wrap home-section">
          <div class="home-rx-banner">
            <div class="rx-banner-info">
              <span class="eyebrow-tag">${icon("file")} PRESCRIPTION ASSISTANT</span>
              <h2>Have a Doctor's <em class="editorial">Prescription?</em></h2>
              <p>Upload your doctor's prescription image or PDF. Our certified pharmacists will verify it, cross-check dosages, and dispatch your order in 30 minutes.</p>
              <div class="rx-steps-mini">
                <div class="rsm-step"><span class="rsm-num">1</span> <span>Snap or Drag Rx</span></div>
                <div class="rsm-step"><span class="rsm-num">2</span> <span>Pharmacist Verification</span></div>
                <div class="rsm-step"><span class="rsm-num">3</span> <span>Doorstep Delivery</span></div>
              </div>
              <div class="rx-trust-badges">
                <span>${icon("check")} Licensed Pharmacists</span>
                <span>${icon("shield")} 100% Authentic</span>
                <span>${icon("clock")} 30-Min Delivery</span>
              </div>
            </div>
            <div class="rx-dropzone-tile" id="rx-home-upload">
              <div class="rx-dropzone-icon">${icon("file")}</div>
              <strong>Snap or Drag & Drop Rx</strong>
              <span>JPG, PNG or PDF up to 10MB</span>
              <button class="button button-primary button-small">${icon("plus")} Upload Prescription</button>
            </div>
          </div>
        </section>

        <!-- Offers & Promotions Carousel Strip -->
        <section class="section-wrap home-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">02 / EXCLUSIVE OFFERS</span>
              <h2>Featured <em class="editorial">Promotions</em></h2>
            </div>
            <button class="text-button" data-nav="plans">Explore all offers ${icon("arrow")}</button>
          </div>
          <div class="offers-carousel-section">
            <div class="offers-scroll-strip">
              <div class="offer-card banner-gold" data-nav="pharmacy">
                <span class="offer-badge">UP TO 40% OFF</span>
                <h3>Vitamins & Daily Supplements</h3>
                <p>Boost your immune health with certified daily nutritionals.</p>
                <span class="offer-link">Shop now ${icon("arrow")}</span>
              </div>
              <div class="offer-card banner-navy" data-nav="labtests">
                <span class="offer-badge">60% OFF PACKAGE</span>
                <h3>Full Body Health Checkup</h3>
                <p>68 comprehensive lab parameters with 10-hour report guarantee.</p>
                <span class="offer-link">Book package ${icon("arrow")}</span>
              </div>
              <div class="offer-card banner-teal" data-nav="pharmacy">
                <span class="offer-badge">FREE DELIVERY</span>
                <h3>Express Medicine Delivery</h3>
                <p>Zero delivery charges on all prescription orders over $25.</p>
                <span class="offer-link">Order medicines ${icon("arrow")}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Diagnostics & Imaging Hub -->
        <section class="section-wrap home-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">03 / DIAGNOSTICS & IMAGING</span>
              <h2>Top Booked <em class="editorial">Lab Tests & Scans</em></h2>
            </div>
            <button class="text-button" data-nav="labtests">View all diagnostics ${icon("arrow")}</button>
          </div>
          <div class="diagnostics-chips-row">
            <button class="diag-chip active" data-nav="labtests">${icon("flask")} Full Body</button>
            <button class="diag-chip" data-nav="labtests">${icon("pulse")} Heart Check</button>
            <button class="diag-chip" data-nav="labtests">${icon("pills")} Diabetes Care</button>
            <button class="diag-chip" data-nav="labtests">${icon("shield")} Thyroid Assessment</button>
            <button class="diag-chip" data-nav="labtests">${icon("ecg")} X-Ray & Scans</button>
          </div>
          <div class="test-grid">
            ${topTests.map((t) => labTestCard(t, ctx)).join("")}
          </div>
        </section>

        <!-- Shop by Category & Pharmacy Gateway -->
        <section class="section-wrap home-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">04 / PHARMACY ECOSYSTEM</span>
              <h2>Explore by <em class="editorial">Category</em></h2>
            </div>
            <button class="text-button" data-nav="pharmacy">View pharmacy ${icon("arrow")}</button>
          </div>
          <div class="category-circles">
            ${categories.map((c) => `<button class="category-circle" data-cat-nav="${c.id}"><span class="cat-circle-icon cat-${c.color}">${icon(c.icon)}</span><span>${c.label}</span></button>`).join("")}
          </div>
        </section>

        <!-- Trending Products Grid -->
        <section class="section-wrap home-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">05 / MEDICINES & WELLNESS</span>
              <h2><em class="editorial">Trending</em> Healthcare Essentials</h2>
            </div>
            <button class="text-button" data-nav="pharmacy">Browse all medicines ${icon("arrow")}</button>
          </div>
          <div class="product-grid home-product-grid" id="home-trending-grid">
            ${trendingProducts.map((p) => productCard(p, ctx)).join("")}
          </div>
        </section>

        <!-- Featured Specialist Doctors -->
        <section class="section-wrap home-section" id="specialists">
          <div class="section-heading">
            <div>
              <span class="section-kicker">06 / DOCTOR CONSULTATION</span>
              <h2>Consult with <em class="editorial">Top Doctors</em></h2>
            </div>
            <button class="text-button" data-nav="doctors">Find all doctors ${icon("arrow")}</button>
          </div>
          <div class="doctor-grid home-doctor-grid" id="home-doctor-grid">
            ${cachedDoctors()
              .slice(0, 4)
              .map((d) => doctorCard(d))
              .join("")}
          </div>
        </section>

        <!-- Health Records & Personal Insights Preview -->
        <section class="section-wrap home-section">
          <div class="health-snapshot-bar">
            <div class="snapshot-header">
              <div>
                <span class="eyebrow-tag">${icon("user")} PERSONAL HEALTH SNAPSHOT</span>
                <h2>Welcome back, <em class="editorial">Jordan</em></h2>
              </div>
              <button class="button button-small button-outline" data-nav="dashboard">Open Dashboard ${icon("arrow")}</button>
            </div>
            <div class="snapshot-grid">
              <div class="snapshot-item">
                <span class="snapshot-icon">${icon("heart")}</span>
                <div><strong>Health Score 86/100</strong><span>Optimal Vitals & Activity</span></div>
              </div>
              <div class="snapshot-item">
                <span class="snapshot-icon">${icon("flask")}</span>
                <div><strong>3 Lab Reports</strong><span>Annual panel completed</span></div>
              </div>
              <div class="snapshot-item">
                <span class="snapshot-icon">${icon("file")}</span>
                <div><strong>5 Prescriptions</strong><span>Encrypted digital archive</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Health Articles -->
        <section class="section-wrap home-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">07 / MEDICAL INSIGHTS</span>
              <h2>Health Articles <em class="editorial">for You</em></h2>
            </div>
            <button class="text-button">Read all articles ${icon("arrow")}</button>
          </div>
          <div class="article-grid">
            ${articles.map((a) => articleCard(a)).join("")}
          </div>
        </section>

        <!-- Emergency Banner & Trust Signals -->
        <section class="section-wrap home-section">
          <div class="emergency-banner">
            <div class="emergency-banner-content">
              <span class="emergency-badge">24/7</span>
              <div>
                <h3>Emergency & Urgent Care Hotline</h3>
                <p>Need immediate medical assistance or ambulance dispatch? Our care team is active round the clock.</p>
              </div>
            </div>
            <button class="button button-light" data-nav="emergency">${icon("phone")} Call emergency care</button>
          </div>
        </section>
      </main>
      ${premiumFooter()}
      ${mobileBottomNav("home")}
    </div>
    <div class="toast" id="toast"><span class="toast-check">${icon("check")}</span><span id="toast-text">Saved</span></div>
  `;

  bindHomeEvents(appRoot, ctx);
}

function bindHomeEvents(appRoot, ctx) {
  const { navigate, getCartCount, addToCart, changeQty, showToast } = ctx;

  function refreshHomeGrid() {
    const grid = appRoot.querySelector("#home-trending-grid");
    if (grid) {
      const trendingProducts = products.slice(0, 12);
      grid.innerHTML = trendingProducts
        .map((p) => productCard(p, ctx))
        .join("");
    }
  }

  if (ctx.onCartChange) {
    ctx.onCartChange(() => refreshHomeGrid());
  }

  appRoot.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeAccountDrawer(appRoot);
      navigate(el.dataset.nav);
    });
  });

  appRoot.querySelectorAll(".auth-modal-trigger").forEach((el) => {
    el.addEventListener("click", () => openAuthModal(el.dataset.authMode, ctx));
  });

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

  appRoot.querySelectorAll("[data-cat-nav]").forEach((el) => {
    el.addEventListener("click", () =>
      navigate("pharmacy", { category: el.dataset.catNav }),
    );
  });

  appRoot.querySelectorAll("[data-tag-search]").forEach((el) => {
    el.addEventListener("click", () =>
      navigate("pharmacy", { search: el.dataset.tagSearch }),
    );
  });

  appRoot.addEventListener("click", (e) => {
    const wishBtn = e.target.closest("[data-wishlist]");
    if (wishBtn) {
      e.stopPropagation();
      const pid = wishBtn.dataset.wishlist;
      const wishlist = new Set(
        JSON.parse(localStorage.getItem("thp_wishlist") || "[]"),
      );
      if (wishlist.has(pid)) {
        wishlist.delete(pid);
        showToast("Removed from Wishlist");
      } else {
        wishlist.add(pid);
        showToast("Saved to Wishlist!");
      }
      localStorage.setItem("thp_wishlist", JSON.stringify([...wishlist]));
      refreshHomeGrid();
      return;
    }

    const incBtn = e.target.closest("[data-qty-inc]");
    if (incBtn) {
      e.stopPropagation();
      changeQty(incBtn.dataset.qtyInc, 1);
      return;
    }

    const decBtn = e.target.closest("[data-qty-dec]");
    if (decBtn) {
      e.stopPropagation();
      changeQty(decBtn.dataset.qtyDec, -1);
      return;
    }

    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      e.stopPropagation();
      const p = products.find((p) => p.id === addBtn.dataset.add);
      if (p) addToCart(p.id, p);
      return;
    }

    const quickNav = e.target.closest("[data-quick-nav]");
    if (quickNav) {
      e.stopPropagation();
      navigate("product", { id: quickNav.dataset.quickNav });
      return;
    }

    const productCardEl = e.target.closest("[data-product]");
    if (
      productCardEl &&
      !e.target.closest("[data-add]") &&
      !e.target.closest("[data-qty-inc]") &&
      !e.target.closest("[data-qty-dec]") &&
      !e.target.closest("[data-wishlist]") &&
      !e.target.closest("[data-quick-nav]")
    ) {
      navigate("product", { id: productCardEl.dataset.product });
    }
  });

  appRoot.querySelectorAll("[data-test]").forEach((el) => {
    el.addEventListener("click", () =>
      navigate("test", { id: el.dataset.test }),
    );
  });

  appRoot.querySelectorAll("[data-book-test]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      navigate("test", { id: el.dataset.bookTest });
    });
  });

  bindDoctorCards(appRoot, ctx);

  appRoot.querySelectorAll("[data-article]").forEach((el) => {
    el.addEventListener("click", () =>
      navigate("article", { id: el.dataset.article }),
    );
  });

  const searchBtn = appRoot.querySelector("[data-search-btn]");
  const searchInput = appRoot.querySelector("#home-search");
  if (searchBtn)
    searchBtn.addEventListener("click", () => {
      const v = searchInput.value.trim();
      if (v) navigate("pharmacy", { search: v });
    });
  if (searchInput)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = searchInput.value.trim();
        if (v) navigate("pharmacy", { search: v });
      }
    });

  const rxUploadTile = appRoot.querySelector("#rx-home-upload");
  if (rxUploadTile)
    rxUploadTile.addEventListener("click", () => navigate("prescription"));

  const mobileMenu = appRoot.querySelector("#home-mobile-menu");
  if (mobileMenu)
    mobileMenu.addEventListener("click", () =>
      appRoot.querySelector(".sub-nav-inner").classList.toggle("mobile-open"),
    );

  // Instant Consult 24/7 button — lives in the sub-nav bar (below Register)
  const fabBtn = appRoot.querySelector("#fab-instant-consult");
  if (fabBtn)
    fabBtn.addEventListener("click", () =>
      showToast("Connecting to 24/7 Instant Doctor..."),
    );

  ensureLive()
    .then(() => {
      const docGrid = appRoot.querySelector("#home-doctor-grid");
      if (docGrid && docGrid.isConnected) {
        docGrid.innerHTML = cachedDoctors()
          .slice(0, 4)
          .map((d) => doctorCard(d))
          .join("");
        bindDoctorCards(appRoot, ctx);
      }
    })
    .catch(() => {});
}
