# Production Readiness Checklist

**Date:** 2026-11-26 · **Branch:** `staging`

| Area | Status | Evidence / remaining work |
|---|---|---|
| Branch and change safety | Pass | Changes committed on `staging`; no push performed. |
| API compile | Pass | API TypeScript build passed; API `tsc --noEmit` passed after continuation edits. |
| Full API regression | Pass with legacy override | 2,375/2,375 passed using `REPORT_SEND_DELAY_HOURS=0`; default run has 12 stale R1 immediate-readiness expectations (see regression report). |
| Package tests | Pass | Report 502/502; prediction 147/147; astrology 831/831. |
| Website build and lint | Pass with warnings | Build passed; lint 0 errors/5 warnings; sitemap emitted 3 course and 20 product URLs. |
| Admin build and type check | Pass with warnings | `npx tsc --noEmit` and `next build` passed; Next emitted React Hook dependency warnings. |
| Flutter tests and analysis | Pass with notices | 964/964 tests passed; analyze exited successfully with deprecation info, and tests logged missing planet image assets that use fallback rendering. |
| Local browser E2E | Not verified | Isolated customer/staff workflows still need execution. |
| Cross-platform DB consistency | Not verified | Migration not applied; reconciliation counts not measured on local PostgreSQL. |
| Security SEC-006 | Owner decision | `localStorage` bearer JWTs persist pending cookie/CSRF decision. |
| Production database isolation | Pass (audit activity) | No production database accessed. |
| Live external providers | Pass (audit activity) | No payment, SMS, WhatsApp, or e-mail provider called. |
| Migration rehearsal | Not verified | Rehearse on disposable DB snapshot; inspect invoice duplicates and orphan skip counts. |
| Release approval | Not ready | Clear remaining verification items and obtain owner decision on SEC-006. |
