import type { LocalStep } from "../db";
import { db } from "../db";
import { generateLocalId, stopTimerOnStep, TIMER_STARTED_EVENT } from "./helpers";

export const startTimer = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error("Step not found");
    if (step.timerStartedAt) return; // already running

    // Timers run in parallel: starting one leaves every other running step
    // alone. Work overlaps (a build runs while you write notes), and the app
    // stopping a timer nobody asked it to stop loses real tracked time.
    // Sessions are per step, so nothing downstream assumes a single one.
    await db.steps.update(args.id, { timerStartedAt: now, updatedAt: now });
  });
  window.dispatchEvent(new CustomEvent(TIMER_STARTED_EVENT, { detail: { id: args.id } }));
};

export const setTotalTime = async (args: { id: string; totalTimeSpentMs: number }) => {
  const now = Date.now();
  const totalTimeSpentMs = Math.max(0, args.totalTimeSpentMs);
  // When resetting to 0, clear the field entirely so the badge disappears
  const value = totalTimeSpentMs === 0 ? undefined : totalTimeSpentMs;
  await db.transaction("rw", [db.steps, db.activityEvents], async () => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error("Step not found");
    const oldTotal = step.totalTimeSpentMs ?? 0;
    await db.steps.update(args.id, { totalTimeSpentMs: value, updatedAt: now });
    if (oldTotal !== totalTimeSpentMs) {
      const ev = {
        _id: generateLocalId(),
        stepId: args.id,
        type: "time_adjusted" as const,
        oldValue: oldTotal,
        newValue: totalTimeSpentMs,
        at: now,
        createdAt: now,
        updatedAt: now,
      };
      await db.activityEvents.add(ev);
    }
  });
};

export const stopTimer = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error("Step not found");
    if (!step.timerStartedAt) return; // not running - nothing to stop
    await stopTimerOnStep(step, now, now);
  });
};

export const stopTimerAt = async (args: { id: string; end: number }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const step = await db.steps.get(args.id);
    if (!step || !step.timerStartedAt) return;
    const end = Math.min(Math.max(args.end, step.timerStartedAt), now);
    await stopTimerOnStep(step, end, now);
  });
};

export const discardTimer = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", db.steps, async () => {
    const step = await db.steps.get(args.id);
    if (!step || !step.timerStartedAt) return;
    const patch: Partial<LocalStep> = {
      timerStartedAt: undefined,
      totalTimeSpentMs: step.totalTimeSpentMs || 0,
      updatedAt: now,
    };
    await db.steps.update(args.id, patch);
  });
};
