# Historical reports and digital files in the testing deployment

The migrated database refers to files the website stored in its own AWS S3 bucket. The testing
API runs with `NODE_ENV=production` and a dedicated **testing bucket**, so it cannot see the
website bucket. This page explains how those files are copied into the testing bucket and how the
API finds them, without ever reading from an arbitrary URL.

## 1. What the migrated data contains

Counts come from the local migrated database (read-only queries, 2026-11-28).

| Data | Count | Where the file reference is |
| :--- | ---: | :--- |
| Reports with `storageKey` null and `s3Url` set | 273 | `reports.s3Url` |
| of which COMPLETED | 269 | 260 under `https://astrosushil.s3.ap-south-1.amazonaws.com/assets/…`, 9 under `https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/…` |
| of which PROCESSING | 4 | path-style `https://s3.ap-south-1.amazonaws.com/pdfapilambda/…` (not downloadable: not completed) |
| Reports generated locally (`storageKey` `reports/<user>/<id>.pdf`) | 2 | the PDF is on the local developer disk, not in any bucket |
| Digital product entitlements with `assetKey` null | 91 (all of them) | **none**: the file reference was not carried over (see §6) |
| Product variants with `downloadKey` | 0 | |

So there are **two** website buckets (`astrosushil` in `ap-south-1`, `astro-sushil` in
`ap-southeast-2`). Website report keys look like `assets/<timestamp>-report-<reportOrderId>.pdf`
(docs/integration/modules/uploads.md §6).

How the code used the references before this change:

- Customer download `GET /api/v1/reports/:id/pdf` and `/:id/download-file`
  (`reports.service.ts` `generateReportPdfBuffer`) required `storageKey`: migrated reports
  answered `404 REPORT_ASSET_NOT_FOUND`.
