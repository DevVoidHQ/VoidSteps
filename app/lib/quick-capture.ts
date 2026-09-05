import type { Path } from "@/types/index";
import { addDays } from "./calendar-utils";
import {
  DAY_LABELS,
  MONTH_LABELS,
  formatDateForInput,
  parseLooseDate,
  parseStartDateInput,
} from "./date-utils";

export type CaptureKind = "step" | "routine" | "path" | "reminder";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Suggestions offered while typing an @token, per kind. */
export const DATE_TOKENS: { token: string; label: string }[] = [
  { token: "today", label: "Today" },
  { token: "tomorrow", label: "Tomorrow" },
  { token: "weekend", label: "This weekend" },
  { token: "nextweek", label: "In a week" },
  { token: "mon", label: "Monday" },
  { token: "tue", label: "Tuesday" },
  { token: "wed", label: "Wednesday" },
  { token: "thu", label: "Thursday" },
  { token: "fri", label: "Friday" },
  { token: "sat", label: "Saturday" },
  { token: "sun", label: "Sunday" },
];

export const SCHEDULE_TOKENS: { token: string; label: string }[] = [
  { token: "daily", label: "Every day" },
  { token: "weekdays", label: "Every weekday" },
  { token: "mon", label: "Every Monday" },
  { token: "tue", label: "Every Tuesday" },
  { token: "wed", label: "Every Wednesday" },
  { token: "thu", label: "Every Thursday" },
  { token: "fri", label: "Every Friday" },
  { token: "sat", label: "Every Saturday" },
  { token: "sun", label: "Every Sunday" },
  { token: "25th", label: "Monthly, on a day" },
  { token: "22sep", label: "Yearly, on a date" },
];

export const REMINDER_TOKENS: { token: string; label: string }[] = [
  { token: "22sep", label: "Every year on a date" },
  { token: "25th", label: "Every month on a day" },
  { token: "today", label: "One time, today" },
  { token: "tomorrow", label: "One time, tomorrow" },
];

// ── shared tokenizer ────────────────────────────────────────────────

interface Tokens {
  title: string;
  path?: Path;
  pathQuery?: string;
  /** Raw @tokens, in the order typed. */
  ats: string[];
  star: boolean;
}

/** First marker that starts a word, or -1. Keeps "a/b" and "me@x.com" as text. */
function findTokenStart(text: string, marker: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === marker && (i === 0 || text[i - 1] === " ")) return i;
  }
  return -1;
}

/** Longest path title the text starts with, so "/void labs" beats "/void". */
function matchPath(text: string, paths: Path[]): Path | undefined {
  const lower = text.toLowerCase();
  return paths
    .filter((p) => {
      const title = p.title.toLowerCase();
      if (!lower.startsWith(title)) return false;
      const after = lower[title.length];
      return after === undefined || after === " ";
    })
    .sort((a, b) => b.title.length - a.title.length)[0];
}

/** Pulls "/path", "@token" and "*" out of a line; the rest is the title. */
function tokenize(input: string, paths: Path[]): Tokens {
  let rest = input;
  const ats: string[] = [];

  const star = rest.replace(/(^|\s)\*(?=\s|$)/g, "$1");
  const hasStar = star !== rest;
  if (hasStar) rest = star;

  rest = rest.replace(/(^|\s)@(\S*)/g, (_m, lead: string, token: string) => {
    if (token) ats.push(token.toLowerCase());
    return lead;
  });

  let path: Path | undefined;
  let pathQuery: string | undefined;
  const slash = findTokenStart(rest, "/");
  if (slash !== -1) {
    const after = rest.slice(slash + 1);
    const matched = matchPath(after, paths);
    if (matched) {
      path = matched;
      rest = rest.slice(0, slash) + after.slice(matched.title.length);
    } else {
      const word = after.match(/^\S*/)?.[0] ?? "";
      pathQuery = word;
      rest = rest.slice(0, slash) + after.slice(word.length);
    }
  }

  return { title: rest.replace(/\s+/g, " ").trim(), path, pathQuery, ats, star: hasStar };
}

// ── date tokens ─────────────────────────────────────────────────────

/** The next time this weekday comes round, never today. */
function nextWeekday(weekday: number): string {
  const today = new Date();
  const delta = (weekday - today.getDay() + 7) % 7 || 7;
  return formatDateForInput(addDays(today, delta).getTime());
}

/** Splits a run of digits into a date: ddmmyyyy, ddmmyy or ddmm. */
function parseCompactDigits(digits: string): string | undefined {
  const shape =
    digits.length === 8 ? 4 : digits.length === 6 ? 2 : digits.length === 4 ? 0 : undefined;
  if (shape === undefined) return undefined;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = shape ? digits.slice(4) : String(new Date().getFullYear());
  return parseLooseDate(`${day}/${month}/${year}`);
}

