# 60-Day Development Plan & Roadmap - Astro Sushil

This document defines the 60-day engineering roadmap, milestone deliverables, phase breakdowns, and developer task allocation for building the **Astro Sushil** platform.

---

## 1. Developer Role Division

The development team consists of two developers working concurrently across specialized domain areas:

### Primary Developer (Backend, Architecture & Core Engines)
- Monorepo architecture & Fastify backend framework setup.
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
| PHASE 1: Backend Foundation (Fastify, Postgres, Prisma, Auth, Profiles) [COMPLETED] |
| PHASE 2: Core Engine Development (Astrology & Gupta Nadi)                         |
| PHASE 3: Mobile & Admin UI Scaffolding                                            |
| PHASE 4: Reports, Payments & WhatsApp                                             |
| PHASE 5: Worker Queues & Notifications                                            |
| PHASE 6: QA, Testing & Deployment                                                 |
+-----------------------------------------------------------------------------------+
```

---

### Phase 1: Backend Foundation (COMPLETED)
- [x] Fastify backend application server (`apps/api`) with TypeScript.
- [x] Environment configuration with Zod validation (`src/config/index.ts`).
- [x] PostgreSQL & Prisma setup (`prisma/schema.prisma`).
- [x] User, RefreshToken, and BirthProfile data models.
- [x] Email + password authentication with bcryptjs hashing.
- [x] JWT access tokens (15m) + SHA-256 hashed refresh token session rotation (7d).
- [x] Authenticated user profile endpoints (`/api/v1/auth/me`, `/api/v1/users/me`).
- [x] Birth Profile CRUD operations (`/api/v1/birth-profiles`) with strict server-side ownership authorization.
- [x] Timezone & UTC location normalizer boundary (`src/utils/birth-details-normalizer.ts`).
- [x] Global error handling with standardized JSON response format.
- [x] OpenAPI / Swagger documentation (`/documentation`).
- [x] Comprehensive test suite with Vitest (unit & API integration tests).

---

### Phase 2: Core Engine Development
- **Primary Developer**:
  - Scaffold monorepo packages (`astrology-engine`, `gupta-nadi-engine`, `prediction-engine`, `shared`).
  - Implement planetary longitudes, Ascendant, house division, Vargas, Vimshottari Dasha, and Panchang in `astrology-engine`.
  - Build BNN rule matcher matrix, planetary trine math, and transit overlay logic in `gupta-nadi-engine`.
  - Write comprehensive unit tests against benchmark reference charts.
- **Second Developer**:
  - Flutter app UI scaffolding (Theme, Navigation, Custom Painter for Kundli chart drawing).
  - Next.js Admin portal project layout and design system.
