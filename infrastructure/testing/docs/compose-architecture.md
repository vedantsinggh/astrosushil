# Testing stack: Compose architecture

File: `docker-compose.testing.yml` (repo root). Compose project name: `astro_testing`.
The production backend does not use this file. Production runs on the pm2 + Caddy VM kit (`infrastructure/deployment/vm`).

Always run the file through `testing_compose` (`infrastructure/testing/scripts/lib/common.sh`):

```
TESTING_ROOT=/opt/astro-sushil/testing docker compose --project-name astro_testing \
  --env-file $TESTING_ROOT/env/build.env --env-file $TESTING_ROOT/env/proxy.env \
  -f $TESTING_ROOT/repo/docker-compose.testing.yml <cmd>
```

`TESTING_ROOT`, `TESTING_WEBSITE_API_URL` and `TESTING_ADMIN_API_URL` are required. If one is missing, compose stops with an error before it builds or starts anything.

## Service map

| Service | Image | Networks | Host ports | Depends on (healthy) | Profile |
|---|---|---|---|---|---|
| `testing-postgres` | `postgres:16-alpine` | backend | none | none | default |
| `testing-redis` | `redis:7-alpine` (no persistence) | backend | none | none | default |
| `testing-migrate` | `astro-testing-api:$TAG` | backend | none | postgres | `tools` |
| `testing-api` | `astro-testing-api:$TAG` (builds it) | backend, edge | none | postgres, redis | default |
| `testing-worker` | `astro-testing-api:$TAG` | backend, edge | none | postgres, redis | default |
| `testing-admin` | `astro-testing-admin:$TAG` | edge | none | none | default |
| `testing-website` | `astro-testing-website:$TAG` | edge | none | none | default |
| `testing-proxy` | `nginx:1.28.0-alpine` | edge | see below | api, admin, website | default |
| `testing-tunnel-website` | `cloudflare/cloudflared` (pinned) | edge | none | proxy | `tunnel` |
| `testing-tunnel-admin` | `cloudflare/cloudflared` (pinned) | edge | none | proxy | `tunnel` |

`$TAG` is `TESTING_IMAGE_TAG` (default `local`). Only `testing-api` has a `build:` section for the API image. `testing-worker` and `testing-migrate` reuse that image with `pull_policy: never`, so build it first: `testing_compose build`.

Published ports (proxy only):

| Container port | Host binding | Purpose |
|---|---|---|
| 8080 | `${TESTING_BIND_ADDRESS:-0.0.0.0}:${TESTING_WEBSITE_PORT:-18080}` | website + `/api/` (basic auth) |
| 8081 | `${TESTING_BIND_ADDRESS:-0.0.0.0}:${TESTING_ADMIN_PORT:-18081}` | admin + `/api/` (basic auth) |
| 8082 | `127.0.0.1:${TESTING_API_PORT:-18082}` | API only (mobile app), host-local only |

Set `TESTING_BIND_ADDRESS=127.0.0.1` when a host proxy (Caddy/Nginx) serves the testing hostnames.

### Process details

- **API**: `node dist/server.js` with working dir `/app/apps/api`. This is the same command as the image CMD (`npm run start --workspace=apps/api`), but without npm in between, so SIGTERM reaches node directly. The config reads `.env` from the working dir. No `.env` exists in the image, because `.dockerignore` excludes it. All settings come from `env_file`.
- **Worker**: `node apps/api/dist/worker.js` with working dir `/app`. `init: true` reaps the `xelatex`, `pdftoppm` and `gs` child processes. `stop_grace_period: 45s` gives in-flight reports time to release their claims (see `worker.ts` shutdown).
- **Migrate**: default command `npx prisma migrate deploy --schema prisma/schema.prisma`, working dir `/app/apps/api`. The Prisma CLI is in the image, because the builder stage keeps dev dependencies. To use another Prisma command, override it, for example `testing_compose run --rm testing-migrate npx prisma migrate status --schema prisma/schema.prisma`. The service is on the internal network only, and `CHECKPOINT_DISABLE=1` stops Prisma's update check.
- **Admin**: `next start` listens on port 3000 and host 0.0.0.0 (Next 16 default, `PORT` env). The API base is baked in at build time from build arg `NEXT_PUBLIC_API_URL=${TESTING_ADMIN_API_URL}` (`/` = same origin).
- **Website**: a static Vite build served by nginx on port 80. The API base is baked in at build time from build arg `VITE_API_URL=${TESTING_WEBSITE_API_URL}` (`/api/v1`). The build context is `apps/website`, so `apps/website/.dockerignore` applies.

