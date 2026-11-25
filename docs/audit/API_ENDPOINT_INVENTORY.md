# Complete API Endpoint Inventory (`apps/api`)

**Audit Date:** 2026-11-25
**Baseline Commit:** `f107143` (`staging`)
**Base Prefix:** `/api/v1` (mounted in `apps/api/src/routes/index.ts`)

---

## 1. Health & Readiness (`apps/api/src/routes/health.ts`)
Mounted at `/` and `/api/v1`.
- `GET /health`, `GET /api/v1/health` — Public. Returns `{ status, timestamp, service, environment }`.
- `GET /ready`, `GET /health/ready`, `GET /api/v1/ready`, `GET /api/v1/health/ready` — Public. Checks Prisma & `postgresQueueService`.

## 2. Authentication (`apps/api/src/modules/auth/auth.routes.ts`, prefix `/api/v1/auth`)
- `POST /phone/send-otp` — Public (`otpSendLimiter`). Zod `phoneSendOtpSchema`. DB: `User`, `OtpVerification`, `OtpSendLog`.
- `POST /phone/verify-otp` — Public. Zod `phoneVerifyOtpSchema` (`{ phoneNumber, otp, fullName?, birthProfile? }`). DB: `User`, `OtpVerification`, `RefreshToken`, `BirthProfile`.
- `POST /email/send-otp` — Public (`otpSendLimiter`). Zod `emailSendOtpSchema`.
- `POST /email/verify-otp` — Public. Zod `emailVerifyOtpSchema` (`{ email, otp, fullName?, birthProfile? }`).
- `POST /link-phone` — `authenticate`. Zod `linkPhoneSchema`.
- `POST /link-email` — `authenticate`. Zod `linkEmailSchema`.
- `POST /{register,login,verify-email,resend-verification,google,link-google}` — Public. Retired: returns `410 AUTH_METHOD_REMOVED`.
- `POST /forgot-password` — Public (staff). Zod `forgotPasswordSchema`.
- `POST /reset-password` — Public (staff). Zod `resetPasswordSchema`.
- `POST /refresh` — Public. Zod `refreshSchema`. DB: `RefreshToken`, `User`.
- `POST /logout` — Public. Zod `logoutSchema`. DB: `RefreshToken`.
- `GET /me` — `authenticate`. DB: `User`, `BirthProfile`.
- `PATCH /me` — `authenticate`. Zod `updateProfileSchema` (`{ fullName }`). DB: `User`.

## 3. Users & Birth Profiles
- `GET /api/v1/users/me`, `DELETE /api/v1/users/me` (`apps/api/src/modules/users/users.routes.ts`) — `authenticate`.
- `POST /api/v1/birth-profiles`, `POST /migrate`, `GET /`, `GET /:id`, `PATCH /:id`, `PUT /:id`, `DELETE /:id` (`apps/api/src/modules/birth-profiles/birth-profiles.routes.ts`) — `authenticate`.

## 4. Astrology, Rashi Bhavishya, Vastu, Locations, Gupta Nadi, Predictions, Jyoti
- `GET /api/v1/locations/search` (`locations.routes.ts`) — Public.
- `POST /api/v1/astrology/{chart,kundli,dasha,dashas,dashas/yogini,dashas/chara,dashas/narayana,dashas/kalachakra,panchang,vargas,matchmaking,compatibility,evidence,predictions,strength,ashtakavarga,varshaphala,prashna,gochara,gochara/timeline,yogas,special-points,jaimini,kp,chart-variants,avakhada,vimshopaka,planetary-intelligence}`, `GET /conventions` (`astrology.routes.ts`) — `authenticateOptional`, rate-limited `20-60/min`. (`POST /sade-sati` returns `410 ENDPOINT_DECOMMISSIONED`).
- `GET /api/v1/web/astrology/geo-details` (and `/api/v1/astrology/geo-details`), `GET|POST .../generate-kundli`, `GET|POST .../match-making`, `POST .../daily-horoscope` (`web-astrology.routes.ts`) — Public, rate-limited `10-30/min`.
- `GET /api/v1/rashi-bhavishya/today` (`authenticateOptional`), `GET /api/v1/rashi-bhavishya/all` (Public).
- `GET /api/v1/vastu/categories`, `GET /api/v1/vastu/guidance` — Public.
- `POST /api/v1/gupta-nadi/evaluate`, `GET /api/v1/gupta-nadi/rules` — `authenticate`.
- `POST /api/v1/predictions/natal`, `POST /api/v1/predictions/transit` — `authenticate`.
- `POST /api/v1/jyoti/chat`, `POST /api/v1/jyoti/explain` — `authenticate`.

