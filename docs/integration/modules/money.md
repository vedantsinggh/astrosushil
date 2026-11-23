# Money: currencies, GST, invoices, transactions ledger, GST report

**Status:** built on `staging`, not migrated (the lead generates the migration). Invoice PDF is **not** built: see "Not done".
**Website sources:** `src/common/taxEngine.js`, `src/common/priceengine.js`, `src/utils/exchangeRate.js`, `src/utils/razorpay.js`, `src/modules/Invoice/*`, `src/modules/Transaction/*`, `src/webhooks/razorpay.js`, the three invoice templates, `src/scripts/*`, admin `GstReportPage.jsx` and `Transactionspage.jsx`.

## Where things are

| Area | Files |
|---|---|
| Currencies, conversion | `apps/api/src/modules/commerce/money/currency.ts` |
| Exchange rates (provider, cache, fake) | `apps/api/src/modules/commerce/money/rates.ts` |
| GST engine | `apps/api/src/modules/commerce/money/tax.ts` |
| Checkout quote (INR total to charged amount) | `apps/api/src/modules/commerce/money/checkout.ts` |
| "Order is paid" hook (ledger + invoice) | `apps/api/src/modules/commerce/money/settlement.ts` |
| Invoice numbers, labels, counter, invoice data | `apps/api/src/modules/invoices/*` |
| Ledger, GST report, CSV | `apps/api/src/modules/transactions/*` |
| Tests | `apps/api/tests/unit/money.test.ts`, `money-checkout.test.ts`, `invoice.test.ts`, `transactions.test.ts` |

In this backend every sale (report, consultation, product, course) is one `Order`. The website has three separate records (order, booking, report order); the ledger's `type` keeps that distinction: all items are reports gives `report`, all consultations gives `consultation`, anything else gives `order`.

## Endpoints

All under `/api/v1`. Admin routes sit behind `authenticate`, the staff role gate and the database-backed `checkPermission` (`modules/admin/rbac/check-permission.ts`).

| Method | Path | Auth | Permission | Notes |
|---|---|---|---|---|
| POST | `/payments/create-order` | customer | none | New optional body field `currency` (3 letters). Response adds `paidCurrency`, `paidAmountMinor`, `exchangeRate`; `amount` and `currency` stay the INR base |
| POST | `/payments/verify` | customer | none | Now also reads the payment back from Razorpay and compares order id, amount and currency. Mismatch: 400 `PAYMENT_MISMATCH` |
| POST | `/webhooks/razorpay` | signature | none | Compares the captured amount and currency with the paid amount and currency; settles ledger and invoice |
| GET | `/invoices/orders/:orderId` | customer | owner only | Invoice data (JSON) for one of the caller's orders; 404 for anyone else's |
| GET | `/admin/invoices/orders/:orderId` | staff | `transactions:read` | Same data for any order |
| GET | `/admin/transactions` | staff | `transactions:read` | Filters: `status`, `method`, `fromDate`, `toDate`, `search`, `page` (1), `limit` (10, max 100) |
| GET | `/admin/transactions/export` | staff | `transactions:export` | CSV of the filtered ledger; audit entry `TRANSACTIONS_EXPORTED` |
| GET | `/admin/gst-report` | staff | `gst_report:read` | Filters: `fromDate`, `toDate`, `status` (default `success`, empty means all), `transactionType`. Returns `{ rows, summary }` |
| GET | `/admin/gst-report/export` | staff | `gst_report:export` | CSV with the website admin's columns; audit entry `GST_REPORT_EXPORTED` |
| GET | `/admin/invoices/counter` | staff | `gst_report:read` | Counter state, pending count, report on stored numbers (highest, duplicates, malformed) |
| POST | `/admin/invoices/counter/initialize` | staff | super admin only | Body `{ confirmLastValue, allowEmpty? }`; audit entry `INVOICE_COUNTER_INITIALIZED` |
| POST | `/admin/invoices/allocate-pending` | staff | super admin only | Numbers paid sales that have no number yet and repairs missing ledger rows; audit entry `INVOICES_ALLOCATED` |

Permission keys used and the website keys they replace: `transactions:read` (`transactions.view`), `gst_report:read` (`gstReport.view`), `transactions:export` and `gst_report:export` (the website exports in the browser, with no separate key). No new key was added. A key `invoices:manage` is proposed for the two super-admin-only routes.

