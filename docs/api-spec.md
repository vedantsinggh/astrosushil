# Conceptual API Specification - Astro Sushil

This document outlines the conceptual API architecture, endpoint domain groupings, authentication mechanisms, and request/response principles for `apps/api`.

> **NOTICE**: This document defines initial API contracts at a specification level only. No API controllers or routes are implemented in code at this phase.

---

## 1. API Architecture Overview

- **Protocol**: RESTful HTTPS APIs for synchronous request-response; WebSockets for real-time order updates where applicable.
- **Data Format**: JSON (JavaScript Object Notation).
- **Authentication**: JWT (JSON Web Tokens) passed via `Authorization: Bearer <token>` headers.
- **Base URL Structure**: `https://api.astrosushil.com/v1`

---

## 2. API Domain Breakdown

### 2.1 Authentication Domain (`/v1/auth`)
Handles user onboarding, mobile phone OTP verification, token generation, and token refreshing.

- `POST /v1/auth/request-otp`: Request phone OTP for mobile login.
- `POST /v1/auth/verify-otp`: Verify OTP code and return JWT access/refresh tokens.
- `POST /v1/auth/refresh-token`: Exchange valid refresh token for a new access token.
- `POST /v1/auth/logout`: Invalidate current active session.

---

## 2.2 User Profile & Saved Charts Domain (`/v1/users`)
Manages user profile data and saved birth profiles (e.g. self, spouse, family members).

- `GET /v1/users/me`: Fetch current authenticated user profile.
- `PATCH /v1/users/me`: Update user details (name, preferred language, notification preferences).
- `GET /v1/users/profiles`: List all saved birth profiles under user account.
- `POST /v1/users/profiles`: Add a new saved birth profile.
- `GET /v1/users/profiles/:profileId`: Retrieve specific birth profile details.
- `PUT /v1/users/profiles/:profileId`: Update specific birth profile.
- `DELETE /v1/users/profiles/:profileId`: Delete a saved birth profile.

---

## 2.3 Astrology Calculation Domain (`/v1/astrology`)
Synchronous endpoint domain for free foundational astrology features and chart rendering data.

- `POST /v1/astrology/kundli`: Calculate D-1 Rashi chart positions, degrees, nakshatras, and ascendant.
- `POST /v1/astrology/planetary-positions`: Fetch detailed planetary vector (sign, degree, house, retrograde, combustion).
- `POST /v1/astrology/divisional-charts`: Calculate specific Vargas (D-2, D-3, D-7, D-9, D-10, D-12, etc.).
- `POST /v1/astrology/dashas`: Calculate Vimshottari Dasha timeline (Mahadasha, Antardasha, Pratyantardasha).
- `POST /v1/astrology/panchang`: Fetch daily Panchang details (Tithi, Vara, Nakshatra, Yoga, Karana).
- `GET /v1/astrology/daily-horoscope`: Fetch daily Rashi Bhavishya forecasts by Moon sign.
- `GET /v1/astrology/vastu-guidance`: Retrieve categorized Vastu guidance articles/tips.

---

## 2.4 Gupta Nadi Domain (`/v1/gupta-nadi`)
Provides evaluation of Brihaspati Nandi Nadi (BNN) rules and combinations for active birth charts.

- `POST /v1/gupta-nadi/evaluate`: Evaluate BNN rule combinations against a birth chart.
- `POST /v1/gupta-nadi/transits`: Calculate current transit overlays (Saturn, Jupiter, Rahu, Ketu) against natal chart.
- `POST /v1/gupta-nadi/predictions`: Generate deterministic Nadi prediction codes and timing windows.

---

## 2.5 Reports & Order Management Domain (`/v1/reports`)
Handles requesting, purchasing, tracking, and retrieving paid custom PDF reports.

- `GET /v1/reports/catalog`: Fetch list of available report products, descriptions, and pricing.
- `POST /v1/reports/orders`: Create a report generation order.
- `GET /v1/reports/orders`: List user's report order history and statuses.
- `GET /v1/reports/orders/:orderId`: Fetch status and download URL of a specific report order.
- `GET /v1/reports/orders/:orderId/download`: Redirect or fetch presigned S3 URL for downloading PDF report.

---

## 2.6 Payments Domain (`/v1/payments`)
Integrates backend payment operations with Razorpay gateway.

- `POST /v1/payments/create-order`: Initialize Razorpay payment order for a report request.
- `POST /v1/payments/verify`: Verify Razorpay payment signature after client checkout completion.
- `POST /v1/payments/webhook`: Process Razorpay asynchronous payment webhooks (server-to-server).

---

## 2.7 External Channel: WhatsApp Webhooks Domain (`/v1/webhooks/whatsapp`)
Receives incoming messages and event notifications from Meta WhatsApp Business Platform.

- `GET /v1/webhooks/whatsapp`: Webhook verification endpoint required by Meta.
- `POST /v1/webhooks/whatsapp`: Process incoming WhatsApp messages, user interactions, and message delivery receipts.

---

## 2.8 Push Notifications Domain (`/v1/notifications`)
Manages mobile device tokens and notification preferences.

- `POST /v1/notifications/device-token`: Register FCM device token for push notifications.
- `DELETE /v1/notifications/device-token`: Unregister device token on logout.

---

## 2.9 Admin Panel Domain (`/v1/admin`)
Restricted endpoints reserved for Next.js Admin Panel operations (`/apps/admin`). Protected by Admin RBAC roles.

- `GET /v1/admin/dashboard/stats`: Retrieve high-level platform analytics (DAU, revenue, report counts).
- `GET /v1/admin/users`: List and search registered users.
- `GET /v1/admin/orders`: Monitor all system report orders and generation statuses.
- `POST /v1/admin/orders/:orderId/retry`: Re-queue a failed report generation job.
- `GET /v1/admin/nadi-rules`: List all configured BNN rules.
- `PATCH /v1/admin/nadi-rules/:ruleId`: Activate, deactivate, or adjust priority weight of a BNN rule.

---

## 3. Standard Response Formats

### 3.1 Success Response Template
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-08-15T00:00:00.000Z"
}
```

### 3.2 Error Response Template
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "INVALID_BIRTH_TIME",
    "message": "Birth time must be specified in valid HH:mm:ss 24-hour format.",
    "details": []
  },
  "timestamp": "2026-08-15T00:00:00.000Z"
}
```
