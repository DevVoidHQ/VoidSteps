/**
 * Data wipe utilities for the Settings → Data (danger zone) tab.
 *
 * Every wipe is destructive and propagates to the server: for each removed row
 * that already exists on the server we enqueue a `delete` op and drop any
 * pending create/update for it, then hard-remove the local row. The next sync
 * pushes the deletes so the data is gone on every device. There is no recovery.
 *
 * Cascade rules (only meaningful for "delete all of a type"):
 *  - Notebooks ALWAYS take their notes with them (a note can't exist without a
 *    notebook, so there's no valid orphan state). Forced, not optional.
 *  - Paths optionally take their steps (cascade=true). With cascade off, paths
 *    are removed and any step keeps its now-dangling pathId, which the UI
 *    tolerates (renders as unfiled). This matches how the server leaves steps
 *    untouched when a path is deleted.
 */
import { db } from "./db";

export type WipeEntity =
  | "steps"
  | "paths"
  | "routines"
  | "reminders"
  | "notebooks"
  | "notes";

/** Order used for the per-type rows in the UI. */
export const WIPE_ENTITIES: WipeEntity[] = [
  "steps",
  "paths",
  "routines",
  "reminders",
  "notebooks",
  "notes",
];

export const WIPE_ENTITY_LABELS: Record<WipeEntity, string> = {
  steps: "Steps",
  paths: "Paths",
  routines: "Routines",
  reminders: "Reminders",
  notebooks: "Notebooks",
  notes: "Notes",
};

// Dexie tables are differently-typed per entity; index loosely and treat rows
// as a common shape with the local metadata fields we care about.
type Row = { _id: string; _deleted?: boolean; _localOnly?: boolean; pathId?: string };

function tableFor(name: WipeEntity) {
  return db[name] as unknown as {
    toArray: () => Promise<Row[]>;
    bulkDelete: (keys: string[]) => Promise<void>;
  };
}

/** Live (not soft-deleted) counts per entity, for the confirm modal. */
export async function getDataCounts(): Promise<Record<WipeEntity, number>> {
  const entries = await Promise.all(
    WIPE_ENTITIES.map(async (name) => {
      const rows = await tableFor(name).toArray();
      return [name, rows.filter((r) => !r._deleted).length] as const;
    })
  );
  return Object.fromEntries(entries) as Record<WipeEntity, number>;
}

/** How many steps a cascade delete of all paths would additionally take. */
export async function getPathCascadeImpact(): Promise<{ steps: number }> {
  const steps = await tableFor("steps").toArray();
  return {
    steps: steps.filter((s) => !s._deleted && s.pathId != null).length,
  };
}

/**
 * Delete every row of `name` matching `predicate`. Enqueues server deletes for
 * already-synced rows, purges any pending queue ops for removed rows, then
 * hard-removes them locally. Returns the ids removed.
 */
async function deleteMatching(name: WipeEntity, predicate: (r: Row) => boolean = () => true): Promise<string[]> {
  const rows = (await tableFor(name).toArray()).filter((r) => !r._deleted && predicate(r));
  for (const row of rows) {
    // Drop any pending create/update so a half-synced row isn't recreated.
    await db.syncQueue.where("entityId").equals(row._id).delete();
    // Only rows that exist on the server need an explicit delete pushed.
    if (!row._localOnly) {
      await db.syncQueue.add({
        entityType: name,
        entityId: row._id,
        operation: "delete",
        status: "pending",
        retryCount: 0,
        createdAt: Date.now(),
      });
    }
  }
  await tableFor(name).bulkDelete(rows.map((r) => r._id));
  return rows.map((r) => r._id);
}

/**
 * Forced cascade: wiped steps take their time entries and activity events.
 * Without this, queued entry/event creates keep referencing wiped local_ steps
 * and fail server validation forever. Synced entries are tombstoned (the
 * cursor pull can't learn a delete from absence, but it delivers the tombstone
 * to other devices); events are immutable server-side and only removed locally.
 */
async function cleanupStepChildren(stepIds: Set<string>): Promise<void> {
  if (stepIds.size === 0) return;
  const now = Date.now();

  const entries = (await db.timeEntries.toArray()).filter((e) => stepIds.has(e.stepId));
  for (const e of entries) {
    await db.syncQueue.where("entityId").equals(e._id).delete();
    if (!e._localOnly && !e._deleted) {
      await db.syncQueue.add({
        entityType: "timeEntries",
        entityId: e._id,
        operation: "update",
        data: { deleted: true, updatedAt: now },
        status: "pending",
        retryCount: 0,
        createdAt: now,
      });
    }
  }
  await db.timeEntries.bulkDelete(entries.map((e) => e._id));

  const events = (await db.activityEvents.toArray()).filter((ev) => stepIds.has(ev.stepId));
  for (const ev of events) {
    await db.syncQueue.where("entityId").equals(ev._id).delete();
  }
  await db.activityEvents.bulkDelete(events.map((ev) => ev._id));
}

/**
 * Wipe all rows of the given entity types (plus forced/optional cascades).
 * Runs in a single transaction so a failure mid-way doesn't leave a partial,
 * inconsistent state.
 */
export async function wipeData(names: WipeEntity[], opts: { cascade?: boolean } = {}): Promise<void> {
  const set = new Set(names);
  const cascade = !!opts.cascade;

  await db.transaction(
    "rw",
    [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.timeEntries, db.activityEvents, db.syncQueue],
    async () => {
      const removedStepIds = new Set<string>();
      // Forced: notebooks take all their notes.
      if (set.has("notebooks")) {
        await deleteMatching("notes");
      }
      // Optional: paths take the steps that reference a path.
      if (set.has("paths") && cascade) {
        for (const id of await deleteMatching("steps", (s) => s.pathId != null)) removedStepIds.add(id);
      }
      // Primary per-type deletes.
      for (const name of set) {
        const ids = await deleteMatching(name);
        if (name === "steps") for (const id of ids) removedStepIds.add(id);
      }
      // Forced: wiped steps take their timesheet entries + activity log.
      await cleanupStepChildren(removedStepIds);
    }
  );
}
