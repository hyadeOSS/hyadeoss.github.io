// hyadeOS light/dark theme for the website, same contract as desktop/assets/mw-theme.js
// (see docs/design.md in hyadeOS/stable): <html data-theme="dark|light">, the choice
// ("dark", "light" or "auto") is cached in localStorage["mwTheme"] and every open page follows it.
// Load it in <head>, before any stylesheet, so the first paint is already in the right theme.
(function () {
  const KEY = 'mwTheme';
  const CHOICES = ['dark', 'light', 'auto'];
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  const clean = v => (CHOICES.includes(v) ? v : 'dark');
  const read = () => { try { return clean(localStorage.getItem(KEY)); } catch (e) { return 'dark'; } };
  const write = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const resolve = c => (c === 'auto' ? (media && media.matches ? 'light' : 'dark') : c);

  let current = read();

  function apply(choice) {
    current = clean(choice);
    const theme = resolve(current);
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    root.dataset.themeChoice = current;
    document.dispatchEvent(new CustomEvent('mw-theme', { detail: { choice: current, theme } }));
    return theme;
  }
  function set(choice) { choice = clean(choice); write(choice); apply(choice); return choice; }

  root.classList.add('js');
  apply(current);

  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) apply(read()); });
  if (media) {
    const follow = () => { if (current === 'auto') apply('auto'); };
    if (media.addEventListener) media.addEventListener('change', follow); else if (media.addListener) media.addListener(follow);
  }

  window.hyadeOSTheme = { get: () => current, resolved: () => resolve(current), set, apply };
})();
