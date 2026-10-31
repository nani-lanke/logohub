/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  script.js

   HOW IT WORKS:
   1. companies[]    – in companies.js (shared with sendrequest.html)
   2. generateGrid() – builds 40 sets × 15 slots = 600 boxes in the DOM
   3. loadImages()   – for each company, loads its icon; on success,
                       shows the logo and wires a click → openModal()
   4. openModal()    – fills the popup with company info + action icons
   5. Action icons   – only rendered when the matching link is non-empty
   ════════════════════════════════════════════════════════════ */

// ─── Hamburger menu toggle ────────────────────────────────────
const menuBtn = document.querySelector('#header-icon');
const navbar  = document.querySelector('.header-bar');
function setMenu(open) {
  if (!navbar) return;
  navbar.classList.toggle('active', open);
  if (menuBtn) menuBtn.setAttribute('aria-expanded', open);
}
if (menuBtn) {
  menuBtn.addEventListener('click', () => setMenu(!navbar.classList.contains('active')));
}
// Close the mobile menu after picking a link
if (navbar) {
  navbar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
}
// ─── Back-to-top button + footer year ─────────────────────────
const toTop = document.querySelector('#toTop');
if (toTop) {
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

window.addEventListener('scroll', () => {
  setMenu(false);
  if (toTop) toTop.classList.toggle('show', window.scrollY > 400);
});

// ════════════════════════════════════════════════════════════
//  COLOR MAP  — category key → border hex colour
// ════════════════════════════════════════════════════════════
const colorMap = {
  technologyAndSoftwareServices     : '#4d79ff',
  educationAndInstituteService      : '#ffd700',
  hotelsTransportFoodandTourism     : '#00cc66',
  energyandUtilityServices          : '#ff4444',
  retailAndE_Commerce               : '#00cfff',
  entertainmentAndInformationService: '#ff44ff',
  healthCareAndMedicalServices      : '#00b3b3',
  financeAndBankingServices         : '#ff9933',
  manufacturingIndustries           : '#aaaaaa',
  other                             : '#777777',
};

// Category key → label shown in the colour-guide chips
const categoryLabels = {
  technologyAndSoftwareServices     : 'Technology & Software',
  educationAndInstituteService      : 'Education & Institutes',
  hotelsTransportFoodandTourism     : 'Hotels, Food & Travel',
  energyandUtilityServices          : 'Energy & Utilities',
  retailAndE_Commerce               : 'Shopping & E-Commerce',
  entertainmentAndInformationService: 'Entertainment & Media',
  healthCareAndMedicalServices      : 'Health & Medical',
  financeAndBankingServices         : 'Finance & Banking',
  manufacturingIndustries           : 'Manufacturing & Products',
  other                             : 'Others',
};

// ── Fast lookup: box number → company object ─────────────────
const companyByBox =Object.fromEntries(companies.map(c => [c.box, c]));

// ── Resolve border colour for any box ───────────────────────
function getBorderColor(boxId) {
  const company = companyByBox[boxId];
  if (company) return colorMap[company.category] || 'var(--slot-border)';
  return 'var(--slot-border)';
}

// ════════════════════════════════════════════════════════════
//  GRID GENERATOR  — 40 sets × 15 slots = 600 boxes
// ════════════════════════════════════════════════════════════
function generateGrid() {
  const totalScreen = document.getElementById('totalscreen');
  if (!totalScreen) return;

  const screen = document.createElement('div');
  screen.className = 'screens';
  screen.id = 'screen1';

  for (let setIndex = 1; setIndex <= 40; setIndex++) {
    const set = document.createElement('div');
    set.className = 'set';
    set.id = `set${setIndex}`;

    for (let slotIndex = 1; slotIndex <= 15; slotIndex++) {
      const boxId = (setIndex - 1) * 15 + slotIndex;

      const box = document.createElement('div');
      box.className = `select${slotIndex}`;
      box.id = `box${boxId}`;
      box.style.border = `2px solid ${getBorderColor(boxId)}`;
      if (companyByBox[boxId]) box.dataset.cat = companyByBox[boxId].category;

      const label = document.createElement('span');
      label.className = 'number';
      label.id = `text${boxId}`;
      label.textContent = boxId;

      box.appendChild(label);
      set.appendChild(box);
    }
    screen.appendChild(set);
  }
  totalScreen.appendChild(screen);
}

// ════════════════════════════════════════════════════════════
//  IMAGE LOADER
//  Only iterates over companies[]. On image load success,
//  applies background and wires the click → openModal().
// ════════════════════════════════════════════════════════════
function loadImages() {
  companies.forEach(company => {
    const container = document.getElementById(`box${company.box}`);
    const label     = document.getElementById(`text${company.box}`);
    if (!container) return;

    const img = new Image();
    img.src = company.icon;

    img.onload = () => {
      container.style.backgroundImage    = `url(${company.icon})`;
      container.style.backgroundColor    = '#ffffff';
      container.style.backgroundSize     = 'cover';
      container.style.backgroundPosition = 'center';
      container.style.cursor             = 'pointer';
      if (label) label.style.display = 'none';

      // Wire click to open popup modal
      container.addEventListener('click', () => openModal(company));
    };

    img.onerror = () => {
      // Image missing — stays as a numbered placeholder
      container.style.cursor = 'default';
    };
  });
}

// ════════════════════════════════════════════════════════════
//  POPUP MODAL — injected into <body> once at startup
// ════════════════════════════════════════════════════════════
function injectModal() {
  const wrap = document.createElement('div');
  wrap.id = 'companyModal';
  wrap.innerHTML = `
    <div class="m-overlay" id="mOverlay" role="dialog" aria-modal="true" aria-labelledby="mName">
      <div class="m-card" id="mCard">
        <button class="m-close" id="mClose" aria-label="Close">&#x2715;</button>
        <div class="m-logo-wrap">
          <img class="m-logo" id="mLogo" src="" alt="Company logo">
          <span class="m-badge" id="mBadge"></span>
        </div>
        <div class="m-info">
          <h2 class="m-name"    id="mName"></h2>
          <p  class="m-short"   id="mShort"></p>
          <p  class="m-service" id="mService"></p>
        </div>
        <div class="m-actions" id="mActions"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  document.getElementById('mOverlay').addEventListener('click', e => {
    if (e.target.id === 'mOverlay') closeModal();
  });
  document.getElementById('mClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(company) {
  document.getElementById('mLogo').src             = company.icon;
  document.getElementById('mLogo').alt             = company.name;
  document.getElementById('mShort').textContent    = company.shortName;
  document.getElementById('mName').textContent     = company.name;
  document.getElementById('mService').textContent  = company.serviceType;
  const catColor = colorMap[company.category] || '#aaa';
  document.getElementById('mLogo').style.borderColor  = catColor;
  document.getElementById('mBadge').style.background = catColor;

  const actions = document.getElementById('mActions');
  actions.innerHTML = '';

  const actionDefs = [
    { key: 'website',   label: 'Website',   svg: svgGlobe()     },
    { key: 'youtube',   label: 'YouTube',   svg: svgYouTube()   },
    { key: 'instagram', label: 'Instagram', svg: svgInstagram() },
    { key: 'whatsapp',  label: 'WhatsApp',  svg: svgWhatsApp()  },
    { key: 'location',  label: 'Location',  svg: svgLocation()  },
  ];

  actionDefs.forEach(({ key, label, svg }) => {
    const url = company.links && company.links[key];
    if (!url) return;
    const a = document.createElement('a');
    a.href      = url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'm-action-btn';
    a.setAttribute('aria-label', label);
    a.innerHTML = svg + `<span>${label}</span>`;
    actions.appendChild(a);
  });

  document.getElementById('mOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('mOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
//  SVG ICONS
// ════════════════════════════════════════════════════════════
const svgAttrs = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

function svgGlobe() {
  return `<svg ${svgAttrs}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
}
function svgYouTube() {
  return `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29.94 29.94 0 0 0 1 12a29.94 29.94 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29.94 29.94 0 0 0 23 12a29.94 29.94 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>`;
}
function svgInstagram() {
  return `<svg ${svgAttrs}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
}
function svgWhatsApp() {
  return `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.117a.75.75 0 0 0 .916.919l5.404-1.461A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.964-1.357l-.356-.21-3.688.997 1.006-3.598-.232-.371A9.725 9.725 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>`;
}
function svgLocation() {
  return `<svg ${svgAttrs}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
}

// ════════════════════════════════════════════════════════════
//  MODAL STYLES — injected into <head> once
// ════════════════════════════════════════════════════════════
function injectModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #companyModal .m-overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--overlay-bg);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      z-index: 9999; opacity: 0; pointer-events: none;
      transition: opacity 0.22s ease;
    }
    #companyModal .m-overlay.active { opacity: 1; pointer-events: all; }

    #companyModal .m-card {
      position: relative; width: 90%; max-width: 400px;
      max-height: 90vh; overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 20px; padding: 36px 28px 28px;
      box-shadow: var(--shadow-lg);
      transform: scale(0.86) translateY(28px); opacity: 0;
      transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease;
    }
    #companyModal .m-overlay.active .m-card { transform: scale(1) translateY(0); opacity: 1; }

    #companyModal .m-close {
      position: absolute; top: 14px; right: 14px;
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: var(--surface-hi); color: var(--accent);
      font-size: 15px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.16s, transform 0.16s;
    }
    #companyModal .m-close:hover { background: var(--accent); color: var(--accent-contrast); transform: rotate(90deg); }

    #companyModal .m-logo-wrap {
      display: flex; justify-content: center; align-items: center;
      margin-bottom: 18px; position: relative;
    }
    #companyModal .m-logo {
      width: 96px; height: 96px; object-fit: contain; border-radius: 18px;
      border: 3px solid var(--border-strong);
      box-shadow: var(--shadow-sm);
      background: #ffffff; padding: 6px;
    }
    #companyModal .m-badge {
      position: absolute; bottom: -4px; right: calc(50% - 60px);
      width: 18px; height: 18px; border-radius: 50%;
      border: 3px solid var(--surface); box-shadow: var(--shadow-sm);
    }

    #companyModal .m-info { text-align: center; margin-bottom: 24px; }
    #companyModal .m-short {
      font-size: 13px; font-weight: 400; line-height: 1.6;
      color: var(--text-dim); margin: 0 0 10px;
    }
    #companyModal .m-name { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 8px; line-height: 1.2; }
    #companyModal .m-service {
      display: inline-block; margin: 0; padding: 3px 12px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--accent); border: 1px solid var(--border-strong); border-radius: 999px;
    }

    #companyModal .m-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    #companyModal .m-action-btn {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 12px 14px 10px; min-width: 68px;
      border-radius: 14px; background: var(--surface-hi);
      text-decoration: none; color: var(--accent);
      border: 1px solid var(--border);
      transition: background 0.18s, transform 0.16s, box-shadow 0.18s;
    }
    #companyModal .m-action-btn:hover {
      background: var(--accent); color: var(--accent-contrast);
      transform: translateY(-3px); box-shadow: var(--shadow-sm);
    }
    #companyModal .m-action-btn svg  { width: 24px; height: 24px; }
    #companyModal .m-action-btn span { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
    #companyModal .m-card::-webkit-scrollbar { width: 4px; }
    #companyModal .m-card::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════════════════════
