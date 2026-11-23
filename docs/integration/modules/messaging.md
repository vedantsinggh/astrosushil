# Messaging: SMS, WhatsApp, e-mail and OTP delivery

Owner decisions: keep the website's providers and approved templates (SMSLane for SMS,
WhatChimp for WhatsApp, SMTP e-mail) for both website and app; customer login will be
OTP-only (removing password / Google login is a later task, not done here); keep the
website's delayed report-ready delivery.

## Where the code is

| Path | What |
|---|---|
| `apps/api/src/services/messaging/config.ts` | every messaging env variable, read in one place |
| `.../messaging/phone.ts` | `toE164` - the one phone normalisation; `toSmsLaneNumber` |
| `.../messaging/types.ts` | `SmsProvider`, `WhatsAppProvider`, `EmailProvider`, `SendResult` |
| `.../messaging/providers/` | `smslane`, `whatchimp`, `smtp`, and `fake` / `log-only` / `unconfigured` |
| `.../messaging/provider-registry.ts` | provider selection by env |
| `.../messaging/templates/` | SMS texts (DLT), WhatsApp variables, e-mail HTML - ported from the website |
| `.../messaging/outbox.service.ts` | outbox: enqueue, dispatch, retries, idempotency |
| `.../messaging/otp-delivery.service.ts` | OTP send limiter and OTP delivery |
| `.../messaging/messaging.scheduler.ts` | worker sweeps (registered in `src/worker.ts`) |
| `apps/api/src/modules/notifications/notification.events.ts` | typed function per customer event |
| `.../notifications/notification.bridge.ts` | raises those events for notifications the backend already sends |
| `.../notifications/consultation-reminder.sweep.ts` | daily reminder |

## Endpoints

None added. `POST /api/v1/auth/phone/send-otp` now really delivers the code; its request and
response are unchanged. No admin endpoints and no permission keys.

## Providers

Selected per channel by `SMS_PROVIDER`, `WHATSAPP_PROVIDER`, `EMAIL_PROVIDER`
(`auto` by default; `smslane` / `whatchimp` / `smtp`; `fake`; `none`).

- `auto`: the real provider when its credentials are set, otherwise the safe default.
- Safe default in **production**: every send fails with `PROVIDER_NOT_CONFIGURED` and is
  logged as an error. Nothing is ever reported as sent when it was not. `fake` is refused
  in production.
- Safe default elsewhere: the send is logged (masked recipient only) and reported as simulated.
- All HTTP calls have a timeout (`MESSAGING_HTTP_TIMEOUT_MS`, 10 s); SMTP has connection,
  greeting and socket timeouts. Retries are bounded (see Outbox).

**Tokens in URLs.** The website sends the SMSLane key and the WhatChimp token as query
parameters of a GET request. Its code shows no other accepted way (no header, no body), and
we may not call the providers to find out, so both stay query parameters. The request URL is
never logged, never stored and never put in an error: `http.ts` reduces every failure to a
code (`TIMEOUT`, `NETWORK_ERROR`) and providers return only a code and the HTTP status.
If the providers confirm a header is accepted, change it in the two provider files.

**Not ported:** `src/service/sendAisensy.js`, an unused alternative WhatsApp provider
(AiSensy campaigns). The `WhatsAppProvider` interface is where it would plug in.

### SMS (SMSLane)

`GET https://api.smslane.com/api/v2/SendSMS` with `SenderId`, `Message`, `MobileNumbers`
(`91` + 10 digits), `ApiKey`, `ClientId`, and `dc=8` when the text is not plain ASCII.

The DLT texts are in `templates/sms.templates.ts`, copied character for character
(including double spaces, a missing space in `Product Name-{#var#}Order Status-` and
`Hello {#var#}Thank you`, the wording "Thank for ordering", `₹` and two emoji). A unit test
compares them with the website's source files. The website's code contains **no DLT
template ids** (SMSLane matches on the text), so none are configured.

| Template | Variables, in order |
|---|---|
| `OTP_SIGNUP`, `OTP_LOGIN`, `OTP_RESET` | name, OTP |
| `BOOKING_CONFIRMED` | name, consultation, date, mode, slot, amount |
| `BOOKING_RESCHEDULED` | name, consultation, new date, mode, new slot, amount |
| `ORDER_UPDATE` | name, order id, product names, order status |
| `REPORT_PURCHASE` | name |

### WhatsApp (WhatChimp)

