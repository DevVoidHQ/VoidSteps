import { describe, it, expect } from "vitest";
import {
  clipToDay,
  buildDayIntervals,
  summarizeDay,
  unionCoverageMs,
  assignColorSlots,
  buildActivityFeed,
  DAY_MS,
  type StepForTimeline,
} from "./timesheet-utils";
import type { LocalTimeEntry, LocalActivityEvent } from "./db";

// A fixed local midnight (whatever date it lands on in the runner's zone).
const DAY = new Date(2026, 6, 8).getTime();
const H = 60 * 60 * 1000;

let seq = 0;
function entry(overrides: Partial<LocalTimeEntry>): LocalTimeEntry {
  return {
    _id: `e${++seq}`,
    stepId: "s1",
    stepTitle: "Task one",
    start: DAY + 9 * H,
    end: DAY + 10 * H,
    durationMs: H,
    source: "timer",
    createdAt: DAY,
    updatedAt: DAY,
    ...overrides,
  };
}

const stepsById = new Map<string, StepForTimeline>([
  ["s1", { _id: "s1", title: "Task one", pathTitle: "Work" }],
  ["s2", { _id: "s2", title: "Task two" }],
]);

describe("clipToDay", () => {
  it("keeps an interval fully inside the day", () => {
    expect(clipToDay(DAY + H, DAY + 2 * H, DAY)).toEqual({
      start: DAY + H,
      end: DAY + 2 * H,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it("splits a midnight-spanning interval at render, flagging the cut side", () => {
    // Session from 22:00 yesterday to 02:00 today.
    const res = clipToDay(DAY - 2 * H, DAY + 2 * H, DAY);
    expect(res).toEqual({ start: DAY, end: DAY + 2 * H, clippedStart: true, clippedEnd: false });
    // Yesterday's half:
    const prev = clipToDay(DAY - 2 * H, DAY + 2 * H, DAY - DAY_MS);
    expect(prev).toEqual({ start: DAY - 2 * H, end: DAY, clippedStart: false, clippedEnd: true });
  });

  it("rejects intervals that do not overlap the day", () => {
    expect(clipToDay(DAY - 3 * H, DAY - H, DAY)).toBeNull();
    expect(clipToDay(DAY + DAY_MS, DAY + DAY_MS + H, DAY)).toBeNull();
  });
});

describe("buildDayIntervals", () => {
  it("sorts by start, resolves titles, and marks deleted steps", () => {
    const entries = [
      entry({ stepId: "s1", start: DAY + 11 * H, end: DAY + 12 * H }),
      entry({ stepId: "ghost", stepTitle: "Old task", start: DAY + 9 * H, end: DAY + 10 * H }),
    ];
    const result = buildDayIntervals(entries, stepsById, [], DAY, DAY + 13 * H);
    expect(result.map((r) => r.title)).toEqual(["Old task", "Task one"]);
    expect(result[0].deletedStep).toBe(true);
    expect(result[1].pathTitle).toBe("Work");
  });

  it("appends the running session clipped to now", () => {
    const running: StepForTimeline = { _id: "s2", title: "Task two", timerStartedAt: DAY + 12 * H };
    const result = buildDayIntervals([], stepsById, [running], DAY, DAY + 12.5 * H);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      running: true,
      start: DAY + 12 * H,
      end: DAY + 12.5 * H,
      durationMs: 0.5 * H,
    });
  });

  it("keeps every running session, not just the first", () => {
    const running: StepForTimeline[] = [
      { _id: "s2", title: "Task two", timerStartedAt: DAY + 12 * H },
      { _id: "s1", title: "Task one", timerStartedAt: DAY + 11 * H },
    ];
    const result = buildDayIntervals([], stepsById, running, DAY, DAY + 13 * H);
    expect(result.map((r) => r.stepId)).toEqual(["s1", "s2"]);
    expect(result.every((r) => r.running)).toBe(true);
  });

  it("flags an overlap instead of reporting a gap", () => {
    // s2 starts while s1 is still open, so there is no untracked time between
    // them even though s2 begins after s1's row.
    const result = buildDayIntervals(
      [
        entry({ stepId: "s1", start: DAY + 9 * H, end: DAY + 12 * H, durationMs: 3 * H }),
        entry({ stepId: "s2", start: DAY + 10 * H, end: DAY + 11 * H }),
      ],
      stepsById,
      [],
      DAY,
      DAY + 13 * H
    );
    expect(result[1].overlapsPrevious).toBe(true);
    expect(result[1].gapBefore).toBeUndefined();
  });

  it("measures a gap from the furthest point reached, not the previous row", () => {
    // The regression: s2 ends at 11:00 but s1 runs to 12:00, so a 12:30 start
    // is 30 minutes of untracked time, not 90.
    const result = buildDayIntervals(
      [
        entry({ stepId: "s1", start: DAY + 9 * H, end: DAY + 12 * H, durationMs: 3 * H }),
        entry({ stepId: "s2", start: DAY + 10 * H, end: DAY + 11 * H }),
        entry({ stepId: "s1", start: DAY + 12.5 * H, end: DAY + 13 * H, durationMs: 0.5 * H }),
      ],
      stepsById,
      [],
      DAY,
      DAY + 14 * H
    );
    expect(result[2].gapBefore).toBe(0.5 * H);
  });

  it("shows an overnight running session from midnight on today", () => {
    const running: StepForTimeline = { _id: "s2", title: "Task two", timerStartedAt: DAY - 2 * H };
    const result = buildDayIntervals([], stepsById, [running], DAY, DAY + H);
    expect(result[0]).toMatchObject({
      running: true,
      start: DAY,
      clippedStart: true,
      durationMs: H,
    });
  });
});

describe("unionCoverageMs", () => {
  const iv = (stepId: string, startH: number, endH: number) => ({
    stepId,
    title: stepId,
    source: "timer" as const,
    start: DAY + startH * H,
    end: DAY + endH * H,
    durationMs: (endH - startH) * H,
  });

  it("is the plain sum when nothing overlaps", () => {
    expect(unionCoverageMs([iv("s1", 9, 10), iv("s2", 11, 12)])).toBe(2 * H);
  });

  it("counts time once when two timers ran together", () => {
    // 3h of effort across 2h of the day.
    expect(unionCoverageMs([iv("s1", 9, 11), iv("s2", 10, 11)])).toBe(2 * H);
  });

  it("merges a chain of overlaps rather than only adjacent pairs", () => {
    expect(unionCoverageMs([iv("s1", 9, 11), iv("s2", 10, 13), iv("s3", 12, 14)])).toBe(5 * H);
  });

  it("is zero for an empty day", () => {
    expect(unionCoverageMs([])).toBe(0);
  });
});

describe("summarizeDay", () => {
  it("aggregates per task, largest first", () => {
    const intervals = buildDayIntervals(
      [
        entry({ stepId: "s1", start: DAY + 9 * H, end: DAY + 10 * H }),
        entry({ stepId: "s2", start: DAY + 10 * H, end: DAY + 13 * H, durationMs: 3 * H }),
        entry({ stepId: "s1", start: DAY + 14 * H, end: DAY + 15 * H }),
      ],
      stepsById,
      [],
      DAY,
      DAY + 16 * H
    );
    const segments = summarizeDay(intervals);
    expect(segments.map((s) => s.stepId)).toEqual(["s2", "s1"]);
    expect(segments[1].totalMs).toBe(2 * H);
  });

  it("folds the tail into Other beyond the slot budget", () => {
    const intervals = Array.from({ length: 10 }, (_, i) => ({
      stepId: `s${i}`,
      title: `Task ${i}`,
      source: "timer" as const,
      start: DAY + i * H,
      end: DAY + i * H + (10 - i) * 60_000,
      durationMs: (10 - i) * 60_000,
    }));
    const segments = summarizeDay(intervals, 8);
    expect(segments).toHaveLength(8);
    const other = segments[segments.length - 1];
    expect(other.other).toBe(true);
    expect(other.totalMs).toBe(3 * 60_000 + 2 * 60_000 + 1 * 60_000);
  });
});

describe("assignColorSlots", () => {
  it("assigns slots by first appearance and never re-slots on repeats", () => {
    const intervals = buildDayIntervals(
      [
        entry({ stepId: "s2", start: DAY + 8 * H, end: DAY + 9 * H }),
        entry({ stepId: "s1", start: DAY + 9 * H, end: DAY + 10 * H }),
        entry({ stepId: "s2", start: DAY + 11 * H, end: DAY + 12 * H }),
      ],
      stepsById,
      [],
      DAY,
      DAY + 13 * H
    );
    const slots = assignColorSlots(intervals);
    expect(slots.get("s2")).toBe(0);
    expect(slots.get("s1")).toBe(1);
  });
});

describe("buildActivityFeed", () => {
  const step = {
    _id: "s1",
    createdAt: DAY - 3 * DAY_MS + 10 * H,
    completed: false,
    totalTimeSpentMs: 2 * H,
  };

  function event(overrides: Partial<LocalActivityEvent>): LocalActivityEvent {
    return {
      _id: `ev${++seq}`,
      stepId: "s1",
      type: "field_changed",
      field: "dueDate",
      at: DAY + 9 * H,
      createdAt: DAY + 9 * H,
      updatedAt: DAY + 9 * H,
      ...overrides,
    };
  }

  it("groups newest day first, newest item first, with day tracked subtotals", () => {
    const groups = buildActivityFeed(
      step,
      [
        entry({ start: DAY + 9 * H, end: DAY + 10 * H }),
        entry({ start: DAY - DAY_MS + 9 * H, end: DAY - DAY_MS + 10 * H }),
      ],
      [event({ at: DAY + 11 * H })],
      DAY + 12 * H
    );
    expect(groups[0].dayStart).toBe(DAY);
    expect(groups[0].items.map((i) => i.kind)).toEqual(["event", "entry"]);
    expect(groups[0].trackedMs).toBe(H);
    expect(groups[1].dayStart).toBe(DAY - DAY_MS);
    // Oldest group carries the synthesized created row.
    expect(groups[groups.length - 1].items.some((i) => i.kind === "created")).toBe(true);
  });

  it("synthesizes a legacy-time row when the total exceeds entry coverage", () => {
    const groups = buildActivityFeed(step, [entry({ durationMs: H })], [], DAY + 12 * H);
    const legacy = groups.flatMap((g) => g.items).find((i) => i.kind === "legacy-time");
    expect(legacy).toBeDefined();
    expect((legacy as { ms: number }).ms).toBe(H);
  });

  it("synthesizes a completed row only when no stored completed event exists", () => {
    const done = { ...step, completed: true, completedAt: DAY + 8 * H };
    const withVirtual = buildActivityFeed(done, [], [], DAY + 12 * H);
    expect(withVirtual.flatMap((g) => g.items).filter((i) => i.kind === "event")).toHaveLength(1);

    const withStored = buildActivityFeed(
      done,
      [],
      [event({ type: "completed", field: undefined, at: DAY + 8 * H })],
      DAY + 12 * H
    );
    expect(withStored.flatMap((g) => g.items).filter((i) => i.kind === "event")).toHaveLength(1);
  });

  it("includes the running session as a live item", () => {
    const groups = buildActivityFeed(
      { ...step, timerStartedAt: DAY + 11 * H },
      [],
      [],
      DAY + 12 * H
    );
    expect(groups[0].items[0]).toMatchObject({ kind: "running", startedAt: DAY + 11 * H });
  });
});
