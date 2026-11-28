# Testing stack: operations scripts

All scripts are in `infrastructure/testing/scripts/`. On the VPS, run them from the installed source: `$TESTING_ROOT/repo/infrastructure/testing/scripts/`. Each script finds its own directory, so it works from any working directory, and each one has `--help`.

`TESTING_ROOT` defaults to `/opt/astro-sushil/testing`. Set the environment variable to use another path. The path must end with `/testing`. Normally you run the scripts with `sudo`, because they write under `/opt` and talk to Docker.

## Safety guarantees (all scripts)

- They touch only `$TESTING_ROOT` and Docker resources of the compose project `astro_testing`. Images touched are only `astro-testing-api|admin|website`.
- They never run `docker system|volume|network|image prune`.
- They never stop, kill or reconfigure production: the pm2 apps `astro-api` and `astro-worker`, Caddy on 80/443, native Postgres and Redis, `/opt/astro-sushil/app` and `/opt/astro-sushil/shared`. They never read production env files.
- They never change firewall rules, host Caddy/Nginx configuration or DNS. Commands for those steps are printed for you to run yourself.
- They never print secrets. Generated values go only into `env/*.env` (mode 600). The basic-auth password is stored only in `env/basic-auth.txt` (mode 600).
- `--yes` answers only non-destructive prompts. Destructive steps (DB restore, teardown) always need typed confirmation on the terminal.

## Shared library: `lib/common.sh`

Other scripts source this file. Its public API:

| Name | Purpose |
|---|---|
| `TESTING_ROOT` (exported), `TESTING_PROJECT=astro_testing`, `REPO_DIR=$TESTING_ROOT/repo` | layout |
| `TESTING_ENV_DIR`, `TESTING_NGINX_DIR`, `TESTING_BACKUP_DIR`, `TESTING_DEPLOY_DIR`, `TESTING_COMPOSE_FILE` | derived paths |
| `testing_compose <args>` | `docker compose --project-name astro_testing --env-file env/build.env --env-file env/proxy.env -f repo/docker-compose.testing.yml <args>` |
| `log_info`, `log_ok`, `log_warn`, `log_error`, `log_step`, `die` | logging to stderr |
| `confirm_phrase "<phrase>"` | reads from `/dev/tty`; returns non-zero on mismatch or when no terminal is available |
| `confirm_yes "<question>"` | y/N prompt; `ASSUME_YES=1` answers yes |
| `require_cmd`, `require_docker` | prerequisites (Compose v2.17+ for multiple `--env-file`) |
| `load_env_file <file> [prefix]`, `env_file_get <file> <KEY>`, `env_file_keys <file>` | safe KEY=VALUE parsing; files are never sourced |
| `url_host`, `is_prod_host`, `is_prod_api_url`, `list_has_prod_host` | production host denylist (`PRODUCTION_HOST_DENYLIST`) |
| `port_in_use`, `port_owner`, `port_used_by_testing` | port checks |
| `testing_container_id`, `assert_testing_container`, `container_health`, `wait_service_healthy` | container checks (by compose labels) |
| `sha256_verify <file> [sumfile]` | checksum check |
| `assert_safe_testing_root` | refuses `/`, `/opt/astro-sushil`, production directories and paths that do not end in `/testing` |
| `install_repo_from_source --bundle F` / `--source-dir D` | stages the new source, keeps the old one in `deployment/repo-<ts>` |
| `validate_testing_env` | env validation (see below) |
| `write_install_state <action>` | `deployment/install-state.env` and `deployment/history.log` |

The production host denylist is exact host names: `astrosushil.com www.astrosushil.com api.astrosushil.com backend.astrosushil.com admin.astrosushil.com`. Test sub-domains such as `test.`, `admin-test.` and `api-test.astrosushil.com` are allowed. You can extend the list with the environment variable `PRODUCTION_HOST_DENYLIST`. Build args (`TESTING_WEBSITE_API_URL`, `TESTING_ADMIN_API_URL`) are stricter: any `astrosushil.com` host is refused there.

### Env validation (`validate_testing_env`)

Errors stop install and update. Key names are reported, values never.

