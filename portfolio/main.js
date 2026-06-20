/* ============================================================
   PORTFOLIO — Shashank Venkatesh  |  main.js
   ============================================================ */

// ---- Theme toggle (persisted; synced to chat iframe via postMessage) ----
(function initTheme() {
  const html = document.documentElement;
  const btn  = document.getElementById('themeToggle');

  // Shared key with the chat page so both read/write the same preference
  const THEME_KEY = 'avatar-theme';

  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  html.setAttribute('data-theme', saved);

  function broadcastTheme(value) {
    // Notify the chat iframe if it is loaded
    const iframe = document.querySelector('#chat-panel iframe');
    try {
      iframe?.contentWindow?.postMessage({ type: 'avatar-theme', value }, '*');
    } catch (_) {}
  }

  btn?.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    broadcastTheme(next);
  });
})();

// ---- Active nav on scroll ----
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a[href^="#"], .nav-drawer a[href^="#"]');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-50% 0px -45% 0px' });

  sections.forEach(s => obs.observe(s));
})();

// ---- Mobile hamburger ----
(function initHamburger() {
  const btn = document.getElementById('hamburger');
  const drawer = document.getElementById('nav-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('is-open');
    drawer.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  // Close on link click
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('is-open');
      drawer.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
})();

// ---- Scroll reveal ----
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => obs.observe(el));
})();

// ---- Experience cards (expand/collapse) ----
(function initExpCards() {
  document.querySelectorAll('.exp-card').forEach(card => {
    card.addEventListener('click', () => {
      const isExpanded = card.classList.contains('is-expanded');
      // Collapse all
      document.querySelectorAll('.exp-card').forEach(c => c.classList.remove('is-expanded'));
      // Expand clicked if it wasn't already
      if (!isExpanded) card.classList.add('is-expanded');
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();

// ---- Project cards (3D flip) ----
(function initProjectCards() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();

// ---- Skill pills stagger entrance ----
(function initSkillPills() {
  const groups = document.querySelectorAll('.skill-pills');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const pills = entry.target.querySelectorAll('.skill-pill');
      pills.forEach((pill, i) => {
        setTimeout(() => pill.classList.add('is-visible'), i * 60);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  groups.forEach(g => obs.observe(g));
})();

// ---- Chat widget ----
(function initChatWidget() {
  const trigger = document.getElementById('chat-trigger');
  const panel   = document.getElementById('chat-panel');
  if (!trigger || !panel) return;

  let iframeLoaded = false;

  trigger.addEventListener('click', () => {
    const isOpen = panel.classList.contains('is-open');
    if (isOpen) {
      panel.classList.remove('is-open');
      setTimeout(() => { panel.style.display = 'none'; }, 320);
    } else {
      panel.style.display = 'flex';
      // Force reflow before adding class for transition
      panel.getBoundingClientRect();
      panel.classList.add('is-open');

      if (!iframeLoaded) {
        const iframe = panel.querySelector('iframe');
        if (iframe) iframe.src = iframe.dataset.src || '/chat';
        iframeLoaded = true;
      }
    }
  });
})();

// ---- Chat CTA card click ----
(function initChatCta() {
  const cta = document.getElementById('chat-cta');
  if (!cta) return;
  cta.addEventListener('click', () => {
    document.getElementById('chat-trigger')?.click();
  });
  cta.setAttribute('tabindex', '0');
  cta.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cta.click(); }
  });
})();

// ---- Duplicate ticker items for seamless loop ----
(function initTicker() {
  const ticker = document.querySelector('.ticker');
  if (!ticker) return;
  const clone = ticker.innerHTML;
  ticker.innerHTML = clone + clone; // duplicate for seamless loop
})();
