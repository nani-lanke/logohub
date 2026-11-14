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
        action "recover" → the browser never got the Checkout callback (a UPI
        app pushed the page out of memory, the tab closed, the reply timed
        out): asks Razorpay whether the order was paid and books it. Safe to
        send more than once — one payment books one box, and the orderId in
        companies.js is the receipt that proves it.
        Anything paid that still has no box is mailed to the admin by the
        daily cron in api/expire.js.
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
  emailHash, encryptEmail, gh, rzp, validPaymentSignature, orderPayments,
  liveCompanies, allCompanies, companyBlock, blockRe, logoPaths, readRepo, commitChange,
  sendUserMail, sendAdminMail,
} = require('./_lib.js');

const AVAIL_DAYS   = 7;                // Available boxes; Free boxes never expire
const PAID_DAYS    = 365;              // Reserved boxes: 1 year per payment
const MAX_LOGO     = 1024 * 1024;      // 1 MB
// Keep in sync with specialList / reservedList / freeBoxes in sendrequest.html
const SPECIAL_MAX  = 120;              // boxes 1–120 are special (mail support)
const RESERVED_MAX = 360;              // boxes 121–360 are reserved (pay online)
// Every Mini box in the last row of the wall (481–600)
const FREE_BOXES   = new Set([482,483,485,486,488,489,491,492,494,495,497,498,500,501,503,504,506,507,509,510,512,513,515,516,518,519,521,522,524,525,527,528,
  529,530,533,534,538,539,542,543,547,548,551,552,556,557,560,561,565,566,569,570,574,575,578,579,583,584,587,588,592,593,596,597]);

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
// Returns null when it committed, or the entry this same payment already
// booked. One payment books one box: the orderId sits in companies.js as the
// receipt, so a confirm that arrives twice (reply lost to a timeout, the page
// reopened, a recovery after a UPI app stole the tab) reports that booking
// instead of committing a second one.
async function commitBox(entry, image, message) {
  const imgBlob  = await gh('/git/blobs', { method: 'POST', body: { content: image.buf.toString('base64'), encoding: 'base64' } });
  const logoPath = `screenone/box${entry.box}.${image.ext}`;
  entry.icon = logoPath;

  let already = null;
  const committed = await commitChange(({ src, paths }) => {
    if (entry.orderId && src.includes(entry.orderId)) {
      already = allCompanies(src).find(c => c.orderId === entry.orderId) || { box: entry.box };
      return null;                       // nothing to commit — it is already booked
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
  return committed ? null : already;
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
    cta: { label: 'See your logo on the wall', url: site },
  };

  if (entry.expiredDate === Infinity) return {
    subject: `Your logo is on LogoHub — Box ${entry.box}`,
    body: `Hi ${entry.name},

Your logo has been added to LogoHub, free of charge!

  Box number : ${entry.box}
  Valid till : No end date

Your logo will appear on ${site} within a few minutes.`,
    cta: { label: 'See your logo on the wall', url: site },
  };

  const end = istDate(entry.expiredDate);
  return {
    subject: `Your LogoHub free trial has started — Box ${entry.box}`,
    body: `Hi ${entry.name},

Your ${AVAIL_DAYS}-day free trial on LogoHub has started!

  Box number : ${entry.box}
  Trial ends : ${end}

Your logo will appear on ${site} within a few minutes.

Your free trial is valid for ${AVAIL_DAYS} days and ends on ${end}. To continue displaying your logo beyond this date, please reply to this email and our team will assist you with the payment process.`,
    cta: { label: 'See your logo on the wall', url: site },
  };
}

async function mailBooked(entry, email, amount) {
  const { subject, body, cta } = bookedMail(entry, amount);
  try { await sendUserMail(email, subject, body, { cta }); return true; }
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

// The order behind a payment. An id Razorpay does not know (the API keys were
// changed, a stale record in the browser) is a plain "not found" the browser
// can act on, not a server fault to be retried for hours.
async function fetchOrder(orderId) {
  try { return await rzp(`/orders/${orderId}`); }
  catch (err) {
    if (err.rzpStatus === 400 || err.rzpStatus === 404) {
      throw new UserError('We could not find that payment. Please mail our support team.');
    }
    throw err;
  }
}

// The order is the record of what was paid for — the form must match it
function matchOrder(order, entry) {
  const notes = (order && order.notes) || {};   // Razorpay sends [] when there are no notes
  if (notes.box !== String(entry.box) || notes.emailHash !== entry.emailHash) {
    throw new UserError('This payment does not match this box. Please mail our support team.');
  }
  // Underpayment only. If the price of a box is cut while someone is paying,
  // an order made at the old price still buys the box — it is not refused for
  // being too much.
  if (!(order.amount >= boxShape(entry.box).price * 100)) {
    throw new UserError('The amount paid does not match this box. Please mail our support team.');
  }
}

// ── Book a box that is already paid for ──────────────────────
// Safe to call more than once for the same payment.
async function bookPaid(entry, image, email, order, paymentId) {
  const now = Date.now();
  Object.assign(entry, {
    buyingDate : istString(now),
    expiredDate: istString(now + PAID_DAYS * 864e5),
    emailEnc   : encryptEmail(email),
    paymentId, orderId: order.id,
  });
  const amount = order.amount / 100;

  let already;
  try {
    already = await commitBox(entry, image, `Paid logo: box ${entry.box} — ${entry.name} (${paymentId})`);
  } catch (err) {
    // Paid but not booked (box taken a moment ago, GitHub down …) → give the money back
    let refunded = false;
    try { await rzp(`/payments/${paymentId}/refund`, {}); refunded = true; }
    catch (e) { console.error('Refund failed:', e); }
    sendAdminMail(`LogoHub: paid box ${entry.box} NOT booked — ${refunded ? 'refunded' : 'REFUND NEEDED'}`,
      `Box ${entry.box}, ${entry.name}, ${email}\nPayment ${paymentId}, order ${order.id}, Rs. ${amount}\nRefund: ${refunded ? 'done' : 'FAILED — refund manually in the Razorpay dashboard'}\n\n${err.stack || err}`)
      .catch(e => console.error('Admin mail failed:', e));
    const why = err instanceof UserError ? err.message : 'We could not book your box.';
    throw new UserError(refunded
      ? `${why} Your payment of ₹${amount} has been refunded (it can take 5–7 days to reach your account).`
      : `${why} Your payment ID is ${paymentId} — our team will refund you within 2 days.`, err.status || 500);
  }

  // An earlier run of this payment already booked it: report that box, not a new one
  if (already) {
    if (already.box)         entry.box         = already.box;
    if (already.name)        entry.name        = already.name;
    if (already.expiredDate) entry.expiredDate = already.expiredDate;
    if (already.paymentId)   entry.paymentId   = already.paymentId;
  }

  // The receipt is sent again on a repeat confirm. A second copy of the mail is
  // a small annoyance; a booking with no receipt at all is a support ticket.
  return { amount, already: !!already, paymentId: entry.paymentId, emailSent: await mailBooked(entry, email, amount) };
}

// ── action "paid": Checkout's callback reached the browser ───
async function confirmPayment(b, entry, image, email) {
  const orderId = b.razorpay_order_id, paymentId = b.razorpay_payment_id;
  if (!validPaymentSignature(orderId, paymentId, b.razorpay_signature)) {
    throw new UserError('We could not verify your payment. If money was taken, please mail our support team.');
  }
  const order = await fetchOrder(orderId);
  matchOrder(order, entry);
  return bookPaid(entry, image, email, order, paymentId);
}

// ── action "recover": the callback never arrived ─────────────
// The browser is not a reliable witness to a payment: a UPI app can push the
// page out of memory, a tab can be closed, the reply to "paid" can be lost to
// a timeout. Here Razorpay is asked directly whether this order was paid, so
// money is never taken without the box being booked.
async function recoverPayment(b, entry, image, email) {
  const orderId = String(b.orderId || b.razorpay_order_id || '');
  if (!/^order_[A-Za-z0-9_]{6,40}$/.test(orderId)) {
    throw new UserError('We could not find that payment. Please mail our support team.');
  }

  const order = await fetchOrder(orderId);
  matchOrder(order, entry);               // the order must belong to this form

  // Razorpay's payment list, not anything the browser remembered
  const items   = await orderPayments(orderId);
  const payment = items.find(p => p.status === 'captured')
               || items.find(p => p.status === 'authorized');

  if (!payment) {
    const pending = items.some(p => p.status === 'created' || p.status === 'pending');
    return { paid: false, pending };
  }

  // Authorized but not captured is auto-refunded by Razorpay after a few days,
  // so take the money properly before handing over the box.
  if (payment.status === 'authorized') {
    try { await rzp(`/payments/${payment.id}/capture`, { amount: payment.amount, currency: payment.currency }); }
    catch (err) { console.error('Capture failed:', err); }
  }

  return { paid: true, ...(await bookPaid(entry, image, email, order, payment.id)) };
}

// ════════════════════════════════════════════════════════════
//  HANDLER   body.action: "order" | "paid" | "recover" | (none = free / trial)
// ════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};

  // A payment already made is always booked, maintenance or not
  const afterPayment = b.action === 'paid' || b.action === 'recover';

  // Server maintenance (maintenance.js) — no commits while it runs
  if (!afterPayment && MAINTENANCE.status().phase === 'active') {
    return res.status(503).json({ error: 'LogoHub is under maintenance. New logo sign-ups are paused — please try again later.' });
  }

  try {
    // Honeypot: bots fill hidden fields. Never on the money paths — a browser
    // or password manager that autofills the hidden field must not be able to
    // turn a real payment into a silent "ok" that books nothing.
    if (b.fax && !afterPayment) return res.status(200).json({ ok: true });

    // Nothing can be saved without the GitHub config - say so instead of a blank 500.
    // Not after a payment: that path must still run so the money gets refunded.
    if (!afterPayment && !(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)) {
      throw new UserError('Logo sign-ups are not set up yet. Please mail our support team.', 503);
    }

    const { entry, image, email } = readForm(b);
    const reserved = entry.box <= RESERVED_MAX;

    if (reserved) {
      if (!process.env.RAZORPAY_KEY_ID) throw new UserError('Online payment is not set up yet. Please mail our support team.', 503);
      if (b.action === 'order') return res.status(200).json({ ok: true, ...(await createOrder(entry)) });

      if (b.action === 'paid') {
        const r = await confirmPayment(b, entry, image, email);
        return res.status(200).json({ ok: true, box: entry.box, paid: true, already: r.already, amount: r.amount, paymentId: r.paymentId, validTill: istDate(entry.expiredDate), emailSent: r.emailSent });
      }

      // Checkout's callback never arrived — ask Razorpay what really happened
      if (b.action === 'recover') {
        const r = await recoverPayment(b, entry, image, email);
        if (!r.paid) return res.status(200).json({ ok: true, paid: false, pending: !!r.pending });
        return res.status(200).json({ ok: true, box: entry.box, paid: true, already: r.already, amount: r.amount, paymentId: r.paymentId, validTill: istDate(entry.expiredDate), emailSent: r.emailSent });
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

    // GitHub rejected us: bad / expired GITHUB_TOKEN, or a wrong GITHUB_REPO / GITHUB_BRANCH.
    // Waiting will not help, so do not ask the user to try again later.
    if (err.ghStatus === 401 || err.ghStatus === 403 || err.ghStatus === 404) {
      return res.status(503).json({ error: 'We could not save your logo - our storage is not reachable. Please mail our support team; this one is on us, not you.' });
    }

    return res.status(500).json({ error: 'Something went wrong. Please try again in a few minutes.' });
  }
};
