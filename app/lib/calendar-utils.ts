import type { Routine, Reminder } from "@/types";
import {
  getLogicalDate,
  logicalDateToInstant,
  matchesRecurrenceRule,
  clampDayOfMonth,
  type DayBoundaryOpts,
  type RecurrenceRule,
} from "./recurrence";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function getWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} to ${endStr}`;
}

export function getDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
 *
 * Walks logical calendar dates (day-boundary aware, via recurrence.ts's
 * shared helpers) rather than reimplementing the match/clamp rules here, so
 * this always agrees with what the routine spawner (calculateNextOccurrence)
 * would fire. Pass the same DayBoundaryOpts the spawner uses or the two can
 * disagree about which day an occurrence near a turnover boundary lands on.
 */
export function projectRoutineOccurrences(
  routine: Routine,
  rangeStart: number,
  rangeEnd: number,
  opts?: DayBoundaryOpts
): number[] {
  const occurrences: number[] = [];

  const rule: RecurrenceRule = {
    frequency: routine.frequency,
    daysOfWeek: routine.daysOfWeek,
    dayOfMonth: routine.dayOfMonth,
    month: routine.month,
    dayOfYear: routine.dayOfYear,
  };

  // Never show occurrences before the routine's own nextOccurrence: earlier
  // ones already exist as spawned steps and are shown via those, not via
  // projection.
  const effectiveStart = Math.max(routine.nextOccurrence, rangeStart);
  if (effectiveStart > rangeEnd) return occurrences;

  // Scan a day of margin on each side: the spawn/turnover offset can shift an
  // occurrence's real timestamp across a calendar-day boundary relative to
  // its logical date, so overshoot slightly and let the instant-level range
  // filter below trim it back to the real range.
  let cursor = getLogicalDate(effectiveStart - DAY_MS, opts);
  const endLogical = getLogicalDate(rangeEnd + DAY_MS, opts);
  const maxDays = Math.ceil((rangeEnd - effectiveStart) / DAY_MS) + 4;

  for (let i = 0; i < maxDays && !afterLogicalDate(cursor, endLogical); i++) {
    if (matchesRecurrenceRule(rule, cursor)) {
      const instant = logicalDateToInstant(cursor, opts);
      if (instant >= effectiveStart && instant <= rangeEnd) {
        occurrences.push(getStartOfDay(new Date(instant)));
      }
    }
    cursor = nextLogicalDate(cursor);
  }

  return occurrences;
}

function nextLogicalDate(date: { year: number; month: number; date: number }) {
  const d = new Date(Date.UTC(date.year, date.month, date.date + 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate() };
}

function afterLogicalDate(
  a: { year: number; month: number; date: number },
  b: { year: number; month: number; date: number }
): boolean {
  return Date.UTC(a.year, a.month, a.date) > Date.UTC(b.year, b.month, b.date);
}

/**
 * Projects reminder occurrences within a date range.
 * - once: the single date (if in range)
 * - yearly: month + day, once per year in range (day clamped to month length)
 * - monthly: day of every month in range (clamped to month length)
 */
export function projectReminderOccurrences(
  reminder: Reminder,
  rangeStart: number,
  rangeEnd: number
): number[] {
  const out: number[] = [];
  const { recurrence, date, month, day } = reminder;

  if (recurrence === "once") {
    if (date != null) {
      const ts = getStartOfDay(new Date(date));
      if (ts >= rangeStart && ts <= rangeEnd) out.push(ts);
    }
    return out;
  }

  if (recurrence === "yearly") {
    if (month == null || day == null) return out;
    const startYear = new Date(rangeStart).getFullYear();
    const endYear = new Date(rangeEnd).getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      const dd = clampDayOfMonth(y, month - 1, day); // clamp to target month length
      const ts = getStartOfDay(new Date(y, month - 1, dd));
      if (ts >= rangeStart && ts <= rangeEnd) out.push(ts);
    }
    return out;
  }

  if (recurrence === "monthly") {
    if (day == null) return out;
    let cursor = new Date(rangeStart);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    while (cursor.getTime() <= rangeEnd) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const dd = clampDayOfMonth(y, m, day);
      const ts = getStartOfDay(new Date(y, m, dd));
      if (ts >= rangeStart && ts <= rangeEnd) out.push(ts);
      cursor = new Date(y, m + 1, 1);
    }
    return out;
  }

  return out;
}
