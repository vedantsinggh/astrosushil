# Shop: categories, products, cart, wishlist, coupons, addresses, product orders, downloads, course links, customers

**Status:** built on `staging`, not migrated (the lead generates the migration). Unit-tested with the database, gateway, storage and messaging substituted. The existing integration tests of products and courses need a migrated database and were not run.
**Website sources:** `src/modules/{products,category,cart,wishlist,Address,coupon,Order,Download,Course}`, `src/common/priceengine.js`, `src/common/taxEngine.js`, `src/middlewares/checkPhysicalProductAddress.js`, `src/utils/createWatermarkedImage.js`, `src/modules/auth/user.controler.js` (customers admin), and the admin pages Categories, Products, Orders, Coupons, Courses, Customers.

## Where things are

| Area | Files |
|---|---|
| Price engine (selling price, shipping rule, cart pricing over the money module) | `apps/api/src/modules/products/shop-pricing.ts` |
| Product views (public / admin), variants, cart-line resolution | `apps/api/src/modules/products/product-view.ts` |
| Admin guard, audit, slug, pagination, blocked-customer check | `apps/api/src/modules/products/shop-http.ts` |
| Gateway read-back check before an order is marked paid | `apps/api/src/modules/products/payment-check.ts` |
| Products: public + app endpoints (existing files, edited) | `products.routes.ts`, `products.service.ts`, `products.schemas.ts`, `account.routes.ts` |
| Products admin | `products.admin.service.ts`, `products.admin.routes.ts` |
| Categories | `apps/api/src/modules/categories/` |
| Saved cart | `apps/api/src/modules/cart/` |
| Wishlist | `apps/api/src/modules/wishlist/` |
| Coupons (rules are pure: `coupon-rules.ts`) | `apps/api/src/modules/coupons/` |
| Product orders, status mapping | `apps/api/src/modules/shop-orders/` (`order-status.ts`, `shop-orders.service.ts`, `shop-orders.routes.ts`) |
| Course links | `apps/api/src/modules/courses/course-links.service.ts`, `course-links.routes.ts` |
| Customers admin | `apps/api/src/modules/customers/` |
| Tests | `apps/api/tests/unit/shop-pricing.test.ts`, `shop-catalog.test.ts`, `shop-services.test.ts`, `shop-routes.test.ts`, `shop-boot.test.ts` |

The folder structure is the one the task proposed (`categories`, `cart`, `wishlist`, `coupons`, `shop-orders`, `customers`), plus new files inside `products/` and `courses/`.

## Endpoints

All under `/api/v1`. Responses use the products module's envelope `{ statusCode, success, message, data }`; errors use the standard `{ error: { code, message, requestId } }`. Every amount is an integer in paise unless a field name says `Minor` (minor units of the paid currency). Percent fields (`taxRate`, coupon `discount` for percentage coupons, product `gst.rate`) are plain percents.

### Public

| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | Filters `page`, `limit`, `search`, `topLevel`, `parent` (comma list), `productType`, `isActive`. Active categories unless `isActive` is given |
| GET | `/categories/tree` | Nested tree of active categories |
| GET | `/categories/:idOrSlug` | One active category |
| GET | `/products` (alias `/shop`) | Existing. Now only published + available products, the safe public view, and new filters `type` (physical, digital, service), `page`, `featured`; `category` accepts a category code, id or slug (comma list). With a customer token each product carries `isInCart`, `isInWishlist` |
| GET | `/products/:idOrSlug` | Existing. Unpublished products are 404; no file location in the response |
| GET | `/products/slug/:slug` | Website path, same view |
| POST | `/products/cart/calculate` | Existing stateless calculation, same request and response shape, now on the shared price engine |
| GET | `/course-links` | Active course links, newest first. Filters `search`, `category`, `featured` |
| GET | `/course-links/:idOrSlug`, `/course-links/slug/:slug` | One active link |
| GET | `/course-links/:idOrSlug/go` | Counts the click, then 302 to the outside platform. 30 per minute per client |
| POST | `/course-links/:idOrSlug/click` | Counts the click and returns `{ redirectUrl }` (for the app) |

### Customer (login required; a blocked customer gets 403)

| Method | Path | Website path |
|---|---|---|
| GET | `/cart` | `GET /cart` |
| POST | `/cart/add` `{ productId, variantId?, quantity? }` | same |
| PUT | `/cart/update` `{ productId, variantId?, quantity }` | same |
| DELETE | `/cart/remove` (body or query `productId`, `variantId?`) | same |
| POST | `/cart/coupon` `{ code }` | same |
| DELETE | `/cart/coupon` | none (new: remove the coupon) |
| DELETE | `/cart/clear` | same |
| GET | `/wishlist` | same |
| POST | `/wishlist/add`, `/wishlist/toggle`, `/wishlist/remove` `{ productId }` | same |
| DELETE | `/wishlist/clear` | same |
| GET | `/coupons/frontend` | same |
| POST | `/orders/create` `{ addressId?, paymentMethod?, currency?, idempotencyKey? }` | same. 10 per minute |
| POST | `/orders/verify-payment` `{ orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature }` (camelCase accepted too) | same. 20 per minute |
| GET | `/orders/my-orders` | same |
| GET | `/orders/:orderId` | same |
| PATCH | `/orders/:orderId/cancel` | same |
| GET/POST/PUT/DELETE | `/account/addresses[/:id]` | `/address` (existing here; now with `landmark`, `type`) |
| PATCH | `/account/addresses/:id/default` | `PATCH /address/:id/default` (new here) |
| GET | `/account/downloads` | `GET /downloads/my-downloads` (existing here; now per variant, no storage keys) |
| GET | `/account/downloads/:entitlementId` | `GET /downloads/:id` (existing here; now a real signed link) |
| POST | `/products/orders`, `/products/orders/verify-payment`, `/products/orders/:orderId/verify-payment` | App endpoints, unchanged contract |
| GET | `/account/orders`, `/account/orders/:orderId`, `/account/summary` | App endpoints, unchanged |

