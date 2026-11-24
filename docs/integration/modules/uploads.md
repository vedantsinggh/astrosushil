# Uploads and object storage (website integration)

Owner decision: uploaded files live in the website's existing **AWS S3** bucket, not Cloudflare R2.
This module gives the backend one storage layer for that bucket and one admin upload endpoint that
every other module (banners, blogs, products, media, testimonials, SEO, digital products) builds on.

Website code this replaces: `src/service/UploadAws.js`, `src/service/s3.js`,
`src/middlewares/multer.js`, `src/utils/createWatermarkedImage.js`.

## 1. Code map

| File | What it is |
| :--- | :--- |
| `apps/api/src/services/storage.service.ts` | `storageService`: the one storage abstraction (upload, public URL, signed URL, delete, exists, metadata, download, list). Every pre-existing export still works. |
| `apps/api/src/services/storage/sigv4.ts` | AWS Signature V4 (header signing and presigned URLs), pure functions. |
| `apps/api/src/services/storage/s3-client.ts` | Small S3 REST client (AWS S3 and R2) over `fetch`; the HTTP layer is injectable for tests. |
| `apps/api/src/services/storage/storage-config.ts` | Chooses the store from the environment. |
| `apps/api/src/services/storage/upload-policy.ts` | Purposes, allowed types, size caps, content sniffing, key generation and key classification. |
| `apps/api/src/services/storage/storage-refs.ts` | **Helpers for other modules**: `validateUploadedRef`, `deleteUploadedObject`, `getUploadedFileSignedUrl`, `resolveManagedKey`. |
| `apps/api/src/modules/uploads/` | Route, schema and `uploadsService.storeUpload`. |
| `apps/api/src/modules/uploads/image-processor.ts` | WebP conversion and the product-preview watermark, with `sharp`. Registered at API start-up (`registerImageProcessor()` in `apps/api/src/server.ts`). See §8a. |

No Prisma model was added: an upload is only an object in the bucket until a module stores its
`{ url, key }` on one of its own records.

## 2. Visibility

| | `public` | `private` |
| :--- | :--- | :--- |
| Used for | banners, blog / product / category / course / testimonial / SEO / media images, celebrity videos | the sold file of a digital product, report PDFs, invoices |
| Key prefix | `assets/` | `private/` (uploads), `reports/` (report PDFs, unchanged) |
| S3 ACL sent | `public-read` (`AWS_S3_PUBLIC_ACL`, see §7) | none: the object is private |
| How it is read | plain URL `https://<bucket>.s3.<region>.amazonaws.com/<key>` (same shape the website stored) | only a signed URL valid for minutes, issued after the caller checked ownership / purchase |
| Upload response `url` | the public URL | `null` |

The website sent `ACL: public-read` with every upload, including paid files and report PDFs
(security findings 4 and 10). Nothing private is ever given a public ACL or a public URL here.

## 3. Endpoints

