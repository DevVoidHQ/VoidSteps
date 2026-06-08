import { db } from './db';
import { convexClient } from './convex-client';
import { api } from '../../convex/_generated/api';
import { reportError } from './error-store';
import { isSyncEnabled } from './sync-enabled';

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

// Content tables restored as a full replace. Listed in FK-dependency order so
// the re-imported creates resolve parents before children on push (mirrors
// batch.ts CREATE_ORDER). userSettings is intentionally left untouched.
const RESTORE_TABLES = ['paths', 'notebooks', 'routines', 'steps', 'notes', 'reminders'] as const;

// Queue an op only when the user may sync (Pro/Lifetime). For Free this no-ops,
// so a restore is purely local; for Pro it pushes the replace to the server.
async function enqueueRestore(
  entityType: string,
  entityId: string,
  operation: 'create' | 'delete',
  data?: Record<string, unknown>,
) {
  if (!isSyncEnabled()) return;
  await db.syncQueue.add({ entityType: entityType as any, entityId, operation, data, status: 'pending', retryCount: 0, createdAt: Date.now() });
}

/**
 * Restore the latest snapshot as a FULL REPLACE. Wipes current content and
 * re-imports the snapshot rows under fresh local ids (FKs remapped). For Pro
 * this also enqueues deletes for the old server rows + creates for the new ones,
 * so the restore propagates and becomes the truth on every device (the next pull
 * would otherwise revert a local-only restore). Destructive + propagating; the
 * caller gates it behind a confirm. Returns true if a snapshot was applied.
 */
export async function restoreFromCloud(): Promise<boolean> {
  let backup: { data: string } | null = null;
  try {
    backup = await convexClient.query(api.backups.getBackup, {});
  } catch (e) {
    reportError('sync', e, { action: 'getBackup' });
    return false;
  }
  if (!backup) return false;

  let parsed: { data?: Record<string, any[]> };
  try {
    parsed = JSON.parse(backup.data);
  } catch {
    return false;
  }
  const data = parsed?.data ?? {};
  const now = Date.now();
  const newId = () => `local_${crypto.randomUUID()}`;

  await db.transaction(
    'rw',
    [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.syncQueue],
    async () => {
      // Replace = supersede anything pending; start from a clean queue.
      await db.syncQueue.clear();

      // 1. Enqueue deletes for currently-synced rows so the server drops them
      //    (Pro only; Free rows are local-only ids, wiped by the clear below).
      for (const t of RESTORE_TABLES) {
        const current = await (db as any)[t].toArray();
        for (const row of current) {
          if (!String(row._id).startsWith('local_')) await enqueueRestore(t, row._id, 'delete');
        }
      }

      // 2. Map every (non-deleted) snapshot id -> a fresh local id, so the
      //    re-import is a clean set of creates rather than an id-collision merge.
      const idMap = new Map<string, string>();
      const live: Record<string, any[]> = {};
      for (const t of RESTORE_TABLES) {
        live[t] = (Array.isArray(data[t]) ? data[t] : []).filter((r: any) => !r._deleted);
        for (const r of live[t]) idMap.set(r._id, newId());
      }
      const remap = (id: any) => (id == null ? id : idMap.get(id) ?? id);

      // 3. Wipe local content, then re-import with new ids + remapped FKs.
      for (const t of RESTORE_TABLES) await (db as any)[t].clear();
      for (const t of RESTORE_TABLES) {
        for (const r of live[t]) {
          const row: any = { ...r, _id: idMap.get(r._id), updatedAt: now, _localOnly: true, _deleted: false };
          if ('pathId' in row) row.pathId = remap(row.pathId);
          if ('routineId' in row) row.routineId = remap(row.routineId);
          if ('parentId' in row) row.parentId = remap(row.parentId);
          if ('notebookId' in row) row.notebookId = remap(row.notebookId);
          await (db as any)[t].add(row);
          await enqueueRestore(t, row._id, 'create', row);
        }
      }
    },
  );
  return true;
}
