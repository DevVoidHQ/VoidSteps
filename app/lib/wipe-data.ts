/**
 * Data wipe utilities for the Settings → Data (danger zone) tab.
 *
 * Every wipe is destructive and local: rows are hard-removed from Dexie. There
 * is no recovery beyond a snapshot restore.
 *
 * Cascade rules (only meaningful for "delete all of a type"):
 *  - Notebooks ALWAYS take their notes with them (a note can't exist without a
 *    notebook, so there's no valid orphan state). Forced, not optional.
 *  - Paths optionally take their steps (cascade=true). With cascade off, paths
 *    are removed and any step keeps its now-dangling pathId, which the UI
 *    tolerates (renders as unfiled).
 */
import { db } from "./db";

export type WipeEntity = "steps" | "paths" | "routines" | "reminders" | "notebooks" | "notes";

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
// as a common shape with the fields we care about.
type Row = { _id: string; pathId?: string };

function tableFor(name: WipeEntity) {
  return db[name] as unknown as {
    toArray: () => Promise<Row[]>;
    bulkDelete: (keys: string[]) => Promise<void>;
  };
}

/** Row counts per entity, for the confirm modal. */
export async function getDataCounts(): Promise<Record<WipeEntity, number>> {
  const entries = await Promise.all(
    WIPE_ENTITIES.map(async (name) => {
      return [name, await db[name].count()] as const;
    })
  );
  return Object.fromEntries(entries) as Record<WipeEntity, number>;
}

/** Retained history counts, including entries whose step has been deleted. */
export async function getHistoryCounts() {
  const [timeEntries, activityEvents] = await Promise.all([
    db.timeEntries.count(),
    db.activityEvents.count(),
  ]);
  return { timeEntries, activityEvents };
}

/** How many steps a cascade delete of all paths would additionally take. */
export async function getPathCascadeImpact(): Promise<{ steps: number }> {
  const steps = await tableFor("steps").toArray();
  return {
    steps: steps.filter((s) => s.pathId != null).length,
  };
}

/** Delete every row of `name` matching `predicate`. Returns the ids removed. */
async function deleteMatching(
  name: WipeEntity,
  predicate: (r: Row) => boolean = () => true
): Promise<string[]> {
  const rows = (await tableFor(name).toArray()).filter(predicate);
  await tableFor(name).bulkDelete(rows.map((r) => r._id));
  return rows.map((r) => r._id);
}

/** Forced cascade: wiped steps take their time entries and activity events. */
async function cleanupStepChildren(stepIds: Set<string>): Promise<void> {
  if (stepIds.size === 0) return;

  const entries = (await db.timeEntries.toArray()).filter((e) => stepIds.has(e.stepId));
  await db.timeEntries.bulkDelete(entries.map((e) => e._id));

  const events = (await db.activityEvents.toArray()).filter((ev) => stepIds.has(ev.stepId));
  await db.activityEvents.bulkDelete(events.map((ev) => ev._id));
}

/**
 * Wipe all rows of the given entity types (plus forced/optional cascades).
 * Runs in a single transaction so a failure mid-way doesn't leave a partial,
 * inconsistent state.
 */
export async function wipeData(
  names: WipeEntity[],
  opts: { cascade?: boolean } = {}
): Promise<void> {
  const set = new Set(names);
  const cascade = !!opts.cascade;

  await db.transaction(
    "rw",
    [
      db.steps,
      db.paths,
      db.routines,
      db.reminders,
      db.notebooks,
      db.notes,
      db.timeEntries,
      db.activityEvents,
    ],
    async () => {
      const removedStepIds = new Set<string>();
      // Forced: notebooks take all their notes.
      if (set.has("notebooks")) {
        await deleteMatching("notes");
      }
      // Optional: paths take the steps that reference a path.
      if (set.has("paths") && cascade) {
        for (const id of await deleteMatching("steps", (s) => s.pathId != null))
          removedStepIds.add(id);
      }
      // Primary per-type deletes.
      for (const name of set) {
        const ids = await deleteMatching(name);
        if (name === "steps") for (const id of ids) removedStepIds.add(id);
      }
      // Forced: wiped steps take their timesheet entries + activity log.
      if (set.has("steps")) {
        // A complete step wipe also erases history retained by individual deletes.
        await db.timeEntries.clear();
        await db.activityEvents.clear();
      } else {
        await cleanupStepChildren(removedStepIds);
      }
    }
  );
}
