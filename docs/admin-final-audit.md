# Admin Panel Final Audit & Route Mapping

*Document Version*: 1.0.0  
*Last Updated*: 2026-09-02  
*Author*: Astro Sushil Engineering Team  

---

## 1. Overview & Monorepo Structure

The Astro Sushil Admin Panel (`apps/admin`) is a Next.js application designed strictly for administrative operational oversight, support diagnostic troubleshooting, subscription management, payment reconciliation, analytics, and audited system actions.

- **Frontend App**: `apps/admin` (Next.js 14+ / React App Router)
- **Backend Module**: `apps/api/src/modules/admin` (Fastify + Prisma ORM)
- **Authentication**: JWT Bearer tokens with strict RBAC enforcement (`SUPER_ADMIN`, `ADMIN`, `SUPPORT`)
- **Audit Compliance**: All state mutations generate immutable records in the `AuditLog` database table.

---

## 2. Complete Admin Route & API Mapping Table

| Admin Route (Frontend) | Page Component | Purpose / Description | Backend Endpoint | HTTP Method | Required Permission | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `app/login/page.tsx` | Secure Admin Authentication Login | `/api/v1/admin/auth/login` | `POST` | Public (Unauthenticated) | VERIFIED |
| `/dashboard` | `app/dashboard/page.tsx` | Operational KPIs & Action Items | `/api/v1/admin/dashboard` | `GET` | `dashboard:read` | VERIFIED |
| `/analytics` | `app/analytics/page.tsx` | Product Intelligence & Growth Metrics | `/api/v1/admin/analytics/overview` | `GET` | `analytics:read` | VERIFIED |
| `/analytics` (Users tab) | `app/analytics/page.tsx` | User Growth & Conversion Funnel | `/api/v1/admin/analytics/users` | `GET` | `analytics:read` | VERIFIED |
| `/analytics` (Reports tab) | `app/analytics/page.tsx` | Report Generation Pipeline Health | `/api/v1/admin/analytics/reports` | `GET` | `analytics:read` | VERIFIED |
| `/analytics` (Revenue tab) | `app/analytics/page.tsx` | Financial Reconciliation & Revenue | `/api/v1/admin/analytics/revenue` | `GET` | `analytics:read` | VERIFIED |
| `/analytics` (System tab) | `app/analytics/page.tsx` | Backend Health & System Exceptions | `/api/v1/admin/analytics/system` | `GET` | `analytics:read` | VERIFIED |
| `/analytics/export` | `app/analytics/page.tsx` | CSV Dataset Exporter | `/api/v1/admin/analytics/export` | `GET` | `analytics:export` | VERIFIED |
| `/users` | `app/users/page.tsx` | User Directory & Status Management | `/api/v1/admin/users` | `GET` | `users:read` | VERIFIED |
| `/users/[id]` | `app/users/[id]/page.tsx` | 360° User Detail Operational View | `/api/v1/admin/users/:id` | `GET` | `users:read` | VERIFIED |
| `/users/[id]` (Suspend) | `app/users/[id]/page.tsx` | Suspend User Account | `/api/v1/admin/users/:id/suspend` | `POST` | `users:suspend` | VERIFIED |
| `/users/[id]` (Activate) | `app/users/[id]/page.tsx` | Activate User Account | `/api/v1/admin/users/:id/activate` | `POST` | `users:activate` | VERIFIED |
| `/users/[id]` (Password) | `app/users/[id]/page.tsx` | Secure Password Reset Link | `/api/v1/admin/users/:id/password-reset` | `POST` | `users:password_reset` | VERIFIED |
| `/users/[id]` (Revoke Sessions)| `app/users/[id]/page.tsx` | Revoke All Active Refresh Sessions | `/api/v1/admin/users/:id/sessions/revoke` | `POST` | `sessions:revoke` | VERIFIED |
| `/users/[id]` (Grant Entitlement)| `app/users/[id]/page.tsx` | Grant Manual Support Entitlement | `/api/v1/admin/users/:id/entitlements` | `POST` | `entitlements:grant` | VERIFIED |
| `/users/[id]` (Revoke Entitlement)| `app/users/[id]/page.tsx` | Revoke Manual Entitlement | `/api/v1/admin/users/:id/entitlements/:feature` | `DELETE` | `entitlements:revoke` | VERIFIED |
| `/birth-profiles` | `app/birth-profiles/page.tsx` | Birth Profiles Directory | `/api/v1/admin/birth-profiles` | `GET` | `birth_profiles:read` | VERIFIED |
| `/birth-profiles/[id]` | `app/birth-profiles/[id]/page.tsx` | Birth Profile Astrological Details | `/api/v1/admin/birth-profiles/:id` | `GET` | `birth_profiles:read` | VERIFIED |
| `/reports` | `app/reports/page.tsx` | Career Reports Directory | `/api/v1/admin/reports` | `GET` | `reports:read` | VERIFIED |
| `/reports/[id]` | `app/reports/[id]/page.tsx` | 7-Stage Pipeline Diagnostics | `/api/v1/admin/reports/:id` | `GET` | `reports:read` | VERIFIED |
| `/reports/[id]` (Regenerate) | `app/reports/[id]/page.tsx` | Force Report Regeneration Job | `/api/v1/admin/reports/:id/regenerate` | `POST` | `reports:regenerate` | VERIFIED |
| `/reports/cache/clear` | `app/reports/page.tsx` | Clear Server-side PDF Cache | `/api/v1/admin/reports/cache/clear` | `POST` | `reports:clear_cache` | VERIFIED |
| `/subscriptions` | `app/subscriptions/page.tsx` | Subscription Directory | `/api/v1/admin/subscriptions` | `GET` | `subscriptions:read` | VERIFIED |
| `/subscriptions/[id]` | `app/subscriptions/[id]/page.tsx` | Subscription & Billing Details | `/api/v1/admin/subscriptions/:id` | `GET` | `subscriptions:read` | VERIFIED |
| `/payments` | `app/payments/page.tsx` | Payment Transactions Log | `/api/v1/admin/payments` | `GET` | `payments:read` | VERIFIED |
| `/payments/[id]` | `app/payments/[id]/page.tsx` | Transaction Audit & Webhook Audit | `/api/v1/admin/payments/:id` | `GET` | `payments:read` | VERIFIED |
| `/notifications` | `app/notifications/page.tsx` | Notification System Logs | `/api/v1/admin/notifications` | `GET` | `notifications:read` | VERIFIED |
| `/notifications` (Test Send) | `app/notifications/page.tsx` | Send Dev/Admin Test Push | `/api/v1/admin/notifications/test-send` | `POST` | `notifications:test` | VERIFIED |
| `/astrology-diagnostics` | `app/astrology-diagnostics/page.tsx` | Astrology Intelligence Inspector | `/api/v1/astrology/predictions` | `POST` | `birth_profiles:read` | VERIFIED |
| `/plans` | `app/plans/page.tsx` | Product Plans Catalog | `/api/v1/admin/plans` | `GET` | `plans:read` | VERIFIED |
| `/admin-users` | `app/admin-users/page.tsx` | Admin Staff Directory | `/api/v1/admin/admin-users` | `GET` | `users:read` | VERIFIED |
| `/admin-users` (Create Staff) | `app/admin-users/page.tsx` | Provision New Staff User | `/api/v1/admin/admin-users` | `POST` | `admin_users:manage` | VERIFIED |
| `/admin-users/[id]` (Role) | `app/admin-users/page.tsx` | Update Staff Role | `/api/v1/admin/admin-users/:id/role` | `PATCH` | `admin_users:manage` | VERIFIED |
| `/jyoti` | `app/jyoti/page.tsx` | Jyoti AI Assistant Diagnostics | `/api/v1/admin/jyoti` | `GET` | `jyoti:read` | VERIFIED |
| `/system` | `app/system/page.tsx` | Infrastructure Health & Redis Check | `/api/v1/admin/system/health` | `GET` | `system:read` | VERIFIED |
| `/audit-log` | `app/audit-log/page.tsx` | Administrative Audit Trail | `/api/v1/admin/audit-log` | `GET` | `audit_log:read` | VERIFIED |

