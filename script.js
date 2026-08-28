/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  script.js

   HOW IT WORKS:
   1. companies[]    – one object per company; single source of truth
   2. generateGrid() – builds 40 sets × 15 slots = 600 boxes in the DOM
   3. loadImages()   – for each company, loads its icon; on success,
                       shows the logo and wires a click → openModal()
   4. openModal()    – fills the popup with company info + action icons
   5. Action icons   – only rendered when the matching link is non-empty

   KEY BUG FIX: modal CSS selector was missing '#' on '#companyModal'
   causing the overlay to never become visible on .active toggle.
   ════════════════════════════════════════════════════════════ */

// ─── Hamburger menu toggle ────────────────────────────────────
const menuBtn = document.querySelector('#header-icon');
const navbar  = document.querySelector('.header-bar');
if (menuBtn) {
  menuBtn.addEventListener('click', () => navbar.classList.toggle('active'));
}
window.addEventListener('scroll', () => {
  if (navbar) navbar.classList.remove('active');
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

// ════════════════════════════════════════════════════════════
//  COMPANY DATA — SINGLE SOURCE OF TRUTH
//
//  To add a company:
//    1. Add one object to this array.
//    2. Place the logo at /screenone/box{N}.png  (N = box number).
//    The grid, border colour and popup are fully automatic.
//
//  Fields:
//    box         – grid slot (1–600)
//    name        – company name shown in popup
//    shortName   – short code shown above the name
//    icon        – path to the logo image
//    category    – key from colorMap (sets the border colour)
//    serviceType – label shown under the name in the popup
//    links       – leave any value "" to hide that button in popup
// ════════════════════════════════════════════════════════════
const companies = [
  {
    box        : 76,
    name       : 'LogoHub',
    shortName  : 'LogoHub displays company logos; click any logo to visit its website.',
    icon       : 'screenone/box76.png',
    category   : 'technologyAndSoftwareServices',
    serviceType: 'Information & Directory Service',
    links: {
      website  : 'https://www.logohub.in/',
      youtube  : '',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 121,
    name       : 'AnuRaj_ Vantillu',
    shortName  : 'My simple  way of cooking different dishes and intresting vlogs',
    icon       : 'screenone/box121.png',
    category   : 'hotelsTransportFoodandTouris',
    serviceType: 'Food & Cooking Channel',
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@AnuRaj_Vantillu',
      instagram: 'instagram.com/anuraj_vantillu?igsh=Zm12aHZwazRmZHd0',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 151,
    name       : 'Kutti Kathaigal',
    shortName  : 'A sweet Tamil story world for children aged 2 to 6 years.',
    icon       : 'screenone/box151.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Entertainment & Stories',
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@KuttiKathaigal2026',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 153,
    name       : 'Meow Meow Melody TV',
    shortName  : '✨ Welcome to MeowMeow Melody TV! ✨ A happy place for kids to watch, learn, and enjoy! 🌈',
    icon       : 'screenone/box153.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Kids Entertainment',
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@MeowMeowMelodyTV/shorts',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 158,
    name       : 'Sinu Cartoons',
    shortName  : 'This video is made for fun purposes. It will contain school story comedy videos and fun filled ghost stories.',
    icon       : 'screenone/box158.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Cartoon Entertainment',
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@sinucartoons',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
   {
    box        : 128,
    name       : 'Anuraj_handmade_jewellery',
    shortName  : 'I love being artistic and fond of making hand made jewellery. plz support my small business. thank you. be positive',
    icon       : 'screenone/box128.png',
    category   : 'retailAndE_Commerce',
    serviceType: 'Shopping & E-Commerce',
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@anurajhandmadejewellery',
      instagram: 'https://www.instagram.com/anuraj_handmade_jewellery?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
      whatsapp : '',
      location : '',
    },
  },
  // ── ADD MORE COMPANIES HERE ──────────────────────────────
  // {
  //   box        : 10,
  //   name       : 'My Company',
  //   shortName  : 'MC',
  //   icon       : 'screenone/box10.png',
  //   category   : 'technologyAndSoftwareServices',
  //   serviceType: 'Software & IT Services',
  //   links: {
  //     website  : 'https://www.mycompany.com',
  //     youtube  : '',
  //     instagram: 'https://instagram.com/mycompany',
  //     whatsapp : 'https://wa.me/919876543210',
  //     location : 'https://maps.google.com/?q=My+Company',
  //   },
  // },
];

// ── Fast lookup: box number → company object ─────────────────
const companyByBox = Object.fromEntries(companies.map(c => [c.box, c]));

// ── Resolve border colour for any box ───────────────────────
function getBorderColor(boxId) {
  const company = companyByBox[boxId];
  if (company) return colorMap[company.category] || 'rgba(255,255,255,0.08)';
  return 'rgba(255,255,255,0.08)';
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
  document.getElementById('mBadge').style.background = colorMap[company.category] || '#aaa';

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
//  BUG FIX: every selector prefixed with '#companyModal'
//  (original missing '#' made pointer-events:none permanent)
// ════════════════════════════════════════════════════════════
function injectModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #companyModal .m-overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,5,20,0.75);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      z-index: 9999; opacity: 0; pointer-events: none;
      transition: opacity 0.22s ease;
    }
    #companyModal .m-overlay.active { opacity: 1; pointer-events: all; }

    #companyModal .m-card {
      position: relative; width: 90%; max-width: 400px;
      max-height: 90vh; overflow-y: auto;
      background: #131b2e;
      border: 1px solid rgba(192,193,255,0.15);
      border-radius: 24px; padding: 36px 28px 28px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.60), 0 4px 16px rgba(0,0,0,0.30);
      transform: scale(0.86) translateY(28px); opacity: 0;
      transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease;
    }
    #companyModal .m-overlay.active .m-card { transform: scale(1) translateY(0); opacity: 1; }

    #companyModal .m-close {
      position: absolute; top: 14px; right: 14px;
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.08); color: #c0c1ff;
      font-size: 15px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.16s, transform 0.16s;
    }
    #companyModal .m-close:hover { background: #c0c1ff; color: #131b2e; transform: rotate(90deg); }

    #companyModal .m-logo-wrap {
      display: flex; justify-content: center; align-items: center;
      margin-bottom: 18px; position: relative;
    }
    #companyModal .m-logo {
      width: 96px; height: 96px; object-fit: contain; border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 4px 20px rgba(0,0,0,0.40);
      background: #0b1326; padding: 6px;
    }
    #companyModal .m-badge {
      position: absolute; bottom: -4px; right: calc(50% - 60px);
      width: 18px; height: 18px; border-radius: 50%;
      border: 3px solid #131b2e; box-shadow: 0 1px 6px rgba(0,0,0,0.40);
    }

    #companyModal .m-info { text-align: center; margin-bottom: 24px; }
    #companyModal .m-short {
      font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: rgba(192,193,255,0.55); margin: 0 0 4px;
    }
    #companyModal .m-name { font-size: 22px; font-weight: 800; color: #dae2fd; margin: 0 0 6px; line-height: 1.2; }
    #companyModal .m-service { font-size: 13px; font-weight: 500; color: #8890aa; margin: 0; }

    #companyModal .m-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    #companyModal .m-action-btn {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 12px 14px 10px; min-width: 68px;
      border-radius: 14px; background: rgba(255,255,255,0.06);
      text-decoration: none; color: #c0c1ff;
      border: 1px solid rgba(192,193,255,0.12);
      transition: background 0.18s, transform 0.16s, box-shadow 0.18s;
    }
    #companyModal .m-action-btn:hover {
      background: #c0c1ff; color: #0b1326;
      transform: translateY(-3px); box-shadow: 0 8px 24px rgba(192,193,255,0.20);
    }
    #companyModal .m-action-btn svg  { width: 24px; height: 24px; }
    #companyModal .m-action-btn span { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
    #companyModal .m-card::-webkit-scrollbar { width: 4px; }
    #companyModal .m-card::-webkit-scrollbar-thumb { background: rgba(192,193,255,0.20); border-radius: 4px; }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  injectModalStyles();
  injectModal();
  generateGrid();
  loadImages();
});















