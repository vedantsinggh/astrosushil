# Bugs and Fixes

**Date:** 2026-11-26 · **Branch:** `staging`

The previously completed integration and security fixes are summarized in [HANDOFF_SUMMARY.md](HANDOFF_SUMMARY.md), with endpoint details in [API_CONTRACT_MATRIX.md](API_CONTRACT_MATRIX.md).

## Additional continuation fixes

- Consultation booking input now accepts an optional three-letter currency code, uppercases it, and forwards it to `commerceService.createOrder`.
- Admin report summaries include order currency alongside `language` and order payment/status fields.
- The Website sitemap now extracts the live API's course `data.items` and product `data.products` collections; the verified rebuild generated 3 course and 20 product URLs.
- The Mongo migration now writes order-line rows for historical product/report/consultation sales; saved cart and wishlist rows; coupon assignments and each historical redemption; invoices and invoice numbers; and payment method, paid timestamp, transaction metadata, and digital entitlement fields.
- Digital file URLs are converted to storage keys through `storageService.resolveKey`.

## Open items

- SEC-006: Website and Admin keep bearer JWTs in `localStorage`; owner decision or coordinated HttpOnly cookie/CSRF change is required.
- Historical orphan references are still skipped where required foreign keys cannot be resolved; confirm skip counts before migration.
- Historical invoice numbers include duplicates/malformed values by design; preserve source values and review before initializing the new counter.
- Full browser workflows and database reconciliation are not yet verified; see associated QA reports.
