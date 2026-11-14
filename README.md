# LogoHub

A wall of 600 logo boxes at <https://www.logohub.in>. Click a logo and you land on
that brand's website, YouTube, Instagram or WhatsApp. Brands claim a box through
the form on `sendrequest.html`.

Static pages on Vercel, plus three small serverless functions in `api/`.
No build step: edit a file, push to `main`, Vercel redeploys in about a minute.

## What is where

| File | What it does |
|---|---|
| `index.html` + `script.js` | The wall: 40 sets × 15 slots, colour guide, search, logo popup |
| `sendrequest.html` | Claim a box: box picker, form, free trial / online payment |
| `logoUploadInstructions.html` | Logo size guide for each box shape |
| `termsandconditions.html` | Terms and privacy policy |
| `companies.js` | **The data.** Every listed brand, the category colours, box shapes and prices |
| `css.css`, `theme.css`, `theme.js` | Shared styles, dark / light theme |
| `maintenance.js` | Scheduled-maintenance banner; also pauses sign-ups server-side |
| `screenone/box<N>.*` | One logo image per booked box |
| `api/submit.js` | The form: validation, free / trial booking, Razorpay order → confirm → book |
| `api/expire.js` | Daily cron: removes expired boxes, mails the owner, audits paid-but-unbooked orders |
| `api/brand.js` + `api/_brands.js` | Server-rendered `/brands` directory and `/brand/<slug>` pages |
| `api/sitemap.js` | `/sitemap.xml` built from `companies.js` |
| `api/_lib.js` | Shared helpers: GitHub commits, Razorpay calls, email, box shapes |
| `vercel.json` | Function limits, the cron schedule, `/brand/*` and `/sitemap.xml` rewrites |

## How a booking works

1. The form posts JSON (logo as a base64 data URL) to `/api/submit`.
2. **Special boxes (1–120)** are booked by mailing support; the page pre-fills the mail.
3. **Reserved boxes (121–360)** are paid online for 1 year: the API creates a Razorpay
   order, Checkout opens, the API verifies the payment and books the box. A payment
   that cannot be booked is refunded; one the browser lost track of is recovered.
4. **Available boxes (361–600)** get a 7-day free trial; the **Free** boxes among them
   (every Mini box in the last row) never expire.
5. Booking = one GitHub commit that adds the logo and the entry to `companies.js`.
   Vercel sees the commit and redeploys, so the wall, brand page and sitemap update
   on their own.

## Box shapes and prices

`boxShape(n)` lives in **two places that must stay the same**: `companies.js`
(the browser) and `api/_lib.js` (the server, which decides what Razorpay charges).

| Shape | Price / year |
|---|---|
| Square | ₹119 |
| Horizontal, Vertical | ₹79 |
| Mini | ₹49 |

### Test price switch

Both files start with `const TEST_PRICE = …;`. While it is a number, **every** box
costs that many rupees — handy for a real-money test of the payment flow.

- Testing: `const TEST_PRICE = 1;` in both files.
- Normal: `const TEST_PRICE = null;` in both files.

Change both and push; the site is on the real prices once Vercel has redeployed.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Purpose |
|---|---|
| `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` | Fine-grained token (Contents: read & write), `owner/repo`, branch (default `main`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Live keys from the Razorpay dashboard |
| `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST` | Mailbox that sends the receipts (host defaults to `mail.spacemail.com`) |
| `ADMIN_EMAIL` | Where admin alerts go (defaults to `SMTP_USER`) |
| `EMAIL_KEY` | Any long random text; encrypts customer emails stored in `companies.js` |
| `CRON_SECRET` | Any long random text; without it the daily expiry cron is refused (401) |
| `SITE_URL` | Defaults to `https://www.logohub.in` |

## Working on the files

The form commits to GitHub by itself, so **always pull before you edit or upload**
`companies.js`, or you will erase someone's booking. `sync.bat` (local helper, not in
the repo) pulls, then commits and pushes your change.

Edit files in an editor and push them whole. Pasting one file's contents into another
file in the GitHub web editor takes the site down until it is fixed.
