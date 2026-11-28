# Testing database: backup, transfer, restore, verify, reset

The testing stack runs its own PostgreSQL (`testing-postgres`, `postgres:16-alpine`, compose project
`astro_testing`, no published port). Its data comes from **your local migrated database**: you dump
it on your machine, copy the dump to the VPS, and restore it into the testing database. Production is
never read or written by any of these steps.

| Script (in `infrastructure/testing/scripts/`) | Runs on | Writes |
| --- | --- | --- |
| `verify-database.sh --local ...` | your machine | nothing (read-only transaction) |
| `backup-local-db.sh` | your machine | `./db-backups/*.dump`, `.dump.sha256`, `.dump.meta` |
| `restore-testing-db.sh --backup <file>` | VPS | replaces the testing database |
| `verify-database.sh` | VPS | nothing (read-only transaction) |
| `reset-testing-db.sh` | VPS | replaces the testing database (via restore) |

The SQL of the checks is in `infrastructure/testing/sql/verify-database.sql`.

## 0. The version rule (read first)

A `pg_dump` custom archive can be restored only by a `pg_restore` that understands its format
version, and `pg_dump` refuses servers newer than itself. So:

```
source server major  <=  pg_dump major  <=  testing server major (16)
```

`pg_dump` 17 and 18 write archive version 1.16, which `pg_restore` 16 rejects with
`pg_restore: error: unsupported version (1.16) in file header` (tested). `backup-local-db.sh` checks
this before dumping and stops with the fix:

- **Your pg_dump is newer than 16** (e.g. Ubuntu 26.04 ships PostgreSQL 18 client tools): use
  `--docker-image postgres:16-alpine` (a throwaway container runs `pg_dump` 16 on the host network)
  or `--use-docker <your local postgres:16 container>`.
- **Your local database server itself is newer than 16** (e.g. it lives in a native PostgreSQL 18
  cluster): a PostgreSQL 16 `pg_dump` cannot read it. Either move the testing stack to the same major
  (change `image: postgres:16-alpine` of `testing-postgres` in `docker-compose.testing.yml` to
  `postgres:18-alpine` on a fresh volume, then pass `--target-major 18`), or load the data into a
  PostgreSQL 16 database first. Prefer matching the major version production uses.

## 1. Check the local database before you dump it (optional, recommended)

```bash
chmod 600 ~/.pgpass            # libpq ignores a password file that others can read
infrastructure/testing/scripts/verify-database.sh --local \
  --host 127.0.0.1 --port 5432 --user postgres --dbname astro_sushil_dev
```

Same connection flags as the backup (`--service`, `--pgpass <file>`, `--use-docker <container>`).
Without a password file you are prompted once; the password is never on a command line or in an
environment variable (`PGPASSWORD` set in your shell is refused). Fix every `FAIL` before dumping.

## 2. Dump the local database

Run from the repository root. Pick the variant that matches the version rule:

```bash
# pg_dump on your PATH has the right major (16):
infrastructure/testing/scripts/backup-local-db.sh \
  --host 127.0.0.1 --port 5432 --user postgres --dbname astro_sushil_dev

# Your pg_dump is newer (17/18): run pg_dump 16 from a throwaway container on the host network.
infrastructure/testing/scripts/backup-local-db.sh \
  --host 127.0.0.1 --port 5432 --user postgres --dbname astro_sushil_dev \
  --docker-image postgres:16-alpine

# The database runs in a local postgres:16 container (e.g. the root docker-compose.yml `astro_postgres`):
infrastructure/testing/scripts/backup-local-db.sh --use-docker astro_postgres \
  --user postgres --dbname astro_sushil_dev
```

Password: `--pgpass <file>` (mode 600), else `$PGPASSFILE`, else `~/.pgpass`, else one prompt (kept
in a private temporary pgpass file that is deleted on exit). In `--use-docker` mode the file is
copied into the container's private temp dir and removed afterwards.

What the dump contains and why:

- `pg_dump --format=custom --compress=6`: one compressed archive, restorable with `pg_restore`.
- The **whole database**: schema, data, indexes, constraints (including the hand-written exclusion
  and check constraints), the `trg_verify_shipment_item_order` trigger and its function, sequences,
  and `_prisma_migrations` (so Prisma knows which migrations are applied).
