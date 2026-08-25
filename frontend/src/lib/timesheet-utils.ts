// Pure helpers for the timesheet surfaces (Day Log + per-step Activity).
// No db imports - everything here is unit-testable.

import type { LocalTimeEntry, LocalActivityEvent } from './db';
import { startOfDay } from './analytics-utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Gaps shorter than this between consecutive intervals aren't worth a row. */
export const MIN_GAP_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Day Log
// ---------------------------------------------------------------------------

export interface DayInterval {
  /** Backing entry id; undefined for the live running session. */
  entryId?: string;
  stepId: string;
  title: string;
  pathTitle?: string;
  source: 'timer' | 'manual';
  /** Interval bounds clipped to the day being rendered. */
  start: number;
  end: number;
  durationMs: number;
  running?: boolean;
  /** True when the session actually began before / ended after this day.
   * Sessions are stored whole and split at render (never in storage) so a
   * timezone change can't corrupt them. */
  clippedStart?: boolean;
  clippedEnd?: boolean;
  /** The step no longer exists - rendered from the entry's denormalized title. */
  deletedStep?: boolean;
}

export interface StepForTimeline {
  _id: string;
  title: string;
  pathTitle?: string;
  timerStartedAt?: number;
}

/** Clip [start, end] to [dayStart, dayStart + 24h). Returns null when the
 * interval doesn't overlap the day. */
export function clipToDay(
  start: number,
  end: number,
  dayStart: number
): { start: number; end: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const dayEnd = dayStart + DAY_MS;
  if (end <= dayStart || start >= dayEnd) return null;
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  if (e <= s) return null;
  return { start: s, end: e, clippedStart: s !== start, clippedEnd: e !== end };
}

/**
 * Build the chronological interval list for one day: stored entries clipped to
 * the day plus the live running session (when it overlaps). Sorted by start.
 */
export function buildDayIntervals(
  entries: LocalTimeEntry[],
  stepsById: Map<string, StepForTimeline>,
  runningStep: StepForTimeline | null,
  dayStart: number,
  now: number
): DayInterval[] {
  const intervals: DayInterval[] = [];

  for (const entry of entries) {
    if (entry._deleted) continue;
    const clipped = clipToDay(entry.start, entry.end, dayStart);
    if (!clipped) continue;
    const step = stepsById.get(entry.stepId);
    intervals.push({
      entryId: entry._id,
      stepId: entry.stepId,
      title: step?.title ?? entry.stepTitle ?? 'Untitled',
      pathTitle: step?.pathTitle,
      source: entry.source,
      start: clipped.start,
      end: clipped.end,
      durationMs: clipped.end - clipped.start,
      clippedStart: clipped.clippedStart,
      clippedEnd: clipped.clippedEnd,
      deletedStep: !step,
    });
  }

  if (runningStep?.timerStartedAt != null && runningStep.timerStartedAt < now) {
    const clipped = clipToDay(runningStep.timerStartedAt, now, dayStart);
    if (clipped) {
      intervals.push({
        stepId: runningStep._id,
        title: runningStep.title,
        pathTitle: runningStep.pathTitle,
        source: 'timer',
        start: clipped.start,
        end: clipped.end,
        durationMs: clipped.end - clipped.start,
        running: true,
        clippedStart: clipped.clippedStart,
        clippedEnd: false,
      });
    }
  }

  return intervals.sort((a, b) => a.start - b.start || a.end - b.end);
}

export interface DaySummarySegment {
  stepId: string;
  title: string;
  totalMs: number;
  deletedStep?: boolean;
  /** True for the fold-in bucket when the day touched more tasks than slots. */
  other?: boolean;
}

/**
 * Per-task totals for the summary strip, largest first. At most `maxSegments`
 * real tasks; the tail folds into one "Other" bucket (categorical palettes
 * don't stretch - they fold).
 */
export function summarizeDay(intervals: DayInterval[], maxSegments = 8): DaySummarySegment[] {
  const byStep = new Map<string, DaySummarySegment>();
  for (const iv of intervals) {
    const existing = byStep.get(iv.stepId);
    if (existing) existing.totalMs += iv.durationMs;
    else byStep.set(iv.stepId, { stepId: iv.stepId, title: iv.title, totalMs: iv.durationMs, deletedStep: iv.deletedStep });
  }
  const sorted = [...byStep.values()].sort((a, b) => b.totalMs - a.totalMs);
  if (sorted.length <= maxSegments) return sorted;
  const head = sorted.slice(0, maxSegments - 1);
  const tailMs = sorted.slice(maxSegments - 1).reduce((sum, s) => sum + s.totalMs, 0);
  return [...head, { stepId: '__other__', title: `Other (${sorted.length - head.length})`, totalMs: tailMs, other: true }];
}

