import Dexie from "dexie";
import { expect, it } from "vitest";
import { VoidStepsDB } from "./db";

it("upgrades a v6 database through sync removal without losing live content", async () => {
  const name = `migration-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(6).stores({
    steps: "_id, pathId, routineId, updatedAt",
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
  const upgraded = new VoidStepsDB(name);
  try {
    await old.table("steps").bulkAdd([
      {
        _id: "live",
        title: "Keep",
        completed: false,
        prioritizedToday: false,
        createdAt: 1,
        updatedAt: 1,
        userId: "old-account",
        _localOnly: true,
        _deleted: false,
      },
      { _id: "deleted", title: "Tombstone", _deleted: true },
    ]);
    await old.table("notes").add({
      _id: "note",
      notebookId: "nb",
      title: "Note",
      body: "Original text",
      createdAt: 1,
      updatedAt: 1,
      userId: "old-account",
    });
    await old.table("syncQueue").add({ entityType: "pathways", entityId: "gone" });
    old.close();
    await upgraded.open();
    expect(await upgraded.steps.toArray()).toEqual([
      {
        _id: "live",
        title: "Keep",
        completed: false,
        prioritizedToday: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    expect((await upgraded.notes.get("note"))?.body).toBe("Original text");
    expect(upgraded.tables.map((table) => table.name)).not.toEqual(
      expect.arrayContaining(["pathways", "syncQueue", "syncMeta"])
    );
    expect(await upgraded.timeEntries.count()).toBe(0);
    expect(await upgraded.userFonts.count()).toBe(0);
  } finally {
    old.close();
    upgraded.close();
    await Dexie.delete(name);
  }
});
