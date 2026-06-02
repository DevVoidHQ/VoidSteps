// Compatible with both MongoDB and Convex backends
export interface Path {
  _id: string;
  title: string;
  description?: string;
  parentId?: string | null;           // Self-ref for hierarchy
  archived?: boolean;
  archivedAt?: number;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Step {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string | number;
  failed?: boolean;
  failedAt?: string | number;
  pathId?: Path | string | null;
  path?: Path | null; // Populated path from Convex
  routineId?: string; // If this step was spawned from a routine
  prioritizedToday: boolean;
  dueDate?: number;
  startDate?: number;
  sortOrder?: number;
  // Timer fields
  timerStartedAt?: number;
  totalTimeSpentMs?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Routine {
  _id: string;
  title: string;
  description?: string;
  pathId?: string | null;
  path?: Path | null; // Populated path from Convex
  frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
  daysOfWeek?: number[]; // For weekly: 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // For monthly: 1-31
  month?: number; // For yearly: 1-12
  dayOfYear?: number; // For yearly: day of the month (1-31)
  nextOccurrence: number;
  autoPrioritize?: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

export type ReminderRecurrence = 'once' | 'yearly' | 'monthly';

export interface Reminder {
  _id: string;
  title: string;
  note?: string;
  recurrence: ReminderRecurrence;
  date?: number; // once: start-of-day timestamp
  month?: number; // yearly: 1-12
  day?: number; // yearly + monthly: 1-31
  createdAt: string | number;
  updatedAt: string | number;
}
