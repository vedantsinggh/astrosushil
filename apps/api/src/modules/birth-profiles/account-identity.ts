/**
 * One identity per customer on website and app (owner decision 2026-11-26): the account holds the
 * name, phone and e-mail; birth profiles are the charts, one of which can be the holder's own
 * ("Self"). These helpers give every screen, message and invoice the same name for a customer.
 */
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The name to show for a customer: the name typed on the form (when the form asks for one), else
 * the account name, else the "Self" profile, else the oldest profile, else the phone number.
 * Never a generic placeholder while any of these exists.
 */
export async function customerDisplayName(db: Db, userId: string, typedName?: string | null): Promise<string> {
  const typed = typedName?.trim();
  if (typed) return typed;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      phoneNumber: true,
      email: true,
      birthProfiles: { orderBy: [{ isSelf: 'desc' }, { createdAt: 'asc' }], take: 1, select: { name: true } },
    },
  });
  return (
    user?.fullName?.trim() ||
    user?.birthProfiles[0]?.name?.trim() ||
    user?.phoneNumber ||
    user?.email ||
    'Customer'
  );
}

/**
 * After a data import: accounts without a name take their oldest profile's name, and the oldest
 * profile named like the account becomes "Self". Same statements as migration
 * 20261127090000_birth_profile_self_and_gender; safe to run any number of times.
 */
export async function backfillAccountNamesAndSelf(db: PrismaClient): Promise<{ named: number; selfMarked: number }> {
  const named = await db.$executeRawUnsafe(`
    UPDATE "users" u SET "fullName" = bp."name"
    FROM (SELECT DISTINCT ON ("userId") "userId", "name" FROM "birth_profiles"
          WHERE btrim("name") <> '' ORDER BY "userId", "createdAt" ASC, "id" ASC) bp
    WHERE bp."userId" = u."id" AND u."role" = 'USER' AND (u."fullName" IS NULL OR btrim(u."fullName") = '')`);
  const selfMarked = await db.$executeRawUnsafe(`
    UPDATE "birth_profiles" b SET "isSelf" = true
    FROM (SELECT DISTINCT ON (bp."userId") bp."id" FROM "birth_profiles" bp JOIN "users" u ON u."id" = bp."userId"
          WHERE lower(btrim(bp."name")) = lower(btrim(u."fullName"))
            AND NOT EXISTS (SELECT 1 FROM "birth_profiles" s WHERE s."userId" = bp."userId" AND s."isSelf")
          ORDER BY bp."userId", bp."createdAt" ASC, bp."id" ASC) pick
    WHERE b."id" = pick."id"`);
  return { named, selfMarked };
}
