// Pure helpers for the timesheet surfaces (Day Log + per-step Activity).
// No db imports - everything here is unit-testable.

import type { LocalTimeEntry, LocalActivityEvent } from "./db";
import { startOfDay } from "./analytics-utils";

export const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Day Log
// ---------------------------------------------------------------------------

export interface DayInterval {
  /** Backing entry id; undefined for the live running session. */
  entryId?: string;
  stepId: string;
  title: string;
  pathTitle?: string;
  source: "timer" | "manual";
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
 * the day plus every live running session that overlaps it, sorted by start.
 */
export function buildDayIntervals(
  entries: LocalTimeEntry[],
  stepsById: Map<string, StepForTimeline>,
  runningSteps: StepForTimeline[],
  dayStart: number,
  now: number
): DayInterval[] {
  const intervals: DayInterval[] = [];

  for (const entry of entries) {
    const clipped = clipToDay(entry.start, entry.end, dayStart);
    if (!clipped) continue;
    const step = stepsById.get(entry.stepId);
    intervals.push({
      entryId: entry._id,
      stepId: entry.stepId,
      title: step?.title ?? entry.stepTitle ?? "Untitled",
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

  for (const runningStep of runningSteps) {
    if (runningStep.timerStartedAt == null || runningStep.timerStartedAt >= now) continue;
    const clipped = clipToDay(runningStep.timerStartedAt, now, dayStart);
    if (!clipped) continue;
    intervals.push({
      stepId: runningStep._id,
      title: runningStep.title,
      pathTitle: runningStep.pathTitle,
      source: "timer",
      start: clipped.start,
      end: clipped.end,
      durationMs: clipped.end - clipped.start,
      running: true,
      clippedStart: clipped.clippedStart,
      clippedEnd: false,
    });
  }

  intervals.sort((a, b) => a.start - b.start || a.end - b.end);
  return intervals;
}

export interface DayBlock {
  interval: DayInterval;
  /** Column within its overlap group, counted from the left. */
  lane: number;
  /** Columns it covers: its own plus any free ones to its right. */
  span: number;
  /** Columns in its overlap group. The block is span / lanes wide. */
  lanes: number;
}

/**
 * Lay the day's intervals out as calendar blocks. Sessions that overlap sit
 * side by side, each in the leftmost column free at its start, and a block
 * widens into any columns to its right that nothing beside it uses.
 *
 * `minVisibleMs` is the shortest time a block is drawn as. A two minute
 * session still renders tall enough to read, so it has to be laid out at
 * that height too, or it would be drawn on top of the session after it.
 */
export function layoutDayBlocks(intervals: DayInterval[], minVisibleMs = 0): DayBlock[] {
  const visibleEnd = (iv: DayInterval) => Math.max(iv.end, iv.start + minVisibleMs);
  const sorted = [...intervals].sort(
    (a, b) => a.start - b.start || visibleEnd(b) - visibleEnd(a)
  );

  const blocks: DayBlock[] = [];
  let group: DayBlock[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const overlaps = (a: DayInterval, b: DayInterval) =>
    a.start < visibleEnd(b) && b.start < visibleEnd(a);

  const closeGroup = () => {
    for (const block of group) {
      block.lanes = laneEnds.length;
      while (
        block.lane + block.span < laneEnds.length &&
        !group.some(
          (other) =>
            other.lane === block.lane + block.span && overlaps(other.interval, block.interval)
        )
      ) {
        block.span++;
      }
    }
    blocks.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const iv of sorted) {
    if (iv.start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= iv.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = visibleEnd(iv);
    group.push({ interval: iv, lane, span: 1, lanes: 1 });
    groupEnd = Math.max(groupEnd, visibleEnd(iv));
  }
  closeGroup();

  return blocks;
}

/**
 * The local hours the Day Log grid spans: whole hours around the day's work,
 * at least `minHours` tall, never past the day's own edges. An end that runs
 * into the next day (a session clipped at midnight) counts as hour 24.
 */
export function dayGridHours(
  intervals: DayInterval[],
  dayStart: number,
  minHours = 3
): { startHour: number; endHour: number } {
  if (intervals.length === 0) return { startHour: 9, endHour: 9 + minHours };
  const first = Math.min(...intervals.map((iv) => iv.start));
  const last = Math.max(...intervals.map((iv) => iv.end));

  let startHour = new Date(first).getHours();
  let endHour: number;
  if (startOfDay(last) !== dayStart) {
    endHour = 24;
  } else {
    // Local fields, not ms arithmetic: a half-hour zone offset (IST) would
    // otherwise misjudge whether the end sits on the hour.
    const end = new Date(last);
    const onTheHour =
      end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0;
    endHour = end.getHours() + (onTheHour ? 0 : 1);
  }

  if (endHour - startHour < minHours) {
    endHour = Math.min(24, startHour + minHours);
    startHour = Math.max(0, endHour - minHours);
  }
  return { startHour, endHour };
}

/**
 * Wall-clock time the day's intervals actually cover, merging overlaps. Summing
 * durations answers "how much effort", this answers "how much of the day", and
 * with parallel timers the first can exceed 24 hours while the second cannot.
 */
export function unionCoverageMs(intervals: DayInterval[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let spanStart = sorted[0].start;
  let spanEnd = sorted[0].end;
  for (const iv of sorted.slice(1)) {
    if (iv.start > spanEnd) {
      total += spanEnd - spanStart;
      spanStart = iv.start;
      spanEnd = iv.end;
    } else if (iv.end > spanEnd) {
      spanEnd = iv.end;
    }
  }
  return total + (spanEnd - spanStart);
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
    else
      byStep.set(iv.stepId, {
        stepId: iv.stepId,
        title: iv.title,
        totalMs: iv.durationMs,
        deletedStep: iv.deletedStep,
      });
  }
  const sorted = [...byStep.values()].sort((a, b) => b.totalMs - a.totalMs);
  if (sorted.length <= maxSegments) return sorted;
  const head = sorted.slice(0, maxSegments - 1);
  const tailMs = sorted.slice(maxSegments - 1).reduce((sum, s) => sum + s.totalMs, 0);
  return [
    ...head,
    {
      stepId: "__other__",
      title: `Other (${sorted.length - head.length})`,
      totalMs: tailMs,
      other: true,
    },
  ];
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
  | { kind: "entry"; at: number; entry: LocalTimeEntry }
  | { kind: "running"; at: number; startedAt: number }
  | { kind: "event"; at: number; event: LocalActivityEvent }
  | { kind: "created"; at: number; viaRoutine: boolean }
  | { kind: "legacy-time"; at: number; ms: number };

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
    entriesMs += entry.durationMs;
    items.push({ kind: "entry", at: entry.start, entry });
  }

  for (const event of events) {
    items.push({ kind: "event", at: event.at, event });
  }

  if (step.timerStartedAt != null && step.timerStartedAt < now) {
    items.push({ kind: "running", at: step.timerStartedAt, startedAt: step.timerStartedAt });
  }

  const createdAt = Number(step.createdAt) || 0;
  items.push({ kind: "created", at: createdAt, viaRoutine: !!step.routineId });

  // Steps completed before event tracking shipped have completedAt but no
  // stored event - surface the state change anyway.
  const hasCompletedEvent = events.some((e) => e.type === "completed");
  if (step.completed && step.completedAt && !hasCompletedEvent) {
    items.push({
      kind: "event",
      at: Number(step.completedAt),
      event: {
        _id: `virtual_completed_${step._id}`,
        stepId: step._id,
        type: "completed",
        at: Number(step.completedAt),
        createdAt: Number(step.completedAt),
        updatedAt: Number(step.completedAt),
      },
    });
  }

  const legacyMs = (step.totalTimeSpentMs ?? 0) - entriesMs;
  if (legacyMs > 60_000) {
    items.push({ kind: "legacy-time", at: createdAt, ms: legacyMs });
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
    if (item.kind === "entry") group.trackedMs += item.entry.durationMs;
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "14:02"-style clock label in the user's locale. */
export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Value for a datetime-local input, in local time. */
export function toDateTimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local input value back to ms (local time). */
export function fromDateTimeLocal(value: string): number | undefined {
  if (!value) return undefined;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : undefined;
}
