(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const header = $('.header');
  const progress = $('.progress');
  const overlay = $('.nav-overlay');
  const menuButton = $('.menu-toggle');
  const navLinks = $$('.topnav a[href^="#"], .overlay-links a[href^="#"]');
  const sectionIds = [...new Set($$('.topnav a[href^="#"]').map(link => link.hash.slice(1)))];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  function updateActiveSection() {
    const marker = Math.min(220, window.innerHeight * 0.34);
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) active = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = sections.at(-1) || active;
    }
    if (!active) return;
    for (const link of navLinks) {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function updateScrollUI() {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${maxScroll > 0 ? (doc.scrollTop / maxScroll) * 100 : 0}%`;
    header?.classList.toggle('scrolled', doc.scrollTop > 24);
    updateActiveSection();
  }

  window.addEventListener('scroll', updateScrollUI, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  window.addEventListener('hashchange', updateScrollUI);
  updateScrollUI();

  menuButton?.addEventListener('click', () => {
    const open = overlay.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('.overlay-links a').forEach(link => link.addEventListener('click', () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    menuButton?.setAttribute('aria-expanded', 'false');
    window.setTimeout(updateActiveSection, 350);
  }));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    $$('.reveal').forEach((element, index) => {
      element.style.setProperty('--i', String(index % 5));
      revealObserver.observe(element);
    });
  } else {
    $$('.reveal').forEach(element => element.classList.add('visible'));
  }

  const cursor = $('.cursor-dot');
  if (cursor && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', event => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.classList.add('active');
    }, { passive: true });
    $$('a, button, .project-card').forEach(element => {
      element.addEventListener('pointerenter', () => cursor.classList.add('big'));
      element.addEventListener('pointerleave', () => cursor.classList.remove('big'));
    });
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-tilt]').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-3px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }

  const form = $('#contactForm');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const subject = encodeURIComponent(`Portfolio enquiry: ${values.get('service')}`);
    const body = encodeURIComponent(`Name: ${values.get('name')}\nEmail: ${values.get('email')}\nProject type: ${values.get('service')}\n\n${values.get('message')}`);
    window.location.href = `mailto:dhiren.jummani.jhd@gmail.com?subject=${subject}&body=${body}`;
  });
  $$('[data-year]').forEach(element => { element.textContent = String(new Date().getFullYear()); });
})();
