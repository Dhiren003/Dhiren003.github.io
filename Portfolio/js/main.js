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

  // Header scroll state
  var header = document.getElementById('header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
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
})();