### Environment forced on api, worker and migrate

These values override `$TESTING_ROOT/env/api.env`:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` / `PORT` | `0.0.0.0` / `3000` |
| `REPORT_INSTANT_EXECUTION` | `false` (reports run in the worker only) |
| `STORAGE_LOCAL_DIR` | `/var/lib/astro-sushil/storage` (volume `testing_storage`) |
| `REDIS_URL` | `redis://testing-redis:6379/0` |
| `TRUST_PROXY` | `${TESTING_EDGE_SUBNET:-172.30.118.0/24}` |
| `CHECKPOINT_DISABLE` | `1` |
| `NODE_OPTIONS` | `--max-old-space-size=<heap MB>` (api and worker only) |

`DATABASE_URL` and all other settings live in `api.env`.

**TRUST_PROXY choice.** `apps/api/src/app.ts` passes `TRUST_PROXY` through to Fastify as a string, except for the value `true`. Fastify accepts an IP/CIDR string or a comma-separated list. The `testing_edge` network gets a fixed subnet, and the API trusts exactly that CIDR. So `request.ip` (rate limiting, audit logs) comes from `X-Forwarded-For` only when the request arrives from a container on the edge network, which in practice means the testing proxy. Direct clients cannot spoof the header, because nothing outside Docker reaches the API port. The admin, website and tunnel containers are also on this subnet. They are our own images, and they do not call the API with forged headers.

## Networks

| Network | Type | Members | Notes |
|---|---|---|---|
| `testing_backend` | `internal: true` | postgres, redis, migrate, api, worker | no route to the internet |
| `testing_edge` | bridge, fixed subnet `TESTING_EDGE_SUBNET` | proxy, api, worker, admin, website, tunnels | egress allowed (S3/R2, Razorpay, messaging, LLM) |

If `172.30.118.0/24` collides with an existing network on the VPS, change `TESTING_EDGE_SUBNET` in `build.env`. Check first with `ip route` and `docker network inspect $(docker network ls -q)`. The network must be recreated to take a new subnet (`testing_compose down`, then `up`).

## Volumes and bind mounts

| Name | Mount | Contents |
|---|---|---|
| `testing_pgdata` (volume) | postgres `/var/lib/postgresql/data` (`PGDATA=.../pgdata`) | testing database |
| `testing_storage` (volume) | api + worker `/var/lib/astro-sushil/storage` | reserved; production mode uses the testing bucket |
| `$TESTING_ROOT/data/postgres-backup` | postgres `/backups` (ro) | dumps for `restore-testing-db.sh` |
| `repo/infrastructure/testing/nginx/testing.conf` | proxy `/etc/nginx/conf.d/default.conf` (ro) | static proxy config |
| `$TESTING_ROOT/nginx` | proxy `/etc/nginx/testing` (ro) | generated access files + htpasswd |

Redis has no volume and no persistence (`--save "" --appendonly no`). A restart empties it, which is acceptable because Redis only holds locks and caches.

## Health checks