- Customer signed link `GET /api/v1/reports/:id/access` (`getReportAccessUrl`, also used for
  `reportUrl` in the website's `GET /api/v1/web/reports/orders` and `/api/v1/report/orders`)
  signed `storageKey`, else a guessed `reports/<user>/<id>.pdf`: a link to a missing object.
- Admin download (`admin.service.ts` `downloadReportPdf`) and the admin pipeline view's
  `pdfAvailable` (`getReportDetails`) required `storageKey`.
- `storageService.resolveKey()` recognised only the bucket named by `AWS_STORAGE_BUCKET_NAME` /
  `AWS_S3_REGION_NAME`. In testing that is the testing bucket, so website URLs did not resolve.
- Digital downloads (`products.service.ts` `getSecureDownloadUrl`) used
  `assetKey || product.imageUrl`: a migrated purchase without `assetKey` was handed a signed link
  to the **product thumbnail** instead of the file bought.

## 2. Resolution strategy

1. **Copy, do not proxy.** The objects are copied from the website bucket into the testing bucket
   under the **same key** (`copy-historical-assets.sh`, §4). The API only ever reads the active
   (testing) bucket with its own credentials.
2. **Allowlist of legacy buckets.** `STORAGE_LEGACY_AWS_BUCKETS=astrosushil:ap-south-1,astro-sushil:ap-southeast-2`
   tells `resolveKey()` that URLs of those buckets mean "the same key in the active store".
   Accepted shapes per bucket: `<b>.s3.<r>.amazonaws.com`, `<b>.s3.amazonaws.com`,
   `<b>.s3-<r>.amazonaws.com`, path-style `s3.<r>.amazonaws.com/<b>/…` and `s3.amazonaws.com/<b>/…`.
   Only `http`/`https`; query string and fragment are ignored; keys are percent-decoded and then
   pass the usual key validation (no `..`, NUL, CR/LF, absolute paths). Any other host gives
   `null`. Malformed entries in the variable are ignored and logged once.
3. **Report key fallback** (`apps/api/src/services/storage/report-object.ts`,
   `reportObjectKey()`): `storageKey`, else `resolveKey(s3Url)`, else none. Used by the customer
   download, the signed access link, the admin download and the admin `pdfAvailable` check. A
   report whose `s3Url` is not allowlisted still answers `404 REPORT_ASSET_NOT_FOUND`, and nothing
   is read.
4. **Digital downloads**: when the entitlement has no `assetKey`, the purchased variant's
   `downloadKey`, then the product's `metadata.digitalAssetKey`. The old product-image fallback is
   kept for seeded (non-migrated) products only; a migrated purchase (`legacyId` set) without any
   file answers `404 "The file for this purchase is not available yet"` instead of the thumbnail.
5. **Optional backfill** (`apps/api/src/scripts/backfill-report-storage-keys.ts`): writes
   `storageKey` for COMPLETED reports whose `s3Url` resolves, after checking the object exists in
   the active store. Dry run by default. Downloads do not need it; it only helps code that reads
   `storageKey` directly (fulfilment reconciliation, orphan cleanup). `s3Url` is never changed.

With `STORAGE_LEGACY_AWS_BUCKETS` unset (production today) nothing changes.

## 3. Environment (`$TESTING_ROOT/env/api.env`)

| Variable | Testing value | Meaning |
| :--- | :--- | :--- |
| `STORAGE_PROVIDER` | `aws` (or `r2`) | the testing bucket's provider |
| `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME` | the TESTING bucket | never the website bucket |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | testing-only IAM user | policy in §5 (API) |
| `STORAGE_LEGACY_AWS_BUCKETS` | `astrosushil:ap-south-1,astro-sushil:ap-southeast-2` | default empty. `bucket:region` list whose objects were copied into the active bucket under the same key. Only after the copy. |

Restart `testing-api` and `testing-worker` after changing it.

## 4. Copy procedure

Run on any machine with Docker (the official `amazon/aws-cli` image is used; a local `aws`
binary is the fallback). `--keys-from-db` needs the testing stack running with the restored
database, so run it on the VPS.

1. Create two AWS profiles in `~/.aws` (mounted read-only into the container):
   `website-readonly` (source, §5 policy A) and `astro-testing` (destination, §5 policy B).
   They must be different identities; the script refuses otherwise.
2. Dry run (default; HEADs only, writes nothing), once per website bucket:

   ```bash
   infrastructure/testing/scripts/copy-historical-assets.sh \
     --source-bucket astrosushil --source-region ap-south-1 --source-profile website-readonly \
     --dest-bucket <testing-bucket> --dest-region <region> --dest-profile astro-testing \
     --keys-from-db
   infrastructure/testing/scripts/copy-historical-assets.sh \
     --source-bucket astro-sushil --source-region ap-southeast-2 --source-profile website-readonly \
     --dest-bucket <testing-bucket> --dest-region <region> --dest-profile astro-testing \
     --keys-from-db
   ```

   R2 destination: add `--dest-endpoint https://<account>.r2.cloudflarestorage.com --dest-region auto`.
   Without database access: `--keys-file keys.txt` (one key or bucket URL per line).
3. Check the summary and the `*.results.tsv` / `*.failures.tsv` files (in `$TESTING_ROOT/logs`
   or `--report-dir`). "Missing in source" is expected for the two locally generated
   `reports/<user>/<id>.pdf` keys and for bare keys that belong to the other bucket.
4. Re-run the same commands with `--execute`. Each object is downloaded to a private temp
   directory, checked (size; MD5 against a single-part ETag; SHA-256 against a stored S3
   checksum when present), uploaded privately with `Content-MD5` and metadata
   `source-etag` / `source-sha256`, and the destination is HEADed again. A destination object
   with the same size and ETag (or `source-etag`) is skipped, so the script can be re-run.
   A differing destination object is skipped unless `--overwrite` (typed confirmation).
5. Set `STORAGE_LEGACY_AWS_BUCKETS` (§3) and restart the API and worker.
6. Optional backfill, inside the API container:

   ```bash
   testing_compose exec -T testing-api node apps/api/dist/scripts/backfill-report-storage-keys.js            # dry run
   testing_compose exec -T testing-api node apps/api/dist/scripts/backfill-report-storage-keys.js --execute
   ```

The script never deletes anything, refuses `source == destination`, refuses a destination named
`astrosushil`, `astro-sushil` or `pdfapilambda` (`PROTECTED_BUCKETS_EXTRA` adds names), and never
passes host `AWS_*` credential variables to the CLI. Each CLI call is one `docker run`, so expect
roughly 1 to 2 seconds per object (about 10 minutes for 270 reports).

## 5. IAM policies

**A. Source, read-only** (attach to the identity behind `--source-profile`; list both website
buckets):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "ListWebsiteBuckets", "Effect": "Allow", "Action": "s3:ListBucket",
      "Resource": ["arn:aws:s3:::astrosushil", "arn:aws:s3:::astro-sushil"] },
    { "Sid": "ReadWebsiteObjects", "Effect": "Allow", "Action": "s3:GetObject",
      "Resource": ["arn:aws:s3:::astrosushil/*", "arn:aws:s3:::astro-sushil/*"] }
  ]
}
```

`s3:ListBucket` makes a missing object answer 404 instead of 403. Add `kms:Decrypt` on the key
only if the bucket uses SSE-KMS (then ETags are not MD5s and the MD5 check fails; see §8).

**B. Testing bucket** (the copy script's `--dest-profile` and the testing API's credentials;
no `DeleteObject`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "ListTestingBucket", "Effect": "Allow", "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<testing-bucket>" },
    { "Sid": "ReadWriteTestingObjects", "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::<testing-bucket>/*" }
  ]
}
```

