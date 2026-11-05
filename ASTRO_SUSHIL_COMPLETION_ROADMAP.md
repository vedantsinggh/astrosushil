# ASTRO SUSHIL — FULL APPLICATION RECOVERY & COMPLETION ROADMAP

**Document Version:** 1.0.0  
**Date:** November 5, 2026  
**Auditor:** DeepMind Agentic Coding Engineering Pair  
**Authorization Mode:** READ-ONLY SPECIFICATION & IMPLEMENTATION ROADMAP  
**Execution Condition:** STRICTLY AWAITING HUMAN SUPERVISOR WRITTEN APPROVAL  

---

## 1. Executive Summary & Strategic Phasing

The Astro Sushil application has achieved exceptional mathematical calculation precision (`@astro/astrology-engine`), strong distributed queue fencing (Task 1G), clean admin panel functionality, and native mobile commerce checkout.

However, bridging the application to full production readiness requires addressing four core gaps:
1. **Report Catalogue Full Depth Realization**: Elevating the report suite from toy 3-page summaries to the authentic 15 to 295 page structures evidenced in the 13 reference PDFs, complete with layperson explanations, author messages, disclaimers, and zero doshas.
2. **24-Hour Delivery SLA Infrastructure**: Adding database deadlines (`expectedDeliveryAt`), deadline-ordered queueing, live progress and deadline tracking across app restarts, and mobile UI alignment.
3. **Queue Architecture Simplification & Hardening**: Eliminating in-memory fallback limitations during broker failover and securing cross-process safety.
4. **Regression Test Harness Alignment**: Remedying the 4 test harness seeding/mocking defects in `apps/api`.

---

## 2. Master Implementation Phases & Sequence

