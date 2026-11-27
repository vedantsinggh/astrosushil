-- Account and birth profiles consistent across website and app (owner decision 2026-11-26).
ALTER TABLE "birth_profiles" ADD COLUMN "isSelf" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "birth_profiles" ADD COLUMN "gender" TEXT;

-- At most one "Self" profile per account.
CREATE UNIQUE INDEX "birth_profiles_one_self_per_user" ON "birth_profiles"("userId") WHERE "isSelf";

-- Backfill (also run after a data import by src/modules/birth-profiles/account-backfill.ts):
-- 1. An account without a name takes the name of its oldest birth profile.
UPDATE "users" u
SET "fullName" = bp."name"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "name"
  FROM "birth_profiles"
  WHERE btrim("name") <> ''
  ORDER BY "userId", "createdAt" ASC, "id" ASC
) bp
WHERE bp."userId" = u."id"
  AND u."role" = 'USER'
  AND (u."fullName" IS NULL OR btrim(u."fullName") = '');

-- 2. "Self" = the oldest profile whose name is the account name.
UPDATE "birth_profiles" b
SET "isSelf" = true
FROM (
  SELECT DISTINCT ON (bp."userId") bp."id"
  FROM "birth_profiles" bp
  JOIN "users" u ON u."id" = bp."userId"
  WHERE lower(btrim(bp."name")) = lower(btrim(u."fullName"))
    AND NOT EXISTS (SELECT 1 FROM "birth_profiles" s WHERE s."userId" = bp."userId" AND s."isSelf")
  ORDER BY bp."userId", bp."createdAt" ASC, bp."id" ASC
) pick
WHERE b."id" = pick."id";
