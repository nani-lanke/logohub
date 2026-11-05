/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/sitemap.js   (served at /sitemap.xml — see vercel.json)

   The static pages plus one /brand/<slug> entry per listed company,
   built from companies.js so it is always up to date.
   ════════════════════════════════════════════════════════════ */

const { SITE, loadBrands } = require('./_brands.js');

const PAGES = [
  { loc: '/',                            changefreq: 'daily',   priority: '1.0' },
  { loc: '/brands',                      changefreq: 'daily',   priority: '0.9' },
  { loc: '/sendrequest.html',            changefreq: 'weekly',  priority: '0.8' },
  { loc: '/logoUploadInstructions.html', changefreq: 'monthly', priority: '0.5' },
  { loc: '/termsandconditions.html',     changefreq: 'yearly',  priority: '0.3' },
];

const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

module.exports = (req, res) => {
  try {
    const { companies } = loadBrands();
    const brands = companies.map(c => ({
      loc       : `/brand/${c.slug}`,
      lastmod   : /^\d{4}-\d{2}-\d{2}/.test(c.buyingDate || '') ? c.buyingDate.slice(0, 10) : '',
      changefreq: 'monthly',
      priority  : '0.7',
    }));

    const urls = [...PAGES, ...brands].map(u => `  <url>
    <loc>${xml(SITE + u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  } catch (err) {
    console.error(err);
    res.status(500).end('Sitemap unavailable');
  }
};
