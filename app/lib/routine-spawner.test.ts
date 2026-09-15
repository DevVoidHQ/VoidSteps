import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db, type LocalRoutine } from "./db";
import { spawnDueRoutines } from "./routine-spawner";

const routine: LocalRoutine = {
  _id: "r",
  title: "Weekly task",
  frequency: "weekly",
  daysOfWeek: [1],
  nextOccurrence: 1,
  createdAt: 1,
  updatedAt: 1,
};
beforeEach(async () => {
  await db.routines.add(routine);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(db.tables.map((table) => table.clear()));
});
it("concurrent runs create one step and advance the schedule", async () => {
  await Promise.all([spawnDueRoutines(), spawnDueRoutines()]);
  expect(await db.steps.count()).toBe(1);
  expect((await db.routines.get("r"))!.nextOccurrence).toBeGreaterThan(Date.now());
});
it("rolls back the step if advancing the routine fails", async () => {
  vi.spyOn(db.routines, "update").mockRejectedValueOnce(new Error("Write failed"));
  await expect(spawnDueRoutines()).rejects.toThrow("Write failed");
  expect(await db.steps.count()).toBe(0);
  expect((await db.routines.get("r"))!.nextOccurrence).toBe(1);
  await spawnDueRoutines();
  expect(await db.steps.count()).toBe(1);
});
it("repairs a stale schedule without repeating today's step", async () => {
  await db.steps.add({
    _id: "existing",
    title: "Already spawned",
    routineId: "r",
    completed: false,
    prioritizedToday: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await spawnDueRoutines();
  expect(await db.steps.count()).toBe(1);
  expect((await db.routines.get("r"))!.nextOccurrence).toBeGreaterThan(Date.now());
});
