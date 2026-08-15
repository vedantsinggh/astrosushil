# 60-Day Development Plan & Roadmap - Astro Sushil

This document defines the 60-day engineering roadmap, milestone deliverables, phase breakdowns, and developer task allocation for building the **Astro Sushil** platform.

---

## 1. Developer Role Division

The development team consists of two developers working concurrently across specialized domain areas:

### Primary Developer (Backend, Architecture & Core Engines)
- Monorepo architecture & NestJS backend framework setup.
- `packages/astrology-engine` implementation & ephemeris integration.
- `packages/gupta-nadi-engine` core matcher logic & transit overlay math.
- PostgreSQL database schemas, migrations, and Prisma ORM configuration.
- Redis, BullMQ queue setup, worker processors, and PDF rendering pipeline.
- Payment gateway (Razorpay) & WhatsApp webhook integration.
- Code review, integration testing, and CI/CD deployment pipelines.

### Second Developer (Mobile UI, Admin UI & Feature Integration)
- Flutter mobile application UI/UX screens (Kundli views, Panchang, Birth forms).
- Next.js Admin portal UI components, tables, and management workflows.
- API integration in Flutter app & Next.js Admin using TypeScript/Dart DTOs.
- CRUD features (User profiles, birth chart history, saved profiles).
- Encoding BNN rule JSON entries under supervision of Primary Developer.
- Unit testing, widget testing, QA verification, and user documentation.

---

## 2. 60-Day Phase Roadmap

```
+-----------------------------------------------------------------------------------+
| PHASE 1: Architecture & Specs (Days 1-7)                                          |
| PHASE 2: Core Engines (Days 8-20)                                                 |
| PHASE 3: Backend APIs & Database (Days 21-35)                                      |
| PHASE 4: Mobile & Admin Applications (Days 36-48)                                 |
| PHASE 5: Reports, Payments & WhatsApp (Days 49-54)                                |
| PHASE 6: Worker Queues & Notifications (Days 55-57)                               |
| PHASE 7: QA, Testing & Deployment (Days 58-60)                                    |
+-----------------------------------------------------------------------------------+
```

---

### Phase 1: Requirements & Specification Phase (Days 1 - 7)
- [x] Establish monorepo structure blueprints and agent directives (`AGENTS.md`).
- [x] Finalize system architecture and technical specifications in `/docs`.
- [ ] Evaluate open-source astronomical ephemeris calculation libraries.
- [ ] Receive client confirmation on BNN rules, Ayanamsa, house systems, and pricing.

---

### Phase 2: Core Engine Development (Days 8 - 20)
- **Primary Developer**:
  - Scaffold monorepo packages (`astrology-engine`, `gupta-nadi-engine`, `prediction-engine`, `shared`).
  - Implement planetary longitudes, Ascendant, house division, Vargas, Vimshottari Dasha, and Panchang in `astrology-engine`.
  - Build BNN rule matcher matrix, planetary trine math, and transit overlay logic in `gupta-nadi-engine`.
  - Write comprehensive unit tests against 50 reference benchmark charts.
- **Second Developer**:
  - Begin Flutter app UI scaffolding (Theme, Navigation, Custom Painter for Kundli chart drawing).
  - Scaffold Next.js Admin portal project layout and design system.
  - Encode initial set of client-provided BNN rules into JSON schema fixtures under supervision.

---

### Phase 3: Backend APIs & Data Layer (Days 21 - 35)
- **Primary Developer**:
  - Initialize NestJS API server (`apps/api`).
  - Design PostgreSQL schema (Users, BirthProfiles, Orders, Reports, RuleConfigs) with Prisma.
  - Implement authentication module (JWT, OTP request/verification).
  - Expose REST API endpoints for birth charts, planetary tables, and dasha trees.
- **Second Developer**:
  - Implement mobile onboarding screens, phone authentication UI, and birth detail input forms.
  - Build profile management screens for saved family birth charts.
  - Integrate mobile app with backend REST endpoints.
  - Build Admin UI screens for User management and Order monitoring.

---

### Phase 4: Mobile App & Admin Panel Completion (Days 36 - 48)
- **Primary Developer**:
  - Expose Gupta Nadi prediction endpoints and daily Rashi Bhavishya APIs.
  - Optimize API query performance, caching layer with Redis, and input DTO validations.
- **Second Developer**:
  - Complete Flutter UI screens for Kundli visualization (North/South styles), Planetary tables, Nakshatra details, and Daily Horoscopes.
  - Implement Vastu guidance screens and Panchang utility views in Flutter.
  - Build Admin UI screens for Gupta Nadi rule inspection and rule priority tuning.

---

### Phase 5: Report Generation, Payments & WhatsApp (Days 49 - 54)
- **Primary Developer**:
  - Implement `packages/report-engine` and HTML/CSS PDF report templates.
  - Integrate Puppeteer headless Chrome rendering for high-resolution PDF output.
  - Integrate Razorpay backend payment order creation and signature verification webhooks.
  - Setup Meta WhatsApp Business Platform webhook receiver and PDF message dispatcher.
- **Second Developer**:
  - Build mobile app report purchase flow, pricing UI, and Razorpay checkout SDK integration.
  - Build in-app report download, PDF viewer, and share options.
  - Test WhatsApp interactive message flows and delivery dispatches.

---

### Phase 6: Async Workers, Redis Queues & Push Notifications (Days 55 - 57)
- **Primary Developer**:
  - Configure BullMQ worker processes (`workers/`) for off-thread PDF generation and LLM prompt dispatches.
  - Setup S3 / Cloud Storage upload handlers for generated PDF reports.
  - Integrate Firebase Cloud Messaging (FCM) backend service for push notifications.
- **Second Developer**:
  - Integrate FCM mobile client SDK for push notification reception.
  - Perform end-to-end user journey testing (Order -> Payment -> Queue -> Push Notification -> PDF View).

---

### Phase 7: Testing, QA, Security & Deployment (Days 58 - 60)
- **Both Developers**:
  - Execute end-to-end integration test suite and load testing.
  - Audit security: TLS setup, rate-limiting, CORS, SQL injection prevention, DTO sanitization.
  - Configure Docker production builds and CI/CD GitHub Actions deployment workflows.
  - Deploy to production cloud infrastructure and execute final launch checklist.
