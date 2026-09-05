import { describe, it, expect } from "vitest";
import { stepEventsFromPatch } from "./activity-log";
import type { LocalStep } from "./db";

const NOW = 1_750_000_000_000;

function makeStep(overrides: Partial<LocalStep> = {}): LocalStep {
  return {
    _id: "step-1",
    title: "Write launch post",
    completed: false,
    prioritizedToday: false,
    createdAt: NOW - 86_400_000,
    updatedAt: NOW - 86_400_000,
    ...overrides,
  };
}

function makeIdFactory() {
  let n = 0;
  return () => `local_ev_${++n}`;
}

describe("stepEventsFromPatch", () => {
  it("emits a completed event on completion", () => {
    const events = stepEventsFromPatch(
      makeStep(),
      { completed: true, completedAt: NOW, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "completed", stepId: "step-1", at: NOW });
  });

  it("emits uncompleted on reopen and unfailed when clearing failed together", () => {
    const step = makeStep({ completed: true, failed: true });
    const events = stepEventsFromPatch(
      step,
      { completed: false, failed: false, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events.map((e) => e.type).sort()).toEqual(["uncompleted", "unfailed"]);
  });

  it("treats undefined and false as the same failed state (no spurious unfailed)", () => {
    // completion toggle always writes failed: false; a step that was never
    // failed (undefined) must not log an unfailed event.
    const events = stepEventsFromPatch(
      makeStep(),
      { completed: true, failed: false, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events.map((e) => e.type)).toEqual(["completed"]);
  });

  it("emits field_changed with old/new values for date changes", () => {
    const step = makeStep({ dueDate: 1_000 });
    const events = stepEventsFromPatch(
      step,
      { dueDate: 2_000, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "field_changed",
      field: "dueDate",
      oldValue: 1_000,
      newValue: 2_000,
    });
  });

  it("normalizes undefined to null (clearing a date)", () => {
    const step = makeStep({ dueDate: 1_000 });
    const events = stepEventsFromPatch(
      step,
      { dueDate: undefined, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events[0]).toMatchObject({ field: "dueDate", oldValue: 1_000, newValue: null });
  });

  it("skips unchanged fields present in the patch", () => {
    const step = makeStep({ dueDate: 1_000 });
    const events = stepEventsFromPatch(
      step,
      { dueDate: 1_000, title: step.title, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(0);
  });

  it("never logs untracked fields (sortOrder, timer, updatedAt)", () => {
    const events = stepEventsFromPatch(
      makeStep(),
      { sortOrder: 5, timerStartedAt: NOW, totalTimeSpentMs: 100, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(0);
  });

  it("logs description changes without values", () => {
    const step = makeStep({ description: "old secret text" });
    const events = stepEventsFromPatch(
      step,
      { description: "new secret text", updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events[0]).toMatchObject({ field: "description", oldValue: null, newValue: null });
  });

  it("truncates long title values", () => {
    const longTitle = "x".repeat(200);
    const events = stepEventsFromPatch(
      makeStep(),
      { title: longTitle, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect((events[0].newValue as string).length).toBeLessThanOrEqual(81);
    expect(events[0].newValue as string).toMatch(/…$/);
  });

  it("detects changes past the truncation point (compares raw, stores truncated)", () => {
    // 100-char title edited only in chars 81-100: both values truncate to the
    // same 80-char prefix, but the change must still be logged.
    const step = makeStep({ title: "x".repeat(80) + "a".repeat(20) });
    const events = stepEventsFromPatch(
      step,
      { title: "x".repeat(80) + "b".repeat(20), updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "field_changed", field: "title" });
  });

  it("emits archived/unarchived lifecycle events", () => {
    expect(
      stepEventsFromPatch(
        makeStep(),
        { archived: true, archivedAt: NOW, updatedAt: NOW },
        NOW,
        makeIdFactory()
      )[0]
    ).toMatchObject({ type: "archived" });
    expect(
      stepEventsFromPatch(
        makeStep({ archived: true }),
        { archived: false, updatedAt: NOW },
        NOW,
        makeIdFactory()
      )[0]
    ).toMatchObject({ type: "unarchived" });
  });

  it("emits prioritizedToday as field_changed with boolean values", () => {
    const events = stepEventsFromPatch(
      makeStep(),
      { prioritizedToday: true, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events[0]).toMatchObject({
      type: "field_changed",
      field: "prioritizedToday",
      oldValue: false,
      newValue: true,
    });
  });

  it("mints unique local ids and stamps timestamps consistently", () => {
    const step = makeStep({ dueDate: 1 });
    const events = stepEventsFromPatch(
      step,
      { completed: true, dueDate: 2, updatedAt: NOW },
      NOW,
      makeIdFactory()
    );
    expect(events).toHaveLength(2);
    expect(new Set(events.map((e) => e._id)).size).toBe(2);
    for (const e of events) {
      expect(e.createdAt).toBe(NOW);
      expect(e.updatedAt).toBe(NOW);
    }
  });
});
