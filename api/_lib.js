/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/_lib.js   (shared by api/submit.js and api/expire.js)
   The leading "_" tells Vercel this file is not an API route.

   GitHub commits to companies.js, emails, the encrypted user email
   and the Razorpay REST calls all live here.

   ENV VARS used here (see api/submit.js for the full list):
     GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH
     SMTP_USER, SMTP_PASS, SMTP_HOST, ADMIN_EMAIL, SITE_URL
     EMAIL_KEY            – any long random text; encrypts user emails
                            in companies.js so the expiry mail can be sent
     RAZORPAY_KEY_ID      – from Razorpay Dashboard → Account & Settings → API Keys
     RAZORPAY_KEY_SECRET
   ════════════════════════════════════════════════════════════ */

const crypto     = require('crypto');
const vm         = require('vm');
const nodemailer = require('nodemailer');

const COMPANIES_PATH = 'companies.js';   // form entries are appended to companies[]

class UserError extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

// India time, e.g. '2026-10-31T22:04:58+05:30' — readable and Date.parse()-able
const istString = ms => new Date(ms + 5.5 * 36e5).toISOString().slice(0, 19) + '+05:30';

// '7 November 2026'
const istDate = s => new Date(Date.parse(s))
  .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SITE = () => process.env.SITE_URL || 'https://www.logohub.in';

// ─── Box shape + price — keep in sync with boxShape() in sendrequest.html ──
function boxShape(n) {
  const slot = (n - 1) % 15 + 1;
  if ([1, 3, 8, 10].includes(slot)) return { name: 'Square',     price: 119 };
  if (slot === 12)                  return { name: 'Vertical',   price: 79  };
  if (slot === 13 || slot === 15)   return { name: 'Horizontal', price: 79  };
  return                                   { name: 'Mini',       price: 49  };
}

// ════════════════════════════════════════════════════════════
//  USER EMAIL — companies.js is public, so the email is stored
//  only as a hash (duplicate check) and AES-encrypted (expiry mail)
// ════════════════════════════════════════════════════════════
const emailHash = email => crypto.createHash('sha256').update(email).digest('hex');

const emailKey = () => process.env.EMAIL_KEY && crypto.createHash('sha256').update(process.env.EMAIL_KEY).digest();

function encryptEmail(email) {
  const key = emailKey();
  if (!key) { console.warn('EMAIL_KEY not set — no expiry mail for this box'); return ''; }
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
}

function decryptEmail(token) {
  const key = emailKey();
  if (!key || !token) return '';
  const buf      = Buffer.from(token, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

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

// ─── Razorpay REST helper ─────────────────────────────────────
async function rzp(path, body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method : body ? 'POST' : 'GET',
    body   : body && JSON.stringify(body),
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`Razorpay ${r.status} on ${path}: ${await r.text()}`);
  return r.json();
}

// Checkout's handler signature = HMAC-SHA256("order_id|payment_id", key secret)
function validPaymentSignature(orderId, paymentId, signature) {
  const want = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return typeof signature === 'string' && signature.length === want.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(want));
}

// ════════════════════════════════════════════════════════════
//  COMPANIES.JS — read the list, add / remove one entry
// ════════════════════════════════════════════════════════════
// Run the file in a sandbox to get companies[] exactly as the site sees it
// (entries past their expiredDate already removed by the file itself)
const liveCompanies = src => vm.runInNewContext(`${src}\n;companies`, {}, { timeout: 1000 });

// Every entry, expired ones included (the file's clock is stopped at 0)
const allCompanies = src => vm.runInNewContext(`${src}\n;companies`, { Date: { now: () => 0, parse: Date.parse } }, { timeout: 1000 });

// One entry, in the same layout as the hand-written ones
function companyBlock(e) {
  // JSON escaping, but single-quoted like the rest of the file
  const q = s => `'${JSON.stringify(s).slice(1, -1).replace(/\\.|'/g, m => m === '\\"' ? '"' : m === "'" ? "\\'" : m)}'`;
  const opt = (key, v) => v ? `\n    ${key.padEnd(11)}: ${q(v)},` : '';
  return `  {
    box        : ${e.box},
    name       : ${q(e.name)},
    shortName  : ${q(e.shortName)},
    icon       : ${q(e.icon)},
    category   : ${q(e.category)},
    serviceType: ${q(e.serviceType)},
    buyingDate : ${q(e.buyingDate)},
    expiredDate: ${e.expiredDate === Infinity ? 'Infinity' : q(e.expiredDate)},
    links: {
      website  : ${q(e.links.website)},
      youtube  : ${q(e.links.youtube)},
      instagram: ${q(e.links.instagram)},
      whatsapp : ${q(e.links.whatsapp)},
      location : ${q(e.links.location)},
    },
    emailHash  : ${q(e.emailHash)},${opt('emailEnc', e.emailEnc)}${opt('paymentId', e.paymentId)}${opt('orderId', e.orderId)}
  },
`;
}

