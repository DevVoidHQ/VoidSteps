import { db } from './db';
import { convexClient } from './convex-client';
import { api } from '../../convex/_generated/api';
import { reportError } from './error-store';

// Free is local-only, so a browser-data-clear / new device would lose everything.
// This keeps ONE latest full-dataset snapshot on the server as a safety net:
// point-in-time, restore-on-recovery only -- NOT live sync (that's Pro). Runs for
// Free users (Pro already syncs live and doesn't need it).

// Data tables worth backing up. Excludes transient/local-only meta (syncQueue,
// syncMeta, errorLog).
const BACKUP_TABLES = ['steps', 'paths', 'routines', 'reminders', 'notebooks', 'notes', 'userSettings'] as const;

const SNAPSHOT_VERSION = 1;

export type SnapshotCounts = Record<string, number>;

async function buildSnapshot(): Promise<{ json: string; counts: SnapshotCounts }> {
  const data: Record<string, unknown[]> = {};
  const counts: SnapshotCounts = {};
  for (const t of BACKUP_TABLES) {
    const rows = await (db as any)[t].toArray();
    data[t] = rows;
    counts[t] = rows.length;
  }
  const json = JSON.stringify({ version: SNAPSHOT_VERSION, exportedAt: Date.now(), data });
  return { json, counts };
}

// Cheap change signature so the loop skips redundant uploads (per-table count +
// newest updatedAt). Avoids writing an identical snapshot on every tick.
async function signature(): Promise<string> {
  const parts: string[] = [];
  for (const t of BACKUP_TABLES) {
    const rows = await (db as any)[t].toArray();
    let maxUpdated = 0;
    for (const r of rows) if (typeof r.updatedAt === 'number' && r.updatedAt > maxUpdated) maxUpdated = r.updatedAt;
    parts.push(`${t}:${rows.length}:${maxUpdated}`);
  }
  return parts.join('|');
}

// At most one automatic backup per day. Persisted (not in-memory) so reopening
// the app doesn't re-trigger it. The manual "Back up now" button passes force.
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Upload a snapshot to the server. Automatic calls back up at most once per 24h,
 * and skip when nothing changed since the last backup. `force` (manual button)
 * bypasses the time throttle but still skips an unchanged dataset.
 */
export async function maybeBackup(force = false): Promise<void> {
  try {
    // Cheap throttle FIRST so sub-daily ticks (hourly / tab-hide) skip the
    // full-dataset read in signature() below.
    if (!force) {
      const lastAt = ((await db.syncMeta.get('lastBackupAt'))?.value as number) ?? 0;
      if (Date.now() - lastAt < BACKUP_INTERVAL) return; // already backed up today
    }

    const sig = await signature();
    const lastSig = ((await db.syncMeta.get('lastBackupSig'))?.value as string) ?? '';
    if (sig === lastSig) return; // nothing changed since the last backup

    const { json, counts } = await buildSnapshot();
    await convexClient.mutation(api.backups.saveBackup, { data: json, counts });
    await db.syncMeta.put({ key: 'lastBackupAt', value: Date.now() });
    await db.syncMeta.put({ key: 'lastBackupSig', value: sig });
  } catch (e) {
    // Best-effort; the manual download + next day's tick are the fallback.
    reportError('sync', e, { action: 'saveBackup' });
  }
}

/** True if the local data tables are all empty (fresh device / post-clear). */
export async function isLocalEmpty(): Promise<boolean> {
  for (const t of BACKUP_TABLES) {
    if ((await (db as any)[t].count()) > 0) return false;
  }
  return true;
}

/** Restore the latest server snapshot into local tables. Returns true if one was applied. */
export async function restoreFromCloud(): Promise<boolean> {
  let backup: { data: string } | null = null;
  try {
    backup = await convexClient.query(api.backups.getBackup, {});
  } catch (e) {
    reportError('sync', e, { action: 'getBackup' });
    return false;
  }
  if (!backup) return false;

  let parsed: { data?: Record<string, unknown[]> };
  try {
    parsed = JSON.parse(backup.data);
  } catch {
    return false;
  }
  const data = parsed?.data ?? {};

  await db.transaction('rw', BACKUP_TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of BACKUP_TABLES) {
      const rows = data[t];
      if (!Array.isArray(rows)) continue;
      await (db as any)[t].clear();
      if (rows.length) await (db as any)[t].bulkAdd(rows);
    }
  });
  return true;
}
