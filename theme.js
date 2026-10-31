/* ════════════════════════════════════════════════════════════
   LOGOHUB — theme.js  (shared by every page)

   Load in <head> WITHOUT defer so the saved theme is applied
   before the page paints (no flash of the wrong colours).

   1. Picks the theme: saved choice → system preference → dark
   2. Wires every .theme-toggle button to switch light / dark
   3. Remembers the choice in localStorage
   ════════════════════════════════════════════════════════════ */
(function () {
  const KEY  = 'logohub-theme';
  const root = document.documentElement;

  function savedTheme() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', `Switch to ${next} mode`);
      btn.setAttribute('title', `Switch to ${next} mode`);
    });
  }

  applyTheme(savedTheme() || systemTheme());

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(root.getAttribute('data-theme'));

    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.classList.add('theme-anim');
        applyTheme(next);
        try { localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
        setTimeout(() => root.classList.remove('theme-anim'), 400);
      });
    });
  });

  // Follow the OS setting live, unless the user picked one
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (!savedTheme()) applyTheme(e.matches ? 'light' : 'dark');
    });
  }
})();
