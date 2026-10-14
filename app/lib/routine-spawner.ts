import { calculateNextOccurrence, getLogicalDayStart } from "./calculate-next-occurrence";
import type { DayBoundaryOpts } from "./calculate-next-occurrence";
import { getDaySettings, toDayBoundaryOpts } from "./day-settings";
import type { LocalStep } from "./db";
import { db } from "./db";
import { reportError } from "./error-store";

const SPAWN_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Prevent overlapping runs when mount + visibilitychange fire close together.
let isRunning = false;

async function prioritizeDueSteps() {
  try {
    // "Due today" = due inside the user's current LOGICAL day (their
    // configured end-of-day turnover), so at 1am with a 3am turnover
    // yesterday's due-todays are still yesterday's.
    const settings = await getDaySettings();
    const startOfToday = getLogicalDayStart(Date.now(), toDayBoundaryOpts(settings));
    const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;

    const stepsToPrioritize = await db.steps
      .filter(
        (s) =>
          !s.completed &&
          !s.failed &&
          !s.archived &&
          !s.prioritizedToday &&
          s.dueDate !== undefined &&
          s.dueDate >= startOfToday &&
          s.dueDate < startOfTomorrow
      )
      .toArray();

    const now = Date.now();
    for (const step of stepsToPrioritize) {
      await db.steps.update(step._id, { prioritizedToday: true, updatedAt: now });
    }
  } catch (error) {
    await reportError("mutation", error, { action: "prioritizeDueSteps" });
  }
}

/**
 * Due date for a step a routine creates at `now`: the end of the logical day
 * plus `dueOffsetDays`, or undefined when the routine sets no due date. Counts
 * from the creation time rather than the scheduled occurrence, like postpone's
 * "relative to today", so a late catch-up spawn never arrives already overdue.
 */
export function routineStepDueDate(
  now: number,
  dueOffsetDays: number | undefined,
  dayOpts: DayBoundaryOpts
): number | undefined {
  if (dueOffsetDays === undefined) return undefined;
  const start = new Date(getLogicalDayStart(now, dayOpts));
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + dueOffsetDays,
    23,
    59,
    59,
    999
  ).getTime();
}

/** Spawn and advance schedules together, including concurrent app windows. */
export async function spawnDueRoutines(): Promise<void> {
  await db.transaction("rw", [db.steps, db.routines, db.userSettings], async () => {
    const now = Date.now();
    const routines = await db.routines.where("nextOccurrence").belowOrEqual(now).toArray();
    const dayOpts = toDayBoundaryOpts(await getDaySettings());
    const startOfToday = getLogicalDayStart(now, dayOpts);
    for (const routine of routines) {
      const existingToday = await db.steps
        .where("routineId")
        .equals(routine._id)
        .filter((s) => s.createdAt >= startOfToday)
        .first();
      if (!existingToday) {
        const step: LocalStep = {
          _id: `local_${crypto.randomUUID()}`,
          title: routine.title,
          description: routine.description,
          completed: false,
          failed: false,
          pathId: routine.pathId,
          routineId: routine._id,
          prioritizedToday: routine.autoPrioritize ?? false,
          dueDate: routineStepDueDate(now, routine.dueOffsetDays, dayOpts),
          sortOrder: now,
          createdAt: now,
          updatedAt: now,
        };
        await db.steps.add(step);
      }
      // Also advance a stale schedule when a previous build already spawned
      // today's step. Otherwise it stays due until another day and spawns again.
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear,
        dayOpts
      );
      await db.routines.update(routine._id, { nextOccurrence, updatedAt: now });
    }
  });
}

async function runScheduledTasks() {
  if (isRunning) return;
  isRunning = true;
  try {
    await spawnDueRoutines();
    await prioritizeDueSteps();
  } catch (error) {
    await reportError("mutation", error, { action: "routineSpawner" });
  } finally {
    isRunning = false;
  }
}

export function startRoutineSpawner(): () => void {
  // Run immediately
  runScheduledTasks();

  // Run on interval
  const intervalId = setInterval(runScheduledTasks, SPAWN_INTERVAL);

  // Run on visibility change (app resume)
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      runScheduledTasks();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
