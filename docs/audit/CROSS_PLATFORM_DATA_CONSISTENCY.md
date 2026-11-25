# Cross-Platform Data Consistency

**Date:** 2026-11-26 · **Branch:** `staging`

## Findings

- Website, Flutter and Admin use the backend API for persisted business operations, as required by `AGENTS.md`.
- The Mongo backup reconciliation findings and migration mappings are documented in [DATABASE_RECONCILIATION.md](DATABASE_RECONCILIATION.md).
- The migration script now creates historical `OrderItem` rows for product orders, report orders and consultation bookings; migrates saved cart/wishlist rows; coupon assignments/redemptions; invoice history; and additional payment and download fields.
- Migration code type-checks. It was not applied, so migrated record counts and referential consistency were not measured against PostgreSQL.
- The request for live cross-platform workflow checks with isolated accounts remains outstanding; no disposable customer/staff credentials were available in the handoff.

## Read-only local database snapshot

The local `DATABASE_URL` database was queried read-only on 2026-11-25. Observed table counts: `User` 1,358; `Order` 886; `OrderItem` 4; `Report` 276; `ConsultationBooking` 526; `PaymentTransaction` 882; `Invoice` 0; `Cart` 0; `WishlistItem` 0; `CouponAssignment` 0; `CouponRedemption` 0; `DigitalProductEntitlement` 90. These counts are consistent with the documented migration gaps, but do not prove that every corresponding Mongo backup row is migratable. The database was not modified by this count query.

## Result

**Code-level consistency work implemented; database-level reconciliation and cross-platform workflow consistency remain unverified.** Do not infer parity from client builds or API health checks.
