import { calculateNextOccurrence } from "./calculate-next-occurrence";

// Helper: midnight of a given date
function midnight(year: number, month: number, day: number): number {
  return new Date(year, month, day, 0, 0, 0, 0).getTime();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── daily ───────────────────────────────────────────────────────────

describe("daily", () => {
  it("returns tomorrow at midnight", () => {
    // Wednesday June 18, 2025, noon
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(calculateNextOccurrence("daily")).toBe(midnight(2025, 5, 19));
  });
});

// ── weekdays ────────────────────────────────────────────────────────

describe("weekdays", () => {
  it("Tuesday → Wednesday (next day is a weekday)", () => {
    // Tuesday June 17, 2025
    vi.setSystemTime(new Date(2025, 5, 17, 12, 0, 0));
    // tomorrow = Wednesday June 18 → weekday
    expect(calculateNextOccurrence("weekdays")).toBe(midnight(2025, 5, 18));
  });

  it("Friday → Monday (skips weekend)", () => {
    // Friday June 20, 2025
    vi.setSystemTime(new Date(2025, 5, 20, 12, 0, 0));
    // tomorrow = Saturday → skip to Monday June 23
    expect(calculateNextOccurrence("weekdays")).toBe(midnight(2025, 5, 23));
  });

  it("Saturday → Monday (skips Sunday)", () => {
    // Saturday June 21, 2025
    vi.setSystemTime(new Date(2025, 5, 21, 12, 0, 0));
    // tomorrow = Sunday → skip to Monday June 23
    expect(calculateNextOccurrence("weekdays")).toBe(midnight(2025, 5, 23));
  });
});

// ── weekly ──────────────────────────────────────────────────────────

describe("weekly", () => {
  it("falls back to +7 days when no daysOfWeek provided", () => {
    // Wednesday June 18, 2025
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    // tomorrow = Thursday June 19; +7 = Thursday June 26
    expect(calculateNextOccurrence("weekly")).toBe(midnight(2025, 5, 26));
  });

  it("picks the nearest future day from daysOfWeek", () => {
    // Monday June 16, 2025 → tomorrow = Tuesday (day 2)
    vi.setSystemTime(new Date(2025, 5, 16, 12, 0, 0));
    // daysOfWeek [3, 5] = Wed, Fri; nearest >= Tue(2) is Wed(3)
    // Wed is 1 day after Tue → June 18
    expect(calculateNextOccurrence("weekly", [3, 5])).toBe(midnight(2025, 5, 18));
  });

  it("wraps to next week when all daysOfWeek have passed", () => {
    // Thursday June 19, 2025 → tomorrow = Friday (day 5)
    vi.setSystemTime(new Date(2025, 5, 19, 12, 0, 0));
    // daysOfWeek [1, 3] = Mon, Wed; both < Friday(5)
    // Wraps: nextDay = Mon(1); days to add = 7 - 5 + 1 = 3 → Monday June 23
    expect(calculateNextOccurrence("weekly", [1, 3])).toBe(midnight(2025, 5, 23));
  });

  // Regression guards. Every case below returned the same day one week late
  // until the weekly branch stopped treating "tomorrow is itself scheduled"
  // as a wrap. A Mon+Tue routine fired only on Mondays, and a seven-day-a-week
  // routine fired once a week, while the calendar drew all the skipped days.

  it("fires tomorrow when tomorrow is itself a scheduled day", () => {
    // Monday June 16, 2025 → tomorrow = Tuesday (day 2)
    vi.setSystemTime(new Date(2025, 5, 16, 12, 0, 0));
    // daysOfWeek [1, 2] = Mon, Tue. Tuesday June 17 is next, not Monday the 23rd.
    expect(calculateNextOccurrence("weekly", [1, 2])).toBe(midnight(2025, 5, 17));
  });

  it("advances one day at a time across a consecutive block", () => {
    // Tuesday June 17, 2025 → tomorrow = Wednesday (day 3)
    vi.setSystemTime(new Date(2025, 5, 17, 12, 0, 0));
    // daysOfWeek [1, 2, 3] = Mon, Tue, Wed. Wednesday June 18 is next.
    expect(calculateNextOccurrence("weekly", [1, 2, 3])).toBe(midnight(2025, 5, 18));
  });

  it("treats an every-day-of-the-week routine as daily", () => {
    // Wednesday June 18, 2025 → tomorrow = Thursday (day 4)
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(calculateNextOccurrence("weekly", [0, 1, 2, 3, 4, 5, 6])).toBe(midnight(2025, 5, 19));
  });

  it("still wraps from the last scheduled day of the block", () => {
    // Wednesday June 18, 2025 → tomorrow = Thursday (day 4)
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    // daysOfWeek [1, 2, 3] = Mon, Tue, Wed; all < Thursday(4), so wrap to Mon June 23.
    expect(calculateNextOccurrence("weekly", [1, 2, 3])).toBe(midnight(2025, 5, 23));
  });
});

// ── monthly ─────────────────────────────────────────────────────────

describe("monthly", () => {
  it("returns this month if the day has not passed yet", () => {
    // June 10, 2025 - dayOfMonth = 20
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    expect(calculateNextOccurrence("monthly", undefined, 20)).toBe(midnight(2025, 5, 20));
  });

  it("returns next month if the day already passed", () => {
    // June 25, 2025 - dayOfMonth = 10
    vi.setSystemTime(new Date(2025, 5, 25, 12, 0, 0));
    expect(calculateNextOccurrence("monthly", undefined, 10)).toBe(midnight(2025, 6, 10));
  });

  it("defaults to current day when dayOfMonth is not provided", () => {
    // June 15, 2025 noon - default day = 15, but date (June 15 midnight) <= now
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
    // next = June 15 midnight which is <= now → bumps to July 15
    expect(calculateNextOccurrence("monthly")).toBe(midnight(2025, 6, 15));
  });
});

// ── yearly ──────────────────────────────────────────────────────────

describe("yearly", () => {
  it("returns this year if the date has not passed yet", () => {
    // March 1, 2025 - month 6 (June), dayOfYear 15
    vi.setSystemTime(new Date(2025, 2, 1, 12, 0, 0));
    expect(calculateNextOccurrence("yearly", undefined, undefined, 6, 15)).toBe(
      midnight(2025, 5, 15)
    );
  });

  it("returns next year if the date already passed", () => {
    // Sept 1, 2025 - month 6 (June), dayOfYear 15
    vi.setSystemTime(new Date(2025, 8, 1, 12, 0, 0));
    expect(calculateNextOccurrence("yearly", undefined, undefined, 6, 15)).toBe(
      midnight(2026, 5, 15)
    );
  });
});

// ── unknown frequency ───────────────────────────────────────────────

describe("unknown frequency", () => {
  it("defaults to tomorrow", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(calculateNextOccurrence("something_else")).toBe(midnight(2025, 5, 19));
  });
});