`GET https://app.whatchimp.com/api/v1/whatsapp/send/template` with `apiToken`,
`phone_number_id`, `template_id`, `phone_number` (E.164 with `+`) and `templateVariable-*`.
Variable names and positions are the website's (`templates/whatsapp.templates.ts`).

| Message | Template id env | Variables |
|---|---|---|
| OTP | `WHATCHIMP_TEMPLATE_ID` | `otp-2` |
| Order | `WHATCHIMP_ORDER_TEMPLATE_ID` | `Username-1`, `OrderID-2`, `ProductorServiceName-3`, `OrderStatus-4`, `Invoicelink-5` |
| Digital order | `WHATCHIMP_DIGITAL_ORDER_TEMPLATE_ID` | the five above + `Downloadlink-6` |
| Report order confirmed | `WHATCHIMP_REPORT_ORDER_CONFIRMED_TEMPLATE_ID` | `User-Name-1` |
| Report ready | `WHATCHIMP_REPORT_TEMPLATE_ID` | `ReportName-1`, `Reportlink-2`, `Invoicelink-3` |
| Booking confirmed | `WHATCHIMP_BOOKING_CONFIRMED_TEMPLATE_ID` | `Username-1`, `Consultation-2`, `Date-3`, `ServiceMode-4`, `slot-5`, `ordervalue-6`, `Include-7`, `CallInstructions-8`, `Invoicelink-9` |
| Booking updated | `WHATCHIMP_BOOKING_UPDATED_TEMPLATE_ID` | same nine |
| Reschedule | `WHATCHIMP_CONSULTATION_RESCHEDULE_TEMPLATE_ID` | the first eight (no invoice link) |
| Reminder | `WHATCHIMP_CONSULTATION_REMINDER_TEMPLATE_ID` | `User-Name-1`, `consultationTitle-2`, `Date-3` ("<date> at <slot>") |

### E-mail (SMTP)

`templates/email.templates.ts` is the website's `emailTemplates.js` in TypeScript: `OTP`,
`WELCOME`, `RESET_PASSWORD`, `CONTACT_ADMIN`, `CONTACT_USER`, `ORDER_CONFIRMED_USER`,
`ORDER_UPDATED_ADMIN`, `BOOKING_CONFIRMED_USER`, `BOOKING_UPGRADED_USER`,
`BOOKING_REMINDER_USER`, `BOOKING_RESCHEDULE_USER`, `BOOKING_CONFIRMED_ADMIN`,
`BOOKING_RESCHEDULE_ADMIN`, `REPORT_ORDER_CONFIRMED_USER`, `REPORT_READY_USER`. Same
subjects, wording and layout. Sender name "Astro Sushil". `WELCOME`, `RESET_PASSWORD` and
the two `CONTACT_*` templates are ported but have no caller yet.

## OTP delivery

`AuthService.sendPhoneOtp(input, { ip })`:

1. normalise the number; 2. send limit (below); 3. find or create the user; 4. 60-second
resend cooldown (unchanged); 5. generate the code (crypto), store its SHA-256 hash, 10-minute
expiry, 5 attempts (all unchanged); 6. send by **SMS and WhatsApp in parallel** (website's
PHONE channel). SMS text: `OTP_SIGNUP` until the number has been verified once, `OTP_LOGIN`
afterwards; name = first word of the full name, or "Customer".

- At least one channel must accept the message. If neither does, the code is invalidated
  and the request fails with 503 `OTP_DELIVERY_FAILED` - except outside production when
  the development master OTP is enabled (testers log in with it). The master OTP is still
  impossible in production.
- The response is the same for a new number and an existing account.
- The code is never logged and never stored in plain text (OTPs do not go through the outbox).

E-mail OTPs (`EmailService.sendVerificationEmail`, `sendPasswordResetEmail`, used by
sign-up verification and by `/auth/forgot-password` + `/auth/reset-password`, which staff
accounts rely on) now use the website's `OTP` e-mail and the SMTP provider.

### Send limit (website finding 5)

