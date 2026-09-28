# Astro Sushil – Product Implementation & Usage Guide
**Audited & Generated:** September 2026  
**Document Type:** Read-Only Product Walkthrough & Architecture Audit  
**Status:** Canonical Reference

---

## 1. The Big Picture

### High-Level Architecture Overview
Astro Sushil is a full-stack, enterprise-grade Vedic & Nadi astrology platform designed as a modular TypeScript monorepo with client channel isolation.

```
                                  ┌────────────────────────┐
                                  │      CLIENT TIERS      │
                                  └──────────┬─────────────┘
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         ┌───────────────────────┐                       ┌───────────────────────┐
         │   Flutter Mobile App  │                       │   Next.js 14 Admin    │
         │   (Android / iOS)     │                       │  (Operations Console) │
         └───────────┬───────────┘                       └───────────┬───────────┘
                     │ REST (Bearer JWT / Guest)                     │ REST (Admin RBAC JWT)
                     └───────────────────────┬───────────────────────┘
                                             ▼
                             ┌───────────────────────────────┐
                             │    Fastify REST API (v1)      │
                             │      (Node.js + TypeScript)   │
                             └───────────────┬───────────────┘
                                             │
             ┌───────────────────────────────┼──────────────────────────────┐
             ▼                               ▼                              ▼
┌─────────────────────────┐     ┌─────────────────────────┐    ┌─────────────────────────┐
│  Astrology Engine Core  │     │   PostgreSQL (Prisma)   │    │      Redis 7 Queue      │
│  (Swiss Ephemeris /     │     │  Users, Profiles,       │    │   Background Job Queue  │
│   Deterministic Math)   │     │  Reports, Orders, Logs  │    │   & In-Memory Caches    │
└────────────┬────────────┘     └─────────────────────────┘    └────────────┬────────────┘
             │                                                              │
             ▼                                                              ▼
┌─────────────────────────┐                                    ┌─────────────────────────┐
│ Prediction Engine &     │                                    │ Background Worker Loop  │
│ Gupta Nadi Engine       │                                    │ (7-Stage Career PDF     │
└────────────┬────────────┘                                    │  LaTeX Compilation)     │
             │                                                 └────────────┬────────────┘
             ▼                                                              │
┌─────────────────────────┐                                                 │
│ External LLM Provider   │◄────────────────────────────────────────────────┘
│ (OpenRouter / Gemini)   │
│ *Text Synthesis Only*   │
└─────────────────────────┘
```

### Core Subsystems & Components
1. **Astrology Engine (`packages/astrology-engine`)**:
   - The foundational, zero-network-dependency computation engine.
   - Calculates 100% deterministic planetary positions, house cusps, divisional vargas (D1–D60), dashas, shadbala, ashtakavarga, yogas, gochara transits, and special lagnas using astronomical ephemeris and classical Vedic/Nadi algorithms.
2. **Fastify Backend API (`apps/api`)**:
   - High-throughput REST API serving `/api/v1/*`.
   - Handles authentication, birth profile persistence, astrology proxy calculations, admin workflows, and webhooks.
3. **Database Layer (PostgreSQL + Prisma ORM)**:
   - Houses transactional data: `User`, `RefreshToken`, `OtpVerification`, `BirthProfile`, `Order`, `Report`, `DeviceToken`, `Notification`, `NotificationPreference`, `AuditLog`, and `ConsultationSession`.
4. **Asynchronous Worker (`apps/api/src/worker.ts`)**:
   - Redis-backed background worker executing the 7-stage Career Report pipeline (Calculation → LLM Synthesis → LaTeX Template Rendering → Tectonic PDF Compilation → QA Validation → Cloud Storage Upload).
5. **Flutter Mobile Application (`apps/mobile`)**:
   - Consumer-facing mobile app built with Flutter & Riverpod.
   - Provides guest-mode exploration, birth chart visualization (North Indian Kundli), planetary analysis, Rashi Bhavishya horoscopes, Vastu guides, PDF downloads, and the Jyoti AI chat interface.
6. **Next.js Admin Console (`apps/admin`)**:
   - Administrative portal built with Next.js 14 App Router and Vanilla CSS.
   - Features real-time Live Consultation Workspace, Analytics KPIs, User Management, Birth Profile inspect, Career Report debugging/regeneration, Payment audit, and System Diagnostics.
7. **Jyoti AI Assistant (`apps/api/src/modules/jyoti`)**:
   - Conversational assistant that formats deterministic chart evidence into human-friendly explanations.
8. **Payments (Razorpay Integration)**:
   - Order creation and webhook-driven signature-verified payment processing for premium reports and subscriptions.
9. **Push & In-App Notifications (`apps/api/src/modules/notifications`)**:
   - Firebase Cloud Messaging (FCM) integration and database-backed notification center for report delivery alerts.

### End-to-End Data Flow
```
[User Action on UI]
       │
       ▼
[Fastify API Endpoint] ──(Validates DTO via Zod)──► [Module Service]
                                                          │
                   ┌──────────────────────────────────────┴──────────────────────────────────────┐
                   ▼                                                                             ▼
       [Astrology Engine]                                                                [PostgreSQL Database]
   • Sweph / Ephemeris Coordinates                                                   • Fetch / Save Birth Profile
   • Deterministic Astrological Rules                                                • Check Auth & Entitlements
                   │                                                                             │
                   └──────────────────────────────────────┬──────────────────────────────────────┘
                                                          ▼
                                            [Rule / Evidence Matrix]
                                                          │
                         ┌────────────────────────────────┴────────────────────────────────┐
                         ▼                                                                 ▼
           (Raw API Response / UI Render)                                     (If Report / AI Consultation)
                         │                                                                 │
                         ▼                                                                 ▼
                [Flutter / Admin UI]                                             [LLM Prompt Assembly]
           • North Indian SVG Kundli                                         • Deterministic Evidence injected
           • Dasha Trees & Vargas                                            • Strict LLM instruction boundary
           • Planetary Dignity Tables                                                      │
                                                                                           ▼
                                                                                 [LLM Text Formatting]
                                                                                           │
                                                                                           ▼
                                                                               [LaTeX PDF / Chat Stream]
```

### Deterministic vs. AI/LLM Execution Boundary
* **100% Deterministic (Strictly Mathematical & Auditable)**:
  - Ephemeris coordinates, planetary longitudes, retrogrades, speeds, declinations.
  - Ascendant, House cusps (Whole Sign, Placidus, Sripati, Equal).
  - Divisional Charts (D1 through D60).
  - Vimshottari, Ashtottari, Yogini, Chara, Narayana, and Conditional Dashas.
  - Shadbala, Bhava Bala, Vimshopaka Bala, and Planetary Rays (Rashmis).
  - Ashtakavarga (BAV, SAV, Shodhana reductions, Shodhya Pindas).
  - 300+ Vedic Yogas, Jaimini Karakas, KP Sign/Star/Sub/Sub-sub lords.
  - Gochara transit hits, Vedha, Kaksha divisions, Sade Sati phases.
  - Panchanga (Tithi, Vara, Nakshatra, Yoga, Karana, Rahu Kaal, Muhurtas).
  - Ashtakoota 36-point Guna Milan and Manglik Dosha rules.
* **LLM / Generative AI (Strictly Formatting & Explanation)**:
  - Natural language translation and conversational formatting in Jyoti AI.
  - Synthesis of career guidance prose based solely on injected deterministic rule evidence in the 7-stage Career PDF generator.
  - **Hard Architectural Constraint**: The LLM *never* computes mathematical positions, aspects, or rules. It cannot modify or hallucinate chart coordinates.

---

## 2. Complete Feature Inventory

