import { stepEventsFromPatch } from "../activity-log";
import type { LocalStep, LocalTimeEntry } from "../db";
import { db } from "../db";
// --- Validation constants ---

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;

export function validateTitle(title: string) {
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
  }
}

export function validateDescription(description: string | undefined) {
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }
}

// --- ID generation for offline creates ---

export function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`;
}

// --- Activity log + time entry helpers ---
// Events are written ONLY here, from user-intent mutations - never from restore
// or initial hydration, or a restore would echo old changes back as fresh
// events (see activity-log.ts).

/** Diff a step patch and persist the activity events it implies. */
export async function logStepEvents(before: LocalStep, patch: Partial<LocalStep>, at: number) {
  const events = stepEventsFromPatch(before, patch, at, generateLocalId);
  for (const ev of events) {
    await db.activityEvents.add(ev);
  }
}

/** Sessions shorter than this are treated as accidental double-taps: no entry
 * is minted and no time accrues. */
const MIN_ENTRY_MS = 5_000;

/**
 * Mint the immutable session row for a finished interval. Skips timer blips
 * (< 5s) and duplicates - an entry with the same (stepId, start) means another
 * caller already stopped this session, so minting again would double-count.
 * Returns the recorded duration (0 when skipped) so callers accrue the step's
 * total by exactly what was recorded.
 */
export async function mintTimeEntry(
  step: LocalStep,
  start: number,
  end: number,
  source: "timer" | "manual",
  now: number
): Promise<number> {
  const durationMs = Math.max(0, end - start);
  if (durationMs <= 0 || (source === "timer" && durationMs < MIN_ENTRY_MS)) return 0;
  const dup = await db.timeEntries
    .where("stepId")
    .equals(step._id)
    .filter((e) => e.start === start)
    .first();
  if (dup) return 0;
  const entry: LocalTimeEntry = {
    _id: generateLocalId(),
    stepId: step._id,
    stepTitle: step.title,
    start,
    end,
    durationMs,
    source,
    createdAt: now,
    updatedAt: now,
  };
  await db.timeEntries.add(entry);
  return durationMs;
}

/**
 * Stop a running timer on `step` at `end`: mint its session entry and fold the
 * recorded time into the step's total. No-op if the step isn't running. Must be
 * called inside a 'rw' transaction covering steps and timeEntries.
 */
export async function stopTimerOnStep(step: LocalStep, end: number, now: number) {
  if (!step.timerStartedAt) return;
  const recorded = await mintTimeEntry(step, step.timerStartedAt, end, "timer", now);
  const patch: Partial<LocalStep> = {
    timerStartedAt: undefined,
    totalTimeSpentMs: (step.totalTimeSpentMs || 0) + recorded,
    updatedAt: now,
  };
  await db.steps.update(step._id, patch);
}

export const TIMER_STARTED_EVENT = "voidsteps-timer-started";
