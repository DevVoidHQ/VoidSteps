import { useCallback } from 'react';
import { db } from './db';
import type { LocalStep, LocalPath, LocalRoutine, LocalReminder, LocalNotebook, LocalNote, LocalTimeEntry } from './db';
import { calculateNextOccurrence } from './calculate-next-occurrence';
import { getDaySettings, toDayBoundaryOpts, currentUtcOffsetMinutes } from './day-settings';
import { stepEventsFromPatch } from './activity-log';

// --- Validation constants ---

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;

function validateTitle(title: string) {
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
  }
}

function validateDescription(description: string | undefined) {
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }
}

// --- ID generation for offline creates ---

function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`;
}

// --- Activity log + time entry helpers ---
// Events are written ONLY here, from user-intent mutations - never from restore
// or initial hydration, or a restore would echo old changes back as fresh
// events (see activity-log.ts).

/** Diff a step patch and persist the activity events it implies. */
async function logStepEvents(before: LocalStep, patch: Partial<LocalStep>, at: number) {
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
 * device already stopped this session, so minting again would double-count.
 * Returns the recorded duration (0 when skipped) so callers accrue the step's
 * total by exactly what was recorded.
 */
async function mintTimeEntry(
  step: LocalStep,
  start: number,
  end: number,
  source: 'timer' | 'manual',
  now: number
): Promise<number> {
  const durationMs = Math.max(0, end - start);
  if (durationMs <= 0 || (source === 'timer' && durationMs < MIN_ENTRY_MS)) return 0;
  const dup = await db.timeEntries
    .where('stepId')
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
async function stopTimerOnStep(step: LocalStep, end: number, now: number) {
  if (!step.timerStartedAt) return;
  const recorded = await mintTimeEntry(step, step.timerStartedAt, end, 'timer', now);
  const patch: Partial<LocalStep> = {
    timerStartedAt: undefined,
    totalTimeSpentMs: (step.totalTimeSpentMs || 0) + recorded,
    updatedAt: now,
  };
  await db.steps.update(step._id, patch);
}

// ============================================================
// STEPS
// ============================================================

export function useCreateStep() {
  return useCallback(async (args: {
    title: string;
    description?: string;
    pathId?: string;
    routineId?: string;
    prioritizedToday?: boolean;
    dueDate?: number;
    startDate?: number;
  }) => {
    validateTitle(args.title);
    validateDescription(args.description);
    const now = Date.now();
    const id = generateLocalId();

    // Calculate sortOrder: find min among active steps.
    const siblingSteps: LocalStep[] = await db.steps
      .filter(s => !s.completed)
      .toArray();

    const minSortOrder = siblingSteps.reduce((min, step) => {
      const order = step.sortOrder ?? step.createdAt;
      return Math.min(min, order);
    }, now);

    const newSortOrder = minSortOrder - 1;

    const step: LocalStep = {
      _id: id,
      title: args.title,
      description: args.description,
      completed: false,
      failed: false,
      pathId: args.pathId,
      routineId: args.routineId,
      prioritizedToday: args.prioritizedToday ?? false,
      sortOrder: newSortOrder,
      dueDate: args.dueDate,
      startDate: args.startDate,
      createdAt: now,
      updatedAt: now,
    };

    await db.steps.add(step);
    return step;
  }, []);
}

export function useUpdateStep() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string;
    completed?: boolean;
    failed?: boolean;
    pathId?: string | null;
    prioritizedToday?: boolean;
    dueDate?: number | null;
    startDate?: number | null;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    if (args.description !== undefined) validateDescription(args.description);
    const { id, ...updates } = args;
    const now = Date.now();

    await db.transaction('rw', [db.steps, db.timeEntries, db.activityEvents], async () => {
      const existing = await db.steps.get(id);
      if (!existing) throw new Error('Step not found');

      const patchData: Partial<LocalStep> = { updatedAt: now };

      if (updates.title !== undefined) patchData.title = updates.title;
      if (updates.description !== undefined) patchData.description = updates.description;
      if (updates.prioritizedToday !== undefined) patchData.prioritizedToday = updates.prioritizedToday;

      // Handle pathId (null or '' clears - some callers pass the form's empty
      // string through; '' would fail the server's v.id validation and mint a
      // bogus "moved to path" activity event)
      if ('pathId' in updates) {
        patchData.pathId = updates.pathId === null || updates.pathId === '' ? undefined : updates.pathId;
      }

      // Handle dueDate (null clears)
      if ('dueDate' in updates) {
        patchData.dueDate = updates.dueDate === null ? undefined : updates.dueDate;
      }

      // Handle startDate (null clears)
      if ('startDate' in updates) {
        patchData.startDate = updates.startDate === null ? undefined : updates.startDate;
      }

      // Handle completedAt when completed status changes
      if ('completed' in updates && updates.completed !== undefined) {
        patchData.completed = updates.completed;
        if (updates.completed && !existing.completed) {
          patchData.completedAt = now;
          patchData.failed = false;
          patchData.failedAt = undefined;
        } else if (!updates.completed && existing.completed) {
          patchData.completedAt = undefined;
        }
      }

      // Handle failedAt when failed status changes
      if ('failed' in updates && updates.failed !== undefined) {
        patchData.failed = updates.failed;
        const currentFailedState = existing.failed ?? false;
        if (updates.failed && !currentFailedState) {
          patchData.failedAt = now;
        } else if (!updates.failed && currentFailedState) {
          patchData.failedAt = undefined;
        }
      }

      // Completing a step ends its running session.
      if (patchData.completed === true && existing.timerStartedAt) {
        await stopTimerOnStep(existing, now, now);
      }

      await db.steps.update(id, patchData);
      await logStepEvents(existing, patchData, now);
    });
  }, []);
}

export function useDeleteStep() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries, db.activityEvents], async () => {
      const step = await db.steps.get(args.id);
      if (!step) return;

      // A running timer's time is real - mint the session before the step goes.
      // Its time entries and activity events are deliberately left behind: the
      // Day Log renders them from the denormalized stepTitle.
      await stopTimerOnStep(step, now, now);

      await db.steps.delete(args.id);
    });
  }, []);
}

export function useToggleStepCompletion() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries, db.activityEvents], async () => {
      const step = await db.steps.get(args.id);
      if (!step) throw new Error('Step not found');

      const newCompletedState = !step.completed;

      // Completing a step with a running timer ends the session too. Same
      // transaction, so a concurrent pull can't split the entry from the stop.
      if (newCompletedState) await stopTimerOnStep(step, now, now);

      const patchData: Partial<LocalStep> = {
        completed: newCompletedState,
        completedAt: newCompletedState ? now : undefined,
        failed: false,
        failedAt: undefined,
        updatedAt: now,
      };

      await db.steps.update(args.id, patchData);
      await logStepEvents(step, patchData, now);
    });
  }, []);
}

export function useToggleStepFailed() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries, db.activityEvents], async () => {
      const step = await db.steps.get(args.id);
      if (!step) throw new Error('Step not found');

      const currentFailedState = step.failed ?? false;
      const newFailedState = !currentFailedState;

      // Failing a step abandons its running session - record what was real.
      if (newFailedState) await stopTimerOnStep(step, now, now);

      const patchData: Partial<LocalStep> = {
        failed: newFailedState,
        failedAt: newFailedState ? now : undefined,
        completed: false,
        completedAt: undefined,
        updatedAt: now,
      };

      await db.steps.update(args.id, patchData);
      await logStepEvents(step, patchData, now);
    });
  }, []);
}

export function useReorderSteps() {
  return useCallback(async (args: {
    stepIds: string[];
  }) => {
    const now = Date.now();

    await db.transaction('rw', db.steps, async () => {
      for (let i = 0; i < args.stepIds.length; i++) {
        const stepId = args.stepIds[i];
        await db.steps.update(stepId, {
          sortOrder: i,
          updatedAt: now,
        });
      }
    });
  }, []);
}

/** Fired on every user-initiated timer start (play / resume), so UI can react
 * (e.g. open focus mode). Not fired on data hydration. */
export const TIMER_STARTED_EVENT = "voidsteps-timer-started";

export function useStartTimer() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const step = await db.steps.get(args.id);
      if (!step) throw new Error('Step not found');
      if (step.timerStartedAt) return; // already running

      // Single-active-timer invariant enforced at the data layer: starting
      // here auto-stops any other running step, minting its session entry
      // (call sites also pre-stop, which is then a harmless no-op here).
      const running = await db.steps
        .filter((s) => s.timerStartedAt != null && s._id !== args.id)
        .toArray();
      for (const other of running) {
        await stopTimerOnStep(other, now, now);
      }

      await db.steps.update(args.id, { timerStartedAt: now, updatedAt: now });
    });
    window.dispatchEvent(new CustomEvent(TIMER_STARTED_EVENT, { detail: { id: args.id } }));
  }, []);
}

export function useSetTotalTime() {
  return useCallback(async (args: { id: string; totalTimeSpentMs: number }) => {
    const now = Date.now();
    const totalTimeSpentMs = Math.max(0, args.totalTimeSpentMs);
    // When resetting to 0, clear the field entirely so the badge disappears
    const value = totalTimeSpentMs === 0 ? undefined : totalTimeSpentMs;
    await db.transaction('rw', [db.steps, db.activityEvents], async () => {
      const step = await db.steps.get(args.id);
      if (!step) throw new Error('Step not found');
      const oldTotal = step.totalTimeSpentMs ?? 0;
      await db.steps.update(args.id, { totalTimeSpentMs: value, updatedAt: now });
      if (oldTotal !== totalTimeSpentMs) {
        const ev = {
          _id: generateLocalId(),
          stepId: args.id,
          type: 'time_adjusted' as const,
          oldValue: oldTotal,
          newValue: totalTimeSpentMs,
          at: now,
          createdAt: now,
          updatedAt: now,
        };
        await db.activityEvents.add(ev);
      }
    });
  }, []);
}

export function useStopTimer() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const step = await db.steps.get(args.id);
      if (!step) throw new Error('Step not found');
      if (!step.timerStartedAt) return; // not running - nothing to stop
      await stopTimerOnStep(step, now, now);
    });
  }, []);
}

/** Stop a running timer at an explicit end instant (clamped to [start, now]).
 * Used by the forgotten-timer reconcile flow ("Trim to..."). */
export function useStopTimerAt() {
  return useCallback(async (args: { id: string; end: number }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const step = await db.steps.get(args.id);
      if (!step || !step.timerStartedAt) return;
      const end = Math.min(Math.max(args.end, step.timerStartedAt), now);
      await stopTimerOnStep(step, end, now);
    });
  }, []);
}

/** Clear a running timer without recording any time (reconcile "Discard"). */
export function useDiscardTimer() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', db.steps, async () => {
      const step = await db.steps.get(args.id);
      if (!step || !step.timerStartedAt) return;
      const patch: Partial<LocalStep> = {
        timerStartedAt: undefined,
        totalTimeSpentMs: step.totalTimeSpentMs || 0,
        updatedAt: now,
      };
      await db.steps.update(args.id, patch);
    });
  }, []);
}

// ============================================================
// TIME ENTRIES (per-session timesheet rows)
// ============================================================

export function useAddTimeEntry() {
  return useCallback(async (args: { stepId: string; start: number; end: number }) => {
    if (args.end <= args.start) throw new Error('End must be after start');
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const step = await db.steps.get(args.stepId);
      if (!step) throw new Error('Step not found');
      const recorded = await mintTimeEntry(step, args.start, args.end, 'manual', now);
      if (recorded === 0) return; // duplicate start instant - already recorded
      const newTotal = (step.totalTimeSpentMs || 0) + recorded;
      await db.steps.update(step._id, { totalTimeSpentMs: newTotal, updatedAt: now });
    });
  }, []);
}

export function useUpdateTimeEntry() {
  return useCallback(async (args: { id: string; start: number; end: number }) => {
    if (args.end <= args.start) throw new Error('End must be after start');
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const entry = await db.timeEntries.get(args.id);
      if (!entry) throw new Error('Time entry not found');

      const durationMs = args.end - args.start;
      const delta = durationMs - entry.durationMs;
      await db.timeEntries.update(args.id, { start: args.start, end: args.end, durationMs, updatedAt: now });

      const step = await db.steps.get(entry.stepId);
      if (step && delta !== 0) {
        const newTotal = Math.max(0, (step.totalTimeSpentMs || 0) + delta);
        await db.steps.update(step._id, { totalTimeSpentMs: newTotal === 0 ? undefined : newTotal, updatedAt: now });
      }
    });
  }, []);
}

export function useDeleteTimeEntry() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();
    await db.transaction('rw', [db.steps, db.timeEntries], async () => {
      const entry = await db.timeEntries.get(args.id);
      if (!entry) return;

      await db.timeEntries.delete(entry._id);

      const step = await db.steps.get(entry.stepId);
      if (step) {
        const newTotal = Math.max(0, (step.totalTimeSpentMs || 0) - entry.durationMs);
        await db.steps.update(step._id, { totalTimeSpentMs: newTotal === 0 ? undefined : newTotal, updatedAt: now });
      }
    });
  }, []);
}

// ============================================================
// PATHS
// ============================================================

export function useCreatePath() {
  return useCallback(async (args: {
    title: string;
    description?: string;
    parentId?: string;
  }) => {
    validateTitle(args.title);
    validateDescription(args.description);
    const now = Date.now();
    const id = generateLocalId();

    const path: LocalPath = {
      _id: id,
      title: args.title,
      description: args.description,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    };

    await db.paths.add(path);
    return path;
  }, []);
}

export function useUpdatePath() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string;
    parentId?: string | null;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    if (args.description !== undefined) validateDescription(args.description);
    const { id, parentId, ...otherUpdates } = args;
    const existing = await db.paths.get(id);
    if (!existing) throw new Error('Path not found');

    // Circular reference check
    if (parentId !== undefined && parentId !== null) {
      let currentId: string | undefined = parentId;
      const visited = new Set<string>();
      while (currentId) {
        if (currentId === id) throw new Error('Cannot set parent: would create circular reference');
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const current: LocalPath | undefined = await db.paths.get(currentId);
        currentId = current?.parentId;
      }
    }

    const patchData: Partial<LocalPath> = { ...otherUpdates, updatedAt: Date.now() };
    if (parentId !== undefined) {
      patchData.parentId = parentId === null ? undefined : parentId;
    }

    await db.paths.update(id, patchData);
  }, []);
}
export function useArchivePath() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();

    // Recursively collect all descendant paths
    const allPathIds: string[] = [args.id];
    const collectDescendants = async (parentId: string) => {
      const children = await db.paths
        .where('parentId')
        .equals(parentId)
        .toArray();
      for (const child of children) {
        allPathIds.push(child._id);
        await collectDescendants(child._id);
      }
    };
    await collectDescendants(args.id);

    // Archive each path and its steps
    for (const pathId of allPathIds) {
      await db.paths.update(pathId, { archived: true, archivedAt: now, updatedAt: now });

      const steps = await db.steps
        .where('pathId')
        .equals(pathId)
        .toArray();
      for (const step of steps) {
        const patch: Partial<LocalStep> = { archived: true, archivedAt: now, updatedAt: now };
        await db.steps.update(step._id, patch);
        await logStepEvents(step, patch, now);
      }
    }
  }, []);
}

export function useUnarchivePath() {
  return useCallback(async (args: { id: string }) => {
    const now = Date.now();

    // Recursively collect all descendant paths
    const allPathIds: string[] = [args.id];
    const collectDescendants = async (parentId: string) => {
      const children = await db.paths
        .where('parentId')
        .equals(parentId)
        .toArray();
      for (const child of children) {
        allPathIds.push(child._id);
        await collectDescendants(child._id);
      }
    };
    await collectDescendants(args.id);

    // Unarchive each path and its archived steps
    for (const pathId of allPathIds) {
      await db.paths.update(pathId, { archived: false, archivedAt: undefined, updatedAt: now });

      const steps = await db.steps
        .where('pathId')
        .equals(pathId)
        .filter(s => s.archived === true)
        .toArray();
      for (const step of steps) {
        const patch: Partial<LocalStep> = { archived: false, archivedAt: undefined, updatedAt: now };
        await db.steps.update(step._id, patch);
        await logStepEvents(step, patch, now);
      }
    }
  }, []);
}

export function useDeletePathWithMigration() {
  return useCallback(async (args: { id: string; destinationPathId?: string | null }) => {
    const existing = await db.paths.get(args.id);
    if (!existing) throw new Error('Path not found');

    const now = Date.now();

    // Migrate all steps from this path to destination
    const steps = await db.steps
      .where('pathId')
      .equals(args.id)
      .toArray();

    for (const step of steps) {
      const newPathId = args.destinationPathId || undefined;
      const patch: Partial<LocalStep> = { pathId: newPathId, updatedAt: now };
      await db.steps.update(step._id, patch);
      await logStepEvents(step, patch, now);
    }

    // Orphan child paths to deleted path's parent
    const children = await db.paths
      .where('parentId')
      .equals(args.id)
      .toArray();

    for (const child of children) {
      const newParentId = existing.parentId || undefined;
      await db.paths.update(child._id, { parentId: newParentId, updatedAt: now });
    }

    // Soft-delete the path
    await db.paths.delete(args.id);
  }, []);
}

// ============================================================
// ROUTINES
// ============================================================

export function useCreateRoutine() {
  return useCallback(async (args: {
    title: string;
    description?: string;
    pathId?: string;
    frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
    daysOfWeek?: number[];
    dayOfMonth?: number;
    month?: number;
    dayOfYear?: number;
    autoPrioritize?: boolean;
  }) => {
    validateTitle(args.title);
    validateDescription(args.description);
    const now = Date.now();
    const id = generateLocalId();

    const nextOccurrence = calculateNextOccurrence(
      args.frequency,
      args.daysOfWeek,
      args.dayOfMonth,
      args.month,
      args.dayOfYear,
      toDayBoundaryOpts(await getDaySettings())
    );

    const routine: LocalRoutine = {
      _id: id,
      title: args.title,
      description: args.description,
      pathId: args.pathId,
      frequency: args.frequency,
      daysOfWeek: args.daysOfWeek,
      dayOfMonth: args.dayOfMonth,
      month: args.month,
      dayOfYear: args.dayOfYear,
      nextOccurrence,
      autoPrioritize: args.autoPrioritize,
      createdAt: now,
      updatedAt: now,
    };

    await db.routines.add(routine);
    return routine;
  }, []);
}

export function useUpdateRoutine() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string;
    pathId?: string | null;
    frequency?: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
    daysOfWeek?: number[] | null;
    dayOfMonth?: number | null;
    month?: number | null;
    dayOfYear?: number | null;
    autoPrioritize?: boolean;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    if (args.description !== undefined) validateDescription(args.description);
    const { id, ...updates } = args;
    const existing = await db.routines.get(id);
    if (!existing) throw new Error('Routine not found');

    const patchData: Partial<LocalRoutine> = { updatedAt: Date.now() };

    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.pathId !== undefined) patchData.pathId = updates.pathId === null ? undefined : updates.pathId;
    if (updates.frequency !== undefined) patchData.frequency = updates.frequency;
    if (updates.daysOfWeek !== undefined) patchData.daysOfWeek = updates.daysOfWeek === null ? undefined : updates.daysOfWeek;
    if (updates.dayOfMonth !== undefined) patchData.dayOfMonth = updates.dayOfMonth === null ? undefined : updates.dayOfMonth;
    if (updates.month !== undefined) patchData.month = updates.month === null ? undefined : updates.month;
    if (updates.dayOfYear !== undefined) patchData.dayOfYear = updates.dayOfYear === null ? undefined : updates.dayOfYear;
    if (updates.autoPrioritize !== undefined) patchData.autoPrioritize = updates.autoPrioritize;

    // Recalculate nextOccurrence if schedule changed
    if (updates.frequency || updates.daysOfWeek !== undefined || updates.dayOfMonth !== undefined || updates.month !== undefined || updates.dayOfYear !== undefined) {
      const frequency = updates.frequency || existing.frequency;
      const daysOfWeek = updates.daysOfWeek === null ? undefined : (updates.daysOfWeek || existing.daysOfWeek);
      const dayOfMonth = updates.dayOfMonth === null ? undefined : (updates.dayOfMonth || existing.dayOfMonth);
      const month = updates.month === null ? undefined : (updates.month || existing.month);
      const dayOfYear = updates.dayOfYear === null ? undefined : (updates.dayOfYear || existing.dayOfYear);

      patchData.nextOccurrence = calculateNextOccurrence(frequency, daysOfWeek, dayOfMonth, month, dayOfYear, toDayBoundaryOpts(await getDaySettings()));
    }

    await db.routines.update(id, patchData);
  }, []);
}

export function useDeleteRoutine() {
  return useCallback(async (args: { id: string }) => {
    await db.routines.delete(args.id);
  }, []);
}

// ============================================================
// REMINDERS
// ============================================================

export function useCreateReminder() {
  return useCallback(async (args: {
    title: string;
    note?: string;
    recurrence: 'once' | 'yearly' | 'monthly';
    date?: number;
    month?: number;
    day?: number;
  }) => {
    validateTitle(args.title);
    const now = Date.now();
    const id = generateLocalId();

    const reminder: LocalReminder = {
      _id: id,
      title: args.title,
      note: args.note,
      recurrence: args.recurrence,
      date: args.date,
      month: args.month,
      day: args.day,
      createdAt: now,
      updatedAt: now,
    };

    await db.reminders.add(reminder);
    return reminder;
  }, []);
}

export function useUpdateReminder() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    note?: string | null;
    recurrence?: 'once' | 'yearly' | 'monthly';
    date?: number | null;
    month?: number | null;
    day?: number | null;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    const { id, ...updates } = args;
    const existing = await db.reminders.get(id);
    if (!existing) throw new Error('Reminder not found');

    const patchData: Partial<LocalReminder> = { updatedAt: Date.now() };
    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.note !== undefined) patchData.note = updates.note === null ? undefined : updates.note;
    if (updates.recurrence !== undefined) patchData.recurrence = updates.recurrence;
    if (updates.date !== undefined) patchData.date = updates.date === null ? undefined : updates.date;
    if (updates.month !== undefined) patchData.month = updates.month === null ? undefined : updates.month;
    if (updates.day !== undefined) patchData.day = updates.day === null ? undefined : updates.day;

    await db.reminders.update(id, patchData);
  }, []);
}

export function useDeleteReminder() {
  return useCallback(async (args: { id: string }) => {
    await db.reminders.delete(args.id);
  }, []);
}

// ============================================================
// USER SETTINGS
// ============================================================

/**
 * Save the day-boundary config ("start of day" = routine spawn time, "end of
 * day" = task turnover) onto the userSettings row, stamping the device's UTC
 * offset so day math runs in the user's frame.
 *
 * Also re-anchors EVERY routine's nextOccurrence to the new boundaries
 * immediately. Besides applying the new spawn time, this guarantees every
 * nextOccurrence lands in the future, so shifting the turnover window can't
 * re-trigger a routine that already spawned earlier today.
 */
export function useUpdateDaySettings() {
  return useCallback(async (args: {
    dayTurnoverMinutes: number;
    routineSpawnMinutes: number;
  }) => {
    const now = Date.now();
    const fields = {
      dayTurnoverMinutes: args.dayTurnoverMinutes,
      routineSpawnMinutes: args.routineSpawnMinutes,
      utcOffsetMinutes: currentUtcOffsetMinutes(),
      updatedAt: now,
    };

    await db.transaction('rw', [db.userSettings, db.routines], async () => {
      const existing = await db.userSettings.toCollection().first();
      if (existing) {
        await db.userSettings.update(existing._id, fields);
      } else {
        await db.userSettings.add({ _id: generateLocalId(), ...fields });
      }

      const opts = { spawnMinutes: args.routineSpawnMinutes, turnoverMinutes: args.dayTurnoverMinutes };
      const routines = await db.routines.toArray();
      for (const routine of routines) {
        const nextOccurrence = calculateNextOccurrence(
          routine.frequency,
          routine.daysOfWeek,
          routine.dayOfMonth,
          routine.month,
          routine.dayOfYear,
          opts
        );
        await db.routines.update(routine._id, { nextOccurrence, updatedAt: now });
      }
    });
  }, []);
}
export function useCreateNotebook() {
  return useCallback(async (args: { title: string; description?: string }) => {
    validateTitle(args.title);
    validateDescription(args.description);
    const now = Date.now();
    const id = generateLocalId();

    const notebook: LocalNotebook = {
      _id: id,
      title: args.title,
      description: args.description,
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.notebooks.add(notebook);
    return notebook;
  }, []);
}

export function useUpdateNotebook() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string | null;
    archived?: boolean;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    if (args.description !== undefined && args.description !== null) validateDescription(args.description);
    const existing = await db.notebooks.get(args.id);
    if (!existing) throw new Error('Notebook not found');

    const now = Date.now();
    const patch: Partial<LocalNotebook> = { updatedAt: now };
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) {
      patch.description = args.description === null ? undefined : args.description;
    }
    if (args.archived !== undefined) {
      patch.archived = args.archived;
      patch.archivedAt = args.archived ? now : undefined;
    }

    await db.notebooks.update(args.id, patch);
  }, []);
}

export function useDeleteNotebook() {
  return useCallback(async (id: string) => {
    const existing = await db.notebooks.get(id);
    if (!existing) return;

    // Cascade: soft-delete contained notes
    const notes = await db.notes.where('notebookId').equals(id).toArray();
    for (const note of notes) {
      await db.notes.delete(note._id);
    }

    await db.notebooks.delete(id);
  }, []);
}

// ============================================================
// NOTES
// ============================================================

export function useCreateNote() {
  return useCallback(async (args: {
    notebookId: string;
    title: string;
    body?: string;
  }) => {
    validateTitle(args.title);
    const now = Date.now();
    const id = generateLocalId();

    const note: LocalNote = {
      _id: id,
      notebookId: args.notebookId,
      title: args.title,
      body: args.body ?? '',
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.notes.add(note);
    return note;
  }, []);
}

export function useUpdateNote() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    body?: string;
    notebookId?: string;
    archived?: boolean;
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    const existing = await db.notes.get(args.id);
    if (!existing) throw new Error('Note not found');

    const now = Date.now();
    const patch: Partial<LocalNote> = { updatedAt: now };
    if (args.title !== undefined) patch.title = args.title;
    if (args.body !== undefined) patch.body = args.body;
    if (args.notebookId !== undefined) patch.notebookId = args.notebookId;
    if (args.archived !== undefined) {
      patch.archived = args.archived;
      patch.archivedAt = args.archived ? now : undefined;
    }

    await db.notes.update(args.id, patch);
  }, []);
}

export function useDeleteNote() {
  return useCallback(async (id: string) => {
    const existing = await db.notes.get(id);
    if (!existing) return;
    await db.notes.delete(id);
  }, []);
}
