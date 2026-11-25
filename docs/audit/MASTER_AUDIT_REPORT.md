# Astro Sushil Platform Audit — Master Report

**Date:** 2026-11-26
**Branch:** `staging`
**Baseline:** `f107143`
**Scope:** API, Website, Admin, Flutter, packages, local database and Mongo migration script.

## Executive summary

The platform integration fixes recorded in [HANDOFF_SUMMARY.md](HANDOFF_SUMMARY.md) are present on `staging`. This continuation added the consultation currency pass-through, exposed the optional 3-letter currency field in the consultation request schema, added the Admin reports order currency summary, and expanded the Mongo migration for invoice history, order lines, carts, wishlists, coupon assignments/redemptions, payment method reconciliation, and digital entitlement metadata.

The local API, Website, and Admin were restarted and responded during final checks. PostgreSQL on `127.0.0.1:5432` accepted connections. The Mongo migration was dry-run only; no database writes were performed.

## Verified results

- API TypeScript check passed after the continuation edits (`cd apps/api && npx tsc --noEmit`).
- Full API suite against local PostgreSQL passed **2,375/2,375** with `REPORT_SEND_DELAY_HOURS=0` (JUnit duration 293.54 seconds); migration mapper tests passed **3/3**. See [REGRESSION_TEST_RESULTS.md](REGRESSION_TEST_RESULTS.md) for the R1 override context.
- Local API `GET /health` returned HTTP 200 with `status: ok`.
- Local Website `GET /` returned HTTP 200; Admin `GET /login` returned HTTP 200.
- Website lint/build passed after fixing sitemap response extraction; the build discovered 3 course routes and 20 product routes. Lint reported 5 warnings and 0 errors.
- Flutter `analyze --no-fatal-infos` exited successfully and the widget/unit suite passed 964/964. Analysis reported `withOpacity` deprecations; widget logs reported three missing planet image assets handled by the `AstroImage` fallback.
- The reports service returns `language` and an `order` summary; this was confirmed in source. `order` now also includes currency.
- Existing uncommitted work was present before the continuation and has been preserved.
- The prior handoff reports passing Website/Admin builds, package tests, and Flutter analysis/tests (964/964). Those results are inherited from the handoff and were not rerun during this continuation.

## Remaining limits

- Do not treat this report as production approval. SEC-006 remains an owner decision: Website/Admin bearer JWTs are stored in `localStorage`.
- The Mongo migration was not applied to any database. Application of migration data is separate from changing the migration code.
- Full live browser E2E and cross-platform customer/staff workflows were not run with isolated accounts in this pass. Headless Chrome loaded the Website shell and Admin login route; authenticated workflows remain unverified. See the platform QA reports.
- No production database or live payment, SMS, WhatsApp, or email provider was accessed.

## Security posture

SEC-001 through SEC-005 and SEC-007 through SEC-010 fixes are described in the handoff. SEC-006 remains open pending owner decision or a coordinated HttpOnly cookie and CSRF migration. Re-review [SECURITY_AUDIT.md](SECURITY_AUDIT.md) before release.

## Data migration

Migration behavior is described in [DATABASE_RECONCILIATION.md](DATABASE_RECONCILIATION.md). The script reads local backup JSON and writes only when invoked with `--apply`; it includes a local-database guard. It was not run with `--apply` here. Historical discrepancies, orphan references, currency conversion assumptions, and invoice number irregularities require review before production migration.

## Release recommendation

Hold production release until the API suite results are reviewed, all browser and staff/customer workflows are exercised on isolated staging accounts, cross-platform database state is reconciled, SEC-006 has an owner decision, and the migration has been rehearsed against a disposable database snapshot.
