/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/submit.js   (Vercel serverless function)

   HOW IT WORKS:
   1. sendrequest.html POSTs the form as JSON (logo = base64 data URL)
   2. Validate fields, box number and image
   3. One GitHub commit: screenone/box{N}.{ext} + data/trials.json
      → Vercel sees the commit and redeploys (~1 min) → logo is live
   4. Email the user "free trial started" via Spacemail SMTP, and send
      the admin a copy whose Reply goes to the user in the same thread

   ENV VARS (Vercel → Project → Settings → Environment Variables):
     GITHUB_TOKEN   – fine-grained token, Contents: Read & Write, this repo only
     GITHUB_REPO    – "owner/repo"
     GITHUB_BRANCH  – default "main"
     SMTP_USER      – Spacemail address, e.g. support@logohub.in
     SMTP_PASS      – Spacemail password
     SMTP_HOST      – default "mail.spacemail.com"
     ADMIN_EMAIL    – where your copy goes; default SMTP_USER
     SITE_URL       – default "https://www.logohub.in"
   ════════════════════════════════════════════════════════════ */

const crypto     = require('crypto');
const nodemailer = require('nodemailer');

const TRIAL_DAYS   = 9;                // Free boxes; also the default for older entries
const AVAIL_DAYS   = 7;                // Available boxes
const MAX_LOGO     = 1024 * 1024;      // 1 MB
const TRIALS_PATH  = 'data/trials.json';
// Keep in sync with specialList / reservedList / freeBoxes in sendrequest.html
const NO_TRIAL_MAX = 180;              // boxes 1–180 are special/reserved
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

class UserError extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

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

const isLive = t => t.paid || Date.now() < Date.parse(t.trialStart) + (t.trialDays || TRIAL_DAYS) * 864e5;

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ─── GitHub REST helper ───────────────────────────────────────
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}${path}`, {
    method : opts.method || 'GET',
    body   : opts.body && JSON.stringify(opts.body),
    headers: {
      Authorization         : `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept                : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type'        : 'application/json',
    },
  });
  if (!r.ok) {
    const err = new Error(`GitHub ${r.status} on ${path}: ${await r.text()}`);
    err.ghStatus = r.status;
    throw err;
  }
  return r.json();
}

