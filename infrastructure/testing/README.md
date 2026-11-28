# Astro Sushil testing environment: deployment runbook

This runbook sets up an isolated **testing copy** of Astro Sushil (API, report worker,
admin, website, PostgreSQL, Redis and a testing proxy). It runs on the VPS that already
runs production, under `/opt/astro-sushil/testing`, as the Docker Compose project
`astro_testing`. It shares nothing with production: no containers, networks,
volumes, database, storage bucket, secrets or env files.

> Nothing here has been deployed or run on the VPS. The scripts were syntax-checked
> and tested offline only (see "Validation status" at the end).

## Topic docs

| Topic | File |
|---|---|
| Services, networks, health checks, sizing, lightweight mode | [docs/compose-architecture.md](docs/compose-architecture.md) |
| Every script, its flags, safety guarantees and exit codes | [docs/operations.md](docs/operations.md) |
| Backup, restore, verify, reset, migration state | [docs/database.md](docs/database.md) |
| Invoice counter initialisation | [docs/invoice-counter.md](docs/invoice-counter.md) |
| Historical report PDFs and digital files | [docs/historical-assets.md](docs/historical-assets.md) |
| Integrations, schedulers, recipient allowlist, API costs | [docs/integrations.md](docs/integrations.md) |
| IP access, temporary HTTPS, client domain, firewall | [docs/public-access.md](docs/public-access.md) |
| Page to send to the client's domain administrator | [docs/dns-client-instructions.md](docs/dns-client-instructions.md) |
| Host Caddy / Nginx integration and rollback | [host-proxy/README.md](host-proxy/README.md) |
| Website / admin build arguments and hardcoded URLs | [docs/frontend-builds.md](docs/frontend-builds.md) |
| Flutter testing APK | [docs/mobile.md](docs/mobile.md) |

## How it fits together

```
browser ──► testing-proxy (nginx, container)
             :8080 website origin  ── /        → testing-website
             (host 18080)          ── /api/    → testing-api
             :8081 admin origin    ── /        → testing-admin
             (host 18081)          ── /api/    → testing-api
             :8082 API-only origin ── /        → testing-api     (mobile app, webhooks)
             (host 127.0.0.1:18082)
testing-api ─┬─ testing-postgres (no published port)
testing-worker┘ testing-redis    (no published port)
              └─ dedicated TESTING S3/R2 bucket, Gemini, OpenRouter, Razorpay TEST keys
```

Key decisions:

- **`NODE_ENV=production` in testing.** Cookies are `Secure`, the dev master OTP is off,
  error details are hidden, and local-disk storage is refused. Authentication is not
  weakened anywhere.
- **Consequence: browser login needs HTTPS.** Raw-IP `http://VPS_IP:18080` works for
  pages and health checks but **not for logging in**, because browsers drop `Secure`
  cookies on plain-HTTP origins. Login works through a temporary HTTPS hostname (step 16) or
  the client's domain (step 17).
- **Same-origin API.** Each frontend calls `/api/v1` on its own origin, and the proxy forwards
  it to the API. Frontend images therefore **do not need a rebuild** when the hostname changes
  (IP → temporary domain → client domain). Only `env/api.env` changes, followed by an API restart.
- **Protection:** HTTP basic auth on the website and admin origins (credentials are generated),
  an optional source-IP allowlist, `noindex` headers and a `robots.txt` that disallows everything.
- **Customer protection:** the database is a copy of real customer data. Every proactive
  sender and scheduler is off. Outbound SMS, WhatsApp, e-mail and push go **only** to the
  allowlisted test recipients. Live Razorpay keys are refused. Copied pending messages
  and in-flight reports are parked during restore.

## Prerequisites you must provide

