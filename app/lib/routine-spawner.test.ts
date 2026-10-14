import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, type LocalRoutine } from "./db";
import { updateRoutine } from "./mutations/routines";
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

// Local end of day, built the way the date picker builds it, so the expected
// values hold in whatever time zone the tests run.
const endOfDay = (y: number, m: number, d: number) => new Date(y, m, d, 23, 59, 59, 999).getTime();
const spawnedStep = async () => (await db.steps.where("routineId").equals("r").first())!;

describe("due date", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("leaves dueDate unset when the routine has no due setting", async () => {
    await spawnDueRoutines();
    expect((await spawnedStep()).dueDate).toBeUndefined();
  });
  it("is due at the end of the creation day when the offset is 0", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 14, 30));
    await db.routines.update("r", { dueOffsetDays: 0 });
    await spawnDueRoutines();
    expect((await spawnedStep()).dueDate).toBe(endOfDay(2026, 9, 12));
  });
  it("is due N days after the creation day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0));
    await db.routines.update("r", { dueOffsetDays: 3 });
    await spawnDueRoutines();
    expect((await spawnedStep()).dueDate).toBe(endOfDay(2026, 10, 2));
  });
  it("counts from the creation day just after the turnover", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 3, 5));
    await db.userSettings.add({ _id: "settings", dayTurnoverMinutes: 180, updatedAt: 1 });
    await db.routines.update("r", { dueOffsetDays: 1 });
    await spawnDueRoutines();
    expect((await spawnedStep()).dueDate).toBe(endOfDay(2026, 9, 13));
  });
  it("counts from the previous day when created before the turnover", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 1, 0));
    await db.userSettings.add({ _id: "settings", dayTurnoverMinutes: 180, updatedAt: 1 });
    await db.routines.update("r", { dueOffsetDays: 1 });
    await spawnDueRoutines();
    expect((await spawnedStep()).dueDate).toBe(endOfDay(2026, 9, 12));
  });
  it("keeps the due date of steps created before the setting changed", async () => {
    await db.routines.update("r", { dueOffsetDays: 0 });
    await spawnDueRoutines();
    const before = (await spawnedStep()).dueDate;
    await updateRoutine({ id: "r", dueOffsetDays: 5 });
    expect((await db.routines.get("r"))!.dueOffsetDays).toBe(5);
    expect((await spawnedStep()).dueDate).toBe(before);
    await updateRoutine({ id: "r", dueOffsetDays: null });
    expect((await db.routines.get("r"))!.dueOffsetDays).toBeUndefined();
  });
});