The website's invoice download (`GET /orders/:orderId/invoice`) is the money module's `GET /invoices/orders/:orderId`.

### Admin (staff login + `checkPermission` from `modules/admin/rbac/check-permission.ts`; every change audited through `adminService.logAction`)

| Method | Path | Permission | Website key | Audit action |
|---|---|---|---|---|
| GET | `/admin/categories`, `/admin/categories/tree`, `/admin/categories/:id` | `categories:read` | none (public reads) | |
| POST | `/admin/categories` | `categories:create` | `categories.create` | `CATEGORY_CREATED` |
| PUT | `/admin/categories/:id` | `categories:update` | `categories.edit` | `CATEGORY_UPDATED` |
| DELETE | `/admin/categories/:id` | `categories:delete` | `categories.delete` | `CATEGORY_DELETED` |
| GET | `/admin/shop-products`, `/admin/shop-products/:id` | `products:read` | none | |
| POST | `/admin/shop-products` | `products:create` | `products.create` | `PRODUCT_CREATED` |
| PUT | `/admin/shop-products/:id` | `products:update` | `products.edit` | `PRODUCT_UPDATED` |
| DELETE | `/admin/shop-products/:id` | `products:delete` | `products.delete` | `PRODUCT_DELETED` / `PRODUCT_ARCHIVED` |
| GET | `/admin/coupons`, `/admin/coupons/:id` | `coupons:read` | `coupons.view` | |
| POST | `/admin/coupons` | `coupons:create` | `coupons.create` | `COUPON_CREATED` |
| PUT | `/admin/coupons/:id`, PATCH `/admin/coupons/:id/toggle` | `coupons:update` | `coupons.edit` | `COUPON_UPDATED`, `COUPON_TOGGLED` |
| DELETE | `/admin/coupons/:id` | `coupons:delete` | `coupons.delete` | `COUPON_DELETED` / `COUPON_DEACTIVATED` |
| GET | `/admin/shop-orders` (filters `page`, `limit`, `search`, `status`, `fromDate`, `toDate`, `productId`), `/admin/shop-orders/:orderId` | `orders:read` | `orders.view` | |
| GET | `/admin/shop-orders/reports` | `orders:export` | `orders.export` | |
| PATCH | `/admin/shop-orders/:orderId/status` `{ orderStatus, trackingNumber?, courierPartner? }` | `orders:update` | `orders.edit` | `SHOP_ORDER_STATUS_UPDATE` |
| GET | `/admin/course-links`, `/admin/course-links/:id` | `courses:read` | none | |
| POST / PUT / DELETE | `/admin/course-links[/:id]` | `courses:create` / `courses:update` / `courses:delete` | `courses.create` / `.edit` / `.delete` | `COURSE_LINK_CREATED` / `_UPDATED` / `_DELETED` |
| GET | `/admin/customers` (filters `page`, `limit` up to 1000, `search`, `fromDate`, `toDate`, `status`), `/admin/customers/:id` | `customers:read` | `customers.view` | |
| GET | `/admin/customers/export` (CSV) | `customers:read` | none (browser export) | `CUSTOMERS_EXPORTED` |
| PATCH | `/admin/customers/:id` | `customers:update` | `customers.edit` | `CUSTOMER_UPDATED`, `USER_SUSPENDED` / `USER_ACTIVATED` |
| DELETE | `/admin/customers/:id` | `customers:delete` | `customers.delete` | `USER_ACCOUNT_DELETED` |

No new permission key was added. The admin product routes are `/admin/shop-products` and the order routes `/admin/shop-orders` because `admin.routes.ts` (not this module's file) already owns `/admin/orders`, `/admin/orders/:id/fulfillment`, `/admin/products/:id/stock` and `/admin/products/entitlements/*`; those keep working and still use the older keys `orders:fulfill`, `products:manage`, `entitlements:*`.

Not built: the website's `GET /cart/admin/all` (every customer's cart with the customer document). The website admin has no screen for it and no permission key exists; say if it is wanted.

## Models

Block `shop` at the end of `schema.prisma`: `ProductCategory`, `ProductVariant`, `Cart`, `CartItem`, `WishlistItem`, `Coupon`, `CouponAssignment`, `CouponRedemption`, `ShopOrder`, `CourseLink`, `CustomerProfile`, with enums `ShopCategoryProductType`, `ShopDiscountType`, `ShopCouponDiscountType`, `ShopCouponAudience`, `ShopCouponRedemptionStatus`, `ShopOrderStatus`, `ShopAddressType`, `CourseLinkStatus`. Tables that receive website data have `legacyId` (unique, nullable).

Lines added to existing models (each marked `// shop (website integration)`):