| Item | Needed for |
|---|---|
| A dedicated **testing S3 bucket** (or R2) plus a testing-only IAM key (Get/Put/List; no Delete; no access to production buckets) | Report PDFs and uploads. Production mode refuses local disk. |
| A **read-only** IAM key for the website buckets (`astrosushil`, `astro-sushil`) | Copying historical PDFs only |
| `GEMINI_API_KEY` (paid), `OPENROUTER_API_KEY` plus a current `OPENROUTER_MODEL` | Report generation, Jyoti chat |
| Razorpay **test** keys (`rzp_test_…`) | Checkout |
| Your own test phone numbers and e-mail addresses | OTP login, notifications |
| SMTP sandbox or test account, SMSLane/WhatChimp credentials (optional) | Real delivery to test recipients |
| A hostname with HTTPS: a temporary one you control (e.g. DuckDNS) or the client's | Logging in |
| VPS with Docker Engine and Compose v2.17 or later, about 4 GiB RAM free beyond production, and 15 GiB disk | Everything |

---

## Part 1: on your local machine

### 1. Commit the local changes

The bundle is built with `git archive`, so it contains **committed files only**. Untracked or
modified files (including `apps/website/src/config/api.js` and the website store changes)
are **left out** until you commit them. Review, then commit on a branch:

```bash
cd ~/Projects/astrosushil
git status
git add docker-compose.testing.yml infrastructure/testing .dockerignore \
        apps/admin apps/website apps/api apps/mobile/lib/core/config apps/mobile/test/unit/network
git commit -m "feat(testing): isolated testing deployment stack"
```

### 2. Create the deployment bundle

```bash
infrastructure/testing/scripts/create-deployment-bundle.sh            # from HEAD; requires a clean tree
# or: --ref <commit>   --allow-dirty (warns; dirty files are NOT included)   --out <dir>
```

Output: `dist/testing-bundles/astro-sushil-testing-<sha>-<UTC>.tar.gz`, plus a `.sha256` file and an
internal `MANIFEST.txt`. The script excludes `.git`, `node_modules`, build output, env files,
mobile, desktop, reference PDFs and zips. It fails if it finds secret-like content.

Alternative to the bundle: on the VPS, run `git clone` and `git checkout <tested-commit>`, then pass
`--source-dir <checkout>` to the installer.

### 3. Export the database backup

Your local migrated database runs on **PostgreSQL 18**. `pg_restore` cannot read an archive from a
newer major version, so first choose the testing server version:

- **Option A (recommended for a faithful copy):** run the testing database on 18. Set
  `TESTING_POSTGRES_IMAGE=postgres:18-alpine` in `env/build.env` on the VPS, then back up with:
  ```bash
  infrastructure/testing/scripts/backup-local-db.sh \
    --host 127.0.0.1 --port 5432 --user <user> --dbname astro_sushil \
    --pgpass ~/.pgpass --target-major 18 --output-dir ~/astro-db-backups
  ```
