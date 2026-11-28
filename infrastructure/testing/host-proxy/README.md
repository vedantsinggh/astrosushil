# Host reverse-proxy snippets for the testing deployment

These files connect HTTPS hostnames on the VPS's EXISTING reverse proxy (the one
that already owns ports 80/443 for production) to the testing proxy container.
Nothing here is installed by any script. Every step below is done by hand, by
someone who can roll it back.

| File | Installs as | Purpose |
|---|---|---|
| `caddy/astro-testing.caddy.example` | `/etc/caddy/sites/astro-testing.caddy` | Three Caddy sites with automatic Let's Encrypt |
| `nginx/astro-testing-http.conf.example` | `/etc/nginx/sites-available/astro-testing-http.conf` | Port 80: ACME webroot + redirect to HTTPS |
| `nginx/astro-testing.conf.example` | `/etc/nginx/sites-available/astro-testing.conf` | Port 443: three TLS server blocks |

Hostnames in the files are `test.example.com`, `admin-test.example.com` and
`api-test.example.com`. Replace `example.com` with your base domain
(`NAME.duckdns.org` for a temporary domain, or the client's domain).

Upstreams (published by `docker-compose.testing.yml` on loopback):

| Hostname | Upstream | Testing proxy port |
|---|---|---|
| `test.<domain>` | `127.0.0.1:18080` | website (+ `/api/` same origin) |
| `admin-test.<domain>` | `127.0.0.1:18081` | admin (+ `/api/` same origin) |
| `api-test.<domain>` | `127.0.0.1:18082` | API only (mobile app, webhooks) |

Before you start:

1. DNS for all three names already points at this VPS (`dig +short test.<domain>`).
2. The testing stack is running and `curl -s http://127.0.0.1:18080/healthz` prints `ok`.
3. Ports 80 and 443 are reachable from the internet (production already needs this).

Afterwards, continue with "After HTTPS works" in
[`../docs/public-access.md`](../docs/public-access.md) (CORS_ORIGIN, bind address, trusted proxy).

---

## Caddy (production VM kit layout)

`infrastructure/deployment/vm/setup.sh` writes a single `/etc/caddy/Caddyfile`
with one site block (the production domain, or `:80` when no domain was given)
and an optional global `{ email ... }` block. It has NO `import` line. Adding the
testing sites therefore needs one extra line in that file; nothing else in it changes.

Re-running `setup.sh` regenerates the Caddyfile and drops the import line. The
testing sites then disappear until you add the line again (step 3).

### Install

```bash
# 1. Back up the current config (keep this file until the testing setup is removed).
sudo cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-astro-testing

# 2. Put the testing sites in their own file.
sudo mkdir -p /etc/caddy/sites
sed 's/example\.com/NAME.duckdns.org/g' \
  /opt/astro-sushil/testing/repo/infrastructure/testing/host-proxy/caddy/astro-testing.caddy.example \
  | sudo tee /etc/caddy/sites/astro-testing.caddy >/dev/null
grep -n 'example.com' /etc/caddy/sites/astro-testing.caddy   # must print nothing

# 3. Add ONE import line at the end of the Caddyfile (only if it is not there yet).
grep -qxF 'import /etc/caddy/sites/*.caddy' /etc/caddy/Caddyfile \
  || printf '\nimport /etc/caddy/sites/*.caddy\n' | sudo tee -a /etc/caddy/Caddyfile >/dev/null

# 4. Validate BEFORE reloading. If this fails, run the rollback below.
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# 5. Reload (graceful; production keeps serving).
sudo systemctl reload caddy
sudo journalctl -u caddy --since "5 min ago" --no-pager | grep -iE 'error|certificate|obtain' | tail -20
```

### Verify

```bash
curl -sI http://test.NAME.duckdns.org/ | head -3        # expect 308 -> https://
curl -s  https://test.NAME.duckdns.org/healthz          # expect: ok
curl -sI https://test.NAME.duckdns.org/ | head -1       # expect 401 (basic auth)
curl -s  https://api-test.NAME.duckdns.org/health       # API health JSON
curl -sI https://api.astrosushil.com/health | head -1   # production still answers (use your prod host)
```

If the production Caddyfile is the IP-only `:80 { ... }` variant, check the first
command returns a redirect. If it does not, the catch-all `:80` site is answering
instead; add an explicit block to `astro-testing.caddy`:

```
http://test.NAME.duckdns.org, http://admin-test.NAME.duckdns.org, http://api-test.NAME.duckdns.org {
	redir https://{host}{uri} 308
}
```

Certificates are issued on the first reload and renewed automatically by Caddy.
Nothing else to schedule.

### Rollback

```bash
sudo rm -f /etc/caddy/sites/astro-testing.caddy
# Either keep the (now harmless) import line, or restore the backup:
sudo cp -a /etc/caddy/Caddyfile.bak-astro-testing /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl reload caddy
```

`import` with a glob that matches no file is valid, so removing only the site file
is enough to take the testing hostnames offline.

---

## Nginx (if the host proxy is Nginx instead of Caddy)

Uses the Debian/Ubuntu `sites-available` / `sites-enabled` layout. Never edit
`/etc/nginx/nginx.conf`. If the host has IPv6 disabled, delete the `listen [::]:...`
lines from both files.

### Install

```bash
REPO=/opt/astro-sushil/testing/repo/infrastructure/testing/host-proxy/nginx
DOMAIN=NAME.duckdns.org          # or the client's domain

# 1. Port 80 block first (ACME webroot + redirect). Stays installed permanently.
sudo mkdir -p /var/www/letsencrypt
sed "s/example\.com/$DOMAIN/g" "$REPO/astro-testing-http.conf.example" \
  | sudo tee /etc/nginx/sites-available/astro-testing-http.conf >/dev/null
sudo ln -s /etc/nginx/sites-available/astro-testing-http.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 2. One certificate for the three names (does not touch any nginx file).
sudo certbot certonly --webroot -w /var/www/letsencrypt --cert-name astro-testing \
  -d "test.$DOMAIN" -d "admin-test.$DOMAIN" -d "api-test.$DOMAIN"

# 3. HTTPS blocks.
sed "s/example\.com/$DOMAIN/g" "$REPO/astro-testing.conf.example" \
  | sudo tee /etc/nginx/sites-available/astro-testing.conf >/dev/null
sudo ln -s /etc/nginx/sites-available/astro-testing.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Do not use `certbot --nginx` here: it rewrites nginx files, including production ones.

### Renewal

```bash
systemctl list-timers | grep -i certbot       # the packaged timer must be listed
sudo certbot renew --dry-run --cert-name astro-testing
```

Renewal reuses the webroot. To make nginx load the renewed certificate, add a
deploy hook once:

```bash
printf '#!/bin/sh\nsystemctl reload nginx\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Check first that the directory does not already contain an equivalent hook.

### Rollback

```bash
sudo rm -f /etc/nginx/sites-enabled/astro-testing.conf /etc/nginx/sites-enabled/astro-testing-http.conf
sudo nginx -t && sudo systemctl reload nginx
# Optional, after the testing setup is gone for good:
sudo certbot delete --cert-name astro-testing
sudo rm -f /etc/nginx/sites-available/astro-testing.conf /etc/nginx/sites-available/astro-testing-http.conf
```
