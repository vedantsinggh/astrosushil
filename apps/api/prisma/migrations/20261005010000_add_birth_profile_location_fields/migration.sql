-- AlterTable
ALTER TABLE "birth_profiles" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "birth_profiles" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "birth_profiles" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "birth_profiles" ADD COLUMN IF NOT EXISTS "isResolved" BOOLEAN NOT NULL DEFAULT true;