- **Option B (match production's PostgreSQL 16):** move the data into a 16 cluster first. Then back up
  with `--target-major 16`, using a pg_dump 16 client (`--docker-image postgres:16-alpine`) against that cluster.

The password comes from a mode-600 pgpass file or an interactive prompt, never from the command line.
The script writes `*.dump`, `*.dump.sha256` and `*.dump.meta` (row counts, highest invoice number;
no secrets) and refuses to overwrite an existing file. Details: [docs/database.md](docs/database.md).

### 4. Verify the backup checksum

```bash
cd ~/astro-db-backups && sha256sum -c astro_sushil_*.dump.sha256
infrastructure/testing/scripts/verify-database.sh --local --host 127.0.0.1 --port 5432 \
  --user <user> --dbname astro_sushil          # optional: checks the SOURCE database first
```

### 5. Transfer to the VPS

The bundle and the database backup travel **separately**. The backup contains personal data.

```bash
scp dist/testing-bundles/astro-sushil-testing-*.tar.gz{,.sha256} user@VPS:/tmp/
scp ~/astro-db-backups/astro_sushil_*.dump{,.sha256,.meta} user@VPS:/tmp/
ssh user@VPS 'chmod 600 /tmp/astro_sushil_*.dump*'
```

---

## Part 2: on the VPS

### 6. SSH in

```bash
ssh user@VPS
```

Use `sudo` for the scripts below, because they create `/opt/astro-sushil/testing`.

### 7. Run the preflight check (read-only)

```bash
B=astro-sushil-testing-<sha>-<UTC>          # your bundle name
cd /tmp && sha256sum -c $B.tar.gz.sha256
mkdir -p /tmp/$B && tar -xzf /tmp/$B.tar.gz -C /tmp/$B --strip-components=1
sudo /tmp/$B/infrastructure/testing/scripts/preflight-vps.sh
```

The preflight reports OS, CPU, RAM, disk, Docker/Compose versions, existing containers,
networks and volumes, ports 18080–18082, what owns ports 80/443, production indicators
(pm2 `astro-api`/`astro-worker`, `/opt/astro-sushil/app`) and the firewall state.
Exit code 0 means ok, 2 means warnings, 1 means fail. It changes nothing.

### 8. Configure the environment

First run of the installer: it creates the directories and the env files from the examples,
generates secrets (database password, JWT secret, storage secret, basic-auth password), then
**stops with exit code 3** so you can fill in the remaining values:

```bash
sudo /tmp/$B/infrastructure/testing/scripts/install-testing.sh --bundle /tmp/$B.tar.gz
sudo nano /opt/astro-sushil/testing/env/api.env       # every __SET_ME__ value
sudo nano /opt/astro-sushil/testing/env/proxy.env     # public URLs, allowlist
sudo nano /opt/astro-sushil/testing/env/build.env     # TESTING_POSTGRES_IMAGE (see step 3), limits
```

`api.env` essentials (reference: `env/api.env.example`, [docs/integrations.md](docs/integrations.md)):

- `STORAGE_PROVIDER=aws`, plus `AWS_STORAGE_BUCKET_NAME` and `AWS_S3_REGION_NAME` set to the **testing**
  bucket and the testing-only IAM key. `TESTING_FORBIDDEN_BUCKETS` lists the production buckets;
  install refuses to continue if the bucket you set is one of them.
- `CORS_ORIGIN`, `FRONTEND_URL`, `ADMIN_URL`, `PUBLIC_API_URL`: the HTTPS origins from step 16 or 17.
  Exact production hosts are refused.
- `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
- `RAZORPAY_KEY_ID=rzp_test_…`. A `rzp_live_` key is refused by the installer and by the API at start-up.
- `MESSAGING_RECIPIENT_ALLOWLIST_ENABLED=true`, plus `MESSAGING_ALLOWED_PHONES` / `MESSAGING_ALLOWED_EMAILS`
  set to your test recipients. An empty list means nothing is sent.
- `ADMIN_EMAIL` / `ADMIN_PHONE` must be testers, because they receive the staff copies.
- Leave every `*_SCHEDULER_ENABLED=false` for now.

Env files are mode 600 in a mode-700 directory. Re-running the installer never overwrites them.

### 9. Install the testing stack

```bash
sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/install-testing.sh \
  --restore-backup /tmp/astro_sushil_<db>_<UTC>.dump
```

The installer validates the configuration, ports and resources, and stops if RAM or disk is
insufficient. It never kills anything; `--accept-low-resources` overrides the check. It renders the proxy
access files, builds the images (this takes a while because of TeX Live), starts postgres, restores and
verifies the database, shows the migration status, then starts redis, api, worker, admin, website and
proxy in that order, and finishes with `verify-testing.sh`. Add `--apply-migrations` if the status shows
pending migrations (step 10). It never touches the host firewall, the host proxy or production.

### 10. Restore the database

This is done by step 9 when you pass `--restore-backup`. To restore separately:

```bash
sudo cp /tmp/astro_sushil_*.dump* /opt/astro-sushil/testing/data/postgres-backup/
sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/restore-testing-db.sh \
  --backup /opt/astro-sushil/testing/data/postgres-backup/astro_sushil_<db>_<UTC>.dump \
  [--apply-migrations] [--restart-services]
```

The restore checks the checksum, confirms the target is the `astro_testing` project's database,
and asks you to type a confirmation phrase. It stops api and worker, drops and recreates the
testing database, and runs `pg_restore --no-owner --no-privileges`. **Seed scripts are never run.**
It then parks copied in-flight work: pending or sending `outbound_messages` become `FAILED`
(`TESTING_RESTORE_SUPPRESSED`), and non-terminal reports become `FAILED` (`TESTING_RESTORE_PARKED`),
so the worker does not spend Gemini credit or message customers. `--keep-active-work` skips this.
Invoices and invoice counters are never touched.

Prisma migrations: the status is printed. `--apply-migrations` runs `prisma migrate deploy` against
the testing database only.

### 11. Verify data integrity

```bash
sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/verify-database.sh
```

It reports row counts, foreign-key orphans, duplicate identifiers, native constraints, triggers,
migration state, highest invoice number, historical-storage gaps and parked work. The historical
reference counts (1,361 users; 888 orders, of which 885 paid and 3 pending; 901 order items;
888 payment transactions; 101 invoice records; 273 reports; 91 entitlements) are shown as
**reference only**: a mismatch is a warning. The exit code is non-zero only on real integrity failures.

### 12. Copy historical assets

There are 269 completed historical report PDFs. They live in the website buckets and are referenced
in `reports.s3Url`, which has no `storageKey`. Copy them into the testing bucket under the same keys,
then enable the read mapping:

```bash
S=/opt/astro-sushil/testing/repo/infrastructure/testing/scripts
sudo $S/copy-historical-assets.sh --keys-from-db --aws-config-dir /home/<you>/.aws \
  --source-bucket astrosushil --source-region ap-south-1 --source-profile website-readonly \
  --dest-bucket <testing-bucket> --dest-region <region> --dest-profile astro-testing
# dry run by default; repeat with --execute (and for astro-sushil / ap-southeast-2)
```

Then set `STORAGE_LEGACY_AWS_BUCKETS=astrosushil:ap-south-1,astro-sushil:ap-southeast-2` in
`api.env` and restart: `update-testing.sh --restart-only`. Customer and admin downloads then
read those keys from the **testing** bucket. The legacy bucket is never contacted at runtime and
arbitrary URLs are never fetched. An optional backfill script writes `storageKey` permanently.

**Known gap:** the 91 migrated digital-product entitlements have no file reference in the database.
The import never stored it, so those downloads answer 404 "not available yet". This needs a migration
fix (see [docs/historical-assets.md](docs/historical-assets.md)).

### 13. Initialise the invoice counter (manual, explicit)

The installer does **not** initialise the counter. After restore:

1. Read the real highest invoice number with `verify-database.sh` (do not assume 70).
2. Log in to the testing admin as a SUPER_ADMIN. This needs HTTPS (step 16 or 17).
3. Open **Invoices → Counter**, which calls `GET /api/v1/admin/invoices/counter`, and check the analysis.
4. Confirm the observed highest number. This calls `POST /api/v1/admin/invoices/counter/initialize`
   with `{"confirmLastValue":"<n>"}`.
5. Check that the next number shown is `n+1`.

Never insert into or update `invoice_counters` by hand. See [docs/invoice-counter.md](docs/invoice-counter.md)
(includes curl examples through the API-only origin).

### 14. Configure temporary public access (Mode A: raw IP)

- Website: `http://VPS_PUBLIC_IP:18080`
- Admin: `http://VPS_PUBLIC_IP:18081`

Ports are set in `env/proxy.env` (`TESTING_WEBSITE_PORT`, `TESTING_ADMIN_PORT`,
`TESTING_BIND_ADDRESS`). **Login does not work in this mode** (see "Key decisions").
The scripts never open firewall ports. Inspect the firewall yourself and open ports only if you want this mode:

```bash
sudo ufw status numbered; sudo iptables -S INPUT; sudo nft list ruleset | head -50
```

Docker-published ports bypass ufw. The effective gate is your cloud provider's security list or
firewall. Restrict ports 18080 and 18081 to known source IPs there. To close raw-IP access, set
`TESTING_BIND_ADDRESS=127.0.0.1` and run `update-testing.sh --restart-only`.
Full commands: [docs/public-access.md](docs/public-access.md).

### 15. Configure access protection

- Basic auth is on by default. Credentials are in `/opt/astro-sushil/testing/env/basic-auth.txt` (mode 600).
  Share them with the client through a separate channel.
- Optional source-IP allowlist: `TESTING_ALLOWED_CIDRS=203.0.113.4/32,…` in `proxy.env`.
- Behind a host proxy: `TESTING_TRUSTED_PROXY_CIDRS=172.30.118.1` (the `testing_edge` gateway).
- Apply the changes: `sudo .../render-proxy-access.sh --reload`.
- Admin login is a separate, second barrier: staff e-mail and password, with server-side RBAC.

### 16. Temporary HTTPS without the client's domain

These options were evaluated in [docs/public-access.md](docs/public-access.md):

1. **Recommended:** a hostname you control (for example free DuckDNS: `test.NAME.duckdns.org`,
   `admin-test.NAME.duckdns.org`, `api-test.NAME.duckdns.org` pointing at the VPS), routed by your
   **existing** host proxy. That means adding one separate site file
   (`host-proxy/caddy/astro-testing.caddy.example` or `host-proxy/nginx/*.example`) and, for Caddy,
   one `import` line. Certificates are automatic with Caddy, or come from certbot with Nginx.
   Backup, validate, reload and rollback commands are in [host-proxy/README.md](host-proxy/README.md).
   Nothing is installed automatically.
2. **No change to the production proxy:** Cloudflare quick tunnels
   (`testing_compose --profile tunnel up -d testing-tunnel-website testing-tunnel-admin`).
   Find the URLs with `testing_compose logs testing-tunnel-website | grep trycloudflare.com`. The URLs
   are random and change on every restart. Add them to `CORS_ORIGIN` and restart the API. There is no SLA,
   so this suits short demos only, and the mobile app cannot use it.
3. sslip.io-style hostnames work too, but Let's Encrypt rate limits may apply. A self-signed
   certificate was rejected because of browser warnings and the mobile app.

After this, set `CORS_ORIGIN`, `FRONTEND_URL`, `ADMIN_URL` and `PUBLIC_API_URL` in `api.env` to those
HTTPS origins, then run `update-testing.sh --restart-only`. No frontend rebuild is needed.

### 17. Integrate the client-owned domain later (Mode B)

- Website: `https://test.CLIENT_DOMAIN`
- Admin: `https://admin-test.CLIENT_DOMAIN`
- API: `https://api-test.CLIENT_DOMAIN`

This uses the same host-proxy snippet as step 16.1 with the client's hostnames. Then update `api.env`,
set `TESTING_BIND_ADDRESS=127.0.0.1` to close the raw-IP ports, and run `update-testing.sh --restart-only`.

### 18. Configure DNS

Send [docs/dns-client-instructions.md](docs/dns-client-instructions.md) to the client. They do not need
to share registrar access.

| Type | Host | Target |
|---|---|---|
| A | test | VPS public IPv4 |
| A | admin-test | VPS public IPv4 |
| A | api-test | VPS public IPv4 |
| AAAA (only if the VPS has working public IPv6 and the host proxy listens on it) | same three | VPS IPv6 |

Check with `dig +short test.CLIENT_DOMAIN`. If the domain has CAA records, they must allow `letsencrypt.org`.

### 19. Obtain certificates

- **Caddy:** automatic on the first request after DNS resolves. Renewal is automatic.
- **Nginx:** `sudo certbot certonly --webroot -w /var/www/letsencrypt --cert-name astro-testing -d test.X -d admin-test.X -d api-test.X`
  (details in [host-proxy/README.md](host-proxy/README.md)). Check renewal with
  `systemctl list-timers | grep certbot` and `sudo certbot renew --dry-run`.

### 20–22. Verify the website, admin and API

```bash
sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/verify-testing.sh \
  --public-url https://test.X --public-url https://admin-test.X --public-url https://api-test.X
```

The script checks containers and health, postgres, redis, API `/health` and `/ready`, worker, proxy,
basic auth (401 without credentials, 200 with them), `X-Robots-Tag`, public reachability, TLS expiry,
`/api/v1/auth/csrf`, the storage provider (add `--storage-write-test` for an opt-in tiny object write),
XeLaTeX, Poppler and fonts in the worker, that frontend builds contain no production API host,
and database integrity. It never sends messages and never generates reports.

Manual checks:

- **Website:** open it, enter the basic-auth credentials, browse the catalogue, then log in with an
  allowlisted test number over HTTPS.
- **Admin:** log in as staff, open a historical report (Reports → Debug Pipeline → Download PDF),
  and check that the header shows the TESTING badge.
- **API:** `curl -s http://127.0.0.1:18082/ready` on the VPS.

Generating a report calls Gemini, which is paid. Do it deliberately.

### 23. Build the Flutter testing APK (local machine)

```bash
infrastructure/testing/scripts/build-mobile-testing.sh --api-url https://api-test.CLIENT_DOMAIN/api/v1
```

Testing builds refuse a missing or production API URL. HTTPS is required, and the app must use
the API-only origin. The APK uses the same application id as production, so use test devices.
See [docs/mobile.md](docs/mobile.md).

### 24. Share the links with the client

Send the website and admin HTTPS URLs and the basic-auth credentials (from `env/basic-auth.txt`,
through a separate channel). Create a staff account for the client in the testing admin, and explain
that the site is a testing copy: payments use Razorpay test mode, and messages reach only the allowlisted numbers.

### 25. Update testing

```bash
# locally: commit, create a new bundle, scp it (steps 1, 2, 5), then on the VPS:
sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/update-testing.sh \
  --bundle /tmp/<new-bundle>.tar.gz --backup-db [--apply-migrations]
# git checkout install instead: --git-ref <commit>      env change only: --restart-only
```

Env files and volumes are kept. Before replacing the source it keeps a copy of the previous one,
and it stops before recreating containers if migrations are pending and `--apply-migrations` is missing.

### 26. Reset the testing database

```bash
sudo .../reset-testing-db.sh --list
sudo .../reset-testing-db.sh --backup /opt/astro-sushil/testing/data/postgres-backup/<file>.dump
```

You must type `RESET astro_testing <dbname>`. Only the testing database is affected.

### 27. Stop testing

```bash
sudo .../stop-testing.sh            # stop containers; data kept
sudo .../stop-testing.sh --down     # remove containers and network; volumes kept
```

### 28. Remove testing

```bash
sudo .../teardown-testing.sh [--keep-backups] [--keep-images]
```

You must type `DELETE astro_testing /opt/astro-sushil/testing`. The teardown removes only the
`astro_testing` containers, networks and volumes, the `astro-testing-*` images and the testing
directory (after path safety checks). It never prunes and lists Docker resources before and after.
After teardown, remove your host-proxy site file and DNS records by hand (rollback in
[host-proxy/README.md](host-proxy/README.md)).

---

## Troubleshooting

| Symptom | Check |
|---|---|
| **Docker:** `compose` errors about `--env-file` / unknown keys | Compose v2.17 or later is needed (`docker compose version`). Run `preflight-vps.sh`. |
| **Docker:** `required variable TESTING_ROOT` | Run through the scripts, or `source …/scripts/lib/common.sh` and use `testing_compose`. |
| **Docker:** subnet overlap on `up` | Change `TESTING_EDGE_SUBNET` in `build.env`, then `stop-testing.sh --down` and `update-testing.sh --restart-only`. |
| **PostgreSQL:** restore fails with `unsupported version (1.16) in file header` | The backup is from PostgreSQL 18 and the testing image is 16. See step 3. |
| **PostgreSQL:** extension missing | `restore-testing-db.sh` lists the archive's extensions. Only `plpgsql` is expected. |
| **Prisma:** `P3009` / failed migration in `_prisma_migrations` | [docs/database.md](docs/database.md). Never `migrate reset` on data you want to keep. |
| **Prisma:** `P3005` (database not empty) | The restore was not of a Prisma-migrated database. Check the source. |
| **Prisma:** API `/ready` fails after restore | Pending migrations: run `restore-testing-db.sh --apply-migrations` or `update-testing.sh --apply-migrations`. |
| **Redis:** unavailable | `testing_compose logs testing-redis`. The API falls back to PostgreSQL advisory locks without it. |
| **CORS:** login request blocked | The browser origin must be listed exactly (scheme, host, port) in `CORS_ORIGIN`. Restart the API. |
| **Cookies:** login "succeeds" then logs out, or no session | You are on `http://`. Use HTTPS (step 16). Cookies are only set for origins in `CORS_ORIGIN`. |
| **Nginx (testing proxy):** 502 | The upstream is not healthy: `testing_compose ps`, then `logs testing-api`. |
| **Nginx (testing proxy):** 500 on every request | htpasswd is not readable by nginx: `render-proxy-access.sh` sets the mode. Re-run it. |
| **Nginx (testing proxy):** 403 | Your IP is not in `TESTING_ALLOWED_CIDRS`. Behind a host proxy, set `TESTING_TRUSTED_PROXY_CIDRS`. |
| **Nginx (host):** snippet breaks reload | `nginx -t` first. Rollback in host-proxy/README.md. |
| **Caddy:** certificate not issued | DNS must resolve to the VPS, and ports 80/443 must be reachable. Check `journalctl -u caddy`. A `{$…}` anywhere in the snippet is parsed as an env placeholder. |
| **HTTPS:** certificate warning | Wrong hostname in the site block, or DNS still propagating (`dig +short`). |
| **DNS:** name not resolving | Wait out the TTL. Check with `dig @1.1.1.1 test.CLIENT_DOMAIN`. |
| **PDF generation** fails | `testing_compose logs testing-worker`. `verify-testing.sh` checks xelatex, pdfinfo and fonts. The report's `errorCode` shows in the admin debug view. |
| **XeLaTeX:** out of memory | Raise `TESTING_WORKER_MEM_LIMIT` (default 1536m). See the sizing in compose-architecture.md. |
| **Fonts:** missing glyphs | `testing_compose exec testing-worker fc-list \| grep -i noto`. The fonts come from the API Dockerfile packages. |
| **S3/R2:** `STORAGE_CONFIGURATION_ERROR` | Production mode needs all four `AWS_*` values (or all R2 values). Local disk is refused. |
| **S3/R2:** historical download 404 | The objects were not copied, or `STORAGE_LEGACY_AWS_BUCKETS` is unset. See step 12. |
| **Gemini:** reports fail with `LLM_NOT_CONFIGURED` | `GEMINI_API_KEY` is missing from `api.env`. |
| **OpenRouter:** Jyoti errors | `OPENROUTER_MODEL` must be a model that exists today. The code defaults are outdated. |
| **Flutter:** app cannot connect | Use `https://api-test…/api/v1` (not the website origin, which has basic auth). The app throws at start if the URL is missing. |
| **OTP** not received | The number is not in `MESSAGING_ALLOWED_PHONES`, or provider credentials are empty. Suppressed sends are logged as `RECIPIENT_NOT_ALLOWLISTED`. |

## Validation status (local, before deployment)

| Check | Result |
|---|---|
| `bash -n` on every script | PASS |
| shellcheck | NOT EXECUTED (not installed) |
| `docker compose config` (all profiles, example env) | PASS |
| `nginx -t` on testing.conf (nginx:1.28.0-alpine), functional proxy test against stubs | PASS |
| `caddy validate` with the host snippet | PASS |
| API `tsc --noEmit`, admin `tsc --noEmit` | PASS |
| API unit tests | PASS (93 files, 1775 tests) |
| Flutter `app_config_test.dart` | PASS |
| Website testing build: no production API host in the output | PASS |
| DB scripts end-to-end against throwaway postgres:16 containers | PASS |
| Deployment bundle creation and secret scan (dirty tree, HEAD a8c4b94) | PASS (bundle not installable until the testing files are committed) |
| Testing image builds (api 2.3 GB, admin 1.7 GB, website 85 MB) | PASS (after fixing the Prisma OpenSSL engine mismatch in `apps/api/Dockerfile`) |
| Local smoke run: full stack up, `prisma migrate deploy` on an empty DB, all 7 containers healthy, `verify-testing.sh` | PASS for every check except the 2 that need real `api.env` values (URLs, testing bucket) |
| `stop-testing.sh --down` keeps volumes and leaves other Docker projects untouched | PASS |
| install / verify / update / teardown on a real VPS | NOT EXECUTED |
| Public access, HTTPS, DNS, certificates | NOT EXECUTED |
| Real S3 copy, Gemini, Razorpay, messaging | NOT EXECUTED |
