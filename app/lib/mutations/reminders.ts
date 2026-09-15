import type { LocalReminder } from "../db";
import { db } from "../db";
import { generateLocalId, validateTitle } from "./helpers";

export const createReminder = async (args: {
  title: string;
  note?: string;
  recurrence: "once" | "yearly" | "monthly";
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
};

export const updateReminder = async (args: {
  id: string;
  title?: string;
  note?: string | null;
  recurrence?: "once" | "yearly" | "monthly";
  date?: number | null;
  month?: number | null;
  day?: number | null;
}) => {
  if (args.title !== undefined) validateTitle(args.title);
  const { id, ...updates } = args;
  const existing = await db.reminders.get(id);
  if (!existing) throw new Error("Reminder not found");

  const patchData: Partial<LocalReminder> = { updatedAt: Date.now() };
  if (updates.title !== undefined) patchData.title = updates.title;
  if (updates.note !== undefined) patchData.note = updates.note === null ? undefined : updates.note;
  if (updates.recurrence !== undefined) patchData.recurrence = updates.recurrence;
  if (updates.date !== undefined) patchData.date = updates.date === null ? undefined : updates.date;
  if (updates.month !== undefined)
    patchData.month = updates.month === null ? undefined : updates.month;
  if (updates.day !== undefined) patchData.day = updates.day === null ? undefined : updates.day;

  await db.reminders.update(id, patchData);
};

export const deleteReminder = async (args: { id: string }) => {
  await db.reminders.delete(args.id);
};