---

## 3. Navigation Audit & UX Verification

1. **Sidebar Component** (`apps/admin/components/Sidebar.tsx`):
   - Every sidebar item maps to an active, working Next.js App Router page.
   - Items are rendered dynamically based on `hasPermission(permission)` from the authenticated user's JWT claim.
   - Dead or unlinked placeholder items have been purged.

2. **Standard State Patterns Across All Admin Pages**:
   - **Loading State**: Displays skeleton shimmer cards/spinners while fetching data.
   - **Empty State**: Displays contextual empty state messaging (e.g., "No users match your query", "No failed reports in selected period") when datasets return 0 rows.
   - **Error State**: Displays user-friendly error banners with error code and retry buttons. Raw backend stack traces and database queries are stripped.
   - **Confirmation Modals**: Every state-changing action (Suspend, Activate, Revoke Sessions, Password Reset, Grant Entitlement, Revoke Entitlement, Regenerate Report) requires explicit modal confirmation.

---

## 4. RBAC Server-Side Enforcement Matrix

| Capability | SUPER_ADMIN | ADMIN | SUPPORT |
| :--- | :---: | :---: | :---: |
| `dashboard:read` | YES | YES | YES |
| `users:read` | YES | YES | YES |
| `users:suspend` | YES | YES | NO |
| `users:activate` | YES | YES | NO |
| `users:update_role` | YES | NO | NO |
| `users:password_reset` | YES | YES | NO |
| `birth_profiles:read` | YES | YES | YES |
| `reports:read` | YES | YES | YES |
| `reports:regenerate` | YES | YES | NO |
| `reports:clear_cache` | YES | NO | NO |
| `subscriptions:read` | YES | YES | YES |
| `plans:read` | YES | YES | YES |
| `payments:read` | YES | YES | YES |
| `entitlements:read` | YES | YES | YES |
| `entitlements:grant` | YES | YES | NO |
| `entitlements:revoke` | YES | YES | NO |
| `sessions:revoke` | YES | YES | NO |
| `admin_users:manage` | YES | NO | NO |
| `jyoti:read` | YES | YES | YES |
| `system:read` | YES | YES | NO |
| `audit_log:read` | YES | YES | NO |
| `analytics:read` | YES | YES | YES |
| `analytics:export` | YES | YES | NO |
| `notifications:read` | YES | YES | YES |
| `notifications:test` | YES | YES | NO |
