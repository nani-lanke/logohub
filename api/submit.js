/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/submit.js   (Vercel serverless function)

   HOW IT WORKS:
   1. sendrequest.html POSTs the form as JSON (logo = base64 data URL)
   2. Validate fields, box number and image
   3. Free / Available boxes → book straight away (free / 7-day trial)
      Reserved boxes (121–360) → no trial, paid for 1 year:
        action "order" → checks everything, creates a Razorpay order
        Razorpay Checkout popup → user pays
        action "paid"  → verifies the payment, then books the box
        (if booking fails after payment, the payment is refunded)
   4. One GitHub commit: screenone/box{N}.{ext} + the new entry in companies.js
      → Vercel sees the commit and redeploys (~1 min) → logo is live
   5. Email the user their box number via Spacemail SMTP, and send
      the admin a copy whose Reply goes to the user in the same thread
   6. api/expire.js (daily cron) removes expired boxes and mails the user

   ENV VARS (Vercel → Project → Settings → Environment Variables):
     GITHUB_TOKEN   – fine-grained token, Contents: Read & Write, this repo only
     GITHUB_REPO    – "owner/repo"
     GITHUB_BRANCH  – default "main"
     SMTP_USER      – Spacemail address, e.g. support@logohub.in
     SMTP_PASS      – Spacemail password
     SMTP_HOST      – default "mail.spacemail.com"
     ADMIN_EMAIL    – where your copy goes; default SMTP_USER
     SITE_URL       – default "https://www.logohub.in"
     EMAIL_KEY      – any long random text (needed for the expiry mail)
     RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET – Razorpay API keys
     CRON_SECRET    – any long random text (protects api/expire.js)
   ════════════════════════════════════════════════════════════ */

const MAINTENANCE = require('../maintenance.js');
const {
  UserError, istString, istDate, SITE, boxShape,
  emailHash, encryptEmail, gh, rzp, validPaymentSignature,
  liveCompanies, companyBlock, blockRe, logoPaths, readRepo, commitChange,
  sendUserMail, sendAdminMail,
} = require('./_lib.js');

const AVAIL_DAYS   = 7;                // Available boxes; Free boxes never expire
const PAID_DAYS    = 365;              // Reserved boxes: 1 year per payment
const MAX_LOGO     = 1024 * 1024;      // 1 MB
// Keep in sync with specialList / reservedList / freeBoxes in sendrequest.html
const SPECIAL_MAX  = 120;              // boxes 1–120 are special (mail support)
const RESERVED_MAX = 360;              // boxes 121–360 are reserved (pay online)
const FREE_BOXES   = new Set([482,484,485,486,487,489,491,494,497,499,500,501,502,504,506,509,512,514,515,516,517,519,521,524,527,529,530,531,532,534,536,539,
  542,544,545,546,547,549,551,554,557,559,560,561,562,564,566,569,572,574,575,576,577,579,581,584,587,589,590,591,592,594,596,599]);

// Service label (form <select>) → colorMap key (script.js)
const SERVICES = {
  'Technology and Software Services'     : 'technologyAndSoftwareServices',
  'Education and Institute Service'      : 'educationAndInstituteService',
  'Hotels, Transport, Food and Tourism'  : 'hotelsTransportFoodandTourism',
  'Energy and Utility Services'          : 'energyandUtilityServices',
  'Retail and E-Commerce'                : 'retailAndE_Commerce',
  'Entertainment and Information Service': 'entertainmentAndInformationService',
  'HealthCare and Medical Services'      : 'healthCareAndMedicalServices',
  'Finance and Banking Services'         : 'financeAndBankingServices',
  'Manufacturing Industries'             : 'manufacturingIndustries',
  'Other'                                : 'other',
};

// ─── Validation helpers ───────────────────────────────────────
function text(v, label, max, required = true) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new UserError(`Please enter ${label}.`);
  if (s.length > max) throw new UserError(`${label} is too long (max ${max} characters).`);
  return s;
}

function link(v, label) {
  const s = text(v, label, 300, false);
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { throw new UserError(`${label} is not a valid link.`); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new UserError(`${label} must start with https://`);
  return u.href;
}

function logo(dataUrl) {
  const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/[a-z+]+;base64,(.+)$/);
  if (!m) throw new UserError('Please upload your logo image.');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > MAX_LOGO) throw new UserError('Logo must be smaller than 1 MB.');

  // Trust the file bytes, not the browser-supplied type
  if (buf.subarray(0, 4).toString('hex') === '89504e47') return { buf, ext: 'png' };
  if (buf.subarray(0, 3).toString('hex') === 'ffd8ff')   return { buf, ext: 'jpg' };
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { buf, ext: 'webp' };
  throw new UserError('Logo must be a PNG, JPG or WebP image.');
}