Amounts in responses are integers: INR paise, or minor units of the paid currency where the field name says `Minor`. `status`, `method` and `transactionType` are returned in the website's lower-case values (`success`, `razorpay`, `consultation`).

## Models

Block `money` at the end of `schema.prisma`.

**`PaymentTransaction`** (table `payment_transactions`): one row per payment attempt. `type` ORDER/CONSULTATION/REPORT; `amountMinor` + `currency` (what was charged); `baseCurrency`, `baseAmountPaise` (INR value); `subtotalPaise`, `shippingPaise`, `taxPaise`, `taxRateBp`, `taxInclusive`, `discountPaise` (all INR); `exchangeRate` Decimal(20,10); `method` RAZORPAY/MANUAL/COD; `status` PENDING/SUCCESS/FAILED; `gatewayPaymentId`, `gatewayOrderId`; `rawResponse` (allow-listed gateway fields only); `placeOfSupply`, `customerName`; `legacyId`, `legacySourceId`, `legacyData`.

**`InvoiceCounter`** (`invoice_counters`): one row, `key = "INV-AS"`, `lastValue` BigInt, `initializedBy`.

**`Invoice`** (`invoices`): `orderId` unique, `saleType`, `number`, `sequence` BigInt unique (only for numbers allocated here), `status` PENDING/ALLOCATED/NOT_REQUIRED, `allocatedAt`, `legacyId`.

**Lines added to existing models**

- `Order.paidCurrency` (default INR), `Order.paidAmountMinor`, `Order.exchangeRate`, `Order.paymentMethod` (default RAZORPAY). `Order.amount` and `Order.currency` keep their meaning: the INR amount in paise. Existing code that reads them is unaffected.
- `OrderItem.taxInclusive` (default true).

No Prisma relation was added to models owned by others; `orderId` and `userId` on the new tables are indexed plain columns.

## 1. Foreign currencies

