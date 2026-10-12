/**
 * Retries deletion of storage objects whose removal previously failed.
 * Safe to run on a schedule (e.g. daily cron).
 *
 *   npm run cleanup:orphans
 */
import { connectDatabase, disconnectDatabase } from '../lib/db.js';
import { PendingDeletion } from '../models/PendingDeletion.js';
import { getStorage } from '../services/storage.js';

async function main() {
  await connectDatabase();
  const pending = await PendingDeletion.find().limit(5000).lean();
  if (!pending.length) {
    console.log('No pending deletions.');
    return;
  }
  const failed: string[] = [];
  for (const source of ['r2', 'mongodb'] as const) {
    const keys = pending.filter((p) => (p.source ?? 'r2') === source).map((p) => p.key);
    if (!keys.length) continue;
    try {
      failed.push(...(await getStorage(source).deleteMany(keys)).failed);
    } catch (err) {
      console.error(`${source} storage unavailable: ${err instanceof Error ? err.message : err}`);
      failed.push(...keys);
    }
  }
  const failedSet = new Set(failed);
  const done = pending.filter((p) => !failedSet.has(p.key)).map((p) => p.key);
  await PendingDeletion.deleteMany({ key: { $in: done } });
  await PendingDeletion.updateMany({ key: { $in: failed } }, { $inc: { attempts: 1 } });
  console.log(`Deleted ${done.length} object(s); ${failed.length} still pending.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