// ── day-boundary options (start of day / end of day config) ─────────

import { getLogicalDayStart } from "./calculate-next-occurrence";

// Helper: local wall-clock instant
function at(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month, day, hour, minute, 0, 0).getTime();
}

describe("day-boundary options", () => {
  it("daily occurrence lands at the configured spawn time", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(
      calculateNextOccurrence("daily", undefined, undefined, undefined, undefined, {
        spawnMinutes: 360,
      })
    ).toBe(at(2025, 5, 19, 6));
  });

  it("at 1am with a 3am turnover, the occurrence lands later the SAME calendar day", () => {
    // 1am Wednesday is logically still Tuesday, so "tomorrow" = Wednesday 6am.
    vi.setSystemTime(new Date(2025, 5, 18, 1, 0, 0));
    expect(
      calculateNextOccurrence("daily", undefined, undefined, undefined, undefined, {
        turnoverMinutes: 180,
        spawnMinutes: 360,
      })
    ).toBe(at(2025, 5, 18, 6));
  });

  it("after the turnover the occurrence moves to the next calendar day", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 4, 0, 0)); // past the 3am turnover
    expect(
      calculateNextOccurrence("daily", undefined, undefined, undefined, undefined, {
        turnoverMinutes: 180,
        spawnMinutes: 360,
      })
    ).toBe(at(2025, 5, 19, 6));
  });

  it("weekly respects the spawn time too", () => {
    // Wednesday June 18, 2025; routine on Fridays (5); spawn 9:00.
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(
      calculateNextOccurrence("weekly", [5], undefined, undefined, undefined, { spawnMinutes: 540 })
    ).toBe(at(2025, 5, 20, 9));
  });

  it("an explicit utcOffset computes the occurrence in that frame", () => {
    // Frozen at 06:30 UTC = noon IST (+330). Tomorrow IST-midnight = 18:30 UTC today.
    vi.setSystemTime(new Date(Date.UTC(2025, 5, 18, 6, 30)));
    expect(
      calculateNextOccurrence("daily", undefined, undefined, undefined, undefined, {
        utcOffsetMinutes: 330,
      })
    ).toBe(Date.UTC(2025, 5, 18, 18, 30));
  });
});

