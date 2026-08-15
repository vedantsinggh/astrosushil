# REST & WebSocket API Specification (Conceptual) - Astro Sushil

This document outlines the conceptual API architecture and intended endpoints for `apps/api` (NestJS backend).

> **NOTICE**: This specification is for architectural planning only. No API code is implemented in this phase.

---

## 1. Global API Standards

- **Base URL**: `https://api.astrosushil.com/v1`
- **Protocol**: HTTPS / Secure WebSockets (`wss://`)
- **Authentication**: Bearer JWT tokens in HTTP Authorization header (`Authorization: Bearer <JWT>`).
- **Response Format**: Standard JSON wrapper structure:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2026-08-15T08:00:00.000Z"
}
```

---

## 2. API Domain Overview

### 2.1 Authentication & Authorization (`/auth`)
- `POST /auth/request-otp` - Send SMS OTP for phone verification.
- `POST /auth/verify-otp` - Verify OTP and return JWT access token.
- `POST /auth/refresh` - Refresh expired access token.
- `POST /auth/logout` - Invalidate current session token.

### 2.2 User Profile Management (`/users`)
- `GET /users/me` - Fetch authenticated user profile data.
- `PATCH /users/me` - Update user preference settings (language, chart style).
- `DELETE /users/me` - Request account deletion (GDPR / Data privacy).

### 2.3 Birth Details & Saved Profiles (`/birth-profiles`)
- `POST /birth-profiles` - Create a new birth details profile (self, family, friends).
- `GET /birth-profiles` - List saved birth profiles for authenticated user.
- `GET /birth-profiles/:id` - Fetch specific birth profile details.
- `PUT /birth-profiles/:id` - Update existing birth profile.
- `DELETE /birth-profiles/:id` - Remove saved birth profile.

### 2.4 Astrology Engine Services (`/astrology`)
- `POST /astrology/chart` - Generate raw D-1 Kundli chart and house placements.
- `POST /astrology/planetary-positions` - Fetch detailed planetary coordinates table.
- `POST /astrology/vargas` - Calculate specified divisional chart (D-9, D-10, etc.).
- `POST /astrology/dasha` - Fetch Vimshottari Dasha timeline tree.
- `POST /astrology/panchang` - Calculate Panchang details for a date and location.

### 2.5 Predictions & Transits (`/predictions`)
- `GET /predictions/daily` - Fetch daily Rashi Bhavishya for user's Moon sign.
- `POST /predictions/transits` - Evaluate current planetary transits against birth chart.

### 2.6 Gupta Nadi Engine Services (`/gupta-nadi`)
- `POST /gupta-nadi/evaluate` - Evaluate BNN rules for a given birth chart profile.
- `POST /gupta-nadi/timing` - Calculate transit overlay timing for major life events.

### 2.7 Report Engine Services (`/reports`)
- `GET /reports/types` - List available free and paid report types with pricing.
- `POST /reports/generate` - Initiate asynchronous report generation job.
- `GET /reports/:id/status` - Check report generation status (PENDING, PROCESSING, COMPLETED).
- `GET /reports/:id/download` - Fetch secure S3 pre-signed download URL for generated PDF.

### 2.8 Payment Operations (`/payments`)
- `POST /payments/create-order` - Generate Razorpay payment order token.
- `POST /payments/verify` - Verify Razorpay payment signature after client payment.
- `POST /payments/webhook` - Receive automated payment status webhooks from Razorpay.

### 2.9 WhatsApp Integration Channel (`/webhooks/whatsapp`)
- `GET /webhooks/whatsapp` - Meta WhatsApp webhook verification endpoint.
- `POST /webhooks/whatsapp` - Receive incoming WhatsApp messages and status dispatches.

### 2.10 Push Notifications (`/notifications`)
- `POST /notifications/register-token` - Save FCM device registration token.
- `GET /notifications/history` - Fetch user notification history logs.

### 2.11 Admin Portal Management (`/admin`)
- `GET /admin/users` - Search and manage user accounts.
- `GET /admin/orders` - View all payment orders and report generation jobs.
- `POST /admin/reports/retry` - Re-enqueue failed report processing jobs.
- `GET /admin/nadi-rules` - Inspect active Gupta Nadi rule database.
- `PATCH /admin/nadi-rules/:id` - Update rule activation or priority parameters.
- `GET /admin/analytics/dashboard` - View revenue, API metrics, and queue health statistics.
