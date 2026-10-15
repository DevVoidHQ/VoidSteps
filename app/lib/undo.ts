import Dexie, { type Table, type Transaction } from "dexie";
import { db, type UndoChange, type UndoEntry } from "./db";

/**
 * App-wide undo and redo for user actions.
 *
 * A user action runs inside one outer transaction tagged as recording. Dexie
 * table hooks capture every row it writes as a before and after image, so an
 * action needs no reverse logic of its own: undo puts the before images back,
 * redo puts the after images back. Writes outside a recording transaction
 * (routine spawns, timer reconcile, retention) are never captured.
 *
 * History lives in the `undoLog` table, so it survives restarts. Undo refuses
 * when a row no longer matches what the action left, rather than overwrite a
 * later change it knows nothing about.
 */

const MAX_ENTRIES = 50;

/** Tables whose rows undo captures. Blob tables and the error log are not user data to undo. */
const TRACKED = [
  "steps",
  "paths",
  "routines",
  "reminders",
  "notebooks",
  "notes",
  "userSettings",
  "timeEntries",
  "activityEvents",
] as const;

type Recording = { changes: Map<string, UndoChange> };
const RECORDING = Symbol("undoRecording");
type TaggedTransaction = Transaction & { [RECORDING]?: Recording; parent?: TaggedTransaction };

function recordingOf(tx: TaggedTransaction | null | undefined): Recording | undefined {
  for (let t = tx; t; t = t.parent) if (t[RECORDING]) return t[RECORDING];
  return undefined;
}

const clone = <T>(value: T): T => structuredClone(value);

function note(rec: Recording, table: string, key: unknown, before: unknown, after: unknown) {
  const id = `${table}:${String(key)}`;
  const existing = rec.changes.get(id);
  // Several writes to one row in one action: keep the first before, the last after.
  if (existing) existing.after = after === null ? null : clone(after);
  else
    rec.changes.set(id, {
      table,
      key: key as string,
      before: before === null ? null : clone(before),
      after: after === null ? null : clone(after),
    });
}

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const name of TRACKED) {
    const table = db.table(name);
    table.hook("creating", function (primKey, obj, tx) {
      const rec = recordingOf(tx as TaggedTransaction);
      if (!rec) return;
      this.onsuccess = (key) => note(rec, name, key ?? primKey, null, obj);
    });
    table.hook("updating", function (_mods, primKey, obj, tx) {
      const rec = recordingOf(tx as TaggedTransaction);
      if (!rec) return;
      const before = clone(obj);
      this.onsuccess = (updated) => note(rec, name, primKey, before, updated);
    });
    table.hook("deleting", function (primKey, obj, tx) {
      const rec = recordingOf(tx as TaggedTransaction);
      if (!rec) return;
      note(rec, name, primKey, obj, null);
    });
  }
}

const allTables = (): Table[] => [...TRACKED.map((n) => db.table(n)), db.undoLog];

/**
 * Wraps a mutation so each call becomes one undoable step labelled `label`.
 * The whole call runs in one transaction, so it is also all or nothing. A call
 * made while another action is recording joins that action.
 */
export function undoable<A extends unknown[], R>(
  label: string,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return (...args: A) => {
    installHooks();
    if (recordingOf(Dexie.currentTransaction as TaggedTransaction | null)) return fn(...args);
    return db.transaction("rw", allTables(), async (tx) => {
      const rec: Recording = { changes: new Map() };
      (tx as TaggedTransaction)[RECORDING] = rec;
      const result = await fn(...args);
      if (rec.changes.size > 0) await pushEntry(label, [...rec.changes.values()]);
      return result;
    });
  };
}

async function pushEntry(label: string, changes: UndoChange[]) {
  // A new action ends the redo branch.
  await db.undoLog.where("undone").equals(1).delete();
  await db.undoLog.add({ label, at: Date.now(), undone: 0, changes });
  const count = await db.undoLog.count();
  if (count > MAX_ENTRIES) {
    const oldest = await db.undoLog
      .orderBy("id")
      .limit(count - MAX_ENTRIES)
      .primaryKeys();
    await db.undoLog.bulkDelete(oldest);
  }
}

/** Order-independent comparison of two stored rows. */
function sameRow(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.keys(v as object)
          .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
          .sort()
          .map((k) => [k, norm((v as Record<string, unknown>)[k])])
      );
    return v;
  };
  return JSON.stringify(norm(a ?? null)) === JSON.stringify(norm(b ?? null));
}

export type UndoResult =
  { status: "done"; label: string } | { status: "empty" } | { status: "conflict"; label: string };

async function apply(direction: "undo" | "redo"): Promise<UndoResult> {
  return db.transaction("rw", allTables(), async () => {
    const entry: UndoEntry | undefined =
      direction === "undo"
        ? await db.undoLog.where("undone").equals(0).last()
        : await db.undoLog.where("undone").equals(1).first();
    if (!entry || entry.id === undefined) return { status: "empty" as const };

    const changes = direction === "undo" ? [...entry.changes].reverse() : entry.changes;
    const expect = (c: UndoChange) => (direction === "undo" ? c.after : c.before);
    const target = (c: UndoChange) => (direction === "undo" ? c.before : c.after);

    for (const c of changes) {
      const current = await db.table(c.table).get(c.key);
      if (!sameRow(current, expect(c))) return { status: "conflict" as const, label: entry.label };
    }
    for (const c of changes) {
      const row = target(c);
      if (row === null) await db.table(c.table).delete(c.key);
      else await db.table(c.table).put(clone(row));
    }
    await db.undoLog.update(entry.id, { undone: direction === "undo" ? 1 : 0 });
    return { status: "done" as const, label: entry.label };
  });
}

export const undo = () => apply("undo");
export const redo = () => apply("redo");

/** Forget all history, for wipe and restore, where old images could resurrect data. */
export const clearUndoHistory = () => db.undoLog.clear();