- An error is raised for any `__SET_ME__` or `__GENERATE__` value left in `api.env`, `postgres.env`, `build.env` or `proxy.env`.
- These keys are required and must not be empty: `DATABASE_URL JWT_SECRET CORS_ORIGIN PUBLIC_API_URL FRONTEND_URL ADMIN_URL STORAGE_PROVIDER RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET`. Override the list with `TESTING_REQUIRED_API_KEYS`.
- `NODE_ENV`, if set, must be `production`.
- `RAZORPAY_KEY_ID` must start with `rzp_test_`. A `rzp_live_` key is refused.
- `CORS_ORIGIN`, `PUBLIC_API_URL`, `FRONTEND_URL`, `ADMIN_URL` and `OPENROUTER_SITE_URL` must contain no production host.
- The host in `DATABASE_URL` must be `testing-postgres`, so the production DB can never be used.
- `STORAGE_PROVIDER` must be `aws` or `r2`, and the bucket must be set. A bucket listed in `TESTING_FORBIDDEN_BUCKETS` is an error. If `TESTING_FORBIDDEN_BUCKETS` is empty, or the bucket name lacks `test`, you get a warning.
- You get a warning when any `*_SCHEDULER_ENABLED`, `MESSAGING_INLINE_DISPATCH`, `NOTIFICATION_CAMPAIGNS_ENABLED`, `AUTO_DELIVER_WHEN_READY` or `INVOICE_RECOVERY_ENABLED` is true. `REPORT_STALE_RECOVERY_SCHEDULER_ENABLED` is exempt. You also get a warning when an SMS, WhatsApp or email provider is active while `MESSAGING_RECIPIENT_ALLOWLIST_ENABLED` is not true.
- In `build.env`, both API URLs are required; relative values are expected.
- In `proxy.env`, ports must be numeric and not 80/443, and public URLs must not be production hosts.

## preflight-vps.sh (read-only)

Run it before installing: `sudo ./preflight-vps.sh [--min-ram-gib 3] [--rec-ram-gib 4] [--min-disk-gib 12] [--rec-disk-gib 15]`

It prints PASS/WARN/FAIL/INFO lines for:
- OS, kernel and CPU count
- RAM, swap and available memory
- free disk on the Docker data-root and on the `TESTING_ROOT` parent
- Docker and Compose versions
- existing containers, with `astro_testing` networks and volumes flagged
- ports 18080/18081/18082 and the ports from `proxy.env`
- owners of 80/443
- production indicators: `/opt/astro-sushil/app`, existence only of `/opt/astro-sushil/shared/api.env`, pm2 and node processes seen through `ps`, and the systemd state of caddy, nginx, postgresql and redis
- firewall state (`ufw status`, `iptables -S INPUT`, `nft list tables`; root only)
- directory permissions

The thresholds come from `compose-architecture.md`. At least 3 GiB of RAM must be available beyond production (steady state plus one PDF build), and 4 GiB is recommended. The Docker data-root needs 12 GiB free, and 15 GiB is recommended.

It changes nothing. It does not call `pm2`, because that could spawn a pm2 daemon. Exit codes: `0` pass, `1` at least one FAIL, `2` warnings only.

## install-testing.sh

```
sudo ./install-testing.sh --bundle /tmp/astro-sushil-testing-<sha>-<ts>.tar.gz [--restore-backup FILE.dump] [--apply-migrations]
```

| Flag | Meaning |
|---|---|
| `--source-dir DIR` | extracted bundle (has `MANIFEST.txt`) or git checkout (only tracked files of HEAD are copied) |
| `--bundle FILE` | bundle; `FILE.sha256` must match |
| `--restore-backup FILE` | copies FILE (+ `.sha256`, `.meta`, mode 600) into `data/postgres-backup` if it is elsewhere, then runs `restore-testing-db.sh --backup FILE`, which asks for its own confirmation; `FILE.sha256` must exist |
| `--apply-migrations` | `prisma migrate deploy` on the testing DB when migrations are pending |
| `--skip-build` | reuse the existing images |
| `--accept-low-resources` | continue below the RAM/disk minimum; nothing is ever stopped to make room |
| `--detect-ip` | looks up the public IP via `https://api.ipify.org`, only to print URLs |
| `--yes` | non-destructive prompts only |

The script runs these steps in order:

