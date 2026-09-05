import type { Path } from "@/types/index";
import {
  activeToken,
  parseDateToken,
  parsePathCapture,
  parseReminderCapture,
  parseRoutineCapture,
  parseStepCapture,
} from "./quick-capture";

// Pin "now" to Monday 2025-06-16 so weekday maths is deterministic.
const NOW = new Date(2025, 5, 16, 12, 0, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function path(id: string, title: string): Path {
  return { _id: id, title, createdAt: 0, updatedAt: 0 };
}

const PATHS = [path("p1", "Void Labs"), path("p2", "Void"), path("p3", "Health")];

// ── parseDateToken ──────────────────────────────────────────────────

describe("parseDateToken", () => {
  it("reads relative words", () => {
    expect(parseDateToken("today")).toBe("2025-06-16");
    expect(parseDateToken("tomorrow")).toBe("2025-06-17");
    expect(parseDateToken("tmr")).toBe("2025-06-17");
    expect(parseDateToken("nextweek")).toBe("2025-06-23");
  });

  it("reads weekdays as the next one, never today", () => {
    expect(parseDateToken("mon")).toBe("2025-06-23"); // today is Monday
    expect(parseDateToken("wed")).toBe("2025-06-18");
    expect(parseDateToken("weekend")).toBe("2025-06-21");
  });

  it("reads compact digits day first", () => {
    expect(parseDateToken("22092001")).toBe("2001-09-22");
    expect(parseDateToken("220926")).toBe("2026-09-22");
    expect(parseDateToken("2209")).toBe("2025-09-22");
  });

  it("still takes the punctuated forms", () => {
    expect(parseDateToken("22/09/2001")).toBe("2001-09-22");
    expect(parseDateToken("2026-08-30")).toBe("2026-08-30");
    expect(parseDateToken("22sep")).toBe("2025-09-22");
  });

  it("rejects nonsense", () => {
    expect(parseDateToken("someday")).toBeUndefined();
    expect(parseDateToken("999")).toBeUndefined();
    expect(parseDateToken("")).toBeUndefined();
  });
});

// ── parseCapture ────────────────────────────────────────────────────

describe("parseStepCapture", () => {
  it("returns a bare title untouched", () => {
    const result = parseStepCapture("Buy milk", PATHS);
    expect(result.title).toBe("Buy milk");
    expect(result.pathId).toBeUndefined();
    expect(result.dueDate).toBeUndefined();
    expect(result.prioritizedToday).toBe(false);
  });

  it("pulls out path, date and star", () => {
    const result = parseStepCapture("Ship the build /Health @tomorrow *", PATHS);
    expect(result.title).toBe("Ship the build");
    expect(result.pathId).toBe("p3");
    expect(result.dueDate).toBe("2025-06-17");
    expect(result.prioritizedToday).toBe(true);
  });

  it("prefers the longest matching path title", () => {
    const result = parseStepCapture("Write spec /Void Labs", PATHS);
    expect(result.pathId).toBe("p1");
    expect(result.title).toBe("Write spec");
  });

  it("keeps a shorter path when the longer one does not match", () => {
    const result = parseStepCapture("Write spec /Void", PATHS);
    expect(result.pathId).toBe("p2");
  });

  it("reports an unknown path instead of guessing", () => {
    const result = parseStepCapture("Do it /Nope now", PATHS);
    expect(result.pathId).toBeUndefined();
    expect(result.pathQuery).toBe("Nope");
    expect(result.title).toBe("Do it now");
  });

  it("reports an unreadable date instead of dropping it", () => {
    const result = parseStepCapture("Do it @someday", PATHS);
    expect(result.dueDate).toBeUndefined();
    expect(result.dateQuery).toBe("someday");
    expect(result.title).toBe("Do it");
  });

  it("takes tokens anywhere in the line", () => {
    const result = parseStepCapture("@2209 * Call the bank /Health", PATHS);
    expect(result.title).toBe("Call the bank");
    expect(result.dueDate).toBe("2025-09-22");
    expect(result.pathId).toBe("p3");
    expect(result.prioritizedToday).toBe(true);
  });

  it("leaves a mid-word star and slash alone", () => {
    const result = parseStepCapture("Rate 5*5 and read a/b", PATHS);
    expect(result.prioritizedToday).toBe(false);
    expect(result.title).toBe("Rate 5*5 and read a/b");
  });
});

// ── activeToken ─────────────────────────────────────────────────────

describe("activeToken", () => {
  it("finds a path token being typed, spaces included", () => {
    const text = "Write spec /Void La";
    expect(activeToken(text, text.length)).toEqual({ kind: "path", query: "Void La", start: 11 });
  });

  it("finds a date token being typed", () => {
    const text = "Write spec @tom";
    expect(activeToken(text, text.length)).toEqual({ kind: "date", query: "tom", start: 11 });
  });

  it("ends a date token at the first space", () => {
    const text = "Write spec @tomorrow now";
    expect(activeToken(text, text.length)).toBeNull();
  });

  it("ignores markers inside a word", () => {
    expect(activeToken("read a/b", 8)).toBeNull();
    expect(activeToken("mail me@example.com", 19)).toBeNull();
  });

  it("returns null in ordinary text", () => {
    expect(activeToken("Buy milk", 8)).toBeNull();
  });
});

// ── parseRoutineCapture ─────────────────────────────────────────────

describe("parseRoutineCapture", () => {
  it("defaults to daily when no schedule is given", () => {
    const result = parseRoutineCapture("Standup", PATHS);
    expect(result.frequency).toBe("daily");
    expect(result.scheduleLabel).toBe("Every day");
  });

  it("reads daily and weekdays", () => {
    expect(parseRoutineCapture("Standup @daily", PATHS).frequency).toBe("daily");
    expect(parseRoutineCapture("Standup @weekdays", PATHS).frequency).toBe("weekdays");
  });

  it("collects weekday tokens into a weekly schedule", () => {
    const result = parseRoutineCapture("Gym /Health @mon @wed @fri", PATHS);
    expect(result.frequency).toBe("weekly");
    expect(result.daysOfWeek).toEqual([1, 3, 5]);
    expect(result.pathId).toBe("p3");
    expect(result.title).toBe("Gym");
    expect(result.scheduleLabel).toBe("Every Mon, Wed, Fri");
  });

  it("reads a bare day of the month as monthly", () => {
    const result = parseRoutineCapture("Pay rent @25th", PATHS);
    expect(result.frequency).toBe("monthly");
    expect(result.dayOfMonth).toBe(25);
  });

  it("reads a date as yearly", () => {
    const result = parseRoutineCapture("File taxes @22sep", PATHS);
    expect(result.frequency).toBe("yearly");
    expect(result.month).toBe(9);
    expect(result.dayOfYear).toBe(22);
  });

  it("reports a schedule it cannot read", () => {
    expect(parseRoutineCapture("Standup @sometimes", PATHS).scheduleQuery).toBe("sometimes");
  });
});

// ── parseReminderCapture ────────────────────────────────────────────

describe("parseReminderCapture", () => {
  it("treats a day and month as yearly", () => {
    const result = parseReminderCapture("Mum's birthday @22sep", PATHS);
    expect(result.recurrence).toBe("yearly");
    expect(result.month).toBe(9);
    expect(result.day).toBe(22);
    expect(result.title).toBe("Mum's birthday");
  });

  it("treats a bare day as monthly", () => {
    const result = parseReminderCapture("Rent @25th", PATHS);
    expect(result.recurrence).toBe("monthly");
    expect(result.day).toBe(25);
  });

  it("treats a dated token as one off", () => {
    const result = parseReminderCapture("Renew passport @22092027", PATHS);
    expect(result.recurrence).toBe("once");
    expect(new Date(result.date as number).getFullYear()).toBe(2027);
  });

  it("treats today and tomorrow as one off", () => {
    expect(parseReminderCapture("Call back @tomorrow", PATHS).recurrence).toBe("once");
  });

  it("defaults to yearly on today", () => {
    const result = parseReminderCapture("Anniversary", PATHS);
    expect(result.recurrence).toBe("yearly");
    expect(result.month).toBe(6);
    expect(result.day).toBe(16);
  });
});

// ── parsePathCapture ────────────────────────────────────────────────

describe("parsePathCapture", () => {
  it("reads the slash token as the parent path", () => {
    const result = parsePathCapture("Fitness /Health", PATHS);
    expect(result.title).toBe("Fitness");
    expect(result.parentId).toBe("p3");
  });

  it("leaves a bare title parentless", () => {
    const result = parsePathCapture("Fitness", PATHS);
    expect(result.parentId).toBeUndefined();
  });
});
