# API Specification (`/api/v1`)

All endpoints are served under `/api/v1` (with `/health` also mounted at root). Error responses follow the standard envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | AUTHENTICATION_ERROR | AUTHORIZATION_ERROR | NOT_FOUND | CONFLICT | RATE_LIMIT_EXCEEDED | INTERNAL_ERROR",
    "message": "Human-readable description",
    "requestId": "req-..."
  }
}
```

## Registered Route Modules (`apps/api/src/routes/index.ts`)

| Prefix | Module | Purpose |
| --- | --- | --- |
| `/health` | `healthRoutes` | Liveness and database readiness checks |
| `/auth` | `authRoutes` | `/csrf`, `/phone/send-otp`, `/phone/verify-otp`, `/email/send-otp`, `/email/verify-otp`, `/refresh`, `/logout`, `/me`, `/profile`, `/link-phone`, `/link-email`, `/forgot-password`, `/reset-password` |
| `/users` | `usersRoutes` | User account preferences, device tokens, account deletion |
| `/birth-profiles` | `birthProfilesRoutes` | CRUD for birth profiles (`isSelf`, `gender`, `isComplete` flags) |
| `/locations` | `locationsRoutes` | City/place geocoding & timezone lookup |
| `/astrology` & `/web/astrology` | `astrologyRoutes`, `webAstrologyRoutes` | Kundli generation, geo-details, match-making, daily horoscope, dashas, panchang |
| `/rashi-bhavishya` | `rashiBhavishyaRoutes` | Daily 12-sign Rashifal endpoints |
| `/vastu`, `/gupta-nadi`, `/predictions` | Domain routes | Vastu analysis, BNN rule evaluation, deterministic predictions |
| `/reports` & `/web/reports` & `/report` | `reportsRoutes`, `webReportsRoutes` | Report catalogue, ordering, payment verification, status polling, PDF download (honouring `REPORT_SEND_DELAY_HOURS`) |
| `/consultations` & `/consultation` | `consultationsRoutes` | Public consultation types, available slots, booking, payment verification, cancel, and admin-only reschedule (`POST /bookings/:id/reschedule` returns `403` for non-admin) |
| `/courses` & `/course` & `/course-links` | `coursesRoutes`, `courseLinksRoutes` | Course catalogue, enrollments, lesson progress |
| `/products` & `/shop` | `productsRoutes` | Physical & digital product catalogue |
| `/categories`, `/cart`, `/wishlist`, `/coupons`, `/orders` | Shop routes | Cart, wishlist, coupon validation, shop order checkout & history |
| `/account` | `accountRoutes` | Unified customer dashboard data |
| `/payments` & `/webhooks` | `paymentsRoutes`, `webhooksRoutes` | Razorpay order creation, signature verification, webhook ingestion |
| `/invoices` | `invoicesRoutes` | Customer GST invoice PDF download |
| `/notifications` & `/jyoti` | `notificationsRoutes`, `jyotiRoutes` | In-app notification inbox & Jyoti AI chat |
| `/banners`, `/blogs`, `/faqs`, `/testimonial`, `/media`, `/inquiry`, `/seo`, `/settings` | `contentRoutes` | Public CMS & site settings endpoints |
| `/utils/exchange-rates` | Inline route | Public currency exchange rates |

## Admin Routes (`/api/v1/admin/*`)

All `/api/v1/admin/*` routes (except `POST /admin/auth/login`) require a valid staff JWT (`astro_admin_access` cookie or Bearer token), `SUPER_ADMIN | ADMIN | SUPPORT` role, and per-route `checkPermission('module:action')`:

- **Auth & RBAC**: `/admin/auth/login`, `/admin/auth/logout`, `/admin/auth/me`, `/admin/roles/*`, `/admin/staff/*`
- **Operations**: `/admin/bookings/*` (including `PATCH /admin/bookings/:id/reschedule`), `/admin/consultation-types/*`, `/admin/availability/*`, `/admin/customers/*`, `/admin/shop-orders/*`, `/admin/report-catalogue/*`, `/admin/payments/orders/:id/refund`
- **Finance & Analytics**: `/admin/transactions`, `/admin/gst-report`, `/admin/invoices/*`, `/admin/dashboard/business`
- **CMS & Uploads**: `/admin/banners`, `/admin/blogs`, `/admin/faqs`, `/admin/testimonial`, `/admin/media`, `/admin/inquiry`, `/admin/seo`, `/admin/settings`, `/admin/uploads`
