/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ORTHOM8pro Page Utilities  ·  o8-page.js  ·  v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  USAGE
 *  ─────
 *  1. Place this <script> tag at the bottom of <body>, before your
 *     page-specific <script> block:
 *       <script src="../assets/js/o8-page.js"></script>
 *
 *  2. This file auto-initialises everything it finds on the page.
 *     You don't need to call any function manually unless noted.
 *
 *  WHAT THIS FILE PROVIDES
 *  ─────────────────────────────────────────────────────────────────────────
 *  o8Init()              Main entry — called on DOMContentLoaded
 *  o8Header()            Adds "scrolled" class to #mainHeader on scroll
 *  o8MobileMenu()        Wires mobile open/close buttons
 *  o8Reveal()            Scroll-triggered reveal animations (.reveal etc.)
 *  o8Counters()          Animates [data-count] elements when visible
 *  o8Marquee(items)      Builds & loops the ticker marquee
 *  o8WordRotator()       Cycles .o8-rotator spans
 *  o8Pipeline(nodes)     Builds & animates the pipeline visualiser
 *  o8ToggleAccordion(el) Called by onclick — toggles .o8-accordion-row.open
 *  o8SwitchTab(id, idx)  Called by onclick — switches tab/panel pair
 *  o8OpenModal(id)       Opens a .o8-modal-overlay by id
 *  o8CloseModal(id, evt) Closes a modal (evt optional — backdrop click)
 *  o8EscapeKey()         Closes all open modals on Escape
 *
 *  PAGE-LEVEL CONFIG
 *  ─────────────────────────────────────────────────────────────────────────
 *  Before this script, define window.O8 to configure page-specific data:
 *
 *    <script>
 *    window.O8 = {
 *      activeNav: 'engine',      // matches data-nav on <a class="o8-nav-link">
 *      marqueeItems: [           // override default marquee items
 *        { label: 'Nodes', val: '11/11' },
 *        { label: 'Latency', val: '320ms' },
 *      ],
 *      pipeline: NODES_ARRAY,    // pass your nodes array for the pipeline
 *    };
 *    </script>
 *    <script src="../assets/js/o8-page.js"></script>
 *
 *  All keys are optional. Defaults are used if omitted.
 */

