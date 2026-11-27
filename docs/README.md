# Astro Sushil Platform Documentation

Welcome to the authoritative documentation for the **Astro Sushil** monorepo (`apps/`, `packages/`, `infrastructure/`).

## Core Platform Documentation

| Document | Description |
| --- | --- |
| [architecture.md](./architecture.md) | Monorepo structure, modular monolith backend, worker processes, database schema overview, and data flows |
| [tech-stack.md](./tech-stack.md) | Exact frameworks, languages, databases, and libraries across API, Website, Admin, Mobile, and Engines |
| [api-spec.md](./api-spec.md) | Complete `/api/v1` REST API reference, route prefixes, error envelope, and rate limiting |
| [authentication.md](./authentication.md) | Customer OTP auth, Admin RBAC auth, isolated browser session cookies (`astro_access` vs `astro_admin_access`), CSRF, and JWT |
| [backend-hardening.md](./backend-hardening.md) | Security controls, log redaction, request IDs, RBAC enforcement, and production hardening |
| [design-system.md](./design-system.md) | Complete UI/UX design tokens, color palettes, typography (`Philosopher` + `Outfit` + `Inter`), and theming across Mobile, Website, and Admin |
| [notifications.md](./notifications.md) | Messaging outbox, SMSLane (SMS), WhatChimp (WhatsApp), SMTP (Email), FCM Push, and delayed report release (`REPORT_SEND_DELAY_HOURS`) |
| [deployment.md](./deployment.md) | Production VM deployment, PM2 (`ecosystem.config.cjs`), Nginx, PostgreSQL, Redis/S3, and environment configuration |

## Engines & Report System

| Document | Description |
| --- | --- |
| [astrology-spec.md](./astrology-spec.md) | Deterministic Vedic astrology, Lahiri ayanamsa, ephemeris, dashas, vargas, and matchmaking |
| [gupta-nadi-spec.md](./gupta-nadi-spec.md) | Brihaspati Nandi Nadi (BNN) rule evaluation specification |
| [report-spec.md](./report-spec.md) | Sellable report types, generation pipeline, LaTeX/PDF rendering, and delivery rules |
| [report-system/PLATFORM.md](./report-system/PLATFORM.md) | Universal report platform architecture (`packages/report-engine`) |
| [report-assets/README.md](./report-assets/README.md) | Report cover and illustration set v2: what each file is, source quality, and the redesign brief |
| [report-storage-architecture.md](./report-storage-architecture.md) | S3 / local storage keys, signed downloads, and retention |
| [jyoti.md](./jyoti.md) | Jyoti AI assistant (`Calculations -> Deterministic Prediction -> LLM Explanation`) |

## Website Integration & Testing

| Document | Description |
| --- | --- |
| [integration/website-integration-plan.md](./integration/website-integration-plan.md) | Website & Admin parity integration plan and module specs (`docs/integration/modules/*.md`) |
| [testing/ci-and-test-strategy.md](./testing/ci-and-test-strategy.md) | Unit, integration, widget, and regression test strategy |
