# Astro Sushil - Manual Network & Offline Testing Protocol

This guide outlines manual testing protocols for verifying network resilience, offline caching, slow network fallbacks, error handling, rate limiting, and failure state UI across Flutter and Fastify backend.

---

## 1. Test Environment Setup

### Flutter Mobile App
- **Android Emulator:** Extended Controls -> Cellular -> Network type (LTE, 3G, 2G, Offline/No Network).
- **iOS Simulator:** Developer Settings -> Network Link Conditioner -> 3G / Very Bad Network / Lossy.
- **Physical Device:** Enable Airplane Mode / Disable WiFi / Enable Data Saver.

### Backend API
- Stop Fastify server (`Ctrl+C` or kill process) to test backend offline/unreachable conditions.
- Set `MAINTENANCE_MODE=true` in `.env` to test application maintenance state.
- Simulate database failure by changing `DATABASE_URL` to an invalid port or stopping PostgreSQL container (`docker stop astro-postgres`).

---

## 2. Test Scenarios Matrix

| Scenario # | Condition | Action | Expected Result |
|---|---|---|---|
| **TC-01** | Perfect Internet | Open App & View Kundli | Chart loads rapidly (< 1s), saves to local cache. |
| **TC-02** | Slow Internet (2G/3G) | Load Kundli Chart | `AstroLoader` displays "Aligning your stars...". After 12s, displays "Your connection seems slow..." with [Retry] button without throwing unhandled error. |
| **TC-03** | Offline (Cached Data) | Turn on Airplane Mode -> Open Kundli | Chart loads instantly from local cache. Displays `AstroStaleDataBanner` ("Saved version • Updated 2 hours ago"). |
| **TC-04** | Offline (No Cached Data) | Clear App Cache -> Turn on Airplane Mode -> Load Kundli | Displays `AstroOfflineState` illustration with "You're offline" + [Try Again] button. No blank screen or exception logs. |
| **TC-05** | Server Down (503) | Stop Fastify Server -> Tap Action | Displays `AstroErrorState` with "Astro Sushil is having trouble right now" + [Retry] button. Does NOT blame user's internet connection. |
| **TC-06** | Maintenance Mode | Set `MAINTENANCE_MODE=true` -> Load App | Displays `AstroMaintenanceState` ("Astro Sushil is undergoing scheduled maintenance") with [Try Again] button. |
| **TC-07** | Session Expired (401) | Revoke token / expire JWT -> API Request | Interceptor catches 401, displays session expired banner, redirects safely to Auth screen. |
| **TC-08** | Rate Limit (429) | Rapidly tap calculation endpoint 20 times | Backend returns 429. App displays "You're making requests a little too quickly. Please wait a moment." |
| **TC-09** | Database Failure | Stop PostgreSQL -> Load Birth Profiles | Fastify returns clean 503 `DATABASE_UNAVAILABLE`. App displays safe server error UI without raw stack traces. |
| **TC-10** | Duplicate Taps | Rapidly tap "Generate Kundli" button | Button disables on first tap, showing inline loader. Second tap ignored. Single API request executed. |

---

## 3. Verification Checklist

- [ ] Zero unhandled exception dialogs or red screen error overlays.
- [ ] No blank white/black screens on network timeout or failure.
- [ ] No infinite loading spinners.
- [ ] Navigation remains fully accessible offline for cached screens.
- [ ] Technical error codes/stack traces are never exposed to end users.
