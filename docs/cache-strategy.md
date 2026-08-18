# Astro Sushil - Local Cache Strategy & Architecture

This document defines the storage layers, caching rules, key formats, TTLs, invalidation protocols, and security guidelines for the Astro Sushil application.

---

## 1. Storage Architecture

```
Flutter Application
 ├── SecureStorageService (FlutterSecureStorage)
 │     ├── JWT Access Tokens
 │     ├── Refresh Tokens
 │     └── Onboarding Flag
 └── LocalCacheService (SharedPreferences / Encrypted File Store)
       ├── Cached Birth Profiles
       ├── Cached Astro Charts
       ├── Cached Planetary Positions
       ├── Cached Rashi Predictions
       └── Cached Vastu Content
```

- **Sensitive Data (Tokens, Passwords):** Stored exclusively via `SecureStorageService` using `FlutterSecureStorage` (AES encryption on Android SharedPreferences / Keychain accessibility on iOS).
- **Domain Read Data (Charts, Predictions, Content):** Stored via `LocalCacheService` as JSON payloads wrapped with cache metadata (`cachedAt`, `expiresAt`, `version`, `isStale`).

---

## 2. Cache Metadata Model

Every cached payload stored in `LocalCacheService` follows this JSON structure:

```json
{
  "key": "kundli_chart_prof123_v1",
  "cachedAt": "2026-08-18T04:00:00.000Z",
  "expiresAt": "2026-08-25T04:00:00.000Z",
  "version": "1.0.0",
  "data": { ... }
}
```

---

## 3. Cache Keys & TTL Rules

| Domain Resource | Cache Key Pattern | TTL / Expiry | Invalidation Strategy |
|---|---|---|---|
| **Birth Profiles** | `birth_profiles_list` | 7 Days | Invalidated on profile creation, update, or deletion. |
| **Astro Chart (Kundli)** | `kundli_chart_{profileId}_{engineVersion}` | 30 Days | Invalidated if profile details change or engine version is bumped. |
| **Planets Overview** | `planets_overview_{profileId}` | 24 Hours | Invalidated after 24h or manual user pull-to-refresh. |
| **Rashi Bhavishya** | `rashi_{date}_{rashiIndex}` | 24 Hours (Midnight) | Automatically marked stale after current date passes. |
| **Vastu Categories** | `vastu_categories` | 30 Days | Invalidated on backend content version update. |
| **Vastu Guidance** | `vastu_guidance_{categoryId}` | 30 Days | Invalidated on backend content version update. |

---

## 4. Cache Invalidation & Engine Versioning

### Astrology Engine Versioning
Because astrological calculation rules or Swiss Ephemeris data files may be updated in the backend `astrology-engine` package:
- Chart cache keys include `engineVersion` (e.g. `1.0.0`).
- If the backend increments `ENGINE_VERSION`, previous cached calculations will not match the key and will automatically trigger a remote recalculation upon connection.

### Cache Eviction Protocol
- `LocalCacheService` automatically clears expired items when memory capacity exceeds threshold.
- Calling `LocalCacheService.clearAll()` or user logout purges all cached domain data.
