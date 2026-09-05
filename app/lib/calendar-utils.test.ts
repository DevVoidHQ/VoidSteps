import {
  projectRoutineOccurrences,
  projectReminderOccurrences,
  getStartOfDay,
} from "./calendar-utils";
import type { Routine, Reminder } from "@/types";

// Helper: midnight of a given date
function midnight(year: number, month: number, day: number): number {
  return new Date(year, month, day, 0, 0, 0, 0).getTime();
}

function makeRoutine(overrides: Partial<Routine>): Routine {
  return {
    _id: "r1",
    title: "Test routine",
    frequency: "daily",
    nextOccurrence: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    _id: "rem1",
    title: "Test reminder",
    recurrence: "once",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("projectRoutineOccurrences: monthly-on-31", () => {
  it("is projected into February on the 28th in a non-leap year", () => {
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

  it("is projected into February on the 29th in a leap year", () => {
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

  it("does not also project onto the 27th in February", () => {
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
    expect(projected).not.toContain(midnight(2025, 1, 27));
  });
});

describe("projectRoutineOccurrences: weekly and daily still work", () => {
  it("projects a daily routine every day in range", () => {
    const routine = makeRoutine({ frequency: "daily", nextOccurrence: midnight(2025, 5, 1) });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2025, 5, 1),
      midnight(2025, 5, 3)
    );
    expect(projected).toEqual([midnight(2025, 5, 1), midnight(2025, 5, 2), midnight(2025, 5, 3)]);
  });

  it("projects a weekly routine only on the configured days", () => {
    // June 2025: 1st is a Sunday. daysOfWeek [1] = Mondays only.
    const routine = makeRoutine({
      frequency: "weekly",
      daysOfWeek: [1],
      nextOccurrence: midnight(2025, 5, 1),
    });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2025, 5, 1),
      midnight(2025, 5, 14)
    );
    expect(projected).toEqual([midnight(2025, 5, 2), midnight(2025, 5, 9)]);
  });
});

describe("projectRoutineOccurrences with a non-midnight turnover", () => {
  it("agrees with getStartOfDay bucketing for an occurrence spawning after a 3am turnover", () => {
    const opts = { turnoverMinutes: 180, spawnMinutes: 360 }; // turnover 3am, spawns 6am
    const routine = makeRoutine({
      frequency: "daily",
      nextOccurrence: midnight(2025, 5, 18) + 6 * 60 * 60 * 1000,
    });
    const projected = projectRoutineOccurrences(
      routine,
      midnight(2025, 5, 18),
      midnight(2025, 5, 19),
      opts
    );
    expect(projected).toContain(midnight(2025, 5, 18));
  });
});

describe("projectReminderOccurrences: month-end clamping", () => {
  it("clamps a monthly reminder on the 31st to Feb 28 in a non-leap year", () => {
    const reminder = makeReminder({ recurrence: "monthly", day: 31 });
    const projected = projectReminderOccurrences(
      reminder,
      midnight(2025, 1, 1),
      midnight(2025, 2, 1)
    );
    expect(projected).toContain(midnight(2025, 1, 28));
  });

  it("clamps a monthly reminder on the 31st to Feb 29 in a leap year", () => {
    const reminder = makeReminder({ recurrence: "monthly", day: 31 });
    const projected = projectReminderOccurrences(
      reminder,
      midnight(2024, 1, 1),
      midnight(2024, 2, 1)
    );
    expect(projected).toContain(midnight(2024, 1, 29));
  });

  it("clamps a yearly Feb 29 reminder to Feb 28 in a non-leap year", () => {
    const reminder = makeReminder({ recurrence: "yearly", month: 2, day: 29 });
    const projected = projectReminderOccurrences(
      reminder,
      midnight(2025, 0, 1),
      midnight(2025, 11, 31)
    );
    expect(projected).toContain(midnight(2025, 1, 28));
  });
});

describe("getStartOfDay", () => {
  it("truncates to local midnight", () => {
    const d = new Date(2025, 5, 18, 14, 30, 0);
    expect(getStartOfDay(d)).toBe(midnight(2025, 5, 18));
  });
});
