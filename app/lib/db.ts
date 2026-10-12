import Dexie, { type EntityTable } from "dexie";

// --- Entity types ---

export interface LocalStep {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: number;
  failed?: boolean;
  failedAt?: number;
  pathId?: string;
  routineId?: string;
  prioritizedToday: boolean;
  sortOrder?: number;
  dueDate?: number;
  startDate?: number;
  timerStartedAt?: number;
  totalTimeSpentMs?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalPath {
  _id: string;
  title: string;
  description?: string;
  parentId?: string;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalRoutine {
  _id: string;
  title: string;
  description?: string;
  pathId?: string;
  frequency: "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
  nextOccurrence: number;
  autoPrioritize?: boolean;
  // Days after creation that a spawned step is due; undefined means no due date.
  dueOffsetDays?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalReminder {
  _id: string;
  title: string;
  note?: string;
  recurrence: "once" | "yearly" | "monthly";
  date?: number; // once: start-of-day timestamp
  month?: number; // yearly: 1-12
  day?: number; // yearly + monthly: 1-31
  createdAt: number;
  updatedAt: number;
}

export interface LocalNotebook {
  _id: string;
  title: string;
  description?: string;
  sortOrder?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalNote {
  _id: string;
  notebookId: string;
  title: string;
  body: string; // markdown
  sortOrder?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalUserSettings {
  _id: string;
  // Optional so a day-settings-only row can exist before any theme is saved.
  theme?: Record<string, string>;
  // Day-boundary config - see recurrence.ts DayBoundaryOpts.
  // "End of day": minutes past midnight when the logical day rolls over.
  dayTurnoverMinutes?: number;
  // "Start of day": minutes past midnight when routines spawn.
  routineSpawnMinutes?: number;
  // Last observed device UTC offset. Scheduling uses the current device offset.
  utcOffsetMinutes?: number;
  updatedAt: number;
}

// One tracked work session on a step. Immutable by convention: minted only when
// the timer STOPS (a running timer lives on steps.timerStartedAt, never here).
// The only mutations are rare user edits, such as fixing a forgotten stop.
export interface LocalTimeEntry {
  _id: string;
  stepId: string;
  // Denormalized so the Day Log can still render entries whose step was deleted.
  stepTitle: string;
  start: number; // ms epoch, client clock (same domain as timerStartedAt)
  end: number; // never null - the row exists only after stop
  durationMs: number; // max(0, end - start), client-computed (skew-proof)
  source: "timer" | "manual";
  createdAt: number;
  updatedAt: number;
}

export type ActivityEventType =
  | "completed"
  | "uncompleted"
  | "failed"
  | "unfailed"
  | "archived"
  | "unarchived"
  | "field_changed"
  | "time_adjusted";

export type ActivityField =
  "title" | "description" | "dueDate" | "startDate" | "pathId" | "prioritizedToday";

// Append-only audit log of user interactions with a step (date changed,
// priority toggled, completed, ...). Written ONLY from user-intent mutations in
// local-mutations.ts - never from sync/merge/restore paths, or every pull would
// re-log remote changes as fresh events on every device. "created" is not
// stored: the activity view synthesizes it from step.createdAt.
export interface LocalActivityEvent {
  _id: string;
  stepId: string;
  type: ActivityEventType;
  field?: ActivityField; // only for field_changed
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
  at: number;
  createdAt: number;
  updatedAt: number;
}

export interface ErrorLogEntry {
  id?: number;
  category: "sync" | "mutation" | "render" | "network";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

// --- Database class ---

/**
 * A wallpaper or audio track the user picked for focus mode. Exactly one row
 * of each kind: the choice is app-wide, not per path or per step.
 */
export interface LocalFocusMedia {
  _id: "wallpaper" | "audio";
  blob: Blob;
  /** Original filename, shown in Settings so the choice is recognisable. */
  name: string;
  updatedAt: number;
}

/**
 * A typeface the user imported. Exactly one row: the choice is app-wide.
 *
 * The app ships Geist (SIL OFL) as its default and cannot ship the DevVoid
 * brand face, Satoshi, because Fontshare licenses it as proprietary freeware
 * that must not be redistributed. Importing is how you get your own face back
 * without the repository ever carrying the file.
 */
export interface LocalUserFont {
  _id: "ui";
  blob: Blob;
  /** Original filename, shown in Settings so the choice is recognisable. */
  name: string;
  /** Family name registered with the document, derived from the filename. */
  family: string;
  updatedAt: number;
}

export class VoidStepsDB extends Dexie {
  steps!: EntityTable<LocalStep, "_id">;
  paths!: EntityTable<LocalPath, "_id">;
  routines!: EntityTable<LocalRoutine, "_id">;
  reminders!: EntityTable<LocalReminder, "_id">;
  notebooks!: EntityTable<LocalNotebook, "_id">;
  notes!: EntityTable<LocalNote, "_id">;
  userSettings!: EntityTable<LocalUserSettings, "_id">;
  timeEntries!: EntityTable<LocalTimeEntry, "_id">;
  activityEvents!: EntityTable<LocalActivityEvent, "_id">;
  errorLog!: EntityTable<ErrorLogEntry, "id">;
  focusMedia!: EntityTable<LocalFocusMedia, "_id">;
  userFonts!: EntityTable<LocalUserFont, "_id">;

  constructor(name = "voidsteps") {
    super(name);

    this.version(1).stores({
      steps: "_id, pathId, parentId, routineId, updatedAt",
      paths: "_id, parentId, updatedAt",
      routines: "_id, nextOccurrence, updatedAt",
      pathways: "_id, parentId, updatedAt",
      userSettings: "_id, userId",
      syncQueue: "++id, entityType, entityId, status, createdAt",
      syncMeta: "key",
    });

    this.version(2).stores({
      steps: "_id, pathId, parentId, routineId, updatedAt",
      paths: "_id, parentId, updatedAt",
      routines: "_id, nextOccurrence, updatedAt",
      pathways: "_id, parentId, updatedAt",
      userSettings: "_id, userId",
      syncQueue: "++id, entityType, entityId, status, createdAt",
      syncMeta: "key",
      errorLog: "++id, category, timestamp, reported",
    });

    // v3: adds lastError to syncQueue entries (no index change needed)
    this.version(3).stores({
      steps: "_id, pathId, parentId, routineId, updatedAt",
      paths: "_id, parentId, updatedAt",
      routines: "_id, nextOccurrence, updatedAt",
      pathways: "_id, parentId, updatedAt",
      userSettings: "_id, userId",
      syncQueue: "++id, entityType, entityId, status, createdAt",
      syncMeta: "key",
      errorLog: "++id, category, timestamp, reported",
    });

    // v4: notebooks + notes (2-level notes hierarchy)
    this.version(4).stores({
      steps: "_id, pathId, parentId, routineId, updatedAt",
      paths: "_id, parentId, updatedAt",
      routines: "_id, nextOccurrence, updatedAt",
      pathways: "_id, parentId, updatedAt",
      notebooks: "_id, updatedAt",
      notes: "_id, notebookId, pathId, updatedAt",
      userSettings: "_id, userId",
      syncQueue: "++id, entityType, entityId, status, createdAt",
      syncMeta: "key",
      errorLog: "++id, category, timestamp, reported",
    });

    // v5: reminders (passive calendar markers)
    this.version(5).stores({
      steps: "_id, pathId, parentId, routineId, updatedAt",
      paths: "_id, parentId, updatedAt",
      routines: "_id, nextOccurrence, updatedAt",
      reminders: "_id, recurrence, date, updatedAt",
      pathways: "_id, parentId, updatedAt",
      notebooks: "_id, updatedAt",
      notes: "_id, notebookId, pathId, updatedAt",
      userSettings: "_id, userId",
      syncQueue: "++id, entityType, entityId, status, createdAt",
      syncMeta: "key",
      errorLog: "++id, category, timestamp, reported",
    });

    // v6: sub-steps removed - drop the parentId index from steps.
    this.version(6).stores({
      steps: "_id, pathId, routineId, updatedAt",
    });

    // v7: pathways feature removed - drop the table and purge any queued
    // pathway sync ops so the engine never tries to push a deleted entity type.
    this.version(7)
      .stores({ pathways: null })
      .upgrade(async (tx) => {
        await tx.table("syncQueue").where("entityType").equals("pathways").delete();
      });

    // v8: note→path linking removed - drop the pathId index on notes.
    this.version(8).stores({
      notes: "_id, notebookId, updatedAt",
    });

    // v9: timesheets - per-session time entries + append-only activity log.
    this.version(9).stores({
      timeEntries: "_id, stepId, start, updatedAt",
      activityEvents: "_id, stepId, at, updatedAt",
    });

    // v10: sync removed. Drop the queue and cursor tables, collapse soft
    // deletes to hard deletes (`_deleted` only ever existed so a tombstone
    // could be pushed to the server, and rows carrying it are already invisible
    // in the UI), and drop `userSettings.userId` now that there is exactly one
    // local user.
    this.version(10)
      .stores({
        syncQueue: null,
        syncMeta: null,
        userSettings: "_id",
        errorLog: "++id, category, timestamp",
      })
      .upgrade(async (tx) => {
        const tables = [
          "steps",
          "paths",
          "routines",
          "reminders",
          "notebooks",
          "notes",
          "userSettings",
          "timeEntries",
          "activityEvents",
        ];
        for (const name of tables) {
          const table = tx.table(name);
          const rows = await table.toArray();
          const doomed = rows.filter((r) => r._deleted).map((r) => r._id);
          if (doomed.length) await table.bulkDelete(doomed);
          const survivors = rows.filter((r) => !r._deleted);
          if (survivors.length) {
            await table.bulkPut(survivors.map(({ _localOnly, _deleted, userId, ...rest }) => rest));
          }
        }
      });

    // v11: focus mode media. Wallpapers and audio the user picks, held as
    // Blobs. Deliberately NOT in SNAPSHOT_TABLES: these are cosmetic and
    // re-pickable, and base64ing them into the JSON backup would add tens of
    // megabytes to every export. Moving machines means re-picking them.
    this.version(11).stores({
      focusMedia: "_id",
    });

    // v12: `userFonts` holds a typeface the user imported. Same Blob-in-Dexie
    // shape as focusMedia, and NOT in SNAPSHOT_TABLES for the same reason:
    // cosmetic, re-pickable, and megabytes we refuse to base64 into every
    // backup. The app ships Geist and falls back to it whenever this row is
    // missing or the file turns out to be unreadable.
    //
    // No data migration here on purpose. The calendar's recurrence projection
    // is being corrected in this same change, but that only ever affected what
    // the calendar DREW; stored `nextOccurrence` values were computed by
    // recurrence.ts, which was already right, so there is nothing to rewrite.
    this.version(12).stores({
      userFonts: "_id",
    });
  }
}

export const db = new VoidStepsDB();