// The entry for box N: from "  {  box : N," to its closing "  },"
const blockRe = box => new RegExp(`\\n  \\{\\n    box\\s*:\\s*${box},[\\s\\S]*?\\n  \\},`);

// All logo files for box N, e.g. screenone/box181.png
const logoPaths = (paths, box) => [...paths.keys()].filter(p => new RegExp(`^screenone/box${box}\\.[a-z]+$`).test(p));

// Latest companies.js from GitHub, plus the commit it came from
async function readRepo() {
  const branch = process.env.GITHUB_BRANCH || 'main';
  const ref    = await gh(`/git/ref/heads/${branch}`);
  const head   = await gh(`/git/commits/${ref.object.sha}`);
  const tree   = await gh(`/git/trees/${head.tree.sha}?recursive=1`);
  const paths  = new Map(tree.tree.map(f => [f.path, f.sha]));
  const blob   = await gh(`/git/blobs/${paths.get(COMPANIES_PATH)}`);
  return { branch, head, paths, src: Buffer.from(blob.content, 'base64').toString('utf8') };
}

// ════════════════════════════════════════════════════════════
//  COMMIT — change(repo) returns { message, src, files } (or null =
//  nothing to do) and is re-run on a fresh copy if someone else
//  committed in between
// ════════════════════════════════════════════════════════════
async function commitChange(change) {
  for (let attempt = 1; ; attempt++) {
    const repo = await readRepo();
    const c    = await change(repo);
    if (!c) return false;

    const newTree = await gh('/git/trees', {
      method: 'POST',
      body  : { base_tree: repo.head.tree.sha, tree: [{ path: COMPANIES_PATH, mode: '100644', type: 'blob', content: c.src }, ...c.files] },
    });
    const commit = await gh('/git/commits', {
      method: 'POST',
      body  : { message: c.message, tree: newTree.sha, parents: [repo.head.sha] },
    });
    try {
      await gh(`/git/refs/heads/${repo.branch}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
      return true;
    } catch (err) {
      // Not a fast-forward — try again on top of the new commit
      if (err.ghStatus !== 422) throw err;
      if (attempt === 3) throw new UserError('The page was busy. Please press Submit again.', 409);
    }
  }
}

// ════════════════════════════════════════════════════════════
//  EMAIL — mail to the user + admin copy in the same thread
//  (hitting Reply on the copy goes to the user)
// ════════════════════════════════════════════════════════════
const SIGN_OFF = `For any future assistance, please reply to this mail.

Thank you,
LogoHub Team`;

const mailer = () => nodemailer.createTransport({
  host  : process.env.SMTP_HOST || 'mail.spacemail.com',
  port  : 465,
  secure: true,
  auth  : { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendUserMail(email, subject, body) {
  const transport = mailer();
  const from = `LogoHub <${process.env.SMTP_USER}>`;
  const text = `${body}\n\n${SIGN_OFF}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${
    escapeHtml(text).replace(/\n/g, '<br>')}</div>`;

  const sent = await transport.sendMail({ from, to: email, replyTo: process.env.SMTP_USER, subject, text, html });
  await transport.sendMail({
    from, to: process.env.ADMIN_EMAIL || process.env.SMTP_USER, replyTo: email, subject, text, html,
    inReplyTo: sent.messageId, references: [sent.messageId],
  });
}

// Admin-only alert (e.g. a payment that needs a manual look)
async function sendAdminMail(subject, text) {
  await mailer().sendMail({ from: `LogoHub <${process.env.SMTP_USER}>`, to: process.env.ADMIN_EMAIL || process.env.SMTP_USER, subject, text });
}

module.exports = {
  UserError, istString, istDate, escapeHtml, SITE, boxShape,
  emailHash, encryptEmail, decryptEmail,
  gh, rzp, validPaymentSignature,
  liveCompanies, allCompanies, companyBlock, blockRe, logoPaths, readRepo, commitChange,
  sendUserMail, sendAdminMail,
};
