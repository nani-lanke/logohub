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
// ⚠ TEMPORARY — live payment test. Every box shows this many rupees while it
// is set. Put it back to null after testing (also TEST_PRICE in api/_lib.js).
const TEST_PRICE = 1;

function boxShape(n) {
  const shape = realBoxShape(n);
  return TEST_PRICE ? { ...shape, price: TEST_PRICE } : shape;
}

function realBoxShape(n) {
  const o = (n - 1) % 120 + 1;                       // position inside its row of sets
  if (o <= 48) {                                     // top 2 rows: Square, Mini, Mini, …
    return (o - 1) % 3 === 0 ? { name: 'Square', price: 119 } : { name: 'Mini', price: 49 };
  }
  const k = (o - 49) % 9 + 1;                        // lower 3 rows, 9 boxes per set
  if (k === 4 || k === 8) return { name: 'Square',     price: 119 };
  if (k === 7)            return { name: 'Vertical',   price: 79  };
  if (k === 3 || k === 9) return { name: 'Horizontal', price: 79  };
  return                         { name: 'Mini',       price: 49  };
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
