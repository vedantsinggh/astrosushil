# Testing stack: third-party integrations, schedulers and customer protection

The testing database is a **copy of real customer data**. The testing API and worker run with
`NODE_ENV=production`. This page explains how the stack still never reaches a copied customer,
which external services it calls, and what they cost.

Env file: `infrastructure/testing/env/api.env.example`, installed as `$TESTING_ROOT/env/api.env`.
API and worker both read it. After any change, restart both `testing-api` and `testing-worker`.

## 1. Policy per integration

| Integration | Testing mode | How it is guarded |
|---|---|---|
| Google Gemini (reports, Rashi Bhavishya) | **Real** API, real cost | Separate capped key. The Rashi scheduler is off. The report SLA re-queue is off. See section 6. |
| OpenRouter (Jyoti chat) | **Real** API, real cost | `JYOTI_RATE_LIMIT_PER_MINUTE` and `JYOTI_DAILY_LIMIT` cap it per user. |
| exchangerate-api.com | **Real** (quota-limited) | On demand only. The result is cached 24 h in Redis. Empty key means INR only. |
| Open-Meteo geocoding | **Real** (free, no key) | On demand, when a location is searched. |
| Razorpay | **Test mode** (`rzp_test_` keys) | A `rzp_live_` key makes the API and the worker refuse to start (`DEPLOYMENT_ENVIRONMENT=testing`). |
| Razorpay webhook | Test-mode webhook pointing at the testing API | `RAZORPAY_WEBHOOK_SECRET` must be the secret of the test webhook. See section 7. |
| File storage | Dedicated **testing bucket** (S3 or R2) | `TESTING_FORBIDDEN_BUCKETS` lists the production buckets. The install and verify scripts refuse when the active bucket is one of them. |
| SMSLane (SMS) | Real provider, **guarded** | Recipient allowlist (section 3). Credentials are empty by default. |
| WhatChimp (WhatsApp) | Real provider, **guarded** | Recipient allowlist. Credentials are empty by default. |
| SMTP e-mail | **Sandbox / test account**, guarded | Recipient allowlist. Never use the production mailbox. |
| Firebase Cloud Messaging | **Separate testing Firebase project**, guarded | Push allowlist (`PUSH_ALLOWED_USER_IDS` / `PUSH_ALLOWED_DEVICE_TOKENS`). Production device tokens are invalid in another project. |
| Meta WhatsApp webhook (inbound) | Off unless a test Meta app is wired | It only logs. Without `WHATSAPP_VERIFY_TOKEN`, production mode refuses verification. |
| Google sign-in | Removed from the API | `/auth/google` answers "no longer available". `GOOGLE_OAUTH_CLIENT_IDS` stays empty. |

Providers are not mocked. `fake` providers are refused in production mode. The protection is the
allowlist plus switched-off schedulers.

## 2. Outbound side effects and background loops (inventory)

Paths are relative to `apps/api/src`. "Flag" is the switch. "Code default" is the behaviour when the
flag is unset (production). "Testing" is the value in `api.env.example`.

### Senders (event-driven)

| Side effect | Trigger | Where | Goes through |
|---|---|---|---|
| Phone OTP (SMS + WhatsApp in parallel) | `POST /auth/otp/...` request | `modules/auth/auth.service.ts:201`, `services/messaging/otp-delivery.service.ts:137` | provider registry (allowlist) |
| E-mail OTP | Same request | `auth.service.ts:209`, `otp-delivery.service.ts:168` | provider registry |
| Password-reset e-mail | Staff password reset | `auth.service.ts:440`, `services/email.service.ts:41` | provider registry |
| Order, booking, report-order and contact e-mails / WhatsApp (customer + `ADMIN_EMAIL` / `ADMIN_PHONE` copies) | Business events | `modules/notifications/notification.events.ts:252-446`. They enqueue in the outbox (`:497`) and kick inline dispatch (`:498`). | outbox, then provider registry |
| Notification e-mail | `notificationService.sendNotification` | `modules/notifications/notification.service.ts:169-188` | provider registry / outbox |
| Push (FCM) | `sendNotification` (orders, bookings, reports, admin test) | `notification.service.ts:125`, `modules/notifications/fcm.provider.ts:87` | FCM provider (push allowlist) |
| Report ready (push, in-app, e-mail, WhatsApp) | Report completed with `REPORT_SEND_DELAY_HOURS=0` | `services/report-worker.service.ts:823`, then `modules/reports/report-release.sweep.ts` `announceReportCompleted` | both |
| Report failed (push, in-app, e-mail) | Report finally failed | `report-worker.service.ts:1077`, `:1200` | both |
| Admin campaigns (in-app, push, e-mail, SMS, WhatsApp to many customers) | Admin "send campaign" | `modules/notifications/campaigns.service.ts:268` (runs in `setImmediate` `:292`; push `:334`) | both. Flag `NOTIFICATION_CAMPAIGNS_ENABLED`. |
| Inline outbox dispatch | After any enqueue (API process) | `services/messaging/outbox.service.ts:302` | provider registry. Flag `MESSAGING_INLINE_DISPATCH`. |

