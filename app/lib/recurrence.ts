// Single source of truth for routine recurrence math. Pure date math, no
// platform deps. Keep it that way, do not import anything here.
//
// All math runs in a SHIFTED-UTC FRAME: instead of relying on the runtime's
// local timezone, the caller's UTC offset is applied to the epoch and all date
// arithmetic uses UTC accessors. Defaults preserve the old behavior: offset =
// the runtime's current offset, spawn/turnover = midnight.
//
// Known approximation: the offset in force NOW is applied to the computed
// occurrence too, so an occurrence on the far side of a DST transition can be
// off by the DST delta until the next recompute (the client recomputes on every
// spawn/app-open, so this self-corrects). Accepted.

export interface DayBoundaryOpts {
  /** User's UTC offset in minutes (east positive, e.g. IST = 330). Defaults to
   * the runtime's current offset. */
  utcOffsetMinutes?: number;
  /** "Start of day": minutes past local midnight when routine occurrences
   * land (e.g. 360 = routines spawn at 6:00). Default 0 = midnight. */
  spawnMinutes?: number;
  /** "End of day": minutes past local midnight when the logical day rolls
   * over (e.g. 180 = the day ends at 3:00, so 1am still belongs to the
   * previous day). Default 0 = midnight. */
  turnoverMinutes?: number;
}

const MIN_MS = 60_000;

function resolveOpts(opts?: DayBoundaryOpts) {
  return {
    offsetMs: (opts?.utcOffsetMinutes ?? -new Date().getTimezoneOffset()) * MIN_MS,
    spawnMs: (opts?.spawnMinutes ?? 0) * MIN_MS,
    turnMs: (opts?.turnoverMinutes ?? 0) * MIN_MS,
  };
}

/**
 * Start (absolute ms) of the user's CURRENT logical day: the most recent
 * turnover instant. With turnover 3:00, at 1am the logical day still started
 * at YESTERDAY 3am. This is the boundary for "today" task semantics and the
 * routine spawn dedup window - keep every consumer on this one helper.
 */
export function getLogicalDayStart(now: number, opts?: DayBoundaryOpts): number {
  const { offsetMs, turnMs } = resolveOpts(opts);
  const frame = new Date(now + offsetMs - turnMs);
  frame.setUTCHours(0, 0, 0, 0);
  return frame.getTime() - offsetMs + turnMs;
}

