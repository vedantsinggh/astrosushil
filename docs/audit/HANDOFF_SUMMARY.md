# Astro Sushil — Platform Audit & Engineering Handoff Summary

**Repository:** `/home/pilot/Projects/astrosushil`
**Branch:** `staging` (audit changes based on `f107143`; no changes pushed)
**Legacy Reference (READ-ONLY — NEVER MODIFY):** `/home/pilot/Projects/astrosushil-website/`
**Date:** 2026-11-26

---

## 1. Completed Work

### A. Phase 1: 8-Agent Read-Only Audit
All 8 audit workstreams completed and consolidated:
- **Backend API (`apps/api`)**: Full route inventory, worker/queue architecture (`postgresQueueService`, no BullMQ), missing rate limits, error format gaps, unvalidated casts.
- **Website (`apps/website`)**: Consultation verification casing (`snake_case` vs `camelCase`) and `_id` vs `id` bugs, JSON-as-PDF invoice download, broken wishlist/currency/daily-horoscope/avatar/profile endpoints, cart shipping fallback mismatch (`₹49/₹0` vs backend `₹500`), `/thank-you` consultation copy, and 15 ESLint errors.
- **Flutter (`apps/mobile`)**: Critical shop checkout bypassing Razorpay SDK (`dev_simulated_verified_signature`), calls to 410-decommissioned auth endpoints, missing Email OTP & `link-email`, missing `PATCH /account/addresses/:id/default`, missing product pagination/fields, missing `/invoices/orders/:orderId/pdf`, missing `course-links`.
- **Admin (`apps/admin`)**: 56-route inventory; flat 38-item sidebar, `auth-context.tsx` dropping `isSuperAdmin`/`staffRole`, unwired backend actions (`payment-conflicts` assign-slot/refund, order refunds, `/transactions/[id]`), native `alert()`/`confirm()` dialogs.
- **Security**: 10 findings (`SEC-001` through `SEC-010`: 2 High, 5 Medium, 2 Low, 1 Informational).
- **Database & Migration**: All 10 handoff discrepancies investigated and explained (`ScheduleDay` 144→58 from `toDate()` failing on `DD-MM-YYYY`, `Order` 883→886, missing `Invoice`/`OrderItem`/`Cart`/`Wishlist`/`CouponAssignment`/`CouponRedemption`, `PaymentTransaction.method`, incomplete `DigitalProductEntitlement`).
- **Payments & Business Logic**: Verified BigInt paise precision, Razorpay HMAC & `FOR UPDATE` locking, coupon `FOR UPDATE` holds, and frontend/backend divergences.
- **UX & Product Consistency**: Broken `/home` and `/login` redirects, `"Astro Samarth"` typo in mobile navbar, dead `Book Again` button, hidden modal errors, accessibility gaps.

---

### B. Fixes Implemented (Uncommitted on `staging`)