1. Checks the prerequisites.
2. Checks the options.
3. Checks the destination with the path guard.
4. Checks the ports. Ports used by other processes stop the install.
5. Checks resources.
6. Creates directories: `env`, `data` and `data/postgres-backup` with mode 700; `nginx` with mode 755; `logs`; `deployment` with mode 700.
7. Installs the source. The previous source is moved to `deployment/repo-<ts>`.
8. Creates env files from `repo/infrastructure/testing/env/*.env.example`, **only when missing**. It fills each `__GENERATE__` value: `POSTGRES_PASSWORD` gets hex 24, `JWT_SECRET` gets hex 48, `STORAGE_SECRET` and any other key get hex 32, and `DATABASE_URL` is built from `postgres.env`. The files get mode 600. The install refuses to make a new `postgres.env` while the `testing_pgdata` volume or `api.env` already exists, because the password would no longer match.
9. Creates the htpasswd with `openssl passwd -apr1`. The user comes from `TESTING_BASIC_AUTH_USER`, the password is random, and it is stored in `env/basic-auth.txt` (mode 600). The htpasswd is group 101 and mode 640 as root, or mode 644 otherwise, so the nginx worker can read it.
10. Validates the configuration. If `__SET_ME__` values remain, the script stops with **exit 3** and tells you what to fill.
11. Renders the proxy access files with `render-proxy-access.sh`.
12. Runs `testing_compose build`.
13. Starts postgres and waits until it is healthy.
14. Restores the DB, if you asked for it.
15. Runs `verify-database.sh` if a restore ran or the DB has tables.
16. Checks the migration status, and runs deploy with `--apply-migrations`. Without the flag, it only warns.
17. Starts redis.
18. Starts api and worker.
19. Starts admin and website.
20. Starts the proxy.
21. Runs `verify-testing.sh --no-public` and prints the URLs, the location of the credentials and the next steps. Firewall commands, HTTPS options and `invoice-counter.md` are printed, not run.

Re-runs are idempotent. Existing env files, the htpasswd, volumes and data are kept. State goes to `deployment/install-state.env` and `deployment/history.log`.

Exit codes: `0` ok, `1` error, `3` fill the env values and re-run, `4` installed but verification found failures.

## verify-testing.sh

```
sudo ./verify-testing.sh [--no-public] [--public-url URL]... [--storage-write-test] [--skip-db-verify]
```

The script checks:
- env validation
- the health of the 7 core containers (`astro_testing` only)
- postgres `SELECT 1` and redis `PING`
- API `/health` and `/ready` from inside the API container
- `GET /api/v1/auth/csrf` through `127.0.0.1:$TESTING_API_PORT`
- worker health, error/fatal log lines in the last 30 min, and the time of the last log line
- in the worker: `xelatex`, `pdftotext`, `pdfinfo` and Noto fonts (`fc-list`)
- proxy `/healthz`
- website and admin without credentials: a 401 counts as protected, and a 200 is a FAIL while basic auth is on
- website and admin with the credentials from `basic-auth.txt`: expects 200. Credentials are passed to curl on stdin, not in argv.
- the `X-Robots-Tag` header on all three origins
- that the website build and the admin client bundle contain no `api.astrosushil.com` or `backend.astrosushil.com`
- the storage provider and bucket, which are read inside the API container without printing secrets, and that the bucket is not in `TESTING_FORBIDDEN_BUCKETS`
- public URLs and the expiry of the TLS certificates of https `TESTING_PUBLIC_*_URL` values (skipped with `--no-public`)
- `verify-database.sh`

A 403 is reported as WARN (the allowlist blocked the host). Requests from the host arrive from the gateway of the `testing_edge` network (for example `172.30.118.1`).

It never logs in, sends messages, creates orders or triggers reports. The only write is the opt-in `--storage-write-test`. It puts one private object under `healthchecks/` in the testing bucket and deletes it again.

Exit codes: `0` / `1` FAIL / `2` WARN only.

## render-proxy-access.sh

```
./render-proxy-access.sh [--reload] [--check]
```

The script reads `env/proxy.env` and always writes all three of `nginx/access-website.conf`, `access-admin.conf` and `access-api.conf`, atomically with mode 644. A file can contain only comments. They hold server-context directives only:
- `set_real_ip_from` for each `TESTING_TRUSTED_PROXY_CIDRS` entry, plus `real_ip_header X-Forwarded-For; real_ip_recursive on;`
- when `TESTING_ALLOWED_CIDRS` is set: `allow 127.0.0.1; allow ::1;`, then each CIDR, then `deny all;`, in all three files
- `auth_basic` and `auth_basic_user_file /etc/nginx/testing/htpasswd` in the website and admin files only, when `TESTING_BASIC_AUTH_ENABLED=true`. They are never in the api file.

If any CIDR is invalid, nothing is written. With `--reload`, the script runs `nginx -t` and then `nginx -s reload` inside the running `testing-proxy`.

Behind a host proxy, put the `testing_edge` gateway (for example `172.30.118.1`) in `TESTING_TRUSTED_PROXY_CIDRS`. The reason: Docker's port forwarding makes host-originated connections arrive from that address.

## stop-testing.sh

```
sudo ./stop-testing.sh [--down] [SERVICE...]
```

