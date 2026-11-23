# Website integration plan

**Status:** planning. No integration code has been written.
**Last updated:** 2026-11-24

## Goal

One backend and one admin panel for the Astro Sushil website and the mobile app. This repository's backend (`apps/api`) and admin (`apps/admin`) are the ones that survive. The existing website backend and admin are retired after their features and all their data have moved here. This is a migration, not a rebuild: nothing the website does today is dropped.

## The existing website

Cloned read-only at `/home/pilot/Projects/astrosushil-website/` (outside this repository).

| Repo | What it is | Live deploy trigger |
|---|---|---|
| `astrosushil/astro-sushil-backend` | Express 5, MongoDB (Mongoose), Redis/BullMQ, Razorpay, AWS S3 | push to `prod` |
| `astrosushil/astro-sushil-admin` | React (Vite) admin, about 25 screens | push to `prod` |
| `astrosushil/astro-sushil-frontend` | React (Vite) public website | manual, after push to `main` |

**Rules for those repos**
- They are never edited directly. Each clone has a local hook that refuses pushes to `main` and `prod`.
- Any change goes on our own branch and reaches them only as a pull request that their developer reviews, merges and deploys.
- Their developer is responsible for every live deployment.

## Decisions (owner, 2026-11-24)

**Scope**
- Everything the website backend and admin do is carried over, whether or not it is used today.
- All history moves: customers, orders, bookings, report orders, transactions, invoices. Volume is about 100 of each per month.
- Website and app share the same customers, bookings, orders and reports.
- A feature that exists only on the website is also added to the mobile app (not the admin features).
- Order of work: backend first, admin second, the website frontend last. Their developer is rebuilding the frontend separately.
- One planned migration, not a piecemeal swap.

**Astrology and reports**
- The paid astrology vendor is replaced by our own kundli, match-making, horoscope and report APIs. Place search moves from Google Places to ours.
- Reports must be available in Hindi and English from day one: all 14 report types. Hindi is written directly by the model and passes the same checks as English (no translate-after step). A Hindi report may cost up to Rs 20 in LLM usage; English stays under Rs 10. Design: `docs/integration/hindi-reports-design.md`.
- The daily horoscope must be available in Hindi and English from day one.
- Kalsarpa and Pitra dosha sections are removed from the free kundli.
- The free match-making page becomes real (it shows a hardcoded result today).
- Report delivery keeps the website's current behaviour: a "within 48 hours" confirmation and delivery after the configured delay (default 24 hours).

**Commerce**
- Foreign-currency payments stay.
- No refunds on the website flows.
- The invoice series `INV-AS/<n>` stays, with every existing number preserved exactly and the counter continuing from the last one.
- Courses stay as links to an outside platform. We do not run courses for now.
- One astrologer, one booking calendar.

**Accounts and messaging**
- Customer login is OTP only on both website and app. Password and Google login are removed for customers.
- The same SMS (SMSLane) and WhatsApp (WhatChimp) providers and approved templates are used for both website and app.
- Staff need custom roles and permissions. Staff log in with email and password.

**Infrastructure**
- Uploaded files stay in the website's AWS S3 bucket. Cloudflare R2 is not used.
- The single backend is hosted on the website's VPS.

**Admin**
- The admin scope freeze in `AGENTS.md` section 6 is lifted for this work. `AGENTS.md` must be updated to say so before admin work starts.
- Permanent deletion of customers and bookings works as it does on the website today.

**Working rules**
- No work on `main`. Integration work happens on a `staging` branch.
- No Claude co-author or attribution lines in commits or pull requests.
- Nothing is assumed: an unclear point is asked before it is built.

## What exists where

| Area | Website backend | This backend |
|---|---|---|
| Customer OTP login | Yes (SMS, WhatsApp, email) | Flow exists; no SMS is sent |
| Kundli, match-making, daily horoscope, place search | Via paid vendor and Google | Own engine; English only |
| Paid PDF reports | Vendor PDF with our cover; Hindi and English | Generated; 14 types; one Hindi definition |
| Razorpay order, verify, webhook | Yes | Yes |
| Foreign currencies | Nine | INR only |
| Refunds | No | Yes |
| GST invoices, shared numbering | Yes | No |
| Transactions ledger and GST report | Yes | No |
| Coupons, wishlist, saved cart | Yes | No |
| Products with variants, categories | Admin-editable | Seeded from code, no categories |
| Consultations and availability | Admin-editable hours, blocked days, manual booking | Hard-coded hours |
| Courses | External links | Real enrolment |
| Blogs, banners, media, testimonials, FAQs, inquiries, SEO, site settings | Yes | No |
| File uploads | S3 | None (reports only, via R2 client) |
| Email, SMS, WhatsApp notifications | Yes | Push and in-app only |
| Staff roles | Editable roles and permissions | Three fixed roles |
| Audit log | No | Yes |

