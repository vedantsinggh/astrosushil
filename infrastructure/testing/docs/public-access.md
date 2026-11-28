# Public access, HTTPS and the testing proxy

How people reach the testing deployment, which modes exist, what works in each,
and how to switch between them. Related files:

- `infrastructure/testing/nginx/testing.conf`: the testing proxy (container `testing-proxy`).
- `infrastructure/testing/env/proxy.env.example`: ports, bind address, basic auth, allowlist.
- `infrastructure/testing/host-proxy/`: snippets for the host's existing Caddy or Nginx, with install and rollback steps.
- `infrastructure/testing/docs/dns-client-instructions.md`: the page to send to the client's domain admin.

`testing_compose` below is the wrapper from `infrastructure/testing/scripts/lib/common.sh`
(source it first). It runs `docker compose` with the project name and env files of the
testing deployment.

## 1. How traffic flows

```
browser ──https──> host Caddy/Nginx (80/443, production's proxy)
                     │ test.D        -> 127.0.0.1:18080 ┐
                     │ admin-test.D  -> 127.0.0.1:18081 ├─> testing-proxy (nginx container)
                     │ api-test.D    -> 127.0.0.1:18082 ┘     8080 website: /      -> testing-website:80
                                                              8080 website: /api/  -> testing-api:3000
browser ──http───> VPS_IP:18080 / :18081 (Mode A only)        8081 admin:   /      -> testing-admin:3000
                                                              8081 admin:   /api/  -> testing-api:3000
cloudflared (profile tunnel) ──> testing-proxy:8080/8081      8082 API only: /     -> testing-api:3000
```

Each frontend calls the API on its own origin (`/api/v1/...`). The frontend images
are built with relative API bases (`VITE_API_URL=/api/v1`, `NEXT_PUBLIC_API_URL=/`),
so changing hostnames never needs a rebuild. Only `env/api.env` and an API restart.

The testing proxy always does the following:

- Basic auth on the website and admin origins (`TESTING_BASIC_AUTH_ENABLED=true`, user
  `TESTING_BASIC_AUTH_USER`). None on the API-only origin, because the mobile app and
  webhook senders cannot do basic auth.
- An optional source-IP allowlist (`TESTING_ALLOWED_CIDRS`) on all three origins.
- `GET /healthz` returns `ok` on every origin, with no auth and no allowlist. Container
  health checks use it.
- `GET /robots.txt` returns `Disallow: /`, and every response carries `X-Robots-Tag: noindex, nofollow, noarchive`.
- An `Authorization: Basic ...` header is removed before a request goes to the API or a
  frontend container. After a visitor passes basic auth, the browser sends it on
  every same-origin request, and the API must not see it. Bearer tokens pass through
  unchanged. Requests to the website/admin origins still need basic auth on `/api/`
  too. The website and admin use cookies, which work alongside it. Anything that sends its
  own `Authorization: Bearer` (the mobile app, scripts) must use the API-only origin.
- The API receives `X-Forwarded-For` / `X-Real-IP` with exactly one address, the real
  client. It also gets `X-Forwarded-Proto`, `X-Forwarded-Host`, the original `Host`, and
  `X-Request-Id` (the client's value if it matches `^[a-zA-Z0-9_-]{8,64}$`, else a
  generated one).
- API upload limit: 55 MB at the proxy. The API's own multipart ceiling is 50 MiB.
  Frontend origins accept 2 MB bodies outside `/api/`. API read timeout is 300 s,
  for on-demand PDF rendering and CSV exports.
- No TLS, no HSTS and no HTTPS redirect in this container. TLS is the host proxy's or
  the tunnel's job. (The API's helmet still sends HSTS on `/api/` responses. Browsers
  ignore it over plain http.)

### Real client IP and the trusted proxy

When the host Caddy/Nginx connects to `127.0.0.1:18080`, Docker's port publishing
delivers the connection to the container from the gateway address of the compose
network, for example `172.18.0.1`. It does not arrive from `127.0.0.1`. Without further
configuration the testing proxy sees that gateway as the client. Then the allowlist
cannot tell visitors apart, and logs and API rate limits see one IP.

Fix: put that gateway in `TESTING_TRUSTED_PROXY_CIDRS`. The render script then turns
it into `set_real_ip_from`, and the proxy takes the client address from the host
proxy's `X-Forwarded-For`.

