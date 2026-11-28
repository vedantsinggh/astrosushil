# DNS records for the Astro Sushil testing site

This page is for whoever manages the DNS for **CLIENT_DOMAIN** (for example, at your
registrar or DNS provider). We ask for three new records so that a private test copy of
the website, the admin panel and the app server can run on our test server with
proper HTTPS.

Your live website, email and existing records are not affected. You do not need to
give us any login to your registrar or DNS account.

## Records to add

Replace `VPS_IPV4` with the address we sent you: **`___.___.___.___`**

| Type | Name / Host | Value / Points to | TTL |
|---|---|---|---|
| A | `test` | `VPS_IPV4` | 300 (5 minutes) |
| A | `admin-test` | `VPS_IPV4` | 300 |
| A | `api-test` | `VPS_IPV4` | 300 |

Notes:

- In the "Name" field, most DNS panels want only the part before your domain (`test`),
  not `test.CLIENT_DOMAIN`. Some panels show the full name automatically.
- If the panel has a "proxy" or "CDN" switch (for example Cloudflare's orange cloud),
  set it to **DNS only** (grey cloud) for these three records.
- Do not add AAAA (IPv6) records unless we send you an IPv6 address as well.
- If your domain has **CAA** records, please make sure one of them allows
  `letsencrypt.org`. Without it, the free HTTPS certificate cannot be issued. If you
  have no CAA records, there is nothing to do.

## Please do NOT change

- Nameservers (NS records) or the registrar settings.
- MX, SPF, DKIM, DMARC or any other email-related records.
- The records for your main website (`@`, `www`) or any existing subdomain.
- Domain transfer, lock or renewal settings.

## How to check it worked

After saving, wait 5 to 30 minutes. Then either:

- Open <https://dnschecker.org> and look up `test.CLIENT_DOMAIN` (type A). It should
  show `VPS_IPV4` in most locations. Do the same for `admin-test` and `api-test`.
- Or, on a computer with a terminal:

  ```
  nslookup test.CLIENT_DOMAIN
  nslookup admin-test.CLIENT_DOMAIN
  nslookup api-test.CLIENT_DOMAIN
  ```

  Each should answer with `VPS_IPV4`.

Then tell us. We finish the HTTPS setup on our side. You do not need to do anything else.

## How to remove it later

When testing is over, delete the three A records `test`, `admin-test` and
`api-test` (and the AAAA records, if you added any). Nothing else needs to be undone.
We will let you know when it is safe to delete them.
