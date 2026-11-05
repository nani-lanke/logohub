/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/brand.js   (Vercel serverless function)

   Server-rendered pages Google can read (rewrites in vercel.json):
     /brand/<slug>  → one page per listed company: name, description,
                      category, links, logo, JSON-LD
     /brands        → every listed company, grouped by category

   The slug comes from companies.js (see "BRAND PAGE ADDRESS" there).
   Expired companies drop off automatically and their page returns 404.
   ════════════════════════════════════════════════════════════ */

const {
  SITE, loadBrands, esc, logoPath, niceDate, clip, linkRel, brandLinks, page, brandCard,
} = require('./_brands.js');

// CDN keeps a page for an hour; every deploy (= every new logo) clears it
const CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

module.exports = (req, res) => {
  try {
    const data = loadBrands();
    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    return slug ? brandPage(req, res, data, slug) : directoryPage(res, data);
  } catch (err) {
    console.error(err);
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Something went wrong. Please try again in a minute.');
  }
};

function send(res, status, html) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? CACHE : 'public, max-age=0, s-maxage=300');
  res.end(html);
}

// ════════════════════════════════════════════════════════════
//  /brand/<slug>
// ════════════════════════════════════════════════════════════
function brandPage(req, res, { companies, colorMap, categoryLabels }, rawSlug) {
  const slug = rawSlug.toLowerCase();
  let c = companies.find(x => x.slug === slug);

  // /brand/box-121 → that box's real address
  const byBox = !c && slug.match(/^box-(\d+)$/);
  if (byBox) c = companies.find(x => x.box === Number(byBox[1]));

  if (!c) return send(res, 404, notFoundPage());
  if (c.slug !== rawSlug) {
    res.setHeader('Location', `/brand/${encodeURIComponent(c.slug)}`);
    return res.status(301).end();
  }

  const color     = colorMap[c.category] || '#777777';
  const category  = categoryLabels[c.category] || 'Others';
  const canonical = `${SITE}/brand/${c.slug}`;
  const logo      = `${SITE}${logoPath(c)}`;
  const links     = brandLinks(c);
  const since     = niceDate(c.buyingDate);

  const title       = `${c.name} – ${c.serviceType} | LogoHub`;
  const description = clip(`${c.name} – ${c.serviceType} on LogoHub. ${c.shortName}`);

  const others = companies
    .filter(x => x.category === c.category && x.box !== c.box)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type'      : 'Organization',
        '@id'        : `${canonical}#org`,
        name         : c.name,
        description  : c.shortName,
        logo,
        image        : logo,
        url          : links.find(l => l.key === 'website')?.url || canonical,
        ...(links.length && { sameAs: links.filter(l => l.key !== 'location').map(l => l.url) }),
      },
      {
        '@type'         : 'BreadcrumbList',
        itemListElement : [
          { '@type': 'ListItem', position: 1, name: 'LogoHub', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Brands',  item: `${SITE}/brands` },
          { '@type': 'ListItem', position: 3, name: c.name,    item: canonical },
        ],
      },
    ],
  };

  const rel = linkRel(c);
  const buttons = links.map((l, i) => `
          <a class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}" href="${esc(l.url)}" target="_blank" rel="${rel}">${l.svg}${esc(l.label)}</a>`).join('');

  const body = `  <main class="bp">
    <div class="container">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">LogoHub</a><span aria-hidden="true">/</span>
        <a href="/brands">Brands</a><span aria-hidden="true">/</span>
        <span aria-current="page">${esc(c.name)}</span>
      </nav>

      <article class="bp-card" style="--cat:${esc(color)}">
        <div class="bp-logo">
          <img src="${esc(logoPath(c))}" alt="${esc(c.name)} logo" width="220" height="220">
        </div>
        <div class="bp-info">
          <p class="bp-cat"><span class="dot"></span>${esc(category)}</p>
          <h1 class="bp-name">${esc(c.name)}</h1>
          <p class="bp-service">${esc(c.serviceType)}</p>
          <p class="bp-desc">${esc(c.shortName)}</p>
          ${buttons ? `<div class="bp-links">${buttons}
          </div>` : ''}
          <p class="bp-meta">
            Box ${c.box} on the LogoHub wall${since ? ` &middot; Listed since ${esc(since)}` : ''}
            &middot; <a href="/#box${c.box}">See it on the wall &rarr;</a>
          </p>
        </div>
      </article>

      ${others.length ? `<section class="bp-section" style="--cat:${esc(color)}">
        <h2><span class="dot"></span>More in ${esc(category)}</h2>
        <ul class="brand-grid">
        ${others.map(o => brandCard(o, colorMap)).join('\n        ')}
        </ul>
      </section>` : ''}

      <div class="bp-cta">
        <a class="btn btn-ghost" href="/brands">Browse all brands</a>
        <a class="btn btn-primary" href="/sendrequest.html">Add your logo</a>
      </div>
    </div>
  </main>`;

  return send(res, 200, page({
    title, description, canonical,
    image: logo, imageAlt: `${c.name} logo`, ogType: 'profile', card: 'summary',
    jsonLd, body,
  }));
}

