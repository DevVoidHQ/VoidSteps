import { db } from './db';
import type { LocalStep } from './db';
import { calculateNextOccurrence } from './calculate-next-occurrence';

const SPAWN_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Prevent overlapping runs when mount + visibilitychange fire close together.
let isRunning = false;

// Sync queue helper (duplicated to avoid circular dependency)
async function enqueue(
  entityType: 'steps' | 'routines',
  entityId: string,
  operation: 'create' | 'update',
  data?: Record<string, unknown>
) {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    data,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });
}

async function prioritizeDueSteps() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = tomorrow.getTime();

    const stepsToPrioritize = await db.steps
      .filter(s =>
        !s._deleted &&
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
      await enqueue('steps', step._id, 'update', { prioritizedToday: true, updatedAt: now });
    }
  } catch (error) {
    console.error('Due date prioritizer error:', error);
  }
}

async function spawnDueRoutines() {
  try {
    const now = Date.now();
    const routines = await db.routines
      .filter(r => !r._deleted && r.nextOccurrence <= now)
      .toArray();

    // Start of today for de-duplication check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    for (const routine of routines) {
      // De-duplicate: skip if a step with same routineId was already created today.
      // NOTE: There is a race condition between this client-side spawner and the
      // server-side Convex cron. Both may check at roughly the same time and create
      // duplicate steps. The pull sync will eventually reconcile, but brief duplicates
      // are possible. A server-side dedup check in the cron mutation would fully fix this.
      const existingToday = await db.steps
        .filter(s =>
          s.routineId === routine._id &&
          !s._deleted &&
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
        parentId: undefined,
        routineId: routine._id,
        prioritizedToday: routine.autoPrioritize ?? false,
        sortOrder: now,
        dueDate: undefined,
        startDate: undefined,
        createdAt: now,
        updatedAt: now,
        _localOnly: true,
      };

      await db.steps.add(step);
      await enqueue('steps', stepId, 'create', step as unknown as Record<string, unknown>);

      // Update routine's nextOccurrence
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear
      );

      await db.routines.update(routine._id, {
        nextOccurrence,
        updatedAt: now,
      });
      await enqueue('routines', routine._id, 'update', { nextOccurrence, updatedAt: now });
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
