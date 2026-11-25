# Astro Sushil - Scalable Astrology Platform

## Project Purpose
**Astro Sushil** is a scalable, enterprise-grade astrology platform designed to deliver precise Vedic astrology calculations, rule-based predictions, and comprehensive personalized reports. The platform combines deterministic astrological algorithms with modern natural language processing to produce accurate, auditable, and human-readable astrological insights.

---

## Product Overview
Astro Sushil provides accessible free foundational astrology tools alongside premium, deeply personalized astrological reports and flagship predictions.

### Key Highlights:
- **Deterministic Core**: All astrological position calculations, planetary strength formulas, and predictive logic are 100% rule-based and auditable.
- **LLM Explanation Layer**: Artificial Intelligence (LLM) is strictly constrained to translating deterministic prediction results into elegant, natural language reports. The LLM never computes planetary positions or invents predictions.
- **Zero Third-Party Astrology API Costs**: Built on local/open-source or commercially licensed calculation engines running directly on owned infrastructure.
- **Multi-Channel Access**: Mobile application for end users, an offline desktop workstation for astrologers, a web admin panel for operations, and direct messaging via WhatsApp.

---

## Product Features

### Free Features
- **Kundli / Birth Chart**: D-1 Rashi chart calculation and rendering.
- **Planetary Positions**: Degrees, sign, nakshatra, pada, retrograde status, and combustion status.
- **Rashi Details**: Moon sign summary, lordships, and element profiles.
- **Bhava / House Analysis**: House positions and lord relationships.
- **Nakshatra Details**: Birth nakshatra, pada, and nakshatra deity/characteristics.
- **Basic Astrology Utilities**: Panchang summary (Tithi, Vara, Nakshatra, Yoga, Karana).
- **Rashi Bhavishya**: Daily Horoscope & transit-based forecasts.
- **Vastu Guidance**: Basic Vastu tips, cardinal directional rules, and room placement suggestions.

### Paid Features & Reports
- **Marriage & Compatibility Reports**: Synastry, Ashtakoota / Dashakoota matching, and relationship longevity analysis.
- **Career Reports**: Dasamsa (D-10) insights, planetary periods, career trajectory forecasts, and favorable timing.
- **Childbirth & Family Reports**: Saptamsa (D-7) analysis and timing of progeny.
- **Custom Personalized PDF Reports**: Comprehensive multi-page deep-dive analytical dossiers.
- **Gupta Nadi Reports (Flagship)**: Specialized reports powered by the client's proprietary Brihaspati Nandi Nadi (BNN) engine.

### Consultation Booking
- Customers first check available slots for a consultation type. Availability follows that type's schedule and booking notice period, including for types that offer multiple consultation modes.
- Customers select a consultation mode when choosing the offering to book; the selected mode determines its price and currency.

---

## Flagship Product: Gupta Nadi Engine
Gupta Nadi is the cornerstone of the Astro Sushil platform, implementing the client's proprietary **Brihaspati Nandi Nadi (BNN)** methodology:
- **Rule-Based & Deterministic**: Evaluates planetary combinations (yogas), planet-to-planet aspects, sign transits, and planetary directional relationships without human bias or hallucination.
- **Auditable & Traceable**: Every prediction generated points directly to the specific rule ID and planetary condition triggered.
- **Custom Formulas**: Built strictly around formula sets and rule precedence provided by the client.

---

## High-Level Architecture

The system is a **Modular Monolith**: one Fastify API backed by internal TypeScript packages, with clear boundaries preserved for future extraction if needed.

```
+-----------------------------------------------------------------------------+
|                               CLIENT CHANNELS                               |
|                                                                             |
|  +----------------+  +----------------+  +----------------+  +-----------+  |
|  | Flutter Mobile |  | Flutter Desktop|  | Next.js Admin  |  | WhatsApp  |  |
|  | (iOS/Android)  |  | (offline, with |  | (operations)   |  | (webhooks)|  |
|  |                |  | engine sidecar)|  |                |  |           |  |
|  +-------+--------+  +-------+--------+  +-------+--------+  +-----+-----+  |
+----------|-------------------|-------------------|-----------------|--------+
           | REST / WebSocket  | local NDJSON      | REST            |
           v                   v (no network)      v                 v
+-----------------------------------------------------------------------------+
|                      BACKEND  (apps/api - Node.js / Fastify)                |
|  auth · users · birth-profiles · astrology · predictions · reports ·        |
|  rashi-bhavishya · vastu · jyoti · commerce · payments · notifications ·    |
|  fulfillment · admin · webhooks                                             |
|                                                                             |
|  packages/: astrology-engine · gupta-nadi-engine · prediction-engine ·      |
|             report-engine · shared                                          |
+-------------+-------------------------+-------------------------+-----------+
              v                         v                         v
     +----------------+        +------------------+       +----------------+
     |  PostgreSQL    |        |  Redis           |       | Object storage |
     |  (Prisma)      |        |  (cache, queue)  |       | (report PDFs)  |
     +----------------+        +--------+---------+       +----------------+
                                        v
                               +------------------+
                               | Report worker    |
                               | (apps/api/src/   |
                               |  worker.ts)      |
                               +------------------+
```

