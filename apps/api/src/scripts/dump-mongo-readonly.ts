import fs from 'fs';
import path from 'path';
import { BSON, MongoClient } from 'mongodb';

const { EJSON } = BSON;

/**
 * Read-only copy of the website's MongoDB. Only `listCollections` and `find` are issued (no
 * writes, no index builds), on a secondary when there is one.
 *
 *   MONGODB_URL=... npx tsx src/scripts/dump-mongo-readonly.ts [--out=DIR] [--backup=DIR] [--db=NAME]
 *
 *   --out     plain JSON per collection, the input of migrate-from-mongo.ts
 *             (default ../../tmp/mongo-backup)
 *   --backup  optional second copy in canonical Extended JSON (keeps ObjectId, Date, Decimal128),
 *             restorable with `mongoimport --jsonArray`; keep it outside the repository
 *   --db      database name (default: the one in the URL; a URL without one means "test")
 */
function arg(name: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : undefined;
}

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error('MONGODB_URL environment variable is required');
  }

  const outDir = path.resolve(arg('out') ?? path.resolve(process.cwd(), '../../tmp/mongo-backup'));
  const backupDir = arg('backup') ? path.resolve(arg('backup') as string) : null;
  fs.mkdirSync(outDir, { recursive: true });
  if (backupDir) fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  const client = new MongoClient(uri, {
    readPreference: 'secondaryPreferred',
    appName: 'astrosushil-readonly-dump',
  });

  try {
    await client.connect();
    const db = arg('db') ? client.db(arg('db')) : client.db();
    console.log(`Connected (read-only) to MongoDB database: ${db.databaseName}`);

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    collections.sort((a, b) => a.name.localeCompare(b.name));

    const summary: Array<{ collection: string; count: number }> = [];
    const jpyFindings: Array<{ collection: string; id: unknown; amount?: unknown }> = [];

    for (const colInfo of collections) {
      const name = colInfo.name;
      const docs = await db.collection(name).find({}).toArray();
      summary.push({ collection: name, count: docs.length });

      for (const doc of docs) {
        const cur = typeof doc.currency === 'string' ? doc.currency.toUpperCase() : '';
        if (cur === 'JPY') {
          jpyFindings.push({ collection: name, id: doc._id, amount: doc.amount ?? doc.totalAmount ?? doc.finalAmount });
        }
      }

      fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs, null, 2), 'utf8');
      if (backupDir) {
        fs.writeFileSync(path.join(backupDir, `${name}.ejson`), EJSON.stringify(docs, undefined, 0, { relaxed: false }), { encoding: 'utf8', mode: 0o600 });
      }
    }

    const manifest = { database: db.databaseName, takenAt: new Date().toISOString(), collections: summary };
    fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    if (backupDir) fs.writeFileSync(path.join(backupDir, '_manifest.json'), JSON.stringify(manifest, null, 2), { encoding: 'utf8', mode: 0o600 });

    console.log('\nCollection summary:');
    for (const row of summary) {
      console.log(`  ${row.collection}: ${row.count}`);
    }

    console.log(`\nJPY currency records found (M11): ${jpyFindings.length}`);
    if (jpyFindings.length > 0) {
      console.log(JSON.stringify(jpyFindings, null, 2));
    }

    console.log(`\nJSON dump written to: ${outDir}`);
    if (backupDir) console.log(`Extended-JSON backup written to: ${backupDir}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  // Never print the connection string (it carries the password).
  const message = err instanceof Error ? err.message : String(err);
  console.error('MongoDB read-only dump failed:', message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '<connection string>'));
  process.exit(1);
});
