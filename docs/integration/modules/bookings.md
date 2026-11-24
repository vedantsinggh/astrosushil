# Consultations, availability and bookings

**Status:** built and unit-tested with the database substituted. Not migrated, not deployed. No migration SQL exists (the lead generates it). The integration tests in `apps/api/tests/integration/phase5-consultation-booking.test.ts` have **not** been run against the new schema.
**Last updated:** 2026-11-24

Consultation types and the astrologer's hours are now rows an admin edits, as on the website. There is one astrologer and one calendar: the app, the website and the admin share the same bookings and the same rule for whether a time is free.

## Where things are

| Piece | File | What it does |
|---|---|---|
| Consultation types | `apps/api/src/modules/consultations/consultation-types.service.ts` | CRUD, per-type blocked dates, in-memory snapshot, default tiers |
| Default tiers | `consultation-types.defaults.ts` | The 18 tiers that were constants in the commerce catalogue (seed data) |
| GST | `consultation-gst.ts` | Adapter over `commerce/money/tax.ts`; discount rule for manual bookings |
| Commerce adapter | `consultation-catalog.adapter.ts` | `ConsultationCatalogSource` for the commerce catalogue (not connected yet, see below) |
| Time rules | `apps/api/src/modules/availability/availability.time.ts` | Slot generation, overlap, IST to UTC |
| Availability | `availability/availability.service.ts` | Working hours, blocked days and slots, customer and admin slot lists |
| Calendar claims | `apps/api/src/modules/bookings/slot-hold.ts` | Hold, book, release; the only code that takes a time |
| Staff operations | `bookings/bookings.service.ts` | List, export, manual booking, reschedule, change plan, notes, delete, invoice data, reminders |
| Admin routes | `bookings/bookings.admin.routes.ts` | Everything under `/admin/consultation-types`, `/admin/availability`, `/admin/bookings` |
| Customer flow | `consultations/consultations.service.ts`, `consultations.routes.ts` | Existing endpoints, kept; internals moved onto the pieces above |

## Timezone rule

The calendar is kept in Indian Standard Time (Asia/Kolkata, fixed UTC+05:30, no DST), as the website generates its slots.

- A calendar date is an IST date, `YYYY-MM-DD`. Admin endpoints also accept the website's `DD-MM-YYYY`.
- A time of day is minutes since 00:00 IST (shown as `HH:mm`).
- An instant is stored in UTC. `ConsultationBooking.slotStartTimeUtc` / `slotEndTimeUtc` and `AppointmentSlot.startTimeUtc` / `endTimeUtc` are the instants; `date`, `startTime`, `endTime` are the IST wall-clock values kept for the existing API shapes.
- New tables store dates as `@db.Date` and times as integer minutes.

## Endpoints

All paths are under `/api/v1`. The consultations router is also mounted at `/consultation`.

