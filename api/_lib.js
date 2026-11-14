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

// The serverless function has a hard time limit: once it is hit the reply is
// thrown away, so the browser sees nothing even when the work was done. Any
// step that talks to someone else gets a deadline well inside that limit.
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms); }),
  ]);
}

// ─── Box shape + price — keep in sync with boxShape() in companies.js ──
// Numbers run across the 8 sets of a laptop row: the top 2 rows of every
// set first (1–48: Square, Mini, Mini, …), then the lower 3 rows (49–120,
// 9 per set). Every row of sets holds 120 boxes.
function boxShape(n) {
  const o = (n - 1) % 120 + 1;                       // position inside its row of sets
  if (o <= 48) {
    return (o - 1) % 3 === 0 ? { name: 'Square', price: 119 } : { name: 'Mini', price: 49 };
  }
  const k = (o - 49) % 9 + 1;                        // lower 3 rows, 9 boxes per set
  if (k === 4 || k === 8) return { name: 'Square',     price: 119 };
  if (k === 7)            return { name: 'Vertical',   price: 79  };
  if (k === 3 || k === 9) return { name: 'Horizontal', price: 79  };
  return                         { name: 'Mini',       price: 49  };
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

// Orders created in the last `days` days, so a payment that was made but
// never booked can be found later (see the audit in api/expire.js)
async function recentOrders(days = 3) {
  const from = Math.floor(Date.now() / 1000) - days * 86400;
  const r = await rzp(`/orders?from=${from}&count=100`);
  return Array.isArray(r.items) ? r.items : [];
}

// Every payment attempt made on an order, newest first. This is how a payment
// is found again when Checkout's callback never reached the browser — the user
// switched to a UPI app and the page was discarded, the tab was closed, the
// network dropped. Razorpay, not the browser, is the record of what was paid.
async function orderPayments(orderId) {
  const r = await rzp(`/orders/${orderId}/payments`);
  return Array.isArray(r.items) ? r.items : [];
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

// The entry for box N: from "  {  box : N," to its closing "  },".
// \r? everywhere: companies.js holds a mix of CRLF (hand-edited on Windows)
// and LF (written by companyBlock), and an entry must be found either way.
const blockRe = box => new RegExp(`\\r?\\n  \\{\\r?\\n    box\\s*:\\s*${box},[\\s\\S]*?\\r?\\n  \\},`);

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
//  EMAIL — one mail to the user, blind-copied to the support mailbox
//  (the copy's To: header shows which customer it went to)
// ════════════════════════════════════════════════════════════
const SIGN_OFF = `For any future assistance, please reply to this mail.

Thank you,
LogoHub Team`;

const mailer = () => nodemailer.createTransport({
  host  : process.env.SMTP_HOST || 'mail.spacemail.com',
  port  : 465,
  secure: true,
  auth  : { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // A mail server that stops answering must not eat the whole time budget —
  // a booked box with no receipt is recoverable, a timed-out reply is not.
  connectionTimeout: 8000,
  greetingTimeout  : 8000,
  socketTimeout    : 12000,
});

// ─── Blind record copy of every outgoing mail ──────────────────────────────
// No sendMail() call here passes an explicit `envelope`, so nodemailer puts
// this address in the SMTP envelope only and strips the Bcc: header out of
// the message — the recipient never sees it.
const ARCHIVE_BCC = 'support@logohub.in';

// 'LogoHub <a@b.in>' -> 'a@b.in'
const bareAddr = v => String(v || '').replace(/^[^<]*</, '').replace(/>.*$/, '').trim().toLowerCase();

// Spread into a sendMail() call: { bcc } normally, {} when a visible
// recipient is already the archive address (never list it twice).
const archiveBcc = (...to) => to.flat().filter(Boolean).some(a => bareAddr(a) === ARCHIVE_BCC)
  ? {}
  : { bcc: ARCHIVE_BCC };

// ─── Branded HTML mail ────────────────────────────────────────────────────
// Every mail is written as plain text (that text stays the text/plain part, so
// clients that strip HTML still read well). mailHtml() turns the same text into
// the LogoHub-looking mail: midnight header, ivory card, champagne-gold panel.
//   "  Label : value" (indented lines) → rows of the gold details panel
//   every other line                   → a paragraph
//   opts.cta = { label, url }          → the button under the body
const MC = {
  page: '#f6f1e7', card: '#fffdf8', panel: '#faf6ee', ink: '#0d1017',
  text: '#221c12', dim: '#6e6656', gold: '#d6b87a', bronze: '#8c6a2c',
  line: '#e8dec9',
};
const FONT  = "Arial,Helvetica,'Segoe UI',sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

const DETAIL_RE = /^[ \t]{2,}([^:]{1,40}?)[ \t]*:[ \t]*(.+)$/;

// Plain-text body → [{ type:'p', text } | { type:'details', rows:[[k,v]] }]
function mailBlocks(body) {
  const out = [];
  let joinable = false;                      // previous line was part of a paragraph
  for (const raw of String(body).replace(/\r/g, '').split('\n')) {
    const detail = raw.match(DETAIL_RE);
    if (detail) {
      const last = out[out.length - 1];
      if (last && last.type === 'details') last.rows.push([detail[1], detail[2]]);
      else out.push({ type: 'details', rows: [[detail[1], detail[2]]] });
      joinable = false;
      continue;
    }
    const line = raw.trim();
    if (!line) { joinable = false; continue; }
    const last = out[out.length - 1];
    if (joinable && last && last.type === 'p') last.text += ' ' + line;
    else out.push({ type: 'p', text: line });
    joinable = true;
  }
  return out;
}

// Escape, then turn bare URLs into links ("https://" is hidden from the label)
const mailLine = s => escapeHtml(s).replace(
  /https?:\/\/[^\s<]*[^\s<.,;:)]/g,
  url => `<a href="${url}" style="color:${MC.bronze};font-weight:600;text-decoration:underline;">${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>`);

function detailsHtml(rows) {
  const tr = rows.map(([k, v]) => `
              <tr>
                <td style="padding:6px 14px 6px 0;font:600 11px/1.5 ${FONT};letter-spacing:.09em;text-transform:uppercase;color:${MC.dim};">${mailLine(k)}</td>
                <td align="right" style="padding:6px 0;font:bold 15px/1.5 ${FONT};color:${MC.text};">${mailLine(v)}</td>
              </tr>`).join('');
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${MC.panel};border:1px solid ${MC.line};border-left:3px solid ${MC.gold};border-radius:10px;">
          <tr><td style="padding:14px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${tr}
            </table>
          </td></tr>
        </table>`;
}

function ctaHtml(cta) {
  if (!cta || !cta.url || !cta.label) return '';
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;">
          <tr><td align="center" bgcolor="${MC.bronze}" style="border-radius:999px;">
            <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 30px;font:bold 15px/1 ${FONT};color:${MC.card};text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)}</a>
          </td></tr>
        </table>`;
}

function mailHtml(subject, body, opts = {}) {
  const site   = SITE();
  const blocks = mailBlocks(body);
  const lead   = blocks.find(b => b.type === 'p' && !/^Hi\b/i.test(b.text));
  const pre    = lead ? lead.text.slice(0, 120) : '';

  const main = blocks.map((b, i) => {
    if (b.type === 'details') return detailsHtml(b.rows);
    if (i === 0 && /^Hi\b/i.test(b.text)) return `
        <p style="margin:0 0 14px;font:400 18px/1.5 ${SERIF};color:${MC.text};">${mailLine(b.text)}</p>`;
    return `
        <p style="margin:0 0 14px;font:400 15px/1.7 ${FONT};color:${MC.text};">${mailLine(b.text)}</p>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background:${MC.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${MC.page};font-size:1px;line-height:1px;">${escapeHtml(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MC.page};">
  <tr><td align="center" style="padding:28px 12px 34px;">

    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:${MC.card};border:1px solid ${MC.line};border-radius:14px;">

      <tr><td style="background:${MC.ink};padding:24px 30px;border-radius:13px 13px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:12px;"><img src="${site}/icons/logohub-icon.png" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;border-radius:8px;"></td>
          <td style="font:bold 20px/1 ${SERIF};letter-spacing:.16em;color:${MC.gold};text-transform:uppercase;">LogoHub</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:3px;background:${MC.gold};font-size:0;line-height:0;">&nbsp;</td></tr>

      <tr><td style="padding:30px 30px 4px;">
        <h1 style="margin:0 0 18px;font:700 22px/1.3 ${SERIF};color:${MC.ink};">${escapeHtml(subject)}</h1>${main}${ctaHtml(opts.cta)}
      </td></tr>

      <tr><td style="padding:20px 30px 28px;">
        <div style="height:1px;background:${MC.line};font-size:0;line-height:0;">&nbsp;</div>
        <p style="margin:18px 0 12px;font:400 14px/1.7 ${FONT};color:${MC.dim};">For any future assistance, please reply to this mail.</p>
        <p style="margin:0;font:400 15px/1.6 ${FONT};color:${MC.text};">Thank you,<br><strong style="color:${MC.bronze};">LogoHub Team</strong></p>
      </td></tr>
    </table>

    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
      <tr><td align="center" style="padding:16px 14px 0;font:400 12px/1.7 ${FONT};color:${MC.dim};">
        <a href="${site}" style="color:${MC.bronze};text-decoration:none;font-weight:600;">logohub.in</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:support@logohub.in" style="color:${MC.bronze};text-decoration:none;font-weight:600;">support@logohub.in</a>
        <br>You are receiving this mail because a logo was submitted to LogoHub with this address.
      </td></tr>
    </table>

  </td></tr>
</table>
</body></html>`;
}

async function sendUserMail(email, subject, body, opts = {}) {
  const transport = mailer();
  const from = `LogoHub <${process.env.SMTP_USER}>`;
  const text = `${body}\n\n${SIGN_OFF}`;
  const html = mailHtml(subject, body, opts);

  // One mail only. The blind record copy above is the admin's record of it —
  // its To: header shows which customer it went to. There is no second
  // "admin copy" mail any more, so nothing relies on it for contacting users.
  try {
    await withTimeout(
      transport.sendMail({ from, to: email, replyTo: process.env.SMTP_USER, subject, text, html, ...archiveBcc(email) }),
      15000, 'User mail');
  } finally {
    transport.close();   // an open socket keeps the serverless function alive
  }
}

// Admin-only alert (e.g. a payment that needs a manual look)
async function sendAdminMail(subject, text) {
  const to        = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const transport = mailer();
  try {
    await withTimeout(
      transport.sendMail({ from: `LogoHub <${process.env.SMTP_USER}>`, to, subject, text, ...archiveBcc(to) }),
      15000, 'Admin mail');
  } finally {
    transport.close();
  }
}

module.exports = {
  UserError, istString, istDate, escapeHtml, SITE, boxShape, withTimeout,
  emailHash, encryptEmail, decryptEmail,
  gh, rzp, validPaymentSignature, orderPayments, recentOrders,
  liveCompanies, allCompanies, companyBlock, blockRe, logoPaths, readRepo, commitChange,
  sendUserMail, sendAdminMail, mailHtml,
};
