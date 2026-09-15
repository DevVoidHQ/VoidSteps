import type { LocalStep } from "../db";
import { db } from "../db";
import {
  generateLocalId,
  logStepEvents,
  stopTimerOnStep,
  validateDescription,
  validateTitle,
} from "./helpers";

export const createStep = async (args: {
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
  const siblingSteps: LocalStep[] = await db.steps.filter((s) => !s.completed).toArray();

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
};

export const updateStep = async (args: {
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

  await db.transaction("rw", [db.steps, db.timeEntries, db.activityEvents], async () => {
    const existing = await db.steps.get(id);
    if (!existing) throw new Error("Step not found");

    const patchData: Partial<LocalStep> = { updatedAt: now };

    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.prioritizedToday !== undefined)
      patchData.prioritizedToday = updates.prioritizedToday;

    // Handle pathId (null or '' clears - some callers pass the form's empty
    // string through; '' would mint a
    // bogus "moved to path" activity event)
    if ("pathId" in updates) {
      patchData.pathId =
        updates.pathId === null || updates.pathId === "" ? undefined : updates.pathId;
    }

    // Handle dueDate (null clears)
    if ("dueDate" in updates) {
      patchData.dueDate = updates.dueDate === null ? undefined : updates.dueDate;
    }

    // Handle startDate (null clears)
    if ("startDate" in updates) {
      patchData.startDate = updates.startDate === null ? undefined : updates.startDate;
    }

    // Handle completedAt when completed status changes
    if ("completed" in updates && updates.completed !== undefined) {
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
    if ("failed" in updates && updates.failed !== undefined) {
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
};

export const deleteStep = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries, db.activityEvents], async () => {
    const step = await db.steps.get(args.id);
    if (!step) return;

    // A running timer's time is real - mint the session before the step goes.
    // Its time entries and activity events are deliberately left behind: the
    // Day Log renders them from the denormalized stepTitle.
    await stopTimerOnStep(step, now, now);

    await db.steps.delete(args.id);
  });
};

export const toggleStepCompletion = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries, db.activityEvents], async () => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error("Step not found");

    const newCompletedState = !step.completed;

    // Completing a step with a running timer ends the session too. Same
    // transaction, so a concurrent write can't split the entry from the stop.
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
};

export const toggleStepFailed = async (args: { id: string }) => {
  const now = Date.now();
  await db.transaction("rw", [db.steps, db.timeEntries, db.activityEvents], async () => {
    const step = await db.steps.get(args.id);
    if (!step) throw new Error("Step not found");

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
};

export const reorderSteps = async (args: { stepIds: string[] }) => {
  const now = Date.now();

  await db.transaction("rw", db.steps, async () => {
    for (let i = 0; i < args.stepIds.length; i++) {
      const stepId = args.stepIds[i];
      await db.steps.update(stepId, {
        sortOrder: i,
        updatedAt: now,
      });
    }
  });
};
