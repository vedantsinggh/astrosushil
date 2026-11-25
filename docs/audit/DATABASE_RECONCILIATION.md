# Database Reconciliation & Migration Audit

**Audit Date:** 2026-11-25
**Baseline Commit:** `f107143` (`staging`)
**Sources Inspected:**
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261124180000_website_integration/migration.sql`
- `apps/api/prisma/migrations/20261124200000_coupon_scopes/migration.sql`
- `apps/api/src/scripts/migrate-from-mongo.ts`
- `tmp/mongo-backup/*.json`

---

## Reconciliation of the 10 Handoff Discrepancies

| # | Discrepancy | Source Count | Local / Script Behavior | Root Cause | Status |
|---|---|---:|---:|---|---|
| 1 | **Order count** | 883 (`orders.json` 84 + `reportorders.json` 273 + `bookings.json` 526) | 886 | `migrate-from-mongo.ts` skips 1 `orders.json` doc (missing user, L880–881), upserting 882 `Order` rows without clearing 4 pre-existing dev/test `Order` rows (`882 + 4 = 886`). | Verified |
| 2 | **ScheduleDay count** | 144 (`schedules.json`) | 58 | `schedules.json` formats `date` as `DD-MM-YYYY`. `toDate()` (L85–89) calls `new Date(String(val))`. The 87 dates with `DD > 12` become `Invalid Date`, fall back to `new Date()` (today), and collapse into 1 `upsert` row on `@unique date`. The 57 dates with `DD <= 12` are parsed as `MM-DD-YYYY` (swapped day/month). `57 + 1 = 58`. | Verified (Bug in `toDate()`) |
| 3 | **User count & account merging** | 1,351 users + 2 admins | 1,352 migrated (+ any seeded admins) | 1 email overlap (`connect@astrosushil.com`) merged into staff `User` via `mergedCustomerIds` (L204–215, L356–377). 3 duplicate phone numbers nulled on secondary accounts (L380–385) to satisfy `User.phoneNumber @unique`. | Verified |
| 4 | **Historical invoices** | 67 (`orders` 7 + `reports` 14 + `bookings` 46) | 0 `Invoice` rows | `migrate-from-mongo.ts` writes invoice rows from all three sale collections and copies booking invoice numbers. | Gap implemented in script; apply/reconciliation unverified |
| 5 | **Missing `OrderItem` records** | 97 shop items + 273 reports + 526 bookings | 4 current rows | The script creates deterministic product, report, and consultation `OrderItem` rows. | Gap implemented in script; apply/reconciliation unverified |
| 6 | **Carts and wishlists** | 139 carts (67 non-empty, 82 items); 934 wishlists (12 items) | 0 | The script reads `carts.json` / `wishlists.json`, maps valid product/user references, and upserts rows. | Gap implemented in script; apply/reconciliation unverified |
| 7 | **`CouponAssignment` & `CouponRedemption`** | 1 coupon (`SAVE100`), 1 assignment, 3 redemptions | 0 assignments/redemptions | The script maps `INDIVIDUAL` audience, assignments, and each redemption event. | Gap implemented in script; apply/reconciliation unverified |
| 8 | **Skipped orphan references** | 1 order, 1 download, 1 tx, 3 booking types | Silently skipped | `migrate-from-mongo.ts` silently `continue`s on missing user/order (`orders.json` 1, `downloads.json` 1, `transactions.json` 1); 3 bookings with unknown `consultationId` migrate with `consultationTypeId: null`. | Verified |
| 9 | **`PaymentTransaction` reconciliation** | 883 (`razorpay`: 700, `manual`: 183) | 882 | The script maps payment methods/status, order paid timestamps, INR-normalized components, sanitized gateway payload, and legacy amount metadata. | Gap implemented in script; apply/reconciliation unverified |
| 10 | **Historical downloads & entitlements** | 92 (`downloads.json`) | 90 | The script maps variant/order-item references, storage key/name, count, and grant timestamp; orphan references remain skipped. | Gap implemented in script; apply/reconciliation unverified |

## Continuation implementation status

The migration script now includes code paths for the following previously missing rows and fields. These are **code changes, not a database migration run**; source/target counts have not been reconciled after applying them.

- Historical `Invoice` rows are written from order, report-order, and booking invoice number/status fields. Original invoice strings are preserved, including malformed or duplicate numbers. Booking rows also receive `invoiceNumber`.
- `OrderItem` rows are created for product order lines, report orders, and consultation bookings, with deterministic IDs so reruns are idempotent.
- `Cart`/`CartItem` and `WishlistItem` rows are read from the local backup. Items whose user/product reference cannot be mapped are skipped.
- Coupon audience, assignments, and each `usedBy` event are migrated; repeated redemptions by one user are preserved as separate rows.
- `PaymentTransaction.method`, status, normalized INR component amounts, customer/place-of-supply summaries, sanitized gateway payload, and legacy amount data are migrated. Paid orders get `paidAt`; non-Razorpay method is reflected on the associated order when present in a transaction.
- Digital entitlement `variantId`, `orderItemId` when a matching source line exists, `assetKey`, `assetName`, `downloadCount`, and `grantedAt` are populated. `assetKey` is resolved to a key using the configured local storage resolver without checking S3.

**Not observed:** The script was not run with `--apply`; no production data was accessed. Exact counts, skipped orphan totals, collision behavior on a real snapshot, and second-run idempotency still require a disposable PostgreSQL rehearsal.

**Observed current local counts (read-only):** `Order` 886, `OrderItem` 4, `Report` 276, `ConsultationBooking` 526, `PaymentTransaction` 882, `Invoice` 0, `Cart` 0, `WishlistItem` 0, `CouponAssignment` 0, `CouponRedemption` 0, and `DigitalProductEntitlement` 90. This is the current database state before applying the newly completed migration paths.

**Specification alignment:** `docs/integration/modules/money.md` says the invoice counter is initialized after migrated invoice numbers are reviewed. The script reads `invoicecounters.json` for preflight comparison only; it does not write an `InvoiceCounter`. Reconcile the backup's `lastValue` against the migrated invoice numbers during the documented initialization procedure.

---

## Schema & Precision Findings

1. **Foreign Key Cascade/Restrict Conflict**:
   - `Order.user` (`schema.prisma:130`) uses `onDelete: Cascade`, while `FulfillmentUnit.order`, `Shipment.order`, `RefundItemAllocation.order`, and `ShopOrder.order` use `onDelete: Restrict`. Hard-deleting a `User` with orders fails at the DB level (note: customer deletion in `customers.service.ts` anonymizes users with paid orders instead, per owner decision `S4`).
2. **Timezone Corruption on `ConsultationBooking` & `ScheduleDay`**:
   - `bookings.json` also uses `DD-MM-YYYY` dates, so `toDate()` (L85–89) corrupts `ConsultationBooking.date`, `slotStartTimeUtc`, and `slotEndTimeUtc` as well as `ScheduleDay.date`.
3. **Monetary Precision**:
   - Integer minor units (`paise` / `paidAmountMinor`) and `Decimal(20, 10)` exchange rates are properly modeled across `Order`, `ConsultationBooking`, `PaymentTransaction`, and `Invoice`.
