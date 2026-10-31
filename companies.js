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
    name       : 'Andhra Ruchulu',
    shortName  : 'My simple  way of cooking different dishes and intresting vlogs',
    icon       : 'screenone/box121.png',
    category   : 'hotelsTransportFoodandTourism',
    serviceType: 'Food & Cooking Channel',
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


  
];