The testing API itself also calls `DeleteObject` (report delete, replaced uploads) and
`PutObjectAcl` (public uploads with `AWS_S3_PUBLIC_ACL=public-read`). Without them those actions
log a warning or fail; grant them to a separate API identity only if those flows are tested.
Neither identity may have any permission on a production bucket.

## 6. Limitations

- **Digital downloads cannot be restored from the database.** The migration stored
  `assetKey = resolveKey(download.file)`, which gave null for all 91 (most likely the website
  bucket was not configured when it ran, or the value was a `{ url, key }` object), and it never copied the products'
  `variants[].downloadableFile` into `downloadKey`. The original URLs are not in the database.
  Fixing this needs the migration (`apps/api/src/scripts/migrate-from-mongo.ts`, sections 10 and
  11) re-run with the website bucket configured and `downloadableFile` mapped, or a targeted
  repair from the Mongo dump. Until then migrated buyers get a clear 404 instead of the thumbnail.
- The two locally generated report PDFs live on the developer's disk; they are not copied.
- Public images (product, blog, banner URLs of the website bucket) are not copied; the browser
  loads them from the website bucket's public URLs.
- `fulfillment.service.ts` treats a COMPLETED report without `storageKey` as an invalid
  deliverable when it reconciles a report fulfilment unit; the backfill (§4 step 6) avoids that.
- Signed URLs point at the testing bucket host; the browser must be able to reach it.

## 7. Verification

1. API logs show no `STORAGE_LEGACY_AWS_BUCKETS has malformed entries` warning.
2. Admin: open Reports, pick a migrated COMPLETED report (no `storageKey`). The pipeline view
   shows the PDF as available; "Download PDF" returns the file and writes an
   `ADMIN_DOWNLOADED_REPORT` audit entry.
3. Customer: sign in as that report's owner (website "My reports" or app). The report list's
   download link (`reportUrl`, a signed testing-bucket URL) opens the PDF; so does
   `GET /api/v1/reports/<id>/pdf` with the customer's token.
4. Negative check: with `STORAGE_LEGACY_AWS_BUCKETS` emptied and the API restarted, the same
   download answers `404 REPORT_ASSET_NOT_FOUND`.
5. `apps/api/tests/unit/historical-assets.test.ts` covers the resolver, the variable parsing and
   the fallbacks (`npx vitest run tests/unit/historical-assets.test.ts` in `apps/api`).

## 8. Troubleshooting

| Symptom | Cause |
| :--- | :--- |
| `HEAD src forbidden` for many keys | missing `s3:ListBucket` (missing objects look like 403) or wrong region |
| `MD5 … != source ETag (SSE-KMS source?)` | the source bucket uses SSE-KMS, so ETags are not MD5s. The script refuses such objects; copy them by hand after checking them |
| `Both profiles resolve to the same identity` | use a separate read-only identity for the source |
| Customer link 403 from S3 | the API's credentials lack `s3:GetObject` on the testing bucket, or the clock is off (presigned URL) |
