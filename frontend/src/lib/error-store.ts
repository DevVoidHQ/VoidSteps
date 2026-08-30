import { db } from './db';
import type { ErrorLogEntry } from './db';

export async function reportError(
  category: ErrorLogEntry['category'],
  error: unknown,
  context?: Record<string, unknown>
) {
  const entry = {
    category,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: Date.now(),
  };
  await db.errorLog.add(entry);
  // Auto-prune: keep last 200 entries
  const count = await db.errorLog.count();
  if (count > 200) {
    const oldest = await db.errorLog.orderBy('timestamp').limit(count - 200).toArray();
    await db.errorLog.bulkDelete(oldest.map(e => e.id!));
  }
}
