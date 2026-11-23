-- Language of a report PDF, chosen by the customer when the report is created
-- ("en" or "hi"). Existing reports and requests that name no language are
-- English. The worker, retries and regeneration read this column, so a report
-- is always produced again in the language it was created in.

-- AlterTable
ALTER TABLE "reports" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
