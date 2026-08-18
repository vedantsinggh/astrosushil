# Astro Sushil - Network & Offline Behavior Specification

This specification documents the network requirements, caching rules, fallbacks, and freshness indicators across all major features of the Astro Sushil platform.

---

## Feature Matrix

| Feature | Network Required | Cache Available | Fallback Behavior | Freshness Indicator | Cache Invalidation Rule |
|---|---|---|---|---|---|
| **App Startup** | No | Yes (Config / Session) | Loads app shell immediately from cached session. Checks network in background. | None | Session token expiry or explicit logout. |
| **Birth Profiles** | Initial sync only | Yes | Local cached profile list displayed offline. Edits show "Connection required to save changes". | "Saved Profile" tag offline | Invalidated on create/update/delete API response. |
| **Kundli (Birth Chart)** | Initial calculation | Yes | Displays cached natal chart & planetary positions offline. | "Saved version • Updated X ago" | Invalided if profile details or calculation engine version changes. |
| **Planets Overview** | Initial fetch | Yes | Displays cached planetary positions & degrees offline. | "Saved version • Updated X ago" | 24-hour TTL or manual refresh. |
| **Rashi Bhavishya** | Daily prediction | Yes | Displays cached prediction for selected sign. Stale predictions marked clearly. | "Last updated yesterday" (if stale) | Invalided at 00:00 local time daily. |
| **Vastu Guidance** | Initial category fetch | Yes | Browse all downloaded Vastu topics and guidelines offline. | "Offline Content" badge | Manual refresh or content version update. |
| **PDF Chart Export** | No (if chart cached) | Yes | Generates PDF document locally from cached chart model without network. | None | Built on-demand from current chart. |
| **Authentication / Login** | Yes | Session token only | Cannot login or register offline. Displays `AstroOfflineState` with retry. | Session validity check | Token expiration (401 response). |

---

## Detailed Feature Behaviors

### 1. Kundli (Birth Chart)
- **Online:** Fetches fresh calculation from Fastify API `/astrology/chart`. Automatically saves result to `LocalCacheService` with key `kundli_chart_{profileId}_{engineVersion}`.
- **Slow Network:** Displays `AstroLoader` with cosmic copy ("Aligning your stars..."). After 12s, displays "Your connection seems slow. Still trying to reach Astro Sushil..." with option to load cached chart or retry.
- **Offline:** Immediately renders cached chart. Displays `AstroStaleDataBanner` at top of screen ("Saved version • Updated 3 days ago").
- **Offline Uncached:** Displays `AstroOfflineState` with "Connect to the internet to calculate your birth chart." + [Try Again] button.

### 2. Rashi Bhavishya (Horoscope)
- **Online:** Fetches today's prediction `/rashi-bhavishya/today?rashi={rashi}`. Saves to cache with key `rashi_prediction_{date}_{rashi}`.
- **Offline (Today's cached data):** Renders prediction smoothly with offline hint.
- **Offline (Yesterday's cached data):** Renders prediction with warning banner: "Last updated yesterday. Connect online for today's forecast." NEVER presents yesterday's forecast as today's.
- **Offline Uncached:** Displays `AstroOfflineState` + [Try Again] button.

### 3. Vastu Shastra
- **Online:** Fetches categories `/vastu/categories` and guidance `/vastu/guidance`. Caches aggressively under `vastu_categories` and `vastu_guidance_{categoryId}`.
- **Offline:** User can browse all previously viewed categories and room guidelines without network interrupts.

### 4. Duplicate Request Protection
- Interactive trigger buttons (e.g. Generate Chart, Download PDF, Login) set button state `isLoading = true` and disable tap callbacks immediately upon execution until response completes or errors.
