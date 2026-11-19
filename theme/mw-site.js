// mariowOS website: adds the theme switch (Dark → Light → Automatic) next to the social icons.
// The theme itself is handled by mw-theme.js; the colors come from mw-design.css and mw-skin.css.
(() => {
  const ICONS = {
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'
  };
  const NEXT = { dark: 'light', light: 'auto', auto: 'dark' };
  const NAME = { dark: 'Dark', light: 'Light', auto: 'Automatic' };
  const host = document.querySelector('.hud-right, .hud-tr');
  if (!host || !window.mariowOSTheme) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mw-theme-btn';
  const sync = () => {
    const c = window.mariowOSTheme.get();
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[c] + '</svg>';
    btn.title = 'Appearance: ' + NAME[c];
    btn.setAttribute('aria-label', 'Appearance: ' + NAME[c] + '. Click to change.');
  };
  btn.addEventListener('click', () => window.mariowOSTheme.set(NEXT[window.mariowOSTheme.get()]));
  document.addEventListener('mw-theme', sync);
  sync();
  host.appendChild(btn);
})();