/** Weekday index for a name of three letters or more, else -1. */
function weekdayIndex(text: string): number {
  if (text.length < 3) return -1;
  return WEEKDAYS.findIndex((d) => d.startsWith(text));
}

/**
 * Reads an @token into YYYY-MM-DD. Accepts today/tomorrow/yesterday, weekday
 * names, weekend, nextweek, compact digits (22092001, 2209) and anything
 * parseLooseDate handles (22/09/2001, 2026-08-30, 22sep).
 */
export function parseDateToken(input: string): string | undefined {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;

  const today = new Date();
  const relative: Record<string, () => string> = {
    today: () => formatDateForInput(today.getTime()),
    tod: () => formatDateForInput(today.getTime()),
    tomorrow: () => formatDateForInput(addDays(today, 1).getTime()),
    tmr: () => formatDateForInput(addDays(today, 1).getTime()),
    tom: () => formatDateForInput(addDays(today, 1).getTime()),
    yesterday: () => formatDateForInput(addDays(today, -1).getTime()),
    nextweek: () => formatDateForInput(addDays(today, 7).getTime()),
    weekend: () => nextWeekday(6),
  };
  if (relative[text]) return relative[text]();

  const weekday = weekdayIndex(text);
  if (weekday !== -1) return nextWeekday(weekday);

  if (/^\d+$/.test(text)) return parseCompactDigits(text);

  return parseLooseDate(text);
}

// ── step ────────────────────────────────────────────────────────────

export interface ParsedStep {
  title: string;
  pathId?: string;
  pathTitle?: string;
  pathQuery?: string;
  /** Due date as YYYY-MM-DD. */
  dueDate?: string;
  dateQuery?: string;
  prioritizedToday: boolean;
}

export function parseStepCapture(input: string, paths: Path[]): ParsedStep {
  const { title, path, pathQuery, ats, star } = tokenize(input, paths);
  const result: ParsedStep = {
    title,
    pathId: path?._id,
    pathTitle: path?.title,
    pathQuery,
    prioritizedToday: star,
  };

  for (const token of ats) {
    const parsed = parseDateToken(token);
    if (parsed) {
      result.dueDate = parsed;
      result.dateQuery = undefined;
    } else {
      result.dateQuery = token;
    }
  }
  return result;
}

// ── path ────────────────────────────────────────────────────────────

export interface ParsedPath {
  title: string;
  parentId?: string;
  parentTitle?: string;
  parentQuery?: string;
}

export function parsePathCapture(input: string, paths: Path[]): ParsedPath {
  const { title, path, pathQuery } = tokenize(input, paths);
  return { title, parentId: path?._id, parentTitle: path?.title, parentQuery: pathQuery };
}

// ── routine ─────────────────────────────────────────────────────────

export interface ParsedRoutine {
  title: string;
  pathId?: string;
  pathTitle?: string;
  pathQuery?: string;
  frequency: "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
  /** Plain-language version of the schedule, for the preview chip. */
  scheduleLabel: string;
  scheduleQuery?: string;
}

