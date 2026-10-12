import { calculateNextOccurrence } from "../calculate-next-occurrence";
import { getDaySettings, toDayBoundaryOpts } from "../day-settings";
import type { LocalRoutine } from "../db";
import { db } from "../db";
import {
  generateLocalId,
  validateDescription,
  validateDueOffsetDays,
  validateTitle,
} from "./helpers";

export const createRoutine = async (args: {
  title: string;
  description?: string;
  pathId?: string;
  frequency: "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
  autoPrioritize?: boolean;
  dueOffsetDays?: number;
}) => {
  validateTitle(args.title);
  validateDescription(args.description);
  validateDueOffsetDays(args.dueOffsetDays);
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
    dueOffsetDays: args.dueOffsetDays,
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.add(routine);
  return routine;
};

export const updateRoutine = async (args: {
  id: string;
  title?: string;
  description?: string;
  pathId?: string | null;
  frequency?: "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
  month?: number | null;
  dayOfYear?: number | null;
  autoPrioritize?: boolean;
  dueOffsetDays?: number | null;
}) => {
  if (args.title !== undefined) validateTitle(args.title);
  if (args.description !== undefined) validateDescription(args.description);
  if (args.dueOffsetDays !== null) validateDueOffsetDays(args.dueOffsetDays);
  const { id, ...updates } = args;
  const existing = await db.routines.get(id);
  if (!existing) throw new Error("Routine not found");

  const patchData: Partial<LocalRoutine> = { updatedAt: Date.now() };

  if (updates.title !== undefined) patchData.title = updates.title;
  if (updates.description !== undefined) patchData.description = updates.description;
  if (updates.pathId !== undefined)
    patchData.pathId = updates.pathId === null ? undefined : updates.pathId;
  if (updates.frequency !== undefined) patchData.frequency = updates.frequency;
  if (updates.daysOfWeek !== undefined)
    patchData.daysOfWeek = updates.daysOfWeek === null ? undefined : updates.daysOfWeek;
  if (updates.dayOfMonth !== undefined)
    patchData.dayOfMonth = updates.dayOfMonth === null ? undefined : updates.dayOfMonth;
  if (updates.month !== undefined)
    patchData.month = updates.month === null ? undefined : updates.month;
  if (updates.dayOfYear !== undefined)
    patchData.dayOfYear = updates.dayOfYear === null ? undefined : updates.dayOfYear;
  if (updates.autoPrioritize !== undefined) patchData.autoPrioritize = updates.autoPrioritize;
  // Handle dueOffsetDays (null clears). Only steps spawned afterwards use it.
  if ("dueOffsetDays" in updates) {
    patchData.dueOffsetDays = updates.dueOffsetDays === null ? undefined : updates.dueOffsetDays;
  }

  // Recalculate nextOccurrence if schedule changed
  if (
    updates.frequency ||
    updates.daysOfWeek !== undefined ||
    updates.dayOfMonth !== undefined ||
    updates.month !== undefined ||
    updates.dayOfYear !== undefined
  ) {
    const frequency = updates.frequency || existing.frequency;
    const daysOfWeek =
      updates.daysOfWeek === null ? undefined : updates.daysOfWeek || existing.daysOfWeek;
    const dayOfMonth =
      updates.dayOfMonth === null ? undefined : updates.dayOfMonth || existing.dayOfMonth;
    const month = updates.month === null ? undefined : updates.month || existing.month;
    const dayOfYear =
      updates.dayOfYear === null ? undefined : updates.dayOfYear || existing.dayOfYear;

    patchData.nextOccurrence = calculateNextOccurrence(
      frequency,
      daysOfWeek,
      dayOfMonth,
      month,
      dayOfYear,
      toDayBoundaryOpts(await getDaySettings())
    );
  }

  await db.routines.update(id, patchData);
};

export const deleteRoutine = async (args: { id: string }) => {
  await db.routines.delete(args.id);
};
