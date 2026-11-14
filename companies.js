/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  companies.js
   Shared by index.html (logo wall), sendrequest.html (booked boxes)
   and api/brand.js + api/sitemap.js (the /brand/<slug> pages).
   Load this BEFORE script.js.
   ════════════════════════════════════════════════════════════ */

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
//    buyingDate  – when the box was taken, India time ('YYYY-MM-DDTHH:MM:SS+05:30')
//    expiredDate – when the logo is removed (same format), or Infinity = never
//    links       – leave any value "" to hide that button in popup
//
//  Form entries are appended automatically by api/submit.js —
//  run sync.bat before editing so you don't overwrite them.
// ════════════════════════════════════════════════════════════
const companies = [
  {
    box        : 31,
    name       : 'LogoHub',
    shortName  : 'LogoHub displays company logos; click any logo to visit its website.',
    icon       : 'screenone/box31.png',
    category   : 'technologyAndSoftwareServices',
    serviceType: 'Information & Directory Service',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
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
    name       : 'Andhra Ruchulu',
    shortName  : 'My simple  way of cooking different dishes and intresting vlogs',
    icon       : 'screenone/box121.png',
    category   : 'hotelsTransportFoodandTourism',
    serviceType: 'Food & Cooking Channel',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@Andhraruchulu537',
      instagram: 'https://www.instagram.com/yummy_recipies123?igsh=Zm12aHZwazRmZHd0',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 133,
    name       : 'Kutti Kathaigal',
    shortName  : 'A sweet Tamil story world for children aged 2 to 6 years.',
    icon       : 'screenone/box133.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Entertainment & Stories',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@KuttiKathaigal2026',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 136,
    name       : 'Meow Meow Melody TV',
    shortName  : '✨ Welcome to MeowMeow Melody TV! ✨ A happy place for kids to watch, learn, and enjoy! 🌈',
    icon       : 'screenone/box136.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Kids Entertainment',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@MeowMeowMelodyTV/shorts',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 190,
    name       : 'Sinu Cartoons',
    shortName  : 'This video is made for fun purposes. It will contain school story comedy videos and fun filled ghost stories.',
    icon       : 'screenone/box190.png',
    category   : 'entertainmentAndInformationService',
    serviceType: 'Cartoon Entertainment',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@sinucartoons',
      instagram: '',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 172,
    name       : 'Anuraj_handmade_jewellery',
    shortName  : 'I love being artistic and fond of making hand made jewellery. plz support my small business. thank you. be positive',
    icon       : 'screenone/box172.png',
    category   : 'retailAndE_Commerce',
    serviceType: 'Shopping & E-Commerce',
    buyingDate : '2026-10-31T22:31:37+05:30',
    expiredDate: Infinity,
    links: {
      website  : '',
      youtube  : 'https://www.youtube.com/@anurajhandmadejewellery',
      instagram: 'https://www.instagram.com/anuraj_handmade_jewellery?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
      whatsapp : '',
      location : '',
    },
  },
  {
    box        : 145,
    name       : 'Lovely',
    shortName  : 'simple chick',
    icon       : 'screenone/box145.png',
    category   : 'technologyAndSoftwareServices',
    serviceType: 'Technology and Software Services',
    buyingDate : '2026-10-31T22:04:58+05:30',
    expiredDate: '2026-11-07T22:04:58+05:30',
    links: {
      website  : 'https://www.inviteaura.in/',
      youtube  : '',
      instagram: '',
      whatsapp : '',
      location : '',
    },
    emailHash  : 'a784fa18d116a098cd0d77c566a9b80d91db6d0065828908b616dadcdbb38d09',
  },
  {
    box        : 482,
    name       : 'Lovely',
    shortName  : 'Design, personalise and share stunning digital invitations for every special occasion — weddings, birthdays, baby showers, house warmings, festivals and corporate events.',
    icon       : 'screenone/box482.webp',
    category   : 'other',
    serviceType: 'Other',
    buyingDate : '2026-11-14T19:51:03+05:30',
    expiredDate: Infinity,
    links: {
      website  : 'https://www.inviteaura.in/',
      youtube  : 'https://www.inviteaura.in/',
      instagram: 'https://www.inviteaura.in/',
      whatsapp : 'https://www.inviteaura.in/',
      location : 'https://www.inviteaura.in/',
    },
    emailHash  : 'fc106d504926771268974bcb3945bfe19070d35fa34838f0e2cd7ec41307bfbe',
  },
  {
    box        : 361,
    name       : 'Lovely',
    shortName  : 'Design, personalise and share stunning digital invitations for every special occasion — weddings, birthdays, baby showers, house warmings, festivals and corporate events.',
    icon       : 'screenone/box361.webp',
    category   : 'other',
    serviceType: 'Other',
    buyingDate : '2026-11-14T19:54:01+05:30',
    expiredDate: '2026-11-21T19:54:01+05:30',
    links: {
      website  : 'https://www.inviteaura.in/',
      youtube  : '',
      instagram: '',
      whatsapp : '',
      location : '',
    },
    emailHash  : 'a784fa18d116a098cd0d77c566a9b80d91db6d0065828908b616dadcdbb38d09',
    emailEnc   : '4inOozpP6xDfP5Fvdi-vV4UkRO1GfDd_HUVaoMSwBXxqIwcNeJdxVrZg2CYlEMDoV0hXZ0GX',
  },
];

