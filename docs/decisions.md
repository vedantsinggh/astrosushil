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
- **Decision**: Build the backend application as a unified modular monolith (`apps/api`) rather than microservices.
- **Reason**: Microservices introduce operational overhead, RPC latency, deployment complexity, and distributed tracing costs unnecessary for the team size and initial scale. Modular packages maintain clear domain boundaries for future service splitting if ever required.

---

## ADR-003: Fastify Backend Framework (Supersedes NestJS)

- **Status**: Accepted (Supersedes NestJS decision)
- **Decision**: Select Node.js with Fastify framework, TypeScript, Zod, and Prisma ORM for backend development.
- **Reason**: Fastify provides significantly higher HTTP throughput, lower memory overhead, minimal abstraction tax compared to NestJS, and a clean plugin/schema system that integrates cleanly with Zod and TypeScript.

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

## ADR-006: PostgreSQL Relational Database & Prisma ORM

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

---

## ADR-011: Hashed Refresh Token Rotation Strategy

- **Status**: Accepted
- **Decision**: Use short-lived JWT access tokens (15m) paired with database-backed refresh tokens (7d). Refresh tokens are stored as SHA-256 hashes in PostgreSQL and are rotated on every refresh call.
- **Reason**: Prevents refresh token theft and plaintext leakage if the database is accessed, while supporting instant session revocation and replay protection.

---

## ADR-012: Server-Side Birth Profile Ownership Isolation

- **Status**: Accepted
- **Decision**: Enforce birth profile authorization strictly on the backend API service level. Requests for birth profiles return 404 Not Found if the requested profile ID does not belong to the authenticated user ID (unless requested by an ADMIN role).
- **Reason**: Guarantees zero cross-tenant data leaks and prevents ID enumeration probing across user accounts.

---

## ADR-013: Astrology Chart Calculation Strategy (Option A: On-Demand)

- **Status**: Accepted
- **Decision**: Compute natal astrology charts on-demand directly from canonical `BirthProfile` data without persisting chart calculation blobs or introducing a complex Redis cache layer.
- **Reason**:
  1. **Low Execution Cost**: Single chart calculations run in `< 1 ms` on local CPU cores, eliminating any latency or CPU bottleneck.
  2. **Automatic Data Invalidation**: Whenever a user updates their `BirthProfile` (date, time, timezone, latitude, or longitude), on-demand calculation guarantees 100% freshness. No stale cached charts exist to invalidate or synchronize.
  3. **Auditability & Reproducibility**: Each chart output specifies its calculation engine version, provider version, and active config parameters.

---

## ADR-014: Astro Sushil Desktop — Flutter desktop app with a local engine sidecar

- **Status**: Accepted (2026-11-20)
- **Approval**: The product owner asked in writing for "a desktop application compatible with all OSes, using our astro engine". This is the explicit human approval that AGENTS.md §1.1 requires to add `apps/desktop`. The owner then chose Flutter desktop over Electron.
- **Decision**: Add `apps/desktop`, a Flutter desktop app (Windows, macOS, Linux; Riverpod like `apps/mobile`). It starts `apps/desktop/engine-sidecar` as a child process. The sidecar is a small Node/TypeScript program that imports `@astro/astrology-engine` and answers newline-delimited JSON requests over stdin/stdout (protocol v1, `apps/desktop/docs/sidecar-protocol.md`). For release it is bundled with esbuild and packed as a Node Single Executable Application, so users need no Node install. CMake (Linux/Windows) and a macOS script ship it inside the app bundle.
- **Reason**:
  1. **Single source of truth**: all calculations stay in `packages/astrology-engine`. Porting the engine to Dart would duplicate business logic, which AGENTS.md forbids, and would let desktop and API results drift.
  2. **Maintainability**: the team already maintains Flutter (`apps/mobile`); Flutter desktop avoids adding a React/Electron stack.
  3. **Offline**: no server and no network. Charts are stored as local JSON files; place search uses a bundled GeoNames extract (CC BY 4.0).
  4. **Boundaries**: the desktop app does not touch `apps/api`, the database or the admin panel. Engine changes for it are additive only (new modules: muhurta day divisions, eclipses, Sudarshana Chakra, Ishta/Kashta), with unit tests.