```bash
docker network inspect astro_testing_testing_edge -f '{{range .IPAM.Config}}{{.Gateway}} {{.Subnet}}{{end}}'
# after one request through the host proxy, the log shows the TCP peer as realip="..."
testing_compose logs --tail 5 testing-proxy 2>&1 | grep -o 'realip="[^"]*"'
```

For Cloudflare tunnels, the tunnel containers connect from their own address on
`testing_edge`, so trust the whole subnet (for example `172.18.0.0/16`). Never trust public
addresses. Visitors on the raw IP (Mode A) keep their real public source address
through Docker's DNAT, so they cannot spoof `X-Forwarded-For`. The same rule covers
`X-Forwarded-Proto`: it is taken from the incoming request only when the TCP peer
is a private/loopback address.

Recommended API setting (in `env/api.env`): `TRUST_PROXY=true`. The API is reachable only through
the testing proxy, and the proxy sends a single, already-verified `X-Forwarded-For` value.

## 2. Mode A: raw IP over plain HTTP

URLs: `http://VPS_IP:18080` (website), `http://VPS_IP:18081` (admin). The API-only port
18082 is never published on the public interface.

Settings: `proxy.env` has `TESTING_BIND_ADDRESS=0.0.0.0`. `api.env` has
`CORS_ORIGIN=http://VPS_IP:18080,http://VPS_IP:18081`, `FRONTEND_URL=http://VPS_IP:18080`,
`ADMIN_URL=http://VPS_IP:18081` and `PUBLIC_API_URL=http://VPS_IP:18080`.

What works:

- Basic-auth prompt, then all website pages, the public catalogue, articles, prices,
  images (served from the testing bucket) and anything else that does not need a login.
- The admin login page renders.
- `/healthz`, and `/api/v1/...` public GET endpoints through the website origin.

What does NOT work:

- Logging in, on both the website and the admin. The testing API runs with
  `NODE_ENV=production`, so `AUTH_COOKIE_SECURE` is forced to `true`. Config refuses to
  start otherwise (`apps/api/src/config/index.ts`). The session cookies (`astro_access`,
  `astro_refresh`, `astro_admin_*`) are therefore `Secure`. Browsers discard `Secure`
  cookies set by an `http://` page unless the host is `localhost`. The login request
  returns 200, but the next request is anonymous again. This is intended. Auth is not
  weakened for HTTP.
- Checkout and payments, the dashboard, report downloads and anything else behind login.
- The mobile app. It needs `https://api-test...`, and plain-HTTP API traffic is blocked
  by Android/iOS defaults anyway.
- Webhooks (Razorpay, WhatsApp): there is no public API origin.

Use Mode A only to show that the stack is up. Restrict it by source IP. Set
`TESTING_ALLOWED_CIDRS=<client office IP>/32,<your IP>/32`, re-run
`render-proxy-access.sh` and restart `testing-proxy`. Also restrict it in the cloud
firewall (below).

### Firewall: what actually controls ports 18080/18081

Docker publishes ports through its own iptables chains (nat `DOCKER`, filter
`DOCKER-USER` / `DOCKER-FORWARD`). That traffic is forwarded, not delivered to `INPUT`, so:

- `ufw` rules do not block or allow Docker-published ports.
- The Oracle Cloud image's `REJECT` rule at the end of `INPUT` (which the VM kit's
  `setup.sh` works around for 80/443) does not affect them either.
- The real gate is the cloud provider's firewall: the Oracle Cloud VCN security list or
  network security group, or AWS/GCP/Hetzner/DigitalOcean cloud firewall rules.

Inspect (read-only):

```bash
sudo ss -ltnp | grep -E ':1808[0-2]'                  # what listens, on which address
sudo ufw status numbered                              # informational for Docker ports
sudo iptables -S INPUT                                # Oracle REJECT rule lives here
sudo iptables -S DOCKER-USER                          # host-side filtering for containers
sudo iptables -t nat -S DOCKER | grep -E '1808[0-2]'  # the DNAT rules Docker created
sudo nft list ruleset | grep -nE '1808[0-2]|DOCKER'   # same view on nftables hosts
```

Open (manual; no script does this):