- `Product`: `legacyId`, `categoryId` + `categoryRef`, `shortDescription`, `thumbnailUrl`, `thumbnailKey`, `discountType`, `discountValue`, `sku`, `hasVariants`, `gstEnabled` (default true), `gstRateBp` (default 1800), `gstInclusive` (default true), `isPublished` (default true), `isFeatured`, `isTrending`, `isBestSeller`, `rating`, `reviewsCount`, `metaTitle`, `metaDescription`, `keywords`, `weightGrams`, `dimensions`, `managedByAdmin`, relations `variantRows`, `cartItems`, `wishlistItems`. The defaults are exactly what the seeded products had implicitly (18% inclusive GST, published).
- `ProductType` enum: values `DIGITAL` and `SERVICE` added (website types). Existing values untouched.
- `ShippingAddress`: `legacyId`, `landmark`, `type` (HOME/WORK/OTHER).
- `DigitalProductEntitlement`: `legacyId`, `variantId`, `orderItemId`, `assetName`.
- `Order`: relation `shopOrder`. `Course`: relation `links`. `User`: relations `cart`, `wishlistItems`, `couponAssignments`, `couponRedemptions`, `customerProfile`.

There is no `downloads` table: a purchased digital item is a `DigitalProductEntitlement`.

## 1. Categories

Tree by `parentId`, `productType` physical or digital, image `{ url, key }` (validated with `validateUploadedRef`, purpose `category`), `isActive`. Slug is generated from the name and made unique with `-1`, `-2`; renaming gives a new slug (as on the website). Delete is refused while the category has subcategories; its products are kept and become uncategorised (`SetNull`).

Differences from the website: a category cannot be moved under one of its own descendants (the website only refuses "itself"); the public list and tree show active categories only unless `isActive` is passed; the old image is removed from storage when replaced or when the category is deleted (the website does the same).

## 2. Products

**Fields** (admin body): `name`, `hindiTitle`, `shortDescription`, `description`, `hindiDescription`, `type` (physical, digital, service), `categoryId`, `images` (up to 10 `{ url, key }`), `thumbnail` `{ url, key }`, `hasVariants`, `mrpPaise`, `discountType` (percentage, fixed), `discountValue` (percent, or paise when fixed), `stock`, `sku`, `variants[]` (`id?`, `name`, `value`, `mrpPaise`, `stock`, `downloadableFile { key, name? }`, `metaTitle`, `metaDescription`), `downloadableFile` (digital product without variants), `gst { enabled, rate, type }`, `weightGrams`, `dimensions`, `metaTitle`, `metaDescription`, `keywords`, `isFeatured`, `isTrending`, `isBestSeller`, `isPublished`, `isAvailable`.

**Website rules kept:** price is derived from MRP and the product discount, per variant when there are variants; `mrp` must not be sent with variants and is required without; every variant of a digital product needs a file.

**Files:** images are public uploads (purpose `product`); sold files are private uploads (purpose `digital-product`; a website-era file under the public prefix is accepted so a migrated product can be saved again). Only the storage key of a sold file is stored, and only the admin view returns it. The website watermarks images of digital products while uploading; here that is the upload endpoint's `watermark=true` option, chosen by the admin panel when it uploads a digital product's image.

**Public view** (`toPublicProduct`): built field by field, so nothing private can leak by being added to the row later. It contains every field the app reads today plus the website's names (`name`, `type`, `thumbnail`, `images`, `gst`, `priceWithGst`, `discount`, `categoryInfo`). `metadata.digitalAssetKey` and bundle asset keys are removed; variant file keys are never included. Before this work `GET /products` and `GET /products/:id` returned the raw row, including those keys.

**Seed and admin products together.** `products.seed.ts` is the starting catalogue. At start-up it creates the products that are missing and refreshes the ones nobody has edited. A product created or edited in the admin gets `managedByAdmin = true` and the seed leaves it alone from then on. Two fixes to the seed: it no longer resets `stock` on every start (it used to put the herb back to 9,995 at each restart, undoing sales), and seeded variants are also written to `product_variants` with their seed id as `code` (`size-large`), which is the id the app sends. Deleting a seeded product archives it (see below), otherwise the next start would bring it back.

**Delete:** the website removes the document. Here a product that has been bought (a download entitlement or an order line refers to it) or that is seeded is archived instead: unpublished, unavailable, removed from carts. Otherwise it is deleted with its images and files. Deleting a bought product would remove customers' downloads (`onDelete: Cascade` on entitlements).

**Update of variants:** the list sent is the complete list (with `id`: updated; without: added; missing: removed, and removed from carts). The website can only add and edit variants: a variant left out of an update stays. Flagged for the admin build.

**Product row with variants:** the website stores no price on such a product; here `price` and `mrp` hold the cheapest variant's values (the columns are not nullable and listings need a "from" price).

## 3. Prices, GST, shipping

One calculation for the whole backend: `priceCart` in `shop-pricing.ts` calls the money module's `calculateSale` (discount spread over lines by listed value, each line's GST on its discounted value, inclusive GST inside the price, exclusive GST on top). The shop adds only its shipping rule and the cap of the discount at the items total. The saved cart, the stateless `cart/calculate`, the app's `POST /products/orders` and the website checkout all go through it.

