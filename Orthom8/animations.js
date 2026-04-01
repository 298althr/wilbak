/**
 * OrthoM8 — Interaction Engine
 * Custom cursor · Scroll reveals · Magnetic buttons ·
 * Card tilt · Number counters · Parallax · Header behaviour
 */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH   = window.matchMedia('(pointer: coarse)').matches;
  const lerp    = (a, b, t) => a + (b - a) * t;

  /* ─────────────────────────────────────────────────────
     1. SCROLL REVEAL
     Replaces CSS auto-fire: elements stay hidden until
     they enter the viewport, then JS adds .revealed.
  ───────────────────────────────────────────────────── */
  function initReveals() {
    const QUERY = '.anim-slide-up,.anim-slide-down,.anim-slide-left,.anim-slide-right,.anim-fade-in';

    function observeAll() {
      const els = document.querySelectorAll(QUERY + ':not(.revealed)');
      if (!els.length) return;

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;

          // Auto-stagger siblings unless element already has an explicit delay class
          const hasExplicitDelay = [...el.classList].some(c => /^delay-\d/.test(c));
          if (!hasExplicitDelay) {
            const parent   = el.parentElement;
            const siblings = parent
              ? [...parent.querySelectorAll(':scope > ' + QUERY)]
              : [];
            const idx = siblings.indexOf(el);
            if (idx > 0) el.style.animationDelay = `${idx * 0.09}s`;
          }

          el.classList.add('revealed');
          obs.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      els.forEach(el => io.observe(el));
    }

    observeAll();
    // Re-scan after Alpine renders dynamic content
    document.addEventListener('alpine:initialized', () => setTimeout(observeAll, 250));
  }

  /* ─────────────────────────────────────────────────────
     3. MAGNETIC BUTTONS
     Buttons gently pull toward the cursor on hover.
  ───────────────────────────────────────────────────── */
  function initMagnetic() {
    if (TOUCH || REDUCED) return;

    function attach(btn) {
      if (btn._o8mag) return;
      btn._o8mag = true;

      btn.addEventListener('mousemove', e => {
        const r  = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) * 0.28;
        const dy = (e.clientY - (r.top  + r.height / 2)) * 0.28;
        btn.style.transform = `translate(${dx}px,${dy}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        btn.style.transform  = '';
        setTimeout(() => { btn.style.transition = ''; }, 500);
      });
    }

    const attachAll = () =>
      document.querySelectorAll('.btn-gold,.btn-primary,.btn-ghost').forEach(attach);

    attachAll();
    document.addEventListener('alpine:initialized', () => setTimeout(attachAll, 300));
  }

  /* ─────────────────────────────────────────────────────
     4. CARD TILT — 3D perspective on hover
  ───────────────────────────────────────────────────── */
  function initTilt() {
    if (TOUCH || REDUCED) return;

    const SEL = '.perf-card,.director-card,.stat-card,.glass-panel,.contact-card';

    function attach(card) {
      if (card._o8tilt) return;
      card._o8tilt = true;

      card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const x  = (e.clientX - r.left) / r.width  - 0.5;
        const y  = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transition = 'none';
        card.style.transform  = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateZ(8px)`;
        card.style.boxShadow  = `${-x * 16}px ${-y * 16}px 36px rgba(26,86,255,0.1), 0 0 0 1px rgba(26,86,255,0.14)`;
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1), box-shadow 0.55s ease';
        card.style.transform  = '';
        card.style.boxShadow  = '';
      });
    }

    const attachAll = () => document.querySelectorAll(SEL).forEach(attach);
    attachAll();
    document.addEventListener('alpine:initialized', () => setTimeout(attachAll, 300));
  }

  /* ─────────────────────────────────────────────────────
     5. NUMBER COUNTERS
     Animates stat numbers up from 0 when scrolled into view.
  ───────────────────────────────────────────────────── */
  function initCounters() {
    function observe() {
      const els = document.querySelectorAll('.stats-ribbon .mono:not([data-counted]),[data-counter]:not([data-counted])');
      if (!els.length) return;

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.counted = '1';
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.7 });

      els.forEach(el => io.observe(el));
    }

    observe();
    document.addEventListener('alpine:initialized', () => setTimeout(observe, 300));
  }

  function runCounter(el) {
    const raw   = el.textContent.trim();
    const match = raw.match(/([\d,]+\.?\d*)/);
    if (!match) return;

    const numStr = match[1].replace(/,/g, '');
    const target = parseFloat(numStr);
    if (isNaN(target) || target === 0) return;

    const pre  = raw.slice(0, raw.indexOf(match[1]));
    const post = raw.slice(raw.indexOf(match[1]) + match[1].length);
    const dp   = numStr.includes('.');
    const big  = target >= 1000;
    const dur  = 1700;
    const t0   = performance.now();

    const fmt = v => {
      if (dp)  return v.toFixed(1);
      if (big) return Math.round(v).toLocaleString();
      return Math.ceil(v).toString();
    };

    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(2, -10 * p); // expo ease-out
      el.textContent = pre + fmt(target * e) + post;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = raw; // restore exact original
    };

    requestAnimationFrame(tick);
  }

  /* ─────────────────────────────────────────────────────
     6. PARALLAX — subtle depth on hero videos
  ───────────────────────────────────────────────────── */
  function initParallax() {
    if (REDUCED) return;

    const els = document.querySelectorAll('.hero-bg-video');
    if (!els.length) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        els.forEach(el => {
          const section = el.closest('section,#hero');
          if (section) {
            const r = section.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) { ticking = false; return; }
          }
          el.style.transform = `translateY(${sy * 0.16}px)`;
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────────────
     7. HEADER — auto-hide on scroll down, reveal on scroll up
  ───────────────────────────────────────────────────── */
  function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    let last = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled',   y > 60);
      if      (y > last + 10 && y > 280) header.classList.add('nav-hidden');
      else if (y < last - 10)            header.classList.remove('nav-hidden');
      last = y;
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────────────
     8. STAGGER GRID CHILDREN
     Auto-staggers items in common grid containers.
  ───────────────────────────────────────────────────── */
  function initStagger() {
    const GRIDS = '.perf-grid,.directors-list,.node-grid';
    const ANIM  = '.anim-slide-up,.anim-fade-in,.anim-slide-left,.anim-slide-right';

    document.querySelectorAll(GRIDS).forEach(grid => {
      [...grid.querySelectorAll(':scope > ' + ANIM)].forEach((item, i) => {
        const hasExplicit = [...item.classList].some(c => /^delay-\d/.test(c));
        if (!hasExplicit) item.style.animationDelay = `${i * 0.08}s`;
      });
    });
  }

  /* ─────────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────────── */
  function boot() {
    initReveals();
    initMagnetic();
    initTilt();
    initCounters();
    initParallax();
    initHeader();
    initStagger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