| Feature | What it does | Engine / Backend | API Endpoint | Flutter App | Admin Console | Where to Open / Access | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **D1 Natal Chart (Kundli)** | Computes planetary longitudes, rashis, nakshatras, whole-sign houses & North Indian chart layout | `packages/astrology-engine` | `POST /api/v1/astrology/chart` | Yes | Yes | **App:** Home → Birth Chart<br>**Admin:** Live Sessions → Select Client → Birth Chart | **Working** |
| **Divisional Charts (D2–D60)** | Calculates 16 classical Vargas (Hora, Drekkana, Navamsha D9, Dashamsha D10, etc.) | `packages/astrology-engine` | `POST /api/v1/astrology/vargas` | No | Yes | **Admin:** Live Sessions → [Session] → Vargas Tab | **Working** |
| **Vimshottari Dasha** | Computes 120-year multi-tier dasha timeline (Maha → Antar → Pratyantar) with active period locator | `packages/astrology-engine` | `POST /api/v1/astrology/dasha` | No | Yes | **Admin:** Live Sessions → [Session] → Dashas Tab | **Working** |
| **Ashtottari & Extra Dashas** | Computes 108-year Ashtottari, Yogini, Chara, Narayana, and conditional dasha systems | `packages/astrology-engine` | `POST /api/v1/astrology/dasha` | No | Partial (via API/Logs) | **Backend / Diagnostics API** | **Working (Engine/API)** |
| **Planetary Positions & Dignity** | Evaluates planetary exaltation, debilitation, moolatrikona, combustion, and aspects | `packages/astrology-engine` | `POST /api/v1/astrology/chart` | Yes | Yes | **App:** Home → Planetary Placements<br>**Admin:** Live Sessions → [Session] → Planets Tab | **Working** |
| **Houses & Bhavas** | Analyzes 12 houses, bhava lords, occupants, and incoming drishti aspects | `packages/astrology-engine` | `POST /api/v1/astrology/chart` | Yes | Yes | **App:** Birth Chart → Houses Tab<br>**Admin:** Live Sessions → [Session] → Houses Tab | **Working** |
| **Daily Panchanga** | Computes 5 pillars: Tithi, Vara, Nakshatra, Yoga, Karana + Rahu Kaal, Muhurtas | `packages/astrology-engine` | `POST /api/v1/astrology/panchang` | No | Yes | **Admin:** Live Sessions → [Session] → Panchanga Tab | **Working** |
| **Vedic Yogas** | Evaluates 300+ classical Yogas (Pancha Mahapurusha, Raja, Dhana, Neecha Bhanga, etc.) | `packages/astrology-engine` | `POST /api/v1/astrology/yogas`<br>`POST /api/v1/astrology/predictions` | No | Yes | **Admin:** Live Sessions → Yogas Tab<br>**Admin:** Astrology Diagnostics (`/astrology-diagnostics`) | **Working** |
| **Ashtakavarga Matrix** | Computes BAV, SAV, Prastara matrices, Shodhana reductions, and Shodhya Pindas | `packages/astrology-engine` | `POST /api/v1/astrology/ashtakavarga` | No | Yes | **Admin:** Live Sessions → Ashtakavarga Tab | **Working** |
| **Shadbala & Bhava Bala** | Calculates 6-fold planetary strength (Sthana, Dig, Kala, Cheshta, Naisargika, Drik) and house strength | `packages/astrology-engine` | `POST /api/v1/astrology/strength` | No | Yes | **Admin:** Live Sessions → Shadbala Tab | **Working** |
| **Jaimini System** | Calculates 7/8 Chara Karakas, 12 Arudha Padas (AL/UL), Rashi Drishti, and Argala | `packages/astrology-engine` | `POST /api/v1/astrology/jaimini` | No | Yes | **Admin:** Live Sessions → Jaimini Tab | **Working** |
| **KP System** | Placidus cusps, 4-tier lordships (Sign, Star, Sub, Sub-sub via 249 sub table), 4-level Significators | `packages/astrology-engine` | `POST /api/v1/astrology/kp` | No | Yes | **Admin:** Live Sessions → KP Tab | **Working** |
| **Gochara (Transits)** | Real-time transit positions against natal Moon/Lagna, Vedha, Kaksha, and transit timeline | `packages/astrology-engine` | `POST /api/v1/astrology/gochara`<br>`POST /api/v1/astrology/gochara/timeline` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/gochara`) | **Working (Engine/API)** |
| **Sade Sati & Dhaiyya** | Evaluates 7.5-year Saturn transit cycles and 2.5-year Kantaka/Ashtama Dhaiyya | `packages/astrology-engine` | `POST /api/v1/astrology/sade-sati` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/sade-sati`) | **Working (Engine/API)** |
| **Special Points & Upagrahas** | Dhooma, Vyatipata, Gulika, Mandi, Special Lagnas, 64th Navamsha, 22nd Drekkana, Yogi | `packages/astrology-engine` | `POST /api/v1/astrology/special-points` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/special-points`) | **Working (Engine/API)** |
| **Varshaphala (Solar Return)** | Tajika solar return, Muntha, Varshesha, Harsha Bala, 16 Tajika Yogas, Sahams, Mudda Dasha | `packages/astrology-engine` | `POST /api/v1/astrology/varshaphala` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/varshaphala`) | **Working (Engine/API)** |
| **Prashna (Horary)** | Horary chart calculation, Chandra analysis, Trisphuta/Chatusphuta, 1–108 / 1–249 numbers | `packages/astrology-engine` | `POST /api/v1/astrology/prashna` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/prashna`) | **Working (Engine/API)** |
| **Matchmaking (Kundli Milan)** | 36-point Ashtakoota Guna Milan and independent Manglik Dosha evaluation | `packages/astrology-engine` | `POST /api/v1/astrology/matchmaking`<br>`POST /api/v1/astrology/compatibility` | No | No (Engine/API only) | **Backend API** (`/api/v1/astrology/compatibility`) | **Working (Engine/API)** |
| **Rashi Bhavishya** | Daily horoscope insights per Moon sign with planetary transit context | `apps/api/src/modules/rashi-bhavishya` | `GET /api/v1/rashi-bhavishya` | Yes | No | **App:** Home → Rashi Bhavishya Card | **Working** |
| **Vastu Shastra Guide** | Directional guides, room zoning recommendations, and dosha remedies | `apps/api/src/modules/vastu` | `GET /api/v1/vastu/directions` | Yes | No | **App:** Home → Quick Access → Vastu | **Working** |
| **Jyoti AI Assistant** | Conversational assistant aware of active birth profile, screen, and deterministic evidence | `apps/api/src/modules/jyoti` | `POST /api/v1/jyoti/chat` | Yes | Yes | **App:** Floating Action Button / Home Card<br>**Admin:** Live Sessions → Jyoti Tab & `/jyoti` | **Working** |
| **7-Stage Career PDF Report** | LaTeX-compiled multi-page career dossier with charts, yogas, and career synthesis | `packages/report-engine`<br>`apps/api/src/worker.ts` | `POST /api/v1/reports/career`<br>`GET /api/v1/reports/:id/pdf` | Yes | Yes | **App:** Reports Tab → Career Report<br>**Admin:** Career Reports (`/reports`) → View/Regenerate | **Working** |
| **Live Consultation Workspace** | Interactive one-on-one session environment with notes, tags, Kundli, and real-time tabs | `apps/api/src/modules/admin` | `POST /api/v1/admin/live-sessions`<br>`GET /api/v1/admin/live-sessions/:id` | No | Yes | **Admin:** Sidebar → Live Session (`/live-sessions`) | **Working** |
| **Admin Analytics** | Operational dashboard with user growth, report throughput, revenue, and system health | `apps/api/src/modules/admin` | `GET /api/v1/admin/analytics/overview`<br>`GET /api/v1/admin/analytics/*` | No | Yes | **Admin:** Sidebar → Analytics (`/analytics`) | **Working** |
| **User & Staff RBAC** | Role-based user management, role elevation, suspension, session revocation, audit logs | `apps/api/src/modules/admin` | `GET /api/v1/admin/users`<br>`PATCH /api/v1/admin/users/:id/role` | No | Yes | **Admin:** Sidebar → Users (`/users`) & Admin Staff (`/admin-users`) | **Working** |

---

## 3. Astrology Engine: Deep-Dive Capability Breakdown

### Group A: Core Kundli & Fundamentals
- **Calculations**:
  - Exact sidereal longitudes for 9 core Grahas (Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani, Rahu, Ketu) + outer planets (Uranus, Neptune, Pluto).
  - True/Mean Lunar Node positions.
  - Ascendant (Lagna) and 12 Bhavas under Whole Sign, Equal, and Sripati house systems.
  - 27 Nakshatras with 108 Pada divisions, nakshatra lords, sub-lords, deities, and symbols.
  - Planetary dignity evaluation (Ucha/Exaltation, Neecha/Debilitation, Moolatrikona, Swakshetra/Own Sign, Mitra/Friendly, Shatru/Enemy, Sama/Neutral), Combust status (Asta), and Retrograde motion (Vakra).
- **Output Data**: `AstroChartModel` containing `ascendant`, `planets[]`, `houses[]`, `calculationVersion`, and metadata.
- **API Exposing It**: `POST /api/v1/astrology/chart`, `POST /api/v1/astrology/kundli`.
- **UI Consuming It**:
  - Flutter: `BirthChartScreen`, `PlanetsScreen`, `PlanetDetailScreen`.
  - Admin: `ConsultationWorkspace` (`birth-chart`, `planets`, `houses` tabs), `KundliChartSvg`.

### Group B: Divisional Charts (Vargas D1 to D60)
- **Calculations**:
  - Classical Parashari divisional mappings:
    - **D1 (Rashi)**: Physical body and general destiny.
    - **D2 (Hora)**: Wealth and assets.
    - **D3 (Drekkana)**: Siblings, courage, vitality.
    - **D4 (Chaturthamsha)**: Fixed assets, home, conveyances.
    - **D7 (Saptamsha)**: Progeny, children, lineage.
    - **D9 (Navamsha)**: Marriage, spouse, dharma, inherent strength.
    - **D10 (Dashamsha)**: Career, profession, public status.
    - **D12 (Dwadashamsha)**: Parents, ancestral heritage.
    - **D16 (Shodashamsha)**: Vehicles, comforts, luxuries.
    - **D20 (Vimshamsha)**: Spiritual progress and upasana.
    - **D24 (Chaturvimshamsha)**: Higher learning and academic knowledge.
    - **D27 (Saptavimshamsha)**: General strengths, weaknesses, vulnerabilities.
    - **D30 (Trimshamsha)**: Arishta, misfortunes, doshas, character flaws.
    - **D40 (Khavedamsha)**: Auspicious/inauspicious effects.
    - **D45 (Akshavedamsha)**: General character purity and finer indications.
    - **D60 (Shashtiamsha)**: Root past-life karma and subtle destiny.
- **Output Data**: Placements per varga with sign, lord, occupants, and dignity.
- **API Exposing It**: `POST /api/v1/astrology/vargas`.
- **UI Consuming It**: Admin Console → Live Sessions → `vargas` tab (with D1–D60 dropdown).

### Group C: Planetary & Rashi Dashas
- **Calculations**:
  - **Vimshottari (120 Years)**: Nakshatra-based Moon longitude start; computes Mahadashas (9 lords: Ke, Ve, Su, Mo, Ma, Ra, Ju, Sa, Me), Antardashas, and Pratyantardashas with precise start/end ISO timestamps.
  - **Ashtottari (108 Years)**: Rahu/Ardra eligibility conditions; 8-planet cycle.
  - **Yogini (36 Years)**: 8 Yoginis (Mangala, Pingala, Dhanya, Bhramari, Bhadrika, Ulka, Siddha, Sankata).
  - **Chara Dasha (Jaimini)**: Sign-based movable dasha calculated from Lagna/Atmakaraka.
  - **Narayana Dasha**: Parashari sign-based progression from 1st/7th house.
  - **Kalachakra Dasha**: Savya/Apasavya Nakshatra progression with Deha/Jeeva rashis.
  - **Conditional Dashas**: Dwisaptati Sama (72-yr), Shat-Trimshat Sama (36-yr), Shodashottari (116-yr), Dwadashottari (112-yr).
- **Output Data**: Hierarchical dasha tree, start dates, end dates, active markers.
- **API Exposing It**: `POST /api/v1/astrology/dasha`, `POST /api/v1/astrology/dashas`.
- **UI Consuming It**: Admin Console → Live Sessions → `dashas` tab.

### Group D: Planetary & House Strengths (Balas)
- **Calculations**:
  - **Shadbala (6-Fold Strength)**:
    1. *Sthana Bala* (Positional: Uccha, Saptavargiya, Ojayugmarashi, Kendradi, Drekkana).
    2. *Dig Bala* (Directional strength in East, North, West, South).
    3. *Kala Bala* (Temporal: Natonnata, Paksha, Tribhaga, Varsha/Masa/Dina/Hora lords, Ayana, Yuddha).
    4. *Cheshta Bala* (Motional speed/retrograde strength).
    5. *Naisargika Bala* (Natural inherent luminosity strength: Sun > Moon > Venus > Jupiter > Mercury > Mars > Saturn).
    6. *Drik Bala* (Aspectual strength from benefic/malefic drishti).
    - Computes total Virupas, Rupas, required minimum threshold, and relative strength ratios.
  - **Bhava Bala**: House strength derived from Bhavadhipati Bala, Bhava Dig Bala, and Bhava Drishti Bala.
  - **Vimshopaka Bala**: Classical 20-point divisional dignity weighting across Shadvarga (6), Saptavarga (7), Dashavarga (10), and Shodashavarga (16).
  - **Planetary Rays (Rashmis)** & Ishta/Kashta Phala.
- **Output Data**: Detailed breakdown of virupas per category, pass/fail status, ranked strength list.
- **API Exposing It**: `POST /api/v1/astrology/strength`, `POST /api/v1/astrology/vimshopaka`.
- **UI Consuming It**: Admin Console → Live Sessions → `shadbala` tab (and `/astrology-diagnostics`).

### Group E: Ashtakavarga
- **Calculations**:
  - **Bhinnashtakavarga (BAV)**: Individual bindu contribution charts for 7 planets and Lagna across 12 signs (total 337 bindus).
  - **Sarvashtakavarga (SAV)**: Aggregate bindu distribution across 12 signs.
  - **Prastara Ashtakavarga**: 8x8 sub-distribution matrices per planet.
  - **Trikona Shodhana**: Triangular reduction between trinal signs (1-5-9, 2-6-10, 3-7-11, 4-8-12).
  - **Ekadhipatya Shodhana**: Reduction for signs with the same planetary lord.
  - **Shodhya Pindas**: Graha Pinda, Rashi Pinda, and Yoga Pinda calculations.
- **Output Data**: 12-sign arrays for SAV, 7x12 matrices for BAV, reduction results, and final Pindas.
- **API Exposing It**: `POST /api/v1/astrology/ashtakavarga`.
- **UI Consuming It**: Admin Console → Live Sessions → `ashtakavarga` tab.

### Group F: Classical Vedic Yogas
- **Calculations**:
  - Over 300 classical astrological combinations evaluated deterministically:
    - *Pancha Mahapurusha*: Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus), Sasa (Saturn) in Kendra in own/exalted sign.
    - *Solar & Lunar Yogas*: Sunapha, Anapha, Durdhara, Kemadruma, Veshi, Voshi, Ubhayachari, Gajakesari, Chandramangala, Amala.
    - *Raja & Dhana Yogas*: Kendra-Trikona lord associations, 1st-2nd-5th-9th-11th lord combinations, Lakshmi Yoga, Saraswati Yoga.
    - *Neecha Bhanga Raja Yoga*: Complete evaluation of 4 classical cancellation conditions.
    - *Parivartana Yogas*: Maha, Dainya, and Khala mutual house exchanges.
    - *Viparita Raja Yogas*: Harsha (6th in 6th/8th/12th), Sarala (8th), Vimala (12th).
- **Output Data**: List of triggered yogas, rule codes, description, benefic/malefic impact, participating planets, and confidence scores.
- **API Exposing It**: `POST /api/v1/astrology/yogas`, `POST /api/v1/astrology/predictions`.
- **UI Consuming It**: Admin Console → Live Sessions → `yogas` tab; Admin → Astrology Diagnostics (`/astrology-diagnostics`).

### Group G: Gochara (Transits) & Sade Sati
- **Calculations**:
  - Real-time transit positions computed against natal Moon and Lagna.
  - Classical house transit results (e.g. Jupiter in 2, 5, 7, 9, 11 from Moon).
  - Vedha (obstruction points) and Vipareeta Vedha checks.
  - Kaksha sub-transit divisions (each sign divided into 8 equal 3°45' kakshas).
  - Chronological transit timeline (sign ingresses, nakshatra ingresses, retrogrades, direct stations) over up to 730 days.
  - 7.5-year Sade Sati phases (Phase 1 Setting, Phase 2 Peak, Phase 3 Rising) and 2.5-year Kantaka/Ashtama Dhaiyya.
- **Output Data**: Transit houses, vedha flags, benefic scores, timeline dates, and active Sade Sati stage.
- **API Exposing It**: `POST /api/v1/astrology/gochara`, `POST /api/v1/astrology/gochara/timeline`, `POST /api/v1/astrology/sade-sati`.
- **UI Consuming It**: Implemented in backend API; exposed via Diagnostics API.

### Group H: Panchanga (Five Cosmic Pillars)
- **Calculations**:
  - **Tithi**: Angular distance between Moon and Sun (12° per Tithi; Shukla 1–15, Krishna 1–15) with exact start, end, and % elapsed.
  - **Vara**: Vedic weekday (Sunday to Saturday) with presiding planetary lord (Varesh).
  - **Nakshatra**: Natal Moon nakshatra with pada, lord, and deity.
  - **Yoga**: 27 Nitya Yogas (Vishkambha to Vaidhriti) based on Sun + Moon longitude sum.
  - **Karana**: Half-tithi (11 Karanas: Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti/Bhadra + 4 fixed).
  - **Auspicious / Inauspicious Timings**: Sunrise, Sunset, Rahu Kaal, Yamaghanda, Gulika Kaal, Abhijit Muhurta, Brahma Muhurta, Choghadiya.
- **Output Data**: Tithi, Vara, Nakshatra, Yoga, Karana details and muhurta windows.
- **API Exposing It**: `POST /api/v1/astrology/panchang`.
- **UI Consuming It**: Admin Console → Live Sessions → `panchanga` tab.

### Group I: Jaimini Astrology
- **Calculations**:
  - **Chara Karakas (7 or 8 scheme)**: Atmakaraka (AK), Amatyakaraka (AmK), Bhratrukaraka (BK), Matrukaraka (MK), Pitrukaraka (PiK), Putrakaraka (PK), Gnatikaraka (GK), Darakaraka (DK) based on highest degree.
  - **12 Arudha Padas**: Calculation of Arudha Lagna (AL / A1) through Upapada Lagna (UL / A12) with classical 10th/4th house exception rules.
  - **Rashi Drishti (Sign Aspects)**: Movable signs aspect fixed (except adjacent), fixed aspect movable, dual aspect dual.
  - **Argala & Virodha Argala**: Intervention of 2nd, 4th, 11th houses countered by 12th, 10th, 3rd houses.
  - **Karakamsha Lagna**: Navamsha placement of the Atmakaraka.
- **Output Data**: Karaka table, Arudha pada list, Rashi aspect matrices, and Argala interferences.
- **API Exposing It**: `POST /api/v1/astrology/jaimini`.
- **UI Consuming It**: Admin Console → Live Sessions → `jaimini` tab.

### Group J: KP System (Krishnamurti Padhdhati)
- **Calculations**:
  - Placidus Semi-Arc House Cusps (Cusps 1 to 12).
  - 4-Tier Planetary Lordships: Sign Lord, Star (Nakshatra) Lord, Sub Lord, Sub-Sub Lord determined via the classical 249 Sub Table.
  - 4-Level House Significators:
    - *Level A*: Planets in the star of a house occupant.
    - *Level B*: Planets occupying the house.
    - *Level C*: Planets in the star of the house lord.
    - *Level D*: The lord of the house itself.
  - Ruling Planets (RP): Ascendant Star Lord, Ascendant Sign Lord, Moon Star Lord, Moon Sign Lord, Day Lord.
  - Pars Fortuna (Fortuna Point).
- **Output Data**: KP cusp table, planetary sub table, significator matrix, and ruling planets.
- **API Exposing It**: `POST /api/v1/astrology/kp`.
- **UI Consuming It**: Admin Console → Live Sessions → `kp` tab.

### Group K: Special Points, Upagrahas & Lagnas
- **Calculations**:
  - **Mathematical Upagrahas**: Dhooma, Vyatipata, Parivesha, Indrachapa, Upaketu.
  - **Time-Based Upagrahas**: Gulika, Mandi, Yamaghanta, Ardhaprahara, Kaala.
  - **Special Lagnas**: Bhava Lagna, Hora Lagna, Ghatika Lagna, Indu Lagna, Pranapada Lagna, Varnada Lagna, Sree Lagna.
  - **Arishta Sensitive Points**: 64th Navamsha (Kha-Chatushtaya), 22nd Drekkana, Sarpa Drekkana.
  - **Yogi, Avyogi & Duplicate Yogi (Sahayogi)**: Auspicious and obstructive destiny degree points.
  - **Mrityu Bhaga**: Fatal degree markers for all 9 planets and Lagna.
- **Output Data**: Exact longitudes, rashis, nakshatras, and vulnerability warnings.
- **API Exposing It**: `POST /api/v1/astrology/special-points`.
- **UI Consuming It**: Implemented in backend API; exposed via Diagnostics API.

### Group L: Varshaphala (Tajika Solar Return)
- **Calculations**:
  - Exact astronomical timestamp when the transiting Sun returns to its exact natal sidereal longitude.
  - Varsha Lagna and Muntha position progression (1 sign per solar year).
  - Panchadhikari (5 Office Bearers) & Varshesha (Year Lord calculation via Harsha Bala).
  - Harsha Bala: 4-fold Tajika strength (Sthanabala, Ucchabala, Hadda Bala, Drekkana Bala).
  - Tajika Aspects & 16 Classical Tajika Yogas (Ithasala, Esharpha, Nakta, Yamaya, Kamboola, etc.).
  - 36 Classical Sahams (Punya Saham, Vidya Saham, Karma Saham, Vivaha Saham, etc.).
  - Mudda Dasha: Annual Vimshottari progression mapped to 365 days.
- **Output Data**: Solar return chart, year lord, active Tajika yogas, sahams, and Mudda dasha schedule.
- **API Exposing It**: `POST /api/v1/astrology/varshaphala`.
- **UI Consuming It**: Implemented in backend API; exposed via Diagnostics API.

### Group M: Prashna (Horary Astrology)
- **Calculations**:
  - Calculation of Prashna chart at the exact moment of query.
  - Whole Sign and KP Placidus house cusps for Prashna Lagna.
  - Chandra (Moon) analysis: placement, nakshatra, and aspects.
  - Instantaneous Prashna Panchanga and Gulika placement.
  - Classical Sphutas:
    - *Trisphuta* = Lagna + Chandra + Gulika.
    - *Chatusphuta* = Trisphuta + Surya.
    - *Panchasphuta* = Chatusphuta + Rahu.
  - Seed-number resolution: Parashari (1 to 108) or KP (1 to 249).
- **Output Data**: Prashna Lagna, planets, sphutas, and question number cusps.
- **API Exposing It**: `POST /api/v1/astrology/prashna`.
- **UI Consuming It**: Implemented in backend API; exposed via Diagnostics API.

### Group N: Matchmaking (Kundli Milan / Ashtakoota)
- **Calculations**:
  - **36-Point Ashtakoota System**:
    1. *Varna* (1 Point): Spiritual ego and work capacity.
    2. *Vashya* (2 Points): Mutual dominance and attraction.
    3. *Tara / Dina* (3 Points): Health, destiny, longevity.
    4. *Yoni* (4 Points): Physical and biological compatibility.
    5. *Graha Maitri* (5 Points): Mental and friendship harmony.
    6. *Gana* (6 Points): Temperament (Deva, Manushya, Rakshasa).
    7. *Bhakoot* (7 Points): Love, emotional flow, family welfare (6/8, 9/5, 12/2 doshas).
    8. *Nadi* (8 Points): Genetic, biological, nervous compatibility (Aadi, Madhya, Antya).
  - **Manglik Dosha (Kuja Dosha)**: Independent evaluation for Bride and Groom from Lagna, Moon, and Venus across 1st, 2nd, 4th, 7th, 8th, 12th houses, including classical cancellation conditions.
- **Output Data**: Individual Koota scores, total out of 36, dosha presence, cancellation flags, and final verdict.
- **API Exposing It**: `POST /api/v1/astrology/matchmaking`, `POST /api/v1/astrology/compatibility`.
- **UI Consuming It**: Implemented in backend API; exposed via Diagnostics API.

---

## 4. Most Important: Where Can I See It?

### Manual Navigation Paths in the Flutter App

#### 1. D1 Natal Chart & Planets & Houses & Nakshatra
1. Open Flutter App.
2. (Optional) Log in, or proceed as Guest.
3. If no profile exists, tap **"Create Birth Profile"** (enter Name, DOB, Time, City).
4. On Home screen, tap the **"Birth Chart"** card in the Hero section or Quick Access.
5. In `BirthChartScreen`, use the 4 top segment tabs:
   - **Chart**: Interactive North Indian diamond Kundli SVG with planet glyphs.
   - **Planets**: Tabular list of 9 Grahas with Sign, Degree, Nakshatra, Pada, Retrograde, and Dignity tags.
   - **Houses**: 12 Bhava cards showing Rashi, House Lord, Occupants, and Aspecting planets.
   - **Nakshatra**: Detailed birth constellation properties, lord, and deity.
6. Tap the top-right PDF icon to generate/share a local Kundli PDF.

#### 2. Planetary Placements (Dedicated List)
1. Open Flutter App.
2. On Home screen, scroll to Quick Access and tap **"Planets"**.
3. View the list of planets with colored sign badges and dignity chips.
4. Tap any planet (e.g. Jupiter) to open `PlanetDetailScreen` showing full sign, degree, house, and astronomical metrics.

#### 3. Rashi Bhavishya (Daily Horoscopes)
1. Open Flutter App.
2. On Home screen, tap the **"Rashi Bhavishya"** section card.
3. In `RashiBhavishyaScreen`, tap through the 12 zodiac sign tabs (Mesha to Meena).
4. Read the daily forecast, lucky colors, lucky numbers, and transit summaries.

#### 4. Vastu Shastra Guidelines
1. Open Flutter App.
2. On Home screen, tap **"Vastu"** in Quick Access.
3. In `VastuScreen`, browse 8 compass directions (North, North-East, East, South-East, South, South-West, West, North-West).
4. Tap any direction to open `VastuDetailScreen` for recommended rooms, elements, and corrective remedies.

#### 5. Jyoti AI Assistant
1. Open Flutter App.
2. On Home screen, tap either the **Floating Action Button** (bottom right) or the **"Ask Jyoti"** card.
3. In `JyotiChatScreen`, type a question (e.g. *"What are the key career planets in my chart?"*).
4. Jyoti responds using the active profile's deterministic chart data. Tap action buttons (e.g. *"View Kundli"*) to navigate within the app.

#### 6. Career Report Generation & PDF Viewer
1. Open Flutter App.
2. Tap the bottom navigation bar **"Reports"** tab.
3. In `ReportsScreen`, tap **"Generate Career Dossier"**.
4. In `CareerReportOverviewScreen`, select an active birth profile and tap **"Generate Report"**.
5. The app polls the 7-stage pipeline with a live progress indicator.
6. When complete, tap **"View PDF"** to open `CareerReportPdfScreen` and read/share the compiled document.

---

### Manual Navigation Paths in the Admin Dashboard

#### 1. Live Consultation Workspace (Complete Consultation Suite)
1. Open browser at `http://localhost:3000/login`.
2. Log in with admin credentials (`admin@astrosushil.com` / `AdminPass123!`).
3. In the sidebar, click **"Live Session"** (`/live-sessions`).
4. Select an existing client user and birth profile, then click **"Start Live Consultation"**.
5. In `ConsultationWorkspace` (`/live-sessions/[sessionId]`), access the tab bar:
   - **Birth Chart (Kundli)**: Live North Indian chart rendering.
   - **Planets**: Planetary placements, exaltation/debilitation dignities, speeds, and nakshatras.
   - **Houses**: 12 Bhavas with lords, occupants, and incoming drishti.
   - **Vargas**: Divisional charts selector (D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60).
   - **Dashas**: Hierarchical Vimshottari Dasha tree with active Mahadasha, Antardasha, and Pratyantardasha.
   - **Yogas**: List of active Vedic Yogas with rule codes and descriptions.
   - **Panchanga**: 5 pillars (Tithi, Vara, Nakshatra, Yoga, Karana) + Rahu Kaal and Muhurtas.
   - **Ashtakavarga**: Sarvashtakavarga (SAV) bindu matrix across 12 signs.
   - **Shadbala**: 6-fold planetary strength virupas and ranking.
   - **Jaimini**: Chara Karakas (AK to DK), Arudha Padas (AL/UL), and Argala.
   - **KP System**: Placidus cusps and 4-tier Sign/Star/Sub/Sub-sub lords.
   - **Jyoti AI**: In-workspace AI assistant for real-time astrologer queries.
   - **Notes**: Rich consultation notepad with section tagging and autosave.
   - **Observations**: Color-coded session tags (`IMPORTANT`, `FOLLOW_UP`, `DISCUSSED`, `REPORT_NEEDED`).
   - **Reports**: View and trigger client PDF reports directly from the session.
6. Click **"End Session"** in the top bar to record duration and conclude.

#### 2. Astrology Diagnostics & Intelligence
1. Log in to Admin Console.
2. In the sidebar, click **"Astrology Intelligence"** (`/astrology-diagnostics`).
3. Paste any Birth Profile UUID (e.g. `33333333-3333-3333-3333-333333333333`).
4. Select a Domain Category (`CAREER`, `MONEY`, `RELATIONSHIPS`, `HEALTH_GENERAL`, `TIMING`).
5. Click **"Run Diagnostics"**.
6. Inspect the raw deterministic evidence facts, triggered rule codes, confidence ratings, and explanation traces.

#### 3. Career Reports & Pipeline Debugging
1. Log in to Admin Console.
2. In the sidebar, click **"Career Reports"** (`/reports`).
3. View the table of all generated and queued reports with stage badges (`CALCULATING`, `ANALYZING`, `COMPILING`, `COMPLETED`, `FAILED`).
4. Click any report to view pipeline logs, error traces, and page count.
5. (Super Admin / Admin) Click **"Regenerate Report"** to force re-execution through the worker.

#### 4. Analytics & Operational KPIs
1. Log in to Admin Console.
2. In the sidebar, click **"Analytics"** (`/analytics`).
3. Switch tabs: **Overview**, **Users**, **Reports**, **Jyoti AI**, **Revenue**, **System Health**.
4. Adjust date ranges (7D, 30D, 90D, 1Y) and click **"Export CSV"** for reporting.

---

## 5. "Where is Everything?" Architectural Map

```
D1 NATAL KUNDLI
├── Engine:   packages/astrology-engine/src/chart/
├── API:      POST /api/v1/astrology/chart
├── Flutter:  lib/features/astrology/screens/birth_chart_screen.dart
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'birth-chart')

DIVISIONAL CHARTS (VARGAS D1–D60)
├── Engine:   packages/astrology-engine/src/varga/
├── API:      POST /api/v1/astrology/vargas
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'vargas')

VIMSHOTTARI DASHA
├── Engine:   packages/astrology-engine/src/dasha/
├── API:      POST /api/v1/astrology/dasha
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'dashas')

DAILY PANCHANGA
├── Engine:   packages/astrology-engine/src/panchang/
├── API:      POST /api/v1/astrology/panchang
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'panchanga')

VEDIC YOGAS & PREDICTIONS
├── Engine:   packages/astrology-engine/src/yoga/ & packages/prediction-engine
├── API:      POST /api/v1/astrology/yogas & POST /api/v1/astrology/predictions
├── Flutter:  [Integrated inside Career Report View]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'yogas') & /astrology-diagnostics

ASHTAKAVARGA (BAV / SAV)
├── Engine:   packages/astrology-engine/src/ashtakavarga/
├── API:      POST /api/v1/astrology/ashtakavarga
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'ashtakavarga')

SHADBALA & BHAVA BALA
├── Engine:   packages/astrology-engine/src/strength/
├── API:      POST /api/v1/astrology/strength
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'shadbala')

JAIMINI KARAKAS & ARUDHAS
├── Engine:   packages/astrology-engine/src/jaimini/
├── API:      POST /api/v1/astrology/jaimini
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'jaimini')

KP SYSTEM (PLACIDUS & 249 SUBS)
├── Engine:   packages/astrology-engine/src/kp/
├── API:      POST /api/v1/astrology/kp
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'kp')

GOCHARA (TRANSITS) & SADE SATI
├── Engine:   packages/astrology-engine/src/transit/
├── API:      POST /api/v1/astrology/gochara & POST /api/v1/astrology/sade-sati
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    [Implemented in backend; accessible via Diagnostics API]

SPECIAL POINTS & UPAGRAHAS
├── Engine:   packages/astrology-engine/src/special-points/
├── API:      POST /api/v1/astrology/special-points
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    [Implemented in backend; accessible via Diagnostics API]

VARSHAPHALA (TAJIKA SOLAR RETURN)
├── Engine:   packages/astrology-engine/src/varshaphala/
├── API:      POST /api/v1/astrology/varshaphala
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    [Implemented in backend; accessible via Diagnostics API]

PRASHNA (HORARY)
├── Engine:   packages/astrology-engine/src/prashna/
├── API:      POST /api/v1/astrology/prashna
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    [Implemented in backend; accessible via Diagnostics API]

MATCHMAKING (ASHTAKOOTA 36 GUNA & MANGLIK)
├── Engine:   packages/astrology-engine/src/matchmaking/
├── API:      POST /api/v1/astrology/compatibility & /matchmaking
├── Flutter:  [Implemented in backend; no user-facing Flutter UI]
└── Admin:    [Implemented in backend; accessible via Diagnostics API]

JYOTI AI CONVERSATIONAL ASSISTANT
├── Engine:   apps/api/src/modules/jyoti/
├── API:      POST /api/v1/jyoti/chat
├── Flutter:  lib/features/jyoti/screens/jyoti_chat_screen.dart
└── Admin:    app/live-sessions/[sessionId]/ConsultationWorkspace.tsx (Tab: 'jyoti') & app/jyoti/page.tsx

7-STAGE CAREER PDF REPORT
├── Engine:   packages/report-engine & apps/api/src/worker.ts
├── API:      POST /api/v1/reports/career & GET /api/v1/reports/:id/pdf
├── Flutter:  lib/features/reports/screens/career_report_overview_screen.dart & career_report_pdf_screen.dart
└── Admin:    app/reports/page.tsx & /reports/[id]
```

---

## 6. Flutter Mobile App Walkthrough

### Complete User Journey
```
[App Launch] ──► [Splash / Session Check]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Unauthenticated]             [Authenticated]
         │                           │
         ├─► [LoginScreen]           └─► [HomeScreen] (Bottom Nav)
         ├─► [RegisterScreen]                 ├─► Tab 0: Home (_HomeTabContentView)
         ├─► [ForgotPassword]                 │     ├─► Hero: BirthChartScreen
         └─► [Continue as Guest]              │     ├─► Quick Access: Planets, Vastu, Jyoti
                                              │     ├─► Card: RashiBhavishyaScreen
                                              │     └─► Card: GuptaNadiModal (Bottom Sheet)
                                              ├─► Tab 1: ReportsScreen
                                              │     └─► CareerReportOverviewScreen
                                              │           └─► CareerReportPdfScreen
                                              └─► Tab 2: ProfileScreen
                                                    ├─► BirthProfileListScreen
                                                    │     └─► CreateBirthProfileScreen
                                                    └─► Account / Logout
```

### Screen Directory & Metadata

#### 1. HomeScreen & Tab Shell
- **Screen Name**: `HomeScreen`
- **Route / Widget**: `lib/home/screens/home_screen.dart`
- **How to Open**: Default root destination on app launch or login.
- **API Called**: `GET /api/v1/birth-profiles`, `GET /api/v1/reports`, `GET /api/v1/rashi-bhavishya`.
- **Data Displayed**: Active user welcome, hero chart summary card, quick navigation grid, Rashi Bhavishya carousel, recent reports overview.
- **Engine Involved**: Aggregated via backend services.

#### 2. BirthChartScreen
- **Screen Name**: `BirthChartScreen`
- **Route / Widget**: `lib/features/astrology/screens/birth_chart_screen.dart`
- **How to Open**: Home → Tap Hero Kundli card or Quick Access "Birth Chart".
- **API Called**: `POST /api/v1/astrology/chart` (with `birthProfileId`).
- **Data Displayed**: Interactive North Indian diamond Kundli SVG, planetary positions table, house analysis, nakshatra breakdown.
- **Engine Involved**: `packages/astrology-engine`.

#### 3. PlanetsScreen & PlanetDetailScreen
- **Screen Name**: `PlanetsScreen` / `PlanetDetailScreen`
- **Route / Widget**: `lib/features/astrology/screens/planets_screen.dart`, `planet_detail_screen.dart`
- **How to Open**: Home → Quick Access "Planets" → Tap specific planet card.
- **API Called**: `POST /api/v1/astrology/chart`.
- **Data Displayed**: Longitude, rashi, nakshatra, pada, retrograde state, speed, combustion, and exaltation/debilitation dignity.
- **Engine Involved**: `packages/astrology-engine`.

#### 4. RashiBhavishyaScreen
- **Screen Name**: `RashiBhavishyaScreen`
- **Route / Widget**: `lib/features/astrology/screens/rashi_bhavishya_screen.dart`
- **How to Open**: Home → Tap "Rashi Bhavishya" card.
- **API Called**: `GET /api/v1/rashi-bhavishya`.
- **Data Displayed**: 12-sign daily horoscope tabs, planetary influence summary, lucky color, lucky number.
- **Engine Involved**: `apps/api/src/modules/rashi-bhavishya`.

#### 5. VastuScreen & VastuDetailScreen
- **Screen Name**: `VastuScreen` / `VastuDetailScreen`
- **Route / Widget**: `lib/features/astrology/screens/vastu_screen.dart`, `vastu_detail_screen.dart`
- **How to Open**: Home → Quick Access "Vastu" → Tap direction card.
- **API Called**: `GET /api/v1/vastu/directions`.
- **Data Displayed**: 8 compass directions, presiding deity, element (Pancha Mahabhuta), recommended room zoning, dosha corrections.
- **Engine Involved**: `apps/api/src/modules/vastu`.

#### 6. JyotiChatScreen
- **Screen Name**: `JyotiChatScreen`
- **Route / Widget**: `lib/features/jyoti/screens/jyoti_chat_screen.dart`
- **How to Open**: Home → Tap Floating Action Button or "Ask Jyoti" card.
- **API Called**: `POST /api/v1/jyoti/chat`.
- **Data Displayed**: Conversational chat messages, chart-grounded explanations, suggested query chips, interactive navigation buttons.
- **Engine Involved**: `apps/api/src/modules/jyoti` + `packages/astrology-engine`.

#### 7. Career Report Screens (Generation, Overview, PDF)
- **Screen Name**: `ReportsScreen`, `CareerReportOverviewScreen`, `CareerReportPdfScreen`
- **Route / Widget**: `lib/features/reports/screens/career_report_overview_screen.dart`, `career_report_pdf_screen.dart`
- **How to Open**: Bottom Nav "Reports" → "Generate Career Dossier" → Select Profile → "Generate".
- **API Called**: `POST /api/v1/reports/career`, `GET /api/v1/reports/:id/pdf`.
- **Data Displayed**: Live 7-stage generation progress, report preview, embedded PDF viewer with native sharing.
- **Engine Involved**: `packages/report-engine` & `apps/api/src/worker.ts`.

#### 8. Birth Profile Management Screens
- **Screen Name**: `BirthProfileListScreen`, `CreateBirthProfileScreen`, `BirthProfileDetailScreen`
- **Route / Widget**: `lib/features/birth_profile/screens/birth_profile_list_screen.dart`, `create_birth_profile_screen.dart`
- **How to Open**: Profile Tab → "My Birth Profiles" → "+" Add Profile.
- **API Called**: `GET /api/v1/birth-profiles`, `POST /api/v1/birth-profiles`, `DELETE /api/v1/birth-profiles/:id`.
- **Data Displayed**: Name, Date of Birth, Time of Birth, Latitude, Longitude, Timezone, City Name.
- **Engine Involved**: `apps/api/src/modules/birth-profiles`.

### Screens Present in Code but Not in Primary Navigation
- `chart_result_screen.dart`: Legacy stub replaced by `BirthChartScreen`.
- `signup_screen.dart`: Legacy stub replaced by `RegisterScreen`.

---

## 7. Admin Dashboard Walkthrough

### Complete Admin Navigation Tree

```
Astro Sushil Admin (http://localhost:3000)
├── 📊 Dashboard (/dashboard)
├── 🕒 Live Session (/live-sessions)
│     └── [sessionId] (Consultation Workspace)
├── 📈 Analytics (/analytics)
│     ├── Overview
│     ├── Users
│     ├── Reports
│     ├── Jyoti AI
│     ├── Revenue
│     └── System Health
├── 👥 Users (/users)
│     └── [id] (User Details & Entitlements)
├── 🔮 Birth Profiles (/birth-profiles)
│     └── [id] (Calculation Details & Coordinates)
├── 📜 Career Reports (/reports)
│     └── [id] (7-Stage Pipeline Diagnostics & PDF)
├── 💳 Subscriptions (/subscriptions)
│     └── [id] (Subscription & Entitlements)
├── 💰 Payments (/payments)
├── 🔔 Notifications (/notifications)
├── ✨ Astrology Intelligence (/astrology-diagnostics)
├── 🏷️ Product Plans (/plans)
├── 🛡️ Admin Staff (/admin-users)
├── 💬 Jyoti AI (/jyoti)
├── ⚡ System Health (/system)
└── 📋 Audit Log (/audit-log)
```

### Detailed Page Breakdown

#### 1. Dashboard (`/dashboard`)
- **How to Reach**: Sidebar → "Dashboard".
- **API Called**: `GET /api/v1/admin/dashboard`.
- **Data Displayed**: Real-time KPI summary cards (Total Users, Active Sessions, Generated Reports, Monthly Revenue), quick action links.
- **Engine Involved**: Database aggregation.
- **Status**: **Fully Functional**.

#### 2. Live Sessions & Consultation Workspace (`/live-sessions`, `/live-sessions/[sessionId]`)
- **How to Reach**: Sidebar → "Live Session" → Start Session or Select Active Session.
- **API Called**: `POST /api/v1/admin/live-sessions`, `GET /api/v1/admin/live-sessions/:id`, `POST /api/v1/astrology/*`, `POST /api/v1/admin/live-sessions/:id/notes`, `POST /api/v1/admin/live-sessions/:id/observations`.
- **Data Displayed**: Full astrologer consultation suite (Kundli chart, 16 Vargas, Vimshottari Dashas, Yogas, Panchanga, Ashtakavarga, Shadbala, Jaimini, KP, Jyoti AI, Notes, Observation tags, Reports).
- **Engine Involved**: `packages/astrology-engine`, `apps/api/src/modules/admin/live-session.service.ts`.
- **Status**: **Fully Functional**.

#### 3. Astrology Intelligence & Diagnostics (`/astrology-diagnostics`)
- **How to Reach**: Sidebar → "Astrology Intelligence".
- **API Called**: `POST /api/v1/astrology/evidence`, `POST /api/v1/astrology/predictions`.
- **Data Displayed**: Form taking Birth Profile UUID and Domain Category; renders supporting facts list, triggered rule codes, confidence levels, and prediction interpretation text.
- **Engine Involved**: `packages/astrology-engine`, `packages/prediction-engine`.
- **Status**: **Fully Functional**.

#### 4. Career Reports (`/reports`, `/reports/[id]`)
- **How to Reach**: Sidebar → "Career Reports".
- **API Called**: `GET /api/v1/admin/reports`, `GET /api/v1/admin/reports/:id`, `POST /api/v1/admin/reports/:id/regenerate`.
- **Data Displayed**: Searchable report jobs table, status filters, 7-stage pipeline timing, error messages, and regenerate action button.
- **Engine Involved**: `packages/report-engine`, `apps/api/src/worker.ts`.
- **Status**: **Fully Functional**.

#### 5. Analytics (`/analytics`)
- **How to Reach**: Sidebar → "Analytics".
- **API Called**: `GET /api/v1/admin/analytics/overview`, `/users`, `/reports`, `/jyoti`, `/revenue`, `/system`, `/export`.
- **Data Displayed**: Metrics charts, throughput trends, top error frequencies, Jyoti token usage, and CSV export.
- **Engine Involved**: `apps/api/src/modules/admin/analytics.service.ts`.
- **Status**: **Fully Functional**.

#### 6. Users & Admin Staff (`/users`, `/admin-users`)
- **How to Reach**: Sidebar → "Users" or "Admin Staff".
- **API Called**: `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, `POST /api/v1/admin/users/:id/suspend`, `POST /api/v1/admin/users/:id/activate`.
- **Data Displayed**: Registered client list, role assignments (`USER`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`), verification status, session controls.
- **Engine Involved**: `apps/api/src/modules/admin/admin.service.ts`.
- **Status**: **Fully Functional**.

#### 7. System Health & Audit Logs (`/system`, `/audit-log`)
- **How to Reach**: Sidebar → "System Health" / "Audit Log".
- **API Called**: `GET /api/v1/admin/system/health`, `GET /api/v1/admin/audit-log`.
- **Data Displayed**: Database latency, Redis queue status, memory footprint, uptime, immutable admin action log entries.
- **Engine Involved**: `apps/api/src/modules/admin/admin.service.ts`.
- **Status**: **Fully Functional**.

---

## 8. Live Session Walkthrough: 1-on-1 Consultation Workflow

Here is the exact step-by-step walkthrough to conduct a live consultation session:

```
[1. Login as Admin] ──► [2. Open /live-sessions] ──► [3. Select Client & Profile]
                                                             │
                                                             ▼
                                                [4. Launch Live Session]
                                                             │
            ┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
            ▼                                                ▼                                                ▼
   [Left Navigation Tabs]                            [Center Main View]                             [Right Panel]
• Birth Chart (Kundli)                       • North Indian SVG Chart / Tables              • Live Consultation Notepad
• Planets (Longitudes & Dignities)           • Varga Selector (D1–D60)                      • Observation Tags:
• Houses (12 Bhavas & Drishti)               • Vimshottari Tree (Maha/Antar/Prat)             [IMPORTANT] [FOLLOW_UP]
• Vargas (D1 to D60)                         • Yogas & Prediction Rules                       [DISCUSSED] [REPORT_NEEDED]
• Dashas (Vimshottari Timeline)              • Daily Panchanga & Muhurtas                   • Client Session History
• Yogas (300+ Vedic Rules)                   • Ashtakavarga SAV Grid                        • Trigger Report Regeneration
• Panchanga (5 Pillars)                      • Shadbala 6-Fold Virupas
• Ashtakavarga Matrix                        • Jaimini Karakas & Arudhas
• Shadbala Strengths                         • KP 4-Tier Cusps & 249 Subs
• Jaimini Karakas                            • Jyoti AI Astrologer Assistant
• KP System (Placidus Cusps)
                                                             │
                                                             ▼
                                                   [5. Conclude Session]
                                             (Duration recorded, status COMPLETED)
```

### Step-by-Step Execution Sequence

1. **Login**: Navigate to `http://localhost:3000/login` and log in as `admin@astrosushil.com`.
2. **Find Client & Profile**: Navigate to `/live-sessions`. Use the client search dropdown or click **"Start Live Consultation"** with a preselected user and birth profile.
3. **Session Creation**: Backend executes `POST /api/v1/admin/live-sessions`, creating a session record in PostgreSQL and transitioning to `/live-sessions/[sessionId]`.
4. **View D1 Kundli**: Click **"Birth Chart (Kundli)"** tab. Inspect the North Indian SVG chart showing lagna rashi number and planet glyphs.
5. **View Planets**: Click **"Planets"** tab. Inspect exact degrees, retrogrades (`R`), combustion, nakshatra pada, and color-coded dignities (`EXALTED`, `OWN_SIGN`, `DEBILITATED`).
6. **View Houses**: Click **"Houses"** tab. Inspect all 12 Bhavas with sign lords, occupant planets, and incoming drishti aspects.
7. **View Vargas**: Click **"Vargas"** tab. Use the divisional dropdown to switch between Navamsha (D9), Dashamsha (D10), Saptamsha (D7), and Shashtiamsha (D60).
8. **View Dashas**: Click **"Dashas"** tab. Expand the Vimshottari Mahadasha rows to reveal Antardashas and Pratyantardashas with date intervals.
9. **View Yogas**: Click **"Yogas"** tab. Read triggered Vedic yogas with rule codes and benefic ratings.
10. **View Panchanga**: Click **"Panchanga"** tab. Inspect Tithi, Vara, Nakshatra, Yoga, Karana, and Rahu Kaal.
11. **View Ashtakavarga**: Click **"Ashtakavarga"** tab. Inspect SAV bindu counts across all 12 signs.
12. **View Shadbala**: Click **"Shadbala"** tab. Inspect the 6-fold virupa breakdown (Sthana, Dig, Kala, Cheshta, Naisargika, Drik) and strength ranking.
13. **View Jaimini**: Click **"Jaimini"** tab. Inspect 7/8 Chara Karakas (AK to DK), Arudha Padas (AL, UL), and Argala interferences.
14. **View KP System**: Click **"KP"** tab. Inspect Placidus house cusps, Sign/Star/Sub/Sub-sub lords, and 4-level significators.
15. **Use Jyoti AI**: Click **"Jyoti AI"** tab. Query the assistant directly within the session workspace.
16. **Add Consultation Notes**: In the right sidebar, type consultation observations in Markdown and click **"Save Note"** (autosaves with version tracking).
17. **Tag Observations**: Click any quick observation button (`IMPORTANT`, `FOLLOW_UP`, `DISCUSSED`, `REPORT_NEEDED`) to tag findings.
18. **Generate / View Reports**: Switch to the **"Reports"** tab to inspect prior client PDF reports or enqueue a new Career Report.
19. **End Session**: Click **"End Session"** in the top bar. Backend calculates total duration in seconds and marks status as `COMPLETED`.

---

## 9. Engine Result → API → UI Field Mapping

### 1. D1 Natal Chart
- **Engine Produces**: `AstroChartModel` (`ascendant: { sign, longitude, rashiName, degreeInSign }`, `planets[]: { planet, longitude, rashiName, nakshatraName, pada, isRetrograde, dignity }`, `houses[]: { houseNumber, rashiName, lord, occupants[] }`).
- **API Exposes**: `POST /api/v1/astrology/chart` → `{ status: 'success', data: { chart: { ... } } }`.
- **Flutter Model & Screen**: `AstroChartModel` → `BirthChartScreen` (`KundliChartWidget`, `PlanetsTab`, `HousesTab`).
- **Admin Model & Page**: `ConsultationWorkspace` → `KundliChartSvg` + Planetary Placement Table.

### 2. Divisional Charts (Vargas)
- **Engine Produces**: `VargasResponse` (`vargas: Record<VargaType, { vargaType, ascendant, planets[] }>`).
- **API Exposes**: `POST /api/v1/astrology/vargas` → `{ data: { vargas: { D9: { ... }, D10: { ... } } } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `VargasPanel` (renders selected Varga SVG and placement table).

### 3. Vimshottari Dasha
- **Engine Produces**: `DashaTree` (`system: 'VIMSHOTTARI'`, `balanceAtBirth`, `mahadashas[]: { lord, startDate, endDate, antardashas[]: { lord, startDate, endDate, pratyantardashas[] } }`).
- **API Exposes**: `POST /api/v1/astrology/dasha` → `{ data: { mahadashas: [...] } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `DashasPanel` (collapsible tree with active period highlight).

### 4. Daily Panchanga
- **Engine Produces**: `PanchangData` (`tithi: { name, paksha, number, percentElapsed }`, `vara: { name, lord }`, `nakshatra: { name, pada, lord }`, `yoga: { name }`, `karana: { name }`, `muhurtas: { rahuKaal, abhijit }`).
- **API Exposes**: `POST /api/v1/astrology/panchang` → `{ data: { ... } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `PanchangaPanel`.

### 5. Classical Vedic Yogas
- **Engine Produces**: `YogaResult[]` (`yogaName`, `ruleCode`, `category`, `beneficRating`, `description`, `participatingPlanets[]`, `conditionsMet[]`).
- **API Exposes**: `POST /api/v1/astrology/yogas` & `POST /api/v1/astrology/predictions`.
- **Flutter**: Integrated in Career Report overview prose.
- **Admin**: `ConsultationWorkspace` → `YogasPanel` and `/astrology-diagnostics`.

### 6. Ashtakavarga
- **Engine Produces**: `AshtakavargaResult` (`sarvashtakavarga: number[12]`, `bhinnashtakavarga: Record<Planet, number[12]>`, `shodhyaPindas: { grahaPinda, rashiPinda, yogaPinda }`).
- **API Exposes**: `POST /api/v1/astrology/ashtakavarga` → `{ data: { ... } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `AshtakavargaPanel` (12-sign SAV matrix).

### 7. Shadbala & Bhava Bala
- **Engine Produces**: `ShadbalaResult` (`planets: Record<Planet, { sthanaBala, digBala, kalaBala, cheshtaBala, naisargikaBala, drikBala, totalVirupas, totalRupas, isAdequate, rank }>`, `bhavaBala: Record<number, { totalVirupas, rank }>`).
- **API Exposes**: `POST /api/v1/astrology/strength` → `{ data: { ... } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `ShadbalaPanel`.

### 8. Jaimini Karakas & Arudhas
- **Engine Produces**: `JaiminiResult` (`charaKarakas: { AK, AmK, BK, MK, PiK, PK, GK, DK }`, `arudhaPadas: { AL, A2, ..., UL }`, `karakamshaSign`, `padaLagna`).
- **API Exposes**: `POST /api/v1/astrology/jaimini` → `{ data: { ... } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `JaiminiPanel`.

### 9. KP System
- **Engine Produces**: `KPReport` (`cusps[]: { house, degree, signLord, starLord, subLord, subSubLord }`, `planets[]: { planet, signLord, starLord, subLord, subSubLord }`, `significators: Record<House, { levelA[], levelB[], levelC[], levelD[] }>`, `rulingPlanets`).
- **API Exposes**: `POST /api/v1/astrology/kp` → `{ data: { ... } }`.
- **Flutter**: *Not currently displayed in Flutter UI*.
- **Admin**: `ConsultationWorkspace` → `KPPanel`.

---

## 10. Visibility & Gap Inventory

### Category 1: Implemented in Backend / Engine but NOT Visible in UI
1. **Gochara (Transits) & Timeline**: Engine & API (`POST /api/v1/astrology/gochara`, `/timeline`) fully calculate transit hits and ingresses, but neither Flutter nor Admin currently render a transit wheel or timeline chart.
2. **Sade Sati & Dhaiyya**: Calculated via API (`POST /api/v1/astrology/sade-sati`), but no dedicated widget in Flutter or Admin.
3. **Special Points & Upagrahas**: Upagrahas, Special Lagnas, and Mrityu Bhaga are computed in API (`POST /api/v1/astrology/special-points`), but have no dedicated UI panel.
4. **Varshaphala (Solar Return)**: Fully implemented in engine & API (`POST /api/v1/astrology/varshaphala`), but no UI page exists to view the annual chart.
5. **Prashna (Horary)**: Fully calculated in engine & API (`POST /api/v1/astrology/prashna`), but no horary question UI screen exists.
6. **Matchmaking (Ashtakoota & Manglik)**: Fully computed in engine & API (`POST /api/v1/astrology/compatibility`), but no Guna Milan UI screen exists.
7. **Extra Dashas (Ashtottari, Yogini, Chara, Narayana, Kalachakra)**: Fully calculated in engine, but Admin UI only renders Vimshottari.
8. **Vargas, Dashas, Ashtakavarga, Shadbala, Jaimini, KP in Mobile**: Fully visible in Admin Live Sessions, but not rendered on mobile (mobile currently focuses on D1 Kundli, Planets, Houses, Nakshatras, Horoscopes, Vastu, Jyoti, and Reports).

### Category 2: UI Exists but Consumes Partial Backend Data
1. **Admin Live Session Reports Tab**: Shows past report history and regeneration button, but does not display full LaTeX source diagnostics.
2. **Mobile Rashi Bhavishya**: Displays daily forecasts, but does not yet show monthly/yearly transit projections.

### Category 3: API Exists but No Standard UI Consumes It
1. `POST /api/v1/astrology/chart-variants` (Surya/Chandra/Sunrise Lagna charts).
2. `POST /api/v1/astrology/avakhada` (Avakhada & Ghat Chakra).
3. `POST /api/v1/astrology/vimshopaka` (20-point Vimshopaka matrix).
4. `POST /api/v1/gupta-nadi/rules` (Raw Gupta Nadi rules endpoint).

### Category 4: Code Exists but Is Unreachable / Deprecated
1. `apps/mobile/lib/features/astrology/screens/chart_result_screen.dart`: Replaced by `BirthChartScreen`.
2. `apps/mobile/lib/features/auth/screens/signup_screen.dart`: Replaced by `RegisterScreen`.

---

## 11. Testing & Verification Map

### Automated Test Suites
Run the following test suites to verify backend and engine correctness:

```bash
# 1. Run all Unit & Integration Tests across API and Engines
npm test

# 2. Run Astrology Engine Core Tests & Fixture Verification
npm run test -- packages/astrology-engine

# 3. Run Live Session Backend Tests
npm run test -- apps/api/tests/unit/live-session.service.test.ts
npm run test -- apps/api/tests/unit/live-session-phase4.test.ts

# 4. Run Astrology API Serialization & Benchmark Tests
npm run test -- apps/api/tests/unit/astrology-benchmark.test.ts
npm run test -- apps/api/tests/integration/astrology.test.ts
npm run test -- apps/api/tests/integration/phase-2x.test.ts

# 5. Run 7-Stage Career Report Pipeline Tests
npm run test -- apps/api/tests/integration/phase5-career-pipeline.test.ts
npm run test -- apps/api/tests/integration/phase4-report-hardening.test.ts

# 6. Run Jyoti AI Context & LLM Boundary Tests
npm run test -- apps/api/tests/unit/jyoti.test.ts
npm run test -- apps/api/tests/integration/phase7-jyoti.test.ts

# 7. Run Admin RBAC & Hardening Tests
npm run test -- apps/api/tests/unit/admin-hardening.test.ts
```

### Manual Verification Steps & Expected Results

| Feature | Manual UI Test Path | Expected Visual / Behavioral Result |
| :--- | :--- | :--- |
| **D1 Kundli Chart** | Mobile: Home → Birth Chart<br>Admin: Live Sessions → Birth Chart | North Indian diamond chart renders with Lagna rashi number and planet symbols in correct houses. |
| **Planetary Dignities** | Mobile: Home → Planets<br>Admin: Live Sessions → Planets | Table renders planets with colored dignity chips (`EXALTED` in green, `DEBILITATED` in red). |
| **Vargas (D1–D60)** | Admin: Live Sessions → Vargas tab → Select "D9 Navamsha" | SVG chart re-renders with Navamsha planetary and lagna placements. |
| **Vimshottari Dasha** | Admin: Live Sessions → Dashas tab | Collapsible dasha list shows active Mahadasha, Antardasha, and Pratyantardasha with start/end dates. |
| **Daily Panchanga** | Admin: Live Sessions → Panchanga tab | Shows Tithi, Vara, Nakshatra, Yoga, Karana, and Rahu Kaal window. |
| **Ashtakavarga** | Admin: Live Sessions → Ashtakavarga tab | 12-sign grid displays SAV bindu counts totaling 337 points. |
| **Shadbala** | Admin: Live Sessions → Shadbala tab | 6-fold virupa table displays Sthana, Dig, Kala, Cheshta, Naisargika, Drik, and ranked planet order. |
| **Jaimini System** | Admin: Live Sessions → Jaimini tab | Displays 7/8 Chara Karakas (AK through DK) and Arudha Padas (AL to UL). |
| **KP System** | Admin: Live Sessions → KP tab | 12 Placidus cusps with Sign, Star, Sub, and Sub-Sub lords via 249 table. |
| **Live Session Notes** | Admin: Live Sessions → Notepad → Type note & Save | Note saves immediately; appears in notes history with timestamp and version badge. |
| **Career Report PDF** | Admin: Reports → Select Report → View PDF<br>Mobile: Reports → Generate Report | 7-stage progress completes to 100%; multi-page LaTeX-compiled PDF renders cleanly. |
| **Jyoti AI Chat** | Mobile: Floating Jyoti Button → Type question | Jyoti responds referencing the user's ascendant, planets, and active reports without hallucinations. |

---

## 12. Demo & Seed Data

### Pre-Configured Seed Accounts (`apps/api/prisma/seed.ts`)
Run `npm run prisma:seed` to populate the database with standard administrative roles:

| Email | Role | Default Password | Purpose |
| :--- | :--- | :--- | :--- |
| `admin@astrosushil.com` | `SUPER_ADMIN` | `AdminPass123!` | Full administrative access to all modules, reports, and settings. |
| `operator@astrosushil.com` | `ADMIN` | `AdminPass123!` | Operations management, report regeneration, live sessions. |
| `support@astrosushil.com` | `SUPPORT` | `AdminPass123!` | Customer support read-only inspection and live session assistance. |

### Verified Reference Charts (`packages/astrology-engine/tests/fixtures/reference-charts.ts`)
The repository contains benchmark reference charts with verified ephemeris coordinates:

- **Reference Chart #1 (`REF_CHART_001`)**:
  - **Date of Birth**: May 15, 1990
  - **Time of Birth**: 14:30:00 IST (09:00:00 UTC)
  - **Location**: New Delhi, India (28.6139° N, 77.2090° E)
  - **Ayanamsa**: Lahiri (Chitra Paksha)
  - **Ascendant**: Kanya (Virgo)
  - **Sun**: Vrishabha (Taurus) 20°15' (Rohini Pada 4)
  - **Moon**: Makara (Capricorn) 12°07' (Shravana Pada 1)

### Minimum Data Creation Flow for Demos
1. Start backend and run database migration and seeding:
   ```bash
   npm run db:migrate --workspace=apps/api
   npx tsx apps/api/prisma/seed.ts
   ```
2. Register a demo client user in mobile or API (`client@example.com` / `ClientPass123!`).
3. Create a Birth Profile with the reference coordinates above.
4. Log into Admin at `http://localhost:3000/login` with `admin@astrosushil.com` / `AdminPass123!`.
5. Start a Live Session for `client@example.com` to demonstrate all tabs immediately.

---

## 13. How to Run Everything

### Prerequisites & Infrastructure
- **Node.js**: v20.x or v22.x LTS
- **PostgreSQL**: v15 or v16 (running on port `5432`)
- **Redis**: v7 (running on port `6379`)
- **Flutter SDK**: v3.24+ (for mobile app)
- **Tectonic / XeLaTeX**: (optional, for local PDF compilation fallback; mock provider works without it)

### Environment Variables (`.env`)
Ensure `.env` exists in the repository root with the following configuration keys:

```env
# Server & Environment
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
JWT_SECRET=super-secure-astro-secret-key-min-32-chars

# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/astrosushil?schema=public"
REDIS_URL="redis://localhost:6379"

# LLM Providers (Text synthesis only)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-api-key
CAREER_REPORT_MODEL=google/gemini-2.0-flash-001

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_secret_placeholder
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_placeholder

# Storage (S3 / Local)
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./uploads
```

### Multi-Terminal Startup Sequence

#### Terminal 1: Infrastructure (PostgreSQL + Redis)
```bash
# If using Docker
docker-compose up -d postgres redis

# Run database migrations and seed default admins
npm run db:migrate --workspace=apps/api
npx tsx apps/api/prisma/seed.ts
```

#### Terminal 2: Fastify Backend API
```bash
# Starts API server on http://localhost:4000
npm run dev:api
```

#### Terminal 3: Background Report Worker
```bash
# Starts asynchronous 7-stage report compilation worker loop
npm run dev:worker
```

#### Terminal 4: Next.js Admin Dashboard
```bash
# Starts Admin Portal on http://localhost:3000
npm run dev:admin
```

#### Terminal 5: Flutter Mobile Application
```bash
# Launch Flutter on Android Emulator, iOS Simulator, or Chrome
cd apps/mobile
flutter pub get
flutter run
```

---

## 14. Core API Exploration

The following endpoints are ideal for exploring backend capabilities:

```http
### 1. Admin Authentication
POST http://localhost:4000/api/v1/admin/auth/login
Content-Type: application/json

{
  "email": "admin@astrosushil.com",
  "password": "AdminPass123!"
}

### 2. Calculate D1 Natal Chart
POST http://localhost:4000/api/v1/astrology/chart
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  }
}

### 3. Calculate Vimshottari Dashas
POST http://localhost:4000/api/v1/astrology/dasha
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  },
  "maxLevel": 3
}

### 4. Calculate Divisional Charts (D9 & D10)
POST http://localhost:4000/api/v1/astrology/vargas
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  },
  "vargaTypes": ["D9", "D10"]
}

### 5. Calculate Shadbala & Bhava Bala
POST http://localhost:4000/api/v1/astrology/strength
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  }
}

### 6. Calculate Ashtakavarga Matrix
POST http://localhost:4000/api/v1/astrology/ashtakavarga
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  }
}

### 7. Calculate KP System Placidus Cusps & Sub-Lords
POST http://localhost:4000/api/v1/astrology/kp
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  }
}

### 8. Calculate Jaimini Karakas & Arudhas
POST http://localhost:4000/api/v1/astrology/jaimini
Content-Type: application/json

{
  "birthDetails": {
    "date": { "year": 1990, "month": 5, "day": 15 },
    "time": { "hour": 14, "minute": 30, "second": 0 },
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata"
  }
}

### 9. Query Jyoti AI Assistant
POST http://localhost:4000/api/v1/jyoti/chat
Authorization: Bearer <USER_JWT>
Content-Type: application/json

{
  "message": "Which planets are most strongly placed in my horoscope?",
  "context": {
    "birthProfileId": "<BIRTH_PROFILE_UUID>",
    "currentScreen": "BIRTH_CHART"
  }
}
```

---

## 15. Database Relationship Map

```
  ┌────────────────────────────────────────────────────────┐
  │                         User                           │
  │  id (UUID PK), email, passwordHash, role, fullName     │
  └───────┬───────────────────────────────┬──────────────┬─┘
          │ 1:N                           │ 1:N          │ 1:1
          ▼                               ▼              ▼
┌──────────────────┐            ┌──────────────┐   ┌──────────────────────────┐
│   BirthProfile   │            │    Order     │   │  NotificationPreference  │
│ id, userId, name │            │ id, amount   │   │ pushEnabled, reportAlerts│
│ dob, tob, lat/lng│            │ status, type │   └──────────────────────────┘
└─────────┬────────┘            └──────┬───────┘
          │ 1:N                        │ 1:N
          ▼                            ▼
┌──────────────────────────────────────────────┐
│                    Report                    │
│ id, userId, birthProfileId, orderId          │
│ reportType, status, progress, s3Url          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│             ConsultationSession              │
│ id, adminId, adminEmail, userId,             │
│ birthProfileId, status, durationSeconds      │
└───────┬──────────────────────────────┬───────┘
        │ 1:N                          │ 1:N
        ▼                              ▼
┌──────────────────┐           ┌──────────────────┐
│ ConsultationNote │           │SessionObservation│
│ sessionId, admin │           │ sessionId, tag   │
│ content, section │           │ note, section    │
└──────────────────┘           └──────────────────┘

┌──────────────────────────────────────────────┐
│                   AuditLog                   │
│ id, adminId, adminEmail, action, resource, IP│
└──────────────────────────────────────────────┘
```

- **`User`**: Core root entity. Owns 0..N `BirthProfile`, 0..N `Order`, 0..N `Report`, 0..N `RefreshToken`, 0..N `DeviceToken`, and 1 `NotificationPreference`.
- **`BirthProfile`**: Canonical birth data (DOB, TOB, Lat/Lng, Timezone). Tied to `User`. Used as the input for `Report` generation and `ConsultationSession`.
- **`Order`**: Payment transactions (Razorpay order ID, payment ID, amount in paise, status). Tied to 0..N `Report`.
- **`Report`**: Generated PDF document metadata (7-stage pipeline status, progress percentage, S3 URL, storage key).
- **`ConsultationSession`**: Real-time consultation workspace linking an `AdminUser`, a client `User`, and a `BirthProfile`. Owns 0..N `ConsultationNote` and 0..N `SessionObservation`.
- **`AuditLog`**: Immutable, append-only log recording every state-changing administrative action.

---

## 16. AI / LLM Boundary & Guardrails

```
                    ┌────────────────────────────────────────────────────────┐
                    │               DETERMINISTIC LAYER                      │
                    │  (Swiss Ephemeris, Vedic Algorithms, BNN Rules)        │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                                 [Extracted Evidence Facts]
                                 • Ascendant: Virgo (22°14')
                                 • Jupiter: Cancer (Exalted, 11th House)
                                 • Saturn: Capricorn (Own Sign, 5th House)
                                 • Triggered Rule: GUPTA_RULE_CAREER_042
                                               │
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               PROMPT SYNTHESIS ASSEMBLY                │
                    │  Injects strictly structured deterministic facts into  │
                    │  system prompt with immutable negative constraints    │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               EXTERNAL LLM PROVIDER                    │
                    │  (OpenRouter: Gemini 2.0 Flash / Claude / GPT-4o)      │
                    │  *Role: Natural Language Prose Formulation ONLY*       │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                                 [Final Formatted Output]
                                 Prose explanations and advice
```

### Architectural Guardrails Preventing Astrological Hallucinations
1. **Zero Mathematical Computation in LLM**: The LLM is never prompted to compute planetary degrees, aspects, house placements, or dasha dates. All numbers and placements originate from `packages/astrology-engine`.
2. **Strict Context Injection**: `AstrologyContextBuilder` (`apps/api/src/modules/jyoti/context/astrology-context.builder.ts`) computes the exact chart data server-side and injects it as an immutable reference block before the user query.
3. **Hard System Prompt Directives**:
   - *"You are an explanation engine. You must rely exclusively on the provided deterministic chart facts."*
   - *"Never invent, infer, or alter planetary positions, house numbers, or dasha dates."*
   - *"If a chart fact is not present in the provided context, state that the data is not available."*
4. **Offline Mock Fallback Provider**: In test and offline development environments, `MockCareerAnalysisProvider` supplies static, deterministic response structures without making network calls to LLMs.

---

## 17. 10-Minute Product Demonstration Guide

Follow this streamlined walkthrough to showcase Astro Sushil in 10 minutes:

```
Step 1: Start Services ────────► Step 2: Open Admin ────────► Step 3: Start Live Session
  • npm run dev:api               • http://localhost:3000       • Select Client & Profile
  • npm run dev:admin             • admin@astrosushil.com       • Launch Workspace
  • npm run dev:worker            • AdminPass123!
          │                                                              │
          ▼                                                              ▼
Step 6: Mobile Client ◄───────── Step 5: AI & Reports ◄───────── Step 4: Show Engine Tabs
  • Launch Flutter                • Query Jyoti AI in-session   • D1 North Indian Kundli
  • Open Birth Chart              • Trigger Career PDF          • D9 / D10 Vargas
  • View Daily Horoscopes         • Show Live Progress          • Vimshottari Tree
  • Ask Jyoti Chatbot             • Open Compiled PDF           • Shadbala & KP Subs
```

### Step-by-Step Script

1. **Minute 0–2: Start Services & Login**
   - Ensure PostgreSQL & Redis are running.
   - Run `npm run dev:api`, `npm run dev:admin`, and `npm run dev:worker`.
   - Open browser at `http://localhost:3000/login` and log in with `admin@astrosushil.com` / `AdminPass123!`.
2. **Minute 2–4: Launch Live Consultation Workspace**
   - Click **"Live Session"** in the sidebar.
   - Select the demo client and birth profile; click **"Start Live Consultation"**.
   - Show the header with live timer and client summary.
3. **Minute 4–6: Showcase Deterministic Astrology Tabs**
   - **Birth Chart**: Show the North Indian diamond SVG chart.
   - **Planets**: Show exact degrees, nakshatras, and exaltation/debilitation chips.
   - **Vargas**: Select "D9 Navamsha" and "D10 Dashamsha" to show sub-chart calculations.
   - **Dashas**: Expand Vimshottari Mahadasha to show Antardashas and Pratyantardashas.
   - **Shadbala & KP**: Switch to Shadbala for 6-fold virupa strengths and KP for 249 sub-lords.
4. **Minute 6–8: Session Notes, Tags & Jyoti AI**
   - Add a note in the consultation notepad: *"Strong 10th house Jupiter indicates leadership potential."*
   - Click the **[IMPORTANT]** tag to record an observation.
   - Switch to the **"Jyoti AI"** tab and ask: *"Summarize the primary career strengths."*
5. **Minute 8–10: Flutter Mobile App & Career PDF**
   - Switch to the Flutter mobile app.
   - Open **Birth Chart** to show the mobile North Indian chart.
   - Navigate to **Reports** → **Career Dossier** → View the compiled PDF.
   - Return to Admin and click **"End Session"** to complete the consultation.

---

## 18. Final Gap Summary & Usability Verdict

### Category A: Fully Implemented & User-Visible
- **D1 Natal Kundli Chart** (North Indian SVG chart, planets, whole-sign houses, nakshatras).
- **Planetary Placement & Dignities** (Exaltation, debilitation, own sign, combustion, retrogrades).
- **Divisional Charts D1–D60** (Interactive Varga selector in Admin Live Sessions).
- **Vimshottari Dasha** (Multi-tier collapsible dasha tree in Admin Live Sessions).
- **Daily Panchanga** (Tithi, Vara, Nakshatra, Yoga, Karana, Rahu Kaal in Admin Live Sessions).
- **Vedic Yogas & Diagnostics** (Rule codes, condition evidence, and explanation traces).
- **Ashtakavarga** (Sarvashtakavarga 12-sign matrix in Admin Live Sessions).
- **Shadbala & Bhava Bala** (6-fold planetary virupas, thresholds, and house strengths).
- **Jaimini System** (7/8 Chara Karakas, Arudha Padas AL–UL, Argala).
- **KP System** (Placidus cusps, 4-tier lordships, 249 sub table, significators).
- **Live Consultation Workspace** (Timer, client context, live astrology tabs, notes, tags).
- **7-Stage Career PDF Report** (Calculation → LLM Synthesis → LaTeX Compilation → S3/Local Storage).
- **Jyoti AI Assistant** (Context-aware conversational assistant in Flutter & Admin).
- **Rashi Bhavishya & Vastu Shastra** (Daily horoscopes and 8-direction architectural guides in mobile).
- **Admin Operations Suite** (Analytics KPIs, User RBAC, Birth Profiles, Audit Logs, System Health).

### Category B: Implemented but Only Partially User-Visible
- **Extra Dashas (Ashtottari, Yogini, Chara, Narayana, Kalachakra)**: Fully calculated in engine/API; Admin Live Sessions currently renders Vimshottari.
- **Mobile Astrology Tabs**: Mobile currently renders D1 Kundli, Planets, Houses, Nakshatras; Vargas/Dashas/Shadbala/KP are currently accessible in Admin Live Sessions.

### Category C: Implemented in Engine / API but No User-Facing UI
- **Gochara (Transits) & Ingress Timeline**: Calculated via `/api/v1/astrology/gochara` and `/timeline`.
- **Sade Sati & Dhaiyya Cycles**: Calculated via `/api/v1/astrology/sade-sati`.
- **Special Points & Upagrahas (Gulika, Mandi, Special Lagnas, Mrityu Bhaga)**: Calculated via `/api/v1/astrology/special-points`.
- **Varshaphala (Tajika Solar Return)**: Calculated via `/api/v1/astrology/varshaphala`.
- **Prashna (Horary Astrology)**: Calculated via `/api/v1/astrology/prashna`.
- **Matchmaking (36 Guna Ashtakoota Milan & Manglik)**: Calculated via `/api/v1/astrology/compatibility`.
- **Vimshopaka Bala & Planetary Rays**: Calculated via `/api/v1/astrology/vimshopaka`.

### Category D: Not Implemented / Out of Current Scope
- Real-time WebRTC audio/video call integration inside the Live Session window (consultations operate alongside standard phone/video channels while using the workspace for interactive chart analysis).
- Automated SMS OTP gateway (email OTP verification is fully implemented).

---

### Can I currently use Astro Sushil for a real one-on-one astrology session?

### **YES. Astro Sushil is fully ready and functional for professional 1-on-1 consultations.**

#### Empirical Evidence from Codebase:
1. **Live Consultation Workspace (`apps/admin/app/live-sessions/[sessionId]/ConsultationWorkspace.tsx`)**:
   - Fully loaded with 15 dedicated tabs spanning D1 Kundli, 16 Vargas, Vimshottari Dashas, Yogas, Panchanga, Ashtakavarga, Shadbala, Jaimini, KP, Jyoti AI, Notes, Observation Tags, and Reports.
2. **Deterministic Computation Engine (`packages/astrology-engine`)**:
   - Provides verified, accurate planetary longitudes, house cusps, and astrological metrics without reliance on third-party paid APIs.
3. **Session State & Note Taking**:
   - Allows the astrologer to take structured notes, apply color-coded tags (`IMPORTANT`, `FOLLOW_UP`, `DISCUSSED`, `REPORT_NEEDED`), and record session duration.
4. **Client Deliverables**:
   - The astrologer can trigger and deliver multi-page, publication-quality Career PDF reports directly from the session.