#### 1. Backend & Security (`apps/api` & `packages/report-engine`)
- `apps/api/src/errors/error-handler.ts` (`SEC-001`): Removed manual CORS header reflection in `globalErrorHandler`.
- `apps/api/src/plugins/cors.ts` (`SEC-002`): Restricted `localhost`/`127.0.0.1`/`.trycloudflare.com` to `NODE_ENV !== 'production'` and enforced exact `URL.origin` allowlist matching.
- `apps/api/src/services/token.service.ts` (`SEC-003`): Atomic `rotateRefreshToken` inside `prisma.$transaction` with `revokedAt: null` precondition and token-family revocation on replay.
- `apps/api/src/modules/auth/otp.service.ts` (`SEC-004`): Atomic `verifyOtp` inside `prisma.$transaction` with `usedAt: null` and `attempts: { lt: 5 }` preconditions.
- `apps/api/src/modules/products/products.admin.service.ts` & `product-view.ts` (`SEC-005`): Applied `sanitizeRichText` to product `description` on create, update, and public read.
- `apps/api/src/modules/admin/admin.routes.ts` & `auth.routes.ts` (`SEC-007`): Added `10 req/min` per-route rate limit on `/admin/auth/login`, `/auth/forgot-password`, and `/auth/reset-password`.
- `packages/report-engine/src/platform/render/document.ts` (`SEC-008`): Added `-no-shell-escape` to `xelatex` args.
- `apps/api/src/services/storage.service.ts` (`SEC-009`): Removed hardcoded fallback secret; throws in production if `JWT_SECRET`/`STORAGE_SECRET` are unset and uses an ephemeral random key in non-production.
- `apps/api/src/plugins/swagger.ts` (`SEC-010`): Disabled `@fastify/swagger-ui` (`/documentation`) when `NODE_ENV === 'production'`.
- `apps/api/src/modules/reports/reports.routes.ts` (`API-001`): Exempted `/download-secure` from plugin-level `fastify.authenticate` hook and standardized error format to `{ error: { code, message, requestId } }`.
- `apps/api/src/modules/webhooks/webhooks.routes.ts` (`API-002`): Added `requestId` to all error responses and standardized `/whatsapp` verification error format.
- `apps/api/src/modules/admin/admin.routes.ts` (`API-003`): Added `adminService.logAction` to `/consultations/:id/{start-session,reschedule,cancel}`.
- `apps/api/src/modules/consultations/consultations.service.ts` (`API-004`): Added in-lock `status !== 'PAID'` guard and `COALESCE("paidAt", clock_timestamp())` in `verifyPayment`.
- `apps/api/src/modules/commerce/commerce.service.ts` (`API-005`): Cancelled `superseded` unpaid `PENDING` orders returned by `couponsService.reserveForOrder`.
- `apps/api/src/modules/commerce/money/rates.ts` & `apps/api/src/routes/index.ts` (`API-007`): Added `GET /api/v1/utils/exchange-rates` backed by `exchangeRateService.getPublicRates()`.
- `apps/api/src/scripts/migrate-from-mongo.ts`: Fixed `toDate()` to parse `DD-MM-YYYY` dates properly.
- `apps/api/tests/unit/security-audit-fixes.test.ts`: Added regression tests for `SEC-001`, `SEC-002`, `SEC-008`, `API-001`, and `API-007`.

#### 2. Website (`apps/website`) — Completed
- Consultation booking & payment (`Bookappointment.jsx`, `BookingModal.jsx`): `id ?? _id`, camelCase verify payload, `toast.error()`, `/register` redirect.
- `Myconsultationspage.jsx` & `useConsultationStore.js`: safe ID handling, `myBookingsLoading`, wired `Book Again` & `Cancel`, switched invoice download to `GET /api/v1/invoices/orders/${orderId}/pdf`.
- `useAuthStore.js`, `Profile.jsx`, `Profiledropdown.jsx`: sent `fullName` on `/verify-otp`, aligned `PATCH /auth/me` with `{ fullName }`, added refresh token + `/auth/logout`, removed dead `/auth/avatar` call.
- `toast.js` & `usePaymentStore.js`: extracted `errorData?.error?.message` (fixes `[object Object]`), removed dead `cod` branch.
- `useWishlistStore.js`, `Wishlistpage.jsx`, `useCartStore.js`, `CheckoutPage2.jsx`, `Ordersuccesspage.jsx`, `AppRouter.jsx`, `CartPage.jsx`, `CartDropdown.jsx`: aligned wishlist endpoints, wired `DELETE /cart/coupon`, fixed `/thank-you` to show `OrderSuccessPage`, aligned shipping fallback to flat ₹500, used `cart?.totalAmount`.
- `Downloadssection.jsx` & `useDownloadStore.js`, `useAstrologyStore.js`, `Myreportssection.jsx`, `ReportsDetails.jsx`, `Navbar.jsx`, `BlogCard.jsx`, `courseStore.js`, `useProductStore.js`, `useCategoryStore.js`, `usSettingStore.js`, and all 15 ESLint errors fixed.

#### 3. Admin Panel (`apps/admin`) — Completed
- `lib/auth-context.tsx`: Stored `isSuperAdmin` & `staffRole` from login; updated `hasPermissionCheck`.
- `components/Sidebar.tsx`, `Header.tsx`, `AdminGuard.tsx`, `app/globals.css`: Restructured 38 flat links into 10 operational sections, removed `/admin-users` from sidebar, fixed `/invoices` permission (`transactions:read || gst_report:read`), added responsive mobile drawer, replaced hardcoded `Environment: Production Ready`.
- `app/transactions/payment-conflicts/page.tsx` & `lib/api/bookings.ts`: wired `assign-slot` & `refund` with `ConfirmDialog`.
- `app/payments/[id]/page.tsx`, `app/shop-orders/[orderId]/page.tsx`, `lib/api/sales.ts`: wired staff refund (`POST /api/v1/admin/payments/orders/:id/refund`).
- `app/transactions/[id]/page.tsx` & `app/transactions/page.tsx`: created transaction detail page.
- `app/astrology-diagnostics/page.tsx`: added `RequirePermission` + Birth Profile search selector.
- Replaced native `alert()`/`confirm()` and moved modal errors inside modals in `reports/page.tsx`, `admin-users/page.tsx`, `users/[id]/page.tsx`, `ConsultationWorkspace.tsx`.