Single choke points: `services/messaging/provider-registry.ts` (`buildMessagingProviders`) is the
only place SMS, WhatsApp and e-mail providers are created. `modules/notifications/fcm.provider.ts`
`sendPushNotification` is the only place pushes are sent.

### Background loops

| Loop | Process | Where | Flag | Code default | Testing |
|---|---|---|---|---|---|
| Report queue claim loop (on-demand generation) | worker | `worker.ts` main loop | none (must keep working) | on | on |
| Start-up report recovery | worker (API with instant execution) | `worker.ts:54`, `server.ts:48` | none | on | on |
| Stale report-job recovery, every `STALE_JOB_RECOVERY_INTERVAL_MS` (60 s) | worker | `worker.ts:60`, `report-worker.service.ts` `startStaleRecoveryLoop` | `REPORT_STALE_RECOVERY_SCHEDULER_ENABLED` (new) | on | **on** (part of generation) |
| Report SLA monitor (inside stale recovery): `REPORT_DELAYED` notification and re-queue of overdue reports | worker | `report-worker.service.ts:421` / `:444` / `:488` | `REPORT_SLA_SCHEDULER_ENABLED` (new) | on | **off** |
| In-process report dispatcher | API, only with instant execution | `server.ts:52`, `report-worker.service.ts:191` | `REPORT_INSTANT_EXECUTION` (compose forces `false`), `AUTO_DELIVER_WHEN_READY` | off in production | off |
| Rashi Bhavishya preparation, every 15 min (24 Gemini calls/day) | worker | `worker.ts:64`, `services/rashi-bhavishya.scheduler.ts` | `RASHI_BHAVISHYA_SCHEDULER_ENABLED` | on | **off** |
| Messaging sweeps (master switch) | worker | `worker.ts:69`, `services/messaging/messaging.scheduler.ts` | `MESSAGING_SCHEDULER_ENABLED` | on | **off** |
|  - outbox dispatch, retry and stale-send close, every 15 s | worker | `messaging.scheduler.ts:63-76` | `OUTBOX_DISPATCH_SCHEDULER_ENABLED` (new) | on | **off** |
|  - report release (announce after `REPORT_SEND_DELAY_HOURS`) | worker | `messaging.scheduler.ts:69` | `REPORT_RELEASE_SCHEDULER_ENABLED` (new) | on | **off** |
|  - consultation reminder (daily, `CONSULTATION_REMINDER_IST_HOUR`) | worker | `messaging.scheduler.ts:79` | `CONSULTATION_REMINDER_SCHEDULER_ENABLED` (new) | on | **off** |
|  - OTP send-log clean-up (hourly, database only) | worker | `messaging.scheduler.ts:84` | `OTP_CLEANUP_SCHEDULER_ENABLED` (new) | on | off |
| Invoice recovery, every 5 min (database only: ledger plus invoice number) | worker | `worker.ts:73`, `modules/invoices/invoice-recovery.sweep.ts` | `INVOICE_RECOVERY_ENABLED` | on | **off** |
| Seller-details refresh (database read cache) | API | `modules/invoices/site-settings-seller.provider.ts:109` | none (no side effect) | on | on |
| Exchange-rate refresh | on demand | `modules/commerce/money/rates.ts:63` | `EXCHANGE_RATE_API_KEY` (empty means off) | on demand, 24 h cache | on demand |

No cron jobs or other `setInterval` loops exist in `apps/api/src`. The other timers are per-request
timeouts, heartbeats and backoff.

## 3. Recipient allowlist

Code: `apps/api/src/services/messaging/recipient-allowlist.ts`. It is wired in
`provider-registry.ts` (SMS, WhatsApp, e-mail) and `fcm.provider.ts` (push).