describe("getLogicalDayStart", () => {
  it("is local midnight by default", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0));
    expect(getLogicalDayStart(Date.now())).toBe(at(2025, 5, 18));
  });

  it("before the turnover the current day still belongs to yesterday", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 1, 0, 0));
    expect(getLogicalDayStart(Date.now(), { turnoverMinutes: 180 })).toBe(at(2025, 5, 17, 3));
  });

  it("after the turnover the day starts today at the turnover instant", () => {
    vi.setSystemTime(new Date(2025, 5, 18, 4, 0, 0));
    expect(getLogicalDayStart(Date.now(), { turnoverMinutes: 180 })).toBe(at(2025, 5, 18, 3));
  });
});

// ── shared range-projection helpers (used by calendar-utils) ────────

import { getLogicalDate, matchesRecurrenceRule, clampDayOfMonth } from "./recurrence";

describe("clampDayOfMonth", () => {
  it("leaves the day alone when it fits in the month", () => {
    expect(clampDayOfMonth(2025, 5, 15)).toBe(15); // June, 0-indexed month 5
  });

  it("clamps day 31 to Feb 28 in a non-leap year", () => {
    expect(clampDayOfMonth(2025, 1, 31)).toBe(28);
  });

  it("clamps day 31 to Feb 29 in a leap year", () => {
    expect(clampDayOfMonth(2024, 1, 31)).toBe(29);
  });
});

describe("matchesRecurrenceRule: monthly-on-31 is projected into February", () => {
  it("matches Feb 28 in a non-leap year, not the 31st (which does not exist)", () => {
    const rule = { frequency: "monthly", dayOfMonth: 31 };
    expect(matchesRecurrenceRule(rule, { year: 2025, month: 1, date: 28 })).toBe(true);
    expect(matchesRecurrenceRule(rule, { year: 2025, month: 1, date: 27 })).toBe(false);
  });

  it("matches Feb 29 in a leap year", () => {
    const rule = { frequency: "monthly", dayOfMonth: 31 };
    expect(matchesRecurrenceRule(rule, { year: 2024, month: 1, date: 29 })).toBe(true);
    expect(matchesRecurrenceRule(rule, { year: 2024, month: 1, date: 28 })).toBe(false);
  });
});

describe("matchesRecurrenceRule and calculateNextOccurrence agree on yearly Feb 29", () => {
  it("a Feb 29 yearly rule rolls over to Mar 1 in a non-leap year, in both engines", () => {
    // month=2 (Feb, 1-indexed), dayOfYear=29
    const rule = { frequency: "yearly", month: 2, dayOfYear: 29 };

    // The spawner: from Jan 1 2025 (non-leap), the next Feb-29 occurrence
    // rolls over to March 1.
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
    expect(calculateNextOccurrence("yearly", undefined, undefined, 2, 29)).toBe(
      midnight(2025, 2, 1)
    );

    // The calendar's predicate: March 1 2025 matches, Feb 28 2025 does not.
    expect(matchesRecurrenceRule(rule, { year: 2025, month: 2, date: 1 })).toBe(true);
    expect(matchesRecurrenceRule(rule, { year: 2025, month: 1, date: 28 })).toBe(false);
  });

  it("a Feb 29 yearly rule matches Feb 29 itself in a leap year", () => {
    const rule = { frequency: "yearly", month: 2, dayOfYear: 29 };
    expect(matchesRecurrenceRule(rule, { year: 2024, month: 1, date: 29 })).toBe(true);
  });
});