- `--no-owner --no-privileges`: no `ALTER ... OWNER` or `GRANT` statements, so the restore runs as
  the testing role without needing your local role names. (`pg_restore` gets the same flags.)
- `pg_dump` reads everything inside one repeatable-read transaction: the dump is a consistent
  snapshot even if something writes to the source meanwhile. It takes no locks that block writers.

Output (default `./db-backups`, created mode 700; files mode 600; existing files are never
overwritten unless `--force` and you type the confirmation):

```
db-backups/astro_sushil_<db>_<UTC timestamp>.dump
db-backups/astro_sushil_<db>_<UTC timestamp>.dump.sha256   # sha256sum format
db-backups/astro_sushil_<db>_<UTC timestamp>.dump.meta     # no secrets
```

`.meta` records: source host/port/db/user, server and `pg_dump` versions, target major, size,
extensions, latest applied migration, failed migrations, **row counts of the key tables**, the
**highest stored `INV-AS/<n>` invoice number** and the counter state, and the checksum.

## 3. Verify the checksum

```bash
cd db-backups && sha256sum -c astro_sushil_<db>_<ts>.dump.sha256
```

## 4. Transfer to the VPS (separately from the source bundle)

The dump holds customer data (names, phone numbers, e-mail addresses, birth data). Transfer it on its
own, never inside the source bundle or a git repository, and keep it mode 600 in a mode 700 directory.

```bash
F=astro_sushil_<db>_<ts>.dump
ssh <vps> 'sudo install -d -m 700 /opt/astro-sushil/testing/data/postgres-backup'
scp -p "db-backups/$F" "db-backups/$F.sha256" "db-backups/$F.meta" <vps>:/tmp/
ssh <vps> "sudo install -m 600 /tmp/$F /tmp/$F.sha256 /tmp/$F.meta /opt/astro-sushil/testing/data/postgres-backup/ && rm -f /tmp/$F /tmp/$F.sha256 /tmp/$F.meta"
ssh <vps> "cd /opt/astro-sushil/testing/data/postgres-backup && sudo sha256sum -c $F.sha256"
```

Delete local copies you no longer need (`shred -u` or your disk-encryption policy).

## 5. Restore into the testing database (VPS)

```bash
cd /opt/astro-sushil/testing/repo
sudo infrastructure/testing/scripts/restore-testing-db.sh \
  --backup /opt/astro-sushil/testing/data/postgres-backup/astro_sushil_<db>_<ts>.dump
```

What it does, in order:

1. The file must be inside `$TESTING_ROOT/data/postgres-backup` (mounted read-only at `/backups` in
   `testing-postgres`); its `.sha256` must match.
2. Destination identity: `POSTGRES_USER` / `POSTGRES_DB` from `$TESTING_ROOT/env/postgres.env`; the
   container must carry the labels `com.docker.compose.project=astro_testing` and
   `com.docker.compose.service=testing-postgres`, and its own `POSTGRES_DB` / `POSTGRES_USER` must equal
   the env file. Database names that are system or production-like (`postgres`, `template0/1`,
   `astro_sushil`, ...) or do not contain `test` are refused.
3. Reads the archive's table of contents with the container's `pg_restore` (catches version
   mismatches before anything is dropped) and checks every extension in it exists in the image.
4. Asks you to type `RESTORE astro_testing <dbname>` (or pass
   `--yes-i-understand-this-replaces-the-testing-database`).
5. Stops `testing-api` and `testing-worker` (they hold connections and would write).
6. `DROP DATABASE ... WITH (FORCE)` and `CREATE DATABASE ... OWNER <testing user> TEMPLATE template0
   ENCODING 'UTF8'`, connected to the `postgres` maintenance database.
7. `pg_restore --no-owner --no-privileges --role=<testing user> --exit-on-error --single-transaction`.
   Single transaction = all or nothing: a failure leaves an empty database, never a half-restored
   one (this rules out `--jobs`; the data set is small). Log: `$TESTING_ROOT/logs/db-restore-<ts>.log`.
8. `ANALYZE`.
9. **Parks in-flight work** (default; see below), still with `testing-api` / `testing-worker` stopped.
10. `prisma migrate status` in the `testing-migrate` tool container (printed only).
11. `verify-database.sh`.

It never seeds. `testing-api` / `testing-worker` stay stopped unless you pass `--restart-services`
(then `testing-redis` is restarted first, which drops cached data of the old database; Redis has no
persistence in testing). Exit code: 0 ok, 1 integrity failure found by the verification.

