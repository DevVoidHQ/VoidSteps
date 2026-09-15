import type { LocalPath, LocalReminder, LocalRoutine, LocalStep } from "@/lib/db";

/** Views add joined paths to the stored domain entities. Dates remain epochs. */
export interface Path extends Omit<LocalPath, "parentId"> {
  parentId?: string | null;
}
export interface Step extends Omit<LocalStep, "pathId"> {
  pathId?: string | null;
  path?: Path | null;
}
export interface Routine extends Omit<LocalRoutine, "pathId"> {
  pathId?: string | null;
  path?: Path | null;
}
export type Reminder = LocalReminder;
export type ReminderRecurrence = LocalReminder["recurrence"];