// ════════════════════════════════════════════════════════════
//  CATEGORIES — category key → border colour + label
//  (used by the wall, the colour guide and the brand pages)
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

// ════════════════════════════════════════════════════════════
//  BOX NUMBERS — how the 600 numbers sit on the wall
//
//  The wall is 40 sets of 15 slots, 8 sets per row on a laptop.
//  Numbers read down each column, then to the right, and run across
//  all 8 sets of a row: the top 2 rows of every set first (6 per set,
//  1–48), then the lower 3 rows (9 per set, 49–120). So every row of
//  sets holds 120 boxes, and the same number is always the same box,
//  whatever the screen size (phones just wrap the sets differently).
//  Keep in sync with boxNumber() in script.js and boxShape() in api/_lib.js.
// ════════════════════════════════════════════════════════════
function boxShape(n) {
  const o = (n - 1) % 120 + 1;                       // position inside its row of sets
  if (o <= 48) {                                     // top 2 rows: Square, Mini, Mini, …
    return (o - 1) % 3 === 0 ? { name: 'Square', price: 119 } : { name: 'Mini', price: 49 };
  }
  const k = (o - 49) % 9 + 1;                        // lower 3 rows, 9 boxes per set
  if (k === 4 || k === 8) return { name: 'Square',     price: 1 };
  if (k === 7)            return { name: 'Vertical',   price: 1  };
  if (k === 3 || k === 9) return { name: 'Horizontal', price: 1  };
  return                         { name: 'Mini',       price: 1  };
}

// ════════════════════════════════════════════════════════════
//  EXPIRY — api/submit.js adds form entries to the end of companies[]
//
//  Free boxes get expiredDate: Infinity (never). Available boxes get
//  buyingDate + 7 days. Once expiredDate passes the logo is hidden.
//  After the user pays, change expiredDate to a later date (or Infinity).
//  Expired entries can be deleted whenever you like (the next user on
//  that box replaces it).
// ════════════════════════════════════════════════════════════
{
  const now = Date.now();
  for (let i = companies.length - 1; i >= 0; i--) {
    const c = companies[i];
    if (c.expiredDate !== Infinity && now >= Date.parse(c.expiredDate)) companies.splice(i, 1);
    // ?v= busts the browser cache when a box is reused by a new user
    else if (c.buyingDate) c.icon += `?v=${Date.parse(c.buyingDate)}`;
  }
}

// ════════════════════════════════════════════════════════════
//  BRAND PAGE ADDRESS — every listed company gets /brand/<slug>
//  'Andhra Ruchulu' → andhra-ruchulu. If two live companies share a
//  name, the later one gets its box number added (lovely-181).
//  Names with no Latin letters/digits fall back to box-<N>.
// ════════════════════════════════════════════════════════════
{
  const slugify = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  const taken = new Set();
  for (const c of companies) {
    let slug = slugify(c.name) || `box-${c.box}`;
    if (taken.has(slug)) slug = `${slug}-${c.box}`;
    taken.add(slug);
    c.slug = slug;
  }
}