export function calculateNextOccurrence(
  frequency: string,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number,
  opts?: DayBoundaryOpts
): number {
  const { offsetMs, spawnMs, turnMs } = resolveOpts(opts);
  const now = Date.now();

  // The frame's UTC calendar date is the user's LOGICAL date: local time
  // shifted back by the turnover, so 1am with a 3am turnover still reads as
  // yesterday. Recurrence day-picking happens on logical dates; the returned
  // instant is that calendar date's local midnight plus the spawn time.
  const frame = new Date(now + offsetMs - turnMs);
  const occurrenceAt = (y: number, m: number, d: number) => Date.UTC(y, m, d) - offsetMs + spawnMs;

  const fy = frame.getUTCFullYear();
  const fm = frame.getUTCMonth();
  const fd = frame.getUTCDate();
  const tomorrow = new Date(Date.UTC(fy, fm, fd + 1));

  switch (frequency) {
    case "daily":
      return occurrenceAt(fy, fm, fd + 1);

    case "weekdays": {
      const next = new Date(tomorrow);
      while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      return occurrenceAt(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
    }

    case "weekly": {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        return occurrenceAt(fy, fm, fd + 8);
      }
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = tomorrow.getUTCDay();
      // Tomorrow counts. An earlier version treated the equality case as a
      // wrap, which meant any routine whose schedule included tomorrow skipped
      // that day and jumped a whole week: a Mon+Tue routine spawning on Monday
      // set its next occurrence to the following Monday and never fired on a
      // Tuesday, and a seven-day-a-week routine fired once a week. The search
      // starts from tomorrow precisely because today has already been handled,
      // so `>=` is the correct comparison and needs no exception.
      let nextDay = sortedDays.find((d) => d >= currentDay);
      const next = new Date(tomorrow);
      if (nextDay !== undefined) {
        next.setUTCDate(next.getUTCDate() + (nextDay - currentDay));
      } else {
        // Nothing left this week, so wrap to the first scheduled day of the next.
        nextDay = sortedDays[0];
        next.setUTCDate(next.getUTCDate() + (7 - currentDay + nextDay));
      }
      return occurrenceAt(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
    }

    case "monthly": {
      // Edge case: if day=31 and the target month has fewer days (e.g. Feb, Apr),
      // clamp to the last valid day of that month.
      const day = dayOfMonth || fd;
      const clampedOccurrence = (y: number, m: number) => {
        const probe = new Date(Date.UTC(y, m, day));
        if (probe.getUTCDate() !== day) {
          const last = new Date(Date.UTC(y, m + 1, 0)); // last day of month m
          return occurrenceAt(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
        }
        return occurrenceAt(y, m, day);
      };
      let next = clampedOccurrence(fy, fm);
      if (next <= now) next = clampedOccurrence(fy, fm + 1);
      return next;
    }

    case "yearly": {
      // Edge case: Feb 29 on non-leap years - Date.UTC rolls over to Mar 1.
      // This means a yearly routine set to Feb 29 fires on Mar 1 in non-leap years.
      const m = (month || 1) - 1;
      const d = dayOfYear || 1;
      let next = occurrenceAt(fy, m, d);
      if (next <= now) next = occurrenceAt(fy + 1, m, d);
      return next;
    }

    default:
      return occurrenceAt(fy, fm, fd + 1);
  }
}

// --- Shared helpers for range projection (calendar-utils) ---
//
// These exist so the calendar's "which dates does this rule fire on over a
// range" projection and calculateNextOccurrence's "what's the next date"
// spawner logic are built from the same primitives and cannot drift apart.

export interface LogicalDate {
  year: number;
  month: number; // 0-indexed, matches Date's getMonth()
  date: number;
}

export interface RecurrenceRule {
  frequency: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
}

/**
 * The logical calendar date (in the shifted-UTC frame) that an instant
 * belongs to. Same frame getLogicalDayStart groups by, so a value here always
 * agrees with which logical day getLogicalDayStart puts that instant in.
 */
export function getLogicalDate(instant: number, opts?: DayBoundaryOpts): LogicalDate {
  const { offsetMs, turnMs } = resolveOpts(opts);
  const frame = new Date(instant + offsetMs - turnMs);
  return { year: frame.getUTCFullYear(), month: frame.getUTCMonth(), date: frame.getUTCDate() };
}

/**
 * Inverse of getLogicalDate: the real instant (that logical date's local
 * midnight, plus the spawn offset) an occurrence on this logical date fires
 * at. Mirrors calculateNextOccurrence's own occurrenceAt so a date the
 * calendar projects and a date the spawner fires always land on the same
 * real timestamp.
 */
export function logicalDateToInstant(date: LogicalDate, opts?: DayBoundaryOpts): number {
  const { offsetMs, spawnMs } = resolveOpts(opts);
  return Date.UTC(date.year, date.month, date.date) - offsetMs + spawnMs;
}

/**
 * Last valid day of (year, month) - month 0-indexed. A monthly rule's
 * dayOfMonth clamps to this, so day=31 lands on Feb 28 (or 29 in a leap
 * year) rather than never matching.
 */
export function clampDayOfMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

/**
 * Does this logical calendar date match a recurrence rule? Shared by the
 * spawner's "is today the day" checks (via calculateNextOccurrence) and the
 * calendar's range projection (via calendar-utils), so the two never
 * disagree about which dates a routine fires on.
 */
export function matchesRecurrenceRule(rule: RecurrenceRule, date: LogicalDate): boolean {
  const { frequency, daysOfWeek, dayOfMonth, month, dayOfYear } = rule;
  const dow = new Date(Date.UTC(date.year, date.month, date.date)).getUTCDay();

  switch (frequency) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekly":
      if (!daysOfWeek || daysOfWeek.length === 0) return dow === 1; // default Monday
      return daysOfWeek.includes(dow);
    case "monthly":
      return date.date === clampDayOfMonth(date.year, date.month, dayOfMonth || 1);
    case "yearly": {
      // Same overflow behavior as calculateNextOccurrence's yearly branch
      // (see the comment there): a Feb 29 rule in a non-leap year rolls over
      // to Mar 1 rather than clamping to Feb 28, so this predicate has to
      // roll over the same way rather than clamp, or the two would disagree.
      const targetMonth = (month || 1) - 1;
      const eff = new Date(Date.UTC(date.year, targetMonth, dayOfYear || 1));
      return date.month === eff.getUTCMonth() && date.date === eff.getUTCDate();
    }
    default:
      return false;
  }
}
