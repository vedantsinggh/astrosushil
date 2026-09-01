# Astro Sushil Admin Panel Technical Guide

*Document Version*: 1.0.0  
*Status*: FEATURE COMPLETE  
*Last Updated*: 2026-09-02  

---

## 1. Overview & Architecture

The Astro Sushil Admin Panel provides centralized operations, user profile inspection, report pipeline diagnostics, subscription reconciliation, product analytics, and audit management. It is built as part of the modular monorepo architecture.

- **Frontend App**: `apps/admin` (Next.js 14, Tailwind CSS / Vanilla CSS, React App Router)
- **Backend API**: `apps/api/src/modules/admin` (Fastify, Prisma ORM, PostgreSQL)
- **Authentication**: JWT Bearer tokens with strict server-side role validation.
- **Audit Logging**: Every state-changing mutation automatically records an entry in the `AuditLog` table.

---

## 2. Core Functional Modules

### 2.1 Dashboard & Operational Oversight
- **KPI Metrics**: Total Users, Active Subscriptions, Monthly Recurring Revenue (MRR), Total Reports, Stuck/Failed Reports.
- **Actionable Callouts**: Direct links to pending or failed report jobs requiring operational investigation.

### 2.2 User Directory & 360° Profile Management
- **Search & Pagination**: Server-side pagination with email, name, and status filters.
- **360° Detail View**: Consolidates user credentials, account status, birth profiles, generated reports, active subscriptions, entitlements, active refresh sessions, and audit history.
- **Audited Actions**:
  - Account Suspension / Activation (with required justification reason).
  - Force Revoke Sessions (invalidates all active JWT refresh tokens).
  - Password Reset Trigger.

### 2.3 Birth Profiles Inspection
- Inspect birth metadata (date of birth, time of birth, birth place, geographic coordinates, timezone).
- View calculated Kundli chart summaries without altering raw birth parameters.

### 2.4 Career Report Operations & 7-Stage Pipeline Diagnostics
- **Status Oversight**: Monitor report lifecycle (`QUEUED`, `CALCULATING`, `ANALYZING`, `RENDERING`, `COMPILING`, `UPLOADING`, `COMPLETED`, `FAILED`).
- **7-Stage Diagnostics**: Traces step-by-step progress, duration, page count, and failure error messages.
- **Force Regeneration**: Traces new generation request with `forceRegenerate: true`, bypassing stale server caches and logging audit events.

### 2.5 Subscriptions, Plans & Payments
- **Product Plans Catalog**: Displays active product pricing plans and feature allocations.
- **Subscription Management**: Search subscriptions, view expiration dates, billing provider IDs, and payment statuses.
- **Payment Reconciliation**: Read-only log of payment transactions with status badges. Credit card numbers, CVVs, and sensitive payment secrets are strictly redacted.

### 2.6 Entitlement Oversight & Manual Grants
- Distinguishes `PAYMENT_GENERATED` entitlements from `ADMIN_GRANTED` support overrides.
- Manual grant/revoke capabilities require confirmation and log dedicated audit events (`ENTITLEMENT_GRANTED`, `ENTITLEMENT_REVOKED`).

### 2.7 Jyoti AI Assistant Diagnostics
- Monitors total Jyoti chat turns, unique active users, average response time, and Gemini API error rates.

### 2.8 Product Analytics & CSV Export
- Multi-domain analytics dashboards: Overview, User Growth, Report Generation Pipeline, Financial Revenue, System Error Trends.
- Filterable date ranges with percentage growth comparisons.
- CSV export endpoint for offline reporting (`GET /api/v1/admin/analytics/export`).

### 2.9 Audit Trail
- Filterable log of all administrative actions by admin ID, target resource, action type, IP address, and date range.
- Read-only table inaccessible to restricted roles.

---

## 3. Security Controls & Guidelines

1. **Server-Side Authorization**: Every API route enforces `onRequest` authentication and `preHandler` permission checks (`checkPermission('permission:name')`). Frontend UI visibility controls are purely additive.
2. **Data Isolation**: Multi-tenant data structures ensure admins can only query data within authorized domain boundaries.
3. **No Destructive Hard Deletes**: The Admin Panel does not expose hard deletion endpoints for Users, Birth Profiles, or Reports. Operations rely on soft state transitions (`SUSPENDED`, `CANCELLED`).
4. **Secret Protection**: Passwords, OTPs, JWT secrets, Razorpay API keys, and Gemini keys are never logged or returned in API responses.

---

## 4. Operational Deployment Requirements

- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string.
  - `REDIS_URL`: Redis connection string for BullMQ workers and token revocation.
  - `JWT_SECRET`: Secret key for signing admin authentication tokens.
  - `NODE_ENV`: Set to `production` in live environments (disables master OTP and dev fallbacks).
- **Process Manager**: Managed via PM2, Docker container, or Systemd service under Fastify backend.
