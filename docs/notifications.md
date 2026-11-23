# Astro Sushil - Notifications & Communication Infrastructure (Phase 8)

This document describes the centralized notification system for **Astro Sushil**, supporting Firebase Cloud Messaging (FCM) push notifications, transactional email delivery, persistent in-app notification records, device token lifecycle management, and admin notification diagnostics.

---

## 1. Architecture Overview

```
Business Event (Report Ready / Payment Verified)
    │
    ▼
NotificationService.sendNotification(...)
    │
    ├──> IN_APP: Database Record (Prisma `Notification`)
    │
    ├──> PUSH: FCM Push Provider (Firebase Cloud Messaging)
    │     └── DeviceToken query & automatic invalid-token cleanup
    │
    ├──> EMAIL: generic e-mail, queued in the outbox and sent by SMTP
    │     (status QUEUED / SENT / SKIPPED / FAILED - never a silent "sent")
    │
    └──> Website channels (notification.bridge.ts): for REPORT_READY, BOOKING_CONFIRMED,
          BOOKING_RESCHEDULED and PAYMENT_SUCCESS the website's SMS / WhatsApp / e-mail
          event is raised as well; its e-mail replaces the generic one.
```

SMS (SMSLane), WhatsApp (WhatChimp) and SMTP e-mail, the outbox, retries, idempotency,
the delayed report-ready delivery, the daily consultation reminder and OTP delivery are
described in [`docs/integration/modules/messaging.md`](integration/modules/messaging.md).

---

## 2. Notification Channels

1. **IN_APP**: Persistent in-app notifications stored in the PostgreSQL `notifications` table. Includes `readAt` state and JSON metadata (`entityId`, `route`).
2. **PUSH (FCM)**: Mobile push notifications delivered via Firebase Cloud Messaging REST API.
3. **EMAIL**: Transactional HTML & plain text emails rendered via centralized template generators, written to the `outbound_messages` outbox and delivered through the SMTP provider with bounded retries. E-mails that may carry a code (`PASSWORD_RESET`, `SECURITY_ALERT`) are sent at once and never stored. In production a missing SMTP configuration is reported as `FAILED` and logged as an error.
4. **SMS and WHATSAPP**: Sent for the website's customer events (order, booking, report, reminder) and for OTPs, with the website's providers and approved templates. See `docs/integration/modules/messaging.md`.

---

## 3. Device Token Lifecycle & Multi-Device Management

- **Multi-Device Support**: A single user may register multiple mobile devices. Tokens are stored in the `device_tokens` table.
- **Token Reassignment on Login**: If Device A logs out and User B logs in on Device A, the existing `fcmToken` record is reassigned to User B and marked `isActive = true`.
- **Logout Cleanup**: When a user logs out, the associated device token is marked `isActive = false` to prevent cross-user notification leakage.
- **FCM Invalid Token Cleanup**: When FCM returns `NotRegistered`, `InvalidRegistration`, `400`, `404`, or `410`, the token is immediately marked `isActive = false` without crashing the job.

---

## 4. Allowlisted Push Payload & Navigation

Push notification payloads use structured JSON data:

```json
{
  "type": "REPORT_READY",
  "entityId": "report-uuid",
  "route": "OPEN_REPORT",
  "title": "✨ Your Career Report is Ready!",
  "body": "Your detailed Career Intelligence Report has been compiled."
}
```

### Allowlisted Mobile Route Actions
- `OPEN_REPORT`: Navigates to Career Report view screen.
- `OPEN_PAYMENTS`: Navigates to Subscriptions & Payment screen.
- `OPEN_BIRTH_PROFILE`: Navigates to Birth Profile chart view.
- `OPEN_SETTINGS`: Navigates to Account & Security settings.
- `OPEN_HOME`: Fallback safe home screen navigation.

*Arbitrary URLs or non-allowlisted routes are rejected by the Flutter app.*

---

## 5. Notification Preferences

User preferences are persisted in `notification_preferences`:
- `pushEnabled` (Boolean)
- `emailEnabled` (Boolean)
- `astrologyReminders` (Boolean)
- `reportAlerts` (Boolean)
- `promotions` (Boolean, default: `false`)

**Transactional vs. Promotional Rule**: Transactional notifications (`REPORT_READY`, `PAYMENT_SUCCESS`, `SECURITY_ALERT`, `PASSWORD_RESET`) bypass optional promotional toggles to ensure critical user alerts are delivered.

**E-mail, SMS and WhatsApp rule**: OTPs and payment / order / booking confirmations (`PAYMENT_SUCCESS`, `BOOKING_CONFIRMED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `SECURITY_ALERT`, `PASSWORD_RESET`, and the website events order confirmed, booking confirmed / upgraded / rescheduled, report order confirmed) are always sent. Other e-mails respect `emailEnabled`. The report-ready e-mail and WhatsApp message respect `reportAlerts` (and the e-mail also `emailEnabled`); the consultation reminder e-mail respects `emailEnabled`.

---

## 6. Security & Redaction Directives

- Password reset OTPs and email verification tokens are never logged or stored in plain text.
- FCM server keys, JWT tokens, and SMTP passwords are strictly excluded from structured logs (`logger` redaction).

---

## 7. REST API Endpoints

### Mobile User Endpoints (`/api/v1/notifications`)
- `GET /notifications`: Get user in-app notifications.
- `GET /notifications/unread-count`: Get unread count.
- `PATCH /notifications/:id/read`: Mark single notification as read.
- `POST /notifications/read-all`: Mark all notifications as read.
- `POST /notifications/device-token`: Register FCM device token on login.
- `DELETE /notifications/device-token`: Deactivate FCM device token on logout.
- `GET /notifications/preferences`: Get user notification preferences.
- `PUT /notifications/preferences`: Update user notification preferences.

### Admin Operations Endpoints (`/api/v1/admin/notifications`)
- `GET /admin/notifications`: Get notification stats, active FCM token counts, type volume breakdown, and recent activity logs.
- `POST /admin/notifications/test-send`: Send a safe test push notification to the authenticated admin account (with audit logging).

---

## 8. Required Environment Variables

```env
# Email Configuration (SMTP_* names from the website are preferred; these are still read)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@astrosushil.com
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM="Astro Sushil <noreply@astrosushil.com>"

# Firebase Cloud Messaging (FCM)
FCM_SERVER_KEY=your_firebase_server_key
FIREBASE_PROJECT_ID=astro-sushil-prod
```

SMS, WhatsApp, SMTP and messaging behaviour variables: see `infrastructure/deployment/vm/.env.vm.example` and `docs/integration/modules/messaging.md`.
