/**
 * OrthoM8 — Shared Navigation Engine
 * Injects unified header, mobile drawer, footer, and loading gate
 * across all pages. Detects current page for active link highlighting.
 */
(function () {
  'use strict';

  /* ─── Nav Translations ───────────────────────────── */
  const NAV_T = {
    en: {
      home: 'Home', model: 'The Model', results: 'Results', team: 'Our Team', contact: 'Contact',
      getStarted: 'GET STARTED', talkTeam: 'Talk to Our Team',
      navTitle: 'Navigation', legal: 'Legal', connect: 'Connect',
      contactUs: 'Contact Us', terms: 'Terms', privacy: 'Privacy', risk: 'Risk Disclosure',
      techSupport: 'Technical Support',
      footerDesc: "Ortho'M8 is an Algorithmic Capital Management system built for business excellence. Fully automated, risk-hardened, and transparent.",
      footerCopy: '© 2025 ORTHOM8PRO — All rights reserved.',
      footerDisclaimer: 'Past performance does not guarantee future results.',
      drawerCapManaged: 'Capital Managed', drawerSpeed: 'Speed', drawerAI: 'AI Confidence', drawerLoss: 'Max Loss',
    },
    es: {
      home: 'Inicio', model: 'El Modelo', results: 'Resultados', team: 'Nuestro Equipo', contact: 'Contacto',
      getStarted: 'COMENZAR', talkTeam: 'Hablar con el Equipo',
      navTitle: 'Navegación', legal: 'Legal', connect: 'Conectar',
      contactUs: 'Contáctenos', terms: 'Términos', privacy: 'Privacidad', risk: 'Divulgación de Riesgos',
      techSupport: 'Soporte Técnico',
      footerDesc: "Ortho'M8 es un sistema de gestión algorítmica de capital para la excelencia empresarial. Totalmente automatizado, resistente al riesgo y transparente.",
      footerCopy: '© 2025 ORTHOM8PRO — Todos los derechos reservados.',
      footerDisclaimer: 'El rendimiento pasado no garantiza resultados futuros.',
      drawerCapManaged: 'Capital Gestionado', drawerSpeed: 'Velocidad', drawerAI: 'Confianza IA', drawerLoss: 'Pérd. Máx.',
    },
    de: {
      home: 'Startseite', model: 'Das Modell', results: 'Ergebnisse', team: 'Unser Team', contact: 'Kontakt',
      getStarted: 'LOSLEGEN', talkTeam: 'Mit dem Team sprechen',
      navTitle: 'Navigation', legal: 'Rechtliches', connect: 'Verbinden',
      contactUs: 'Kontaktiere uns', terms: 'Bedingungen', privacy: 'Datenschutz', risk: 'Risikohinweis',
      techSupport: 'Technischer Support',
      footerDesc: "Ortho'M8 ist ein algorithmisches Kapitalverwaltungssystem für unternehmerische Spitzenleistungen. Vollautomatisch, risikogehärtet und transparent.",
      footerCopy: '© 2025 ORTHOM8PRO — Alle Rechte vorbehalten.',
      footerDisclaimer: 'Vergangene Leistungen garantieren keine zukünftigen Ergebnisse.',
      drawerCapManaged: 'Verwaltetes Kapital', drawerSpeed: 'Geschwindigkeit', drawerAI: 'KI-Konfidenz', drawerLoss: 'Max. Verlust',
    },
    fr: {
      home: 'Accueil', model: 'Le Modèle', results: 'Résultats', team: 'Notre Équipe', contact: 'Contact',
      getStarted: 'COMMENCER', talkTeam: "Parler à notre équipe",
      navTitle: 'Navigation', legal: 'Légal', connect: 'Connexion',
      contactUs: 'Contactez-nous', terms: 'Conditions', privacy: 'Confidentialité', risk: 'Divulgation des risques',
      techSupport: 'Support Technique',
      footerDesc: "Ortho'M8 est un système de gestion algorithmique du capital conçu pour l'excellence des entreprises. Entièrement automatisé, résistant aux risques et transparent.",
      footerCopy: '© 2025 ORTHOM8PRO — Tous droits réservés.',
      footerDisclaimer: 'Les performances passées ne garantissent pas les résultats futurs.',
      drawerCapManaged: 'Capital Géré', drawerSpeed: 'Vitesse', drawerAI: 'Confiance IA', drawerLoss: 'Perte Max.',
    },
    zh: {
      home: '首页', model: '模型', results: '业绩', team: '我们的团队', contact: '联系我们',
      getStarted: '开始使用', talkTeam: '联系团队',
      navTitle: '导航', legal: '法律', connect: '联系',
      contactUs: '联系我们', terms: '条款', privacy: '隐私', risk: '风险披露',
      techSupport: '技术支持',
      footerDesc: "Ortho'M8是一个专为卓越企业打造的算法资本管理系统，完全自动化、风险强化且透明。",
      footerCopy: '© 2025 ORTHOM8PRO — 版权所有。',
      footerDisclaimer: '过去的表现不能保证未来的结果。',
      drawerCapManaged: '管理资本', drawerSpeed: '速度', drawerAI: 'AI置信度', drawerLoss: '最大亏损',
    },
  };

  function t(lang, key) {
    return (NAV_T[lang] || NAV_T.en)[key] || NAV_T.en[key] || key;
  }

  /* ─── Active Page Detection ─────────────────────── */
  const path = window.location.pathname.toLowerCase();
  function isActive(href) {
    const h = href.toLowerCase();
    // Exact match with normalized trailing slash — prevents /Orthom8/ matching all sub-pages
    const cleanPath = path.endsWith('/') ? path : path + '/';
    const cleanHref = h.endsWith('/')   ? h    : h + '/';
    return cleanPath === cleanHref;
  }

  function navLink(href, labelKey, lang) {
    const active = isActive(href) ? ' class="active"' : '';
    return `<li><a href="${href}"${active} data-nav-key="${labelKey}">${t(lang, labelKey)}</a></li>`;
  }

  function drawerLink(href, labelKey, lang) {
    const active = isActive(href) ? ' style="color:var(--brand-gold-light);"' : '';
    return `<a href="${href}"${active} data-nav-key="${labelKey}">${t(lang, labelKey)} <span class="nav-arrow">→</span></a>`;
  }

  /* ─── Nav Translation Updater ───────────────────── */
  function updateNavTranslations(lang) {
    const tx = NAV_T[lang] || NAV_T.en;
    // Update all elements with data-nav-key (preserving the → arrow in drawer links)
    document.querySelectorAll('[data-nav-key]').forEach(el => {
      const key = el.getAttribute('data-nav-key');
      const arrow = el.querySelector('.nav-arrow');
      if (arrow) {
        // drawer link — update text node only, preserve arrow span
        el.childNodes[0].textContent = tx[key] || NAV_T.en[key] || key;
      } else {
        el.textContent = tx[key] || NAV_T.en[key] || key;
      }
    });
    // Update elements with data-nav-text (multi-word static strings)
    document.querySelectorAll('[data-nav-text]').forEach(el => {
      const key = el.getAttribute('data-nav-text');
      el.textContent = tx[key] || NAV_T.en[key] || key;
    });
  }

  /* ─── Build HTML Components ─────────────────────── */
  function buildHeaderHTML(lang) {
    const tx = NAV_T[lang] || NAV_T.en;
    return `
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
    <div class="ds-cell"><div class="ds-num">$142.8M</div><div class="ds-lbl" data-nav-text="drawerCapManaged">${tx.drawerCapManaged}</div></div>
    <div class="ds-cell" style="border-left:1px solid var(--brand-rule-strong);"><div class="ds-num">320ms</div><div class="ds-lbl" data-nav-text="drawerSpeed">${tx.drawerSpeed}</div></div>
    <div class="ds-cell" style="border-top:1px solid var(--brand-rule-strong);"><div class="ds-num">72.4%</div><div class="ds-lbl" data-nav-text="drawerAI">${tx.drawerAI}</div></div>
    <div class="ds-cell" style="border-top:1px solid var(--brand-rule-strong); border-left:1px solid var(--brand-rule-strong);"><div class="ds-num">&lt;1.5%</div><div class="ds-lbl" data-nav-text="drawerLoss">${tx.drawerLoss}</div></div>
  </div>
  <nav class="drawer-nav" aria-label="Mobile navigation">
    ${drawerLink('/Orthom8/', 'home', lang)}
    ${drawerLink('/Orthom8/the-model/', 'model', lang)}
    ${drawerLink('/Orthom8/Results/', 'results', lang)}
    ${drawerLink('/Orthom8/our-team/', 'team', lang)}
    ${drawerLink('/Orthom8/contact/', 'contact', lang)}
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
    <a href="/Orthom8/onboarding/" class="btn-primary" style="justify-content:center; width:100%;" data-nav-text="getStarted">${tx.getStarted}</a>
    <a href="/Orthom8/contact/" class="btn-ghost" style="justify-content:center; width:100%; margin-top:0.5rem;" data-nav-text="talkTeam">${tx.talkTeam}</a>
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
      ${navLink('/Orthom8/', 'home', lang)}
      ${navLink('/Orthom8/the-model/', 'model', lang)}
      ${navLink('/Orthom8/Results/', 'results', lang)}
      ${navLink('/Orthom8/our-team/', 'team', lang)}
      ${navLink('/Orthom8/contact/', 'contact', lang)}
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
    <a href="/Orthom8/onboarding/" class="btn-primary" data-nav-text="getStarted">${tx.getStarted}</a>
  </div>
  <div class="mobile-header-right">
    <button class="theme-btn" id="mobile-theme-toggle" title="Toggle theme"><span id="mobile-theme-icon">☀</span></button>
    <button class="hamburger" id="hamburger-btn" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</header>`;
  }

  function buildFooterHTML(lang) {
    const tx = NAV_T[lang] || NAV_T.en;
    return `
<footer id="site-footer">
  <div class="footer-grid">
    <div>
      <div class="flex items-center gap-3 mb-6">
        <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/dark-mode_sqtgql.svg" alt="Logo" class="h-8 logo-dark-theme">
        <img src="https://res.cloudinary.com/dgz88jxiy/image/upload/v1774323178/light-mode_xr11qj.svg" alt="Logo" class="h-8 logo-light-theme">
        <span class="footer-brand-name" style="margin-bottom:0;">Ortho'M8</span>
      </div>
      <p class="footer-brand-desc" data-nav-text="footerDesc">${tx.footerDesc}</p>
    </div>
    <div>
      <div class="footer-col-title" data-nav-text="navTitle">${tx.navTitle}</div>
      <ul class="footer-links">
        <li><a href="/Orthom8/" data-nav-text="home">${tx.home}</a></li>
        <li><a href="/Orthom8/the-model/" data-nav-text="model">${tx.model}</a></li>
        <li><a href="/Orthom8/Results/" data-nav-text="results">${tx.results}</a></li>
        <li><a href="/Orthom8/our-team/" data-nav-text="team">${tx.team}</a></li>
        <li><a href="/Orthom8/contact/" data-nav-text="contactUs">${tx.contactUs}</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title" data-nav-text="legal">${tx.legal}</div>
      <ul class="footer-links">
        <li><a href="/Orthom8/legal/terms/" data-nav-text="terms">${tx.terms}</a></li>
        <li><a href="/Orthom8/legal/privacy/" data-nav-text="privacy">${tx.privacy}</a></li>
        <li><a href="/Orthom8/legal/risk-disclosure/" data-nav-text="risk">${tx.risk}</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-col-title" data-nav-text="connect">${tx.connect}</div>
      <ul class="footer-links">
        <li><a href="/Orthom8/contact/" data-nav-text="techSupport">${tx.techSupport}</a></li>
        <li><a href="/Orthom8/onboarding/" data-nav-text="getStarted">${tx.getStarted}</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p data-nav-text="footerCopy">${tx.footerCopy}</p>
  </div>
</footer>`;
  }

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
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.1rem; font-weight: 700;
      letter-spacing: 10px; text-transform: uppercase; color: var(--tx-main);
    }
    .gate-status {
      font-family: 'Fira Code', monospace; font-size: 9px; letter-spacing: 3px;
      color: var(--brand-cobalt); text-transform: uppercase;
    }
  `;

  /* ─── Execution ─────────────────────────────────── */

  function inject() {
    const lang = localStorage.getItem('o8_locale') || 'en';

    // 1. CSS
    if (!document.getElementById('gate-styles')) {
      const s = document.createElement('style');
      s.id = 'gate-styles';
      s.textContent = GATE_CSS;
      document.head.appendChild(s);
    }

    // 2. Gate
    if (!document.getElementById('welcome-gate') && document.body) {
      document.body.insertAdjacentHTML('afterbegin', GATE_HTML);
    }

    // 3. Header
    const navRoot = document.getElementById('site-nav-root');
    if (navRoot) {
      navRoot.innerHTML = buildHeaderHTML(lang);
    } else if (document.body) {
      const app = document.getElementById('app') || document.body;
      app.insertAdjacentHTML('afterbegin', buildHeaderHTML(lang));
    }

    // 4. Footer
    const footerRoot = document.getElementById('site-footer-root');
    if (footerRoot) {
      footerRoot.innerHTML = buildFooterHTML(lang);
    } else if (document.body) {
      const app = document.getElementById('app') || document.body;
      app.insertAdjacentHTML('beforeend', buildFooterHTML(lang));
    }

    init(lang);
  }

  function init(initialLang) {
    const html = document.documentElement;

    // Theme handling
    const savedTheme = localStorage.getItem('o8_theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    const syncTheme = (theme) => {
      const icon = theme === 'dark' ? '☀' : '☪';
      ['theme-icon','mobile-theme-icon','drawer-theme-icon'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = icon;
      });
    };
    syncTheme(savedTheme);

    const toggle = () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('o8_theme', next);
      syncTheme(next);
    };
    ['theme-toggle','mobile-theme-toggle','drawer-theme-toggle'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', toggle)
    );

    // Language handling — set initial select values
    ['lang-select','drawer-lang-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = initialLang;
        el.addEventListener('change', e => {
          const lang = e.target.value;
          // Sync both selects
          ['lang-select','drawer-lang-select'].forEach(sid => {
            const sel = document.getElementById(sid);
            if (sel) sel.value = lang;
          });
          localStorage.setItem('o8_locale', lang);
          // Update nav/footer DOM immediately
          updateNavTranslations(lang);
          // Update Alpine i18n store for page body content
          if (window.Alpine?.store('i18n')) {
            window.Alpine.store('i18n').setLocale(lang);
          }
        });
      }
    });

    // Listen for locale-changed event (in case Alpine triggers it elsewhere)
    window.addEventListener('locale-changed', e => {
      updateNavTranslations(e.detail);
      ['lang-select','drawer-lang-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = e.detail;
      });
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

    setTimeout(hideGate, 3000);

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
      window.addEventListener('load', hideGate);
    }
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