#### 4. Flutter (`apps/mobile`) — Completed
- Modified: `checkout_screen.dart`, `razorpay_checkout_service.dart`, `order_detail_screen.dart`, `shop_service.dart`, `product_model.dart`, `auth_repository.dart`, `auth_provider.dart`, `auth_interceptor.dart`, `user_model.dart`, `login_screen.dart`, `register_screen.dart`, `verification_screen.dart`, `course_models.dart`, `courses_provider.dart`, `courses_hub_screen.dart`, `courses_service.dart`, `notifications_provider.dart`, and widget/unit tests (`api_sync_fixes_test.dart`, `shop_checkout_razorpay_test.dart`, etc.).
- **Verified:** `flutter analyze --no-fatal-infos` (0 warnings, 0 errors) and `flutter test --exclude-tags ui_audit` (**964/964 passed**).

#### 5. Audit Docs Created (`docs/audit/`)
- `docs/audit/API_ENDPOINT_INVENTORY.md`
- `docs/audit/API_CONTRACT_MATRIX.md`
- `docs/audit/SECURITY_AUDIT.md`
- `docs/audit/DATABASE_RECONCILIATION.md`
- `docs/audit/ADMIN_RESTRUCTURING_PLAN.md`

---

## 2. Observed Build & Test Results

- `apps/api` `npx tsc --noEmit`: **Passed (0 errors)** (after all backend edits).
- `npm run build:packages`: **Passed** (after `document.ts` edit).
- `apps/api` targeted unit tests (`security-audit-fixes.test.ts`, `shop-routes.test.ts`, `wire-payments-webhook.test.ts`): **179/179 passed** (after all backend edits).
- `packages/astrology-engine`, `packages/report-engine`, `packages/prediction-engine`: **All passed** (exit code 0).
- `apps/website`: **0 ESLint errors** (5 warnings), **`vite build` passed** (after all website edits).
- `apps/admin`: **`tsc --noEmit` passed**, **`next build` passed (56/56 pages)** (after all admin edits).
- `apps/mobile`: **`flutter analyze --no-fatal-infos` passed** (0 warnings, 0 errors); **`flutter test --exclude-tags ui_audit` passed (964/964)**.
- Pre-edit `apps/api` full Vitest baseline: **129/133 files passed (2,357/2,370 tests passed)**. `phase4-consumer-reports.test.ts`, `phase10c-release-readiness.test.ts`, and `phase11-staging-acceptance.test.ts` failed due to `REPORT_SEND_DELAY_HOURS=24` default (owner decision `R1`); `phase4-consumer-reports.test.ts` passed **5/5** with `REPORT_SEND_DELAY_HOURS=0`.

---

## 3. Remaining Work

1. **Isolated live E2E:** Customer and staff workflows still need browser verification using disposable accounts. Current browser checks only loaded Website root and Admin `/login`; no isolated credentials were available. Do not treat HTTP shell loads as workflow E2E.
2. **Cross-platform database verification:** Read-only local counts were captured. Migration apply, post-migration reconciliation, and customer/staff writes across clients remain unverified.
3. **Cookie deployment review:** SEC-006 is remediated for the VM demo. Confirm actual Website/Admin/API origins, HTTPS, CORS, SameSite behavior, and browser cookie support before public deployment; see `SECURITY_DEPLOYMENT_REVIEW.md`.
4. **Production migration rehearsal:** Use a disposable database snapshot, inspect orphan skips, invoice anomalies, and repeat-run behavior before any production migration.
5. **Commit on `staging`:** Review the complete diff and commit with Conventional Commits. Do not push or touch `main`.

---

## 4. Continuation Log (2026-11-26)

This section is the persistent handoff/memory for the continuation of the audit.

