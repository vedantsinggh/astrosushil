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
      "birthProfileId": "f8d8b13c-7c08-410a-9d22-ee029199d91f"
    }
    ```
  - **Response 200**:
    ```json
    {
      "data": {
        "metadata": {
          "engineVersion": "0.1.0",
          "providerName": "AstronomyEngineAdapter (astronomy-engine)",
          "providerVersion": "2.1.19-mit",
          "calculationVersion": "0.1.0",
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
            "longitude": 50.2541,
            "latitude": 0.0,
            "speedLongitude": 0.963,
            "isRetrograde": false,
            "rashiIndex": 2,
            "rashiName": "Vrishabha",
            "degreeInRashi": 20.2541,
            "nakshatraIndex": 4,
            "nakshatraName": "Rohini",
            "pada": 4,
            "nakshatraLord": "MOON"
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
  - **Query Params**: `?rashi=Mesha` or `?rashiIndex=1` or `?date=YYYY-MM-DD` (Optional).
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

## 3. Future Planned Endpoints (Phase 5+)

- **Gupta Nadi Engine** (`/api/v1/gupta-nadi/*`)
- **Paid Reports** (`/api/v1/reports/*`)
- **Razorpay Payments** (`/api/v1/payments/*`)
- **WhatsApp Webhooks** (`/api/v1/webhooks/whatsapp`)
