(function () {
  'use strict';

  // Year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Local time (Surat / IST)
  function updateTime() {
    var el = document.getElementById('local-time');
    if (!el) return;
    try {
      var opts = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' };
      var time = new Date().toLocaleTimeString('en-IN', opts);
      el.textContent = time + ' · IST';
    } catch (e) {
      el.textContent = '';
    }
  }
  updateTime();
  setInterval(updateTime, 30000);

  // Scroll progress bar
  var progress = document.getElementById('scroll-progress');
  function updateProgress() {
    if (!progress) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    progress.style.width = pct + '%';
  }

  // Header scroll state
  var header = document.getElementById('header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
    updateProgress();
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Full-screen menu
  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('full-nav');
  var navLinks = document.querySelectorAll('[data-nav]');

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    nav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    toggle.innerHTML = open
      ? 'close. <span aria-hidden="true">×</span>'
      : 'menu. <span class="menu-icon" aria-hidden="true"></span>';
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // Scroll reveal (Intersection Observer)
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('[data-reveal]');

  if (prefersReduced) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    reveals.forEach(function (el) { io.observe(el); });

    // Hero lines animate in on load
    requestAnimationFrame(function () {
      setTimeout(function () {
        document.querySelectorAll('.hero [data-reveal]').forEach(function (el, i) {
          setTimeout(function () {
            el.classList.add('is-visible');
          }, i * 70);
        });
      }, 120);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
