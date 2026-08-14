# Technology Stack Evaluation & Selection - Astro Sushil

This document provides a detailed breakdown of all software technologies, frameworks, infrastructure components, and third-party integrations evaluated for the **Astro Sushil** platform.

---

## 1. Application Frameworks & Languages

### 1.1 Mobile Application: Flutter & Dart
- **What it does**: Cross-platform client framework for building native iOS and Android mobile apps from a single codebase.
- **Why considered**: High rendering performance (Skia/Impeller), expressive custom UI capabilities required for rendering complex Indian birth charts (North/South Indian Kundli grids), and unified codebase reducing developer workload.
- **Licensing/Cost**: Free & Open-Source (BSD 3-Clause).
- **MVP Status**: **Required for Initial MVP**.

### 1.2 Backend Runtime & Framework: Node.js, TypeScript & Fastify
- **What it does**: Node.js execution runtime, static type checking with TypeScript, and lightweight modular backend framework using Fastify.
- **Why considered**: Fastify provides high performance, low overhead, and a clean plugin/route architecture ideal for building lightweight modular monoliths without NestJS abstraction overhead. Shared TypeScript interfaces across backend packages ensure type safety.
- **Licensing/Cost**: Free & Open-Source (MIT).
- **MVP Status**: **Required for Initial MVP**.

### 1.3 Admin Panel: Next.js & React
- **What it does**: Web application framework for building administrative portals, management dashboards, and rule editing interfaces.
- **Why considered**: Fast server-side rendering, robust component ecosystem (Tailwind CSS, Radix UI, Shadcn UI), and seamless integration with TypeScript backend API contracts.
- **Licensing/Cost**: Free & Open-Source (MIT).
- **MVP Status**: **Required for Initial MVP**.

---

## 2. Core Astrology Engine Library

### 2.1 Astronomical & Ephemeris Calculation Library
- **What it does**: Provides precise celestial body coordinates (planetary longitudes, right ascension, declination, speed, house cusps, ayanamsa offset).
- **Selection Status**: **TO BE EVALUATED**.
- **Options under evaluation**:
  1. *Swiss Ephemeris (sweph / swisseph bindings)*: Highest mathematical accuracy. Must evaluate licensing (GPL vs Commercial License).
  2. *Astronomy Engine / Local Open-Source Algorithms*: Pure JavaScript/TypeScript implementations (MIT/BSD).
- **Evaluation Criteria**:
  - Zero paid third-party per-request API calls.
  - License compatibility with commercial platform distribution.
  - Execution speed and computational accuracy.
- **MVP Status**: **Required for Initial MVP (Library choice TBD during spike phase)**.

---

## 3. Data Storage & Infrastructure

### 3.1 Primary Database: PostgreSQL & Prisma ORM
- **What it does**: Relational database management system and type-safe Object-Relational Mapping layer.
- **Why considered**: PostgreSQL offers robust ACID compliance, structured JSONB support for storing variable chart parameters, and spatial indexing if needed. Prisma provides type-safe query generation and migration management.
- **Licensing/Cost**: Free & Open-Source (PostgreSQL: PostgreSQL License; Prisma: Apache 2.0).
- **MVP Status**: **Required for Initial MVP**.

### 3.2 In-Memory Caching & Queue Storage: Redis & BullMQ
- **What it does**: Redis handles high-speed key-value caching and publish-subscribe primitives. BullMQ provides robust Node.js queue processing on top of Redis.
- **Why considered**: Offloads expensive PDF generation, LLM formatting requests, and notification dispatches from the main API thread. Ensures zero request degradation under load.
- **Licensing/Cost**: Free & Open-Source (Redis: Dual-licensed/BSD; BullMQ: MIT).
- **MVP Status**: **Required for Initial MVP**.

### 3.3 Containerization: Docker & Docker Compose
- **What it does**: Packaging application runtime environment and local development service dependencies into uniform containers.
- **Why considered**: Guarantees environment parity across local development machines and production cloud deployment.
- **Licensing/Cost**: Free & Open-Source (Apache 2.0 / Docker Community Edition).
- **MVP Status**: **Required for Initial MVP**.

### 3.4 Object Storage: S3-Compatible Storage
- **What it does**: Cloud storage for storing generated PDF report files and static assets.
- **Why considered**: Decouples binary file storage from database nodes.
- **Licensing/Cost**: Usage-based Cloud Infrastructure cost (AWS S3 / Cloudflare R2 / MinIO for dev).
- **MVP Status**: **Required for Initial MVP**.

---