```
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                IMPLEMENTATION ROADMAP PHASES                              |
|                                                                                           |
|  [ Phase 1: Test Suite & Infrastructure Stabilization ]                                   |
|    - Align test mocks and fixtures in apps/api unit/integration tests                    |
|    - Implement expectedDeliveryAt in database schema & Prisma migration                  |
|                                │                                                          |
|                                ▼                                                          |
|  [ Phase 2: 24-Hour Production Delivery SLA Infrastructure ]                              |
|    - Add deadline calculation (now + 24h) upon order payment                             |
|    - Deadline-prioritized worker dequeueing                                               |
|    - Mobile UI: display order time, delivery deadline, status, and 24h reassurance       |
|    - Preserve instant synchronous report generation in development                       |
|                                │                                                          |
|                                ▼                                                          |
|  [ Phase 3: Core Kundli & Synastry Flagship Reports Depth Realization ]                   |
|    - Premium Personalised Kundli Report (295-page multi-divisional life dossier)          |
|    - Couple Kundli Matching Report (96-page comprehensive synastry dossier)              |
|                                │                                                          |
|                                ▼                                                          |
|  [ Phase 4: Annual & Transit Report Suite Realization ]                                   |
|    - Varshphal Report (97-page Tajika solar return & month-wise predictions)              |
|    - Saturn In Your Birth Chart Report (87-page neutral karma & transit dossier)         |
|    - Rahu Ketu Transit Report (90-page nodal evolution dossier)                          |
|    - Jupiter Transit Report (79-page expansion & Gochara dossier)                        |
|    - Personalised Horoscope Report (70-page annual transit forecast)                      |
|                                │                                                          |
|                                ▼                                                          |
|  [ Phase 5: Numerology & Targeted Domain Reports Realization ]                            |
|    - Personalised Fortune Report Plus (139-page English numerology dossier)               |
|    - Fortune Report (112-page Hindi numerology dossier)                                  |
|    - Wealth & Finance Report (32-page Dhana yogas & wealth analysis)                      |
|    - Love & Romance Report (23-page relationship psychology & timing)                     |
|    - Baby Name Report (15-page auspicious nakshatra syllables & numerology)               |
|                                │                                                          |
|                                ▼                                                          |
|  [ Phase 6: Final End-to-End Verification, Performance & Release Readiness ]             |
|    - Cross-platform regression test verification                                          |
|    - Storage durability & PDF QA validation across all 13 products                        |
|    - Final acceptance audit & production deployment sign-off                              |
+───────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Detailed Phase Breakdown

---

### Phase 1: Test Suite & Infrastructure Stabilization
- **Goal:** Cleanly resolve all known test failures and introduce the delivery deadline schema fields without breaking backward compatibility.
- **Tasks:**
  1. Fix `ashtakavarga-api.test.ts` to expect the direct calculation return shape or align service wrapper.
  2. Update `phase2b1-integrity.test.ts` to seed test users before executing authorization-gated operations.
  3. Align `phase2b3-unsupported-sku.test.ts` in-memory mock to accurately reflect Task 1G CAS metadata updates.
  4. Update `astrology-intelligence.test.ts` fixture chart so it cleanly activates expected career rules.
  5. Add `expectedDeliveryAt DateTime?` and `isDevelopmentInstant Boolean @default(false)` to `Report` and `Order` models in `schema.prisma`.
  6. Generate Prisma client and create migration.
- **Estimated Effort:** 1 Engineering Day (6–8 hours).
- **Dependencies:** None.
- **Risks:** Database migration must use non-blocking nullable columns (`DateTime?`) to avoid locking active tables.

---

### Phase 2: 24-Hour Production Delivery SLA Infrastructure
- **Goal:** Implement the authoritative 24-hour delivery SLA in the backend and mobile application while retaining instant generation for development.
- **Tasks:**
  1. **Backend SLA Policy (`apps/api/src/modules/reports/reports.service.ts`)**:
     - When order is marked `PAID`, set `expectedDeliveryAt = new Date(Date.now() + 24 * 60 * 60 * 1000)`.
     - In development (`NODE_ENV !== 'production'`), retain instant synchronous execution unless `async=true` is explicitly requested.
  2. **Worker Priority Dequeueing (`apps/api/src/services/report-worker.service.ts`)**:
     - Update queue fetch to prioritize jobs approaching their `expectedDeliveryAt` deadline.
  3. **Mobile UI Reassurance & Countdown (`apps/mobile`)**:
     - Update localization keys (`app_en.arb`, `app_hi.arb`):
       - English: *"Your report is being prepared. It will be delivered within 24 hours of your order. We will notify you as soon as it is ready."*
       - Hindi: *"आपकी रिपोर्ट तैयार की जा रही है। यह आपके ऑर्डर के 24 घंटे के भीतर उपलब्ध होगी। तैयार होते ही आपको सूचित किया जाएगा।"*
     - Replace `"Instant Digital PDF Delivery"` with 24-hour delivery reassurance.
     - On report detail/status screen, display:
       - Order Date & Time.
       - Expected Delivery Deadline (date and time in user's local timezone).
       - Live Stage Progress Bar (`QUEUED` -> `CALCULATING` -> `ANALYZING` -> `RENDERING` -> `COMPILING` -> `UPLOADING` -> `COMPLETED`).
     - Ensure status persists seamlessly across app restarts and device switching.
- **Estimated Effort:** 2 Engineering Days.
- **Dependencies:** Phase 1 schema migration.
- **Risks:** Timezone mismatch between backend UTC timestamps and device local time display (mitigated by passing ISO 8601 UTC strings and formatting locally in Dart).

---

### Phase 3: Core Kundli & Synastry Flagship Reports Depth Realization
- **Goal:** Transform the 3-page Kundli and 4-page Matchmaking summaries into comprehensive dossiers matching the 295-page and 96-page reference PDFs.
- **Tasks:**
  1. **Premium Personalised Kundli Report (295 Pages)**:
     - Implement LaTeX/PDF generator pipeline for full Kundli reading.
     - Chapter 1: Planetary Blueprint (Lagna, Moon, Navamsha, Panchang, Shodashvargas D1–D60, Ashtakvarga).
     - Chapter 2: The Three Pillars (Lagna, Chandra, Nakshatra) with deep layperson psychological breakdowns.
     - Chapter 3: 12 Bhavphal chapters (deep dive into every house).
     - Chapter 4: Conjunctions and Planetary Yogas.
     - Chapter 5: Complete Vimshottari Dasha timeline (Mahadasha & Antardashas).
     - Chapter 6: Gochara transits across houses.
     - Chapter 7: Core life domains (Career, Wealth, Health, Marriage).
     - Chapter 8: Astronomical Gemstone guidance with traditional parameters (metal, finger, day/hora) and lifestyle disciplines. Zero dosha curses.
     - Dedicated Message from Author & Authoritative Disclaimer.
  2. **Couple Kundli Matching Report (96 Pages)**:
     - Expand `generateMatchmakingReport` to compile full dual-chart synastry.
     - Ashtakoota 36-Guna detailed analysis explained with compassionate relationship psychology.
     - Dual chart comparison (Lagna, Moon, Venus, Mars).
     - Dual Dasha timeline coordination.
     - Zero *Nadi Dosha* or *Bhakoot Dosha* marriage disqualifications; zero *Kumbha Vivaha* remedies.
     - Dedicated Message from Author & Authoritative Disclaimer.
- **Estimated Effort:** 4 Engineering Days.
- **Dependencies:** Phase 2.
- **Risks:** Memory and compile-time overhead for compiling 295-page LaTeX documents (mitigated by optimizing LaTeX preambles and font loading, and streaming PDF generation in background workers with 180s timeouts).

---

### Phase 4: Annual & Transit Report Suite Realization
- **Goal:** Implement the 5 missing transit and annual solar return reports in `packages/report-engine` and `COMMERCE_CATALOG`.
- **Tasks:**
  1. **Varshphal Report (97 Pages)**: Tajika annual chart, Muntha, Varsheshwar, Tajika Yogas, Mudda Dasha, and 12-month month-wise predictions.
  2. **Saturn In Your Birth Chart Report (87 Pages)**: Natal Saturn analysis, house transits from Moon/Ascendant, neutral Gochara analysis, karmic mastery timelines.
  3. **Rahu Ketu Transit Report (90 Pages)**: 18-month nodal cycle analysis through signs and houses, psychological breakthroughs, zero Kaal Sarp.
  4. **Jupiter Transit Report (79 Pages)**: 1-year transit across 12 houses from Moon, wisdom, mentors, expansion windows.
  5. **Personalised Annual Horoscope (70 Pages)**: Annual multi-transit overview with quarterly and monthly breakdowns.
  6. Register SKUs in `commerce.catalog.ts` and add enum values to `ReportType`.
- **Estimated Effort:** 4 Engineering Days.
- **Dependencies:** Phase 3.
- **Risks:** Tajika solar return calculations require precise annual location inputs (mitigated by reusing user's birth location if current residence is unsupplied).

---

### Phase 5: Numerology & Targeted Domain Reports Realization
- **Goal:** Implement the numerological calculation engine and remaining targeted domain reports.
- **Tasks:**
  1. **Numerology Calculation Engine (`@astro/numerology-engine` or within `@astro/prediction-engine`)**:
     - Deterministic calculation of Mulank (1–9), Bhagyank (1–9), Namank (Cheiro / Pythagorean), and the 3x3 Lo Shu Fortune Grid (8 planes, arrows of strength/weakness, missing number remedies).
  2. **Personalised Fortune Report Plus (139 Pages)**: English comprehensive numerology dossier.
  3. **Fortune Report (112 Pages)**: Clean Devanagari Hindi edition of the Fortune Numerology Report.
  4. **Wealth & Financial Prosperity Report (32 Pages)**: 2nd, 11th, and 12th house wealth dynamics, Dhana yogas, investment timelines.
  5. **Love & Relationship Report (23 Pages)**: 5th and 7th house relationship psychology, Venus dynamics, romantic milestones.
  6. **Baby Name Report (15 Pages)**: Moon nakshatra auspicious starting syllables (Nama-Akshara), numerological letter vibration matching, and curated baby name suggestions.
  7. Register corresponding SKUs in `commerce.catalog.ts`.
- **Estimated Effort:** 3 Engineering Days.
- **Dependencies:** Phase 4.
- **Risks:** Devanagari font rendering in LaTeX (mitigated by using `xelatex` with standard Noto Sans Devanagari fonts already installed in system).

---

### Phase 6: Final Verification, Performance & Release Readiness
- **Goal:** Execute end-to-end multi-product verification, load test background workers, and certify production readiness.
- **Tasks:**
  1. Run complete automated regression test suite across all packages and apps.
  2. Generate sample test PDFs for all 13 commercial reports; extract text and verify page counts, table of contents, author messages, disclaimers, layperson explanations, and absence of prohibited doshas.
  3. Execute multi-worker stress test verifying concurrent PDF generation, heartbeat renewal, and zero race conditions under simulated load.
  4. Verify mobile app purchase flow, 24-hour delivery deadline display, push notification reception, and PDF download integrity on Android and iOS simulators.
  5. Document operational runbook and deployment procedures.
- **Estimated Effort:** 2 Engineering Days.
- **Dependencies:** Phases 1–5.
- **Risks:** S3 object storage credential misconfiguration in production (mitigated by automated startup health probe).

---

## 4. Overall Effort & Dependency Timeline

```
Timeline: 16 Engineering Days Total