### In-flight work is parked after every restore

The restored data is a copy of real data. It can contain messages that were waiting to go to real
customers and reports that were waiting to be generated (every generation costs Gemini calls). If
`testing-worker` started on it, it would send and generate them. So, by default, right after
`pg_restore` and before anything is started, `restore-testing-db.sh` runs
`infrastructure/testing/sql/park-active-work.sql` against the **testing database only**, in **one
transaction**, and prints the counts by status before and after:

| Table | Rows | Set to |
| --- | --- | --- |
| `outbound_messages` | `status` `PENDING` or `SENDING` | `status = FAILED`, `lastError = 'TESTING_RESTORE_SUPPRESSED'`, `lockedAt = NULL`, `attempts = maxAttempts`. The outbox only picks `PENDING` rows, so they are never retried. |
| `reports` | `status` not `COMPLETED` / `FAILED` (`PENDING`, `QUEUED`, `PROCESSING`, `CALCULATING`, `ANALYZING`, `RENDERING`, `COMPILING`, `UPLOADING`) | `status = FAILED`, `errorCode = 'TESTING_RESTORE_PARKED'`, `errorMessage = 'Parked by testing restore; regenerate from admin if needed'`, `failedAt = now()`, `claimToken`, `claimedAt`, `claimExpiresAt`, `retryAfter` cleared. The queue claims only `QUEUED` and in-progress rows, so the worker never takes them. |