By default it runs `testing_compose stop`, which also stops the tunnel profile containers. With `--down` it runs `down --remove-orphans`, which removes the containers and the project networks. It never removes volumes or images. Exit `0` / `1`.

## update-testing.sh

```
sudo ./update-testing.sh --bundle FILE.tar.gz [--backup-db] [--apply-migrations]
sudo ./update-testing.sh --git-ref <commit>        # repo is a git checkout; dirty tree refused
sudo ./update-testing.sh --restart-only            # after editing api.env / proxy.env
```

Other flags: `--source-dir DIR`, `--skip-build`, `--no-verify`, `--yes`.

The script runs these steps in order:

1. Validates the env.
2. Runs the optional `--backup-db`: `pg_dump -Fc` inside `testing-postgres` writes `data/postgres-backup/testing-pre-update-<ts>.dump`, plus `.sha256` and `.meta`, all with mode 600.
3. Installs the new source. The previous source is kept in `deployment/repo-<ts>`. With `--git-ref`, the previous commit is logged in `history.log` for rollback.
4. Renders the access files.
5. Builds the images.
6. Checks the migration status. If migrations are pending and `--apply-migrations` was not given, the script **stops before recreating** anything, so the running containers keep their old image.
7. Recreates api/worker, admin/website and the proxy. The proxy is always force-recreated. With `--restart-only`, everything is force-recreated.
8. Runs the verification.

Env files are never modified, and volumes are never removed. Exit codes: `0` ok, `1` error, `4` updated but verification found failures.

## teardown-testing.sh (destructive)

```
sudo ./teardown-testing.sh [--keep-backups] [--backups-to DIR] [--keep-images]
```

You must type `DELETE astro_testing <TESTING_ROOT>`. With `--keep-backups`, `data/postgres-backup` is first moved outside the root, to `<parent>/testing-backups-<ts>`.

The script then removes:
- the containers, volumes and networks of the project, through `testing_compose --profile tools --profile tunnel down --volumes --remove-orphans` and then label-based cleanup
- the `astro-testing-*` images. Shared base images (postgres, redis, nginx, cloudflared) are kept.
- `$TESTING_ROOT`, but only after a second path check: the path ends with `/testing`, is not `/` or `/opt/astro-sushil`, is not a symlink, is not inside `/opt/astro-sushil/{app,shared}`, and has no `app/` or `shared/` subdirectory.

The script runs from a temporary copy of itself, because it deletes its own directory.

Before and after the removal, it lists every Docker container, volume, network and image. If anything outside `astro_testing` or `astro-testing-*` disappeared, it reports that and exits 1. Exit `0` removed, `1` error or not confirmed.

`reset-testing-db.sh` (owned by the database scripts) is the narrower tool for wiping only the testing DB.

## create-deployment-bundle.sh (local workstation)

```
infrastructure/testing/scripts/create-deployment-bundle.sh [--ref REF] [--allow-dirty] [--out DIR]
```

The script builds the bundle from `git archive REF`, so untracked and ignored files (`node_modules`, `.env`, `backend.env`, dumps, zips) cannot enter it. It then removes `apps/mobile`, `apps/desktop`, `platform-output`, `test-results`, `tmp`, `docs/referencerepots` (218 MB of reference PDFs, which only code comments refer to), `dist`, and root-level `*.zip` and `*.pdf`.

Next it scans every file for secret patterns:
- `rzp_live_` followed by 14 or more characters
- `AKIA` plus 16 characters (AWS access key ids). The documented fake `AKIA…EXAMPLE` used in unit tests is ignored.
- PEM private key headers. Placeholder headers in `*.example` files are ignored.
- `AIza…` Google API keys
- secret-like file names: `*.env` or `.env*` other than `*.example`, plus `*.pem`, `*.key`, `id_rsa*`, `*.p12` and `*.pfx`

If anything is found, no bundle is written.

Finally it adds `MANIFEST.txt` (bundle, commit, ref, dates, dirty flag, file count). It writes a reproducible `dist/testing-bundles/astro-sushil-testing-<shortsha>-<UTCts>.tar.gz` (sorted, owner 0) plus `.sha256`, and prints the `scp` commands for the bundle and for a DB backup (`chmod 600`).

A dirty tree is refused unless you pass `--allow-dirty`. Even then, the uncommitted changes are listed and are **not** included. Without the testing files (`docker-compose.testing.yml`, `infrastructure/testing/...`) in REF, the bundle is refused. With `--allow-dirty` it is built anyway but marked NOT installable, and install refuses it because it lacks `docker-compose.testing.yml`.