// ════════════════════════════════════════════════════════════
//  COMMIT — logo + trials.json in a single commit
// ════════════════════════════════════════════════════════════
async function commitTrial(entry, image, emailHash) {
  const branch = process.env.GITHUB_BRANCH || 'main';

  const ref    = await gh(`/git/ref/heads/${branch}`);
  const head   = await gh(`/git/commits/${ref.object.sha}`);
  const tree   = await gh(`/git/trees/${head.tree.sha}?recursive=1`);
  const paths  = new Map(tree.tree.map(f => [f.path, f.sha]));

  let trials = [];
  if (paths.has(TRIALS_PATH)) {
    const blob = await gh(`/git/blobs/${paths.get(TRIALS_PATH)}`);
    trials = JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8'));
  }

  if (trials.some(t => t.emailHash === emailHash && isLive(t))) {
    throw new UserError('This email already has an active free trial.', 409);
  }

  // A box is taken if it has a logo file, unless that logo is an
  // expired, unpaid trial — then the new trial replaces it.
  const oldTrial = trials.find(t => t.box === entry.box);
  const oldLogos = [...paths.keys()].filter(p => new RegExp(`^screenone/box${entry.box}\\.[a-z]+$`).test(p));
  if (oldLogos.length && (!oldTrial || isLive(oldTrial))) {
    throw new UserError(`Box ${entry.box} is already booked. Please choose another.`, 409);
  }

  const logoPath = `screenone/box${entry.box}.${image.ext}`;
  entry.icon = logoPath;
  trials = trials.filter(t => t.box !== entry.box);
  trials.push({ ...entry, emailHash });

  const imgBlob = await gh('/git/blobs', { method: 'POST', body: { content: image.buf.toString('base64'), encoding: 'base64' } });
  const newTree = await gh('/git/trees', {
    method: 'POST',
    body: {
      base_tree: head.tree.sha,
      tree: [
        { path: logoPath,    mode: '100644', type: 'blob', sha: imgBlob.sha },
        { path: TRIALS_PATH, mode: '100644', type: 'blob', content: JSON.stringify(trials, null, 2) + '\n' },
        // Remove an expired trial's logo if it had a different extension
        ...oldLogos.filter(p => p !== logoPath).map(p => ({ path: p, mode: '100644', type: 'blob', sha: null })),
      ],
    },
  });
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: { message: `Free trial: box ${entry.box} — ${entry.name}`, tree: newTree.sha, parents: [head.sha] },
  });

  try {
    await gh(`/git/refs/heads/${branch}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
  } catch (err) {
    // Someone else committed in between — not a fast-forward
    if (err.ghStatus === 422) throw new UserError('The page was busy. Please press Submit again.', 409);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════
//  EMAIL — trial-started mail + admin copy in the same thread
// ════════════════════════════════════════════════════════════
async function sendTrialEmail(entry, email) {
  const transport = nodemailer.createTransport({
    host  : process.env.SMTP_HOST || 'mail.spacemail.com',
    port  : 465,
    secure: true,
    auth  : { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const site  = process.env.SITE_URL || 'https://www.logohub.in';
  const admin = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const days  = entry.trialDays;
  const end   = new Date(Date.parse(entry.trialStart) + days * 864e5)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const subject = `Your LogoHub free trial has started — Box ${entry.box}`;
  const body =
`Hi ${entry.name},

Your ${days}-day free trial on LogoHub has started!

  Box number : ${entry.box}
  Trial ends : ${end}

Your logo will appear on ${site} within a few minutes.

Your free trial is only for ${days} days. To keep your logo after ${end}, reply to this email and we will send you the payment details. If payment is not received, your logo will be removed after the trial.

Thank you,
LogoHub Team`;

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${
    escapeHtml(body).replace(/\n/g, '<br>')}</div>`;

  const sent = await transport.sendMail({
    from: `LogoHub <${process.env.SMTP_USER}>`, to: email, subject, text: body, html,
  });

  // Your copy: hitting Reply goes to the user, threaded with the mail above
  await transport.sendMail({
    from      : `LogoHub <${process.env.SMTP_USER}>`,
    to        : admin,
    replyTo   : email,
    subject,
    text      : body,
    html,
    inReplyTo : sent.messageId,
    references: [sent.messageId],
  });
}

// ════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const b = req.body || {};
    if (b.fax) return res.status(200).json({ ok: true });   // honeypot: bots fill hidden fields

    const box = Number(b.box);
    if (!Number.isInteger(box) || box < 1 || box > 600) throw new UserError('Please enter a valid box number (1–600).');
    if (box <= NO_TRIAL_MAX) throw new UserError('The free trial is only for Free (orange) and Available boxes.');

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
      trialStart : new Date().toISOString(),
      trialDays  : FREE_BOXES.has(box) ? TRIAL_DAYS : AVAIL_DAYS,
      paid       : false,
    };
    if (!Object.values(entry.links).some(Boolean)) throw new UserError('Please add at least one link (website, YouTube, etc.).');
    if (b.terms !== true) throw new UserError('Please agree to the Terms and Conditions.');

    const image = logo(b.logo);

    // Store only a hash — data/trials.json is publicly readable
    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
    await commitTrial(entry, image, emailHash);

    let emailSent = true;
    try { await sendTrialEmail(entry, email); }
    catch (err) { emailSent = false; console.error('Email failed:', err); }

    return res.status(200).json({ ok: true, box, trialDays: entry.trialDays, emailSent });
  } catch (err) {
    if (err instanceof UserError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again in a few minutes.' });
  }
};