### Public and customer

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/consultations` | none | Existing. One entry per type and mode, `id` = catalog id. New fields added: `consultationTypeId`, `type`, `includes`, `priceLabel`, `note`, `basePricePaise`, `gstPaise`, `unavailableDates`. `pricePaise` is what the customer pays, GST included. |
| GET | `/consultations/types?type=normal\|special` | none | New. Website `GET /consultation`: one entry per type with its modes, cheapest first. |
| GET | `/consultations/types/:id` | none | New. Website `GET /consultation/:id`. |
| GET | `/consultations/slots?consultationId=&date=` | none | Existing. `consultationId` is a mode's catalog id or a type id. |
| GET | `/consultations/blocked-dates?month=&year=` | none | New. Website `GET /availability/blocked-dates`. |
| GET | `/consultations/:id` | none | Existing. |
| POST | `/consultations/book` | customer | Existing. Holds the slot, then creates the commerce order. |
| POST | `/consultations/verify-payment` | customer, owner | Existing. |
| GET | `/consultations/my-bookings` | customer | Existing. Deleted bookings and staff fields are left out. |
| GET | `/consultations/my-bookings/:id/invoice` | customer, owner | New. Invoice data (JSON). |
| GET | `/consultations/bookings/:id` | customer, owner | Existing. |
| POST | `/consultations/bookings/:id/reschedule` | customer, owner | Existing. Now bound by the calendar rules. |
| POST | `/consultations/bookings/:id/cancel` | customer, owner | Existing. |

### Admin

Every route needs a staff login and the permission shown, checked with `checkPermission` from `admin/rbac/check-permission.ts`. Every state-changing route writes an audit entry with `adminService.logAction`.

| Method | Path | Permission | Audit action |
|---|---|---|---|
| GET | `/admin/consultation-types` | `consultations:read` | |
| GET | `/admin/consultation-types/flat` | `consultations:read` | |
| GET | `/admin/consultation-types/:id` | `consultations:read` | |
| POST | `/admin/consultation-types` | `consultations:create` | `CONSULTATION_TYPE_CREATE` |
| PUT | `/admin/consultation-types/:id` | `consultations:update` | `CONSULTATION_TYPE_UPDATE` |
| DELETE | `/admin/consultation-types/:id` | `consultations:delete` | `CONSULTATION_TYPE_DELETE` |
| GET | `/admin/consultation-types/:id/blocked-dates` | `consultations:read` | |
| POST | `/admin/consultation-types/:id/block-date` | `consultations:update` | `CONSULTATION_TYPE_BLOCK_DATE` |
| POST | `/admin/consultation-types/:id/unblock-date` | `consultations:update` | `CONSULTATION_TYPE_UNBLOCK_DATE` |
| GET | `/admin/availability` | `availability:read` | |
| PUT, POST | `/admin/availability` | `availability:update` | `AVAILABILITY_UPDATE` |
| POST | `/admin/availability/block-day`, `/unblock-day` | `availability:update` | `AVAILABILITY_BLOCK_DAY`, `AVAILABILITY_UNBLOCK_DAY` |
| POST | `/admin/availability/block-range`, `/unblock-range` | `availability:update` | `AVAILABILITY_BLOCK_RANGE`, `AVAILABILITY_UNBLOCK_RANGE` |
| POST | `/admin/availability/block-slots`, `/unblock-slots` | `availability:update` | `AVAILABILITY_BLOCK_SLOTS`, `AVAILABILITY_UNBLOCK_SLOTS` |
| GET | `/admin/availability/schedule?date=` | `availability:read` | |
| GET | `/admin/availability/blocked-dates?month=&year=` | `availability:read` | |
| GET | `/admin/availability/slots?date=&consultationId=` | `availability:read` | |
| GET | `/admin/bookings` | `bookings:read` | |
| GET | `/admin/bookings/export?format=json\|csv` | `bookings:read` | `BOOKINGS_EXPORT` |
| GET | `/admin/bookings/by-date?date=` | `bookings:read` | |
| GET | `/admin/bookings/payment-conflicts` | `bookings:read` | |
| POST | `/admin/bookings` | `bookings:create` | `BOOKING_MANUAL_CREATE`, plus `CUSTOMER_CREATE_FOR_BOOKING` for a new customer |
| GET | `/admin/bookings/:id` | `bookings:read` | |
| GET | `/admin/bookings/:id/invoice` | `bookings:read` | |
| PATCH | `/admin/bookings/:id/reschedule` | `bookings:update` | `BOOKING_RESCHEDULE` |
| PATCH | `/admin/bookings/:id/change-plan` | `bookings:update` | `BOOKING_CHANGE_PLAN` |
| POST | `/admin/bookings/:id/notes` | `bookings:update` | `BOOKING_NOTE_ADD` |
| DELETE | `/admin/bookings/:id` | `bookings:delete` | `BOOKING_DELETE` |

`GET /admin/bookings` filters: `tab=upcoming|past`, `search`, `fromDate`, `toDate` (created-on, IST days), `date` (appointment date), `consultationTypeId`, `consultationId`, `mode`, `source`, `status`, `sort`, `page`, `limit`. It returns `counts.upcoming` and `counts.past` for the tabs.

The older endpoints `/admin/consultations`, `/admin/consultations/:id`, `/start-session`, `/reschedule`, `/cancel` in `admin.routes.ts` still work. They accept either the old key or the website-style one: list and detail `live_sessions:read` or `bookings:read`; start-session, reschedule and cancel `live_sessions:write` or `bookings:update`. The `/admin/live-sessions*` endpoints still need `live_sessions:*`.

### Permission keys

All keys already existed in `admin.permissions.ts`; none were added.

| Our key | Website key |
|---|---|
| `consultations:read` / `create` / `update` / `delete` | `consultations.view` / `create` / `edit` / `delete` |
| `bookings:read` / `create` / `update` / `delete` | `bookings.view` / `create` / `edit` / `delete` |
| `availability:read` / `update` | `availability.view` / `edit` |

### Request units

- Money in requests is integer paise. A manual booking's `discountValue` is paise for `FLAT` and basis points for `PERCENTAGE` (1250 = 12.5%). The website sends rupees and a percentage.
- GST rates are basis points (`rateBasisPoints`, 1800 = 18%).
- Modes and GST types are upper case in responses (`AUDIO`, `VIDEO`, `IN_PERSON`; `INCLUSIVE`, `EXCLUSIVE`). Requests accept the website's lower case too.
- Prices are never taken from a request.

## Models

New tables (block `// ===== bookings (website integration) =====` in `schema.prisma`):

