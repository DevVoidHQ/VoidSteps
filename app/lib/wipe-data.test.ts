import { afterEach, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { db } from "./db";
import { useCreateStep, useDeleteStep, useAddTimeEntry } from "./local-mutations";
import { wipeData, WIPE_ENTITIES, getHistoryCounts } from "./wipe-data";

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(db.tables.map((table) => table.clear()));
});
it("a full wipe clears orphan history and reports it even with no steps", async () => {
  const { result } = renderHook(() => ({
    create: useCreateStep(),
    remove: useDeleteStep(),
    add: useAddTimeEntry(),
  }));
  const step = await result.current.create({ title: "Private task" });
  await result.current.add({ stepId: step._id, start: 1000, end: 61000 });
  await result.current.remove({ id: step._id });
  expect(await db.steps.count()).toBe(0);
  expect((await getHistoryCounts()).timeEntries).toBe(1);
  await wipeData([...WIPE_ENTITIES]);
  expect(await getHistoryCounts()).toEqual({ timeEntries: 0, activityEvents: 0 });
});
it("rolls back primary deletes if history cleanup fails", async () => {
  const { result } = renderHook(() => useCreateStep());
  const step = await result.current({ title: "Keep me" });
  vi.spyOn(db.timeEntries, "clear").mockRejectedValueOnce(new Error("Storage failed"));
  await expect(wipeData(["steps"])).rejects.toThrow("Storage failed");
  expect(await db.steps.get(step._id)).toBeDefined();
});
it("a path cascade preserves unrelated retained history", async () => {
  const { result } = renderHook(() => ({ create: useCreateStep(), add: useAddTimeEntry() }));
  const unfiled = await result.current.create({ title: "Keep" });
  const filed = await result.current.create({ title: "Delete", pathId: "p" });
  for (const step of [unfiled, filed])
    await result.current.add({ stepId: step._id, start: 1000, end: 61000 });
  await wipeData(["paths"], { cascade: true });
  expect((await db.timeEntries.toArray()).map((entry) => entry.stepId)).toEqual([unfiled._id]);
});
