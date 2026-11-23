# REST API Specification - Astro Sushil Platform Core Free Astrology Backend

This document specifies the actual implemented API architecture and endpoints for `apps/api` (Fastify + TypeScript + Prisma + PostgreSQL).

---

## 1. Global API Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTP / HTTPS
- **Authentication**: Bearer JWT tokens in HTTP `Authorization` header (`Authorization: Bearer <JWT>`).
- **Interactive Documentation**: Available at `/documentation` via OpenAPI / Swagger UI.
- **Request Tracing**: All API responses contain a unique `x-request-id` header for request tracing.

### Error Response Structure
All error responses adhere to a consistent JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | AUTHENTICATION_ERROR | AUTHORIZATION_ERROR | NOT_FOUND | CONFLICT | UNCONFIRMED_METHODOLOGY | ASTROLOGY_CALCULATION_FAILED | INTERNAL_ERROR",
    "message": "Human-readable error summary",
    "details": [
      {
        "field": "body.email",
        "message": "Invalid email address format"
      }
    ],
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 2. Implemented API Endpoints

### 2.1 System Health
- **`GET /api/v1/health`** (and `/health`)
  - **Auth**: Public
  - **Summary**: Returns API health status.
  - **Response 200**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-08-15T08:33:00.000Z",
      "service": "astro-api",
      "environment": "development"
    }
    ```

---

## 2.2 Authentication Module (`/api/v1/auth`)

- **`POST /api/v1/auth/register`**
  - **Auth**: Public
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    ```
  - **Response 201**:
    ```json
    {
      "user": {
        "id": "c39a8c90-9516-4e59-a5b6-ef3930b80f12",
        "email": "user@example.com",
        "role": "USER",
        "createdAt": "2026-08-15T08:33:00.000Z"
      },
      "tokens": {
        "accessToken": "<JWT_ACCESS_TOKEN>",
        "refreshToken": "<OPAQUE_REFRESH_TOKEN>",
        "expiresIn": "15m"
      }
    }
    ```