// The whole form → { entry, image, email }   (expiredDate is set later)
function readForm(b) {
  const box = Number(b.box);
  if (!Number.isInteger(box) || box < 1 || box > 600) throw new UserError('Please enter a valid box number (1–600).');
  if (box <= SPECIAL_MAX) throw new UserError('Special boxes are booked through our support team. Please mail us.');

  const email = text(b.email, 'your email', 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError('Please enter a valid email address.');

  const service = text(b.service, 'a service type', 60);
  if (!SERVICES[service]) throw new UserError('Please select a service type.');

  const entry = {
    box,
    name       : text(b.company, 'your company name', 60),
    shortName  : text(b.description, 'a short description', 200),
    icon       : '',
    category   : SERVICES[service],
    serviceType: service,
    links: {
      website  : link(b.website,   'Website URL'),
      youtube  : link(b.youtube,   'YouTube link'),
      instagram: link(b.instagram, 'Instagram link'),
      whatsapp : link(b.whatsapp,  'WhatsApp link'),
      location : link(b.location,  'Location link'),
    },
    // Store only a hash — companies.js is publicly readable
    emailHash  : emailHash(email),
  };
  if (!Object.values(entry.links).some(Boolean)) throw new UserError('Please add at least one link (website, YouTube, etc.).');
  if (b.terms !== true) throw new UserError('Please agree to the Terms and Conditions.');

  return { entry, image: logo(b.logo), email };
}

// Same checks the commit makes, so a Reserved box is never paid for when it can't be booked
function checkFree(src, paths, entry) {
  const live = liveCompanies(src);
  if (live.some(c => c.emailHash === entry.emailHash)) {
    throw new UserError('This email already has a box on LogoHub.', 409);
  }
  // A box is taken if it's in the live list, or has a logo with no entry at all.
  // An expired entry and its logo get replaced by the new one.
  if (live.some(c => c.box === entry.box) || (logoPaths(paths, entry.box).length && !src.match(blockRe(entry.box)))) {
    throw new UserError(`Box ${entry.box} is already booked. Please choose another.`, 409);
  }
}

// ════════════════════════════════════════════════════════════
//  COMMIT — logo + companies.js in a single commit
// ════════════════════════════════════════════════════════════
async function commitBox(entry, image, message) {
  const imgBlob  = await gh('/git/blobs', { method: 'POST', body: { content: image.buf.toString('base64'), encoding: 'base64' } });
  const logoPath = `screenone/box${entry.box}.${image.ext}`;
  entry.icon = logoPath;

  await commitChange(({ src, paths }) => {
    // One payment books one box, even if the confirm request is sent twice
    if (entry.orderId && src.includes(entry.orderId)) {
      throw Object.assign(new UserError('This payment has already been used to book a box.', 409), { noRefund: true });
    }
    checkFree(src, paths, entry);

    const oldBlock = src.match(blockRe(entry.box));
    const oldLogos = logoPaths(paths, entry.box);
    if (oldBlock) src = src.replace(oldBlock[0], '');

    // Append before the "];" that closes companies[]
    const end = src.search(/^\];/m);
    if (end < 0) throw new Error('companies.js: closing "];" of companies[] not found');
    src = src.slice(0, end) + companyBlock(entry) + src.slice(end);
    if (!liveCompanies(src).some(c => c.box === entry.box)) throw new Error('companies.js: new entry did not parse');

    return {
      message, src,
      files: [
        { path: logoPath, mode: '100644', type: 'blob', sha: imgBlob.sha },
        // Remove an expired box's logo if it had a different extension
        ...oldLogos.filter(p => p !== logoPath).map(p => ({ path: p, mode: '100644', type: 'blob', sha: null })),
      ],
    };
  });
}

// ════════════════════════════════════════════════════════════
//  EMAILS — box booked (free / trial / paid)
// ════════════════════════════════════════════════════════════
function bookedMail(entry, amount) {
  const site = SITE();
  if (entry.paymentId) return {
    subject: `Payment received — LogoHub Box ${entry.box} is yours`,
    body: `Hi ${entry.name},

Thank you for your payment! Your Reserved box on LogoHub is booked for 1 year.

  Box number : ${entry.box}
  Box size   : ${boxShape(entry.box).name}
  Amount paid: Rs. ${amount}
  Payment ID : ${entry.paymentId}
  Valid till : ${istDate(entry.expiredDate)}

Your logo will appear on ${site} within a few minutes.

We will email you again when your 1-year plan ends.`,
  };

  if (entry.expiredDate === Infinity) return {
    subject: `Your logo is on LogoHub — Box ${entry.box}`,
    body: `Hi ${entry.name},

Your logo has been added to LogoHub, free of charge!

  Box number : ${entry.box}
  Valid till : No end date

Your logo will appear on ${site} within a few minutes.`,
  };

  const end = istDate(entry.expiredDate);
  return {
    subject: `Your LogoHub free trial has started — Box ${entry.box}`,
    body: `Hi ${entry.name},

Your ${AVAIL_DAYS}-day free trial on LogoHub has started!

  Box number : ${entry.box}
  Trial ends : ${end}

Your logo will appear on ${site} within a few minutes.

Your free trial is only for ${AVAIL_DAYS} days. To keep your logo after ${end}, reply to this email and we will send you the payment details. If payment is not received, your logo will be removed after the trial.`,
  };
}