## 5. Reports & Web Reports
- `apps/api/src/modules/reports/reports.routes.ts` (`/api/v1/reports`, `authenticate`):
  - `POST /career`, `POST /generate`, `POST /`, `POST /career/:reportId/regenerate`, `GET /my-reports`, `GET /:id/status`, `GET /:id/access`, `GET /download-secure`, `GET /:id/pdf`, `GET /:id/download-file`, `DELETE /:id`, `GET /:id`.
- `apps/api/src/modules/web-astrology/web-reports.routes.ts` (`/api/v1/web/reports` & `/api/v1/report`):
  - Public (`60/min`): `GET /`, `GET /slug/:slug`, `GET /:id`.
  - Customer (`authenticate` + `requireActiveCustomer`): `GET /orders` (`30/min`), `POST /buy` (`10/min`), `POST /verify-payment` (`20/min`).

## 6. Consultations & Admin Bookings
- `apps/api/src/modules/consultations/consultations.routes.ts` (`/api/v1/consultations` & `/api/v1/consultation`):
  - Public: `GET /`, `GET /slots`, `GET /types`, `GET /types/:id`, `GET /blocked-dates`, `GET /:id`.
  - Customer (`authenticate`): `POST /book`, `POST /verify-payment`, `GET /my-bookings`, `GET /my-bookings/:id/invoice`, `GET /bookings/:id`, `POST /bookings/:id/reschedule`, `POST /bookings/:id/cancel`.
- `apps/api/src/modules/bookings/bookings.admin.routes.ts` (`/api/v1/admin`):
  - Consultation types: `GET/POST/PUT/DELETE /consultation-types*`, `POST .../block-date|unblock-date` (`consultations:{read,create,update,delete}`).
  - Availability: `GET/PUT/POST /availability*` (`availability:{read,update}`).
  - Bookings: `GET/POST/PATCH/DELETE /bookings*`, `POST /bookings/:id/payment-conflict/{assign-slot,refund}` (`bookings:*`, `payments:refund`).

## 7. Commerce: Products, Categories, Cart, Wishlist, Coupons, Orders, Account, Courses
- `products.routes.ts` (`/api/v1/products` & `/api/v1/shop`): `GET /`, `POST /cart/calculate`, `POST /orders`, `POST /orders/verify-payment`, `POST /orders/:orderId/verify-payment`, `GET /slug/:slug`, `GET /:idOrSlug`.
- `products.admin.routes.ts` (`/api/v1/admin/shop-products*`): `products:{read,create,update,delete}`.
- `categories.routes.ts`: Public `GET /api/v1/categories{,/tree,/:idOrSlug}`; Admin `/api/v1/admin/categories*` (`categories:{read,create,update,delete}`).
- `cart.routes.ts` (`/api/v1/cart`): `authenticate` + `requireActiveCustomer`. `GET /`, `POST /add`, `PUT /update`, `DELETE /remove`, `POST /coupon`, `DELETE /coupon`, `DELETE /clear`.
- `wishlist.routes.ts` (`/api/v1/wishlist`): `authenticate` + `requireActiveCustomer`. `GET /`, `POST /add`, `POST /toggle`, `POST /remove`, `DELETE /clear`.
- `coupons.routes.ts`: Customer `GET /api/v1/coupons/frontend`; Admin `/api/v1/admin/coupons*` (`coupons:{read,create,update,delete}`).
- `shop-orders.routes.ts`: Customer `/api/v1/orders` (`POST /create`, `POST /verify-payment`, `GET /my-orders`, `PATCH /:orderId/cancel`, `GET /:orderId`); Admin `/api/v1/admin/shop-orders*` (`orders:{read,export,update}`).
- `account.routes.ts` (`/api/v1/account`): `authenticate` + `requireActiveCustomer`. `GET /summary`, `GET /orders`, `GET /orders/:orderId`, `GET /downloads`, `GET /downloads/:entitlementId`, `GET/POST/PUT/PATCH/DELETE /addresses*`.
- `courses.routes.ts` (`/api/v1/courses` & `/api/v1/course`): `GET /`, `GET /lessons/:lessonId/playback`, `GET /:idOrSlug`, `GET /my-learning`, `POST /lessons/:lessonId/progress`, `POST /enroll`, `POST /verify-payment`.
- `course-links.routes.ts`: Public `GET /api/v1/course-links*`, `POST /:idOrSlug/click`; Admin `/api/v1/admin/course-links*` (`courses:{read,create,update,delete}`).