## Replacing the vendor

| Website feature | Today | Replacement | Work needed |
|---|---|---|---|
| Free kundli | Vendor `generate_astrology_kundli` | `POST /astrology/kundli` and related | Response in the shape the page needs; chart image; Sade Sati; drop dosha sections |
| Match-making | Vendor `match` | `POST /astrology/matchmaking` | Response shape |
| Daily horoscope | Vendor `dailyhoroscope` | `GET /rashi-bhavishya/today` | Hindi |
| Place search | Google Places | `GET /locations/search` | Response shape |
| Paid reports | Vendor `reports/<type>` | Report platform | Hindi; mapping of the four products (below) |

The vendor assumes Indian time for every birth. Our engine resolves the real timezone, so results for births outside India will differ, correctly.

### Mapping of the four paid reports (decided 2026-11-24)

| Website product | Replacement |
|---|---|
| Mini horoscope | Planetary Summary (about 17 pages) |
| Basic horoscope | A shorter Kundli (about 40 pages), to be defined |
| Pro horoscope | Fortune Plus (about 83 pages) |
| Match-making | Couple Matching (about 78 pages) |

### The shorter "basic" Kundli (chosen 2026-11-24, owner delegated the choice)

A new report built from the full Kundli's own topics, so the two never disagree. It keeps what a reader expects from a kundli and leaves the deep tables and life-area chapters to the full report.

| Kept | Left to the full Kundli |
|---|---|
| Birth details, Avakahada Chakra, Panchang at birth | Ghatak Chakra |
| Lagna chart (D1), Navamsa chart (D9), planet positions, the twelve houses at a glance | South Indian and Moon charts, aspect table, the sixteen divisional charts |
| Life timeline, Mahadasha and Antardasha tables | Pratyantardasha tables, the Mahadasha chapters |
| The three pillars: Ascendant, Moon sign, birth Nakshatra | Panchang decoded, Ashtakavarga |
| The nine planet profiles | Bhavphal (house by house), conjunctions, Chara Karakas, Rahu and Ketu chapter |
| One reading each on love and career | Darakaraka, commitment windows, Mars and marriage |
| Sade Sati, Yogas, the note on doshas | Numerology, spiritual potential |
| Supportive practices | |

The page count is measured once it is built; the target is about 40 pages. It needs its own report type value.

## Phases

1. **Preparation.** Staging environment; a copy of the live MongoDB data; the list of environment settings; security findings sent to the website developer.
2. **Foundations.** S3 uploads; editable roles and permissions; multi-currency amounts; coupons; invoice numbering; transactions ledger; SMS, WhatsApp and email sending; OTP-only customer login.
3. **Astrology and reports for the website.** Hindi reports and horoscope; website-shaped kundli and match-making responses; report ordering with the website's delivery rules.
4. **Catalogue and content.** Categories; admin-editable products, consultations, availability and course links; blogs, banners, media, testimonials, FAQs, inquiries, SEO, site settings.
5. **Shop and bookings.** Wishlist; saved cart; orders; digital downloads; manual bookings; reschedules; GST report.
6. **Admin.** Every screen of the website admin, in this repository's admin.
7. **Data migration.** One script per collection, rehearsed on the staging copy until totals reconcile.
8. **Cut-over.** Freeze the old site, run the migration, point the website and the admin at this backend, keep the old backend read-only for a period.
9. **Mobile app.** Website-only features added to the app.

## Data migration notes

- MongoDB to PostgreSQL; ids are remapped and the old id is kept on each row.
- Amounts are decimal rupees in the paid currency there and integer paise here. Foreign-currency records keep their currency, rate and INR amount.
- Bookings store date and slot as strings in Indian time.
- The website's own repair scripts show some paid bookings without a transaction, some transactions with an out-of-range status, and some missing or duplicate invoice numbers. The migration must report these, not hide them.
- An hourly job on the website permanently deletes pending records older than two days, so only settled records need to move.
- Phone numbers are stored in mixed formats and must be normalised to match app accounts for the same person.
- Files stay where they are in S3; only their links move.

## Open questions

- The vendor subscription is handled by the owner and does not drive the schedule.

## Security findings on the website

Written up separately for the website developer at `/home/pilot/Projects/astrosushil-website/SECURITY-FINDINGS-2026-11-24.md` (kept outside this repository).