---

## ADR-015: Sunrise/sunset convention

- **Status**: Accepted (client decision, 2026-11-20). Sunrise/sunset = the Sun's upper limb on the horizon with standard atmospheric refraction (34'), sea-level observer, searched from local midnight of the civil date (matches published Indian panchangs and timeanddate/USNO); implemented once in `packages/astrology-engine/src/astronomy/solar-day.ts`.

---

## ADR-016: Client methodology decisions for desktop parity (provisional conventions)

- **Status**: Accepted (2026-11-20). Decisions relayed by the user from the client.
- **Context**: `apps/desktop/docs/feature-parity.md` (Q1–Q20) and the Vedic-ephemeris gap report (N1–N8) listed features blocked on client methodology choices.
- **Decisions**:
  1. **Lal Kitab** is in scope, **calculation only** (Lal Kitab chart and Varshphal tables). No remedies and no interpretation text are copied or written.
  2. **Tajika (full)** is in scope: all 16 Tajika yogas and Pancha-vargiya Bala, following *Tajika Neelakanthi* (each rule cites its verse or section).
  3. **Extra dashas** are in scope: Moola, Sudasa, Drig, Niryana Shoola, Tara, Brahma, Mandooka, Navamsa, Trikona, Kendradi, Varnada, Shastihayani, Tribhagi, Padanadhamsa and Patyayini. The standard BPHS variant (or the most widely published variant) is used, with its source cited.
  4. **Matching extras** are in scope: South Indian Porutham (10 kootas) and Dashakoota, alongside the existing Ashtakoota.
  5. **Sade Sati** is shown as a neutral calculated table of periods (start, peak and end of each Saturn transit over the Moon sign and its neighbours), with no interpretation. Engine + desktop sidecar endpoint + desktop screen; mobile follows later through the API.
  6. **Minor conventions use standard published defaults**, each cited and labelled **"provisional – pending client review"** in the UI and docs: combustion orbs; Gandmool and Panchaka; extra vargas (D5, D6, D8, D11, D81, D108, D144, D150); Pushkara Navamsha/Bhaga; Bhrigu Bindu; Tripataki; Sarvatobhadra, Kota and Sanghatta chakras; Durmuhurta, Varjyam and Amrit Kalam; Tithi Pravesha; Western tropical tables with Uranus, Neptune and Pluto.
  7. **Interpretation texts**: none. The client will supply them later. Screens show calculations only, with an optional empty "Notes / interpretation" area where meanings would go.
- **Deferred to a separate core-engine change** (changes core outputs everywhere; not part of the desktop parity work): true Chitrapaksha Lahiri as the default ayanamsa with selectable Raman/KP/others (Q1); node choice, mean by default with true selectable (Q2); KP Placidus cusps (Q3); the sunrise convention (upper limb plus refraction, Q19). New calculators take the ayanamsa and node choice as parameters, defaulting to what the engine exposes, so they pick up the new options automatically.
- **Still blocked**: BNN / Gupta Nadi predictions (client rule documents, `docs/client-questions.md` §2); name matching (N2); "Yavan yoga" in prashna (N1); the transit "Direction" column (N3).
- **Consequences**: every module built under decision 6 (and the provisional dasha variants in decision 3) carries a `provisional: true` flag and a `source` citation in its engine output so the UI can label it; changing a convention later is a data change in one engine file, with its tests.

---

## ADR-017: Core-engine methodology — true Lahiri ayanamsa, node choice, KP Placidus cusps, Sripati Bhava Chalit

