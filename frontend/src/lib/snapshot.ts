/**
 * Portable snapshot of the entire local database.
 *
 * This is the only import/export format VoidSteps has. Manual backups, restore
 * after a bad wipe, moving to a new machine, and the one-time migration off the
 * old hosted version all produce or consume this same envelope, so there is a
 * single code path to keep correct.
 *
 * `errorLog` is deliberately excluded: it is diagnostic, not content.
 */
import { db } from './db';
import type {
  LocalStep, LocalPath, LocalRoutine, LocalReminder,
  LocalNotebook, LocalNote, LocalUserSettings,
  LocalTimeEntry, LocalActivityEvent,
} from './db';

export const SNAPSHOT_FORMAT = 'voidsteps-snapshot';
export const SNAPSHOT_VERSION = 1;

export const SNAPSHOT_TABLES = [
  'steps', 'paths', 'routines', 'reminders',
  'notebooks', 'notes', 'userSettings', 'timeEntries', 'activityEvents',
] as const;

export type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];

export interface SnapshotData {
  steps: LocalStep[];
  paths: LocalPath[];
  routines: LocalRoutine[];
  reminders: LocalReminder[];
  notebooks: LocalNotebook[];
  notes: LocalNote[];
  userSettings: LocalUserSettings[];
  timeEntries: LocalTimeEntry[];
  activityEvents: LocalActivityEvent[];
}

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  createdAt: number;
  /** Where the snapshot came from, for support and for the import summary. */
  source: string;
  data: SnapshotData;
}

export type SnapshotCounts = Record<SnapshotTable, number>;

export function countRows(data: SnapshotData): SnapshotCounts {
  return Object.fromEntries(
    SNAPSHOT_TABLES.map((t) => [t, data[t].length])
  ) as SnapshotCounts;
}

export function totalRows(counts: SnapshotCounts): number {
  return SNAPSHOT_TABLES.reduce((sum, t) => sum + counts[t], 0);
}

/**
 * Parse and validate an untrusted snapshot (a file the user picked).
 *
 * Throws with a message meant to be shown as-is. Deliberately strict about the
 * envelope and lenient about row contents: a row missing an optional field is
 * the app's problem to tolerate, but a file that is not a snapshot at all, or
 * is from a newer version that may mean something different, must be refused
 * rather than half-imported.
 */
export function parseSnapshot(raw: string): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error("That file isn't a VoidSteps snapshot.");
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.format !== SNAPSHOT_FORMAT) {
    throw new Error("That file isn't a VoidSteps snapshot.");
  }
  if (typeof obj.version !== 'number' || !Number.isInteger(obj.version)) {
    throw new Error('That snapshot has no version and cannot be read.');
  }
  if (obj.version > SNAPSHOT_VERSION) {
    throw new Error(
      `That snapshot was written by a newer version of VoidSteps (format ${obj.version}, this build reads ${SNAPSHOT_VERSION}). Update the app first.`
    );
  }
  if (typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('That snapshot has no data in it.');
  }

  const rawData = obj.data as Record<string, unknown>;
  const data = {} as SnapshotData;
  for (const table of SNAPSHOT_TABLES) {
    const rows = rawData[table];
    // A snapshot from a build that predates a table simply omits it.
    if (rows === undefined) {
      (data[table] as unknown[]) = [];
      continue;
    }
    if (!Array.isArray(rows)) {
      throw new Error(`That snapshot's "${table}" section is malformed.`);
    }
    for (const row of rows) {
      if (typeof row !== 'object' || row === null || typeof (row as { _id?: unknown })._id !== 'string') {
        throw new Error(`That snapshot has a row in "${table}" with no id.`);
      }
    }
    (data[table] as unknown[]) = rows;
  }

  return {
    format: SNAPSHOT_FORMAT,
    version: obj.version,
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : 0,
    source: typeof obj.source === 'string' ? obj.source : 'unknown',
    data,
  };
}

/** Read the whole local database into a snapshot envelope. */
export async function buildSnapshot(source = 'manual export'): Promise<Snapshot> {
  const [steps, paths, routines, reminders, notebooks, notes, userSettings, timeEntries, activityEvents] =
    await Promise.all([
      db.steps.toArray(),
      db.paths.toArray(),
      db.routines.toArray(),
      db.reminders.toArray(),
      db.notebooks.toArray(),
      db.notes.toArray(),
      db.userSettings.toArray(),
      db.timeEntries.toArray(),
      db.activityEvents.toArray(),
    ]);

  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    createdAt: Date.now(),
    source,
    data: { steps, paths, routines, reminders, notebooks, notes, userSettings, timeEntries, activityEvents },
  };
}

/**
 * Replace the local database with a snapshot.
 *
 * Destructive and total: every table in SNAPSHOT_TABLES is cleared first, so a
 * restore leaves exactly what the file holds rather than a merge whose result
 * depends on what was already there. One transaction, so a failure part-way
 * leaves the original data untouched.
 */
export async function restoreSnapshot(snapshot: Snapshot): Promise<SnapshotCounts> {
  const { data } = snapshot;

  await db.transaction(
    'rw',
    [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.userSettings, db.timeEntries, db.activityEvents],
    async () => {
      // Written out per table rather than looped: Dexie's bulkAdd overloads
      // don't resolve across a union of differently-typed tables.
      await db.steps.clear();
      await db.paths.clear();
      await db.routines.clear();
      await db.reminders.clear();
      await db.notebooks.clear();
      await db.notes.clear();
      await db.userSettings.clear();
      await db.timeEntries.clear();
      await db.activityEvents.clear();

      if (data.steps.length) await db.steps.bulkAdd(data.steps);
      if (data.paths.length) await db.paths.bulkAdd(data.paths);
      if (data.routines.length) await db.routines.bulkAdd(data.routines);
      if (data.reminders.length) await db.reminders.bulkAdd(data.reminders);
      if (data.notebooks.length) await db.notebooks.bulkAdd(data.notebooks);
      if (data.notes.length) await db.notes.bulkAdd(data.notes);
      if (data.userSettings.length) await db.userSettings.bulkAdd(data.userSettings);
      if (data.timeEntries.length) await db.timeEntries.bulkAdd(data.timeEntries);
      if (data.activityEvents.length) await db.activityEvents.bulkAdd(data.activityEvents);
    }
  );

  return countRows(data);
}

/** Filename for a downloaded snapshot: stable prefix, sortable date. */
export function snapshotFilename(at = Date.now()): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `voidsteps-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
