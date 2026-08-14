# Architectural Decision Records (ADRs) - Astro Sushil

This document records the key architectural and technical decisions made for the **Astro Sushil** platform, along with context, rationale, and current status.

---

## ADR-001: Monorepo Repository Architecture
- **Decision**: Adopt a single monorepo structure containing all application clients (`apps/`), shared business logic packages (`packages/`), background workers (`workers/`), infrastructure code (`infrastructure/`), and technical documentation (`docs/`).
- **Reason**: Simplifies code sharing, type sharing across TypeScript packages, dependency management, and enables unified CI/CD pipelines without multi-repo synchronization overhead.
- **Status**: **ACCEPTED**

---

## ADR-002: Modular Monolith Initial Deployment Pattern
- **Decision**: Build the backend application as a unified NestJS modular monolith (`apps/api`) rather than a distributed microservices architecture.
- **Reason**: Minimizes operational complexity, network latency, and infrastructure costs for a 2-developer team during the initial 60-day bring-up phase, while preserving clean package boundaries for potential future microservice extraction.
- **Status**: **ACCEPTED**

---

## ADR-003: NestJS Framework for Backend API
- **Decision**: Use Node.js with NestJS and strict TypeScript for the primary API backend.
- **Reason**: Provides an opinionated, enterprise-ready architecture (Dependency Injection, Controllers, Services, Modules, DTO validation with `class-validator`) that enforces clean code standards.
- **Status**: **ACCEPTED**

---

## ADR-004: Flutter for Mobile Application
- **Decision**: Use Flutter (Dart) for building cross-platform mobile apps for iOS and Android.
- **Reason**: Unified codebase, high rendering performance (Impeller engine), and rich canvas/graphic capabilities essential for drawing custom North Indian and South Indian astrological charts.
- **Status**: **ACCEPTED**

---

## ADR-005: Next.js for Admin Management Portal
- **Decision**: Use Next.js (React / TypeScript) for building the administrative web portal (`apps/admin`).
- **Reason**: Server-side rendering performance, rich ecosystem of dashboard UI component libraries (Tailwind, Radix UI), and native TypeScript compatibility with backend DTOs.
- **Status**: **ACCEPTED**

---

## ADR-006: PostgreSQL as Primary Database with Prisma ORM
- **Decision**: Select PostgreSQL as the relational database engine, managed via Prisma ORM.
- **Reason**: Strong ACID compliance, robust JSONB support for complex chart vectors, type-safe query generation, and declarative schema migrations.
- **Status**: **ACCEPTED**

---

## ADR-007: Redis and BullMQ for Asynchronous Workloads
- **Decision**: Utilize Redis in combination with BullMQ for in-memory caching and background job queue management.
- **Reason**: Offloads expensive PDF document compilation, LLM prompt processing, and notification dispatches away from main NestJS HTTP threads to maintain sub-300ms API response times.
- **Status**: **ACCEPTED**

---

## ADR-008: WhatsApp as an External Channel Integration
- **Decision**: Integrate WhatsApp strictly via backend webhooks (Meta WhatsApp Business Platform) as an external communication channel, NOT as a separate frontend application.
- **Reason**: Preserves core business logic in backend packages while allowing users to receive PDF reports and interact via automated chat flows.
- **Status**: **ACCEPTED**

---

## ADR-009: LLM Constrained to Explanation-Only Layer
- **Decision**: Constrain Large Language Models (LLMs) strictly to translating structured, deterministic calculation/prediction outputs into human-readable prose. LLMs must NEVER calculate planetary positions or invent astrological predictions.
- **Reason**: Eliminates AI hallucination risks, ensures 100% deterministic chart accuracy, and complies with client requirements for auditable astrology logic.
- **Status**: **ACCEPTED**

---

## ADR-010: Prohibition of Paid Third-Party Astrology APIs
- **Decision**: Never use external paid per-request astrology calculation APIs. All calculations must run locally on owned infrastructure using open-source or commercially licensed calculation libraries.
- **Reason**: Eliminates per-request operational costs, protects user privacy, and guarantees high availability and zero external dependency rate limits.
- **Status**: **ACCEPTED**

---

## ADR-011: Local Ephemeris Library Evaluation Strategy
- **Decision**: Local/licensed/open-source ephemeris calculation engines (such as Swiss Ephemeris or pure TypeScript astronomy libraries) will be evaluated during the Phase 1 technical spike prior to locking dependency selection.
- **Reason**: Ensures license compatibility (e.g. GPL vs commercial licensing for Swiss Ephemeris) and performance verification before binding the core engine to a specific library.
- **Status**: **UNDER EVALUATION (Phase 1 Spike)**
