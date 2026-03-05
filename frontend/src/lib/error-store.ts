import { db } from './db';
import type { ErrorLogEntry } from './db';
import { captureError } from './sentry';

export async function logError(
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
    reported: false,
  };
  await db.errorLog.add(entry);
  // Auto-prune: keep last 200 entries
  const count = await db.errorLog.count();
  if (count > 200) {
    const oldest = await db.errorLog.orderBy('timestamp').limit(count - 200).toArray();
    await db.errorLog.bulkDelete(oldest.map(e => e.id!));
  }
}

export async function reportError(
  category: ErrorLogEntry['category'],
  error: unknown,
  context?: Record<string, unknown>
) {
  await logError(category, error, context);
  captureError(error, { category, ...context });
}