- **Status**: Accepted (client decisions approved by the user on 2026-11-20; deferred from ADR-016, `apps/desktop/docs/feature-parity.md` Q1–Q3).
- **Decisions** (engine `ASTROLOGY_ENGINE_VERSION` 0.1.0 → **0.2.0**; API report `CURRENT_CALCULATION_VERSION` 1.0.0 → **2.0.0**):
  1. **Ayanamsa.** Default `LAHIRI` = TRUE Chitrapaksha of the Indian Calendar Reform Committee: 23°15'00".658 (a true value, nutation included) on 1956-03-21 0h TT, propagated with the IAU 2006 general precession in longitude pA (Capitaine et al. 2003); true ayanamsa = mean + nutation in longitude (IAU 2000B). This is the method of the Indian Astronomical Ephemeris since 2021 (IAE 2027 pp. 382, 423). Replaces the linear approximation `23.85° + 0.01396°/yr` (difference up to 0.012° over 1900–2100). Selectable per calculation: `RAMAN` (Raman, *A Manual of Hindu Astrology* §49: (year − 397) × 50⅓"), `KRISHNAMURTI` (KSK Reader table: 22.363889° on 1900-01-01), `KP` (KP New, Senthilathiban 2019: zero on 291-03-21 06:10:29 TT), `FAGAN_BRADLEY` (24°02'31".36 at 1950.0). All share the same precession and nutation. **Yukteshwar is not offered**: its published definition is inconsistent (20°54'36" stated for 1894 but applying to 1893, with a 54"/yr rate the author used), so the client must choose a variant first. Implementation: `packages/astrology-engine/src/ayanamsa/ayanamsa.ts`.
     - **KP = KP New confirmed by client 2026-11-20**: the `KP` value is KP New (Senthilathiban 2019); K.S. Krishnamurti's original stays selectable as `KRISHNAMURTI` (labelled "KP – KSK original" in the desktop app).
  2. **Nodes.** `MEAN_NODE` (default) = Meeus eq. 47.7; `TRUE_NODE` = osculating node of the Moon's geocentric orbit from astronomy-engine's state vector (the JPL Horizons definition). Meeus' 5-term true-node series was rejected (up to 0.40° from Horizons). `src/rahu-ketu/lunar-nodes.ts`.
  3. **KP cusps = true Placidus** (semi-arc trisection, `src/houses/house-cusps.ts`); KP planets are placed between cusps. Placidus is undefined for |latitude| ≥ 90° − obliquity (≈66.56°): the engine throws `PlacidusUndefinedError` (code `PLACIDUS_UNDEFINED_AT_LATITUDE`) and never falls back silently.
  4. **Bhava Chalit (Sripati)** uses the real MC and Lagna: quadrant trisection for bhava madhyas, sandhi = midpoint of consecutive madhyas, planets placed by sandhis (Raman, *A Manual of Hindu Astrology* ch. X).
- **Frames**: the true ayanamsa is subtracted from apparent (true-equinox) planetary longitudes; the mean ayanamsa from mean-equinox quantities (ascendant, MC, house cusps, lunar nodes).
- **Interfaces**: `AstrologyConfig.ayanamsa` gains `FAGAN_BRADLEY`; `AstrologyConfig.nodeCalculation` is now honoured; a missing ayanamsa means `LAHIRI`. Charts carry `metadata.ayanamsa`, `metadata.nodeType` and `midheaven`. API: optional body fields `ayanamsa` / `nodeType` on `/api/v1/astrology/*` (zod-validated, standard error envelope). Desktop sidecar: optional `params.options` `{ayanamsa, nodeType, kpCuspSystem}` (`apps/desktop/docs/sidecar-protocol.md`).
- **Verification** (tests in `packages/astrology-engine/tests/unit/*.reference.test.ts`): IAE 2027 true-ayanamsa table within 0.5", IAE J2000 and 1900 values, Raman's book examples within 3"; mean node vs IERS 2010 within 0.001°; true node vs JPL Horizons osculating node within 0.005°; Placidus vs Heindel's 1919 Tables of Houses; Sripati vs Raman's worked Standard Horoscope to 1".
- **Consequences**: stored reports keep `calculationVersion` 1.0.0 and are not reused; new ones are 2.0.0. Report-engine snapshot ids include the engine version, so cached snapshots are recomputed. Rare sign / nakshatra / pada outcomes change near boundaries (about 0.3% of charts change a planet's sign); Vimshottari dates move by up to ~7 days; KP cusps, KP house significators and the Bhava Chalit change for essentially every chart.