| Service | Check | Interval / start period | What it proves |
|---|---|---|---|
| postgres | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` | 10s / 30s | server accepts connections |
| redis | `redis-cli ping` | 10s / 5s | server answers |
| api | `node -e fetch('http://127.0.0.1:3000/health')` (2xx) | 15s / 40s | HTTP server alive (liveness) |
| worker | node script: a process with `dist/worker.js` in its cmdline exists **and** a TCP connect to `testing-postgres:5432` succeeds | 30s / 40s | process alive + DB reachable; **not** that the claim loop makes progress |
| admin | `node -e fetch('http://127.0.0.1:3000/', {redirect:'manual'})`, status < 500 | 20s / 30s | Next server answers |
| website | `wget -q -O /dev/null http://127.0.0.1/` | 20s / 10s | nginx serves index.html |
| proxy | `wget -q -O /dev/null http://127.0.0.1:8080/healthz` | 15s / 10s | proxy up (`/healthz` has no basic auth) |

The API image (Debian slim) has no curl or wget, so its checks use the global `fetch` in Node 20. The alpine nginx images include busybox `wget`.

The API health check uses `/health` on purpose. With `/ready`, a database without migrations would keep the API unhealthy, and the proxy would never start. `verify-testing.sh` checks `/ready` (database + queue) through the proxy.

The worker exposes no HTTP endpoint, and it writes heartbeats only while it runs a job (lease renewal in `report-worker.service.ts`). A check of real loop progress would need a code change. That is not in scope, so the check stays honest about what it proves.

Docker without Swarm does not restart unhealthy containers. Health status gates `depends_on` and shows in `testing_compose ps`. A crashed process restarts through `restart: unless-stopped`.

## Resource limits and sizing

Limits use `deploy.resources.limits`, which Compose v2 applies without Swarm. Every value can be overridden in `build.env`.

| Service | Memory limit (var, default) | CPU (var, default) | Node heap | Typical RSS (estimate) |
|---|---|---|---|---|
| postgres | `TESTING_POSTGRES_MEM_LIMIT` 512m | `TESTING_POSTGRES_CPUS` 1.0 | n/a | 60-200 MB |
| redis | `TESTING_REDIS_MEM_LIMIT` 96m (`maxmemory` 64mb) | 0.25 | n/a | 5-20 MB |
| api | `TESTING_API_MEM_LIMIT` 512m | 1.0 | `TESTING_API_NODE_HEAP_MB` 384 | 150-300 MB |
| worker | `TESTING_WORKER_MEM_LIMIT` 1536m | 1.5 | `TESTING_WORKER_NODE_HEAP_MB` 768 | 150-300 MB idle; peak see below |
| admin | `TESTING_ADMIN_MEM_LIMIT` 384m | 0.5 | `TESTING_ADMIN_NODE_HEAP_MB` 256 | 120-250 MB |
| website | `TESTING_WEBSITE_MEM_LIMIT` 64m | 0.25 | n/a | 5-15 MB |
| proxy | `TESTING_PROXY_MEM_LIMIT` 64m | 0.5 | n/a | 5-15 MB |
| tunnel (each, optional) | `TESTING_TUNNEL_MEM_LIMIT` 128m | 0.25 | n/a | 20-40 MB |
| migrate (one-shot) | `TESTING_MIGRATE_MEM_LIMIT` 512m | 1.0 | n/a | 100-200 MB while it runs |

**PDF generation peak (worker).** Node holds the report pipeline data, and `xelatex` runs as a child process with fontspec and Noto/TeX Gyre fonts. After that, `pdftoppm` and `ghostscript` run for the PDF QA. Expect about 600 MB to 1.2 GB in total for one report. The worker handles one job at a time. The 1536m limit gives headroom. If the kernel kills a process on OOM, the report fails and is requeued by the stale-lease recovery.

**Totals.** The sum of the limits with tunnels off is about 3.1 GB, and the realistic steady state is about 0.8-1.3 GB. Plan for at least **4 GB RAM** on the VPS for this stack, plus whatever already runs there. Keep about **1 GB free RAM** as a margin above the summed limits of everything on the host. On a 2 GB VPS, use lightweight mode.