(function () {
  'use strict';

  /* ── Defaults ─────────────────────────────────────────────────────────── */

  var DEFAULT_MARQUEE = [
    { val: '$142.8M',  label: 'Capital Anchor' },
    { val: '72%',      label: 'Confidence Gate' },
    { val: '320ms',    label: 'Avg Latency' },
    { val: '11/11',    label: 'Pipeline Nodes' },
    { val: '$2.0M',    label: 'Max Capital Anchor' },
    { val: '56.1%',    label: 'Win Rate · Full Tier' },
    { val: '20/day',   label: 'Signal Frequency' },
    { val: '23',       label: 'DB Tables' },
    { val: '9',        label: 'Kill Conditions' },
  ];

  var config = window.O8 || {};

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ════════════════════════════════════════════════════════════════════════
     HEADER — adds .scrolled class on scroll
     ════════════════════════════════════════════════════════════════════════ */

  function o8Header() {
    var header = qs('#mainHeader');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once immediately
  }

  /* ════════════════════════════════════════════════════════════════════════
     ACTIVE NAV — marks the correct link as .active
     Uses window.O8.activeNav matched against data-nav attributes,
     OR falls back to matching href against current pathname.
     ════════════════════════════════════════════════════════════════════════ */

  function o8ActiveNav() {
    var links = qsa('.o8-nav-link, .o8-mobile-nav a');
    if (!links.length) return;

    if (config.activeNav) {
      links.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-nav') === config.activeNav);
      });
      return;
    }

    var path = window.location.pathname;
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      // exact match or ends with same filename
      a.classList.toggle(
        'active',
        href && (path === href || path.endsWith(href))
      );
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE MENU
     ════════════════════════════════════════════════════════════════════════ */

  function o8MobileMenu() {
    var btn   = qs('#o8MobileBtn');
    var close = qs('#o8MobileClose');
    var menu  = qs('#o8MobileMenu');

    if (!menu) return;

    function open()  { menu.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeM(){ menu.classList.remove('open'); document.body.style.overflow = ''; }

    if (btn)   btn.addEventListener('click', open);
    if (close) close.addEventListener('click', closeM);

    // Close on any link inside the mobile menu
    qsa('a', menu).forEach(function (a) {
      a.addEventListener('click', closeM);
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     SCROLL REVEALS
     ════════════════════════════════════════════════════════════════════════ */

  function o8Reveal() {
    var els = qsa('.reveal, .reveal-fade, .reveal-left, .reveal-right');
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target); // fire once
        }
      });
    }, { threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ════════════════════════════════════════════════════════════════════════
     COUNTERS — [data-count] animated numbers
     Attributes:
       data-count   = target number  (required)
       data-prefix  = prefix string  (optional, e.g. "$")
       data-suffix  = suffix string  (optional, e.g. "ms", "%")
       data-dec     = decimal places (optional, default auto)
     ════════════════════════════════════════════════════════════════════════ */

  function o8Counters() {
    var els  = qsa('[data-count]');
    if (!els.length) return;
    var done = false;

    function animateCounter(el) {
      var target  = parseFloat(el.getAttribute('data-count'));
      var prefix  = el.getAttribute('data-prefix') || '';
      var suffix  = el.getAttribute('data-suffix') || '';
      var dec     = el.getAttribute('data-dec');
      var isFloat = !Number.isInteger(target) || dec !== null;
      var places  = dec !== null ? parseInt(dec, 10) : (isFloat ? 1 : 0);
      var duration = 1600;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var ease     = 1 - Math.pow(1 - progress, 3);
        var val      = target * ease;
        el.textContent = prefix + val.toFixed(places) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }

    // Trigger when first counter enters viewport
    var io = new IntersectionObserver(function (entries) {
      if (done) return;
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          done = true;
          els.forEach(animateCounter);
          io.disconnect();
        }
      });
    }, { threshold: 0.3 });

    io.observe(els[0]);
  }

  /* ════════════════════════════════════════════════════════════════════════
     MARQUEE
     Target element: #marqueeTrack inside .o8-marquee
     ════════════════════════════════════════════════════════════════════════ */

  function o8Marquee() {
    var track = qs('#marqueeTrack');
    if (!track) return;

    var items = (config.marqueeItems && config.marqueeItems.length)
      ? config.marqueeItems
      : DEFAULT_MARQUEE;

    function buildItems() {
      return items.map(function (item) {
        return (
          '<div class="o8-marquee-item">' +
            '<span>' + item.val + '</span>' +
            item.label +
            '<div class="o8-marquee-sep"></div>' +
          '</div>'
        );
      }).join('');
    }

    // Duplicate for seamless loop
    track.innerHTML = buildItems() + buildItems();
  }

  /* ════════════════════════════════════════════════════════════════════════
     WORD ROTATOR
     Target: .o8-rotator containing multiple <span> children
     ════════════════════════════════════════════════════════════════════════ */

  function o8WordRotator() {
    var containers = qsa('.o8-rotator');
    containers.forEach(function (container) {
      var words = qsa('span', container);
      if (!words.length) return;
      var i = 0;
      words[0].classList.add('active');

      setInterval(function () {
        words[i].classList.remove('active');
        words[i].classList.add('prev');
        var prev = i;
        setTimeout(function () { words[prev].classList.remove('prev'); }, 700);
        i = (i + 1) % words.length;
        words[i].classList.add('active');
      }, 2400);
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     PIPELINE VISUALISER
     Target: #pipelineNodes
     Expects window.O8.pipeline = array of node objects { id, name, latency }
     or falls back to a minimal stub list.
     ════════════════════════════════════════════════════════════════════════ */

  var pipelineTimer;

  function o8Pipeline() {
    var container = qs('#pipelineNodes');
    if (!container) return;

    var nodes = (config.pipeline && config.pipeline.length)
      ? config.pipeline
      : [];

    if (!nodes.length) return;

    // Render nodes
    container.innerHTML = nodes.map(function (n, idx) {
      return (
        '<div class="o8-p-node' + (idx === 0 ? ' active' : '') + '" ' +
             'onclick="o8PipelineClick(this)" data-idx="' + idx + '">' +
          '<div class="o8-signal-line"></div>' +
          '<span class="o8-p-node-id">' + (n.id || String(idx + 1).padStart(2, '0')) + '</span>' +
          '<span class="o8-p-node-name">' + (n.name || 'Node') + '</span>' +
          '<span class="o8-p-node-stat">' + (n.latency || '—') + '</span>' +
          '<div class="o8-p-node-dot"></div>' +
        '</div>'
      );
    }).join('');

    startPipelineCycle();
  }

  function startPipelineCycle() {
    var nodeEls = qsa('.o8-p-node');
    if (!nodeEls.length) return;
    var current = 0;

    clearInterval(pipelineTimer);
    pipelineTimer = setInterval(function () {
      nodeEls[current].classList.remove('active');
      current = (current + 1) % nodeEls.length;
      nodeEls[current].classList.add('active');
    }, 900);
  }

  /* Called by onclick in pipeline nodes */
  window.o8PipelineClick = function (el) {
    qsa('.o8-p-node').forEach(function (n) { n.classList.remove('active'); });
    el.classList.add('active');
    clearInterval(pipelineTimer);
    // Resume after 5 seconds of user interaction
    setTimeout(startPipelineCycle, 5000);
  };

  /* ════════════════════════════════════════════════════════════════════════
     ACCORDION
     Called via onclick="o8ToggleAccordion(this)" on .o8-accordion-row
     ════════════════════════════════════════════════════════════════════════ */

  window.o8ToggleAccordion = function (row) {
    row.classList.toggle('open');
  };

  /* ════════════════════════════════════════════════════════════════════════
     TABS
     Called via onclick="o8SwitchTab('tabsId', idx)"
     Expects:
       - Container with id="<tabsId>" holding .o8-tab children
       - Panels container with id="<tabsId>Panels" holding .o8-tab-panel children
     ════════════════════════════════════════════════════════════════════════ */

  window.o8SwitchTab = function (tabsId, idx) {
    var tabs   = qsa('#' + tabsId + ' .o8-tab');
    var panels = qsa('#' + tabsId + 'Panels .o8-tab-panel');

    tabs.forEach(function (t, i)   { t.classList.toggle('active', i === idx); });
    panels.forEach(function (p, i) { p.classList.toggle('active', i === idx); });
  };

  /* ════════════════════════════════════════════════════════════════════════
     MODAL
     ════════════════════════════════════════════════════════════════════════ */

  window.o8OpenModal = function (id) {
    var el = qs('#' + id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.o8CloseModal = function (id, evt) {
    // If called from backdrop onclick, only close if backdrop itself was clicked
    if (evt && evt.target !== evt.currentTarget) return;
    var el = qs('#' + id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  };

  function o8EscapeKey() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      qsa('.o8-modal-overlay.open').forEach(function (m) {
        m.classList.remove('open');
      });
      document.body.style.overflow = '';
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     SMOOTH ANCHOR SCROLL (accounts for fixed header height)
     ════════════════════════════════════════════════════════════════════════ */

  function o8SmoothScroll() {
    qsa('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id  = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     MAIN INIT
     ════════════════════════════════════════════════════════════════════════ */

  function o8Init() {
    o8Header();
    o8ActiveNav();
    o8MobileMenu();
    o8Reveal();
    o8Counters();
    o8Marquee();
    o8Pipeline();
    o8EscapeKey();
    o8SmoothScroll();

    // Word rotator fires slightly delayed so fonts are loaded
    setTimeout(o8WordRotator, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', o8Init);
  } else {
    o8Init();
  }

})();
