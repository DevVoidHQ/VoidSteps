import { useCallback } from 'react';
import { db } from './db';
import type { LocalStep, LocalPath, LocalRoutine, LocalReminder, LocalPathway, LocalNotebook, LocalNote, LocalUserSettings } from './db';
import { calculateNextOccurrence } from './calculate-next-occurrence';

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

// --- Sync queue helper ---

async function enqueue(
  entityType: 'steps' | 'paths' | 'routines' | 'reminders' | 'pathways' | 'userSettings' | 'notebooks' | 'notes',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
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
      .filter(s => !s.completed && !s._deleted)
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
      _localOnly: true,
    };

    await db.steps.add(step);
    await enqueue('steps', id, 'create', step as unknown as Record<string, unknown>);
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
    const existing = await db.steps.get(id);
    if (!existing) throw new Error('Step not found');

    const now = Date.now();
    const patchData: Partial<LocalStep> = { updatedAt: now };

    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.prioritizedToday !== undefined) patchData.prioritizedToday = updates.prioritizedToday;

    // Handle pathId (null clears)
    if ('pathId' in updates) {
      patchData.pathId = updates.pathId === null ? undefined : updates.pathId;
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

    await db.steps.update(id, patchData);
    await enqueue('steps', id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useDeleteStep() {
  return useCallback(async (args: { id: string }) => {
    await db.steps.update(args.id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('steps', args.id, 'delete');
  }, []);
}

export function useToggleStepCompletion() {
  return useCallback(async (args: { id: string }) => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error('Step not found');

    const now = Date.now();
    const newCompletedState = !step.completed;

    const patchData: Partial<LocalStep> = {
      completed: newCompletedState,
      completedAt: newCompletedState ? now : undefined,
      failed: false,
      failedAt: undefined,
      updatedAt: now,
    };

    await db.steps.update(args.id, patchData);
    await enqueue('steps', args.id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useToggleStepFailed() {
  return useCallback(async (args: { id: string }) => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error('Step not found');

    const now = Date.now();
    const currentFailedState = step.failed ?? false;
    const newFailedState = !currentFailedState;

    const patchData: Partial<LocalStep> = {
      failed: newFailedState,
      failedAt: newFailedState ? now : undefined,
      completed: false,
      completedAt: undefined,
      updatedAt: now,
    };

    await db.steps.update(args.id, patchData);
    await enqueue('steps', args.id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useReorderSteps() {
  return useCallback(async (args: {
    stepIds: string[];
  }) => {
    const now = Date.now();

    await db.transaction('rw', db.steps, db.syncQueue, async () => {
      for (let i = 0; i < args.stepIds.length; i++) {
        const stepId = args.stepIds[i];
        await db.steps.update(stepId, {
          sortOrder: i,
          updatedAt: now,
        });
        await enqueue('steps', stepId, 'update', {
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
    await db.steps.update(args.id, { timerStartedAt: now, updatedAt: now });
    await enqueue('steps', args.id, 'update', { timerStartedAt: now, updatedAt: now });
    window.dispatchEvent(new CustomEvent(TIMER_STARTED_EVENT, { detail: { id: args.id } }));
  }, []);
}

export function useSetTotalTime() {
  return useCallback(async (args: { id: string; totalTimeSpentMs: number }) => {
    const now = Date.now();
    const totalTimeSpentMs = Math.max(0, args.totalTimeSpentMs);
    // When resetting to 0, clear the field entirely so the badge disappears
    const value = totalTimeSpentMs === 0 ? undefined : totalTimeSpentMs;
    await db.steps.update(args.id, { totalTimeSpentMs: value, updatedAt: now });
    await enqueue('steps', args.id, 'update', { totalTimeSpentMs: value, updatedAt: now });
  }, []);
}

export function useStopTimer() {
  return useCallback(async (args: { id: string }) => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error('Step not found');

    const now = Date.now();
    const elapsed = step.timerStartedAt ? now - step.timerStartedAt : 0;
    const newTotal = (step.totalTimeSpentMs || 0) + elapsed;

    await db.steps.update(args.id, {
      timerStartedAt: undefined,
      totalTimeSpentMs: newTotal,
      updatedAt: now,
    });
    await enqueue('steps', args.id, 'update', {
      timerStartedAt: undefined,
      totalTimeSpentMs: newTotal,
      updatedAt: now,
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
    connectedPathIds?: string[];
    connectedStepIds?: string[];
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
      connectedPathIds: args.connectedPathIds,
      connectedStepIds: args.connectedStepIds,
      createdAt: now,
      updatedAt: now,
      _localOnly: true,
    };

    await db.paths.add(path);
    await enqueue('paths', id, 'create', path as unknown as Record<string, unknown>);
    return path;
  }, []);
}

export function useUpdatePath() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string;
    parentId?: string | null;
    connectedPathIds?: string[];
    connectedStepIds?: string[];
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
    await enqueue('paths', id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useDeletePath() {
  return useCallback(async (args: { id: string }) => {
    // Orphan children
    const children = await db.paths
      .where('parentId')
      .equals(args.id)
      .toArray();

    const now = Date.now();
    for (const child of children) {
      await db.paths.update(child._id, { parentId: undefined, updatedAt: now });
      await enqueue('paths', child._id, 'update', { parentId: undefined, updatedAt: now });
    }

    await db.paths.update(args.id, { _deleted: true, updatedAt: now });
    await enqueue('paths', args.id, 'delete');
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
        .filter(p => !p._deleted)
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
      await enqueue('paths', pathId, 'update', { archived: true, archivedAt: now, updatedAt: now });

      const steps = await db.steps
        .where('pathId')
        .equals(pathId)
        .filter(s => !s._deleted)
        .toArray();
      for (const step of steps) {
        await db.steps.update(step._id, { archived: true, archivedAt: now, updatedAt: now });
        await enqueue('steps', step._id, 'update', { archived: true, archivedAt: now, updatedAt: now });
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
        .filter(p => !p._deleted)
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
      await enqueue('paths', pathId, 'update', { archived: false, archivedAt: undefined, updatedAt: now });

      const steps = await db.steps
        .where('pathId')
        .equals(pathId)
        .filter(s => !s._deleted && s.archived === true)
        .toArray();
      for (const step of steps) {
        await db.steps.update(step._id, { archived: false, archivedAt: undefined, updatedAt: now });
        await enqueue('steps', step._id, 'update', { archived: false, archivedAt: undefined, updatedAt: now });
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
      .filter(s => !s._deleted)
      .toArray();

    for (const step of steps) {
      const newPathId = args.destinationPathId || undefined;
      await db.steps.update(step._id, { pathId: newPathId, updatedAt: now });
      await enqueue('steps', step._id, 'update', { pathId: newPathId ?? null, updatedAt: now });
    }

    // Orphan child paths to deleted path's parent
    const children = await db.paths
      .where('parentId')
      .equals(args.id)
      .toArray();

    for (const child of children) {
      const newParentId = existing.parentId || undefined;
      await db.paths.update(child._id, { parentId: newParentId, updatedAt: now });
      await enqueue('paths', child._id, 'update', { parentId: newParentId, updatedAt: now });
    }

    // Soft-delete the path
    await db.paths.update(args.id, { _deleted: true, updatedAt: now });
    await enqueue('paths', args.id, 'delete');
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
      args.dayOfYear
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
      _localOnly: true,
    };

    await db.routines.add(routine);
    await enqueue('routines', id, 'create', routine as unknown as Record<string, unknown>);
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

      patchData.nextOccurrence = calculateNextOccurrence(frequency, daysOfWeek, dayOfMonth, month, dayOfYear);
    }

    await db.routines.update(id, patchData);
    await enqueue('routines', id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useDeleteRoutine() {
  return useCallback(async (args: { id: string }) => {
    await db.routines.update(args.id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('routines', args.id, 'delete');
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
      _localOnly: true,
    };

    await db.reminders.add(reminder);
    await enqueue('reminders', id, 'create', reminder as unknown as Record<string, unknown>);
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
    await enqueue('reminders', id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useDeleteReminder() {
  return useCallback(async (args: { id: string }) => {
    await db.reminders.update(args.id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('reminders', args.id, 'delete');
  }, []);
}

// ============================================================
// PATHWAYS
// ============================================================

export function useCreatePathway() {
  return useCallback(async (args: {
    title: string;
    description?: string;
    parentId?: string;
    pathIds?: string[];
  }) => {
    validateTitle(args.title);
    validateDescription(args.description);
    const now = Date.now();
    const id = generateLocalId();

    const pathway: LocalPathway = {
      _id: id,
      title: args.title,
      description: args.description,
      parentId: args.parentId,
      pathIds: args.pathIds,
      createdAt: now,
      updatedAt: now,
      _localOnly: true,
    };

    await db.pathways.add(pathway);
    await enqueue('pathways', id, 'create', pathway as unknown as Record<string, unknown>);
    return pathway;
  }, []);
}

export function useUpdatePathway() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    description?: string;
    parentId?: string;
    pathIds?: string[];
  }) => {
    if (args.title !== undefined) validateTitle(args.title);
    if (args.description !== undefined) validateDescription(args.description);
    const { id, ...updates } = args;
    const existing = await db.pathways.get(id);
    if (!existing) throw new Error('Pathway not found');

    const patchData = { ...updates, updatedAt: Date.now() };
    await db.pathways.update(id, patchData);
    await enqueue('pathways', id, 'update', patchData as unknown as Record<string, unknown>);
  }, []);
}

export function useDeletePathway() {
  return useCallback(async (args: { id: string }) => {
    await db.pathways.update(args.id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('pathways', args.id, 'delete');
  }, []);
}

// ============================================================
// USER SETTINGS
// ============================================================

export function useUpdateUserSettings() {
  return useCallback(async (args: {
    userId: string;
    theme: Record<string, string>;
  }) => {
    const now = Date.now();

    // Upsert: find existing by userId
    const existing = await db.userSettings
      .filter(s => s.userId === args.userId)
      .first();

    if (existing) {
      await db.userSettings.update(existing._id, { theme: args.theme, updatedAt: now });
      await enqueue('userSettings', existing._id, 'update', { theme: args.theme, updatedAt: now });
    } else {
      const id = generateLocalId();
      const settings: LocalUserSettings = {
        _id: id,
        userId: args.userId,
        theme: args.theme,
        updatedAt: now,
        _localOnly: true,
      };
      await db.userSettings.add(settings);
      await enqueue('userSettings', id, 'create', settings as unknown as Record<string, unknown>);
    }
  }, []);
}

// ============================================================
// NOTEBOOKS
// ============================================================

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
      _localOnly: true,
    };

    await db.notebooks.add(notebook);
    await enqueue('notebooks', id, 'create', notebook as unknown as Record<string, unknown>);
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
    await enqueue('notebooks', args.id, 'update', patch as Record<string, unknown>);
  }, []);
}

export function useDeleteNotebook() {
  return useCallback(async (id: string) => {
    const existing = await db.notebooks.get(id);
    if (!existing) return;

    // Cascade: soft-delete contained notes
    const notes = await db.notes.where('notebookId').equals(id).toArray();
    for (const note of notes) {
      await db.notes.update(note._id, { _deleted: true, updatedAt: Date.now() });
      await enqueue('notes', note._id, 'delete');
    }

    await db.notebooks.update(id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('notebooks', id, 'delete');
  }, []);
}

// ============================================================
// NOTES
// ============================================================

export function useCreateNote() {
  return useCallback(async (args: {
    notebookId: string;
    pathId?: string;
    title: string;
    body?: string;
  }) => {
    validateTitle(args.title);
    const now = Date.now();
    const id = generateLocalId();

    const note: LocalNote = {
      _id: id,
      notebookId: args.notebookId,
      pathId: args.pathId,
      title: args.title,
      body: args.body ?? '',
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
      _localOnly: true,
    };

    await db.notes.add(note);
    await enqueue('notes', id, 'create', note as unknown as Record<string, unknown>);
    return note;
  }, []);
}

export function useUpdateNote() {
  return useCallback(async (args: {
    id: string;
    title?: string;
    body?: string;
    notebookId?: string;
    pathId?: string | null;
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
    if (args.pathId !== undefined) {
      patch.pathId = args.pathId === null ? undefined : args.pathId;
    }
    if (args.archived !== undefined) {
      patch.archived = args.archived;
      patch.archivedAt = args.archived ? now : undefined;
    }

    await db.notes.update(args.id, patch);
    await enqueue('notes', args.id, 'update', patch as Record<string, unknown>);
  }, []);
}

export function useDeleteNote() {
  return useCallback(async (id: string) => {
    const existing = await db.notes.get(id);
    if (!existing) return;
    await db.notes.update(id, { _deleted: true, updatedAt: Date.now() });
    await enqueue('notes', id, 'delete');
  }, []);
}
