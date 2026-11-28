# Testing: initialise the invoice counter

Invoice numbers are one shared series `INV-AS/<n>` for every sale type (product orders,
consultations, reports). The counter is the single row `invoice_counters.key = 'INV-AS'`. Until it
exists no number is issued: paid sales stay "Invoice being prepared" (`invoices.status = PENDING`)
and the payment still succeeds. Design and rules: `docs/integration/modules/money.md`
("Initialisation procedure"); code: `apps/api/src/modules/invoices/` (`invoice.service.ts`
`describeCounter` / `initializeCounter`, `invoices.routes.ts`).

Rules for testing (same as production):

- **Never** `INSERT` / `UPDATE` / `DELETE` `invoice_counters` by hand. Only the endpoint creates it,
  in a transaction that re-reads the stored numbers.
- **Never assume a value** (not 70, not anything): the value is the highest well-formed
  `INV-AS/<n>` stored in `invoices.number` of the restored data. The server refuses any other value.
- Do not use `allowEmpty` with migrated data; it exists for empty development databases only.
- Numbers issued in testing exist only in the testing database. They are not real invoices, and a
  testing database is never copied back to production.

## 1. Read the highest stored number (read-only)

```bash
sudo infrastructure/testing/scripts/verify-database.sh | sed -n '/^\[invoices\]/,/^$/p'
```

or directly (one read-only query):

```bash
TC="docker compose --project-name astro_testing --env-file /opt/astro-sushil/testing/env/build.env \
  --env-file /opt/astro-sushil/testing/env/proxy.env -f /opt/astro-sushil/testing/repo/docker-compose.testing.yml"
sudo TESTING_ROOT=/opt/astro-sushil/testing $TC exec -T testing-postgres \
  sh -c 'psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN READ ONLY;
SELECT 'highest=' || coalesce(max((substring("number" FROM '^INV-AS/([0-9]+)$'))::numeric), 0),
       'well_formed=' || count(*) FILTER (WHERE "number" ~ '^INV-AS/[0-9]+$'),
       'malformed=' || count(*) FILTER (WHERE "number" IS NOT NULL AND "number" !~ '^INV-AS/[0-9]+$'),
       'pending=' || count(*) FILTER (WHERE "status" = 'PENDING')
FROM "invoices";
SELECT 'counter=' || coalesce((SELECT "lastValue"::text FROM "invoice_counters" WHERE "key" = 'INV-AS'), 'not initialised');
ROLLBACK;
SQL
```

The same number is in the backup's `.meta` (`highest_invoice_number=`). `INV-AS/07` and `INV-AS/7`
count as the same value 7; malformed numbers are reported and kept, never repaired.

## 2. Review the analysis as a Super Admin

Who: a staff account whose admin role has **Super Admin** (`admin_roles.isSuperAdmin`). Reading the
analysis needs the permission `gst_report:read`; initialising is refused (403) for anyone who is not
a Super Admin.

### Admin UI (preferred)

1. Open the testing admin (`https://admin-test.<domain>/`), sign in as the Super Admin.
2. Go to **Invoices** (`/invoices`, `apps/admin/app/invoices/page.tsx`), panel **Counter**. It shows
   "Not initialised", the stored-number analysis (highest, next number, duplicates, malformed) and
   the count of pending invoices.
3. Compare **highest** with step 1. They must be equal. Get the owner's approval of that number if
   this is the rehearsal for production.

### API (from the VPS shell, through the API-only port)

`127.0.0.1:18082` is the testing proxy's API-only listener (no basic auth; bound to localhost). A
login without an `Origin` header returns a Bearer token in the JSON body (no cookies, no CSRF). The
password is read without echo and never put on a command line; the token is kept in a mode-600
header file.

