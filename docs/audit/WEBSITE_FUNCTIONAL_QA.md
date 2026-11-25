# Website Functional QA

**Date:** 2026-11-26 · **Branch:** `staging`

## Observed

- Local Website root `http://127.0.0.1:5173/` returned HTTP 200.
- Chrome headless loaded the root page and returned the Vite HTML application shell.
- `npm run lint` completed with 0 errors and 5 React Hook/unused-disable warnings.
- `npm run build` passed. The sitemap fetched 4 report routes, 10 blog routes, 3 course routes, and 20 product routes from the local API. The first build exposed wrong response extractors for courses/products; after correcting them, the rebuild included both sets.
- Website fixes described in [HANDOFF_SUMMARY.md](HANDOFF_SUMMARY.md) cover authentication, consultations, cart/wishlist, orders, downloads, reports and routing.

## Not verified in this pass

- Customer sign-in, profile edits, cart checkout, consultation booking, report purchase/download, and persistent state were not exercised end to end with an isolated account.
- No live payment or message provider was called.
- Browser automation was not available as a project dependency/tool in this session; root-page HTTP success alone is not an E2E pass.

## Result

**Partial:** root page, sitemap data and build/lint were verified; authenticated customer workflows remain unverified.