- **`POST /api/v1/auth/login`**
  - **Auth**: Public
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    ```
  - **Response 200**: Same response structure as `/register`.

- **`POST /api/v1/auth/refresh`**
  - **Auth**: Public
  - **Request Body**:
    ```json
    {
      "refreshToken": "<OPAQUE_REFRESH_TOKEN>"
    }
    ```
  - **Response 200**:
    ```json
    {
      "tokens": {
        "accessToken": "<NEW_JWT_ACCESS_TOKEN>",
        "refreshToken": "<NEW_OPAQUE_REFRESH_TOKEN>",
        "expiresIn": "15m"
      }
    }
    ```

- **`POST /api/v1/auth/logout`**
  - **Auth**: Public
  - **Request Body**:
    ```json
    {
      "refreshToken": "<OPAQUE_REFRESH_TOKEN>"
    }
    ```
  - **Response 200**:
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

- **`GET /api/v1/auth/me`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Response 200**:
    ```json
    {
      "id": "c39a8c90-9516-4e59-a5b6-ef3930b80f12",
      "email": "user@example.com",
      "role": "USER",
      "createdAt": "2026-08-15T08:33:00.000Z",
      "updatedAt": "2026-08-15T08:33:00.000Z"
    }
    ```

---

## 2.3 User Profile Module (`/api/v1/users`)

- **`GET /api/v1/users/me`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns authenticated user profile.
  - **Response 200**: Same structure as `/auth/me`.

---

## 2.4 Birth Profile Module (`/api/v1/birth-profiles`)

- **`POST /api/v1/birth-profiles`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Request Body**:
    ```json
    {
      "name": "Sushil Kumar",
      "dateOfBirth": "1990-05-15",
      "timeOfBirth": "14:30:00",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "timezone": "Asia/Kolkata",
      "placeName": "New Delhi, India"
    }
    ```
  - **Response 201**:
    ```json
    {
      "id": "f8d8b13c-7c08-410a-9d22-ee029199d91f",
      "userId": "c39a8c90-9516-4e59-a5b6-ef3930b80f12",
      "name": "Sushil Kumar",
      "dateOfBirth": "1990-05-15",
      "timeOfBirth": "14:30:00",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "timezone": "Asia/Kolkata",
      "placeName": "New Delhi, India",
      "createdAt": "2026-08-15T08:33:00.000Z",
      "updatedAt": "2026-08-15T08:33:00.000Z",
      "normalizedDetails": {
        "profileId": "f8d8b13c-7c08-410a-9d22-ee029199d91f",
        "name": "Sushil Kumar",
        "utcDateTime": "1990-05-15T09:00:00.000Z",
        "localDateTime": "1990-05-15T14:30:00",
        "timezone": "Asia/Kolkata",
        "timezoneOffsetMinutes": 330,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "placeName": "New Delhi, India"
      }
    }
    ```

- **`GET /api/v1/birth-profiles`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns array of all birth profiles owned by authenticated user.

- **`GET /api/v1/birth-profiles/:id`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns details for specified birth profile. Enforces server-side ownership authorization (404 if unauthorized).

- **`PATCH /api/v1/birth-profiles/:id`** (and `PUT`)
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Updates birth profile parameters. Enforces server-side ownership authorization.

- **`DELETE /api/v1/birth-profiles/:id`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Deletes birth profile. Enforces server-side ownership authorization.

---

## 2.5 Astrology Engine / Kundli Module (`/api/v1/astrology`)

- **`POST /api/v1/astrology/chart`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Calculates natal chart, planetary coordinates, Rashis, and Nakshatras for an authenticated user's birth profile.
  - **Authorization**: Server-side ownership enforced. Returns `404 NOT_FOUND` if profile is missing or owned by another user.
  - **Request Body**:
    ```json
    {
      "birthProfileId": "f8d8b13c-7c08-410a-9d22-ee029199d91f",
      "ayanamsa": "LAHIRI",
      "nodeType": "MEAN_NODE"
    }
    ```
  - **Calculation options** (all `/api/v1/astrology/*` POST endpoints, optional, engine 0.2.0, `docs/decisions.md` ADR-017):
    - `ayanamsa`: `LAHIRI` (default; true Chitrapaksha, ICRC / Indian Astronomical Ephemeris), `RAMAN`, `KRISHNAMURTI` (K.S. Krishnamurti's Reader table), `KP` (KP New, zero 291 CE), `FAGAN_BRADLEY`.
    - `nodeType`: `MEAN_NODE` (default) or `TRUE_NODE` (osculating node).
    - KP cusps (`POST /kp`) are always true Placidus (`cuspSystem: "PLACIDUS"` in the response). Above about ±66.56° latitude Placidus is undefined and the endpoint returns an error instead of switching house system.
    - Invalid values return `400` with the standard envelope: `{"error": {"code": "VALIDATION_ERROR", "message": "Invalid request data", "details": [{"field": "ayanamsa", ...}], "requestId": "..."}}`.
    - The applied values are echoed in `metadata.config.ayanamsa` / `metadata.config.nodeCalculation`.
  - **Response 200** (REF_CHART_001: 1990-05-15 14:30 IST, New Delhi; Sun = JPL Horizons apparent longitude 54.2755655° minus the true Lahiri ayanamsa 23.7257785°, see `packages/astrology-engine/tests/fixtures/reference-charts.ts`):
    ```json
    {
      "data": {
        "metadata": {
          "engineVersion": "0.2.0",
          "providerName": "AstronomyEngineAdapter (astronomy-engine)",
          "providerVersion": "2.1.19-mit",
          "calculationVersion": "0.2.0",
          "normalizedTime": {
            "utcIsoString": "1990-05-15T09:00:00.000Z",
            "julianDayUT": 2448026.875,
            "timezoneOffsetMinutes": 330
          },
          "config": {
            "zodiacType": "SIDEREAL",
            "ayanamsa": "LAHIRI",
            "houseSystem": "WHOLE_SIGN",
            "nodeCalculation": "MEAN_NODE",
            "planetaryCalculationMode": "GEOCENTRIC"
          }
        },
        "ascendant": null,
        "houses": [],
        "planets": [
          {
            "planet": "SUN",
            "longitude": 30.5498,
            "latitude": 0.0,
            "speedLongitude": 0.9643,
            "isRetrograde": false,
            "rashiIndex": 2,
            "rashiName": "Vrishabha",
            "degreeInRashi": 0.5498,
            "nakshatraIndex": 3,
            "nakshatraName": "Krittika",
            "pada": 2,
            "nakshatraLord": "SUN"
          }
        ],
        "rashis": [
          {
            "index": 1,
            "name": "Mesha",
            "englishName": "Aries",
            "lord": "MARS",
            "element": "FIRE",
            "modality": "CHARA",
            "planetsPresent": []
          }
        ],
        "nakshatras": [
          {
            "index": 1,
            "name": "Ashwini",
            "lord": "KETU",
            "planetsPresent": []
          }
        ]
      }
    }
    ```

---

## 2.6 Rashi Bhavishya Module (`/api/v1/rashi-bhavishya`)

- **`GET /api/v1/rashi-bhavishya/today`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Query Params**: `?rashi=Mesha` or `?rashiIndex=1` or `?date=YYYY-MM-DD` (Optional). `?language=en|hi` (Optional, default `en`): language of the narrative and of the reader-facing names. The facts (planet codes, sign indexes, houses, classifications, times) are identical in both languages; a Hindi response adds `language: "hi"`, `hindiName` on every sign and `classificationLabel` on every planet, and gives planet, weekday, tithi, nakshatra, yoga and karana names, house themes and method notes in Hindi. An unknown language is a 400. See `docs/report-system/decisions/rashi-bhavishya.md` (RB-014).
  - **Behavior**: If query parameters are omitted, automatically calculates the authenticated user's Moon Rashi from their default `BirthProfile`.
  - **Response 200**:
    ```json
    {
      "data": {
        "date": "2026-08-18",
        "rashi": {
          "index": 1,
          "sanskritName": "Mesha",
          "englishName": "Aries",
          "element": "Fire",
          "ruler": "Mars"
        },
        "prediction": {
          "summary": "A dynamic energy surround your day...",
          "categories": {
            "general": "...",
            "health": "...",
            "love": "...",
            "career": "...",
            "finance": "..."
          },
          "luckyNumber": 9,
          "luckyColor": "Red"
        },
        "source": "AstroSushil Reference Content Fixtures",
        "isDevelopmentFixture": true
      }
    }
    ```

- **`GET /api/v1/rashi-bhavishya/all`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns daily predictions for all 12 Rashis.
  - **Query Params**: `?date=YYYY-MM-DD`, `?language=en|hi` (Optional, default `en`). Lists only the rows already prepared in that language; the response carries `language`.

---

## 2.7 Vastu Shastra Module (`/api/v1/vastu`)

- **`GET /api/v1/vastu/categories`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns all 8 Vastu room/space categories.
  - **Response 200**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "slug": "main-entrance",
          "name": "Main Entrance (Simhadwara)",
          "sanskritName": "Simhadwara",
          "description": "The primary gateway of cosmic Prana energy...",
          "idealDirection": "North, East, or North-East",
          "element": "Air / Space",
          "iconName": "door"
        }
      ]
    }
    ```

- **`GET /api/v1/vastu/guidance`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Query Params**: `?category=main-entrance` or `?categoryId=1` (Optional).
  - **Response 200**:
    ```json
    {
      "data": [
        {
          "categoryId": 1,
          "categorySlug": "main-entrance",
          "categoryName": "Main Entrance (Simhadwara)",
          "idealDirection": "North, East, or North-East",
          "alternativeDirections": ["North-West"],
          "forbiddenDirections": ["South-West"],
          "element": "Air / Space",
          "rulingPlanet": "Jupiter / Sun",
          "keyPrinciples": [...],
          "dos": [...],
          "donts": [...],
          "remedies": [...]
        }
      ]
    }
    ```

---

## 2.8 Paid Reports: report language (`/api/v1/reports`)

This section documents only the report language. A report PDF is produced in English (`en`) or Hindi (`hi`). The customer chooses the language when the report is created; it is stored on the report (`reports.language`, default `en`) and never changes afterwards.

- **Which languages a report has** is read from the report registry at request time (`ReportRegistry.languages`), never from a fixed list in the API. **`GET /api/v1/payments/catalog`** (public) returns it per report item as `languages`, so a client can offer the choice before payment:
  ```json
  { "items": [ { "id": "report-kundli", "itemType": "REPORT", "legacyReportType": "KUNDLI", "languages": ["en", "hi"], "...": "..." } ] }
  ```
  Items that are not reports have no `languages` field. A report type without a generator has `"languages": []`.

- **`POST /api/v1/reports/generate`** (and `POST /api/v1/reports`), **`POST /api/v1/reports/career`**
  - **Auth**: Bearer JWT
  - **Body (addition)**: `language` — optional, `"en"` or `"hi"`. Omitted means `"en"`, so existing clients are unchanged.
    ```json
    { "birthProfileId": "…", "reportType": "KUNDLI", "orderId": "…", "language": "hi" }
    ```
  - **Response `201` (addition)**: `language` — the language of the report the response refers to.
    ```json
    { "reportId": "…", "id": "…", "status": "QUEUED", "stage": "QUEUED", "progress": 0, "language": "hi", "reused": false }
    ```
  - **Errors**:
    - `400 VALIDATION_ERROR` — `language` is not `en` or `hi`.
    - `400 REPORT_LANGUAGE_NOT_AVAILABLE` — the report type has no edition in that language. Checked first, before the order is looked up: no fulfilment unit is claimed and no report is created.
      ```json
      { "error": { "code": "REPORT_LANGUAGE_NOT_AVAILABLE", "message": "The KUNDLI report is not available in language \"hi\". Available: en.", "requestId": "…" } }
      ```
    - `409 REPORT_LANGUAGE_FIXED` — the paid slot already has a report for this person in another language and the request explicitly names a different one. A request **without** `language` returns the existing report (its `language` is in the response).
  - **Regeneration** (`forceRegenerate: true`) re-queues the existing report in its stored language.

- **`POST /api/v1/reports/career/:reportId/regenerate`**
  - **Body**: none required. An optional `{ "language": "en" | "hi" }` must equal the report's stored language, otherwise `409 REPORT_LANGUAGE_FIXED`. The report is regenerated in its stored language.

- **`GET /api/v1/reports/my-reports`**, **`GET /api/v1/reports/:id`**, **`GET /api/v1/reports/:id/status`**
  - **Response (addition)**: `language` (`"en"` | `"hi"`) on every report.

- **Files**: each report row has its own storage key (`reports/<userId>/<reportId>.pdf`), so the English and Hindi report of the same person never share a file. The download file name of a Hindi report ends in `-hi` (for example `kundli-asha-rao-1a2b3c4d-hi.pdf`); English file names are unchanged.

---

## 3. Future Planned Endpoints (Phase 5+)

- **Gupta Nadi Engine** (`/api/v1/gupta-nadi/*`)
- **Paid Reports** (`/api/v1/reports/*`)
- **Razorpay Payments** (`/api/v1/payments/*`)
- **WhatsApp Webhooks** (`/api/v1/webhooks/whatsapp`)
