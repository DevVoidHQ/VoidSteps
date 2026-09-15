import { db } from "../db";
import { mintTimeEntry } from "./helpers";

export const addTimeEntry = async (args: { stepId: string; start: number; end: number }) => {
  if (args.end <= args.start) throw new Error("End must be after start");
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const step = await db.steps.get(args.stepId);
    if (!step) throw new Error("Step not found");
    const recorded = await mintTimeEntry(step, args.start, args.end, "manual", now);
    if (recorded === 0) return; // duplicate start instant - already recorded
    const newTotal = (step.totalTimeSpentMs || 0) + recorded;
    await db.steps.update(step._id, { totalTimeSpentMs: newTotal, updatedAt: now });
  });
};

export const updateTimeEntry = async (args: { id: string; start: number; end: number }) => {
  if (args.end <= args.start) throw new Error("End must be after start");
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const entry = await db.timeEntries.get(args.id);
    if (!entry) throw new Error("Time entry not found");

    const durationMs = args.end - args.start;
    const delta = durationMs - entry.durationMs;
    await db.timeEntries.update(args.id, {
      start: args.start,
      end: args.end,
      durationMs,
      updatedAt: now,
    });

    const step = await db.steps.get(entry.stepId);
    if (step && delta !== 0) {
      const newTotal = Math.max(0, (step.totalTimeSpentMs || 0) + delta);
      await db.steps.update(step._id, {
        totalTimeSpentMs: newTotal === 0 ? undefined : newTotal,
        updatedAt: now,
      });
    }
  });
};

export const deleteTimeEntry = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries], async () => {
    const entry = await db.timeEntries.get(args.id);
    if (!entry) return;

    await db.timeEntries.delete(entry._id);

    const step = await db.steps.get(entry.stepId);
    if (step) {
      const newTotal = Math.max(0, (step.totalTimeSpentMs || 0) - entry.durationMs);
      await db.steps.update(step._id, {
        totalTimeSpentMs: newTotal === 0 ? undefined : newTotal,
        updatedAt: now,
      });
    }
  });
};
