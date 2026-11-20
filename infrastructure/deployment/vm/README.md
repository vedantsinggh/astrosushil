# Astro Sushil backend on a small Oracle Cloud VM (dev / showcase)

This folder runs the **API and the report worker** on one small Ubuntu 24.04 VM
(Oracle Cloud Always Free **VM.Standard.E2.1.Micro**: 2 vCPU AMD, 1 GB RAM) so
you can show the app to the client. It is **not a production setup**: it runs
with `NODE_ENV=development` on purpose (see [Development-mode risks](#8-development-mode-risks)).

```
phone / admin browser
        |  https://<name>.duckdns.org  (or http://<public-ip>)
        v
Oracle security list (80, 443) -> VM iptables (80, 443)
        v
Caddy :80/:443 (HTTPS certificate, reverse proxy)
        v
astro-api   127.0.0.1:3000  (pm2)      astro-worker (pm2, 1 report at a time, xelatex)
        \___________________ ________________/
                            v
             PostgreSQL 16 + Redis, localhost only
```

| File | Where it runs | What it does |
|---|---|---|
| `setup.sh` | VM, once (re-runnable), with `sudo` | swap, Node.js + pm2, PostgreSQL 16, Redis, XeLaTeX, Caddy, firewall, env file, backups |
| `deploy.sh` | dev machine (one command) | builds locally, uploads, then on the VM: `npm ci --omit=dev`, `prisma generate`, `prisma migrate deploy`, pm2 reload, health check |
| `ecosystem.config.cjs` | VM (copied by deploy) | pm2 apps `astro-api` and `astro-worker`, memory limits |
| `.env.vm.example` | VM (copied by setup) | every variable the API and worker read, with comments |
| `create-admin.sh` | VM (copied by deploy) | creates your first admin-panel login (no demo data is seeded) |

No demo phone numbers, no allowlist and no seed data are created. The database
starts empty except for what the migrations create.

---

## 1. Oracle Cloud setup

1. **Create the instance** (Compute > Instances > Create):
   - Image: **Canonical Ubuntu 24.04**. Shape: `VM.Standard.E2.1.Micro` (or the
     Ampere A1 shape, see [section 7](#7-better-option-the-free-ampere-a1-vm)).
   - Networking: a public subnet with "Assign a public IPv4 address" on.
   - SSH keys: upload your public key (`~/.ssh/id_ed25519.pub`) or download the
     generated one.
   - Boot volume: the default 47 GB is plenty (the whole stack uses about 2.5 GB
     plus a 4 GB swapfile).
2. **Open ports 80 and 443 in the Console**: Networking > Virtual cloud networks >
   your VCN > Subnets > your subnet > Security lists > Default security list >
   **Add Ingress Rules**:

   | Source CIDR | IP protocol | Destination port |
   |---|---|---|
   | `0.0.0.0/0` | TCP | `80` |
   | `0.0.0.0/0` | TCP | `443` |

   (If your instance uses a Network Security Group instead, add the same two rules
   there.) Do **not** open 3000, 5432 or 6379. The Oracle Ubuntu image ALSO has its
   own iptables rules that reject everything except SSH; `setup.sh` fixes that
   part on the VM.
3. **Get a free domain for HTTPS (recommended)**: go to <https://www.duckdns.org>,
   sign in, create a sub-domain (for example `astro-demo`), and set its IP to the
   VM's public IP. Check it from your laptop: `dig +short astro-demo.duckdns.org`
   must print the VM IP. You need a name because Let's Encrypt does not issue
   certificates for bare IP addresses, and iOS/Android refuse plain HTTP by
   default.
4. **SSH in once** to accept the host key:
   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@<public-ip>
   ```
   If you use a key that is not your default one, add it to `~/.ssh/config`:
   ```
   Host astro-vm
     HostName <public-ip>
     User ubuntu
     IdentityFile ~/.ssh/oracle_key
   ```
   then use `astro-vm` wherever this guide says `ubuntu@<public-ip>`.

## 2. Bootstrap the VM (`setup.sh`)

From the repository root on your dev machine:

```bash
scp -r infrastructure/deployment/vm ubuntu@<public-ip>:~/astro-vm
ssh ubuntu@<public-ip>
# on the VM:
sudo bash ~/astro-vm/setup.sh --domain astro-demo.duckdns.org --email you@example.com
# or, IP only (plain HTTP, see the mobile caveats in section 5):
sudo bash ~/astro-vm/setup.sh
```

It takes about 10 to 15 minutes on the micro VM (most of it is TeX Live). It is
safe to run again; it keeps the existing database password, JWT secret and
master OTP. What it does, step by step:

1. base packages; 2. a 4 GB `/swapfile` (2 GB if the disk is small), added to
   `/etc/fstab`, `vm.swappiness=10`;
3. Node.js 22 LTS from NodeSource + pm2 (the repo has no `.nvmrc`/`engines`; the
   Dockerfiles use Node 20, which reached end of life in April 2026; the build
   output is plain ES2021 and runs on both. Use `--node-major 20` to match the
   Dockerfiles exactly);
4. PostgreSQL 16 from Ubuntu's apt (no Docker), listening on `localhost` only,
   tuned for 1 GB (`shared_buffers=64MB`, `max_connections=20`, `work_mem=2MB`,
   no parallel workers, no JIT); creates role `astro` and database
   `astro_sushil` with a random password that is written only into the env file;
5. Redis on `127.0.0.1` with `maxmemory 32mb` and no persistence (see the note
   below; skip with `--no-redis`);
6. the minimal XeLaTeX set for report PDFs (section 6);
7. Caddy: HTTPS with an automatic Let's Encrypt certificate when `--domain` is
   given, otherwise plain HTTP on port 80;
8. firewall: inserts `ACCEPT` rules for TCP 80 and 443 **before** Oracle's final
   `REJECT` rule in the iptables `INPUT` chain and saves them with
   `netfilter-persistent` (also adds ufw rules if ufw is active);
9. creates `/opt/astro-sushil/{app,shared}` and `/var/lib/astro-sushil/storage`,
   writes `/opt/astro-sushil/shared/api.env` (mode 600) from `.env.vm.example`
   and fills `DATABASE_URL`, `JWT_SECRET` (`openssl rand -hex 48`),
   `DEV_MASTER_OTP` (random 6 digits), `PUBLIC_API_URL`, `HOST`, `PORT`,
   `TRUST_PROXY`, `REDIS_URL`, `STORAGE_LOCAL_DIR`;
10. `pm2 startup` (systemd unit `pm2-ubuntu`) and a logrotate rule for
    `~/.pm2/logs` (daily or 20 MB, 7 kept). The system logrotate is used instead
    of the `pm2-logrotate` module because that module is one more Node process
    (about 40 MB) on a 1 GB machine; pass `--pm2-logrotate` if you prefer it;
11. a nightly `pg_dump` cron job (section 9).

Other flags: `--public-ip IP`, `--swap-size 2G`, `--no-latex`, `--open-api-port`
(also opens 3000 and binds the API to 0.0.0.0; not needed with Caddy). Run
`bash setup.sh --help` for the list.

**Redis note.** The API runs without Redis (locks fall back to PostgreSQL), but
the consultation booking code connects to `redis://localhost:6379` when no
Redis variable is set, and a refused connection there leaves a reconnecting
client behind on every booking. A capped local Redis costs about 5 MB, so the
kit installs it.

## 3. Fill in the env file

```bash
ssh ubuntu@<public-ip>
nano /opt/astro-sushil/shared/api.env
```

Set at least:

| Variable | Why |
|---|---|
| `GEMINI_API_KEY` | **Required for reports.** All report narratives and the daily Rashi Bhavishya use Google Gemini. Without it every report fails with `LLM_NOT_CONFIGURED`. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Jyoti chat. The default model in `apps/api/.env.example` (`minimax/minimax-m3:free`) and the code default (`poolside/laguna-s-2.1:free`) **no longer exist** on OpenRouter; pick a current one at <https://openrouter.ai/models>. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional, **test keys only** (`rzp_test_...`). Empty = mock payments. |
| `EMAIL_*` | Optional, only for e-mail sign-up / password reset codes. |
| `GOOGLE_OAUTH_CLIENT_IDS` | Optional, Google sign-in (section 5). |
| `CORS_ORIGIN` | Admin panel origins (section 5). |

Use new keys for this VM; do not copy your laptop's `apps/api/.env`. Every
variable is explained in `.env.vm.example`. After any later change:
`pm2 restart astro-api astro-worker --update-env`.

## 4. Deploy, check, operate

### First deploy and every update

On the dev machine, from the repository root:

```bash
infrastructure/deployment/vm/deploy.sh ubuntu@<public-ip>
# with a specific key / port:
infrastructure/deployment/vm/deploy.sh -i ~/.ssh/oracle_key -p 22 ubuntu@<public-ip>
# just build and look at the pack, no upload:
infrastructure/deployment/vm/deploy.sh --dry-run
```

It builds on your machine (`prisma generate`, `npm run build:packages`,
`npm run build:api`; the build never runs on the VM because `tsc` can run out of
memory with 1 GB), packs only runtime files (about 11 MB: `dist` folders,
`prisma/schema.prisma` + migrations, the report LaTeX templates, package
manifests and the lockfile), rsyncs them to `/opt/astro-sushil/app`, then on the
VM installs production dependencies for the API workspaces only (about 105 MB;
skipped when `package-lock.json` did not change), runs `prisma generate` (so
the query engine matches the VM's CPU and OpenSSL) and `prisma migrate deploy`,
reloads both pm2 apps, saves the pm2 list for boot and calls `/health`.
It deploys your working tree, including uncommitted changes; the release
label shown on the VM says `+uncommitted` when that is the case. Use `--clean`
after deleting or renaming source files so stale compiled files are not shipped.

Then create your admin-panel login (once):

```bash
ssh -t ubuntu@<public-ip> bash /opt/astro-sushil/app/create-admin.sh
```

### Updating the server safely

Deploy as often as you like: `deploy.sh` (and `pm2 restart` / `pm2 reload`)
never strands a report that is being generated.

- On SIGTERM/SIGINT the worker stops claiming new reports, gives the running one
  `REPORT_SHUTDOWN_GRACE_MS` (20 s) to finish, then releases its claim: the report
  goes back to `QUEUED` with no retry delay and no failure recorded. pm2 waits
  up to `kill_timeout` (30 s) for this.
- On start the new worker first requeues anything its previous boot still held
  (e.g. after a hard kill or OOM), runs stale-lease recovery, then signals pm2
  `ready`.
- Claims are 60 s leases renewed every 20 s by a heartbeat during long LLM and
  xelatex steps. If a process dies without cleaning up, its report is recovered
  as soon as the lease expires.
- A resumed report restarts from the beginning of generation on the same report
  row and fulfilment unit (no new order, no second charge); narrative topics
  that were already written come from the topic cache, so they are not paid for
  twice.

Expected effect of a deploy: an in-progress report is delayed by about the
restart time, at most about 2 minutes; nothing is left stuck.

Database time: all DateTime columns are UTC. The API forces `TimeZone=UTC` on
its own sessions, and `setup.sh` sets the server timezone to UTC as well.
Check with `sudo -u postgres psql -c 'show timezone'`.

### Health

```bash
curl https://astro-demo.duckdns.org/health        # liveness: {"status":"ok",...,"environment":"development"}
curl https://astro-demo.duckdns.org/ready         # readiness: database + queue
# IP only: curl http://<public-ip>/health
```

The same routes also exist under `/api/v1/health`. Swagger UI is at
`/documentation`.

### Logs, restart, stop

```bash
ssh ubuntu@<public-ip>
pm2 status
pm2 logs                         # both apps, live (Ctrl+C to leave)
pm2 logs astro-worker | grep -v prisma:query   # development mode logs every SQL query
pm2 logs astro-worker --lines 200
pm2 restart astro-api            # or astro-worker, or all
pm2 restart all --update-env     # after editing api.env
pm2 monit                        # live CPU / memory
pm2 stop all                     # take the backend offline (Caddy then returns 502)
sudo journalctl -u caddy -n 50   # HTTPS / certificate problems
free -m; swapon --show           # memory and swap use
```

Logs are in `~/.pm2/logs/` and rotate daily (7 kept, compressed). In development
mode Prisma logs every SQL query, and the worker polls the queue every 3 s, so
the worker log grows by roughly 60 MB a day before compression.

### After a reboot

Everything starts by itself: PostgreSQL, Redis and Caddy are systemd services,
and `pm2-ubuntu.service` restores the saved apps.

## 5. Connecting the frontends

The public base URL is `https://<your-domain>` (or `http://<public-ip>`); every
API route is under `/api/v1`. The API uses plain HTTP/JSON only: there are **no
WebSocket** endpoints in `apps/api` today (Caddy would proxy them without extra
configuration if they are added later).

### Mobile app (Flutter, `apps/mobile`)

`apps/mobile/lib/core/config/app_config.dart` picks the base URL in this order:
`AppConfig.setBaseUrl()` (tests) > `--dart-define=API_BASE_URL=...` (or
`TEST_API_URL`) > `USE_ADB_REVERSE` > `USE_EMULATOR` > `API_HOST` (always
`http://<host>:3000`, so **do not use it** with this VM) > release builds default
to `https://backend.astrosushil.com/api/v1` > desktop `127.0.0.1:3000` > the
laptop Wi-Fi default `192.168.1.10:3000`. `/api/v1` is appended automatically if
you leave it out. There are no build flavors.

**With a domain (recommended):**

```bash
cd apps/mobile
flutter run --dart-define=API_BASE_URL=https://astro-demo.duckdns.org/api/v1

# APK to send to the client (release builds otherwise point at backend.astrosushil.com):
flutter build apk --release \
  --dart-define=API_BASE_URL=https://astro-demo.duckdns.org/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com

# iOS additionally:
  --dart-define=GOOGLE_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com
```

Google sign-in: put the same Web client ID (and the iOS client ID) in
`GOOGLE_OAUTH_CLIENT_IDS` in `api.env`, comma-separated. iOS also needs the
reversed iOS client ID as a URL scheme in `Info.plist`, and Android needs the
SHA-1 of the signing key registered on the Android OAuth client in Google
Cloud. Without Google client IDs, use phone login with the master OTP.

**IP only, no domain (dev-only workaround, not applied by this kit):**
plain `http://` is blocked by default on both platforms.

- *Android, debug builds:* `apps/mobile/android/app/src/debug/res/xml/network_security_config.xml`
  allows cleartext only to the hosts listed there (`192.168.1.10`, `127.0.0.1`,
  `10.0.2.2`, ...). Add your VM inside the existing `<domain-config cleartextTrafficPermitted="true">`:
  ```xml
  <domain includeSubdomains="false">203.0.113.10</domain>
  ```
  then `flutter run --dart-define=API_BASE_URL=http://203.0.113.10`.
  *Release* APKs use the main manifest, which has no cleartext permission; you
  would have to add a similar config to `src/main`, which also affects real
  releases. Use a domain instead.
- *iOS:* App Transport Security blocks HTTP, and `NSExceptionDomains` does not
  accept IP addresses, so the only option for an IP is a dev-only global
  exception in `apps/mobile/ios/Runner/Info.plist`:
  ```xml
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
  </dict>
  ```
  Never ship that to the App Store. DuckDNS + Caddy HTTPS avoids all of this.

### Admin panel (Next.js, `apps/admin`)

The admin panel reads **`NEXT_PUBLIC_API_URL`** (`apps/admin/lib/api-client.ts`)
and adds `/api/v1/admin/...` itself, so set it **without** `/api/v1`. Run it on
your laptop or on Vercel, not on the 1 GB VM (a Next.js server needs another
200+ MB).

```bash
# local: apps/admin/.env.local
NEXT_PUBLIC_API_URL=https://astro-demo.duckdns.org
npm run dev:admin -- -p 3001   # http://localhost:3001
```

On Vercel set `NEXT_PUBLIC_API_URL` in the project settings and redeploy (it is
inlined at build time). A Vercel page is HTTPS, so the API must be HTTPS too
(browsers block HTTP calls from HTTPS pages): Vercel needs the domain setup.

CORS: add the admin origins to `CORS_ORIGIN` in `api.env`, e.g.
`CORS_ORIGIN=http://localhost:3001,https://astro-admin.vercel.app`. In
development mode the API currently accepts any origin anyway
(`apps/api/src/plugins/cors.ts`), but keep the list right for later. Log in with
the account from `create-admin.sh`.

### Desktop app (`apps/desktop`)

It does not use this server. It is an offline workstation with its own bundled
engine sidecar and makes no network calls.

### How testers log in (no SMS provider yet)

There is no SMS integration: `POST /api/v1/auth/phone/send-otp` creates a random
6-digit code, stores only its hash and logs "dispatched", but nothing is sent.
Testers therefore use the **development master OTP** (`apps/api/src/modules/auth/otp.service.ts`):

1. In the app, enter any phone number and tap send. This creates the user (if
   new) and a pending code valid for 10 minutes (60 s resend cooldown).
2. Enter the master OTP instead of the SMS code. `verifyOtp` accepts it in place
   of the pending code while `NODE_ENV` is not `production` and
   `ALLOW_DEV_MASTER_OTP=true` (or `DEV_MASTER_OTP` is set). It is single-use per
   pending code, and 5 wrong tries burn the code. The same applies to e-mail
verification and password-reset codes (no SMTP = nothing is sent; the code is
not logged either).

`setup.sh` generated a random 6-digit master OTP for this VM. Read it on the VM
and share it only with your testers:

```bash
sudo grep '^DEV_MASTER_OTP=' /opt/astro-sushil/shared/api.env
```

## 6. Reports on 1 GB RAM

**Pipeline.** The worker (`apps/api/src/worker.ts`) claims one report job at a
time from the PostgreSQL queue, builds the chart snapshot, asks Gemini for the
narrative topics, assembles LaTeX and runs `xelatex` three times
(`packages/report-engine/src/platform/render/document.ts`), then checks the PDF
with poppler (`pdfinfo`, `pdftotext`) and stores it under
`/var/lib/astro-sushil/storage`. Downloads use signed links built from
`PUBLIC_API_URL`.

**Concurrency 1.** In development mode the API normally also runs each new
report *inside the API process* right away ("instant execution"), which could
run several xelatex jobs at once. The kit sets `REPORT_INSTANT_EXECUTION=false`
so only the single worker process generates reports, one at a time; the worker
polls every 3 s, so delivery is not delayed. Keep one worker instance.

**TeX packages** (installed with `--no-install-recommends`, not `texlive-full`):
`texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-pictures
texlive-fonts-recommended fonts-texgyre fonts-open-sans fonts-noto-core fonts-lmodern
fontconfig poppler-utils` (about 150 MB download, about 500 MB on disk including the
generated TeX formats; `texlive-full` would be over 5 GB).
`texlive-fonts-recommended` is needed only for `pzdr.tfm`, which XeTeX's hyperref
driver loads; without it every compile fails with
``Font \XeTeXLink@font=pzdr ... not loadable`` (found while testing this kit).
They cover every package the shared style `astrosushil-platform.sty` loads
(geometry, fontspec, ucharclasses, xcolor, graphicx, tikz + calc, tcolorbox
`most`, microtype, enumitem, fancyhdr, lastpage, needspace, newunicodechar,
ragged2e, tabularx/booktabs/array/colortbl/longtable, titletoc, hyperref) and its
fonts: TeX Gyre Pagella (main), Open Sans (sans), Noto Serif Devanagari (Hindi
text, e.g. the Fortune report). Libre Bodoni is optional (falls back to Pagella).

**Measured.** Reports were generated with the repo's offline test narrator (no
AI) through the same `generateReport` -> `compileLatex` -> PDF QA path the worker
uses, then the `.tex` was compiled again inside an `ubuntu:24.04` container
provisioned by `setup.sh` (1 GB RAM limit, the packed `report-engine` from
`deploy.sh`), with the CPU limited to 1 core and to 1/8 core to imitate the
micro VM's burst and baseline. The test host is an Intel i5-13420H; an EPYC 7551
core is roughly 2x slower single-threaded, so the last column is an estimate.

| Report | Pages | 1 core (measured) | 1/8 core (measured) | E2.1.Micro estimate | Peak RAM (xelatex) |
|---|---|---|---|---|---|
| Love | 22 | 13 s | 153 s | 0.5 min bursting, about 5 min throttled | 213 MB |
| Kundli (largest) | 82 | 34 to 40 s | 300 to 376 s | 1.5 min bursting, 10 to 13 min throttled | 238 MB |

Times are the three xelatex passes plus PDF QA; add the Gemini calls (a Kundli
makes 19 narrative calls, typically several minutes in total, same as on any
machine). Idle memory on the test VM image: API about 120 MB, worker about
105 MB, pm2 daemon about 65 MB, PostgreSQL about 100 MB, Redis under 10 MB. With
one xelatex run on top, the machine is close to 1 GB, which is why the swapfile
and the one-report-at-a-time rule matter.

**What to expect on the micro VM.** Short and medium reports (up to about 30
pages) should work. The E2.1.Micro is burstable: after it has been idle it runs
at full speed for a while, then drops to a fraction of a core. Under sustained
throttling the longest reports (Kundli 82 pages, Career 72 pages) can hit
the built-in limits: 240 s per xelatex pass
(`packages/report-engine/src/platform/render/document.ts`) and 10 minutes per
attempt (`apps/api/src/services/report-retry.policy.ts`). Both are hard-coded
(the env var `REPORT_ATTEMPT_TIMEOUT_MS` can only shorten the attempt limit),
and this kit does not change them. The first attempt of a long report may also
time out while Gemini writes the topics; the retry then takes them from the
topic cache and only renders. For a demo, generate a long report once before the
meeting, keep the VM otherwise idle while it renders, or use the A1 VM.

**If a report job is killed (OOM) or times out:** the worker is restarted by pm2
and stale-job recovery requeues the report; failed attempts are retried with
backoff (15, 30, 60 ... minutes) until the delivery deadline, and topics that
already passed come from the topic cache, so a retry does not pay Gemini again.
To see what happened:

```bash
pm2 logs astro-worker --lines 200 | grep -iE "report|latex|timeout|error"
sudo dmesg -T | grep -iE "killed process|out of memory"
```

Remedies, in order: make sure the swapfile is active (`swapon --show`); stop
other memory users while demonstrating (`sudo systemctl stop redis-server` is
harmless); keep `REPORT_INSTANT_EXECUTION=false`; prefer shorter reports in the
demo; or move to the A1 VM below.

## 7. Better option: the free Ampere A1 VM

If your tenancy has Always Free **VM.Standard.A1.Flex** capacity (up to 4 OCPU
and 24 GB RAM in total, ARM64), use it: reports then take seconds instead of
minutes and nothing needs swap. "Out of capacity" errors are common; retry
later or try another availability domain.

Everything in the stack runs on ARM64 and the kit works unchanged:

- Node.js: NodeSource publishes arm64 packages; the API has no native addons
  (only the Prisma engines).
- Prisma 5.22: supports `linux-arm64-openssl-3.0.x`. `deploy.sh` runs
  `prisma generate` **on the VM**, so the right engine is downloaded there; the
  schema does not need `binaryTargets` (it stays unchanged). Only if you ever
  generate the client on your x86 laptop and copy `node_modules` would you need
  `binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]`.
- TeX Live, fonts, poppler, PostgreSQL 16, Redis and Caddy are all in Ubuntu's
  arm64 archive under the same package names.
- The pack built on x86 is architecture-neutral JavaScript.

On A1 you can raise the limits: in `ecosystem.config.cjs` remove
`--max-old-space-size` and raise `max_memory_restart`; in
`/etc/postgresql/16/main/conf.d/astro-lowmem.conf` use e.g.
`shared_buffers = 1GB` and `max_connections = 50`; and
`REPORT_INSTANT_EXECUTION` can be removed.

## 8. Development-mode risks

You chose `NODE_ENV=development` for this VM. The kit does not block that, but
be clear about what it means:

- **Master OTP = anyone can be anyone.** With the URL and the master code,
  anybody can sign in as **any phone number**, including numbers of real people
  your testers registered. Keep the URL and the code private, change the code
  (edit `DEV_MASTER_OTP`, then `pm2 restart all --update-env`) if it leaks, and
  take the VM down after the showcase (`pm2 stop all`, or stop the instance).
- **Master OTP also resets passwords, including admin ones.** The
  forgot-password flow (`/api/v1/auth/forgot-password` then `reset-password`)
  verifies its code with the same function, so anyone who knows an account's
  e-mail and the master OTP can set a new password for it, including your
  admin-panel account. Use an admin e-mail address that is not public or
  guessable, and treat the master OTP like the admin password.
- **Mock payments are accepted.** Without Razorpay keys the API creates mock
  orders, and in development it accepts `mock_sig_*` payment signatures even
  with keys set. Any signed-in user can "buy" reports, and **every report spends
  real Gemini credit**. Watch your Gemini quota/budget; set
  `RASHI_BHAVISHYA_SCHEDULER_ENABLED=false` if you do not need the daily
  horoscope (12 Gemini calls per day).
- **Verbose errors and logs.** Development error responses can include internal
  details (messages, stack hints), logs run at `debug` level, and the Swagger UI
  at `/documentation` lists every endpoint.
- **Relaxed checks.** Every browser origin is allowed by CORS; Google sign-in
  accepts any audience when `GOOGLE_OAUTH_CLIENT_IDS` is empty; the WhatsApp
  webhook accepts the default verify token `astro_verify_token` when
  `WHATSAPP_VERIFY_TOKEN` is empty; local signed download links are enabled.
- **Not hardened.** One VM, no high availability, backups on the same disk, no
  monitoring. Use test data and test keys only; do not collect real customer
  data or real payments here.

## 9. Backups

`setup.sh` installs `/etc/cron.d/astro-sushil-backup`, which keeps one dump per
weekday (7 in total):

```
15 3 * * * postgres pg_dump -Fc astro_sushil > /var/backups/astro-sushil/astro_sushil-$(date +\%a).dump
```

Manual backup and copy to your laptop:

```bash
ssh ubuntu@<public-ip> 'sudo -u postgres pg_dump -Fc astro_sushil' > astro_sushil-$(date +%F).dump
```

Restore (stop the apps first):

```bash
pm2 stop all
sudo -u postgres pg_restore --clean --if-exists -d astro_sushil /var/backups/astro-sushil/astro_sushil-Mon.dump
pm2 start all
```

Report PDFs live in `/var/lib/astro-sushil/storage`; copy them with
`rsync -a ubuntu@<public-ip>:/var/lib/astro-sushil/storage/ ./storage-backup/` if
you need them (they can also be regenerated).

## 10. Troubleshooting

**`curl http://<ip>/health` times out from your laptop, but works on the VM.**
A firewall is in the way. Check both layers:
```bash
sudo iptables -L INPUT -n --line-numbers   # ACCEPT tcp dpt:80/443 must come BEFORE the REJECT line
sudo bash ~/astro-vm/setup.sh ...          # re-run: it inserts the rules in the right place
```
Then check the Console security list (section 1). If you added rules by hand
with `iptables -A`, they landed after `REJECT` and never match; delete them
(`sudo iptables -D INPUT <num>`) and re-run setup. Save with
`sudo netfilter-persistent save`.

**HTTPS does not work / certificate errors.** `sudo journalctl -u caddy -n 100`.
Let's Encrypt must reach the VM on port 80 **and** 443, and the DuckDNS name must
resolve to the VM IP. Too many failed attempts trigger a rate limit for an hour.

**502 Bad Gateway.** Caddy is fine but the API is down: `pm2 status`,
`pm2 logs astro-api --lines 100`. A config error prints `Invalid environment
variable configuration` with the variable name (for example `JWT_SECRET` too
short or `DATABASE_URL` empty).

**Processes restart or disappear (OOM).**
```bash
sudo dmesg -T | grep -iE "killed process|out of memory"
pm2 status          # the "↺" restart counter grows
free -m; swapon --show
```
pm2's `max_memory_restart` (API 350 MB, worker 450 MB) restarts a process
before the kernel kills something worse; the kernel OOM killer can still hit
`xelatex` or PostgreSQL if swap is missing. Make sure `/swapfile` is active.

**Prisma: "Query engine library for current platform could not be found"** or
"binaryTargets". The client was generated on another machine. Run
`bash /opt/astro-sushil/app/deploy.sh --remote` on the VM (it runs
`prisma generate` there), or redeploy. `apps/api/prisma/schema.prisma` has no
`binaryTargets`, which is correct when generating on the VM; it was not changed.

**`prisma migrate deploy` fails.** Read the error; the migrations are
forward-only. On this dev VM, if you do not need the data, you can recreate the
database: `sudo -u postgres dropdb astro_sushil && sudo -u postgres createdb -O astro astro_sushil`
and redeploy.

**Reports fail with `LATEX_COMPILE_FAILED`.** See the excerpt in
`pm2 logs astro-worker`. Typical causes:
- `Font "..." not found`: install the font package
  (`fonts-texgyre`, `fonts-open-sans`, `fonts-noto-core`), then `fc-cache -f` and
  check with `fc-list | grep -iE "pagella|open sans|devanagari"`.
- `File '...sty' not found`: find the package with
  `apt-file search <name>.sty` (`sudo apt install apt-file && sudo apt-file update`)
  and install it.
- `xelatex: command not found`: setup ran with `--no-latex`; run it again without.
- A timeout on a very long report on the micro VM: see section 6.

**Reports fail with `LLM_NOT_CONFIGURED`.** `GEMINI_API_KEY` is empty in
`api.env`; set it and `pm2 restart all --update-env`.

**Jyoti chat errors about the model.** `OPENROUTER_MODEL` is empty or a model
that no longer exists (section 3).

**`npm ci` is very slow or killed on the VM.** It only runs when
`package-lock.json` changed. Check swap; it needs a few hundred MB for a minute.

## 11. Taking it down

```bash
ssh ubuntu@<public-ip> 'pm2 stop all && pm2 save'   # backend offline, data kept
```

Or stop/terminate the instance in the Oracle Console. Remove the DuckDNS record
if you no longer use it.