**Shipping: decision needed.** The website charges a hard-coded Rs 500 whenever any item is physical. The app charges Rs 99, free from Rs 2,000 of physical goods. They cannot both be right for one shop. The rule is configuration: `SHOP_SHIPPING_FLAT_PAISE` and `SHOP_SHIPPING_FREE_FROM_PAISE` (`none` = never free). **Unset, the app's current rule applies**, so nothing changed for the app. The website's rule is `SHOP_SHIPPING_FLAT_PAISE=50000`, `SHOP_SHIPPING_FREE_FROM_PAISE=none`.

**GST.** Per product, as on the website (`enabled`, rate, inclusive or exclusive). Existing products default to 18% inclusive, which is what `cart/calculate` hard-coded, so their numbers are unchanged (tested). Website products default to enabled, rate 0, exclusive.

## 4. Saved cart

One cart per customer. It stores product, variant, quantity and a coupon code, and **no price**. Every read and the checkout price it from the catalogue as it is at that moment (the website keeps the price from when the item was added). The response has the website's fields (`items[]` with `product`, `variantId`, `name`, `thumbnail`, `quantity`, `price`, `mrp`, `total`, `taxRate`, `taxType`, `taxAmount`, `productType`; `subTotal`, `discount`, `couponCode`, `appliedCoupon`, `shipping`, `tax`, `totalAmount`) plus `available`, `inStock`, `problem` per item, `couponError`, `taxIncluded`, `freeShipping`, `requiresShipping`, `canCheckout`.

Differences: a product with variants needs a variant (same as the website); an item that was unpublished or whose variant was removed stays visible, flagged, outside the totals; an invalid stored coupon is reported in `couponError` instead of being silently dropped; at most 50 lines and 50 of one item; `clear` also forgets the coupon. The stateless `POST /products/cart/calculate` is unchanged for the app.

## 5. Wishlist

One row per customer and product. `add` answers 400 "Already in wishlist" as on the website; `toggle` returns `inWishlist`; `remove` of a product that is not there is not an error; unpublished products are left out of the list; at most 500 products.

## 6. Coupons

Website rules, in `coupon-rules.ts`: PERCENTAGE or FLAT, maximum discount (percentage coupons only, as on the website), minimum order amount, usage limit, validity window, GLOBAL or INDIVIDUAL (assigned users), one use per customer. Checked when applied, on every cart read, and again at checkout.

**Scope: products, reports, and consultations** (owner decision 2026-11-24, open-questions M8). Controlled per coupon by the `CouponScope` model (`products`, `reports`, `consultations`). Unscoped (legacy) coupons are restricted to `products` only. Evaluated and held at checkout across all three sale types, and redeemed when the order is marked paid. Coupons never stack with staff discounts on manual bookings.

**Usage under concurrency.** At checkout, inside the transaction that creates the order, the coupon row is locked (`SELECT ... FOR UPDATE`), the rules are checked again and a hold (`CouponRedemption` RESERVED) is written for the order. Counting uses = redeemed + live holds, so two customers cannot both take the last use. The hold lasts `SHOP_COUPON_HOLD_MINUTES` (default 30). In the transaction that marks the order paid the hold becomes REDEEMED and `usedCount` goes up by one, once. A cancelled or failed unpaid order frees its hold.

Edge cases, stated: a customer who starts checkout again with the same coupon replaces their own earlier hold, and the earlier unpaid order is cancelled (otherwise they would be told the coupon is "already used"). A payment that arrives after the hold lapsed is still honoured, because the customer paid the discounted amount; that is the only way a limit can be exceeded, and it is logged.

**Fixes:** a flat coupon is capped at the items total (the website lets the total go negative); usage is recorded atomically (the website does it best-effort after payment).

**Delete:** a coupon that has recorded uses is switched off instead of deleted; an unused one is deleted.

## 7. Addresses

Existing `/account/addresses`, extended with `landmark` and `type` (home, work, other), `PATCH /:id/default`, and the first address of an account becoming the default. Every read, update, delete and default carries the caller's user id (the website's update, delete and default looked the address up by id only: finding 6). Update writes only address fields, whatever the body contains. Validation was loosened to the website's (postal code from 4 characters, phone from 7 digits), because foreign-currency customers have such addresses.

## 8. Product orders

**One payment path.** `ShopOrdersService.createFromDraft` is the only place a product order is created, for the website checkout and for the app's `POST /products/orders` alike. It is given a typed `ShopOrderDraft` and does, in order: `quoteCheckout` (money module: INR total to the charged currency, server-side rate), one gateway order, then one transaction with the `Order` and its `OrderItem`s, `transactionsService.recordAttempt` (ledger, with the delivery state as place of supply), the `ShopOrder` row and the coupon hold.

Typed input handed to commerce (`shop-orders.service.ts`):

```ts
interface ShopOrderDraft {
  userId: string; source: 'cart' | 'direct'; currency: string;      // requested paying currency
  items: Array<{ productId; catalogId; slug; title; imageUrl; type; productType;
                 variantId; variantLabel; quantity; unitPricePaise; mrpPaise;
                 taxRateBp; taxInclusive; couponDiscountPaise; taxablePaise; taxPaise; payablePaise }>;
  itemsTotalPaise; couponCode; couponDiscountPaise; shippingPaise;
  taxAddedPaise; taxTotalPaise; taxablePaise; totalPaise;            // all INR paise
  shippingAddressId; shippingAddress;                                // snapshot copied onto the order
  idempotencyKey?; notes?;
}
```

