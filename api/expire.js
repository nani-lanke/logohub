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
  istDate, SITE, decryptEmail, allCompanies, blockRe, logoPaths, commitChange, sendUserMail,
} = require('./_lib.js');

function expiredMail(c) {
  const end = istDate(c.expiredDate);
  if (c.paymentId) return {
    subject: `Your LogoHub Box ${c.box} has expired`,
    body: `Hi ${c.name},

Your 1-year plan for Box ${c.box} on LogoHub ended on ${end}, so your logo has been removed from the wall.

To put your logo back for another year, book a Reserved box again at ${SITE()}/sendrequest.html and pay online. Box ${c.box} stays open for anyone to book, so book soon if you want the same number.`,
  };
  return {
    subject: `Your LogoHub free trial has ended — Box ${c.box}`,
    body: `Hi ${c.name},

Your free trial for Box ${c.box} on LogoHub ended on ${end}, so your logo has been removed from the wall.

To put your logo back, book a Reserved box at ${SITE()}/sendrequest.html and pay online for 1 year, or reply to this mail and we will help you.`,
  };
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
      for (const c of expired) {
        src = src.replace(src.match(blockRe(c.box))[0], '');
        for (const p of logoPaths(paths, c.box)) files.push({ path: p, mode: '100644', type: 'blob', sha: null });
      }
      return { message: `Expired: box ${expired.map(c => c.box).join(', ')}`, src, files };
    });

    // Mail after the commit, so a retry never mails anyone twice
    const mailed = [];
    for (const c of expired) {
      let email = '';
      try { email = decryptEmail(c.emailEnc); } catch (err) { console.error(`Box ${c.box}: cannot decrypt email`, err); }
      if (!email) continue;
      const { subject, body } = expiredMail(c);
      try { await sendUserMail(email, subject, body); mailed.push(c.box); }
      catch (err) { console.error(`Box ${c.box}: expiry mail failed`, err); }
    }

    return res.status(200).json({ ok: true, removed: expired.map(c => c.box), mailed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
