# Bugs and Fixes

**Date:** 2026-11-26 · **Branch:** `staging`

The previously completed integration and security fixes are summarized in [HANDOFF_SUMMARY.md](HANDOFF_SUMMARY.md), with endpoint details in [API_CONTRACT_MATRIX.md](API_CONTRACT_MATRIX.md).

## Additional continuation fixes

- Consultation booking input now accepts an optional three-letter currency code, uppercases it, and forwards it to `commerceService.createOrder`.
- Consultation slot lookup now resolves the type separately from its pricing mode, so types with multiple modes (including Urgent Consultations) can show availability without requiring mode selection in the slot query.
- Admin report summaries include order currency alongside `language` and order payment/status fields.
- The Website sitemap now extracts the live API's course `data.items` and product `data.products` collections; the verified rebuild generated 3 course and 20 product URLs.
- The Mongo migration now writes order-line rows for historical product/report/consultation sales; saved cart and wishlist rows; coupon assignments and each historical redemption; invoices and invoice numbers; and payment method, paid timestamp, transaction metadata, and digital entitlement fields.
- Digital file URLs are converted to storage keys through `storageService.resolveKey`.

## Additional security and checkout fixes (2026-11-26)

- SEC-006 was approved and fixed: Website/Admin browser sessions use API-hosted HttpOnly cookies with CSRF validation. See [SECURITY_DEPLOYMENT_REVIEW.md](SECURITY_DEPLOYMENT_REVIEW.md) for the required VM origin/HTTPS review.
- Store checkout now passes the API-returned `order.id` (with `_id` fallback) to payment verification. Previously it sent `order._id`, which was absent from the Website order response and caused successful Razorpay callbacks to fail API verification. Checkout now also surfaces order/configuration/verification errors to the customer.
- Consultation payment booking now sends selected dates as `YYYY-MM-DD` from both Website booking flows. The old `DD-MM-YYYY` string was rejected by the API booking schema as `Invalid request data`, before a payment order could be created.

## Open items

- Historical orphan references are still skipped where required foreign keys cannot be resolved; confirm skip counts before migration.
- Historical invoice numbers include duplicates/malformed values by design; preserve source values and review before initializing the new counter.
- Full browser workflows and database reconciliation are not yet verified; see associated QA reports.
