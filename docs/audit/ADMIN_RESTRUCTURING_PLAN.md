# Admin Panel Restructuring Plan (`apps/admin`)

**Audit Date:** 2026-11-25
**Baseline Commit:** `f107143` (`staging`)

---

## Current State Summary
- `apps/admin` builds cleanly (`tsc --noEmit` & `next build` pass, 56 App Router routes).
- `Sidebar.tsx` renders **38 flat links** with no grouping, collapsible sections, or mobile drawer.
- Duplicate/legacy screens coexist: `/admin-users` duplicates `/staff`; `/users` and `/customers` are separate top-level items; `/shop-orders/reports` is unlinked.
- Several backend capabilities exist in `apps/api` but are not wired in `apps/admin`:
  - `POST /admin/bookings/:id/payment-conflict/assign-slot` and `/refund` (`/transactions/payment-conflicts` still shows stale warning text)
  - `POST /admin/payments/orders/:id/refund` (no refund UI on `/payments/[id]` or `/shop-orders/[orderId]`)
  - `GET /admin/transactions/:id` (no `/transactions/[id]` detail page)
  - `auth-context.tsx` drops `isSuperAdmin` and `staffRole` returned by `/admin/auth/login`
  - `/invoices` sidebar link requires `gst_report:read`, locking out staff with `transactions:read`

---

## Target 10-Section Information Architecture

| # | Section | Routes / Screens | Backend Support | Action Needed |
|---|---|---|---|---|
| 1 | **Overview** | Dashboard (`/dashboard`), Analytics (`/analytics`) | Full | Wire real environment badge in `Header.tsx` |
| 2 | **Customers** | Customer Directory (`/customers`), App Users 360° (`/users`, `/users/[id]`), Birth Profiles (`/birth-profiles`, `/birth-profiles/[id]`) | Full | Group together; replace native `alert()` in `/users/[id]` with inline modal error banner |
| 3 | **Astrology & Reports** | Reports & Pipeline (`/reports`, `/reports/[id]`), Report Catalogue (`/report-catalogue`), Astrology Diagnostics (`/astrology-diagnostics`), Jyoti AI (`/jyoti`) | Partial (no `/admin/report-orders`; `GET /admin/reports` lacks `language`/`order`) | Add `language`/`order` to `GET /admin/reports`; add `RequirePermission` + profile picker on `/astrology-diagnostics`; replace `window.confirm` on `/reports` |
| 4 | **Consultations** | Bookings (`/bookings/*`), Live Sessions (`/live-sessions/*`), Consultation Types (`/consultation-types/*`), Availability (`/availability`) | Full | Replace `confirm()`/`alert()` in `ConsultationWorkspace.tsx` with `ConfirmDialog`/inline errors |
| 5 | **Commerce** | Shop Orders (`/shop-orders/*`, `/shop-orders/reports`), Shop Products (`/shop-products/*`), Categories (`/categories`), Course Links (`/course-links/*`), Coupons (`/coupons`), Subscriptions & Plans (`/subscriptions/*`, `/plans`) | Full | Add `/shop-orders/reports` to Sidebar; wire refund action on `/shop-orders/[orderId]` |
| 6 | **Finance** | Transactions (`/transactions`, `/transactions/[id]`), Unapplied Payments (`/transactions/unapplied-payments`), Payment Conflicts (`/transactions/payment-conflicts`), Gateway Payments (`/payments`, `/payments/[id]`), GST Report (`/gst-report`), Invoices (`/invoices`, `/invoices/orders/[orderId]`) | Full | Build `/transactions/[id]`; wire `assign-slot` & `refund` on `/transactions/payment-conflicts`; wire refund on `/payments/[id]`; fix `/invoices` sidebar permission (`transactions:read \|\| gst_report:read`) |
| 7 | **Content Management** | Blogs (`/blogs/*`), Banners (`/banners`), Media (`/media`), FAQs (`/faqs`), Testimonials (`/testimonials`), SEO (`/seo`) | Full | Group in Sidebar |
| 8 | **Communication** | Contact Inquiries (`/inquiries/*`), Push Notifications (`/notifications`) | Partial (no SMS/WhatsApp/Email delivery logs in backend) | Document SMS/WhatsApp/Email logs as backend gap; keep Push & Inquiries |
| 9 | **Staff & Security** | Staff (`/staff`), Roles & Permissions (`/roles/*`), Audit Log (`/audit-log`), My Profile (`/profile`) | Full | Remove `/admin-users` from Sidebar; update `auth-context.tsx` with `isSuperAdmin` & `staffRole` |
| 10 | **System** | Website Settings (`/settings`), Legal Pages (`/settings/legal`), System Health (`/system`) | Full | Group in Sidebar |

---

## Layout & UX Requirements
- Grouped collapsible `Sidebar.tsx` sections + responsive mobile drawer toggle in `Header.tsx`.
- Consistent `ConfirmDialog` + inline error/success banners across all older screens.
- Explicit permission gating on both Sidebar links and page components.
