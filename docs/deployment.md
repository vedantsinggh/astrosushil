# Deployment & Production Operations

Deployment scripts and process configs live in `infrastructure/deployment/vm/`:
- `setup.sh` — Initial VM provisioning (Node.js, PostgreSQL, Nginx, LaTeX/TeX Live for PDF reports, PM2)
- `deploy.sh` — Pull, install, Prisma migrate, build, and zero-downtime PM2 reload
- `ecosystem.config.cjs` — PM2 process definitions for API server and background worker
- `.env.vm.example` — Complete list of required environment variable names

## 1. Required Production Processes

1. **API Server** (`apps/api/dist/index.js`): Serves `/api/v1/*`.
2. **Background Worker** (`apps/api/dist/worker.js`): **Mandatory** for PDF report generation, `ReportReleaseSweep`, `OutboxService` (Email/WhatsApp/SMS delivery), `consultationReminderSweep`, `rashiBhavishyaScheduler`, and `invoiceRecoveryScheduler`.
3. **Website** (`apps/website` built with `vite build`) & **Admin Portal** (`apps/admin` built with `next build`).

## 2. Critical Production Checklist

- **Environment**:
  - `NODE_ENV=production` (disables `DEV_MASTER_OTP` and refuses `fake` messaging providers).
  - `SMS_PROVIDER=smslane` (or `auto`), `WHATSAPP_PROVIDER=whatchimp` (or `auto`), `EMAIL_PROVIDER=smtp` (or `auto`).
  - `AUTH_COOKIE_SECURE=true`, `CORS_ORIGIN` set to exact Website + Admin origins.
- **Database**:
  - Run `npx prisma migrate deploy` (never `prisma/seed.ts` in production).
  - Initialize `InvoiceCounter` after data migration.
- **Reverse Proxy (Nginx)**:
  - Increase `proxy_read_timeout` / `proxy_send_timeout` on `/api/v1/admin/invoices/*` so large invoice ZIP exports are not cut off.
