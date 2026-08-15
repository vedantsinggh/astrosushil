# Architecture Decision Records (ADR) - Astro Sushil

This document records the key architectural and design decisions made for the **Astro Sushil** platform.

---

## ADR-001: Monorepo Repository Structure

- **Status**: Accepted
- **Decision**: Manage all applications (`apps/`), shared business logic packages (`packages/`), worker processes (`workers/`), infrastructure scripts (`infrastructure/`), and specifications (`docs/`) in a single monorepo (`astro-platform`).
- **Reason**: Simplifies code sharing, TypeScript interface sharing, refactoring across backend/shared packages, and dependency tracking across the two-developer team without managing multiple repositories.

---

## ADR-002: Modular Monolith Architecture

- **Status**: Accepted
- **Decision**: Build the backend application as a unified NestJS modular monolith (`apps/api`) rather than microservices.
- **Reason**: Microservices introduce operational overhead, RPC latency, deployment complexity, and distributed tracing costs unnecessary for the team size and initial scale. Modular packages maintain clear domain boundaries for future service splitting if ever required.

---

## ADR-003: NestJS Backend Framework

- **Status**: Accepted
- **Decision**: Select Node.js with NestJS framework and TypeScript for backend development.
- **Reason**: NestJS provides a mature, enterprise-grade architecture out of the box (Dependency Injection, Modules, Guards, Interceptors) that pairs naturally with shared TypeScript packages across the monorepo.

---

## ADR-004: Flutter Cross-Platform Mobile Application

- **Status**: Accepted
- **Decision**: Select Flutter (Dart) for developing the mobile application for iOS and Android.
- **Reason**: Single codebase for mobile apps, high rendering performance for custom Kundli chart painting, and rich widget ecosystem.

---

## ADR-005: Next.js Web Admin Panel

- **Status**: Accepted
- **Decision**: Select Next.js (React / TypeScript) for building the administration dashboard.
- **Reason**: Fast server-side rendering, component-driven UI development, and seamless integration with shared backend DTO contracts.

---

## ADR-006: PostgreSQL Relational Database

- **Status**: Accepted
- **Decision**: Select PostgreSQL as the primary relational database with Prisma ORM.
- **Reason**: High reliability, ACID compliance, structured JSONB support for variable chart outputs, and strong type-safe ORM integration.

---

## ADR-007: Redis & BullMQ for Asynchronous Workflows

- **Status**: Accepted
- **Decision**: Use Redis with BullMQ queue framework for offloading heavy tasks (PDF generation, LLM prompt dispatches, notification delivery) to background worker processes (`workers/`).
- **Reason**: Prevents blocking the main API HTTP request loop during computationally intensive or external network operations, guaranteeing responsiveness under load.

---

## ADR-008: WhatsApp as External Integration Channel

- **Status**: Accepted
- **Decision**: Treat Meta WhatsApp Business Platform strictly as an external messaging integration channel, NOT a separate frontend application.
- **Reason**: WhatsApp interacts purely via backend webhooks and outgoing REST messages without requiring separate client-side application logic.

---

## ADR-009: LLM as Natural Language Explanation Layer Only

- **Status**: Accepted
- **Decision**: Strictly constrain LLMs (OpenAI / Anthropic / Gemini) to formatting and translating deterministic prediction trees into natural language prose. The LLM must NEVER perform astrological calculations or independently infer predictions.
- **Reason**: Eliminates AI hallucinations, guarantees 100% calculation accuracy, and ensures predictions remain deterministic and auditable against verified client rules.

---

## ADR-010: Zero Paid Third-Party Astrology API Dependencies

- **Status**: Accepted
- **Decision**: Never rely on paid per-request third-party astrology APIs. Implement internal calculation packages (`packages/astrology-engine`) using open-source or commercially licensed calculation libraries running locally on owned infrastructure.
- **Reason**: Prevents unsustainable per-request operational costs as user traffic scales, ensuring high profit margins and complete data ownership.
