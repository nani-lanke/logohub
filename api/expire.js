/* ════════════════════════════════════════════════════════════
   LOGOHUB  —  api/expire.js   (Vercel cron, once a day — see vercel.json)

   1. Finds every box in companies.js whose expiredDate has passed
   2. One GitHub commit removes those entries and their logos
      (the site already hides them; this frees the box for the next user)
   3. Emails each user that their box has expired (paid 1-year boxes
      and 7-day trials — only entries saved with emailEnc can be mailed)

   Vercel sends "Authorization: Bearer <CRON_SECRET>" with every cron call,
   so set CRON_SECRET in the Vercel env vars — other callers get 401.
   ════════════════════════════════════════════════════════════ */

const {
  istDate, SITE, decryptEmail, allCompanies, blockRe, logoPaths, commitChange,
  sendUserMail, sendAdminMail, readRepo, recentOrders, boxShape,
} = require('./_lib.js');

function expiredMail(c) {
  const end = istDate(c.expiredDate);
  if (c.paymentId) return {
    subject: `Your LogoHub Box ${c.box} has expired`,
    body: `Hi ${c.name},

Your 1-year plan for Box ${c.box} on LogoHub ended on ${end}, so your logo has been removed from the wall.

To put your logo back for another year, book a Reserved box again at ${SITE()}/sendrequest.html and pay online. Box ${c.box} stays open for anyone to book, so book soon if you want the same number.`,
    cta: { label: 'Book a box again', url: `${SITE()}/sendrequest.html` },
  };
  return {
    subject: `Your LogoHub free trial has ended — Box ${c.box}`,
    body: `Hi ${c.name},

Your free trial for Box ${c.box} on LogoHub ended on ${end}, so your logo has been removed from the wall.

To put your logo back, book a Reserved box at ${SITE()}/sendrequest.html and pay online for 1 year, or reply to this mail and we will help you.`,
    cta: { label: 'Book a box again', url: `${SITE()}/sendrequest.html` },
  };
}

// ════════════════════════════════════════════════════════════
//  AUDIT — money taken, box not booked
//
//  sendrequest.html finishes a payment the moment the browser comes back,
//  and api/submit.js refunds a payment it cannot book. What neither can
//  cover is the person who paid and never returned to the page at all.
//  Razorpay knows about every such order, so once a day its recent orders
//  are compared with companies.js and anything missing is mailed to the
//  admin, who can book the box by hand or refund it. Read-only.
// ════════════════════════════════════════════════════════════
const AUDIT_SKIP_MS = 20 * 60000;      // ignore orders younger than this — a booking may still be in flight

async function auditPaidOrders() {
  if (!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)) return [];

  const [{ src }, orders] = await Promise.all([readRepo(), recentOrders(3)]);
  const now     = Date.now();
  const missing = orders.filter(o =>
    o.status === 'paid' &&                            // the money is actually in
    o.notes && o.notes.box &&                         // one of ours
    now - o.created_at * 1000 > AUDIT_SKIP_MS &&      // not still being booked
    !src.includes(o.id));                             // no box carries this order

  if (!missing.length) return [];

  await sendAdminMail(
    `LogoHub: ${missing.length} paid order(s) with no box`,
    `These Razorpay orders were paid for but no box in companies.js carries them.
The payer never came back to the page, so nothing could finish the booking.
Book the box by hand, or refund the payment in the Razorpay dashboard.

${missing.map(o => `  Box ${o.notes.box} (${boxShape(Number(o.notes.box)).name})
  Order      : ${o.id}
  Amount     : Rs. ${o.amount / 100}
  Paid at    : ${istDate(new Date(o.created_at * 1000).toISOString())}
  Receipt    : ${o.receipt || '-'}
`).join('\n')}
Razorpay dashboard → Transactions → Orders, and search the order id.`);

  return missing.map(o => ({ order: o.id, box: Number(o.notes.box), amount: o.amount / 100 }));
}

module.exports = async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let expired = [];
    await commitChange(({ src, paths }) => {
      const now = Date.now();
      expired = allCompanies(src).filter(c => c.expiredDate !== Infinity && Date.parse(c.expiredDate) <= now);
      if (!expired.length) return null;

      const files = [];
      const stuck = [];
      for (const c of expired) {
        // An entry laid out differently from the rest cannot be cut out safely.
        // Skip it and report it — never throw, or no box expires at all today.
        const block = src.match(blockRe(c.box));
        if (!block) { stuck.push(c.box); continue; }
        src = src.replace(block[0], '');
        for (const p of logoPaths(paths, c.box)) files.push({ path: p, mode: '100644', type: 'blob', sha: null });
      }
      expired = expired.filter(c => !stuck.includes(c.box));
      if (stuck.length) {
        sendAdminMail('LogoHub: expired box(es) could not be removed',
          `companies.js entries for box ${stuck.join(', ')} are past their expiredDate but do not match the\n` +
          `expected layout, so they were left alone. Remove them by hand, or reformat them like the others.`)
          .catch(err => console.error('Admin mail failed:', err));
      }
      if (!expired.length) return null;
      return { message: `Expired: box ${expired.map(c => c.box).join(', ')}`, src, files };
    });

    // Mail after the commit, so a retry never mails anyone twice
    const mailed = [];
    for (const c of expired) {
      let email = '';
      try { email = decryptEmail(c.emailEnc); } catch (err) { console.error(`Box ${c.box}: cannot decrypt email`, err); }
      if (!email) continue;
      const { subject, body, cta } = expiredMail(c);
      try { await sendUserMail(email, subject, body, { cta }); mailed.push(c.box); }
      catch (err) { console.error(`Box ${c.box}: expiry mail failed`, err); }
    }

    // Money taken but no box: tell the admin. Never blocks the expiry run.
    let unbooked = [];
    try { unbooked = await auditPaidOrders(); }
    catch (err) { console.error('Paid-order audit failed:', err); }

    return res.status(200).json({ ok: true, removed: expired.map(c => c.box), mailed, unbooked });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
