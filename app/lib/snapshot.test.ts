import { describe, it, expect, afterEach, vi } from "vitest";
import {
  parseSnapshot,
  countRows,
  totalRows,
  snapshotFilename,
  buildSnapshot,
  restoreSnapshot,
  SNAPSHOT_FORMAT,
  SNAPSHOT_VERSION,
  SNAPSHOT_TABLES,
  type SnapshotData,
} from "./snapshot";
import { db } from "./db";

const emptyData = () =>
  Object.fromEntries(SNAPSHOT_TABLES.map((t) => [t, []])) as unknown as SnapshotData;

const envelope = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    createdAt: 1000,
    source: "test",
    data: emptyData(),
    ...over,
  });

describe("parseSnapshot", () => {
  it("accepts a well-formed snapshot", () => {
    const snap = parseSnapshot(envelope());
    expect(snap.format).toBe(SNAPSHOT_FORMAT);
    expect(snap.createdAt).toBe(1000);
    expect(snap.source).toBe("test");
  });

  it("rejects non-JSON", () => {
    expect(() => parseSnapshot("not json at all")).toThrow(/valid JSON/);
  });

  it("rejects JSON that is not an object", () => {
    expect(() => parseSnapshot("[1,2,3]")).toThrow(/isn't a VoidSteps snapshot/);
    expect(() => parseSnapshot("null")).toThrow(/isn't a VoidSteps snapshot/);
  });

  it("rejects a foreign file with the wrong format tag", () => {
    expect(() => parseSnapshot(envelope({ format: "something-else" }))).toThrow(
      /isn't a VoidSteps snapshot/
    );
  });

  it("rejects a snapshot from a newer format version", () => {
    expect(() => parseSnapshot(envelope({ version: SNAPSHOT_VERSION + 1 }))).toThrow(
      /newer version of VoidSteps/
    );
  });

  it("rejects a missing or non-integer version", () => {
    expect(() => parseSnapshot(envelope({ version: undefined }))).toThrow(/no version/);
    expect(() => parseSnapshot(envelope({ version: 1.5 }))).toThrow(/no version/);
  });

  it("rejects a missing data section", () => {
    expect(() => parseSnapshot(envelope({ data: undefined }))).toThrow(/no data in it/);
  });

  it("rejects a table that is not an array", () => {
    const data = { ...emptyData(), steps: { nope: true } };
    expect(() => parseSnapshot(envelope({ data }))).toThrow(/"steps" section is malformed/);
  });

  it("rejects a row with no id, naming the table", () => {
    const data = { ...emptyData(), notes: [{ title: "orphan" }] };
    expect(() => parseSnapshot(envelope({ data }))).toThrow(/row in "notes" with no id/);
  });

  it("treats an omitted table as empty rather than failing", () => {
    const data = emptyData() as unknown as Record<string, unknown>;
    delete data.timeEntries;
    const snap = parseSnapshot(envelope({ data }));
    expect(snap.data.timeEntries).toEqual([]);
  });

  it("accepts an older format version", () => {
    expect(() => parseSnapshot(envelope({ version: 1 }))).not.toThrow();
  });

  it("defaults createdAt and source when absent", () => {
    const snap = parseSnapshot(envelope({ createdAt: undefined, source: undefined }));
    expect(snap.createdAt).toBe(0);
    expect(snap.source).toBe("unknown");
  });

  it("keeps rows intact", () => {
    const data = {
      ...emptyData(),
      steps: [
        {
          _id: "a",
          title: "Ship it",
          completed: false,
          prioritizedToday: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };
    const snap = parseSnapshot(envelope({ data }));
    expect(snap.data.steps).toEqual(data.steps);
  });
});

describe("countRows", () => {
  it("counts every table and totals them", () => {
    const data = {
      ...emptyData(),
      steps: [{ _id: "a" }, { _id: "b" }],
      notes: [{ _id: "c" }],
    } as unknown as SnapshotData;
    const counts = countRows(data);
    expect(counts.steps).toBe(2);
    expect(counts.notes).toBe(1);
    expect(counts.paths).toBe(0);
    expect(totalRows(counts)).toBe(3);
  });
});

describe("snapshotFilename", () => {
  it("is sortable and zero-padded", () => {
    // 2026-03-04 09:05 local
    const at = new Date(2026, 2, 4, 9, 5).getTime();
    expect(snapshotFilename(at)).toBe("voidsteps-2026-03-04-0905.json");
  });
});

describe("buildSnapshot / restoreSnapshot round trip against a real database", () => {
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it("exports what is seeded, wipes clean, and restores it byte-for-byte", async () => {
    const now = Date.now();
    await db.steps.add({
      _id: "step-1",
      title: "Ship it",
      completed: false,
      prioritizedToday: false,
      createdAt: now,
      updatedAt: now,
    });
    await db.paths.add({ _id: "path-1", title: "Launch", createdAt: now, updatedAt: now });
    await db.notebooks.add({ _id: "nb-1", title: "Ideas", createdAt: now, updatedAt: now });
    await db.notes.add({
      _id: "note-1",
      notebookId: "nb-1",
      title: "Note",
      body: "x",
      createdAt: now,
      updatedAt: now,
    });
    await db.timeEntries.add({
      _id: "te-1",
      stepId: "step-1",
      stepTitle: "Ship it",
      start: now - 1000,
      end: now,
      durationMs: 1000,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });

    const snap = await buildSnapshot("test");
    expect(snap.data.steps).toHaveLength(1);
    expect(snap.data.paths).toHaveLength(1);
    expect(snap.data.notebooks).toHaveLength(1);
    expect(snap.data.notes).toHaveLength(1);
    expect(snap.data.timeEntries).toHaveLength(1);

    await Promise.all(db.tables.map((t) => t.clear()));
    expect(await db.steps.count()).toBe(0);

    const counts = await restoreSnapshot(snap);
    expect(totalRows(counts)).toBe(5);

    expect(await db.steps.toArray()).toEqual([
      {
        _id: "step-1",
        title: "Ship it",
        completed: false,
        prioritizedToday: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    expect((await db.paths.get("path-1"))?.title).toBe("Launch");
    expect((await db.notes.get("note-1"))?.body).toBe("x");
    expect((await db.timeEntries.get("te-1"))?.durationMs).toBe(1000);
  });

  it("restore is total: a table that is empty in the snapshot wipes what was there, rather than merging", async () => {
    const now = Date.now();
    await db.steps.add({
      _id: "stale",
      title: "Stale",
      completed: false,
      prioritizedToday: false,
      createdAt: now,
      updatedAt: now,
    });

    const empty = Object.fromEntries(
      SNAPSHOT_TABLES.map((t) => [t, []])
    ) as unknown as SnapshotData;
    await restoreSnapshot({
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION,
      createdAt: now,
      source: "test",
      data: empty,
    });

    expect(await db.steps.count()).toBe(0);
  });
});

describe("restore validation and rollback", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(db.tables.map((table) => table.clear()));
  });
  it("rejects malformed input before removing any existing rows", async () => {
    const existing = {
      _id: "safe",
      title: "Keep",
      completed: false,
      prioritizedToday: false,
      createdAt: 1,
      updatedAt: 1,
    };
    await db.steps.add(existing);
    const snapshot = {
      ...parseSnapshot(envelope()),
      data: { ...emptyData(), steps: [{ ...existing, title: 42 }] },
    };
    await expect(
      restoreSnapshot(snapshot as unknown as Parameters<typeof restoreSnapshot>[0])
    ).rejects.toThrow(/title/);
    expect(await db.steps.toArray()).toEqual([existing]);
  });
  it.each([
    ["steps", { _id: "s", title: 42 }],
    ["notes", { _id: "n", title: "Note", body: 42 }],
    ["routines", { _id: "r", title: "Task", frequency: "sometimes" }],
    ["userSettings", { _id: "u", updatedAt: 1, dayTurnoverMinutes: "3" }],
  ])("rejects invalid fields in %s", (table, row) => {
    expect(() => parseSnapshot(envelope({ data: { ...emptyData(), [table]: [row] } }))).toThrow(
      /invalid/
    );
  });
  it("rejects duplicate ids and cycles without changing the database", () => {
    const path = { _id: "p", title: "Path", createdAt: 1, updatedAt: 1 };
    expect(() => parseSnapshot(envelope({ data: { paths: [path, path] } }))).toThrow(/duplicate/);
    expect(() =>
      parseSnapshot(envelope({ data: { paths: [{ ...path, parentId: "p" }] } }))
    ).toThrow(/circular/);
    expect(() => parseSnapshot(envelope({ data: [] }))).toThrow(/no data/);
    expect(() => parseSnapshot(envelope({ version: 0 }))).toThrow(/version/);
  });
  it("restores the previous database when a later table write fails", async () => {
    await db.paths.add({ _id: "old", title: "Keep", createdAt: 1, updatedAt: 1 });
    const snapshot = parseSnapshot(
      envelope({
        data: {
          notes: [
            {
              _id: "new",
              title: "New",
              body: "body",
              notebookId: "nb",
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        },
      })
    );
    vi.spyOn(db.notes, "bulkAdd").mockRejectedValueOnce(new Error("Quota exceeded"));
    await expect(restoreSnapshot(snapshot)).rejects.toThrow("Quota exceeded");
    expect(await db.paths.get("old")).toBeDefined();
    expect(await db.notes.count()).toBe(0);
  });
});