**Disk (estimates; measure after the first build with `docker system df` and `docker image ls astro-testing-*`):**

| Item | Estimate |
|---|---|
| `astro-testing-api` image (Node 20 slim + texlive-xetex/latex-extra + Noto + full monorepo node_modules) | 2.5-3.5 GB |
| `astro-testing-admin` image (Node 20 slim + monorepo node_modules + `.next`) | 1.2-1.8 GB |
| `astro-testing-website` image | 50-80 MB |
| postgres, redis, nginx, cloudflared base images | about 0.4 GB |
| Build cache during builds | 2-4 GB (temporary; `docker builder prune` only by explicit choice) |
| `testing_pgdata` | depends on the restored dump; usually several hundred MB |
| Container logs | at most 30 MB per service (json-file 10m x 3) |

Keep at least **12 GB free disk** before the first build, and at least 5 GB for each rebuild.

## Lightweight mode

For a small VPS or idle periods, try these options:

1. **Lower limits** in `build.env`, then apply them with `testing_compose up -d`:
   `TESTING_API_MEM_LIMIT=384m` with `TESTING_API_NODE_HEAP_MB=256`, `TESTING_ADMIN_MEM_LIMIT=256m` with `TESTING_ADMIN_NODE_HEAP_MB=192`, `TESTING_POSTGRES_MEM_LIMIT=384m`.
   Do not set the worker below `1024m`, because PDF builds then risk OOM.
2. **Run the worker only when reports are needed.** Stop it with `testing_compose stop testing-worker` and start it with `testing_compose start testing-worker`. While it is stopped, report requests stay `QUEUED`, and they are picked up when the worker starts. Scheduled jobs (Rashi Bhavishya, messaging outbox, invoice recovery) also pause while it is stopped.
3. **Stop admin when nobody uses it:** `testing_compose stop testing-admin`. A stopped dependency does not stop the proxy, which is already running. Only a fresh `up` waits for admin to be healthy. To start the stack without admin, use `testing_compose up -d --no-deps testing-proxy` after the other services are up.
4. **Leave the `tunnel` profile off** unless quick tunnels are the chosen HTTPS route.

Lightweight mode needs about 1.3 GB of limits for postgres, redis, api, website and proxy, plus 1 GB or more while the worker runs.

## Logging and restart

Every service uses json-file logging with `max-size 10m` and `max-file 3` (`x-logging` anchor). Long-running services use `restart: unless-stopped`, and `testing-migrate` uses `restart: "no"`.

## Dockerfile changes made for this stack

- `apps/admin/Dockerfile`: new optional `ARG NEXT_PUBLIC_API_URL`, exported only when it is non-empty in the `npm run build:admin` step. If the arg is unset or empty, the variable stays unset, which is identical to the previous build (the app falls back to its default). `ENV` is not used, because `ENV X=$X` with an unset ARG would produce an empty string.
- `apps/website/Dockerfile`: the hardcoded `ENV VITE_API_URL=https://backend.astrosushil.com/api/v1` became `ARG VITE_API_URL=<same default>` plus `ENV VITE_API_URL=$VITE_API_URL`. A build without the arg is unchanged. The testing stack always passes the arg.
- `apps/api/Dockerfile`: unchanged.
- Root `.dockerignore`: now also excludes `*.env`, `backend.env`, `astro-sushil-backend.env`, `*.zip`, `platform-output`, `test-results`, `tmp`, `apps/mobile`, `apps/desktop` and `apps/website`. No root-context image (api, worker, admin, CI builds) copies any of these. `packages/`, `apps/api`, `apps/admin`, `tsconfig.base.json`, `package*.json` and `apps/api/prisma` are still included.
- `apps/website/.dockerignore`: now also excludes `*.env`, `*.zip`, `tmp/` and `test-results/` (`node_modules`, `dist` and `.env*` were already excluded).
