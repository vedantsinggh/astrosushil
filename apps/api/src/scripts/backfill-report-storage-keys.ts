/**
 * One-off, operator-run backfill: writes `reports.storageKey` for COMPLETED reports migrated from
 * the website that only carry `s3Url` (the website's public URL of the PDF).
 *
 * Downloads already work without it (reportObjectKey() resolves s3Url at request time); the
 * backfill only makes the key explicit for code that reads `storageKey` directly (fulfillment
 * reconciliation, storage cleanup). `s3Url` is never changed.
 *
 * A URL is turned into a key with storageService.resolveKey(): only the configured bucket, the
 * buckets in STORAGE_LEGACY_AWS_BUCKETS and the local development route are accepted. Nothing is
 * fetched from the URL. With --verify (the default) a key is written only when that object exists
 * in the ACTIVE store (copy the files first: infrastructure/testing/scripts/copy-historical-assets.sh).
 *
 * Usage (dry run is the default and writes nothing):
 *   npx tsx src/scripts/backfill-report-storage-keys.ts [--execute] [--no-verify] [--limit=N]
 *   node apps/api/dist/scripts/backfill-report-storage-keys.js   (inside the API image, from /app)
 */
import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storage.service';

export interface BackfillOptions {
  execute: boolean;
  verify: boolean;
  limit: number | null;
}

export function parseBackfillArgs(argv: string[]): BackfillOptions {
  const options: BackfillOptions = { execute: false, verify: true, limit: null };
  for (const arg of argv) {
    if (arg === '--execute') options.execute = true;
    else if (arg === '--dry-run') options.execute = false;
    else if (arg === '--no-verify') options.verify = false;
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid --limit: ${arg}`);
      options.limit = n;
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('usage');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main(): Promise<number> {
  let options: BackfillOptions;
  try {
    options = parseBackfillArgs(process.argv.slice(2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== 'usage') console.error(message);
    console.error('Usage: backfill-report-storage-keys [--dry-run (default)] [--execute] [--no-verify] [--limit=N]');
    return message === 'usage' ? 0 : 2;
  }

  const prisma = new PrismaClient();
  const summary = { mode: options.execute ? 'execute' : 'dry-run', verify: options.verify, provider: storageService.providerName, candidates: 0, unresolved: 0, missingObject: 0, verifyErrors: 0, wouldWrite: 0, written: 0, skippedConcurrent: 0 };
  const unresolvedIds: string[] = [];
  const missingIds: string[] = [];
  try {
    const rows = await prisma.report.findMany({
      where: { status: 'COMPLETED', storageKey: null, s3Url: { not: null } },
      select: { id: true, s3Url: true },
      orderBy: { createdAt: 'asc' },
      ...(options.limit ? { take: options.limit } : {}),
    });
    summary.candidates = rows.length;

    for (const [index, row] of rows.entries()) {
      const key = storageService.resolveKey(row.s3Url);
      if (!key) {
        summary.unresolved += 1;
        unresolvedIds.push(row.id);
        continue;
      }
      if (options.verify) {
        let present = false;
        try {
          present = await storageService.exists(key);
        } catch (err) {
          summary.verifyErrors += 1;
          console.error(`[${index + 1}/${rows.length}] ${row.id}: storage check failed: ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }
        if (!present) {
          summary.missingObject += 1;
          missingIds.push(row.id);
          continue;
        }
      }
      summary.wouldWrite += 1;
      if (!options.execute) continue;
      // Only a row that still has no key is updated (never overwrites a key set meanwhile).
      const result = await prisma.report.updateMany({ where: { id: row.id, storageKey: null }, data: { storageKey: key } });
      if (result.count === 1) summary.written += 1;
      else summary.skippedConcurrent += 1;
      console.log(`[${index + 1}/${rows.length}] ${row.id}: storageKey set`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({ ...summary, unresolvedReportIds: unresolvedIds.slice(0, 50), missingObjectReportIds: missingIds.slice(0, 50) }, null, 2));
  if (!options.execute) console.log('Dry run: nothing was written. Re-run with --execute to write the keys above.');
  return summary.verifyErrors > 0 ? 1 : 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
