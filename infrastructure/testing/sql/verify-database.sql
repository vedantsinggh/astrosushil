-- =============================================================================
-- Astro Sushil TESTING deployment - read-only database verification.
--
-- Run by infrastructure/testing/scripts/verify-database.sh through psql:
--   psql -X -v ON_ERROR_STOP=1 -At -F '<TAB>' \
--        -v expected_migrations=<n|-1> -v expected_fks=<n|-1> -f verify-database.sql
--
-- Every row is: section, check, status, value, detail
--   status FAIL  real integrity failure (orphan on a declared foreign key,
--                duplicate on a declared unique column, failed migration,
--                missing native constraint/trigger, counter behind history)
--   status WARN  worth a look, never fatal (reference counts, soft links,
--                historical data quirks)
--   status OK / INFO
--
-- Read only: the whole script runs inside a READ ONLY transaction that is
-- rolled back at the end. Table and column names are the real @@map names of
-- apps/api/prisma/schema.prisma (Prisma keeps camelCase column names, quoted).
-- =============================================================================

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH
ref(name, expected) AS (
  -- Historical reference counts of the migrated data set (REFERENCE ONLY).
  VALUES ('users', 1361), ('orders', 888), ('order_items', 901),
         ('payment_transactions', 888), ('invoices', 101), ('reports', 273),
         ('digital_product_entitlements', 91)
),
counts(name, n) AS (
  SELECT 'users', count(*) FROM "users"
  UNION ALL SELECT 'staff_profiles', count(*) FROM "staff_profiles"
  UNION ALL SELECT 'admin_roles', count(*) FROM "admin_roles"
  UNION ALL SELECT 'birth_profiles', count(*) FROM "birth_profiles"
  UNION ALL SELECT 'orders', count(*) FROM "orders"
  UNION ALL SELECT 'order_items', count(*) FROM "order_items"
  UNION ALL SELECT 'shop_orders', count(*) FROM "shop_orders"
  UNION ALL SELECT 'reports', count(*) FROM "reports"
  UNION ALL SELECT 'consultation_bookings', count(*) FROM "consultation_bookings"
  UNION ALL SELECT 'payment_transactions', count(*) FROM "payment_transactions"
  UNION ALL SELECT 'invoices', count(*) FROM "invoices"
  UNION ALL SELECT 'invoice_counters', count(*) FROM "invoice_counters"
  UNION ALL SELECT 'digital_product_entitlements', count(*) FROM "digital_product_entitlements"
  UNION ALL SELECT 'products', count(*) FROM "products"
  UNION ALL SELECT 'courses', count(*) FROM "courses"
),
-- Orphans on relations that HAVE a foreign key in schema.prisma (FAIL when > 0).
fk_orphans(rel, n) AS (
  SELECT 'orders.userId -> users', count(*) FROM "orders" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'order_items.orderId -> orders', count(*) FROM "order_items" c WHERE NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'shop_orders.orderId -> orders', count(*) FROM "shop_orders" c WHERE NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'reports.userId -> users', count(*) FROM "reports" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'reports.birthProfileId -> birth_profiles', count(*) FROM "reports" c WHERE NOT EXISTS (SELECT 1 FROM "birth_profiles" p WHERE p."id" = c."birthProfileId")
  UNION ALL SELECT 'reports.orderId -> orders', count(*) FROM "reports" c WHERE c."orderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'birth_profiles.userId -> users', count(*) FROM "birth_profiles" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'staff_profiles.userId -> users', count(*) FROM "staff_profiles" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'staff_profiles.roleId -> admin_roles', count(*) FROM "staff_profiles" c WHERE c."roleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "admin_roles" p WHERE p."id" = c."roleId")
  UNION ALL SELECT 'consultation_bookings.userId -> users', count(*) FROM "consultation_bookings" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'consultation_bookings.birthProfileId -> birth_profiles', count(*) FROM "consultation_bookings" c WHERE c."birthProfileId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "birth_profiles" p WHERE p."id" = c."birthProfileId")
  UNION ALL SELECT 'consultation_bookings.orderId -> orders', count(*) FROM "consultation_bookings" c WHERE c."orderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'digital_product_entitlements.userId -> users', count(*) FROM "digital_product_entitlements" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'digital_product_entitlements.productId -> products', count(*) FROM "digital_product_entitlements" c WHERE NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = c."productId")
  UNION ALL SELECT 'digital_product_entitlements.orderId -> orders', count(*) FROM "digital_product_entitlements" c WHERE c."orderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
),
-- Soft references: plain columns WITHOUT a foreign key in schema.prisma (WARN when > 0).
soft_orphans(rel, n) AS (
  SELECT 'payment_transactions.userId -> users', count(*) FROM "payment_transactions" c WHERE NOT EXISTS (SELECT 1 FROM "users" p WHERE p."id" = c."userId")
  UNION ALL SELECT 'payment_transactions.orderId -> orders', count(*) FROM "payment_transactions" c WHERE c."orderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'invoices.orderId -> orders', count(*) FROM "invoices" c WHERE c."orderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = c."orderId")
  UNION ALL SELECT 'digital_product_entitlements.orderItemId -> order_items', count(*) FROM "digital_product_entitlements" c WHERE c."orderItemId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "order_items" p WHERE p."id" = c."orderItemId")
),
-- Duplicates on columns declared @unique (FAIL when > 0: the unique index is missing or broken).
hard_dups(col, n) AS (
  SELECT 'users.email', count(*) FROM (SELECT "email" FROM "users" WHERE "email" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'users.phoneNumber', count(*) FROM (SELECT "phoneNumber" FROM "users" WHERE "phoneNumber" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'orders.razorpayOrderId', count(*) FROM (SELECT "razorpayOrderId" FROM "orders" GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'orders.razorpayPaymentId', count(*) FROM (SELECT "razorpayPaymentId" FROM "orders" WHERE "razorpayPaymentId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'invoices.sequence', count(*) FROM (SELECT "sequence" FROM "invoices" WHERE "sequence" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'invoices.orderId', count(*) FROM (SELECT "orderId" FROM "invoices" WHERE "orderId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'payment_transactions.legacyId', count(*) FROM (SELECT "legacyId" FROM "payment_transactions" WHERE "legacyId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'shop_orders.orderId', count(*) FROM (SELECT "orderId" FROM "shop_orders" GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'staff_profiles.userId', count(*) FROM (SELECT "userId" FROM "staff_profiles" GROUP BY 1 HAVING count(*) > 1) d
),
-- Duplicates the schema allows but that deserve a look (WARN).
soft_dups(col, n, detail) AS (
  SELECT 'users.email (case-insensitive)', count(*), 'unique index is case-sensitive' FROM (SELECT lower("email") FROM "users" WHERE "email" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'invoices.number (INV-AS numeric value)', count(*), 'website history contains duplicate numbers; reported, never repaired (docs/integration/modules/money.md)'
    FROM (SELECT (substring("number" FROM '^INV-AS/([0-9]+)$'))::numeric FROM "invoices" WHERE "number" ~ '^INV-AS/[0-9]+$' GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'payment_transactions.gatewayPaymentId (SUCCESS)', count(*), 'same gateway payment recorded twice'
    FROM (SELECT "gatewayPaymentId" FROM "payment_transactions" WHERE "gatewayPaymentId" IS NOT NULL AND "status" = 'SUCCESS' GROUP BY 1 HAVING count(*) > 1) d
),
inv AS (
  SELECT
    count(*) FILTER (WHERE "number" IS NOT NULL AND "number" <> '') AS numbered,
    count(*) FILTER (WHERE "number" ~ '^INV-AS/[0-9]+$') AS well_formed,
    count(*) FILTER (WHERE "number" IS NOT NULL AND "number" <> '' AND "number" !~ '^INV-AS/[0-9]+$') AS malformed,
    coalesce(max((substring("number" FROM '^INV-AS/([0-9]+)$'))::numeric), 0) AS highest
  FROM "invoices"
),
ctr AS (
  SELECT "lastValue"::numeric AS last_value, "initializedBy" AS by_whom, "updatedAt" AS at
  FROM "invoice_counters" WHERE "key" = 'INV-AS'
),
mig AS (
  SELECT
    count(*) FILTER (WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) AS applied,
    count(*) FILTER (WHERE "rolled_back_at" IS NOT NULL) AS rolled_back,
    count(*) FILTER (WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL) AS failed,
    count(DISTINCT "migration_name") FILTER (WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) AS applied_names,
    max("migration_name") FILTER (WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) AS latest
  FROM "_prisma_migrations"
),
cons AS (
  SELECT c.contype, count(*) AS n
  FROM pg_constraint c JOIN pg_namespace ns ON ns.oid = c.connamespace
  WHERE ns.nspname = 'public'
  GROUP BY c.contype
),
-- Native objects created by raw SQL in apps/api/prisma/migrations (not expressible in schema.prisma).
native(kind, name, present) AS (
  SELECT 'trigger', 'trg_verify_shipment_item_order on shipment_items',
         EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class r ON r.oid = t.tgrelid
                 WHERE NOT t.tgisinternal AND t.tgname = 'trg_verify_shipment_item_order' AND r.relname = 'shipment_items' AND t.tgenabled <> 'D')
  UNION ALL SELECT 'function', 'fn_verify_shipment_item_order_consistency()',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace WHERE ns.nspname = 'public' AND p.proname = 'fn_verify_shipment_item_order_consistency')
  UNION ALL SELECT 'check', 'chk_refund_allocation_amount_positive on refund_item_allocations',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_refund_allocation_amount_positive' AND contype = 'c' AND convalidated)
  UNION ALL SELECT 'exclusion', 'appointment_slots_no_overlap on appointment_slots',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointment_slots_no_overlap' AND contype = 'x')
  UNION ALL SELECT 'partial unique index', 'uq_active_fulfillment_unit_shipment',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_active_fulfillment_unit_shipment')
  UNION ALL SELECT 'partial unique index', 'birth_profiles_one_self_per_user',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'birth_profiles_one_self_per_user')
),
checks(ord, section, chk, status, val, detail) AS (
  -- 1. Row counts
  SELECT 100, 'counts', c.name,
         CASE WHEN r.expected IS NULL THEN 'INFO' WHEN r.expected = c.n THEN 'OK' ELSE 'WARN' END,
         c.n::text,
         CASE WHEN r.expected IS NULL THEN '' ELSE 'reference ' || r.expected || ' (reference only)' END
  FROM counts c LEFT JOIN ref r ON r.name = c.name

  -- 2. Orders
  UNION ALL SELECT 200, 'orders', 'status=' || "status", 'INFO', count(*)::text, '' FROM "orders" GROUP BY "status"
  UNION ALL SELECT 201, 'orders', 'paymentStatus=' || "paymentStatus", 'INFO', count(*)::text, '' FROM "orders" GROUP BY "paymentStatus"
  UNION ALL SELECT 202, 'orders', 'paid (paidAt set)',
         CASE WHEN count(*) FILTER (WHERE "paidAt" IS NOT NULL) = 885 THEN 'OK' ELSE 'WARN' END,
         (count(*) FILTER (WHERE "paidAt" IS NOT NULL))::text, 'reference 885 (reference only)' FROM "orders"
  UNION ALL SELECT 203, 'orders', 'status=PENDING',
         CASE WHEN count(*) FILTER (WHERE "status" = 'PENDING') = 3 THEN 'OK' ELSE 'WARN' END,
         (count(*) FILTER (WHERE "status" = 'PENDING'))::text, 'reference 3 (reference only)' FROM "orders"
  UNION ALL SELECT 204, 'orders', 'paid without payment transaction',
         CASE WHEN count(*) = 0 THEN 'OK' ELSE 'WARN' END, count(*)::text, 'orders with paidAt and no payment_transactions row'
  FROM "orders" o WHERE o."paidAt" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "payment_transactions" t WHERE t."orderId" = o."id")
  UNION ALL SELECT 205, 'payments', 'payment_transactions status=' || "status", 'INFO', count(*)::text, '' FROM "payment_transactions" GROUP BY "status"

  -- 3. Orphans
  UNION ALL SELECT 300, 'orphans (FK)', rel, CASE WHEN n = 0 THEN 'OK' ELSE 'FAIL' END, n::text, 'declared foreign key' FROM fk_orphans
  UNION ALL SELECT 310, 'orphans (soft)', rel, CASE WHEN n = 0 THEN 'OK' ELSE 'WARN' END, n::text, 'no foreign key in schema' FROM soft_orphans

  -- 4. Duplicates
  UNION ALL SELECT 400, 'duplicates (unique)', col, CASE WHEN n = 0 THEN 'OK' ELSE 'FAIL' END, n::text, 'declared @unique' FROM hard_dups
  UNION ALL SELECT 410, 'duplicates (soft)', col, CASE WHEN n = 0 THEN 'OK' ELSE 'WARN' END, n::text, detail FROM soft_dups

  -- 5. Constraints and triggers
  UNION ALL SELECT 500, 'constraints', 'pg_constraint type ' ||
         CASE contype WHEN 'p' THEN 'primary key' WHEN 'f' THEN 'foreign key' WHEN 'u' THEN 'unique' WHEN 'c' THEN 'check' WHEN 'x' THEN 'exclusion' WHEN 't' THEN 'trigger' ELSE contype::text END,
         'INFO', n::text, '' FROM cons
  UNION ALL SELECT 500, 'constraints', 'unique indexes', 'INFO', count(*)::text, 'Prisma @unique / @@unique are unique indexes, not constraints'
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND i.indisunique AND NOT i.indisprimary
  UNION ALL SELECT 500, 'constraints', 'invalid indexes', CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FAIL' END, count(*)::text, coalesce(string_agg(c.relname, ', '), '')
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND NOT i.indisvalid
  UNION ALL SELECT 501, 'constraints', 'foreign keys vs schema.prisma relations',
         CASE WHEN :expected_fks < 0 THEN 'INFO'
              WHEN coalesce((SELECT n FROM cons WHERE contype = 'f'), 0) = :expected_fks THEN 'OK'
              WHEN coalesce((SELECT n FROM cons WHERE contype = 'f'), 0) < :expected_fks THEN 'FAIL'
              ELSE 'WARN' END,
         coalesce((SELECT n FROM cons WHERE contype = 'f'), 0)::text,
         CASE WHEN :expected_fks < 0 THEN 'schema.prisma not found; not compared' ELSE 'expected ' || :expected_fks || ' (@relation with fields)' END
  UNION ALL SELECT 502, 'constraints', 'not validated (NOT VALID) constraints',
         CASE WHEN count(*) = 0 THEN 'OK' ELSE 'WARN' END, count(*)::text, coalesce(string_agg(c.conname, ', '), '')
  FROM pg_constraint c JOIN pg_namespace ns ON ns.oid = c.connamespace WHERE ns.nspname = 'public' AND NOT c.convalidated
  UNION ALL SELECT 503, 'constraints', 'user triggers (non-internal)', 'INFO', count(*)::text,
         coalesce(string_agg(t.tgname || CASE WHEN t.tgenabled = 'D' THEN ' (DISABLED)' ELSE '' END, ', '), '')
  FROM pg_trigger t JOIN pg_class r ON r.oid = t.tgrelid JOIN pg_namespace ns ON ns.oid = r.relnamespace
  WHERE ns.nspname = 'public' AND NOT t.tgisinternal
  UNION ALL SELECT 504, 'constraints', kind || ' ' || name, CASE WHEN present THEN 'OK' ELSE 'FAIL' END,
         CASE WHEN present THEN 'present' ELSE 'MISSING' END, 'created by raw SQL in a migration' FROM native
  UNION ALL SELECT 505, 'constraints', 'extensions', 'INFO', count(*)::text, coalesce(string_agg(extname || ' ' || extversion, ', '), '') FROM pg_extension

  -- 6. Prisma migrations
  UNION ALL SELECT 600, 'migrations', 'applied (finished, not rolled back)',
         CASE WHEN :expected_migrations < 0 THEN 'INFO'
              WHEN (SELECT applied_names FROM mig) = :expected_migrations THEN 'OK' ELSE 'WARN' END,
         (SELECT applied FROM mig)::text,
         CASE WHEN :expected_migrations < 0 THEN 'repo migrations folder not found; not compared'
              ELSE 'repo has ' || :expected_migrations || ' migrations; latest applied ' || coalesce((SELECT latest FROM mig), '-') END
  UNION ALL SELECT 601, 'migrations', 'rolled back', CASE WHEN (SELECT rolled_back FROM mig) = 0 THEN 'OK' ELSE 'WARN' END,
         (SELECT rolled_back FROM mig)::text, 'rows marked rolled back (see prisma migrate resolve)'
  UNION ALL SELECT 602, 'migrations', 'failed / unfinished', CASE WHEN (SELECT failed FROM mig) = 0 THEN 'OK' ELSE 'FAIL' END,
         (SELECT failed FROM mig)::text,
         coalesce((SELECT string_agg("migration_name", ', ') FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL), '')

  -- 7. Invoices and the counter
  UNION ALL SELECT 700, 'invoices', 'status=' || "status", 'INFO', count(*)::text, '' FROM "invoices" GROUP BY "status"
  UNION ALL SELECT 701, 'invoices', 'numbered / well-formed INV-AS/<n>', 'INFO', (SELECT numbered FROM inv)::text || ' / ' || (SELECT well_formed FROM inv)::text, ''
  UNION ALL SELECT 702, 'invoices', 'malformed numbers', CASE WHEN (SELECT malformed FROM inv) = 0 THEN 'OK' ELSE 'WARN' END,
         (SELECT malformed FROM inv)::text, 'kept as stored; reported by GET /api/v1/admin/invoices/counter'
  UNION ALL SELECT 703, 'invoices', 'highest stored INV-AS number', 'INFO', (SELECT highest FROM inv)::text, 'confirmLastValue for the counter initialisation'
  UNION ALL SELECT 704, 'invoices', 'counter INV-AS',
         CASE WHEN NOT EXISTS (SELECT 1 FROM ctr) THEN 'WARN'
              WHEN (SELECT last_value FROM ctr) < (SELECT highest FROM inv) THEN 'FAIL'
              ELSE 'OK' END,
         coalesce((SELECT last_value FROM ctr)::text, 'not initialised'),
         CASE WHEN NOT EXISTS (SELECT 1 FROM ctr) THEN 'no invoice numbers are issued until it is initialised (docs/invoice-counter.md)'
              WHEN (SELECT last_value FROM ctr) < (SELECT highest FROM inv) THEN 'counter is BEHIND the highest stored number: next allocation would repeat a number'
              ELSE 'next number INV-AS/' || lpad(((SELECT last_value FROM ctr) + 1)::text, 2, '0') END
  UNION ALL SELECT 705, 'invoices', 'other invoice_counters rows', CASE WHEN count(*) = 0 THEN 'OK' ELSE 'WARN' END, count(*)::text,
         coalesce(string_agg("key", ', '), '') FROM "invoice_counters" WHERE "key" <> 'INV-AS'

  -- 8. Historical file references
  UNION ALL SELECT 800, 'files', 'reports with s3Url but no storageKey', 'INFO', count(*)::text, 'served through the storage key resolver (historical URLs)'
  FROM "reports" WHERE "storageKey" IS NULL AND "s3Url" IS NOT NULL
  UNION ALL SELECT 801, 'files', 'COMPLETED reports with no file reference', CASE WHEN count(*) = 0 THEN 'OK' ELSE 'WARN' END, count(*)::text, 'storageKey and s3Url both empty'
  FROM "reports" WHERE "status" = 'COMPLETED' AND "storageKey" IS NULL AND "s3Url" IS NULL
  UNION ALL SELECT 802, 'files', 'reports by status: ' || "status", 'INFO', count(*)::text, '' FROM "reports" GROUP BY "status"
  UNION ALL SELECT 803, 'files', 'entitlements with null assetKey', 'INFO', count(*)::text,
         (count(*) FILTER (WHERE "bundleAssets" IS NULL))::text || ' of them also have no bundleAssets'
  FROM "digital_product_entitlements" WHERE "assetKey" IS NULL

  -- 9. In-flight work (INFO only; restore-testing-db.sh parks it, see docs/database.md)
  UNION ALL SELECT 900, 'in-flight work', 'outbound_messages status=' || "status", 'INFO', count(*)::text, '' FROM "outbound_messages" GROUP BY "status"
  UNION ALL SELECT 901, 'in-flight work', 'outbound_messages suppressed by testing restore', 'INFO', count(*)::text, 'lastError TESTING_RESTORE_SUPPRESSED'
  FROM "outbound_messages" WHERE "lastError" = 'TESTING_RESTORE_SUPPRESSED'
  UNION ALL SELECT 902, 'in-flight work', 'outbound_messages PENDING/SENDING (would be sent)', 'INFO', count(*)::text, 'sent by testing-worker when it runs'
  FROM "outbound_messages" WHERE "status" IN ('PENDING', 'SENDING')
  UNION ALL SELECT 903, 'in-flight work', 'reports parked by testing restore', 'INFO', count(*)::text, 'errorCode TESTING_RESTORE_PARKED'
  FROM "reports" WHERE "errorCode" = 'TESTING_RESTORE_PARKED'
  UNION ALL SELECT 904, 'in-flight work', 'reports not COMPLETED/FAILED (would be generated)', 'INFO', count(*)::text, 'claimed by testing-worker when it runs (Gemini cost)'
  FROM "reports" WHERE "status" NOT IN ('COMPLETED', 'FAILED')
)
SELECT section, chk, status, val, detail FROM checks ORDER BY ord, chk;

ROLLBACK;