`Order.amount` is the INR total, `subtotal` the taxable value, `taxAmount` all GST, `discountAmount` the coupon, `shippingAmount` shipping; `paidCurrency`, `paidAmountMinor`, `exchangeRate` come from the money module. The nine website currencies are accepted.

**Checkout (`POST /orders/create`)** refuses: `paymentMethod: "cod"` (cash on delivery is not offered; the website marked COD orders paid at creation, digital ones included), an empty cart, an item that is unavailable or short of stock, a stored coupon that is no longer valid (409 `COUPON_NO_LONGER_VALID`; the website silently charged the full price), a missing address for physical goods, an address of another customer, and a zero total. The cart is emptied when the order is paid, as on the website.

**Verification** uses the existing shop verification (`productsService.verifyShopPayment`), now also used by `/orders/verify-payment`: the order is found by the stored gateway order id, must belong to the caller, an `orderId` sent alongside must match, the signature is checked, and the payment is read back from the gateway and its order id, amount and currency compared (`payment-check.ts`, 400 `PAYMENT_MISMATCH`). This closes finding 2. Under the order row lock an order that is already paid is returned as it is. In the same transaction: `applyPaidEffects`, fulfilment reconciliation, and `settleOrderPaid` (ledger SUCCESS + invoice number). `courses.service.ts` `verifyCoursePayment` got the same read-back and `settleOrderPaid`, and (wire-payments) the same check under the lock: a paid order is never stamped again, and one cancelled meanwhile is refused.

**`applyPaidEffects(tx, orderId)`** runs once per order (`ShopOrder.paidEffectsApplied`):

- Stock of each physical line is taken with a conditional update (`WHERE stock >= quantity`), on the variant when there is one. Stock never goes below zero. If stock ran out between checkout and payment the order still stands, because it is paid, and the shortfall is written on `ShopOrder.stockShortfall` and logged for the admin.
- Each digital line grants one `DigitalProductEntitlement` for that product and variant, holding the variant's file key.
- The coupon use is recorded, the saved cart is emptied (cart checkouts only), the website status moves to `placed`, or `delivered` for a digital-only order (as on the website).

### Status mapping

| Website status | `Order.status` | `paymentStatus` | `fulfillmentStatus` |
|---|---|---|---|
| `payment_pending` | PENDING | PENDING | UNFULFILLED |
| `payment_failed` | FAILED | FAILED | UNFULFILLED |
| `placed` | PAID | CAPTURED | as reconciled |
| `confirmed` | PAID | CAPTURED | as reconciled |
| `processing` | PAID | CAPTURED | PROCESSING |
| `shipped` | PAID | CAPTURED | DISPATCHED, `dispatchedAt` set |
| `delivered` | PAID | CAPTURED | DELIVERED, `deliveredAt` set |
| `cancelled` | CANCELLED if unpaid, PAID if paid | unchanged | CANCELLED |

The website status itself is `ShopOrder.status`, the source of truth for the shop screens (`placed` and `confirmed` are the same thing on the Order row). The shipping address is copied to `ShopOrder.shippingAddress` when the order is created.

**Cancel.** A customer can cancel until the order ships (`payment_pending`, `payment_failed`, `placed`, `confirmed`, `processing`); the website allows it until delivery. No refund is made (owner decision): an unpaid order becomes CANCELLED, **a paid order keeps `Order.status = PAID`** so revenue, ledger and invoice still count the money that was kept. Stock taken for the order is put back (the website does not restore it), the unpaid order's coupon hold is freed, unshipped physical fulfilment units are cancelled. Downloads already granted stay. **Flag for the owner:** a customer can cancel a paid order and receives nothing back; the response and the admin screen should say so, or cancelling paid orders should be reserved to staff.

