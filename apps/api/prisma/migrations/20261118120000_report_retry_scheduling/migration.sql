-- Retry-later scheduling for report generation.
-- A transient generation failure puts the report back to QUEUED with
-- "retryAfter" set to the next attempt time (existing column, already honoured
-- by the queue claim). These columns count the failures and keep internal
-- diagnostics of the last failed attempt, separate from the customer-facing
-- "errorCode"/"errorMessage" (which stay NULL while a retry is pending).

-- AlterTable
ALTER TABLE "reports" ADD COLUMN "generationFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastAttemptErrorCode" TEXT,
ADD COLUMN "lastAttemptErrorMessage" TEXT;