//  WALL TOOLS — hero stats, colour-guide chips, search
//  Chips and search both highlight matching boxes and dim the rest.
// ════════════════════════════════════════════════════════════
const TOTAL_BOXES = 600;
let activeCat = null;

function renderStats() {
  const listed = document.getElementById('statListed');
  const open   = document.getElementById('statOpen');
  if (listed) listed.textContent = companies.length;
  if (open)   open.textContent   = TOTAL_BOXES - companies.length;
}

function buildLegend() {
  const legend = document.getElementById('colours');
  if (!legend) return;

  const makeChip = (cat, label, color, count) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (cat === null ? ' active' : '');
    chip.dataset.cat = cat || '';
    chip.setAttribute('aria-pressed', cat === null);
    chip.innerHTML = (color ? `<span class="cat-dot" style="background:${color};"></span>` : '') +
      `<span></span><span class="chip-count">${count}</span>`;
    chip.children[color ? 1 : 0].textContent = label;
    chip.addEventListener('click', () => {
      activeCat = activeCat === cat ? null : cat;
      legend.querySelectorAll('.chip').forEach(c => {
        const on = (c.dataset.cat || null) === activeCat;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on);
      });
      applyHighlight();
    });
    legend.appendChild(chip);
  };

  makeChip(null, 'All', null, companies.length);
  Object.keys(colorMap).forEach(cat => {
    const count = companies.filter(c => c.category === cat).length;
    makeChip(cat, categoryLabels[cat], colorMap[cat], count);
  });
}