**Admin status update.** Allowed targets: `placed`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`. The website also accepts `pending`, which is not one of its own order statuses; it is refused here. An unpaid order can only be cancelled (the website lets staff mark an unpaid order delivered), and a cancelled order cannot be changed. Each change is audited and raises `notificationEvents.orderConfirmed` with the new status, as the website does. A customer's own cancellation sends nothing, as on the website.

**Reports (`/admin/shop-orders/reports`)**: `totalOrders`, `totalSales` and `avgOrderValue` (INR value of paid orders), `paidByCurrency`, `statusWiseOrders`, `paymentMethodBreakdown`, `paymentStatusBreakdown`, `orderTypeBreakdown`, `dailyRevenue` (7 days), `monthlyRevenue` (6 months), `recentOrders` (5). Days and months are Indian dates. The website adds amounts of different currencies together; here sales are summed in INR and the paid currencies are listed apart.

## 9. Digital downloads

`GET /account/downloads` lists purchases (per variant) without any storage key. `GET /account/downloads/:entitlementId` checks that the entitlement belongs to the caller and is active, then returns a signed link valid 15 minutes (`getUploadedFileSignedUrl`; the seeded catalogue's own keys are signed directly). The website returns the file's permanent public S3 address. Before this work the endpoint returned a link to `downloads.astrosushil.com` with the key in the query string, which no service answers.

## 10. Course links

The website's courses are cards that link to an outside platform. They are a separate table (`course_links`) and a separate path (`/course-links`); `/courses` stays the in-app course module with lessons and enrolment, untouched apart from the payment settlement above. Fields: title, slug, short description, category, tags, instructor, language, level, price and original price (paise), discount percentage (derived), currency, free flag, rating, reviews, lessons, duration, thumbnail, preview video, platform name, redirect URL (http or https only), featured, status, SEO, click count. Clicks are counted through `/go` or `/click`; the website has the field and never increments it. An inactive link is not served by id (the website's by-id route shows it). The click count is returned to admins only.

**How the two relate: question for the owner.** Today the app's three seeded courses are the same three courses the website links to, and they already carry `platformUrl`. `CourseLink.courseId` can tie a link to an in-app course. Options: keep two lists (website shows links, app shows lessons); or, since "we do not run courses for now", have the app show the links too and retire enrolment later. Nothing was decided or changed in the app's behaviour.

## 11. Customers

`GET /admin/customers` lists accounts with role USER (staff are not customers) with the website's search and date filters; `limit` goes to 1000 because the website admin loads that many for its browser export. `GET /admin/customers/export` returns the same data as CSV, with cells that a spreadsheet would run as formulas made inert.

**Edit:** `firstName`, `lastName`, `email`, `phoneNumber`, `username`, `dob`, `gender`, `birthPlace`, `birthTime`, `bio`, `status`. An empty string means "leave unchanged" (website behaviour). Fields our `users` table lacks are in `customer_profiles`. Email, phone and username are checked for uniqueness; a changed email or phone loses its verified mark.

**BLOCKED** is this backend's existing suspension, not a second mechanism: the latest `USER_SUSPENDED` / `USER_ACTIVATED` / `USER_ACCOUNT_DELETED` audit entry for the user (`featureAccessService.isUserSuspended`). Setting BLOCKED calls `adminService.suspendUser` (which also revokes refresh tokens); ACTIVE calls `activateUser`. Enforcement: one check for the whole backend, `modules/auth/account-status.ts` (`isAccountBlocked`, cached per user for 10 seconds, invalidated on this instance when the customers module blocks, unblocks or deletes). It refuses a blocked account with 403 `AUTHORIZATION_ERROR` at phone OTP verification, password login, Google login, e-mail verification and token refresh (which also revokes the account's refresh tokens), and in `fastify.authenticate` / `authenticateOptional` on every request. `requireActiveCustomer` / `isCustomerBlocked` in `shop-http.ts` delegate to it. `POST /auth/phone/send-otp` answers a blocked account exactly like any other number (the refusal comes at verification, after the caller has proved they hold the phone), so the endpoint does not reveal that an account exists or is blocked. Hooks 3 and 4 are done.

**Delete: decision for the owner.** The website deletes the user document and leaves its orders, bookings and transactions pointing at nothing. Here `users` is referenced by foreign keys: deleting the row would cascade to the customer's orders and bookings, or fail on the rows that protect paid orders (`fulfillment_units`, `shop_orders`). So:

- A customer who **never paid** for anything: the account and everything attached is removed (the row is gone).
- A customer with **paid orders**: every personal detail is removed (profile, birth profiles, reports, addresses, cart, wishlist, tokens, notifications, contact details on bookings), active bookings are cancelled and their slots freed, downloads and course access are revoked, and the row stays as an anonymous "Deleted User" with no email, phone or login. Orders, order lines, bookings, ledger rows and invoices are untouched and still add up. The shipping address copied onto a paid order is kept, as an invoice record needs it.

Both outcomes are audited (`USER_ACCOUNT_DELETED`, no personal data in the entry) and the account can never log in again. This mirrors the app's existing self-service deletion. If the owner wants the row itself gone in the second case, `Order.userId` and `ConsultationBooking.userId` must become nullable with `SetNull`, which touches the commerce and bookings code.

## Security findings and where they are closed

| Finding | Closed by |
|---|---|
| 2: order verify without owner, order id, amount | `verifyShopPayment` + `payment-check.ts` (tested) |
| 4: paid file link and unpublished products by id | `toPublicProduct`, `isPublished` filter on every public read (tested) |
| 6: address update / delete / default without owner | user id in every lookup and write (tested) |
| 10: downloads as public URLs | signed links only, private uploads |
| 12: BLOCKED has no effect | suspension, refused at every login path, at token refresh and on every authenticated request (`auth/account-status.ts`, tested in `wire-accounts-blocked.test.ts`) |
| 13: non-atomic stock and coupon usage | conditional stock updates and coupon holds inside the paying transaction (tested) |
| flat coupon above subtotal, COD for digital orders, add-time prices | capped; COD refused; prices recomputed on read and at checkout (tested) |

## Hooks needed in files this module does not own

1. **DONE (wire-payments). `webhooks.routes.ts`, `payment.captured`.** The inline product step is gone. For an order with PRODUCT lines the webhook calls `shopOrdersService.applyPaidEffects(tx, order.id)` inside the paying transaction (after the fulfilment units are created, before reconciliation and `settleOrderPaid`, the same order as `verifyShopPayment`) and `shopOrdersService.notifyOrderStatus(order.id)` after commit, only when this event was the one that claimed the payment. Stock (variants included), downloads, coupon use, cart and status are now the same whichever path wins. Left as it was, in a file this work could not edit: the replay branch of `productsService.verifyShopPayment` still passes `{ stockAlreadyTaken: true }`; it is now a no-op for every order the webhook paid (the effects are already recorded) and only matters for an order paid by the old webhook code. Its comment ("Until the webhook itself calls `applyPaidEffects`") is out of date.
2. **DONE (wire-payments). `webhooks.routes.ts`, `payment.failed`.** Calls `shopOrdersService.markPaymentFailed(order.id)` for product orders, and the PENDING to FAILED change is now conditional on the status still being PENDING (a failure event can no longer overwrite PAID). **A CANCELLED order is never marked paid by a late capture**: under the order row lock the webhook leaves the order cancelled, applies no effect, issues no invoice number, marks the order's ledger row SUCCESS with the gateway payment id (the money was received), writes an audit entry `PAYMENT_CAPTURED_FOR_CANCELLED_ORDER` and logs an error. Staff see such payments under `GET /admin/transactions/unapplied-payments` (`transactions:read`). What to do with one (refund at the gateway, or honour the order) is an owner decision; nothing refunds it automatically.
3. **DONE.** **`auth.service.ts`** (`verifyPhoneOtp`, `login`, `googleAuth`, `verifyEmail`, `refresh`) refuses a suspended user after the credential has been checked, and revokes the account's refresh tokens.
4. **DONE.** **`plugins/jwt.ts` `authenticate`** (and `authenticateOptional`) call `assertAccountActive` from `auth/account-status.ts` (cached), so a blocked customer's still-valid access token stops working on every route. Still open, in files outside that work: `adminService.suspendUser` / `activateUser` (`POST /admin/users/:id/suspend|activate`) and `usersService` self-deletion do not call `invalidateAccountStatusCache(userId)`, so on those paths the change takes up to 10 seconds to reach requests with an existing access token (login and refresh are immediate).
5. **DONE (wire-payments). `commerce.service.ts` `verifyPayment`** (`POST /payments/verify`): for an order that contains PRODUCT items it calls `applyPaidEffects(tx, order.id)` in its paying transaction (once: it returns under the row lock if the order is already paid, and the function records that it ran), `notifyOrderStatus` after commit, and `markPaymentFailed` on a bad signature. An order cancelled while the payment was being checked is refused under the lock.
6. **`fulfillment.service.ts`**: a `SERVICE` product line (new product type) becomes a DIGITAL_PRODUCT unit and is reported as `INCONSISTENT_MISSING_RECORD`, because it has no download. It needs a rule for service items. Until then do not sell service-type products.
7. **`admin.routes.ts` `PUT /admin/orders/:id/fulfillment`** changes `Order.fulfillmentStatus` without touching `ShopOrder.status`. The admin panel should use `/admin/shop-orders/:orderId/status` for product orders, or that route should call `shopOrdersService.adminUpdateStatus`.
8. **Admin panel uploads**: pass `watermark=true` when uploading images of a digital product.
9. **Data**: orders created by the app before this change have no `shop_orders` row and do not appear in the website-shaped lists until backfilled (status from payment and fulfilment state, address snapshot from `shippingAddressId`). A paid one gets its row the first time `applyPaidEffects` sees it.

## Environment variables (names only)

| Name | Meaning | Unset |
|---|---|---|
| `SHOP_SHIPPING_FLAT_PAISE` | Shipping charged once per order when any item ships | 9900 |
| `SHOP_SHIPPING_FREE_FROM_PAISE` | Physical items total from which shipping is free; `none` = never | 200000 |
| `SHOP_COUPON_HOLD_MINUTES` | How long an unpaid order holds a coupon use | 30 |

Used from other modules: `RAZORPAY_KEY_ID`, storage and exchange-rate settings (see `uploads.md`, `money.md`).

## Data migration mapping (MongoDB to PostgreSQL)

Amounts on the website are decimal rupees (orders: in the paid currency); here integer paise. Every `_id` goes to `legacyId`. References are resolved through `legacyId`.

**`categories` to `product_categories`**: `name`, `slug`, `description`, `parent` to `parentId` (load parents first, or in two passes), `productType` (missing = physical, as the website's own filter assumes), `image.url` / `image.key` to `imageUrl` / `imageKey`, `isActive`, timestamps.

**`products` to `products` + `product_variants`**: `name` to `title`; `slug` (also `catalogId`); `shortDescription`, `description`; `type` to `productType` (physical PHYSICAL, digital DIGITAL, service SERVICE) and `requiresShipping`; `category` to `categoryId` and the category's slug into `category`; `images[]` to `galleryImages`; `thumbnail` to `thumbnailUrl` and `imageUrl`; `mrp`, `price` x100 (for a product with variants the website stores null: use the cheapest variant); `discountType` (`fixed` to FIXED); `discountValue` (percentage x100 = basis points; fixed x100 = paise); `stock`, `sku`, `hasVariants`; `weight` to `weightGrams` (unit not stated on the website: confirm); `dimensions`; `rating`, `reviewsCount`; `metaTitle`, `metaDescription`, `keywords`; `isFeatured`, `isTrending`, `isBestSeller`, `isPublished`; `gst.enabled`, `gst.rate` x100 to `gstRateBp`, `gst.type` to `gstInclusive`; set `managedByAdmin = true`, `currency = 'INR'`, `isAvailable = true`. `discount` and `priceWithGst` are derived and not stored. Variants: `_id` to `legacyId`, `name`, `value`, `mrp` and `price` x100, `stock`, `metaTitle`, `metaDescription`, `downloadableFile` (a full public S3 URL) to `downloadKey` as the object key (`resolveKey`). Quirks: the slug is only generated when missing, so two products can share a name with different slugs; `price` can be stale relative to `mrp` and discount on documents written by `findByIdAndUpdate`-style scripts, so copy the stored price, do not recompute; sold files are public on S3 today and should be moved under the private prefix or have their ACL removed.

The ten seeded products here are the website's products entered by hand. Match them by slug during migration and set `legacyId` on the existing rows instead of inserting duplicates.

**`carts` to `carts` + `cart_items`**: `user`, `couponCode`; per item `product`, `variantId` to `variantKey` (the new variant row id, or ""), `quantity`. Stored prices and totals are dropped (recomputed). Items whose product no longer exists are skipped and reported.

**`wishlists` to `wishlist_items`**: one row per `products[]` entry (`product`, `addedAt`); duplicates collapse on the unique index.

**`addresses` to `shipping_addresses`**: `fullName`, `phone` to `phoneNumber`, `pincode` to `postalCode`, `state`, `city`, `addressLine1`, `addressLine2`, `landmark`, `type` (upper-cased), `isDefault`; `country = 'India'` (the website has no country field). More than one default per user can exist there (update did not scope the reset to the owner): keep the newest as default.

**`coupons` to `coupons` + `coupon_assignments` + `coupon_redemptions`**: `code` (upper case), `description`, `type` to `discountType`, `discount` (percentage x100 = basis points; flat x100 = paise), `maxDiscount`, `minOrderAmount` x100, `usageLimit`, `usedCount`, `validFrom`, `validTill`, `couponType` to `audience`, `oneTimePerUser`, `isActive`; `assignedUsers[]` to assignments; `usedBy[]` to redemptions (REDEEMED, `usedAt`, no order id). `usedCount` and the length of `usedBy` can differ (both were best-effort): keep `usedCount` as stored; the limit check uses the larger of the two.

**`orders` to `orders` + `order_items` + `shop_orders`** (with the money module's fields): `user`; `orderStatus` to `ShopOrder.status`; `orderType`; `addressId` (may point to a deleted address: null); `shippingAddress` to the snapshot; `subTotal`, `discount`, `shipping`, `tax`, `totalAmount` are in the **paid** currency, `baseAmount` is INR: `Order.amount` = `baseAmount` x100, `paidAmountMinor` from `totalAmount`, `paidCurrency` = `payment.currency`, `exchangeRate`; component amounts to INR by dividing by `exchangeRate`; `coupon.code`, `coupon.discountAmount`; `payment.status` (paid: PAID/CAPTURED; failed: FAILED/FAILED; pending: PENDING/PENDING), `payment.transactionId` to `razorpayPaymentId`, `payment.razorpayOrderId`; `invoiceNumber` (money module). Items: `product` and `variantId` into `metadata`, `name` to `title`, `price` to `unitPrice`, `mrp`, `quantity`, `image`, `taxRate` x100, `taxType`, `taxAmount`. Set `paidEffectsApplied = true` on paid orders so stock is not taken again. Quirks: `payment.method: 'cod'` orders exist with status paid from the moment they were created (map `paymentMethod = COD`); item `price` is in INR while item `taxAmount` and the order totals are in the paid currency; `razorpayOrderId` is null on COD orders, but the column here is required and unique (use `legacy_<_id>`); a status `pending` may exist (written by the admin, outside the enum): map to `PLACED` and report; pending orders older than two days are deleted hourly by the website, so few unpaid ones remain.

**`downloads` to `digital_product_entitlements`**: `user`, `order`, `product`, `variantId` (new row id), `productName` / `variantName` to `assetName`, `file` (public URL) to `assetKey` as the object key, `totalDownloads` to `downloadCount`, `createdAt` to `grantedAt`; `source = PURCHASE`, `status = ACTIVE`. The website's unique index is (user, order, product), so an order with two variants of one product kept one download: grant the missing ones from the order lines.

**`courses` to `course_links`**: every field by name; `price`, `originalPrice` x100; `thumbnail` / `thumbnailKey`; `level`, `status` as they are; `clickCount` (always 0 there).

**`users` (customers) to `users` + `customer_profiles`**: owned by the accounts work; this module only needs `firstName`, `lastName`, `username`, `dob`, `gender`, `birthPlace`, `birthTime`, `bio`, `profilePhoto` in `customer_profiles`, and `status: BLOCKED` written as a `USER_SUSPENDED` audit entry for the user (that is what "blocked" is here).

## Open questions

1. Shipping: Rs 500 flat (website) or Rs 99 with free shipping from Rs 2,000 (app)? One must be chosen for both.
2. Cancelling a paid order gives no refund: keep it open to customers, or staff only?
3. Customer deletion with paid orders: anonymise (built) or remove the row and make orders ownerless?
4. Courses: do website and app show the same thing (links), or stay different?
5. Should coupons also work for reports, consultations and in-app courses? (Resolved: YES for products, reports, and consultations via CouponScope, owner decision 2026-11-24).
6. Removing a variant on product update (built: allowed) versus the website (never removed).
7. The website's `GET /cart/admin/all`: wanted?
8. Unit of the website's product `weight`.