async function mailBooked(entry, email, amount) {
  const { subject, body } = bookedMail(entry, amount);
  try { await sendUserMail(email, subject, body); return true; }
  catch (err) { console.error('Email failed:', err); return false; }
}

// ════════════════════════════════════════════════════════════
//  RESERVED BOXES — Razorpay order, then payment confirm
// ════════════════════════════════════════════════════════════
async function createOrder(entry) {
  const { src, paths } = await readRepo();
  checkFree(src, paths, entry);

  const price = boxShape(entry.box).price;
  const order = await rzp('/orders', {
    amount  : price * 100,                       // paise
    currency: 'INR',
    receipt : `box${entry.box}-${Date.now()}`,
    notes   : { box: String(entry.box), emailHash: entry.emailHash },
  });
  return { orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, price };
}

async function confirmPayment(b, entry, image, email) {
  const orderId = b.razorpay_order_id, paymentId = b.razorpay_payment_id;
  if (!validPaymentSignature(orderId, paymentId, b.razorpay_signature)) {
    throw new UserError('We could not verify your payment. If money was taken, please mail our support team.');
  }
  // The order says what was paid for — the form must match it
  const order = await rzp(`/orders/${orderId}`);
  if (order.notes.box !== String(entry.box) || order.notes.emailHash !== entry.emailHash) {
    throw new UserError('Payment does not match this box. Please mail our support team.');
  }

  const now = Date.now();
  Object.assign(entry, {
    buyingDate : istString(now),
    expiredDate: istString(now + PAID_DAYS * 864e5),
    emailEnc   : encryptEmail(email),
    paymentId, orderId,
  });
  const amount = order.amount / 100;

  try {
    await commitBox(entry, image, `Paid logo: box ${entry.box} — ${entry.name} (${paymentId})`);
  } catch (err) {
    if (err.noRefund) throw err;
    // Paid but not booked (box taken a moment ago, GitHub down …) → give the money back
    let refunded = false;
    try { await rzp(`/payments/${paymentId}/refund`, {}); refunded = true; }
    catch (e) { console.error('Refund failed:', e); }
    sendAdminMail(`LogoHub: paid box ${entry.box} NOT booked — ${refunded ? 'refunded' : 'REFUND NEEDED'}`,
      `Box ${entry.box}, ${entry.name}, ${email}\nPayment ${paymentId}, order ${orderId}, Rs. ${amount}\nRefund: ${refunded ? 'done' : 'FAILED — refund manually in the Razorpay dashboard'}\n\n${err.stack || err}`)
      .catch(e => console.error('Admin mail failed:', e));
    const why = err instanceof UserError ? err.message : 'We could not book your box.';
    throw new UserError(refunded
      ? `${why} Your payment of ₹${amount} has been refunded (it can take 5–7 days to reach your account).`
      : `${why} Your payment ID is ${paymentId} — our team will refund you within 2 days.`, err.status || 500);
  }
  return { amount, emailSent: await mailBooked(entry, email, amount) };
}

// ════════════════════════════════════════════════════════════
//  HANDLER   body.action: "order" | "paid" | (none = free / trial)
// ════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};

  // Server maintenance (maintenance.js) — no commits while it runs
  // (a payment already made is still booked)
  if (b.action !== 'paid' && MAINTENANCE.status().phase === 'active') {
    return res.status(503).json({ error: 'LogoHub is under maintenance. New logo sign-ups are paused — please try again later.' });
  }

  try {
    if (b.fax) return res.status(200).json({ ok: true });   // honeypot: bots fill hidden fields

    const { entry, image, email } = readForm(b);
    const reserved = entry.box <= RESERVED_MAX;

    if (reserved) {
      if (!process.env.RAZORPAY_KEY_ID) throw new UserError('Online payment is not set up yet. Please mail our support team.', 503);
      if (b.action === 'order') return res.status(200).json({ ok: true, ...(await createOrder(entry)) });
      if (b.action === 'paid') {
        const { amount, emailSent } = await confirmPayment(b, entry, image, email);
        return res.status(200).json({ ok: true, box: entry.box, paid: true, amount, validTill: istDate(entry.expiredDate), emailSent });
      }
      throw new UserError('Reserved boxes have no free trial. Please pay to book this box.');
    }

    const now = Date.now();
    entry.buyingDate  = istString(now);
    entry.expiredDate = FREE_BOXES.has(entry.box) ? Infinity : istString(now + AVAIL_DAYS * 864e5);
    entry.emailEnc    = entry.expiredDate === Infinity ? '' : encryptEmail(email);
    await commitBox(entry, image, `New logo: box ${entry.box} — ${entry.name}`);

    const emailSent = await mailBooked(entry, email);
    const forever   = entry.expiredDate === Infinity;
    return res.status(200).json({ ok: true, box: entry.box, forever, days: forever ? null : AVAIL_DAYS, emailSent });
  } catch (err) {
    if (err instanceof UserError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again in a few minutes.' });
  }
};
