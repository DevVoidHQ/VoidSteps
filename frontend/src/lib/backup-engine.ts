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
const BACKUP_TABLES = ['steps', 'paths', 'routines', 'reminders', 'notebooks', 'notes', 'userSettings', 'timeEntries', 'activityEvents'] as const;

// The snapshot has a hard server-side size cap (MAX_BACKUP_BYTES ~900KB) and
// silently stops updating once exceeded, so the append-only tables only
// contribute bounded windows: the snapshot is a disaster-recovery net, not an
// archive. Tombstoned entries are dead weight and are dropped outright.
const BACKUP_EVENTS_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const BACKUP_ENTRIES_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const SNAPSHOT_VERSION = 1;

// Client-side budget, safely under the server's 900KB cap. A snapshot that
// exceeds the server cap is REJECTED and the daily backup silently stops
// updating - so when the windowed snapshot still doesn't fit, buildSnapshot
// degrades the timesheet tables (never the core content) until it does.
const BACKUP_BYTE_BUDGET = 850_000;

export type SnapshotCounts = Record<string, number>;

async function buildSnapshot(): Promise<{ json: string; counts: SnapshotCounts }> {
  const data: Record<string, unknown[]> = {};
  const counts: SnapshotCounts = {};
  for (const t of BACKUP_TABLES) {
    let rows = await (db as any)[t].toArray();
    if (t === 'activityEvents') {
      const cutoff = Date.now() - BACKUP_EVENTS_WINDOW_MS;
      rows = rows.filter((r: any) => (r.at ?? 0) >= cutoff);
    } else if (t === 'timeEntries') {
      const cutoff = Date.now() - BACKUP_ENTRIES_WINDOW_MS;
      rows = rows.filter((r: any) => !r._deleted && (r.end ?? 0) >= cutoff);
    }
    data[t] = rows;
    counts[t] = rows.length;
  }

  const serialize = () => JSON.stringify({ version: SNAPSHOT_VERSION, exportedAt: Date.now(), data });
  let json = serialize();

  // Degrade to fit: drop the activity log first (it is never restored), then
  // halve time entries newest-first until the snapshot fits. Core content
  // (steps/paths/notes/...) is never trimmed - if it alone exceeds the budget
  // the snapshot was already over the cap before timesheets existed.
  if (json.length > BACKUP_BYTE_BUDGET) {
    data.activityEvents = [];
    counts.activityEvents = 0;
    json = serialize();
  }
  while (json.length > BACKUP_BYTE_BUDGET && (data.timeEntries as any[]).length > 0) {
    const entries = (data.timeEntries as any[]).sort((a, b) => (b.end ?? 0) - (a.end ?? 0));
    data.timeEntries = entries.slice(0, Math.floor(entries.length / 2));
    counts.timeEntries = data.timeEntries.length;
    json = serialize();
  }

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
// activityEvents are deliberately NOT restored: events are immutable (no
// tombstones), so re-importing them under fresh ids would duplicate every
// timeline row on other devices. A restore wipes the local activity log and
// history restarts from the restore point.
const RESTORE_TABLES = ['paths', 'notebooks', 'routines', 'steps', 'timeEntries', 'notes', 'reminders'] as const;

// Queue an op only when the user may sync (Pro/Lifetime). For Free this no-ops,
// so a restore is purely local; for Pro it pushes the replace to the server.
async function enqueueRestore(
  entityType: string,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
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

  let parsed: { data?: Record<string, any[]>; exportedAt?: number };
  try {
    parsed = JSON.parse(backup.data);
  } catch {
    return false;
  }
  const data = parsed?.data ?? {};
  const now = Date.now();
  const newId = () => `local_${crypto.randomUUID()}`;

  // The snapshot only covers a window of time entries (see buildSnapshot), so
  // the replace must be equally windowed: replacing ALL entries from a partial
  // snapshot would permanently destroy the history outside its coverage. A
  // pre-timesheets snapshot (no timeEntries key) leaves timesheet data alone.
  const hasTimesheets = Array.isArray(data.timeEntries);
  const exportedAt = typeof parsed?.exportedAt === 'number' ? parsed.exportedAt : now;
  const entriesCutoff = exportedAt - BACKUP_ENTRIES_WINDOW_MS;

  await db.transaction(
    'rw',
    [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.timeEntries, db.activityEvents, db.syncQueue],
    async () => {
      // Replace = supersede anything pending; start from a clean queue.
      await db.syncQueue.clear();

      // 1. Enqueue deletes for currently-synced rows so the server drops them
      //    (Pro only; Free rows are local-only ids, wiped by the clear below).
      //    Time entries are TOMBSTONED instead of deleted: other devices pull
      //    this table by cursor, so a hard delete (absence) would never reach
      //    them, but a tombstone update does.
      const restoreNow = Date.now();
      for (const t of RESTORE_TABLES) {
        const current = await (db as any)[t].toArray();
        for (const row of current) {
          if (String(row._id).startsWith('local_')) continue;
          if (t === 'timeEntries') {
            // Only tombstone entries the snapshot actually covers; anything
            // outside its window (or already tombstoned) is left as-is.
            if (!hasTimesheets || row._deleted || (row.end ?? 0) < entriesCutoff) continue;
            await enqueueRestore(t, row._id, 'update', { deleted: true, updatedAt: restoreNow });
          } else {
            await enqueueRestore(t, row._id, 'delete');
          }
        }
      }

      // Activity history is wiped, not restored (see RESTORE_TABLES note).
      // Pre-timesheets snapshots don't touch it.
      if (hasTimesheets) await db.activityEvents.clear();

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
      // timeEntries are wiped only within the snapshot's coverage window;
      // out-of-window history survives (its stepIds dangle after the steps are
      // re-minted, which the UI tolerates via the denormalized stepTitle).
      for (const t of RESTORE_TABLES) {
        if (t === 'timeEntries') {
          if (hasTimesheets) {
            await db.timeEntries.filter((r) => (r.end ?? 0) >= entriesCutoff).delete();
          }
        } else {
          await (db as any)[t].clear();
        }
      }
      for (const t of RESTORE_TABLES) {
        for (const r of live[t]) {
          const row: any = { ...r, _id: idMap.get(r._id), updatedAt: now, _localOnly: true, _deleted: false };
          if ('pathId' in row) row.pathId = remap(row.pathId);
          if ('routineId' in row) row.routineId = remap(row.routineId);
          if ('parentId' in row) row.parentId = remap(row.parentId);
          if ('notebookId' in row) row.notebookId = remap(row.notebookId);
          if ('stepId' in row) row.stepId = remap(row.stepId);
          await (db as any)[t].add(row);
          // A time entry whose step wasn't in the snapshot AND never synced
          // (local_ ref outside the id map) can never resolve server-side; a
          // queued create would just fail v.id validation until marked failed.
          // Keep such rows local-only.
          if (t === 'timeEntries' && String(row.stepId ?? '').startsWith('local_') && !idMap.has(r.stepId)) {
            continue;
          }
          await enqueueRestore(t, row._id, 'create', row);
        }
      }
    },
  );
  return true;
}