- Accepted: INR, USD, EUR, GBP, AED, AUD, CAD, SGD, JPY (the website's list). Anything else is refused with 400 `UNSUPPORTED_CURRENCY`.
- Prices stay INR. At order creation the INR total is converted with the server-side rate and the order stores: `paidCurrency`, `paidAmountMinor`, `exchangeRate`, and the INR base in `amount`.
- Rate source: `ExchangeRateProvider` interface. `ExchangeRateApiProvider` calls exchangerate-api.com v6 `latest/INR` (the website's provider); `FakeExchangeRateProvider` is used in tests. Cache: `ExchangeRateCache` interface, in-memory, 24 hours (the website caches 24 hours in Redis).
- A rate is "units of the foreign currency per 1 INR", held as an integer scaled by 10^10. Conversion: `minor = round_half_up(paise x rate x 10^exponent / 100)`.
- A supported currency for which the provider has no positive rate is refused with 503 `EXCHANGE_RATE_UNAVAILABLE`. No key configured: 503 `EXCHANGE_RATE_UNCONFIGURED` (INR needs no key and no provider call).
- The client can never supply a rate: `create-order` has no such field and the schema drops unknown fields.

**Zero-decimal currencies (stated assumption).** Razorpay takes `amount` in the currency's subunit, value x 10^exponent. Its supported-currencies table (razorpay.com/docs/payments/international-payments, read 2026-11-24) gives exponent 2 for the eight other currencies and 0 for JPY: its own example sends 99 yen as `99`. The website sends `Math.round(amount * 100)` for every currency (`src/utils/razorpay.js`), which for JPY asks for 100 times the intended amount. Here JPY is sent as whole yen. The table is one constant, `CURRENCY_EXPONENT`.

## 2. GST engine

`calculateSale({ lines, discountPaise?, shippingPaise? })` reproduces `computeGst` and the tax part of `calculateCart`:

1. line total = unit price x quantity; subtotal = sum.
2. The order discount is spread over lines pro rata by line total.
3. Each line's GST is computed on (line total minus its share) with the line's own `{ enabled, rateBp, type }`. Inclusive: `base = amount / (1 + r)`, `tax = amount - base`. Exclusive: `tax = amount x r`, `total = amount + tax`. `enabled: false` or no config means untaxed; a type other than `inclusive` is exclusive.
4. Only exclusive tax is added to the total: `total = subtotal - discount + shipping + exclusive tax`. Shipping is not taxed.

**Rounding.** Rates are basis points; amounts are paise. The discount share is kept as an exact fraction (BigInt), and every reported figure is that exact value rounded to the nearest paisa, halves up. This is what the website's `Math.round((x + Number.EPSILON) * 100) / 100` does on rupees. Base, tax and total are each rounded on their own, as on the website. `SaleLineResult.discountPaise` is an extra, informational whole-paisa split (largest remainder) that adds up to the discount exactly.

**Hooks for other modules.** `SaleInput.discountPaise` is the coupon hook: an order-level discount in INR paise, validated and capped by the coupon module. The website rounds the coupon discount to whole rupees before spreading it, so a caller reproducing it passes a multiple of 100. `SaleInput.shippingPaise` is the shop's shipping fee. `CreateOrderParams.discountPaise` on `commerceService.createOrder` passes a discount through; `payments.service` forces it to `undefined`, so it cannot come from a request.

**Existing catalogue.** `commerceCatalog.calculateOrder` is untouched. `createOrder` now takes its figures from `calculateSale`; for the tax-inclusive catalogue this gives identical net, tax and total (tested for every active item). An item with `taxIncluded: false` now has GST added on top, which the old code ignored.

**Place of supply.** Delivery state when the sale ships, else the seller's state (`INVOICE_SELLER_STATE`), as the website does.

## 3. Invoice numbering

- Format `INV-AS/<n>`, padded to two digits exactly as the website formats it (`INV-AS/07`, `INV-AS/118`).
- One series for all sale types. The number is allocated in the same database transaction that marks the order paid (`settleOrderPaid`, called by checkout verify and by the webhook after they lock the order row).
- **Mechanism: a counter row locked with `SELECT ... FOR UPDATE`, not a PostgreSQL sequence.** A sequence is not transactional: a rolled-back sale would leave a gap. The row lock makes the increment part of the sale's transaction, so a rollback returns the number, and concurrent sales queue on the lock, so no number is given twice. `invoices.sequence` is unique as a second guard. Lock order: `orders`, `order_items`, then `invoice_counters` last.
- **Idempotent:** an order that has a number gets the same one back; the counter does not move.
- **History is never renumbered:** a row that has a `number` (well-formed or not) is returned as stored. A row marked `NOT_REQUIRED` is never numbered.
- **Not initialised:** nothing is allocated. The sale is left `PENDING` ("Invoice being prepared") and the payment still commits. Code paths that sell never create the counter.

**Initialisation procedure**

1. Run the data migration so every website invoice number is in `invoices.number` (see mapping below).
2. `GET /admin/invoices/counter`: review `analysis.highest`, `duplicates`, `malformed`.
3. Get the owner's approval of that highest number.
4. `POST /admin/invoices/counter/initialize` with `{ "confirmLastValue": "<approved number>" }` as a super admin. The call is refused if the value differs from the highest number in the data (409 `INVOICE_COUNTER_MISMATCH`), if the counter exists (409), or if there is no migrated number at all (409 `INVOICE_HISTORY_MISSING`; `allowEmpty: true` overrides this for development databases only).
5. `POST /admin/invoices/allocate-pending` to number any sale paid in between.

**The `INVOICE_NUMBERING_ENABLED` switch.** On the website numbering is off unless the variable is `true`, and sales made while it is off are marked `not_required` for good. The series is live, so here numbering is on whenever the counter is initialised. `INVOICE_NUMBERING_ENABLED=false` is kept only as a pause: sales stay `PENDING` and are numbered later, in payment order. Open question 1.

**Fallback labels** (`invoiceLabel`), as the website shows them:

| Sale | No number, status pending | No number, otherwise |
|---|---|---|
| Consultation, report | `Invoice being prepared` | `INV-<last 8 characters of the record id, upper case>` |
| Product order | `Invoice being prepared` if paid | `No invoice issued` |

For migrated sales the record id is the website booking or report order `_id` (`legacySourceId`), else the transaction `_id`, so historical labels come out the same.

## 4. Invoice documents

Delivered: the data model and `GET /invoices/orders/:orderId` returning everything the website's three templates print: number or label, seller block, order reference, dates, place of supply, reverse charge "No", customer, shipping address, payment (status, method, transaction id, date, paid currency and amount), lines, and totals (subtotal, discount, shipping, one row per GST rate, grand total).

**Seller details** are configuration, not code: `INVOICE_SELLER_NAME`, `_TAGLINE`, `_ADDRESS`, `_GSTIN`, `_STATE`, `_EMAIL`, `_PHONE`, `_WEBSITE` through `SellerDetailsProvider` (`setSellerDetailsProvider` lets site settings replace the environment source). Name, address, GSTIN and state are required; without them invoice data and the GST report answer 503 `INVOICE_SELLER_UNCONFIGURED`. The website's values are hardcoded in `src/utils/invoice.template.js` (`SUPPLIER_GSTIN`, `SUPPLIER_STATE` near line 70, and the `brand-name` / `brand-meta` header block), repeated in `generateBookingInvoiceTemplate.js` and `generateReportInvoiceTemplate.js`, and `SUPPLIER_STATE` again in `src/modules/Transaction/Transaction.controler.js`.

**Not done: the PDF.** Recommended approach, adding no dependency: a LaTeX template rendered by the existing XeLaTeX pipeline in `packages/report-engine`, fed by `InvoiceDocumentData`, stored as a private file through `apps/api/src/services/storage/storage-refs.ts`. The website renders HTML through a remote Chrome, which this backend does not have.

## 5. Transactions ledger

- `transactionsService.recordAttempt(tx, order)` writes the PENDING row in the transaction that creates the order (wired into `commerceService.createOrder`).
- `settleOrderPaid(tx, orderId, payment)` marks it SUCCESS and allocates the invoice. Contract: the caller has locked the order row `FOR UPDATE` in the same transaction and returned early if it was already paid. That lock is the "claim once" guarantee between verify and webhook; the function is also safe to repeat. Wired into `commerceService.verifyPayment` and the webhook's `payment.captured`.
- If a paid order has no ledger row (created by a path that did not record the attempt), `settleOrderPaid` creates it, so a paid sale is never missing from the ledger.
- `markOrderFailed` sets a PENDING row to FAILED on `payment.failed` or a bad signature. A SUCCESS row is never changed.
- `rawResponse` is an allow-list of gateway fields (id, order id, amount, currency, status, method, captured, international, fee, tax, error fields, created_at). Card, bank, VPA, e-mail, contact and notes are dropped.
- Nothing here issues or records a refund.

## 6. GST report

Row: date, invoice number or label, type, customer name, e-mail, phone, place of supply, taxable value, GST rate label, GST type, GST amount, total, currency, payment method, payment status, Razorpay transaction id. Summary: taxable total, GST total, grand total, count.

- total = INR base amount; GST = ledger tax; taxable = total minus GST (so the three always agree, net of discount and including shipping).
- Rate label: one rate gives `18%`; several give `Mixed (18/5%)`; a tax total with no rate gives `18%` and type `Exclusive` (the website's rule for records older than its GST fields); no tax gives `0%` and `—`.
- Not filtered by the order's current state: it records what was collected at the time of sale.
- Dates are Indian calendar days.
- CSV: the website admin's 16 columns in the same order, CRLF line ends, RFC 4180 quoting, and text beginning with `=`, `+`, `-` or `@` is prefixed with an apostrophe (phone numbers and plain numbers are left alone).

## 7. Cash on delivery

Not offered. `SalePaymentMethod.COD` exists so migrated website orders and their transactions can be stored. Nothing in this backend creates a COD order. Open question 3.

## 8. Refunds

The existing refund endpoint and code are untouched except for one guard: a refund for an order charged in a foreign currency is refused (400 `REFUND_UNSUPPORTED_CURRENCY`), because that code sends INR paise to the gateway. Nothing added here issues a refund, and a refund does not touch the ledger or the invoice. Open question 4.

## 9. Payment verification (security finding 2)

| Check | Before | Now |
|---|---|---|
| Order belongs to the caller | Yes (staff roles ADMIN and SUPER_ADMIN may verify any order) | Unchanged |
| Gateway order id matches the stored one | Yes: the order is looked up by its stored `razorpayOrderId` and the signature covers that id | Also compared with the `order_id` Razorpay reports for the payment |
| Captured amount and currency | **Not checked in checkout verify** (only in the webhook, and only when the event carried them) | Verify reads the payment from Razorpay and compares amount, currency, order id and status. The webhook compares against the paid currency and amount, and in production refuses a capture event without them |

Outside production, when no gateway credentials are set or the lookup fails, the comparison is skipped so mock payments keep working. In production a failed lookup fails the verification.

## Differences from the website, and why

1. JPY is charged in whole yen (website: 100 times too much).
2. An unknown currency is refused everywhere (website: bookings charged at rate 1).
3. The exchange rate is never taken from the browser (website report purchase, finding 3).
4. Ledger component amounts are INR paise. The website stores subtotal, tax, shipping and discount in the paid currency.
5. The GST report is always in INR. The website reports foreign-currency product orders in the paid currency.
6. Ledger `taxPaise` is all GST in the sale. The website stores only exclusive GST for product orders, so GST inside inclusive product prices is absent from its report. Open question 5.
7. A discount larger than the subtotal is refused (website: negative total).
8. Transactions list dates are Indian days (website: server-local days for the list, Indian days for the GST report).
9. Sales made before the counter exists are `PENDING` and numbered later (website: `not_required`, never numbered).
10. Verify compares the payment with the order (finding 2).
11. CSV is produced by the server with quoting and formula protection.
12. Coupon use and stock are not handled here (other modules).

## Data migration mapping

Amounts: website rupees (float) in the paid currency. Multiply by 100 and round for paise; for a foreign-currency record divide by `exchangeRate` first to get INR, or take the website's INR field where one exists.

**`transactions` to `payment_transactions`**

| Website | Ours | Notes |
|---|---|---|
| `_id` | `legacyId` | |
| `user` | `userId` | mapped user id |
| `order` / `booking` / `report` | `orderId`, `legacySourceId` | `orderId` is our migrated order; `legacySourceId` keeps the website `_id` (fallback labels need it) |
| `transactionType` | `type` | missing on some old rows: infer from which of order/booking/report is set, and report the count |
| `amount` | `amountMinor` | in `currency` minor units; JPY rows need a manual check (see quirks) |
| `currency`, `baseCurrency` | same | upper case |
| `baseAmount` | `baseAmountPaise` | 0 on report transactions before 2026-07-29: take the report order's `baseAmount`; if still 0 leave 0 and report it |
| `subTotal`, `shipping`, `tax`, `discount` | `subtotalPaise`, `shippingPaise`, `taxPaise`, `discountPaise` | convert to INR; keep the originals in `legacyData` |
| `taxRate` | `taxRateBp` | percent x 100 |
| `taxInclusive` | `taxInclusive` | always false on website product orders, whatever the items say |
| `exchangeRate` | `exchangeRate` | |
| `method` | `method` | `cod`, `razorpay`, `manual` |
| `status` | `status` | `paid` (outside the enum) becomes SUCCESS; count them |
| `transactionId` | `gatewayPaymentId` | |
| `razorpayOrderId` | `gatewayOrderId` | |
| `rawResponse` | `rawResponse` | pass through `sanitizeGatewayPayload`; do not copy as is |
| `createdAt`, `updatedAt` | same | the GST report is by `createdAt` |
| report `customerDetails.fullName`, or bride and groom joined with " & " | `customerName` | the website shows these instead of the account name |
| order `shippingAddress.state` | `placeOfSupply` | |

**`invoiceNumber` / `invoiceAllocationStatus` on `orders`, `bookings`, `reportorders` to `invoices`**

| Website | Ours | Notes |
|---|---|---|
| record `_id` | `legacyId` | |
| our migrated order | `orderId` | |
| collection | `saleType` | orders ORDER, bookings CONSULTATION, reportorders REPORT |
| `invoiceNumber` | `number` | copied exactly, including malformed and duplicate values |
| | `sequence` | always null for migrated rows |
| `invoiceAllocationStatus` | `status` | `allocated`, `pending`, `not_required`; missing or empty with no number becomes NOT_REQUIRED so history is never numbered |

**`invoicecounters`**: not copied. The counter is created by the initialisation procedure from the migrated numbers. Compare the website's `lastValue` with `analysis.highest` and report any difference.

**Order fields**: `payment.currency` to `paidCurrency`, `totalAmount` to `paidAmountMinor`, `baseAmount` to `amount`, `exchangeRate`, `payment.method` to `paymentMethod`. `Order.razorpayOrderId` is required and unique here; COD and manual sales have none, so the order migration must either make that column optional or write a synthetic value.

**Quirks seen in the website's scripts and code (the migration must report these, not hide them)**

- Paid admin-created bookings with no transaction (`backfillManualBookingTransactions.js`).
- Transactions whose amounts no longer match the booking after an admin "change plan".
- `booking.transactionId` pointing at a deleted transaction.
- Report transactions with `baseAmount` 0 (`fixLegacyTransactionGaps.js`).
- Transactions with status `paid`.
- Missing, malformed and duplicate invoice numbers, including the same number in two collections and `INV-AS/7` next to `INV-AS/07` (`analyzeStagingInvoiceData.js`).
- Successful transactions whose booking was soft-deleted or whose order is no longer paid (`diagnoseGstExtras.js`): they stay in the GST report by design.
- Tax totals with no rate, reported as 18% exclusive.
- Website product orders were excluded from the shared counter in its own document ("Product Order invoice numbering is separate") while the code does number them from it; check which numbers product orders actually carry.
- Any JPY payment was charged 100 times the intended amount; list them.
- An hourly job deletes pending records older than two days, so pending transactions are mostly absent.

## Environment variables (names only)

`EXCHANGE_RATE_API_KEY`, `INVOICE_SELLER_NAME`, `INVOICE_SELLER_TAGLINE`, `INVOICE_SELLER_ADDRESS`, `INVOICE_SELLER_GSTIN`, `INVOICE_SELLER_STATE`, `INVOICE_SELLER_EMAIL`, `INVOICE_SELLER_PHONE`, `INVOICE_SELLER_WEBSITE`, `INVOICE_NUMBERING_ENABLED` (optional pause switch). Already present and used: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## Work needed in other modules

- **Other paths that mark an order paid** do not call the money hook yet: `consultations.service.ts` (about line 456), `courses.service.ts` (about line 1212), `products.service.ts` `verifyShopPayment` (about line 536). Each should call `settleOrderPaid(tx, order.id, { gatewayPaymentId, gatewayOrderId })` inside its paid transaction after locking the order row. Until then their sales get a ledger row and number only from the webhook or from `POST /admin/invoices/allocate-pending`. None of the three compares the captured amount and currency (finding 2).
- **Shop checkout** (`shop-orders.service.ts`) creates its own `Order`, refuses non-INR and does not record a ledger attempt. It should use `calculateSale`, `quoteCheckout` and `transactionsService.recordAttempt(tx, order, { placeOfSupplyState })`.
- **Consultation booking** in a foreign currency: same three calls.
- **Admin manual booking / manual payment**: create the order with `paymentMethod: MANUAL` and call `settleOrderPaid` (the website's missing-transaction bug came from skipping this).
- **Site settings**: if seller details are to be edited in the admin, register a `SellerDetailsProvider` that reads them.
- **Scheduler**: the website runs invoice recovery every 5 minutes. Here it is the manual admin action; a worker can call `invoiceService.allocatePending(200, settle)`.
- **Mobile and website clients**: read `paidCurrency` and `paidAmountMinor` from `create-order` for display; the gateway order id already carries the amount.

## Open questions

1. `INVOICE_NUMBERING_ENABLED`: keep it as a pause switch (built), or remove it now that the series is live?
2. Who may initialise the counter and allocate pending invoices: super admin only (built), or a new permission `invoices:manage`?
3. Should cash on delivery be offered at all? On the website it marks any order, digital ones included, paid at once.
4. What should happen to the existing refund endpoint (`POST /payments/orders/:id/refund`, open to the order's owner) given "no refunds on website flows": remove it, restrict it to staff, or keep it for app purchases only? A refund today also leaves the invoice and ledger row unchanged; is a credit note needed?
5. GST inside inclusive product prices: report it (built) or leave it out as the website does?
6. JPY: confirm no live JPY payments exist, or decide how to treat those charged 100 times too much.
7. Should staff with role ADMIN be able to verify a payment on a customer's order (existing behaviour, kept)?
8. Invoice numbers for sales paid in a foreign currency: the invoice data carries INR totals plus the charged currency and amount. Should the printed invoice show INR, the paid currency, or both?
9. Rate cache: in-memory per API process (built). Is one API process the deployment, or should the cache move to Redis?
