# Astro Sushil - Phase 9 End-to-End Test Plan

This document outlines the master End-to-End (E2E) verification plan for the entire **Astro Sushil** product ecosystem across the Flutter mobile application, Fastify API backend, PostgreSQL database, BullMQ worker background queues, Jyoti AI assistant engine, Razorpay billing integration, and Next.js Admin Panel.

---

## 1. Executive Strategy: One Product Architecture

Astro Sushil operates as a unified modular monolith. Every user journey traces boundaries across multiple layers:

```
[ Flutter Mobile App ] ──HTTP REST──> [ Fastify API Gateway ]
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
              [ PostgreSQL DB ]       [ Redis Queue ]     [ Astrology Engine ]
                       │                     │
                       │             [ BullMQ Workers ]
                       │                     │
                       └───────────┬─────────┘
                                   ▼
                       [ FCM Push / Email Transport ]
```

---

## 2. User Journey Flow Specifications

### FLOW A — Guest User
- **Journey**: Launch App -> Guest Mode -> Local Free Kundli & Panchang -> Paid Feature Intercept -> Login Modal.
- **Invariants**:
  - Guest mode data remains strictly local (Flutter `SharedPreferences` / `SecureStorage`).
  - No persistent `birth_profiles` or `users` records are created on PostgreSQL for guest sessions.
  - Tapping paid features or Jyoti AI assistant triggers registration/login gate without app crash.
  - Zero unauthenticated API calls requiring JWT token headers.

### FLOW B — Registration
- **Journey**: Sign Up Form -> Email & Password Validation -> OTP / Email Verification -> Token Issuance (`accessToken`, `refreshToken`).
- **Invariants**:
  - Email format validation, password strength policy (8+ chars), and duplicate email checks enforced at backend API.
  - Development master OTP (`4444`) is strictly restricted to non-production environments (`NODE_ENV !== 'production'`).
  - User record created atomically with `emailVerified = true` upon verification.

### FLOW C — Login & Session Lifecycle
- **Journey**: Login -> Receive Auth Tokens -> API Invocations -> Token Expiration (30m) -> Automatic Refresh -> Revocation on Logout.
- **Invariants**:
  - 401 HTTP response triggers automatic single-flight refresh in Flutter `AuthInterceptor`.
  - Malformed tokens or revoked refresh tokens clear local storage and redirect cleanly to Login without infinite refresh loops.

### FLOW D — Birth Profile Management
- **Journey**: Create Profile -> Input Birth Details (Date, Time, Lat, Long, Timezone) -> Backend Validation -> PostgreSQL Persistence -> Active Profile Selection.
- **Invariants**:
  - Registered user profiles strictly scoped to `userId`.
  - Coordinates validated (-90 to +90 lat, -180 to +180 long).
  - Invalid timezone offset strings rejected by Zod schemas.

### FLOW E — Deterministic Astrology & Kundli Output
- **Journey**: Active Profile -> Generate Kundli -> Ephemeris Calculation -> Sidereal Lahiri Chart Engine -> Detailed Response.
- **Invariants**:
  - **Zero LLM Hallucinations**: Ephemeris and chart calculations are 100% deterministic (no Gemini in calculation loop).
  - Output contract must contain non-empty data arrays for Ascendant, 9 Planets (Sun to Ketu), 12 Houses, 12 Rashis, and 27 Nakshatras with degrees, signs, and padas.
  - Known reference input (e.g. 1990-05-15 14:30 IST, New Delhi) must yield identical planetary longitudes on every run.

### FLOW F — Jyoti AI Assistant & Formatting
- **Journey**: User Query -> Jyoti Controller -> Context Injection (Birth Chart Metadata) -> Gemini Provider -> Response Formatting Sanitization -> UI Display.
- **Invariants**:
  - Frontend strips literal `\n` sequence artifacts and raw JSON text.
  - Gemini receives exact deterministic planetary positions from calculation engine.
  - Structured navigation commands (e.g., "Show my planets") execute allowlisted Flutter screen routing safely.

### FLOW G — Paid Feature Entitlements
- **Journey**: Free User -> Access Career Report / Premium Kundli -> Entitlement Check (`entitlements` table) -> Blocked (403 Forbidden).
- **Invariants**:
  - Entitlement enforcement performed exclusively at API layer. Client boolean toggles or local cache cannot bypass backend checks.

### FLOW H — Razorpay Payment Lifecycle
- **Journey**: Create Order (`POST /api/v1/payments/create-order`) -> Razorpay Order ID -> Payment Gateway Checkout -> Backend Signature Verification -> Atomic DB Transaction (`Order: PAID`, `Entitlement: GRANTED`, Audit Log) -> Notification.
- **Invariants**:
  - Entitlement granted ONLY after HMAC SHA256 signature verification succeeds on backend.
  - Idempotency replay support for duplicate webhooks or network retries.

### FLOW I — Career Report Generation Pipeline
- **Journey**: Report Request -> BullMQ Queue Job -> `CareerReportWorker` -> Astrology Evidence Extraction -> TeX Rendering -> XeLaTeX Compiler -> S3 PDF Storage -> Status Update (`COMPLETED`).
- **Invariants**:
  - Report status transitions: `QUEUED` -> `CALCULATING` -> `ANALYZING` -> `RENDERING` -> `COMPILING` -> `UPLOADING` -> `COMPLETED`.
  - Failed jobs mark status `FAILED` with non-empty error code; zero fallback to fake dummy reports.

### FLOW J — Notification Dispatch & Idempotency
- **Journey**: Event (Report Ready / Payment Success) -> NotificationService -> Idempotency Check -> In-App DB Record -> FCM Push Delivery -> Transactional Email.
- **Invariants**:
  - Duplicate notifications prevented via idempotency key / entityId within 1-hour window.
  - Invalid FCM device tokens automatically marked `isActive = false` on FCM failure responses.

### FLOW K — Report Viewing & Security Access Controls
- **Journey**: User Notification / Library -> Request PDF Download -> User Ownership Verification -> Signed S3 URL Stream.
- **Invariants**:
  - User A cannot access or download User B's report (404/403 Ownership Guard).

### FLOW L — Admin Panel Operations & RBAC
- **Journey**: Admin Sign In -> Session Authorization -> Dashboard -> User Management -> Report Pipeline Inspection -> Audit Log Recording.
- **Invariants**:
  - Super Admin, Admin, and Support roles enforce strict permission checks (`users:suspend`, `reports:regenerate`, `analytics:read`).

### FLOW M — Admin Analytics & Business Intelligence
- **Journey**: Analytics Dashboard -> Real PostgreSQL Aggregation Queries -> Date Filter -> Export CSV.
- **Invariants**:
  - 100% real database metrics; zero fabricated numbers. In-memory TTL cache (60s) prevents DB thrashing.

### FLOW N — Session Expiry & Multi-Device Token Cleanup
- **Journey**: User Logout -> Invalidate Access Token -> Delete Local Storage -> Deactivate FCM Token (`isActive = false`).
- **Invariants**:
  - Logout cleans device tokens to avoid cross-user push notification leakage.

### FLOW O — Controlled Error Injection & Resilience
- **Journey**: Simulated Dependency Outage (Redis down, FCM timeout, Gemini rate limit) -> Graceful API Error Handling -> Standardized Error Payload (`code`, `message`, `requestId`).
- **Invariants**:
  - System returns valid machine-readable JSON error; server process remains active without crashing.
