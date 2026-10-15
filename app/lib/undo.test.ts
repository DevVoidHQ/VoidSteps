import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { db } from "./db";
import {
  useCreateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useUpdateStep,
} from "./local-mutations";
import { clearUndoHistory, redo, undo } from "./undo";
import { wipeData } from "./wipe-data";

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const hooks = () => ({
  create: renderHook(() => useCreateStep()).result.current,
  update: renderHook(() => useUpdateStep()).result.current,
  remove: renderHook(() => useDeleteStep()).result.current,
  complete: renderHook(() => useToggleStepCompletion()).result.current,
});

describe("undo and redo", () => {
  it("undoes a create, and redo brings it back", async () => {
    const { create } = hooks();
    await create({ title: "Write report" });
    expect(await db.steps.count()).toBe(1);

    expect(await undo()).toEqual({ status: "done", label: "Create step" });
    expect(await db.steps.count()).toBe(0);

    expect(await redo()).toEqual({ status: "done", label: "Create step" });
    expect((await db.steps.toArray())[0].title).toBe("Write report");
  });

  it("restores a deleted step exactly, along with its activity", async () => {
    const { create, complete, remove } = hooks();
    const step = await create({ title: "Pay rent" });
    await complete({ id: step._id });
    const before = await db.steps.get(step._id);
    const eventsBefore = await db.activityEvents.count();

    await remove({ id: step._id });
    expect(await db.steps.get(step._id)).toBeUndefined();

    await undo();
    expect(await db.steps.get(step._id)).toEqual(before);
    expect(await db.activityEvents.count()).toBe(eventsBefore);
  });

  it("walks back several actions in order", async () => {
    const { create, update } = hooks();
    const step = await create({ title: "Draft" });
    await update({ id: step._id, title: "Second" });
    await update({ id: step._id, title: "Third" });

    await undo();
    expect((await db.steps.get(step._id))!.title).toBe("Second");
    await undo();
    expect((await db.steps.get(step._id))!.title).toBe("Draft");
    await redo();
    expect((await db.steps.get(step._id))!.title).toBe("Second");
  });

  it("a new action clears the redo branch", async () => {
    const { create, update } = hooks();
    const step = await create({ title: "One" });
    await update({ id: step._id, title: "Two" });
    await undo();
    await update({ id: step._id, title: "Three" });
    expect(await redo()).toEqual({ status: "empty" });
  });

  it("refuses to undo over a change made outside undo", async () => {
    const { create, update } = hooks();
    const step = await create({ title: "Mine" });
    await update({ id: step._id, title: "Edited" });
    // A background write, e.g. the routine spawner or timer reconcile.
    await db.steps.update(step._id, { title: "Background" });

    expect(await undo()).toEqual({ status: "conflict", label: "Edit step" });
    expect((await db.steps.get(step._id))!.title).toBe("Background");
  });

  it("says when there is nothing to undo", async () => {
    await clearUndoHistory();
    expect(await undo()).toEqual({ status: "empty" });
    expect(await redo()).toEqual({ status: "empty" });
  });

  it("forgets history on wipe, so undo cannot resurrect wiped data", async () => {
    const { create, remove } = hooks();
    const step = await create({ title: "Gone" });
    await remove({ id: step._id });
    await wipeData(["steps"]);
    expect(await undo()).toEqual({ status: "empty" });
    expect(await db.steps.count()).toBe(0);
  });
});
