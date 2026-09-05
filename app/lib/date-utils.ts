// Date utilities for due dates and start dates

export type DueDateStatus = "overdue" | "due-soon" | "upcoming" | "none";

/**
 * Get the status of a due date
 * @param dueDate - timestamp in milliseconds
 * @returns 'overdue' | 'due-soon' | 'upcoming' | 'none'
 */
export function getDueDateStatus(dueDate: number | undefined): DueDateStatus {
  if (!dueDate) return "none";

  const now = Date.now();
  const diff = dueDate - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diff < 0) {
    return "overdue";
  } else if (diff < oneDayMs) {
    return "due-soon";
  } else {
    return "upcoming";
  }
}

/**
 * Format a timestamp as a relative date string
 * @param timestamp - timestamp in milliseconds
 * @param isStartDate - if true, formats for start dates (future tense)
 * @returns formatted string like "Today", "Tomorrow", "3 days overdue", etc.
 */
export function formatRelativeDate(
  timestamp: number | undefined,
  isStartDate: boolean = false
): string {
  if (!timestamp) return "";

  const now = new Date();
  const date = new Date(timestamp);

  // Reset to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((dateStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays === -1) {
    return isStartDate ? "Yesterday" : "1 day overdue";
  } else if (diffDays < -1) {
    return isStartDate ? `${Math.abs(diffDays)} days ago` : `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays <= 7) {
    return isStartDate ? `Starts in ${diffDays} days` : `In ${diffDays} days`;
  } else {
    // Format as date
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Compact relative label for a past timestamp (created/updated metadata):
 * "just now", "5m ago", "3h ago", "Yesterday", "4 days ago", then "Jun 3" /
 * "Jun 3, 2025" for older dates. Always past-tense (unlike formatRelativeDate,
 * which is due-date oriented).
 * @param timestamp - timestamp in milliseconds (number or numeric string)
 */
export function formatRelativePast(timestamp: number | string | undefined): string {
  if (timestamp === undefined || timestamp === null || timestamp === "") return "";
  const ts = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (!Number.isFinite(ts)) return "";

  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const date = new Date(ts);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6) return `${diffDays} days ago`;

  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Full, absolute date + time for hover tooltips, e.g. "Jun 3, 2025, 2:30 PM".
 * @param timestamp - timestamp in milliseconds (number or numeric string)
 */
export function formatAbsoluteDateTime(timestamp: number | string | undefined): string {
  if (timestamp === undefined || timestamp === null || timestamp === "") return "";
  const ts = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a timestamp for use in HTML date input (YYYY-MM-DD)
 * @param timestamp - timestamp in milliseconds
 * @returns string in YYYY-MM-DD format or empty string
 */
export function formatDateForInput(timestamp: number | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  // Use local date parts to avoid timezone issues with toISOString()
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date input string to timestamp (end of day for due dates)
 * @param dateString - string in YYYY-MM-DD format
 * @returns timestamp in milliseconds or undefined
 */
export function parseDateInput(dateString: string): number | undefined {
  if (!dateString) return undefined;
  // Parse date parts to avoid timezone issues with ISO string parsing
  const [year, month, day] = dateString.split("-").map(Number);
  // Create date in local timezone at end of day
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return date.getTime();
}

/**
 * Parse a date input string to timestamp (start of day for start dates)
 * @param dateString - string in YYYY-MM-DD format
 * @returns timestamp in milliseconds or undefined
 */
export function parseStartDateInput(dateString: string): number | undefined {
  if (!dateString) return undefined;
  // Parse date parts to avoid timezone issues with ISO string parsing
  const [year, month, day] = dateString.split("-").map(Number);
  // Create date in local timezone at start of day
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

/**
 * Check if a step is overdue (has a due date in the past)
 * @param dueDate - timestamp in milliseconds
 * @returns boolean
 */
export function isOverdue(dueDate: number | undefined): boolean {
  if (!dueDate) return false;
  return dueDate < Date.now();
}

/**
 * Check if a step is upcoming (has a start date in the future)
 * @param startDate - timestamp in milliseconds
 * @returns boolean
 */
export function isUpcoming(startDate: number | undefined): boolean {
  if (!startDate) return false;
  // Compare against start of today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startDate > todayStart.getTime();
}

/**
 * Get the start of today as a timestamp
 * @returns timestamp in milliseconds
 */
export function getStartOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/** Short labels, shared by every calendar-ish surface. */
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Short weekday labels, Sunday first, matching getMonthGrid. */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Days in a given month, month is 0-indexed. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Builds a YYYY-MM-DD string if the parts are a real calendar date. */
function toInputValue(year: number, month: number, day: number): string | undefined {
  if (month < 0 || month > 11) return undefined;
  if (day < 1 || day > daysInMonth(year, month)) return undefined;
  return formatDateForInput(new Date(year, month, day).getTime());
}

/** Two-digit years read as 2000s, matching what people mean when they type "25". */
function expandYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/**
 * Human-readable label for a YYYY-MM-DD value, e.g. "Sat, 30 Aug".
 * The year is shown only when it isn't the current one.
 */
export function formatDateDisplay(value: string): string {
  const timestamp = parseStartDateInput(value);
  if (timestamp === undefined) return "";
  const date = new Date(timestamp);
  const showYear = date.getFullYear() !== new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(showYear ? { year: "numeric" } : {}),
  });
}

/**
 * Parses what someone actually types into a date field and returns YYYY-MM-DD,
 * or undefined if it isn't a date. Numeric forms are read day-first ("3/4" is
 * 3 April), which is what the rest of the app displays.
 *
 * Accepts: today/tomorrow/yesterday, 2026-08-30, 30/8/2026, 30-8-26, 30/8,
 * 30 Aug 2026, Aug 30, 30aug.
 */
export function parseLooseDate(input: string): string | undefined {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;

  const today = new Date();
  if (text === "today") return formatDateForInput(today.getTime());
  if (text === "tomorrow") return formatDateForInput(addDaysTo(today, 1));
  if (text === "yesterday") return formatDateForInput(addDaysTo(today, -1));

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return toInputValue(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (numeric) {
    const year = numeric[3] ? expandYear(Number(numeric[3])) : today.getFullYear();
    return toInputValue(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }

  // "30 Aug 2026" / "30 august" / "30aug"
  const dayFirst = text.match(/^(\d{1,2})\s*([a-z]{3,})\.?(?:\s+(\d{2,4}))?$/);
  if (dayFirst) {
    const month = matchMonth(dayFirst[2]);
    if (month === undefined) return undefined;
    const year = dayFirst[3] ? expandYear(Number(dayFirst[3])) : today.getFullYear();
    return toInputValue(year, month, Number(dayFirst[1]));
  }

  // "Aug 30 2026" / "august 30"
  const monthFirst = text.match(/^([a-z]{3,})\.?\s*(\d{1,2})(?:,?\s+(\d{2,4}))?$/);
  if (monthFirst) {
    const month = matchMonth(monthFirst[1]);
    if (month === undefined) return undefined;
    const year = monthFirst[3] ? expandYear(Number(monthFirst[3])) : today.getFullYear();
    return toInputValue(year, month, Number(monthFirst[2]));
  }

  return undefined;
}

/** Month index from a full or abbreviated name, undefined when ambiguous or unknown. */
function matchMonth(name: string): number | undefined {
  const matches = MONTH_NAMES.filter((m) => m.startsWith(name));
  return matches.length === 1 ? MONTH_NAMES.indexOf(matches[0]) : undefined;
}

/** Local-time day arithmetic returning a timestamp. */
function addDaysTo(date: Date, days: number): number {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