`otp_send_logs` holds one row per accepted send, per scope. Defaults: per phone number or
e-mail address 3 per 10 minutes and 10 per 24 hours; per IP address 10 per 10 minutes and
50 per 24 hours. The row is written before counting, a refused request is not counted, and
no request ever deletes a row (only the worker's age-based clean-up after 48 hours), so
asking again cannot reset the limit. Only SHA-256 hashes of the identifier and IP are stored.

For e-mail OTPs the limit is per address only (the IP is not available in
`EmailService`), and a request over the limit is dropped quietly so the API answer does not
depend on whether the address has an account.

## Event notifications

`notificationEvents` (`notification.events.ts`). Money in minor units; channels are the website's.

| Function | Customer | Staff copy | Always sent? |
|---|---|---|---|
| `orderConfirmed` (payment and every status change) | e-mail, WhatsApp, SMS | e-mail to `ADMIN_EMAIL` | yes |
| `digitalOrderConfirmed` | same, digital WhatsApp template + downloads link | e-mail | yes |
| `bookingConfirmed` | e-mail, WhatsApp, SMS | e-mail + WhatsApp to `ADMIN_PHONE` (or `SUPPORT_PHONE`) | yes |
| `bookingUpgraded` | e-mail, WhatsApp | - | yes |
| `bookingRescheduled` | e-mail, WhatsApp, SMS | e-mail | yes |
| `consultationReminder` | e-mail, WhatsApp | - | e-mail respects `emailEnabled` |
| `reportOrderConfirmed` ("within 48 hours") | e-mail, WhatsApp, SMS | - | yes |
| `reportReady` | e-mail, WhatsApp, after `REPORT_SEND_DELAY_HOURS` | - | respects `reportAlerts`; e-mail also `emailEnabled` |

### Outbox, retries, idempotency

Each function inserts one `outbound_messages` row per channel and audience with the unique
key `event:entityKey:audience:channel`:

| Event | entityKey |
|---|---|
| order-confirmed | `orderId:orderStatus` |
| booking-confirmed | `bookingId` |
| booking-upgraded | `bookingId:changeId` |
| booking-rescheduled | `bookingId:newDate:newSlot` |
| consultation-reminder | `bookingId:date` |
| report-order-confirmed | `reportOrderId` |
| report-ready | `reportId` |

Raising an event again (retried request, duplicate webhook, restart) hits the unique index
and creates nothing. Delivery claims a row with a conditional update (`PENDING -> SENDING`)
before calling the provider, so two processes never send the same row. A retryable failure
(timeout, network, 5xx) goes back to `PENDING` with backoff 30 s, 2 min, 8 min; after
`MESSAGING_MAX_ATTEMPTS` (4) or a permanent failure (not configured, rejected, template id
missing) the row is `FAILED` with the reason, and an error is logged.

A process that stops in the middle of a send leaves the row `SENDING`. After
`MESSAGING_STALE_LOCK_MINUTES` it is marked `FAILED` (`DELIVERY_UNCERTAIN`) and **not** sent
again, because nobody can know whether the provider accepted it.

The API process dispatches right after queueing (`MESSAGING_INLINE_DISPATCH`); the worker's
sweep every 15 s is the backstop and the retry engine.

### Sweeps (worker)

- **Outbox dispatch** every `MESSAGING_DISPATCH_INTERVAL_MS`. This is also the delayed
  report-ready sweep: `reportReady` queues its messages with `notBefore = completion +
  REPORT_SEND_DELAY_HOURS` (default 24), and the first dispatch after that time sends them.
- **Consultation reminder**: once per IST day from `CONSULTATION_REMINDER_IST_HOUR` (8),
  for bookings dated tomorrow (IST) with status `CONFIRMED` or `RESCHEDULED`.
- **OTP send-log clean-up** hourly.
- The website's hourly deletion of pending orders / bookings / report orders / transactions
  older than two days is **not** part of this module (see finding 13); it belongs to the
  commerce modules, if it is wanted at all.

### Events the backend already raises

`NotificationService.sendNotification` calls `notification.bridge.ts`, which adds the website
channels; push and in-app are unchanged.

| Existing call | Website event |
|---|---|
| `REPORT_READY` (report worker) | `reportReady` (delayed) |
| `BOOKING_CONFIRMED` (consultations) | `bookingConfirmed` (booking + order line loaded by id) |
| `BOOKING_RESCHEDULED` (consultations) | `bookingRescheduled` |
| `PAYMENT_SUCCESS` (commerce, products) | `reportOrderConfirmed` if the order has report items; `orderConfirmed` if it has product items; nothing for consultation/course-only orders |

A module that calls a typed event itself must pass `websiteChannels: false` to
`sendNotification`, otherwise the bridge raises it too.

## Phone numbers

`toE164(raw)` (India default) is used for every send: separators removed; `00cc` -> `+cc`;
`+...` kept; 10 digits or `0` + 10 digits -> `+91...`; 12 digits starting `91` -> `+91...`;
other 8-15 digit numbers are taken to include their country code; anything else -> no send.

**Data migration rule.** The website stores `phoneNumber` in mixed formats
(`+919876543210`, `919876543210`, `9876543210`) and matches them at login with
`buildPhoneVariants` (the value, its digits, and its last 10 digits). Run every stored
phone number through `toE164` and store the result in `users.phoneNumber`. Because the
website's match is by last 10 digits, two website users can normalise to the same number;
`users.phoneNumber` is unique, so list those pairs for a decision instead of merging or
dropping one. Numbers that do not normalise are left empty and listed. The same rule
applies to `customerDetails.whatsappNumber` and `matchMakingDetails.bride.whatsappNumber`
on report orders.

## Models

- `OutboundMessage` (`outbound_messages`): outbox and delivery log. No `legacyId`: it
  receives no migrated data.
- `OtpSendLog` (`otp_send_logs`): OTP send counter.

## Website collections

| Website | Ours | Migration |
|---|---|---|
| `otps` (identifier, channel, otp in plain text, type, expiresAt; TTL index) | `otp_verifications` (hash) | **Do not migrate.** Codes live 5 minutes and are stored in plain text. |
| BullMQ `notifications` queue (Redis) | `outbound_messages` | Do not migrate; drain the website queue before cut-over. |
| `bookings.reminderSent`, `reminderSentAt` | outbox key `consultation-reminder:<bookingId>:<DD-MM-YYYY>` | For migrated bookings dated after cut-over with `reminderSent = true`, insert a `SENT` row per channel with that key (or accept one extra reminder). |
| `reportorders.isReportSent`, `isEmailSent`, `isWhatsappSent` | outbox key `report-ready:<id>` | Completed report orders are not re-announced unless the reports module calls `reportReady` for them. It must call it only for reports completed after cut-over, or for migrated ones with `isReportSent = false` (passing `completedAt` = the website's `updatedAt`). |

## Differences from the website, and why

1. OTP send limit works and also counts per IP; codes are random (crypto), hashed, attempt-capped; responses do not reveal whether an account exists (finding 5).
2. A phone OTP succeeds when SMS **or** WhatsApp accepts it. The website failed the request when the SMS call threw, even if WhatsApp had delivered; but SMSLane answers HTTP 200 on rejection, so in practice it never failed.
3. SMSLane and WhatChimp response bodies are inspected; an explicit error in an HTTP 200 body counts as a failure. The website treated any 200 as sent. The exact body formats could not be verified without calling the providers (see Open questions).
4. SMS goes to Indian mobile numbers only. The website took the last 10 digits of any number and prefixed `91`, which sends a foreign customer's SMS to an unrelated Indian number.
5. Customer-supplied values are HTML-escaped in e-mails (the website interpolated raw input). Wording unchanged.
6. The OTP e-mail shows the real expiry (10 minutes) instead of `OTP_TTL_MINUTES || 5`.
7. `orderStatus` is required for `orderConfirmed`. The website's Razorpay webhook path omitted it, producing the subject "Order undefined #...".
8. The report-ready link defaults to the customer's reports dashboard (login required) instead of a public, permanent S3 URL (finding 10). The caller may pass `reportUrl`, e.g. a short-lived signed link.
9. Report-ready: each channel is its own outbox row with its own retries, instead of the website's `isReportSent` flag that was set when either channel succeeded.
10. Recipients, message texts and vendor responses are not written to logs (finding 11); recipients are masked.
11. The reminder runs at 08:00 **IST**. The website's cron said 08:00 with `CRON_TIMEZONE` defaulting to UTC while its comment said IST.
12. Messages are delivered by a Postgres outbox instead of BullMQ/Redis; 4 attempts with 30 s / 2 min / 8 min backoff instead of 3 attempts from 3 s.
13. The password-reset e-mail never throws (the answer must not depend on the account existing); a delivery failure is an error in the log.

## Environment variables (names)

`SMS_PROVIDER`, `WHATSAPP_PROVIDER`, `EMAIL_PROVIDER`;
`SMSLANE_API_KEY`, `SMSLANE_CLIENT_ID`, `SMSLANE_SENDER_ID`, `SMSLANE_API_URL`;
`WHATCHIMP_API_TOKEN`, `WHATCHIMP_PHONE_NUMBER_ID`, `WHATCHIMP_API_URL`, `WHATCHIMP_TEMPLATE_ID`,
`WHATCHIMP_ORDER_TEMPLATE_ID`, `WHATCHIMP_DIGITAL_ORDER_TEMPLATE_ID`,
`WHATCHIMP_REPORT_ORDER_CONFIRMED_TEMPLATE_ID`, `WHATCHIMP_REPORT_TEMPLATE_ID`,
`WHATCHIMP_BOOKING_CONFIRMED_TEMPLATE_ID`, `WHATCHIMP_BOOKING_UPDATED_TEMPLATE_ID`,
`WHATCHIMP_CONSULTATION_REMINDER_TEMPLATE_ID`, `WHATCHIMP_CONSULTATION_RESCHEDULE_TEMPLATE_ID`;
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`
(fallback: existing `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`);
`FRONTEND_URL`, `ADMIN_URL`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `SUPPORT_PHONE`;
`REPORT_SEND_DELAY_HOURS`, `CONSULTATION_REMINDER_IST_HOUR`;
`OTP_RATE_LIMIT_MAX`, `OTP_RATE_LIMIT_WINDOW_MINUTES`, `OTP_RATE_LIMIT_MAX_PER_DAY`,
`OTP_IP_RATE_LIMIT_MAX`, `OTP_IP_RATE_LIMIT_WINDOW_MINUTES`, `OTP_IP_RATE_LIMIT_MAX_PER_DAY`;
`MESSAGING_MAX_ATTEMPTS`, `MESSAGING_RETRY_BASE_SECONDS`, `MESSAGING_STALE_LOCK_MINUTES`,
`MESSAGING_DISPATCH_INTERVAL_MS`, `MESSAGING_DISPATCH_BATCH`, `MESSAGING_HTTP_TIMEOUT_MS`,
`MESSAGING_INLINE_DISPATCH`, `MESSAGING_SCHEDULER_ENABLED`.

They are read from `process.env` in `services/messaging/config.ts`, not through
`src/config/index.ts`.

## Call sites other modules must add

| Where | What |
|---|---|
| `modules/auth/auth.routes.ts`, `POST /phone/send-otp` handler | `authService.sendPhoneOtp(input, { ip: request.ip })`. **Until this is done the per-IP limit is not enforced** (the per-number limit is). Fastify `trustProxy` must be right behind the reverse proxy. |
| Website-style product orders: payment verified (client verify and Razorpay webhook) | `notificationEvents.orderConfirmed({...})`, or `digitalOrderConfirmed` for a digital order (website sets status `delivered`). |
| Admin order status update | `notificationEvents.orderConfirmed` with the new `orderStatus`. |
| Booking paid (client verify, webhook, admin manual booking) | `notificationEvents.bookingConfirmed`. Already covered for our consultations module by the bridge. |
| Admin booking upgrade / plan change | `notificationEvents.bookingUpgraded` with a `changeId`. |
| Booking reschedule | `notificationEvents.bookingRescheduled`. `consultations.service.ts` (the `BOOKING_RESCHEDULED` call) should add `oldDate`, `oldStartTime`, `oldEndTime` to `templateData`; until then the "Previous Schedule" line shows `-`. |
| Report order paid (client verify and webhook) | `notificationEvents.reportOrderConfirmed`. Already covered by the bridge for orders with `REPORT` items. |
| Report completed | `notificationEvents.reportReady`. Already covered by the bridge for the report worker's `REPORT_READY`. |
| Booking confirmation, includes list | pass `includes` in `templateData` of `BOOKING_CONFIRMED` / `BOOKING_RESCHEDULED`; without it the e-mail omits the section and WhatsApp shows `-`. |

## Open questions

1. **SMSLane / WhatChimp response formats and header authentication** could not be verified (no provider calls allowed). Before go-live, send one test message per template and check that success and rejection are recognised, that `dc=8` really makes SMSLane send Unicode (the website calls it untested), and whether either provider accepts the token in a header.
2. **Report ready timing.** The app's push and in-app "report ready" go out at completion (existing behaviour, unchanged), while e-mail and WhatsApp go out 24 hours later. Should push also be delayed, or the report hidden until then, as on the website?
3. **Report link** in the report-ready messages: dashboard link (current, login required) or a short-lived signed download link?
4. **Report names**: app reports pass the report type (`KUNDLI_BASIC` -> "Kundli Basic"). Should customer-facing names come from the catalogue?
5. **Reminder WhatsApp** has no matching preference; it is always sent. Should `astrologyReminders` or a new preference govern it?
6. **Uncertain deliveries** (process stopped mid-send) are not re-sent. Is "possibly not delivered, flagged in the log" preferred over "possibly delivered twice"?
7. **`PAYMENT_SUCCESS` for app report purchases** now also sends the website's "within 48 hours" e-mail / WhatsApp / SMS. Is that wording right for app reports that are usually ready sooner?
8. Should a push / in-app reminder accompany the consultation reminder for app users? The website has none, so none was added.