function setStatus(text, linkText, href) {
  const status = document.getElementById('wallStatus');
  if (!status) return;
  status.textContent = text;
  if (linkText) {
    const a = document.createElement('a');
    a.className = 'text-link';
    a.style.marginTop = '0';
    a.style.marginLeft = '6px';
    a.href = href;
    a.textContent = linkText;
    status.appendChild(a);
  }
}

function applyHighlight() {
  const screen = document.getElementById('screen1');
  const input  = document.getElementById('wallSearch');
  if (!screen) return;
  const q = input ? input.value.trim().toLowerCase() : '';

  screen.querySelectorAll('.match').forEach(el => el.classList.remove('match'));

  if (!activeCat && !q) {
    screen.classList.remove('filtering');
    setStatus('');
    return;
  }

  const isBoxNumber = /^\d+$/.test(q);
  const matches = companies.filter(c =>
    (!activeCat || c.category === activeCat) &&
    (!q || (isBoxNumber ? String(c.box) === q
                        : `${c.name} ${c.serviceType}`.toLowerCase().includes(q))));

  // A number for an empty box still highlights it, so people can find a free spot
  const num = Number(q);
  const emptyBox = isBoxNumber && !activeCat && !matches.length && num >= 1 && num <= TOTAL_BOXES;
  const targets = emptyBox ? [document.getElementById(`box${num}`)]
                           : matches.map(c => document.getElementById(`box${c.box}`));

  screen.classList.add('filtering');
  targets.forEach(el => el && el.classList.add('match'));

  if (emptyBox) {
    setStatus(`Box ${num} is still open.`, 'Claim it →', 'sendrequest.html');
  } else if (!matches.length) {
    setStatus('No logos match yet.', 'Be the first →', 'sendrequest.html');
  } else {
    setStatus(`${matches.length} logo${matches.length === 1 ? '' : 's'} highlighted.`);
  }

  // Jump to a single search result and make it blink
  if (q && targets.length === 1 && targets[0]) {
    const el = targets[0];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}

function wireSearch() {
  const input = document.getElementById('wallSearch');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(applyHighlight, 250);
  });
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  injectModalStyles();
  injectModal();
  generateGrid();
  loadImages();
  renderStats();
  buildLegend();
  wireSearch();
});
