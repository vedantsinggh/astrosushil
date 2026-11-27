# System Architecture

Astro Sushil is a **modular monolith** TypeScript/Dart monorepo designed around deterministic Vedic astrological calculations, strict client-channel isolation, and auditable commerce & fulfillment.

## 1. Repository Layout

```text
astrosushil/
├── apps/
│   ├── api/            # Fastify REST API + Background Worker (Prisma + PostgreSQL)
│   ├── website/        # React + Vite + Tailwind CSS v4 customer web app
│   ├── admin/          # Next.js (App Router) internal staff & operations portal
│   ├── mobile/         # Flutter (iOS & Android) mobile application
│   └── desktop/        # Desktop application + astrology engine sidecar
├── packages/
│   ├── astrology-engine/   # 100% deterministic ephemeris, charts, dashas, panchang, muhurta, lal kitab, kp, jaimini
│   ├── gupta-nadi-engine/  # Brihaspati Nandi Nadi (BNN) rule evaluation
│   ├── prediction-engine/  # Rule-based evidence compiler & LLM explanation providers (Gemini/OpenRouter/Groq)
│   ├── report-engine/      # Universal PDF report platform (LaTeX/PDF) & GST invoice PDF generator
│   └── shared/             # Shared TypeScript types, DTOs, and utilities
├── infrastructure/
│   └── deployment/vm/      # PM2 ecosystem, setup, deploy, and env templates
└── docs/                   # Authoritative platform documentation
```

## 2. Core Architectural Principles

1. **Modular Monolith**: All backend domain logic lives in `apps/api/src/modules/*` and internal `packages/*`. Clients (`apps/website`, `apps/mobile`, `apps/admin`) never connect directly to PostgreSQL, Redis, or external astrology APIs.
2. **100% Deterministic Calculations**: Planetary longitudes, divisional charts (D1–D60), Vimshottari/Yogini/Chara dashas, Ashtakavarga, and matchmaking are computed locally and deterministically from `(date, time, lat, lon, ayanamsa)`.
3. **LLM Execution Boundary**: LLMs (`prediction-engine` / `jyoti` / `report-engine`) are strictly used as **natural-language explanation and formatting engines** on top of deterministic evidence snapshots (`Calculations -> Deterministic Prediction -> LLM Formatting`).
4. **PostgreSQL + Prisma**: Single source of truth across 50+ models including `User`, `BirthProfile`, `Order`, `OrderItem`, `PaymentTransaction`, `Invoice`, `InvoiceCounter`, `Report`, `ConsultationType`, `ConsultationBooking`, `AppointmentSlot`, `Product`, `ShopOrder`, `Course`, `OutboundMessage`, `OtpSendLog`, `AdminRole`, and `AuditLog`.

## 3. Runtime Processes (`apps/api`)

- **API Server (`apps/api/src/index.ts`)**: Fastify HTTP server serving `/api/v1/*` for Website, Mobile (iOS/Android), Admin Portal, and Razorpay/WhatsApp webhooks.
- **Background Worker (`apps/api/src/worker.ts`)**:
  - Claims and executes queued PDF report jobs via `postgresQueueService` + `careerReportWorker` (`FOR UPDATE SKIP LOCKED` + lease fencing).
  - Runs `messagingScheduler`: outbox dispatch (`OutboundMessage`), `ReportReleaseSweep` (delayed report delivery after `REPORT_SEND_DELAY_HOURS`), `consultationReminderSweep` (daily IST reminders), and OTP send-log cleanup.
  - Runs `rashiBhavishyaScheduler` (daily 12-sign horoscopes) and `invoiceRecoveryScheduler`.

## 4. Client Isolation & Security Boundaries

- **Admin vs. Customer Session Isolation**: Admin browser sessions use `astro_admin_access` / `astro_admin_refresh` cookies (scoped by `/api/v1/admin/*` or `X-Auth-Scope: admin`), while Website customer sessions use `astro_access` / `astro_refresh`. Logging into Admin never logs the user into the Website.
- **No Client Consultation Rescheduling**: `POST /api/v1/consultations/bookings/:id/reschedule` rejects non-admin callers with `403 Forbidden`; only staff can reschedule via Admin (`PATCH /api/v1/admin/bookings/:id/reschedule`).
- **Mandatory RBAC & Audit Logging**: Every admin route enforces `checkPermission('module:action')` and logs state changes via `adminService.logAction`.