| Model | Table | Purpose |
|---|---|---|
| `ConsultationType` | `consultation_types` | A consultation: title, kind, description, includes, duration, notice days, price label, note, active, `deletedAt`, `legacyId` |
| `ConsultationTypeMode` | `consultation_type_modes` | One priced mode of a type: price, GST config, `catalogId` (unique, never reused), `isActive` |
| `ConsultationTypeBlockedDate` | `consultation_type_blocked_dates` | A date on which one type cannot be booked |
| `AvailabilitySetting` | `availability_settings` | One row (`id = "default"`): working window, slot length, gap, optional break, weekly days off, booking horizon, `legacyId` |
| `ScheduleDay` | `schedule_days` | Per-date exception: fully blocked or not, `legacyId` |
| `ScheduleBlockedSlot` | `schedule_blocked_slots` | A blocked time range of a date |
| `BookingAdminNote` | `booking_admin_notes` | Staff-only history of a booking |

Columns added to `ConsultationBooking`: `legacyId`, `consultationTypeId`, `source`, `paymentMethod`, `pricePaise`, `discountType`, `discountValue`, `discountPaise`, `gstRateBasisPoints`, `gstType`, `taxablePaise`, `gstPaise`, `amountPaise`, `paidCurrency`, `paidAmountMinor`, `exchangeRate`, `priceLabel`, `note`, `invoiceNumber`, `reminderSentAt`, `createdByAdminId`, `deletedAt`, `deletedById`, plus two indexes. `AppointmentSlot` and `User` are unchanged.

### Constraint the migration must add by hand

Prisma cannot express it. Without it, double booking is still prevented by the application (advisory lock plus overlap check) and by the existing unique key on `(practitionerId, date, startTime)`.

```sql
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_no_overlap"
  EXCLUDE USING gist (tsrange("startTimeUtc", "endTimeUtc", '[)') WITH &&)
  WHERE (status IN ('RESERVED', 'BOOKED'));
```

Existing rows that overlap must be cleaned first, or the statement fails.

## How double booking is prevented

A time is taken by a row in `appointment_slots`: `RESERVED` while a customer pays (until `lockedUntil`, 15 minutes), `BOOKED` once confirmed.

1. Every claim (`claimSlot` in `slot-hold.ts`) runs in a transaction that first takes one advisory lock, so claims are serialised.
2. It releases holds that have expired, then refuses any overlap with a booking or a live hold of any consultation type.
3. The database refuses what slips through: the unique key and the exclusion constraint above.

The hold is placed in `POST /consultations/book`, before the payment order exists. A second customer gets `409` and is never sent to pay.

If a payment arrives after its hold expired:

- time still free: the booking is confirmed (the slot is re-claimed);
- time taken: `verify-payment` returns `409`, nothing is settled by that call, and once the gateway webhook marks the order paid the booking appears under `GET /admin/bookings/payment-conflicts`. Refunding it is not built here.

## Consultation types and the commerce catalogue

Each default tier became one `ConsultationType` with one mode whose `catalogId` is the old id (`consult-general-audio`, ...), same price, GST, duration and notice days. A new type gets `consult-<title-slug>-<mode>` per mode.

The types are seeded by `prisma/seed.ts` (`consultationTypesService.seedDefaults()`: creates missing tiers by catalog id, never changes an existing one). A process that finds the table completely empty also inserts them on first read.

**Connected (wire-payments).** The `consult-*` constants are removed from `commerce.catalog.ts`; `commerceCatalog.getItem` / `listItems` read consultation items from `consultationCatalogSource`, and `calculateOrder` adds GST on top for a mode whose GST is exclusive. So a type created in the admin can be paid for, and a re-priced tier is charged its new price.