/** A bare day of the month: 25, 25th, 3rd. */
function parseDayOfMonth(token: string): number | undefined {
  const match = token.match(/^(\d{1,2})(st|nd|rd|th)?$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : undefined;
}

/**
 * Reads routine schedule tokens: @daily, @weekdays, weekday names (weekly on
 * those days), @25th (monthly) and dated tokens like @22sep (yearly).
 * Defaults to daily when nothing is given.
 */
export function parseRoutineCapture(input: string, paths: Path[]): ParsedRoutine {
  const { title, path, pathQuery, ats } = tokenize(input, paths);
  const base = {
    title,
    pathId: path?._id,
    pathTitle: path?.title,
    pathQuery,
  };

  const days: number[] = [];
  let repeat: "daily" | "weekdays" | undefined;
  let dayOfMonth: number | undefined;
  let yearly: { month: number; day: number } | undefined;
  let query: string | undefined;

  for (const token of ats) {
    if (token === "daily" || token === "everyday") {
      repeat = "daily";
      continue;
    }
    if (token === "weekdays" || token === "weekday") {
      repeat = "weekdays";
      continue;
    }
    const weekday = weekdayIndex(token);
    if (weekday !== -1) {
      if (!days.includes(weekday)) days.push(weekday);
      continue;
    }
    const day = parseDayOfMonth(token);
    if (day !== undefined) {
      dayOfMonth = day;
      continue;
    }
    const date = parseDateToken(token);
    if (date) {
      const parsed = new Date(parseStartDateInput(date) as number);
      yearly = { month: parsed.getMonth() + 1, day: parsed.getDate() };
      continue;
    }
    query = token;
  }

  if (repeat === "weekdays") {
    return { ...base, frequency: "weekdays", scheduleLabel: "Every weekday", scheduleQuery: query };
  }
  if (days.length) {
    const sorted = [...days].sort();
    return {
      ...base,
      frequency: "weekly",
      daysOfWeek: sorted,
      scheduleLabel: `Every ${sorted.map((d) => DAY_LABELS[d]).join(", ")}`,
      scheduleQuery: query,
    };
  }
  if (dayOfMonth !== undefined) {
    return {
      ...base,
      frequency: "monthly",
      dayOfMonth,
      scheduleLabel: `Monthly on the ${dayOfMonth}`,
      scheduleQuery: query,
    };
  }
  if (yearly) {
    return {
      ...base,
      frequency: "yearly",
      month: yearly.month,
      dayOfYear: yearly.day,
      scheduleLabel: `Every ${yearly.day} ${MONTH_LABELS[yearly.month - 1]}`,
      scheduleQuery: query,
    };
  }
  return { ...base, frequency: "daily", scheduleLabel: "Every day", scheduleQuery: query };
}

// ── reminder ────────────────────────────────────────────────────────

export interface ParsedReminder {
  title: string;
  recurrence: "once" | "yearly" | "monthly";
  /** Start of day in ms, for one-off reminders. */
  date?: number;
  month?: number;
  day?: number;
  scheduleLabel: string;
  scheduleQuery?: string;
}

/** Does the token pin a specific year, making it a one-off? */
function carriesYear(token: string): boolean {
  if (/^\d{6}$|^\d{8}$/.test(token)) return true;
  if (/\d{4}/.test(token) && !/^\d{4}$/.test(token)) return true;
  return (
    ["today", "tod", "tomorrow", "tmr", "tom", "yesterday", "nextweek", "weekend"].includes(
      token
    ) || weekdayIndex(token) !== -1
  );
}

/**
 * Reads reminder tokens. A day on its own is monthly, a day and month is
 * yearly (the birthday case), anything carrying a year is a one-off.
 * Defaults to yearly on today's date, matching the dialog.
 */
export function parseReminderCapture(input: string, paths: Path[]): ParsedReminder {
  const { title, ats } = tokenize(input, paths);

  let result: ParsedReminder | undefined;
  let query: string | undefined;

  for (const token of ats) {
    const dayOfMonth = parseDayOfMonth(token);
    if (dayOfMonth !== undefined) {
      result = {
        title,
        recurrence: "monthly",
        day: dayOfMonth,
        scheduleLabel: `Every month on the ${dayOfMonth}`,
      };
      continue;
    }

    const date = parseDateToken(token);
    if (!date) {
      query = token;
      continue;
    }

    const parsed = new Date(parseStartDateInput(date) as number);
    if (carriesYear(token)) {
      result = {
        title,
        recurrence: "once",
        date: parsed.getTime(),
        scheduleLabel: `Once on ${parsed.getDate()} ${MONTH_LABELS[parsed.getMonth()]} ${parsed.getFullYear()}`,
      };
    } else {
      result = {
        title,
        recurrence: "yearly",
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
        scheduleLabel: `Every ${parsed.getDate()} ${MONTH_LABELS[parsed.getMonth()]}`,
      };
    }
  }

  if (!result) {
    const today = new Date();
    result = {
      title,
      recurrence: "yearly",
      month: today.getMonth() + 1,
      day: today.getDate(),
      scheduleLabel: `Every ${today.getDate()} ${MONTH_LABELS[today.getMonth()]}`,
    };
  }

  return { ...result, title, scheduleQuery: query };
}

// ── caret ───────────────────────────────────────────────────────────

/**
 * The token being typed at the caret, so the right suggestions can be shown.
 * Path queries may contain spaces (path titles do); date tokens may not.
 * Returns null when the caret is in ordinary text.
 */
export function activeToken(
  input: string,
  caret: number
): { kind: "path" | "date"; query: string; start: number } | null {
  const before = input.slice(0, caret);

  const at = before.lastIndexOf("@");
  if (at !== -1 && startsToken(before, at)) {
    const query = before.slice(at + 1);
    if (!/\s/.test(query)) return { kind: "date", query, start: at };
  }

  const slash = before.lastIndexOf("/");
  if (slash !== -1 && startsToken(before, slash)) {
    return { kind: "path", query: before.slice(slash + 1), start: slash };
  }

  return null;
}

/** A token only starts at the beginning of the line or after a space. */
function startsToken(text: string, index: number): boolean {
  return index === 0 || text[index - 1] === " ";
}
