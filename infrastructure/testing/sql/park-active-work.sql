-- =============================================================================
-- Astro Sushil TESTING deployment - park in-flight work after a restore.
--
-- Run by restore-testing-db.sh (default; opt out with --keep-active-work) while
-- testing-api and testing-worker are STOPPED, against the testing database only:
--   psql -X -q -v ON_ERROR_STOP=1 -At -F '<TAB>' -f park-active-work.sql
--
-- A restored copy of real data carries messages that were waiting to be sent to
-- real customers and reports that were waiting to be generated (each generation
-- costs Gemini calls). Neither may run from the testing stack:
--   (a) outbound_messages PENDING/SENDING -> FAILED, lastError TESTING_RESTORE_SUPPRESSED.
--       The outbox only picks PENDING rows (services/messaging/outbox.service.ts),
--       so FAILED is never retried; lockedAt is cleared, attempts set to maxAttempts.
--   (b) reports not COMPLETED/FAILED -> FAILED, errorCode TESTING_RESTORE_PARKED.
--       The queue only claims QUEUED or in-progress stages (services/postgres-queue.service.ts);
--       claimToken/claimedAt/claimExpiresAt and retryAfter are cleared.
-- One transaction. Never touches invoice_counters or invoices.
-- Output rows: phase, item, count
-- =============================================================================

BEGIN;

SELECT 'before', 'outbound_messages ' || "status", count(*) FROM "outbound_messages" GROUP BY "status"
UNION ALL
SELECT 'before', 'reports ' || "status", count(*) FROM "reports" GROUP BY "status"
ORDER BY 2;

WITH m AS (
  UPDATE "outbound_messages"
  SET "status" = 'FAILED',
      "lastError" = 'TESTING_RESTORE_SUPPRESSED',
      "lockedAt" = NULL,
      "attempts" = GREATEST("attempts", "maxAttempts"),
      "updatedAt" = now()
  WHERE "status" IN ('PENDING', 'SENDING')
  RETURNING 1
)
SELECT 'changed', 'outbound_messages -> FAILED (TESTING_RESTORE_SUPPRESSED)', count(*) FROM m;

WITH r AS (
  UPDATE "reports"
  SET "status" = 'FAILED',
      "errorCode" = 'TESTING_RESTORE_PARKED',
      "errorMessage" = 'Parked by testing restore; regenerate from admin if needed',
      "failedAt" = now(),
      "claimToken" = NULL,
      "claimedAt" = NULL,
      "claimExpiresAt" = NULL,
      "retryAfter" = NULL,
      "updatedAt" = now()
  WHERE "status" NOT IN ('COMPLETED', 'FAILED')
  RETURNING 1
)
SELECT 'changed', 'reports -> FAILED (TESTING_RESTORE_PARKED)', count(*) FROM r;

SELECT 'after', 'outbound_messages ' || "status", count(*) FROM "outbound_messages" GROUP BY "status"
UNION ALL
SELECT 'after', 'reports ' || "status", count(*) FROM "reports" GROUP BY "status"
ORDER BY 2;

COMMIT;
