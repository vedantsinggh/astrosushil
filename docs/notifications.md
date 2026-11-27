# Messaging, Notifications & Report Delivery

All outbound customer communications are managed by `apps/api/src/services/messaging/` and `apps/api/src/modules/notifications/`.

## 1. Providers & Environment Configuration

Configured via `messagingEnv()` (`apps/api/src/services/messaging/config.ts`) and `buildMessagingProviders()` (`provider-registry.ts`):

| Channel | Provider | Env Switch | Required Credentials |
| --- | --- | --- | --- |
| **SMS** | **SMSLane** (`SmsLaneProvider`) | `SMS_PROVIDER=smslane \| auto \| fake \| none` | `SMSLANE_API_KEY`, `SMSLANE_CLIENT_ID`, `SMSLANE_SENDER_ID` |
| **WhatsApp** | **WhatChimp** (`WhatChimpProvider`) | `WHATSAPP_PROVIDER=whatchimp \| auto \| fake \| none` | `WHATCHIMP_API_TOKEN`, `WHATCHIMP_PHONE_NUMBER_ID`, plus `WHATCHIMP_*_TEMPLATE_ID` |
| **Email** | **SMTP / Nodemailer** (`SmtpEmailProvider`) | `EMAIL_PROVIDER=smtp \| auto \| fake \| none` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| **Push** | **Firebase (FCM)** | — | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |

> **Production Safety**: In `NODE_ENV=production`, `fake` providers are **refused** and treated as unconfigured (`Unconfigured*Provider`).

## 2. OTP Delivery (`OtpDeliveryService`)

- OTPs are sent **inline** (never queued in the outbox) and never logged.
- **Phone OTP**: normalizes to E.164 (`+91...`) and dispatches **both** SMS (India-only) and WhatsApp template (`WHATCHIMP_TEMPLATE_ID`) in parallel. One channel failing never blocks the other.
- **Email OTP**: dispatches via SMTP.
- **Rate Limits**: `OtpSendLimiter` (`OtpSendLog` table) defaults to 3 sends per 10 min / 10 per day per identifier, and 10 per 10 min / 50 per day per IP, plus a 60s resend cooldown.

## 3. Outbox & Transactional Events (`NotificationEvents` + `OutboxService`)

Non-OTP transactional messages are written to PostgreSQL (`OutboundMessage`) with idempotency keys and dispatched by `messagingScheduler` in `apps/api/src/worker.ts`:
- `orderConfirmed` / `digitalOrder`
- `bookingConfirmed`, `bookingUpgraded`, `bookingRescheduled`, `consultationReminder` (daily IST sweep)
- `reportOrderConfirmed` ("within 48 hours")
- `reportReady` (Email + WhatsApp link to `${FRONTEND_URL}/dashboard?tab=reports`)
- `contactInquiryReceived`

## 4. Delayed Report Release (`REPORT_SEND_DELAY_HOURS`)

- Default `REPORT_SEND_DELAY_HOURS=24` (`report-release.ts` & `report-release.sweep.ts`).
- While held, customers see `PROCESSING` / `UPLOADING` (99%) with the promised IST delivery timestamp; staff see the true state in Admin.
- Once `completedAt + REPORT_SEND_DELAY_HOURS` passes, `ReportReleaseSweep.tick()` (run inside `worker.ts`) triggers `REPORT_READY` across Push, In-App, Email, and WhatsApp together. Setting `REPORT_SEND_DELAY_HOURS=0` releases reports immediately upon completion.