// ════════════════════════════════════════════════════════════
//  /brands — every company, grouped by category
// ════════════════════════════════════════════════════════════
function directoryPage(res, { companies, colorMap, categoryLabels }) {
  const canonical = `${SITE}/brands`;
  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));

  const sections = Object.keys(colorMap)
    .map(cat => ({ cat, list: sorted.filter(c => (colorMap[c.category] ? c.category : 'other') === cat) }))
    .filter(s => s.list.length)
    .map(({ cat, list }) => `      <section class="bp-section" id="${esc(cat)}" style="--cat:${esc(colorMap[cat])}">
        <h2><span class="dot"></span>${esc(categoryLabels[cat])} <span class="count">${list.length}</span></h2>
        <ul class="brand-grid">
        ${list.map(c => brandCard(c, colorMap)).join('\n        ')}
        </ul>
      </section>`).join('\n\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type'   : 'CollectionPage',
    name      : 'Brands on LogoHub',
    url       : canonical,
    mainEntity: {
      '@type'        : 'ItemList',
      numberOfItems  : sorted.length,
      itemListElement: sorted.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${SITE}/brand/${c.slug}` })),
    },
  };

  const body = `  <section class="hero dir-hero">
    <div class="container hero-inner">
      <p class="eyebrow"><span class="eyebrow-dot"></span>Brand directory</p>
      <h1 class="hero-title">Every brand on <em>LogoHub</em></h1>
      <p class="hero-sub">
        Indian businesses, shops and creators listed on the LogoHub wall. Open any brand to see
        what they do and jump to their website, YouTube, Instagram or WhatsApp.
      </p>
    </div>
  </section>

  <main class="dir">
    <div class="container">
${sections || '      <p class="hero-sub">No brands are listed right now.</p>'}

      <div class="bp-cta">
        <a class="btn btn-ghost" href="/#home">See the logo wall</a>
        <a class="btn btn-primary" href="/sendrequest.html">Add your logo</a>
      </div>
    </div>
  </main>`;

  return send(res, 200, page({
    title: 'All Brands on LogoHub – Indian Businesses & Creators',
    description: clip(`Browse ${sorted.length ? `${sorted.length} ` : ''}Indian brands, businesses and creators listed on LogoHub, by category. One click takes you to their website, YouTube, Instagram or WhatsApp.`),
    canonical, jsonLd, body,
  }));
}

function notFoundPage() {
  return page({
    title: 'Brand not found | LogoHub',
    description: 'This brand is not on the LogoHub wall right now.',
    noindex: true,
    body: `  <section class="hero dir-hero">
    <div class="container hero-inner">
      <p class="eyebrow"><span class="eyebrow-dot"></span>Not on the wall</p>
      <h1 class="hero-title">This brand isn&rsquo;t <em>listed</em> right now.</h1>
      <p class="hero-sub">The listing may have ended, or the link has a typo.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/brands">Browse all brands</a>
        <a class="btn btn-ghost" href="/sendrequest.html">Claim a box</a>
      </div>
    </div>
  </section>
  <div style="height:64px"></div>`,
  });
}