| Method | Path | Auth | Permission | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/admin/uploads?purpose=<purpose>[&watermark=true]` | admin JWT (`SUPER_ADMIN`, `ADMIN`, `SUPPORT` tier) | `uploads:create` (`checkPermission`, role read from the database) | `multipart/form-data`, exactly one file in a field named `file`. Audit entry `UPLOAD_FILE` via `adminService.logAction`. |
| GET | `/api/v1/uploads/local/*` | none | none | Development only: serves `assets/` files kept on local disk. Returns 404 in production and whenever a remote store is active. |

Response `201`:

```json
{
  "url": "https://<bucket>.s3.<region>.amazonaws.com/assets/banner/2026/11/3f6c…e1.webp",
  "key": "assets/banner/2026/11/3f6c…e1.webp",
  "contentType": "image/webp",
  "size": 48213,
  "visibility": "public",
  "purpose": "banner"
}
```

For a private purpose `url` is `null`. A public image is always stored as WebP, whatever was
uploaded, so `contentType`, the key's extension and `size` describe the converted file.

Errors (standard shape `{ "error": { "code", "message", "requestId" } }`):

| Status | Code | When |
| :--- | :--- | :--- |
| 400 | `VALIDATION_ERROR` | missing / unknown `purpose`, body not multipart, no `file` field, empty file, more than one file, watermark asked for something that is not a product preview image |
| 401 | `AUTHENTICATION_ERROR` | no or invalid token |
| 403 | `AUTHORIZATION_ERROR` | not an admin, or the role lacks `uploads:create` |
| 413 | `FILE_TOO_LARGE` | larger than the cap of the purpose |
| 413 | `IMAGE_DIMENSIONS_TOO_LARGE` | a public image of more than 50 megapixels, or more than 16383 pixels wide or high (§8a) |
| 415 | `UNSUPPORTED_FILE_TYPE` | the file's bytes are not one of the types allowed for the purpose, or a public image that cannot be decoded (truncated, or only an image signature in front of other content) |
| 501 | `IMAGE_PROCESSING_UNAVAILABLE` | `watermark=true` on a server where the image library could not be loaded, or where the watermark text drew nothing because no font is installed (§8a). Not expected in a normal deployment. |

### Purposes

| `purpose` | Visibility | Allowed content | Cap |
| :--- | :--- | :--- | :--- |
| `banner`, `blog`, `product`, `category`, `course`, `consultation`, `testimonial`, `seo`, `media`, `report-cover`, `profile`, `page` | public | JPEG, PNG, WebP, GIF | 10 MB |
| `media-video` | public | MP4 | 50 MB |
| `digital-product` | private | PDF, ZIP, DOC, DOCX, XLS, XLSX, JPEG, PNG, WebP, GIF (what the website admin form accepts) | 50 MB |

A new purpose is one line in `UPLOAD_POLICIES` (`upload-policy.ts`).

### Checks made on every upload

- The content type is decided from the file's leading bytes. The MIME type and filename sent by the
  browser are only used to tell DOCX / XLSX / ZIP apart (all ZIP containers) and DOC / XLS apart
  (both OLE). SVG, HTML and anything unrecognised are refused.
- The object key is generated: `<assets|private>/<purpose>/<yyyy>/<mm>/<uuid>.<ext>`, with the
  extension taken from the detected type. The client filename is never used, stored or logged.
- Size is capped twice: by the multipart parser while reading (the request is cut off) and again in
  the service.
- One file per request (`files: 1`); the plugin's absolute ceiling is 50 MB.
- Public objects get `Cache-Control: public, max-age=31536000, immutable`, as on the website.

## 4. The two-step contract for other modules

Modules do **not** handle multipart. The admin panel:

1. `POST /api/v1/admin/uploads?purpose=banner` with the file, and receives `{ url, key, … }`.
2. Sends that `{ url, key }` (for several images, an array of pairs) inside the JSON body of the
   module's own create / update endpoint.

The module then does three things, all through `apps/api/src/services/storage/storage-refs.ts`:

```ts
import { validateUploadedRef, deleteUploadedObject, getUploadedFileSignedUrl } from '../../services/storage/storage-refs';

// On create / update: check the pair before saving it. Throws ValidationError (400) otherwise.
const image = validateUploadedRef(body.image, { visibility: 'public', purposes: ['banner'], field: 'image' });
// -> { key, url }   store both; `url` is what the site renders.

const sold = validateUploadedRef(body.file, { visibility: 'private', purposes: ['digital-product'], allowLegacy: true, field: 'file' });
// -> { key, url: null }   store the key only. Never return it to customers.

// When the record is deleted, or the file is replaced by another one (after the DB write succeeded):
await deleteUploadedObject(previous.imageKey ?? previous.imageUrl);   // never throws; returns boolean

// When a customer who owns / bought the file asks for it:
const link = await getUploadedFileSignedUrl(variant.fileKey, 300, { downloadFileName: 'guide.pdf' });
```

Rules these helpers enforce:

- `validateUploadedRef` accepts `{ key }`, `{ url }` or both (they must agree). The reference must
  resolve to a key in **our** bucket; a URL of any other host is refused.
- The key must be under an upload prefix. A key such as `reports/<userId>/<reportId>.pdf` is always
  refused, so a record can never be pointed at (and later delete or expose) a customer's report.
- `visibility: 'public'` accepts keys under `assets/`. Files the website uploaded
  (`assets/<timestamp>-<name>.<ext>`, `assets/<staffId>/…`) are accepted, so migrated records can
  be saved again unchanged.
- `visibility: 'private'` accepts keys under `private/`. Pass `allowLegacy: true` to also accept a
  website-era file (those sit under `assets/`, paid files included).
- `purposes` (optional) must contain the purpose encoded in a key generated by this backend;
  website-era keys carry no purpose and pass.
- `deleteUploadedObject` and `getUploadedFileSignedUrl` take a key **or** an absolute URL (the
  website stored only the URL for product images and sold files). They refuse anything that is not
  an upload-managed object of our bucket. Signed URLs are capped at one hour; use minutes.
- `validateUploadedRef` does not make a network call. If a module wants to confirm the object
  exists, `storageService.exists(key)` does a HEAD.

Backend code that has its own authenticated upload route (the website lets a **customer** upload a
profile and cover photo) calls `uploadsService.storeUpload({ purpose: 'profile', buffer, declaredMimeType, filename })`
so the same checks apply. That customer route is not part of this module (§10).

## 5. `storageService` additions

All previous methods keep their signatures. New:

- `upload({ …, visibility?: 'public' | 'private', cacheControl? })`; default `private`.
- `getPublicUrl(key)`.
- `resolveKey(urlOrKey)`: key for a bare key or an absolute URL of our bucket, else `null`.
  Recognised hosts: the active store's host, `<bucket>.s3.<region>.amazonaws.com`,
  `<bucket>.s3.amazonaws.com`, `<bucket>.s3-<region>.amazonaws.com`, path-style
  `s3.<region>.amazonaws.com/<bucket>/…`, and the local development route. The bucket name and
  region are enough for this (no credentials), so local development with migrated data works.
- `getSignedDownloadUrl(key, seconds, { downloadFileName? })`.
- `makePrivate(key)`: sets an existing object's ACL to `private` (for the migration, §6).
- `providerName`: `aws`, `r2` or `local`.

Behaviour changes inside existing methods:

- Remote requests now go through one signer. `listKeys` previously signed an empty query string
  while sending `?list-type=2&prefix=…`, which S3 rejects; it now signs the real query and follows
  continuation tokens.
- `cleanupOrphanedObjects` only considers keys shaped `reports/<owner>/<file>`. The website bucket
  has its own files directly under `reports/` (report cover backgrounds hard-coded in
  `src/utils/constants.js`, e.g. `reports/CAREER-REPORT.webp`); the old filter would have deleted them.
- A refused remote delete is logged (it was silently ignored); `console.error` was replaced by `logger`.

## 6. Data migration: file references in website collections

Files stay where they are; only references move. As read from the website controllers (the module
that owns each table has the authoritative field list):

| Website collection | Field(s) | Stored as | Our side |
| :--- | :--- | :--- | :--- |
| Banner | `image`, `imageKey` | URL + key | public; keep both |
| Category | `image.url`, `image.key` | URL + key | public |
| Course | `thumbnail`, `thumbnailKey` | URL + key | public |
| Testimonial | `image`, `imageKey` | URL + key | public |
| Media | `mediaUrl` + `mediaKey`, `thumbnail` + `thumbnailKey` | URL + key | public (`mediaUrl` may be a YouTube link for podcasts: not ours, keep as is, key empty) |
| Blog | `thumbnail.{url,key}`, `images[].{url,key}` | URL + key | public |
| SEO | `image.url`, `image.publicId` | URL + key (`publicId` is the S3 key) | public |
| Product | `images[]`, `thumbnail` | URL only | public; derive the key with `storageService.resolveKey(url)` |
| Product | `variants[].downloadableFile` | URL only | **private**: store the key from `resolveKey(url)`, never the URL |
| Report (catalogue) | `coverImage` | URL | public |
| ReportOrder | `reportUrl` | URL of a public PDF (`assets/<ts>-report-<reportOrderId>.pdf`) | **private**: store the key |
| User | `profilePhoto` + `profilePhotoKey`, `coverPhoto` + `coverPhotoKey` | URL + key | public |

Quirks seen in the website code:

- Keys are `assets/<Date.now()>-<sanitised original name>.<ext>`, or `assets/<staffId>/…` when a
  staff id was passed. Images were converted to WebP, so image keys end in `.webp` whatever was uploaded.
- Product code derives a key from a URL with `url.split(".amazonaws.com/")[1]`; `resolveKey` does
  the same safely and also checks the bucket.
- `user.controler.js` calls `deleteFile` without importing it, so replacing a profile photo throws
  there; old photos may be orphaned in the bucket.
- Hard-coded bucket URLs exist in `src/utils/constants.js` (`reports/*.webp` cover backgrounds).

**Required migration step for private files.** Website-era sold files and report PDFs are still
world-readable objects. Moving the reference to a key does not change that. For every migrated
private reference the migration must call `storageService.makePrivate(key)` (S3 `PutObjectAcl
private`), then old public links stop working and only signed URLs do. Until that runs, finding 10
is still open for the old objects.

## 7. Environment variables (names only)

| Name | Meaning |
| :--- | :--- |
| `STORAGE_PROVIDER` | `aws`, `r2` or `local`. Unset: R2 if its credentials are set (existing deployments unchanged), else AWS S3 if all four AWS values are set, else local disk. Production refuses local disk. |
| `AWS_STORAGE_BUCKET_NAME` | website bucket name (same name as the website backend's variable) |
| `AWS_S3_REGION_NAME` | bucket region |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | credentials. Needs `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:PutObjectAcl`. |
| `AWS_S3_PUBLIC_ACL` | ACL for public uploads, default `public-read`; `none` when the bucket has ACLs disabled and a bucket policy makes `assets/*` public |
| `STORAGE_LOCAL_DIR`, `PUBLIC_API_URL`, `R2_*` | unchanged |

All four `AWS_*` values are required before S3 is used; a developer's generic AWS credentials alone
never switch storage.

## 8. Differences from the website, and why

| Website | Here | Why |
| :--- | :--- | :--- |
| Every object `public-read`, paid files and report PDFs included | private objects carry no ACL and are read through signed URLs only | security findings 4 and 10 |
| Type check on the browser's MIME type; `application/octet-stream` and any `*.zip` name accepted | type decided from the file bytes | the browser's claim is not evidence |
| Key built from the client filename | generated key | never trust the client filename |
| 50 MB for everything | 10 MB images, 50 MB video and sold files | strict limits were asked for; the image cap is a judgement (§10) |
| Each module's route takes multipart | one upload endpoint, modules take `{ url, key }` | one place for limits, checks and audit |
| No audit of uploads | `UPLOAD_FILE` audit entry | admin directive |
| Images converted to WebP (quality 80) with `sharp` | Same, for every public image purpose. Files of a private purpose (the sold file) are stored byte for byte | Owner approved `sharp` on 2026-11-24 |
| An animated GIF becomes a still WebP of its first frame (`sharp(buffer)` without `animated: true`) | Same | Website behaviour kept as it is |
| The EXIF orientation tag is dropped without turning the pixels, so a phone photo can come out sideways | The orientation is applied to the pixels, then all metadata is dropped | The website's result is a bug |
| Metadata is dropped as a side effect of `sharp` defaults | Same, and tested: no EXIF (GPS position, camera, date), XMP, IPTC or ICC profile in the stored file | Photos must carry no location data |
| No limit on pixel dimensions beyond the library default (268 megapixels) | 50 megapixels and 16383 pixels per side, checked from the file header before decoding | Decompression bombs: a file of a few kilobytes can claim gigabytes of pixels |
| Digital-product preview images and thumbnail get a rotated "Astro Sushil" text watermark (`sharp`), the sold file never | Same watermark when the upload is sent with `watermark=true` (accepted only for `purpose=product`); the sold file (`purpose=digital-product`) can never be watermarked or converted | The website decides from the product type inside the product controller; here the upload is a separate request, so the admin panel sends the flag |
| An image with no usable font on the server is uploaded with an invisible watermark | Refused with `501` | Failing loudly is safer than silently publishing an unwatermarked preview |
| Video accepted on any upload field | only `purpose=media-video` | the website only uses it for celebrity media |

## 8a. Image processing

`uploadsService.setImageProcessor({ toWebp, watermark })` (`uploads.service.ts`) is the seam;
`image-processor.ts` is the implementation and `registerImageProcessor()` installs it when the API
starts. The worker process does not handle uploads and does not register it.

Order for a public image: content type decided from the bytes (§3) → watermark if asked →
WebP → stored. Nothing else is processed: a private file, a video and any non-image go to storage
unchanged.

| Step | What happens |
| :--- | :--- |
| Accepted input | Only JPEG, PNG, WebP and GIF are decoded. The processor checks the format the library reports as well, so SVG, TIFF, HEIF or PDF are refused even if they reached it. SVG is already refused in §3. |
| Dimension limit | `MAX_IMAGE_PIXELS` = 50,000,000 (a 50 MP phone photo is 8160 × 6120) and `MAX_IMAGE_SIDE` = 16383 (the most the WebP format can store). Read from the header; a larger image is refused with `413 IMAGE_DIMENSIONS_TOO_LARGE`, not scaled down. The library's own pixel limit is set to the same number as a second barrier. |
| Orientation | The EXIF orientation is applied to the pixels. |
| Metadata | None is written: EXIF, XMP, IPTC and ICC are all dropped. |
| WebP | Quality 80, as on the website. Only the first frame of an animated GIF or animated WebP is kept, as on the website. |
| Watermark | The website's SVG overlay: the text `Astro Sushil` (`WATERMARK_TEXT`), white (`rgb(255, 255, 255)`), bold, font size `floor(width / 12)` pixels, anchored at the centre, rotated −30° around the centre (it rises from lower left to upper right), composited over the full image and encoded as JPEG quality 90, then converted to WebP by the step above. As on the website, JPEG has no transparency, so a transparent preview is flattened onto black. |
| Watermark font | The website's SVG names no font family, and neither does this one: the text is drawn in the server's default font (fontconfig). The typeface therefore depends on the fonts installed, exactly as on the website. If the text draws no pixel at all (no font installed), the upload is refused with `501`. |
| Library missing | If `sharp`'s native library cannot be loaded at start-up, the API still starts, logs an error, stores images unconverted and answers `501` to `watermark=true`. |

In the two-step flow the admin panel must send `watermark=true` when it uploads a preview image or
thumbnail of a **digital** product; the website decided this server-side from the product type
(`isDigital` in `product.controller.js`, on create and on update, for `images[]` and `thumbnail`).
Nothing on the server can check that the flag was sent, because the upload does not know which
product it is for (§10, question 9).

Tests: `apps/api/tests/unit/uploads-image.test.ts` (generated images, real `sharp`, local disk).

## 9. Dependency added

`@fastify/multipart` `^8.3.1` (MIT), the Fastify 4 line of the official multipart plugin, in
`apps/api/package.json` (the root `package-lock.json` changed with it). Registered in
`apps/api/src/app.ts` with `files: 1` and a 50 MB ceiling. No AWS SDK was added.

`sharp` `^0.35.5` (Apache-2.0), approved by the owner on 2026-11-24, in `apps/api/package.json`.
It installs a prebuilt `libvips` for the platform as optional `@img/*` packages (LGPL-3.0-or-later,
dynamically linked), so no compiler or system library is needed; it needs Node 20.9 or later. The
lock file lists the binaries for every platform, including Alpine (musl) for the Docker image.

## 10. Open questions and things not done

1. **Image library.** Decided 2026-11-24: `sharp` approved and built (§8a).
2. **Image size cap.** 10 MB per image is a judgement; the website allowed 50 MB.
3. **Bucket settings.** Does the bucket still allow ACLs (the website relies on `public-read`)? If
   ACLs are disabled, set `AWS_S3_PUBLIC_ACL=none` and add a bucket policy for `assets/*`. New
   private objects need no bucket change as long as the bucket has no policy making everything public.
4. **Old public objects.** The `makePrivate` step of §6 must be part of the data migration.
5. **Customer profile / cover photo upload** is a customer route in the users module; it should
   call `uploadsService.storeUpload` with `purpose: 'profile'`. Not built here.
6. **Orphans.** A file uploaded but never attached to a record stays in the bucket. There is no
   upload table to find them; a periodic sweep would need each module to list its referenced keys.
7. **Local private downloads** use the existing `/api/v1/reports/download-secure` route, which
   always answers `Content-Type: application/pdf` and `inline`. Harmless for PDFs; for other file
   types in development that route (owned by the reports module) should use `storageService.getMetadata`.
8. **Both stores at once.** One process talks to one store. If report PDFs already exist in R2 on
   some deployment, switching to S3 needs those objects copied; no such production data exists today.
9. **Who sends `watermark=true`.** The admin product form must send it for the preview images and
   thumbnail of a digital product. If it forgets, the preview is published without a watermark and
   the server cannot tell. The products module could close this by refusing to attach, to a digital
   product, an image that was not uploaded with the flag (the upload would have to record it, for
   example in the object key). Not built.
10. **Watermark typeface.** It is the server's default font, as on the website. If the look must be
    identical on every machine, a font file has to be chosen and shipped; the website's code names none.
11. **Oversized photos are refused, not scaled down.** An admin who uploads a photo above 50
    megapixels gets an error and must resize it. Scaling down on the server is possible if preferred.
