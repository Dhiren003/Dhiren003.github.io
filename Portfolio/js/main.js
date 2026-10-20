(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  root.classList.add('js');

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ======================================================================
     1. Word splitting for big headings
     ====================================================================== */
  function splitWords(el) {
    var n = 0;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var mask = document.createElement('span');
            mask.className = 'sw'; mask.setAttribute('aria-hidden', 'true');
            var inner = document.createElement('span');
            inner.style.setProperty('--i', n++);
            inner.textContent = part;
            mask.appendChild(inner); frag.appendChild(mask);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) { walk(ch); }
      });
    })(el);
    el.setAttribute('aria-label', label);
    el.classList.add('is-split');
  }
  var splits = $$('[data-split]');
  if (!reduce) splits.forEach(splitWords);

  var readyDone = false;
  function ready() {
    if (readyDone) return; readyDone = true;
    splits.forEach(function (el) { if (el.getAttribute('data-split') === 'load') el.classList.add('in'); });
  }

  /* ======================================================================
     2. Preloader (first visit) / curtain arrival (later pages)
     ====================================================================== */
  var pre = $('.preloader'), countEl = $('.pl-count');
  var curtainLabel = $('.curtain-label');
  try { sessionStorage.setItem('dj-pre', '1'); } catch (e) {}

  function endIntro() { root.classList.remove('is-intro'); }

  if (root.classList.contains('is-intro') && pre && countEl) {
    var start = null, dur = 1300;
    (function tick(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      countEl.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2)));
      if (p < 1) { requestAnimationFrame(tick); }
      else {
        pre.classList.add('is-done');
        window.setTimeout(ready, 350);
        window.setTimeout(endIntro, 1100);
      }
    })(performance.now());
    window.setTimeout(function () { endIntro(); ready(); }, 4500); // safety net
  } else if (root.classList.contains('is-arriving')) {
    if (curtainLabel) curtainLabel.textContent = root.getAttribute('data-label') || '';
    try { sessionStorage.removeItem('dj-nav'); } catch (e) {}
    window.setTimeout(function () { root.classList.add('arrive-go'); }, 80);
    window.setTimeout(ready, 450);
    window.setTimeout(function () { root.classList.remove('is-arriving', 'arrive-go'); ready(); }, 1100);
  } else {
    window.setTimeout(ready, 80);
  }

  /* ======================================================================
     3. Route transitions
     ====================================================================== */
  var labels = { 'index.html': 'Home', 'about.html': 'About', 'projects.html': 'Projects', 'contact.html': 'Contacts' };
  document.addEventListener('click', function (e) {
    if (reduce || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a');
    if (!a || a.target || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!href || /^(mailto:|tel:|#|https?:|javascript:)/i.test(href)) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    var file = (u.pathname.split('/').pop() || 'index.html');
    if (u.pathname === location.pathname) return;
    e.preventDefault();
    var label = labels[file] || '';
    try { sessionStorage.setItem('dj-nav', label); } catch (err) {}
    if (curtainLabel) curtainLabel.textContent = label;
    root.classList.add('is-leaving');
    window.setTimeout(function () { location.href = a.href; }, 720);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) root.classList.remove('is-leaving');
  });

  /* ======================================================================
     4. Fullscreen menu
     ====================================================================== */
  var btn = $('.menu-btn'), menu = $('#menu');
  if (btn && menu) {
    menu.inert = true;
    var setMenu = function (open) {
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      menu.inert = !open;
      if (open) { window.setTimeout(function () { var f = $('a', menu); if (f) f.focus({ preventScroll: true }); }, 450); }
    };
    btn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); btn.focus(); }
    });
  }

  /* ======================================================================
     5. Rolling labels on buttons
     ====================================================================== */
  $$('.touch-btn, .solid-btn, .ghost-btn, .menu-btn .menu-open, .menu-btn .menu-close').forEach(function (el) {
    if (el.children.length || !el.textContent.trim()) return;
    var t = el.textContent.trim();
    el.textContent = '';
    var roll = document.createElement('span'); roll.className = 'roll';
    var inner = document.createElement('span'); inner.setAttribute('data-t', t); inner.textContent = t;
    roll.appendChild(inner); el.appendChild(roll);
  });

  /* ======================================================================
     6. Magnetic elements, custom cursor, card tilt  (mouse devices only)
     ====================================================================== */
  if (fine && !reduce) {
    $$('.touch-btn, .menu-btn, .solid-btn, .ghost-btn, .round-btn, .arrow-link, .scroll-badge').forEach(function (el) {
      el.setAttribute('data-mag', '');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        el.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function () { el.style.translate = ''; });
    });

    var cur = document.createElement('div');
    cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true');
    var lab = document.createElement('span'); lab.className = 'cursor-label';
    cur.appendChild(lab); document.body.appendChild(cur);
    var tx = -100, ty = -100, cx = -100, cy = -100;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; cur.classList.add('is-on');
    });
    document.documentElement.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
    document.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      var withLabel = t.closest && t.closest('[data-cursor]');
      var link = t.closest && t.closest('a, button, summary, textarea, label, input');
      lab.textContent = withLabel ? withLabel.getAttribute('data-cursor') : '';
      cur.classList.toggle('has-label', !!withLabel);
      cur.classList.toggle('is-link', !!link && !withLabel);
      cur.classList.toggle('on-light', !!(t.closest && t.closest('.need, .serv-list > li')));
    });
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();

    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-tilting');
        el.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (px * 11).toFixed(2) + 'deg');
        el.style.setProperty('--tx', (px * 16).toFixed(1) + 'px');
        el.style.setProperty('--ty', (py * 16).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        ['--rx', '--ry', '--tx', '--ty'].forEach(function (v) { el.style.removeProperty(v); });
      });
    });
  }

  /* ======================================================================
     7. Hero canvas: soft drifting light that follows the pointer
     ====================================================================== */
  (function heroCanvas() {
    var cv = $('.hero-canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), hero = cv.parentNode;
    var w = 0, h = 0, S = 0.5, running = false, visible = true;
    var mx = 0.7, my = 0.4, tmx = 0.7, tmy = 0.4;
    var blobs = [
      { x: 0.18, y: 0.30, r: 0.55, c: '244,181,42', a: 0.20, sx: 0.00021, sy: 0.00017, p: 0 },
      { x: 0.82, y: 0.22, r: 0.60, c: '84,104,255', a: 0.30, sx: 0.00017, sy: 0.00023, p: 2 },
      { x: 0.60, y: 0.88, r: 0.55, c: '168,182,255', a: 0.14, sx: 0.00025, sy: 0.00019, p: 4 }
    ];
    function size() {
      var r = hero.getBoundingClientRect();
      w = cv.width = Math.max(2, Math.round(r.width * S));
      h = cv.height = Math.max(2, Math.round(r.height * S));
    }
    function blob(cx, cy, rad, rgb, a) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      var m = Math.max(w, h);
      blobs.forEach(function (b) {
        var cx = (b.x + Math.sin(t * b.sx + b.p) * 0.14) * w;
        var cy = (b.y + Math.cos(t * b.sy + b.p) * 0.12) * h;
        blob(cx, cy, b.r * m, b.c, b.a);
      });
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      blob(mx * w, my * h, 0.3 * m, '244,181,42', 0.34);
    }
    function frame(t) {
      if (!running) return;
      draw(t); requestAnimationFrame(frame);
    }
    function start() { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }
    size(); draw(1200);
    window.addEventListener('resize', function () { size(); draw(1200); });
    if (!reduce) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tmx = (e.clientX - r.left) / r.width; tmy = (e.clientY - r.top) / r.height;
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
      }
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
      start();
    }
  })();

  /* ======================================================================
     8. Scroll-driven effects (one rAF-throttled handler)
     ====================================================================== */
  var header = $('.site-header'), progress = $('.progress');
  var heroTitle = $('.hero-title'), heroFoot = $('.hero-foot'), heroCv = $('.hero-canvas');
  var parallaxEls = $$('[data-parallax]');
  var marquee = $('[data-marquee]'), needSec = $('.need');
  var st = $('[data-words]'), words = [];
  var lastY = window.scrollY, ticking = false;

  if (st) {
    var list = st.textContent.trim().split(/\s+/);
    st.setAttribute('aria-label', list.join(' '));
    st.innerHTML = '';
    words = list.map(function (wd) {
      var s = document.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = wd;
      st.appendChild(s); st.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  var mq = { x: 0, vel: 0, half: 0, on: false };
  if (marquee && !reduce) {
    marquee.classList.add('is-js');
    if ('IntersectionObserver' in window && needSec) {
      new IntersectionObserver(function (en) { mq.on = en[0].isIntersecting; }).observe(needSec);
    } else { mq.on = true; }
    (function mloop() {
      if (mq.on) {
        mq.half = marquee.scrollWidth / 2;
        mq.x -= 0.7 + mq.vel * 0.35;
        if (mq.x <= -mq.half) mq.x += mq.half;
        if (mq.x > 0) mq.x -= mq.half;
        marquee.style.transform = 'translate3d(' + mq.x.toFixed(1) + 'px,0,0)';
      }
      mq.vel *= 0.92;
      requestAnimationFrame(mloop);
    })();
  }

  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var H = document.documentElement.scrollHeight - vh;

    if (header) {
      header.classList.toggle('is-scrolled', y > 10);
      var menuOpen = root.classList.contains('menu-open');
      header.classList.toggle('is-hidden', !menuOpen && y > vh * 0.6 && y > lastY + 2);
      if (y < lastY - 2 || y < 80) header.classList.remove('is-hidden');
    }
    if (progress && H > 0) progress.style.transform = 'scaleX(' + Math.min(y / H, 1).toFixed(4) + ')';

    if (!reduce && heroTitle && y < vh * 1.2) {
      var p = Math.min(y / (vh * 0.8), 1);
      heroTitle.style.transform = 'translate3d(0,' + (p * 90).toFixed(1) + 'px,0)';
      heroTitle.style.opacity = (1 - p * 0.85).toFixed(3);
      if (heroFoot) { heroFoot.style.transform = 'translate3d(0,' + (p * 40).toFixed(1) + 'px,0)'; heroFoot.style.opacity = (1 - p * 1.1).toFixed(3); }
      if (heroCv) heroCv.style.transform = 'translate3d(0,' + (p * 60).toFixed(1) + 'px,0)';
    }

    if (!reduce) {
      parallaxEls.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
        var d = (r.top + r.height / 2 - vh / 2) * -speed;
        var lim = r.height * 0.055;
        el.style.setProperty('--py', Math.max(-lim, Math.min(lim, d)).toFixed(1) + 'px');
      });
    }

    if (words.length) {
      var rr = st.getBoundingClientRect();
      var pr = reduce ? 1 : Math.min(Math.max((vh * 0.88 - rr.top) / (rr.height + vh * 0.3), 0), 1);
      var n = Math.round(pr * words.length);
      words.forEach(function (s, i) { s.classList.toggle('on', i < n); });
    }

    mq.vel += Math.max(-40, Math.min(40, y - lastY)) * 0.12;
    lastY = y;
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  onScroll();

  /* ======================================================================
     9. Reveal on scroll
     ====================================================================== */
  var targets = $$('.sec-head, .rail > li, .serv-list > li, .job, .skill-list > div, .bg-block, .grid > li, .contact-grid > li, .foot-grid > *, .prose > *, .hero-sub');
  targets.forEach(function (t) {
    var idx = Array.prototype.indexOf.call(t.parentNode.children, t);
    t.style.setProperty('--d', (idx % 6) * 90);
    t.setAttribute('data-reveal', '');
  });
  var observed = targets.concat($$('[data-clip]')).concat(splits.filter(function (s) { return s.getAttribute('data-split') !== 'load'; }));
  // hero sub text should not wait for scroll
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    observed.forEach(function (t) { io.observe(t); });
  } else {
    observed.forEach(function (t) { t.classList.add('in'); });
  }

  /* ======================================================================
     10. Project rail: arrows + mouse drag
     ====================================================================== */
  var rail = $('.rail');
  $$('[data-scroll]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!rail) return;
      var card = $('li', rail);
      var step = card ? card.getBoundingClientRect().width + 24 : 320;
      rail.scrollBy({ left: step * Number(b.getAttribute('data-scroll')), behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  if (rail) {
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button) return;
      down = true; sx = e.clientX; sl = rail.scrollLeft; moved = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) rail.classList.add('is-dragging');
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      window.setTimeout(function () { rail.classList.remove('is-dragging'); }, 60);
    });
    rail.addEventListener('click', function (e) {
      if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);
  }

  /* ======================================================================
     11. "I need ..." brief flow
     ====================================================================== */
  var need = $('[data-need]');
  if (need) {
    var options = ['a Shopify store', 'a WordPress site', 'an API integration', 'an AI-powered feature'];
    var i = 0, mail = need.getAttribute('data-mail');
    var word = $('[data-need-word]', need), go = $('[data-need-go]', need);
    var step1 = $('[data-step="1"]', need), step2 = $('[data-step="2"]', need);
    var chosen = $('[data-need-chosen]', need), brief = $('#brief', need), send = $('[data-need-send]', need);
    var subject = function () { return 'I need ' + options[i]; };
    var link = function () {
      return 'mailto:' + mail + '?subject=' + encodeURIComponent(subject()) +
        (brief && brief.value.trim() ? '&body=' + encodeURIComponent(brief.value.trim()) : '');
    };
    var show = function () {
      word.textContent = options[i];
      word.classList.remove('swap'); void word.offsetWidth; word.classList.add('swap');
      go.href = link();
    };
    $('[data-need-next]', need).addEventListener('click', function () { i = (i + 1) % options.length; show(); });
    go.addEventListener('click', function (e) {
      e.preventDefault();
      chosen.textContent = options[i]; send.href = link();
      step1.hidden = true; step2.hidden = false; brief.focus({ preventScroll: true });
    });
    $('[data-need-back]', need).addEventListener('click', function () { step2.hidden = true; step1.hidden = false; });
    brief.addEventListener('input', function () { send.href = link(); });
  }

  /* ======================================================================
     12. Footer reveal
     ====================================================================== */
  var footer = $('.site-footer');
  function setFooter() {
    if (!footer) return;
    var fh = footer.offsetHeight;
    var ok = !reduce && window.innerWidth >= 900 && fh < window.innerHeight * 0.85;
    root.classList.toggle('footer-reveal', ok);
    if (ok) root.style.setProperty('--footer-h', fh + 'px');
  }
  setFooter();
  window.addEventListener('resize', setFooter);
  window.addEventListener('load', setFooter);
})();
