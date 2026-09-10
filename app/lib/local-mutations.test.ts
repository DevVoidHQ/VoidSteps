import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { db } from "./db";
import type { LocalStep, LocalPath } from "./db";
import {
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useStartTimer,
  useStopTimer,
  useCreatePath,
  useArchivePath,
  useUnarchivePath,
  useDeletePathWithMigration,
} from "./local-mutations";

// Every table cleared between tests: `db` is a module-level singleton over
// the fake-indexeddb instance from app/test/setup.ts, so state would
// otherwise leak across tests in this file (and across files sharing a run).
afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("steps: create, update, delete round-trip through Dexie", () => {
  it("creates a step and reads it back", async () => {
    const { result } = renderHook(() => useCreateStep());
    let created: LocalStep | undefined;
    await act(async () => {
      created = await result.current({ title: "Ship it" });
    });
    const rows = await db.steps.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Ship it", completed: false });
    expect(created).toMatchObject({ _id: rows[0]._id });
  });

  it("updates a step in place", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await create.current({ title: "Draft" });
    });
    expect(step).toBeDefined();
    const { result: update } = renderHook(() => useUpdateStep());
    await act(async () => {
      await update.current({ id: step!._id, title: "Final" });
    });
    const row = await db.steps.get(step!._id);
    expect(row?.title).toBe("Final");
  });

  it("deletes a step", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await create.current({ title: "Temp" });
    });
    expect(step).toBeDefined();
    const { result: del } = renderHook(() => useDeleteStep());
    await act(async () => {
      await del.current({ id: step!._id });
    });
    expect(await db.steps.get(step!._id)).toBeUndefined();
  });
});

describe("completing a step stops a running timer atomically", () => {
  it("writes a timeEntry and the step update, and logs the activity event", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await create.current({ title: "Focus block" });
    });
    expect(step).toBeDefined();

    const { result: start } = renderHook(() => useStartTimer());
    await act(async () => {
      await start.current({ id: step!._id });
    });
    const running = await db.steps.get(step!._id);
    expect(running?.timerStartedAt).toBeDefined();

    // Back-date the timer start so the session clears the 5s double-tap floor.
    await db.steps.update(step!._id, { timerStartedAt: Date.now() - 60_000 });

    const { result: toggle } = renderHook(() => useToggleStepCompletion());
    await act(async () => {
      await toggle.current({ id: step!._id });
    });

    const finished = await db.steps.get(step!._id);
    expect(finished?.completed).toBe(true);
    expect(finished?.timerStartedAt).toBeUndefined();
    expect(finished?.totalTimeSpentMs).toBeGreaterThan(0);

    const entries = await db.timeEntries.where("stepId").equals(step!._id).toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].durationMs).toBeGreaterThan(0);

    const events = await db.activityEvents.where("stepId").equals(step!._id).toArray();
    expect(events.some((e) => e.type === "completed")).toBe(true);
  });

  it("useStopTimer alone also mints an entry", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await create.current({ title: "Focus block 2" });
    });
    expect(step).toBeDefined();
    const { result: start } = renderHook(() => useStartTimer());
    await act(async () => {
      await start.current({ id: step!._id });
    });
    await db.steps.update(step!._id, { timerStartedAt: Date.now() - 60_000 });

    const { result: stop } = renderHook(() => useStopTimer());
    await act(async () => {
      await stop.current({ id: step!._id });
    });

    const entries = await db.timeEntries.where("stepId").equals(step!._id).toArray();
    expect(entries).toHaveLength(1);
    const row = await db.steps.get(step!._id);
    expect(row?.timerStartedAt).toBeUndefined();
  });
});

describe("timers run in parallel", () => {
  it("starting one leaves the others running and mints no entry for them", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let first: LocalStep | undefined;
    let second: LocalStep | undefined;
    await act(async () => {
      first = await create.current({ title: "Build running" });
      second = await create.current({ title: "Write notes" });
    });

    const { result: start } = renderHook(() => useStartTimer());
    await act(async () => {
      await start.current({ id: first!._id });
    });
    // Back-date it: the old auto-stop would have minted a session here, and a
    // start inside the 5s double-tap floor would hide that.
    const firstStartedAt = Date.now() - 60_000;
    await db.steps.update(first!._id, { timerStartedAt: firstStartedAt });

    await act(async () => {
      await start.current({ id: second!._id });
    });

    const one = await db.steps.get(first!._id);
    const two = await db.steps.get(second!._id);
    expect(one?.timerStartedAt).toBe(firstStartedAt);
    expect(two?.timerStartedAt).toBeDefined();
    expect(one?.totalTimeSpentMs ?? 0).toBe(0);
    expect(await db.timeEntries.toArray()).toHaveLength(0);
  });

  it("stopping one does not disturb the other", async () => {
    const { result: create } = renderHook(() => useCreateStep());
    let first: LocalStep | undefined;
    let second: LocalStep | undefined;
    await act(async () => {
      first = await create.current({ title: "Call" });
      second = await create.current({ title: "Notes during the call" });
    });

    const { result: start } = renderHook(() => useStartTimer());
    await act(async () => {
      await start.current({ id: first!._id });
      await start.current({ id: second!._id });
    });
    const secondStartedAt = Date.now() - 60_000;
    await db.steps.update(first!._id, { timerStartedAt: Date.now() - 120_000 });
    await db.steps.update(second!._id, { timerStartedAt: secondStartedAt });

    const { result: stop } = renderHook(() => useStopTimer());
    await act(async () => {
      await stop.current({ id: first!._id });
    });

    const stopped = await db.steps.get(first!._id);
    const untouched = await db.steps.get(second!._id);
    expect(stopped?.timerStartedAt).toBeUndefined();
    expect(stopped?.totalTimeSpentMs).toBeGreaterThan(0);
    expect(untouched?.timerStartedAt).toBe(secondStartedAt);
    expect(untouched?.totalTimeSpentMs ?? 0).toBe(0);
  });
});