### Report pipeline

```
Birth data -> astrology-engine (deterministic chart snapshot)
           -> evidence registry (stable evidence IDs)
           -> deterministic data blocks  +  LLM narration of cited evidence only
           -> claim + editorial validation (retry, else topic marked failed)
           -> XeLaTeX PDF -> automated PDF QA -> manifest
```

The LLM never sees the subject's name, birth date, time or place, and never computes anything. Every narrated claim must cite evidence IDs that are re-checked against the chart snapshot. See [`docs/report-system/PLATFORM.md`](docs/report-system/PLATFORM.md).

---

## Repository Layout

```
apps/
  api/          Fastify API, Prisma schema, report worker (src/worker.ts)
  admin/        Next.js admin panel (feature complete, scope frozen)
  mobile/       Flutter mobile app (iOS / Android)
  desktop/      Flutter desktop workstation + Node engine sidecar (Windows/macOS/Linux)
packages/
  astrology-engine/   Ephemeris, ayanamsa, houses, vargas, dashas, panchang, KP, Jaimini,
                      Tajika, Ashtakavarga, strengths, matching, transits, muhurta, ...
  gupta-nadi-engine/  BNN rule evaluation engine (awaiting client rule documents)
  prediction-engine/  Deterministic, evidence-traceable interpretation engine
  report-engine/      Universal report platform: snapshot, evidence, narration, LaTeX, PDF QA
  shared/             Shared types, DTOs and utilities
workers/          Placeholder for future standalone workers (worker runs in apps/api today)
infrastructure/   Dockerfiles, docker-compose, nginx and VM deployment kit
docs/             Specifications, ADRs (docs/decisions.md) and runbooks
```

---

## Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Mobile App** | Flutter (Dart) |
| **Desktop App** | Flutter desktop + Node SEA engine sidecar (fully offline) |
| **Admin Panel** | Next.js (React / TypeScript) |
| **Backend** | Node.js / Fastify (TypeScript, strict) |
| **Database** | PostgreSQL via Prisma |
| **Cache & Queues** | Redis |
| **Astrology Calculations** | `@astro/astrology-engine` (local, built on the MIT-licensed `astronomy-engine`) |
| **Report Narration** | Google Gemini (reports); OpenRouter (Jyoti assistant) |
| **PDF Generation** | XeLaTeX + poppler-utils QA |
| **Payments** | Razorpay |
| **Messaging / Push** | Meta WhatsApp Business API, Firebase Cloud Messaging |
| **Deployment** | Docker, nginx, VM deployment kit |

### Default astrological conventions

True Chitrapaksha Lahiri ayanamsa (Raman, KP and others selectable), mean node (true selectable), true Placidus cusps for KP, and sunrise at the Sun's upper limb with standard refraction. Conventions not specified by the client are standard published defaults, labelled *provisional – pending client review* and recorded in [`docs/report-system/DECISIONS.md`](docs/report-system/DECISIONS.md).

---

## Getting Started

**Prerequisites:** Node.js 20+, npm, Docker, Flutter SDK (mobile/desktop), and a TeX Live install with XeLaTeX plus `poppler-utils` (report PDFs).

```bash
npm install
cp apps/api/.env.example apps/api/.env      # fill in secrets
docker-compose up -d postgres redis
npm run build:packages
(cd apps/api && npx prisma migrate dev)

npm run dev:api        # API on http://localhost:3000
npm run dev:worker     # report worker
npm run dev:admin      # admin panel
npm run dev:mobile     # Flutter app against the local API (see scripts/dev-mobile.sh)
```

Desktop app: see [`apps/desktop/README.md`](apps/desktop/README.md).

### Tests

```bash
npm test               # API, report-engine, prediction-engine and astrology-engine suites
```

---

## Development Philosophy
1. **Deterministic Astrology**: Predictions come ONLY from verified astrological formulas, never from LLM guessing.
2. **LLM as Writer Only**: LLMs synthesize and explain structured calculation outputs.
3. **No External API Dependencies for Ephemeris**: No per-request third-party astrology API fees.
4. **Strict Modular Boundaries**: Internal domains reside in clean, independent TypeScript packages.
5. **Client-Driven Business Logic**: Astrology and Gupta Nadi rules follow the client's explicit specifications without unapproved variations.
6. **No Fabricated Output**: If genuine data cannot be produced, the system reports an error and retries rather than substituting placeholder text.

Contributors and AI agents must follow [`AGENTS.md`](AGENTS.md).

---

## Current Project Status
> **Current Phase: Pre-production — completing report types and engine parity**

- **Implemented:** API, admin panel (feature complete), mobile app, offline desktop workstation, astrology engine, universal report platform with Gemini narration and PDF QA, and the deterministic interpretation engine.
- **Pending client input:** Brihaspati Nandi Nadi rule documents (Gupta Nadi reports are disabled until then), name matching, and client-supplied interpretation texts. Childbirth/Family reports are also disabled until a genuine generator exists.
- The platform is **not yet in production**.