It sends no notification (plain SQL, not the worker's failure path) and **never touches `invoices`
or `invoice_counters`**. To test one parked report, regenerate it from the admin Reports screen.
`verify-database.sh` shows the parked/suppressed counts and what is still pending in the section
"in-flight work" (INFO only).

Opt out with `--keep-active-work` (also accepted by `reset-testing-db.sh`) only when you
deliberately want that work to run in testing, with messaging channels set to `fake`/`none` and
Gemini spend accepted.

## 6. Migration state

The restore prints `prisma migrate status`. If the dump is older than the code (pending migrations),
nothing is applied by default. Apply them explicitly:

```bash
sudo infrastructure/testing/scripts/restore-testing-db.sh --backup <file> --apply-migrations
# or later, on its own (testing-migrate's default command is prisma migrate deploy):
TC="docker compose --project-name astro_testing --env-file /opt/astro-sushil/testing/env/build.env \
  --env-file /opt/astro-sushil/testing/env/proxy.env -f /opt/astro-sushil/testing/repo/docker-compose.testing.yml"
sudo TESTING_ROOT=/opt/astro-sushil/testing $TC --profile tools run --rm testing-migrate
sudo TESTING_ROOT=/opt/astro-sushil/testing $TC --profile tools run --rm --no-deps testing-migrate \
  npx prisma migrate status --schema prisma/schema.prisma
```

Read-only drift check (database vs `schema.prisma`, exit code 2 when they differ):

```bash
sudo TESTING_ROOT=/opt/astro-sushil/testing $TC --profile tools run --rm --no-deps testing-migrate \
  npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --exit-code
```

## 7. Verify (any time, read-only)

```bash
sudo infrastructure/testing/scripts/verify-database.sh          # table output
sudo infrastructure/testing/scripts/verify-database.sh --json   # one JSON object
```

| Section | Checks | FAIL when |
| --- | --- | --- |
| counts | rows of users, staff_profiles, admin_roles, birth_profiles, orders, order_items, shop_orders, reports, consultation_bookings, payment_transactions, invoices, invoice_counters, digital_product_entitlements, products, courses | never (reference mismatch = WARN) |
| orders | by `status` and `paymentStatus`; paid (`paidAt` set); pending; paid orders without a payment row | never |
| orphans (FK) | every relation of the key tables that has a foreign key in `schema.prisma` | any orphan |
| orphans (soft) | `payment_transactions.userId/orderId`, `invoices.orderId`, `digital_product_entitlements.orderItemId` (plain columns, no FK) | never (WARN) |
| duplicates (unique) | `@unique` business columns: users.email/phoneNumber, orders.razorpayOrderId/razorpayPaymentId, invoices.sequence/orderId, ... | any duplicate |
| duplicates (soft) | e-mail case-insensitive, invoice number numeric value (website history has duplicates by design), SUCCESS gateway payment ids | never (WARN) |
| constraints | counts by type; unique and invalid indexes; FK count vs `@relation(fields:)` in `schema.prisma`; the raw-SQL objects of the migrations (`trg_verify_shipment_item_order`, `fn_verify_shipment_item_order_consistency`, `chk_refund_allocation_amount_positive`, `appointment_slots_no_overlap`, `uq_active_fulfillment_unit_shipment`, `birth_profiles_one_self_per_user`); extensions | an object missing, fewer FKs than relations, an invalid index |
| migrations | `_prisma_migrations` applied / rolled back / failed, compared with the repo's migration folders | a failed (unfinished) migration |
| invoices | by status; well-formed / malformed numbers; highest `INV-AS/<n>`; counter state | counter `lastValue` below the highest stored number |
| files | reports with `s3Url` but no `storageKey`; completed reports with no file; entitlements with null `assetKey` | never |
| in-flight work | `outbound_messages` by status; suppressed (`TESTING_RESTORE_SUPPRESSED`) and still `PENDING`/`SENDING`; reports parked (`TESTING_RESTORE_PARKED`) and still unfinished | never (INFO) |

Historical reference counts (printed as REFERENCE only): 1,361 users; 888 orders; 885 paid;
3 pending; 901 order items; 888 payment transactions; 101 invoice records; 273 reports;
91 entitlements. "Paid" is compared with `orders.paidAt IS NOT NULL`.

Exit code: 0 no FAIL, 1 at least one FAIL, 2 usage or connection error.

## 8. Reset the testing database to a backup

```bash
sudo infrastructure/testing/scripts/reset-testing-db.sh --list      # what is available
sudo infrastructure/testing/scripts/reset-testing-db.sh             # pick from the list
sudo infrastructure/testing/scripts/reset-testing-db.sh --backup <file> [--apply-migrations] [--restart-services] [--keep-active-work]
```

You must type `RESET astro_testing <dbname>` exactly; it then runs `restore-testing-db.sh`. Every
change made in testing since that backup is lost, including the invoice counter: initialise it again
afterwards ([invoice-counter.md](invoice-counter.md)).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `pg_restore: error: unsupported version (1.16) in file header` | Dump made by pg_dump 17/18. Re-dump with `--docker-image postgres:16-alpine` (section 0). |
| `pg_dump: error: aborting because of server version mismatch` | pg_dump older than the source server. Use a pg_dump of the server's major; if that major is above 16, see section 0. |
| `extension "X" is not available` | The source uses an extension the `postgres:16-alpine` image lacks. The schema's migrations use none (the exclusion constraint uses the built-in `tsrange` GiST support). Remove the extension from the source or use an image that ships it. The testing `POSTGRES_USER` is a superuser in the official image, so available extensions can be created. |
| `role "..." does not exist`, `must be owner of ...` | A dump restored without `--no-owner --no-privileges`. The scripts always pass both; restore only with `restore-testing-db.sh`. |
| `Backup must be inside .../data/postgres-backup` | The container sees only that directory (as `/backups`). `sudo install -m 600 <file> <file>.sha256 /opt/astro-sushil/testing/data/postgres-backup/`. |
| `SHA-256 verification FAILED` | Corrupt or incomplete transfer. Copy again; do not edit the `.sha256`. |
| `Container database/user (...) differ from postgres.env` | `postgres.env` changed after the volume was initialised. The image applies `POSTGRES_*` only on an empty volume; recreate the testing volume deliberately (teardown) or restore the env file. |
| Prisma `P3009` (failed migrations found) | A row in `_prisma_migrations` has no `finished_at`. Find out why it failed (`logs` column), fix the cause, then mark it: `... testing-migrate npx prisma migrate resolve --rolled-back <name> --schema prisma/schema.prisma` and run `migrate deploy` again. Mark `--applied` only when you verified the migration's changes are fully present. Usually better: fix the source database and dump again. |
| Prisma `P3005` (schema is not empty) | The database has tables but no `_prisma_migrations` (dump of a database created with `db push`, or the table was excluded). Baseline: for each migration already reflected in the schema run `npx prisma migrate resolve --applied <name>`; better: dump a database migrated with `prisma migrate deploy`. |
| `migrate status` says pending migrations | Dump older than the code. `--apply-migrations` or the commands in section 6. |
| API errors right after a restore | Start order: restore, (migrations), `restart testing-redis`, `start testing-api testing-worker`. |