## 8. Payments, Webhooks, Transactions, Invoices
- `payments.routes.ts` (`/api/v1/payments`): `GET /catalog`, `POST /create-order`, `POST /verify`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/refund` (retired `403 REFUND_STAFF_ONLY`).
- `payments.admin.routes.ts`: `POST /api/v1/admin/payments/orders/:id/refund` (`payments:refund`).
- `webhooks.routes.ts` (`/api/v1/webhooks`): `POST /razorpay` (HMAC verified), `GET|POST /whatsapp`.
- `transactions.routes.ts` (`/api/v1/admin`): `GET /transactions`, `/transactions/unapplied-payments`, `/transactions/:id`, `/transactions/export`, `/gst-report`, `/gst-report/export` (`transactions:{read,export}`, `gst_report:{read,export}`).
- `invoices.routes.ts`: Customer `GET /api/v1/invoices/orders/:orderId{,/pdf}`; Admin `GET /api/v1/admin/invoices/orders/:orderId{,/pdf}` (`transactions:read`), `GET /admin/invoices/counter` (`gst_report:read`), `POST /admin/invoices/counter/initialize`, `POST /admin/invoices/allocate-pending` (`requireSuperAdmin`).

## 9. Content CMS, Uploads, Customers, Admin Core, RBAC, Notifications
- `content.routes.ts`: Public `GET /{banners/frontend,blogs,blogs/slug/:slug,blogs/:id,faqs,testimonial,testimonial/:id,media,media/:id,seo/:name,settings}`, `POST /inquiry`; Admin `/api/v1/admin/{banners,blogs,faqs,testimonials,media,inquiries,seo,settings}*`.
- `uploads.routes.ts`: `POST /api/v1/admin/uploads` (`uploads:create`); `GET /api/v1/uploads/local/*` (non-prod local only).
- `customers.routes.ts` (`/api/v1/admin/customers*`): `customers:{read,update,delete}`.
- `rbac.routes.ts` (`/api/v1/admin`): `/roles*`, `/permissions`, `/staff*`, `/auth/profile`, `/auth/change-password`.
- `admin.routes.ts` (`/api/v1/admin`): `/auth/login`, `/auth/logout`, `/auth/me`, `/dashboard`, `/subscriptions*`, `/plans`, `/payments*`, `/users*`, `/admin-users*`, `/birth-profiles*`, `/reports*`, `/jyoti`, `/system/health`, `/audit-log`, `/analytics/*`, `/notifications*`, `/live-sessions*`, `/consultations*` (legacy), `/courses*` (legacy), `/orders*` (legacy), `/products*` (legacy).
- `notification.routes.ts` (`/api/v1/notifications`, `authenticate`): `GET /`, `GET /unread-count`, `PATCH /:id/read`, `POST /read-all`, `POST|DELETE /device-token`, `GET|PUT /preferences`.
