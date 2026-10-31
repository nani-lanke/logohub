/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  companies.js
   Shared by index.html (logo wall) and sendrequest.html (booked boxes).
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
    box        : 76,
    name       : 'LogoHub',
    shortName  : 'LogoHub displays company logos; click any logo to visit its website.',
    icon       : 'screenone/box76.png',
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
    box        : 151,
    name       : 'Kutti Kathaigal',
    shortName  : 'A sweet Tamil story world for children aged 2 to 6 years.',
    icon       : 'screenone/box151.png',
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
    box        : 153,
    name       : 'Meow Meow Melody TV',
    shortName  : '✨ Welcome to MeowMeow Melody TV! ✨ A happy place for kids to watch, learn, and enjoy! 🌈',
    icon       : 'screenone/box153.png',
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
    box        : 158,
    name       : 'Sinu Cartoons',
    shortName  : 'This video is made for fun purposes. It will contain school story comedy videos and fun filled ghost stories.',
    icon       : 'screenone/box158.png',
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
    box        : 128,
    name       : 'Anuraj_handmade_jewellery',
    shortName  : 'I love being artistic and fond of making hand made jewellery. plz support my small business. thank you. be positive',
    icon       : 'screenone/box128.png',
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
    box        : 181,
    name       : 'Lovely',
    shortName  : 'simple chick',
    icon       : 'screenone/box181.png',
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
];

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
