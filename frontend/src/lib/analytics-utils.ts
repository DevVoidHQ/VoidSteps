// Analytics utility functions

/** Default duration for steps without tracked time (15 minutes) */
export const DEFAULT_STEP_DURATION_MS = 15 * 60 * 1000;

/**
 * Returns actual time spent if tracked, otherwise the 15-min default.
 */
export function getEffectiveTimeMs(totalTimeSpentMs: number | undefined): number {
  return totalTimeSpentMs && totalTimeSpentMs > 0
    ? totalTimeSpentMs
    : DEFAULT_STEP_DURATION_MS;
}

/**
 * Formats milliseconds to a human-readable duration like "2h 15m" or "45m".
 */
export function formatDurationHM(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Truncates a timestamp to the start of its day (midnight local time).
 */
export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Generates an array of midnight timestamps for the last N days (inclusive of today).
 */
export function generateDayRange(daysAgo: number): number[] {
  const days: number[] = [];
  const today = startOfDay(Date.now());
  for (let i = daysAgo - 1; i >= 0; i--) {
    days.push(today - i * 24 * 60 * 60 * 1000);
  }
  return days;
}

export type RangeKey = '7d' | '30d' | '90d';

/**
 * Formats a timestamp for use as a chart axis label.
 * - 7d  → "Mon"
 * - 30d → "Jan 5"
 * - 90d → "Jan 5"
 */
export function formatDayLabel(timestamp: number, rangeKey: RangeKey): string {
  const d = new Date(timestamp);
  if (rangeKey === '7d') {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
