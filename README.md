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
- **Multi-Channel Access**: Mobile application for end users, web admin panel for operations, and direct messaging via WhatsApp.

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

---

## Flagship Product: Gupta Nadi Engine
Gupta Nadi is the cornerstone of the Astro Sushil platform, implementing the client's proprietary **Brihaspati Nandi Nadi (BNN)** methodology:
- **Rule-Based & Deterministic**: Evaluates planetary combinations (yogas), planet-to-planet aspects, sign transits, and planetary directional relationships without human bias or hallucination.
- **Auditable & Traceable**: Every prediction generated points directly to the specific rule ID and planetary condition triggered.
- **Custom Formulas**: Built strictly around formula sets and rule precedence provided by the client.

---

## High-Level Architecture

The system is designed as a **Modular Monolith** initially, allowing high cohesion, rapid development, and simplified deployment while preserving boundaries for future microservice extraction if needed.

```
+-----------------------------------------------------------------------+
|                            CLIENT CHANNELS                            |
|                                                                       |
|  +---------------------+   +-------------------+   +---------------+  |
|  | Flutter Mobile App  |   | Next.js Admin UI  |   | WhatsApp Channel|  |
|  | (iOS / Android)     |   | (Web Management)  |   | (Meta Platform)|  |
|  +----------+----------+   +---------+---------+   +-------+-------+  |
+-------------|------------------------|---------------------|----------+
              |                        |                     |
              +-------------------+----+---------------------+
                                  |
                                  v REST / WebSocket APIs
+-----------------------------------------------------------------------+
|                            BACKEND APPLICATION                        |
|                         (Node.js / Fastify Monolith)                  |
|                                                                       |
|  +---------------------+  +--------------------+  +----------------+  |
|  | Auth & User Module  |  | Astrology Engine   |  | Gupta Nadi     |  |
|  |                     |  | Package            |  | Engine Package |  |
|  +---------------------+  +--------------------+  +----------------+  |
|  +---------------------+  +--------------------+  +----------------+  |
|  | Prediction Engine   |  | Report Engine      |  | Payment & Sync |  |
|  | Package             |  | Package            |  | Integrations   |  |
|  +---------------------+  +--------------------+  +----------------+  |
+-------------------+--------------------+-------------------+----------+
                    |                    |                   |
                    v                    v                   v
+------------------------+  +--------------------+  +-------------------+
|     PostgreSQL         |  |   Redis & BullMQ   |  |  Object Storage   |
| (Persistent Relational)|  | (Cache & Job Queue)|  |  (PDFs & Assets)  |
+------------------------+  +---------+----------+  +-------------------+
                                      |
                                      v
                            +--------------------+
                            | Background Workers |
                            | (PDF, LLM, Notify) |
                            +--------------------+
```

---

## Technology Stack Summary

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Mobile Application** | Flutter (Dart) | Cross-platform mobile app for iOS and Android |
| **Admin Panel** | Next.js (React / TypeScript) | Operational web panel for management and analytics |
| **Backend Framework** | Node.js / Fastify (TypeScript) | Modular monolithic API backend |
| **Database** | PostgreSQL | Primary relational data store |
| **Caching & Queues** | Redis + BullMQ | Fast key-value caching and async background processing |
| **Astrology Calculations** | Internal TS Package | Open-source/Local ephemeris engine (To Be Evaluated) |
| **Gupta Nadi Engine** | Internal TS Package | Deterministic BNN rule evaluation engine |
| **Explanation Layer** | LLM API (OpenAI / Anthropic) | Formats structured predictions into natural text |
| **Payments** | Razorpay | Payment gateway integration |
| **Messaging Channel** | Meta WhatsApp Business API | Automated WhatsApp messaging and delivery |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Mobile push notification delivery |
| **Packaging & Deploy** | Docker, S3 / Cloud Storage | Containerized builds & asset storage |

---

## Development Philosophy
1. **Deterministic Astrology**: Predictions come ONLY from verified astrological formulas, never from LLM guessing.
2. **LLM as Writer Only**: LLMs synthesize and explain structured calculation outputs.
3. **No External API Dependencies for Ephemeris**: No per-request third-party astrology API fees.
4. **Strict Modular Boundaries**: Internal domains reside in clean, independent TypeScript packages.
5. **Client-Driven Business Logic**: Astrology and Gupta Nadi rules follow the client's explicit specifications without unapproved variations.

---

## Current Project Status
> **Current Phase: Architecture & Specification Phase**

**Notice**: No application source code, package configurations, or dependencies have been generated yet. The project repository is currently initialized with technical specifications, architecture blueprints, rule engine design docs, and operational guidelines.
