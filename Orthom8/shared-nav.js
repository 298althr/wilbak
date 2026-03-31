/**
 * OrthoM8 — Shared Navigation Engine
 * Injects unified header, mobile drawer, footer, and loading gate
 * across all pages. Detects current page for active link highlighting.
 */
(function () {
  'use strict';

  /* ─── Active Page Detection ─────────────────────── */
  const path = window.location.pathname.toLowerCase();
  function isActive(href) {
    const h = href.toLowerCase();
    // Normalize index routes
    if (h === '/orthom8pro/' || h === '/orthom8pro/index.html') {
      return path === '/orthom8pro/' || path === '/orthom8pro/index.html' || path === '/orthom8pro' || path === '/orthom8pro/';
    }
    const cleanPath = path.endsWith('/') ? path : path + '/';
    const cleanHref = h.endsWith('/') ? h : h + '/';
    return cleanPath.startsWith(cleanHref.replace(/\/$/, '')) || path === h.replace(/\/$/, '');
  }

  function navLink(href, label) {
    const active = isActive(href) ? ' class="active"' : '';
    return `<li><a href="${href}"${active}>${label}</a></li>`;
  }

  function drawerLink(href, label) {
    const active = isActive(href) ? ' style="color:var(--brand-gold-light);"' : '';
    return `<a href="${href}"${active}>${label} <span class="nav-arrow">→</span></a>`;
  }

  /* ─── Shared Components ─────────────────────────── */
  const HEADER_HTML = `
<div id="drawer-overlay"></div>
<div id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
  <div class="drawer-header">
    <a href="/Orthom8/" class="logo-wrap">
      <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/dark-mode_sqtgql.svg" alt="Logo" class="h-8 logo-dark-theme">
      <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/light-mode_xr11qj.svg" alt="Logo" class="h-8 logo-light-theme">
      <span class="logo-name">Ortho'M8</span>
    </a>
    <button class="drawer-close" id="drawer-close" aria-label="Close menu">✕</button>
  </div>
  <div class="drawer-stats">
    <div class="ds-cell"><div class="ds-num">$142.8M</div><div class="ds-lbl">Capital Managed</div></div>
    <div class="ds-cell" style="border-left:1px solid var(--brand-rule-strong);"><div class="ds-num">320ms</div><div class="ds-lbl">Speed</div></div>
    <div class="ds-cell" style="border-top:1px solid var(--brand-rule-strong);"><div class="ds-num">72.4%</div><div class="ds-lbl">AI Confidence</div></div>
    <div class="ds-cell" style="border-top:1px solid var(--brand-rule-strong); border-left:1px solid var(--brand-rule-strong);"><div class="ds-num">&lt;1.5%</div><div class="ds-lbl">Max Loss</div></div>
  </div>
  <nav class="drawer-nav" aria-label="Mobile navigation">
    ${drawerLink('/Orthom8/', 'Home')}
    ${drawerLink('/Orthom8/the-model/', 'The Model')}
    ${drawerLink('/Orthom8/Results/', 'Results')}
    ${drawerLink('/Orthom8/our-team/', 'Our Team')}
    ${drawerLink('/Orthom8/contact/', 'Contact')}
  </nav>
  <div class="drawer-controls">
    <button class="theme-btn" id="drawer-theme-toggle" title="Toggle theme"><span id="drawer-theme-icon">☀</span></button>
    <div class="lang-wrap" style="flex:1;">
      <select class="lang-select" id="drawer-lang-select" style="width:100%;">
        <option value="en">EN</option><option value="es">ES</option>
        <option value="de">DE</option><option value="fr">FR</option><option value="zh">ZH</option>
      </select>
    </div>
  </div>
  <div class="drawer-footer">
    <a href="/Orthom8/onboarding/" class="btn-primary" style="justify-content:center; width:100%;">GET STARTED</a>
    <a href="/Orthom8/contact/" class="btn-ghost" style="justify-content:center; width:100%; margin-top:0.5rem;">Talk to Our Team</a>
  </div>
</div>

<header id="site-header">
  <a href="/Orthom8/" class="logo-wrap">
    <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/dark-mode_sqtgql.svg" alt="Logo" class="h-8 logo-dark-theme">
    <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/light-mode_xr11qj.svg" alt="Logo" class="h-8 logo-light-theme">
    <span class="logo-name">Ortho'M8</span>
  </a>
  <nav aria-label="Main navigation">
    <ul class="header-nav">
      ${navLink('/Orthom8/', 'Home')}
      ${navLink('/Orthom8/the-model/', 'The Model')}
      ${navLink('/Orthom8/Results/', 'Results')}
      ${navLink('/Orthom8/our-team/', 'Our Team')}
      ${navLink('/Orthom8/contact/', 'Contact')}
    </ul>
  </nav>
  <div class="header-controls">
    <button class="theme-btn" id="theme-toggle" title="Toggle theme"><span id="theme-icon">☀</span></button>
    <div class="lang-wrap">
      <select class="lang-select" id="lang-select">
        <option value="en">EN</option><option value="es">ES</option>
        <option value="de">DE</option><option value="fr">FR</option><option value="zh">ZH</option>
      </select>
    </div>
    <a href="/Orthom8/onboarding/" class="btn-primary">GET STARTED</a>
  </div>
  <div class="mobile-header-right">
    <button class="theme-btn" id="mobile-theme-toggle" title="Toggle theme"><span id="mobile-theme-icon">☀</span></button>
    <button class="hamburger" id="hamburger-btn" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</header>`;

  const FOOTER_HTML = `
<footer id="site-footer">
  <div class="footer-grid">
    <div>
      <div class="flex items-center gap-3 mb-6">
        <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/dark-mode_sqtgql.svg" alt="Logo" class="h-8 logo-dark-theme">
        <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/light-mode_xr11qj.svg" alt="Logo" class="h-8 logo-light-theme">
        <span class="footer-brand-name" style="margin-bottom:0;">Ortho'M8</span>
      </div>
      <p class="footer-brand-desc">Ortho'M8 is an Algorithmic Capital Management system built for business excellence. Fully automated, risk-hardened, and transparent.</p>
    </div>
    <div>
      <div class="footer-col-title">Navigation</div>
      <ul class="footer-links">
        <li><a href="/Orthom8/">Home</a></li>
        <li><a href="/Orthom8/the-model/">The Model</a></li>
        <li><a href="/Orthom8/Results/">Results</a></li>
        <li><a href="/Orthom8/our-team/">Our Team</a></li>
        <li><a href="/Orthom8/contact/">Contact Us</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title">Legal</div>
      <ul class="footer-links">
        <li><a href="/legal/terms">Terms</a></li>
        <li><a href="/legal/privacy">Privacy</a></li>
        <li><a href="/legal/risk">Risk Disclosure</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title">Connect</div>
      <ul class="footer-links">
        <li><a href="/Orthom8/contact/">Technical Support</a></li>
        <li><a href="/Orthom8/onboarding/">Get Started</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2025 ORTHOM8PRO — All rights reserved.</p>
    <p>Past performance does not guarantee future results.</p>
  </div>
</footer>`;

  const GATE_HTML = `
<div id="welcome-gate">
  <div class="gate-logo-ring">
    <div class="gate-ring gate-ring-outer"></div>
    <div class="gate-ring gate-ring-mid"></div>
    <div class="gate-logo-center">
      <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/dark-mode_sqtgql.svg" alt="Ortho'M8" class="gate-logo-img logo-dark-theme">
      <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/light-mode_xr11qj.svg" alt="Ortho'M8" class="gate-logo-img logo-light-theme">
    </div>
  </div>
  <div class="gate-wordmark">Ortho'M8</div>
  <div class="gate-status">Initializing systems…</div>
</div>`;

  const GATE_CSS = `
    #welcome-gate {
      position: fixed; inset: 0; z-index: 10000; background: var(--page-bg);
      display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1.5rem;
    }
    #welcome-gate.exiting { animation: wg-fade 0.5s ease forwards; }
    @keyframes wg-fade { to { opacity: 0; pointer-events: none; visibility: hidden; } }

    .gate-logo-ring { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
    .gate-ring { position: absolute; border-radius: 50%; border: 1.5px solid transparent; }
    .gate-ring-outer { width: 80px; height: 80px; border-top-color: var(--brand-cobalt); border-right-color: rgba(26,86,255,0.3); animation: gate-spin 1.8s linear infinite; }
    .gate-ring-mid { width: 56px; height: 56px; border-bottom-color: var(--brand-gold-light); border-left-color: rgba(184,151,42,0.3); animation: gate-spin 2.5s linear infinite reverse; }
    .gate-logo-center { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; z-index: 1; }
    .gate-logo-img { width: 100%; height: auto; animation: gate-pulse 2s ease-in-out infinite; }
    @keyframes gate-spin { to { transform: rotate(360deg); } }
    @keyframes gate-pulse { 0%,100% { opacity:0.85; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
    .gate-wordmark {
      font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700;
      letter-spacing: 10px; text-transform: uppercase; color: var(--tx-main);
    }
    .gate-status {
      font-family: 'Fira Code', monospace; font-size: 9px; letter-spacing: 3px;
      color: var(--brand-cobalt); text-transform: uppercase;
    }
  `;

  /* ─── Execution ─────────────────────────────────── */

  function inject() {
    // 1. CSS
    if (!document.getElementById('gate-styles')) {
      const s = document.createElement('style');
      s.id = 'gate-styles';
      s.textContent = GATE_CSS;
      document.head.appendChild(s);
    }

    // 2. Gate (immediate as possible)
    if (!document.getElementById('welcome-gate') && document.body) {
      document.body.insertAdjacentHTML('afterbegin', GATE_HTML);
    }

    // 3. Header
    const navRoot = document.getElementById('site-nav-root');
    if (navRoot) {
      navRoot.innerHTML = HEADER_HTML;
    } else if (document.body) {
      const app = document.getElementById('app') || document.body;
      app.insertAdjacentHTML('afterbegin', HEADER_HTML);
    }

    // 4. Footer
    const footerRoot = document.getElementById('site-footer-root');
    if (footerRoot) {
      footerRoot.innerHTML = FOOTER_HTML;
    } else if (document.body) {
      const app = document.getElementById('app') || document.body;
      app.insertAdjacentHTML('beforeend', FOOTER_HTML);
    }

    init();
  }

  function init() {
    const html = document.documentElement;

    // Theme handling
    const savedTheme = localStorage.getItem('o8_theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    const sync = (t) => {
      const icon = t === 'dark' ? '☀' : '☪';
      ['theme-icon','mobile-theme-icon','drawer-theme-icon'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = icon;
      });
    };
    sync(savedTheme);

    const toggle = () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('o8_theme', next);
      sync(next);
    };
    ['theme-toggle','mobile-theme-toggle','drawer-theme-toggle'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', toggle)
    );

    // Language handling
    const savedLang = localStorage.getItem('o8_locale') || 'en';
    ['lang-select','drawer-lang-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = savedLang;
        el.addEventListener('change', e => {
          localStorage.setItem('o8_locale', e.target.value);
          if (window.Alpine?.store?.('i18n')) window.Alpine.store('i18n').setLocale(e.target.value);
        });
      }
    });

    // Mobile Drawer
    const drawer    = document.getElementById('mobile-drawer');
    const overlay   = document.getElementById('drawer-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    const closeBtn  = document.getElementById('drawer-close');

    const open = () => {
      drawer?.classList.add('open'); overlay?.classList.add('visible');
      hamburger?.classList.add('active'); document.body.classList.add('drawer-open');
    };
    const close = () => {
      drawer?.classList.remove('open'); overlay?.classList.remove('visible');
      hamburger?.classList.remove('active'); document.body.classList.remove('drawer-open');
    };
    hamburger?.addEventListener('click', () => drawer?.classList.contains('open') ? close() : open());
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    // Hide Gate Logic
    const gate = document.getElementById('welcome-gate');
    const app  = document.getElementById('app');
    let gateHidden = false;

    const hideGate = () => {
      if (gateHidden || !gate) return;
      gateHidden = true;
      gate.classList.add('exiting');
      setTimeout(() => {
        gate.style.display = 'none';
        if (app) app.classList.add('visible');
      }, 500);
    };

    // Safety timeout
    setTimeout(hideGate, 3000);

    // Watch for Alpine
    if (window.Alpine) {
      const checkI18n = () => {
        const i18n = window.Alpine.store('i18n');
        if (i18n?.loaded) hideGate();
        else if (i18n) setTimeout(checkI18n, 100);
        else hideGate();
      };
      checkI18n();
    } else {
      document.addEventListener('alpine:init', () => {
        const i18n = window.Alpine.store('i18n');
        if (i18n) {
          const check = setInterval(() => {
            if (i18n.loaded) { clearInterval(check); hideGate(); }
          }, 100);
        } else hideGate();
      });
      // Second fallback for window.onload
      window.addEventListener('load', hideGate);
    }
  }

  // Safe run
  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