| Variable | Meaning |
|---|---|
| `MESSAGING_RECIPIENT_ALLOWLIST_ENABLED` | `true` or `1` turns the guard on. Unset or anything else: off, production behaviour unchanged. |
| `MESSAGING_ALLOWED_PHONES` | Comma-separated. Any format the senders accept (`9876543210`, `919876543210`, `+91 98765-43210`, `+1...`). Each entry is normalised with the same `toE164` rule every send uses. |
| `MESSAGING_ALLOWED_EMAILS` | Comma-separated. Each entry is an exact address (case-insensitive) or `@domain`. `@domain` matches exactly that domain, not its subdomains. |
| `PUSH_ALLOWED_USER_IDS` | Comma-separated user ids. Their devices may get a push. |
| `PUSH_ALLOWED_DEVICE_TOKENS` | Comma-separated FCM tokens that may get a push. |

Behaviour when the guard is on:

- A recipient who is not on the list gets **nothing**. The provider is not called.
- The result is the non-retryable failure `RECIPIENT_NOT_ALLOWLISTED`.
- In the outbox (`outbound_messages`), the row becomes `FAILED` with
  `lastError = 'RECIPIENT_NOT_ALLOWLISTED: ...'` and is never retried. The status enum has no
  "suppressed" value, and no migration was added.
- A push is counted as failed with that error code.
- Each suppressed send is logged at `info` with the recipient masked (`+91 ••••• •1234`,
  `c***@gmail.com`).
- An allowlisted tester's OTP **is** sent. Testers log in on the website and app with their own
  approved numbers. An OTP to a number that is not allowlisted fails with `OTP_DELIVERY_FAILED`.
- If the guard is on and all lists are empty, nothing is sent at all. This is the testing default.

At start-up with `DEPLOYMENT_ENVIRONMENT=testing`, the API and worker log a loud `WARN` if the
guard is not on. They do not refuse to start.

Data already in the copied database:

- Copied `outbound_messages` rows that were `PENDING` would be sent by any dispatch: the worker
  sweep, or the inline kick after a new enqueue. The allowlist suppresses them.
- Copied `device_tokens` belong to the production Firebase project and fail in the testing project.

## 4. Testing defaults and the safest choice

- Every scheduler and background sender is `false`, except `REPORT_STALE_RECOVERY_SCHEDULER_ENABLED`.
  That loop is part of on-demand report generation.
- `MESSAGING_INLINE_DISPATCH=false`. Queued event messages (order and booking confirmations) wait in
  the outbox. OTPs are inline and not affected.
- `NOTIFICATION_CAMPAIGNS_ENABLED=false`. The admin cannot start a campaign. Doing so returns
  `403 CAMPAIGNS_DISABLED`.
- Providers stay `auto` with **empty credentials**, and the allowlist is **on with empty lists**.
  These are two independent barriers.
  - To test real delivery, fill in one provider's credentials (a test account) **and** add the
    tester's phone or e-mail.
  - `auto` with empty credentials makes a send fail visibly. It is never reported as sent.

## 5. Enabling a scheduler safely (one at a time)

1. Make sure `MESSAGING_RECIPIENT_ALLOWLIST_ENABLED=true` and that the lists contain only approved
   testers.
2. Look at what the scheduler would pick up from the copied data, read-only:
   - Outbox: `SELECT status, channel, count(*) FROM outbound_messages GROUP BY 1,2;`
   - Release: reports `COMPLETED` in the last 7 days without a `REPORT_READY` notification.
   - Reminders: bookings for tomorrow (IST) where `reminderSentAt` is null.
   - SLA: reports in progress with an `expectedDeliveryAt` in the past. These are re-queued, and
     re-queuing costs Gemini calls.
3. Set exactly one flag. Messaging sub-sweeps also need `MESSAGING_SCHEDULER_ENABLED` to be unset
   or `true`, with the other sub-flags still `false`. Then restart `testing-worker`.
4. Watch the worker log for `[RecipientAllowlist] Send suppressed` and `[Outbox] Message suppressed`.
5. Switch the flag back to `false` and restart when done.

Each new flag is on in code when unset and off only with the exact value `false` (case-insensitive).
Production, which does not set them, is unchanged.

## 6. API cost notes (state calls, not prices)