```bash
API=http://127.0.0.1:18082/api/v1
umask 077; H="$(mktemp)"; trap 'rm -f "$H"' EXIT
read -rp 'Super Admin e-mail: ' EMAIL; read -rsp 'Password: ' PW; echo
printf '%s\n%s' "$EMAIL" "$PW" \
  | python3 -Ic 'import json,sys; e,p=sys.stdin.read().split("\n",1); print(json.dumps({"email":e,"password":p}))' \
  | curl -sS -X POST "$API/admin/auth/login" -H 'Content-Type: application/json' --data-binary @- \
  | python3 -Ic 'import json,sys; d=json.load(sys.stdin); t=d.get("tokens",{}).get("accessToken"); print("Authorization: Bearer "+t if t else ""); sys.exit(0 if t else "login failed: "+json.dumps(d.get("error", d)))' >"$H"
unset PW

# Analysis (GET, permission gst_report:read)
curl -sS "$API/admin/invoices/counter" -H @"$H" | python3 -m json.tool
```

Response of `GET /api/v1/admin/invoices/counter`:

```json
{
  "initialised": false,
  "paused": false,
  "lastValue": null,
  "nextNumber": null,
  "pendingInvoices": 0,
  "analysis": {
    "total": 101, "wellFormed": 100, "highest": "<n>", "nextNumber": "INV-AS/<n+1>",
    "duplicates": [{ "value": "7", "numbers": ["INV-AS/07", "INV-AS/7"], "count": 2 }],
    "malformed": ["..."]
  }
}
```

`paused: true` means `INVOICE_NUMBERING_ENABLED=false` in `api.env`; leave it unset for testing.

## 3. Initialise (once)

Admin UI: in the Counter panel type the highest number, press **Initialise counter...**, read the
dialog ("The INV-AS series will continue from <n>: the next invoice issued will be INV-AS/<n+1>")
and confirm.

API:

```bash
HIGHEST=<the analysis.highest value, digits only>
printf '{"confirmLastValue":"%s"}' "$HIGHEST" \
  | curl -sS -X POST "$API/admin/invoices/counter/initialize" -H @"$H" \
      -H 'Content-Type: application/json' --data-binary @- | python3 -m json.tool
```

`POST /api/v1/admin/invoices/counter/initialize`, body `{ "confirmLastValue": "<digits>" }`
(string; optional `allowEmpty: boolean`, not for migrated data). Success: **201**
`{ "lastValue": "<n>", "nextNumber": "INV-AS/<n+1>", "analysis": { ... } }` and an audit-log entry
`INVOICE_COUNTER_INITIALIZED` (Audit Log screen). Refusals (errors use the standard
`{ "error": { "code", "message", "requestId" } }` shape):

| Status / code | Meaning |
| --- | --- |
| 409 `INVOICE_COUNTER_MISMATCH` | `confirmLastValue` differs from the highest stored number. Re-read step 1. |
| 409 (conflict) "already initialised (last value n)" | The counter exists. It cannot be changed from the API; to start over, reset the testing database to a backup. |
| 409 `INVOICE_HISTORY_MISSING` | No `INV-AS/<n>` in `invoices` at all: the restore did not bring the invoices. Fix the data; do not use `allowEmpty`. |
| 403 | Signed-in account is not a Super Admin. |
| 400 | `confirmLastValue` is not a whole number. |

## 4. Verify the next number

```bash
curl -sS "$API/admin/invoices/counter" -H @"$H" \
  | python3 -Ic 'import json,sys; d=json.load(sys.stdin); print(d["initialised"], d["lastValue"], d["nextNumber"], d["pendingInvoices"])'
sudo infrastructure/testing/scripts/verify-database.sh | grep 'counter INV-AS'   # OK ... next number INV-AS/<n+1>
```

Expect `initialised = true`, `lastValue = <n>`, `nextNumber = INV-AS/<n+1>`.

Optional: number paid sales that were left pending before initialisation (Super Admin; the UI has
an **Allocate numbers** button in the same panel):

```bash
curl -sS -X POST "$API/admin/invoices/allocate-pending" -H @"$H" | python3 -m json.tool
# 200 { "allocated": [{ "orderId", "number" }], "stillPending": [...], "failures": [...] }
```

Then a real test purchase (Razorpay test mode) must receive `INV-AS/<n+1>` (or the next free number
after the allocation above).

## After a database reset

`reset-testing-db.sh` / `restore-testing-db.sh` bring back the counter state of the backup (normally
"not initialised"). Repeat steps 1 to 4.
