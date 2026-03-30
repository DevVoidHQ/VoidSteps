import { db } from './db';

export async function retryFailedEntry(entryId: number) {
  await db.syncQueue.update(entryId, { status: 'pending', retryCount: 0, lastError: undefined });
}

export async function discardFailedEntry(entryId: number) {
  await db.syncQueue.delete(entryId);
}

export async function retryAllFailed() {
  await db.syncQueue.where('status').equals('failed').modify({ status: 'pending', retryCount: 0, lastError: undefined });
}

export async function discardAllFailed() {
  await db.syncQueue.where('status').equals('failed').delete();
}
