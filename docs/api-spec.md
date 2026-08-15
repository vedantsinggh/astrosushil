# REST API Specification - Astro Sushil Platform Backend Foundation

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

### 2.2 Authentication Module (`/api/v1/auth`)

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

### 2.3 User Profile Module (`/api/v1/users`)

- **`GET /api/v1/users/me`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns authenticated user profile.
  - **Response 200**: Same structure as `/auth/me`.

---

### 2.4 Birth Profile Module (`/api/v1/birth-profiles`)

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
  - **Response 200**: Array of `BirthProfile` objects with `normalizedDetails`.

- **`GET /api/v1/birth-profiles/:id`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Returns details for specified birth profile. Enforces server-side ownership authorization. Returns 404 if profile does not exist or does not belong to user.

- **`PUT /api/v1/birth-profiles/:id`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Updates birth profile parameters. Enforces server-side ownership authorization.

- **`DELETE /api/v1/birth-profiles/:id`**
  - **Auth**: Bearer JWT (`USER` or `ADMIN`)
  - **Summary**: Deletes birth profile. Enforces server-side ownership authorization.
  - **Response 200**:
    ```json
    {
      "message": "Birth profile deleted successfully"
    }
    ```

---

### 2.5 Astrology Engine Module (`/api/v1/astrology`)

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
      "chart": {
        "calculationVersion": "0.1.0",
        "providerName": "AstronomyEngineAdapter (astronomy-engine)",
        "providerVersion": "2.1.19-mit",
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
        },
        "ascendant": null,
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
        "houses": [],
        "rashis": [],
        "nakshatras": []
      }
    }
    ```
  - **Response 400**: Missing or non-UUID `birthProfileId`.
  - **Response 404**: Profile not found or unauthorized access attempt.
  - **Response 422**: Unconfirmed astrology methodology blocking execution (`UNCONFIRMED_METHODOLOGY`).
  - **Response 500**: Astrology engine internal calculation error (`ASTROLOGY_CALCULATION_FAILED`).

---

## 3. Future Planned Endpoints (Phase 4+)

- **Gupta Nadi Engine** (`/api/v1/gupta-nadi/*`)
- **Predictions & Transits** (`/api/v1/predictions/*`)
- **Reports & PDF Generation** (`/api/v1/reports/*`)
- **Razorpay Payments** (`/api/v1/payments/*`)
- **WhatsApp Webhooks** (`/api/v1/webhooks/whatsapp`)