describe("path archive/unarchive cascade", () => {
  async function seedTree() {
    const { result: createPath } = renderHook(() => useCreatePath());
    let parent: LocalPath | undefined;
    let child: LocalPath | undefined;
    let grandchild: LocalPath | undefined;
    await act(async () => {
      parent = await createPath.current({ title: "Parent" });
    });
    expect(parent).toBeDefined();
    await act(async () => {
      child = await createPath.current({ title: "Child", parentId: parent!._id });
    });
    expect(child).toBeDefined();
    await act(async () => {
      grandchild = await createPath.current({ title: "Grandchild", parentId: child!._id });
    });
    expect(grandchild).toBeDefined();
    const { result: createStep } = renderHook(() => useCreateStep());
    let stepOnParent: LocalStep | undefined;
    let stepOnGrandchild: LocalStep | undefined;
    await act(async () => {
      stepOnParent = await createStep.current({ title: "Parent step", pathId: parent!._id });
    });
    await act(async () => {
      stepOnGrandchild = await createStep.current({
        title: "Grandchild step",
        pathId: grandchild!._id,
      });
    });
    expect(stepOnParent).toBeDefined();
    expect(stepOnGrandchild).toBeDefined();
    return {
      parent: parent!,
      child: child!,
      grandchild: grandchild!,
      stepOnParent: stepOnParent!,
      stepOnGrandchild: stepOnGrandchild!,
    };
  }

  it("archives every descendant path and every step beneath them", async () => {
    const { parent, child, grandchild, stepOnParent, stepOnGrandchild } = await seedTree();
    const { result: archive } = renderHook(() => useArchivePath());
    await act(async () => {
      await archive.current({ id: parent._id });
    });

    for (const p of [parent, child, grandchild]) {
      const row = await db.paths.get(p._id);
      expect(row?.archived).toBe(true);
    }
    for (const s of [stepOnParent, stepOnGrandchild]) {
      const row = await db.steps.get(s._id);
      expect(row?.archived).toBe(true);
    }
  });

  it("unarchive reverses the cascade", async () => {
    const { parent, child, grandchild, stepOnParent, stepOnGrandchild } = await seedTree();
    const { result: archive } = renderHook(() => useArchivePath());
    await act(async () => {
      await archive.current({ id: parent._id });
    });
    const { result: unarchive } = renderHook(() => useUnarchivePath());
    await act(async () => {
      await unarchive.current({ id: parent._id });
    });

    for (const p of [parent, child, grandchild]) {
      const row = await db.paths.get(p._id);
      expect(row?.archived).toBe(false);
    }
    for (const s of [stepOnParent, stepOnGrandchild]) {
      const row = await db.steps.get(s._id);
      expect(row?.archived).toBe(false);
    }
  });
});

describe("deleting a path migrates its steps rather than deleting them", () => {
  it("moves steps to the destination path, orphans child paths to the deleted path's parent, and removes the path itself", async () => {
    const { result: createPath } = renderHook(() => useCreatePath());
    let grandparent: LocalPath | undefined;
    let parent: LocalPath | undefined;
    let child: LocalPath | undefined;
    let destination: LocalPath | undefined;
    await act(async () => {
      grandparent = await createPath.current({ title: "Grandparent" });
    });
    expect(grandparent).toBeDefined();
    await act(async () => {
      parent = await createPath.current({ title: "Parent", parentId: grandparent!._id });
    });
    expect(parent).toBeDefined();
    await act(async () => {
      child = await createPath.current({ title: "Child", parentId: parent!._id });
    });
    expect(child).toBeDefined();
    await act(async () => {
      destination = await createPath.current({ title: "Destination" });
    });
    expect(destination).toBeDefined();
    const { result: createStep } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await createStep.current({ title: "Under parent", pathId: parent!._id });
    });
    expect(step).toBeDefined();

    const { result: del } = renderHook(() => useDeletePathWithMigration());
    await act(async () => {
      await del.current({ id: parent!._id, destinationPathId: destination!._id });
    });

    expect(await db.paths.get(parent!._id)).toBeUndefined();

    const movedStep = await db.steps.get(step!._id);
    expect(movedStep?.pathId).toBe(destination!._id);

    const orphanedChild = await db.paths.get(child!._id);
    expect(orphanedChild?.parentId).toBe(grandparent!._id);
  });

  it("migrates steps to no path when no destination is given", async () => {
    const { result: createPath } = renderHook(() => useCreatePath());
    let path: LocalPath | undefined;
    await act(async () => {
      path = await createPath.current({ title: "Solo" });
    });
    expect(path).toBeDefined();
    const { result: createStep } = renderHook(() => useCreateStep());
    let step: LocalStep | undefined;
    await act(async () => {
      step = await createStep.current({ title: "Loose step", pathId: path!._id });
    });
    expect(step).toBeDefined();

    const { result: del } = renderHook(() => useDeletePathWithMigration());
    await act(async () => {
      await del.current({ id: path!._id });
    });

    const row = await db.steps.get(step!._id);
    expect(row?.pathId).toBeUndefined();
  });
});