describe("getLogicalDate agrees with the spawner about which day an occurrence belongs to", () => {
  it("just after midnight with a 3am turnover, still belongs to yesterday", () => {
    // 1am Wednesday June 18 2025, turnover 3am → still logically Tuesday June 17.
    const justAfterMidnight = at(2025, 5, 18, 1);
    expect(getLogicalDate(justAfterMidnight, { turnoverMinutes: 180 })).toEqual({
      year: 2025,
      month: 5,
      date: 17,
    });

    // Matches getLogicalDayStart's own grouping for the same instant/opts.
    expect(getLogicalDayStart(justAfterMidnight, { turnoverMinutes: 180 })).toBe(
      at(2025, 5, 17, 3)
    );
  });

  it("after the turnover, belongs to today", () => {
    const afterTurnover = at(2025, 5, 18, 4);
    expect(getLogicalDate(afterTurnover, { turnoverMinutes: 180 })).toEqual({
      year: 2025,
      month: 5,
      date: 18,
    });
  });
});

// ── agreement test: calendar projection vs the spawner ───────────────

import { projectRoutineOccurrences } from "./calendar-utils";
import type { Routine } from "@/types";

function makeRoutine(overrides: Partial<Routine>): Routine {
  return {
    _id: "r1",
    title: "Test routine",
    frequency: "monthly",
    nextOccurrence: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("projectRoutineOccurrences agrees with calculateNextOccurrence", () => {
  it("the first date projected over a range matches the spawner-computed next occurrence", () => {
    // Monthly on the 31st, "now" = June 10 2025 noon.
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const next = calculateNextOccurrence("monthly", undefined, 31);

    const routine = makeRoutine({ frequency: "monthly", dayOfMonth: 31, nextOccurrence: next });
    const rangeStart = midnight(2025, 5, 1);
    const rangeEnd = midnight(2025, 8, 1);
    const projected = projectRoutineOccurrences(routine, rangeStart, rangeEnd);

    expect(projected[0]).toBe(next);
  });

  it("a monthly-on-31 routine is projected into February at the clamped day", () => {
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
    const routine = makeRoutine({
      frequency: "monthly",
      dayOfMonth: 31,
      nextOccurrence: midnight(2025, 0, 31),
    });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2025, 1, 1),
      midnight(2025, 2, 1)
    );
    expect(projected).toContain(midnight(2025, 1, 28));
  });

  it("a monthly-on-31 routine is projected into a leap-year February on the 29th", () => {
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
    const routine = makeRoutine({
      frequency: "monthly",
      dayOfMonth: 31,
      nextOccurrence: midnight(2024, 0, 31),
    });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2024, 1, 1),
      midnight(2024, 2, 1)
    );
    expect(projected).toContain(midnight(2024, 1, 29));
  });

  it("with a 3am turnover, an occurrence just after midnight lands on the day the spawner attributes it to", () => {
    // 1am, turnover 3am, spawn 6am: "today" hasn't started yet, so the daily
    // routine's next occurrence is later THIS calendar day at 6am.
    vi.setSystemTime(new Date(2025, 5, 18, 1, 0, 0));
    const opts = { turnoverMinutes: 180, spawnMinutes: 360 };
    const next = calculateNextOccurrence("daily", undefined, undefined, undefined, undefined, opts);
    expect(next).toBe(at(2025, 5, 18, 6));

    const routine = makeRoutine({ frequency: "daily", nextOccurrence: next });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2025, 5, 18),
      midnight(2025, 5, 19),
      opts
    );
    expect(projected).toContain(midnight(2025, 5, 18));
  });
});
