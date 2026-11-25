# Regression Test Results

**Date:** 2026-11-26 · **Branch:** `staging`

## Security/dependency continuation (2026-11-26)

- `REPORT_SEND_DELAY_HOURS=0 npm test --workspace=apps/api`: **2,381/2,381 passed**, 0 failures/errors (JUnit `test-results/api.xml`, 146.22 seconds), against local PostgreSQL. The override is for legacy immediate-download fixtures; R1 remains 24 hours in normal runtime configuration.
- The default-delay API run had 15 failures: 12 legacy report download/readiness assertions affected by the R1 hold and 3 password-reset tests whose in-memory Prisma mock lacked the new staff lockout model. The mock was updated; the zero-delay full rerun passed.
- `npm run test:report --workspace=apps/api`: **502/502 passed** (201.56 seconds).
- `npm run test:prediction --workspace=apps/api`: **147/147 passed** (3.46 seconds).
- `npm test --workspace=packages/astrology-engine`: **831/831 passed** (21.17 seconds).
- API typecheck/build and `npm run build` (all TS packages, API, Admin): **passed** after dependency upgrades and security changes.
- Website Vite production build: **passed**. Website ESLint: **0 errors, 6 warnings**.
- Admin Next production build: **passed** (55/55 pages). Admin ESLint flat config: **0 errors, 12 warnings**; disabled the React Hooks `set-state-in-effect` diagnostic because this app does not use React Compiler and existing effects intentionally load/reset state. Fixed the two React render-purity violations in coupon expiry and Markdown key generation.
- Online root and Website `npm audit`: **0 vulnerabilities** each on 2026-11-26.
- Cookie and account-lockout integration tests are included in the full API result. Targeted `auth.test.ts` previously passed **31/31**.
- `git diff --check`: passed.
- Flutter was not changed in this continuation; the preceding verified result remains **964/964 tests**.

## R1 report delay

Owner decision R1 sets the report-ready delay to 24 hours everywhere, including the app push. The default full API test run therefore exposes 12 stale legacy expectations. The passing full run above explicitly used `REPORT_SEND_DELAY_HOURS=0`; do not use that run to claim the configured production behavior is immediate.
