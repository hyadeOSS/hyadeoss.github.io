// Shared behaviour for the mariowOS website: theme switcher, mobile menu, reveal on scroll.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Theme switcher: Dark → Light → Auto ---- */
  const ICONS = { dark: 'dark_mode', light: 'light_mode', auto: 'brightness_auto' };
  const LABELS = { dark: 'Dark', light: 'Light', auto: 'Automatic' };
  const NEXT = { dark: 'light', light: 'auto', auto: 'dark' };
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    const sync = () => {
      const c = window.mariowOSTheme ? window.mariowOSTheme.get() : 'dark';
      if (icon) icon.textContent = ICONS[c];
      btn.setAttribute('aria-label', 'Appearance: ' + LABELS[c] + '. Click to change.');
      btn.title = 'Appearance: ' + LABELS[c];
    };
    btn.addEventListener('click', () => window.mariowOSTheme && window.mariowOSTheme.set(NEXT[window.mariowOSTheme.get()]));
    document.addEventListener('mw-theme', sync);
    sync();
  });

  /* ---- Mobile menu ---- */
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const bar = document.querySelector('.mw-bar');
  if (menuBtn && bar) {
    menuBtn.addEventListener('click', () => {
      const open = bar.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { bar.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });
    bar.querySelectorAll('.mw-nav a').forEach(a => a.addEventListener('click', () => bar.classList.remove('open')));
  }

  /* ---- Reveal on scroll (short and calm) ---- */
  const items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---- Segmented controls (before/after) ---- */
  document.querySelectorAll('[data-seg]').forEach(seg => {
    const target = document.querySelector(seg.dataset.seg);
    const buttons = seg.querySelectorAll('button');
    buttons.forEach(b => b.addEventListener('click', () => {
      buttons.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      if (target) target.dataset.view = b.dataset.view;
    }));
  });
})();