- Identity: the 18 seeded rows give exactly the 18 catalogue items the constants gave (id, title, description, price, GST rate and type, mode, duration, notice days). `tests/unit/wire-payments-catalogue.test.ts` proves it against a frozen copy of the former constants.
- Freshness: `commerceService.createOrder` awaits `commerceCatalog.refresh({ force: true })` whenever a requested item is not a code constant, so the price is read from the database at that moment (also on the first request after start-up, when the process only holds the default tiers) and the order fails if the database cannot be read. `GET /payments/catalog` awaits the unforced refresh (one read per 30 seconds).
- **Deployment note:** the old ids only exist if the default tiers are in the table. An empty table is seeded on first read; a table that already has rows (for example website consultations migrated first) is not, so run `prisma/seed.ts` (`consultationTypesService.seedDefaults()`, which only adds missing tiers) or the mobile app's `consult-*` ids will answer `Catalog offering not found`. A seeded tier deleted in the admin is likewise no longer for sale, which is the intent.
- In `GET /payments/catalog` the consultation items now come after the code items instead of between reports and courses.

The snapshot: commerce and two existing callers are synchronous, so the service keeps the types in memory, refreshed at most every 30 seconds and after every admin write. Before the first read it holds the default tiers. A booking and every admin read force a fresh read and fail if the database cannot be read. Other processes see an admin change within 30 seconds.

## Money

- GST uses `computeGst` from `commerce/money/tax.ts`.
- Customer bookings go through `commerceService.createOrder`. `verify-payment` reads the payment back from the gateway (`paymentService.fetchRazorpayPayment`), compares order id, amount and currency, and calls `settleOrderPaid` in the transaction that confirms the booking.
- A manual booking creates an order with `paymentMethod: MANUAL`, already paid, with `razorpayOrderId = "manual_<bookingId>"` (the column is required and unique), and calls `settleOrderPaid` in the same transaction. If settlement fails, the booking fails.
- A plan change re-states the booking, its order, the order's consultation line and the order's `PaymentTransaction` row. Nothing is charged or refunded, as on the website. **Done (wire-payments):** the order, line and ledger row are re-stated by the money module's `restateConsultationOrder` (`commerce/money/restatement.ts`), called from `changePlan` inside its transaction; `bookings.service.ts` no longer writes those tables. Changes in behaviour: `Order.paidAmountMinor` of an INR order now follows the new amount (it kept the old one, so the invoice data showed the old charge); a foreign-currency amount is converted with the money module's function (whole yen for JPY); a plan change is refused when the order is unpaid, has a refund against it, or is not a single consultation line; an invoice number already issued is kept (as on the website) and written into the history entry as `changes.invoiceNumberKept`. See money.md open question 10.

## Messages

- Booking confirmed at checkout and every reschedule: the existing `sendNotification` calls, now with `includes`, `oldDate`, `oldStartTime`, `oldEndTime` in `templateData`. The notification bridge raises the website channels.
- Manual booking: `sendNotification` with `websiteChannels: false`, then `notificationEvents.bookingConfirmed`.
- Plan change: `notificationEvents.bookingUpgraded` with `changeId` = the id of the history entry.

### Reminders

`bookingsService` exposes:

- `listDueReminders({ daysAhead | date })`: confirmed, not deleted, not yet reminded bookings of an IST day (1 = tomorrow, 0 = today's remaining);
- `findReminderBookings(date)`: the same rows in the shape `ConsultationReminderSweep` takes as `findBookings`;
- `markReminded(bookingId)`: returns `true` only for the first caller; `clearReminded(bookingId)` undoes it.

**Connected.** The sweep in `notifications/consultation-reminder.sweep.ts` has no query of its own any more: by default it reads `bookingsService.findReminderBookings(date)` (so bookings deleted by staff and bookings already reminded are left out) and calls `bookingsService.markReminded(id)` once the reminder is in the outbox, which sets `reminderSentAt`. The outbox key remains what prevents a second message. Before this, `markReminded` was optional for it.

## Mapping from the website's collections

### `consultations` to `consultation_types` and `consultation_type_modes`

| Website | Ours | Notes |
|---|---|---|
| `_id` | `ConsultationType.legacyId` | |
| `title`, `description`, `includes`, `priceLabel`, `note`, `isActive` | same names | |
| `type` (`normal`, `special`) | `kind` (`NORMAL`, `SPECIAL`) | |
| `duration` | `durationMinutes` | |
| `responseDays` | `responseDays` | |
| `modes[].mode` | `ConsultationTypeMode.mode` | upper case |
| `modes[].price.inr` | `pricePaise` | rupees x 100 |
| `modes[].gst.enabled`, `.rate`, `.type` | `gstEnabled`, `gstRateBasisPoints` (x 100), `gstType` | A mode with no `gst` object is untaxed on the website: migrate as `gstEnabled = false`. |
| `modes[].priceWithGst` | not stored | recomputed on read, as the website does |
| (none) | `catalogId` | generate `consult-<slug>-<mode>`; must not collide with the seeded app tiers |
| `unavailableDates` | `ConsultationTypeBlockedDate` | Not in the website schema, so no document has it. Nothing to migrate. |

The website's consultations and the app's seeded tiers are different lists. Which ones stay active after cut-over is a product decision.

### `availabilities` (one document) to `availability_settings`

| Website | Ours |
|---|---|
| `_id` | `legacyId` |
| `startTime`, `endTime` (`"HH:mm"`) | `startMinute`, `endMinute` |
| `slotDuration` | `slotDurationMinutes` |
| `gap` | `gapMinutes` |
| (none) | `breakStartMinute`, `breakEndMinute`, `blockedWeekdays`, `bookingHorizonDays`: set to null, `[]`, null to reproduce the website |

### `schedules` to `schedule_days` and `schedule_blocked_slots`

| Website | Ours | Notes |
|---|---|---|
| `_id` | `legacyId` | |
| `date` (`"DD-MM-YYYY"`) | `date` | The admin stores what the browser sends; check for other formats. |
| `isBlocked` | `isBlocked` | |
| `blockedSlots[]` (`"HH:mm-HH:mm"`) | one `ScheduleBlockedSlot` each | strip whitespace before parsing |

### `bookings` to `consultation_bookings`

| Website | Ours | Notes |
|---|---|---|
| `_id` | `legacyId` | |
| `consultationId` | `consultationTypeId` (through `legacyId`), `consultationId` = the mode's `catalogId`, `title` = consultation title | Deleted consultations leave dangling ids: keep the booking, `consultationTypeId` null. |
| `userId` | `userId` | Phone numbers must be normalised to match app accounts. `customerName`, `customerPhone`, `customerEmail` are snapshots from the user. |
| `transactionId` | `orderId` | through the money migration |
| `invoiceNumber` | `invoiceNumber` | keep exactly |
| `mode` | `mode` | upper case |
| `price.inr` | `pricePaise` | |
| `amount`, `currency` | `paidAmountMinor`, `paidCurrency` | only when not INR |
| `baseAmount` | `amountPaise` | |
| `exchangeRate` | `exchangeRate` | |
| `gst.rate`, `.type`, `.taxableAmount`, `.amount` | `gstRateBasisPoints`, `gstType`, `taxablePaise`, `gstPaise` | |
| `duration`, `priceLabel` | `durationMinutes`, `priceLabel` | |
| `discountType`, `discountValue`, `discountAmount` | `discountType`, `discountValue`, `discountPaise` | value: rupees to paise for FLAT, percent to basis points for PERCENTAGE |
| `date` (`"DD-MM-YYYY"`), `slot` (`"HH:mm-HH:mm"`) | `date`, `startTime`, `endTime`, `slotStartTimeUtc`, `slotEndTimeUtc` | IST |
| `status` + `paymentStatus` | `status` | booked + paid: `CONFIRMED`; cancelled: `CANCELLED`. Pending ones are deleted hourly on the website and need not move. |
| `bookingSource` | `source` | |
| (derived) | `paymentMethod` | `MANUAL` for admin bookings, else `RAZORPAY` |
| `note` | `note` | |
| `adminNotes[]` | `BookingAdminNote` rows | `action` reschedule / plan_change; `addedBy` to `addedByName`; `createdAt` kept |
| `reminderSent`, `reminderSentAt` | `reminderSentAt` | also see messaging.md for the outbox key |
| `isDeleted`, `deletedAt` | `deletedAt` | |

Each migrated booking that is confirmed and not deleted also needs an `appointment_slots` row with status `BOOKED`. The website's unique index is on `(date, slot)` strings, so its data can contain overlapping bookings of different lengths; the migration must report them (the exclusion constraint will reject them).

Quirks seen in the website code: paid admin bookings without a transaction; bookings whose plan was changed keep their old discount fields while the amount is the new full price; `slot` strings with stray spaces.

## Differences from the website

| Area | Website | Here | Why |
|---|---|---|---|
| Exclusive GST in INR | charges the bare price | charges price + GST; a mismatch stops the booking | bug |
| Pending booking | holds nothing; two customers can pay for one slot | slot held from `book` for 15 minutes | bug, no refund path |
| Overlap rule | unique on identical `(date, slot)` strings | any overlap, any type, enforced in the database | bug |
| Customer's slot | any string is accepted | must be one of the offered slots | safety |
| Slots already past | listed today when notice is 0 days | not listed | bug |
| Blocked-slot check at booking | exact string match | overlap | consistent with the slot list |
| Blocked dates by month | compares `DD-MM-YYYY` strings | real date range | bug |
| Per-consultation `block-date` | writes a field not in the schema; no effect | stored and enforced in the slot list and at booking | what the admin and frontend read |
| Date-range blocking | one request per day from the browser | also one `block-range` request | convenience; `block-day` kept |
| Manual booking, new customer | account with a hardcoded password | account with no password; refuses a phone or e-mail that already has an account | security finding 9 |
| Manual booking | user, booking and transaction not all in one transaction | one transaction, settlement included | consistency |
| `verify-payment` | no owner check | owner check, order id match, amount and currency read back | security finding 2 |
| Delete consultation | removes the document | hides it (`deletedAt`), keeps the row | past bookings and orders still resolve |
| Remove a mode | removes it | marks it inactive; re-adding reuses its catalog id | catalog ids stay stable |
| Delete booking | sets `isDeleted` | sets `deletedAt` and frees the slot; same visible behaviour | "as on the website": it is a soft delete there too |
| Booking by id / by date (admin) | by-date also returns deleted bookings | by-date leaves deleted ones out; detail still shows them with `deletedAt` | by-date feeds the calendar |
| Admin slots | `booked` / `available` | also `held`, and a `blocked` flag | staff cannot book over a live payment hold |
| Reschedule | reminder flag kept | reminder flag cleared | the old reminder was for the old time |
| Reschedule reason | staff history | staff history; never copied to `rescheduleReason`, which customers can read | staff-only on the website too |
| Change plan | slot string unchanged even if the new plan is longer; old discount fields kept | end time follows the new duration and an overlap is refused; discount cleared | calendar must stay consistent; amount is the full new price |
| Admin list | all rows, filtered in the browser | filtered and paginated on the server | volume |
| My bookings | hides `adminNotes` | also hides `internalNotes` and the other staff columns (they were returned before this change) | staff-only data |
| Working hours | one window | one window plus an optional break, weekly days off and a booking horizon | keeps the app's former hard-coded hours (11:00-14:00, 15:00-19:00, Sundays off, 60 days) as editable defaults |
| `slot.js` in the website's consultation module | dead code (old per-consultation generator, never imported) | not ported | |

## Environment variables

None.

## Open questions

1. **Hours after cut-over.** The settings row starts with the app's former hours. The website's live hours, and whether the lunch break, Sunday off and the 60-day horizon stay, need a decision.
2. **Which consultations are on sale.** The app's 18 seeded tiers and the website's consultations will both exist after migration.
3. **Paid but not booked.** `payment-conflicts` lists them; who refunds or reschedules, and whether the customer is messaged automatically, is undecided. The owner decision "no refunds on the website flows" does not cover this case.
4. **Meeting link and address.** Checkout confirmation writes a generated `meet.astrosushil.com` link and a fixed office address onto the booking (existing code). Manual bookings leave both empty. Is the link real?
5. **Staff booking in the past.** Allowed, as on the website.
6. **Mobile app.** `apps/mobile` sends `slotId`, `consultationSku`, `consultationMode` to `/consultations/book`, `mode` without `consultationId` to `/consultations/slots`, and `orderId` to `verify-payment`. The backend never accepted those (before or after this change); only the catalogue list matches. The app's booking flow needs fixing on the app side.
7. **Customer reschedule and cancel** exist in the app's API but not on the website. Kept; rescheduling now respects notice days and blocked times.
