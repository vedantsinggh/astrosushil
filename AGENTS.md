# AGENTS.md - Instructions & Guidelines for AI Coding Agents

This file contains permanent directives, architectural rules, and mandatory standards for all AI coding agents operating on the **Astro Sushil** codebase.

---

## 1. Core Architectural Directives

1. **Monorepo & Modular Monolith**:
   - Do **NOT** alter the repository architecture or split services into microservices without explicit, written human approval and technical justification.
   - Respect package boundaries (`apps/`, `packages/`, `workers/`). Reusable business logic belongs in internal TypeScript packages, not duplicated inside applications.

2. **No Paid Third-Party Astrology APIs**:
   - Never introduce dependencies on external paid per-request astrology APIs.
   - Use locally executed open-source or commercially licensed calculation libraries only after verifying license compatibility (e.g. MIT, Apache 2.0, LGPL with dynamic linking).

3. **Deterministic Astrological Calculations**:
   - All astrological calculations (planetary positions, chart generation, dasha periods, Gupta Nadi rules) must be **100% deterministic, rule-based, and auditable**.
   - Calculations must yield identical outputs given identical input parameters (date, time, location, ayanamsa).

4. **LLM Execution Constraints**:
   - The LLM is strictly an **explanation and natural language formatting engine**.
   - **NEVER** use an LLM to calculate planetary positions, determine planetary aspects, evaluate Gupta Nadi rules, or infer astrological predictions.
   - Data flow must always be: `Calculations -> Deterministic Prediction Output -> LLM Natural Language Formatting`.

5. **Client Channel Isolation**:
   - **Flutter Mobile App**: Must communicate exclusively via backend REST / WebSocket APIs. Flutter must **NEVER** connect directly to PostgreSQL, Redis, or external third-party services (except client-side SDKs like Razorpay SDK or FCM).
   - **Next.js Admin Panel**: Must communicate exclusively via backend admin APIs.
   - **WhatsApp**: Is an external messaging channel integrated via backend webhooks (Meta WhatsApp Business API), **NOT** a standalone frontend application.
   - **Business Logic Placement**: All astrological, financial, and domain business logic must remain in backend packages/services, **NEVER** in Flutter or React UI components.

---

## 2. Code Modifications & Dependency Rules

1. **Scope Control**:
   - Do **NOT** modify unrelated modules or refactor working code outside the explicit scope of the current task.
   - Preserve existing function signatures, comments, and public APIs unless explicitly tasked to update them.

2. **Dependency Management**:
   - Do **NOT** add new npm packages, pub packages, or external libraries without documenting why they are required and verifying license compliance.
   - Avoid introducing heavy dependencies for trivial tasks.

3. **Testing Requirements**:
   - Every piece of new business logic, astrology formula, or Gupta Nadi rule must be accompanied by unit tests.
   - Predictive rules must have deterministic test fixtures based on verified reference charts.

4. **Follow `/docs` Specifications**:
   - Always reference specification files located in `/docs` (`astrology-spec.md`, `gupta-nadi-spec.md`, `report-spec.md`, etc.).
   - Do **NOT** invent astrology rules or guess calculation logic.
   - **NEVER** silently change the client's astrology rules or Brihaspati Nandi Nadi (BNN) methodology.

5. **Handling Ambiguity**:
   - When requirements or astrological formulas are ambiguous, **STOP** and request clarification from human supervisors. Do not attempt to guess astrological rules or business logic.

---

## 3. Modular Monorepo Structure

```
astro-platform/
├── apps/
│   ├── api/                  # NestJS API backend
│   ├── mobile/               # Flutter mobile app
│   └── admin/                # Next.js admin portal
├── packages/
│   ├── astrology-engine/     # Ephemeris & chart calculations
│   ├── gupta-nadi-engine/    # BNN rule evaluation engine
│   ├── prediction-engine/    # Rule-based prediction compiler
│   ├── report-engine/        # Document & PDF generation pipelines
│   └── shared/               # Shared TypeScript types, DTOs & utilities
├── workers/                  # Background worker processors (BullMQ)
├── infrastructure/           # Docker, CI/CD scripts, deployment configs
└── docs/                     # Technical specifications and documentation
```

---

## 4. Code Quality & Formatting Rules

- TypeScript code must adhere to strict type checking (`"strict": true`). Avoid `any` types.
- Follow NestJS standards (Dependency Injection, Controllers, Services, Modules, DTO validation).
- Flutter code must follow standard Dart style guidelines and state management patterns (Provider/Bloc/Riverpod as specified).
- Write descriptive commit messages following Conventional Commits format (e.g. `feat(astrology): add dasha calculation engine`).
