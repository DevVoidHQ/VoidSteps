// Single source of truth for routine recurrence math, shared by the Convex
// backend (routines / batch / routineSpawner) AND the frontend (src/lib re-exports
// this). Pure date math, no platform deps, so it bundles cleanly into both the
// Convex runtime and the browser. Keep it that way, do not import anything here.
//
// All math runs in a SHIFTED-UTC FRAME: instead of relying on the runtime's
// local timezone (browser-local on the client, UTC on Convex - which is why
// server-computed occurrences historically drifted to UTC midnight), the
// caller's UTC offset is applied to the epoch and all date arithmetic uses UTC
// accessors. The same code therefore produces the user's local result on both
// sides, given the user's offset. Defaults preserve the old behavior: offset =
// the runtime's current offset, spawn/turnover = midnight.
//
// Known approximation: the offset in force NOW is applied to the computed
// occurrence too, so an occurrence on the far side of a DST transition can be
// off by the DST delta until the next recompute (the client recomputes on every
// spawn/app-open, so this self-corrects). Accepted - matches the codebase's
// client-clock-authoritative policy.

export interface DayBoundaryOpts {
  /** User's UTC offset in minutes (east positive, e.g. IST = 330). Defaults to
   * the runtime's current offset - browser-local on clients, 0 on Convex. */
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
    case 'daily':
      return occurrenceAt(fy, fm, fd + 1);

    case 'weekdays': {
      const next = new Date(tomorrow);
      while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      return occurrenceAt(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
    }

    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        return occurrenceAt(fy, fm, fd + 8);
      }
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = tomorrow.getUTCDay();
      // Preserved quirk from the original local-time implementation: when
      // tomorrow itself is a scheduled day (equality), it wraps to the FIRST
      // scheduled day of the following week rather than firing tomorrow.
      let nextDay = sortedDays.find((d) => d >= currentDay);
      const next = new Date(tomorrow);
      if (nextDay !== undefined && nextDay > currentDay) {
        next.setUTCDate(next.getUTCDate() + (nextDay - currentDay));
      } else {
        nextDay = sortedDays[0];
        next.setUTCDate(next.getUTCDate() + (7 - currentDay + nextDay));
      }
      return occurrenceAt(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
    }

    case 'monthly': {
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

    case 'yearly': {
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
