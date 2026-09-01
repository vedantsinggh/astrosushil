# Astro Sushil - Admin Analytics & Product Intelligence (Phase 7)

This document describes the data-driven product analytics, metrics aggregation pipeline, authorization model, and CSV export capabilities implemented in the **Astro Sushil Admin Panel**.

---

## 1. Overview & Architecture

- **Path**: Admin Panel `/admin/analytics`
- **Backend Service**: `AnalyticsService` (`apps/api/src/modules/admin/analytics.service.ts`)
- **API Prefix**: `/api/v1/admin/analytics`
- **Data Source**: 100% deterministic queries against existing PostgreSQL database tables (`users`, `birth_profiles`, `reports`, `orders`, `audit_logs`).
- **No Fabricated Data Policy**: All numbers, KPI percentages, and trend timelines reflect real database entities.

---

## 2. Available Metric Modules

### A. Overview KPIs
- **Total Users**: Total registered customer accounts.
- **New Users**: Registrations in selected period vs. previous period (% change).
- **Birth Profiles Created**: Astrological birth profiles created in period vs. previous period.
- **Reports Completed**: Career and astrological reports successfully generated.
- **Reports Failed**: Report compilation or LLM synthesis failures.
- **Paid Orders & Revenue**: Total verified payments and aggregate amount (INR).

### B. User Analytics & Growth
- Total users, new registrations, verified vs. unverified email accounts.
- Users with birth profiles and paid customer counts.
- **Daily Registration Trend**: Grouped by YYYY-MM-DD date.
- **Instrumentation Notice**: Retention metrics (1-day, 7-day, 30-day) require event-level daily active user (DAU) ping telemetry.

### C. Report Pipeline & Operations
- Reports requested, completed, failed, and in-progress count.
- Success rate (% completed) and failure rate (% failed).
- Average generation speed (seconds elapsed from creation to completion).
- Breakdown by `ReportType` (`CAREER`, `MARRIAGE_COMPATIBILITY`, `GUPTA_NADI_DOSSIER`, etc.).
- **Pipeline Failures Diagnostic Table**: Top 10 recent report failures with user email, report type, error code, error message, and direct link to `/reports/[id]` debugging view.

### D. Jyoti AI Assistant Analytics
- **Local Storage Notice**: Jyoti conversational history is stored locally on mobile client devices (`SharedPreferences`).
- Backend metrics reflect `0` with explicit explanatory status card to prevent fabricated usage numbers.

### E. Revenue & Payment Performance
- Total revenue in Rupees (`amount / 100` from `Order` table).
- Successful (`PAID`), failed (`FAILED`), pending (`PENDING`), and refunded (`REFUNDED`) payments.
- Revenue breakdown by product report type.
- Daily revenue timeline.

### F. System Health & Top Errors
- Report generation failure count and payment failure count.
- Top error codes grouped with occurrences and last occurrence timestamp.

---

## 3. Date Filtering & Timezone Rules

Supported date period parameters:
- `today`: Current day (00:00:00 to 23:59:59 IST / local server time).
- `7d`: Past 7 days (default).
- `30d`: Past 30 days.
- `90d`: Past 90 days.
- `12m`: Past 12 months.
- `custom`: Custom ISO date range (`startDate` and `endDate`).

### Previous-Period Percentage Calculation
- Compares current period metrics against the prior period of equal duration.
- Displays `+X%` or `-X%` when prior period data exists.
- Displays `"No previous-period data"` when previous period count is zero to avoid division-by-zero anomalies.

---

## 4. Analytics Caching & Performance

- **Caching Layer**: In-memory TTL cache (`60 seconds`) prevents expensive database aggregation queries on repeated dashboard refreshes.
- **Optimized Aggregations**: Uses Prisma aggregate (`_sum`, `_count`), grouped queries (`groupBy`), and indexed timestamp filters (`createdAt`).

---

## 5. Permissions & RBAC Matrix

| Permission | Role Allowed | Endpoints |
| :--- | :--- | :--- |
| `analytics:read` | `SUPER_ADMIN`, `ADMIN`, `SUPPORT` | `GET /analytics/overview`<br>`GET /analytics/users`<br>`GET /analytics/reports`<br>`GET /analytics/jyoti`<br>`GET /analytics/revenue`<br>`GET /analytics/system` |
| `analytics:export` | `SUPER_ADMIN`, `ADMIN` | `GET /analytics/export?type=users\|reports\|revenue` |

---

## 6. CSV Data Export

- Admin-authorized endpoints generate server-side CSV attachments:
  - `GET /api/v1/admin/analytics/export?type=users&period=7d`
  - `GET /api/v1/admin/analytics/export?type=reports&period=7d`
  - `GET /api/v1/admin/analytics/export?type=revenue&period=7d`
- Bounded to maximum 5,000 records per export request to safeguard server memory.
