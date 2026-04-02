import type { Routine } from '@/types';

// --- Date arithmetic ---

export function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// --- Labels ---

export function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function getWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

export function getDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// --- Grid generators ---

/** Returns 35 or 42 Date objects covering the full month grid (including overflow from prev/next months) */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun

  // Start from the Sunday before (or on) the 1st
  const gridStart = new Date(year, month, 1 - startOffset);

  const lastDay = new Date(year, month + 1, 0);
  const endOffset = 6 - lastDay.getDay();
  const totalDays = startOffset + lastDay.getDate() + endOffset;

  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push(addDays(gridStart, i));
  }
  return days;
}

/** Returns 7 Date objects for the week containing the given date (Sunday start) */
export function getWeekDays(date: Date): Date[] {
  const start = addDays(date, -date.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

// --- Routine projection ---

/**
 * Projects routine occurrences within a date range.
 * Returns an array of start-of-day timestamps when the routine would fire.
 */
export function projectRoutineOccurrences(
  routine: Routine,
  rangeStart: number,
  rangeEnd: number
): number[] {
  const occurrences: number[] = [];
  const maxProjections = 120; // safety cap

  const { frequency, daysOfWeek, dayOfMonth, month, dayOfYear } = routine;

  // Start from nextOccurrence or rangeStart, whichever is later
  let cursor = new Date(Math.max(routine.nextOccurrence, rangeStart));
  cursor.setHours(0, 0, 0, 0);

  // If nextOccurrence is before range, step forward to first occurrence in range
  if (routine.nextOccurrence < rangeStart) {
    cursor = findFirstOccurrenceInRange(frequency, cursor, rangeStart, daysOfWeek, dayOfMonth, month, dayOfYear);
  }

  let count = 0;
  while (cursor.getTime() <= rangeEnd && count < maxProjections) {
    if (matchesFrequency(frequency, cursor, daysOfWeek, dayOfMonth, month, dayOfYear)) {
      occurrences.push(getStartOfDay(cursor));
    }
    cursor = addDays(cursor, 1);
    count++;
  }

  return occurrences;
}

function matchesFrequency(
  frequency: string,
  date: Date,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number
): boolean {
  const dow = date.getDay();

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekly':
      if (!daysOfWeek || daysOfWeek.length === 0) return dow === 1; // default Monday
      return daysOfWeek.includes(dow);
    case 'monthly':
      return date.getDate() === (dayOfMonth || 1);
    case 'yearly':
      return date.getMonth() === ((month || 1) - 1) && date.getDate() === (dayOfYear || 1);
    default:
      return false;
  }
}

function findFirstOccurrenceInRange(
  frequency: string,
  _cursor: Date,
  rangeStart: number,
  _daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number
): Date {
  const d = new Date(rangeStart);
  d.setHours(0, 0, 0, 0);

  // For monthly/yearly, jump closer to avoid day-by-day iteration
  if (frequency === 'monthly') {
    d.setDate(dayOfMonth || 1);
    if (d.getTime() < rangeStart) d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (frequency === 'yearly') {
    d.setMonth((month || 1) - 1);
    d.setDate(dayOfYear || 1);
    if (d.getTime() < rangeStart) d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  return d;
}