Week 1:
- Days 1-2: Phase 1 (Test Stabilization & Schema Migration) & Phase 2 (24-Hour SLA Backend & Mobile)
- Days 3-5: Phase 3 (Kundli 295p & Couple Matching 96p Flagship Dossiers)

Week 2:
- Days 6-9: Phase 4 (Varshphal 97p, Saturn 87p, Rahu-Ketu 90p, Jupiter 79p, Horoscope 70p)
- Day 10: Phase 5 (Part A: Numerology Engine, Lo Shu Grid, Fortune Reports 139p / 112p)

Week 3:
- Days 11-12: Phase 5 (Part B: Finance 32p, Love 23p, Baby Name 15p)
- Days 13-14: Phase 6 (End-to-End Multi-Report Verification, QA, Performance Load Testing)
- Days 15-16: Release Readiness, Operational Documentation, and Acceptance Sign-off
```

---

## 5. Risk Assessment & Mitigation Matrix

| Risk Identified | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **High Memory / CPU during LaTeX Compilation** | Server Out of Memory or high CPU spikes during concurrent generation of 200+ page reports. | Medium | Limit worker concurrency (`CONCURRENCY = 2` per worker container); set worker memory limits (2GB); stream PDF generation; offload compilation to worker pool decoupled from Fastify API. |
| **OpenRouter LLM Rate Limiting (429)** | Report generation delays during peak purchase periods. | Medium | Utilize configured fallback models (`nemotron-3.5-lightning`, `qwen3.8-27b`); exponential backoff retries (already implemented in Task 1G); deterministic interpretation fallbacks. |
| **Client Confusion regarding 24-Hour Delivery** | Customer expects instant download upon payment and files dispute. | Low | Prominently display delivery deadline before purchase in the checkout bottom sheet and immediately after purchase on the order receipt and reports screen. |
| **Dual-System Split-Brain under Redis Outage** | Jobs created during Redis outage not processed by workers. | Low | Retain Phase 2B.5 Task 1G self-healing recovery scan (`recoverStaleJobs`) and transition to PostgreSQL `SKIP LOCKED` for 100% durable queueing. |
| **Prohibited Dosha Regression** | Dosha terms or fatalistic predictions accidentally slipping into expanded report chapters. | Low | Automated Vitest QA test (`phase2b2-editorial-compliance.test.ts`) scans every generated report JSON and PDF buffer for prohibited terms (`Kaal Sarp`, `Nadi Dosha`, `Kumbha Vivaha`, `curse`, `affliction`). |

---

## 6. Authorization Boundary & Human Sign-Off

> [!IMPORTANT]
> **AUTHORIZATION BOUNDARY NOTICE**:  
> In strict compliance with user instructions, this audit and roadmap is delivered in a **READ-ONLY** state.  
> No production code has been modified.  
> No migrations have been applied.  
> No external payments or third-party APIs have been triggered.  
>  
> **Awaiting Human Engineering Supervisor Approval to proceed with Phase 1 execution.**

