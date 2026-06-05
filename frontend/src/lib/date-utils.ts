// Date utilities for due dates and start dates

export type DueDateStatus = 'overdue' | 'due-soon' | 'upcoming' | 'none';

/**
 * Get the status of a due date
 * @param dueDate - timestamp in milliseconds
 * @returns 'overdue' | 'due-soon' | 'upcoming' | 'none'
 */
export function getDueDateStatus(dueDate: number | undefined): DueDateStatus {
  if (!dueDate) return 'none';

  const now = Date.now();
  const diff = dueDate - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diff < 0) {
    return 'overdue';
  } else if (diff < oneDayMs) {
    return 'due-soon';
  } else {
    return 'upcoming';
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
  if (!timestamp) return '';

  const now = new Date();
  const date = new Date(timestamp);

  // Reset to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round(
    (dateStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays === -1) {
    return isStartDate ? 'Yesterday' : '1 day overdue';
  } else if (diffDays < -1) {
    return isStartDate
      ? `${Math.abs(diffDays)} days ago`
      : `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays <= 7) {
    return isStartDate
      ? `Starts in ${diffDays} days`
      : `In ${diffDays} days`;
  } else {
    // Format as date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
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
  if (timestamp === undefined || timestamp === null || timestamp === '') return '';
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (!Number.isFinite(ts)) return '';

  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const date = new Date(ts);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 6) return `${diffDays} days ago`;

  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Full, absolute date + time for hover tooltips, e.g. "Jun 3, 2025, 2:30 PM".
 * @param timestamp - timestamp in milliseconds (number or numeric string)
 */
export function formatAbsoluteDateTime(timestamp: number | string | undefined): string {
  if (timestamp === undefined || timestamp === null || timestamp === '') return '';
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a timestamp for use in HTML date input (YYYY-MM-DD)
 * @param timestamp - timestamp in milliseconds
 * @returns string in YYYY-MM-DD format or empty string
 */
export function formatDateForInput(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  // Use local date parts to avoid timezone issues with toISOString()
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
  const [year, month, day] = dateString.split('-').map(Number);
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
  const [year, month, day] = dateString.split('-').map(Number);
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