/** Stable per-day color slots: tasks take palette slots in order of first
 * appearance in the day (chronological), so filters/re-renders never repaint. */
export function assignColorSlots(intervals: DayInterval[]): Map<string, number> {
  const slots = new Map<string, number>();
  for (const iv of intervals) {
    if (!slots.has(iv.stepId)) slots.set(iv.stepId, slots.size);
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Per-step activity feed
// ---------------------------------------------------------------------------

export type ActivityFeedItem =
  | { kind: 'entry'; at: number; entry: LocalTimeEntry }
  | { kind: 'running'; at: number; startedAt: number }
  | { kind: 'event'; at: number; event: LocalActivityEvent }
  | { kind: 'created'; at: number; viaRoutine: boolean }
  | { kind: 'legacy-time'; at: number; ms: number };

export interface ActivityDayGroup {
  dayStart: number;
  /** Tracked time that STARTED this day (running session excluded). */
  trackedMs: number;
  items: ActivityFeedItem[];
}

export interface StepForActivity {
  _id: string;
  createdAt: number;
  completedAt?: number;
  completed: boolean;
  routineId?: string;
  timerStartedAt?: number;
  totalTimeSpentMs?: number;
}

/**
 * Merge a step's time entries and activity events into day groups, newest day
 * first, newest item first within a day. Also synthesizes:
 * - a "created" row from step.createdAt ("created" is never stored - see db.ts),
 * - a "completed" row from completedAt when the log predates event tracking,
 * - one "legacy-time" row when the step's total exceeds what its entries cover
 *   (time tracked before session history existed).
 */
export function buildActivityFeed(
  step: StepForActivity,
  entries: LocalTimeEntry[],
  events: LocalActivityEvent[],
  now: number
): ActivityDayGroup[] {
  const items: ActivityFeedItem[] = [];

  let entriesMs = 0;
  for (const entry of entries) {
    if (entry._deleted) continue;
    entriesMs += entry.durationMs;
    items.push({ kind: 'entry', at: entry.start, entry });
  }

  for (const event of events) {
    if (event._deleted) continue;
    items.push({ kind: 'event', at: event.at, event });
  }

  if (step.timerStartedAt != null && step.timerStartedAt < now) {
    items.push({ kind: 'running', at: step.timerStartedAt, startedAt: step.timerStartedAt });
  }

  const createdAt = Number(step.createdAt) || 0;
  items.push({ kind: 'created', at: createdAt, viaRoutine: !!step.routineId });

  // Steps completed before event tracking shipped have completedAt but no
  // stored event - surface the state change anyway.
  const hasCompletedEvent = events.some((e) => e.type === 'completed' && !e._deleted);
  if (step.completed && step.completedAt && !hasCompletedEvent) {
    items.push({
      kind: 'event',
      at: Number(step.completedAt),
      event: {
        _id: `virtual_completed_${step._id}`,
        stepId: step._id,
        type: 'completed',
        at: Number(step.completedAt),
        createdAt: Number(step.completedAt),
        updatedAt: Number(step.completedAt),
      },
    });
  }

  const legacyMs = (step.totalTimeSpentMs ?? 0) - entriesMs;
  if (legacyMs > 60_000) {
    items.push({ kind: 'legacy-time', at: createdAt, ms: legacyMs });
  }

  items.sort((a, b) => b.at - a.at);

  const groups: ActivityDayGroup[] = [];
  for (const item of items) {
    const dayStart = startOfDay(item.at);
    let group = groups[groups.length - 1];
    if (!group || group.dayStart !== dayStart) {
      group = { dayStart, trackedMs: 0, items: [] };
      groups.push(group);
    }
    group.items.push(item);
    if (item.kind === 'entry') group.trackedMs += item.entry.durationMs;
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "14:02"-style clock label in the user's locale. */
export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Value for a datetime-local input, in local time. */
export function toDateTimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local input value back to ms (local time). */
export function fromDateTimeLocal(value: string): number | undefined {
  if (!value) return undefined;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : undefined;
}