- Branch confirmed as `staging`; existing uncommitted work was preserved.
- Read-only local database snapshot: 1,358 users; 886 orders; 4 order items; 276 reports; 526 bookings; 882 payment transactions; 0 invoices; 0 carts; 0 wishlist items; 0 coupon assignments; 0 coupon redemptions; 90 digital entitlements.
- Added the optional consultation `currency` request field and forwarded it to `commerceService.createOrder`.
- Admin reports already returned `language` and `order`; added order `currency` to the summary response.
- Expanded the Mongo migration for invoices, deterministic order items, carts, wishlists, coupon audience/assignments/redemptions, payment method and accounting metadata, and digital entitlement fields. The invoice counter is not copied; `money.md` requires a separate reviewed initialization step. Migration was not applied to a database.
- Full API suite default run: 2,375 tests, 15 failed. Twelve failures were legacy report-readiness expectations incompatible with R1's 24-hour delay; two were caused by an incomplete mocked Prisma transaction API; one expected 401 for an invalid signed URL instead of the route's 403 signature rejection. Updated the transaction mock and signed-URL assertion. Targeted OTP/auth tests then passed 21/21.
- A full API rerun with `REPORT_SEND_DELAY_HOURS=0` passed **2,375/2,375**. The report-, prediction-, and astrology-engine suites passed **502/502**, **147/147**, and **831/831** respectively. This override is for legacy immediate-download expectations only; R1 remains 24 hours in normal configuration.
- Final API rerun JUnit report records **2,375 tests, 0 failures, 0 errors** (293.54 seconds), with `REPORT_SEND_DELAY_HOURS=0`; migration mapper tests passed **3/3** and API typecheck passed after extracting the helpers. R1 remains 24 hours in normal configuration.
- Final local checks: API `/health`, Website `/`, and Admin `/login` returned HTTP 200. Chrome headless loaded the Website shell and Admin login route. Customer/staff authenticated workflows were not exercised with isolated accounts.
- SEC-006 was approved and remediated with API-hosted HttpOnly Website/Admin cookies plus CSRF checks. Future origin/HTTPS/browser behavior must be reviewed before deployment. No production database or live payment/SMS/WhatsApp/email providers were accessed. No push has been performed.
- Website/Admin builds and type checks passed; Website lint had 5 warnings. Flutter analysis exited successfully and **964/964** tests passed, with existing deprecation/missing-asset notices.
- Audit deliverables added: `MASTER_AUDIT_REPORT.md`, Website/Mobile/Admin functional QA, `CROSS_PLATFORM_DATA_CONSISTENCY.md`, `BUGS_AND_FIXES.md`, `REGRESSION_TEST_RESULTS.md`, and `PRODUCTION_READINESS_CHECKLIST.md`.
- No push has been performed. The user requested a local commit only.


### 2026-11-26 Security hardening continuation

- Added Website/Admin HttpOnly access and refresh cookies; browser mutation requests require an API-issued CSRF token and exact allowlisted origin. Mobile bearer-token flow remains intact. Old browser localStorage token keys are cleared on boot and no longer used for auth.
- Added persistent per-staff-account throttling for admin login and password reset: five failed attempts in a 15-minute window start a 15-minute lock. Added the `StaffAuthAttempt` Prisma model/migration and integration coverage.
- Added production configuration validation that refuses insecure auth cookies. Cookie topology and deployment review guidance is in `SECURITY_DEPLOYMENT_REVIEW.md`.
- Upgraded API to Fastify 5, compatible Fastify plugins, Zod 4 (using its v3 compatibility entry for existing schemas), Nodemailer 10, Vitest 5 and Vite 8; upgraded Admin to Next 16/React 19. Removed unrelated dependencies that the forced audit fix had placed into workspaces.
- Root and Website online `npm audit` results: **0 vulnerabilities** each (2026-11-26).
- Full API Vitest suite: **2,381/2,381 passed**, zero failures/errors, against local PostgreSQL with `REPORT_SEND_DELAY_HOURS=0` for legacy immediate-download fixtures. Owner decision R1 remains the 24-hour release delay in normal runtime configuration. Report-engine: **502/502**, prediction-engine: **147/147**, and astrology-engine: **831/831** passed.
- The original default-delay API run had 15 failures: 12 legacy report download/readiness assertions due to R1's 24-hour hold, and three password-reset tests whose in-memory Prisma mock lacked the new lockout model. Added the mock behavior; the zero-delay rerun passed every test.
- Prediction-engine tests: **147/147 passed**. Astrology-engine tests: **831/831 passed**. Report-engine tests: **502/502 passed** (201.56 seconds).
- Website production build passed; lint passed with 0 errors and 6 warnings. Admin Next production build passed. Final `npm run build` passed, including all packages, API, and Admin. Admin ESLint passed with 0 errors and 12 warnings under the upgraded flat config.
- No production database or live payment/SMS/WhatsApp/email providers were accessed. No push has been performed. The user requested a local commit only.
