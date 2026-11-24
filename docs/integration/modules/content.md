# Content module (website CMS)

Banners, blogs, FAQs, testimonials, media (podcast / celebrity / wishes), contact inquiries, SEO meta per page and site settings (including the legal policy pages), moved from the website backend (`src/modules/Banner, blog, FAQ, Testimonial, Media, Contact, seo, Setting`).

**Status:** backend built and unit-tested. No migration SQL, no admin UI, no data migration script yet.

## 1. Where things are

One module folder, `apps/api/src/modules/content/` (the repo keeps one folder per domain with several service files, as `products` and `admin` do).

| File | Contents |
|---|---|
| `content.routes.ts` | All routes. Registered once in `routes/index.ts` (`v1.register(contentRoutes)`). |
| `content.schemas.ts` | zod validation, enums, the settings shape and defaults. |
| `content.sanitizer.ts` | HTML allow-list sanitiser, safe-link checks, YouTube link parsing, `slugify`. |
| `content.cache.ts` | Redis-backed read cache and the per-IP counter (in-process fallback without Redis). |
| `content.ports.ts` | Uploaded-file helpers (calls the uploads module) and the contact notification interface. |
| `content.audit.ts` | `auditContentAction` → `adminService.logAction`. |
| `banners|blogs|faqs|testimonials|media|contacts|seo|settings.service.ts` | Business logic per feature. |
| `apps/api/tests/unit/content*.test.ts`, `content-test-helpers.ts` | Tests and their in-memory fakes. |

Responses use the products module's envelope: `{ statusCode, success, message, data }`. Errors use the standard `{ error: { code, message, details?, requestId } }`. Record ids are UUIDs in a field named `id` (the website used `_id`).

## 2. Endpoints

All paths are under `/api/v1`.

### Public (no login)

The paths are the website's own.