## 4. Integration Services & External APIs

### 4.1 Payment Gateway: Razorpay
- **What it does**: Processes domestic and international payments, UPI, credit/debit cards, net banking, and digital wallets.
- **Why considered**: Seamless integration in India, native Flutter SDKs, and robust webhook validation mechanisms.
- **Licensing/Cost**: Usage-based transaction fee (typically 2% per transaction).
- **MVP Status**: **Required for Initial MVP**.

### 4.2 External Channel: Meta WhatsApp Business Platform
- **What it does**: Official API integration for sending and receiving WhatsApp messages, report dispatches, and interactive messaging flows.
- **Why considered**: Highest conversion and user engagement channel in target markets.
- **Licensing/Cost**: Usage-based per-conversation cost charged by Meta.
- **MVP Status**: **Required for Initial MVP (Basic notification & delivery)**.

### 4.3 Mobile Push Notifications: Firebase Cloud Messaging (FCM)
- **What it does**: Delivers push notifications to mobile devices (iOS and Android).
- **Why considered**: Industry standard for reliable, real-time push notification dispatches.
- **Licensing/Cost**: Free tier provided by Google Firebase.
- **MVP Status**: **Required for Initial MVP**.

### 4.4 Explanation Layer: LLM API (OpenAI / Anthropic / Gemini)
- **What it does**: Formats structured prediction JSON nodes into natural, compassionate, and readable astrological prose.
- **Why considered**: Solves the problem of robotic, repetitive template output while strictly preventing calculation hallucinations.
- **Licensing/Cost**: Usage-based API pricing per token generated.
- **MVP Status**: **Required for Initial MVP**.

---

## 5. Supporting Utilities & Tooling

### 5.1 PDF Generation Engine
- **What it does**: Converts HTML/CSS report templates into high-resolution, print-ready PDF files.
- **Candidate Options**: Puppeteer (Headless Chrome) or PDFKit / React-PDF.
- **Why considered**: Puppeteer allows pixel-perfect HTML/CSS layout rendering for multi-page customized reports.
- **Licensing/Cost**: Free & Open-Source (MIT).
- **MVP Status**: **Required for Initial MVP**.

### 5.2 Source Control & CI/CD: Git, GitHub & GitHub Actions
- **What it does**: Source control management, pull request workflows, automated testing pipelines, and deployment automation.
- **Licensing/Cost**: Free tier / Usage-based build minutes.
- **MVP Status**: **Required for Initial MVP**.

### 5.3 Automated Testing Tools
- **Backend Testing**: Jest, Supertest (Unit, Integration, and E2E testing).
- **Mobile Testing**: Flutter Test & Integration Test runner.
- **Licensing/Cost**: Free & Open-Source.
- **MVP Status**: **Required for Initial MVP**.

### 5.4 Logging & Monitoring Tools
- **Logging**: Winston / Pino structured JSON logging.
- **Error Tracking**: Sentry / GlitchTip (Optional initial phase).
- **Licensing/Cost**: Open-source / Free tier option.
- **MVP Status**: Basic logging required for MVP; APM monitoring introduced in Phase 2.

---

## 6. Summary Matrix

| Technology | Category | License / Cost Model | MVP Priority |
| :--- | :--- | :--- | :--- |
| **Flutter** | Mobile Frontend | Open-Source (BSD) | MVP (Required) |
| **Fastify / Node.js** | Backend API | Open-Source (MIT) | MVP (Required) |
| **Next.js** | Admin Web | Open-Source (MIT) | MVP (Required) |
| **PostgreSQL + Prisma** | Primary Database | Open-Source (PostgreSQL/Apache) | MVP (Required) |
| **Redis + BullMQ** | Caching & Queues | Open-Source (BSD/MIT) | MVP (Required) |
| **Ephemeris Library** | Astrology Engine | *To Be Evaluated* | MVP (Required) |
| **Docker** | Infrastructure | Open-Source (Apache 2.0) | MVP (Required) |
| **Razorpay** | Payment Gateway | Usage-Based (Trans Fees) | MVP (Required) |
| **Meta WhatsApp** | Communication | Usage-Based (Meta Fees) | MVP (Required) |
| **LLM Provider API** | Explanation Layer | Usage-Based (Token Fees) | MVP (Required) |
| **Puppeteer** | PDF Generator | Open-Source (MIT) | MVP (Required) |
| **FCM** | Push Notifications | Free Tier | MVP (Required) |
| **Sentry** | Monitoring | Usage-Based / Free Tier | Phase 2 (Optional) |
