// Single source of truth for routine recurrence math, shared by the Convex
// backend (routines / batch / routineSpawner) AND the frontend (src/lib re-exports
// this). Pure date math, no platform deps, so it bundles cleanly into both the
// Convex runtime and the browser. Keep it that way — do not import anything here.

export function calculateNextOccurrence(
  frequency: string,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number
): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      return tomorrow.getTime();

    case 'weekdays': {
      const next = new Date(tomorrow);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        const next = new Date(tomorrow);
        next.setDate(next.getDate() + 7);
        return next.getTime();
      }
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = tomorrow.getDay();
      let nextDay = sortedDays.find(d => d >= currentDay);
      const next = new Date(tomorrow);
      if (nextDay !== undefined && nextDay > currentDay) {
        next.setDate(next.getDate() + (nextDay - currentDay));
      } else {
        nextDay = sortedDays[0];
        next.setDate(next.getDate() + (7 - currentDay + nextDay));
      }
      return next.getTime();
    }

    case 'monthly': {
      // Edge case: if day=31 and the target month has fewer days (e.g. Feb, Apr),
      // the while loop rolls back to the last valid day of that month via setDate(0).
      const day = dayOfMonth || now.getDate();
      const next = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      while (next.getDate() !== day) {
        next.setDate(0);
      }
      return next.getTime();
    }

    case 'yearly': {
      // Edge case: Feb 29 on non-leap years - JavaScript Date rolls over to Mar 1.
      // This means a yearly routine set to Feb 29 fires on Mar 1 in non-leap years.
      const m = (month || 1) - 1;
      const d = dayOfYear || 1;
      const next = new Date(now.getFullYear(), m, d, 0, 0, 0, 0);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next.getTime();
    }

    default:
      return tomorrow.getTime();
  }
}
