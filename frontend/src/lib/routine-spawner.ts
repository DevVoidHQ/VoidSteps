import { db } from './db';
import type { LocalStep } from './db';
import { calculateNextOccurrence, getLogicalDayStart } from './calculate-next-occurrence';
import { getDaySettings, toDayBoundaryOpts } from './day-settings';

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
      .filter(s =>
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
    console.error('Due date prioritizer error:', error);
  }
}

async function spawnDueRoutines() {
  try {
    const now = Date.now();
    const routines = await db.routines
      .filter(r => r.nextOccurrence <= now)
      .toArray();

    // Dedup window = the user's current logical day (configured turnover
    // boundary - must match the server cron's window or routines double-spawn).
    const daySettings = await getDaySettings();
    const dayOpts = toDayBoundaryOpts(daySettings);
    const startOfToday = getLogicalDayStart(now, dayOpts);

    for (const routine of routines) {
      // De-duplicate: skip if a step with same routineId was already created today.
      // This spawner runs on mount and on visibilitychange, so the same logical
      // day is checked many times per day and across restarts. `isRunning` guards
      // overlapping runs within one session; this check guards everything else.
      const existingToday = await db.steps
        .filter(s =>
          s.routineId === routine._id &&
          s.createdAt >= startOfToday
        )
        .first();

      if (existingToday) continue;

      // Create step from routine blueprint
      const stepId = `local_${crypto.randomUUID()}`;
      const step: LocalStep = {
        _id: stepId,
        title: routine.title,
        description: routine.description,
        completed: false,
        failed: false,
        pathId: routine.pathId,
        routineId: routine._id,
        prioritizedToday: routine.autoPrioritize ?? false,
        sortOrder: now,
        dueDate: undefined,
        startDate: undefined,
        createdAt: now,
        updatedAt: now,
      };

      await db.steps.add(step);

      // Update routine's nextOccurrence (lands at the configured start-of-day)
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear,
        dayOpts
      );

      await db.routines.update(routine._id, {
        nextOccurrence,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('Routine spawner error:', error);
  }
}

async function runScheduledTasks() {
  if (isRunning) return;
  isRunning = true;
  try {
    await spawnDueRoutines();
    await prioritizeDueSteps();
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
    if (document.visibilityState === 'visible') {
      runScheduledTasks();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
