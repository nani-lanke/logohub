/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/_brands.js   (shared by api/brand.js and api/sitemap.js)
   The leading "_" tells Vercel this file is not an API route.

   Reads companies.js (bundled with the function — see "functions" in
   vercel.json) and builds server-rendered HTML, so Google can read
   every company name, description and link without running JavaScript.
   Every logo form submit commits companies.js → Vercel redeploys →
   the brand pages and sitemap update on their own.
   ════════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const SITE = (process.env.SITE_URL || 'https://www.logohub.in').replace(/\/+$/, '');

// companies[] exactly as the wall sees it right now (expired entries already
// removed, slug added) plus the shared category colours and labels
function loadBrands() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'companies.js'), 'utf8');
  return vm.runInNewContext(`${src}\n;({ companies, colorMap, categoryLabels })`, {}, { timeout: 1000 });
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Only real web links make it into a page
const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : '');

// 'screenone/box121.png?v=…' → '/screenone/box121.png?v=…'
const logoPath = c => `/${String(c.icon).replace(/^\/+/, '')}`;

// '2026-10-31T22:31:37+05:30' → '31 October 2026'
const niceDate = s => {
  const ms = Date.parse(s);
  return isNaN(ms) ? '' : new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

// Trim to a search-snippet length on a word boundary
function clip(s, max = 155) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// Paid boxes are adverts → rel="sponsored"; the rest are user-submitted → "ugc"
const linkRel = c => `${c.paymentId ? 'sponsored' : 'ugc'} noopener noreferrer`;

// ─── Link buttons (same order and icons as the wall popup) ─────
const svgAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const LINKS = [
  { key: 'website',   label: 'Visit website', short: 'Website',
    svg: `<svg ${svgAttrs}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
  { key: 'youtube',   label: 'YouTube channel', short: 'YouTube',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29.94 29.94 0 0 0 1 12a29.94 29.94 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29.94 29.94 0 0 0 23 12a29.94 29.94 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>' },
  { key: 'instagram', label: 'Instagram', short: 'Instagram',
    svg: `<svg ${svgAttrs}><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/></svg>` },
  { key: 'whatsapp',  label: 'WhatsApp', short: 'WhatsApp',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"> <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/> <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.117a.75.75 0 0 0 .916.919l5.404-1.461A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.964-1.357l-.356-.21-3.688.997 1.006-3.598-.232-.371A9.725 9.725 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>' },
  { key: 'location',  label: 'Location', short: 'Location',
    svg: `<svg ${svgAttrs}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
];

const brandLinks = c => LINKS
  .map(l => ({ ...l, url: safeUrl(c.links && c.links[l.key]) }))
  .filter(l => l.url);

// ════════════════════════════════════════════════════════════
//  PAGE SHELL — same header, footer, theme and fonts as the
//  static pages. All paths are absolute (pages live under /brand/).
// ════════════════════════════════════════════════════════════
function page({ title, description, canonical, image, imageAlt, ogType = 'website', card = 'summary_large_image', jsonLd, noindex, body }) {
  const ogImage = image || `${SITE}/icons/og-image.jpg`;
  const ld = jsonLd ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">${noindex ? '\n  <meta name="robots" content="noindex">' : ''}
  <meta name="theme-color" content="#0d1017">${canonical ? `\n  <link rel="canonical" href="${esc(canonical)}">` : ''}

  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="LogoHub">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">${canonical ? `\n  <meta property="og:url" content="${esc(canonical)}">` : ''}
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:alt" content="${esc(imageAlt || title)}">
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="${card}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">

  <link rel="icon" type="image/png" href="/icons/logohub-icon.png">
  <link rel="apple-touch-icon" href="/icons/logohub-icon.png">
  <link rel="stylesheet" href="/theme.css">
  <link rel="stylesheet" href="/css.css">
  <script src="/theme.js"></script>
  <style>${STYLES}</style>${ld}
</head>
<body>

  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/">
        <img src="/icons/logohub-icon.png" alt="">
        <span>LogoHub</span>
      </a>

      <nav class="header-bar" aria-label="Main">
        <a href="/#home">Logo Wall</a>
        <a href="/brands">All Brands</a>
        <a href="/#colours">Colour Guide</a>
        <a href="/#about">How It Works</a>
        <a class="nav-cta" href="/sendrequest.html">Add Your Logo</a>
      </nav>

      <div class="header-actions">
        <a class="btn btn-primary btn-sm header-cta" href="/sendrequest.html">Add Your Logo</a>
        <button class="theme-toggle" type="button" aria-label="Toggle colour theme">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="header-icon" id="header-icon" type="button" aria-label="Open menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>

${body}

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="footer-logo" href="/">
            <img src="/icons/logohub-icon.png" alt="">
            <span>LogoHub</span>
          </a>
          <p class="footer-tagline">Every company logo in one place &mdash; one click takes you to their website.</p>
        </div>

        <nav class="footer-col" aria-label="Explore">
          <h4>Explore</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/#home">Logo Wall</a></li>
            <li><a href="/brands">All Brands</a></li>
            <li><a href="/sendrequest.html">Add Your Logo</a></li>
          </ul>
        </nav>

        <nav class="footer-col" aria-label="Learn">
          <h4>Learn</h4>
          <ul>
            <li><a href="/#about">How It Works</a></li>
            <li><a href="/#colours">What the Colours Mean</a></li>
            <li><a href="/logoUploadInstructions.html">Logo Size Guide</a></li>
            <li><a href="/sendrequest.html">Pricing</a></li>
          </ul>
        </nav>

        <nav class="footer-col" aria-label="Company">
          <h4>Company</h4>
          <ul>
            <li><a href="/termsandconditions.html#privacy">Privacy Policy</a></li>
            <li><a href="/termsandconditions.html#terms">Terms &amp; Conditions</a></li>
            <li><a href="mailto:support@logohub.in">Contact Us</a></li>
          </ul>
        </nav>
      </div>

      <div class="footer-bottom">
        <div>
          <p class="footer-copy">&copy; ${new Date().getFullYear()} LogoHub. All rights reserved.</p>
        </div>
        <div class="footer-mini-links">
          <a href="mailto:support@logohub.in">Contact</a>
          <a href="/termsandconditions.html#privacy">Privacy</a>
          <a href="/termsandconditions.html#terms">Terms</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // Mobile menu
    const menuBtn = document.getElementById('header-icon');
    const navbar  = document.querySelector('.header-bar');
    function setMenu(open) {
      navbar.classList.toggle('active', open);
      menuBtn.setAttribute('aria-expanded', open);
    }
    menuBtn.addEventListener('click', () => setMenu(!navbar.classList.contains('active')));
    navbar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    window.addEventListener('scroll', () => setMenu(false));
  </script>
</body>
</html>`;
}

// ─── Brand card used in lists (directory + "more in this category") ──
function brandCard(c, colorMap) {
  const color = colorMap[c.category] || '#777777';
  return `<li>
          <a class="bc" href="/brand/${esc(c.slug)}" style="--cat:${esc(color)}">
            <img src="${esc(logoPath(c))}" alt="${esc(c.name)} logo" width="56" height="56" loading="lazy">
            <span class="bc-text">
              <span class="bc-name">${esc(c.name)}</span>
              <span class="bc-service">${esc(c.serviceType)}</span>
            </span>
          </a>
        </li>`;
}

// ════════════════════════════════════════════════════════════
//  STYLES for the brand pages (everything else comes from css.css)
// ════════════════════════════════════════════════════════════
const STYLES = `
    .bp { padding: 112px 0 96px; }
    .bp .container { max-width: 1000px; }
    .crumbs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; font-size: 13px; color: var(--text-dim); }
    .crumbs a { color: var(--text-dim); text-decoration: none; }
    .crumbs a:hover { color: var(--accent); }
    .crumbs span[aria-current] { color: var(--text); }

    .bp-card {
      display: grid; grid-template-columns: 220px 1fr; gap: 40px; align-items: start;
      padding: 40px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow-sm);
    }
    .bp-logo {
      aspect-ratio: 1; display: grid; place-items: center; padding: 16px;
      background: #ffffff; border: 3px solid var(--cat); border-radius: 22px;
    }
    .bp-logo img { width: 100%; height: 100%; object-fit: contain; }
    .bp-cat {
      display: inline-flex; align-items: center; gap: 8px; margin: 0 0 14px;
      font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--cat); }
    .bp-name {
      margin: 0; font-family: var(--font-display); font-weight: 800;
      font-size: clamp(32px, 5vw, 52px); line-height: 1.08; letter-spacing: -0.01em; overflow-wrap: anywhere;
    }
    .bp-service {
      display: inline-block; margin: 14px 0 0; padding: 4px 14px;
      font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--accent); border: 1px solid var(--border-strong); border-radius: 999px;
    }
    .bp-desc { margin: 20px 0 0; font-size: 17px; line-height: 1.7; color: var(--text); overflow-wrap: anywhere; }
    .bp-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
    .bp-links .btn svg { width: 18px; height: 18px; }
    .bp-meta { margin: 24px 0 0; font-size: 14px; line-height: 1.7; color: var(--text-dim); }
    .bp-meta a { color: var(--accent); font-weight: 600; text-decoration: none; }
    .bp-meta a:hover { text-decoration: underline; }

    .bp-section { margin-top: 56px; }
    .bp-section h2 {
      display: flex; align-items: center; gap: 10px; margin: 0 0 18px;
      font-family: var(--font-display); font-size: clamp(22px, 2.6vw, 28px);
    }
    .bp-section h2 .count { font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--text-dim); }

    .brand-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .bc {
      display: flex; align-items: center; gap: 14px; height: 100%; padding: 14px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      text-decoration: none; color: var(--text); transition: border-color 0.18s, transform 0.18s;
    }
    .bc:hover { border-color: var(--cat); transform: translateY(-2px); }
    .bc img {
      width: 56px; height: 56px; flex-shrink: 0; object-fit: contain; padding: 4px;
      background: #ffffff; border: 2px solid var(--cat); border-radius: 12px;
    }
    .bc-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .bc-name { font-weight: 700; font-size: 16px; overflow-wrap: anywhere; }
    .bc-service { font-size: 13px; color: var(--text-dim); }

    .dir-hero { padding-bottom: 32px; }
    .dir-hero .hero-title { font-size: clamp(36px, 6vw, 68px); }
    .dir { padding: 0 0 96px; }
    .dir .container { max-width: 1100px; }
    .dir .bp-section:first-child { margin-top: 0; }
    .bp-cta { margin-top: 56px; text-align: center; }

    @media (max-width: 700px) {
      .bp { padding-top: 96px; }
      .bp-card { grid-template-columns: 1fr; gap: 24px; padding: 24px; }
      .bp-logo { width: 160px; }
      .bp-links .btn { flex: 1 1 auto; }
    }
`;

module.exports = { SITE, loadBrands, esc, safeUrl, logoPath, niceDate, clip, linkRel, brandLinks, page, brandCard };
