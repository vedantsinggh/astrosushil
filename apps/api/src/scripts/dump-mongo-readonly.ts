import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error('MONGODB_URL environment variable is required');
  }

  const outDir = path.resolve(process.cwd(), '../../tmp/mongo-backup');
  fs.mkdirSync(outDir, { recursive: true });

  const client = new MongoClient(uri, {
    readPreference: 'secondaryPreferred',
  });

  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected (read-only) to MongoDB database: ${db.databaseName}`);

    const collections = await db.listCollections().toArray();
    collections.sort((a, b) => a.name.localeCompare(b.name));

    const summary: Array<{ collection: string; count: number }> = [];
    const jpyFindings: Array<{ collection: string; id: unknown; amount?: unknown }> = [];

    for (const colInfo of collections) {
      const name = colInfo.name;
      const col = db.collection(name);
      const docs = await col.find({}).toArray();
      summary.push({ collection: name, count: docs.length });

      for (const doc of docs) {
        const cur = typeof doc.currency === 'string' ? doc.currency.toUpperCase() : '';
        if (cur === 'JPY') {
          jpyFindings.push({
            collection: name,
            id: doc._id,
            amount: doc.amount ?? doc.totalAmount ?? doc.finalAmount,
          });
        }
      }

      const filePath = path.join(outDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    }

    console.log('\nCollection summary:');
    for (const row of summary) {
      console.log(`  ${row.collection}: ${row.count}`);
    }

    console.log(`\nJPY currency records found (M11): ${jpyFindings.length}`);
    if (jpyFindings.length > 0) {
      console.log(JSON.stringify(jpyFindings, null, 2));
    }

    console.log(`\nLocal read-only backup written to: ${outDir}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('MongoDB read-only dump failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

