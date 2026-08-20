# Astro Sushil Guest Mode & Security Specification

This document details the architectural design, security posture, data flow, entitlement matrix, and migration lifecycle for **Guest Mode** in Astro Sushil.

---

## 1. Overview & Security Posture

Astro Sushil provides unauthenticated users ("Guests") full access to free, deterministic astrological features (such as Kundli birth chart calculation, planetary positions, house analysis, Nakshatra details, daily Rashi Bhavishya, and Vastu recommendations) without requiring an account or database registration.

### Core Security Principles
1. **Stateless Backend**: The Node.js/Fastify backend never persists guest data into PostgreSQL or Redis. Guest calculations take direct transient `BirthDetails` payloads.
2. **Deterministic Calculation Integrity**: Calculation formulas (ephemeris, chart math, BNN rules) remain 100% deterministic and rule-based regardless of authentication status.
3. **Strict Paid Feature Gating**: Paid features (Gupta Nadi deep analysis, premium PDF reports, payment checkouts, cloud profile synchronization) strictly enforce JWT authentication via the `authenticate` middleware.
4. **Local Device Data Ownership**: Guest birth details are stored locally on the device via `SecureStorageService` / local cache.
5. **Rate Limiting**: Unauthenticated endpoints use IP-based rate limiting via `@fastify/rate-limit` to prevent denial-of-service or calculation abuse.

---

## 2. Architecture & Data Flow

```
[ Flutter Mobile App ] (Guest State)
        │
        ├── 1. Enter Birth Details locally ──> Saved to SecureStorage (guest_birth_profile)
        │
        ├── 2. Request Chart ──> POST /api/v1/astrology/chart { birthDetails: { name, dob, tob, lat, lng, tz } }
        │                        (Header: optional or no Bearer token)
        │
 [ Fastify Backend ]
        │
        ├── 3. authenticateOptional plugin ──> req.user = null (or User payload if token supplied)
        ├── 4. rate-limit check (IP based) ──> Passed (e.g. 60 req/min)
        ├── 5. AstrologyService.calculateChartForDirectInput ──> Pure in-memory calculation via astrology-engine
        │
 [ Pure Domain Engine ]
        │
        └── 6. Returns AstroChartResponseDto (No DB writes executed)
```

---

## 3. Entitlement & Gating Matrix

| Feature | Feature Type | Auth Requirement | Backend Route | Local/Guest Supported |
| :--- | :--- | :--- | :--- | :--- |
| **Kundli Birth Chart** | Free | Optional Auth | `POST /api/v1/astrology/chart` | ✅ Yes (transient calculation) |
| **Planetary Positions** | Free | Optional Auth | `POST /api/v1/astrology/chart` | ✅ Yes |
| **Houses & Nakshatras** | Free | Optional Auth | `POST /api/v1/astrology/chart` | ✅ Yes |
| **Daily Rashi Bhavishya**| Free | Public | `GET /api/v1/astrology/rashi-bhavishya` | ✅ Yes |
| **Vastu Advice** | Free | Public | Local / Public Content | ✅ Yes |
| **Local Profile Edit** | Free | Local Device | Local Storage | ✅ Yes |
| **Gupta Nadi Analysis** | Paid | Gated (`authenticate`) | `POST /api/v1/gupta-nadi/analyze` | ❌ Gated (`AuthRequiredGate`) |
| **Premium PDF Reports** | Paid | Gated (`authenticate`) | `POST /api/v1/reports/generate` | ❌ Gated (`AuthRequiredGate`) |
| **Saved DB Profiles Sync**| Paid | Gated (`authenticate`) | `GET/POST /api/v1/birth-profiles` | ❌ Gated (`AuthRequiredGate`) |
| **Payment Checkout** | Paid | Gated (`authenticate`) | `POST /api/v1/payments/checkout` | ❌ Gated (`AuthRequiredGate`) |

---

## 4. Migration Lifecycle (Guest -> Authenticated)

When a guest user decides to create an account or sign in:

1. **Detection**: Upon successful login or registration, the client checks if a local guest profile exists (`StorageKeys.guestBirthProfile`).
2. **User Consent**: A prompt offers to migrate the guest details:
   > *"We found birth details for [Name] created during your guest session. Would you like to save this profile to your new account?"*
3. **Idempotent API Migration**:
   - Client sends `POST /api/v1/birth-profiles/migrate` with the guest birth details.
   - Backend checks if an identical profile (matching name, DOB, latitude, longitude) already exists under the user's ID.
   - If match exists, returns the existing record; otherwise creates a new Prisma `BirthProfile` record.
4. **Local Cleanup**: Upon successful migration, local guest flags (`isGuestMode`, `guestBirthProfile`) are cleared from local storage.

---

## 5. Rate Limiting & Operational Security

- **Fastify Rate Limit**: Endpoints accepting direct transient calculation payloads use IP-based rate limiting (60 requests per minute by default).
- **Cache Invalidation**: Guest calculations are cached in local client storage (`kundli_chart_{inputHash}_1.0.0`) for 30 days to avoid redundant network round-trips.