| Method | Path | Notes |
|---|---|---|
| GET | `/banners/frontend?page=home\|about\|contact\|services` | `home` → `{ sliders: [...] }` (active `Slider` banners of `Homepage`, by `order`). Other pages → `{ banner }` (the active `Page` banner, or `null`). Cached 24 h. |
| GET | `/blogs?page=&limit=&search=&category=&tag=&isFeatured=` | **Published posts only.** `{ blogs, total }`, newest first. `limit` default 10, max 1000 (the website's list page asks for 1000). |
| GET | `/blogs/slug/:slug` | Published only, counts one view. |
| GET | `/blogs/:id` | Published only, counts one view. |
| GET | `/faqs?page=` | Active FAQs by `order`, then newest. |
| GET | `/testimonial?page=&serviceName=&rating=&limit=` | Active only. `rating` is a minimum. `{ items, total }`. `limit` default 10, max 100. |
| GET | `/testimonial/:id` | Active only. |
| GET | `/media?section=podcast\|celebrity\|wishes` | Active items by `order`, then newest. |
| GET | `/media/:id` | Active only. |
| POST | `/inquiry` | Contact form. 5 submissions per client IP per 15 minutes, then 429. |
| GET | `/seo/:name` | Meta of one page; `name` is matched in lower case. Cached 10 minutes. |
| GET | `/settings` | **Allow-listed public fields only** (section 5). |

### Admin

Every route: staff JWT (`fastify.authenticate` + `authorize(['SUPER_ADMIN','ADMIN','SUPPORT'])`), then `checkPermission(...)` from `modules/admin/rbac/check-permission.ts` (role read from the database). Every write produces an audit entry.

| Method | Path | Permission | Audit action |
|---|---|---|---|
| GET | `/admin/banners?page=&type=&isActive=`, `/admin/banners/:id` | `banners:read` | |
| POST | `/admin/banners` | `banners:create` | `BANNER_CREATE` |
| PUT | `/admin/banners/:id` | `banners:update` | `BANNER_UPDATE` |
| PATCH | `/admin/banners/:id/toggle` | `banners:update` | `BANNER_TOGGLE` |
| DELETE | `/admin/banners/:id` | `banners:delete` | `BANNER_DELETE` |
| GET | `/admin/blogs?page=&limit=&search=&status=&category=&tag=&isFeatured=`, `/admin/blogs/:id` | `blogs:read` | |
| POST | `/admin/blogs` | `blogs:create` | `BLOG_CREATE` |
| PUT | `/admin/blogs/:id` | `blogs:update` | `BLOG_UPDATE` |
| DELETE | `/admin/blogs/:id` | `blogs:delete` | `BLOG_DELETE` |
| GET | `/admin/faqs?page=&isActive=`, `/admin/faqs/:id` | `faqs:read` | |
| POST / PUT / DELETE | `/admin/faqs`, `/admin/faqs/:id` | `faqs:create` / `faqs:update` / `faqs:delete` | `FAQ_CREATE` / `FAQ_UPDATE` / `FAQ_DELETE` |
| GET | `/admin/testimonials?page=&serviceName=&rating=&type=&isActive=&limit=&offset=`, `/admin/testimonials/:id` | `testimonials:read` | |
| POST / PUT / DELETE | `/admin/testimonials`, `/admin/testimonials/:id` | `testimonials:create` / `:update` / `:delete` | `TESTIMONIAL_CREATE` / `_UPDATE` / `_DELETE` |
| PATCH | `/admin/testimonials/:id/toggle` | `testimonials:update` | `TESTIMONIAL_TOGGLE` |
| GET | `/admin/media?section=&isActive=`, `/admin/media/:id` | `media:read` | |
| POST / PUT / DELETE | `/admin/media`, `/admin/media/:id` | `media:create` / `:update` / `:delete` | `MEDIA_CREATE` / `_UPDATE` / `_DELETE` |
| PATCH | `/admin/media/:id/toggle` | `media:update` | `MEDIA_TOGGLE` |
| GET | `/admin/inquiries?page=&limit=&search=&fromDate=&toDate=`, `/admin/inquiries/:id` | `contacts:read` | |
| PATCH | `/admin/inquiries/:id/remarks` | `contacts:update` | `CONTACT_INQUIRY_REMARKS_UPDATE` |
| DELETE | `/admin/inquiries/:id` | `contacts:delete` | `CONTACT_INQUIRY_DELETE` |
| GET | `/admin/seo`, `/admin/seo/:id` | `seo:read` | |
| POST / PUT / DELETE | `/admin/seo`, `/admin/seo/:id` | `seo:create` / `:update` / `:delete` | `SEO_CREATE` / `_UPDATE` / `_DELETE` |
| GET | `/admin/settings` | `settings:read` | |
| PUT | `/admin/settings` | `settings:update` | `SITE_SETTINGS_UPDATE` |

Deletes are hard deletes, as on the website. Audit details name the record and the changed field names; they never contain an inquiry's personal data, an article body or a settings value.

### Permission keys

No new keys. All are already in `admin.permissions.ts`.

| Ours | Website key |
|---|---|
| `banners:read/create/update/delete` | `banners.view/create/edit/delete` |
| `blogs:read/create/update/delete` | `blogs.create/edit/delete` (the website had no `blogs.view` check: its list and detail were public) |
| `faqs:read/create/update/delete` | `faqs.view/create/edit/delete` |
| `testimonials:read/create/update/delete` | `testimonials.create/edit/delete` (list and detail were public) |
| `media:read/create/update/delete` | `media.view/create/edit/delete` |
| `contacts:read/update/delete` | `contacts.view/edit/delete` |
| `seo:read/create/update/delete` | `seo.view/create/edit/delete` |
| `settings:read/update` | `settings.edit` (reading was public) |

### Request bodies (admin)

JSON only. Files are uploaded first with `POST /admin/uploads?purpose=…` and sent as `{ "url", "key" }` (see `uploads.md`). A file slot accepts: omitted = unchanged, `null` = remove, object = set or replace. Every reference is checked with `validateUploadedRef` (public object of our bucket, right purpose); replaced and removed files are deleted with `deleteUploadedObject` after the database write.

| Record | Fields |
|---|---|
| Banner | `type` (`Slider`\|`Page`, required), `page` (`Homepage`\|`About`\|`Contact`\|`Services`, default `Homepage`), `title`, `subtitle`, `description`, `buttons` `[{ text, link }]`, `order`, `isActive`, `image` (purpose `banner`) |
| Blog | `title` (≥3), `slug` (optional), `shortDescription` (≥10), `content` (HTML, ≥20), `category`, `tags[]`, `author { name, avatar }`, `seo { metaTitle, metaDescription, keywords[] }`, `status` (`draft`\|`published`), `isFeatured`, `publishedAt`, `thumbnail`, `images[]` (max 10) (purpose `blog`) |
| FAQ | `question` (≥5), `answer` (≥5), `page`, `isActive`, `order` |
| Testimonial | `name`, `designation`, `message`, `rating` (1 to 5), `serviceName`, `tagline`, `type` (`text`\|`video`), `videoUrl`, `page` (default `home`), `order`, `isActive`, `image` (purpose `testimonial`) |
| Media | `title` (≥2), `description`, `section`, `mediaUrl` (podcast: YouTube link), `media` (celebrity: uploaded video, purpose `media-video`), `thumbnail` (purpose `media`), `tag`, `personName`, `background`, `isActive`, `order` |
| Inquiry remarks | `remarks` (≤2000) |
| SEO | `name`, `metaTitle`, `metaDescription`, `image` (purpose `seo`) |
| Settings | any subset of the sections in section 5 |

Media rules per section (the website's): **podcast** = video, YouTube link required, no uploaded video, thumbnail optional (defaults to YouTube's thumbnail). **celebrity** = video, uploaded video and thumbnail both required. **wishes** = image, the image goes in `thumbnail`, `personName` required. The rules apply in full on create and when the section changes; an ordinary update checks only the fields sent.

Admin responses return files as `{ url, key }`. Public responses keep the website's shapes without keys: `banner.image`, `testimonial.image`, `media.thumbnail` are URL strings; `blog.thumbnail`, `blog.images[]`, `blog.author.avatar`, `seo.image` are `{ url }`.

## 3. Models

Block `// ===== content (website integration) =====` at the end of `schema.prisma`. Every table has `legacyId String? @unique` (the MongoDB `_id`), `createdAt`, `updatedAt`.

| Model | Table | Notes |
|---|---|---|
| `Banner` | `banners` | `imageUrl`, `imageKey`, `buttons` JSON |
| `BlogPost` | `blog_posts` | `slug` unique, `content` sanitised HTML, `images` JSON `[{ url, key }]` |
| `Faq` | `faqs` | `createdById`, `updatedById` (our staff user ids) |
| `Testimonial` | `testimonials` | |
| `MediaItem` | `media_items` | `mediaUrl`/`mediaKey`, `thumbnailUrl`/`thumbnailKey` |
| `ContactInquiry` | `contact_inquiries` | |
| `SeoPage` | `seo_pages` | `name` unique, lower case |
| `SiteSetting` | `site_settings` | one row, id `site`, sections in `data` JSON |

Closed value sets (banner type and page, blog status, testimonial type, media section and type) are string columns holding the website's own spellings, enforced by zod. This keeps the data migration a straight copy and avoids enum name clashes between agents' blocks. The lead may turn them into Prisma enums.

## 4. Sanitising, caching, rate limit

**HTML.** `BlogPost.content` and the five `legal.*` settings are rendered as raw HTML on the site. They are sanitised on write with **`sanitize-html` 2.18.2 (MIT)** and an allow-list: headings, paragraphs, lists, emphasis, blockquote, code, links, images, tables; attributes `href/title/target/rel`, `src/alt/title/width/height`, `colspan/rowspan`; styles `text-align` (and `width`/`min-width` on table cells). No `script`, `style`, `iframe`, `object`, `embed`, `form`, SVG; no `on*` attributes; link schemes `http`, `https`, `mailto`, `tel` or relative; `target` always becomes `_blank` with `rel="noopener noreferrer"`. A blog whose content is empty after sanitising is rejected.

The website admin's editor embeds pasted images as base64 `data:` URIs, so existing articles contain them. `data:` is accepted for `<img src>` only and only for PNG, JPEG, GIF and WebP. Blog and settings writes accept bodies up to 8 MB for that reason. The new admin should upload images and insert their URL instead.

**Plain text.** Every other text field is plain text and must be rendered as text. It is stored as entered (trimmed). The website renders FAQ questions and answers into a JSON-LD `<script>` block with `JSON.stringify`; the rebuilt frontend must escape `<` there.

**Links.** Button links, bar links, social links, video URLs and file URLs must be `http(s)` URLs (button and bar links may also be a path starting with `/`). `javascript:`, `data:` and `//host` are rejected. The website accepted any string that parses as a URL, which includes `javascript:`.

**Cache.** `ContentCache` stores JSON in Redis through the existing `nativeRedisClient`. Banners: one key per page, 24 h, all four page keys deleted on every banner write. SEO: one key per page name, 10 minutes, deleted on every SEO write (old and new name on a rename). Only existing pages are cached, so arbitrary `?page=` or `/seo/<anything>` values cannot fill the cache. Redis is the only store when configured, so an admin write invalidates every API process; the website's SEO cache was per process. Without Redis the cache is in process memory for at most 60 seconds. A Redis failure is a cache miss.

**Rate limit on `/inquiry`.** A fixed-window counter per client IP (hashed in the key), in Redis, falling back to process memory. It is implemented in the service because the app-wide `@fastify/rate-limit` registration does not reach the routes (see section 8).

## 5. Site settings

One row. `PUT /admin/settings` takes any subset of sections and fields and merges field by field; arrays are replaced. The update schema is strict: an unknown section or field is a 400. Reads rebuild the document from the known fields only, so a key that this module does not define can never come out of either endpoint, and the next save removes it from the row. Two admins saving at once: the second gets a 409 instead of overwriting.

### Dropped (credentials and their configuration: they stay in the server environment)

| Website field | |
|---|---|
| `payment.razorpayKey`, `payment.razorpaySecret` | Razorpay credentials |
| `payment.stripeKey`, `payment.stripeSecret` | Stripe credentials (Stripe is not used) |
| `smtp.host`, `smtp.port`, `smtp.secure`, `smtp.username`, `smtp.password`, `smtp.fromEmail` | mail server |
| `sms.provider`, `sms.apiKey`, `sms.senderId` | SMS provider |
| `updatedBy` | replaced by the `updatedById` column (our staff id) |

If any of the secret fields hold a value in the live database, that secret has been publicly readable and must be rotated (security finding 1). The data migration must not copy them and should report whether they were non-empty.

### Kept

"Public" = returned by `GET /settings`. "Decorative" = the website backend never reads the field (it has no code that reads the settings document outside the settings module); changing it changes no behaviour. Decorative fields are kept so nothing is lost.

| Section | Fields | Public | Status |
|---|---|---|---|
| `branding` | `siteName`, `logoUrl`, `faviconUrl` | yes | decorative: the website frontend does not read them (its logo and name are built in) |
| `branding` | `logoKey`, `faviconKey` | no | new: storage keys, so a replaced logo is deleted |
| `contact` | `email`, `phone`, `whatsapp`, `address` | yes | used (contact page, footer) |
| `socialLinks` | `facebook`, `instagram`, `twitter`, `youtube`, `linkedin` | yes | decorative: not read by the website frontend |
| `business` | `companyName` | yes | decorative |
| `business` | `gstNumber`, `panNumber` | no | decorative on the website (invoices do not read them) |
| `payment` | `currency` | yes | decorative |
| `payment` | `codEnabled` | yes | read by the website checkout page to show a COD option |
| `payment` | `taxPercent` | no | decorative |
| `shipping` | `freeShippingThresholdPaise`, `baseDeliveryChargePaise`, `supportedAreas` | yes | decorative: only displayed on the shipping policy page; no charge is calculated from them |
| `shipping` | `deliveryChargePerKmPaise`, `maxCodLimitPaise` | no | decorative |
| `product` | `lowStockWarning`, `maxQuantityInCart` | no | decorative |
| `offers` | `referralRewardPercent`, `enableCoupons`, `flashSaleEnabled` | no | decorative |
| `order` | `returnPolicyDays` | yes | decorative: displayed on the shipping policy page |
| `order` | `autoCancelUnpaidMinutes`, `maxOrderValuePaise` | no | decorative |
| `communication` | `enableOrderEmails`, `enableOrderSMS`, `enablePushNotifications` | no | decorative |
| `otp` | `expiryMinutes`, `resendTimeoutSec` | no | decorative |
| `system` | `maintenanceMode` | yes | decorative (our API's switch is the `MAINTENANCE_MODE` env variable) |
| `topBar`, `highlightsBar` | `enabled`, `text`, `bgColor`, `textColor`, `linkEnabled`, `linkUrl` | yes | used (navbar) |
| `legal` | `privacyPolicy`, `termsConditions`, `cancellationRefundPolicy`, `shippingDeliveryPolicy` | yes | used, rendered as HTML |
| `legal` | `returnPolicyText` | yes | stored, not rendered by the website |

Money fields are integer paise and renamed with a `Paise` suffix (`freeShippingThreshold` → `freeShippingThresholdPaise`, `baseDeliveryCharge`, `deliveryChargePerKM` → `deliveryChargePerKmPaise`, `maxCODLimit` → `maxCodLimitPaise`, `maxOrderValue` → `maxOrderValuePaise`).

Defaults for an empty database are the website's, except `branding.siteName` ("Astro Sushil" instead of "My Ecommerce Store") and `topBar` (off and empty instead of on with a dated September 2026 event line).

## 6. Data migration mapping

Common: `_id` → `legacyId`; `createdAt`, `updatedAt` copied; `__v` dropped.

**`banners` → `banners`.** `title`, `subtitle`, `description`, `type`, `page`, `order`, `isActive` as is. `buttons` → JSON (drop each button's `_id`). `image` → `imageUrl`. Quirk: the Mongoose schema has no `imageKey` field, so the key was never saved (and the website never deleted a banner image). Derive `imageKey` with `storageService.resolveKey(image)`. Report rows whose `type` or `page` is outside the enums, and buttons whose `link` is not an `http(s)` URL.

**`blogs` → `blog_posts`.** `title`, `slug`, `shortDescription`, `category`, `tags`, `status`, `isFeatured`, `views`, `publishedAt` as is. `content` → pass through `sanitizeRichText` and report every post whose content changed. `author.name` → `authorName`; `author.avatar.{url,key}` → `authorAvatarUrl/Key` (never set by the website UI). `thumbnail.{url,key}` → `thumbnailUrl/Key`. `images[]` → JSON `[{ url, key }]`. `seo.metaTitle/metaDescription/keywords` → `seoMetaTitle/seoMetaDescription/seoKeywords`. Quirks: the slug was regenerated from the title on every title change, so a slug may be empty (title with no ASCII letters) or carry stacked suffixes (`a-1-2`); empty slugs need a generated value. A `published` post without `publishedAt` gets `createdAt`.

**`faqs` → `faqs`.** `question`, `answer`, `page`, `isActive`, `order` as is. `createdBy`, `updatedBy` (website Admin ids) → `createdById`, `updatedById` through the staff id map, else null. `seedReportFaqs.js` writes FAQs into the `faqs` array of the **Report** documents, not into this collection: those belong to the reports catalogue migration.

**`testimonials` → `testimonials`.** All scalar fields as is; `image` → `imageUrl`, `imageKey` as is. `rating` is rounded to an integer 1 to 5 (report any that is not).

**`media` → `media_items`.** `title`, `description`, `section`, `type`, `mediaUrl`, `mediaKey`, `tag`, `personName`, `background`, `isActive`, `order` as is; `thumbnail` → `thumbnailUrl`, `thumbnailKey` as is; empty strings for keys → null. Quirks: `section: "testimonial"` is an old value that `migrateTestimonialToPodcast.js` renames; map it to `podcast`. `createdBy`/`updatedBy` were sent but are not in the schema, so they do not exist. For podcasts the website re-derived the YouTube thumbnail on every save, so a `thumbnailKey` may point at an uploaded file that is no longer shown: set the key to null when `thumbnail` is an `img.youtube.com` URL and report the orphaned key. For wishes, a replaced image left its old file behind (the update deleted `mediaKey`, which wishes never set).

**`contacts` → `contact_inquiries`.** `name`, `email`, `phone`, `subject`, `message`, `remarks` as is.

**`seos` → `seo_pages`.** `name`, `metaTitle`, `metaDescription` as is. `image.url` → `imageUrl`. Quirk: the upload result `{ url, key }` was saved into a schema that defines `{ url, publicId }`, so the key was dropped and `image.publicId` is normally empty; use `image.publicId` if present, else `resolveKey(image.url)`. Report duplicate names after lower-casing.

**`settings` → `site_settings`.** One document expected (report if more; take the most recently updated). Copy the kept fields of section 5 into `data`; multiply the five money fields by 100 and round; run the five `legal.*` texts through `sanitizeRichText`; drop the fields listed as dropped. `logoKey`/`faviconKey` from `resolveKey(url)` when the URL is in our bucket.

## 7. Differences from the website, and why

| Area | Website | Ours | Why |
|---|---|---|---|
| Settings read | whole document, public, including secrets | allow-list publicly; secrets not stored at all | security finding 1 |
| Blog list / detail | drafts returned publicly | published only | bug (drafts were public) |
| Blog views | every read counted, including the admin opening the editor; read-modify-save | public reads only, atomic increment | admin views inflated the counter; concurrent reads lost views |
| Blog slug | regenerated from the title on every title change; the slug the admin typed was discarded | the typed slug is used; a title change never changes the slug; generated from the title only when none is given; duplicate typed slug → 409 | the slug is the article's public URL. **Product question below.** |
| Blog admin reads | public endpoints | `/admin/blogs` with `blogs:read` | drafts must not be public |
| Rich text | stored as sent | sanitised on write | stored XSS |
| Testimonials public list | `?isActive=false` showed inactive ones; `total` was the page length | always active only; `total` is the real count | hidden testimonials were readable |
| Testimonials admin list | the admin screen called the public list with its defaults: only active, first 10 | all, with filters and paging | a deactivated testimonial disappeared from the admin and could not be reactivated |
| Media, podcast thumbnail | an uploaded thumbnail was replaced by YouTube's on every later save | kept until replaced or removed | bug |
| Media, YouTube check | prefix regex (`https://youtu.be.evil.example/` passed) | URL parsed, host must be YouTube | |
| Media update | no rules on update | section rules on section change; sent fields checked | |
| Media / testimonial / FAQ public detail | `/media/:id` and `/faqs/:id` did not exist though the frontend calls them; `/testimonial/:id` returned inactive ones | `/media/:id` and `/testimonial/:id`, active only | |
| Contact form limit | none | 5 per IP per 15 minutes | it sends email |
| Contact emails | both emails skipped when the customer gave no email address; a mail failure returned 500 after saving | the notifier is always called (it mails the admin always, the customer when an address exists); failure is logged, the customer gets 200 | the admin never heard of phone-only inquiries |
| Contact submit response | whole document | the submitted fields | |
| Contact date filter | server-local day | IST calendar day | business dates are IST |
| SEO duplicate name | 400 | 409 `CONFLICT` | repo convention |
| SEO / banner images | key not stored, file never deleted | key stored, file deleted on replace and delete | |
| Banner validation | `type` optional in validation but required by the model; `page` any string; button link any URL scheme | `type` required; `page` enum; safe links | |
| Banner public, non-home page | first matching document in natural order | lowest `order`, then newest | deterministic |
| Uploads | multipart on each endpoint | upload first, send `{ url, key }` | one upload endpoint |
| Settings merge | lodash `merge` (arrays merged by index, so a shorter `supportedAreas` kept old entries) | arrays replaced | bug |
| Settings concurrency | last write wins | 409 on a stale save | |
| Money in settings | rupees | paise | repo rule |
| Dashboard | `GET /settings/dashboard` lives in the Setting module | not part of this module | belongs to the admin dashboard work |

## 8. Changes needed outside this module

1. **`apps/api/package.json`**: add `"sanitize-html": "^2.18.2"` to dependencies and `"@types/sanitize-html"` to devDependencies (both MIT), then `npm install`. They are installed in `node_modules` only (`npm install --no-save`), because `package.json` is not this module's file. Without this the API does not build on a clean checkout.
2. **Rate limiting is not active anywhere in the API.** `plugins/rate-limit.ts` exports `registerRateLimit` as a plain async function, so `app.register(registerRateLimit)` encapsulates `@fastify/rate-limit` inside that plugin and no route outside it is limited: neither the global 100/minute nor the per-route `config: { rateLimit }` in `astrology.routes.ts`. Verified: a route with `max: 2` answers 200 four times. Fix: wrap it with `fastify-plugin` as `plugins/jwt.ts` does. This module's contact limit does not depend on it.
3. **DONE** (`modules/content/contact-inquiry.notifier.ts`, registered in `server.ts`; both e-mails go through the messaging outbox, keyed by the inquiry id, so each is sent at most once). Originally: **Email module**: call `setContactInquiryNotifier({ notifyInquiryReceived })` (from `modules/content/content.ports.ts`) at start-up. It receives `{ id, name, email, phone, subject, message, createdAt }` and should send the website's `CONTACT_ADMIN` template to the admin address always and `CONTACT_USER` to `email` when it is not empty. Until then the default logs the inquiry id and sends nothing.
4. **Migration SQL** for the eight tables (the lead generates it).

## 9. Environment variables

None new. Uses the existing Redis settings (`REDIS_URL` or `REDIS_HOST`…, `UPSTASH_REDIS_REST_URL`/`TOKEN`) when present. The admin address for inquiry emails belongs to the email module (the website calls it `ADMIN_EMAIL`).

## 10. Open questions

1. **Blog slug.** Should the slug typed by the admin be honoured and stay fixed (built), or should it follow the title as on the website (which changes the article's URL when the title is edited)?
2. **GST number and PAN on the public site.** They are admin-only now. If the website must show the GSTIN (footer or policy pages), add `business.gstNumber` to the public allow-list.
3. **Decorative settings.** Should shipping charges, tax percent, COD limit, coupons switch, cart quantity limit, auto-cancel minutes and OTP timings start to drive behaviour, or stay display-only? `payment.codEnabled` shows a COD option on the website checkout; whether COD orders are really supported is a commerce question.
4. **Maintenance switch.** Should `system.maintenanceMode` put the website into maintenance (today only the `MAINTENANCE_MODE` env variable does, for the API)?
5. **Contact limit.** 5 per IP per 15 minutes is a chosen value.
6. **Blog images inside the text.** Existing articles carry base64 images. Keep them as they are, or extract them to S3 during the migration?
7. **Admin notification for inquiries without an email address.** Built as "always notify the admin"; the website did not.