- **Gemini, reports.** Code: `services/platform-report.runner.ts` and
  `packages/report-engine/src/platform/llm/narrator.ts`.
  - One call covers all pending narrative topics of one report section.
  - A section with both legacy and interpretation topics makes two groups, so two calls.
  - Up to 3 content attempts per group. The 3rd attempt uses `REPORT_LLM_RETRY_MODEL`
    (default `gemini-3.8-flash`). Up to 6 transport retries are added on overload or 5xx.
  - Topics already in `report_topic_cache` cost nothing.
  - Defaults: model `gemini-3.1-flash-lite`, max 6000 output tokens per call.

  Narrative sections per report (counted from the registry) give the minimum calls for a fresh report:

  | Report | Sections (min calls) | Narrative topics |
  |---|---|---|
  | baby-name | 4 | 7 |
  | planetary-summary | 5 | 11 |
  | love | 7 | 13 |
  | kundli-basic | 9 | 17 |
  | horoscope-annual | 10 | 22 |
  | jupiter-transit | 10 | 28 |
  | rahu-ketu-transit | 11 | 42 |
  | finance | 12 | 26 |
  | saturn | 13 | 38 |
  | fortune | 13 | 45 |
  | couple-matching | 15 | 54 |
  | career | 17 | 46 |
  | kundli | 19 | 45 |
  | varshphal | 21 | 54 |
  | fortune-plus | 23 | 72 |

  The worst case is about 3 times these numbers, plus transport retries. The worker logs
  `liveCalls`, `cachedTopics` and `estimatedCostUsd` per report (`[ReportPlatform] Generation
  finished`). The estimate uses `REPORT_LLM_PRICE_*_PER_MTOK`. The target is a fresh report under
  ₹10 of LLM cost. Check it against the logged numbers.

  Copied reports that were `QUEUED` or in progress are claimed by the worker and generated, which
  costs Gemini calls.
- **Gemini, Rashi Bhavishya:** 24 calls per day (12 signs, English and Hindi) while the scheduler is
  on. An on-demand request for a missing sign makes 1 call.
- **OpenRouter (Jyoti):** at least 1 call per chat message, and up to 3 HTTP attempts (primary plus
  `OPENROUTER_FALLBACK_MODELS`). It is capped per user by `JYOTI_RATE_LIMIT_PER_MINUTE` and
  `JYOTI_DAILY_LIMIT`.
- **Exchange Rate API:** at most 1 call per 24 h while the Redis cache holds. The cache is lost when
  `testing-redis` restarts (no persistence), so add 1 call per restart. It is only called when a
  non-INR price is needed.
- **SMSLane / WhatChimp:** 1 SMS plus 1 WhatsApp per phone OTP, both paid. Each event message costs 1
  per channel.

## 7. Webhooks

Webhooks must target the **API-only origin** (`https://api-test.D/...`). The website and admin
origins are behind HTTP basic auth, so a provider cannot reach them.

- **Razorpay:** in the Razorpay dashboard's **Test mode**, create a webhook to
  `https://api-test.D/api/v1/webhooks/razorpay` with its own secret. Put that secret in
  `RAZORPAY_WEBHOOK_SECRET`.
  - Never point a production (live-mode) webhook at testing.
  - Never point the testing webhook at production.
  - Raw-IP or tunnel URLs change, so update the webhook when the API hostname changes.
- **Meta WhatsApp:** `https://api-test.D/api/v1/webhooks/whatsapp` only logs inbound events. Leave
  `WHATSAPP_VERIFY_TOKEN` empty unless a test Meta app is connected.

## 8. Firebase

- Create a separate Firebase project for testing and register the testing app builds with it (see
  `mobile.md`).
- Mount its service-account key and set `FIREBASE_SERVICE_ACCOUNT_FILE`, or set
  `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
- Add the tester accounts' user ids to `PUSH_ALLOWED_USER_IDS`.
- Without Firebase configured, production mode reports `PUSH_NOT_CONFIGURED`. The in-app inbox still
  works.

## 9. Razorpay start-up guard

`apps/api/src/services/deployment-safety.ts` runs first in `server.ts` and `worker.ts`. With
`DEPLOYMENT_ENVIRONMENT=testing`:

- A `RAZORPAY_KEY_ID` starting with `rzp_live_` logs a fatal error and exits with code 1.
- The allowlist warning is logged.

With `DEPLOYMENT_ENVIRONMENT` unset (production), nothing is checked.