1. Cloud console: add an ingress rule, TCP, destination ports 18080-18081. Set the source
   to the client's IP `/32` and yours. Avoid `0.0.0.0/0`. On Oracle Cloud the menu path is:
   Networking > Virtual cloud networks > VCN > Security Lists (or the instance's NSG) >
   Add Ingress Rules.
2. Host: normally nothing. If the host filters Docker traffic in `DOCKER-USER`
   (check the `iptables -S DOCKER-USER` output), allow the ports explicitly:

   ```bash
   sudo iptables -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 18080:18081 --ctdir ORIGINAL -s CLIENT_IP/32 -j ACCEPT
   ```

3. From a machine outside the VPS: `curl -sI http://VPS_IP:18080/healthz` should return 200.

Close (do this as soon as HTTPS works):

```bash
# Definitive: stop publishing on the public interface.
#   proxy.env: TESTING_BIND_ADDRESS=127.0.0.1
# then re-create the proxy container through the testing scripts (update/install), or:
#   testing_compose up -d --force-recreate testing-proxy
sudo ss -ltnp | grep -E ':1808[0-2]'          # must show 127.0.0.1 only
```

Then remove the cloud ingress rule. Also delete any `DOCKER-USER` rule you added:
run `sudo iptables -S DOCKER-USER`, then `sudo iptables -D DOCKER-USER <same rule spec>`.

## 3. Temporary HTTPS before the client's domain is ready

Logging in needs HTTPS. The options below are ordered by preference.

### Option 1 (recommended): a free hostname you control + the existing host proxy

Example with DuckDNS (free, sign-in with a GitHub/Google account):

1. Create `NAME.duckdns.org` and set its IPv4 to the VPS public IP in the DuckDNS web UI.
2. DuckDNS answers for every name under it. `test.NAME.duckdns.org`,
   `admin-test.NAME.duckdns.org` and `api-test.NAME.duckdns.org` all resolve to the same
   IP with no extra setup. Check: `dig +short test.NAME.duckdns.org`.
3. Install the host-proxy snippet with `example.com` replaced by `NAME.duckdns.org`
   (`infrastructure/testing/host-proxy/README.md`). Caddy obtains Let's Encrypt
   certificates for the three names automatically.
4. Continue with "After HTTPS works" (section 5).

Notes:

- `duckdns.org` is on the Public Suffix List. `NAME.duckdns.org` is therefore its own
  registrable domain (Let's Encrypt rate limits count per `NAME.duckdns.org`), and the
  three testing hosts are "same-site" with each other. That barely matters here. The
  session cookies are host-only (`AUTH_COOKIE_DOMAIN` unset), every browser call is
  same-origin, and user and admin cookies have different names. The mobile app does not
  use cookies.
- Production is unaffected. The testing sites live in a separate file, reached through one
  `import` line, with a backup, `caddy validate` before reload, and a documented rollback.
- DuckDNS is a free community service without an SLA. Fine for a demo, not for anything
  long-lived. Any other DNS name you control works the same way.

### Option 2: Cloudflare quick tunnels (compose profile `tunnel`)

The services `testing-tunnel-website` and `testing-tunnel-admin` run `cloudflared`. They
open an outbound connection to Cloudflare and get random `https://<words>.trycloudflare.com`
URLs that forward to `testing-proxy:8080` / `:8081`.

Pros: no DNS, no inbound port, no change to the host proxy. HTTPS works at once, so
login works. Basic auth and the allowlist still apply at the testing proxy. For
the allowlist, trust the `testing_edge` subnet (section 1) so the real IP from
Cloudflare's `X-Forwarded-For` is used.

Cons:

- The URLs are random and change whenever a tunnel container restarts. Every change needs a
  `CORS_ORIGIN` update and an API restart.
- No SLA. Quick tunnels are meant for testing and are subject to Cloudflare's terms.
- No API-only tunnel, so the mobile app and webhooks cannot use this mode.
- All traffic, including basic-auth credentials and session cookies, passes through
  Cloudflare's network, decrypted at their edge.

Steps:

```bash
testing_compose --profile tunnel up -d testing-tunnel-website testing-tunnel-admin
testing_compose logs testing-tunnel-website testing-tunnel-admin 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | sort -u
```

Then set `CORS_ORIGIN=https://<website-words>.trycloudflare.com,https://<admin-words>.trycloudflare.com`,
plus `FRONTEND_URL`, `ADMIN_URL` and `PUBLIC_API_URL` (use the website tunnel URL) in
`env/api.env`, and restart `testing-api` and `testing-worker`. With `NODE_ENV=production`,
the API does NOT automatically trust `*.trycloudflare.com`. That exception exists only in
development. Stop with `testing_compose --profile tunnel stop testing-tunnel-website testing-tunnel-admin`.

### Option 3: IP-embedding wildcard DNS (sslip.io, nip.io)

Names such as `test.203-0-113-10.sslip.io` resolve to the embedded IP, with no account
needed. They work with the host proxy exactly like option 1. Caveats: you depend on a
third-party DNS service. The hostname contains the VPS IP. Let's Encrypt issuance can
fail or be rate-limited when many users share the same parent domain at the same time.
Whether that happens depends on how the service is listed in the Public Suffix List and
on current usage, so treat issuance as best-effort. Use it only if option 1 is not possible.

### Option 4 (rejected): self-signed certificate on the testing proxy

Every browser shows a full-page warning that the client would have to click through.
The Flutter app refuses the connection unless it is rebuilt to trust the certificate.
It also teaches people to ignore certificate warnings. Not used.

### Recommendation

- Option 1, if adding one separate site file plus one `import` line to the production
  Caddy is acceptable. It behaves exactly like the final client-domain setup (Mode B),
  so nothing changes later except the hostnames.
- Option 2, for a short one-off demo when the production proxy must not be touched.

## 4. Mode B: the client's domain

Hostnames: `test.CLIENT_DOMAIN`, `admin-test.CLIENT_DOMAIN`, `api-test.CLIENT_DOMAIN`.
Send `dns-client-instructions.md` to the client's domain admin.

DNS records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `test` | VPS public IPv4 | 300 |
| A | `admin-test` | VPS public IPv4 | 300 |
| A | `api-test` | VPS public IPv4 | 300 |
| AAAA | (same three) | VPS IPv6 | 300 |

Add AAAA records only if the VPS has working public IPv6 AND the host proxy listens on
it (`sudo ss -ltnp | grep ':443'` shows `[::]:443`), and IPv6 is allowed in the cloud
firewall. A wrong AAAA record breaks access for IPv6 visitors and can break certificate
issuance. If in doubt, leave AAAA out.

If the domain has CAA records (`dig +short CAA CLIENT_DOMAIN`), one of them must allow
`letsencrypt.org`, or certificates cannot be issued.

Certificates:

- Caddy: issued on the first reload after the site file is installed, renewed automatically.
  Watch with `journalctl -u caddy -f`.
- Nginx + certbot: see `host-proxy/README.md`. Check renewal with `systemctl list-timers | grep certbot`
  and `sudo certbot renew --dry-run --cert-name astro-testing`.

Then follow section 5. No frontend rebuild is needed.

## 5. After HTTPS works (temporary domain or client domain)

1. `env/api.env` (D = `NAME.duckdns.org` or `CLIENT_DOMAIN`):

   ```
   CORS_ORIGIN=https://test.D,https://admin-test.D
   FRONTEND_URL=https://test.D
   ADMIN_URL=https://admin-test.D
   PUBLIC_API_URL=https://api-test.D
   TRUST_PROXY=true
   ```

   `CORS_ORIGIN` lists the origins in the browser's address bar. The API sets session cookies only
   for those origins. The mobile app sends no `Origin`, so it needs no entry.
   Keep the old Mode A entries only while raw-IP access is still wanted.
2. `env/proxy.env`: set `TESTING_TRUSTED_PROXY_CIDRS` to the gateway address (section 1),
   `TESTING_PUBLIC_*_URL` to the new URLs, and `TESTING_BIND_ADDRESS=127.0.0.1` to close
   raw-IP access.
3. Re-run `render-proxy-access.sh` and re-create `testing-proxy`. Restart `testing-api` and
   `testing-worker` so they pick up `api.env`. Run `verify-testing.sh`.
4. Close the Mode A cloud firewall rule (section 2).
5. Mobile app: point the testing build at `https://api-test.D/api/v1`. Do not use
   `https://test.D/api/v1`: that origin has basic auth, which the app cannot answer. The
   API-only origin has no basic auth (allowlist only, if configured). Webhook URLs for
   Razorpay test mode and WhatsApp go to `https://api-test.D/api/v1/webhooks/...` for the
   same reason.

## 6. Cookie / CORS matrix

| Mode | Browser origin | `CORS_ORIGIN` must contain | Session cookies | Login |
|---|---|---|---|---|
| A raw IP | `http://VPS_IP:18080`, `:18081` | both http origins | Set as `Secure`, dropped by the browser | No |
| 1 temp domain | `https://test.NAME.duckdns.org`, `https://admin-test...` | both https origins | Host-only, `Secure`, `SameSite=Lax` | Yes |
| 2 tunnel | `https://<random>.trycloudflare.com` (x2) | both current tunnel URLs | Host-only, `Secure`, `SameSite=Lax` | Yes |
| B client domain | `https://test.CLIENT_DOMAIN`, `https://admin-test...` | both https origins | Host-only, `Secure`, `SameSite=Lax` | Yes |
| Mobile app | none (no `Origin`) | nothing | Not used (Bearer tokens) | Yes, via `api-test` only |

All browser calls are same-origin (`/api/v1` on the page's own host), so CORS
preflights do not happen. `CORS_ORIGIN` matters because the API sets cookies and
accepts CSRF-protected requests only from listed origins.

## 7. Rollback summary

| Change | Undo |
|---|---|
| Caddy site file | `sudo rm /etc/caddy/sites/astro-testing.caddy && sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl reload caddy` (optionally restore `Caddyfile.bak-astro-testing`) |
| Nginx site files | `sudo rm /etc/nginx/sites-enabled/astro-testing*.conf && sudo nginx -t && sudo systemctl reload nginx` |
| Tunnels | `testing_compose --profile tunnel stop testing-tunnel-website testing-tunnel-admin`, remove the URLs from `CORS_ORIGIN`, restart the API |
| Mode A exposure | `TESTING_BIND_ADDRESS=127.0.0.1`, re-create `testing-proxy`, remove the cloud ingress rule |
| Client DNS | The client deletes the three records (see `dns-client-instructions.md`) |

## 8. Troubleshooting

| Symptom | Likely cause and check |
|---|---|
| Login returns 200 but you are logged out again at once | Plain `http://` (Mode A), so Secure cookies are dropped. Or the page's origin is not in `CORS_ORIGIN`, so no `Set-Cookie` is sent. Check: browser devtools > Network > login response > `Set-Cookie`. Compare `grep CORS_ORIGIN env/api.env` with the address bar exactly (scheme, host, no trailing path). |
| 403 "Invalid or missing CSRF token" on POST | Same `CORS_ORIGIN` mismatch, or a stale cookie from another hostname. Clear the site's cookies and log in again. |
| Basic-auth prompt keeps coming back (401 loop) | Wrong password, or a browser extension/script sending its own `Authorization` to the frontend origin. Test with `curl -u client:PASS -sI https://test.D/`. Regenerate the password through the install script if it is lost. |
| Mobile app gets 401 with an HTML body | It is calling the website origin. Use `https://api-test.D/api/v1`. |
| 403 from nginx (HTML) | Allowlist (`TESTING_ALLOWED_CIDRS`). Behind a host proxy, check that `TESTING_TRUSTED_PROXY_CIDRS` holds the gateway, otherwise everyone appears as `172.x.0.1`. Look at `realip=` and the first field of the proxy log line. |
| 502 JSON `UPSTREAM_UNAVAILABLE` / "starting or unavailable" | API/frontend container down or restarting. Run `testing_compose ps` and `testing_compose logs --tail 50 testing-api`. The proxy re-resolves names every 10 s and recovers by itself. |
| 502 from Caddy/Nginx itself | The testing proxy is not listening on `127.0.0.1:1808x`: `ss -ltnp \| grep 1808` and `curl -s http://127.0.0.1:18080/healthz`. |
| 413 `PAYLOAD_TOO_LARGE` | Upload above 55 MB, or above 2 MB to a non-`/api/` path. Per-purpose limits in the API are smaller (for example 10 MB for images). |
| Caddy: certificate not obtained | DNS not yet pointing here (`dig +short test.D @1.1.1.1`), port 80/443 blocked in the cloud firewall, a CAA record without `letsencrypt.org`, or rate limits after many failed tries. Run `journalctl -u caddy --since "30 min ago" \| grep -i acme`. |
| certbot fails | Same causes. Also check that the port 80 block (`astro-testing-http.conf`) is enabled, and that `curl http://test.D/.well-known/acme-challenge/x` reaches it (404 from nginx, not a redirect). |
| Hostname resolves to the old/wrong IP | DNS propagation. Compare `dig +short test.D @1.1.1.1` and `@8.8.8.8` with `dig +short test.D`. With TTL 300, wait 5-10 minutes after the record is correct at the authoritative server (`dig +short NS CLIENT_DOMAIN`, then query one of those). |
| `docker compose up` fails: "port is already allocated" / "address already in use" | Something else uses 18080-18082. Find it with `sudo ss -ltnp \| grep -E ':1808[0-2]'`, then change `TESTING_*_PORT` in `proxy.env` and the host-proxy snippet to match. |
| Pages load but are indexed / previewed by bots | They should not be. Check `curl -sI https://test.D/ \| grep -i x-robots` and `/robots.txt`. |
